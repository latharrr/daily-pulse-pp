import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { apiGetUsers, apiGetTeams } from '@/lib/api';
import { AdminView } from './admin-view';

export const metadata = {
  title: 'Admin Panel — Daily Pulse',
};

export default async function AdminDashboardPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.role !== 'admin') redirect('/dashboard');

  const [usersRes, teamsRes] = await Promise.all([
    apiGetUsers({}),
    apiGetTeams(),
  ]);

  const users = usersRes.success ? usersRes.users : [];
  const teams = teamsRes.success ? teamsRes.teams : [];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 pb-12">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-zinc-50">Admin Control Panel</h1>
            <p className="text-xs text-zinc-500">Manage your organization&apos;s users and teams</p>
          </div>
          <span className="text-xs bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-zinc-400">
            System Admin
          </span>
        </div>

        {/* Interactive Admin Panel */}
        <AdminView initialUsers={users} initialTeams={teams} />
      </div>
    </div>
  );
}
