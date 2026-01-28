'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

type NavItem = {
  label: string;
  href: string;
  icon: string;
  section?: 'core' | 'analytics';
};

type CommandShellProps = {
  children: React.ReactNode;
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Home', href: '/', icon: 'home', section: 'core' },
  { label: 'Clients', href: '/clients', icon: 'group', section: 'core' },
  { label: 'Calendar', href: '/calendar', icon: 'calendar_today', section: 'core' },
  { label: 'Kanban', href: '/board', icon: 'view_kanban', section: 'core' },
  { label: 'Creative Studio', href: '/studio', icon: 'palette', section: 'core' },
  { label: 'Radar', href: '/clipping', icon: 'content_cut', section: 'core' },
];

function getActive(pathname: string, href: string) {
  if (href === '/') return pathname === href;
  return pathname.startsWith(href);
}

export default function CommandShell({ children }: CommandShellProps) {
  const pathname = usePathname();

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: '2-digit',
        year: 'numeric',
      }),
    []
  );

  return (
    <div className="command-shell bg-background-light dark:bg-background-dark text-[#1d130c] dark:text-[#fcf9f8]">
      <div className="flex min-h-screen">
        <aside className="w-44 border-r border-[#f4ece6] dark:border-[#3a2a1f] bg-white dark:bg-[#1a110a] flex flex-col sticky top-0 h-screen overflow-y-auto">
          <div className="p-6 flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-white">
              <span className="material-symbols-outlined">keyboard_command_key</span>
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight uppercase">Edro Command</h1>
              <p className="text-[10px] text-[#a16a45] uppercase tracking-widest">Internal Studio</p>
            </div>
          </div>
          <nav className="flex-1 px-3 space-y-1">
            {NAV_ITEMS.filter((item) => item.section === 'core').map((item) => {
              const active = getActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    active
                      ? 'sidebar-item-active'
                      : 'hover:bg-gray-100 dark:hover:bg-[#2a1d14]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                  <span
                    className={`text-sm font-medium ${
                      active ? '' : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
          <div className="p-4 border-t border-[#f4ece6] dark:border-[#3a2a1f] space-y-1">
            <Link
              href="/settings"
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2a1d14]"
            >
              <span className="material-symbols-outlined text-[20px]">settings</span>
              <span className="text-sm font-medium">Settings</span>
            </Link>
            <Link
              href="/support"
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2a1d14]"
            >
              <span className="material-symbols-outlined text-[20px]">support_agent</span>
              <span className="text-sm font-medium">Support</span>
            </Link>
          </div>
        </aside>

        <main className="flex-1 flex flex-col min-w-0 bg-background-light dark:bg-background-dark">
          <header className="h-16 bg-white dark:bg-[#1a110a] border-b border-[#f4ece6] dark:border-[#3a2a1f] flex items-center justify-between px-8 sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#a16a45]">calendar_month</span>
              <span className="text-sm font-semibold">{todayLabel}</span>
            </div>
            <div className="flex items-center gap-6">
              <button className="relative p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-[#2a1d14] rounded-lg">
                <span className="material-symbols-outlined">notifications</span>
                <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-white dark:border-[#1a110a]" />
              </button>
              <div className="flex items-center gap-3 border-l border-[#f4ece6] dark:border-[#3a2a1f] pl-6">
                <div className="text-right">
                  <p className="text-xs font-bold">Alex Rivera</p>
                  <p className="text-[10px] text-[#a16a45]">Studio Lead</p>
                </div>
                <div
                  className="w-9 h-9 rounded-full bg-cover bg-center border border-[#f4ece6]"
                  style={{
                    backgroundImage:
                      "url('https://lh3.googleusercontent.com/aida-public/AB6AXuA_k-ZPYN60jvba0whpHaMMH0ujquX9OpoVlzkyD-l-K1PWBxwcw_O2JjQXAKY8WFRfw3MC0BNWX5W0J6ehRDFryHEhyA5qcOGCPLr6oNcCtelxGc3I8h8wmHb9EUYm8xxH9v9sqQXquLeE_U9DzOgZLlg4quMqFlzjrB3ewaqBPloQC29ktJvqymUDZtLHL9tFAkL7JX6zDRA0vWUKDiQtNq5VeSt4uFX1HFJsBxsEje6i9swts8XbV87Wm37MR8qukTP8WmZIMj8')",
                  }}
                />
              </div>
            </div>
          </header>

          {children}
        </main>
      </div>
    </div>
  );
}
