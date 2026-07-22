'use client';

import { useState } from 'react';
import { Home, Briefcase, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { type Address, type Lang } from '@/types/ggh';
import { t } from '@/lib/ggh/i18n';
import { useLangStore } from '@/stores/lang-store';
import { api } from '@/services/api';

interface AddressFormProps {
  initialData?: Partial<Address>;
  onSubmit: (data: Address) => void;
  onCancel?: () => void;
  lang?: Lang;
}

type AddressLabel = 'home' | 'work' | 'other';

export default function AddressForm({ initialData, onSubmit, onCancel, lang: langProp }: AddressFormProps) {
  const { lang: storeLang } = useLangStore();
  const lang = langProp ?? storeLang;

  const [label, setLabel] = useState<AddressLabel>(initialData?.label || 'home');
  const [addressLine1, setAddressLine1] = useState(initialData?.addressLine1 || '');
  const [addressLine2, setAddressLine2] = useState(initialData?.addressLine2 || '');
  const [city, setCity] = useState(initialData?.city || 'Cairo');
  const [area, setArea] = useState(initialData?.area || '');
  const [buildingNo, setBuildingNo] = useState(initialData?.buildingNo || '');
  const [floorNo, setFloorNo] = useState(initialData?.floorNo || '');
  const [apartmentNo, setApartmentNo] = useState(initialData?.apartmentNo || '');
  const [landmark, setLandmark] = useState(initialData?.landmark || '');
  const [deliveryInstructions, setDeliveryInstructions] = useState(initialData?.deliveryInstructions || '');
  const [isDefault, setIsDefault] = useState(initialData?.isDefault ?? true);

  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const response = await api.addAddress({
        label,
        addressLine1,
        addressLine2,
        city,
        area,
        buildingNo,
        floorNo,
        apartmentNo,
        landmark,
        latitude: null,
        longitude: null,
        deliveryZone: '',
        isDefault,
        deliveryInstructions,
      });
      onSubmit(response.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : t(lang, 'errorGeneric');
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const labelOptions: { value: AddressLabel; Icon: React.ComponentType<{ className?: string }>; labelKey: string }[] = [
    { value: 'home', Icon: Home, labelKey: 'home' },
    { value: 'work', Icon: Briefcase, labelKey: 'work' },
    { value: 'other', Icon: MapPin, labelKey: 'other' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Label selector */}
      <div className="space-y-2">
        <Label className="text-sm font-medium" style={{ color: 'var(--ggh-text)' }}>
          {t(lang, 'addressLabel')}
        </Label>
        <div className="flex gap-2">
          {labelOptions.map(({ value, Icon, labelKey }) => (
            <button
              key={value}
              type="button"
              onClick={() => setLabel(value)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all min-h-[48px]"
              style={{
                backgroundColor: label === value ? '#E8F5E9' : '#FAFAFA',
                border: label === value ? '2px solid var(--ggh-primary)' : '1px solid var(--ggh-border)',
                color: label === value ? 'var(--ggh-primary)' : 'var(--ggh-text-secondary)',
              }}
              aria-pressed={label === value}
            >
              <Icon className="size-4" />
              {t(lang, labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Street address */}
      <div className="space-y-2">
        <Label htmlFor="addr-line1" className="text-sm font-medium" style={{ color: 'var(--ggh-text)' }}>
          {t(lang, 'addressLine1')}
        </Label>
        <Input
          id="addr-line1"
          value={addressLine1}
          onChange={(e) => setAddressLine1(e.target.value)}
          className="h-12 rounded-xl"
          required
          aria-label={t(lang, 'addressLine1')}
        />
      </div>

      {/* Address line 2 */}
      <div className="space-y-2">
        <Label htmlFor="addr-line2" className="text-sm font-medium" style={{ color: 'var(--ggh-text)' }}>
          {t(lang, 'addressLine2')}
        </Label>
        <Input
          id="addr-line2"
          value={addressLine2}
          onChange={(e) => setAddressLine2(e.target.value)}
          className="h-12 rounded-xl"
          aria-label={t(lang, 'addressLine2')}
        />
      </div>

      {/* City + Area row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="addr-city" className="text-sm font-medium" style={{ color: 'var(--ggh-text)' }}>
            {t(lang, 'city')}
          </Label>
          <Input
            id="addr-city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="h-12 rounded-xl"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="addr-area" className="text-sm font-medium" style={{ color: 'var(--ggh-text)' }}>
            {t(lang, 'area')}
          </Label>
          <Input
            id="addr-area"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className="h-12 rounded-xl"
            required
          />
        </div>
      </div>

      {/* Building, Floor, Apartment row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label htmlFor="addr-building" className="text-sm font-medium" style={{ color: 'var(--ggh-text)' }}>
            {t(lang, 'buildingNo')}
          </Label>
          <Input
            id="addr-building"
            value={buildingNo}
            onChange={(e) => setBuildingNo(e.target.value)}
            className="h-12 rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="addr-floor" className="text-sm font-medium" style={{ color: 'var(--ggh-text)' }}>
            {t(lang, 'floorNo')}
          </Label>
          <Input
            id="addr-floor"
            value={floorNo}
            onChange={(e) => setFloorNo(e.target.value)}
            className="h-12 rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="addr-apt" className="text-sm font-medium" style={{ color: 'var(--ggh-text)' }}>
            {t(lang, 'apartmentNo')}
          </Label>
          <Input
            id="addr-apt"
            value={apartmentNo}
            onChange={(e) => setApartmentNo(e.target.value)}
            className="h-12 rounded-xl"
          />
        </div>
      </div>

      {/* Landmark */}
      <div className="space-y-2">
        <Label htmlFor="addr-landmark" className="text-sm font-medium" style={{ color: 'var(--ggh-text)' }}>
          {t(lang, 'landmark')}
        </Label>
        <Input
          id="addr-landmark"
          value={landmark}
          onChange={(e) => setLandmark(e.target.value)}
          className="h-12 rounded-xl"
        />
      </div>

      {/* Delivery instructions */}
      <div className="space-y-2">
        <Label htmlFor="addr-instructions" className="text-sm font-medium" style={{ color: 'var(--ggh-text)' }}>
          {t(lang, 'deliveryInstructions')}
        </Label>
        <Textarea
          id="addr-instructions"
          value={deliveryInstructions}
          onChange={(e) => setDeliveryInstructions(e.target.value)}
          className="min-h-[80px] rounded-xl"
          placeholder={t(lang, 'orderNotesPlaceholder')}
        />
      </div>

      {/* Set as default */}
      <div className="flex items-center justify-between py-2">
        <Label htmlFor="addr-default" className="text-sm font-medium cursor-pointer" style={{ color: 'var(--ggh-text)' }}>
          {t(lang, 'setAsDefault')}
        </Label>
        <Switch
          id="addr-default"
          checked={isDefault}
          onCheckedChange={setIsDefault}
        />
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button
          type="submit"
          className="flex-1 h-14 text-base font-bold rounded-xl"
          style={{ backgroundColor: 'var(--ggh-primary)', color: '#FFFFFF' }}
          disabled={isSaving}
        >
          {isSaving ? '...' : t(lang, 'saveAddress')}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            className="h-14 px-6 text-base font-medium rounded-xl"
            style={{ borderColor: 'var(--ggh-border)', color: 'var(--ggh-text-secondary)' }}
            onClick={onCancel}
          >
            {t(lang, 'cancel')}
          </Button>
        )}
      </div>
    </form>
  );
}
