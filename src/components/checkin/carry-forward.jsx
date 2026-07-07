'use client';

import { useState, useTransition } from 'react';
import { carryForwardAction } from '@/actions/checkin-actions';

export function CarryForward({ pendingTasks, userId }) {
  const [selected, setSelected] = useState(new Set());
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  if (!pendingTasks || pendingTasks.length === 0) return null;
  if (done) return null;

  function toggleTask(taskId) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(pendingTasks.map(t => t.TaskID)));
  }

  function handleCarry(taskIds) {
    startTransition(async () => {
      const result = await carryForwardAction(taskIds, userId);
      if (result.success) setDone(true);
    });
  }

  return (
    <div className="border border-dashed border-zinc-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-zinc-50">
          Yesterday&apos;s Pending Tasks
        </h3>
        <button
          type="button"
          onClick={() => {
            selectAll();
            handleCarry(pendingTasks.map(t => t.TaskID));
          }}
          disabled={isPending}
          className="text-xs bg-white text-zinc-950 px-3 py-1.5 rounded-lg hover:bg-zinc-200 transition-colors duration-150 disabled:opacity-50"
        >
          Carry All
        </button>
      </div>

      <div className="space-y-2">
        {pendingTasks.map(task => (
          <label
            key={task.TaskID}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/50 cursor-pointer transition-colors duration-150"
          >
            <input
              type="checkbox"
              checked={selected.has(task.TaskID)}
              onChange={() => toggleTask(task.TaskID)}
              disabled={isPending}
              className="rounded border-zinc-700 bg-zinc-800 text-white focus:ring-0 focus:ring-offset-0 h-3.5 w-3.5 accent-white"
            />
            <div className="flex-1 min-w-0">
              <span className="text-sm text-zinc-200 truncate block">
                {task.Title}
              </span>
              <span className="text-xs text-zinc-500">
                {task.Priority} · {task.Status.replace('_', ' ')} · {task.Progress}%
              </span>
            </div>
          </label>
        ))}
      </div>

      {selected.size > 0 && (
        <div className="mt-3 pt-3 border-t border-zinc-800">
          <button
            type="button"
            onClick={() => handleCarry(Array.from(selected))}
            disabled={isPending}
            className="text-xs bg-zinc-800 text-zinc-300 px-3 py-1.5 rounded-lg hover:bg-zinc-700 transition-colors duration-150 disabled:opacity-50"
          >
            {isPending ? 'Carrying...' : `Carry Selected (${selected.size})`}
          </button>
        </div>
      )}
    </div>
  );
}
