// ── Task Statuses ──
export const TASK_STATUS = {
  PLANNED: 'planned',
  IN_PROGRESS: 'in_progress',
  BLOCKED: 'blocked',
  WAITING_REVIEW: 'waiting_review',
  COMPLETED: 'completed',
  POSTPONED: 'postponed',
  CANCELLED: 'cancelled',
};

export const TASK_STATUS_LABELS = {
  [TASK_STATUS.PLANNED]: 'Planned',
  [TASK_STATUS.IN_PROGRESS]: 'In Progress',
  [TASK_STATUS.BLOCKED]: 'Blocked',
  [TASK_STATUS.WAITING_REVIEW]: 'Waiting Review',
  [TASK_STATUS.COMPLETED]: 'Completed',
  [TASK_STATUS.POSTPONED]: 'Postponed',
  [TASK_STATUS.CANCELLED]: 'Cancelled',
};

export const TASK_STATUS_COLORS = {
  [TASK_STATUS.PLANNED]: '#a1a1aa',
  [TASK_STATUS.IN_PROGRESS]: '#eab308',
  [TASK_STATUS.BLOCKED]: '#ef4444',
  [TASK_STATUS.WAITING_REVIEW]: '#a78bfa',
  [TASK_STATUS.COMPLETED]: '#22c55e',
  [TASK_STATUS.POSTPONED]: '#6b7280',
  [TASK_STATUS.CANCELLED]: '#374151',
};

// ── Priorities ──
export const PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
};

export const PRIORITY_LABELS = {
  [PRIORITY.LOW]: 'Low',
  [PRIORITY.MEDIUM]: 'Medium',
  [PRIORITY.HIGH]: 'High',
  [PRIORITY.URGENT]: 'Urgent',
};

export const PRIORITY_COLORS = {
  [PRIORITY.LOW]: '#6b7280',
  [PRIORITY.MEDIUM]: '#a1a1aa',
  [PRIORITY.HIGH]: '#eab308',
  [PRIORITY.URGENT]: '#ef4444',
};

// ── Live Status ──
export const LIVE_STATUS = {
  WORKING: 'working',
  MEETING: 'meeting',
  BREAK: 'break',
  BLOCKED: 'blocked',
  OFFLINE: 'offline',
};

export const LIVE_STATUS_CONFIG = {
  [LIVE_STATUS.WORKING]: { label: 'Working', emoji: '🟢' },
  [LIVE_STATUS.MEETING]: { label: 'Meeting', emoji: '🤝' },
  [LIVE_STATUS.BREAK]: { label: 'Break', emoji: '☕' },
  [LIVE_STATUS.BLOCKED]: { label: 'Blocked', emoji: '⛔' },
  [LIVE_STATUS.OFFLINE]: { label: 'Offline', emoji: '🏠' },
};

// ── Roles ──
export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
};

// ── Navigation ──
export const NAV_ITEMS = {
  [ROLES.EMPLOYEE]: [
    { label: 'Home', href: '/dashboard/employee', icon: 'home' },
    { label: 'Check In', href: '/dashboard/employee/checkin', icon: 'sunrise' },
    { label: 'Tasks', href: '/dashboard/employee/tasks', icon: 'list' },
    { label: 'Check Out', href: '/dashboard/employee/checkout', icon: 'sunset' },
    { label: 'History', href: '/dashboard/employee/history', icon: 'clock' },
  ],
  [ROLES.MANAGER]: [
    { label: 'Dashboard', href: '/dashboard/manager', icon: 'layout' },
    { label: 'Team', href: '/dashboard/manager', icon: 'users' },
  ],
  [ROLES.ADMIN]: [
    { label: 'Dashboard', href: '/dashboard/admin', icon: 'shield' },
    { label: 'Users', href: '/dashboard/admin', icon: 'users' },
    { label: 'Teams', href: '/dashboard/admin', icon: 'building' },
  ],
};
