import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { apiGetTasks, apiGetCheckins, apiGetCheckouts } from '@/lib/api';
import { getYesterday, formatDate } from '@/lib/utils';
import { TASK_STATUS_LABELS, TASK_STATUS_COLORS } from '@/lib/constants';

export const metadata = {
  title: 'History — Daily Pulse',
};

export default async function HistoryPage({ searchParams }) {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.role !== 'employee') redirect('/dashboard');

  const sParams = await searchParams;
  const selectedDate = sParams.date || getYesterday();

  const [checkinsRes, checkoutsRes, tasksRes] = await Promise.all([
    apiGetCheckins({ userId: session.userId, date: selectedDate }),
    apiGetCheckouts({ userId: session.userId, date: selectedDate }),
    apiGetTasks({ userId: session.userId, date: selectedDate }),
  ]);

  const checkin = checkinsRes.success && checkinsRes.checkins.length > 0 ? checkinsRes.checkins[0] : null;
  const checkout = checkoutsRes.success && checkoutsRes.checkouts.length > 0 ? checkoutsRes.checkouts[0] : null;
  const tasks = tasksRes.success ? tasksRes.tasks : [];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 pb-12">
      <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-white">History</h1>
            <p className="text-xs text-zinc-500">Review your past work days</p>
          </div>
        </div>

        {/* Date Selector Form */}
        <form method="GET" className="flex items-center gap-3 bg-zinc-900 border border-zinc-805 p-3 rounded-lg">
          <label htmlFor="date" className="text-xs font-medium text-zinc-400 shrink-0">
            Select Date:
          </label>
          <input
            id="date"
            name="date"
            type="date"
            defaultValue={selectedDate}
            className="flex-1 h-9 px-3 text-sm text-white bg-[#09090b] border border-zinc-800 rounded-lg outline-none focus:border-zinc-600 transition-colors"
          />
          <button
            type="submit"
            className="h-9 px-4 bg-white text-black text-xs font-medium rounded-lg hover:bg-zinc-200 transition-colors"
          >
            Go
          </button>
        </form>

        {/* Day Summary */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-white tracking-tight">
            Summary for {formatDate(selectedDate)}
          </h2>

          {/* If no check-in/out/tasks */}
          {!checkin && !checkout && tasks.length === 0 ? (
            <div className="border border-zinc-800 bg-zinc-900/30 rounded-lg p-8 text-center text-zinc-500 text-sm">
              No record found for this date.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Checkin Info */}
              {checkin ? (
                <div className="border border-zinc-800 bg-zinc-900 rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-zinc-400 uppercase">Morning Check-in</span>
                    <span className="text-xs text-zinc-500">
                      {new Date(checkin.SubmittedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {checkin.Notes && (
                    <div>
                      <span className="text-xs text-zinc-500">Notes</span>
                      <p className="text-xs text-zinc-300 mt-0.5">{checkin.Notes}</p>
                    </div>
                  )}
                  {checkin.Blockers && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded p-2 text-xs">
                      <span className="text-red-400 font-medium">Blocker</span>
                      <p className="text-zinc-300 mt-0.5">{checkin.Blockers}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="border border-zinc-805/50 border-dashed rounded-lg p-3 text-center text-xs text-zinc-600">
                  No morning check-in submitted.
                </div>
              )}

              {/* Tasks Info */}
              {tasks.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Tasks</h3>
                  <div className="space-y-1.5">
                    {tasks.map(t => {
                      const statusLabel = TASK_STATUS_LABELS[t.Status] || t.Status;
                      const statusColor = TASK_STATUS_COLORS[t.Status] || '#a1a1aa';
                      return (
                        <div key={t.TaskID} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-sm">
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-zinc-200 font-medium truncate">{t.Title}</span>
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded shrink-0"
                              style={{ color: statusColor, backgroundColor: `${statusColor}15` }}
                            >
                              {statusLabel}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-zinc-500 mt-2">
                            <span>Priority: {t.Priority}</span>
                            <span>Progress: {t.Progress}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Checkout Info */}
              {checkout ? (
                <div className="border border-zinc-800 bg-zinc-900 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-zinc-400 uppercase">End-of-Day Checkout</span>
                    <span className="text-xs text-zinc-500">
                      {new Date(checkout.SubmittedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-zinc-500 block">Tomorrow&apos;s Plan</span>
                      <p className="text-zinc-300 mt-0.5">{checkout.TomorrowPlan}</p>
                    </div>
                    {checkout.PostponeReason && (
                      <div>
                        <span className="text-red-400 block font-medium">Postponed Reason</span>
                        <p className="text-zinc-300 mt-0.5">{checkout.PostponeReason}</p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-zinc-800 text-xs">
                    <div>
                      <span className="text-zinc-500 block">Completed</span>
                      <span className="text-sm font-semibold text-green-500">{checkout.CompletedCount}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Pending</span>
                      <span className="text-sm font-semibold text-zinc-400">{checkout.PendingCount}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Postponed</span>
                      <span className="text-sm font-semibold text-yellow-500">{checkout.PostponedCount}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border border-zinc-805/50 border-dashed rounded-lg p-3 text-center text-xs text-zinc-600">
                  No end-of-day checkout submitted.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
