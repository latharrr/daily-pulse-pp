import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { apiGetUsers, apiGetTasks, apiGetCheckins, apiGetCheckouts, apiGetActivityLog } from '@/lib/api';
import { getToday, formatTime, formatRelativeTime } from '@/lib/utils';
import { LIVE_STATUS_CONFIG, TASK_STATUS_LABELS, TASK_STATUS_COLORS } from '@/lib/constants';

export async function generateMetadata({ params }) {
  const { id } = await params;
  const result = await apiGetUsers({});
  const user = result.success ? result.users.find(u => u.UserID === id) : null;
  return {
    title: user ? `${user.Name} — Daily Pulse` : 'Employee — Daily Pulse',
  };
}

export default async function EmployeeDetailPage({ params }) {
  const session = await getSession();
  if (!session) redirect('/');
  if (session.role !== 'manager' && session.role !== 'admin') redirect('/');

  const { id } = await params;
  const today = getToday();

  const [usersResult, tasksResult, checkinsResult, checkoutsResult, logsResult] = await Promise.all([
    apiGetUsers({}),
    apiGetTasks({ userId: id }),
    apiGetCheckins({ userId: id }),
    apiGetCheckouts({ userId: id }),
    apiGetActivityLog({ userId: id }),
  ]);

  const allUsers = usersResult.success ? usersResult.users : [];
  const employee = allUsers.find(u => u.UserID === id);

  if (!employee) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-500 text-sm">Employee not found</p>
      </div>
    );
  }

  const allTasks = tasksResult.success ? tasksResult.tasks : [];
  const todayTasks = allTasks.filter(t => t.Date === today);
  const checkins = checkinsResult.success ? checkinsResult.checkins : [];
  const checkouts = checkoutsResult.success ? checkoutsResult.checkouts : [];
  const logs = logsResult.success ? logsResult.logs : [];

  const todayCheckin = checkins.find(c => c.Date === today);
  const todayCheckout = checkouts.find(c => c.Date === today);
  const todayLogs = logs.filter(l => l.Timestamp.startsWith(today));

  const statusConfig = LIVE_STATUS_CONFIG[employee.LiveStatus] || LIVE_STATUS_CONFIG.offline;

  // Group historical data by date
  const dateSet = new Set();
  allTasks.forEach(t => dateSet.add(t.Date));
  checkins.forEach(c => dateSet.add(c.Date));
  checkouts.forEach(c => dateSet.add(c.Date));
  const dates = [...dateSet].sort((a, b) => b.localeCompare(a)).slice(0, 7);

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Back button */}
        <Link
          href="/dashboard/manager"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors duration-150"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
            <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to dashboard
        </Link>

        {/* Employee Header */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-sm font-medium text-zinc-300">
                {employee.Name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-lg font-semibold text-zinc-50">{employee.Name}</h1>
                <p className="text-sm text-zinc-500">
                  {employee.Role} · @{employee.Username}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <span>{statusConfig.emoji}</span>
              <span className="text-zinc-400">{statusConfig.label}</span>
            </div>
          </div>

          {/* Checkin/Checkout status */}
          <div className="flex gap-4 mt-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${todayCheckin ? 'bg-green-500' : 'bg-zinc-600'}`} />
              <span className="text-zinc-400">
                Check-in: {todayCheckin ? formatTime(todayCheckin.SubmittedAt) : 'Not yet'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${todayCheckout ? 'bg-green-500' : 'bg-zinc-600'}`} />
              <span className="text-zinc-400">
                Check-out: {todayCheckout ? formatTime(todayCheckout.SubmittedAt) : 'Not yet'}
              </span>
            </div>
          </div>
        </div>

        {/* Today's Tasks */}
        <div>
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">
            Today&apos;s Tasks
            <span className="text-zinc-600 ml-2">({todayTasks.length})</span>
          </h2>
          {todayTasks.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <p className="text-sm text-zinc-600">No tasks for today</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayTasks.map((task) => {
                const statusLabel = TASK_STATUS_LABELS[task.Status] || task.Status;
                const statusColor = TASK_STATUS_COLORS[task.Status] || '#a1a1aa';
                return (
                  <div
                    key={task.TaskID}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-50 truncate">{task.Title}</p>
                        {task.Notes && (
                          <p className="text-xs text-zinc-500 mt-0.5 truncate">{task.Notes}</p>
                        )}
                      </div>
                      <span
                        className="text-xs px-2 py-0.5 rounded shrink-0 ml-3"
                        style={{
                          color: statusColor,
                          backgroundColor: `${statusColor}15`,
                        }}
                      >
                        {statusLabel}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-150"
                          style={{
                            width: `${task.Progress}%`,
                            backgroundColor: statusColor,
                          }}
                        />
                      </div>
                      <span className="text-xs text-zinc-500 shrink-0">{task.Progress}%</span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-zinc-600">
                      <span>Priority: {task.Priority}</span>
                      {task.EstimatedHours > 0 && <span>{task.EstimatedHours}h est.</span>}
                      {task.CarriedForward && (
                        <span className="text-yellow-600">Carried forward</span>
                      )}
                    </div>

                    {task.Blockers && (
                      <div className="mt-2 text-xs text-red-400 bg-red-500/5 border border-red-500/10 rounded px-2 py-1">
                        Blocker: {task.Blockers}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Daily Timeline */}
        <div>
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">
            Today&apos;s Activity
          </h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            {todayLogs.length === 0 ? (
              <p className="text-sm text-zinc-600">No activity today</p>
            ) : (
              <div className="space-y-0">
                {todayLogs.map((log) => (
                  <div
                    key={log.LogID}
                    className="flex items-start gap-3 py-2 border-b border-zinc-800/50 last:border-0"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 shrink-0 mt-1.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-300">
                        {log.Action}
                        {log.Details && (
                          <span className="text-zinc-500"> — {log.Details}</span>
                        )}
                      </p>
                    </div>
                    <span className="text-xs text-zinc-600 shrink-0">
                      {formatRelativeTime(log.Timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Previous Days */}
        <div>
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">
            Recent Days
          </h2>
          <div className="space-y-2">
            {dates.map((date) => {
              const dayCheckin = checkins.find(c => c.Date === date);
              const dayCheckout = checkouts.find(c => c.Date === date);
              const dayTasks = allTasks.filter(t => t.Date === date);
              const completedCount = dayTasks.filter(t => t.Status === 'completed').length;
              const isToday = date === today;

              return (
                <div
                  key={date}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-zinc-50">
                      {isToday ? 'Today' : new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </p>
                    <span className="text-xs text-zinc-600">{date}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-zinc-500">
                    <span>
                      In: {dayCheckin ? formatTime(dayCheckin.SubmittedAt) : '—'}
                    </span>
                    <span>
                      Out: {dayCheckout ? formatTime(dayCheckout.SubmittedAt) : '—'}
                    </span>
                    <span>{dayTasks.length} tasks</span>
                    {completedCount > 0 && (
                      <span className="text-green-600">{completedCount} done</span>
                    )}
                    {dayCheckout?.WorkingHours > 0 && (
                      <span>{dayCheckout.WorkingHours}h</span>
                    )}
                  </div>
                </div>
              );
            })}
            {dates.length === 0 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                <p className="text-sm text-zinc-600">No history available</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
