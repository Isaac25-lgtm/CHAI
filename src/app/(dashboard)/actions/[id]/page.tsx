'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  Building2,
  MapPin,
  User,
  FileText,
  Clock,
  CheckCircle2,
  PlayCircle,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { PageHeader } from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { ActionStatus, ActionPriority, ColorStatus } from '@/types';

// ---------------------------------------------------------------------------
// Badge configs
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

const findingColorConfig: Record<ColorStatus, { label: string; className: string }> = {
  RED: { label: 'Red', className: 'bg-red-50 text-red-700 border-red-200' },
  YELLOW: { label: 'Yellow', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  LIGHT_GREEN: { label: 'Light Green', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  DARK_GREEN: { label: 'Dark Green', className: 'bg-green-50 text-green-700 border-green-200' },
  NOT_SCORED: { label: 'Not Scored', className: 'bg-gray-50 text-gray-500 border-gray-200' },
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ActionDetail {
  id: string;
  visitId: string;
  actionItem: string;
  priority: ActionPriority;
  status: ActionStatus;
  sectionNumber: number | null;
  domainTitle: string | null;
  findingColor: ColorStatus | null;
  findingSummary: string | null;
  progressNotes: string | null;
  dueDate: string | null;
  completedAt: string | null;
  evidenceUrl: string | null;
  ownerOrg: string | null;
  isOverdue: boolean;
  createdAt: string;
  updatedAt: string;
  visit: {
    visitNumber: string;
    visitDate: string;
    facility: {
      name: string;
      district: {
        name: string;
        region: { name: string };
      };
    };
    createdBy: { id: string; name: string; email: string };
  };
  assignedTo: { id: string; name: string; email: string; role: string; organization: string | null } | null;
  createdBy: { id: string; name: string; email: string; role: string };
  statusHistory: {
    id: string;
    action: string;
    before: string | null;
    after: string | null;
    createdAt: string;
    user: { id: string; name: string } | null;
  }[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ActionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [action, setAction] = useState<ActionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [editingDueDate, setEditingDueDate] = useState(false);
  const [dueDateValue, setDueDateValue] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchAction = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/actions/${id}`);
      if (!res.ok) {
        if (res.status === 404) { setError('Action plan not found'); return; }
        throw new Error('Failed to fetch');
      }
      const data = await res.json();
      setAction(data);
      setNotesValue(data.progressNotes ?? '');
      setDueDateValue(data.dueDate ? new Date(data.dueDate).toISOString().split('T')[0] : '');
    } catch {
      setError('Failed to load action plan details');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAction();
  }, [fetchAction]);

  const updateAction = async (updates: Record<string, unknown>) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/actions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Update failed');
      }
      await fetchAction();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setUpdating(false);
    }
  };

  const handleStatusChange = (newStatus: ActionStatus) => {
    updateAction({ status: newStatus });
  };

  const handleSaveNotes = () => {
    updateAction({ progressNotes: notesValue || null });
    setEditingNotes(false);
  };

  const handleSaveDueDate = () => {
    updateAction({ dueDate: dueDateValue || null });
    setEditingDueDate(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Skeleton className="h-48" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (error && !action) {
    return (
      <div className="space-y-6">
        <PageHeader title="Action Plan">
          <Link href="/actions">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="size-4" />
              Back to Actions
            </Button>
          </Link>
        </PageHeader>
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="mx-auto mb-4 size-12 text-red-500" />
            <p className="text-lg font-medium text-[#1E293B]">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!action) return null;

  const displayStatus = action.isOverdue && ['OPEN', 'IN_PROGRESS'].includes(action.status)
    ? 'OVERDUE' as ActionStatus
    : action.status;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader title="Action Plan Detail">
        <Link href="/actions">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="size-4" />
            Back to Actions
          </Button>
        </Link>
      </PageHeader>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Action Item Card */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <CardTitle className="text-lg text-[#1E293B]">{action.actionItem}</CardTitle>
                <div className="flex shrink-0 gap-2">
                  <Badge variant="outline" className={cn('font-medium', priorityConfig[action.priority].className)}>
                    {priorityConfig[action.priority].label}
                  </Badge>
                  <Badge variant="outline" className={cn('font-medium', statusConfig[displayStatus].className)}>
                    {statusConfig[displayStatus].label}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status Actions */}
              <div className="flex flex-wrap gap-2">
                {action.status === 'OPEN' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-amber-700 border-amber-200 hover:bg-amber-50"
                    onClick={() => handleStatusChange('IN_PROGRESS')}
                    disabled={updating}
                  >
                    <PlayCircle className="size-4" />
                    Mark In Progress
                  </Button>
                )}
                {(action.status === 'OPEN' || action.status === 'IN_PROGRESS') && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-green-700 border-green-200 hover:bg-green-50"
                    onClick={() => handleStatusChange('COMPLETED')}
                    disabled={updating}
                  >
                    <CheckCircle2 className="size-4" />
                    Mark Completed
                  </Button>
                )}
                {action.status === 'COMPLETED' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-blue-700 border-blue-200 hover:bg-blue-50"
                    onClick={() => handleStatusChange('OPEN')}
                    disabled={updating}
                  >
                    <Clock className="size-4" />
                    Reopen
                  </Button>
                )}
                {action.status !== 'CANCELLED' && action.status !== 'COMPLETED' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-gray-500 border-gray-200 hover:bg-gray-50"
                    onClick={() => handleStatusChange('CANCELLED')}
                    disabled={updating}
                  >
                    <XCircle className="size-4" />
                    Cancel
                  </Button>
                )}
              </div>

              {/* Completion info */}
              {action.completedAt && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                  Completed on {new Date(action.completedAt).toLocaleDateString('en-UG', {
                    day: '2-digit', month: 'long', year: 'numeric',
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Finding Context */}
          {(action.sectionNumber || action.findingColor || action.findingSummary) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Finding Context</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-4 text-sm">
                  {action.sectionNumber && (
                    <div>
                      <span className="text-[#64748B]">Section: </span>
                      <span className="font-medium text-[#1E293B]">
                        {action.sectionNumber}{action.domainTitle ? ` - ${action.domainTitle}` : ''}
                      </span>
                    </div>
                  )}
                  {action.findingColor && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#64748B]">Finding: </span>
                      <Badge variant="outline" className={cn('font-medium', findingColorConfig[action.findingColor].className)}>
                        {findingColorConfig[action.findingColor].label}
                      </Badge>
                    </div>
                  )}
                </div>
                {action.findingSummary && (
                  <p className="text-sm text-[#475569]">{action.findingSummary}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Progress Notes */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Progress Notes</CardTitle>
                {!editingNotes && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingNotes(true)}
                  >
                    Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {editingNotes ? (
                <div className="space-y-3">
                  <Textarea
                    value={notesValue}
                    onChange={(e) => setNotesValue(e.target.value)}
                    rows={4}
                    placeholder="Add progress notes..."
                    maxLength={1000}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveNotes} disabled={updating}>
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setNotesValue(action.progressNotes ?? '');
                        setEditingNotes(false);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="whitespace-pre-wrap text-sm text-[#475569]">
                  {action.progressNotes || 'No progress notes yet.'}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Status History */}
          {action.statusHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Activity History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {action.statusHistory.map((entry) => {
                    let beforeParsed: Record<string, unknown> = {};
                    let afterParsed: Record<string, unknown> = {};
                    try { if (entry.before) beforeParsed = JSON.parse(entry.before); } catch { /* ignore */ }
                    try { if (entry.after) afterParsed = JSON.parse(entry.after); } catch { /* ignore */ }

                    const statusBefore = beforeParsed.status as string | undefined;
                    const statusAfter = afterParsed.status as string | undefined;

                    return (
                      <div key={entry.id} className="flex gap-3 border-b border-[#E2E8F0] pb-3 last:border-0 last:pb-0">
                        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-[#F1F5F9]">
                          <Clock className="size-4 text-[#64748B]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-[#1E293B]">
                            {entry.action === 'CREATE' ? 'Created' :
                             entry.action === 'STATUS_CHANGE' && statusBefore && statusAfter
                               ? `Status changed: ${statusBefore} -> ${statusAfter}`
                               : 'Updated'}
                          </p>
                          <p className="text-xs text-[#64748B]">
                            by {entry.user?.name ?? 'System'} on{' '}
                            {new Date(entry.createdAt).toLocaleString('en-UG', {
                              day: '2-digit', month: 'short', year: 'numeric',
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Visit & Facility Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Linked Visit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <FileText className="mt-0.5 size-4 shrink-0 text-[#64748B]" />
                <div>
                  <Link
                    href={`/visits/${action.visitId}`}
                    className="font-medium text-[#0F4C81] hover:underline"
                  >
                    {action.visit.visitNumber}
                  </Link>
                  <p className="text-xs text-[#64748B]">
                    {new Date(action.visit.visitDate).toLocaleDateString('en-UG', {
                      day: '2-digit', month: 'long', year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Building2 className="mt-0.5 size-4 shrink-0 text-[#64748B]" />
                <span className="text-[#1E293B]">{action.visit.facility.name}</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-[#64748B]" />
                <span className="text-[#1E293B]">
                  {action.visit.facility.district.name}, {action.visit.facility.district.region.name}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Assigned To */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Assigned To</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {action.assignedTo ? (
                <div className="flex items-start gap-2">
                  <User className="mt-0.5 size-4 shrink-0 text-[#64748B]" />
                  <div>
                    <p className="font-medium text-[#1E293B]">{action.assignedTo.name}</p>
                    <p className="text-xs text-[#64748B]">{action.assignedTo.email}</p>
                    {action.assignedTo.organization && (
                      <p className="text-xs text-[#64748B]">{action.assignedTo.organization}</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-[#64748B]">Unassigned</p>
              )}
              {action.ownerOrg && (
                <div className="mt-3 flex items-start gap-2">
                  <Building2 className="mt-0.5 size-4 shrink-0 text-[#64748B]" />
                  <div>
                    <p className="text-xs text-[#64748B]">Owner Organization</p>
                    <p className="font-medium text-[#1E293B]">{action.ownerOrg}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Due Date */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Due Date</CardTitle>
                {!editingDueDate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingDueDate(true)}
                  >
                    Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {editingDueDate ? (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-[#64748B]">Due Date</Label>
                    <Input
                      type="date"
                      value={dueDateValue}
                      onChange={(e) => setDueDateValue(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveDueDate} disabled={updating}>
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setDueDateValue(action.dueDate ? new Date(action.dueDate).toISOString().split('T')[0] : '');
                        setEditingDueDate(false);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 text-sm">
                  <Calendar className="mt-0.5 size-4 shrink-0 text-[#64748B]" />
                  {action.dueDate ? (
                    <span className={cn(action.isOverdue && 'font-semibold text-red-600')}>
                      {new Date(action.dueDate).toLocaleDateString('en-UG', {
                        day: '2-digit', month: 'long', year: 'numeric',
                      })}
                      {action.isOverdue && ' (Overdue)'}
                    </span>
                  ) : (
                    <span className="text-[#64748B]">No due date set</span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Created By / Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-[#64748B]">Created By</p>
                <p className="font-medium text-[#1E293B]">{action.createdBy.name}</p>
              </div>
              <div>
                <p className="text-xs text-[#64748B]">Created</p>
                <p className="text-[#1E293B]">
                  {new Date(action.createdAt).toLocaleDateString('en-UG', {
                    day: '2-digit', month: 'long', year: 'numeric',
                  })}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#64748B]">Last Updated</p>
                <p className="text-[#1E293B]">
                  {new Date(action.updatedAt).toLocaleDateString('en-UG', {
                    day: '2-digit', month: 'long', year: 'numeric',
                  })}
                </p>
              </div>
              {action.evidenceUrl && (
                <div>
                  <p className="text-xs text-[#64748B]">Evidence</p>
                  <a
                    href={action.evidenceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#0F4C81] hover:underline"
                  >
                    View evidence
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
