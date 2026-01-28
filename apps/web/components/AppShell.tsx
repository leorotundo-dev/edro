'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

type NavItem = {
  label: string;
  href: string;
  icon: string;
};

type ActionButton = {
  label: string;
  icon?: string;
  onClick?: () => void;
};

type AppShellProps = {
  title: string;
  meta?: string;
  action?: ActionButton;
  topbarExtra?: React.ReactNode;
  topbarLeft?: React.ReactNode;
  children: React.ReactNode;
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Home', href: '/', icon: 'home' },
  { label: 'Clients', href: '/clients', icon: 'group' },
  { label: 'Calendar', href: '/calendar', icon: 'calendar_month' },
  { label: 'Kanban', href: '/board', icon: 'view_kanban' },
  { label: 'Creative Studio', href: '/studio', icon: 'palette' },
  { label: 'Radar', href: '/clipping', icon: 'content_cut' },
  { label: 'Social Listening', href: '/social-listening', icon: 'graphic_eq' },
];

type UserInfo = {
  name?: string;
  email?: string;
  role?: string;
};

function getActive(pathname: string, href: string) {
  if (href === '/') return pathname === href;
  return pathname.startsWith(href);
}

export default function AppShell({ title, meta, action, topbarExtra, topbarLeft, children }: AppShellProps) {
  const pathname = usePathname();
  const [user, setUser] = useState<UserInfo>({});

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.remove('dark');
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem('edro_user');
    if (!stored) return;
    try {
      setUser(JSON.parse(stored));
    } catch {
      setUser({});
    }
  }, []);

  const displayName = useMemo(() => {
    if (user?.name) return user.name;
    if (user?.email) return user.email.split('@')[0];
    return 'Edro User';
  }, [user]);

  return (
    <div className="min-h-screen flex bg-background-light text-slate-900 antialiased overflow-hidden">
      <aside className="w-36 shrink-0 border-r border-slate-200 bg-surface-light h-screen sticky top-0 flex flex-col overflow-y-auto">
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <img className="h-16 w-16 rounded-xl object-contain" src="/assets/logo-studio.png" alt="Edro logo" />
          </div>
        </div>
        <nav className="px-4 py-2 space-y-1 text-[13px]">
          {NAV_ITEMS.map((item) => {
            const active = getActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  active ? 'sidebar-item-active font-semibold' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto p-6 space-y-1">
          <Link
            href="/settings"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              getActive(pathname, '/settings')
                ? 'text-primary bg-orange-50 font-semibold'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className="material-symbols-outlined text-xl">settings</span>
            <span>Settings</span>
          </Link>
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 border-b border-slate-200 bg-surface-light/80 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-4">
            {topbarLeft ? (
              topbarLeft
            ) : (
              <>
                <h1 className="font-display text-2xl text-slate-900">{title}</h1>
                {meta ? (
                  <>
                    <span className="h-4 w-px bg-slate-200" />
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-widest">{meta}</span>
                  </>
                ) : null}
              </>
            )}
          </div>
          <div className="flex items-center gap-6">
            {action ? (
              <button
                className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-orange-600 transition-colors"
                type="button"
                onClick={action.onClick}
              >
                {action.icon ? <span className="material-symbols-outlined text-sm">{action.icon}</span> : null}
                {action.label}
              </button>
            ) : null}
            {topbarExtra}
            <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors" type="button">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-white" />
            </button>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-semibold leading-none">{displayName}</p>
                <p className="text-xs text-slate-500">{user?.role || 'Team'}</p>
              </div>
              <div className="w-10 h-10 rounded-full border border-slate-200 bg-slate-200" />
            </div>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
