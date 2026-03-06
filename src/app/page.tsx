import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/login');
  }

  const role = session.user.role;

  // Assessors go to the field wizard
  if (role === 'FIELD_ASSESSOR') {
    redirect('/field');
  }

  // Superusers and all others go to admin dashboard
  redirect('/overview');
}
