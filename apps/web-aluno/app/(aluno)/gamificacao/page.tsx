'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Button, Badge, StatCard } from '@edro/ui';
import { Trophy, Flame, Shield, Users, Rocket, Star } from 'lucide-react';
import { ProgressBar } from '@/components/ProgressBar';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

type BadgeInfo = {
  id: string;
  code: string;
  title: string;
  description?: string;
  earned_at?: string;
};

type Profile = {
  xp_total: number;
  level: number;
  next_level_xp: number;
  xp_into_level: number;
  max_streak: number;
  streak_current: number;
  streak_freezes: number;
  avatar_level: number;
  badges: BadgeInfo[];
};

type Mission = {
  id: string;
  type: string;
  title: string;
  description?: string;
  progress: number;
  goal: number;
  status: string;
};

type EventItem = {
  id: string;
  type: string;
  title: string;
  description?: string;
  rules?: any;
  score?: number;
  progress?: Record<string, number>;
  participant_status?: string;
  start_at: string;
  end_at: string;
};

type Clan = {
  id: string;
  name: string;
  description?: string;
  members_count?: number;
};

type ClanPayload = {
  clans: Clan[];
  userClan?: Clan & { role?: string };
};

type LeaderboardEntry = {
  user_id: string;
  xp_total: number;
  level: number;
  streak_current: number;
  name?: string;
};

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

export default function GamificacaoPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [clanData, setClanData] = useState<ClanPayload | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [clanLeaderboard, setClanLeaderboard] = useState<any[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [clanName, setClanName] = useState('');
  const [clanDescription, setClanDescription] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const [profileRes, missionsRes, eventsRes, clansRes, leaderboardRes, clanLbRes] =
        await Promise.all([
          authFetch('/api/gamification/profile'),
          authFetch('/api/gamification/missions'),
          authFetch('/api/gamification/events'),
          authFetch('/api/gamification/clans'),
          authFetch('/api/gamification/leaderboard'),
          authFetch('/api/gamification/clans/leaderboard'),
        ]);

      setProfile(profileRes.data);
      setMissions(missionsRes.data || []);
      setEvents(eventsRes.data || []);
      setClanData(clansRes.data || null);
      setLeaderboard(leaderboardRes.data || []);
      setClanLeaderboard(clanLbRes.data || []);
    } catch (err) {
      setMessage('Falha ao carregar gamificacao.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const badges = useMemo(() => profile?.badges || [], [profile]);

  async function handleJoinEvent(eventId: string) {
    try {
      await authFetch(`/api/gamification/events/${eventId}/join`, { method: 'POST' });
      await loadData();
    } catch {
      setMessage('Nao foi possivel entrar no evento.');
    }
  }

  async function handleJoinClan(clanId: string) {
    try {
      await authFetch(`/api/gamification/clans/${clanId}/join`, { method: 'POST' });
      await loadData();
    } catch {
      setMessage('Nao foi possivel entrar no clan.');
    }
  }

  async function handleLeaveClan(clanId: string) {
    try {
      await authFetch(`/api/gamification/clans/${clanId}/leave`, { method: 'POST' });
      await loadData();
    } catch {
      setMessage('Nao foi possivel sair do clan.');
    }
  }

  async function handleCreateClan() {
    if (!clanName.trim()) {
      setMessage('Informe um nome para o clan.');
      return;
    }
    try {
      await authFetch('/api/gamification/clans', {
        method: 'POST',
        body: JSON.stringify({
          name: clanName,
          description: clanDescription || undefined,
          isPublic: true,
        }),
      });
      setClanName('');
      setClanDescription('');
      await loadData();
    } catch {
      setMessage('Nao foi possivel criar o clan.');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-6xl space-y-6">
      <div className="flex items-center gap-3">
        <Rocket className="h-7 w-7 text-primary-600" />
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Gamificacao</h1>
          <p className="text-slate-600">XP, missoes, eventos e clans.</p>
        </div>
      </div>

      {message && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <StatCard
          label="Nivel"
          value={profile?.level ?? 1}
          helper={`${profile?.xp_into_level ?? 0}/${profile?.next_level_xp ?? 500} XP`}
          icon={Shield}
          tone="indigo"
        />
        <StatCard
          label="XP Total"
          value={profile?.xp_total ?? 0}
          helper="Acumulado"
          icon={Star}
          tone="purple"
        />
        <StatCard
          label="Streak"
          value={profile?.streak_current ?? 0}
          helper={`Melhor: ${profile?.max_streak ?? 0}`}
          icon={Flame}
          tone="orange"
        />
        <StatCard
          label="Freezes"
          value={profile?.streak_freezes ?? 0}
          helper={`Avatar: ${profile?.avatar_level ?? 1}`}
          icon={Trophy}
          tone="green"
        />
      </div>

      {badges.length > 0 && (
        <Card className="p-4">
          <h3 className="text-lg font-semibold text-slate-900 mb-3">Badges</h3>
          <div className="flex flex-wrap gap-2">
            {badges.map((b) => (
              <Badge key={b.id} variant="gray">{b.title}</Badge>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <Trophy className="h-5 w-5 text-primary-600" />
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Missoes</h3>
              <p className="text-sm text-slate-600">Diarias e semanais.</p>
            </div>
          </div>
          <div className="space-y-4">
            {missions.length === 0 && (
              <p className="text-sm text-slate-500">Nenhuma missao ativa.</p>
            )}
            {missions.map((mission) => (
              <div key={mission.id} className="rounded-xl border border-slate-100 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{mission.title}</p>
                    <p className="text-xs text-slate-500">{mission.description}</p>
                  </div>
                  <Badge variant={mission.status === 'completed' ? 'success' : 'gray'}>
                    {mission.status}
                  </Badge>
                </div>
                <ProgressBar
                  value={mission.progress}
                  max={mission.goal || 1}
                  showPercentage={false}
                  size="sm"
                />
                <p className="text-xs text-slate-500">
                  {mission.progress}/{mission.goal} concluido
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <Rocket className="h-5 w-5 text-primary-600" />
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Eventos</h3>
              <p className="text-sm text-slate-600">Desafios e rankings.</p>
            </div>
          </div>
          <div className="space-y-4">
            {events.length === 0 && (
              <p className="text-sm text-slate-500">Nenhum evento ativo.</p>
            )}
            {events.map((event) => (
              <div key={event.id} className="rounded-xl border border-slate-100 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{event.title}</p>
                    <p className="text-xs text-slate-500">{event.description}</p>
                  </div>
                  {event.participant_status ? (
                    <Badge variant="success">Inscrito</Badge>
                  ) : (
                    <Button size="sm" onClick={() => handleJoinEvent(event.id)}>
                      Entrar
                    </Button>
                  )}
                </div>
                {event.participant_status && (
                  <div className="text-xs text-slate-500">
                    Pontos: {event.score ?? 0}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-primary-600" />
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Clans</h3>
              <p className="text-sm text-slate-600">Estude em grupo.</p>
            </div>
          </div>

          {clanData?.userClan ? (
            <div className="rounded-xl border border-slate-100 p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">{clanData.userClan.name}</p>
                <p className="text-xs text-slate-500">{clanData.userClan.description}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => handleLeaveClan(clanData.userClan!.id)}>
                Sair
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Nome do clan"
                  value={clanName}
                  onChange={(e) => setClanName(e.target.value)}
                />
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Descricao curta"
                  value={clanDescription}
                  onChange={(e) => setClanDescription(e.target.value)}
                />
                <Button onClick={handleCreateClan}>Criar clan</Button>
              </div>
              <div className="space-y-2">
                {clanData?.clans?.map((clan) => (
                  <div key={clan.id} className="flex items-center justify-between rounded-xl border border-slate-100 p-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{clan.name}</p>
                      <p className="text-xs text-slate-500">{clan.members_count ?? 0} membros</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => handleJoinClan(clan.id)}>
                      Entrar
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <Star className="h-5 w-5 text-primary-600" />
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Rankings</h3>
              <p className="text-sm text-slate-600">Top XP e clans.</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">XP</p>
              <div className="space-y-2">
                {leaderboard.slice(0, 5).map((entry, index) => (
                  <div key={entry.user_id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                    <span className="text-sm text-slate-600">#{index + 1} {entry.name || 'Aluno'}</span>
                    <span className="text-sm font-semibold text-slate-900">{entry.xp_total} XP</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">Clans</p>
              <div className="space-y-2">
                {clanLeaderboard.slice(0, 5).map((entry: any, index: number) => (
                  <div key={entry.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                    <span className="text-sm text-slate-600">#{index + 1} {entry.name}</span>
                    <span className="text-sm font-semibold text-slate-900">{entry.xp_total} XP</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
