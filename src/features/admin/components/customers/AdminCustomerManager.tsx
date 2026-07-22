'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye, MoreVertical } from 'lucide-react';
import { type Lang, type CustomerProfile } from '@/types/ggh';
import { t } from '@/lib/ggh/i18n';
import { adminApi } from '@/services/admin-api';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLangStore } from '@/stores/lang-store';
import StatusBadge from '../shared/StatusBadge';
import AdminDataTable, { type ColumnDef, type PaginationInfo } from '../shared/AdminDataTable';

// ============================================
// CUSTOMER MANAGER
// ============================================

interface AdminCustomerManagerProps {
  lang: Lang;
}

export default function AdminCustomerManager({ lang }: AdminCustomerManagerProps) {
  const { isRTL } = useLangStore();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [wholesaleFilter, setWholesaleFilter] = useState<string>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile | null>(null);

  // Fetch customers
  const { data: customersResponse, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-customers', page, search, wholesaleFilter],
    queryFn: () => adminApi.getCustomers({
      page,
      limit: 10,
      search,
      wholesaleStatus: wholesaleFilter === 'all' ? undefined : wholesaleFilter,
    }),
  });

  // Fetch customer detail
  const { data: customerDetailResponse, isLoading: isDetailLoading } = useQuery({
    queryKey: ['admin-customer-detail', selectedCustomer?.id],
    queryFn: () => adminApi.getCustomer(selectedCustomer!.id),
    enabled: selectedCustomer !== null,
  });

  // Update customer mutation
  const updateCustomerMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CustomerProfile> }) => adminApi.updateCustomer(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
      queryClient.invalidateQueries({ queryKey: ['admin-customer-detail'] });
    },
  });

  // Status change form
  const [newWholesaleStatus, setNewWholesaleStatus] = useState('');

  const handleStatusUpdate = useCallback(() => {
    if (!selectedCustomer || !newWholesaleStatus) return;
    updateCustomerMutation.mutate({
      id: selectedCustomer.id,
      data: { wholesaleStatus: newWholesaleStatus as 'retail' | 'wholesale' | 'vip' },
    });
    setNewWholesaleStatus('');
  }, [selectedCustomer, newWholesaleStatus, updateCustomerMutation]);

  const customers = customersResponse?.data || [];
  const pagination: PaginationInfo | undefined = customersResponse?.pagination;
  const customerDetail = customerDetailResponse?.data;

  // Column definitions
  const columns: ColumnDef<CustomerProfile>[] = [
    {
      key: 'name',
      headerKey: 'adminFirstName',
      render: (row) => (
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {row.firstName} {row.lastName}
          </p>
        </div>
      ),
    },
    {
      key: 'phone',
      headerKey: 'adminPhone',
      render: (row) => (
        <span className="text-sm text-muted-foreground">{row.phone}</span>
      ),
    },
    {
      key: 'wholesale',
      headerKey: 'adminStatus',
      render: (row) => <StatusBadge status={row.wholesaleStatus} lang={lang} />,
    },
    {
      key: 'verified',
      headerKey: 'adminVerified',
      render: (row) => (
        row.isVerified ? (
          <StatusBadge status="verified" lang={lang} />
        ) : (
          <StatusBadge status="not_verified" lang={lang} />
        )
      ),
    },
    {
      key: 'actions',
      headerKey: '',
      className: 'w-12',
      render: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={isRTL ? 'start' : 'end'}>
            <DropdownMenuItem onClick={() => { setSelectedCustomer(row); setNewWholesaleStatus(row.wholesaleStatus); }}>
              <Eye className="size-4 me-2" />
              {t(lang, 'adminCustomerDetail')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-foreground">{t(lang, 'adminCustomers')}</h2>
      </div>

      {/* Customer Detail Dialog */}
      <Dialog open={selectedCustomer !== null} onOpenChange={(open) => { if (!open) setSelectedCustomer(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {isDetailLoading ? (
            <div className="space-y-3 py-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-8 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : customerDetail ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {t(lang, 'adminCustomerDetail')} — {customerDetail.firstName} {customerDetail.lastName}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                {/* Profile */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">{t(lang, 'adminPhone')}:</span>
                    <span className="font-medium ms-2">{customerDetail.phone}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t(lang, 'adminVerified')}:</span>
                    <StatusBadge status={customerDetail.isVerified ? 'verified' : 'not_verified'} lang={lang} className="ms-2" />
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t(lang, 'adminStatus')}:</span>
                    <StatusBadge status={customerDetail.wholesaleStatus} lang={lang} className="ms-2" />
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t(lang, 'adminPreferredLang')}:</span>
                    <span className="font-medium ms-2">{customerDetail.preferredLang}</span>
                  </div>
                </div>

                <Separator />

                {/* Update status */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">{t(lang, 'adminUpdateStatus')}</h4>
                  <div className="flex items-end gap-3">
                    <div className="space-y-1 flex-1">
                      <Label className="text-xs">{t(lang, 'adminRuleCustomerGroup')}</Label>
                      <Select value={newWholesaleStatus} onValueChange={setNewWholesaleStatus}>
                        <SelectTrigger size="sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="retail">{t(lang, 'adminRetailCustomer')}</SelectItem>
                          <SelectItem value="wholesale">{t(lang, 'adminWholesaleCustomer')}</SelectItem>
                          <SelectItem value="vip">{t(lang, 'adminVIPCustomer')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      size="sm"
                      onClick={handleStatusUpdate}
                      disabled={updateCustomerMutation.isPending || newWholesaleStatus === customerDetail.wholesaleStatus}
                    >
                      {updateCustomerMutation.isPending ? t(lang, 'loading') : t(lang, 'adminSaveChanges')}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Data Table */}
      <AdminDataTable
        columns={columns}
        data={customers}
        pagination={pagination}
        onPageChange={setPage}
        onSearch={setSearch}
        isLoading={isLoading}
        error={error}
        onRetry={() => refetch()}
        toolbar={
          <Select value={wholesaleFilter} onValueChange={setWholesaleFilter}>
            <SelectTrigger size="sm" className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t(lang, 'adminFilterAll')}</SelectItem>
              <SelectItem value="retail">{t(lang, 'adminRetailCustomer')}</SelectItem>
              <SelectItem value="wholesale">{t(lang, 'adminWholesaleCustomer')}</SelectItem>
              <SelectItem value="vip">{t(lang, 'adminVIPCustomer')}</SelectItem>
            </SelectContent>
          </Select>
        }
        emptyMessageKey="adminNoItems"
      />
    </div>
  );
}
