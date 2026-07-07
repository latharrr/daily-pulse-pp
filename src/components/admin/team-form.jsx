'use client';

import { useActionState } from 'react';
import { createTeamAction } from '@/actions/admin-actions';

const initialState = { success: false, error: null };

export function TeamForm({ managers, onClose }) {
  const [state, formAction, isPending] = useActionState(createTeamAction, initialState);

  if (state.success) {
    if (onClose) onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md mx-4 bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-zinc-50">Add Team</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 transition-colors duration-150"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {state.error && (
          <div className="mb-4 text-sm text-red-400 bg-red-500/5 border border-red-500/10 rounded-lg px-3 py-2">
            {state.error}
          </div>
        )}

        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="teamName" className="block text-xs text-zinc-500 uppercase tracking-wider mb-1.5">
              Team Name
            </label>
            <input
              id="teamName"
              name="teamName"
              type="text"
              required
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-50 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
              placeholder="e.g. Engineering"
            />
          </div>

          <div>
            <label htmlFor="managerId" className="block text-xs text-zinc-500 uppercase tracking-wider mb-1.5">
              Manager
            </label>
            <select
              id="managerId"
              name="managerId"
              defaultValue=""
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-50 focus:outline-none focus:border-zinc-600"
            >
              <option value="">No manager</option>
              {managers?.map((mgr) => (
                <option key={mgr.UserID} value={mgr.UserID}>
                  {mgr.Name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 bg-white text-zinc-950 text-sm font-medium rounded-lg px-4 py-2 hover:bg-zinc-200 transition-colors duration-150 disabled:opacity-50"
            >
              {isPending ? 'Creating...' : 'Create Team'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="bg-zinc-800 text-zinc-300 text-sm font-medium rounded-lg px-4 py-2 hover:bg-zinc-700 transition-colors duration-150"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
