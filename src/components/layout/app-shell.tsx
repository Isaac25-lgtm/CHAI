'use client';

import { useState, useCallback } from 'react';

import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet';

// ---------------------------------------------------------------------------
// AppShell — combines sidebar, topbar, and main content area
// ---------------------------------------------------------------------------

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleMobile = useCallback(() => {
    setMobileOpen((prev) => !prev);
  }, []);

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
  }, []);

  return (
    <div className="flex h-dvh overflow-hidden bg-[#F8FAFC]">
      {/* -------------------------------------------------------------- */}
      {/* Desktop sidebar                                                  */}
      {/* -------------------------------------------------------------- */}
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      {/* -------------------------------------------------------------- */}
      {/* Mobile sidebar (sheet)                                           */}
      {/* -------------------------------------------------------------- */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="w-[280px] p-0 [&>button]:hidden"
          showCloseButton={false}
        >
          <SheetTitle className="sr-only">Navigation menu</SheetTitle>
          <div onClick={closeMobile}>
            <Sidebar />
          </div>
        </SheetContent>
      </Sheet>

      {/* -------------------------------------------------------------- */}
      {/* Main area                                                        */}
      {/* -------------------------------------------------------------- */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar onMenuToggle={toggleMobile} />

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
