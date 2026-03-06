'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ColorStatus } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VisitOption {
  id: string;
  visitNumber: string;
  facilityName: string;
  districtName: string;
  visitDate: string;
}

interface UserOption {
  id: string;
  name: string;
  email: string;
}

const findingColorConfig: Record<ColorStatus, { label: string; className: string }> = {
  RED: { label: 'Red', className: 'bg-red-50 text-red-700 border-red-200' },
  YELLOW: { label: 'Yellow', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  LIGHT_GREEN: { label: 'Light Green', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  DARK_GREEN: { label: 'Dark Green', className: 'bg-green-50 text-green-700 border-green-200' },
  NOT_SCORED: { label: 'Not Scored', className: 'bg-gray-50 text-gray-500 border-gray-200' },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NewActionPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="size-6 animate-spin text-slate-400" /></div>}>
      <NewActionPageInner />
    </Suspense>
  );
}

function NewActionPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Pre-populated from query params (when linked from assessment)
  const preVisitId = searchParams.get('visitId') ?? '';
  const preSectionNumber = searchParams.get('sectionNumber') ?? '';
  const preFindingColor = searchParams.get('findingColor') ?? '';
  const preFindingSummary = searchParams.get('findingSummary') ?? '';

  const [form, setForm] = useState({
    actionItem: '',
    visitId: preVisitId,
    sectionNumber: preSectionNumber,
    domainTitle: '',
    findingColor: preFindingColor,
    findingSummary: preFindingSummary,
    priority: 'MEDIUM',
    assignedToId: '',
    ownerOrg: '',
    dueDate: '',
    progressNotes: '',
  });

  const [visits, setVisits] = useState<VisitOption[]>([]);
  const [visitSearch, setVisitSearch] = useState('');
  const [users, setUsers] = useState<UserOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Fetch visits for select
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('pageSize', '50');
    if (visitSearch) params.set('search', visitSearch);

    fetch(`/api/visits?${params.toString()}`)
      .then((r) => r.json())
      .then((res) => {
        const list = (res.data ?? []).map((v: Record<string, unknown>) => ({
          id: v.id,
          visitNumber: v.visitNumber,
          facilityName: v.facilityName,
          districtName: v.districtName,
          visitDate: v.visitDate,
        }));
        setVisits(list);
      })
      .catch(() => {});
  }, [visitSearch]);

  // Fetch users for assignment
  useEffect(() => {
    fetch('/api/users?pageSize=100&status=ACTIVE')
      .then((r) => r.json())
      .then((res) => {
        const list = (res.data ?? []).map((u: Record<string, unknown>) => ({
          id: u.id,
          name: u.name,
          email: u.email,
        }));
        setUsers(list);
      })
      .catch(() => {});
  }, []);

  // Section options
  const sectionOptions = Array.from({ length: 16 }, (_, i) => ({
    value: String(i + 1),
    label: `Section ${i + 1}`,
  }));

  const updateForm = (key: string, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    setGeneralError(null);

    try {
      const body: Record<string, unknown> = {
        actionItem: form.actionItem,
        visitId: form.visitId,
        priority: form.priority,
      };

      if (form.sectionNumber) body.sectionNumber = parseInt(form.sectionNumber, 10);
      if (form.domainTitle) body.domainTitle = form.domainTitle;
      if (form.findingColor) body.findingColor = form.findingColor;
      if (form.findingSummary) body.findingSummary = form.findingSummary;
      if (form.assignedToId) body.assignedToId = form.assignedToId;
      if (form.ownerOrg) body.ownerOrg = form.ownerOrg;
      if (form.dueDate) body.dueDate = form.dueDate;
      if (form.progressNotes) body.progressNotes = form.progressNotes;

      const res = await fetch('/api/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        if (err.details) {
          setErrors(err.details);
        } else {
          setGeneralError(err.error || 'Failed to create action plan');
        }
        return;
      }

      const created = await res.json();
      router.push(`/actions/${created.id}`);
    } catch {
      setGeneralError('An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedVisit = visits.find((v) => v.id === form.visitId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Action Plan"
        description="Create a new follow-up action from an assessment finding"
      >
        <Link href="/actions">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="size-4" />
            Back to Actions
          </Button>
        </Link>
      </PageHeader>

      {generalError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {generalError}
        </div>
      )}

      {/* Pre-populated finding context */}
      {(preFindingColor || preFindingSummary) && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 text-sm">
              <span className="font-medium text-amber-800">Linked Finding:</span>
              {preFindingColor && (
                <Badge
                  variant="outline"
                  className={cn(
                    'font-medium',
                    findingColorConfig[preFindingColor as ColorStatus]?.className
                  )}
                >
                  {findingColorConfig[preFindingColor as ColorStatus]?.label ?? preFindingColor}
                </Badge>
              )}
              {preSectionNumber && (
                <span className="text-amber-700">Section {preSectionNumber}</span>
              )}
            </div>
            {preFindingSummary && (
              <p className="mt-1.5 text-sm text-amber-800">{preFindingSummary}</p>
            )}
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left column */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Action Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Action Item */}
              <div className="space-y-1.5">
                <Label htmlFor="actionItem" className="text-sm font-medium">
                  Action Item <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="actionItem"
                  value={form.actionItem}
                  onChange={(e) => updateForm('actionItem', e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Describe the action to be taken..."
                  required
                />
                {errors.actionItem && (
                  <p className="text-xs text-red-500">{errors.actionItem[0]}</p>
                )}
              </div>

              {/* Visit Select */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  Visit <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={form.visitId}
                  onValueChange={(v) => updateForm('visitId', v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select visit..." />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="p-2">
                      <Input
                        placeholder="Search visits..."
                        value={visitSearch}
                        onChange={(e) => setVisitSearch(e.target.value)}
                        className="h-8"
                      />
                    </div>
                    {visits.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.visitNumber} - {v.facilityName} ({v.districtName})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedVisit && (
                  <p className="text-xs text-[#64748B]">
                    {selectedVisit.facilityName} | {selectedVisit.districtName} |{' '}
                    {new Date(selectedVisit.visitDate).toLocaleDateString('en-UG')}
                  </p>
                )}
                {errors.visitId && (
                  <p className="text-xs text-red-500">{errors.visitId[0]}</p>
                )}
              </div>

              {/* Priority */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  Priority <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => updateForm('priority', v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Due Date */}
              <div className="space-y-1.5">
                <Label htmlFor="dueDate" className="text-sm font-medium">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => updateForm('dueDate', e.target.value)}
                  className="h-9"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="progressNotes" className="text-sm font-medium">Initial Notes</Label>
                <Textarea
                  id="progressNotes"
                  value={form.progressNotes}
                  onChange={(e) => updateForm('progressNotes', e.target.value)}
                  rows={2}
                  maxLength={1000}
                  placeholder="Optional initial notes..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Right column */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Assessment Context & Assignment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Section */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Section</Label>
                <Select
                  value={form.sectionNumber}
                  onValueChange={(v) => updateForm('sectionNumber', v === 'none' ? '' : v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select section..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No section</SelectItem>
                    {sectionOptions.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Domain Title */}
              <div className="space-y-1.5">
                <Label htmlFor="domainTitle" className="text-sm font-medium">Domain Title</Label>
                <Input
                  id="domainTitle"
                  value={form.domainTitle}
                  onChange={(e) => updateForm('domainTitle', e.target.value)}
                  placeholder="e.g., ANC Attendance"
                />
              </div>

              {/* Finding Color */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Finding Color</Label>
                <Select
                  value={form.findingColor}
                  onValueChange={(v) => updateForm('findingColor', v === 'none' ? '' : v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select color..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No color</SelectItem>
                    <SelectItem value="RED">Red</SelectItem>
                    <SelectItem value="YELLOW">Yellow</SelectItem>
                    <SelectItem value="LIGHT_GREEN">Light Green</SelectItem>
                    <SelectItem value="DARK_GREEN">Dark Green</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Finding Summary */}
              <div className="space-y-1.5">
                <Label htmlFor="findingSummary" className="text-sm font-medium">Finding Summary</Label>
                <Textarea
                  id="findingSummary"
                  value={form.findingSummary}
                  onChange={(e) => updateForm('findingSummary', e.target.value)}
                  rows={2}
                  maxLength={1000}
                  placeholder="Brief summary of the finding..."
                />
              </div>

              {/* Assigned To */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Assign To</Label>
                <Select
                  value={form.assignedToId}
                  onValueChange={(v) => updateForm('assignedToId', v === 'none' ? '' : v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select user..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Owner Org */}
              <div className="space-y-1.5">
                <Label htmlFor="ownerOrg" className="text-sm font-medium">Owner Organization</Label>
                <Input
                  id="ownerOrg"
                  value={form.ownerOrg}
                  onChange={(e) => updateForm('ownerOrg', e.target.value)}
                  placeholder="e.g., District Health Office"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Submit */}
        <div className="mt-6 flex justify-end gap-3">
          <Link href="/actions">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button
            type="submit"
            className="gap-2 bg-[#0F4C81] hover:bg-[#0F4C81]/90"
            disabled={submitting}
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Create Action Plan
          </Button>
        </div>
      </form>
    </div>
  );
}
