'use client';

import { useSession } from 'next-auth/react';
import type { SessionUser } from '@/types';

interface UseCurrentUserReturn {
  user: SessionUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useCurrentUser(): UseCurrentUserReturn {
  const { data: session, status } = useSession();

  return {
    user: (session?.user as SessionUser) ?? null,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
  };
}
