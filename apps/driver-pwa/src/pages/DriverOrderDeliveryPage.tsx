import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { OrderDTO, OrderStatus } from '@quickcommerce/shared';
import { apiRequest, ApiError } from '../api/client';
import { Button, StatusBadge, formatCurrency, Modal, Input } from '@quickcommerce/ui';
import { ArrowLeft, Phone, MapPin, KeyRound, CheckCircle2, ShieldCheck, AlertCircle, ShoppingBag } from 'lucide-react';

export const DriverOrderDeliveryPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<OrderDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // OTP Verification state
  const [isOtpModalOpen, setIsOtpModalOpen] = useState<boolean>(false);
  const [otpInput, setOtpInput] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  useEffect(() => {
    async function loadOrder() {
      if (!orderId) return;
      setLoading(true);
      try {
        const data = await apiRequest<OrderDTO>(`/orders/${orderId}`);
        setOrder(data);
        if (data.status === OrderStatus.DELIVERED) {
          setIsSuccess(true);
        }
      } catch (err) {
        console.error('Failed to load order:', err);
      } finally {
        setLoading(false);
      }
    }
    loadOrder();
  }, [orderId]);

  if (loading || !order) {
    return (
      <div className="p-4 space-y-4 max-w-md mx-auto">
        <div className="h-32 bg-slate-900 rounded-3xl animate-pulse" />
      </div>
    );
  }

  const handleVerifyOtp = async () => {
    if (otpInput.length !== 6) {
      setErrorMessage('Please enter the full 6-digit OTP provided by the customer.');
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);

    try {
      await apiRequest('/otp/verify', {
        method: 'POST',
        body: JSON.stringify({
          orderId: order.id,
          otp: otpInput,
        }),
      });

      setIsSuccess(true);
      setIsOtpModalOpen(false);
    } catch (err: any) {
      console.error('OTP Verification failed:', err);
      if (err instanceof ApiError) {
        setErrorMessage(err.message || 'Invalid OTP code entered.');
      } else {
        setErrorMessage('Verification failed. Please check OTP and retry.');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const phone = order.customer?.phone || order.addressSnapshot?.phone || '+91 9845099881';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 pb-32 max-w-md mx-auto space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Stops
        </button>
        <StatusBadge status={order.status} />
      </div>

      {/* Customer Contact & Address Card */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Customer Stop
            </span>
            <h2 className="text-lg font-black text-white mt-0.5">
              {order.customer?.name || order.addressSnapshot?.recipientName}
            </h2>
          </div>

          <a
            href={`tel:${phone}`}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs shadow-md transition-transform active:scale-95"
          >
            <Phone className="h-4 w-4 fill-slate-950" /> Call
          </a>
        </div>

        {/* Address */}
        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-850 flex items-start gap-2.5 text-xs text-slate-300">
          <MapPin className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-white">
              {order.addressSnapshot?.apartment ? `${order.addressSnapshot.apartment}, ` : ''}
              {order.addressSnapshot?.street}
            </p>
            <p className="text-slate-400 mt-0.5">
              {order.addressSnapshot?.city} - {order.addressSnapshot?.pincode}
            </p>
          </div>
        </div>
      </div>

      {/* CASH TO COLLECT CARD */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-xl space-y-1">
        <span className="text-xs font-black uppercase tracking-wider text-amber-950 block">
          Cash to Collect (COD)
        </span>
        <div className="flex items-baseline justify-between">
          <span className="text-3xl font-black">{formatCurrency(Number(order.total))}</span>
          <span className="text-xs font-bold bg-white/70 px-2.5 py-1 rounded-xl">
            Collect Cash First
          </span>
        </div>
      </div>

      {/* Ordered Items Checklist */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Package Contents ({order.items.length} items)
        </h4>

        <div className="divide-y divide-slate-800 text-xs">
          {order.items.map((item) => (
            <div key={item.id} className="py-2.5 flex items-center justify-between">
              <div>
                <span className="font-bold text-white">{item.productNameSnapshot}</span>
                <p className="text-[11px] text-slate-400">{item.unitSnapshot}</p>
              </div>
              <span className="font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                Qty: {item.quantity}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 p-4 max-w-md mx-auto">
        {isSuccess ? (
          <div className="space-y-2">
            <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center justify-center gap-2">
              <CheckCircle2 className="h-5 w-5" /> Delivery Completed Successfully!
            </div>
            <Button
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold"
              onClick={() => navigate(-1)}
            >
              Next Delivery Stop
            </Button>
          </div>
        ) : (
          <Button
            size="lg"
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-base shadow-lg shadow-emerald-500/20"
            leftIcon={<KeyRound className="h-5 w-5" />}
            onClick={() => {
              setOtpInput('');
              setErrorMessage(null);
              setIsOtpModalOpen(true);
            }}
          >
            Verify Customer OTP
          </Button>
        )}
      </div>

      {/* OTP Verification Modal */}
      <Modal
        isOpen={isOtpModalOpen}
        onClose={() => setIsOtpModalOpen(false)}
        title="Enter Customer Delivery OTP"
        maxWidth="sm"
        className="bg-slate-900 text-white border-slate-800"
      >
        <div className="space-y-4 pt-1">
          <p className="text-xs text-slate-400">
            Ask customer for their 6-digit OTP displayed on their order confirmation screen.
          </p>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="py-2">
            <input
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              autoFocus
              placeholder="••••••"
              value={otpInput}
              onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
              className="w-full text-center text-3xl font-mono font-black tracking-[0.4em] rounded-2xl bg-slate-950 border-2 border-emerald-500/60 p-3 text-white focus:border-emerald-400 focus:outline-none"
            />
          </div>

          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-400 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span>Ensure you have collected {formatCurrency(Number(order.total))} in cash before confirming.</span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="bg-slate-800 border-slate-700 text-slate-300"
              onClick={() => setIsOtpModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="md"
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black"
              isLoading={isVerifying}
              disabled={isVerifying || otpInput.length !== 6}
              onClick={handleVerifyOtp}
            >
              Verify & Complete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
