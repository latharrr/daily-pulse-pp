'use client';

import { useState, useTransition } from 'react';
import { StatusBadge } from './status-badge';
import { PriorityBadge } from './priority-badge';
import { completeTaskAction, postponeTaskAction, updateTaskAction } from '@/actions/task-actions';
import { formatDate } from '@/lib/utils';

export function TaskCard({ task }) {
  const [expanded, setExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [progress, setProgress] = useState(task.Progress || 0);
  const [blockerInput, setBlockerInput] = useState('');
  const [showBlockerInput, setShowBlockerInput] = useState(false);
  const [showProgressInput, setShowProgressInput] = useState(false);

  const isFinished = ['completed', 'postponed', 'cancelled'].includes(task.Status);

  function handleComplete() {
    startTransition(async () => {
      await completeTaskAction(task.TaskID, task.Title);
    });
  }

  function handlePostpone() {
    startTransition(async () => {
      await postponeTaskAction(task.TaskID, task.Title);
    });
  }

  function handleStart() {
    startTransition(async () => {
      await updateTaskAction({ taskId: task.TaskID, status: 'in_progress' });
    });
  }

  function handleUpdateProgress(val) {
    const v = Math.min(100, Math.max(0, Number(val)));
    setProgress(v);
    startTransition(async () => {
      await updateTaskAction({ taskId: task.TaskID, progress: v });
    });
    setShowProgressInput(false);
  }

  function handleAddBlocker() {
    if (!blockerInput.trim()) return;
    startTransition(async () => {
      await updateTaskAction({
        taskId: task.TaskID,
        blockers: blockerInput.trim(),
        status: 'blocked',
      });
    });
    setBlockerInput('');
    setShowBlockerInput(false);
  }

  return (
    <div className="border border-zinc-800 rounded-lg bg-zinc-900 transition-colors duration-150">
      {/* Collapsed header — always visible */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-4 flex items-center gap-3"
        disabled={isPending}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-zinc-50 text-sm font-medium truncate">
              {task.Title}
            </span>
            {task.CarriedForward && (
              <span className="text-[10px] text-zinc-500 border border-zinc-700 rounded px-1.5 py-0.5">
                carried
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1.5">
            <PriorityBadge priority={task.Priority} />
            <StatusBadge status={task.Status} />
          </div>
        </div>

        {/* Progress bar — compact */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-16 h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-150"
              style={{ width: `${task.Progress || 0}%` }}
            />
          </div>
          <span className="text-[11px] text-zinc-500 w-8 text-right tabular-nums">
            {task.Progress || 0}%
          </span>
        </div>

        <svg
          className={`w-4 h-4 text-zinc-500 shrink-0 transition-transform duration-150 ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-zinc-800 pt-3 space-y-3">
          {/* Details grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {task.Deadline && (
              <div>
                <span className="text-zinc-500">Deadline</span>
                <p className="text-zinc-300 mt-0.5">{formatDate(task.Deadline)}</p>
              </div>
            )}
            {task.EstimatedHours > 0 && (
              <div>
                <span className="text-zinc-500">Estimated</span>
                <p className="text-zinc-300 mt-0.5">{task.EstimatedHours}h</p>
              </div>
            )}
          </div>

          {task.Notes && (
            <div>
              <span className="text-xs text-zinc-500">Notes</span>
              <p className="text-xs text-zinc-300 mt-0.5">{task.Notes}</p>
            </div>
          )}

          {task.Blockers && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2">
              <span className="text-xs text-red-400 font-medium">Blocker</span>
              <p className="text-xs text-zinc-300 mt-0.5">{task.Blockers}</p>
            </div>
          )}

          {/* Blocker input */}
          {showBlockerInput && (
            <div className="flex gap-2">
              <input
                type="text"
                value={blockerInput}
                onChange={e => setBlockerInput(e.target.value)}
                placeholder="Describe the blocker..."
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-50 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
                onKeyDown={e => e.key === 'Enter' && handleAddBlocker()}
              />
              <button
                type="button"
                onClick={handleAddBlocker}
                disabled={isPending}
                className="text-xs bg-white text-zinc-950 px-3 py-1.5 rounded-lg hover:bg-zinc-200 transition-colors duration-150 disabled:opacity-50"
              >
                Add
              </button>
            </div>
          )}

          {/* Progress input */}
          {showProgressInput && (
            <div className="flex gap-2 items-center">
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={progress}
                onChange={e => setProgress(Number(e.target.value))}
                className="flex-1 accent-white h-1"
              />
              <span className="text-xs text-zinc-400 w-8 text-right tabular-nums">{progress}%</span>
              <button
                type="button"
                onClick={() => handleUpdateProgress(progress)}
                disabled={isPending}
                className="text-xs bg-white text-zinc-950 px-3 py-1.5 rounded-lg hover:bg-zinc-200 transition-colors duration-150 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          )}

          {/* Actions */}
          {!isFinished && (
            <div className="flex flex-wrap gap-2 pt-1">
              {task.Status === 'planned' && (
                <button
                  type="button"
                  onClick={handleStart}
                  disabled={isPending}
                  className="text-xs bg-white text-zinc-950 px-3 py-1.5 rounded-lg hover:bg-zinc-200 transition-colors duration-150 disabled:opacity-50"
                >
                  Start
                </button>
              )}
              <button
                type="button"
                onClick={handleComplete}
                disabled={isPending}
                className="text-xs bg-zinc-800 text-green-400 px-3 py-1.5 rounded-lg hover:bg-zinc-700 transition-colors duration-150 disabled:opacity-50"
              >
                Complete
              </button>
              <button
                type="button"
                onClick={handlePostpone}
                disabled={isPending}
                className="text-xs bg-zinc-800 text-zinc-300 px-3 py-1.5 rounded-lg hover:bg-zinc-700 transition-colors duration-150 disabled:opacity-50"
              >
                Postpone
              </button>
              <button
                type="button"
                onClick={() => { setShowBlockerInput(!showBlockerInput); setShowProgressInput(false); }}
                disabled={isPending}
                className="text-xs bg-zinc-800 text-zinc-300 px-3 py-1.5 rounded-lg hover:bg-zinc-700 transition-colors duration-150 disabled:opacity-50"
              >
                Add Blocker
              </button>
              <button
                type="button"
                onClick={() => { setShowProgressInput(!showProgressInput); setShowBlockerInput(false); }}
                disabled={isPending}
                className="text-xs bg-zinc-800 text-zinc-300 px-3 py-1.5 rounded-lg hover:bg-zinc-700 transition-colors duration-150 disabled:opacity-50"
              >
                Update Progress
              </button>
            </div>
          )}

          {isPending && (
            <p className="text-xs text-zinc-500">Updating...</p>
          )}
        </div>
      )}
    </div>
  );
}
