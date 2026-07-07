'use server';

import { redirect } from 'next/navigation';
import { apiLogin } from '@/lib/api';
import { createSession, destroySession } from '@/lib/auth';
import { loginSchema } from '@/lib/validators';

export async function loginAction(prevState, formData) {
  const raw = {
    username: formData.get('username'),
    password: formData.get('password'),
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const firstError = Object.values(fieldErrors).flat()[0];
    return { error: firstError || 'Invalid input' };
  }

  const { username, password } = parsed.data;
  const result = await apiLogin(username, password);

  if (!result.success) {
    return { error: result.error || 'Invalid credentials' };
  }

  await createSession(result.user);

  const role = result.user.Role;
  if (role === 'admin') redirect('/dashboard/admin');
  if (role === 'manager') redirect('/dashboard/manager');
  redirect('/dashboard/employee');
}

export async function logoutAction() {
  await destroySession();
  redirect('/login');
}

export async function getSessionAction() {
  const { getSession } = await import('@/lib/auth');
  return getSession();
}

