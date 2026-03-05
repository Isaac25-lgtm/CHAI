'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ClipboardList,
  ClipboardCheck,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Users,
  Eye,
  Info,
} from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { DataTable, type Column } from '@/components/common/data-table';
import { EmptyState } from '@/components/common/empty-state';
import { TableSkeleton } from '@/components/common/loading-skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useCurrentUser } from '@/hooks/use-session';
import { hasPermission, Permission } from '@/lib/rbac';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VisitRow {
  id: string;
  visitNumber: string;
  facilityName: string;
  districtName: string;
  regionName: string;
  status: string;
  visitDate: string;
  activityName: string | null;
  participantCount: number;
  centralTeamCount: number;
  facilityTeamCount: number;
  assessmentStatus: string | null;
  assessmentId: string | null;
  createdBy: { id: string; name: string; email: string };
  submittedAt: string | null;
  createdAt: string;
}

interface VisitsResponse {
  data: VisitRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ---------------------------------------------------------------------------
// Visit status badge config
// ---------------------------------------------------------------------------

const visitStatusStyles: Record<string, { bg: string; text: string; label: string }> = {
  DRAFT: {
    bg: 'bg-gray-100 border-gray-200',
    text: 'text-gray-700',
    label: 'Draft',
  },
  SUBMITTED: {
    bg: 'bg-blue-50 border-blue-200',
    text: 'text-blue-700',
    label: 'Submitted',
  },
  REVIEWED: {
    bg: 'bg-green-50 border-green-200',
    text: 'text-green-700',
    label: 'Reviewed',
  },
  ARCHIVED: {
    bg: 'bg-slate-50 border-slate-200',
    text: 'text-slate-500',
    label: 'Archived',
  },
};

const assessmentStatusLabels: Record<string, { label: string; style: string }> = {
  DRAFT: { label: 'Not Started', style: 'bg-gray-100 text-gray-600 border-gray-200' },
  IN_PROGRESS: { label: 'In Progress', style: 'bg-amber-50 text-amber-700 border-amber-200' },
  SUBMITTED: { label: 'Completed', style: 'bg-green-50 text-green-700 border-green-200' },
  REVIEWED: { label: 'Reviewed', style: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function VisitsPage() {
  const router = useRouter();
  const { user } = useCurrentUser();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Debounce search
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
    const timeout = setTimeout(() => setDebouncedSearch(value), 300);
    return () => clearTimeout(timeout);
  }, []);

  // Fetch visits
  const {
    data: visitsData,
    isLoading,
    isError,
  } = useQuery<VisitsResponse>({
    queryKey: ['visits', debouncedSearch, status, dateFrom, dateTo, page, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (status) params.set('status', status);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));

      const res = await fetch(`/api/visits?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch visits');
      return res.json();
    },
  });

  const canCreate = user ? hasPermission(user, Permission.VISITS_CREATE) : false;
  const canAssess = user ? hasPermission(user, Permission.ASSESSMENTS_CREATE) : false;

  const visits = visitsData?.data ?? [];
  const total = visitsData?.total ?? 0;
  const totalPages = visitsData?.totalPages ?? 1;

  // Table columns
  const columns: Column<VisitRow>[] = [
    {
      key: 'visitNumber',
      title: 'Visit #',
      sortable: true,
      render: (item) => (
        <span className="font-mono text-sm font-medium text-[#0F4C81]">
          {item.visitNumber}
        </span>
      ),
    },
    {
      key: 'visitDate',
      title: 'Date',
      sortable: true,
      render: (item) => (
        <div className="flex items-center gap-1.5 text-sm">
          <Calendar className="size-3.5 text-[#94A3B8]" />
          {new Date(item.visitDate).toLocaleDateString('en-UG', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </div>
      ),
    },
    {
      key: 'facilityName',
      title: 'Facility',
      sortable: true,
      render: (item) => (
        <div>
          <div className="font-medium text-[#1E293B]">{item.facilityName}</div>
          <div className="text-xs text-[#64748B]">{item.districtName}</div>
        </div>
      ),
    },
    {
      key: 'districtName',
      title: 'District',
      sortable: true,
      className: 'hidden lg:table-cell',
    },
    {
      key: 'status',
      title: 'Status',
      render: (item) => {
        const config = visitStatusStyles[item.status] ?? visitStatusStyles.DRAFT;
        return (
          <Badge
            variant="outline"
            className={`text-xs font-medium ${config.bg} ${config.text}`}
          >
            {config.label}
          </Badge>
        );
      },
    },
    {
      key: 'participantCount',
      title: 'Participants',
      className: 'hidden md:table-cell',
      render: (item) => (
        <div className="flex items-center gap-1.5 text-sm text-[#64748B]">
          <Users className="size-3.5" />
          {item.participantCount}
        </div>
      ),
    },
    {
      key: 'assessmentStatus',
      title: 'Assessment',
      className: 'hidden lg:table-cell',
      render: (item) => {
        if (!item.assessmentStatus) {
          return <span className="text-xs text-[#94A3B8]">None</span>;
        }
        const config = assessmentStatusLabels[item.assessmentStatus];
        return config ? (
          <Badge variant="outline" className={`text-xs font-medium ${config.style}`}>
            {config.label}
          </Badge>
        ) : (
          <span className="text-xs text-[#94A3B8]">{item.assessmentStatus}</span>
        );
      },
    },
    {
      key: 'createdBy',
      title: 'Created By',
      className: 'hidden xl:table-cell',
      render: (item) => (
        <span className="text-sm text-[#64748B]">{item.createdBy.name}</span>
      ),
    },
    {
      key: 'actions',
      title: '',
      render: (item) => {
        // Already has an assessment — show "View" button
        if (item.assessmentId) {
          return (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/assessments/${item.assessmentId}`);
              }}
            >
              <Eye className="size-3.5" />
              View
            </Button>
          );
        }
        // Visit is submitted and user can assess — show "Assess" button
        if (item.status !== 'DRAFT' && canAssess) {
          return (
            <Button
              variant="outline"
              size="sm"
              className="gap-1 border-[#0F4C81]/30 text-xs text-[#0F4C81] hover:bg-[#0F4C81]/5"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/assessments/new?visitId=${item.id}`);
              }}
            >
              <ClipboardCheck className="size-3.5" />
              Assess
            </Button>
          );
        }
        // Visit is still a draft — show disabled with tooltip
        if (item.status === 'DRAFT') {
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex cursor-help items-center gap-1 text-xs text-[#94A3B8]">
                    <Info className="size-3.5" />
                    Submit first
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Submit this visit before starting an assessment</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }
        return null;
      },
    },
  ];

  const handleRowClick = (item: VisitRow) => {
    router.push(`/visits/${item.id}`);
  };

  const handleResetFilters = () => {
    setStatus('');
    setDateFrom('');
    setDateTo('');
    setSearch('');
    setDebouncedSearch('');
    setPage(1);
  };

  const hasActiveFilters = status || dateFrom || dateTo || debouncedSearch;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Visits"
        description="Manage facility mentorship visits and participant records"
      >
        {canCreate && (
          <Button
            onClick={() => router.push('/visits/new')}
            className="gap-2 bg-[#0F4C81] hover:bg-[#0D3F6B]"
          >
            <Plus className="size-4" />
            New Visit
          </Button>
        )}
      </PageHeader>

      {/* Search and Filters */}
      <div className="sticky top-0 z-30 rounded-lg border border-[#E2E8F0] bg-white/95 p-4 shadow-sm backdrop-blur-sm">
        <div className="flex flex-wrap items-end gap-4">
          {/* Search */}
          <div className="min-w-[240px] flex-1 space-y-1.5">
            <Label htmlFor="visit-search" className="text-xs font-medium text-[#64748B]">
              Search
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#94A3B8]" />
              <Input
                id="visit-search"
                type="text"
                placeholder="Search by visit #, facility, activity..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="h-9 pl-9 text-sm"
              />
            </div>
          </div>

          {/* Status */}
          <div className="min-w-[160px] space-y-1.5">
            <Label className="text-xs font-medium text-[#64748B]">Status</Label>
            <Select
              value={status || 'all'}
              onValueChange={(value) => {
                setStatus(value === 'all' ? '' : value);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-full text-sm">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="SUBMITTED">Submitted</SelectItem>
                <SelectItem value="REVIEWED">Reviewed</SelectItem>
                <SelectItem value="ARCHIVED">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date From */}
          <div className="min-w-[150px] space-y-1.5">
            <Label htmlFor="filter-from" className="text-xs font-medium text-[#64748B]">
              From
            </Label>
            <Input
              id="filter-from"
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="h-9 text-sm"
            />
          </div>

          {/* Date To */}
          <div className="min-w-[150px] space-y-1.5">
            <Label htmlFor="filter-to" className="text-xs font-medium text-[#64748B]">
              To
            </Label>
            <Input
              id="filter-to"
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="h-9 text-sm"
            />
          </div>

          {/* Reset */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="h-9 gap-1.5 text-[#64748B] hover:text-[#1E293B]"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#64748B]">
          {isLoading ? 'Loading...' : `${total} visit${total === 1 ? '' : 's'} found`}
        </p>
      </div>

      {/* Table */}
      {isLoading ? (
        <TableSkeleton rows={8} columns={8} />
      ) : isError ? (
        <EmptyState
          icon={<ClipboardList className="size-8" />}
          title="Failed to load visits"
          description="An error occurred while loading the visits list. Please try again."
          action={
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          }
        />
      ) : visits.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="size-8" />}
          title={hasActiveFilters ? 'No visits match your filters' : 'No visits yet'}
          description={
            hasActiveFilters
              ? 'Try adjusting your search or filter criteria.'
              : 'Get started by creating the first mentorship visit.'
          }
          action={
            hasActiveFilters ? (
              <Button variant="outline" onClick={handleResetFilters}>
                Clear filters
              </Button>
            ) : canCreate ? (
              <Button
                className="gap-2 bg-[#0F4C81] hover:bg-[#0D3F6B]"
                onClick={() => router.push('/visits/new')}
              >
                <Plus className="size-4" />
                New Visit
              </Button>
            ) : null
          }
        />
      ) : (
        <>
          <DataTable<Record<string, unknown>>
            columns={columns as unknown as Column<Record<string, unknown>>[]}
            data={visits as unknown as Record<string, unknown>[]}
            onRowClick={(item) => handleRowClick(item as unknown as VisitRow)}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[#E2E8F0] pt-4">
              <p className="text-sm text-[#64748B]">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="gap-1"
                >
                  <ChevronLeft className="size-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="gap-1"
                >
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
