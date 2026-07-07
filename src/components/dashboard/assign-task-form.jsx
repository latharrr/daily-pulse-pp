'use client';

import { useState, useTransition } from 'react';
import { apiCreateTask } from '@/lib/api';

export function AssignTaskForm({ members, managerId }) {
  const [selectedUserId, setSelectedUserId] = useState(members[0]?.UserID || '');
  const [taskTitle, setTaskTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e) {
    e.preventDefault();
    if (!selectedUserId || !taskTitle.trim()) return;

    const title = taskTitle.trim();
    const userId = selectedUserId;
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
        window.location.reload(); // Reload to update Team Wall and Feed
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
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] text-zinc-500 uppercase">Assign To</label>
            <select
              value={selectedUserId}
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
    </div>
  );
}
