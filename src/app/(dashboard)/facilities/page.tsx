'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Building2,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Loader2,
} from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { DataTable, type Column } from '@/components/common/data-table';
import { EmptyState } from '@/components/common/empty-state';
import { TableSkeleton } from '@/components/common/loading-skeleton';
import { StatusBadge, type ColorStatus } from '@/components/common/status-badge';
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
import { useCurrentUser } from '@/hooks/use-session';
import { FACILITY_LEVELS, OWNERSHIP_TYPES } from '@/config/constants';
import { hasPermission, Permission } from '@/lib/rbac';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FacilityRow {
  id: string;
  name: string;
  code: string | null;
  level: string;
  ownership: string;
  districtId: string;
  districtName: string;
  regionName: string;
  inChargeName: string | null;
  isActive: boolean;
  lastVisitDate: string | null;
  lastOverallStatus: ColorStatus | null;
}

interface FacilitiesResponse {
  data: FacilityRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface DistrictOption {
  id: string;
  name: string;
  regionName: string;
}

interface DistrictsResponse {
  flat: DistrictOption[];
}

// ---------------------------------------------------------------------------
// Facility level badge styles
// ---------------------------------------------------------------------------

const levelBadgeStyles: Record<string, string> = {
  HC_II: 'bg-slate-100 text-slate-700 border-slate-200',
  HC_III: 'bg-blue-50 text-blue-700 border-blue-200',
  HC_IV: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  GENERAL_HOSPITAL: 'bg-purple-50 text-purple-700 border-purple-200',
  REGIONAL_REFERRAL: 'bg-amber-50 text-amber-700 border-amber-200',
  NATIONAL_REFERRAL: 'bg-rose-50 text-rose-700 border-rose-200',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FacilitiesPage() {
  const router = useRouter();
  const { user } = useCurrentUser();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [districtId, setDistrictId] = useState<string>('');
  const [level, setLevel] = useState<string>('');
  const [ownership, setOwnership] = useState<string>('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Debounce search
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
    const timeout = setTimeout(() => setDebouncedSearch(value), 300);
    return () => clearTimeout(timeout);
  }, []);

  // Fetch districts for filter dropdown
  const { data: districtsData } = useQuery<DistrictsResponse>({
    queryKey: ['facilities-districts'],
    queryFn: async () => {
      const res = await fetch('/api/facilities/districts');
      if (!res.ok) throw new Error('Failed to fetch districts');
      return res.json();
    },
  });

  // Fetch facilities
  const {
    data: facilitiesData,
    isLoading,
    isError,
  } = useQuery<FacilitiesResponse>({
    queryKey: ['facilities', debouncedSearch, districtId, level, ownership, page, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (districtId) params.set('districtId', districtId);
      if (level) params.set('level', level);
      if (ownership) params.set('ownership', ownership);
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));

      const res = await fetch(`/api/facilities?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch facilities');
      return res.json();
    },
  });

  const canCreate = user ? hasPermission(user, Permission.FACILITIES_CREATE) : false;
  const canAssess = user
    ? hasPermission(user, Permission.VISITS_CREATE) && hasPermission(user, Permission.ASSESSMENTS_CREATE)
    : false;

  const [assessingFacilityId, setAssessingFacilityId] = useState<string | null>(null);

  const quickAssessMutation = useMutation({
    mutationFn: async (facilityId: string) => {
      setAssessingFacilityId(facilityId);
      const res = await fetch('/api/visits/quick-assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ facilityId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to start assessment');
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success('Assessment started');
      router.push(`/assessments/${data.assessmentId}`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setAssessingFacilityId(null);
    },
  });

  const facilities = facilitiesData?.data ?? [];
  const total = facilitiesData?.total ?? 0;
  const totalPages = facilitiesData?.totalPages ?? 1;

  // Table columns
  const columns: Column<FacilityRow>[] = [
    {
      key: 'name',
      title: 'Facility Name',
      sortable: true,
      render: (item) => (
        <div>
          <div className="font-medium text-[#1E293B]">{item.name}</div>
          {item.code && (
            <div className="text-xs text-[#64748B]">{item.code}</div>
          )}
        </div>
      ),
    },
    {
      key: 'districtName',
      title: 'District',
      sortable: true,
    },
    {
      key: 'regionName',
      title: 'Region',
      sortable: true,
    },
    {
      key: 'level',
      title: 'Level',
      render: (item) => (
        <Badge
          variant="outline"
          className={`text-xs font-medium ${levelBadgeStyles[item.level] ?? 'bg-gray-50 text-gray-700 border-gray-200'}`}
        >
          {FACILITY_LEVELS[item.level] ?? item.level}
        </Badge>
      ),
    },
    {
      key: 'ownership',
      title: 'Ownership',
      render: (item) => (
        <span className="text-sm text-[#64748B]">
          {OWNERSHIP_TYPES[item.ownership] ?? item.ownership}
        </span>
      ),
    },
    {
      key: 'inChargeName',
      title: 'In-Charge',
      render: (item) => (
        <span className="text-sm">
          {item.inChargeName || <span className="text-[#94A3B8]">--</span>}
        </span>
      ),
    },
    {
      key: 'isActive',
      title: 'Status',
      render: (item) => (
        <Badge
          variant="outline"
          className={
            item.isActive
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 text-xs'
              : 'border-gray-200 bg-gray-50 text-gray-500 text-xs'
          }
        >
          {item.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'lastVisitDate',
      title: 'Last Assessment',
      render: (item) => (
        <div className="flex items-center gap-2">
          {item.lastVisitDate ? (
            <>
              <span className="text-sm text-[#64748B]">
                {new Date(item.lastVisitDate).toLocaleDateString('en-UG', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
              {item.lastOverallStatus && (
                <StatusBadge status={item.lastOverallStatus} size="sm" showDot />
              )}
            </>
          ) : (
            <span className="text-xs text-[#94A3B8]">No visits</span>
          )}
        </div>
      ),
    },
    ...(canAssess
      ? [
          {
            key: 'quickAssess' as const,
            title: '',
            render: (item: FacilityRow) => (
              <Button
                variant="outline"
                size="sm"
                className="gap-1 border-[#0F4C81]/30 text-xs text-[#0F4C81] hover:bg-[#0F4C81]/5"
                disabled={!item.isActive || quickAssessMutation.isPending}
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  quickAssessMutation.mutate(item.id);
                }}
              >
                {assessingFacilityId === item.id && quickAssessMutation.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <ClipboardCheck className="size-3.5" />
                )}
                Assess
              </Button>
            ),
          },
        ]
      : []),
  ];

  const handleRowClick = (item: FacilityRow) => {
    router.push(`/facilities/${item.id}`);
  };

  const handleResetFilters = () => {
    setDistrictId('');
    setLevel('');
    setOwnership('');
    setSearch('');
    setDebouncedSearch('');
    setPage(1);
  };

  const hasActiveFilters = districtId || level || ownership || debouncedSearch;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Facilities"
        description="Manage health facilities across all districts"
      >
        {canCreate && (
          <Button
            onClick={() => router.push('/facilities/new')}
            className="gap-2 bg-[#0F4C81] hover:bg-[#0D3F6B]"
          >
            <Plus className="size-4" />
            Add Facility
          </Button>
        )}
      </PageHeader>

      {/* Search and Filters */}
      <div className="sticky top-0 z-30 rounded-lg border border-[#E2E8F0] bg-white/95 p-4 shadow-sm backdrop-blur-sm">
        <div className="flex flex-wrap items-end gap-4">
          {/* Search */}
          <div className="min-w-[240px] flex-1 space-y-1.5">
            <Label htmlFor="facility-search" className="text-xs font-medium text-[#64748B]">
              Search
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#94A3B8]" />
              <Input
                id="facility-search"
                type="text"
                placeholder="Search by name, code, in-charge..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="h-9 pl-9 text-sm"
              />
            </div>
          </div>

          {/* District */}
          {(districtsData?.flat?.length ?? 0) > 0 && (
            <div className="min-w-[180px] space-y-1.5">
              <Label className="text-xs font-medium text-[#64748B]">District</Label>
              <Select
                value={districtId || 'all'}
                onValueChange={(value) => {
                  setDistrictId(value === 'all' ? '' : value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 w-full text-sm">
                  <SelectValue placeholder="All districts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All districts</SelectItem>
                  {districtsData?.flat.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Facility Level */}
          <div className="min-w-[180px] space-y-1.5">
            <Label className="text-xs font-medium text-[#64748B]">Facility Level</Label>
            <Select
              value={level || 'all'}
              onValueChange={(value) => {
                setLevel(value === 'all' ? '' : value);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-full text-sm">
                <SelectValue placeholder="All levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All levels</SelectItem>
                {Object.entries(FACILITY_LEVELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Ownership */}
          <div className="min-w-[180px] space-y-1.5">
            <Label className="text-xs font-medium text-[#64748B]">Ownership</Label>
            <Select
              value={ownership || 'all'}
              onValueChange={(value) => {
                setOwnership(value === 'all' ? '' : value);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-full text-sm">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {Object.entries(OWNERSHIP_TYPES).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          {isLoading ? 'Loading...' : `${total} facilit${total === 1 ? 'y' : 'ies'} found`}
        </p>
      </div>

      {/* Table */}
      {isLoading ? (
        <TableSkeleton rows={8} columns={8} />
      ) : isError ? (
        <EmptyState
          icon={<Building2 className="size-8" />}
          title="Failed to load facilities"
          description="An error occurred while loading the facilities list. Please try again."
          action={
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          }
        />
      ) : facilities.length === 0 ? (
        <EmptyState
          icon={<Building2 className="size-8" />}
          title={hasActiveFilters ? 'No facilities match your filters' : 'No facilities yet'}
          description={
            hasActiveFilters
              ? 'Try adjusting your search or filter criteria.'
              : 'Get started by adding the first health facility.'
          }
          action={
            hasActiveFilters ? (
              <Button variant="outline" onClick={handleResetFilters}>
                Clear filters
              </Button>
            ) : canCreate ? (
              <Button
                className="gap-2 bg-[#0F4C81] hover:bg-[#0D3F6B]"
                onClick={() => router.push('/facilities/new')}
              >
                <Plus className="size-4" />
                Add Facility
              </Button>
            ) : null
          }
        />
      ) : (
        <>
          <DataTable<Record<string, unknown>>
            columns={columns as unknown as Column<Record<string, unknown>>[]}
            data={facilities as unknown as Record<string, unknown>[]}
            onRowClick={(item) => handleRowClick(item as unknown as FacilityRow)}
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
