'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Building2,
  Calendar,
  Edit,
  MapPin,
  Phone,
  Mail,
  User,
  Activity,
  ClipboardList,
  AlertTriangle,
} from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { StatusBadge, type ColorStatus } from '@/components/common/status-badge';
import { EmptyState } from '@/components/common/empty-state';
import { KPICardSkeleton } from '@/components/common/loading-skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentUser } from '@/hooks/use-session';
import { hasPermission, Permission } from '@/lib/rbac';
import {
  FACILITY_LEVELS,
  OWNERSHIP_TYPES,
  ACTION_STATUS_LABELS,
  ACTION_PRIORITY_LABELS,
} from '@/config/constants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FacilityDetail {
  id: string;
  name: string;
  code: string | null;
  level: string;
  ownership: string;
  districtId: string;
  districtName: string;
  regionId: string;
  regionName: string;
  subcounty: string | null;
  parish: string | null;
  village: string | null;
  implementingPartner: string | null;
  inChargeName: string | null;
  inChargePhone: string | null;
  inChargeEmail: string | null;
  latitude: number | null;
  longitude: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FacilityStats {
  totalVisits: number;
  lastVisitDate: string | null;
  latestOverallStatus: ColorStatus | null;
}

interface RecentVisit {
  id: string;
  visitNumber: string;
  visitDate: string;
  status: string;
  overallStatus: ColorStatus | null;
  completionPct: number | null;
  assessorName: string;
  assessorId: string;
}

interface ActionPlanItem {
  id: string;
  actionItem: string;
  priority: string;
  status: string;
  dueDate: string | null;
  findingColor: ColorStatus | null;
  domainTitle: string | null;
  assignedToName: string | null;
  visitNumber: string;
  visitDate: string;
  createdAt: string;
}

interface FacilityDetailResponse {
  facility: FacilityDetail;
  stats: FacilityStats;
  recentVisits: RecentVisit[];
  actionPlans: ActionPlanItem[];
}

// ---------------------------------------------------------------------------
// Badge styles
// ---------------------------------------------------------------------------

const levelBadgeStyles: Record<string, string> = {
  HC_II: 'bg-slate-100 text-slate-700 border-slate-200',
  HC_III: 'bg-blue-50 text-blue-700 border-blue-200',
  HC_IV: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  GENERAL_HOSPITAL: 'bg-purple-50 text-purple-700 border-purple-200',
  REGIONAL_REFERRAL: 'bg-amber-50 text-amber-700 border-amber-200',
  NATIONAL_REFERRAL: 'bg-rose-50 text-rose-700 border-rose-200',
};

const priorityBadgeStyles: Record<string, string> = {
  CRITICAL: 'bg-red-50 text-red-700 border-red-200',
  HIGH: 'bg-orange-50 text-orange-700 border-orange-200',
  MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
  LOW: 'bg-slate-100 text-slate-600 border-slate-200',
};

const actionStatusStyles: Record<string, string> = {
  OPEN: 'bg-blue-50 text-blue-700 border-blue-200',
  IN_PROGRESS: 'bg-amber-50 text-amber-700 border-amber-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  OVERDUE: 'bg-red-50 text-red-700 border-red-200',
  CANCELLED: 'bg-gray-50 text-gray-500 border-gray-200',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FacilityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useCurrentUser();

  const canEdit = user ? hasPermission(user, Permission.FACILITIES_UPDATE) : false;

  const {
    data,
    isLoading,
    isError,
  } = useQuery<FacilityDetailResponse>({
    queryKey: ['facility', id],
    queryFn: async () => {
      const res = await fetch(`/api/facilities/${id}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error('Facility not found');
        throw new Error('Failed to fetch facility');
      }
      return res.json();
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <KPICardSkeleton />
          <KPICardSkeleton />
          <KPICardSkeleton />
        </div>
        <Skeleton className="h-[400px] w-full rounded-lg" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/facilities')}
          className="gap-2 text-[#64748B]"
        >
          <ArrowLeft className="size-4" />
          Back to Facilities
        </Button>
        <EmptyState
          icon={<Building2 className="size-8" />}
          title="Facility not found"
          description="The facility you are looking for does not exist or you do not have permission to view it."
          action={
            <Button
              variant="outline"
              onClick={() => router.push('/facilities')}
            >
              Go to Facilities
            </Button>
          }
        />
      </div>
    );
  }

  const { facility, stats, recentVisits, actionPlans } = data;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '--';
    return new Date(dateStr).toLocaleDateString('en-UG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Back button and header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/facilities')}
          className="text-[#64748B] hover:text-[#1E293B]"
        >
          <ArrowLeft className="size-5" />
        </Button>
        <PageHeader
          title={facility.name}
          description={`${facility.districtName} District, ${facility.regionName} Region`}
        >
          {canEdit && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => router.push(`/facilities/${id}?action=edit`)}
            >
              <Edit className="size-4" />
              Edit Facility
            </Button>
          )}
        </PageHeader>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Total Visits */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wider text-[#64748B]">
                  Total Visits
                </p>
                <p className="text-3xl font-bold text-[#1E293B]">
                  {stats.totalVisits}
                </p>
              </div>
              <div className="rounded-lg bg-[#0F4C81]/10 p-3">
                <Activity className="size-5 text-[#0F4C81]" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Last Visit */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wider text-[#64748B]">
                  Last Visit
                </p>
                <p className="text-lg font-semibold text-[#1E293B]">
                  {formatDate(stats.lastVisitDate)}
                </p>
              </div>
              <div className="rounded-lg bg-[#0F4C81]/10 p-3">
                <Calendar className="size-5 text-[#0F4C81]" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Latest Overall Status */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wider text-[#64748B]">
                  Latest Status
                </p>
                <div className="pt-1">
                  {stats.latestOverallStatus ? (
                    <StatusBadge
                      status={stats.latestOverallStatus}
                      size="lg"
                      showDot
                    />
                  ) : (
                    <span className="text-sm text-[#94A3B8]">Not assessed</span>
                  )}
                </div>
              </div>
              <div className="rounded-lg bg-[#0F4C81]/10 p-3">
                <ClipboardList className="size-5 text-[#0F4C81]" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Content */}
      <Tabs defaultValue="details" className="space-y-4">
        <TabsList className="bg-[#F8FAFC]">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="visits">
            Recent Visits ({recentVisits.length})
          </TabsTrigger>
          <TabsTrigger value="actions">
            Action Plans ({actionPlans.length})
          </TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Facility Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="size-4 text-[#0F4C81]" />
                  Facility Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <DetailRow label="Facility Code" value={facility.code} />
                <DetailRow
                  label="Level"
                  value={
                    <Badge
                      variant="outline"
                      className={`text-xs font-medium ${levelBadgeStyles[facility.level] ?? ''}`}
                    >
                      {FACILITY_LEVELS[facility.level] ?? facility.level}
                    </Badge>
                  }
                />
                <DetailRow
                  label="Ownership"
                  value={OWNERSHIP_TYPES[facility.ownership] ?? facility.ownership}
                />
                <DetailRow label="District" value={facility.districtName} />
                <DetailRow label="Region" value={facility.regionName} />
                <DetailRow label="Sub-county" value={facility.subcounty} />
                <DetailRow label="Parish" value={facility.parish} />
                <DetailRow label="Village" value={facility.village} />
                <DetailRow
                  label="Implementing Partner"
                  value={facility.implementingPartner}
                />
                <DetailRow
                  label="Status"
                  value={
                    <Badge
                      variant="outline"
                      className={
                        facility.isActive
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 text-xs'
                          : 'border-gray-200 bg-gray-50 text-gray-500 text-xs'
                      }
                    >
                      {facility.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  }
                />
              </CardContent>
            </Card>

            {/* In-Charge & Location */}
            <div className="space-y-4">
              {/* In-Charge Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <User className="size-4 text-[#0F4C81]" />
                    In-Charge Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <DetailRow
                    label="Name"
                    value={facility.inChargeName}
                    icon={<User className="size-3.5 text-[#94A3B8]" />}
                  />
                  <DetailRow
                    label="Phone"
                    value={
                      facility.inChargePhone ? (
                        <a
                          href={`tel:${facility.inChargePhone}`}
                          className="text-[#0F4C81] hover:underline"
                        >
                          {facility.inChargePhone}
                        </a>
                      ) : null
                    }
                    icon={<Phone className="size-3.5 text-[#94A3B8]" />}
                  />
                  <DetailRow
                    label="Email"
                    value={
                      facility.inChargeEmail ? (
                        <a
                          href={`mailto:${facility.inChargeEmail}`}
                          className="text-[#0F4C81] hover:underline"
                        >
                          {facility.inChargeEmail}
                        </a>
                      ) : null
                    }
                    icon={<Mail className="size-3.5 text-[#94A3B8]" />}
                  />
                </CardContent>
              </Card>

              {/* GPS / Location Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MapPin className="size-4 text-[#0F4C81]" />
                    GPS Coordinates
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {facility.latitude != null && facility.longitude != null ? (
                    <div className="space-y-2">
                      <div className="flex gap-6 text-sm">
                        <span>
                          <span className="text-[#64748B]">Lat: </span>
                          <span className="font-medium">{facility.latitude.toFixed(6)}</span>
                        </span>
                        <span>
                          <span className="text-[#64748B]">Lng: </span>
                          <span className="font-medium">{facility.longitude.toFixed(6)}</span>
                        </span>
                      </div>
                      <a
                        href={`https://www.google.com/maps?q=${facility.latitude},${facility.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-[#0F4C81] hover:underline"
                      >
                        <MapPin className="size-3.5" />
                        View on Google Maps
                      </a>
                    </div>
                  ) : (
                    <p className="text-sm text-[#94A3B8]">
                      No GPS coordinates recorded
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Recent Visits Tab */}
        <TabsContent value="visits">
          {recentVisits.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="size-8" />}
              title="No visits recorded"
              description="This facility has not been assessed yet."
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Recent Visits (Last 10)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="rounded-b-lg border-t border-[#E2E8F0]">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#F8FAFC]">
                        <TableHead>Visit #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Overall</TableHead>
                        <TableHead>Completion</TableHead>
                        <TableHead>Assessor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentVisits.map((visit) => (
                        <TableRow
                          key={visit.id}
                          className="cursor-pointer hover:bg-[#0F4C81]/5"
                          onClick={() => router.push(`/visits/${visit.id}`)}
                        >
                          <TableCell className="font-medium text-[#0F4C81]">
                            {visit.visitNumber}
                          </TableCell>
                          <TableCell>{formatDate(visit.visitDate)}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                visit.status === 'SUBMITTED'
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 text-xs'
                                  : visit.status === 'DRAFT'
                                    ? 'border-amber-200 bg-amber-50 text-amber-700 text-xs'
                                    : visit.status === 'REVIEWED'
                                      ? 'border-blue-200 bg-blue-50 text-blue-700 text-xs'
                                      : 'border-gray-200 bg-gray-50 text-gray-500 text-xs'
                              }
                            >
                              {visit.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {visit.overallStatus ? (
                              <StatusBadge
                                status={visit.overallStatus}
                                size="sm"
                                showDot
                              />
                            ) : (
                              <span className="text-xs text-[#94A3B8]">--</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {visit.completionPct != null ? (
                              <span className="text-sm">
                                {Math.round(visit.completionPct)}%
                              </span>
                            ) : (
                              <span className="text-xs text-[#94A3B8]">--</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-[#64748B]">
                            {visit.assessorName}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Action Plans Tab */}
        <TabsContent value="actions">
          {actionPlans.length === 0 ? (
            <EmptyState
              icon={<AlertTriangle className="size-8" />}
              title="No action plans"
              description="No action plans have been created for this facility yet."
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Action Plans ({actionPlans.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="rounded-b-lg border-t border-[#E2E8F0]">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#F8FAFC]">
                        <TableHead className="min-w-[250px]">Action Item</TableHead>
                        <TableHead>Domain</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Assigned To</TableHead>
                        <TableHead>Visit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {actionPlans.map((action) => (
                        <TableRow key={action.id}>
                          <TableCell>
                            <div className="flex items-start gap-2">
                              {action.findingColor && (
                                <StatusBadge
                                  status={action.findingColor}
                                  size="sm"
                                />
                              )}
                              <span className="text-sm text-[#1E293B]">
                                {action.actionItem}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-[#64748B]">
                            {action.domainTitle ?? '--'}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-xs font-medium ${priorityBadgeStyles[action.priority] ?? ''}`}
                            >
                              {ACTION_PRIORITY_LABELS[action.priority] ?? action.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-xs font-medium ${actionStatusStyles[action.status] ?? ''}`}
                            >
                              {ACTION_STATUS_LABELS[action.status] ?? action.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-[#64748B]">
                            {formatDate(action.dueDate)}
                          </TableCell>
                          <TableCell className="text-sm text-[#64748B]">
                            {action.assignedToName ?? '--'}
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-[#0F4C81]">
                              {action.visitNumber}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper component
// ---------------------------------------------------------------------------

function DetailRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#F1F5F9] pb-3 last:border-b-0 last:pb-0">
      <div className="flex items-center gap-2 text-sm text-[#64748B]">
        {icon}
        {label}
      </div>
      <div className="text-right text-sm font-medium text-[#1E293B]">
        {value ?? <span className="font-normal text-[#94A3B8]">--</span>}
      </div>
    </div>
  );
}
