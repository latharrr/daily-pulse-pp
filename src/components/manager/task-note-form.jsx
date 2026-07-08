'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { apiUpdateTask, apiLogActivity } from '@/lib/api';

export function TaskNoteForm({ task, managerId }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(task.Notes || '');
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e) {
    e.preventDefault();
    const notes = value.trim();

    startTransition(async () => {
      const res = await apiUpdateTask({ taskId: task.TaskID, notes });
      if (res.success) {
        apiLogActivity({
          userId: managerId,
          action: 'Manager added note',
          details: task.Title,
        }).catch(() => {});
        setEditing(false);
        router.refresh();
      }
    });
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="mt-2 text-[10px] text-zinc-500 hover:text-white transition-colors"
      >
        {task.Notes ? 'Edit note' : 'Add note'}
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 flex items-center gap-2">
      <input
        type="text"
        autoFocus
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="Add a note or insight for this task..."
        className="flex-1 h-7 px-2 text-xs text-white bg-zinc-950 border border-zinc-800 rounded outline-none focus:border-zinc-600"
      />
      <button
        type="submit"
        disabled={isPending}
        className="text-[10px] text-white font-medium disabled:opacity-50"
      >
        {isPending ? 'Saving...' : 'Save'}
      </button>
      <button
        type="button"
        onClick={() => {
          setEditing(false);
          setValue(task.Notes || '');
        }}
        className="text-[10px] text-zinc-500 hover:text-white"
      >
        Cancel
      </button>
    </form>
  );
}
