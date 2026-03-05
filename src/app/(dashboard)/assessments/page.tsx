'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ClipboardCheck,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { DataTable, type Column } from '@/components/common/data-table';
import { EmptyState } from '@/components/common/empty-state';
import { TableSkeleton } from '@/components/common/loading-skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AssessmentRow {
  id: string;
  visitNumber: string;
  facilityName: string;
  districtName: string;
  status: string;
  completionPct: number;
  submittedByName: string;
  startedAt: string;
  submittedAt: string | null;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AssessmentsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const pageSize = 20;

  const buildParams = useCallback(() => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    if (status !== 'all') params.set('status', status);
    return params.toString();
  }, [page, status]);

  const { data, isLoading } = useQuery({
    queryKey: ['assessments', page, status],
    queryFn: async () => {
      const res = await fetch(`/api/assessments?${buildParams()}`);
      if (!res.ok) throw new Error('Failed to fetch assessments');
      return res.json();
    },
  });

  const assessments: AssessmentRow[] = (data?.data ?? []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (a: any) => ({
      id: a.id,
      visitNumber: a.visit?.visitNumber ?? '—',
      facilityName: a.visit?.facility?.name ?? '—',
      districtName: a.visit?.facility?.district?.name ?? '—',
      status: a.status,
      completionPct: a.completionPct ?? 0,
      submittedByName: a.submittedBy?.name ?? '—',
      startedAt: a.startedAt,
      submittedAt: a.submittedAt,
    }),
  );

  const filtered = search
    ? assessments.filter(
        (a) =>
          a.visitNumber.toLowerCase().includes(search.toLowerCase()) ||
          a.facilityName.toLowerCase().includes(search.toLowerCase()) ||
          a.districtName.toLowerCase().includes(search.toLowerCase()),
      )
    : assessments;

  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  const columns: Column<Record<string, any>>[] = [
    {
      key: 'visitNumber',
      title: 'Visit',
      render: (row) => (
        <span className="font-mono text-sm font-medium">{row.visitNumber}</span>
      ),
    },
    {
      key: 'facilityName',
      title: 'Facility',
      render: (row) => (
        <div>
          <div className="font-medium">{row.facilityName}</div>
          <div className="text-xs text-muted-foreground">{row.districtName}</div>
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (row) => {
        const variants: Record<string, string> = {
          DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
          IN_PROGRESS: 'bg-blue-50 text-blue-700 border-blue-200',
          SUBMITTED: 'bg-green-50 text-green-700 border-green-200',
          REVIEWED: 'bg-purple-50 text-purple-700 border-purple-200',
          ARCHIVED: 'bg-gray-100 text-gray-500 border-gray-200',
        };
        const label = row.status.replace('_', ' ');
        return (
          <Badge variant="outline" className={variants[row.status] || ''}>
            {label.charAt(0) + label.slice(1).toLowerCase()}
          </Badge>
        );
      },
    },
    {
      key: 'completionPct',
      title: 'Completion',
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-16 bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full"
              style={{ width: `${Math.min(100, row.completionPct)}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">
            {Math.round(row.completionPct)}%
          </span>
        </div>
      ),
    },
    {
      key: 'submittedByName',
      title: 'Assessor',
    },
    {
      key: 'startedAt',
      title: 'Started',
      render: (row) => (
        <span className="text-sm">
          {new Date(row.startedAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      title: '',
      render: (row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/assessments/${row.id}`)}
        >
          <Eye className="h-4 w-4 mr-1" />
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assessments"
        description="View and manage PMTCT facility assessments"
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by visit, facility, or district..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="w-48">
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="SUBMITTED">Submitted</SelectItem>
              <SelectItem value="REVIEWED">Reviewed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <TableSkeleton rows={8} columns={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheck className="h-8 w-8" />}
          title="No assessments found"
          description="Assessments are created from visits. Go to Visits to start a new assessment."
        />
      ) : (
        <>
          <DataTable columns={columns} data={filtered} />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * pageSize + 1}–
                {Math.min(page * pageSize, total)} of {total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
