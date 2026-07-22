'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Truck, MapPin, Users, Plus } from 'lucide-react';
import { type Lang, type DeliveryZone } from '@/types/ggh';
import { t } from '@/lib/ggh/i18n';
import { adminApi } from '@/services/admin-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import MoneyCell from '../shared/MoneyCell';
import StatusBadge from '../shared/StatusBadge';

// ============================================
// DRIVER TYPE (local)
// ============================================
interface Driver {
  id: string;
  nameEn: string;
  nameAr: string;
  phone: string;
  isActive: boolean;
  currentDeliveries: number;
}

// ============================================
// ADMIN DELIVERY MANAGER
// ============================================

interface AdminDeliveryManagerProps {
  lang: Lang;
}

export default function AdminDeliveryManager({ lang }: AdminDeliveryManagerProps) {
  const queryClient = useQueryClient();
  const [isCreateDriverOpen, setIsCreateDriverOpen] = useState(false);

  // Fetch delivery overview
  const { data: overviewResponse, isLoading: isOverviewLoading } = useQuery({
    queryKey: ['admin-delivery-overview'],
    queryFn: () => adminApi.getDeliveryOverview(),
  });

  // Fetch zones
  const { data: zonesResponse, isLoading: isZonesLoading } = useQuery({
    queryKey: ['admin-delivery-zones'],
    queryFn: () => adminApi.getZones(),
  });

  // Fetch drivers
  const { data: driversResponse, isLoading: isDriversLoading } = useQuery({
    queryKey: ['admin-delivery-drivers'],
    queryFn: () => adminApi.getDrivers(),
  });

  const overview = overviewResponse?.data;
  const zones = zonesResponse?.data || [];
  const drivers = driversResponse?.data || [];

  // Create driver form
  const [driverForm, setDriverForm] = useState({
    nameEn: '',
    nameAr: '',
    phone: '',
    zoneId: '',
  });

  const resetDriverForm = () => {
    setDriverForm({ nameEn: '', nameAr: '', phone: '', zoneId: '' });
  };

  // Create driver mutation
  const createDriverMutation = useMutation({
    mutationFn: adminApi.createDriver,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-delivery-drivers'] });
      queryClient.invalidateQueries({ queryKey: ['admin-delivery-overview'] });
      setIsCreateDriverOpen(false);
      resetDriverForm();
    },
  });

  const handleCreateDriver = () => {
    createDriverMutation.mutate(driverForm);
  };

  // Overview stats
  const stats = [
    {
      titleKey: 'adminActiveDeliveries',
      value: overview?.activeDeliveries ?? 0,
      icon: Truck,
      color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30',
    },
    {
      titleKey: 'adminPendingAssignments',
      value: overview?.activeDeliveries ?? 0,
      icon: MapPin,
      color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30',
    },
    {
      titleKey: 'adminAvailableDrivers',
      value: overview?.driversCount ?? drivers.filter((d: Driver) => d.isActive).length,
      icon: Users,
      color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-950/30',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <h2 className="text-xl font-bold text-foreground">{t(lang, 'adminDelivery')}</h2>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {isOverviewLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-8 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))
        ) : (
          stats.map((stat) => {
            const StatIcon = stat.icon;
            return (
              <Card key={stat.titleKey} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <p className="text-xs text-muted-foreground font-medium">
                        {t(lang, stat.titleKey)}
                      </p>
                      <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    </div>
                    <div className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${stat.color}`}>
                      <StatIcon className="size-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Delivery Zones Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <MapPin className="size-4" />
            {t(lang, 'adminDeliveryZones')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isZonesLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-10 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : zones.length > 0 ? (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>{t(lang, 'adminZoneName')}</TableHead>
                    <TableHead>{t(lang, 'adminZoneArea')}</TableHead>
                    <TableHead>{t(lang, 'adminZoneFee')}</TableHead>
                    <TableHead>{t(lang, 'adminZoneMinOrder')}</TableHead>
                    <TableHead>{t(lang, 'adminZoneEstHours')}</TableHead>
                    <TableHead>{t(lang, 'adminStatus')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {zones.map((zone: DeliveryZone) => (
                    <TableRow key={zone.id}>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            {lang === 'ar' ? zone.nameAr : zone.nameEn}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {zone.area}, {zone.city}
                      </TableCell>
                      <TableCell>
                        <MoneyCell value={zone.deliveryFee} lang={lang} />
                      </TableCell>
                      <TableCell>
                        <MoneyCell value={zone.minOrder} lang={lang} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {zone.estimatedHours}h
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={zone.isActive ? 'active' : 'inactive'}
                          lang={lang}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
              {t(lang, 'adminNoItems')}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Drivers Section */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Users className="size-4" />
            {t(lang, 'adminDrivers')}
          </CardTitle>
          <Dialog open={isCreateDriverOpen} onOpenChange={(open) => { setIsCreateDriverOpen(open); if (!open) resetDriverForm(); }}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{t(lang, 'adminCreate')} {t(lang, 'adminDrivers')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>{t(lang, 'adminNameEn')}</Label>
                  <Input
                    value={driverForm.nameEn}
                    onChange={(e) => setDriverForm((prev) => ({ ...prev, nameEn: e.target.value }))}
                    placeholder="Driver name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t(lang, 'adminNameAr')}</Label>
                  <Input
                    value={driverForm.nameAr}
                    onChange={(e) => setDriverForm((prev) => ({ ...prev, nameAr: e.target.value }))}
                    placeholder="اسم السائق"
                    dir="rtl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t(lang, 'adminDriverPhone')}</Label>
                  <Input
                    value={driverForm.phone}
                    onChange={(e) => setDriverForm((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="+20 100 000 0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t(lang, 'adminDeliveryZones')}</Label>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                    value={driverForm.zoneId}
                    onChange={(e) => setDriverForm((prev) => ({ ...prev, zoneId: e.target.value }))}
                  >
                    <option value="">— {t(lang, 'adminFilterAll')} —</option>
                    {zones.map((zone: DeliveryZone) => (
                      <option key={zone.id} value={zone.id}>
                        {lang === 'ar' ? zone.nameAr : zone.nameEn}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDriverOpen(false)}>
                  {t(lang, 'cancel')}
                </Button>
                <Button
                  onClick={handleCreateDriver}
                  disabled={createDriverMutation.isPending || !driverForm.nameEn || !driverForm.phone}
                >
                  {createDriverMutation.isPending ? t(lang, 'loading') : t(lang, 'adminCreate')}
                </Button>
              </DialogFooter>
            </DialogContent>
            <Button size="sm" className="gap-1.5" onClick={() => setIsCreateDriverOpen(true)}>
              <Plus className="size-4" />
              {t(lang, 'adminCreate')}
            </Button>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isDriversLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-10 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : drivers.length > 0 ? (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>{t(lang, 'adminDriverName')}</TableHead>
                    <TableHead>{t(lang, 'adminDriverPhone')}</TableHead>
                    <TableHead>{t(lang, 'adminStatus')}</TableHead>
                    <TableHead>{t(lang, 'adminOrderItems')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drivers.map((driver: Driver) => (
                    <TableRow key={driver.id}>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            {lang === 'ar' ? driver.nameAr : driver.nameEn}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {driver.phone}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={driver.isActive ? 'active' : 'inactive'}
                          lang={lang}
                        />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {driver.currentDeliveries} {lang === 'ar' ? 'توصيلات' : 'deliveries'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
              {t(lang, 'adminNoItems')}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
