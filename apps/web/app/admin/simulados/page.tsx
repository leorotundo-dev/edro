
'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiGet, apiPost, apiDelete } from '../../../lib/api';
import type { ApiResponse } from '../../../lib/api';
import { Button, StatCard } from '@edro/ui';
import {
  FileText,
  Plus,
  Filter,
  Search,
  Edit,
  Trash2,
  Eye,
  Users,
  TrendingUp,
  Clock,
  BarChart,
  Play
} from 'lucide-react';

interface SimuladoApi {
  id: string;
  name: string;
  description?: string;
  discipline?: string;
  exam_board?: string;
  total_questions?: number;
  time_limit_minutes?: number;
  tipo?: string;
  status?: string;
  created_at: string;
  config?: Record<string, any> | null;
}

interface SimuladoItem {
  id: string;
  title: string;
  exam_board: string;
  total_questions: number;
  duration_minutes: number;
  difficulty: number;
  status: 'draft' | 'active' | 'archived';
  created_at: string;
  total_attempts: number;
  average_score: number;
  completion_rate: number;
  topics: string[];
}

const STATUS_LABELS: Record<SimuladoItem['status'], string> = {
  draft: 'Rascunho',
  active: 'Ativo',
  archived: 'Arquivado'
};

const STATUS_COLORS: Record<SimuladoItem['status'], string> = {
  draft: 'bg-gray-100 text-gray-700',
  active: 'bg-green-100 text-green-700',
  archived: 'bg-yellow-100 text-yellow-700'
};

const STATUS_MAP: Record<string, SimuladoItem['status']> = {
  draft: 'draft',
  rascunho: 'draft',
  iniciado: 'draft',
  pausado: 'draft',
  active: 'active',
  ativo: 'active',
  'em_andamento': 'active',
  published: 'active',
  finalizado: 'archived',
  archived: 'archived'
};

function normalizeStatus(status?: string | null): SimuladoItem['status'] {
  if (!status) return 'draft';
  const normalized = status.toLowerCase();
  return STATUS_MAP[normalized] ?? 'draft';
}

function coerceNumber(value: any, fallback = 0): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function extractTopics(config: Record<string, any> | undefined, discipline?: string): string[] {
  if (config) {
    if (Array.isArray(config.topics) && config.topics.length > 0) {
      return config.topics;
    }
    if (Array.isArray(config.disciplinas) && config.disciplinas.length > 0) {
      return config.disciplinas;
    }
    if (Array.isArray(config.temas) && config.temas.length > 0) {
      return config.temas;
    }
  }
  return discipline ? [discipline] : [];
}

function mapSimulado(api: SimuladoApi): SimuladoItem {
  const config = (api.config && typeof api.config === 'object') ? api.config : {};
  const durationMinutes = api.time_limit_minutes ?? coerceNumber(config.tempo_total_minutos ?? (config.tempo_total_segundos ? config.tempo_total_segundos / 60 : undefined), 0);
  const difficulty = coerceNumber(config.dificuldade_inicial ?? config.dificuldade ?? 3, 3);
  const totalAttempts = coerceNumber(config.total_attempts ?? config.metrics?.total_attempts, 0);
  const averageScore = coerceNumber(config.average_score ?? config.metrics?.average_score, 0);
  const completionRate = coerceNumber(config.completion_rate ?? config.metrics?.completion_rate, 0);

  return {
    id: api.id,
    title: api.name || 'Simulado sem título',
    exam_board: api.exam_board || 'Banca não informada',
    total_questions: api.total_questions ?? coerceNumber(config.total_questoes, 0),
    duration_minutes: durationMinutes,
    difficulty,
    status: normalizeStatus(api.status),
    created_at: api.created_at,
    total_attempts: totalAttempts,
    average_score: averageScore,
    completion_rate: completionRate,
    topics: extractTopics(config, api.discipline)
  };
}

export default function SimuladosAdminPage() {
  const [filter, setFilter] = useState<'all' | 'active' | 'draft' | 'archived'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [simulados, setSimulados] = useState<SimuladoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSimulados();
  }, []);

  const loadSimulados = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiGet<ApiResponse<SimuladoApi[]>>('/simulados');
      if (!response?.success || !response.data) {
        throw new Error(response?.error || 'Erro ao carregar simulados');
      }

      setSimulados(response.data.map(mapSimulado));
    } catch (err) {
      console.error('Erro ao carregar simulados:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar simulados');
      setSimulados([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (simuladoId: string) => {
    if (!confirm('Deseja realmente deletar este simulado?')) return;

    try {
      const response = await apiDelete(`/simulados/${simuladoId}`);
      if (response?.success) {
        loadSimulados();
      }
    } catch (err) {
      console.error('Erro ao deletar simulado:', err);
    }
  };

  const createSimulado = async () => {
    try {
      const response = await apiPost('/simulados', {
        name: 'Novo Simulado',
        description: 'Simulado criado via admin',
        discipline: 'Direito Constitucional',
        examBoard: 'CESPE',
        totalQuestions: 50,
        timeLimitMinutes: 120,
        tipo: 'adaptativo'
      });

      if (response?.success) {
        alert('Simulado criado com sucesso!');
        loadSimulados();
      }
    } catch (err) {
      console.error('Erro ao criar simulado:', err);
    }
  };

  const stats = useMemo(() => {
    const total = simulados.length;
    const active = simulados.filter((s) => s.status === 'active').length;
    const draft = simulados.filter((s) => s.status === 'draft').length;
    const totalAttempts = simulados.reduce((sum, s) => sum + s.total_attempts, 0);
    const withAttempts = simulados.filter((s) => s.total_attempts > 0);
    const averageScore = withAttempts.length > 0
      ? withAttempts.reduce((sum, s) => sum + s.average_score, 0) / withAttempts.length
      : 0;
    const avgCompletion = withAttempts.length > 0
      ? withAttempts.reduce((sum, s) => sum + s.completion_rate, 0) / withAttempts.length
      : 0;

    return { total, active, draft, totalAttempts, averageScore, avgCompletion };
  }, [simulados]);

  const filteredSimulados = simulados.filter((s) => {
    const matchesFilter = filter === 'all' || s.status === filter;
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      s.title.toLowerCase().includes(term) ||
      s.exam_board.toLowerCase().includes(term);
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
              <FileText className="w-8 h-8 text-indigo-600" />
              <span>Gestão de Simulados</span>
            </h1>
            <p className="text-gray-600 mt-1">Criar e gerenciar simulados para os alunos</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={createSimulado}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Novo Simulado
            </button>
            <Button>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Importar
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8">
        <StatCard label="Total" value={stats.total.toString()} icon={FileText} color="blue" />
        <StatCard label="Ativos" value={stats.active.toString()} icon={Play} color="green" />
        <StatCard label="Rascunhos" value={stats.draft.toString()} icon={Edit} color="gray" />
        <StatCard label="Tentativas" value={stats.totalAttempts.toString()} icon={Users} color="purple" />
        <StatCard label="Média Geral" value={`${stats.averageScore.toFixed(0)}%`} icon={TrendingUp} color="indigo" />
        <StatCard label="Taxa Conclusão" value={`${stats.avgCompletion.toFixed(0)}%`} icon={BarChart} color="orange" />
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar simulados..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Todos ({stats.total})</option>
              <option value="active">Ativos ({stats.active})</option>
              <option value="draft">Rascunhos ({stats.draft})</option>
              <option value="archived">Arquivados</option>
            </select>
          </div>
        </div>
      </div>

      {loading && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4" />
          <p className="text-gray-600">Carregando simulados...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 rounded-lg border border-red-200 p-6">
          <p className="text-red-600">{error}</p>
          <button
            onClick={loadSimulados}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Tentar Novamente
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredSimulados.map((simulado) => (
            <div
              key={simulado.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{simulado.title}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[simulado.status]}`}>
                      {STATUS_LABELS[simulado.status]}
                    </span>
                  </div>
                  <div className="flex items-center flex-wrap gap-3 text-sm text-gray-600">
                    <span className="font-medium text-indigo-600">{simulado.exam_board}</span>
                    <span>•</span>
                    <span>{simulado.total_questions} questões</span>
                    <span>•</span>
                    <span className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      {simulado.duration_minutes || 0} min
                    </span>
                    <span>•</span>
                    <span>{'?'.repeat(Math.max(simulado.difficulty, 1))}</span>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex flex-wrap gap-2">
                  {(simulado.topics.length > 0 ? simulado.topics : ['Sem tópicos definidos']).map((topic, idx) => (
                    <span key={idx} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                      {topic}
                    </span>
                  ))}
                </div>
              </div>

              {simulado.total_attempts > 0 ? (
                <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{simulado.total_attempts}</p>
                    <p className="text-xs text-gray-600">Tentativas</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-indigo-600">{simulado.average_score}%</p>
                    <p className="text-xs text-gray-600">Média</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{simulado.completion_rate}%</p>
                    <p className="text-xs text-gray-600">Conclusão</p>
                  </div>
                </div>
              ) : (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg text-center">
                  <p className="text-sm text-gray-500">Nenhuma tentativa registrada</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t">
                <span className="text-xs text-gray-500">
                  Criado em {new Date(simulado.created_at).toLocaleDateString('pt-BR')}
                </span>
                <div className="flex items-center space-x-2">
                  <button className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                    <BarChart className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(simulado.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Deletar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && filteredSimulados.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Nenhum simulado encontrado</h3>
          <p className="text-gray-600 mb-6">Tente alterar os filtros ou crie um novo simulado.</p>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Criar Primeiro Simulado
          </Button>
        </div>
      )}
    </div>
  );
}
