'use client';

import { useState, useCallback, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { useLangStore } from '@/stores/lang-store';
import { t } from '@/lib/ggh/i18n';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';

// ============================================
// TYPES
// ============================================

export interface ColumnDef<T> {
  key: string;
  headerKey: string;
  render?: (row: T, lang: 'en' | 'ar') => React.ReactNode;
  className?: string;
  sortable?: boolean;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface AdminDataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  pagination?: PaginationInfo;
  onPageChange?: (page: number) => void;
  onSearch?: (query: string) => void;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  searchPlaceholderKey?: string;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  getRowId?: (row: T) => string;
  emptyMessageKey?: string;
  emptyAction?: React.ReactNode;
  toolbar?: React.ReactNode;
  idKey?: string;
}

// ============================================
// COMPONENT
// ============================================

export default function AdminDataTable<T>({
  columns,
  data,
  pagination,
  onPageChange,
  onSearch,
  isLoading = false,
  error = null,
  onRetry,
  searchPlaceholderKey = 'adminSearchPlaceholder',
  selectedIds,
  onSelectionChange,
  getRowId,
  emptyMessageKey = 'adminNoItems',
  emptyAction,
  toolbar,
  idKey = 'id',
}: AdminDataTableProps<T>) {
  const { lang, isRTL } = useLangStore();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value);
    onSearch?.(value);
  }, [onSearch]);

  const getRowIdFn = useMemo(
    () => getRowId || ((row: T) => (row as Record<string, unknown>)[idKey] as string),
    [getRowId, idKey]
  );

  const hasSelection = selectedIds !== undefined && onSelectionChange !== undefined;

  const handleToggleAll = useCallback(() => {
    if (!onSelectionChange || !selectedIds) return;
    const allIds = new Set(data.map(getRowIdFn));
    if (selectedIds.size === allIds.size) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(allIds);
    }
  }, [data, selectedIds, onSelectionChange, getRowIdFn]);

  const handleToggleRow = useCallback((id: string) => {
    if (!onSelectionChange || !selectedIds) return;
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onSelectionChange(next);
  }, [selectedIds, onSelectionChange]);

  const from = pagination ? (pagination.page - 1) * pagination.limit + 1 : 1;
  const to = pagination ? Math.min(pagination.page * pagination.limit, pagination.total) : data.length;
  const total = pagination?.total || data.length;

  const PrevIcon = isRTL ? ChevronRight : ChevronLeft;
  const NextIcon = isRTL ? ChevronLeft : ChevronRight;

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        {toolbar && <div className="flex items-center gap-3">{toolbar}</div>}
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="rounded-lg border border-border">
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="size-12 rounded-xl bg-destructive/10 flex items-center justify-center mb-4">
          <RefreshCw className="size-5 text-destructive" />
        </div>
        <p className="text-destructive text-sm font-medium mb-2">{error}</p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            {t(lang, 'tryAgain')}
          </Button>
        )}
      </div>
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <div className="space-y-4">
        {toolbar && <div className="flex items-center gap-3">{toolbar}</div>}
        {onSearch && (
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={t(lang, searchPlaceholderKey)}
                className="ps-9 h-9"
              />
            </div>
          </div>
        )}
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground text-sm mb-4">
            {t(lang, emptyMessageKey)}
          </p>
          {emptyAction}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      {(toolbar || onSearch) && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {onSearch && (
            <div className="relative w-full sm:w-64">
              <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={t(lang, searchPlaceholderKey)}
                className="ps-9 h-9"
              />
            </div>
          )}
          {toolbar && <div className="flex items-center gap-2 flex-wrap">{toolbar}</div>}
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {hasSelection && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedIds?.size === data.length && data.length > 0}
                    onCheckedChange={handleToggleAll}
                    aria-label="Select all"
                  />
                </TableHead>
              )}
              {columns.map((col) => (
                <TableHead key={col.key} className={col.className}>
                  {t(lang, col.headerKey)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => {
              const rowId = getRowIdFn(row);
              return (
                <TableRow
                  key={rowId}
                  className={hasSelection && selectedIds?.has(rowId) ? 'bg-muted/30' : ''}
                >
                  {hasSelection && (
                    <TableCell className="w-12">
                      <Checkbox
                        checked={selectedIds?.has(rowId)}
                        onCheckedChange={() => handleToggleRow(rowId)}
                        aria-label={`Select row ${rowId}`}
                      />
                    </TableCell>
                  )}
                  {columns.map((col) => (
                    <TableCell key={col.key} className={col.className}>
                      {col.render ? col.render(row, lang) : (row as Record<string, unknown>)[col.key] as React.ReactNode}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            {t(lang, 'adminShowing', { from, to, total })}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange?.(pagination.page - 1)}
              aria-label={t(lang, 'adminPrevious')}
            >
              <PrevIcon className="size-4" />
            </Button>
            {Array.from({ length: Math.min(5, pagination.totalPages) }).map((_, i) => {
              const pageNum = Math.max(1, Math.min(pagination.page - 2, pagination.totalPages - 4)) + i;
              if (pageNum > pagination.totalPages) return null;
              return (
                <Button
                  key={pageNum}
                  variant={pageNum === pagination.page ? 'default' : 'outline'}
                  size="icon"
                  className="size-8"
                  onClick={() => onPageChange?.(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPageChange?.(pagination.page + 1)}
              aria-label={t(lang, 'adminNextPage')}
            >
              <NextIcon className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
