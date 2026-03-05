'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Loader2,
  Save,
  Shield,
  ShieldCheck,
  UserCog,
  ClipboardList,
  Wallet,
  Eye,
  UserX,
  UserCheck,
  History,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { PageHeader } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useCurrentUser } from '@/hooks/use-session';
import { hasPermission } from '@/lib/rbac';
import { Permission } from '@/lib/rbac';
import { ROLE_LABELS, USER_STATUS_LABELS } from '@/config/constants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UserDetail {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  phone: string | null;
  title: string | null;
  organization: string | null;
  regionId: string | null;
  districtId: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  region: { id: string; name: string } | null;
  district: { id: string; name: string } | null;
}

interface AuditEntry {
  id: string;
  action: string;
  before: string | null;
  after: string | null;
  createdAt: string;
  user: { name: string } | null;
}

interface Region {
  id: string;
  name: string;
}

interface District {
  id: string;
  name: string;
  regionId: string;
}

// ---------------------------------------------------------------------------
// Role / Status badge helpers
// ---------------------------------------------------------------------------

const ROLE_BADGE_STYLES: Record<string, string> = {
  SUPER_ADMIN: 'bg-rose-100 text-rose-700 border-rose-200',
  NATIONAL_ADMIN: 'bg-blue-100 text-blue-700 border-blue-200',
  DISTRICT_SUPERVISOR: 'bg-purple-100 text-purple-700 border-purple-200',
  FIELD_ASSESSOR: 'bg-teal-100 text-teal-700 border-teal-200',
  FINANCE_OFFICER: 'bg-amber-100 text-amber-700 border-amber-200',
  VIEWER: 'bg-gray-100 text-gray-600 border-gray-200',
};

const ROLE_ICONS: Record<string, React.ReactNode> = {
  SUPER_ADMIN: <Shield className="size-3" />,
  NATIONAL_ADMIN: <ShieldCheck className="size-3" />,
  DISTRICT_SUPERVISOR: <UserCog className="size-3" />,
  FIELD_ASSESSOR: <ClipboardList className="size-3" />,
  FINANCE_OFFICER: <Wallet className="size-3" />,
  VIEWER: <Eye className="size-3" />,
};

const STATUS_BADGE_STYLES: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  INACTIVE: 'bg-gray-100 text-gray-600 border-gray-200',
  SUSPENDED: 'bg-red-100 text-red-700 border-red-200',
};

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user: currentUser } = useCurrentUser();

  // Permissions
  const canUpdate = currentUser
    ? hasPermission(currentUser, Permission.USERS_UPDATE)
    : false;
  const canManageRoles = currentUser
    ? hasPermission(currentUser, Permission.USERS_MANAGE_ROLES)
    : false;
  const canDelete = currentUser
    ? hasPermission(currentUser, Permission.USERS_DELETE)
    : false;

  // State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editOrganization, setEditOrganization] = useState('');
  const [editRegionId, setEditRegionId] = useState('');
  const [editDistrictId, setEditDistrictId] = useState('');

  // Confirmation dialogs
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [pendingRole, setPendingRole] = useState('');
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState('');

  // Fetch user
  const {
    data: userData,
    isLoading,
    error,
  } = useQuery<UserDetail>({
    queryKey: ['user', id],
    queryFn: async () => {
      const res = await fetch(`/api/users/${id}`);
      if (!res.ok) throw new Error('Failed to fetch user');
      return res.json();
    },
  });

  // Fetch audit log for this user
  const { data: auditData } = useQuery<{ data: AuditEntry[] }>({
    queryKey: ['user-audit', id],
    queryFn: async () => {
      const res = await fetch(
        `/api/audit?entity=USER&entityId=${id}&pageSize=10`,
      );
      if (!res.ok) return { data: [] };
      return res.json();
    },
    enabled: !!id,
  });

  // Fetch regions and districts for editing
  const { data: regions = [] } = useQuery<Region[]>({
    queryKey: ['regions'],
    queryFn: async () => {
      const res = await fetch('/api/regions');
      if (!res.ok) return [];
      const json = await res.json();
      return json.data ?? json;
    },
    enabled: isEditing,
  });

  const { data: districts = [] } = useQuery<District[]>({
    queryKey: ['districts', editRegionId],
    queryFn: async () => {
      const params = editRegionId ? `?regionId=${editRegionId}` : '';
      const res = await fetch(`/api/districts${params}`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.data ?? json;
    },
    enabled: isEditing,
  });

  // Populate edit form when switching to edit mode
  useEffect(() => {
    if (userData && isEditing) {
      setEditName(userData.name);
      setEditPhone(userData.phone ?? '');
      setEditOrganization(userData.organization ?? '');
      setEditRegionId(userData.regionId ?? '');
      setEditDistrictId(userData.districtId ?? '');
    }
  }, [userData, isEditing]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Failed to update user');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', id] });
      queryClient.invalidateQueries({ queryKey: ['user-audit', id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User updated successfully');
      setIsEditing(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Delete (deactivate) mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Failed to deactivate user');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User deactivated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Handlers
  const handleSaveProfile = () => {
    updateMutation.mutate({
      name: editName,
      phone: editPhone || null,
      organization: editOrganization || null,
      regionId: editRegionId || null,
      districtId: editDistrictId || null,
    });
  };

  const handleRoleChange = () => {
    if (pendingRole) {
      updateMutation.mutate({ role: pendingRole });
      setRoleDialogOpen(false);
      setPendingRole('');
    }
  };

  const handleStatusChange = () => {
    if (pendingStatus) {
      updateMutation.mutate({ status: pendingStatus });
      setStatusDialogOpen(false);
      setPendingStatus('');
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="User Details">
          <Button variant="outline" onClick={() => router.push('/users')}>
            <ArrowLeft className="mr-2 size-4" />
            Back to Users
          </Button>
        </PageHeader>
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardContent className="space-y-4 p-6">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-56" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-4 p-6">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !userData) {
    return (
      <div className="space-y-6">
        <PageHeader title="User Not Found">
          <Button variant="outline" onClick={() => router.push('/users')}>
            <ArrowLeft className="mr-2 size-4" />
            Back to Users
          </Button>
        </PageHeader>
        <Card className="border-[#E2E8F0]">
          <CardContent className="py-12 text-center">
            <p className="text-[#64748B]">
              The requested user could not be found or you do not have permission
              to view them.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const auditEntries = auditData?.data ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={userData.name}
        description={userData.email}
      >
        <Button variant="outline" onClick={() => router.push('/users')}>
          <ArrowLeft className="mr-2 size-4" />
          Back to Users
        </Button>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Profile Card */}
        <Card className="border-[#E2E8F0] lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg text-[#1E293B]">
                Profile Information
              </CardTitle>
              <CardDescription>
                {isEditing
                  ? 'Edit user profile details below'
                  : 'View and manage user profile'}
              </CardDescription>
            </div>
            {canUpdate && !isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                Edit Profile
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="editName">Full Name</Label>
                  <Input
                    id="editName"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editPhone">Phone</Label>
                  <Input
                    id="editPhone"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="0770000000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editOrg">Organization</Label>
                  <Input
                    id="editOrg"
                    value={editOrganization}
                    onChange={(e) => setEditOrganization(e.target.value)}
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Region</Label>
                  <Select
                    value={editRegionId || 'NONE'}
                    onValueChange={(v) => {
                      setEditRegionId(v === 'NONE' ? '' : v);
                      setEditDistrictId('');
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">No Region</SelectItem>
                      {regions.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>District</Label>
                  <Select
                    value={editDistrictId || 'NONE'}
                    onValueChange={(v) =>
                      setEditDistrictId(v === 'NONE' ? '' : v)
                    }
                    disabled={!editRegionId && districts.length === 0}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select district" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">No District</SelectItem>
                      {districts.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                    disabled={updateMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveProfile}
                    disabled={updateMutation.isPending}
                    className="bg-[#0F4C81] hover:bg-[#0D3F6B]"
                  >
                    {updateMutation.isPending ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 size-4" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <InfoField label="Full Name" value={userData.name} />
                <InfoField label="Email" value={userData.email} />
                <InfoField label="Phone" value={userData.phone ?? '-'} />
                <InfoField
                  label="Organization"
                  value={userData.organization ?? '-'}
                />
                <InfoField
                  label="Region"
                  value={userData.region?.name ?? '-'}
                />
                <InfoField
                  label="District"
                  value={userData.district?.name ?? '-'}
                />
                <InfoField
                  label="Created"
                  value={format(
                    new Date(userData.createdAt),
                    'dd MMM yyyy, HH:mm',
                  )}
                />
                <InfoField
                  label="Last Login"
                  value={
                    userData.lastLoginAt
                      ? format(
                          new Date(userData.lastLoginAt),
                          'dd MMM yyyy, HH:mm',
                        )
                      : 'Never'
                  }
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sidebar: Role & Status */}
        <div className="space-y-6">
          {/* Role Card */}
          <Card className="border-[#E2E8F0]">
            <CardHeader>
              <CardTitle className="text-lg text-[#1E293B]">Role</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Badge
                variant="outline"
                className={`gap-1 text-sm ${ROLE_BADGE_STYLES[userData.role] ?? ''}`}
              >
                {ROLE_ICONS[userData.role]}
                {ROLE_LABELS[userData.role] ?? userData.role}
              </Badge>

              {canManageRoles && currentUser?.id !== id && (
                <div className="space-y-2">
                  <Label className="text-xs text-[#64748B]">Change Role</Label>
                  <Select
                    value={userData.role}
                    onValueChange={(value) => {
                      if (value !== userData.role) {
                        setPendingRole(value);
                        setRoleDialogOpen(true);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ROLE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Card */}
          <Card className="border-[#E2E8F0]">
            <CardHeader>
              <CardTitle className="text-lg text-[#1E293B]">Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Badge
                variant="outline"
                className={`text-sm ${STATUS_BADGE_STYLES[userData.status] ?? ''}`}
              >
                <span
                  className={`mr-1 inline-block size-2 rounded-full ${
                    userData.status === 'ACTIVE'
                      ? 'bg-emerald-500'
                      : userData.status === 'SUSPENDED'
                        ? 'bg-red-500'
                        : 'bg-gray-400'
                  }`}
                />
                {USER_STATUS_LABELS[userData.status] ?? userData.status}
              </Badge>

              {canUpdate && currentUser?.id !== id && (
                <div className="flex gap-2">
                  {userData.status !== 'ACTIVE' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-emerald-600 hover:bg-emerald-50"
                      onClick={() => {
                        setPendingStatus('ACTIVE');
                        setStatusDialogOpen(true);
                      }}
                    >
                      <UserCheck className="mr-1 size-3.5" />
                      Activate
                    </Button>
                  )}
                  {userData.status === 'ACTIVE' && canDelete && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => {
                        setPendingStatus('INACTIVE');
                        setStatusDialogOpen(true);
                      }}
                    >
                      <UserX className="mr-1 size-3.5" />
                      Deactivate
                    </Button>
                  )}
                  {userData.status !== 'SUSPENDED' && canUpdate && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-amber-600 hover:bg-amber-50"
                      onClick={() => {
                        setPendingStatus('SUSPENDED');
                        setStatusDialogOpen(true);
                      }}
                    >
                      Suspend
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Audit History Section */}
      {auditEntries.length > 0 && (
        <Card className="border-[#E2E8F0]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-[#1E293B]">
              <History className="size-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Audit trail for changes made to this user account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {auditEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 rounded-lg border border-[#E2E8F0] p-3"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#F1F5F9]">
                    <History className="size-4 text-[#64748B]" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium text-[#1E293B]">
                      {formatAuditAction(entry.action)}
                    </p>
                    {entry.before && (
                      <p className="text-xs text-[#64748B]">
                        From: {formatAuditData(entry.before)}
                      </p>
                    )}
                    {entry.after && (
                      <p className="text-xs text-[#64748B]">
                        To: {formatAuditData(entry.after)}
                      </p>
                    )}
                    <p className="text-xs text-[#94A3B8]">
                      {entry.user?.name ?? 'System'} &middot;{' '}
                      {format(new Date(entry.createdAt), 'dd MMM yyyy, HH:mm')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Role Change Confirmation Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Role Change</DialogTitle>
            <DialogDescription>
              Are you sure you want to change this user&apos;s role from{' '}
              <strong>{ROLE_LABELS[userData.role] ?? userData.role}</strong> to{' '}
              <strong>{ROLE_LABELS[pendingRole] ?? pendingRole}</strong>? This
              will affect their permissions and access level.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRoleDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRoleChange}
              disabled={updateMutation.isPending}
              className="bg-[#0F4C81] hover:bg-[#0D3F6B]"
            >
              {updateMutation.isPending && (
                <Loader2 className="mr-2 size-4 animate-spin" />
              )}
              Confirm Change
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Change Confirmation Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Confirm Status Change
            </DialogTitle>
            <DialogDescription>
              {pendingStatus === 'INACTIVE'
                ? 'This will deactivate the user account. They will no longer be able to log in.'
                : pendingStatus === 'SUSPENDED'
                  ? 'This will suspend the user account. They will be temporarily unable to access the system.'
                  : 'This will reactivate the user account. They will regain access to the system.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setStatusDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleStatusChange}
              disabled={updateMutation.isPending}
              variant={
                pendingStatus === 'ACTIVE' ? 'default' : 'destructive'
              }
              className={
                pendingStatus === 'ACTIVE'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : undefined
              }
            >
              {updateMutation.isPending && (
                <Loader2 className="mr-2 size-4 animate-spin" />
              )}
              {pendingStatus === 'ACTIVE'
                ? 'Activate'
                : pendingStatus === 'SUSPENDED'
                  ? 'Suspend'
                  : 'Deactivate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper Components
// ---------------------------------------------------------------------------

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wider text-[#94A3B8]">
        {label}
      </p>
      <p className="text-sm text-[#1E293B]">{value}</p>
    </div>
  );
}

function formatAuditAction(action: string): string {
  const labels: Record<string, string> = {
    CREATE: 'Account Created',
    UPDATE: 'Profile Updated',
    ROLE_CHANGE: 'Role Changed',
    STATUS_CHANGE: 'Status Changed',
    DELETE: 'Account Deactivated',
    LOGIN: 'Logged In',
    LOGOUT: 'Logged Out',
  };
  return labels[action] ?? action;
}

function formatAuditData(jsonStr: string): string {
  try {
    const data = JSON.parse(jsonStr);
    return Object.entries(data)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
  } catch {
    return jsonStr;
  }
}
