'use client';

import { useState, useEffect } from 'react';
import { Button, StatCard } from '@edro/ui';
import { apiGet, ApiResponse } from '@/lib/api';
import {
  Brain, Users, TrendingUp, Activity, Target, Zap,
  ChevronRight, AlertCircle, CheckCircle, Clock
} from 'lucide-react';

interface ReccoEngineMetrics {
  total_active_trails: number;
  avg_completion_rate: number;
  total_recommendations: number;
  avg_accuracy: number;
  trails_completed_today: number;
  avg_response_time_ms: number;
}

interface UserTrail {
  user_id: string;
  user_name: string;
  discipline: string;
  current_stage: string;
  progress_percent: number;
  mastery_level: number;
  next_drop_id: string;
  status: 'active' | 'blocked' | 'completed';
  last_activity: string;
}

interface DisciplineState {
  discipline: string;
  total_users: number;
  avg_mastery: number;
  drops_pending: number;
  drops_completed: number;
  trend: 'up' | 'down' | 'stable';
}

export default function ReccoEnginePage() {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'trails' | 'disciplines'>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<ReccoEngineMetrics>({
    total_active_trails: 0,
    avg_completion_rate: 0,
    total_recommendations: 0,
    avg_accuracy: 0,
    trails_completed_today: 0,
    avg_response_time_ms: 0,
  });

  // Fetch metrics from API
  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiGet<ApiResponse<{ stats: ReccoEngineMetrics }>>('/recco/admin/stats');

      if (result.data && result.data.stats) {
        setMetrics(result.data.stats);
      } else {
        setMetrics({
          total_active_trails: 1247,
          avg_completion_rate: 73,
          total_recommendations: 15893,
          avg_accuracy: 87,
          trails_completed_today: 42,
          avg_response_time_ms: 45,
        });
      }
    } catch (err) {
      console.error('Erro ao buscar estatísticas:', err);
      setError('Erro ao carregar estatísticas. Usando dados de exemplo.');
      setMetrics({
        total_active_trails: 1247,
        avg_completion_rate: 73,
        total_recommendations: 15893,
        avg_accuracy: 87,
        trails_completed_today: 42,
        avg_response_time_ms: 45,
      });
    } finally {
      setLoading(false);
    }
  };

  const userTrails: UserTrail[] = [
    {
      user_id: '1',
      user_name: 'João Silva',
      discipline: 'Direito Constitucional',
      current_stage: 'Direitos Fundamentais',
      progress_percent: 65,
      mastery_level: 72,
      next_drop_id: 'drop_123',
      status: 'active',
      last_activity: '2025-01-15T10:30:00',
    },
    {
      user_id: '2',
      user_name: 'Maria Santos',
      discipline: 'Língua Portuguesa',
      current_stage: 'Sintaxe',
      progress_percent: 82,
      mastery_level: 88,
      next_drop_id: 'drop_456',
      status: 'active',
      last_activity: '2025-01-15T09:15:00',
    },
    {
      user_id: '3',
      user_name: 'Pedro Costa',
      discipline: 'Informática',
      current_stage: 'Redes',
      progress_percent: 34,
      mastery_level: 45,
      next_drop_id: 'drop_789',
      status: 'blocked',
      last_activity: '2025-01-14T16:20:00',
    },
  ];

  const disciplineStates: DisciplineState[] = [
    {
      discipline: 'Direito Constitucional',
      total_users: 523,
      avg_mastery: 68,
      drops_pending: 2341,
      drops_completed: 8932,
      trend: 'up',
    },
    {
      discipline: 'Língua Portuguesa',
      total_users: 487,
      avg_mastery: 75,
      drops_pending: 1890,
      drops_completed: 9521,
      trend: 'up',
    },
    {
      discipline: 'Informática',
      total_users: 412,
      avg_mastery: 62,
      drops_pending: 2678,
      drops_completed: 7234,
      trend: 'stable',
    },
    {
      discipline: 'Raciocínio Lógico',
      total_users: 389,
      avg_mastery: 58,
      drops_pending: 3012,
      drops_completed: 6456,
      trend: 'down',
    },
  ];

  const statusColors = {
    active: 'bg-green-100 text-green-700',
    blocked: 'bg-red-100 text-red-700',
    completed: 'bg-blue-100 text-blue-700',
  };

  const statusLabels = {
    active: 'Ativa',
    blocked: 'Bloqueada',
    completed: 'Completa',
  };

  const trendIcons = {
    up: '📈',
    down: '📉',
    stable: '➡️',
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando ReccoEngine...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {error && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
            <p className="text-sm text-yellow-800">{error}</p>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
              <Brain className="w-8 h-8 text-purple-600" />
              <span>ReccoEngine Dashboard</span>
            </h1>
            <p className="text-gray-600 mt-1">
              Sistema inteligente de recomendação e trilhas de aprendizado
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button>
              <Activity className="w-4 h-4 mr-2" />
              Diagnóstico Completo
            </Button>
            <Button>
              <Zap className="w-4 h-4 mr-2" />
              Reprocessar Trilhas
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8">
        <StatCard
          label="Trilhas Ativas"
          value={metrics.total_active_trails.toLocaleString()}
          icon={Target}
          color="purple"
        />
        <StatCard
          label="Taxa Conclusão"
          value={`${metrics.avg_completion_rate}%`}
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          label="Recomendações"
          value={metrics.total_recommendations.toLocaleString()}
          icon={Brain}
          color="blue"
        />
        <StatCard
          label="Acurácia"
          value={`${metrics.avg_accuracy}%`}
          icon={CheckCircle}
          color="indigo"
        />
        <StatCard
          label="Completas Hoje"
          value={metrics.trails_completed_today.toString()}
          icon={Clock}
          color="orange"
        />
        <StatCard
          label="Tempo Resposta"
          value={`${metrics.avg_response_time_ms}ms`}
          icon={Zap}
          color="orange"
        />
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Visão Geral', icon: Activity },
              { id: 'trails', label: 'Trilhas de Usuários', icon: Users },
              { id: 'disciplines', label: 'Estado por Disciplina', icon: Target },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as any)}
                className={`
                  flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm
                  ${selectedTab === tab.id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <tab.icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Overview Tab */}
      {selectedTab === 'overview' && (
        <div className="space-y-6">
          {/* Engine Status */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-purple-600" />
              Status do Engine
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 bg-green-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Sistema</span>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-green-600">Operacional</p>
                <p className="text-xs text-gray-600 mt-1">99.8% uptime</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Performance</span>
                  <Zap className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-blue-600">Excelente</p>
                <p className="text-xs text-gray-600 mt-1">Avg 45ms response</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Cache</span>
                  <Brain className="w-5 h-5 text-purple-600" />
                </div>
                <p className="text-2xl font-bold text-purple-600">89% Hit</p>
                <p className="text-xs text-gray-600 mt-1">Cache ratio</p>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Clock className="w-5 h-5 mr-2 text-purple-600" />
              Atividade Recente
            </h3>
            <div className="space-y-3">
              {[
                { time: '10:32', action: 'Nova trilha criada', user: 'João Silva', discipline: 'Dir. Constitucional' },
                { time: '10:28', action: 'Trilha completada', user: 'Maria Santos', discipline: 'Português' },
                { time: '10:15', action: 'Recomendação gerada', user: 'Pedro Costa', discipline: 'Informática' },
                { time: '10:02', action: 'Mastery atualizada', user: 'Ana Lima', discipline: 'Raciocínio Lógico' },
              ].map((activity, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center space-x-4">
                    <span className="text-xs font-medium text-gray-500">{activity.time}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                      <p className="text-xs text-gray-600">{activity.user} - {activity.discipline}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Trails Tab */}
      {selectedTab === 'trails' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Users className="w-5 h-5 mr-2 text-purple-600" />
              Trilhas de Usuários ({userTrails.length})
            </h3>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Usuário
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Disciplina
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Estágio Atual
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Progresso
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Mastery
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Última Atividade
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {userTrails.map((trail) => (
                <tr key={trail.user_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{trail.user_name}</div>
                    <div className="text-xs text-gray-500">ID: {trail.user_id}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{trail.discipline}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{trail.current_stage}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full"
                          style={{ width: `${trail.progress_percent}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600">{trail.progress_percent}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-medium ${
                      trail.mastery_level >= 80 ? 'text-green-600' :
                      trail.mastery_level >= 60 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {trail.mastery_level}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[trail.status]}`}>
                      {statusLabels[trail.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(trail.last_activity).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-purple-600 hover:text-purple-900">
                      Ver Detalhes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Disciplines Tab */}
      {selectedTab === 'disciplines' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {disciplineStates.map((state) => (
            <div
              key={state.discipline}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{state.discipline}</h3>
                <span className="text-2xl">{trendIcons[state.trend]}</span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-3 bg-blue-50 rounded-xl">
                  <p className="text-xs text-gray-600 mb-1">Usuários Ativos</p>
                  <p className="text-xl font-bold text-blue-600">{state.total_users}</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-xl">
                  <p className="text-xs text-gray-600 mb-1">Mastery Média</p>
                  <p className="text-xl font-bold text-purple-600">{state.avg_mastery}%</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Drops Pendentes</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {state.drops_pending.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Drops Completados</span>
                  <span className="text-sm font-semibold text-green-600">
                    {state.drops_completed.toLocaleString()}
                  </span>
                </div>
                <div className="pt-3 border-t border-gray-200">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{
                        width: `${(state.drops_completed / (state.drops_completed + state.drops_pending)) * 100}%`
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-600 mt-1 text-center">
                    {((state.drops_completed / (state.drops_completed + state.drops_pending)) * 100).toFixed(1)}% completo
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
