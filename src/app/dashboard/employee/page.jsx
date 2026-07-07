'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiGetCheckins, apiGetCheckouts, apiGetTasks, apiSubmitCheckin, apiSubmitCheckout, apiUpdateTask, apiCreateTask, apiGetPendingTasks } from '@/lib/api';
import { getToday, getGreeting, formatDate } from '@/lib/utils';
import { logoutAction, getSessionAction } from '@/actions/auth-actions';

export default function EmployeeDashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // States
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [isCheckedOut, setIsCheckedOut] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [pendingCarryForward, setPendingCarryForward] = useState([]);
  const [logs, setLogs] = useState([]);

  // Form inputs
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');
  const [newTaskDeadline, setNewTaskDeadline] = useState('');
  const [notes, setNotes] = useState('');
  const [blockers, setBlockers] = useState('');
  const [tomorrowTasks, setTomorrowTasks] = useState([]);
  const [tomorrowTaskTitle, setTomorrowTaskTitle] = useState('');

  // Step states
  const [viewState, setViewState] = useState('checkin'); // checkin, active, checkout, complete

  const [isPending, startTransition] = useTransition();

  // Load session & today's data
  useEffect(() => {
    async function loadData() {
      // Get session client-side using server action
      const sess = await getSessionAction();
      if (!sess) {
        router.push('/login');
        return;
      }

      setSession(sess);

      const todayStr = getToday();

      const [checkinsRes, checkoutsRes, tasksRes, pendingRes] = await Promise.all([
        apiGetCheckins({ userId: sess.userId, date: todayStr }),
        apiGetCheckouts({ userId: sess.userId, date: todayStr }),
        apiGetTasks({ userId: sess.userId, date: todayStr }),
        apiGetPendingTasks(sess.userId),
      ]);

      const hasCheckin = checkinsRes.success && checkinsRes.checkins.length > 0;
      const hasCheckout = checkoutsRes.success && checkoutsRes.checkouts.length > 0;

      setIsCheckedIn(hasCheckin);
      setIsCheckedOut(hasCheckout);

      if (tasksRes.success) {
        setTasks(tasksRes.tasks);
      }

      if (pendingRes.success) {
        setPendingCarryForward(pendingRes.tasks);
      }

      if (hasCheckout) {
        setViewState('complete');
      } else if (hasCheckin) {
        setViewState('active');
      } else {
        setViewState('checkin');
      }

      setLoading(false);
    }
    loadData();
  }, [router]);

  // Handle status toggle (Planned -> Completed -> Blocked -> Planned)
  function handleToggleTaskStatus(task) {
    let nextStatus = 'planned';
    let nextProgress = 0;
    let nextBlockers = '';

    if (task.Status === 'planned' || task.Status === 'in_progress') {
      nextStatus = 'completed';
      nextProgress = 100;
    } else if (task.Status === 'completed') {
      nextStatus = 'blocked';
      nextProgress = 50;
      nextBlockers = 'Blocked';
    } else {
      nextStatus = 'planned';
      nextProgress = 0;
    }

    // Optimistic UI update
    setTasks(prev =>
      prev.map(t =>
        t.TaskID === task.TaskID
          ? { ...t, Status: nextStatus, Progress: nextProgress, Blockers: nextBlockers }
          : t
      )
    );

    startTransition(async () => {
      await apiUpdateTask({
        taskId: task.TaskID,
        status: nextStatus,
        progress: nextProgress,
        blockers: nextBlockers,
      });

      // Log activity
      await apiSubmitCheckout // Wait, use apiLogActivity
      const { apiLogActivity } = await import('@/lib/api');
      await apiLogActivity({
        userId: session.userId,
        action: 'Toggled task status',
        details: `${task.Title} → ${nextStatus}`,
      });
    });
  }

  // Add task to checklist during planning
  function handleAddTaskToList(e) {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const tempId = 'temp-' + Date.now();
    setTasks(prev => [
      ...prev,
      {
        TaskID: tempId,
        Title: newTaskTitle.trim(),
        Priority: newTaskPriority,
        Deadline: newTaskDeadline || getToday(),
        Status: 'planned',
        Progress: 0,
      },
    ]);

    setNewTaskTitle('');
    setNewTaskPriority('medium');
    setNewTaskDeadline('');
  }

  function handleQuickAddTaskActive(e) {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const title = newTaskTitle.trim();
    setNewTaskTitle('');

    startTransition(async () => {
      const res = await apiCreateTask({
        userId: session.userId,
        title,
        priority: 'medium',
        status: 'planned',
        progress: 0,
        assignedBy: session.userId,
        date: getToday(),
      });
      if (res.success) {
        setTasks(prev => [...prev, res.task]);
      }
    });
  }


  // Start Day Submission
  function handleStartDay() {
    if (tasks.length === 0) {
      alert('Please add at least one task for your day.');
      return;
    }

    startTransition(async () => {
      // 1. Create all tasks
      for (const t of tasks) {
        await apiCreateTask({
          userId: session.userId,
          title: t.Title,
          priority: t.Priority,
          deadline: t.Deadline,
          status: 'planned',
          progress: 0,
        });
      }

      // 2. Submit checkin record
      await apiSubmitCheckin({
        userId: session.userId,
        taskCount: tasks.length,
        notes,
        blockers,
      });

      // Log activity
      const { apiLogActivity } = await import('@/lib/api');
      await apiLogActivity({
        userId: session.userId,
        action: 'Checked in',
        details: `${tasks.length} tasks planned`,
      });

      // Refresh tasks to get real database IDs
      const tasksRes = await apiGetTasks({ userId: session.userId, date: getToday() });
      if (tasksRes.success) setTasks(tasksRes.tasks);

      setIsCheckedIn(true);
      setViewState('active');
    });
  }

  // Carry Forward all pending tasks with one click
  function handleCarryForwardAll() {
    startTransition(async () => {
      const { carryForwardAction } = await import('@/actions/checkin-actions');
      const taskIds = pendingCarryForward.map(t => t.TaskID);
      const res = await carryForwardAction(taskIds, session.userId);
      if (res.success) {
        // Reload tasks for today
        const tasksRes = await apiGetTasks({ userId: session.userId, date: getToday() });
        if (tasksRes.success) {
          setTasks(tasksRes.tasks);
        }
        setPendingCarryForward([]);
      }
    });
  }

  // End of Day Submission
  function handleEndDay(skipPlanning = false) {
    startTransition(async () => {
      const completedCount = tasks.filter(t => t.Status === 'completed').length;
      const pendingCount = tasks.filter(t => t.Status === 'planned' || t.Status === 'in_progress').length;
      const postponedCount = tasks.filter(t => t.Status === 'postponed' || t.Status === 'blocked').length;

      // 1. Submit checkout
      await apiSubmitCheckout({
        userId: session.userId,
        completedCount,
        pendingCount,
        postponedCount,
        tomorrowPlan: tomorrowTasks.map(t => t.title).join(', ') || 'Plan tomorrow morning',
        workingHours: 8,
      });

      // 2. Create tomorrow's tasks if planned
      if (!skipPlanning && tomorrowTasks.length > 0) {
        const tomorrowStr = new Date();
        tomorrowStr.setDate(tomorrowStr.getDate() + 1);
        const tomorrowDateStr = tomorrowStr.toISOString().split('T')[0];

        for (const t of tomorrowTasks) {
          await apiCreateTask({
            userId: session.userId,
            date: tomorrowDateStr,
            title: t.title,
            priority: t.priority,
            status: 'planned',
            progress: 0,
          });
        }
      }

      // Log activity
      const { apiLogActivity } = await import('@/lib/api');
      await apiLogActivity({
        userId: session.userId,
        action: 'Checked out',
        details: `${completedCount} completed, ${pendingCount} pending`,
      });

      setIsCheckedOut(true);
      setViewState('complete');
    });
  }

  function handleAddTomorrowTask(e) {
    e.preventDefault();
    if (!tomorrowTaskTitle.trim()) return;

    setTomorrowTasks(prev => [
      ...prev,
      { title: tomorrowTaskTitle.trim(), priority: 'medium' },
    ]);
    setTomorrowTaskTitle('');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-500 text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col justify-between pb-6">
      <div className="max-w-md w-full mx-auto px-4 py-6 space-y-6 flex-1">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">Daily Pulse</h1>
            <p className="text-xs text-zinc-500">{formatDate(getToday())}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-zinc-500 font-mono">@{session?.username}</span>
          </div>
        </div>

        {/* VIEW 1: MORNING PLAN / CHECK-IN */}
        {viewState === 'checkin' && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-white">Plan your day</h2>
              <p className="text-xs text-zinc-500">What are you getting done today?</p>
            </div>

            {/* Carry Forward Yesterday's Tasks */}
            {pendingCarryForward.length > 0 && (
              <div className="bg-[#111113] border border-zinc-800 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400 font-medium">Pending from yesterday</span>
                  <button
                    onClick={handleCarryForwardAll}
                    disabled={isPending}
                    className="text-[10px] bg-white text-zinc-950 font-semibold px-2 py-1 rounded hover:bg-zinc-200 transition-colors disabled:opacity-50"
                  >
                    Carry All Forward
                  </button>
                </div>
                <div className="space-y-1 text-xs text-zinc-500">
                  {pendingCarryForward.map(t => (
                    <div key={t.TaskID} className="truncate">⏳ {t.Title}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Add Task Input */}
            <form onSubmit={handleAddTaskToList} className="flex gap-2">
              <input
                type="text"
                required
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                placeholder="Type a task and hit enter..."
                className="flex-1 h-9 px-3 text-sm text-white bg-[#111113] border border-zinc-800 rounded-lg outline-none placeholder:text-zinc-600 focus:border-zinc-700 transition-colors"
              />
              <button
                type="submit"
                className="h-9 w-9 bg-white text-black font-semibold rounded-lg hover:bg-zinc-200 transition-colors flex items-center justify-center text-sm"
              >
                +
              </button>
            </form>

            {/* Added Tasks checklist */}
            <div className="space-y-2">
              {tasks.length > 0 && (
                <div className="space-y-1">
                  {tasks.map((task, idx) => (
                    <div
                      key={task.TaskID || idx}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-zinc-800 bg-[#111113] text-sm"
                    >
                      <span className="text-zinc-200 truncate pr-4">{task.Title}</span>
                      <button
                        type="button"
                        onClick={() => setTasks(prev => prev.filter((_, i) => i !== idx))}
                        className="text-xs text-zinc-500 hover:text-zinc-300"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Start Day Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleStartDay}
                disabled={isPending || tasks.length === 0}
                className="w-full h-9 bg-white text-black text-sm font-semibold rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-50"
              >
                {isPending ? 'Starting Day...' : 'Start Day'}
              </button>
            </div>
          </div>
        )}

        {/* VIEW 2: ACTIVE DAY (TODAY'S POLL / CLICK TO DONE) */}
        {viewState === 'active' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-white">Tap to Complete</h2>
              <p className="text-xs text-zinc-500">Tap a task to mark it Done, Blocked, or Planned.</p>
            </div>

            {/* Quick Add Task Input (Active Day) */}
            <form onSubmit={handleQuickAddTaskActive} className="flex gap-2">
              <input
                type="text"
                required
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                placeholder="Add a new task right now..."
                className="flex-1 h-9 px-3 text-sm text-white bg-[#111113] border border-zinc-800 rounded-lg outline-none placeholder:text-zinc-600 focus:border-zinc-700 transition-colors"
              />
              <button
                type="submit"
                disabled={isPending}
                className="h-9 px-4 bg-white text-black text-xs font-semibold rounded-lg hover:bg-zinc-200 transition-colors"
              >
                Add
              </button>
            </form>

            {/* Tasks list */}
            <div className="space-y-2">
              {tasks.map(task => {
                let cardClass = 'border-zinc-805 bg-[#111113] hover:border-zinc-700';
                let indicator = '⚪';
                let textClass = 'text-zinc-200';

                if (task.Status === 'completed') {
                  cardClass = 'border-green-500/20 bg-green-500/5 hover:bg-green-500/10';
                  indicator = '🟢';
                  textClass = 'line-through text-zinc-500';
                } else if (task.Status === 'blocked') {
                  cardClass = 'border-red-500/20 bg-red-500/5 hover:bg-red-500/10';
                  indicator = '⛔';
                  textClass = 'text-red-300';
                }

                return (
                  <button
                    key={task.TaskID}
                    onClick={() => handleToggleTaskStatus(task)}
                    className={`w-full text-left p-3.5 rounded-lg border flex items-center justify-between gap-3 transition-colors duration-150 cursor-pointer ${cardClass}`}
                  >
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm font-medium truncate block ${textClass}`}>
                        {task.Title}
                      </span>
                      <span className="text-[10px] text-zinc-500 mt-1 block">
                        {task.AssignedBy && task.AssignedBy !== session?.userId ? 'Assigned to you' : 'Assigned by self'}
                      </span>
                    </div>
                    <span className="text-sm shrink-0">{indicator}</span>
                  </button>
                );
              })}

              {tasks.length === 0 && (
                <p className="text-xs text-zinc-500 italic py-4 text-center">No tasks listed for today.</p>
              )}
            </div>

            {/* End of Day trigger */}
            <div className="pt-6 border-t border-zinc-900 flex gap-2">
              <button
                onClick={() => setViewState('checkout')}
                className="flex-1 h-9 bg-zinc-900 border border-zinc-800 text-zinc-200 text-sm font-semibold rounded-lg hover:bg-zinc-800 transition-colors"
              >
                End of Day
              </button>
            </div>
          </div>
        )}

        {/* VIEW 3: END OF DAY (PLAN TOMORROW) */}
        {viewState === 'checkout' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-white">Plan your next day</h2>
              <p className="text-xs text-zinc-500">What are you working on tomorrow? (Optional)</p>
            </div>

            {/* Tomorrow's tasks list */}
            <form onSubmit={handleAddTomorrowTask} className="flex gap-2">
              <input
                type="text"
                required
                value={tomorrowTaskTitle}
                onChange={e => setTomorrowTaskTitle(e.target.value)}
                placeholder="Plan tomorrow's task..."
                className="flex-1 h-9 px-3 text-sm text-white bg-[#111113] border border-zinc-800 rounded-lg outline-none placeholder:text-zinc-600 focus:border-zinc-700 transition-colors"
              />
              <button
                type="submit"
                className="h-9 w-9 bg-white text-black font-semibold rounded-lg hover:bg-zinc-200 transition-colors flex items-center justify-center text-sm"
              >
                +
              </button>
            </form>

            <div className="space-y-1 text-sm text-zinc-400">
              {tomorrowTasks.map((t, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded bg-zinc-900 border border-zinc-850">
                  <span className="truncate">{t.title}</span>
                  <button
                    type="button"
                    onClick={() => setTomorrowTasks(prev => prev.filter((_, i) => i !== idx))}
                    className="text-xs text-zinc-500 hover:text-zinc-300"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="pt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => handleEndDay(false)}
                disabled={isPending}
                className="w-full h-9 bg-white text-black text-sm font-semibold rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-50"
              >
                {isPending ? 'Submitting...' : 'Save & Submit Day'}
              </button>
              <button
                type="button"
                onClick={() => handleEndDay(true)}
                disabled={isPending}
                className="w-full h-9 bg-zinc-900 border border-zinc-800 text-zinc-400 text-sm font-medium rounded-lg hover:bg-zinc-800 hover:text-white transition-colors disabled:opacity-50"
              >
                Skip & Done for Today
              </button>
              <button
                type="button"
                onClick={() => setViewState('active')}
                className="text-xs text-zinc-500 hover:text-zinc-300 text-center py-2"
              >
                Back to Today&apos;s checklist
              </button>
            </div>
          </div>
        )}

        {/* VIEW 4: DAY COMPLETED */}
        {viewState === 'complete' && (
          <div className="space-y-6 text-center py-12 animate-in fade-in duration-200">
            <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto text-green-500 text-xl">
              ✓
            </div>
            <div className="space-y-2">
              <h2 className="text-base font-semibold text-white">Daily Pulse Complete</h2>
              <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                You have completed your check-in, checked off your tasks, and submitted your checkout. Great job!
              </p>
            </div>
            <div className="pt-4 max-w-xs mx-auto">
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="w-full h-9 bg-zinc-900 border border-zinc-850 text-zinc-300 hover:text-white text-sm font-medium rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
