'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearToken, apiGet } from '@/lib/api';
import clsx from 'clsx';

const NAV_ITEMS = [
  { href: '/',           label: 'Dashboard',   icon: '⊞', visible: true,  match: (p: string) => p === '/' },
  { href: '/jobs',       label: 'Escopos',     icon: '◈', visible: true,  match: (p: string) => p.startsWith('/jobs') },
  { href: '/pagamentos', label: 'Honorários',  icon: '◎', visible: true,  match: (p: string) => p.startsWith('/pagamentos') },
  { href: '/agenda',     label: 'Agenda',      icon: '📅', visible: true,  match: (p: string) => p.startsWith('/agenda') },
  { href: '/horas',      label: 'Score SLA',   icon: '★', visible: true,  match: (p: string) => p.startsWith('/horas') },
  { href: '/perfil',     label: 'Perfil',      icon: '◉', visible: true,  match: (p: string) => p.startsWith('/perfil') },
  { href: '/analytics',  label: 'Analytics',   icon: '📊', visible: false, match: (p: string) => p.startsWith('/analytics') },
  { href: '/radar',      label: 'Radar',       icon: '🔮', visible: false, match: (p: string) => p.startsWith('/radar') },
  { href: '/portfolio',  label: 'Hall da Fama',icon: '🏆', visible: false, match: (p: string) => p.startsWith('/portfolio') },
  { href: '/parceiros',  label: 'Parceiros',   icon: '🤝', visible: false, match: (p: string) => p.startsWith('/parceiros') },
  { href: '/studio',     label: 'Studio',      icon: '✦', visible: false, match: (p: string) => p.startsWith('/studio') },
];

const NAV = NAV_ITEMS.filter((item) => item.visible);

// Mobile nav shows only most-used items
const MOBILE_NAV = NAV.filter(n => ['/', '/jobs', '/pagamentos', '/agenda', '/perfil'].includes(n.href));

function initials(value: string) {
  return value.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('') || 'FR';
}

type PortalFreelancerMe = {
  display_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
};

export default function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      try {
        const profile = await apiGet<PortalFreelancerMe>('/freelancers/portal/me');
        if (cancelled) return;
        setName(profile?.display_name ?? profile?.email?.split('@')[0] ?? 'Freelancer');
        setEmail(profile?.email ?? '');
        setAvatarUrl(profile?.avatar_url ?? '');
      } catch {
        clearToken();
        window.location.href = '/login';
      }
    };

    void loadProfile();

    // Onboarding gate — redirect if PJ setup or contract not complete
    apiGet<{ onboarding_complete: boolean; terms_accepted: boolean; contract_status: string }>('/freelancers/portal/me/onboarding-status')
      .then(status => {
        if (!status.onboarding_complete) {
          router.replace('/onboarding');
        } else if (status.contract_status !== 'signed') {
          // Redirect to contract signing flow (replaces old clickwrap terms page)
          router.replace('/onboarding/termos');
        }
      })
      .catch(() => { /* network error — don't block portal */ });
    return () => { cancelled = true; };
  }, [router]);

  const activeLabel = useMemo(() => NAV_ITEMS.find(n => n.match(pathname))?.label ?? '', [pathname]);

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
          <button type="button" className="ps-user-btn" onClick={async () => {
            await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
            clearToken();
            window.location.href = '/login';
          }}>
            <span className="ps-avatar">
              {avatarUrl ? (
                <img src={avatarUrl} alt={name || 'Freelancer'} className="ps-avatar-img" />
              ) : initials(name)}
            </span>
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
          <span className="ps-header-logout" onClick={async () => {
            await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
            clearToken();
            window.location.href = '/login';
          }}>
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
