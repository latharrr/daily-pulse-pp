'use client';

import { useActionState } from 'react';
import { loginAction } from '@/actions/auth-actions';

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, {
    error: null,
  });

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-white tracking-tight">
            Daily Pulse
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500">
            Know what your team is doing
          </p>
        </div>

        {/* Login Card */}
        <div className="border border-zinc-800 rounded-lg bg-[#111113] p-6">
          <form action={formAction} className="space-y-4">
            {/* Error */}
            {state?.error && (
              <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                {state.error}
              </div>
            )}

            {/* Username */}
            <div className="space-y-1.5">
              <label
                htmlFor="username"
                className="block text-sm font-medium text-zinc-400"
              >
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                autoFocus
                className="w-full h-9 px-3 text-sm text-white bg-[#09090b] border border-zinc-800 rounded-lg outline-none placeholder:text-zinc-600 focus:border-zinc-600 transition-colors duration-150"
                placeholder="Enter username"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-zinc-400"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full h-9 px-3 text-sm text-white bg-[#09090b] border border-zinc-800 rounded-lg outline-none placeholder:text-zinc-600 focus:border-zinc-600 transition-colors duration-150"
                placeholder="Enter password"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isPending}
              className="w-full h-9 bg-white text-black text-sm font-medium rounded-lg hover:bg-zinc-200 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
