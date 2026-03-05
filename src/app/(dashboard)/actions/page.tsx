'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ClipboardList,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Plus,
  RotateCcw,
} from 'lucide-react';
import { PageHeader, KPICard, DataTable, EmptyState } from '@/components/common';
import type { Column } from '@/components/common';
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
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { ActionStatus, ActionPriority } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ActionRow {
  id: string;
  actionItem: string;
  facilityName: string;
  districtName: string;
  domainTitle: string | null;
  sectionNumber: number | null;
  priority: ActionPriority;
  status: ActionStatus;
  dueDate: string | null;
  isOverdue: boolean;
  assignedTo: { id: string; name: string; email: string } | null;
  createdAt: string;
}

interface KPIs {
  open: number;
  overdue: number;
  inProgress: number;
  completed: number;
}

interface ActionFilters {
  status: string;
  priority: string;
  districtId: string;
  sectionNumber: string;
  overdue: boolean;
}

// ---------------------------------------------------------------------------
// Badge helpers
// ---------------------------------------------------------------------------

const priorityConfig: Record<ActionPriority, { label: string; className: string }> = {
  CRITICAL: { label: 'Critical', className: 'bg-red-50 text-red-700 border-red-200' },
  HIGH: { label: 'High', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  MEDIUM: { label: 'Medium', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  LOW: { label: 'Low', className: 'bg-gray-50 text-gray-600 border-gray-200' },
};

const statusConfig: Record<ActionStatus, { label: string; className: string }> = {
  OPEN: { label: 'Open', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  IN_PROGRESS: { label: 'In Progress', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  COMPLETED: { label: 'Completed', className: 'bg-green-50 text-green-700 border-green-200' },
  OVERDUE: { label: 'Overdue', className: 'bg-red-50 text-red-700 border-red-200' },
  CANCELLED: { label: 'Cancelled', className: 'bg-gray-50 text-gray-500 border-gray-200' },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ActionsPage() {
  const router = useRouter();
  const [data, setData] = useState<ActionRow[]>([]);
  const [kpis, setKpis] = useState<KPIs>({ open: 0, overdue: 0, inProgress: 0, completed: 0 });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [districts, setDistricts] = useState<{ id: string; name: string }[]>([]);
  const [filters, setFilters] = useState<ActionFilters>({
    status: '',
    priority: '',
    districtId: '',
    sectionNumber: '',
    overdue: false,
  });

  const pageSize = 20;

  // Fetch districts for filter
  useEffect(() => {
    fetch('/api/facilities/districts')
      .then((r) => r.json())
      .then((res) => {
        if (Array.isArray(res)) setDistricts(res);
        else if (Array.isArray(res.data)) setDistricts(res.data);
      })
      .catch(() => {});
  }, []);

  // Fetch actions
  const fetchActions = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (filters.status) params.set('status', filters.status);
      if (filters.priority) params.set('priority', filters.priority);
      if (filters.districtId) params.set('districtId', filters.districtId);
      if (filters.sectionNumber) params.set('sectionNumber', filters.sectionNumber);
      if (filters.overdue) params.set('overdue', 'true');

      const res = await fetch(`/api/actions?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setData(json.data ?? []);
      setTotal(json.total ?? 0);
      if (json.kpis) setKpis(json.kpis);
    } catch {
      setData([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  const totalPages = Math.ceil(total / pageSize);

  const resetFilters = () => {
    setFilters({ status: '', priority: '', districtId: '', sectionNumber: '', overdue: false });
    setPage(1);
  };

  const hasActiveFilters = filters.status || filters.priority || filters.districtId || filters.sectionNumber || filters.overdue;

  // Table columns
  const columns: Column<ActionRow>[] = [
    {
      key: 'actionItem',
      title: 'Action Item',
      sortable: true,
      render: (row) => (
        <span className="block max-w-[250px] truncate font-medium text-[#1E293B]" title={row.actionItem}>
          {row.actionItem}
        </span>
      ),
    },
    {
      key: 'facilityName',
      title: 'Facility',
      sortable: true,
    },
    {
      key: 'districtName',
      title: 'District',
      sortable: true,
    },
    {
      key: 'domainTitle',
      title: 'Domain',
      render: (row) => row.domainTitle ?? '-',
    },
    {
      key: 'priority',
      title: 'Priority',
      sortable: true,
      render: (row) => {
        const cfg = priorityConfig[row.priority];
        return (
          <Badge variant="outline" className={cn('font-medium', cfg.className)}>
            {cfg.label}
          </Badge>
        );
      },
    },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      render: (row) => {
        const displayStatus = row.isOverdue && ['OPEN', 'IN_PROGRESS'].includes(row.status) ? 'OVERDUE' : row.status;
        const cfg = statusConfig[displayStatus as ActionStatus];
        return (
          <Badge variant="outline" className={cn('font-medium', cfg.className)}>
            {cfg.label}
          </Badge>
        );
      },
    },
    {
      key: 'dueDate',
      title: 'Due Date',
      sortable: true,
      render: (row) => {
        if (!row.dueDate) return <span className="text-[#64748B]">-</span>;
        const date = new Date(row.dueDate);
        const formatted = date.toLocaleDateString('en-UG', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
        return (
          <span className={cn(row.isOverdue && 'font-semibold text-red-600')}>
            {formatted}
          </span>
        );
      },
    },
    {
      key: 'assignedTo',
      title: 'Assigned To',
      render: (row) => row.assignedTo?.name ?? <span className="text-[#64748B]">Unassigned</span>,
    },
  ];

  // Section options (1-16)
  const sectionOptions = Array.from({ length: 16 }, (_, i) => ({
    value: String(i + 1),
    label: `Section ${i + 1}`,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Action Plans"
        description="Track and manage follow-up actions from assessments"
      >
        <Link href="/actions/new">
          <Button className="gap-2 bg-[#0F4C81] hover:bg-[#0F4C81]/90">
            <Plus className="size-4" />
            New Action
          </Button>
        </Link>
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Open"
          value={kpis.open}
          icon={<ClipboardList className="size-6" />}
          className="border-l-4 border-l-blue-500"
        />
        <KPICard
          title="Overdue"
          value={kpis.overdue}
          icon={<AlertTriangle className="size-6" />}
          className="border-l-4 border-l-red-500"
        />
        <KPICard
          title="In Progress"
          value={kpis.inProgress}
          icon={<Clock className="size-6" />}
          className="border-l-4 border-l-amber-500"
        />
        <KPICard
          title="Completed"
          value={kpis.completed}
          icon={<CheckCircle2 className="size-6" />}
          className="border-l-4 border-l-green-500"
        />
      </div>

      {/* Filters */}
      <div className="sticky top-0 z-30 rounded-lg border border-[#E2E8F0] bg-white/95 p-4 shadow-sm backdrop-blur-sm">
        <div className="flex flex-wrap items-end gap-4">
          {/* Status */}
          <div className="min-w-[160px] space-y-1.5">
            <Label className="text-xs font-medium text-[#64748B]">Status</Label>
            <Select
              value={filters.status}
              onValueChange={(v) => {
                setFilters((f) => ({ ...f, status: v === 'all' ? '' : v }));
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-full text-sm">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div className="min-w-[160px] space-y-1.5">
            <Label className="text-xs font-medium text-[#64748B]">Priority</Label>
            <Select
              value={filters.priority}
              onValueChange={(v) => {
                setFilters((f) => ({ ...f, priority: v === 'all' ? '' : v }));
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-full text-sm">
                <SelectValue placeholder="All priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All priorities</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* District */}
          {districts.length > 0 && (
            <div className="min-w-[180px] space-y-1.5">
              <Label className="text-xs font-medium text-[#64748B]">District</Label>
              <Select
                value={filters.districtId}
                onValueChange={(v) => {
                  setFilters((f) => ({ ...f, districtId: v === 'all' ? '' : v }));
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 w-full text-sm">
                  <SelectValue placeholder="All districts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All districts</SelectItem>
                  {districts.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Section / Domain */}
          <div className="min-w-[160px] space-y-1.5">
            <Label className="text-xs font-medium text-[#64748B]">Section</Label>
            <Select
              value={filters.sectionNumber}
              onValueChange={(v) => {
                setFilters((f) => ({ ...f, sectionNumber: v === 'all' ? '' : v }));
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-full text-sm">
                <SelectValue placeholder="All sections" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sections</SelectItem>
                {sectionOptions.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Overdue toggle */}
          <div className="flex items-center gap-2 pb-1">
            <Switch
              id="overdue-toggle"
              checked={filters.overdue}
              onCheckedChange={(checked) => {
                setFilters((f) => ({ ...f, overdue: checked }));
                setPage(1);
              }}
            />
            <Label htmlFor="overdue-toggle" className="text-sm text-[#64748B] cursor-pointer">
              Overdue only
            </Label>
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
      {!isLoading && data.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="size-8" />}
          title="No action plans found"
          description="Create action plans from assessment findings to track follow-up activities."
          action={
            <Link href="/actions/new">
              <Button className="gap-2 bg-[#0F4C81] hover:bg-[#0F4C81]/90">
                <Plus className="size-4" />
                Create Action Plan
              </Button>
            </Link>
          }
        />
      ) : (
        <DataTable<Record<string, unknown>>
          columns={columns as unknown as Column<Record<string, unknown>>[]}
          data={data as unknown as Record<string, unknown>[]}
          isLoading={isLoading}
          onRowClick={(item) => router.push(`/actions/${(item as unknown as ActionRow).id}`)}
          emptyMessage="No action plans match your filters"
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-[#E2E8F0] pt-4">
          <p className="text-sm text-[#64748B]">
            Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
