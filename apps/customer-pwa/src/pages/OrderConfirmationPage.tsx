import React from 'react';
import { useLocation, useParams, useNavigate, Link } from 'react-router-dom';
import { OrderDTO } from '@quickcommerce/shared';
import { Button, formatCurrency } from '@quickcommerce/ui';
import { CheckCircle2, KeyRound, Clock, MapPin, ArrowRight, ShieldCheck, Home } from 'lucide-react';

export const OrderConfirmationPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const order = (location.state as any)?.order as OrderDTO | undefined;

  return (
    <div className="pb-20 max-w-lg mx-auto px-4 pt-6 space-y-5 text-center">
      {/* Celebration Icon */}
      <div className="h-20 w-20 mx-auto rounded-3xl bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm animate-in zoom-in-75 duration-300">
        <CheckCircle2 className="h-10 w-10" />
      </div>

      <div className="space-y-1">
        <h2 className="text-xl font-black text-slate-900">Order Placed Successfully!</h2>
        <p className="text-xs text-slate-500">
          Order Number: <span className="font-bold text-slate-800">{order?.orderNumber || orderId}</span>
        </p>
      </div>

      {/* SECURE DELIVERY OTP CARD */}
      <div className="rounded-3xl bg-gradient-to-br from-amber-500 to-amber-600 p-5 text-slate-950 text-left shadow-md space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
            <KeyRound className="h-4 w-4" /> Secure Delivery OTP
          </span>
          <span className="text-[11px] font-bold bg-white/40 px-2 py-0.5 rounded-md">
            Required at Doorstep
          </span>
        </div>

        <div className="py-2 text-center">
          <span className="text-4xl font-black tracking-[0.3em] font-mono text-slate-950 bg-white/70 px-6 py-2 rounded-2xl inline-block shadow-inner">
            {order?.deliveryOtp || '123456'}
          </span>
        </div>

        <p className="text-[11px] font-medium text-amber-950 text-center">
          Share this 6-digit code with the delivery driver only after inspecting your items and paying cash.
        </p>
      </div>

      {/* Delivery Slot & Address Details */}
      <div className="rounded-3xl bg-white border border-slate-200/80 p-4 text-left space-y-3 shadow-xs text-xs">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900">Scheduled Delivery Slot</h4>
            <p className="text-slate-600 mt-0.5">
              {order?.deliveryDate || 'Today'} • {order?.deliverySlot?.startTime ? `${order.deliverySlot.startTime} – ${order.deliverySlot.endTime}` : '03:00 PM – 06:00 PM'}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 pt-2 border-t border-slate-100">
          <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
            <MapPin className="h-4 w-4" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900">Delivery Address</h4>
            <p className="text-slate-600 mt-0.5">
              {order?.addressSnapshot?.street || 'Indiranagar, HAL 2nd Stage'}, {order?.addressSnapshot?.city || 'Bengaluru'}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 pt-2 border-t border-slate-100">
          <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900">Cash to Pay (COD)</h4>
            <p className="text-base font-black text-emerald-800 mt-0.5">
              {formatCurrency(Number(order?.total || 472.5))}
            </p>
          </div>
        </div>
      </div>

      {/* Action CTAs */}
      <div className="space-y-2 pt-2">
        <Button
          variant="emerald"
          size="lg"
          className="w-full"
          rightIcon={<ArrowRight className="h-4 w-4" />}
          onClick={() => navigate(`/orders/${order?.id || orderId}`)}
        >
          Track Live Order Status
        </Button>

        <Button
          variant="outline"
          size="md"
          className="w-full"
          leftIcon={<Home className="h-4 w-4" />}
          onClick={() => navigate('/')}
        >
          Return to Home
        </Button>
      </div>
    </div>
  );
};
