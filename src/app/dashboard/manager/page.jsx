import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { apiGetDashboard, apiGetActivityLog, apiGetUsers } from '@/lib/api';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { MissedCheckinAlert } from '@/components/dashboard/missed-checkin-alert';
import { AssignTaskForm } from '@/components/dashboard/assign-task-form';
import { TeamWall } from '@/components/dashboard/team-wall';
import { DailyFeed } from '@/components/dashboard/daily-feed';
import { getDayName } from '@/lib/utils';

export const metadata = {
  title: 'Manager Dashboard — Daily Pulse',
};

export default async function ManagerDashboardPage() {
  const session = await getSession();
  if (!session) redirect('/');
  if (session.role !== 'manager' && session.role !== 'admin') redirect('/');

  const [dashResult, logsResult, usersResult] = await Promise.all([
    apiGetDashboard({ teamId: session.teamId }),
    apiGetActivityLog({}),
    apiGetUsers({ activeOnly: true }),
  ]);

  const dashboard = dashResult.success ? dashResult.dashboard : null;
  const logs = logsResult.success ? logsResult.logs : [];
  const allUsers = usersResult.success ? usersResult.users : [];

  if (!dashboard) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-500 text-sm">Failed to load dashboard data</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-zinc-50">Dashboard</h1>
            <p className="text-sm text-zinc-500">{getDayName()}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-zinc-400">{session.name}</p>
            <p className="text-xs text-zinc-650">Manager</p>
          </div>
        </div>

        {/* KPI Strip — Row 1 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard label="Total Members" value={dashboard.totalMembers} />
          <KpiCard label="Checked In" value={dashboard.checkedIn} color="green" />
          <KpiCard label="Not Checked In" value={dashboard.notCheckedIn} color="red" />
          <KpiCard
            label="Completion Rate"
            value={`${dashboard.completionRate}%`}
          />
        </div>

        {/* KPI Strip — Row 2 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard label="Completed" value={dashboard.completed} color="green" />
          <KpiCard label="Pending" value={dashboard.pending} />
          <KpiCard label="Blocked" value={dashboard.blocked} color="red" />
          <KpiCard label="Delayed" value={dashboard.delayed} color="yellow" />
        </div>

        {/* Missed Check-in Alert */}
        <MissedCheckinAlert users={dashboard.notCheckedInList} />

        {/* Assign Task Form */}
        <AssignTaskForm members={dashboard.members} managerId={session.userId} />

        {/* Team Wall */}
        <TeamWall members={dashboard.members} />

        {/* Daily Feed */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <DailyFeed logs={logs} users={allUsers} />
        </div>
      </div>
    </div>
  );
}
