'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { clearToken, apiGet, apiPost, swrFetcher } from '@/lib/api';
import clsx from 'clsx';

const NAV_ITEMS = [
  { href: '/',           label: 'Dashboard',   icon: '⊞', visible: true,  match: (p: string) => p === '/' },
  { href: '/jobs',       label: 'Escopos',     icon: '◈', visible: true,  match: (p: string) => p.startsWith('/jobs') },
  { href: '/pagamentos',  label: 'Honorários',  icon: '◎', visible: true,  match: (p: string) => p.startsWith('/pagamentos') },
  { href: '/da-extrato',  label: 'Extrato DA',  icon: '◈', visible: true,  match: (p: string) => p.startsWith('/da-extrato') },
  { href: '/agenda',     label: 'Agenda',      icon: '📅', visible: true,  match: (p: string) => p.startsWith('/agenda') },
  { href: '/horas',      label: 'Score SLA',   icon: '★', visible: true,  match: (p: string) => p.startsWith('/horas') },
  { href: '/perfil',     label: 'Perfil',      icon: '◉', visible: true,  match: (p: string) => p.startsWith('/perfil') },
  { href: '/analytics',  label: 'Analytics',   icon: '📊', visible: true,  match: (p: string) => p.startsWith('/analytics') },
  { href: '/radar',      label: 'Radar',       icon: '🔮', visible: true,  match: (p: string) => p.startsWith('/radar') },
  { href: '/portfolio',  label: 'Hall da Fama',icon: '🏆', visible: true,  match: (p: string) => p.startsWith('/portfolio') },
  { href: '/parceiros',  label: 'Parceiros',   icon: '🤝', visible: true,  match: (p: string) => p.startsWith('/parceiros') },
  { href: '/studio',     label: 'Studio',      icon: '✦', visible: true,  match: (p: string) => p.startsWith('/studio') },
  { href: '/arte',       label: 'Motor DA',    icon: '◈', visible: false, match: (p: string) => p.startsWith('/arte') },
];

const NAV = NAV_ITEMS.filter((item) => item.visible);

// Mobile nav — core items + studio (central feature)
const MOBILE_NAV = NAV.filter(n => ['/', '/jobs', '/studio', '/agenda', '/perfil'].includes(n.href));

function initials(value: string) {
  return value.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('') || 'FR';
}

type InAppNotification = {
  id: string;
  event_type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data, mutate } = useSWR<{ notifications: InAppNotification[]; unreadCount: number }>(
    '/notifications',
    swrFetcher,
    { refreshInterval: 30_000 },
  );

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleClick = async (n: InAppNotification) => {
    if (!n.read_at) {
      await apiPost(`/notifications/${n.id}/read`, {}).catch(() => {});
      mutate();
    }
    setOpen(false);
    if (n.link) window.location.href = n.link;
  };

  const markAll = async () => {
    await apiPost('/notifications/read-all', {}).catch(() => {});
    mutate();
  };

  function fmtAgo(ts: string) {
    const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
    if (diff < 1) return 'agora';
    if (diff < 60) return `${diff}min`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h`;
    return `${Math.floor(diff / 1440)}d`;
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          position: 'relative', background: 'none', border: 'none',
          cursor: 'pointer', padding: '6px 8px', borderRadius: 8,
          color: open ? 'var(--portal-accent)' : 'var(--portal-muted)',
          fontSize: 20, lineHeight: 1, display: 'flex', alignItems: 'center',
          transition: 'color 0.15s',
        }}
        aria-label="Notificações"
      >
        🔔
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2,
            background: '#FA896B', color: '#fff',
            fontSize: 9, fontWeight: 800, borderRadius: '50%',
            width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
            lineHeight: 1,
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          width: 320, maxHeight: 420, overflowY: 'auto',
          background: 'var(--portal-card)', border: '1.5px solid var(--portal-border)',
          borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          zIndex: 200,
        }}>
          <div style={{
            padding: '12px 16px 10px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderBottom: '1px solid var(--portal-border)',
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--portal-text)' }}>
              Notificações {unreadCount > 0 && <span style={{ color: '#FA896B' }}>({unreadCount})</span>}
            </span>
            {unreadCount > 0 && (
              <button type="button" onClick={markAll} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 11, color: 'var(--portal-accent)', padding: 0,
              }}>
                Marcar todas como lidas
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--portal-muted)', fontSize: 13 }}>
              Nenhuma notificação
            </div>
          ) : (
            notifications.map(n => (
              <button
                key={n.id}
                type="button"
                onClick={() => handleClick(n)}
                style={{
                  width: '100%', textAlign: 'left', background: 'none',
                  border: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)',
                  cursor: 'pointer', padding: '12px 16px',
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                  opacity: n.read_at ? 0.5 : 1,
                  transition: 'background 0.1s',
                }}
              >
                {!n.read_at && (
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: '#5D87FF', flexShrink: 0, marginTop: 4,
                  }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--portal-text)', lineHeight: 1.4 }}>
                    {n.title}
                  </p>
                  {n.body && (
                    <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--portal-muted)', lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
                      {n.body}
                    </p>
                  )}
                  <p style={{ margin: '4px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>
                    {fmtAgo(n.created_at)}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
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
        }
        // contract_status gate removed — portal accessible before D4Sign signing
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <NotificationBell />
            <span className="ps-header-logout" onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
              clearToken();
              window.location.href = '/login';
            }}>
              Sair
            </span>
          </div>
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
