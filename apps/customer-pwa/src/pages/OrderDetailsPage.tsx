import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { OrderDTO, OrderStatus } from '@quickcommerce/shared';
import { apiRequest } from '../api/client';
import { StatusBadge, formatCurrency, Skeleton, Button } from '@quickcommerce/ui';
import {
  ArrowLeft,
  KeyRound,
  MapPin,
  Clock,
  CheckCircle2,
  Package,
  Truck,
  Phone,
  Calendar,
  AlertCircle,
  Sparkles,
  ShoppingBag,
} from 'lucide-react';

export const OrderDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    async function loadOrder() {
      if (!id) return;
      try {
        const data = await apiRequest<OrderDTO>(`/orders/${id}`);
        setOrder(data);
      } catch (err) {
        console.error('Failed to load order details:', err);
      } finally {
        setLoading(false);
      }
    }
    loadOrder();

    // Poll for real-time status updates every 4 seconds
    const interval = setInterval(loadOrder, 4000);
    // Keep local clock updated
    const clockInterval = setInterval(() => setCurrentTime(new Date()), 10000);

    return () => {
      clearInterval(interval);
      clearInterval(clockInterval);
    };
  }, [id]);

  if (loading && !order) {
    return (
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <Skeleton className="h-20 w-full rounded-3xl" />
        <Skeleton className="h-48 w-full rounded-3xl" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-md mx-auto p-8 text-center space-y-4">
        <p className="text-base font-bold text-slate-700">Order not found</p>
        <Button onClick={() => navigate('/orders')}>Back to Orders</Button>
      </div>
    );
  }

  const isDelivered = order.status === OrderStatus.DELIVERED;
  const isCancelled = order.status === OrderStatus.CANCELLED;

  // Compute whether the delivery slot has started in local / IST time
  const isSlotActive = (() => {
    if (!order.deliverySlot) return true;
    try {
      const slotDateStr = order.deliverySlot.date || order.deliveryDate || currentTime.toISOString().split('T')[0];
      const [startH, startM] = (order.deliverySlot.startTime || '09:00').split(':').map(Number);
      const slotStart = new Date(slotDateStr);
      slotStart.setHours(startH, startM, 0, 0);
      return currentTime.getTime() >= slotStart.getTime();
    } catch {
      return true;
    }
  })();

  const isDriverAllotted = Boolean(order.deliveryBatch?.driver || order.status === OrderStatus.OUT_FOR_DELIVERY);
  const isOutForDeliveryLive = isDriverAllotted && isSlotActive && !isDelivered && !isCancelled;
  const isWaitingForSlot = isDriverAllotted && !isSlotActive && !isDelivered && !isCancelled;

  const slotWindowText = order.deliverySlot?.startTime
    ? `${order.deliverySlot.startTime} – ${order.deliverySlot.endTime}`
    : '03:00 PM – 06:00 PM';

  return (
    <div className="pb-28 max-w-2xl mx-auto px-4 pt-3 space-y-4 animate-fade-in">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/orders')}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-xs transition active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" /> All Orders
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.open(`/api/invoices/order/${order.id}/download`, '_blank')}
            className="flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-xl border border-emerald-200 shadow-xs transition active:scale-95"
            title="Download Tax Invoice"
          >
            <Download className="h-3.5 w-3.5" /> Invoice
          </button>
          <StatusBadge status={order.status} />
        </div>
      </div>

      {/* Order Summary Header */}
      <div className="p-4.5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Order #{order.orderNumber}
          </span>
          <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
            Cash on Delivery
          </span>
        </div>
        <h2 className="text-lg font-black text-slate-900">
          {order.store?.name || 'QuickBlink Dark Store'}
        </h2>
        <p className="text-xs text-slate-500">
          Placed on {new Date(order.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      {/* 🚀 LIVE ORDER TRACKING SECTION */}
      <div className="rounded-3xl bg-white border border-slate-200/80 p-5 space-y-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${isDelivered ? 'bg-emerald-500' : isOutForDeliveryLive ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`} />
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Live Order Tracking
            </h3>
          </div>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl">
            {isDelivered ? 'Delivered' : isOutForDeliveryLive ? 'Out for Delivery' : isWaitingForSlot ? 'Slot Scheduled' : 'Order Created'}
          </span>
        </div>

        {/* Dynamic Step-by-Step Progress Timeline */}
        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          {/* STEP 1: Order Created */}
          <div className="relative">
            <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Order Created & Confirmed</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Received at {new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} • Items reserved in store inventory
              </p>
            </div>
          </div>

          {/* STEP 2: Out for Delivery (Conditional Activation on Slot Window) */}
          <div className="relative">
            <div
              className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center shadow-xs ${
                isDelivered
                  ? 'bg-emerald-600 text-white'
                  : isOutForDeliveryLive
                  ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 animate-pulse'
                  : isWaitingForSlot
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-200 text-slate-400'
              }`}
            >
              <Truck className="w-3 h-3" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h4 className={`text-sm font-bold ${isOutForDeliveryLive || isDelivered ? 'text-slate-900' : 'text-slate-600'}`}>
                  Out for Delivery
                </h4>
                {isOutForDeliveryLive && (
                  <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" /> Live Active
                  </span>
                )}
              </div>

              {/* Status explanation based on slot time */}
              {isOutForDeliveryLive ? (
                <div className="mt-1.5 p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-xs space-y-1">
                  <p className="font-semibold text-emerald-900">
                    🚚 Your driver is currently out for delivery during your active slot window (<strong>{slotWindowText}</strong>).
                  </p>
                  <p className="text-emerald-700">
                    Please keep your 6-digit delivery OTP ready at the doorstep.
                  </p>
                </div>
              ) : isWaitingForSlot ? (
                <div className="mt-1.5 p-3 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900">
                    <Clock className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>Driver Allotted • Waiting for Slot Start ({slotWindowText})</span>
                  </div>
                  <p className="text-amber-800">
                    Your dark store has allotted a delivery partner. Live out-for-delivery tracking and OTP verification will activate once your delivery window begins at <strong>{order.deliverySlot?.startTime}</strong>.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-400 mt-0.5">
                  Scheduled for {slotWindowText} window • Will activate when dispatched
                </p>
              )}
            </div>
          </div>

          {/* STEP 3: Delivered */}
          <div className="relative">
            <div
              className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center shadow-xs ${
                isDelivered ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-400'
              }`}
            >
              <Package className="w-3 h-3" />
            </div>
            <div>
              <h4 className={`text-sm font-bold ${isDelivered ? 'text-slate-900' : 'text-slate-400'}`}>
                {isDelivered ? 'Delivered Successfully' : 'Delivered & Cash Collected'}
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                {isDelivered
                  ? `Delivered on ${new Date(order.updatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} • Verified via OTP`
                  : 'Requires 6-digit Doorstep OTP verification'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 🔑 SECURE DELIVERY OTP CARD (Prominently displayed for doorstep verification) */}
      {!isDelivered && !isCancelled && (
        <div className="rounded-3xl bg-gradient-to-br from-amber-500 via-amber-500 to-amber-600 p-5 text-slate-950 shadow-md space-y-2 border border-amber-400">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-white/30 text-slate-950">
                <KeyRound className="h-5 w-5" />
              </div>
              <span className="text-xs font-black uppercase tracking-wider text-amber-950">
                Doorstep Delivery OTP
              </span>
            </div>
            <span className="text-[11px] font-black bg-white px-2.5 py-1 rounded-lg text-amber-900 shadow-xs">
              Single-Use
            </span>
          </div>

          <div className="flex items-baseline justify-between pt-1">
            <span className="text-3xl sm:text-4xl font-black font-mono tracking-widest text-slate-950 drop-shadow-xs">
              {order.deliveryOtp || '492815'}
            </span>
            <span className="text-xs font-bold text-amber-950 bg-amber-400/80 px-2.5 py-1 rounded-lg">
              Show at Doorstep
            </span>
          </div>

          <p className="text-[11px] font-semibold text-amber-950/90 pt-1 border-t border-amber-400/60">
            🔒 Share this 6-digit verification code with the delivery partner only upon physically receiving your groceries.
          </p>
        </div>
      )}

      {/* 🚚 ALLOTTED DELIVERY PARTNER DETAILS (If assigned) */}
      {order.deliveryBatch?.driver && (
        <div className="p-4.5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-800">
              <Truck className="h-6 w-6" />
            </div>
            <div className="text-xs space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Delivery Partner
              </span>
              <h4 className="font-black text-slate-900 text-sm">
                {order.deliveryBatch.driver.user?.name || 'Assigned Driver'}
              </h4>
              <span className="text-slate-500 font-medium">
                {order.deliveryBatch.driver.vehicleType} • {order.deliveryBatch.driver.vehicleNumber}
              </span>
            </div>
          </div>
          {order.deliveryBatch.driver.user?.phone && (
            <a
              href={`tel:${order.deliveryBatch.driver.user.phone}`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs transition active:scale-95 border border-emerald-200"
            >
              <Phone className="h-4 w-4" />
              <span>Call</span>
            </a>
          )}
        </div>
      )}

      {/* ⏰ DELIVERY SLOT & ADDRESS DETAILS */}
      <div className="rounded-3xl bg-white border border-slate-200/80 p-4.5 space-y-3.5 shadow-xs text-xs">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-slate-100 text-slate-600 mt-0.5">
            <Calendar className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Scheduled Slot Window
            </span>
            <h5 className="font-bold text-slate-900 text-sm mt-0.5">
              {order.deliveryDate} ({slotWindowText})
            </h5>
            <p className="text-slate-500 text-[11px]">
              Consolidated 3-hour batch delivery window
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 pt-3 border-t border-slate-100">
          <div className="p-2 rounded-xl bg-slate-100 text-slate-600 mt-0.5">
            <MapPin className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Delivery Address
            </span>
            <h5 className="font-bold text-slate-900 mt-0.5">
              {order.addressSnapshot?.recipientName} • {order.addressSnapshot?.phone}
            </h5>
            <p className="text-slate-500 leading-relaxed">
              {order.addressSnapshot?.street}, {order.addressSnapshot?.city} - {order.addressSnapshot?.pincode}
            </p>
          </div>
        </div>
      </div>

      {/* 🛍️ ORDERED ITEMS & DETAILED BILL BREAKDOWN */}
      <div className="rounded-3xl bg-white border border-slate-200/80 p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-slate-600" />
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
              Ordered Items ({order.items.length})
            </h4>
          </div>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {order.items.map((item) => (
            <div key={item.id} className="py-2.5 flex items-center justify-between">
              <div>
                <h5 className="font-bold text-slate-900">{item.productNameSnapshot}</h5>
                <span className="text-slate-400 text-[11px]">
                  {item.quantity} x {formatCurrency(Number(item.unitPrice))}
                </span>
              </div>
              <span className="font-black text-slate-800">
                {formatCurrency(Number(item.total))}
              </span>
            </div>
          ))}
        </div>

        {/* Bill Summary */}
        <div className="pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
          <div className="flex justify-between">
            <span>Item Total</span>
            <span>{formatCurrency(Number(order.subtotal))}</span>
          </div>
          <div className="flex justify-between">
            <span>Taxes & GST (5%)</span>
            <span>{formatCurrency(Number(order.tax))}</span>
          </div>
          <div className="flex justify-between">
            <span>Delivery Partner Fee</span>
            <span className="text-emerald-700 font-bold">
              {Number(order.deliveryFee) === 0 ? 'FREE' : formatCurrency(Number(order.deliveryFee))}
            </span>
          </div>
          <div className="pt-2.5 border-t border-slate-200 flex justify-between font-black text-base text-slate-900">
            <span>Total Payable (Cash on Delivery)</span>
            <span className="text-emerald-800">{formatCurrency(Number(order.total))}</span>
          </div>

          <div className="pt-3">
            <button
              onClick={() => window.open(`/api/invoices/order/${order.id}/download`, '_blank')}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 transition active:scale-98 shadow-2xs"
            >
              <Download className="w-4 h-4 text-emerald-700" />
              <span>Download Official Tax Invoice (GST PDF)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
