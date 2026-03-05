'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { KPICard } from '@/components/common/kpi-card';
import { DataTable, type Column } from '@/components/common/data-table';
import {
  KPICardSkeleton,
  TableSkeleton,
} from '@/components/common/loading-skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RotateCcw } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DataQualityIssue {
  id: string;
  flagType: string;
  severity: string;
  description: string;
  fieldName: string | null;
  currentValue: string | null;
  suggestedFix: string | null;
  isResolved: boolean;
  resolvedAt: string | null;
  createdAt: string;
  visitId: string | null;
  visitNumber: string | null;
  facilityName: string | null;
  districtName: string | null;
}

interface DQResponse {
  kpis: {
    totalIssues: number;
    highSeverity: number;
    unresolved: number;
    resolved: number;
  };
  data: DataQualityIssue[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface Filters {
  severity?: string;
  type?: string;
  resolved?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SEVERITY_OPTIONS = [
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
];

const TYPE_OPTIONS = [
  { value: 'MISSING_VALUE', label: 'Missing Value' },
  { value: 'IMPOSSIBLE_VALUE', label: 'Impossible Value' },
  { value: 'DUPLICATE_ENTRY', label: 'Duplicate Entry' },
  { value: 'INCOMPLETE_SECTION', label: 'Incomplete Section' },
  { value: 'MISSING_EVIDENCE', label: 'Missing Evidence' },
  { value: 'INVALID_FORMAT', label: 'Invalid Format' },
  { value: 'ORPHAN_RECORD', label: 'Orphan Record' },
  { value: 'ANOMALY', label: 'Anomaly' },
];

const RESOLVED_OPTIONS = [
  { value: 'false', label: 'Unresolved' },
  { value: 'true', label: 'Resolved' },
];

const SEVERITY_BADGE: Record<string, string> = {
  HIGH: 'border-red-200 bg-red-50 text-red-700',
  MEDIUM: 'border-amber-200 bg-amber-50 text-amber-700',
  LOW: 'border-blue-200 bg-blue-50 text-blue-700',
};

const TYPE_BADGE: Record<string, string> = {
  MISSING_VALUE: 'border-orange-200 bg-orange-50 text-orange-700',
  IMPOSSIBLE_VALUE: 'border-red-200 bg-red-50 text-red-700',
  DUPLICATE_ENTRY: 'border-purple-200 bg-purple-50 text-purple-700',
  INCOMPLETE_SECTION: 'border-amber-200 bg-amber-50 text-amber-700',
  MISSING_EVIDENCE: 'border-sky-200 bg-sky-50 text-sky-700',
  INVALID_FORMAT: 'border-pink-200 bg-pink-50 text-pink-700',
  ORPHAN_RECORD: 'border-gray-200 bg-gray-50 text-gray-700',
  ANOMALY: 'border-violet-200 bg-violet-50 text-violet-700',
};

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function DataQualityPage() {
  const [filters, setFilters] = useState<Filters>({});
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const queryParams = new URLSearchParams();
  queryParams.set('page', String(page));
  queryParams.set('pageSize', String(pageSize));
  if (filters.severity) queryParams.set('severity', filters.severity);
  if (filters.type) queryParams.set('type', filters.type);
  if (filters.resolved) queryParams.set('resolved', filters.resolved);

  const { data, isLoading } = useQuery<DQResponse>({
    queryKey: ['data-quality', filters, page],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/data-quality?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch data quality');
      return res.json();
    },
  });

  const handleFilterChange = useCallback(
    (key: keyof Filters, value: string | undefined) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
      setPage(1);
    },
    [],
  );

  const resetFilters = useCallback(() => {
    setFilters({});
    setPage(1);
  }, []);

  const hasActiveFilters = Object.values(filters).some(
    (v) => v !== undefined && v !== '',
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columns: Column<any>[] = [
    {
      key: 'flagType',
      title: 'Issue Type',
      render: (item: DataQualityIssue) => (
        <Badge variant="outline" className={TYPE_BADGE[item.flagType] ?? ''}>
          {item.flagType.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      key: 'description',
      title: 'Description',
      render: (item: DataQualityIssue) => (
        <span className="text-sm text-[#1E293B]">
          {item.description.length > 80
            ? item.description.slice(0, 77) + '...'
            : item.description}
        </span>
      ),
    },
    {
      key: 'facilityName',
      title: 'Facility',
      render: (item: DataQualityIssue) => (
        <div>
          <p className="text-sm text-[#1E293B]">{item.facilityName ?? '-'}</p>
          {item.districtName && (
            <p className="text-xs text-[#64748B]">{item.districtName}</p>
          )}
        </div>
      ),
    },
    {
      key: 'severity',
      title: 'Severity',
      sortable: true,
      render: (item: DataQualityIssue) => (
        <Badge variant="outline" className={SEVERITY_BADGE[item.severity] ?? ''}>
          {item.severity}
        </Badge>
      ),
    },
    {
      key: 'fieldName',
      title: 'Field',
      render: (item: DataQualityIssue) => (
        <span className="font-mono text-xs text-[#64748B]">
          {item.fieldName ?? '-'}
        </span>
      ),
    },
    {
      key: 'currentValue',
      title: 'Current Value',
      render: (item: DataQualityIssue) => (
        <span className="text-sm text-[#64748B]">
          {item.currentValue ?? '-'}
        </span>
      ),
    },
    {
      key: 'isResolved',
      title: 'Status',
      render: (item: DataQualityIssue) => (
        <Badge
          variant="outline"
          className={
            item.isResolved
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-orange-200 bg-orange-50 text-orange-700'
          }
        >
          {item.isResolved ? 'Resolved' : 'Open'}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      title: 'Created',
      sortable: true,
      render: (item: DataQualityIssue) => (
        <span className="text-xs text-[#64748B]">
          {new Date(item.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data Quality"
        description="Automated data quality flags and validation issues"
      />

      {/* KPI Cards */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <KPICardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard
            title="Total Issues"
            value={data?.kpis.totalIssues ?? 0}
            icon={<ShieldAlert className="size-5" />}
          />
          <KPICard
            title="High Severity"
            value={data?.kpis.highSeverity ?? 0}
            icon={<AlertTriangle className="size-5" />}
          />
          <KPICard
            title="Unresolved"
            value={data?.kpis.unresolved ?? 0}
            icon={<AlertCircle className="size-5" />}
          />
          <KPICard
            title="Resolved"
            value={data?.kpis.resolved ?? 0}
            icon={<CheckCircle2 className="size-5" />}
          />
        </div>
      )}

      {/* Custom Filter Bar */}
      <div className="sticky top-0 z-30 rounded-lg border border-[#E2E8F0] bg-white/95 p-4 shadow-sm backdrop-blur-sm">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[160px] space-y-1.5">
            <Label className="text-xs font-medium text-[#64748B]">Severity</Label>
            <Select
              value={filters.severity ?? ''}
              onValueChange={(v) =>
                handleFilterChange('severity', v === 'all' ? undefined : v)
              }
            >
              <SelectTrigger className="h-9 w-full text-sm">
                <SelectValue placeholder="All severities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All severities</SelectItem>
                {SEVERITY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[180px] space-y-1.5">
            <Label className="text-xs font-medium text-[#64748B]">Issue Type</Label>
            <Select
              value={filters.type ?? ''}
              onValueChange={(v) =>
                handleFilterChange('type', v === 'all' ? undefined : v)
              }
            >
              <SelectTrigger className="h-9 w-full text-sm">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[160px] space-y-1.5">
            <Label className="text-xs font-medium text-[#64748B]">Status</Label>
            <Select
              value={filters.resolved ?? ''}
              onValueChange={(v) =>
                handleFilterChange('resolved', v === 'all' ? undefined : v)
              }
            >
              <SelectTrigger className="h-9 w-full text-sm">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {RESOLVED_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-9 gap-1.5 text-[#64748B] hover:text-[#1E293B]"
            >
              <RotateCcw className="size-3.5" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Data Table */}
      {isLoading ? (
        <TableSkeleton rows={10} columns={8} />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={data?.data ?? []}
            keyField="id"
            emptyMessage="No data quality issues found."
          />

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[#E2E8F0] pt-4">
              <p className="text-sm text-[#64748B]">
                Showing {(page - 1) * pageSize + 1} to{' '}
                {Math.min(page * pageSize, data.total)} of {data.total} results
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
