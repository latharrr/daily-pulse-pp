'use client';

import { createContext, useContext, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Home,
  ListTodo,
  Sunrise,
  Sunset,
  Clock,
  Users,
  Shield,
  LayoutDashboard,
  LogOut,
  Building2,
} from 'lucide-react';
import { NAV_ITEMS, ROLE_LABELS } from '@/lib/constants';
import { logoutAction } from '@/actions/auth-actions';

// ── Session Context ──
const SessionContext = createContext(null);

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within DashboardShell');
  return ctx;
}

// ── Icon Map ──
const ICON_MAP = {
  home: Home,
  list: ListTodo,
  sunrise: Sunrise,
  sunset: Sunset,
  clock: Clock,
  users: Users,
  shield: Shield,
  layout: LayoutDashboard,
  building: Building2,
};

function NavIcon({ icon, className }) {
  const Icon = ICON_MAP[icon] || Home;
  return <Icon className={className} />;
}

// ── Dashboard Shell ──
export function DashboardShell({ session, children }) {
  const pathname = usePathname();
  const navItems = NAV_ITEMS[session.role] || [];

  return (
    <SessionContext.Provider value={session}>
      <div className="flex h-screen overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex md:flex-col w-56 border-r border-zinc-800 bg-zinc-950 shrink-0">
          {/* Logo */}
          <div className="h-14 flex items-center px-4 border-b border-zinc-800">
            <Link href="/dashboard" className="text-sm font-semibold text-white tracking-tight">
              Daily Pulse
            </Link>
          </div>

          {/* Nav */}
          <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== `/dashboard/${session.role}` &&
                  pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href + item.label}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors duration-150 ${
                    isActive
                      ? 'bg-white/10 text-white'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <NavIcon icon={item.icon} className="w-4 h-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Sidebar Bottom */}
          <div className="border-t border-zinc-800 p-3">
            {/* User */}
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium text-white truncate">
                {session.name}
              </p>
              <p className="text-xs text-zinc-500 truncate">
                {ROLE_LABELS[session.role] || session.role}
              </p>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Topbar */}
          <header className="h-14 flex items-center justify-between px-4 border-b border-zinc-800 bg-zinc-950 shrink-0">
            {/* Left: Mobile logo + Page context */}
            <div className="flex items-center gap-3">
              <span className="md:hidden text-sm font-semibold text-white tracking-tight">
                Daily Pulse
              </span>
            </div>

            {/* Right: Avatar + Logout */}
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-medium text-zinc-300">
                {session.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <form action={logoutAction}>
                <button
                  type="submit"
                  title="Log out"
                  className="flex items-center justify-center w-7 h-7 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-colors duration-150"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </form>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
            {children}
          </main>
        </div>

        {/* Mobile Bottom Nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 flex items-center justify-around h-14 bg-zinc-950 border-t border-zinc-800 z-50">
          {navItems.slice(0, 4).map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== `/dashboard/${session.role}` &&
                pathname.startsWith(item.href));

            return (
              <Link
                key={item.href + item.label}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-xs transition-colors duration-150 ${
                  isActive
                    ? 'text-white'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <NavIcon icon={item.icon} className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </SessionContext.Provider>
  );
}

