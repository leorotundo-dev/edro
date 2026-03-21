'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearToken, apiGet } from '@/lib/api';
import clsx from 'clsx';

const NAV = [
  { href: '/',           label: 'Dashboard',   icon: '⊞', match: (p: string) => p === '/' },
  { href: '/jobs',       label: 'Escopos',     icon: '◈', match: (p: string) => p.startsWith('/jobs') },
  { href: '/pagamentos', label: 'Honorários',  icon: '◎', match: (p: string) => p.startsWith('/pagamentos') },
  { href: '/analytics',  label: 'Analytics',   icon: '📊', match: (p: string) => p.startsWith('/analytics') },
  { href: '/radar',      label: 'Radar',       icon: '🔮', match: (p: string) => p.startsWith('/radar') },
  { href: '/portfolio',  label: 'Hall da Fama',icon: '🏆', match: (p: string) => p.startsWith('/portfolio') },
  { href: '/parceiros',  label: 'Parceiros',   icon: '🤝', match: (p: string) => p.startsWith('/parceiros') },
  { href: '/agenda',     label: 'Agenda',      icon: '📅', match: (p: string) => p.startsWith('/agenda') },
  { href: '/studio',     label: 'Studio',      icon: '✦', match: (p: string) => p.startsWith('/studio') },
  { href: '/horas',      label: 'Score',       icon: '★', match: (p: string) => p.startsWith('/horas') },
  { href: '/perfil',     label: 'Perfil',      icon: '◉', match: (p: string) => p.startsWith('/perfil') },
];

// Mobile nav shows only most-used items
const MOBILE_NAV = NAV.filter(n => ['/', '/jobs', '/pagamentos', '/analytics', '/portfolio'].includes(n.href));

function initials(value: string) {
  return value.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('') || 'FR';
}

export default function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('fl_token');
    if (!token) { window.location.href = '/login'; return; }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setName(payload.name ?? payload.email?.split('@')[0] ?? 'Freelancer');
      setEmail(payload.email ?? '');
    } catch {
      setName('Freelancer');
    }

    // Onboarding gate — redirect if PJ setup not complete
    apiGet<{ onboarding_complete: boolean; terms_accepted: boolean }>('/freelancers/portal/me/onboarding-status')
      .then(status => {
        if (!status.onboarding_complete) {
          router.replace('/onboarding');
        } else if (!status.terms_accepted) {
          router.replace('/onboarding/termos');
        }
      })
      .catch(() => { /* network error — don't block portal */ });
  }, []);

  const activeLabel = useMemo(() => NAV.find(n => n.match(pathname))?.label ?? '', [pathname]);

  return (
    <div className="ps-layout">
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className="ps-sidebar">
        {/* Brand */}
        <div className="ps-brand">
          <div className="ps-brand-mark" aria-hidden="true" />
          <div>
            <span className="ps-brand-label">Edro Studio</span>
            <span className="ps-brand-name">Freelancer</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="ps-nav" aria-label="Principal">
          {NAV.map(item => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx('ps-nav-item', active && 'ps-nav-item-active')}
              >
                <span className="ps-nav-icon" aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User at bottom */}
        <div className="ps-sidebar-footer">
          <button type="button" className="ps-user-btn" onClick={() => { clearToken(); window.location.href = '/login'; }}>
            <span className="ps-avatar">{initials(name)}</span>
            <span className="ps-user-info">
              <span className="ps-user-name">{name || 'Freelancer'}</span>
              <span className="ps-user-email">{email}</span>
            </span>
          </button>
        </div>
      </aside>

      {/* ── Main area ───────────────────────────────────────── */}
      <div className="ps-main">
        {/* Header */}
        <header className="ps-header">
          <div>
            <p className="ps-header-section">{activeLabel}</p>
          </div>
          <span className="ps-header-logout" onClick={() => { clearToken(); window.location.href = '/login'; }}>
            Sair
          </span>
        </header>

        {/* Content */}
        <main className="ps-content">
          {children}
        </main>
      </div>

      {/* ── Mobile bottom nav ───────────────────────────────── */}
      <nav className="ps-mobile-nav" aria-label="Atalhos">
        {MOBILE_NAV.map(item => {
          const active = item.match(pathname);
          return (
            <Link key={item.href} href={item.href} className={clsx('ps-mobile-item', active && 'ps-mobile-item-active')}>
              <span className="ps-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
