import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { apiRequest, ApiError } from '../api/client';
import { AddressDTO, DeliverySlotDTO, OrderDTO, PaymentMethod } from '@quickcommerce/shared';
import { Button, SlotCard, formatCurrency, Modal, Input } from '@quickcommerce/ui';
import { MapPin, Calendar, Clock, ShieldCheck, ArrowLeft, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';

export const CheckoutPage: React.FC = () => {
  const { cart, selectedStore, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [addresses, setAddresses] = useState<AddressDTO[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  
  // Date & Slot state
  const todayStr = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [slots, setSlots] = useState<DeliverySlotDTO[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);

  // Address modal
  const [isAddAddressOpen, setIsAddAddressOpen] = useState<boolean>(false);
  const [newRecipient, setNewRecipient] = useState<string>(user?.name || '');
  const [newPhone, setNewPhone] = useState<string>(user?.phone || '9876543210');
  const [newStreet, setNewStreet] = useState<string>('');
  const [newApt, setNewApt] = useState<string>('');
  const [newPincode, setNewPincode] = useState<string>('560038');

  // Checkout submission state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load user addresses
  useEffect(() => {
    if (user) {
      apiRequest<any>('/auth/me').then((profile) => {
        // Fetch or simulate addresses
        const defaultAddr: AddressDTO = {
          id: 'addr-default-1',
          customerId: user.id,
          type: 'HOME',
          recipientName: user.name || 'Aarav Sharma',
          phone: user.phone || '+91 9988776655',
          street: '#402, Green Glen Towers, 12th Main Road',
          apartment: 'Flat 402, B-Block',
          landmark: 'Near BDA Complex',
          city: selectedStore?.city || 'Bengaluru',
          state: selectedStore?.state || 'Karnataka',
          pincode: selectedStore?.pincode || '560038',
          isDefault: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setAddresses([defaultAddr]);
        setSelectedAddressId(defaultAddr.id);
      }).catch(console.error);
    }
  }, [user, selectedStore]);

  // Fetch slots for selected date & store
  useEffect(() => {
    if (!selectedStore) return;
    setLoadingSlots(true);
    setErrorMessage(null);

    apiRequest<DeliverySlotDTO[]>(`/slots?storeId=${selectedStore.id}&date=${selectedDate}`)
      .then((data) => {
        setSlots(data);
        const firstAvailable = data.find((s) => s.status === 'OPEN' && s.availableCapacity > 0);
        if (firstAvailable) {
          setSelectedSlotId(firstAvailable.id);
        } else {
          setSelectedSlotId('');
        }
      })
      .catch((err) => {
        console.error('Failed to load slots:', err);
      })
      .finally(() => {
        setLoadingSlots(false);
      });
  }, [selectedStore, selectedDate]);

  if (!cart || cart.items.length === 0) {
    navigate('/cart');
    return null;
  }

  const handlePlaceOrder = async () => {
    if (isSubmitting) return;
    if (!selectedStore || !selectedAddressId || !selectedSlotId) {
      setErrorMessage('Please select a delivery address and a delivery slot.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    // Generate unique UUID Idempotency-Key for double submit protection
    const idempotencyKey = `chk-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

    try {
      const order = await apiRequest<OrderDTO>('/orders/checkout', {
        method: 'POST',
        idempotencyKey,
        body: JSON.stringify({
          storeId: selectedStore.id,
          addressId: selectedAddressId,
          deliveryDate: selectedDate,
          deliverySlotId: selectedSlotId,
          paymentMethod: PaymentMethod.COD,
          items: cart.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
          })),
        }),
      });

      // Clear client cart state
      await clearCart();

      // Navigate to order confirmation
      navigate(`/order-confirmation/${order.id}`, { state: { order } });
    } catch (err: any) {
      console.error('Checkout error:', err);
      if (err instanceof ApiError) {
        if (err.code === 'SLOT_FULL') {
          setErrorMessage('The delivery slot you selected just filled up. Please pick another slot window.');
        } else if (err.code === 'OUT_OF_STOCK') {
          setErrorMessage('One or more items in your cart became out of stock. Please adjust quantities.');
        } else {
          setErrorMessage(err.message || 'Checkout failed. Please retry.');
        }
      } else {
        setErrorMessage('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAddress = () => {
    if (!newStreet || !newRecipient || !newPhone || !newApt || !newPincode) {
      alert('Please fill all address fields.');
      return;
    }
    const newAddr: AddressDTO = {
      id: `addr-${Date.now()}`,
      customerId: user?.id || 'cust',
      type: 'HOME',
      recipientName: newRecipient,
      phone: newPhone,
      street: newStreet,
      apartment: newApt,
      city: selectedStore?.city || 'Bengaluru',
      state: selectedStore?.state || 'Karnataka',
      pincode: newPincode,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setAddresses((prev) => [...prev, newAddr]);
    setSelectedAddressId(newAddr.id);
    setIsAddAddressOpen(false);
  };

  return (
    <div className="pb-32 max-w-2xl mx-auto px-4 pt-3 space-y-5">
      {/* Top Header */}
      <div className="flex items-center gap-2">
        <button onClick={() => navigate('/cart')} className="p-2 rounded-xl bg-white border border-slate-200 shadow-xs">
          <ArrowLeft className="h-4 w-4 text-slate-700" />
        </button>
        <div>
          <h2 className="text-base font-black text-slate-900">Checkout</h2>
          <p className="text-[11px] text-slate-500">Fulfilled by {selectedStore?.name}</p>
        </div>
      </div>

      {/* Error alert if any */}
      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-800 text-xs">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{errorMessage}</div>
        </div>
      )}

      {/* 1. Delivery Address Section */}
      <section className="rounded-3xl bg-white border border-slate-200/80 p-4 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-emerald-700" />
            <h3 className="text-sm font-bold text-slate-900">Delivery Address</h3>
          </div>
          <button
            onClick={() => setIsAddAddressOpen(true)}
            className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-0.5"
          >
            <Plus className="h-3.5 w-3.5" /> Add New
          </button>
        </div>

        <div className="space-y-2">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              onClick={() => setSelectedAddressId(addr.id)}
              className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                selectedAddressId === addr.id
                  ? 'border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-600'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="text-xs space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">{addr.recipientName}</span>
                  <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-[10px] font-semibold text-slate-600 uppercase">
                    {addr.type}
                  </span>
                </div>
                <p className="text-slate-600">{addr.apartment ? `${addr.apartment}, ` : ''}{addr.street}</p>
                <p className="text-slate-400">{addr.city}, {addr.state} - {addr.pincode} • Phone: {addr.phone}</p>
              </div>
              {selectedAddressId === addr.id && <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />}
            </div>
          ))}
        </div>
      </section>

      {/* 2. Scheduled Delivery Slot Section */}
      <section className="rounded-3xl bg-white border border-slate-200/80 p-4 space-y-3.5 shadow-xs">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-emerald-700" />
          <div>
            <h3 className="text-sm font-bold text-slate-900">Select 3-Hour Delivery Slot</h3>
            <p className="text-[11px] text-slate-500">Orders in each window are consolidated for efficient batch delivery.</p>
          </div>
        </div>

        {/* Date Selector Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-100">
          <button
            type="button"
            onClick={() => setSelectedDate(todayStr)}
            className={`py-2 rounded-xl text-xs font-bold transition-all ${
              selectedDate === todayStr ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Today, {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </button>
          <button
            type="button"
            onClick={() => setSelectedDate(tomorrowStr)}
            className={`py-2 rounded-xl text-xs font-bold transition-all ${
              selectedDate === tomorrowStr ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tomorrow, {tomorrow.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </button>
        </div>

        {/* 4 Daily Slots */}
        <div className="space-y-2 pt-1">
          {loadingSlots ? (
            <div className="space-y-2">
              <div className="h-16 rounded-2xl bg-slate-100 animate-pulse" />
              <div className="h-16 rounded-2xl bg-slate-100 animate-pulse" />
            </div>
          ) : (
            slots.map((slot) => (
              <SlotCard
                key={slot.id}
                slot={slot}
                isSelected={selectedSlotId === slot.id}
                onSelect={(sl) => setSelectedSlotId(sl.id)}
              />
            ))
          )}
        </div>
      </section>

      {/* 3. Payment Method Section */}
      <section className="rounded-3xl bg-white border border-slate-200/80 p-4 space-y-2 shadow-xs">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-700" />
          <h3 className="text-sm font-bold text-slate-900">Payment Option</h3>
        </div>

        <div className="p-3.5 rounded-2xl border border-emerald-600 bg-emerald-50/40 flex items-center justify-between">
          <div className="text-xs">
            <span className="font-extrabold text-slate-900 block">Cash on Delivery (COD)</span>
            <span className="text-slate-500 text-[11px]">Pay cash to driver upon entering verified 6-digit OTP</span>
          </div>
          <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white font-bold text-[10px]">
            ACTIVE
          </span>
        </div>
      </section>

      {/* 4. Order Price Summary */}
      <section className="rounded-3xl bg-white border border-slate-200/80 p-4 space-y-2 text-xs text-slate-600 shadow-xs">
        <div className="flex justify-between">
          <span>Items ({cart.itemCount})</span>
          <span className="font-semibold text-slate-900">{formatCurrency(cart.subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span>Taxes & GST (5%)</span>
          <span className="font-semibold text-slate-900">{formatCurrency(cart.tax)}</span>
        </div>
        <div className="flex justify-between">
          <span>Delivery Fee</span>
          {cart.deliveryFee === 0 ? (
            <span className="font-bold text-emerald-600">FREE</span>
          ) : (
            <span className="font-semibold text-slate-900">{formatCurrency(cart.deliveryFee)}</span>
          )}
        </div>
        <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline text-sm font-black text-slate-900">
          <span>Total to Pay</span>
          <span className="text-base text-emerald-800">{formatCurrency(cart.grandTotal)}</span>
        </div>
      </section>

      {/* Sticky Submit Bar with Double Submit Protection */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 p-4 shadow-lg">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase block">Cash to Pay</span>
            <span className="text-lg font-black text-slate-900">{formatCurrency(cart.grandTotal)}</span>
          </div>

          <Button
            variant="emerald"
            size="lg"
            className="px-8 shadow-md"
            isLoading={isSubmitting}
            disabled={isSubmitting || !selectedSlotId}
            onClick={handlePlaceOrder}
          >
            Place Order (COD)
          </Button>
        </div>
      </div>

      {/* Add Address Modal */}
      <Modal
        isOpen={isAddAddressOpen}
        onClose={() => setIsAddAddressOpen(false)}
        title="Add Delivery Address"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsAddAddressOpen(false)}>
              Cancel
            </Button>
            <Button variant="emerald" size="sm" onClick={handleCreateAddress}>
              Save Address
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label="Recipient Full Name" value={newRecipient} onChange={(e) => setNewRecipient(e.target.value)} />
          <Input label="Phone Number" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
          <Input label="Flat / House / Apartment No." value={newApt} onChange={(e) => setNewApt(e.target.value)} />
          <Input label="Street Address / Area" value={newStreet} onChange={(e) => setNewStreet(e.target.value)} />
          <Input label="Pincode" value={newPincode} onChange={(e) => setNewPincode(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
};
