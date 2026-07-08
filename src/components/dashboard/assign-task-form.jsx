'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { apiCreateTask } from '@/lib/api';

export function AssignTaskForm({ members, managerId }) {
  const router = useRouter();
  const [selectedUserId, setSelectedUserId] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [isPending, startTransition] = useTransition();

  // Derived rather than synced via effect, so it stays correct if `members`
  // changes after a refresh (e.g. it started empty and an admin just fixed
  // a team assignment) without an extra render pass.
  const effectiveUserId = members.some(m => m.UserID === selectedUserId)
    ? selectedUserId
    : members[0]?.UserID || '';

  function handleSubmit(e) {
    e.preventDefault();
    if (!effectiveUserId || !taskTitle.trim()) return;

    const title = taskTitle.trim();
    const userId = effectiveUserId;
    setTaskTitle('');

    startTransition(async () => {
      const res = await apiCreateTask({
        userId,
        title,
        priority,
        status: 'waiting_review',
        assignedBy: managerId,
        date: new Date().toISOString().split('T')[0],
      });

      if (res.success) {
        alert(`Assigned task "${title}" to ${members.find(m => m.UserID === userId)?.Name}`);
        router.refresh(); // Soft refresh to update Team Wall and Feed
      } else {
        alert(res.error || 'Failed to assign task');
      }
    });
  }

  return (
    <div className="bg-zinc-900 border border-zinc-805 rounded-lg p-4">
      <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
        Assign Task to Team
      </h2>
      {members.length === 0 ? (
        <p className="text-xs text-zinc-500">
          No team members yet — assign teammates to your team in{' '}
          <span className="text-zinc-300">Admin → Users → Edit</span>.
        </p>
      ) : (
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] text-zinc-500 uppercase">Assign To</label>
            <select
              value={effectiveUserId}
              onChange={e => setSelectedUserId(e.target.value)}
              className="w-full h-8 px-2 text-xs text-white bg-[#09090b] border border-zinc-800 rounded-lg outline-none focus:border-zinc-700 transition-colors"
            >
              {members.map(m => (
                <option key={m.UserID} value={m.UserID}>
                  {m.Name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-zinc-500 uppercase">Priority</label>
            <select
              value={priority}
              onChange={e => setPriority(e.target.value)}
              className="w-full h-8 px-2 text-xs text-white bg-[#09090b] border border-zinc-800 rounded-lg outline-none focus:border-zinc-700 transition-colors"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] text-zinc-500 uppercase">Task Title</label>
          <div className="flex gap-2">
            <input
              type="text"
              required
              value={taskTitle}
              onChange={e => setTaskTitle(e.target.value)}
              placeholder="e.g. Code review pull request #45"
              className="flex-1 h-8 px-3 text-xs text-white bg-[#09090b] border border-zinc-800 rounded-lg outline-none placeholder:text-zinc-650 focus:border-zinc-700 transition-colors"
            />
            <button
              type="submit"
              disabled={isPending}
              className="h-8 px-4 bg-white text-zinc-950 text-xs font-semibold rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-50"
            >
              {isPending ? 'Assigning...' : 'Assign'}
            </button>
          </div>
        </div>
      </form>
      )}
    </div>
  );
}
