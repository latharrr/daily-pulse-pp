'use server';

import { revalidatePath } from 'next/cache';
import { apiCreateUser, apiUpdateUser, apiCreateTeam, apiLogActivity } from '@/lib/api';
import { createUserSchema, createTeamSchema } from '@/lib/validators';

export async function createUserAction(prevState, formData) {
  const raw = {
    name: formData.get('name'),
    username: formData.get('username'),
    password: formData.get('password'),
    role: formData.get('role'),
    teamId: formData.get('teamId') || '',
  };

  const validated = createUserSchema.safeParse(raw);
  if (!validated.success) {
    return {
      success: false,
      error: validated.error.errors.map(e => e.message).join(', '),
    };
  }

  const result = await apiCreateUser(validated.data);
  if (!result.success) {
    return { success: false, error: result.error };
  }

  await apiLogActivity({
    userId: 'system',
    action: 'Created user',
    details: `${validated.data.name} (${validated.data.role})`,
  });

  revalidatePath('/dashboard/admin');
  return { success: true, user: result.user };
}

export async function updateUserAction(data) {
  const result = await apiUpdateUser(data);
  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath('/dashboard/admin');
  revalidatePath('/dashboard/manager');
  return { success: true, user: result.user };
}

export async function resetPasswordAction(userId, newPassword) {
  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters' };
  }

  const result = await apiUpdateUser({ userId, password: newPassword });
  if (!result.success) {
    return { success: false, error: result.error };
  }

  await apiLogActivity({
    userId: 'system',
    action: 'Reset password',
    details: `User ${userId}`,
  });

  revalidatePath('/dashboard/admin');
  return { success: true };
}

export async function toggleUserAction(userId, active) {
  const result = await apiUpdateUser({ userId, active });
  if (!result.success) {
    return { success: false, error: result.error };
  }

  await apiLogActivity({
    userId: 'system',
    action: active ? 'Enabled user' : 'Disabled user',
    details: `User ${userId}`,
  });

  revalidatePath('/dashboard/admin');
  revalidatePath('/dashboard/manager');
  return { success: true };
}

export async function createTeamAction(prevState, formData) {
  const raw = {
    teamName: formData.get('teamName'),
    managerId: formData.get('managerId') || '',
  };

  const validated = createTeamSchema.safeParse(raw);
  if (!validated.success) {
    return {
      success: false,
      error: validated.error.errors.map(e => e.message).join(', '),
    };
  }

  const result = await apiCreateTeam(validated.data);
  if (!result.success) {
    return { success: false, error: result.error };
  }

  await apiLogActivity({
    userId: 'system',
    action: 'Created team',
    details: validated.data.teamName,
  });

  revalidatePath('/dashboard/admin');
  return { success: true, team: result.team };
}
