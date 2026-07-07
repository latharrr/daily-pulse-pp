import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { DashboardShell } from './dashboard-shell';

export default async function DashboardLayout({ children }) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const sessionData = {
    userId: session.userId,
    username: session.username,
    name: session.name,
    role: session.role,
    teamId: session.teamId,
  };

  return <DashboardShell session={sessionData}>{children}</DashboardShell>;
}
