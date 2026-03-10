'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clearToken } from '@/lib/api';
import clsx from 'clsx';

const NAV = [
  { href: '/',            label: 'Início' },
  { href: '/jobs',        label: 'Projetos' },
  { href: '/aprovacoes',  label: 'Aprovações' },
  { href: '/relatorios',  label: 'Relatórios' },
  { href: '/faturas',     label: 'Faturas' },
];

export default function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [name, setName] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('cl_token');
    if (!token) { window.location.href = '/login'; return; }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setName(payload.name ?? payload.email ?? '');
    } catch { /* ignore */ }
  }, []);

  const handleLogout = () => {
    clearToken();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top nav */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <span className="font-bold text-slate-800 text-sm">Edro · Portal Cliente</span>
        <nav className="hidden sm:flex items-center gap-1">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-sm transition-colors',
                pathname === n.href
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-slate-600 hover:bg-slate-100',
              )}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <button onClick={handleLogout} className="text-xs text-slate-400 hover:text-slate-600">
          {name ? `${name} · Sair` : 'Sair'}
        </button>
      </header>

      {/* Mobile bottom nav */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={clsx(
              'flex-1 py-3 text-center text-xs transition-colors',
              pathname === n.href ? 'text-blue-600 font-medium' : 'text-slate-500',
            )}
          >
            {n.label}
          </Link>
        ))}
      </nav>

      {/* Content */}
      <main className="flex-1 px-4 py-6 pb-20 sm:pb-6 max-w-2xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
