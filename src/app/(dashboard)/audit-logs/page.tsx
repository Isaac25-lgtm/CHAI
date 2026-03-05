'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  ScrollText,
  X,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/common/page-header';
import { DataTable, type Column } from '@/components/common/data-table';
import { useCurrentUser } from '@/hooks/use-session';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuditLogEntry {
  id: string;
  userId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  before: string | null;
  after: string | null;
  metadata: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
}

interface AuditLogResponse {
  data: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ---------------------------------------------------------------------------
// Action badge colors
// ---------------------------------------------------------------------------

const ACTION_BADGE_STYLES: Record<string, string> = {
  CREATE:        'bg-green-50 text-green-700 border-green-200',
  UPDATE:        'bg-blue-50 text-blue-700 border-blue-200',
  DELETE:        'bg-red-50 text-red-700 border-red-200',
  SUBMIT:        'bg-indigo-50 text-indigo-700 border-indigo-200',
  APPROVE:       'bg-green-50 text-green-700 border-green-200',
  REJECT:        'bg-red-50 text-red-700 border-red-200',
  VERIFY:        'bg-cyan-50 text-cyan-700 border-cyan-200',
  MARK_PAID:     'bg-emerald-50 text-emerald-700 border-emerald-200',
  RECONCILE:     'bg-teal-50 text-teal-700 border-teal-200',
  EXPORT:        'bg-purple-50 text-purple-700 border-purple-200',
  LOGIN:         'bg-gray-50 text-gray-700 border-gray-200',
  LOGOUT:        'bg-gray-50 text-gray-600 border-gray-200',
  ROLE_CHANGE:   'bg-amber-50 text-amber-700 border-amber-200',
  STATUS_CHANGE: 'bg-amber-50 text-amber-700 border-amber-200',
  UNLOCK:        'bg-sky-50 text-sky-700 border-sky-200',
  REOPEN:        'bg-orange-50 text-orange-700 border-orange-200',
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AUDIT_ACTIONS = [
  'CREATE', 'UPDATE', 'DELETE', 'SUBMIT', 'APPROVE', 'REJECT',
  'VERIFY', 'MARK_PAID', 'RECONCILE', 'EXPORT', 'LOGIN', 'LOGOUT',
  'ROLE_CHANGE', 'STATUS_CHANGE', 'UNLOCK', 'REOPEN',
];

const AUDIT_ENTITIES = [
  'USER', 'VISIT', 'ASSESSMENT', 'RESPONSE', 'ACTION_PLAN',
  'NAMES_ENTRY', 'PAYMENT', 'FACILITY', 'EXPORT', 'SYSTEM',
];

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function AuditLogsPage() {
  const { user } = useCurrentUser();

  // State
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');

  // Detail dialog
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  // Fetch data
  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', '20');
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      if (searchQuery) params.set('search', searchQuery);
      if (actionFilter) params.set('action', actionFilter);
      if (entityFilter) params.set('entity', entityFilter);

      const res = await fetch(`/api/audit-logs?${params.toString()}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch (${res.status})`);
      }

      const data: AuditLogResponse = await res.json();
      setLogs(data.data);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
      toast.error('Failed to load audit logs');
    } finally {
      setIsLoading(false);
    }
  }, [page, dateFrom, dateTo, searchQuery, actionFilter, entityFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [dateFrom, dateTo, searchQuery, actionFilter, entityFilter]);

  // Role guard
  if (user && user.role !== 'SUPER_ADMIN' && user.role !== 'NATIONAL_ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <ScrollText className="mb-4 size-12 text-[#64748B]/40" />
        <h2 className="text-lg font-semibold text-[#1E293B]">Access Denied</h2>
        <p className="mt-1 text-sm text-[#64748B]">
          You do not have permission to view audit logs.
        </p>
      </div>
    );
  }

  // Export handler
  const handleExport = (format: 'excel' | 'csv') => {
    const params = new URLSearchParams();
    params.set('format', format);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    if (searchQuery) params.set('search', searchQuery);
    if (actionFilter) params.set('action', actionFilter);
    if (entityFilter) params.set('entity', entityFilter);

    const url = `/api/exports/audit-log?${params.toString()}`;
    window.open(url, '_blank');
    toast.info(`Generating audit log export (${format.toUpperCase()})...`);
  };

  // Parse JSON safely for display
  const parseJsonSafe = (jsonStr: string | null): unknown => {
    if (!jsonStr) return null;
    try {
      return JSON.parse(jsonStr);
    } catch {
      return jsonStr;
    }
  };

  // Format a timestamp string
  const formatTimestamp = (ts: string): string => {
    const d = new Date(ts);
    return d.toLocaleDateString('en-UG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // Truncate details for inline display
  const truncateDetails = (log: AuditLogEntry): string => {
    const meta = log.metadata;
    if (!meta) return '';
    try {
      const parsed = JSON.parse(meta);
      const str = JSON.stringify(parsed);
      return str.length > 80 ? str.slice(0, 80) + '...' : str;
    } catch {
      return String(meta).slice(0, 80);
    }
  };

  // Table columns
  const columns: Column<AuditLogEntry>[] = [
    {
      key: 'createdAt',
      title: 'Timestamp',
      sortable: true,
      className: 'whitespace-nowrap text-xs',
      render: (item) => formatTimestamp(item.createdAt),
    },
    {
      key: 'user',
      title: 'User',
      render: (item) => (
        <div className="min-w-[120px]">
          <div className="text-sm font-medium text-[#1E293B]">
            {item.user?.name ?? 'System'}
          </div>
          {item.user?.email && (
            <div className="text-xs text-[#64748B]">{item.user.email}</div>
          )}
        </div>
      ),
    },
    {
      key: 'action',
      title: 'Action',
      render: (item) => (
        <Badge
          variant="outline"
          className={
            ACTION_BADGE_STYLES[item.action] ??
            'bg-gray-50 text-gray-700 border-gray-200'
          }
        >
          {item.action.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      key: 'entity',
      title: 'Entity',
      render: (item) => (
        <span className="text-sm text-[#1E293B]">
          {item.entity.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      key: 'entityId',
      title: 'Entity ID',
      className: 'max-w-[120px] truncate text-xs font-mono',
      render: (item) => (
        <span title={item.entityId ?? ''} className="text-[#64748B]">
          {item.entityId ? item.entityId.slice(0, 12) + '...' : '-'}
        </span>
      ),
    },
    {
      key: 'metadata',
      title: 'Details',
      className: 'max-w-[200px] truncate text-xs',
      render: (item) => (
        <span className="text-[#64748B]" title={truncateDetails(item)}>
          {truncateDetails(item) || '-'}
        </span>
      ),
    },
    {
      key: 'ipAddress',
      title: 'IP Address',
      className: 'text-xs font-mono text-[#64748B]',
      render: (item) => item.ipAddress ?? '-',
    },
    {
      key: 'actions',
      title: '',
      className: 'w-10',
      render: (item) => (
        <Button
          variant="ghost"
          size="sm"
          className="size-8 p-0"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedLog(item);
          }}
        >
          <Eye className="size-4 text-[#64748B]" />
        </Button>
      ),
    },
  ];

  // Pagination range text
  const rangeStart = total === 0 ? 0 : (page - 1) * 20 + 1;
  const rangeEnd = Math.min(page * 20, total);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description="System activity trail with full change history"
      >
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => handleExport('csv')}
          >
            <Download className="size-3.5" />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => handleExport('excel')}
          >
            <Download className="size-3.5" />
            Excel
          </Button>
        </div>
      </PageHeader>

      {/* Filters */}
      <div className="sticky top-0 z-30 rounded-lg border border-[#E2E8F0] bg-white/95 p-4 shadow-sm backdrop-blur-sm">
        <div className="flex flex-wrap items-end gap-4">
          {/* Date range */}
          <div className="min-w-[150px] space-y-1.5">
            <Label
              htmlFor="audit-date-from"
              className="text-xs font-medium text-[#64748B]"
            >
              From
            </Label>
            <Input
              id="audit-date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div className="min-w-[150px] space-y-1.5">
            <Label
              htmlFor="audit-date-to"
              className="text-xs font-medium text-[#64748B]"
            >
              To
            </Label>
            <Input
              id="audit-date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9 text-sm"
            />
          </div>

          {/* Search */}
          <div className="min-w-[200px] space-y-1.5">
            <Label
              htmlFor="audit-search"
              className="text-xs font-medium text-[#64748B]"
            >
              Search User
            </Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-[#64748B]" />
              <Input
                id="audit-search"
                placeholder="Name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-8 text-sm"
              />
            </div>
          </div>

          {/* Action filter */}
          <div className="min-w-[160px] space-y-1.5">
            <Label className="text-xs font-medium text-[#64748B]">
              Action
            </Label>
            <Select
              value={actionFilter}
              onValueChange={(v) => setActionFilter(v === 'all' ? '' : v)}
            >
              <SelectTrigger className="h-9 w-full text-sm">
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {AUDIT_ACTIONS.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Entity filter */}
          <div className="min-w-[160px] space-y-1.5">
            <Label className="text-xs font-medium text-[#64748B]">
              Entity
            </Label>
            <Select
              value={entityFilter}
              onValueChange={(v) => setEntityFilter(v === 'all' ? '' : v)}
            >
              <SelectTrigger className="h-9 w-full text-sm">
                <SelectValue placeholder="All entities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All entities</SelectItem>
                {AUDIT_ENTITIES.map((e) => (
                  <SelectItem key={e} value={e}>
                    {e.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reset */}
          {(dateFrom || dateTo || searchQuery || actionFilter || entityFilter) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 gap-1.5 text-[#64748B] hover:text-[#1E293B]"
              onClick={() => {
                setDateFrom('');
                setDateTo('');
                setSearchQuery('');
                setActionFilter('');
                setEntityFilter('');
              }}
            >
              <X className="size-3.5" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Data table */}
      <DataTable
        columns={columns as unknown as Column<Record<string, unknown>>[]}
        data={logs as unknown as Record<string, unknown>[]}
        isLoading={isLoading}
        emptyMessage="No audit log entries found"
        emptyIcon={<ScrollText className="size-12" />}
        onRowClick={(item) =>
          setSelectedLog(item as unknown as AuditLogEntry)
        }
      />

      {/* Pagination */}
      {totalPages > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-[#E2E8F0] bg-white px-4 py-3">
          <p className="text-sm text-[#64748B]">
            Showing {rangeStart}-{rangeEnd} of {total} entries
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 gap-1"
            >
              <ChevronLeft className="size-4" />
              Previous
            </Button>
            <span className="px-2 text-sm font-medium text-[#1E293B]">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 gap-1"
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog
        open={selectedLog !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedLog(null);
        }}
      >
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span>Audit Log Detail</span>
              {selectedLog && (
                <Badge
                  variant="outline"
                  className={
                    ACTION_BADGE_STYLES[selectedLog.action] ??
                    'bg-gray-50 text-gray-700 border-gray-200'
                  }
                >
                  {selectedLog.action.replace(/_/g, ' ')}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4">
              {/* Summary fields */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="font-medium text-[#64748B]">Timestamp:</span>
                  <p className="text-[#1E293B]">
                    {formatTimestamp(selectedLog.createdAt)}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-[#64748B]">User:</span>
                  <p className="text-[#1E293B]">
                    {selectedLog.user?.name ?? 'System'}
                    {selectedLog.user?.email && (
                      <span className="ml-1 text-[#64748B]">
                        ({selectedLog.user.email})
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-[#64748B]">Entity:</span>
                  <p className="text-[#1E293B]">
                    {selectedLog.entity.replace(/_/g, ' ')}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-[#64748B]">Entity ID:</span>
                  <p className="break-all font-mono text-xs text-[#1E293B]">
                    {selectedLog.entityId ?? '-'}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-[#64748B]">IP Address:</span>
                  <p className="font-mono text-xs text-[#1E293B]">
                    {selectedLog.ipAddress ?? '-'}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-[#64748B]">User Agent:</span>
                  <p
                    className="truncate text-xs text-[#1E293B]"
                    title={selectedLog.userAgent ?? ''}
                  >
                    {selectedLog.userAgent ?? '-'}
                  </p>
                </div>
              </div>

              {/* Before snapshot */}
              {selectedLog.before && (
                <div>
                  <h4 className="mb-1 text-sm font-semibold text-[#64748B]">
                    Before
                  </h4>
                  <pre className="max-h-[200px] overflow-auto rounded-md bg-red-50 p-3 text-xs text-red-900">
                    {JSON.stringify(
                      parseJsonSafe(selectedLog.before),
                      null,
                      2,
                    )}
                  </pre>
                </div>
              )}

              {/* After snapshot */}
              {selectedLog.after && (
                <div>
                  <h4 className="mb-1 text-sm font-semibold text-[#64748B]">
                    After
                  </h4>
                  <pre className="max-h-[200px] overflow-auto rounded-md bg-green-50 p-3 text-xs text-green-900">
                    {JSON.stringify(
                      parseJsonSafe(selectedLog.after),
                      null,
                      2,
                    )}
                  </pre>
                </div>
              )}

              {/* Metadata */}
              {selectedLog.metadata && (
                <div>
                  <h4 className="mb-1 text-sm font-semibold text-[#64748B]">
                    Metadata
                  </h4>
                  <pre className="max-h-[200px] overflow-auto rounded-md bg-blue-50 p-3 text-xs text-blue-900">
                    {JSON.stringify(
                      parseJsonSafe(selectedLog.metadata),
                      null,
                      2,
                    )}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
