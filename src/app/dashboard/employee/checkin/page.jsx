'use client';

import { useState, useTransition, useActionState } from 'react';
import Link from 'next/link';
import { submitCheckinAction } from '@/actions/checkin-actions';
import { PRIORITY } from '@/lib/constants';

export default function CheckinPage() {
  const [step, setStep] = useState(1);
  const [tasks, setTasks] = useState([]);
  
  // Current task inputs
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState('medium');
  const [taskDeadline, setTaskDeadline] = useState('');
  const [taskEstHours, setTaskEstHours] = useState('');

  // Step 2 inputs
  const [blockers, setBlockers] = useState('');
  const [notes, setNotes] = useState('');

  const [state, formAction, isPending] = useActionState(submitCheckinAction, {
    error: null,
  });

  function handleAddTask(e) {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    setTasks(prev => [
      ...prev,
      {
        title: taskTitle.trim(),
        priority: taskPriority,
        deadline: taskDeadline || null,
        estimatedHours: taskEstHours ? Number(taskEstHours) : 0,
      },
    ]);

    // Reset task form
    setTaskTitle('');
    setTaskPriority('medium');
    setTaskDeadline('');
    setTaskEstHours('');
  }

  function handleRemoveTask(index) {
    setTasks(prev => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 pb-12">
      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div>
            <h1 className="text-base font-semibold text-white">Morning Check-in</h1>
            <p className="text-xs text-zinc-500">Step {step} of 3</p>
          </div>
          <Link
            href="/dashboard/employee"
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Cancel
          </Link>
        </div>

        {/* Step Indicator Progress Bar */}
        <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden">
          <div
            className="h-full bg-white transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        {/* Form Error */}
        {state?.error && (
          <div className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg p-3">
            {state.error}
          </div>
        )}

        {/* Step 1: Add Tasks */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-sm font-medium text-zinc-300">What will you work on today?</h2>
            
            <form onSubmit={handleAddTask} className="space-y-3 bg-[#111113] border border-zinc-800 p-4 rounded-lg">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-400">Task Title *</label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={e => setTaskTitle(e.target.value)}
                  placeholder="e.g. Design API endpoints"
                  className="w-full h-9 px-3 text-sm text-white bg-[#09090b] border border-zinc-800 rounded-lg outline-none placeholder:text-zinc-600 focus:border-zinc-600 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-zinc-400">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={e => setTaskPriority(e.target.value)}
                    className="w-full h-9 px-2 text-sm text-white bg-[#09090b] border border-zinc-800 rounded-lg outline-none focus:border-zinc-600 transition-colors"
                  >
                    <option value={PRIORITY.LOW}>Low</option>
                    <option value={PRIORITY.MEDIUM}>Medium</option>
                    <option value={PRIORITY.HIGH}>High</option>
                    <option value={PRIORITY.URGENT}>Urgent</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-zinc-400">Est. Hours</label>
                  <input
                    type="number"
                    min="0.5"
                    max="24"
                    step="0.5"
                    value={taskEstHours}
                    onChange={e => setTaskEstHours(e.target.value)}
                    placeholder="e.g. 3"
                    className="w-full h-9 px-3 text-sm text-white bg-[#09090b] border border-zinc-800 rounded-lg outline-none placeholder:text-zinc-600 focus:border-zinc-600 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-400">Deadline</label>
                <input
                  type="date"
                  value={taskDeadline}
                  onChange={e => setTaskDeadline(e.target.value)}
                  className="w-full h-9 px-3 text-sm text-white bg-[#09090b] border border-zinc-800 rounded-lg outline-none focus:border-zinc-600 transition-colors"
                />
              </div>

              <button
                type="submit"
                className="w-full h-8 bg-zinc-800 text-zinc-200 text-xs font-medium rounded-lg hover:bg-zinc-700 transition-colors border border-zinc-700"
              >
                Add Task
              </button>
            </form>

            {/* Planned Tasks List */}
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Planned Tasks ({tasks.length})
              </h3>
              {tasks.length === 0 ? (
                <p className="text-xs text-zinc-600 italic">No tasks added yet. Add at least one task to continue.</p>
              ) : (
                <div className="space-y-1.5">
                  {tasks.map((task, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-lg border border-zinc-800 bg-[#111113] text-sm"
                    >
                      <div className="min-w-0 flex-1 pr-4">
                        <p className="text-zinc-200 font-medium truncate">{task.title}</p>
                        <p className="text-[10px] text-zinc-500 mt-0.5">
                          Priority: {task.priority} {task.estimatedHours ? `· ${task.estimatedHours}h est.` : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveTask(idx)}
                        className="text-xs text-red-400 hover:text-red-300 font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="flex justify-end pt-4">
              <button
                type="button"
                disabled={tasks.length === 0}
                onClick={() => setStep(2)}
                className="h-9 px-5 bg-white text-black text-sm font-medium rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Blockers & Notes */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-sm font-medium text-zinc-300">Any blockers or additional notes?</h2>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-400">
                  Blockers (optional)
                </label>
                <textarea
                  value={blockers}
                  onChange={e => setBlockers(e.target.value)}
                  placeholder="Describe anything that is holding you back..."
                  className="w-full h-24 p-3 text-sm text-white bg-[#09090b] border border-zinc-800 rounded-lg outline-none placeholder:text-zinc-600 focus:border-zinc-600 transition-colors resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-400">
                  Additional Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Any extra context for your day..."
                  className="w-full h-24 p-3 text-sm text-white bg-[#09090b] border border-zinc-800 rounded-lg outline-none placeholder:text-zinc-600 focus:border-zinc-600 transition-colors resize-none"
                />
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="h-9 px-5 bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm font-medium rounded-lg hover:bg-zinc-800 transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="h-9 px-5 bg-white text-black text-sm font-medium rounded-lg hover:bg-zinc-200 transition-colors"
              >
                Review check-in
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="tasks" value={JSON.stringify(tasks)} />
            <input type="hidden" name="blockers" value={blockers} />
            <input type="hidden" name="notes" value={notes} />

            <h2 className="text-sm font-medium text-zinc-300">Review check-in details</h2>

            <div className="border border-zinc-800 bg-[#111113] p-4 rounded-lg space-y-4 text-sm">
              {/* Tasks */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase text-zinc-500">Planned Work</p>
                <div className="divide-y divide-zinc-800/50">
                  {tasks.map((task, idx) => (
                    <div key={idx} className="py-2 first:pt-0 last:pb-0">
                      <p className="text-zinc-200 font-medium">{task.title}</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">
                        Priority: {task.priority} {task.estimatedHours ? `· ${task.estimatedHours}h est.` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Blockers */}
              {blockers.trim() && (
                <div className="space-y-1 pt-2 border-t border-zinc-800/50">
                  <p className="text-xs font-semibold uppercase text-red-400">Blockers</p>
                  <p className="text-zinc-300">{blockers}</p>
                </div>
              )}

              {/* Notes */}
              {notes.trim() && (
                <div className="space-y-1 pt-2 border-t border-zinc-800/50">
                  <p className="text-xs font-semibold uppercase text-zinc-500">Notes</p>
                  <p className="text-zinc-300">{notes}</p>
                </div>
              )}
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setStep(2)}
                className="h-9 px-5 bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm font-medium rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="h-9 px-5 bg-white text-black text-sm font-medium rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-50"
              >
                {isPending ? 'Submitting...' : 'Submit check-in'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
