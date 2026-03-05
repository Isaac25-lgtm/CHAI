'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ClipboardList,
  Search,
  ChevronLeft,
  ChevronRight,
  Users,
  AlertTriangle,
  Phone,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Banknote,
  Import,
  UserCheck,
  ThumbsUp,
  CalendarDays,
} from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { DataTable, type Column } from '@/components/common/data-table';
import { KPICard } from '@/components/common/kpi-card';
import { EmptyState } from '@/components/common/empty-state';
import { TableSkeleton, KPICardSkeleton } from '@/components/common/loading-skeleton';
import { PaymentStatusBadge } from '@/components/common/payment-status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useCurrentUser } from '@/hooks/use-session';
import { hasPermission, Permission } from '@/lib/rbac';
import { TEAM_TYPES, MOBILE_NETWORKS } from '@/config/constants';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NamesRegistryRow {
  id: string;
  visitId: string;
  visitNumber: string;
  visitDate: string;
  participantId: string | null;
  fullName: string;
  role: string | null;
  cadre: string | null;
  teamType: string;
  organization: string | null;
  districtName: string;
  facilityName: string;
  phone: string | null;
  network: string | null;
  eligibility: string;
  verificationStatus: string;
  verifiedBy: { id: string; name: string } | null;
  verifiedAt: string | null;
  approvalStatus: string;
  approvedBy: { id: string; name: string } | null;
  approvedAt: string | null;
  notes: string | null;
  isDuplicate: boolean;
  duplicateOfId: string | null;
  createdBy: { id: string; name: string };
  createdAt: string;
  paymentRecord: {
    id: string;
    status: string;
    amount: number | null;
    paymentCategory: string;
  } | null;
}

interface NamesRegistryResponse {
  data: NamesRegistryRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface VisitOption {
  id: string;
  visitNumber: string;
  facilityName: string;
  visitDate: string;
  participantCount: number;
}

// ---------------------------------------------------------------------------
// Badge config
// ---------------------------------------------------------------------------

const verificationStyles: Record<string, { bg: string; text: string; label: string }> = {
  UNVERIFIED: { bg: 'bg-gray-100 border-gray-200', text: 'text-gray-600', label: 'Unverified' },
  VERIFIED: { bg: 'bg-green-50 border-green-200', text: 'text-green-700', label: 'Verified' },
  FLAGGED: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', label: 'Flagged' },
  REJECTED: { bg: 'bg-red-50 border-red-200', text: 'text-red-700', label: 'Rejected' },
};

const approvalStyles: Record<string, { bg: string; text: string; label: string }> = {
  PENDING: { bg: 'bg-gray-100 border-gray-200', text: 'text-gray-600', label: 'Pending' },
  APPROVED: { bg: 'bg-green-50 border-green-200', text: 'text-green-700', label: 'Approved' },
  REJECTED: { bg: 'bg-red-50 border-red-200', text: 'text-red-700', label: 'Rejected' },
  ON_HOLD: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', label: 'On Hold' },
};

const eligibilityStyles: Record<string, { bg: string; text: string; label: string }> = {
  ELIGIBLE: { bg: 'bg-green-50 border-green-200', text: 'text-green-700', label: 'Eligible' },
  INELIGIBLE: { bg: 'bg-red-50 border-red-200', text: 'text-red-700', label: 'Ineligible' },
  PENDING_REVIEW: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', label: 'Pending Review' },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NamesRegistryPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();

  // Filter state
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [visitFilter, setVisitFilter] = useState('');
  const [teamType, setTeamType] = useState('');
  const [verificationStatus, setVerificationStatus] = useState('');
  const [approvalStatus, setApprovalStatus] = useState('');
  const [eligibility, setEligibility] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Selection state for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Import dialog state
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [visitSearchTerm, setVisitSearchTerm] = useState('');
  const [selectedVisitId, setSelectedVisitId] = useState('');

  // Detail drawer state
  const [drawerEntry, setDrawerEntry] = useState<NamesRegistryRow | null>(null);

  // Debounce search
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
    const timeout = setTimeout(() => setDebouncedSearch(value), 300);
    return () => clearTimeout(timeout);
  }, []);

  // Fetch entries
  const {
    data: registryData,
    isLoading,
    isError,
  } = useQuery<NamesRegistryResponse>({
    queryKey: ['names-registry', debouncedSearch, visitFilter, teamType, verificationStatus, approvalStatus, eligibility, page, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (visitFilter) params.set('visitId', visitFilter);
      if (teamType) params.set('teamType', teamType);
      if (verificationStatus) params.set('verificationStatus', verificationStatus);
      if (approvalStatus) params.set('approvalStatus', approvalStatus);
      if (eligibility) params.set('eligibility', eligibility);
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      const res = await fetch(`/api/names-registry?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch entries');
      return res.json();
    },
  });

  // Fetch KPI stats (separate query with no pagination)
  const { data: kpiData } = useQuery({
    queryKey: ['names-registry-kpi'],
    queryFn: async () => {
      const [totalRes, todayRes, duplicatesRes, pendingVerRes, approvedRes, eligibleRes] = await Promise.all([
        fetch('/api/names-registry?pageSize=1').then((r) => r.json()),
        fetch(`/api/names-registry?pageSize=1&dateFrom=${new Date().toISOString().split('T')[0]}`).then((r) => r.json()).catch(() => ({ total: 0 })),
        fetch('/api/names-registry?pageSize=1&duplicatesOnly=true').then((r) => r.json()),
        fetch('/api/names-registry?pageSize=1&verificationStatus=UNVERIFIED').then((r) => r.json()),
        fetch('/api/names-registry?pageSize=1&approvalStatus=APPROVED').then((r) => r.json()),
        fetch('/api/names-registry?pageSize=1&eligibility=ELIGIBLE').then((r) => r.json()),
      ]);
      return {
        total: totalRes.total ?? 0,
        today: todayRes.total ?? 0,
        duplicates: duplicatesRes.total ?? 0,
        pendingVerification: pendingVerRes.total ?? 0,
        approved: approvedRes.total ?? 0,
        eligible: eligibleRes.total ?? 0,
      };
    },
    staleTime: 30_000,
  });

  // Fetch visits for import dialog
  const { data: visitsForImport } = useQuery<{ data: VisitOption[] }>({
    queryKey: ['visits-for-import', visitSearchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (visitSearchTerm) params.set('search', visitSearchTerm);
      params.set('pageSize', '20');
      params.set('status', 'SUBMITTED');
      const res = await fetch(`/api/visits?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch visits');
      return res.json();
    },
    enabled: importDialogOpen,
  });

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async (visitId: string) => {
      const res = await fetch('/api/names-registry/import-from-visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Import failed');
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(`Imported ${data.created} participant(s)${data.skipped ? ` (${data.skipped} already imported)` : ''}`);
      setImportDialogOpen(false);
      setSelectedVisitId('');
      queryClient.invalidateQueries({ queryKey: ['names-registry'] });
      queryClient.invalidateQueries({ queryKey: ['names-registry-kpi'] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // Bulk verify mutation
  const bulkVerifyMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.allSettled(
        ids.map((id) =>
          fetch(`/api/names-registry/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ verificationStatus: 'VERIFIED' }),
          }),
        ),
      );
      const successes = results.filter((r) => r.status === 'fulfilled').length;
      return { successes, total: ids.length };
    },
    onSuccess: (data) => {
      toast.success(`Verified ${data.successes} of ${data.total} entries`);
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['names-registry'] });
      queryClient.invalidateQueries({ queryKey: ['names-registry-kpi'] });
    },
  });

  // Bulk approve mutation
  const bulkApproveMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.allSettled(
        ids.map((id) =>
          fetch(`/api/names-registry/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ approvalStatus: 'APPROVED' }),
          }),
        ),
      );
      const successes = results.filter((r) => r.status === 'fulfilled').length;
      return { successes, total: ids.length };
    },
    onSuccess: (data) => {
      toast.success(`Approved ${data.successes} of ${data.total} entries`);
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['names-registry'] });
      queryClient.invalidateQueries({ queryKey: ['names-registry-kpi'] });
    },
  });

  const canVerify = user ? hasPermission(user, Permission.NAMES_VERIFY) : false;
  const canApprove = user ? hasPermission(user, Permission.NAMES_APPROVE) : false;
  const canCreate = user ? hasPermission(user, Permission.NAMES_CREATE) : false;

  const entries = registryData?.data ?? [];
  const total = registryData?.total ?? 0;
  const totalPages = registryData?.totalPages ?? 1;

  // Toggle selection
  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === entries.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(entries.map((e) => e.id)));
    }
  };

  // Table columns
  const columns: Column<NamesRegistryRow>[] = [
    {
      key: '_select',
      title: '',
      className: 'w-10',
      render: (item) => (
        <Checkbox
          checked={selectedIds.has(item.id)}
          onCheckedChange={() => toggleSelection(item.id)}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Select ${item.fullName}`}
        />
      ),
    },
    {
      key: 'fullName',
      title: 'Name',
      sortable: true,
      render: (item) => (
        <div>
          <div className="font-medium text-[#1E293B]">
            {item.fullName}
            {item.isDuplicate && (
              <AlertTriangle className="ml-1.5 inline size-3.5 text-amber-500" aria-label="Duplicate suspect" />
            )}
          </div>
          {item.role && (
            <div className="text-xs text-[#64748B]">{item.role}</div>
          )}
        </div>
      ),
    },
    {
      key: 'teamType',
      title: 'Team Type',
      className: 'hidden md:table-cell',
      render: (item) => (
        <span className="text-sm text-[#64748B]">{TEAM_TYPES[item.teamType] ?? item.teamType}</span>
      ),
    },
    {
      key: 'districtName',
      title: 'District',
      sortable: true,
      className: 'hidden lg:table-cell',
    },
    {
      key: 'facilityName',
      title: 'Facility',
      sortable: true,
      className: 'hidden xl:table-cell',
    },
    {
      key: 'phone',
      title: 'Phone',
      className: 'hidden md:table-cell',
      render: (item) => (
        <span className="font-mono text-sm text-[#64748B]">{item.phone ?? '-'}</span>
      ),
    },
    {
      key: 'network',
      title: 'Network',
      className: 'hidden xl:table-cell',
      render: (item) => (
        <span className="text-sm">{item.network ? (MOBILE_NETWORKS[item.network] ?? item.network) : '-'}</span>
      ),
    },
    {
      key: 'eligibility',
      title: 'Eligibility',
      className: 'hidden lg:table-cell',
      render: (item) => {
        const config = eligibilityStyles[item.eligibility] ?? eligibilityStyles.PENDING_REVIEW;
        return (
          <Badge variant="outline" className={`text-xs font-medium ${config.bg} ${config.text}`}>
            {config.label}
          </Badge>
        );
      },
    },
    {
      key: 'verificationStatus',
      title: 'Verification',
      render: (item) => {
        const config = verificationStyles[item.verificationStatus] ?? verificationStyles.UNVERIFIED;
        return (
          <Badge variant="outline" className={`text-xs font-medium ${config.bg} ${config.text}`}>
            {config.label}
          </Badge>
        );
      },
    },
    {
      key: 'approvalStatus',
      title: 'Approval',
      render: (item) => {
        const config = approvalStyles[item.approvalStatus] ?? approvalStyles.PENDING;
        return (
          <Badge variant="outline" className={`text-xs font-medium ${config.bg} ${config.text}`}>
            {config.label}
          </Badge>
        );
      },
    },
    {
      key: 'paymentStatus',
      title: 'Payment',
      className: 'hidden lg:table-cell',
      render: (item) => {
        if (!item.paymentRecord) {
          return <span className="text-xs text-[#94A3B8]">None</span>;
        }
        return <PaymentStatusBadge status={item.paymentRecord.status as 'DRAFT' | 'SUBMITTED' | 'VERIFIED' | 'APPROVED' | 'PAID' | 'RECONCILED'} size="sm" />;
      },
    },
    {
      key: 'visitNumber',
      title: 'Visit #',
      className: 'hidden xl:table-cell',
      render: (item) => (
        <span className="font-mono text-xs text-[#0F4C81]">{item.visitNumber}</span>
      ),
    },
  ];

  const handleRowClick = (item: NamesRegistryRow) => {
    setDrawerEntry(item);
  };

  const handleResetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setVisitFilter('');
    setTeamType('');
    setVerificationStatus('');
    setApprovalStatus('');
    setEligibility('');
    setPage(1);
  };

  const hasActiveFilters = debouncedSearch || visitFilter || teamType || verificationStatus || approvalStatus || eligibility;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Names Registry"
        description="Manage participant names, verification, and payment eligibility"
      >
        {canCreate && (
          <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-[#0F4C81] hover:bg-[#0D3F6B]">
                <Import className="size-4" />
                Import from Visit
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
              <DialogHeader>
                <DialogTitle>Import Participants from Visit</DialogTitle>
                <DialogDescription>
                  Select a submitted visit to import its participants into the Names Registry.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="visit-search" className="text-sm font-medium">
                    Search visits
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#94A3B8]" />
                    <Input
                      id="visit-search"
                      placeholder="Search by visit #, facility..."
                      value={visitSearchTerm}
                      onChange={(e) => setVisitSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="max-h-[240px] space-y-1.5 overflow-y-auto rounded-md border border-[#E2E8F0] p-2">
                  {visitsForImport?.data?.length === 0 && (
                    <p className="py-6 text-center text-sm text-[#94A3B8]">No submitted visits found</p>
                  )}
                  {visitsForImport?.data?.map((v: VisitOption) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVisitId(v.id)}
                      className={`w-full rounded-md px-3 py-2.5 text-left transition-colors ${
                        selectedVisitId === v.id
                          ? 'bg-[#0F4C81]/10 border border-[#0F4C81]/30'
                          : 'hover:bg-[#F8FAFC] border border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-medium text-[#0F4C81]">{v.visitNumber}</span>
                        <span className="flex items-center gap-1 text-xs text-[#64748B]">
                          <Users className="size-3" />
                          {v.participantCount}
                        </span>
                      </div>
                      <div className="mt-0.5 text-xs text-[#64748B]">
                        {v.facilityName} -- {new Date(v.visitDate).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  className="bg-[#0F4C81] hover:bg-[#0D3F6B]"
                  disabled={!selectedVisitId || importMutation.isPending}
                  onClick={() => importMutation.mutate(selectedVisitId)}
                >
                  {importMutation.isPending ? 'Importing...' : 'Import Participants'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-8">
        {kpiData ? (
          <>
            <KPICard title="Total Entries" value={kpiData.total} icon={<Users className="size-5" />} />
            <KPICard title="Entered Today" value={kpiData.today} icon={<CalendarDays className="size-5" />} />
            <KPICard
              title="Duplicate Suspects"
              value={kpiData.duplicates}
              icon={<AlertTriangle className="size-5" />}
              className={kpiData.duplicates > 0 ? 'border-red-200 bg-red-50/30' : ''}
            />
            <KPICard title="Invalid Phones" value={0} icon={<Phone className="size-5" />} />
            <KPICard title="Eligible" value={kpiData.eligible} icon={<CheckCircle2 className="size-5" />} />
            <KPICard title="Pending Verification" value={kpiData.pendingVerification} icon={<Clock className="size-5" />} />
            <KPICard title="Approved" value={kpiData.approved} icon={<ShieldCheck className="size-5" />} />
            <KPICard title="Paid" value={0} icon={<Banknote className="size-5" />} />
          </>
        ) : (
          Array.from({ length: 8 }).map((_, i) => <KPICardSkeleton key={i} />)
        )}
      </div>

      {/* Filters */}
      <div className="sticky top-0 z-30 rounded-lg border border-[#E2E8F0] bg-white/95 p-4 shadow-sm backdrop-blur-sm">
        <div className="flex flex-wrap items-end gap-3">
          {/* Search */}
          <div className="min-w-[220px] flex-1 space-y-1.5">
            <Label htmlFor="names-search" className="text-xs font-medium text-[#64748B]">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#94A3B8]" />
              <Input
                id="names-search"
                placeholder="Search by name or phone..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="h-9 pl-9 text-sm"
              />
            </div>
          </div>

          {/* Team Type */}
          <div className="min-w-[140px] space-y-1.5">
            <Label className="text-xs font-medium text-[#64748B]">Team Type</Label>
            <Select value={teamType || 'all'} onValueChange={(v) => { setTeamType(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="h-9 w-full text-sm"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {Object.entries(TEAM_TYPES).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Verification Status */}
          <div className="min-w-[140px] space-y-1.5">
            <Label className="text-xs font-medium text-[#64748B]">Verification</Label>
            <Select value={verificationStatus || 'all'} onValueChange={(v) => { setVerificationStatus(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="h-9 w-full text-sm"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="UNVERIFIED">Unverified</SelectItem>
                <SelectItem value="VERIFIED">Verified</SelectItem>
                <SelectItem value="FLAGGED">Flagged</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Approval Status */}
          <div className="min-w-[140px] space-y-1.5">
            <Label className="text-xs font-medium text-[#64748B]">Approval</Label>
            <Select value={approvalStatus || 'all'} onValueChange={(v) => { setApprovalStatus(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="h-9 w-full text-sm"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="ON_HOLD">On Hold</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Eligibility */}
          <div className="min-w-[140px] space-y-1.5">
            <Label className="text-xs font-medium text-[#64748B]">Eligibility</Label>
            <Select value={eligibility || 'all'} onValueChange={(v) => { setEligibility(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="h-9 w-full text-sm"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="ELIGIBLE">Eligible</SelectItem>
                <SelectItem value="INELIGIBLE">Ineligible</SelectItem>
                <SelectItem value="PENDING_REVIEW">Pending Review</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reset */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={handleResetFilters} className="h-9 text-[#64748B] hover:text-[#1E293B]">
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-[#0F4C81]/20 bg-[#0F4C81]/5 px-4 py-3">
          <span className="text-sm font-medium text-[#0F4C81]">{selectedIds.size} selected</span>
          <div className="flex gap-2">
            {canVerify && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 border-green-300 text-green-700 hover:bg-green-50"
                onClick={() => bulkVerifyMutation.mutate([...selectedIds])}
                disabled={bulkVerifyMutation.isPending}
              >
                <UserCheck className="size-3.5" />
                Verify Selected
              </Button>
            )}
            {canApprove && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 border-[#0F4C81]/30 text-[#0F4C81] hover:bg-[#0F4C81]/5"
                onClick={() => bulkApproveMutation.mutate([...selectedIds])}
                disabled={bulkApproveMutation.isPending}
              >
                <ThumbsUp className="size-3.5" />
                Approve Selected
              </Button>
            )}
          </div>
          <Button size="sm" variant="ghost" className="ml-auto text-xs" onClick={() => setSelectedIds(new Set())}>
            Clear selection
          </Button>
        </div>
      )}

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#64748B]">
          {isLoading ? 'Loading...' : `${total} entr${total === 1 ? 'y' : 'ies'} found`}
        </p>
        {entries.length > 0 && (
          <Button size="sm" variant="ghost" className="text-xs text-[#64748B]" onClick={toggleSelectAll}>
            {selectedIds.size === entries.length ? 'Deselect all' : 'Select all'}
          </Button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <TableSkeleton rows={8} columns={12} />
      ) : isError ? (
        <EmptyState
          icon={<ClipboardList className="size-8" />}
          title="Failed to load names registry"
          description="An error occurred while loading the data. Please try again."
          action={<Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>}
        />
      ) : entries.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="size-8" />}
          title={hasActiveFilters ? 'No entries match your filters' : 'No names registry entries yet'}
          description={
            hasActiveFilters
              ? 'Try adjusting your search or filter criteria.'
              : 'Import participants from a visit to get started.'
          }
          action={
            hasActiveFilters ? (
              <Button variant="outline" onClick={handleResetFilters}>Clear filters</Button>
            ) : canCreate ? (
              <Button className="gap-2 bg-[#0F4C81] hover:bg-[#0D3F6B]" onClick={() => setImportDialogOpen(true)}>
                <Import className="size-4" />
                Import from Visit
              </Button>
            ) : null
          }
        />
      ) : (
        <>
          <DataTable<Record<string, unknown>>
            columns={columns as unknown as Column<Record<string, unknown>>[]}
            data={entries as unknown as Record<string, unknown>[]}
            onRowClick={(item) => handleRowClick(item as unknown as NamesRegistryRow)}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[#E2E8F0] pt-4">
              <p className="text-sm text-[#64748B]">Page {page} of {totalPages}</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="gap-1">
                  <ChevronLeft className="size-4" /> Previous
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="gap-1">
                  Next <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Detail/Edit Drawer */}
      <Sheet open={!!drawerEntry} onOpenChange={(open) => !open && setDrawerEntry(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {drawerEntry && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {drawerEntry.fullName}
                  {drawerEntry.isDuplicate && (
                    <Badge variant="outline" className="bg-amber-50 border-amber-200 text-amber-700 text-xs">
                      Duplicate Suspect
                    </Badge>
                  )}
                </SheetTitle>
                <SheetDescription>
                  Visit {drawerEntry.visitNumber} -- {drawerEntry.facilityName}, {drawerEntry.districtName}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                {/* Personal info */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-[#1E293B]">Personal Information</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-[#94A3B8]">Role</p>
                      <p className="text-sm text-[#1E293B]">{drawerEntry.role ?? '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#94A3B8]">Cadre</p>
                      <p className="text-sm text-[#1E293B]">{drawerEntry.cadre ?? '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#94A3B8]">Team Type</p>
                      <p className="text-sm text-[#1E293B]">{TEAM_TYPES[drawerEntry.teamType] ?? drawerEntry.teamType}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#94A3B8]">Organization</p>
                      <p className="text-sm text-[#1E293B]">{drawerEntry.organization ?? '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#94A3B8]">Phone</p>
                      <p className="font-mono text-sm text-[#1E293B]">{drawerEntry.phone ?? '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#94A3B8]">Network</p>
                      <p className="text-sm text-[#1E293B]">{drawerEntry.network ? (MOBILE_NETWORKS[drawerEntry.network] ?? drawerEntry.network) : '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Status section */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-[#1E293B]">Status</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-[#94A3B8]">Eligibility</p>
                      {(() => {
                        const cfg = eligibilityStyles[drawerEntry.eligibility] ?? eligibilityStyles.PENDING_REVIEW;
                        return <Badge variant="outline" className={`mt-1 text-xs ${cfg.bg} ${cfg.text}`}>{cfg.label}</Badge>;
                      })()}
                    </div>
                    <div>
                      <p className="text-xs text-[#94A3B8]">Verification</p>
                      {(() => {
                        const cfg = verificationStyles[drawerEntry.verificationStatus] ?? verificationStyles.UNVERIFIED;
                        return <Badge variant="outline" className={`mt-1 text-xs ${cfg.bg} ${cfg.text}`}>{cfg.label}</Badge>;
                      })()}
                    </div>
                    <div>
                      <p className="text-xs text-[#94A3B8]">Approval</p>
                      {(() => {
                        const cfg = approvalStyles[drawerEntry.approvalStatus] ?? approvalStyles.PENDING;
                        return <Badge variant="outline" className={`mt-1 text-xs ${cfg.bg} ${cfg.text}`}>{cfg.label}</Badge>;
                      })()}
                    </div>
                    <div>
                      <p className="text-xs text-[#94A3B8]">Payment</p>
                      {drawerEntry.paymentRecord ? (
                        <PaymentStatusBadge status={drawerEntry.paymentRecord.status as 'DRAFT' | 'SUBMITTED' | 'VERIFIED' | 'APPROVED' | 'PAID' | 'RECONCILED'} size="sm" className="mt-1" />
                      ) : (
                        <p className="mt-1 text-xs text-[#94A3B8]">No payment record</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Verification info */}
                {drawerEntry.verifiedBy && (
                  <div className="rounded-md bg-[#F8FAFC] p-3">
                    <p className="text-xs text-[#94A3B8]">Verified by {drawerEntry.verifiedBy.name}</p>
                    {drawerEntry.verifiedAt && (
                      <p className="text-xs text-[#64748B]">{new Date(drawerEntry.verifiedAt).toLocaleString('en-UG')}</p>
                    )}
                  </div>
                )}

                {/* Approval info */}
                {drawerEntry.approvedBy && (
                  <div className="rounded-md bg-[#F8FAFC] p-3">
                    <p className="text-xs text-[#94A3B8]">Approved by {drawerEntry.approvedBy.name}</p>
                    {drawerEntry.approvedAt && (
                      <p className="text-xs text-[#64748B]">{new Date(drawerEntry.approvedAt).toLocaleString('en-UG')}</p>
                    )}
                  </div>
                )}

                {/* Notes */}
                {drawerEntry.notes && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-[#94A3B8]">Notes</p>
                    <p className="text-sm text-[#64748B]">{drawerEntry.notes}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2 border-t border-[#E2E8F0] pt-4">
                  {canVerify && drawerEntry.verificationStatus === 'UNVERIFIED' && (
                    <Button
                      size="sm"
                      className="gap-1.5 bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        bulkVerifyMutation.mutate([drawerEntry.id]);
                        setDrawerEntry(null);
                      }}
                    >
                      <UserCheck className="size-3.5" />
                      Verify
                    </Button>
                  )}
                  {canApprove && drawerEntry.approvalStatus === 'PENDING' && (
                    <Button
                      size="sm"
                      className="gap-1.5 bg-[#0F4C81] hover:bg-[#0D3F6B]"
                      onClick={() => {
                        bulkApproveMutation.mutate([drawerEntry.id]);
                        setDrawerEntry(null);
                      }}
                    >
                      <ThumbsUp className="size-3.5" />
                      Approve
                    </Button>
                  )}
                  {canVerify && drawerEntry.verificationStatus !== 'FLAGGED' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50"
                      onClick={async () => {
                        await fetch(`/api/names-registry/${drawerEntry.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ verificationStatus: 'FLAGGED' }),
                        });
                        toast.success('Entry flagged for review');
                        setDrawerEntry(null);
                        queryClient.invalidateQueries({ queryKey: ['names-registry'] });
                      }}
                    >
                      <AlertTriangle className="size-3.5" />
                      Flag
                    </Button>
                  )}
                </div>

                {/* Metadata */}
                <div className="border-t border-[#E2E8F0] pt-3">
                  <p className="text-xs text-[#94A3B8]">
                    Created by {drawerEntry.createdBy.name} on {new Date(drawerEntry.createdAt).toLocaleString('en-UG')}
                  </p>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
