'use client';

import { useState, useCallback } from 'react';
import { ArrowLeft, ArrowRight, Plus, MapPin, Truck, CreditCard, ClipboardList } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  type Lang,
  type Address,
  type Order,
  type PaymentMethod,
  type DeliverySlot,
} from '@/types/ggh';
import { t } from '@/lib/ggh/i18n';
import { useLangStore } from '@/stores/lang-store';
import { api } from '@/services/api';
import AddressCard from './AddressCard';
import AddressForm from './AddressForm';
import DeliverySlotPicker from './DeliverySlotPicker';
import PaymentMethodSelector from './PaymentMethodSelector';
import OrderSummary from './OrderSummary';
import OrderSuccess from './OrderSuccess';

interface CheckoutFlowProps {
  addresses: Address[];
  deliverySlots: DeliverySlot[];
  lang?: Lang;
  onComplete: (_order: Order) => void;
}

type CheckoutStep = 'address' | 'slot' | 'payment' | 'summary' | 'success';

const stepConfig: { id: CheckoutStep; labelKey: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'address', labelKey: 'deliveryAddress', Icon: MapPin },
  { id: 'slot', labelKey: 'deliverySlot', Icon: Truck },
  { id: 'payment', labelKey: 'paymentMethod', Icon: CreditCard },
  { id: 'summary', labelKey: 'checkout', Icon: ClipboardList },
];

export default function CheckoutFlow({ addresses, deliverySlots, lang: langProp, onComplete }: CheckoutFlowProps) {
  const { lang: storeLang, isRTL } = useLangStore();
  const lang = langProp ?? storeLang;
  const queryClient = useQueryClient();

  const [currentStep, setCurrentStep] = useState<CheckoutStep>('address');
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    addresses.find((a) => a.isDefault)?.id || null
  );
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [localAddresses, setLocalAddresses] = useState<Address[]>(addresses);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [isPlacing, setIsPlacing] = useState(false);

  const allAddresses = localAddresses;
  const selectedAddress = allAddresses.find((a) => a.id === selectedAddressId);

  const stepIndex = stepConfig.findIndex((s) => s.id === currentStep);
  const canGoNext = (() => {
    switch (currentStep) {
      case 'address': return !!selectedAddressId;
      case 'slot': return !!selectedSlot;
      case 'payment': return true;
      case 'summary': return true;
      default: return false;
    }
  })();

  const goNext = useCallback(() => {
    const nextIndex = stepIndex + 1;
    if (nextIndex < stepConfig.length) {
      setCurrentStep(stepConfig[nextIndex].id);
    }
  }, [stepIndex]);

  const goBack = useCallback(() => {
    const prevIndex = stepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(stepConfig[prevIndex].id);
    }
  }, [stepIndex]);

  const handlePlaceOrder = async () => {
    if (!selectedAddressId || !selectedSlot) return;
    setIsPlacing(true);
    try {
      const response = await api.checkout({
        addressId: selectedAddressId,
        deliverySlot: selectedSlot,
        deliveryDate: selectedDate,
        paymentMethod,
        notes: '',
      });
      const order = response.data;
      setPlacedOrder(order);
      setCurrentStep('success');
      onComplete(order);
    } catch (err) {
      const message = err instanceof Error ? err.message : t(lang, 'errorGeneric');
      toast.error(message);
    } finally {
      setIsPlacing(false);
    }
  };

  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Step indicator */}
      {currentStep !== 'success' && (
        <div className="mb-6">
          <div className="flex items-center justify-between">
            {stepConfig.map((step, index) => {
              const isActive = index === stepIndex;
              const isCompleted = index < stepIndex;
              const StepIcon = step.Icon;

              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
                      style={{
                        backgroundColor: isCompleted
                          ? 'var(--ggh-primary)'
                          : isActive
                          ? '#E8F5E9'
                          : '#F5F5F5',
                        color: isCompleted
                          ? '#FFFFFF'
                          : isActive
                          ? 'var(--ggh-primary)'
                          : 'var(--ggh-text-secondary)',
                      }}
                    >
                      {isCompleted ? (
                        <span className="text-sm font-bold">✓</span>
                      ) : (
                        <StepIcon className="size-4" />
                      )}
                    </div>
                    <span
                      className="text-[10px] sm:text-xs font-medium mt-1 text-center"
                      style={{
                        color: isActive || isCompleted ? 'var(--ggh-primary)' : 'var(--ggh-text-secondary)',
                      }}
                    >
                      {t(lang, step.labelKey)}
                    </span>
                  </div>
                  {index < stepConfig.length - 1 && (
                    <div
                      className="h-0.5 flex-1 mt-[-16px]"
                      style={{
                        backgroundColor: isCompleted ? 'var(--ggh-primary)' : '#E0E0E0',
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Step content */}
      <AnimatePresence mode="wait">
        {currentStep === 'address' && (
          <motion.div
            key="address"
            initial={{ x: isRTL ? -30 : 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: isRTL ? 30 : -30, opacity: 0 }}
            className="space-y-4"
          >
            <h2 className="text-lg font-bold" style={{ color: 'var(--ggh-text)' }}>
              {t(lang, 'selectAddress')}
            </h2>

            {showAddressForm ? (
              <AddressForm
                onSubmit={(newAddress) => {
                  setLocalAddresses((prev) => [...prev, newAddress]);
                  setSelectedAddressId(newAddress.id);
                  setShowAddressForm(false);
                  queryClient.invalidateQueries({ queryKey: ['addresses'] });
                }}
                onCancel={() => setShowAddressForm(false)}
                lang={lang}
              />
            ) : (
              <>
                <div className="space-y-2">
                  {allAddresses.map((addr) => (
                    <AddressCard
                      key={addr.id}
                      address={addr}
                      selected={addr.id === selectedAddressId}
                      onSelect={setSelectedAddressId}
                      lang={lang}
                    />
                  ))}
                </div>

                <Button
                  variant="outline"
                  className="w-full h-12 text-sm font-medium rounded-xl"
                  style={{ borderColor: 'var(--ggh-primary)', color: 'var(--ggh-primary)' }}
                  onClick={() => setShowAddressForm(true)}
                >
                  <Plus className="size-4 me-2" />
                  {t(lang, 'addNewAddress')}
                </Button>
              </>
            )}
          </motion.div>
        )}

        {currentStep === 'slot' && (
          <motion.div
            key="slot"
            initial={{ x: isRTL ? -30 : 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: isRTL ? 30 : -30, opacity: 0 }}
          >
            <DeliverySlotPicker
              slots={deliverySlots}
              selectedSlot={selectedSlot}
              onSelectSlot={setSelectedSlot}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              lang={lang}
            />
          </motion.div>
        )}

        {currentStep === 'payment' && (
          <motion.div
            key="payment"
            initial={{ x: isRTL ? -30 : 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: isRTL ? 30 : -30, opacity: 0 }}
          >
            <PaymentMethodSelector
              selected={paymentMethod}
              onSelect={setPaymentMethod}
              lang={lang}
            />
          </motion.div>
        )}

        {currentStep === 'summary' && (
          <motion.div
            key="summary"
            initial={{ x: isRTL ? -30 : 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: isRTL ? 30 : -30, opacity: 0 }}
          >
            <OrderSummary
              address={selectedAddress}
              deliverySlotLabel={selectedSlot || ''}
              paymentMethod={paymentMethod}
              onPlaceOrder={handlePlaceOrder}
              isPlacing={isPlacing}
              lang={lang}
            />
          </motion.div>
        )}

        {currentStep === 'success' && placedOrder && (
          <motion.div
            key="success"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <OrderSuccess
              order={placedOrder}
              onContinueShopping={() => {}}
              lang={lang}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation buttons */}
      {currentStep !== 'success' && (
        <div className="flex gap-3 mt-6">
          {stepIndex > 0 && (
            <Button
              variant="outline"
              className="h-14 px-6 text-base font-medium rounded-xl"
              style={{ borderColor: 'var(--ggh-border)', color: 'var(--ggh-text-secondary)' }}
              onClick={goBack}
            >
              <BackArrow className="size-4 me-2" />
              {t(lang, 'back')}
            </Button>
          )}
          {currentStep !== 'summary' && (
            <Button
              className="flex-1 h-14 text-base font-bold rounded-xl"
              style={{ backgroundColor: 'var(--ggh-primary)', color: '#FFFFFF' }}
              onClick={goNext}
              disabled={!canGoNext}
            >
              {t(lang, 'next')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
