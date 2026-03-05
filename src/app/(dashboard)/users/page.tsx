'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  Plus,
  Search,
  Shield,
  ShieldCheck,
  UserCog,
  ClipboardList,
  Wallet,
  Eye,
} from 'lucide-react';
import { format } from 'date-fns';

import { PageHeader, DataTable, EmptyState, TableSkeleton } from '@/components/common';
import type { Column } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { useCurrentUser } from '@/hooks/use-session';
import { hasPermission } from '@/lib/rbac';
import { Permission } from '@/lib/rbac';
import { ROLE_LABELS, USER_STATUS_LABELS } from '@/config/constants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  phone: string | null;
  organization: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  region: { id: string; name: string } | null;
  district: { id: string; name: string } | null;
  [key: string]: unknown;
}

interface UsersResponse {
  data: UserRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
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

function RoleBadge({ role }: { role: string }) {
  return (
    <Badge
      variant="outline"
      className={`gap-1 ${ROLE_BADGE_STYLES[role] ?? 'bg-gray-100 text-gray-600'}`}
    >
      {ROLE_ICONS[role]}
      {ROLE_LABELS[role] ?? role}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={STATUS_BADGE_STYLES[status] ?? 'bg-gray-100 text-gray-600'}
    >
      <span
        className={`mr-1 inline-block size-1.5 rounded-full ${
          status === 'ACTIVE'
            ? 'bg-emerald-500'
            : status === 'SUSPENDED'
              ? 'bg-red-500'
              : 'bg-gray-400'
        }`}
      />
      {USER_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function UsersPage() {
  const router = useRouter();
  const { user: currentUser } = useCurrentUser();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const canCreate = currentUser ? hasPermission(currentUser, Permission.USERS_CREATE) : false;

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      // Simple debounce using setTimeout
      const timeout = setTimeout(() => {
        setDebouncedSearch(value);
        setPage(1);
      }, 400);
      return () => clearTimeout(timeout);
    },
    [],
  );

  // Fetch users
  const { data, isLoading } = useQuery<UsersResponse>({
    queryKey: ['users', debouncedSearch, roleFilter, statusFilter, page, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (roleFilter) params.set('role', roleFilter);
      if (statusFilter) params.set('status', statusFilter);
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));

      const res = await fetch(`/api/users?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    },
  });

  const users = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  // Table columns
  const columns: Column<UserRecord>[] = [
    {
      key: 'name',
      title: 'Name',
      sortable: true,
      render: (item) => (
        <div>
          <p className="font-medium text-[#1E293B]">{item.name}</p>
          <p className="text-xs text-[#64748B]">{item.email}</p>
        </div>
      ),
    },
    {
      key: 'role',
      title: 'Role',
      sortable: true,
      render: (item) => <RoleBadge role={item.role} />,
    },
    {
      key: 'district',
      title: 'District',
      render: (item) => (
        <div className="text-sm">
          <p className="text-[#1E293B]">{item.district?.name ?? '-'}</p>
          {item.region && (
            <p className="text-xs text-[#64748B]">{item.region.name}</p>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      render: (item) => <StatusBadge status={item.status} />,
    },
    {
      key: 'lastLoginAt',
      title: 'Last Login',
      sortable: true,
      render: (item) => (
        <span className="text-sm text-[#64748B]">
          {item.lastLoginAt
            ? format(new Date(item.lastLoginAt), 'dd MMM yyyy, HH:mm')
            : 'Never'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="User Management"
        description="Manage system users, roles, and access permissions"
      >
        {canCreate && (
          <Button
            onClick={() => router.push('/users/new')}
            className="bg-[#0F4C81] hover:bg-[#0D3F6B]"
          >
            <Plus className="mr-2 size-4" />
            Add User
          </Button>
        )}
      </PageHeader>

      {/* Filters */}
      <Card className="border-[#E2E8F0]">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#64748B]" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Role filter */}
            <Select
              value={roleFilter}
              onValueChange={(value) => {
                setRoleFilter(value === 'ALL' ? '' : value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Roles</SelectItem>
                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status filter */}
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value === 'ALL' ? '' : value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                {Object.entries(USER_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results info */}
      {!isLoading && (
        <p className="text-sm text-[#64748B]">
          {total} user{total !== 1 ? 's' : ''} found
        </p>
      )}

      {/* Table */}
      {isLoading ? (
        <TableSkeleton rows={8} columns={5} />
      ) : users.length === 0 ? (
        <Card className="border-[#E2E8F0]">
          <EmptyState
            icon={<Users className="size-8" />}
            title="No users found"
            description={
              search || roleFilter || statusFilter
                ? 'Try adjusting your filters to find what you are looking for.'
                : 'Get started by adding the first user to the system.'
            }
            action={
              canCreate && !search && !roleFilter && !statusFilter ? (
                <Button
                  onClick={() => router.push('/users/new')}
                  className="bg-[#0F4C81] hover:bg-[#0D3F6B]"
                >
                  <Plus className="mr-2 size-4" />
                  Add User
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <DataTable
          columns={columns}
          data={users}
          onRowClick={(item) => router.push(`/users/${item.id}`)}
          keyField="id"
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[#64748B]">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
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
