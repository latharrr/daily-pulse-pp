'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  apiGetCheckins,
  apiGetCheckouts,
  apiGetTasks,
  apiSubmitCheckin,
  apiSubmitCheckout,
  apiUpdateTask,
  apiCreateTask,
  apiGetPendingTasks,
  apiLogActivity,
} from '@/lib/api';
import { getToday, getYesterday, formatDate } from '@/lib/utils';
import { getSessionAction } from '@/actions/auth-actions';

export default function EmployeeDashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // States
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [isCheckedOut, setIsCheckedOut] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [pendingCarryForward, setPendingCarryForward] = useState([]);

  // Form inputs for task addition
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');
  const [newTaskDeadlineOption, setNewTaskDeadlineOption] = useState('today');
  const [newTaskCustomDeadline, setNewTaskCustomDeadline] = useState('');

  // Decline dialog state
  const [decliningTaskId, setDecliningTaskId] = useState(null);
  const [declineReason, setDeclineReason] = useState('');

  // Inline notes edit state
  const [editingNotesTaskId, setEditingNotesTaskId] = useState(null);
  const [editingNotesValue, setEditingNotesValue] = useState('');

  // Simplified Checkout inputs
  const [checkoutNotes, setCheckoutNotes] = useState('');
  const [checkoutTomorrowPlan, setCheckoutTomorrowPlan] = useState('');

  // Step states
  const [viewState, setViewState] = useState('checkin'); // checkin, active, checkout, complete

  // Per-action pending keys (e.g. 'toggle-<taskId>') so one slow action
  // doesn't disable unrelated buttons elsewhere on the page.
  const [pendingKeys, setPendingKeys] = useState(() => new Set());

  function runPending(key, fn) {
    setPendingKeys(prev => new Set(prev).add(key));
    return Promise.resolve()
      .then(fn)
      .finally(() => {
        setPendingKeys(prev => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      });
  }

  // Load session & today's data
  useEffect(() => {
    async function loadData() {
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

  // Compute tasks
  const inboxTasks = tasks.filter(t => t.Status === 'waiting_review' && t.AssignedBy !== session?.userId);
  const activeTasks = tasks.filter(t => t.Status !== 'waiting_review');

  // Today's Focus task: task that starts with `[Focus]` in Notes, or the first active task if none.
  const focusTask = activeTasks.find(t => t.Notes?.startsWith('[Focus]')) || activeTasks[0] || null;
  const otherTasks = activeTasks.filter(t => t.TaskID !== focusTask?.TaskID);

  // Sorting: Assigned by Manager always appears before Self Created
  const sortedTasks = [...activeTasks].sort((a, b) => {
    // Pinned focus task is always first
    if (a.TaskID === focusTask?.TaskID) return -1;
    if (b.TaskID === focusTask?.TaskID) return 1;

    // Assigned tasks before self-created
    const aAssigned = a.AssignedBy && a.AssignedBy !== session?.userId;
    const bAssigned = b.AssignedBy && b.AssignedBy !== session?.userId;
    if (aAssigned && !bAssigned) return -1;
    if (!aAssigned && bAssigned) return 1;
    return 0;
  });

  // Calculate deadline date string based on option selection
  function getDeadlineDate(option) {
    const today = new Date();
    if (option === 'today') {
      return getToday();
    }
    if (option === 'tomorrow') {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }
    if (option === 'week') {
      // Friday of this week
      const currentDay = today.getDay();
      const distance = 5 - currentDay; // Friday is 5
      const friday = new Date(today);
      friday.setDate(today.getDate() + distance);
      return friday.toISOString().split('T')[0];
    }
    return newTaskCustomDeadline || getToday();
  }

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

    setTasks(prev =>
      prev.map(t =>
        t.TaskID === task.TaskID
          ? { ...t, Status: nextStatus, Progress: nextProgress, Blockers: nextBlockers }
          : t
      )
    );

    runPending(`toggle-${task.TaskID}`, () => {
      apiLogActivity({
        userId: session.userId,
        action: 'Toggled task status',
        details: `${task.Title} → ${nextStatus}`,
      }).catch(() => {});

      return apiUpdateTask({
        taskId: task.TaskID,
        status: nextStatus,
        progress: nextProgress,
        blockers: nextBlockers,
      });
    });
  }

  // Pin a task as focus
  function handlePinTask(task) {
    // Only two rows ever actually change: the task losing focus (if any)
    // and the task gaining it — no need to touch every task.
    const previousFocus = tasks.find(t => t.Notes?.startsWith('[Focus]'));
    const cleanTargetNotes = (task.Notes || '').replace('[Focus]', '').trim();
    const nextTargetNotes = `[Focus] ${cleanTargetNotes}`.trim();
    const cleanPreviousNotes = previousFocus ? (previousFocus.Notes || '').replace('[Focus]', '').trim() : null;

    setTasks(prev =>
      prev.map(t => {
        if (t.TaskID === task.TaskID) return { ...t, Notes: nextTargetNotes };
        if (previousFocus && t.TaskID === previousFocus.TaskID) return { ...t, Notes: cleanPreviousNotes };
        return t;
      })
    );

    runPending(`pin-${task.TaskID}`, () => {
      const updates = [apiUpdateTask({ taskId: task.TaskID, notes: nextTargetNotes })];
      if (previousFocus && previousFocus.TaskID !== task.TaskID) {
        updates.push(apiUpdateTask({ taskId: previousFocus.TaskID, notes: cleanPreviousNotes }));
      }
      return Promise.all(updates);
    });
  }

  // Accept a manager task assignment
  function handleAcceptAssignment(taskId) {
    runPending(`accept-${taskId}`, async () => {
      const res = await apiUpdateTask({
        taskId,
        status: 'planned',
      });

      if (res.success) {
        setTasks(prev => prev.map(t => (t.TaskID === taskId ? { ...t, Status: 'planned' } : t)));

        apiLogActivity({
          userId: session.userId,
          action: 'Accepted assignment',
          details: `Task ID: ${taskId}`,
        }).catch(() => {});
      }
    });
  }

  // Decline a manager task assignment
  function handleDeclineAssignment(e) {
    e.preventDefault();
    if (!declineReason.trim()) return;

    const taskId = decliningTaskId;
    const reason = declineReason.trim();

    runPending(`decline-${taskId}`, async () => {
      const res = await apiUpdateTask({
        taskId,
        status: 'cancelled',
        blockers: `Declined: ${reason}`,
      });

      if (res.success) {
        setTasks(prev => prev.filter(t => t.TaskID !== taskId));
        setDecliningTaskId(null);
        setDeclineReason('');

        apiLogActivity({
          userId: session.userId,
          action: 'Declined assignment',
          details: `Reason: ${reason}`,
        }).catch(() => {});
      }
    });
  }

  // Inline notes update
  function handleSaveNotes(task) {
    const val = editingNotesValue.trim();
    const timestamped = val ? `${val} (updated ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })})` : '';

    setTasks(prev =>
      prev.map(t => (t.TaskID === task.TaskID ? { ...t, Notes: timestamped } : t))
    );
    setEditingNotesTaskId(null);

    runPending(`note-${task.TaskID}`, () =>
      apiUpdateTask({
        taskId: task.TaskID,
        notes: timestamped,
      })
    );
  }

  // Add task during planning checkin
  function handleAddTaskPlanning(e) {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const tempId = 'temp-' + Date.now();
    const deadline = getDeadlineDate(newTaskDeadlineOption);

    setTasks(prev => [
      ...prev,
      {
        TaskID: tempId,
        Title: newTaskTitle.trim(),
        Priority: newTaskPriority,
        Deadline: deadline,
        Status: 'planned',
        Progress: 0,
        AssignedBy: session.userId,
      },
    ]);

    setNewTaskTitle('');
    setNewTaskPriority('medium');
    setNewTaskDeadlineOption('today');
    setNewTaskCustomDeadline('');
  }

  // Quick add task during active day (always available)
  function handleQuickAddTaskActive(e) {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const title = newTaskTitle.trim();
    const deadline = getDeadlineDate(newTaskDeadlineOption);
    setNewTaskTitle('');

    runPending('quickAdd', async () => {
      const res = await apiCreateTask({
        userId: session.userId,
        title,
        priority: newTaskPriority,
        deadline,
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

  // Carry forward task actions
  function handleCarryAction(task, action) {
    runPending(`carry-${task.TaskID}`, async () => {
      if (action === 'keep') {
        const { carryForwardAction } = await import('@/actions/checkin-actions');
        const res = await carryForwardAction([task.TaskID], session.userId);
        if (res.success) {
          const tasksRes = await apiGetTasks({ userId: session.userId, date: getToday() });
          if (tasksRes.success) setTasks(tasksRes.tasks);
        }
      } else if (action === 'complete') {
        await apiUpdateTask({
          taskId: task.TaskID,
          status: 'completed',
          progress: 100,
        });
      } else if (action === 'remove') {
        await apiUpdateTask({
          taskId: task.TaskID,
          status: 'cancelled',
        });
      }

      // Update pending checklist view
      setPendingCarryForward(prev => prev.filter(t => t.TaskID !== task.TaskID));
    });
  }

  // Submit checkin
  function handleStartDay() {
    if (tasks.length === 0) {
      alert('Please add at least one task for your day.');
      return;
    }

    runPending('startDay', async () => {
      const taskCount = tasks.length;

      await Promise.all([
        ...tasks.map(t =>
          apiCreateTask({
            userId: session.userId,
            title: t.Title,
            priority: t.Priority,
            deadline: t.Deadline,
            status: 'planned',
            progress: 0,
            assignedBy: session.userId,
          })
        ),
        apiSubmitCheckin({
          userId: session.userId,
          taskCount,
          notes: '',
          blockers: '',
        }),
      ]);

      apiLogActivity({
        userId: session.userId,
        action: 'Checked in',
        details: `${taskCount} tasks planned`,
      }).catch(() => {});

      const tasksRes = await apiGetTasks({ userId: session.userId, date: getToday() });
      if (tasksRes.success) setTasks(tasksRes.tasks);

      setIsCheckedIn(true);
      setViewState('active');
    });
  }

  // End of Day Submission (Simplified Checkout)
  function handleEndDay() {
    runPending('endDay', async () => {
      const completedCount = tasks.filter(t => t.Status === 'completed').length;
      const pendingCount = tasks.filter(t => ['planned', 'in_progress'].includes(t.Status)).length;
      const postponedCount = tasks.filter(t => ['postponed', 'blocked'].includes(t.Status)).length;

      await apiSubmitCheckout({
        userId: session.userId,
        completedCount,
        pendingCount,
        postponedCount,
        tomorrowPlan: checkoutTomorrowPlan.trim() || 'Plan tomorrow morning',
        workingHours: 8,
        notes: checkoutNotes.trim(),
      });

      apiLogActivity({
        userId: session.userId,
        action: 'Checked out',
        details: `${completedCount} completed, ${pendingCount} pending`,
      }).catch(() => {});

      setIsCheckedOut(true);
      setViewState('complete');
    });
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
          <span className="text-[11px] text-zinc-500 font-mono">@{session?.username}</span>
        </div>

        {/* Priority Inbox (⚡ New Assignment) */}
        {viewState === 'active' && inboxTasks.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Priority Inbox</h3>
            <div className="space-y-2">
              {inboxTasks.map(task => (
                <div key={task.TaskID} className="border border-red-500/20 bg-red-500/5 rounded-lg p-4 space-y-3 animate-pulse">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-red-400">⚡ New Assignment</span>
                    <span className="text-[10px] text-zinc-500">Deadline: {formatDate(task.Deadline)}</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-200">{task.Title}</h4>
                    <p className="text-[10px] text-zinc-500 mt-1">Assigned by manager</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAcceptAssignment(task.TaskID)}
                      disabled={pendingKeys.has(`accept-${task.TaskID}`)}
                      className="flex-1 h-8 bg-white text-zinc-950 text-xs font-semibold rounded hover:bg-zinc-250 transition-colors"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => setDecliningTaskId(task.TaskID)}
                      disabled={pendingKeys.has(`accept-${task.TaskID}`)}
                      className="flex-1 h-8 bg-zinc-850 text-red-400 text-xs font-semibold rounded hover:bg-zinc-800 transition-colors border border-zinc-800"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW 1: MORNING PLAN */}
        {viewState === 'checkin' && (
          <div className="space-y-5">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-white">Plan your day</h2>
              <p className="text-xs text-zinc-500">What are you getting done today?</p>
            </div>

            {/* Smart Carry Forward Box */}
            {pendingCarryForward.length > 0 && (
              <div className="space-y-2 border border-dashed border-zinc-800 rounded-lg p-4">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase">Unfinished from Yesterday</h3>
                <div className="divide-y divide-zinc-800/50">
                  {pendingCarryForward.map(t => (
                    <div key={t.TaskID} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                      <span className="text-zinc-300 truncate">{t.Title}</span>
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          onClick={() => handleCarryAction(t, 'keep')}
                          className="text-[10px] bg-white text-zinc-950 px-2.5 py-1 rounded font-semibold hover:bg-zinc-200"
                        >
                          Keep
                        </button>
                        <button
                          onClick={() => handleCarryAction(t, 'complete')}
                          className="text-[10px] bg-zinc-900 border border-zinc-800 text-green-400 px-2.5 py-1 rounded font-semibold hover:bg-zinc-800"
                        >
                          Complete
                        </button>
                        <button
                          onClick={() => handleCarryAction(t, 'remove')}
                          className="text-[10px] bg-zinc-900 border border-zinc-800 text-red-400 px-2.5 py-1 rounded font-semibold hover:bg-zinc-800"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Task Add Form */}
            <form onSubmit={handleAddTaskPlanning} className="space-y-3 bg-[#111113] border border-zinc-805 p-4 rounded-lg">
              <input
                type="text"
                required
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                placeholder="Task title..."
                className="w-full h-9 px-3 text-sm text-white bg-[#09090b] border border-zinc-800 rounded-lg outline-none placeholder:text-zinc-650 focus:border-zinc-700"
              />

              <div className="grid grid-cols-2 gap-2 text-xs text-zinc-400">
                <div>
                  <label className="block mb-1">Priority</label>
                  <select
                    value={newTaskPriority}
                    onChange={e => setNewTaskPriority(e.target.value)}
                    className="w-full h-8 px-2 text-white bg-[#09090b] border border-zinc-800 rounded-lg outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1">Deadline</label>
                  <select
                    value={newTaskDeadlineOption}
                    onChange={e => setNewTaskDeadlineOption(e.target.value)}
                    className="w-full h-8 px-2 text-white bg-[#09090b] border border-zinc-800 rounded-lg outline-none"
                  >
                    <option value="today">Today</option>
                    <option value="tomorrow">Tomorrow</option>
                    <option value="week">This Week</option>
                    <option value="custom">Custom Date</option>
                  </select>
                </div>
              </div>

              {newTaskDeadlineOption === 'custom' && (
                <input
                  type="date"
                  required
                  value={newTaskCustomDeadline}
                  onChange={e => setNewTaskCustomDeadline(e.target.value)}
                  className="w-full h-9 px-3 text-sm text-white bg-[#09090b] border border-zinc-800 rounded-lg outline-none"
                />
              )}

              <button
                type="submit"
                className="w-full h-8 bg-zinc-800 text-zinc-300 text-xs font-semibold rounded hover:bg-zinc-700 border border-zinc-700"
              >
                Add Task
              </button>
            </form>

            {/* Checklist */}
            <div className="space-y-2">
              {tasks.map((task, idx) => (
                <div key={task.TaskID || idx} className="flex items-center justify-between p-2.5 border border-zinc-800 bg-[#111113] rounded-lg text-sm">
                  <span className="truncate pr-4 text-zinc-300">{task.Title}</span>
                  <button
                    onClick={() => setTasks(prev => prev.filter((_, i) => i !== idx))}
                    className="text-xs text-zinc-500 hover:text-zinc-300"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={handleStartDay}
              disabled={pendingKeys.has('startDay') || tasks.length === 0}
              className="w-full h-9 bg-white text-zinc-950 text-sm font-semibold rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-50"
            >
              Start Day
            </button>
          </div>
        )}

        {/* VIEW 2: ACTIVE PORTAL */}
        {viewState === 'active' && (
          <div className="space-y-5">
            {/* Quick Add Form */}
            <form onSubmit={handleQuickAddTaskActive} className="space-y-2 bg-zinc-900 border border-zinc-800 p-3 rounded-lg">
              <input
                type="text"
                required
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                placeholder="Quick add task..."
                className="w-full h-8 px-3 text-xs text-white bg-[#09090b] border border-zinc-800 rounded-lg outline-none placeholder:text-zinc-650"
              />
              <div className="flex justify-between items-center gap-2">
                <select
                  value={newTaskDeadlineOption}
                  onChange={e => setNewTaskDeadlineOption(e.target.value)}
                  className="h-8 px-2 text-[10px] text-zinc-400 bg-[#09090b] border border-zinc-850 rounded-md"
                >
                  <option value="today">Today</option>
                  <option value="tomorrow">Tomorrow</option>
                  <option value="week">This Week</option>
                  <option value="custom">Custom Date</option>
                </select>

                <button
                  type="submit"
                  disabled={pendingKeys.has('quickAdd')}
                  className="h-8 px-4 bg-white text-zinc-950 text-xs font-semibold rounded hover:bg-zinc-250"
                >
                  Add Task
                </button>
              </div>

              {newTaskDeadlineOption === 'custom' && (
                <input
                  type="date"
                  required
                  value={newTaskCustomDeadline}
                  onChange={e => setNewTaskCustomDeadline(e.target.value)}
                  className="w-full h-8 px-2 text-xs text-white bg-[#09090b] border border-zinc-800 rounded-lg outline-none"
                />
              )}
            </form>

            {/* Today's Focus task */}
            {focusTask && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Today&apos;s Focus</h3>
                <div className="border border-white/20 bg-zinc-900 rounded-lg p-4 relative group">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span className="text-sm font-bold text-white truncate">{focusTask.Title}</span>
                    <button
                      onClick={() => handleToggleTaskStatus(focusTask)}
                      className="text-xs"
                    >
                      {focusTask.Status === 'completed' ? '🟢' : focusTask.Status === 'blocked' ? '⛔' : '⚪'}
                    </button>
                  </div>

                  {/* Focus task metadata */}
                  <p className="text-[10px] text-zinc-400">
                    {focusTask.AssignedBy && focusTask.AssignedBy !== session?.userId ? 'Assigned by Manager' : 'Self Created'}
                  </p>

                  {/* Focus task note inline edit */}
                  <div className="mt-3 pt-2 border-t border-zinc-850/80 flex items-center justify-between text-xs text-zinc-500">
                    {editingNotesTaskId === focusTask.TaskID ? (
                      <div className="flex-1 flex gap-2">
                        <input
                          type="text"
                          value={editingNotesValue}
                          onChange={e => setEditingNotesValue(e.target.value)}
                          placeholder="Add progress note..."
                          className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-2 py-0.5 text-xs text-white focus:outline-none"
                        />
                        <button onClick={() => handleSaveNotes(focusTask)} className="text-white">Save</button>
                      </div>
                    ) : (
                      <>
                        <span className="truncate pr-4 italic">{focusTask.Notes?.replace('[Focus]', '').trim() || 'No progress notes'}</span>
                        <button
                          onClick={() => {
                            setEditingNotesTaskId(focusTask.TaskID);
                            setEditingNotesValue(focusTask.Notes?.replace('[Focus]', '').trim() || '');
                          }}
                          className="text-zinc-400 hover:text-white shrink-0"
                        >
                          Edit note
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Checklist */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Today&apos;s Tasks</h3>
              <div className="space-y-1.5">
                {sortedTasks.map(t => (
                  <div
                    key={t.TaskID}
                    className="border border-zinc-805 bg-[#111113] rounded-lg p-3.5 flex items-center justify-between gap-3 text-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <span className={`font-medium block truncate ${t.Status === 'completed' ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>
                        {t.Title}
                      </span>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-500">
                        <span>{t.AssignedBy && t.AssignedBy !== session?.userId ? 'Assigned by Manager' : 'Self Created'}</span>
                        <span>·</span>
                        <span>{formatDate(t.Deadline)}</span>
                        {t.Notes && (
                          <>
                            <span>·</span>
                            <span className="italic truncate max-w-[120px]">{t.Notes?.replace('[Focus]', '').trim()}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {/* Pin to Focus button */}
                      {t.TaskID !== focusTask?.TaskID && (
                        <button
                          onClick={() => handlePinTask(t)}
                          title="Pin as Focus"
                          className="text-xs hover:text-white text-zinc-500"
                        >
                          Pin Focus
                        </button>
                      )}

                      {/* Edit Note button */}
                      {editingNotesTaskId === t.TaskID ? (
                        <div className="flex gap-1">
                          <input
                            type="text"
                            value={editingNotesValue}
                            onChange={e => setEditingNotesValue(e.target.value)}
                            className="bg-zinc-950 border border-zinc-800 rounded px-1.5 py-0.5 text-[10px] text-white"
                          />
                          <button onClick={() => handleSaveNotes(t)} className="text-[10px] text-white font-medium">Ok</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingNotesTaskId(t.TaskID);
                            setEditingNotesValue(t.Notes?.replace('[Focus]', '').trim() || '');
                          }}
                          className="text-[10px] text-zinc-500 hover:text-white"
                        >
                          Note
                        </button>
                      )}

                      <button onClick={() => handleToggleTaskStatus(t)} className="text-sm">
                        {t.Status === 'completed' ? '🟢' : t.Status === 'blocked' ? '⛔' : '⚪'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* End of Day trigger */}
            <div className="pt-6 border-t border-zinc-900">
              <button
                onClick={() => setViewState('checkout')}
                className="w-full h-9 bg-zinc-900 border border-zinc-800 text-zinc-200 text-sm font-semibold rounded-lg hover:bg-zinc-800"
              >
                End Day
              </button>
            </div>
          </div>
        )}

        {/* VIEW 3: SIMPLIFIED CHECKOUT */}
        {viewState === 'checkout' && (
          <div className="space-y-5">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-white">Daily Checkout</h2>
              <p className="text-xs text-zinc-500">Wrap up and save today&apos;s report</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-400">
                  Tomorrow&apos;s First Priority? *
                </label>
                <textarea
                  required
                  value={checkoutTomorrowPlan}
                  onChange={e => setCheckoutTomorrowPlan(e.target.value)}
                  placeholder="What is the single most important task for tomorrow?"
                  className="w-full h-20 p-3 text-sm text-white bg-[#111113] border border-zinc-800 rounded-lg outline-none placeholder:text-zinc-650 focus:border-zinc-700 resize-none text-zinc-200"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-400">
                  Anything to add? (optional)
                </label>
                <textarea
                  value={checkoutNotes}
                  onChange={e => setCheckoutNotes(e.target.value)}
                  placeholder="Notes, blockers, achievements..."
                  className="w-full h-20 p-3 text-sm text-white bg-[#111113] border border-zinc-800 rounded-lg outline-none placeholder:text-zinc-650 focus:border-zinc-700 resize-none text-zinc-200"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleEndDay}
                disabled={pendingKeys.has('endDay') || !checkoutTomorrowPlan.trim()}
                className="flex-1 h-9 bg-white text-zinc-950 text-sm font-semibold rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-50"
              >
                Submit checkout
              </button>
              <button
                type="button"
                onClick={() => setViewState('active')}
                className="flex-1 h-9 bg-zinc-900 border border-zinc-800 text-zinc-400 text-sm font-medium rounded-lg hover:bg-zinc-800 hover:text-white"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {/* VIEW 4: DAY COMPLETED */}
        {viewState === 'complete' && (
          <div className="space-y-6 text-center py-12">
            <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto text-green-500 text-xl">
              ✓
            </div>
            <div className="space-y-2">
              <h2 className="text-base font-semibold text-white">Daily Checkout Submitted</h2>
              <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                Your daily report has been saved automatically. See you tomorrow!
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Decline assignment modal dialog */}
      {decliningTaskId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDecliningTaskId(null)} />
          <div className="relative w-full max-w-sm mx-4 bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-zinc-50 mb-2">Decline Task Assignment</h3>
            <form onSubmit={handleDeclineAssignment} className="space-y-4">
              <textarea
                required
                value={declineReason}
                onChange={e => setDeclineReason(e.target.value)}
                placeholder="Reason for declining this task..."
                className="w-full h-24 p-3 text-sm text-white bg-zinc-950 border border-zinc-800 rounded-lg outline-none placeholder:text-zinc-650 resize-none"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={pendingKeys.has(`decline-${decliningTaskId}`)}
                  className="flex-1 h-9 bg-white text-zinc-950 text-xs font-semibold rounded hover:bg-zinc-200 transition-colors"
                >
                  Confirm Decline
                </button>
                <button
                  type="button"
                  onClick={() => setDecliningTaskId(null)}
                  className="h-9 px-4 bg-zinc-800 text-zinc-300 text-xs font-medium rounded hover:bg-zinc-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
