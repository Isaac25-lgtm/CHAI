import type { NextAuthConfig } from 'next-auth';
import type { SessionUser } from '@/types';

declare module 'next-auth' {
  interface Session {
    user: SessionUser;
  }

  interface User {
    role: string;
    regionId: string | null;
    districtId: string | null;
  }
}

/**
 * Auth config shared between middleware (Edge) and server (Node).
 * Does NOT import db or bcrypt — those are added in the full config.
 */
export const authConfig: NextAuthConfig = {
  providers: [], // Populated in the full config
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
        token.regionId = user.regionId;
        token.districtId = user.districtId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = (token.role as string) as SessionUser['role'];
        session.user.regionId = (token.regionId ?? null) as string | null;
        session.user.districtId = (token.districtId ?? null) as string | null;
      }
      return session;
    },
  },
};
