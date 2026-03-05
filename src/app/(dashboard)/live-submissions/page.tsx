'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Radio } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { DataTable, type Column } from '@/components/common/data-table';
import { StatusBadge, type ColorStatus } from '@/components/common/status-badge';
import { FilterBar, type FilterValues } from '@/components/common/filter-bar';
import { TableSkeleton } from '@/components/common/loading-skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Submission {
  visitId: string;
  visitNumber: string;
  timestamp: string;
  district: string;
  districtId: string;
  facility: string;
  facilityLevel: string;
  submittedBy: string;
  completionStatus: string;
  overallColor: ColorStatus;
  redCount: number;
  yellowCount: number;
  completionPct: number;
  criticalFlags: string[];
}

interface SubmissionsResponse {
  data: Submission[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function LiveSubmissionsPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<FilterValues>({});
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const queryParams = new URLSearchParams();
  queryParams.set('page', String(page));
  queryParams.set('pageSize', String(pageSize));
  if (filters.dateFrom) queryParams.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) queryParams.set('dateTo', filters.dateTo);
  if (filters.district) queryParams.set('district', filters.district);
  if (filters.colorStatus) queryParams.set('colorStatus', filters.colorStatus);

  const { data, isLoading } = useQuery<SubmissionsResponse>({
    queryKey: ['live-submissions', filters, page],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/submissions?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch submissions');
      return res.json();
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  const handleFilterChange = useCallback((newFilters: FilterValues) => {
    setFilters(newFilters);
    setPage(1);
  }, []);

  const handleRowClick = useCallback(
    (item: Submission) => {
      router.push(`/visits/${item.visitId}`);
    },
    [router],
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columns: Column<any>[] = [
    {
      key: 'timestamp',
      title: 'Timestamp',
      sortable: true,
      render: (item: Submission) => (
        <span className="text-sm text-[#64748B]">
          {new Date(item.timestamp).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      ),
    },
    {
      key: 'visitNumber',
      title: 'Visit #',
      sortable: true,
      render: (item: Submission) => (
        <span className="font-mono text-sm font-medium text-[#0F4C81]">
          {item.visitNumber}
        </span>
      ),
    },
    {
      key: 'district',
      title: 'District',
      sortable: true,
    },
    {
      key: 'facility',
      title: 'Facility',
      sortable: true,
    },
    {
      key: 'submittedBy',
      title: 'Submitted By',
    },
    {
      key: 'completionStatus',
      title: 'Status',
      render: (item: Submission) => (
        <Badge
          variant="outline"
          className={
            item.completionStatus === 'SUBMITTED'
              ? 'border-blue-200 bg-blue-50 text-blue-700'
              : item.completionStatus === 'REVIEWED'
                ? 'border-green-200 bg-green-50 text-green-700'
                : 'border-gray-200 bg-gray-50 text-gray-600'
          }
        >
          {item.completionStatus}
        </Badge>
      ),
    },
    {
      key: 'overallColor',
      title: 'Overall Color',
      render: (item: Submission) => (
        <StatusBadge status={item.overallColor} showDot />
      ),
    },
    {
      key: 'redCount',
      title: 'RED Count',
      sortable: true,
      render: (item: Submission) => (
        <span
          className={
            item.redCount > 0
              ? 'font-semibold text-red-600'
              : 'text-[#64748B]'
          }
        >
          {item.redCount}
        </span>
      ),
    },
    {
      key: 'criticalFlags',
      title: 'Critical Flags',
      render: (item: Submission) => {
        if (!item.criticalFlags?.length) {
          return <span className="text-[#64748B]">-</span>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {item.criticalFlags.slice(0, 3).map((flag, i) => (
              <Badge
                key={i}
                variant="outline"
                className="border-red-200 bg-red-50 text-[10px] text-red-700"
              >
                {flag.length > 25 ? flag.slice(0, 22) + '...' : flag}
              </Badge>
            ))}
            {item.criticalFlags.length > 3 && (
              <Badge variant="outline" className="text-[10px] text-[#64748B]">
                +{item.criticalFlags.length - 3}
              </Badge>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live Submissions"
        description="Real-time feed of submitted facility assessments"
      >
        <div className="flex items-center gap-2 text-sm text-[#64748B]">
          <Radio className="size-4 animate-pulse text-[#16A34A]" />
          Auto-refreshing every 30s
        </div>
      </PageHeader>

      <FilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        showDateRange
        showDistrict={false}
        showFacilityLevel={false}
        showColorStatus
      />

      {isLoading ? (
        <TableSkeleton rows={10} columns={9} />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={(data?.data ?? []) as unknown as Record<string, unknown>[]}
            keyField="visitId"
            onRowClick={handleRowClick as unknown as (item: Record<string, unknown>) => void}
            emptyMessage="No submissions found matching your filters."
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
