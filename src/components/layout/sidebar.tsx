'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  LayoutDashboard,
  Radio,
  BarChart3,
  Building2,
  ClipboardList,
  FileCheck,
  ListTodo,
  Users,
  CreditCard,
  AlertTriangle,
  Download,
  Shield,
  UserCog,
  Settings,
  LogOut,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/use-session';
import { hasPermission, isAdmin, isFinance } from '@/lib/rbac';
import { Permission } from '@/lib/rbac';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { SessionUser } from '@/types';

// ---------------------------------------------------------------------------
// Navigation configuration
// ---------------------------------------------------------------------------

interface NavItemConfig {
  label: string;
  href: string;
  icon: LucideIcon;
  /** If provided, the item is only visible when the user holds this permission. */
  permission?: string;
  /** If provided, a custom visibility check. */
  visible?: (user: SessionUser) => boolean;
}

interface NavGroupConfig {
  title: string;
  items: NavItemConfig[];
}

const NAV_GROUPS: NavGroupConfig[] = [
  {
    title: 'Dashboard',
    items: [
      {
        label: 'Overview',
        href: '/overview',
        icon: LayoutDashboard,
        permission: Permission.DASHBOARD_OVERVIEW,
      },
      {
        label: 'Live Submissions',
        href: '/live-submissions',
        icon: Radio,
        permission: Permission.DASHBOARD_LIVE_SUBMISSIONS,
      },
      {
        label: 'Assessment Analytics',
        href: '/assessment-analytics',
        icon: BarChart3,
        permission: Permission.DASHBOARD_ANALYTICS,
      },
    ],
  },
  {
    title: 'Operations',
    items: [
      {
        label: 'Facilities',
        href: '/facilities',
        icon: Building2,
        permission: Permission.FACILITIES_LIST,
      },
      {
        label: 'Visits',
        href: '/visits',
        icon: ClipboardList,
        permission: Permission.VISITS_LIST,
      },
      {
        label: 'Assessments',
        href: '/assessments',
        icon: FileCheck,
        permission: Permission.ASSESSMENTS_LIST,
      },
    ],
  },
  {
    title: 'Follow-up',
    items: [
      {
        label: 'Action Plans',
        href: '/actions',
        icon: ListTodo,
        permission: Permission.ACTIONS_LIST,
      },
    ],
  },
  {
    title: 'Registry & Payments',
    items: [
      {
        label: 'Names Registry',
        href: '/names-registry',
        icon: Users,
        permission: Permission.NAMES_LIST,
      },
      {
        label: 'Payments',
        href: '/payments',
        icon: CreditCard,
        visible: (user) => isFinance(user) || isAdmin(user),
      },
    ],
  },
  {
    title: 'Quality & Reports',
    items: [
      {
        label: 'Data Quality',
        href: '/data-quality',
        icon: AlertTriangle,
        permission: Permission.DATA_QUALITY_VIEW,
      },
      {
        label: 'Downloads',
        href: '/downloads',
        icon: Download,
        permission: Permission.EXPORTS_RAW,
      },
      {
        label: 'Audit Logs',
        href: '/audit-logs',
        icon: Shield,
        visible: (user) => isAdmin(user),
      },
    ],
  },
  {
    title: 'Administration',
    items: [
      {
        label: 'Users',
        href: '/users',
        icon: UserCog,
        visible: (user) => isAdmin(user),
      },
      {
        label: 'Settings',
        href: '/settings',
        icon: Settings,
        permission: Permission.SETTINGS_MANAGE,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Role display helpers
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
// Sidebar component
// ---------------------------------------------------------------------------

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useCurrentUser();

  if (!user) return null;

  /** Determine whether a nav item should be visible for this user. */
  function isVisible(item: NavItemConfig): boolean {
    if (!user) return false;
    if (item.visible) return item.visible(user);
    if (item.permission) return hasPermission(user, item.permission);
    return true;
  }

  /** Check if a path is active (exact or starts-with for nested routes). */
  function isActive(href: string): boolean {
    if (pathname === href) return true;
    // Match nested routes, e.g. /facilities/123 matches /facilities
    return pathname.startsWith(href + '/');
  }

  return (
    <aside
      className={cn(
        'flex h-full w-[280px] flex-col bg-[#0F4C81]',
        className,
      )}
    >
      {/* ----------------------------------------------------------------- */}
      {/* Branding                                                           */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-white/10 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 text-sm font-bold text-white">
          C
        </div>
        <div>
          <p className="text-sm font-semibold leading-none text-white">CHAI</p>
          <p className="mt-0.5 text-xs leading-none text-white/60">
            Uganda PMTCT
          </p>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Navigation                                                         */}
      {/* ----------------------------------------------------------------- */}
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-6 px-3">
          {NAV_GROUPS.map((group) => {
            const visibleItems = group.items.filter(isVisible);
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.title}>
                <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-white/40">
                  {group.title}
                </p>
                <ul className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);

                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={cn(
                            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                            active
                              ? 'bg-white/15 text-white'
                              : 'text-white/70 hover:bg-white/10 hover:text-white',
                          )}
                        >
                          <Icon className="size-4 shrink-0" />
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>
      </ScrollArea>

      {/* ----------------------------------------------------------------- */}
      {/* User footer                                                        */}
      {/* ----------------------------------------------------------------- */}
      <div className="shrink-0 border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-semibold text-white">
            {user.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">
              {user.name}
            </p>
            <Badge
              variant="secondary"
              className="mt-0.5 h-5 bg-white/15 text-[10px] text-white/80 hover:bg-white/15"
            >
              {ROLE_LABELS[user.role] ?? user.role}
            </Badge>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="mt-3 w-full justify-start gap-2 text-white/60 hover:bg-white/10 hover:text-white"
          onClick={() => signOut({ callbackUrl: '/login' })}
        >
          <LogOut className="size-4" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
