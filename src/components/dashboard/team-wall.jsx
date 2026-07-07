import Link from 'next/link';
import { TASK_STATUS_LABELS, TASK_STATUS_COLORS } from '@/lib/constants';

export function TeamWall({ members }) {
  if (!members || members.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-650 text-sm">
        No team members found
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">Team</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {members.map((member) => (
          <MemberCard key={member.UserID} member={member} />
        ))}
      </div>
    </div>
  );
}

function MemberCard({ member }) {
  const taskStatusLabel = member.currentTaskStatus ? TASK_STATUS_LABELS[member.currentTaskStatus] : null;
  const taskStatusColor = member.currentTaskStatus ? TASK_STATUS_COLORS[member.currentTaskStatus] : null;
  const cleanNotes = member.currentTaskNotes?.replace('[Focus]', '').trim();

  return (
    <Link
      href={`/dashboard/manager/employee/${member.UserID}`}
      className="block bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors duration-150 cursor-pointer"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-medium text-zinc-300">
            {member.Name?.charAt(0).toUpperCase()}
          </div>
          <span className="font-medium text-zinc-55 text-sm text-zinc-100">{member.Name}</span>
        </div>
      </div>

      <div className="mb-2">
        {member.currentTask ? (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-semibold text-zinc-350 text-white truncate max-w-[170px]">{member.currentTask}</span>
              <span className="text-[9px] text-zinc-500 border border-zinc-850 px-1 rounded bg-zinc-950 font-medium">Focus</span>
            </div>
            {cleanNotes && (
              <p className="text-[10px] text-zinc-500 italic truncate mt-0.5">“{cleanNotes}”</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-zinc-600">—</p>
        )}
      </div>

      {member.currentTaskProgress !== null && member.currentTask && (
        <div className="mb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-zinc-500">{member.currentTaskProgress}%</span>
            {taskStatusLabel && (
              <span
                className="text-xs px-1.5 py-0.5 rounded"
                style={{
                  color: taskStatusColor,
                  backgroundColor: `${taskStatusColor}15`,
                }}
              >
                {taskStatusLabel}
              </span>
            )}
          </div>
          <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-150"
              style={{
                width: `${member.currentTaskProgress}%`,
                backgroundColor: taskStatusColor || '#a1a1aa',
              }}
            />
          </div>
        </div>
      )}

      {member.completedCount > 0 && (
        <p className="text-xs text-green-500 mt-1">✓ {member.completedCount} completed</p>
      )}
    </Link>
  );
}
