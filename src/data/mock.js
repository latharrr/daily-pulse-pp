// ── Mock Data for Development ──
// Used when GOOGLE_SCRIPT_URL is not configured

import { uuid, getToday, getYesterday } from '@/lib/utils';

const today = getToday();
const yesterday = getYesterday();

export const MOCK_USERS = [
  { UserID: 'admin-1', Name: 'Admin', Username: 'admin', Role: 'admin', TeamID: '', LiveStatus: 'offline', Active: true, CreatedAt: '2025-01-01T00:00:00Z' },
  { UserID: 'mgr-1', Name: 'Priya Sharma', Username: 'priya', Role: 'manager', TeamID: 'team-1', LiveStatus: 'working', Active: true, CreatedAt: '2025-01-01T00:00:00Z' },
  { UserID: 'emp-1', Name: 'Rahul Mehta', Username: 'rahul', Role: 'employee', TeamID: 'team-1', LiveStatus: 'working', Active: true, CreatedAt: '2025-01-01T00:00:00Z' },
  { UserID: 'emp-2', Name: 'Aryan Singh', Username: 'aryan', Role: 'employee', TeamID: 'team-1', LiveStatus: 'blocked', Active: true, CreatedAt: '2025-01-01T00:00:00Z' },
  { UserID: 'emp-3', Name: 'Aman Gupta', Username: 'aman', Role: 'employee', TeamID: 'team-1', LiveStatus: 'offline', Active: true, CreatedAt: '2025-01-01T00:00:00Z' },
  { UserID: 'emp-4', Name: 'Sneha Patel', Username: 'sneha', Role: 'employee', TeamID: 'team-1', LiveStatus: 'meeting', Active: true, CreatedAt: '2025-01-01T00:00:00Z' },
  { UserID: 'emp-5', Name: 'Deepak Kumar', Username: 'deepak', Role: 'employee', TeamID: 'team-1', LiveStatus: 'break', Active: true, CreatedAt: '2025-01-01T00:00:00Z' },
];

export const MOCK_TEAMS = [
  { TeamID: 'team-1', TeamName: 'Engineering', ManagerID: 'mgr-1' },
  { TeamID: 'team-2', TeamName: 'Design', ManagerID: '' },
];

export const MOCK_TASKS = [
  { TaskID: 'task-1', UserID: 'emp-1', Date: today, Title: 'Build login page', Priority: 'high', Deadline: today, EstimatedHours: 3, Status: 'in_progress', Progress: 65, Notes: '', Blockers: '', CarriedForward: false, CreatedAt: `${today}T09:05:00Z`, UpdatedAt: `${today}T14:30:00Z`, CompletedAt: '' },
  { TaskID: 'task-2', UserID: 'emp-1', Date: today, Title: 'Write API tests', Priority: 'medium', Deadline: today, EstimatedHours: 2, Status: 'planned', Progress: 0, Notes: '', Blockers: '', CarriedForward: false, CreatedAt: `${today}T09:05:00Z`, UpdatedAt: `${today}T09:05:00Z`, CompletedAt: '' },
  { TaskID: 'task-3', UserID: 'emp-2', Date: today, Title: 'API integration', Priority: 'urgent', Deadline: yesterday, EstimatedHours: 4, Status: 'blocked', Progress: 30, Notes: 'Waiting for backend team', Blockers: 'Backend API not ready', CarriedForward: true, CreatedAt: `${yesterday}T09:00:00Z`, UpdatedAt: `${today}T11:00:00Z`, CompletedAt: '' },
  { TaskID: 'task-4', UserID: 'emp-4', Date: today, Title: 'Dashboard mockups', Priority: 'high', Deadline: today, EstimatedHours: 5, Status: 'in_progress', Progress: 80, Notes: 'Almost done', Blockers: '', CarriedForward: false, CreatedAt: `${today}T09:10:00Z`, UpdatedAt: `${today}T15:00:00Z`, CompletedAt: '' },
  { TaskID: 'task-5', UserID: 'emp-5', Date: today, Title: 'Code review PR #42', Priority: 'medium', Deadline: today, EstimatedHours: 1, Status: 'completed', Progress: 100, Notes: 'Approved with minor comments', Blockers: '', CarriedForward: false, CreatedAt: `${today}T09:15:00Z`, UpdatedAt: `${today}T11:30:00Z`, CompletedAt: `${today}T11:30:00Z` },
  { TaskID: 'task-6', UserID: 'emp-5', Date: today, Title: 'Fix payment bug', Priority: 'urgent', Deadline: today, EstimatedHours: 2, Status: 'completed', Progress: 100, Notes: '', Blockers: '', CarriedForward: false, CreatedAt: `${today}T09:15:00Z`, UpdatedAt: `${today}T13:00:00Z`, CompletedAt: `${today}T13:00:00Z` },
  { TaskID: 'task-7', UserID: 'emp-5', Date: today, Title: 'Update documentation', Priority: 'low', Deadline: today, EstimatedHours: 1, Status: 'completed', Progress: 100, Notes: '', Blockers: '', CarriedForward: false, CreatedAt: `${today}T09:15:00Z`, UpdatedAt: `${today}T14:00:00Z`, CompletedAt: `${today}T14:00:00Z` },
  { TaskID: 'task-8', UserID: 'emp-5', Date: today, Title: 'Deploy to staging', Priority: 'high', Deadline: today, EstimatedHours: 1, Status: 'completed', Progress: 100, Notes: 'Deployed v2.1.0', Blockers: '', CarriedForward: false, CreatedAt: `${today}T14:00:00Z`, UpdatedAt: `${today}T15:30:00Z`, CompletedAt: `${today}T15:30:00Z` },
  // Yesterday's pending tasks for carry forward demo
  { TaskID: 'task-y1', UserID: 'emp-1', Date: yesterday, Title: 'Refactor auth module', Priority: 'medium', Deadline: today, EstimatedHours: 3, Status: 'in_progress', Progress: 40, Notes: '', Blockers: '', CarriedForward: false, CreatedAt: `${yesterday}T09:00:00Z`, UpdatedAt: `${yesterday}T17:00:00Z`, CompletedAt: '' },
  { TaskID: 'task-y2', UserID: 'emp-1', Date: yesterday, Title: 'Set up CI/CD pipeline', Priority: 'high', Deadline: today, EstimatedHours: 4, Status: 'planned', Progress: 0, Notes: '', Blockers: '', CarriedForward: false, CreatedAt: `${yesterday}T09:00:00Z`, UpdatedAt: `${yesterday}T09:00:00Z`, CompletedAt: '' },
];

export const MOCK_CHECKINS = [
  { CheckinID: 'ci-1', UserID: 'emp-1', Date: today, TaskCount: 2, Notes: 'Focused on login flow today', Blockers: '', SubmittedAt: `${today}T09:05:00Z` },
  { CheckinID: 'ci-2', UserID: 'emp-2', Date: today, TaskCount: 1, Notes: '', Blockers: 'Backend API not ready', SubmittedAt: `${today}T09:20:00Z` },
  { CheckinID: 'ci-4', UserID: 'emp-4', Date: today, TaskCount: 1, Notes: '', Blockers: '', SubmittedAt: `${today}T09:10:00Z` },
  { CheckinID: 'ci-5', UserID: 'emp-5', Date: today, TaskCount: 4, Notes: 'Big day planned', Blockers: '', SubmittedAt: `${today}T09:15:00Z` },
];

export const MOCK_CHECKOUTS = [
  { CheckoutID: 'co-5', UserID: 'emp-5', Date: today, CompletedCount: 4, PendingCount: 0, PostponedCount: 0, PostponeReason: '', TomorrowPlan: 'Start mobile responsive', WorkingHours: 8, Notes: 'Great day, shipped 4 tasks', SubmittedAt: `${today}T17:40:00Z` },
];

export const MOCK_ACTIVITY = [
  { LogID: 'log-1', UserID: 'emp-1', Action: 'Checked in', Details: '2 tasks planned', Timestamp: `${today}T09:05:00Z` },
  { LogID: 'log-2', UserID: 'emp-2', Action: 'Checked in', Details: '1 task planned', Timestamp: `${today}T09:20:00Z` },
  { LogID: 'log-3', UserID: 'emp-4', Action: 'Checked in', Details: '1 task planned', Timestamp: `${today}T09:10:00Z` },
  { LogID: 'log-4', UserID: 'emp-5', Action: 'Checked in', Details: '4 tasks planned', Timestamp: `${today}T09:15:00Z` },
  { LogID: 'log-5', UserID: 'emp-1', Action: 'Started task', Details: 'Build login page', Timestamp: `${today}T09:30:00Z` },
  { LogID: 'log-6', UserID: 'emp-5', Action: 'Completed task', Details: 'Code review PR #42', Timestamp: `${today}T11:30:00Z` },
  { LogID: 'log-7', UserID: 'emp-2', Action: 'Added blocker', Details: 'Backend API not ready', Timestamp: `${today}T11:00:00Z` },
  { LogID: 'log-8', UserID: 'emp-5', Action: 'Completed task', Details: 'Fix payment bug', Timestamp: `${today}T13:00:00Z` },
  { LogID: 'log-9', UserID: 'emp-1', Action: 'Updated progress', Details: 'Build login page — 65%', Timestamp: `${today}T14:30:00Z` },
  { LogID: 'log-10', UserID: 'emp-5', Action: 'Completed task', Details: 'Update documentation', Timestamp: `${today}T14:00:00Z` },
  { LogID: 'log-11', UserID: 'emp-4', Action: 'Updated progress', Details: 'Dashboard mockups — 80%', Timestamp: `${today}T15:00:00Z` },
  { LogID: 'log-12', UserID: 'emp-5', Action: 'Completed task', Details: 'Deploy to staging', Timestamp: `${today}T15:30:00Z` },
  { LogID: 'log-13', UserID: 'emp-5', Action: 'Checked out', Details: '4 completed, 0 pending', Timestamp: `${today}T17:40:00Z` },
];

// ── Passwords (all mock users use "password123") ──
export const MOCK_PASSWORDS = {
  'admin': 'admin123',
  'priya': 'password123',
  'rahul': 'password123',
  'aryan': 'password123',
  'aman': 'password123',
  'sneha': 'password123',
  'deepak': 'password123',
};
