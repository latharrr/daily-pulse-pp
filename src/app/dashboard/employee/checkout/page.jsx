import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { apiGetTasks, apiGetCheckouts } from '@/lib/api';
import { getToday } from '@/lib/utils';
import { CheckoutForm } from './checkout-form';

export const metadata = {
  title: 'End-of-Day Checkout — Daily Pulse',
};

export default async function CheckoutPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.role !== 'employee') redirect('/dashboard');

  const todayStr = getToday();

  // Check if already checked out today
  const checkoutsRes = await apiGetCheckouts({ userId: session.userId, date: todayStr });
  const existingCheckout = checkoutsRes.success && checkoutsRes.checkouts.length > 0 ? checkoutsRes.checkouts[0] : null;

  if (existingCheckout) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full border border-zinc-800 bg-zinc-900 rounded-lg p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto text-green-500 text-xl">
            ✓
          </div>
          <div>
            <h1 className="text-base font-semibold text-white">Checked Out for Today</h1>
            <p className="text-xs text-zinc-500 mt-1">
              You submitted your end-of-day report at {new Date(existingCheckout.SubmittedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}.
            </p>
          </div>

          <div className="border border-zinc-800 bg-zinc-950 p-4 rounded-lg text-left text-xs space-y-2">
            <div>
              <span className="text-zinc-500 font-medium">Tomorrow&apos;s Plan</span>
              <p className="text-zinc-300 mt-0.5">{existingCheckout.TomorrowPlan}</p>
            </div>
            {existingCheckout.PostponeReason && (
              <div>
                <span className="text-red-400 font-medium">Postponed Tasks Reason</span>
                <p className="text-zinc-300 mt-0.5">{existingCheckout.PostponeReason}</p>
              </div>
            )}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800">
              <div>
                <span className="text-zinc-500 block">Completed</span>
                <span className="text-sm font-semibold text-green-500">{existingCheckout.CompletedCount}</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Pending</span>
                <span className="text-sm font-semibold text-zinc-400">{existingCheckout.PendingCount}</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Postponed</span>
                <span className="text-sm font-semibold text-yellow-500">{existingCheckout.PostponedCount}</span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <a
              href="/dashboard/employee"
              className="inline-flex items-center justify-center h-9 w-full bg-zinc-800 text-zinc-300 text-sm font-medium rounded-lg hover:bg-zinc-700 border border-zinc-700 transition-colors"
            >
              Back to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Fetch today's tasks
  const tasksRes = await apiGetTasks({ userId: session.userId, date: todayStr });
  const todayTasks = tasksRes.success ? tasksRes.tasks : [];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 pb-12">
      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-white">End-of-Day Checkout</h1>
            <p className="text-xs text-zinc-500">Wrap up your work and submit your daily report</p>
          </div>
          <a
            href="/dashboard/employee"
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Cancel
          </a>
        </div>

        <CheckoutForm initialTasks={todayTasks} />
      </div>
    </div>
  );
}
