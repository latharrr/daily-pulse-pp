'use client';

import { useState, useTransition, useActionState, useEffect } from 'react';
import { submitCheckoutAction } from '@/actions/auth-actions'; // Wait, let's verify where submitCheckoutAction is. Ah! It is in '@/actions/checkout-actions'! Let's import from there!
import { updateTaskAction } from '@/actions/task-actions';

export function CheckoutForm({ initialTasks }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [isPendingUpdate, startTransition] = useTransition();

  const [tomorrowPlan, setTomorrowPlan] = useState('');
  const [workingHours, setWorkingHours] = useState('8');
  const [postponeReason, setPostponeReason] = useState('');
  const [notes, setNotes] = useState('');

  // Count task types dynamically
  const completedTasks = tasks.filter(t => t.Status === 'completed');
  const postponedTasks = tasks.filter(t => t.Status === 'postponed');
  const pendingTasks = tasks.filter(t => !['completed', 'cancelled', 'postponed'].includes(t.Status));

  const hasPostponed = postponedTasks.length > 0;

  // Import checkout action
  const [state, formAction, isPendingSubmit] = useActionState(
    async (prevState, formData) => {
      // Lazy import or call checkout action directly
      const { submitCheckoutAction } = await import('@/actions/checkout-actions');
      return submitCheckoutAction(prevState, formData);
    },
    { error: null }
  );

  async function handleTogglePostpone(task) {
    const nextStatus = task.Status === 'postponed' ? 'planned' : 'postponed';
    
    startTransition(async () => {
      const res = await updateTaskAction({
        taskId: task.TaskID,
        status: nextStatus,
      });

      if (res.success) {
        setTasks(prev =>
          prev.map(t => (t.TaskID === task.TaskID ? { ...t, Status: nextStatus } : t))
        );
      }
    });
  }

  return (
    <form action={formAction} className="space-y-5">
      {/* Hidden inputs to pass counts or data to action if needed */}
      <input type="hidden" name="tomorrowPlan" value={tomorrowPlan} />
      <input type="hidden" name="workingHours" value={workingHours} />
      <input type="hidden" name="postponeReason" value={postponeReason} />
      <input type="hidden" name="notes" value={notes} />

      {/* Error */}
      {state?.error && (
        <div className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg p-3">
          {state.error}
        </div>
      )}

      {/* Tasks Overview */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
          Today&apos;s Tasks Summary
        </h3>

        {tasks.length === 0 ? (
          <p className="text-xs text-zinc-500 italic">No tasks created today.</p>
        ) : (
          <div className="border border-zinc-800 bg-[#111113] rounded-lg p-4 space-y-4">
            {/* Completed */}
            {completedTasks.length > 0 && (
              <div>
                <span className="text-[10px] font-semibold text-green-500 uppercase">Completed</span>
                <div className="space-y-1 mt-1 text-sm text-zinc-300">
                  {completedTasks.map(t => (
                    <div key={t.TaskID} className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      <span className="truncate">{t.Title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Postponed */}
            {postponedTasks.length > 0 && (
              <div>
                <span className="text-[10px] font-semibold text-zinc-400 uppercase">Postponed</span>
                <div className="space-y-1 mt-1 text-sm text-zinc-300">
                  {postponedTasks.map(t => (
                    <div key={t.TaskID} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleTogglePostpone(t)}
                        className="text-yellow-500 hover:text-yellow-400 shrink-0 font-medium text-xs"
                      >
                        Undo
                      </button>
                      <span className="line-through text-zinc-500 truncate">{t.Title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pending Tasks to handle */}
            {pendingTasks.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-semibold text-zinc-400 uppercase">Incomplete Tasks</span>
                <p className="text-xs text-zinc-500">Check tasks to postpone them to tomorrow</p>
                <div className="space-y-2 mt-1">
                  {pendingTasks.map(t => (
                    <label
                      key={t.TaskID}
                      className="flex items-center gap-3 p-2 rounded-lg bg-zinc-950/50 border border-zinc-800/50 hover:bg-zinc-800/30 cursor-pointer transition-colors duration-150 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={false}
                        onChange={() => handleTogglePostpone(t)}
                        disabled={isPendingUpdate}
                        className="rounded border-zinc-700 bg-zinc-800 focus:ring-0 focus:ring-offset-0 h-4 w-4 accent-white"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-zinc-200 block truncate">{t.Title}</span>
                        <span className="text-[10px] text-zinc-500">
                          {t.Priority} · {t.Progress}%
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Postpone Reason (Required if has postponed) */}
      {hasPostponed && (
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-red-400">
            Postpone Reason *
          </label>
          <textarea
            required
            value={postponeReason}
            onChange={e => setPostponeReason(e.target.value)}
            placeholder="Explain why these tasks are being postponed..."
            className="w-full h-20 p-3 text-sm text-white bg-[#09090b] border border-zinc-800 rounded-lg outline-none placeholder:text-zinc-600 focus:border-zinc-600 transition-colors resize-none text-zinc-200"
          />
        </div>
      )}

      {/* Tomorrow Priority */}
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-zinc-400">
          Tomorrow&apos;s First Priority *
        </label>
        <textarea
          required
          value={tomorrowPlan}
          onChange={e => setTomorrowPlan(e.target.value)}
          placeholder="What is the single most important task for tomorrow?"
          className="w-full h-20 p-3 text-sm text-white bg-[#09090b] border border-zinc-800 rounded-lg outline-none placeholder:text-zinc-600 focus:border-zinc-600 transition-colors resize-none text-zinc-200"
        />
      </div>

      {/* Hours worked */}
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-zinc-400">
          Hours Worked Today *
        </label>
        <input
          type="number"
          required
          min="1"
          max="24"
          step="0.5"
          value={workingHours}
          onChange={e => setWorkingHours(e.target.value)}
          className="w-full h-9 px-3 text-sm text-white bg-[#09090b] border border-zinc-800 rounded-lg outline-none focus:border-zinc-600 transition-colors text-zinc-200"
        />
      </div>

      {/* Additional Notes */}
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-zinc-400">
          Checkout Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Any achievements, learnings, or extra notes..."
          className="w-full h-20 p-3 text-sm text-white bg-[#09090b] border border-zinc-800 rounded-lg outline-none placeholder:text-zinc-600 focus:border-zinc-600 transition-colors resize-none text-zinc-200"
        />
      </div>

      {/* Action Button */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={isPendingSubmit || isPendingUpdate}
          className="w-full h-9 bg-white text-black text-sm font-medium rounded-lg hover:bg-zinc-200 transition-colors duration-150 disabled:opacity-50"
        >
          {isPendingSubmit ? 'Submitting checkout...' : 'Submit End-of-Day Checkout'}
        </button>
      </div>
    </form>
  );
}
