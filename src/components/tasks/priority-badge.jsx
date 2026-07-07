'use client';

import { PRIORITY_LABELS } from '@/lib/constants';

const PRIORITY_CLASSES = {
  low: 'text-zinc-500',
  medium: 'text-zinc-300',
  high: 'text-yellow-500',
  urgent: 'text-red-500 uppercase',
};

const DOT_CLASSES = {
  low: 'bg-zinc-500',
  medium: 'bg-zinc-300',
  high: 'bg-yellow-500',
  urgent: 'bg-red-500',
};

export function PriorityBadge({ priority }) {
  const label = PRIORITY_LABELS[priority] || priority;
  const textClass = PRIORITY_CLASSES[priority] || 'text-zinc-400';
  const dotClass = DOT_CLASSES[priority] || 'bg-zinc-400';

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${textClass}`}>
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${dotClass}`} />
      {label}
    </span>
  );
}
