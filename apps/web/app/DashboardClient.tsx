'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { apiGet } from '@/lib/api';

type Briefing = {
  id: string;
  title: string;
  client_name: string | null;
  status: string;
  due_at: string | null;
  created_at: string;
};

type Task = {
  id: string;
  briefing_id: string;
  type: string;
  assigned_to: string;
  status: string;
  created_at: string;
};

type CalendarEvent = {
  id: string;
  name: string;
  slug: string;
  categories: string[];
  score: number;
  tier: string;
};

type DashboardStats = {
  today: {
    activeBriefings: number;
    pendingApprovals: number;
    dueTodayCount: number;
    tasksToday: number;
  };
  upcoming: Briefing[];
  lastWeek: {
    briefingsCreated: number;
    briefingsCompleted: number;
    avgTimePerStage: Record<string, number>;
    approvalRate: number;
    totalCopiesGenerated: number;
  };
};

export default function DashboardClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentBriefings, setRecentBriefings] = useState<Briefing[]>([]);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [todayEvents, setTodayEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      // Carregar métricas
      const metricsRes = await apiGet<{ success: boolean; data: any }>('/edro/metrics');

      // Carregar briefings recentes
      const briefingsRes = await apiGet<{ success: boolean; data: Briefing[] }>('/edro/briefings?limit=10');

      // Carregar tasks de hoje
      const tasksRes = await apiGet<{ success: boolean; data: Task[] }>('/edro/tasks?status=pending');

      // Carregar eventos do calendário do mês atual
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const today = now.toISOString().split('T')[0];

      const calendarRes = await apiGet<{
        success?: boolean;
        month: string;
        days: Record<string, CalendarEvent[]>;
      }>(`/calendar/events/${currentMonth}`);

      if (calendarRes?.days && calendarRes.days[today]) {
        setTodayEvents(calendarRes.days[today].slice(0, 3)); // Top 3 eventos
      }

      if (metricsRes?.data) {
        const metrics = metricsRes.data;
        const now = new Date();
        const today = now.toISOString().split('T')[0];

        setStats({
          today: {
            activeBriefings: metrics.byStatus?.['copy_ia'] || 0 + metrics.byStatus?.['aprovacao'] || 0,
            pendingApprovals: metrics.byStatus?.['aprovacao'] || 0,
            dueTodayCount: 0, // Calcular abaixo
            tasksToday: tasksRes?.data?.length || 0,
          },
          upcoming: [],
          lastWeek: {
            briefingsCreated: metrics.recentBriefings || 0,
            briefingsCompleted: metrics.byStatus?.['iclips_out'] || 0,
            avgTimePerStage: metrics.avgTimePerStage || {},
            approvalRate: 0.85, // Mock - calcular depois
            totalCopiesGenerated: metrics.totalCopies || 0,
          },
        });
      }

      if (briefingsRes?.data) {
        setRecentBriefings(briefingsRes.data);
      }

      if (tasksRes?.data) {
        setTodayTasks(tasksRes.data);
      }
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
          <div className="mt-4 text-slate-600">Carregando dashboard...</div>
        </div>
      </div>
    );
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Sem prazo';
    return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      briefing: 'bg-blue-100 text-blue-700',
      copy_ia: 'bg-cyan-100 text-cyan-700',
      aprovacao: 'bg-orange-100 text-orange-700',
      producao: 'bg-pink-100 text-pink-700',
      revisao: 'bg-indigo-100 text-indigo-700',
      entrega: 'bg-green-100 text-green-700',
      iclips_out: 'bg-purple-100 text-purple-700',
    };
    return colors[status] || 'bg-slate-100 text-slate-700';
  };

  return (
    <AppShell title="Dashboard">
      <div className="p-6 space-y-6">
        {/* Header com Data */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-700 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h1>
              <p className="text-slate-300">Bem-vindo de volta! Aqui está o resumo do seu dia.</p>
            </div>
            <span className="material-symbols-outlined text-6xl opacity-20">dashboard</span>
          </div>
        </div>

        {/* Visão do Dia Atual */}
        <div>
          <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined">today</span>
            Hoje
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">Briefings Ativos</span>
                <span className="material-symbols-outlined text-blue-600">folder_open</span>
              </div>
              <div className="text-3xl font-bold text-slate-900">{stats?.today.activeBriefings || 0}</div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">Aprovações Pendentes</span>
                <span className="material-symbols-outlined text-orange-600">pending_actions</span>
              </div>
              <div className="text-3xl font-bold text-slate-900">{stats?.today.pendingApprovals || 0}</div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">Vencem Hoje</span>
                <span className="material-symbols-outlined text-red-600">alarm</span>
              </div>
              <div className="text-3xl font-bold text-slate-900">{stats?.today.dueTodayCount || 0}</div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">Tasks Hoje</span>
                <span className="material-symbols-outlined text-purple-600">checklist</span>
              </div>
              <div className="text-3xl font-bold text-slate-900">{stats?.today.tasksToday || 0}</div>
            </div>
          </div>

          {/* Celebrações do Dia */}
          {todayEvents.length > 0 && (
            <div className="mt-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-purple-600">celebration</span>
                <h3 className="font-semibold text-slate-900">Celebrações de Hoje</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {todayEvents.map((event) => (
                  <div
                    key={event.id}
                    className="px-3 py-1.5 bg-white rounded-full border border-purple-200 text-sm flex items-center gap-2"
                  >
                    <span className="text-purple-600">🎉</span>
                    <span className="text-slate-700">{event.name}</span>
                    {event.tier === 'A' && (
                      <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-semibold">
                        Top
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Próximas Datas Relevantes */}
        <div>
          <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined">event_upcoming</span>
            Próximos Deadlines
          </h2>
          <div className="bg-white rounded-lg border border-slate-200">
            {recentBriefings.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {recentBriefings.slice(0, 5).map((briefing) => (
                  <div
                    key={briefing.id}
                    className="p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/edro/${briefing.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined text-slate-400">description</span>
                          <div>
                            <div className="font-medium text-slate-900">{briefing.title}</div>
                            <div className="text-sm text-slate-500">
                              {briefing.client_name || 'Sem cliente'}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(briefing.status)}`}>
                          {briefing.status}
                        </span>
                        <div className="text-sm text-slate-600 flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">schedule</span>
                          {formatDate(briefing.due_at)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500">
                <span className="material-symbols-outlined text-4xl mb-2">event_busy</span>
                <p>Nenhum briefing com deadline próximo.</p>
              </div>
            )}
          </div>
        </div>

        {/* Performance da Última Semana */}
        <div>
          <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined">trending_up</span>
            Performance - Última Semana
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="text-sm text-slate-600 mb-1">Briefings Criados</div>
              <div className="text-2xl font-bold text-green-600">{stats?.lastWeek.briefingsCreated || 0}</div>
              <div className="text-xs text-slate-500 mt-1">↑ Últimos 7 dias</div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="text-sm text-slate-600 mb-1">Briefings Completados</div>
              <div className="text-2xl font-bold text-blue-600">{stats?.lastWeek.briefingsCompleted || 0}</div>
              <div className="text-xs text-slate-500 mt-1">✓ Entregues</div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="text-sm text-slate-600 mb-1">Taxa de Aprovação</div>
              <div className="text-2xl font-bold text-purple-600">
                {Math.round((stats?.lastWeek.approvalRate || 0) * 100)}%
              </div>
              <div className="text-xs text-slate-500 mt-1">Copies aprovadas</div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="text-sm text-slate-600 mb-1">Copies Geradas</div>
              <div className="text-2xl font-bold text-cyan-600">{stats?.lastWeek.totalCopiesGenerated || 0}</div>
              <div className="text-xs text-slate-500 mt-1">Total com IA</div>
            </div>
          </div>
        </div>

        {/* Tasks Pendentes */}
        {todayTasks.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined">task_alt</span>
              Minhas Tasks
            </h2>
            <div className="bg-white rounded-lg border border-slate-200">
              <div className="divide-y divide-slate-100">
                {todayTasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-orange-500 rounded-full" />
                      <div>
                        <div className="font-medium text-slate-900 capitalize">{task.type.replace('_', ' ')}</div>
                        <div className="text-sm text-slate-500">Atribuída para: {task.assigned_to}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => router.push(`/edro/${task.briefing_id}`)}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Ver Briefing →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/edro/novo')}
            className="px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined">add</span>
            Novo Briefing
          </button>
          <button
            onClick={() => router.push('/edro')}
            className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined">view_list</span>
            Ver Todos os Briefings
          </button>
          <button
            onClick={() => router.push('/calendar')}
            className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined">calendar_month</span>
            Calendário
          </button>
        </div>
      </div>
    </AppShell>
  );
}
