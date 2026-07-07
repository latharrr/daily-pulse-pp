'use client';

import { formatRelativeTime } from '@/lib/utils';

export function DailyFeed({ logs, users }) {
  const userMap = {};
  if (users) {
    users.forEach((u) => {
      userMap[u.UserID] = u;
    });
  }

  const sorted = [...(logs || [])].sort(
    (a, b) => new Date(b.Timestamp) - new Date(a.Timestamp)
  );

  return (
    <div>
      <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">Daily Feed</h2>
      <div className="max-h-96 overflow-y-auto space-y-0 pr-1">
        {sorted.length === 0 && (
          <p className="text-sm text-zinc-600 py-4 text-center">No activity today</p>
        )}
        {sorted.map((log) => {
          const user = userMap[log.UserID];
          const name = user?.Name || 'Unknown';
          const initial = name.charAt(0).toUpperCase();

          return (
            <div
              key={log.LogID}
              className="flex items-start gap-3 py-2.5 border-b border-zinc-800/50 last:border-0"
            >
              <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] font-medium text-zinc-400 shrink-0 mt-0.5">
                {initial}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-300">
                  <span className="font-medium text-zinc-50">{name}</span>{' '}
                  <span className="text-zinc-400">{log.Action}</span>
                  {log.Details && (
                    <span className="text-zinc-500"> — {log.Details}</span>
                  )}
                </p>
              </div>
              <span className="text-xs text-zinc-600 shrink-0 mt-0.5">
                {formatRelativeTime(log.Timestamp)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
