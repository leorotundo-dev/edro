'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { apiGet } from '@/lib/api';

type Briefing = {
  id: string;
  client_name: string | null;
  title: string;
  status: string;
  created_at: string;
  due_at: string | null;
  traffic_owner: string | null;
  source: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  briefing: 'Briefing',
  iclips_in: 'iClips Entrada',
  alinhamento: 'Alinhamento',
  copy_ia: 'Copy IA',
  aprovacao: 'Aprovação',
  producao: 'Produção',
  revisao: 'Revisão',
  iclips_out: 'iClips Saída',
  done: 'Concluído',
};

const STATUS_COLORS: Record<string, string> = {
  briefing: 'bg-blue-100 text-blue-700',
  iclips_in: 'bg-purple-100 text-purple-700',
  alinhamento: 'bg-yellow-100 text-yellow-700',
  copy_ia: 'bg-cyan-100 text-cyan-700',
  aprovacao: 'bg-orange-100 text-orange-700',
  producao: 'bg-pink-100 text-pink-700',
  revisao: 'bg-indigo-100 text-indigo-700',
  iclips_out: 'bg-purple-100 text-purple-700',
  done: 'bg-green-100 text-green-700',
};

function formatDate(value?: string | null) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatRelativeDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `Atrasado ${Math.abs(diffDays)}d`;
  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Amanhã';
  if (diffDays <= 7) return `${diffDays} dias`;
  return null;
}

type Metrics = {
  total: number;
  byStatus: Record<string, number>;
  avgTimePerStage: Record<string, number>;
  totalCopies: number;
  tasksByType: Record<string, number>;
  recentBriefings: number;
  bottlenecks: { stage: string; count: number }[];
};

export default function BriefingsClient() {
  const router = useRouter();
  const [briefings, setBriefings] = useState<Briefing[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  const loadBriefings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);

      const response = await apiGet<{ success: boolean; data: Briefing[] }>(
        `/edro/briefings?${params.toString()}`
      );
      setBriefings(response?.data || []);
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar briefings.');
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  const loadMetrics = useCallback(async () => {
    try {
      const response = await apiGet<{ success: boolean; data: Metrics }>(
        '/edro/metrics'
      );
      setMetrics(response?.data || null);
    } catch (err: any) {
      console.error('Falha ao carregar métricas:', err);
    }
  }, []);

  useEffect(() => {
    loadBriefings();
    loadMetrics();
  }, [loadBriefings, loadMetrics]);

  const handleNewBriefing = () => {
    router.push('/edro/novo');
  };

  const handleBriefingClick = (id: string) => {
    router.push(`/edro/${id}`);
  };

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const url = `/edro/reports/export?format=${format}`;

      if (format === 'csv') {
        // Download CSV
        window.open(`${process.env.NEXT_PUBLIC_API_URL || '/api'}${url}`, '_blank');
      } else {
        // JSON format
        const response = await apiGet<{ success: boolean; data: any[] }>(url);
        const blob = new Blob([JSON.stringify(response?.data || [], null, 2)], {
          type: 'application/json',
        });
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `edro-briefings-${Date.now()}.json`;
        a.click();
      }
    } catch (err: any) {
      alert(err?.message || 'Erro ao exportar relatório.');
    }
  };

  if (loading && briefings.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <div className="mt-4 text-slate-600">Carregando briefings...</div>
        </div>
      </div>
    );
  }

  return (
    <AppShell
      title="Briefings Edro"
      topbarLeft={
        <nav className="flex items-center space-x-2 text-sm text-slate-400">
          <span className="text-slate-500">Edro</span>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="text-slate-900 font-medium">Briefings</span>
        </nav>
      }
      topbarRight={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleExport('csv')}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">download</span>
            Exportar CSV
          </button>
          <button
            type="button"
            onClick={handleNewBriefing}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Novo Briefing
          </button>
        </div>
      }
    >
      <div className="p-6 max-w-7xl mx-auto">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Metrics Dashboard */}
        {metrics && (
          <div className="mb-6 grid grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <span className="material-symbols-outlined text-blue-600">description</span>
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">{metrics.total}</div>
                  <div className="text-sm text-slate-500">Total Briefings</div>
                </div>
              </div>
              <div className="text-xs text-slate-400 mt-2">
                +{metrics.recentBriefings} últimos 7 dias
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-cyan-100 rounded-lg">
                  <span className="material-symbols-outlined text-cyan-600">psychology</span>
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">{metrics.totalCopies}</div>
                  <div className="text-sm text-slate-500">Copies Geradas</div>
                </div>
              </div>
              <div className="text-xs text-slate-400 mt-2">
                IA automatizada
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <span className="material-symbols-outlined text-orange-600">check_circle</span>
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">
                    {metrics.byStatus.aprovacao || 0}
                  </div>
                  <div className="text-sm text-slate-500">Em Aprovação</div>
                </div>
              </div>
              <div className="text-xs text-slate-400 mt-2">
                Aguardando gestor
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <span className="material-symbols-outlined text-green-600">done_all</span>
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">
                    {metrics.byStatus.done || 0}
                  </div>
                  <div className="text-sm text-slate-500">Concluídos</div>
                </div>
              </div>
              <div className="text-xs text-slate-400 mt-2">
                Entregues
              </div>
            </div>
          </div>
        )}

        {/* Bottlenecks */}
        {metrics && metrics.bottlenecks.length > 0 && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-yellow-600">warning</span>
              <h3 className="font-semibold text-slate-900">Etapas com Gargalos</h3>
            </div>
            <div className="flex gap-4">
              {metrics.bottlenecks.map((bottleneck) => (
                <div key={bottleneck.stage} className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-slate-900 capitalize">
                    {STATUS_LABELS[bottleneck.stage] || bottleneck.stage}:
                  </span>
                  <span className="text-slate-600">{bottleneck.count} briefings</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-6 flex gap-2">
          <button
            type="button"
            onClick={() => setFilterStatus('')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filterStatus === ''
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Todos
          </button>
          {Object.keys(STATUS_LABELS).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filterStatus === status
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {STATUS_LABELS[status]}
            </button>
          ))}
        </div>

        {briefings.length === 0 && !loading ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              Nenhum briefing encontrado
            </h3>
            <p className="text-slate-600 mb-6">
              Comece criando seu primeiro briefing para automatizar o fluxo da agência.
            </p>
            <button
              onClick={handleNewBriefing}
              className="px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              Criar Primeiro Briefing
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {briefings.map((briefing) => {
              const statusColor = STATUS_COLORS[briefing.status] || 'bg-gray-100 text-gray-700';
              const statusLabel = STATUS_LABELS[briefing.status] || briefing.status;
              const relativeDate = formatRelativeDate(briefing.due_at);
              const isOverdue = relativeDate?.includes('Atrasado');

              return (
                <div
                  key={briefing.id}
                  onClick={() => handleBriefingClick(briefing.id)}
                  className="p-6 bg-white rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-slate-900">
                          {briefing.title}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                          {statusLabel}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        {briefing.client_name && (
                          <div className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">business</span>
                            {briefing.client_name}
                          </div>
                        )}
                        {briefing.traffic_owner && (
                          <div className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">person</span>
                            {briefing.traffic_owner}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">calendar_today</span>
                          {formatDate(briefing.created_at)}
                        </div>
                        {briefing.source && (
                          <div className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">source</span>
                            {briefing.source}
                          </div>
                        )}
                      </div>
                    </div>

                    {briefing.due_at && (
                      <div className={`text-right ${isOverdue ? 'text-red-600' : 'text-slate-600'}`}>
                        <div className="text-sm font-medium">
                          {relativeDate || formatDate(briefing.due_at)}
                        </div>
                        {relativeDate && (
                          <div className="text-xs text-slate-500">
                            {formatDate(briefing.due_at)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
