'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clearToken } from '@/lib/api';
import clsx from 'clsx';

const NAV = [
  { href: '/', label: 'Dashboard', match: (pathname: string) => pathname === '/' },
  { href: '/jobs', label: 'Jobs', match: (pathname: string) => pathname.startsWith('/jobs') },
  { href: '/horas', label: 'Horas', match: (pathname: string) => pathname.startsWith('/horas') },
  { href: '/pagamentos', label: 'Pagamentos', match: (pathname: string) => pathname.startsWith('/pagamentos') },
];

function getInitials(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'FR';
}

export default function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [name, setName] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('fl_token');
    if (!token) {
      window.location.href = '/login';
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setName(payload.name ?? payload.email ?? 'Freelancer');
    } catch {
      setName('Freelancer');
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
              <h1 className="portal-brand-title">Portal Freelancer</h1>
              <p className="portal-brand-subtitle">Visao operacional de jobs, horas registradas e pagamentos pendentes.</p>
            </div>
          </div>

          <button type="button" className="portal-user-chip" onClick={handleLogout}>
            <span className="portal-user-badge">{getInitials(name)}</span>
            <span className="portal-user-meta">
              <span className="portal-user-name">{name || 'Freelancer'}</span>
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
    </div>
  );
}
