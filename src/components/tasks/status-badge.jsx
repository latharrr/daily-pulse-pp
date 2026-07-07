'use client';

import { TASK_STATUS_LABELS, TASK_STATUS_COLORS } from '@/lib/constants';

const STATUS_CLASSES = {
  planned: 'bg-zinc-400',
  in_progress: 'bg-yellow-500',
  blocked: 'bg-red-500',
  waiting_review: 'bg-violet-400',
  completed: 'bg-green-500',
  postponed: 'bg-zinc-500',
  cancelled: 'bg-zinc-600',
};

export function StatusBadge({ status }) {
  const label = TASK_STATUS_LABELS[status] || status;
  const dotClass = STATUS_CLASSES[status] || 'bg-zinc-400';

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-zinc-400">
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${dotClass}`} />
      {label}
    </span>
  );
}
