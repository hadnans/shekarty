'use client';

import { Home, Briefcase, MapPin, Pencil, Trash2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { type Address, type Lang } from '@/types/ggh';
import { t } from '@/lib/ggh/i18n';
import { useLangStore } from '@/stores/lang-store';

interface AddressCardProps {
  address: Address;
  selected: boolean;
  onSelect: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  lang?: Lang;
}

const labelIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  home: Home,
  work: Briefcase,
  other: MapPin,
};

export default function AddressCard({
  address,
  selected,
  onSelect,
  onEdit,
  onDelete,
  lang: langProp,
}: AddressCardProps) {
  const { lang: storeLang } = useLangStore();
  const lang = langProp ?? storeLang;

  const LabelIcon = labelIcons[address.label] || MapPin;
  const labelKey = address.label === 'home' ? 'home' : address.label === 'work' ? 'work' : 'other';

  return (
    <div
      className={`p-4 rounded-xl transition-all ${
        selected ? 'ring-2' : ''
      }`}
      style={{
        backgroundColor: selected ? '#E8F5E9' : '#FAFAFA',
        border: selected ? 'none' : '1px solid var(--ggh-border)',
        ringColor: selected ? 'var(--ggh-primary)' : undefined,
      }}
    >
      <div className="flex items-start gap-3">
        {/* Radio button */}
        <RadioGroup
          value={selected ? address.id : ''}
          onValueChange={() => onSelect(address.id)}
        >
          <RadioGroupItem
            value={address.id}
            id={`address-${address.id}`}
            className="mt-1"
            style={{ borderColor: selected ? 'var(--ggh-primary)' : 'var(--ggh-border)' }}
          />
        </RadioGroup>

        <div className="flex-1 min-w-0">
          {/* Label + Default badge */}
          <div className="flex items-center gap-2 mb-1">
            <LabelIcon className="size-4" style={{ color: 'var(--ggh-text-secondary)' }} />
            <Label
              htmlFor={`address-${address.id}`}
              className="text-sm font-semibold cursor-pointer"
              style={{ color: 'var(--ggh-text)' }}
            >
              {t(lang, labelKey)}
            </Label>
            {address.isDefault && (
              <Badge
                className="text-[10px] font-semibold px-1.5 py-0 border-0"
                style={{ backgroundColor: '#E8F5E9', color: 'var(--ggh-primary)' }}
              >
                <Star className="size-3 me-0.5 fill-current" />
                {lang === 'ar' ? 'أساسي' : 'Default'}
              </Badge>
            )}
          </div>

          {/* Full address */}
          <p className="text-sm leading-relaxed" style={{ color: 'var(--ggh-text-secondary)' }}>
            {address.addressLine1}
            {address.buildingNo ? `, ${lang === 'ar' ? 'مبنى' : 'Bldg'} ${address.buildingNo}` : ''}
            {address.floorNo ? `, ${lang === 'ar' ? 'دور' : 'Floor'} ${address.floorNo}` : ''}
            {address.apartmentNo ? `, ${lang === 'ar' ? 'شقة' : 'Apt'} ${address.apartmentNo}` : ''}
          </p>

          {/* Area + City */}
          <p className="text-sm mt-0.5" style={{ color: 'var(--ggh-text-secondary)' }}>
            {address.area}, {address.city}
          </p>

          {/* Landmark */}
          {address.landmark && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--ggh-text-secondary)' }}>
              📍 {address.landmark}
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {onEdit && (
            <Button
              variant="ghost"
              className="h-10 w-10"
              onClick={() => onEdit(address.id)}
              aria-label={t(lang, 'edit')}
            >
              <Pencil className="size-4" style={{ color: 'var(--ggh-text-secondary)' }} />
            </Button>
          )}
          {onDelete && !address.isDefault && (
            <Button
              variant="ghost"
              className="h-10 w-10"
              onClick={() => onDelete(address.id)}
              aria-label={t(lang, 'delete')}
            >
              <Trash2 className="size-4 text-red-400" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
