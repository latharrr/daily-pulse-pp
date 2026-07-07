'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import { apiCreateTask, apiSubmitCheckin, apiGetTasks, apiLogActivity } from '@/lib/api';
import { getToday } from '@/lib/utils';

export async function submitCheckinAction(prevState, formData) {
  const session = await getSession();
  if (!session) return { success: false, error: 'Not authenticated' };

  const tasksJson = formData.get('tasks');
  const notes = formData.get('notes') || '';
  const blockers = formData.get('blockers') || '';

  let tasks;
  try {
    tasks = JSON.parse(tasksJson);
  } catch {
    return { success: false, error: 'Invalid task data' };
  }

  if (!tasks || tasks.length === 0) {
    return { success: false, error: 'Add at least one task' };
  }

  const today = getToday();

  for (const task of tasks) {
    if (!task.title || task.title.trim() === '') {
      return { success: false, error: 'All tasks must have a title' };
    }

    const createResult = await apiCreateTask({
      userId: session.userId,
      date: today,
      title: task.title.trim(),
      priority: task.priority || 'medium',
      deadline: task.deadline || '',
      estimatedHours: task.estimatedHours ? Number(task.estimatedHours) : 0,
      status: 'planned',
      progress: 0,
      carriedForward: false,
    });

    if (!createResult.success) {
      return { success: false, error: `Failed to create task: ${task.title}` };
    }
  }

  const checkinResult = await apiSubmitCheckin({
    userId: session.userId,
    taskCount: tasks.length,
    notes,
    blockers,
  });

  if (!checkinResult.success) {
    return { success: false, error: checkinResult.error };
  }

  await apiLogActivity({
    userId: session.userId,
    action: 'Checked in',
    details: `${tasks.length} task${tasks.length === 1 ? '' : 's'} planned`,
  });

  revalidatePath('/dashboard/employee');
  redirect('/dashboard/employee');
}

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
