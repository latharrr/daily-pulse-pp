'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { UserForm } from '@/components/admin/user-form';
import { TeamForm } from '@/components/admin/team-form';
import { toggleUserAction, resetPasswordAction, updateUserAction } from '@/actions/admin-actions';
import { ROLE_LABELS } from '@/lib/constants';

export function AdminView({ initialUsers, initialTeams }) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [teams, setTeams] = useState(initialTeams);
  const [showUserForm, setShowUserForm] = useState(false);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [resetPasswordUserId, setResetPasswordUserId] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('employee');
  const [editTeamId, setEditTeamId] = useState('');

  const [isPending, startTransition] = useTransition();

  // router.refresh() re-renders the parent Server Component with fresh
  // data, but doesn't remount this Client Component. Adjust state during
  // render (React's documented escape hatch for this) rather than in an
  // effect, since users/teams also carry local optimistic edits that a
  // plain derived value would lose.
  const [prevInitialUsers, setPrevInitialUsers] = useState(initialUsers);
  if (initialUsers !== prevInitialUsers) {
    setPrevInitialUsers(initialUsers);
    setUsers(initialUsers);
  }

  const [prevInitialTeams, setPrevInitialTeams] = useState(initialTeams);
  if (initialTeams !== prevInitialTeams) {
    setPrevInitialTeams(initialTeams);
    setTeams(initialTeams);
  }

  const managers = users.filter(u => u.Role === 'manager');
  const teamMap = {};
  teams.forEach(t => { teamMap[t.TeamID] = t.TeamName; });

  function handleToggleActive(userId, currentActive) {
    const nextActive = !currentActive;
    startTransition(async () => {
      const res = await toggleUserAction(userId, nextActive);
      if (res.success) {
        setUsers(prev => prev.map(u => u.UserID === userId ? { ...u, Active: nextActive } : u));
      }
    });
  }

  function openEditUser(user) {
    setEditingUser(user);
    setEditName(user.Name);
    setEditRole(user.Role);
    setEditTeamId(user.TeamID || '');
  }

  function handleEditUser(e) {
    e.preventDefault();
    if (!editName.trim()) return;

    const userId = editingUser.UserID;
    startTransition(async () => {
      const res = await updateUserAction({
        userId,
        name: editName.trim(),
        role: editRole,
        teamId: editTeamId,
      });
      if (res.success) {
        setUsers(prev =>
          prev.map(u =>
            u.UserID === userId ? { ...u, Name: editName.trim(), Role: editRole, TeamID: editTeamId } : u
          )
        );
        setEditingUser(null);
      } else {
        alert(res.error || 'Failed to update user');
      }
    });
  }

  function handleResetPassword(e) {
    e.preventDefault();
    if (!newPassword.trim()) return;

    startTransition(async () => {
      const res = await resetPasswordAction(resetPasswordUserId, newPassword);
      if (res.success) {
        alert('Password reset successfully');
        setResetPasswordUserId(null);
        setNewPassword('');
      } else {
        alert(res.error || 'Failed to reset password');
      }
    });
  }

  return (
    <div className="space-y-8">
      {/* Users Section */}
      <div id="users" className="space-y-3 scroll-mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Users</h2>
          <button
            type="button"
            onClick={() => setShowUserForm(true)}
            className="h-8 px-4 bg-white text-zinc-950 text-xs font-medium rounded-lg hover:bg-zinc-200 transition-colors"
          >
            Add User
          </button>
        </div>

        <div className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/50 text-xs text-zinc-500 uppercase tracking-wider">
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Username</th>
                <th className="px-4 py-2 font-medium">Role</th>
                <th className="px-4 py-2 font-medium">Team</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {users.map(user => (
                <tr key={user.UserID} className="hover:bg-zinc-800/10">
                  <td className="px-4 py-3 font-medium text-zinc-100">{user.Name}</td>
                  <td className="px-4 py-3 text-zinc-400">@{user.Username}</td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 px-2 py-0.5 rounded border border-zinc-800">
                      {ROLE_LABELS[user.Role] || user.Role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {teamMap[user.TeamID] || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                      <span className={`w-1.5 h-1.5 rounded-full ${user.Active ? 'bg-green-500' : 'bg-red-500'}`} />
                      {user.Active ? 'Active' : 'Disabled'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      type="button"
                      onClick={() => openEditUser(user)}
                      className="text-xs text-zinc-400 hover:text-white transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setResetPasswordUserId(user.UserID)}
                      className="text-xs text-zinc-400 hover:text-white transition-colors"
                    >
                      Reset Password
                    </button>
                    {user.Role !== 'admin' && (
                      <button
                        type="button"
                        onClick={() => handleToggleActive(user.UserID, user.Active)}
                        className={`text-xs ${user.Active ? 'text-red-400 hover:text-red-300' : 'text-green-400 hover:text-green-300'} transition-colors`}
                      >
                        {user.Active ? 'Disable' : 'Enable'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Teams Section */}
      <div id="teams" className="space-y-3 scroll-mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Teams</h2>
          <button
            type="button"
            onClick={() => setShowTeamForm(true)}
            className="h-8 px-4 bg-white text-zinc-950 text-xs font-medium rounded-lg hover:bg-zinc-200 transition-colors"
          >
            Add Team
          </button>
        </div>

        <div className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/50 text-xs text-zinc-500 uppercase tracking-wider">
                <th className="px-4 py-2 font-medium">Team Name</th>
                <th className="px-4 py-2 font-medium">Manager</th>
                <th className="px-4 py-2 font-medium text-right">Members</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {teams.map(team => {
                const mgr = users.find(u => u.UserID === team.ManagerID);
                const count = users.filter(u => u.TeamID === team.TeamID).length;
                return (
                  <tr key={team.TeamID} className="hover:bg-zinc-800/10">
                    <td className="px-4 py-3 font-medium text-zinc-100">{team.TeamName}</td>
                    <td className="px-4 py-3 text-zinc-400">{mgr ? mgr.Name : 'No Manager'}</td>
                    <td className="px-4 py-3 text-right text-zinc-400">{count}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Forms & Dialogs */}
      {showUserForm && (
        <UserForm
          teams={teams}
          onClose={() => {
            setShowUserForm(false);
            router.refresh();
          }}
        />
      )}

      {showTeamForm && (
        <TeamForm
          managers={managers}
          onClose={() => {
            setShowTeamForm(false);
            router.refresh();
          }}
        />
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setEditingUser(null)} />
          <div className="relative w-full max-w-sm mx-4 bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-zinc-50 mb-3">Edit {editingUser.Name}</h3>
            <form onSubmit={handleEditUser} className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-1.5">Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-50 focus:outline-none focus:border-zinc-600"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-1.5">Role</label>
                <select
                  value={editRole}
                  onChange={e => setEditRole(e.target.value)}
                  disabled={editingUser.Role === 'admin'}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-50 focus:outline-none focus:border-zinc-600 disabled:opacity-50"
                >
                  <option value="employee">Team Member</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-1.5">Team</label>
                <select
                  value={editTeamId}
                  onChange={e => setEditTeamId(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-50 focus:outline-none focus:border-zinc-600"
                >
                  <option value="">No team</option>
                  {teams.map(team => (
                    <option key={team.TeamID} value={team.TeamID}>
                      {team.TeamName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 bg-white text-zinc-950 text-xs font-medium rounded-lg py-2 hover:bg-zinc-200 disabled:opacity-50"
                >
                  {isPending ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="bg-zinc-800 text-zinc-300 text-xs font-medium rounded-lg px-3 py-2 hover:bg-zinc-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPasswordUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setResetPasswordUserId(null)} />
          <div className="relative w-full max-w-sm mx-4 bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-zinc-50 mb-3">Reset Password</h3>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <input
                type="password"
                required
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="New password (min 6 chars)"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-50 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 bg-white text-zinc-950 text-xs font-medium rounded-lg py-2 hover:bg-zinc-200 disabled:opacity-50"
                >
                  {isPending ? 'Resetting...' : 'Reset'}
                </button>
                <button
                  type="button"
                  onClick={() => setResetPasswordUserId(null)}
                  className="bg-zinc-800 text-zinc-300 text-xs font-medium rounded-lg px-3 py-2 hover:bg-zinc-700"
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
