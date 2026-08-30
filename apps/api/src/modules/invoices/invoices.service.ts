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
          store: { select: { id: true, name: true, code: true } },
          order: { select: { id: true, orderNumber: true, status: true, total: true } },
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
            items: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new AppError(ErrorCodes.RESOURCE_NOT_FOUND, 'Invoice not found', 404);
    }

    return invoice;
  }

  /**
   * Idempotent Invoice Generation worker helper
   */
  async generateInvoiceForOrder(orderId: string) {
    return await withTransactionRetry(async (tx) => {
      const existing = await tx.invoice.findUnique({ where: { orderId } });
      if (existing) {
        return existing; // Idempotent
      }

      const order = await tx.order.findUnique({ where: { id: orderId } });
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
          fileUrl: `https://storage.quickcommerce.dev/invoices/${invoiceNumber}.pdf`,
          status: 'GENERATED',
        },
      });

      return invoice;
    });
  }
}

export const invoicesService = new InvoicesService();
