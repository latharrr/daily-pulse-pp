'use client';

export function MissedCheckinAlert({ users }) {
  if (!users || users.length === 0) return null;

  return (
    <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full bg-red-500" />
        <h3 className="text-sm font-medium text-red-400">Not Checked In</h3>
        <span className="text-xs text-zinc-500">({users.length})</span>
      </div>
      <div className="flex flex-wrap gap-3">
        {users.map((user) => (
          <div key={user.UserID} className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-medium text-zinc-300">
              {user.Name?.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm text-zinc-300">{user.Name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
