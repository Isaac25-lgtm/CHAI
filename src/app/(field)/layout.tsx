'use client';

import { signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-session';

export default function FieldLayout({ children }: { children: React.ReactNode }) {
  const { user } = useCurrentUser();

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50">
      {/* Minimal top bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0F4C81] text-xs font-bold text-white">
            C
          </div>
          <span className="text-sm font-semibold text-slate-900">CHAI PMTCT</span>
        </div>
        <div className="flex items-center gap-3">
          {user && (
            <span className="hidden text-xs text-slate-500 sm:inline">
              {user.name}
            </span>
          )}
          <button
            onClick={() => signOut({ callbackUrl: '/auth/login' })}
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            <LogOut className="size-3.5" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        <div className="mx-auto max-w-lg px-4 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
