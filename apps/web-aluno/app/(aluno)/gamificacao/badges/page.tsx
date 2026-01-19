'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Card } from '@edro/ui';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

type BadgeInfo = {
  id: string;
  code: string;
  title: string;
  description?: string;
  earned_at?: string;
};

type Profile = {
  xp_total?: number;
  streak_current?: number;
  badges: BadgeInfo[];
};

const FILTERS = [
  { id: 'all', label: 'Todos' },
  { id: 'earned', label: 'Conquistados' },
  { id: 'locked', label: 'Bloqueados' },
] as const;

type Filter = (typeof FILTERS)[number]['id'];

async function authFetch(path: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined'
    ? localStorage.getItem('token') || localStorage.getItem('edro_token')
    : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    throw new Error(`Erro ${res.status}`);
  }
  return res.json();
}

const resolveBadgeIcon = (code?: string, title?: string) => {
  const key = `${code ?? ''} ${title ?? ''}`.toLowerCase();
  if (key.includes('streak') || key.includes('sequencia')) return 'local_fire_department';
  if (key.includes('note') || key.includes('anot')) return 'edit_note';
  if (key.includes('brain') || key.includes('mente') || key.includes('intel')) return 'psychology';
  if (key.includes('book') || key.includes('leitura') || key.includes('estudo')) return 'menu_book';
  if (key.includes('quiz') || key.includes('quest')) return 'quiz';
  return 'military_tech';
};

export default function BadgesPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  const loadBadges = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const profileRes = await authFetch('/api/gamification/profile');
      setProfile(profileRes.data || null);
    } catch {
      setMessage('Nao foi possivel carregar suas conquistas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBadges();
  }, [loadBadges]);

  const badges = useMemo(() => profile?.badges || [], [profile]);
  const totalDrops = profile?.xp_total ?? 0;
  const streak = profile?.streak_current ?? 0;

  const visibleBadges = useMemo(() => {
    if (filter === 'locked') return [];
    return badges;
  }, [badges, filter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 pb-12 pt-6">
      <header className="flex items-center justify-between">
        <Link
          href="/gamificacao"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-secondary-lilac/40 text-text-muted hover:bg-secondary-bg"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </Link>
        <h1 className="text-lg font-title font-semibold text-text-main">Conquistas</h1>
        <div className="h-10 w-10" />
      </header>

      {message && (
        <Card className="border border-secondary-lilac/60 bg-secondary-bg text-sm text-text-main">
          {message}
        </Card>
      )}

      <Card className="flex flex-col items-center gap-2 text-center">
        <span className="material-symbols-outlined text-primary text-5xl">water_drop</span>
        <p className="text-4xl font-title font-bold text-text-main">
          {totalDrops.toLocaleString('pt-BR')}
        </p>
        <p className="text-sm text-text-muted">Drops coletados</p>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card className="flex flex-col items-center gap-1 text-center" padding="sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-bg text-primary">
            <span className="material-symbols-outlined">military_tech</span>
          </div>
          <p className="text-2xl font-title font-semibold text-text-main">{badges.length}</p>
          <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">Badges</p>
        </Card>
        <Card className="flex flex-col items-center gap-1 text-center" padding="sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-orange-500">
            <span className="material-symbols-outlined">local_fire_department</span>
          </div>
          <p className="text-2xl font-title font-semibold text-text-main">{streak}</p>
          <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">Sequencia</p>
        </Card>
      </div>

      <section className="space-y-1">
        <h2 className="text-xl font-title font-semibold text-text-main">Voce esta no foco</h2>
        <p className="text-sm text-text-muted">Continue estudando para desbloquear mais conquistas.</p>
      </section>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((item) => (
          <Button
            key={item.id}
            variant={filter === item.id ? 'primary' : 'outline'}
            size="xs"
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {visibleBadges.length === 0 ? (
        <Card className="p-6 text-center">
          <h2 className="text-lg font-title font-semibold text-text-main">
            {filter === 'locked' ? 'Nenhum badge bloqueado' : 'Nenhum badge ainda'}
          </h2>
          <p className="text-text-muted mt-2">
            {filter === 'locked'
              ? 'Seus proximos marcos apareceram aqui.'
              : 'Conclua trilhas para liberar seus primeiros badges.'}
          </p>
          {filter !== 'locked' && (
            <div className="mt-4 flex justify-center">
              <Link href="/estudar">
                <Button>Estudar agora</Button>
              </Link>
            </div>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {visibleBadges.map((badge) => {
            const icon = resolveBadgeIcon(badge.code, badge.title);
            return (
              <Card key={badge.id} className="space-y-3" padding="sm">
                <div className="relative aspect-square w-full rounded-2xl bg-secondary-bg flex items-center justify-center">
                  <span className="material-symbols-outlined text-5xl text-primary">{icon}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-base font-title font-semibold text-text-main">{badge.title}</p>
                    <Badge variant="success" size="sm">Conquistado</Badge>
                  </div>
                  <p className="text-xs text-text-muted">
                    {badge.description || 'Badge conquistado no seu progresso.'}
                  </p>
                  <p className="text-[11px] text-text-muted">
                    {badge.earned_at
                      ? `Conquistado em ${new Date(badge.earned_at).toLocaleDateString('pt-BR')}`
                      : 'Conquistado recentemente'}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
