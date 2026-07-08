import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { apiGetUsers, apiGetTeams, apiGetDashboard, apiGetActivityLog } from '@/lib/api';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { DailyFeed } from '@/components/dashboard/daily-feed';
import { AdminView } from './admin-view';

export const metadata = {
  title: 'Admin Panel — Daily Pulse',
};

export default async function AdminDashboardPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.role !== 'admin') redirect('/dashboard');

  const [usersRes, teamsRes, dashRes, logsRes] = await Promise.all([
    apiGetUsers({}),
    apiGetTeams(),
    apiGetDashboard({}), // no teamId → org-wide totals
    apiGetActivityLog({}),
  ]);

  const users = usersRes.success ? usersRes.users || [] : [];
  const teams = teamsRes.success ? teamsRes.teams || [] : [];
  const dashboard = dashRes.success ? dashRes.dashboard : null;
  const logs = logsRes.success ? logsRes.logs || [] : [];

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

        {/* Org-wide Dashboard */}
        {dashboard && (
          <div id="dashboard" className="space-y-3 scroll-mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Dashboard</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KpiCard label="Total Members" value={dashboard.totalMembers} />
              <KpiCard label="Checked In" value={dashboard.checkedIn} color="green" />
              <KpiCard label="Completion Rate" value={`${dashboard.completionRate}%`} />
              <KpiCard label="Blocked" value={dashboard.blocked} color="red" />
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <DailyFeed logs={logs} users={users} />
            </div>
          </div>
        )}

        {/* Interactive Admin Panel */}
        <AdminView initialUsers={users} initialTeams={teams} />
      </div>
    </div>
  );
}
