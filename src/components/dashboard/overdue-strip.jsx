'use client';

import { useState } from 'react';
import { formatDate } from '@/lib/utils';

export function OverdueStrip({ overdueTasks, users }) {
  const [expanded, setExpanded] = useState(false);

  if (!overdueTasks || overdueTasks.length === 0) return null;

  const userMap = {};
  users.forEach(u => { userMap[u.UserID] = u; });

  // Group by UserID
  const grouped = {};
  overdueTasks.forEach(task => {
    if (!grouped[task.UserID]) grouped[task.UserID] = [];
    grouped[task.UserID].push(task);
  });

  return (
    <div className="border border-yellow-500/20 bg-yellow-500/5 rounded-lg overflow-hidden transition-all duration-200">
      {/* Header Bar */}
      <div className="flex items-center justify-between p-3 px-4 text-xs font-semibold text-yellow-500/90">
        <div className="flex items-center gap-2">
          <span>⚠</span>
          <span>{overdueTasks.length} Overdue Tasks</span>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="underline hover:text-white transition-colors duration-150"
        >
          {expanded ? 'Hide Details' : 'View All'}
        </button>
      </div>

      {/* Expanded grouping list */}
      {expanded && (
        <div className="border-t border-zinc-800 bg-zinc-950/80 p-4 space-y-4 text-xs max-h-60 overflow-y-auto">
          {Object.entries(grouped).map(([userId, tasks]) => {
            const user = userMap[userId];
            const userName = user?.Name || 'Unknown Employee';
            return (
              <div key={userId} className="space-y-1.5">
                <p className="font-bold text-zinc-300">{userName}</p>
                <div className="space-y-1 pl-3 border-l border-zinc-800">
                  {tasks.map(task => (
                    <div key={task.TaskID} className="flex justify-between gap-3 text-zinc-400">
                      <span className="truncate">{task.Title}</span>
                      <span className="text-red-400 shrink-0">Due {formatDate(task.Deadline)}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
