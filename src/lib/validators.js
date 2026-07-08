import { z } from 'zod';
import { TASK_STATUS, PRIORITY } from './constants';

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  username: z.string().min(3, 'Username must be at least 3 characters').regex(/^[a-z0-9_]+$/, 'Only lowercase letters, numbers, underscore'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['admin', 'manager', 'employee']),
  teamId: z.string().optional(),
});

export const createTeamSchema = z.object({
  teamName: z.string().min(1, 'Team name is required'),
  managerId: z.string().optional(),
});

export const taskSchema = z.object({
  title: z.string().min(1, 'Task title is required'),
  priority: z.enum([PRIORITY.LOW, PRIORITY.MEDIUM, PRIORITY.HIGH, PRIORITY.URGENT]).default(PRIORITY.MEDIUM),
  deadline: z.string().optional(),
  estimatedHours: z.coerce.number().min(0).max(24).optional(),
  notes: z.string().optional(),
  blockers: z.string().optional(),
});

export const checkoutSchema = z.object({
  postponeReason: z.string().optional(),
  tomorrowPlan: z.string().min(1, 'Tomorrow\'s plan is required'),
  workingHours: z.coerce.number().min(0).max(24),
  notes: z.string().optional(),
});

export const updateTaskSchema = z.object({
  status: z.enum(Object.values(TASK_STATUS)).optional(),
  progress: z.coerce.number().min(0).max(100).optional(),
  notes: z.string().optional(),
  blockers: z.string().optional(),
});
