'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import { apiGetTasks, apiSubmitCheckout, apiLogActivity } from '@/lib/api';
import { getToday } from '@/lib/utils';

export async function submitCheckoutAction(prevState, formData) {
  const session = await getSession();
  if (!session) return { success: false, error: 'Not authenticated' };

  const tomorrowPlan = formData.get('tomorrowPlan') || '';
  const workingHours = Number(formData.get('workingHours')) || 0;
  const postponeReason = formData.get('postponeReason') || '';
  const notes = formData.get('notes') || '';

  if (!tomorrowPlan.trim()) {
    return { success: false, error: "Tomorrow's plan is required" };
  }

  if (workingHours <= 0 || workingHours > 24) {
    return { success: false, error: 'Working hours must be between 0 and 24' };
  }

  const today = getToday();
  const tasksResult = await apiGetTasks({ userId: session.userId, date: today });
  const todayTasks = tasksResult.success ? tasksResult.tasks : [];

  const completedCount = todayTasks.filter(t => t.Status === 'completed').length;
  const postponedCount = todayTasks.filter(t => t.Status === 'postponed').length;
  const pendingCount = todayTasks.filter(t =>
    !['completed', 'cancelled', 'postponed'].includes(t.Status)
  ).length;

  if (postponedCount > 0 && !postponeReason.trim()) {
    return { success: false, error: 'Postpone reason is required when tasks are postponed' };
  }

  const checkoutResult = await apiSubmitCheckout({
    userId: session.userId,
    completedCount,
    pendingCount,
    postponedCount,
    postponeReason: postponeReason.trim(),
    tomorrowPlan: tomorrowPlan.trim(),
    workingHours,
    notes: notes.trim(),
  });

  if (!checkoutResult.success) {
    return { success: false, error: checkoutResult.error };
  }

  await apiLogActivity({
    userId: session.userId,
    action: 'Checked out',
    details: `${completedCount} completed, ${pendingCount} pending`,
  });

  revalidatePath('/dashboard/employee');
  redirect('/dashboard/employee');
}
