'use client';

import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Menu, ChevronDown, LogOut, UserCog } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/use-session';
import { isAdmin } from '@/lib/rbac';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

// ---------------------------------------------------------------------------
// Role display labels
// ---------------------------------------------------------------------------

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  NATIONAL_ADMIN: 'National Admin',
  DISTRICT_SUPERVISOR: 'District Supervisor',
  FIELD_ASSESSOR: 'Field Assessor',
  FINANCE_OFFICER: 'Finance Officer',
  VIEWER: 'Viewer',
};

// ---------------------------------------------------------------------------
// Topbar component
// ---------------------------------------------------------------------------

interface TopbarProps {
  onMenuToggle: () => void;
  className?: string;
}

export function Topbar({ onMenuToggle, className }: TopbarProps) {
  const { user } = useCurrentUser();
  const router = useRouter();

  const initials = user
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '';

  return (
    <header
      className={cn(
        'flex h-16 shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-4 sm:px-6',
        className,
      )}
    >
      {/* Mobile menu toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 lg:hidden"
        onClick={onMenuToggle}
        aria-label="Toggle navigation menu"
      >
        <Menu className="size-5" />
      </Button>

      {/* Breadcrumb / context area */}
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-900">
          CHAI PMTCT Mentorship System
        </p>
      </div>

      {/* User dropdown */}
      {user && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 rounded-full px-2 py-1.5 hover:bg-slate-100"
            >
              <Avatar size="sm">
                <AvatarFallback className="bg-[#0F4C81] text-[10px] text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium text-slate-700 sm:inline-block">
                {user.name}
              </span>
              <ChevronDown className="hidden size-4 text-slate-400 sm:block" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
                <p className="text-xs text-muted-foreground">
                  {ROLE_LABELS[user.role] ?? user.role}
                </p>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              {isAdmin(user) && (
                <DropdownMenuItem onClick={() => router.push('/users')}>
                  <UserCog className="mr-2 size-4" />
                  Manage Users
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: '/login' })}
            >
              <LogOut className="mr-2 size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </header>
  );
}
