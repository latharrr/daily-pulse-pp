'use server';

import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import { apiUpdateTask, apiLogActivity } from '@/lib/api';

export async function updateTaskAction(data) {
  const session = await getSession();
  if (!session) return { success: false, error: 'Not authenticated' };

  const result = await apiUpdateTask(data);
  if (!result.success) return { success: false, error: result.error };

  const details = [];
  if (data.status) details.push(`status → ${data.status}`);
  if (data.progress !== undefined) details.push(`progress → ${data.progress}%`);
  if (data.blockers) details.push(`blocker: ${data.blockers}`);

  await apiLogActivity({
    userId: session.userId,
    action: 'Updated task',
    details: details.join(', ') || result.task?.Title || '',
  });

  revalidatePath('/dashboard/employee');
  return { success: true, task: result.task };
}

export async function completeTaskAction(taskId, taskTitle) {
  const session = await getSession();
  if (!session) return { success: false, error: 'Not authenticated' };

  const result = await apiUpdateTask({ taskId, status: 'completed', progress: 100 });
  if (!result.success) return { success: false, error: result.error };

  await apiLogActivity({
    userId: session.userId,
    action: 'Completed task',
    details: taskTitle,
  });

  revalidatePath('/dashboard/employee');
  return { success: true };
}

export async function postponeTaskAction(taskId, taskTitle) {
  const session = await getSession();
  if (!session) return { success: false, error: 'Not authenticated' };

  const result = await apiUpdateTask({ taskId, status: 'postponed' });
  if (!result.success) return { success: false, error: result.error };

  await apiLogActivity({
    userId: session.userId,
    action: 'Postponed task',
    details: taskTitle,
  });

  revalidatePath('/dashboard/employee');
  return { success: true };
}
