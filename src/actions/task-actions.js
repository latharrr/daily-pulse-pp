'use server';

import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import { taskSchema } from '@/lib/validators';
import { apiCreateTask, apiUpdateTask, apiUpdateUser, apiLogActivity } from '@/lib/api';
import { getToday } from '@/lib/utils';

export async function createTaskAction(prevState, formData) {
  const session = await getSession();
  if (!session) return { success: false, error: 'Not authenticated' };

  const raw = {
    title: formData.get('title'),
    priority: formData.get('priority') || 'medium',
    deadline: formData.get('deadline') || '',
    estimatedHours: formData.get('estimatedHours') ? Number(formData.get('estimatedHours')) : 0,
    notes: formData.get('notes') || '',
    blockers: formData.get('blockers') || '',
  };

  const parsed = taskSchema.safeParse(raw);
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    const firstError = Object.values(errors).flat()[0] || 'Validation failed';
    return { success: false, error: firstError };
  }

  const result = await apiCreateTask({
    userId: session.userId,
    date: getToday(),
    ...parsed.data,
  });

  if (!result.success) return { success: false, error: result.error };

  await apiLogActivity({
    userId: session.userId,
    action: 'Created task',
    details: parsed.data.title,
  });

  revalidatePath('/dashboard/employee');
  return { success: true, task: result.task };
}

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

export async function updateLiveStatus(status) {
  const session = await getSession();
  if (!session) return { success: false, error: 'Not authenticated' };

  const result = await apiUpdateUser({ userId: session.userId, liveStatus: status });
  if (!result.success) return { success: false, error: result.error };

  await apiLogActivity({
    userId: session.userId,
    action: 'Status changed',
    details: status,
  });

  revalidatePath('/dashboard/employee');
  return { success: true };
}
