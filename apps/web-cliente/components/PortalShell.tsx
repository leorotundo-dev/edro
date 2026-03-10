'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clearToken } from '@/lib/api';
import clsx from 'clsx';

const NAV = [
  { href: '/', label: 'Inicio', match: (pathname: string) => pathname === '/' },
  { href: '/jobs', label: 'Projetos', match: (pathname: string) => pathname.startsWith('/jobs') },
  { href: '/aprovacoes', label: 'Aprovacoes', match: (pathname: string) => pathname.startsWith('/aprovacoes') },
  { href: '/relatorios', label: 'Relatorios', match: (pathname: string) => pathname.startsWith('/relatorios') },
  { href: '/faturas', label: 'Faturas', match: (pathname: string) => pathname.startsWith('/faturas') },
];

function getInitials(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'CL';
}

export default function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [name, setName] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('cl_token');
    if (!token) {
      window.location.href = '/login';
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setName(payload.name ?? payload.email ?? 'Cliente');
    } catch {
      setName('Cliente');
    }
  }, []);

  const activeSection = useMemo(() => {
    return NAV.find((item) => item.match(pathname))?.label ?? 'Portal';
  }, [pathname]);

  const handleLogout = () => {
    clearToken();
    window.location.href = '/login';
  };

  return (
    <div className="portal-shell">
      <div className="portal-frame">
        <header className="portal-topbar">
          <div className="portal-brand-lockup">
            <div className="portal-brand-mark" aria-hidden="true" />
            <div className="portal-brand-copy">
              <span className="portal-brand-label">Edro Studio</span>
              <h1 className="portal-brand-title">Portal do Cliente</h1>
              <p className="portal-brand-subtitle">Acesso editorial, aprovacoes e faturamento em um unico ambiente.</p>
            </div>
          </div>

          <button type="button" className="portal-user-chip" onClick={handleLogout}>
            <span className="portal-user-badge">{getInitials(name)}</span>
            <span className="portal-user-meta">
              <span className="portal-user-name">{name || 'Cliente'}</span>
              <span className="portal-user-role">{activeSection} · sair</span>
            </span>
          </button>
        </header>

        <nav className="portal-nav" aria-label="Principal">
          {NAV.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx('portal-nav-link', active && 'portal-nav-link-active')}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <main className="portal-content">{children}</main>
      </div>

      <nav className="portal-mobile-nav" aria-label="Atalhos">
        {NAV.slice(0, 4).map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx('portal-nav-link', active && 'portal-nav-link-active')}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
