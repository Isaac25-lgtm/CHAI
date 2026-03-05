'use client';

import { useState, useCallback } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

export interface Column<T> {
  key: string;
  title: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  onRowClick?: (item: T) => void;
  keyField?: string;
}

type SortDirection = 'asc' | 'desc' | null;

interface SortState {
  key: string | null;
  direction: SortDirection;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  isLoading = false,
  emptyMessage = 'No data available',
  emptyIcon,
  onRowClick,
  keyField = 'id',
}: DataTableProps<T>) {
  const [sort, setSort] = useState<SortState>({
    key: null,
    direction: null,
  });

  const handleSort = useCallback((key: string) => {
    setSort((prev) => {
      if (prev.key !== key) return { key, direction: 'asc' };
      if (prev.direction === 'asc') return { key, direction: 'desc' };
      return { key: null, direction: null };
    });
  }, []);

  const sortedData = (() => {
    if (!sort.key || !sort.direction) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sort.key!];
      const bVal = b[sort.key!];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sort.direction === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sort.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });
  })();

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sort.key !== columnKey) {
      return <ArrowUpDown className="ml-1 inline size-3.5 text-[#64748B]/50" />;
    }
    return sort.direction === 'asc' ? (
      <ArrowUp className="ml-1 inline size-3.5 text-[#0F4C81]" />
    ) : (
      <ArrowDown className="ml-1 inline size-3.5 text-[#0F4C81]" />
    );
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border border-[#E2E8F0]">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#F8FAFC]">
              {columns.map((col) => (
                <TableHead key={col.key} className={col.className}>
                  {col.title}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {columns.map((col) => (
                  <TableCell key={col.key} className={col.className}>
                    <Skeleton className="h-4 w-full max-w-[120px]" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-[#E2E8F0]">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#F8FAFC]">
              {columns.map((col) => (
                <TableHead key={col.key} className={col.className}>
                  {col.title}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
        </Table>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          {emptyIcon && (
            <div className="mb-3 text-[#64748B]/50">{emptyIcon}</div>
          )}
          <p className="text-sm text-[#64748B]">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#E2E8F0]">
      <Table>
        <TableHeader>
          <TableRow className="bg-[#F8FAFC]">
            {columns.map((col) => (
              <TableHead
                key={col.key}
                className={cn(
                  col.sortable && 'cursor-pointer select-none hover:text-[#0F4C81]',
                  col.className
                )}
                onClick={col.sortable ? () => handleSort(col.key) : undefined}
              >
                {col.title}
                {col.sortable && <SortIcon columnKey={col.key} />}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.map((item, index) => (
            <TableRow
              key={(item[keyField] as string | number) ?? index}
              className={cn(
                onRowClick && 'cursor-pointer hover:bg-[#0F4C81]/5'
              )}
              onClick={onRowClick ? () => onRowClick(item) : undefined}
            >
              {columns.map((col) => (
                <TableCell key={col.key} className={col.className}>
                  {col.render
                    ? col.render(item)
                    : (item[col.key] as React.ReactNode) ?? '-'}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
