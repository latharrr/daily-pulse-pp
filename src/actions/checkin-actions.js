'use server';

import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import { apiCreateTask, apiLogActivity } from '@/lib/api';
import { getToday } from '@/lib/utils';

// Takes the full task objects (not IDs) -- the caller already has them from
// apiGetPendingTasks on initial load, so there's no need to re-fetch
// yesterday's tasks here just to look them back up by ID.
export async function carryForwardAction(tasksToCarry, userId) {
  const session = await getSession();
  if (!session) return { success: false, error: 'Not authenticated' };

  const uid = userId || session.userId;
  const today = getToday();

  const results = await Promise.all(
    tasksToCarry.map(task =>
      apiCreateTask({
        userId: uid,
        date: today,
        title: task.Title,
        priority: task.Priority,
        deadline: task.Deadline || '',
        estimatedHours: task.EstimatedHours || 0,
        status: 'planned',
        progress: 0,
        notes: task.Notes || '',
        blockers: task.Blockers || '',
        carriedForward: true,
      })
    )
  );

  apiLogActivity({
    userId: uid,
    action: 'Carried forward',
    details: `${tasksToCarry.length} task${tasksToCarry.length === 1 ? '' : 's'} from yesterday`,
  }).catch(() => {});

  revalidatePath('/dashboard/employee');
  return {
    success: true,
    count: tasksToCarry.length,
    tasks: results.filter(r => r.success).map(r => r.task),
  };
}
