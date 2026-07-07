import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

export default async function DashboardRedirect() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const role = session.role;
  if (role === 'admin') redirect('/dashboard/admin');
  if (role === 'manager') redirect('/dashboard/manager');
  redirect('/dashboard/employee');
}
