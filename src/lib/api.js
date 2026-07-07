'use server';

import { MOCK_USERS, MOCK_TEAMS, MOCK_TASKS, MOCK_CHECKINS, MOCK_CHECKOUTS, MOCK_ACTIVITY, MOCK_PASSWORDS } from '@/data/mock';
import { uuid, getToday, getYesterday } from '@/lib/utils';

// ── In-memory store (resets on server restart) ──
// In production, replace with Google Sheets API calls

let users = [...MOCK_USERS];
let teams = [...MOCK_TEAMS];
let tasks = [...MOCK_TASKS];
let checkins = [...MOCK_CHECKINS];
let checkouts = [...MOCK_CHECKOUTS];
let activityLogs = [...MOCK_ACTIVITY];

// ============================================
// Google Sheets API wrapper
// When GOOGLE_SCRIPT_URL is set, calls the Apps Script.
// Otherwise, uses in-memory mock data.
// ============================================

const SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL;

async function callAPI(action, data = {}) {
  if (SCRIPT_URL) {
    const res = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, data }),
    });
    return res.json();
  }
  // Mock mode
  return mockHandler(action, data);
}

function mockHandler(action, data) {
  switch (action) {
    case 'login': return mockLogin(data);
    case 'getUsers': return mockGetUsers(data);
    case 'createUser': return mockCreateUser(data);
    case 'updateUser': return mockUpdateUser(data);
    case 'getTeams': return { success: true, teams };
    case 'createTeam': return mockCreateTeam(data);
    case 'getTasks': return mockGetTasks(data);
    case 'createTask': return mockCreateTask(data);
    case 'updateTask': return mockUpdateTask(data);
    case 'getPendingTasks': return mockGetPendingTasks(data);
    case 'submitCheckin': return mockSubmitCheckin(data);
    case 'getCheckins': return mockGetCheckins(data);
    case 'submitCheckout': return mockSubmitCheckout(data);
    case 'getCheckouts': return mockGetCheckouts(data);
    case 'getDashboard': return mockGetDashboard(data);
    case 'logActivity': return mockLogActivity(data);
    case 'getActivityLog': return mockGetActivityLog(data);
    default: return { success: false, error: 'Unknown action' };
  }
}

// ── Mock Implementations ──

function mockLogin(data) {
  const user = users.find(u => u.Username === data.username && u.Active);
  if (!user) return { success: false, error: 'Invalid credentials' };
  if (MOCK_PASSWORDS[data.username] !== data.password) {
    return { success: false, error: 'Invalid credentials' };
  }
  return { success: true, user };
}

function mockGetUsers(data) {
  let result = [...users];
  if (data?.teamId) result = result.filter(u => u.TeamID === data.teamId);
  if (data?.role) result = result.filter(u => u.Role === data.role);
  if (data?.activeOnly) result = result.filter(u => u.Active);
  return { success: true, users: result };
}

function mockCreateUser(data) {
  if (users.find(u => u.Username === data.username)) {
    return { success: false, error: 'Username already exists' };
  }
  const user = {
    UserID: uuid(),
    Name: data.name,
    Username: data.username,
    Role: data.role || 'employee',
    TeamID: data.teamId || '',
    LiveStatus: 'offline',
    Active: true,
    CreatedAt: new Date().toISOString(),
  };
  users.push(user);
  MOCK_PASSWORDS[data.username] = data.password;
  return { success: true, user };
}

function mockUpdateUser(data) {
  const idx = users.findIndex(u => u.UserID === data.userId);
  if (idx === -1) return { success: false, error: 'User not found' };
  if (data.name !== undefined) users[idx].Name = data.name;
  if (data.teamId !== undefined) users[idx].TeamID = data.teamId;
  if (data.role !== undefined) users[idx].Role = data.role;
  if (data.active !== undefined) users[idx].Active = data.active;
  if (data.liveStatus !== undefined) users[idx].LiveStatus = data.liveStatus;
  if (data.password !== undefined) MOCK_PASSWORDS[users[idx].Username] = data.password;
  return { success: true, user: users[idx] };
}

function mockCreateTeam(data) {
  const team = {
    TeamID: uuid(),
    TeamName: data.teamName,
    ManagerID: data.managerId || '',
  };
  teams.push(team);
  return { success: true, team };
}

function mockGetTasks(data) {
  let result = [...tasks];
  if (data?.userId) result = result.filter(t => t.UserID === data.userId);
  if (data?.date) result = result.filter(t => t.Date === data.date);
  if (data?.status) result = result.filter(t => t.Status === data.status);
  return { success: true, tasks: result };
}

function mockCreateTask(data) {
  const task = {
    TaskID: uuid(),
    UserID: data.userId,
    Date: data.date || getToday(),
    Title: data.title,
    Priority: data.priority || 'medium',
    Deadline: data.deadline || '',
    EstimatedHours: data.estimatedHours || 0,
    Status: data.status || 'planned',
    Progress: data.progress || 0,
    Notes: data.notes || '',
    Blockers: data.blockers || '',
    CarriedForward: data.carriedForward || false,
    CreatedAt: new Date().toISOString(),
    UpdatedAt: new Date().toISOString(),
    CompletedAt: '',
    AssignedBy: data.assignedBy || data.userId,
  };
  tasks.push(task);
  return { success: true, task };
}

function mockUpdateTask(data) {
  const idx = tasks.findIndex(t => t.TaskID === data.taskId);
  if (idx === -1) return { success: false, error: 'Task not found' };
  if (data.title !== undefined) tasks[idx].Title = data.title;
  if (data.priority !== undefined) tasks[idx].Priority = data.priority;
  if (data.deadline !== undefined) tasks[idx].Deadline = data.deadline;
  if (data.estimatedHours !== undefined) tasks[idx].EstimatedHours = data.estimatedHours;
  if (data.status !== undefined) tasks[idx].Status = data.status;
  if (data.progress !== undefined) tasks[idx].Progress = data.progress;
  if (data.notes !== undefined) tasks[idx].Notes = data.notes;
  if (data.blockers !== undefined) tasks[idx].Blockers = data.blockers;
  tasks[idx].UpdatedAt = new Date().toISOString();
  if (data.status === 'completed') {
    tasks[idx].CompletedAt = new Date().toISOString();
    tasks[idx].Progress = 100;
  }
  return { success: true, task: tasks[idx] };
}

function mockGetPendingTasks(data) {
  const yesterday = getYesterday();
  const pending = tasks.filter(t =>
    t.UserID === data.userId &&
    t.Date === yesterday &&
    !['completed', 'cancelled'].includes(t.Status)
  );
  return { success: true, tasks: pending, date: yesterday };
}

function mockSubmitCheckin(data) {
  const todayStr = getToday();
  const existing = checkins.find(c => c.UserID === data.userId && c.Date === todayStr);
  if (existing) return { success: false, error: 'Already checked in today' };

  const checkin = {
    CheckinID: uuid(),
    UserID: data.userId,
    Date: todayStr,
    TaskCount: data.taskCount || 0,
    Notes: data.notes || '',
    Blockers: data.blockers || '',
    SubmittedAt: new Date().toISOString(),
  };
  checkins.push(checkin);

  // Update live status
  const userIdx = users.findIndex(u => u.UserID === data.userId);
  if (userIdx !== -1) users[userIdx].LiveStatus = 'working';

  return { success: true, checkin };
}

function mockGetCheckins(data) {
  let result = [...checkins];
  if (data?.userId) result = result.filter(c => c.UserID === data.userId);
  if (data?.date) result = result.filter(c => c.Date === data.date);
  return { success: true, checkins: result };
}

function mockSubmitCheckout(data) {
  const todayStr = getToday();
  const existing = checkouts.find(c => c.UserID === data.userId && c.Date === todayStr);
  if (existing) return { success: false, error: 'Already checked out today' };

  const checkout = {
    CheckoutID: uuid(),
    UserID: data.userId,
    Date: todayStr,
    CompletedCount: data.completedCount || 0,
    PendingCount: data.pendingCount || 0,
    PostponedCount: data.postponedCount || 0,
    PostponeReason: data.postponeReason || '',
    TomorrowPlan: data.tomorrowPlan || '',
    WorkingHours: data.workingHours || 0,
    Notes: data.notes || '',
    SubmittedAt: new Date().toISOString(),
  };
  checkouts.push(checkout);

  const userIdx = users.findIndex(u => u.UserID === data.userId);
  if (userIdx !== -1) users[userIdx].LiveStatus = 'offline';

  return { success: true, checkout };
}

function mockGetCheckouts(data) {
  let result = [...checkouts];
  if (data?.userId) result = result.filter(c => c.UserID === data.userId);
  if (data?.date) result = result.filter(c => c.Date === data.date);
  return { success: true, checkouts: result };
}

function mockGetDashboard(data) {
  const todayStr = getToday();
  let teamUsers = users.filter(u => u.Active && u.Role !== 'admin');
  if (data?.teamId) {
    teamUsers = teamUsers.filter(u => u.TeamID === data.teamId);
  }

  const teamUserIds = teamUsers.map(u => u.UserID);
  const todayCheckins = checkins.filter(c => c.Date === todayStr && teamUserIds.includes(c.UserID));
  const checkedInIds = todayCheckins.map(c => c.UserID);
  const todayTasks = tasks.filter(t => t.Date === todayStr && teamUserIds.includes(t.UserID));

  const completed = todayTasks.filter(t => t.Status === 'completed').length;
  const pending = todayTasks.filter(t => ['planned', 'in_progress', 'waiting_review'].includes(t.Status)).length;
  const blocked = todayTasks.filter(t => t.Status === 'blocked').length;
  const delayed = todayTasks.filter(t => {
    if (!t.Deadline) return false;
    return new Date(t.Deadline) < new Date() && !['completed', 'cancelled'].includes(t.Status);
  }).length;

  const members = teamUsers.map(u => {
    const isCheckedIn = checkedInIds.includes(u.UserID);
    const userTasks = todayTasks.filter(t => t.UserID === u.UserID);
    const currentTask = userTasks.find(t => t.Status === 'in_progress') || userTasks[0] || null;
    return {
      ...u,
      checkedIn: isCheckedIn,
      currentTask: currentTask?.Title || null,
      currentTaskStatus: currentTask?.Status || null,
      currentTaskProgress: currentTask?.Progress || null,
      taskCount: userTasks.length,
      completedCount: userTasks.filter(t => t.Status === 'completed').length,
    };
  });

  return {
    success: true,
    dashboard: {
      totalMembers: members.length,
      checkedIn: checkedInIds.length,
      notCheckedIn: members.filter(m => !m.checkedIn).length,
      totalTasks: todayTasks.length,
      completed,
      pending,
      blocked,
      delayed,
      completionRate: todayTasks.length > 0 ? Math.round((completed / todayTasks.length) * 100) : 0,
      members,
      notCheckedInList: members.filter(m => !m.checkedIn),
      todayTasks,
    },
  };
}

function mockLogActivity(data) {
  const log = {
    LogID: uuid(),
    UserID: data.userId,
    Action: data.action,
    Details: data.details || '',
    Timestamp: new Date().toISOString(),
  };
  activityLogs.unshift(log);
  return { success: true, log };
}

function mockGetActivityLog(data) {
  let result = [...activityLogs];
  if (data?.userId) result = result.filter(l => l.UserID === data.userId);
  if (data?.date) result = result.filter(l => l.Timestamp.startsWith(data.date));
  result.sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp));
  return { success: true, logs: result.slice(0, 100) };
}

// ── Exported API ──

export async function apiLogin(username, password) {
  return callAPI('login', { username, password });
}

export async function apiGetUsers(filters = {}) {
  return callAPI('getUsers', filters);
}

export async function apiCreateUser(data) {
  return callAPI('createUser', data);
}

export async function apiUpdateUser(data) {
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
  return callAPI('createTask', data);
}

export async function apiUpdateTask(data) {
  return callAPI('updateTask', data);
}

export async function apiGetPendingTasks(userId) {
  return callAPI('getPendingTasks', { userId });
}

export async function apiSubmitCheckin(data) {
  return callAPI('submitCheckin', data);
}

export async function apiGetCheckins(filters = {}) {
  return callAPI('getCheckins', filters);
}

export async function apiSubmitCheckout(data) {
  return callAPI('submitCheckout', data);
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
