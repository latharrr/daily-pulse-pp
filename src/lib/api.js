'use server';

import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { taskSchema, updateTaskSchema, checkoutSchema } from '@/lib/validators';

// ============================================
// Google Sheets API wrapper
// All reads/writes go to the Apps Script backend (see google-apps-script/Code.gs).
// ============================================

const SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL;
const SCRIPT_TOKEN = process.env.GOOGLE_SCRIPT_TOKEN;

if (!SCRIPT_URL) {
  throw new Error('GOOGLE_SCRIPT_URL is not configured. Set it in your environment (see .env.example).');
}

async function callAPI(action, data = {}) {
  const res = await fetch(SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, data, token: SCRIPT_TOKEN }),
  });
  if (!res.ok) {
    return { success: false, error: `Backend request failed (${res.status})` };
  }
  return res.json();
}

// Never let PasswordHash leave the server boundary — every response that
// includes user records (which may be handed to a client component as
// props) must run them through this first.
function sanitizeUser(user) {
  if (!user) return user;
  const { PasswordHash, ...safe } = user;
  return safe;
}

// Employee task/checkin/checkout writes happen outside the manager's and
// admin's own requests, so their dashboards need an explicit nudge to
// refetch — otherwise the router cache keeps serving stale data.
function revalidateDashboards() {
  revalidatePath('/dashboard/manager');
  revalidatePath('/dashboard/admin');
}

// ── Exported API ──

export async function apiLogin(username, password) {
  const result = await callAPI('getUserAuth', { username });
  if (!result.success || !result.user) {
    return { success: false, error: 'Invalid credentials' };
  }

  const { user } = result;
  if (!user.Active) {
    return { success: false, error: 'Invalid credentials' };
  }

  const match = await bcrypt.compare(password, user.PasswordHash || '');
  if (!match) {
    return { success: false, error: 'Invalid credentials' };
  }

  return { success: true, user: sanitizeUser(user) };
}

export async function apiGetUsers(filters = {}) {
  return callAPI('getUsers', filters);
}

export async function apiCreateUser(data) {
  const passwordHash = await bcrypt.hash(data.password, 10);
  const { password, ...rest } = data;
  return callAPI('createUser', { ...rest, passwordHash });
}

export async function apiUpdateUser(data) {
  if (data.password) {
    const passwordHash = await bcrypt.hash(data.password, 10);
    const { password, ...rest } = data;
    return callAPI('updateUser', { ...rest, passwordHash });
  }
  return callAPI('updateUser', data);
}

export async function apiGetTeams() {
  return callAPI('getTeams');
}

export async function apiCreateTeam(data) {
  return callAPI('createTeam', data);
}

export async function apiGetTasks(filters = {}) {
  return callAPI('getTasks', filters);
}

export async function apiCreateTask(data) {
  if (!data.userId) return { success: false, error: 'userId is required' };

  const parsed = taskSchema.safeParse(data);
  if (!parsed.success) {
    const firstError = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
    return { success: false, error: firstError || 'Invalid task data' };
  }

  const result = await callAPI('createTask', data);
  if (result.success) revalidateDashboards();
  return result;
}

export async function apiUpdateTask(data) {
  if (!data.taskId) return { success: false, error: 'taskId is required' };

  const parsed = updateTaskSchema.safeParse(data);
  if (!parsed.success) {
    const firstError = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
    return { success: false, error: firstError || 'Invalid task data' };
  }

  const result = await callAPI('updateTask', data);
  if (result.success) revalidateDashboards();
  return result;
}

export async function apiGetPendingTasks(userId) {
  return callAPI('getPendingTasks', { userId });
}

export async function apiSubmitCheckin(data) {
  const result = await callAPI('submitCheckin', data);
  if (result.success) revalidateDashboards();
  return result;
}

export async function apiGetCheckins(filters = {}) {
  return callAPI('getCheckins', filters);
}

export async function apiSubmitCheckout(data) {
  if (!data.userId) return { success: false, error: 'userId is required' };

  const parsed = checkoutSchema.safeParse(data);
  if (!parsed.success) {
    const firstError = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
    return { success: false, error: firstError || 'Invalid checkout data' };
  }

  const result = await callAPI('submitCheckout', data);
  if (result.success) revalidateDashboards();
  return result;
}

export async function apiGetCheckouts(filters = {}) {
  return callAPI('getCheckouts', filters);
}

export async function apiGetDashboard(filters = {}) {
  return callAPI('getDashboard', filters);
}

export async function apiLogActivity(data) {
  return callAPI('logActivity', data);
}

export async function apiGetActivityLog(filters = {}) {
  return callAPI('getActivityLog', filters);
}
