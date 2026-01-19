'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, DataTable, StatCard, Button } from '@edro/ui';
import { Sparkles, Trophy, Users, Calendar } from 'lucide-react';
import { apiGet, apiPost, type ApiResponse } from '@/lib/api';

type Overview = {
  profiles: number;
  xp_events_last_7d: number;
  active_missions: number;
  active_events: number;
  clans: number;
};

type Mission = {
  id: string;
  code: string;
  type: string;
  title: string;
  is_active: boolean;
};

type EventItem = {
  id: string;
  code: string;
  type: string;
  title: string;
  is_active: boolean;
  start_at: string;
  end_at: string;
};

type BadgeItem = {
  id: string;
  code: string;
  title: string;
  rule_type: string;
  is_active: boolean;
};

type ClanItem = {
  id: string;
  name: string;
  members_count?: number;
};

export default function GamificationAdminPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [badges, setBadges] = useState<BadgeItem[]>([]);
  const [clans, setClans] = useState<ClanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const [missionForm, setMissionForm] = useState({
    code: '',
    type: 'daily',
    title: '',
    goal: 5,
    rule: 'drops_completed',
    xp: 30,
  });

  const [eventForm, setEventForm] = useState({
    code: '',
    type: 'event',
    title: '',
    start_at: '',
    end_at: '',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewRes, missionsRes, eventsRes, badgesRes, clansRes] = await Promise.all([
        apiGet<ApiResponse<Overview>>('/admin/gamification/overview'),
        apiGet<ApiResponse<Mission[]>>('/admin/gamification/missions'),
        apiGet<ApiResponse<EventItem[]>>('/admin/gamification/events'),
        apiGet<ApiResponse<BadgeItem[]>>('/admin/gamification/badges'),
        apiGet<ApiResponse<ClanItem[]>>('/admin/gamification/clans'),
      ]);
      setOverview(overviewRes.data || null);
      setMissions(missionsRes.data || []);
      setEvents(eventsRes.data || []);
      setBadges(badgesRes.data || []);
      setClans(clansRes.data || []);
    } catch (err) {
      setMessage('Falha ao carregar gamificacao.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function createMission() {
    try {
      await apiPost('/admin/gamification/missions', {
        code: missionForm.code,
        type: missionForm.type,
        title: missionForm.title,
        rules: { type: missionForm.rule, goal: missionForm.goal },
        rewards: { xp: missionForm.xp },
      });
      setMissionForm({ code: '', type: 'daily', title: '', goal: 5, rule: 'drops_completed', xp: 30 });
      await loadData();
    } catch (err) {
      setMessage('Nao foi possivel criar missao.');
    }
  }

  async function createEvent() {
    try {
      await apiPost('/admin/gamification/events', {
        code: eventForm.code,
        type: eventForm.type,
        title: eventForm.title,
        rules: { type: 'xp_total' },
        rewards: { xp_bonus: 200 },
        start_at: eventForm.start_at,
        end_at: eventForm.end_at,
      });
      setEventForm({ code: '', type: 'event', title: '', start_at: '', end_at: '' });
      await loadData();
    } catch (err) {
      setMessage('Nao foi possivel criar evento.');
    }
  }

  const statCards = useMemo(() => {
    return [
      {
        label: 'Perfis ativos',
        value: overview?.profiles ?? 0,
        helper: 'Usuarios com XP',
        icon: Users,
        tone: 'blue' as const,
      },
      {
        label: 'XP ultimos 7d',
        value: overview?.xp_events_last_7d ?? 0,
        helper: 'Eventos de XP',
        icon: Sparkles,
        tone: 'purple' as const,
      },
      {
        label: 'Missoes ativas',
        value: overview?.active_missions ?? 0,
        helper: 'Diarias e semanais',
        icon: Trophy,
        tone: 'orange' as const,
      },
      {
        label: 'Eventos ativos',
        value: overview?.active_events ?? 0,
        helper: 'Challenges',
        icon: Calendar,
        tone: 'green' as const,
      },
    ];
  }, [overview]);

  return (
    <div className="space-y-8 pb-10">
      <header className="flex items-center justify-between rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div>
          <p className="text-sm font-semibold text-primary-600">Gamificacao</p>
          <h1 className="text-2xl font-semibold text-slate-900">Missao, eventos e clans</h1>
        </div>
        <Button variant="outline" onClick={loadData} loading={loading}>
          Atualizar
        </Button>
      </header>

      {message && (
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
          {message}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            helper={stat.helper}
            icon={stat.icon}
            tone={stat.tone}
          />
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card padding="lg" className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Nova missao</h2>
            <p className="text-sm text-slate-500">Crie desafios diarios ou semanais.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="code"
              value={missionForm.code}
              onChange={(e) => setMissionForm((s) => ({ ...s, code: e.target.value }))}
            />
            <select
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={missionForm.type}
              onChange={(e) => setMissionForm((s) => ({ ...s, type: e.target.value }))}
            >
              <option value="daily">daily</option>
              <option value="weekly">weekly</option>
            </select>
            <input
              className="col-span-2 rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="titulo"
              value={missionForm.title}
              onChange={(e) => setMissionForm((s) => ({ ...s, title: e.target.value }))}
            />
            <input
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="goal"
              type="number"
              value={missionForm.goal}
              onChange={(e) => setMissionForm((s) => ({ ...s, goal: Number(e.target.value) }))}
            />
            <input
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="xp reward"
              type="number"
              value={missionForm.xp}
              onChange={(e) => setMissionForm((s) => ({ ...s, xp: Number(e.target.value) }))}
            />
            <select
              className="col-span-2 rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={missionForm.rule}
              onChange={(e) => setMissionForm((s) => ({ ...s, rule: e.target.value }))}
            >
              <option value="drops_completed">drops_completed</option>
              <option value="srs_reviews">srs_reviews</option>
              <option value="questions_answered">questions_answered</option>
              <option value="simulado_finish">simulado_finish</option>
            </select>
          </div>
          <Button onClick={createMission}>Criar missao</Button>
        </Card>

        <Card padding="lg" className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Novo evento</h2>
            <p className="text-sm text-slate-500">Desafios com ranking.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="code"
              value={eventForm.code}
              onChange={(e) => setEventForm((s) => ({ ...s, code: e.target.value }))}
            />
            <select
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={eventForm.type}
              onChange={(e) => setEventForm((s) => ({ ...s, type: e.target.value }))}
            >
              <option value="event">event</option>
              <option value="challenge">challenge</option>
            </select>
            <input
              className="col-span-2 rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="titulo"
              value={eventForm.title}
              onChange={(e) => setEventForm((s) => ({ ...s, title: e.target.value }))}
            />
            <input
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="start_at (2025-01-10)"
              value={eventForm.start_at}
              onChange={(e) => setEventForm((s) => ({ ...s, start_at: e.target.value }))}
            />
            <input
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="end_at (2025-01-17)"
              value={eventForm.end_at}
              onChange={(e) => setEventForm((s) => ({ ...s, end_at: e.target.value }))}
            />
          </div>
          <Button onClick={createEvent}>Criar evento</Button>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card padding="lg">
          <div className="mb-4">
            <p className="text-sm font-semibold text-primary-600">Missoes</p>
            <h2 className="text-xl font-semibold text-slate-900">Ativas e historico</h2>
          </div>
          <DataTable
            headers={[
              { key: 'code', label: 'Code' },
              { key: 'type', label: 'Tipo' },
              { key: 'title', label: 'Titulo' },
              { key: 'is_active', label: 'Ativa', align: 'center' },
            ]}
          >
            {missions.map((mission) => (
              <tr key={mission.id}>
                <td className="px-4 py-3 text-slate-700">{mission.code}</td>
                <td className="px-4 py-3 text-slate-600">{mission.type}</td>
                <td className="px-4 py-3 text-slate-900">{mission.title}</td>
                <td className="px-4 py-3 text-center text-slate-600">{mission.is_active ? 'sim' : 'nao'}</td>
              </tr>
            ))}
          </DataTable>
        </Card>

        <Card padding="lg">
          <div className="mb-4">
            <p className="text-sm font-semibold text-primary-600">Eventos</p>
            <h2 className="text-xl font-semibold text-slate-900">Calendario</h2>
          </div>
          <DataTable
            headers={[
              { key: 'code', label: 'Code' },
              { key: 'type', label: 'Tipo' },
              { key: 'title', label: 'Titulo' },
              { key: 'is_active', label: 'Ativo', align: 'center' },
            ]}
          >
            {events.map((event) => (
              <tr key={event.id}>
                <td className="px-4 py-3 text-slate-700">{event.code}</td>
                <td className="px-4 py-3 text-slate-600">{event.type}</td>
                <td className="px-4 py-3 text-slate-900">{event.title}</td>
                <td className="px-4 py-3 text-center text-slate-600">{event.is_active ? 'sim' : 'nao'}</td>
              </tr>
            ))}
          </DataTable>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card padding="lg">
          <div className="mb-4">
            <p className="text-sm font-semibold text-primary-600">Badges</p>
            <h2 className="text-xl font-semibold text-slate-900">Regras e premios</h2>
          </div>
          <DataTable
            headers={[
              { key: 'code', label: 'Code' },
              { key: 'title', label: 'Titulo' },
              { key: 'rule_type', label: 'Regra' },
              { key: 'is_active', label: 'Ativo', align: 'center' },
            ]}
          >
            {badges.map((badge) => (
              <tr key={badge.id}>
                <td className="px-4 py-3 text-slate-700">{badge.code}</td>
                <td className="px-4 py-3 text-slate-900">{badge.title}</td>
                <td className="px-4 py-3 text-slate-600">{badge.rule_type}</td>
                <td className="px-4 py-3 text-center text-slate-600">{badge.is_active ? 'sim' : 'nao'}</td>
              </tr>
            ))}
          </DataTable>
        </Card>

        <Card padding="lg">
          <div className="mb-4">
            <p className="text-sm font-semibold text-primary-600">Clans</p>
            <h2 className="text-xl font-semibold text-slate-900">Comunidades</h2>
          </div>
          <DataTable
            headers={[
              { key: 'name', label: 'Clan' },
              { key: 'members_count', label: 'Membros', align: 'center' },
            ]}
          >
            {clans.map((clan) => (
              <tr key={clan.id}>
                <td className="px-4 py-3 text-slate-900">{clan.name}</td>
                <td className="px-4 py-3 text-center text-slate-600">{clan.members_count ?? 0}</td>
              </tr>
            ))}
          </DataTable>
        </Card>
      </section>
    </div>
  );
}
