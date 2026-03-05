'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Calendar,
  Building2,
  MapPin,
  Users,
  Edit,
  Send,
  ClipboardCheck,
  Eye,
  Loader2,
  Phone,
  User,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  Target,
} from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentUser } from '@/hooks/use-session';
import { hasPermission, Permission } from '@/lib/rbac';
import { ATTENDANCE_LABELS, TEAM_TYPES } from '@/config/constants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Participant {
  id: string;
  fullName: string;
  role: string | null;
  cadre: string | null;
  teamType: string;
  organization: string | null;
  phone: string | null;
  attendanceStatus: string;
  remarks: string | null;
}

interface DomainScore {
  sectionId: string;
  percentage: number | null;
  colorStatus: string;
  section: { title: string; sectionNumber: number };
}

interface Assessment {
  id: string;
  status: string;
  completionPct: number;
  submittedAt: string | null;
  domainScores: DomainScore[];
}

interface ActionPlan {
  id: string;
  actionItem: string;
  priority: string;
  status: string;
  dueDate: string | null;
  assignedTo: { name: string } | null;
}

interface VisitDetail {
  id: string;
  visitNumber: string;
  facilityId: string;
  facility: {
    id: string;
    name: string;
    code: string | null;
    level: string;
    districtId: string;
    district: {
      id: string;
      name: string;
      region: { id: string; name: string };
    };
  };
  status: string;
  visitDate: string;
  activityName: string | null;
  mentorshipCycle: string | null;
  reportingPeriod: string | null;
  facilityInCharge: string | null;
  inChargePhone: string | null;
  notes: string | null;
  createdBy: { id: string; name: string; email: string };
  submittedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  participants: Participant[];
  assessments: Assessment[];
  actionPlans: ActionPlan[];
  visitSummary: {
    overallStatus: string;
    redCount: number;
    yellowCount: number;
    lightGreenCount: number;
    darkGreenCount: number;
    totalScored: number;
    completionPct: number;
  } | null;
}

// ---------------------------------------------------------------------------
// Badge configs
// ---------------------------------------------------------------------------

const visitStatusStyles: Record<string, { bg: string; text: string; label: string }> = {
  DRAFT: { bg: 'bg-gray-100 border-gray-200', text: 'text-gray-700', label: 'Draft' },
  SUBMITTED: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', label: 'Submitted' },
  REVIEWED: { bg: 'bg-green-50 border-green-200', text: 'text-green-700', label: 'Reviewed' },
  ARCHIVED: { bg: 'bg-slate-50 border-slate-200', text: 'text-slate-500', label: 'Archived' },
};

const attendanceStyles: Record<string, string> = {
  PRESENT: 'bg-green-50 text-green-700 border-green-200',
  PARTIAL: 'bg-amber-50 text-amber-700 border-amber-200',
  ABSENT: 'bg-red-50 text-red-700 border-red-200',
};

const priorityStyles: Record<string, string> = {
  CRITICAL: 'bg-red-50 text-red-700 border-red-200',
  HIGH: 'bg-orange-50 text-orange-700 border-orange-200',
  MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
  LOW: 'bg-blue-50 text-blue-700 border-blue-200',
};

const actionStatusStyles: Record<string, string> = {
  OPEN: 'bg-blue-50 text-blue-700 border-blue-200',
  IN_PROGRESS: 'bg-amber-50 text-amber-700 border-amber-200',
  COMPLETED: 'bg-green-50 text-green-700 border-green-200',
  OVERDUE: 'bg-red-50 text-red-700 border-red-200',
  CANCELLED: 'bg-gray-50 text-gray-500 border-gray-200',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function VisitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();

  const canEdit = user ? hasPermission(user, Permission.VISITS_UPDATE) : false;
  const canSubmit = user ? hasPermission(user, Permission.VISITS_SUBMIT) : false;
  const canAssess = user ? hasPermission(user, Permission.ASSESSMENTS_CREATE) : false;

  // Fetch visit
  const {
    data: visit,
    isLoading,
    isError,
  } = useQuery<VisitDetail>({
    queryKey: ['visit', id],
    queryFn: async () => {
      const res = await fetch(`/api/visits/${id}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error('Visit not found');
        throw new Error('Failed to fetch visit');
      }
      return res.json();
    },
  });

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/visits/${id}/submit`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to submit');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Visit submitted successfully');
      queryClient.invalidateQueries({ queryKey: ['visit', id] });
    },
    onError: (error: Error) => {
      toast.error('Failed to submit visit', { description: error.message });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (isError || !visit) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="mb-4 size-12 text-red-400" />
        <h2 className="text-lg font-semibold text-[#1E293B]">Visit not found</h2>
        <p className="mt-1 text-sm text-[#64748B]">
          The visit you are looking for does not exist or you do not have access.
        </p>
        <Button
          variant="outline"
          className="mt-4 gap-1.5"
          onClick={() => router.push('/visits')}
        >
          <ArrowLeft className="size-4" />
          Back to Visits
        </Button>
      </div>
    );
  }

  const statusConfig = visitStatusStyles[visit.status] ?? visitStatusStyles.DRAFT;
  const isDraft = visit.status === 'DRAFT';
  const latestAssessment = visit.assessments[0] ?? null;
  const centralTeam = visit.participants.filter((p) => p.teamType === 'CENTRAL');
  const facilityTeam = visit.participants.filter((p) => p.teamType === 'FACILITY');
  const otherTeam = visit.participants.filter(
    (p) => !['CENTRAL', 'FACILITY'].includes(p.teamType),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader title={visit.visitNumber}>
        <Button
          variant="outline"
          onClick={() => router.push('/visits')}
          className="gap-1.5"
        >
          <ArrowLeft className="size-4" />
          <span className="hidden sm:inline">Back</span>
        </Button>
      </PageHeader>

      {/* Visit Header Card */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-lg font-bold text-[#0F4C81]">
                  {visit.visitNumber}
                </span>
                <Badge
                  variant="outline"
                  className={`text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}
                >
                  {statusConfig.label}
                </Badge>
              </div>

              <div className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="size-4 text-[#94A3B8]" />
                  <span className="font-medium text-[#1E293B]">{visit.facility.name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="size-4 text-[#94A3B8]" />
                  <span className="text-[#64748B]">
                    {visit.facility.district.name}, {visit.facility.district.region.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="size-4 text-[#94A3B8]" />
                  <span className="text-[#64748B]">
                    {new Date(visit.visitDate).toLocaleDateString('en-UG', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="size-4 text-[#94A3B8]" />
                  <span className="text-[#64748B]">{visit.participants.length} participants</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <User className="size-4 text-[#94A3B8]" />
                  <span className="text-[#64748B]">Created by {visit.createdBy.name}</span>
                </div>
                {visit.facilityInCharge && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="size-4 text-[#94A3B8]" />
                    <span className="text-[#64748B]">
                      In-charge: {visit.facilityInCharge}
                      {visit.inChargePhone && ` (${visit.inChargePhone})`}
                    </span>
                  </div>
                )}
              </div>

              {(visit.activityName || visit.mentorshipCycle || visit.reportingPeriod) && (
                <div className="flex flex-wrap gap-2">
                  {visit.activityName && (
                    <Badge variant="outline" className="bg-[#F8FAFC] text-xs">
                      {visit.activityName}
                    </Badge>
                  )}
                  {visit.mentorshipCycle && (
                    <Badge variant="outline" className="bg-[#F8FAFC] text-xs">
                      {visit.mentorshipCycle}
                    </Badge>
                  )}
                  {visit.reportingPeriod && (
                    <Badge variant="outline" className="bg-[#F8FAFC] text-xs">
                      {visit.reportingPeriod}
                    </Badge>
                  )}
                </div>
              )}

              {visit.notes && (
                <div className="flex items-start gap-2 rounded-md bg-[#F8FAFC] px-3 py-2">
                  <FileText className="mt-0.5 size-3.5 text-[#94A3B8]" />
                  <p className="text-xs text-[#64748B]">{visit.notes}</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex shrink-0 flex-wrap gap-2">
              {isDraft && canEdit && (
                <Button
                  variant="outline"
                  onClick={() => router.push(`/visits/${id}/edit`)}
                  className="gap-1.5"
                >
                  <Edit className="size-4" />
                  Edit
                </Button>
              )}
              {isDraft && canSubmit && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      className="gap-1.5 bg-[#0F4C81] hover:bg-[#0D3F6B]"
                      disabled={visit.participants.length === 0}
                    >
                      <Send className="size-4" />
                      Submit
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Submit Visit?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will submit visit {visit.visitNumber} for review.
                        You will not be able to edit the visit details after submission.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => submitMutation.mutate()}
                        className="bg-[#0F4C81] hover:bg-[#0D3F6B]"
                        disabled={submitMutation.isPending}
                      >
                        {submitMutation.isPending ? (
                          <Loader2 className="mr-1.5 size-4 animate-spin" />
                        ) : (
                          <Send className="mr-1.5 size-4" />
                        )}
                        Submit
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              {!latestAssessment && canAssess && visit.status !== 'DRAFT' && (
                <Button
                  onClick={() => router.push(`/assessments/new?visitId=${id}`)}
                  className="gap-1.5 bg-[#0F4C81] hover:bg-[#0D3F6B]"
                >
                  <ClipboardCheck className="size-4" />
                  Start Assessment
                </Button>
              )}
              {!latestAssessment && isDraft && (
                <div className="flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-700">
                  <AlertCircle className="size-3.5" />
                  Submit visit to start assessment
                </div>
              )}
              {latestAssessment && (
                <Button
                  variant="outline"
                  onClick={() => router.push(`/assessments/${latestAssessment.id}`)}
                  className="gap-1.5"
                >
                  <Eye className="size-4" />
                  View Assessment
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assessment Summary (if exists) */}
      {latestAssessment && latestAssessment.status !== 'DRAFT' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-[#1E293B]">Assessment Summary</CardTitle>
              <Badge
                variant="outline"
                className={
                  latestAssessment.status === 'SUBMITTED'
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                }
              >
                {latestAssessment.status === 'SUBMITTED' ? 'Completed' : latestAssessment.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {visit.visitSummary && (
              <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                <div className="rounded-lg bg-red-50 p-3 text-center">
                  <p className="text-xl font-bold text-red-700">{visit.visitSummary.redCount}</p>
                  <p className="text-xs text-red-600">Red</p>
                </div>
                <div className="rounded-lg bg-amber-50 p-3 text-center">
                  <p className="text-xl font-bold text-amber-700">{visit.visitSummary.yellowCount}</p>
                  <p className="text-xs text-amber-600">Yellow</p>
                </div>
                <div className="rounded-lg bg-emerald-50 p-3 text-center">
                  <p className="text-xl font-bold text-emerald-700">{visit.visitSummary.lightGreenCount}</p>
                  <p className="text-xs text-emerald-600">Light Green</p>
                </div>
                <div className="rounded-lg bg-green-50 p-3 text-center">
                  <p className="text-xl font-bold text-green-700">{visit.visitSummary.darkGreenCount}</p>
                  <p className="text-xs text-green-600">Dark Green</p>
                </div>
                <div className="rounded-lg bg-[#F8FAFC] p-3 text-center">
                  <p className="text-xl font-bold text-[#1E293B]">
                    {Math.round(visit.visitSummary.completionPct)}%
                  </p>
                  <p className="text-xs text-[#64748B]">Complete</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Participants */}
      <div className="space-y-4">
        {/* Central Team */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-[#1E293B]">Central Team</CardTitle>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                {centralTeam.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {centralTeam.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#F8FAFC]">
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden sm:table-cell">Role</TableHead>
                      <TableHead className="hidden md:table-cell">Organization</TableHead>
                      <TableHead className="hidden lg:table-cell">Phone</TableHead>
                      <TableHead>Attendance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {centralTeam.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="font-medium text-[#1E293B]">{p.fullName}</div>
                          <div className="text-xs text-[#64748B] sm:hidden">
                            {p.role || p.organization || ''}
                          </div>
                        </TableCell>
                        <TableCell className="hidden text-sm text-[#64748B] sm:table-cell">
                          {p.role || '--'}
                        </TableCell>
                        <TableCell className="hidden text-sm text-[#64748B] md:table-cell">
                          {p.organization || '--'}
                        </TableCell>
                        <TableCell className="hidden text-sm text-[#64748B] lg:table-cell">
                          {p.phone || '--'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${attendanceStyles[p.attendanceStatus] || ''}`}
                          >
                            {ATTENDANCE_LABELS[p.attendanceStatus] || p.attendanceStatus}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="px-4 py-6 text-center text-sm text-[#94A3B8]">
                No central team participants recorded.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Facility Team */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-[#1E293B]">Facility Team</CardTitle>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                {facilityTeam.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {facilityTeam.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#F8FAFC]">
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden sm:table-cell">Role</TableHead>
                      <TableHead className="hidden md:table-cell">Organization</TableHead>
                      <TableHead className="hidden lg:table-cell">Phone</TableHead>
                      <TableHead>Attendance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {facilityTeam.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="font-medium text-[#1E293B]">{p.fullName}</div>
                          <div className="text-xs text-[#64748B] sm:hidden">
                            {p.role || p.organization || ''}
                          </div>
                        </TableCell>
                        <TableCell className="hidden text-sm text-[#64748B] sm:table-cell">
                          {p.role || '--'}
                        </TableCell>
                        <TableCell className="hidden text-sm text-[#64748B] md:table-cell">
                          {p.organization || '--'}
                        </TableCell>
                        <TableCell className="hidden text-sm text-[#64748B] lg:table-cell">
                          {p.phone || '--'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${attendanceStyles[p.attendanceStatus] || ''}`}
                          >
                            {ATTENDANCE_LABELS[p.attendanceStatus] || p.attendanceStatus}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="px-4 py-6 text-center text-sm text-[#94A3B8]">
                No facility team participants recorded.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Other Team (if any) */}
        {otherTeam.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-[#1E293B]">Other Participants</CardTitle>
                <Badge variant="outline" className="bg-[#F8FAFC] text-[#64748B]">
                  {otherTeam.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#F8FAFC]">
                      <TableHead>Name</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead className="hidden sm:table-cell">Role</TableHead>
                      <TableHead>Attendance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {otherTeam.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium text-[#1E293B]">{p.fullName}</TableCell>
                        <TableCell className="text-sm text-[#64748B]">
                          {TEAM_TYPES[p.teamType] || p.teamType}
                        </TableCell>
                        <TableCell className="hidden text-sm text-[#64748B] sm:table-cell">
                          {p.role || '--'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${attendanceStyles[p.attendanceStatus] || ''}`}
                          >
                            {ATTENDANCE_LABELS[p.attendanceStatus] || p.attendanceStatus}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Action Plans */}
      {visit.actionPlans.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-[#1E293B]">Linked Action Plans</CardTitle>
              <Badge variant="outline">{visit.actionPlans.length}</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F8FAFC]">
                    <TableHead>Action Item</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Assigned To</TableHead>
                    <TableHead className="hidden md:table-cell">Due Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visit.actionPlans.map((ap) => (
                    <TableRow key={ap.id} className="cursor-pointer hover:bg-[#F8FAFC]">
                      <TableCell>
                        <div className="max-w-xs truncate text-sm font-medium text-[#1E293B]">
                          {ap.actionItem}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${priorityStyles[ap.priority] || ''}`}
                        >
                          {ap.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${actionStatusStyles[ap.status] || ''}`}
                        >
                          {ap.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden text-sm text-[#64748B] sm:table-cell">
                        {ap.assignedTo?.name || '--'}
                      </TableCell>
                      <TableCell className="hidden text-sm text-[#64748B] md:table-cell">
                        {ap.dueDate
                          ? new Date(ap.dueDate).toLocaleDateString('en-UG', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '--'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
