import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { apiGetTasks } from '@/lib/api';
import { TaskCard } from '@/components/tasks/task-card';

export const metadata = {
  title: 'All Tasks — Daily Pulse',
};

export default async function AllTasksPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.role !== 'employee') redirect('/dashboard');

  const tasksRes = await apiGetTasks({ userId: session.userId });
  const tasks = tasksRes.success ? tasksRes.tasks : [];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 pb-12">
      <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
        <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-white">All Tasks</h1>
            <p className="text-xs text-zinc-500">View and manage your tasks</p>
          </div>
          <span className="text-xs text-zinc-500 font-medium">
            {tasks.length} total
          </span>
        </div>

        {tasks.length === 0 ? (
          <div className="border border-zinc-800 bg-zinc-900/30 rounded-lg p-8 text-center text-zinc-500 text-sm">
            No tasks found.
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map(task => (
              <TaskCard key={task.TaskID} task={task} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
