import React, { useEffect, useState } from 'react';
import { StoreDTO } from '@quickcommerce/shared';
import { apiRequest } from '../api/client';
import { useCart } from '../context/CartContext';
import { Modal, Button } from '@quickcommerce/ui';
import { Store, MapPin, AlertTriangle, Check } from 'lucide-react';

export interface StoreChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StoreChangeModal: React.FC<StoreChangeModalProps> = ({ isOpen, onClose }) => {
  const { selectedStore, selectStore, cart } = useCart();
  const [stores, setStores] = useState<StoreDTO[]>([]);
  const [pendingStore, setPendingStore] = useState<StoreDTO | null>(null);
  const [showConfirmClear, setShowConfirmClear] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      apiRequest<StoreDTO[]>('/stores?isActive=true').then(setStores).catch(console.error);
    }
  }, [isOpen]);

  const handleSelect = async (store: StoreDTO) => {
    if (store.id === selectedStore?.id) {
      onClose();
      return;
    }

    if (cart && cart.itemCount > 0) {
      setPendingStore(store);
      setShowConfirmClear(true);
    } else {
      await selectStore(store, false);
      onClose();
    }
  };

  const handleConfirmSwitch = async () => {
    if (pendingStore) {
      await selectStore(pendingStore, true);
      setShowConfirmClear(false);
      setPendingStore(null);
      onClose();
    }
  };

  return (
    <>
      <Modal isOpen={isOpen && !showConfirmClear} onClose={onClose} title="Select Delivery Dark Store">
        <p className="text-xs text-slate-500 mb-4">
          Choose a store nearest to your delivery location. Inventory and scheduled delivery slots are store-specific.
        </p>

        <div className="space-y-2.5">
          {stores.map((st) => {
            const isSelected = st.id === selectedStore?.id;
            return (
              <div
                key={st.id}
                onClick={() => handleSelect(st)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-600/20'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl ${isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    <Store className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{st.name}</h4>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                      <span>{st.address}, {st.city}</span>
                    </p>
                    <span className="inline-block mt-1 text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                      Open {st.openingTime} – {st.closingTime}
                    </span>
                  </div>
                </div>

                {isSelected && <Check className="h-5 w-5 text-emerald-600 shrink-0 ml-2" />}
              </div>
            );
          })}
        </div>
      </Modal>

      {/* Confirmation Modal when Cart is not empty */}
      <Modal
        isOpen={showConfirmClear}
        onClose={() => setShowConfirmClear(false)}
        title="Change Store & Clear Cart?"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setShowConfirmClear(false)}>
              Keep Current Store
            </Button>
            <Button variant="destructive" size="sm" onClick={handleConfirmSwitch}>
              Clear Cart & Switch
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-3 text-slate-700">
          <div className="p-2 rounded-xl bg-rose-100 text-rose-600 shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium">
              You currently have <span className="font-bold text-slate-900">{cart?.itemCount} items</span> in your cart from <span className="font-bold">{selectedStore?.name}</span>.
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Switching to <span className="font-semibold text-slate-800">{pendingStore?.name}</span> will clear your existing cart items because inventory is store-specific.
            </p>
          </div>
        </div>
      </Modal>
    </>
  );
};
