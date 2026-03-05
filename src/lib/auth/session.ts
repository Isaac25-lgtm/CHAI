import { auth } from './index';
import type { SessionUser } from '@/types';

export async function getServerSession(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user) return null;
  return session.user as SessionUser;
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await getServerSession();
  if (!user) throw new Error('Unauthorized');
  return user;
}
