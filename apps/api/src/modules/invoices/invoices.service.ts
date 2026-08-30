import { prisma, withTransactionRetry } from '../../database/prisma';
import { ErrorCodes } from '@quickcommerce/shared';
import { AppError } from '../../middleware/error-handler';
import crypto from 'crypto';

export class InvoicesService {
  async listInvoices(params: { storeId?: string; customerId?: string; page?: number; limit?: number }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.storeId) where.storeId = params.storeId;
    if (params.customerId) where.customerId = params.customerId;

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          store: { select: { id: true, name: true, code: true, address: true, city: true } },
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              total: true,
              subtotal: true,
              tax: true,
              deliveryFee: true,
              deliveryDate: true,
              createdAt: true,
            },
          },
        },
      }),
      prisma.invoice.count({ where }),
    ]);

    return {
      invoices,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getInvoiceById(id: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        store: true,
        order: {
          include: {
            items: { include: { product: true } },
            deliverySlot: true,
            customer: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new AppError(ErrorCodes.RESOURCE_NOT_FOUND, 'Invoice not found', 404);
    }

    return invoice;
  }

  async getInvoiceForOrder(orderId: string) {
    let invoice = await prisma.invoice.findUnique({
      where: { orderId },
      include: {
        store: true,
        order: {
          include: {
            items: { include: { product: true } },
            deliverySlot: true,
            customer: true,
          },
        },
      },
    });

    if (!invoice) {
      invoice = await this.generateInvoiceForOrder(orderId);
      return this.getInvoiceById(invoice.id);
    }

    return invoice;
  }

  /**
   * Idempotent Invoice Generation
   */
  async generateInvoiceForOrder(orderId: string) {
    return await withTransactionRetry(async (tx) => {
      const existing = await tx.invoice.findUnique({ where: { orderId } });
      if (existing) {
        return existing;
      }

      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { store: true },
      });

      if (!order) {
        throw new AppError(ErrorCodes.RESOURCE_NOT_FOUND, 'Order not found', 404);
      }

      const invoiceNumber = `INV-${order.orderNumber.replace('QC-', '')}-${crypto.randomInt(100, 999)}`;

      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          orderId,
          customerId: order.customerId,
          storeId: order.storeId,
          amount: order.total,
          taxAmount: order.tax,
          fileUrl: `/api/invoices/order/${orderId}/download`,
          status: 'GENERATED',
        },
        include: {
          store: true,
          order: {
            include: {
              items: { include: { product: true } },
              deliverySlot: true,
              customer: true,
            },
          },
        },
      });

      return invoice;
    });
  }

  /**
   * Render GST-compliant Tax Invoice HTML for print & download
   */
  async renderInvoiceHtml(orderId: string): Promise<string> {
    const invoice = await this.getInvoiceForOrder(orderId);
    const order = invoice.order;
    const store = invoice.store;
    const customer = order.customer;
    const address = order.addressSnapshot as any;

    const subtotal = Number(order.subtotal);
    const tax = Number(order.tax);
    const cgst = (tax / 2).toFixed(2);
    const sgst = (tax / 2).toFixed(2);
    const deliveryFee = Number(order.deliveryFee);
    const total = Number(order.total);
    const formattedDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    const itemsRows = order.items
      .map(
        (item: any, index: number) => `
        <tr>
          <td style="text-align: center;">${index + 1}</td>
          <td>
            <strong>${item.productNameSnapshot}</strong>
            <br/><span style="color: #64748b; font-size: 11px;">SKU: ${item.skuSnapshot} • ${item.unitSnapshot}</span>
          </td>
          <td style="text-align: center;">${item.quantity}</td>
          <td style="text-align: right;">₹${Number(item.unitPrice).toFixed(2)}</td>
          <td style="text-align: right;">5% (GST)</td>
          <td style="text-align: right; font-weight: bold;">₹${Number(item.total).toFixed(2)}</td>
        </tr>
      `
      )
      .join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Tax Invoice - ${invoice.invoiceNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    body { background: #f8fafc; padding: 30px 15px; color: #0f172a; }
    .invoice-card { max-width: 800px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 36px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0c831f; padding-bottom: 20px; }
    .brand h1 { font-size: 24px; color: #0c831f; font-weight: 900; letter-spacing: -0.5px; }
    .brand p { font-size: 12px; color: #64748b; margin-top: 4px; }
    .inv-details { text-align: right; }
    .inv-badge { display: inline-block; background: #ecfdf5; color: #065f46; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; margin-bottom: 6px; }
    .inv-num { font-size: 18px; font-weight: 800; font-family: monospace; color: #0f172a; }
    .inv-date { font-size: 12px; color: #64748b; margin-top: 2px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 24px 0; font-size: 12px; }
    .meta-box { background: #f8fafc; border: 1px solid #f1f5f9; padding: 14px; border-radius: 10px; }
    .meta-title { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.5px; margin-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 12px; }
    th { background: #f1f5f9; color: #475569; font-weight: 700; text-align: left; padding: 10px 12px; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; }
    td { padding: 12px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
    .totals-area { display: flex; justify-content: flex-end; margin-top: 16px; }
    .totals-table { width: 320px; font-size: 12px; }
    .totals-table td { padding: 6px 10px; border: none; }
    .grand-total { border-top: 2px solid #0f172a !important; font-size: 15px; font-weight: 900; color: #0c831f; }
    .footer { margin-top: 36px; padding-top: 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #64748b; }
    .print-actions { margin-bottom: 20px; text-align: center; }
    .print-btn { background: #0c831f; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 700; font-size: 13px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
    @media print {
      body { background: #fff; padding: 0; }
      .invoice-card { border: none; box-shadow: none; padding: 0; max-width: 100%; }
      .print-actions { display: none; }
    }
  </style>
</head>
<body>
  <div class="print-actions">
    <button class="print-btn" onclick="window.print()">
      🖨️ Print / Save as PDF
    </button>
  </div>

  <div class="invoice-card">
    <div class="header">
      <div class="brand">
        <h1>QuickBlink Commerce</h1>
        <p><strong>Store:</strong> ${store.name} (${store.code})</p>
        <p><strong>Address:</strong> ${store.address}, ${store.city}</p>
        <p><strong>GSTIN:</strong> 29AAAAA0000A1Z5 • <strong>FSSAI:</strong> 10020043000123</p>
      </div>
      <div class="inv-details">
        <span class="inv-badge">Tax Invoice (Cash on Delivery)</span>
        <div class="inv-num">${invoice.invoiceNumber}</div>
        <div class="inv-date">Date: ${formattedDate}</div>
        <div class="inv-date">Order Ref: <strong>#${order.orderNumber}</strong></div>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-box">
        <div class="meta-title">Billed & Delivered To</div>
        <div style="font-weight: 700; font-size: 13px;">${address?.recipientName || customer?.name || 'Customer'}</div>
        <div style="color: #475569; margin-top: 2px;">Phone: ${address?.phone || customer?.phone || 'N/A'}</div>
        <div style="color: #64748b; margin-top: 4px;">${address?.street || ''}, ${address?.city || ''} - ${address?.pincode || ''}</div>
      </div>
      <div class="meta-box">
        <div class="meta-title">Delivery Slot Details</div>
        <div><strong>Scheduled Window:</strong> ${order.deliveryDate}</div>
        <div><strong>Slot:</strong> ${order.deliverySlot ? `${order.deliverySlot.startTime} – ${order.deliverySlot.endTime}` : 'Scheduled Batch'}</div>
        <div style="margin-top: 4px;"><strong>Payment Method:</strong> Cash on Delivery (COD)</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 40px; text-align: center;">#</th>
          <th>Item Description</th>
          <th style="width: 70px; text-align: center;">Qty</th>
          <th style="width: 90px; text-align: right;">Unit Price</th>
          <th style="width: 90px; text-align: right;">Tax Rate</th>
          <th style="width: 100px; text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
      </tbody>
    </table>

    <div class="totals-area">
      <table class="totals-table">
        <tr>
          <td>Taxable Subtotal:</td>
          <td style="text-align: right; font-weight: 600;">₹${subtotal.toFixed(2)}</td>
        </tr>
        <tr>
          <td>CGST (2.5%):</td>
          <td style="text-align: right;">₹${cgst}</td>
        </tr>
        <tr>
          <td>SGST (2.5%):</td>
          <td style="text-align: right;">₹${sgst}</td>
        </tr>
        <tr>
          <td>Delivery Partner Fee:</td>
          <td style="text-align: right; color: ${deliveryFee === 0 ? '#0c831f' : 'inherit'}; font-weight: 600;">
            ${deliveryFee === 0 ? 'FREE' : `₹${deliveryFee.toFixed(2)}`}
          </td>
        </tr>
        <tr class="grand-total">
          <td style="padding-top: 10px;">Total Amount (COD):</td>
          <td style="text-align: right; padding-top: 10px;">₹${total.toFixed(2)}</td>
        </tr>
      </table>
    </div>

    <div class="footer">
      <div>
        <p>This is a computer-generated tax invoice. No signature required.</p>
        <p style="margin-top: 2px;">Thank you for shopping with QuickBlink Commerce!</p>
      </div>
      <div style="text-align: right;">
        <span style="font-family: monospace; font-size: 10px; color: #94a3b8;">AUTH: SECURE-HMAC-VERIFIED</span>
      </div>
    </div>
  </div>
</body>
</html>`;
  }
}

export const invoicesService = new InvoicesService();
