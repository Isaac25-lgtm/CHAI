'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Banknote,
  Search,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Send,
  ShieldCheck,
  ThumbsUp,
  CreditCard,
  Archive,
  XCircle,
  LayoutGrid,
  List,
  Loader2,
} from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { DataTable, type Column } from '@/components/common/data-table';
import { KPICard } from '@/components/common/kpi-card';
import { EmptyState } from '@/components/common/empty-state';
import { TableSkeleton, KPICardSkeleton } from '@/components/common/loading-skeleton';
import { PaymentStatusBadge } from '@/components/common/payment-status-badge';
import type { PaymentBadgeStatus } from '@/components/common/payment-status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
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
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCurrentUser } from '@/hooks/use-session';
import { hasPermission, Permission, isFinance as checkFinance, isAdmin as checkAdmin } from '@/lib/rbac';
import { PAYMENT_STATUS_LABELS, PAYMENT_CATEGORIES, MOBILE_NETWORKS } from '@/config/constants';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PaymentRow {
  id: string;
  namesEntryId: string;
  paymentCategory: string;
  amount: number | null;
  currency: string;
  phone: string | null;
  network: string | null;
  status: string;
  submittedAt: string | null;
  verifiedAt: string | null;
  approvedAt: string | null;
  paidAt: string | null;
  transactionRef: string | null;
  reconcileNote: string | null;
  reconciledAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  namesEntry: {
    id: string;
    fullName: string;
    role: string | null;
    teamType: string;
    districtName: string | null;
    facilityName: string | null;
    phone: string | null;
    network: string | null;
    eligibility: string;
    verificationStatus: string;
    approvalStatus: string;
    visit: {
      id: string;
      visitNumber: string;
      visitDate: string;
    };
  };
  approvedBy: { id: string; name: string } | null;
  paidBy: { id: string; name: string } | null;
}

interface PaymentResponse {
  data: PaymentRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PaymentsPage() {
  const queryClient = useQueryClient();
  const { user, isLoading: userLoading } = useCurrentUser();

  // View toggle
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');

  // Filter state
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [networkFilter, setNetworkFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Selection state for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Action dialog state
  const [actionDialog, setActionDialog] = useState<{
    type: 'verify' | 'approve' | 'mark_paid' | 'reconcile' | 'reject';
    paymentId: string;
    paymentName: string;
  } | null>(null);
  const [transactionRef, setTransactionRef] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [reconcileNote, setReconcileNote] = useState('');

  // Debounce search
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
    const timeout = setTimeout(() => setDebouncedSearch(value), 300);
    return () => clearTimeout(timeout);
  }, []);

  // Permission checks
  const userIsFinance = user ? checkFinance(user) : false;
  const userIsAdmin = user ? checkAdmin(user) : false;
  const canAccessPage = userIsFinance || userIsAdmin;
  const canVerify = user ? hasPermission(user, Permission.PAYMENTS_VERIFY) : false;
  const canApprove = user ? hasPermission(user, Permission.PAYMENTS_APPROVE) : false;
  const canMarkPaid = user ? hasPermission(user, Permission.PAYMENTS_MARK_PAID) : false;

  // Fetch payments
  const {
    data: paymentsData,
    isLoading,
    isError,
  } = useQuery<PaymentResponse>({
    queryKey: ['payments', debouncedSearch, statusFilter, networkFilter, categoryFilter, dateFrom, dateTo, page, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (statusFilter) params.set('status', statusFilter);
      if (networkFilter) params.set('network', networkFilter);
      if (categoryFilter) params.set('paymentCategory', categoryFilter);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      const res = await fetch(`/api/payments?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch payments');
      return res.json();
    },
    enabled: canAccessPage,
  });

  // Fetch KPI stats
  const { data: kpiData } = useQuery({
    queryKey: ['payments-kpi'],
    queryFn: async () => {
      const statuses = ['DRAFT', 'SUBMITTED', 'VERIFIED', 'APPROVED', 'PAID', 'RECONCILED'];
      const results = await Promise.all(
        statuses.map((s) =>
          fetch(`/api/payments?pageSize=1&status=${s}`).then((r) => r.json()).then((d) => d.total ?? 0).catch(() => 0),
        ),
      );
      return {
        DRAFT: results[0],
        SUBMITTED: results[1],
        VERIFIED: results[2],
        APPROVED: results[3],
        PAID: results[4],
        RECONCILED: results[5],
      };
    },
    enabled: canAccessPage,
    staleTime: 30_000,
  });

  // Status transition mutation
  const transitionMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Record<string, unknown> }) => {
      const res = await fetch(`/api/payments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Action failed');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Payment updated successfully');
      setActionDialog(null);
      setTransactionRef('');
      setRejectionReason('');
      setReconcileNote('');
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payments-kpi'] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // Bulk approve mutation
  const bulkApproveMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.allSettled(
        ids.map((id) =>
          fetch(`/api/payments/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'APPROVED' }),
          }),
        ),
      );
      return results.filter((r) => r.status === 'fulfilled').length;
    },
    onSuccess: (count) => {
      toast.success(`Approved ${count} payment(s)`);
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payments-kpi'] });
    },
  });

  // Bulk mark paid mutation (with shared transaction ref)
  const [bulkPayDialog, setBulkPayDialog] = useState(false);
  const [bulkTransactionRef, setBulkTransactionRef] = useState('');

  const bulkMarkPaidMutation = useMutation({
    mutationFn: async ({ ids, ref }: { ids: string[]; ref: string }) => {
      const results = await Promise.allSettled(
        ids.map((id) =>
          fetch(`/api/payments/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'PAID', transactionRef: ref }),
          }),
        ),
      );
      return results.filter((r) => r.status === 'fulfilled').length;
    },
    onSuccess: (count) => {
      toast.success(`Marked ${count} payment(s) as paid`);
      setSelectedIds(new Set());
      setBulkPayDialog(false);
      setBulkTransactionRef('');
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payments-kpi'] });
    },
  });

  const payments = paymentsData?.data ?? [];
  const total = paymentsData?.total ?? 0;
  const totalPages = paymentsData?.totalPages ?? 1;

  // Selection helpers
  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === payments.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(payments.map((p) => p.id)));
    }
  };

  // Handle action confirmation
  const handleActionConfirm = () => {
    if (!actionDialog) return;
    const { type, paymentId } = actionDialog;

    switch (type) {
      case 'verify':
        transitionMutation.mutate({ id: paymentId, body: { status: 'VERIFIED' } });
        break;
      case 'approve':
        transitionMutation.mutate({ id: paymentId, body: { status: 'APPROVED' } });
        break;
      case 'mark_paid':
        if (!transactionRef.trim()) {
          toast.error('Transaction reference is required');
          return;
        }
        transitionMutation.mutate({ id: paymentId, body: { status: 'PAID', transactionRef: transactionRef.trim() } });
        break;
      case 'reconcile':
        transitionMutation.mutate({ id: paymentId, body: { status: 'RECONCILED', reconcileNote: reconcileNote.trim() || undefined } });
        break;
      case 'reject':
        if (!rejectionReason.trim()) {
          toast.error('Rejection reason is required');
          return;
        }
        transitionMutation.mutate({ id: paymentId, body: { reject: true, rejectionReason: rejectionReason.trim() } });
        break;
    }
  };

  // Format currency
  const formatUGX = (amount: number | null) => {
    if (amount == null) return '-';
    return new Intl.NumberFormat('en-UG', { style: 'decimal', minimumFractionDigits: 0 }).format(amount);
  };

  // Table columns
  const columns: Column<PaymentRow>[] = [
    {
      key: '_select',
      title: '',
      className: 'w-10',
      render: (item) => (
        <Checkbox
          checked={selectedIds.has(item.id)}
          onCheckedChange={() => toggleSelection(item.id)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      key: 'fullName',
      title: 'Name',
      sortable: true,
      render: (item) => (
        <div>
          <div className="font-medium text-[#1E293B]">{item.namesEntry.fullName}</div>
          <div className="text-xs text-[#64748B]">{item.namesEntry.role ?? item.namesEntry.teamType}</div>
        </div>
      ),
    },
    {
      key: 'phone',
      title: 'Phone',
      render: (item) => (
        <span className="font-mono text-sm text-[#64748B]">{item.phone ?? '-'}</span>
      ),
    },
    {
      key: 'network',
      title: 'Network',
      className: 'hidden md:table-cell',
      render: (item) => (
        <span className="text-sm">{item.network ? (MOBILE_NETWORKS[item.network] ?? item.network) : '-'}</span>
      ),
    },
    {
      key: 'amount',
      title: 'Amount (UGX)',
      sortable: true,
      render: (item) => (
        <span className="font-mono text-sm font-medium text-[#1E293B]">{formatUGX(item.amount)}</span>
      ),
    },
    {
      key: 'paymentCategory',
      title: 'Category',
      className: 'hidden lg:table-cell',
      render: (item) => (
        <span className="text-sm text-[#64748B]">{PAYMENT_CATEGORIES[item.paymentCategory] ?? item.paymentCategory}</span>
      ),
    },
    {
      key: 'visitNumber',
      title: 'Visit',
      className: 'hidden xl:table-cell',
      render: (item) => (
        <span className="font-mono text-xs text-[#0F4C81]">{item.namesEntry.visit.visitNumber}</span>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (item) => (
        <div className="flex items-center gap-1.5">
          <PaymentStatusBadge status={item.status as PaymentBadgeStatus} />
          {item.rejectionReason && (
            <span className="text-xs text-red-500" title={item.rejectionReason}>
              <XCircle className="size-3.5" />
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'approvedBy',
      title: 'Approved By',
      className: 'hidden lg:table-cell',
      render: (item) => (
        <span className="text-sm text-[#64748B]">{item.approvedBy?.name ?? '-'}</span>
      ),
    },
    {
      key: 'paidAt',
      title: 'Paid Date',
      className: 'hidden xl:table-cell',
      render: (item) => (
        <span className="text-sm text-[#64748B]">
          {item.paidAt ? new Date(item.paidAt).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
        </span>
      ),
    },
    {
      key: 'transactionRef',
      title: 'Txn Ref',
      className: 'hidden xl:table-cell',
      render: (item) => (
        <span className="font-mono text-xs text-[#64748B]">{item.transactionRef ?? '-'}</span>
      ),
    },
    {
      key: '_actions',
      title: 'Actions',
      className: 'w-[120px]',
      render: (item) => (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          {item.status === 'SUBMITTED' && canVerify && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-cyan-700 hover:bg-cyan-50"
              onClick={() => setActionDialog({ type: 'verify', paymentId: item.id, paymentName: item.namesEntry.fullName })}
            >
              Verify
            </Button>
          )}
          {item.status === 'VERIFIED' && canApprove && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-green-700 hover:bg-green-50"
              onClick={() => setActionDialog({ type: 'approve', paymentId: item.id, paymentName: item.namesEntry.fullName })}
            >
              Approve
            </Button>
          )}
          {item.status === 'APPROVED' && canMarkPaid && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-emerald-700 hover:bg-emerald-50"
              onClick={() => setActionDialog({ type: 'mark_paid', paymentId: item.id, paymentName: item.namesEntry.fullName })}
            >
              Pay
            </Button>
          )}
          {item.status === 'PAID' && (userIsFinance || userIsAdmin) && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-slate-700 hover:bg-slate-50"
              onClick={() => setActionDialog({ type: 'reconcile', paymentId: item.id, paymentName: item.namesEntry.fullName })}
            >
              Reconcile
            </Button>
          )}
          {item.status !== 'RECONCILED' && (userIsFinance || userIsAdmin) && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-red-600 hover:bg-red-50"
              onClick={() => setActionDialog({ type: 'reject', paymentId: item.id, paymentName: item.namesEntry.fullName })}
            >
              Reject
            </Button>
          )}
        </div>
      ),
    },
  ];

  const handleResetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setStatusFilter('');
    setNetworkFilter('');
    setCategoryFilter('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const hasActiveFilters = debouncedSearch || statusFilter || networkFilter || categoryFilter || dateFrom || dateTo;

  // Access denied for non-finance/non-admin
  if (!userLoading && !canAccessPage) {
    return (
      <div className="space-y-6">
        <PageHeader title="Payment Management" />
        <EmptyState
          icon={<Banknote className="size-8" />}
          title="Access Restricted"
          description="Only finance officers and administrators can access the payment management interface."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Payment Management"
        description="Process, approve, and reconcile participant payments"
      >
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-[#E2E8F0]">
            <Button
              size="sm"
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              className={`h-8 rounded-r-none ${viewMode === 'table' ? 'bg-[#0F4C81] hover:bg-[#0D3F6B]' : ''}`}
              onClick={() => setViewMode('table')}
            >
              <List className="size-4" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'kanban' ? 'default' : 'ghost'}
              className={`h-8 rounded-l-none ${viewMode === 'kanban' ? 'bg-[#0F4C81] hover:bg-[#0D3F6B]' : ''}`}
              onClick={() => setViewMode('kanban')}
            >
              <LayoutGrid className="size-4" />
            </Button>
          </div>
          <Button variant="outline" className="gap-2" onClick={() => toast.info('Export functionality coming soon')}>
            <FileSpreadsheet className="size-4" />
            Export
          </Button>
        </div>
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {kpiData ? (
          <>
            <KPICard title="Draft" value={kpiData.DRAFT} icon={<Clock className="size-5" />} />
            <KPICard title="Submitted" value={kpiData.SUBMITTED} icon={<Send className="size-5" />} />
            <KPICard title="Verified" value={kpiData.VERIFIED} icon={<ShieldCheck className="size-5" />} />
            <KPICard title="Approved" value={kpiData.APPROVED} icon={<ThumbsUp className="size-5" />} />
            <KPICard title="Paid" value={kpiData.PAID} icon={<CreditCard className="size-5" />} />
            <KPICard title="Reconciled" value={kpiData.RECONCILED} icon={<Archive className="size-5" />} />
          </>
        ) : (
          Array.from({ length: 6 }).map((_, i) => <KPICardSkeleton key={i} />)
        )}
      </div>

      {/* Filters */}
      <div className="sticky top-0 z-30 rounded-lg border border-[#E2E8F0] bg-white/95 p-4 shadow-sm backdrop-blur-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1 space-y-1.5">
            <Label htmlFor="payment-search" className="text-xs font-medium text-[#64748B]">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#94A3B8]" />
              <Input
                id="payment-search"
                placeholder="Name, phone, or txn ref..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="h-9 pl-9 text-sm"
              />
            </div>
          </div>

          <div className="min-w-[140px] space-y-1.5">
            <Label className="text-xs font-medium text-[#64748B]">Status</Label>
            <Select value={statusFilter || 'all'} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="h-9 w-full text-sm"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {Object.entries(PAYMENT_STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[130px] space-y-1.5">
            <Label className="text-xs font-medium text-[#64748B]">Network</Label>
            <Select value={networkFilter || 'all'} onValueChange={(v) => { setNetworkFilter(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="h-9 w-full text-sm"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {Object.entries(MOBILE_NETWORKS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[130px] space-y-1.5">
            <Label className="text-xs font-medium text-[#64748B]">Category</Label>
            <Select value={categoryFilter || 'all'} onValueChange={(v) => { setCategoryFilter(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="h-9 w-full text-sm"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {Object.entries(PAYMENT_CATEGORIES).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[130px] space-y-1.5">
            <Label htmlFor="pay-from" className="text-xs font-medium text-[#64748B]">From</Label>
            <Input id="pay-from" type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="h-9 text-sm" />
          </div>

          <div className="min-w-[130px] space-y-1.5">
            <Label htmlFor="pay-to" className="text-xs font-medium text-[#64748B]">To</Label>
            <Input id="pay-to" type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="h-9 text-sm" />
          </div>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={handleResetFilters} className="h-9 text-[#64748B] hover:text-[#1E293B]">
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-[#0F4C81]/20 bg-[#0F4C81]/5 px-4 py-3">
          <span className="text-sm font-medium text-[#0F4C81]">{selectedIds.size} selected</span>
          <div className="flex gap-2">
            {canApprove && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 border-green-300 text-green-700 hover:bg-green-50"
                onClick={() => bulkApproveMutation.mutate([...selectedIds])}
                disabled={bulkApproveMutation.isPending}
              >
                <ThumbsUp className="size-3.5" />
                Bulk Approve
              </Button>
            )}
            {canMarkPaid && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                onClick={() => setBulkPayDialog(true)}
              >
                <CreditCard className="size-3.5" />
                Bulk Mark Paid
              </Button>
            )}
          </div>
          <Button size="sm" variant="ghost" className="ml-auto text-xs" onClick={() => setSelectedIds(new Set())}>
            Clear selection
          </Button>
        </div>
      )}

      {/* Results count + select all */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#64748B]">
          {isLoading ? 'Loading...' : `${total} payment${total === 1 ? '' : 's'} found`}
        </p>
        {payments.length > 0 && viewMode === 'table' && (
          <Button size="sm" variant="ghost" className="text-xs text-[#64748B]" onClick={toggleSelectAll}>
            {selectedIds.size === payments.length ? 'Deselect all' : 'Select all'}
          </Button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <TableSkeleton rows={8} columns={12} />
      ) : isError ? (
        <EmptyState
          icon={<Banknote className="size-8" />}
          title="Failed to load payments"
          description="An error occurred while loading the payment records. Please try again."
          action={<Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>}
        />
      ) : payments.length === 0 ? (
        <EmptyState
          icon={<Banknote className="size-8" />}
          title={hasActiveFilters ? 'No payments match your filters' : 'No payment records yet'}
          description={
            hasActiveFilters
              ? 'Try adjusting your search or filter criteria.'
              : 'Payment records will appear here once created from the Names Registry.'
          }
          action={
            hasActiveFilters ? (
              <Button variant="outline" onClick={handleResetFilters}>Clear filters</Button>
            ) : null
          }
        />
      ) : viewMode === 'kanban' ? (
        /* Kanban view */
        <div className="grid gap-4 overflow-x-auto md:grid-cols-3 lg:grid-cols-6">
          {(['DRAFT', 'SUBMITTED', 'VERIFIED', 'APPROVED', 'PAID', 'RECONCILED'] as const).map((s) => {
            const statusPayments = payments.filter((p) => p.status === s);
            return (
              <Card key={s} className="min-w-[200px]">
                <CardHeader className="px-3 py-2">
                  <CardTitle className="flex items-center justify-between">
                    <PaymentStatusBadge status={s} />
                    <span className="text-xs font-normal text-[#94A3B8]">{statusPayments.length}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 px-3 pb-3">
                  {statusPayments.length === 0 && (
                    <p className="py-4 text-center text-xs text-[#94A3B8]">None</p>
                  )}
                  {statusPayments.map((p) => (
                    <div
                      key={p.id}
                      className="rounded-md border border-[#E2E8F0] bg-white p-2.5 transition-shadow hover:shadow-sm"
                    >
                      <p className="text-sm font-medium text-[#1E293B]">{p.namesEntry.fullName}</p>
                      <p className="font-mono text-xs text-[#64748B]">{formatUGX(p.amount)} UGX</p>
                      <p className="text-xs text-[#94A3B8]">{p.namesEntry.visit.visitNumber}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Table view */
        <>
          <DataTable<Record<string, unknown>>
            columns={columns as unknown as Column<Record<string, unknown>>[]}
            data={payments as unknown as Record<string, unknown>[]}
          />

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

      {/* Action Confirmation Dialogs */}

      {/* Verify confirmation */}
      <AlertDialog open={actionDialog?.type === 'verify'} onOpenChange={(open) => !open && setActionDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Verify Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to verify the payment for <strong>{actionDialog?.paymentName}</strong>? This confirms the payment details are correct.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-cyan-600 hover:bg-cyan-700"
              onClick={handleActionConfirm}
              disabled={transitionMutation.isPending}
            >
              {transitionMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Verify Payment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Approve confirmation */}
      <AlertDialog open={actionDialog?.type === 'approve'} onOpenChange={(open) => !open && setActionDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve the payment for <strong>{actionDialog?.paymentName}</strong>? This authorizes the payment for disbursement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-green-600 hover:bg-green-700"
              onClick={handleActionConfirm}
              disabled={transitionMutation.isPending}
            >
              {transitionMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Approve Payment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mark Paid dialog (requires transaction ref) */}
      <Dialog open={actionDialog?.type === 'mark_paid'} onOpenChange={(open) => !open && setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Payment as Paid</DialogTitle>
            <DialogDescription>
              Enter the transaction reference for the payment to <strong>{actionDialog?.paymentName}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="txn-ref" className="text-sm font-medium">Transaction Reference *</Label>
              <Input
                id="txn-ref"
                placeholder="e.g., MM-20260305-12345"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleActionConfirm}
              disabled={transitionMutation.isPending || !transactionRef.trim()}
            >
              {transitionMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <CreditCard className="mr-2 size-4" />}
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reconcile confirmation */}
      <Dialog open={actionDialog?.type === 'reconcile'} onOpenChange={(open) => !open && setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reconcile Payment</DialogTitle>
            <DialogDescription>
              Mark payment for <strong>{actionDialog?.paymentName}</strong> as reconciled. Optionally add a note.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="reconcile-note" className="text-sm font-medium">Reconciliation Note (optional)</Label>
              <Textarea
                id="reconcile-note"
                placeholder="e.g., Confirmed in bank statement"
                value={reconcileNote}
                onChange={(e) => setReconcileNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
            <Button
              className="bg-slate-700 hover:bg-slate-800"
              onClick={handleActionConfirm}
              disabled={transitionMutation.isPending}
            >
              {transitionMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Archive className="mr-2 size-4" />}
              Reconcile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog (requires reason) */}
      <Dialog open={actionDialog?.type === 'reject'} onOpenChange={(open) => !open && setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Payment</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting the payment for <strong>{actionDialog?.paymentName}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="reject-reason" className="text-sm font-medium">Rejection Reason *</Label>
              <Textarea
                id="reject-reason"
                placeholder="Enter the reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleActionConfirm}
              disabled={transitionMutation.isPending || !rejectionReason.trim()}
            >
              {transitionMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <XCircle className="mr-2 size-4" />}
              Reject Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Mark Paid dialog */}
      <Dialog open={bulkPayDialog} onOpenChange={setBulkPayDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Mark as Paid</DialogTitle>
            <DialogDescription>
              Enter a shared transaction reference for {selectedIds.size} selected payment(s).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="bulk-txn-ref" className="text-sm font-medium">Transaction Reference *</Label>
              <Input
                id="bulk-txn-ref"
                placeholder="e.g., BATCH-20260305-001"
                value={bulkTransactionRef}
                onChange={(e) => setBulkTransactionRef(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkPayDialog(false)}>Cancel</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => bulkMarkPaidMutation.mutate({ ids: [...selectedIds], ref: bulkTransactionRef.trim() })}
              disabled={bulkMarkPaidMutation.isPending || !bulkTransactionRef.trim()}
            >
              {bulkMarkPaidMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <CreditCard className="mr-2 size-4" />}
              Mark {selectedIds.size} as Paid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
