'use server';

import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import { apiCreateTask, apiGetTasks, apiLogActivity } from '@/lib/api';
import { getToday } from '@/lib/utils';

export async function carryForwardAction(taskIds, userId) {
  const session = await getSession();
  if (!session) return { success: false, error: 'Not authenticated' };

  const uid = userId || session.userId;
  const today = getToday();

  // Get yesterday's tasks to find the ones to carry forward
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const tasksResult = await apiGetTasks({ userId: uid, date: yesterdayStr });
  if (!tasksResult.success) return { success: false, error: 'Failed to fetch tasks' };

  const tasksToCarry = tasksResult.tasks.filter(t => taskIds.includes(t.TaskID));

  for (const task of tasksToCarry) {
    await apiCreateTask({
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
    });
  }

  await apiLogActivity({
    userId: uid,
    action: 'Carried forward',
    details: `${tasksToCarry.length} task${tasksToCarry.length === 1 ? '' : 's'} from yesterday`,
  });

  revalidatePath('/dashboard/employee');
  return { success: true, count: tasksToCarry.length };
}
