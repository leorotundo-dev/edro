'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiDelete, apiGet, type ApiResponse } from '@/lib/api';
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Briefcase,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  Edit,
  ExternalLink,
  FileText,
  RefreshCw,
  Trash2,
  TrendingUp,
  Users
} from 'lucide-react';

interface EditalCargo {
  nome: string;
  vagas?: number;
  salario?: number;
  requisitos?: string;
}

interface EditalDisciplina {
  nome: string;
  peso?: number;
  numero_questoes?: number;
}

interface Edital {
  id: string;
  codigo: string;
  titulo: string;
  orgao: string;
  banca?: string;
  status: 'rascunho' | 'publicado' | 'em_andamento' | 'suspenso' | 'cancelado' | 'concluido';
  data_publicacao?: string;
  data_inscricao_inicio?: string;
  data_inscricao_fim?: string;
  data_prova_prevista?: string;
  descricao?: string;
  cargos?: EditalCargo[];
  disciplinas?: EditalDisciplina[];
  link_edital_completo?: string;
  link_inscricao?: string;
  numero_vagas: number;
  numero_inscritos: number;
  taxa_inscricao?: number;
  tags?: string[];
  observacoes?: string;
  created_at: string;
  updated_at: string;
}
interface EditalEvento {
  id: string;
  tipo: string;
  titulo: string;
  descricao?: string;
  data_inicio?: string;
  data_fim?: string;
  concluido: boolean;
}

const statusColors: Record<Edital['status'], string> = {
  rascunho: 'bg-gray-100 text-gray-800',
  publicado: 'bg-blue-100 text-blue-800',
  em_andamento: 'bg-green-100 text-green-800',
  suspenso: 'bg-yellow-100 text-yellow-800',
  cancelado: 'bg-red-100 text-red-800',
  concluido: 'bg-purple-100 text-purple-800'
};

const statusLabels: Record<Edital['status'], string> = {
  rascunho: 'Rascunho',
  publicado: 'Publicado',
  em_andamento: 'Em andamento',
  suspenso: 'Suspenso',
  cancelado: 'Cancelado',
  concluido: 'Concluído'
};

const eventTypeIcons: Record<string, string> = {
  inscricao: '📝',
  prova: '🧠',
  resultado: '🏁',
  recurso: '🛠️',
  convocacao: '📣',
  outro: '📌'
};

const TABS = [
  { id: 'detalhes', label: 'Detalhes', icon: FileText },
  { id: 'cargos', label: 'Cargos', icon: Briefcase },
  { id: 'disciplinas', label: 'Disciplinas', icon: BookOpen },
  { id: 'cronograma', label: 'Cronograma', icon: Calendar }
] as const;

type TabId = (typeof TABS)[number]['id'];
function formatDate(value?: string, options?: Intl.DateTimeFormatOptions) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('pt-BR', options || { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatDateTime(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('pt-BR');
}

function formatCurrency(value?: number | null) {
  if (value === undefined || value === null) return '—';
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2
  });
}

function formatRatio(inscritos: number, vagas: number) {
  if (!inscritos || !vagas) return '—';
  if (vagas === 0) return '—';
  return `${(inscritos / vagas).toFixed(1)} por vaga`;
}

export default function EditalDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string | undefined;

  const [edital, setEdital] = useState<Edital | null>(null);
  const [eventos, setEventos] = useState<EditalEvento[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('detalhes');
  const loadEdital = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const response = await apiGet<ApiResponse<Edital>>(`/editais/${id}`);
      if (!response?.success || !response.data) {
        throw new Error(response?.error || 'Não foi possível carregar o edital');
      }
      setEdital(response.data);
    } catch (err) {
      console.error('Erro ao carregar edital:', err);
      setEdital(null);
      setError(err instanceof Error ? err.message : 'Erro inesperado ao carregar o edital');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadEventos = useCallback(async () => {
    if (!id) return;
    try {
      setEventsLoading(true);
      setEventsError(null);
      const response = await apiGet<ApiResponse<EditalEvento[]>>(`/editais/${id}/eventos`);
      if (!response?.success) {
        throw new Error(response?.error || 'Não foi possível carregar o cronograma');
      }
      setEventos(response.data ?? []);
    } catch (err) {
      console.error('Erro ao carregar eventos:', err);
      setEventos([]);
      setEventsError(err instanceof Error ? err.message : 'Erro inesperado ao carregar eventos');
    } finally {
      setEventsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    loadEdital();
    loadEventos();
  }, [id, loadEdital, loadEventos]);
  const handleDelete = async () => {
    if (!id || !confirm('Deseja realmente excluir este edital?')) return;
    try {
      const response = await apiDelete<ApiResponse<unknown>>(`/editais/${id}`);
      if (!response?.success) {
        throw new Error(response?.error || 'Não foi possível excluir o edital');
      }
      alert('Edital excluído com sucesso!');
      router.push('/admin/editais');
    } catch (err) {
      console.error('Erro ao excluir edital:', err);
      alert(err instanceof Error ? err.message : 'Erro ao excluir edital');
    }
  };

  const handleRetry = () => {
    loadEdital();
    loadEventos();
  };

  const cards = useMemo(() => {
    if (!edital) return null;
    return [
      {
        title: 'Total de vagas',
        value: edital.numero_vagas,
        description: 'vagas oferecidas',
        accent: 'from-blue-50 to-blue-100',
        icon: Briefcase,
        border: 'border-blue-200',
        text: 'text-blue-900'
      },
      {
        title: 'Inscritos',
        value: edital.numero_inscritos,
        description: formatRatio(edital.numero_inscritos, edital.numero_vagas),
        accent: 'from-green-50 to-green-100',
        icon: Users,
        border: 'border-green-200',
        text: 'text-green-900'
      },
      {
        title: 'Taxa de inscrição',
        value: formatCurrency(edital.taxa_inscricao),
        description: 'valor oficial',
        accent: 'from-purple-50 to-purple-100',
        icon: DollarSign,
        border: 'border-purple-200',
        text: 'text-purple-900'
      },
      {
        title: 'Data da prova',
        value: formatDate(edital.data_prova_prevista),
        description: 'previsão divulgada',
        accent: 'from-orange-50 to-orange-100',
        icon: Calendar,
        border: 'border-orange-200',
        text: 'text-orange-900'
      }
    ];
  }, [edital]);
  if (!id) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-slate-600">Nenhum edital selecionado.</p>
          <button
            onClick={() => router.push('/admin/editais')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Voltar para Editais
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Carregando edital...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="max-w-lg w-full bg-white border border-red-200 rounded-xl p-8 text-center shadow">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Não foi possível carregar o edital</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium"
            >
              Tentar novamente
            </button>
            <button
              onClick={() => router.push('/admin/editais')}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium"
            >
              Voltar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!edital) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-slate-600">Edital não encontrado.</p>
          <button
            onClick={() => router.push('/admin/editais')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Voltar para Editais
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm font-medium">Voltar para Editais</span>
      </button>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white text-2xl font-bold shadow-lg">
              <FileText className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-slate-900">{edital.titulo}</h1>
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusColors[edital.status]}`}>
                  {statusLabels[edital.status]}
                </span>
              </div>
              <p className="text-slate-600 mb-1">
                {edital.orgao}
                {edital.banca ? ` · ${edital.banca}` : ''}
              </p>
              <p className="text-xs text-slate-500">Código: {edital.codigo}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push(`/admin/editais/${id}/editar`)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors shadow-sm"
            >
              <Edit className="w-4 h-4" />
              Editar
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 transition-colors shadow-sm"
            >
              <Trash2 className="w-4 h-4" />
              Excluir
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {cards?.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className={`bg-gradient-to-br ${card.accent} ${card.border} border rounded-xl p-5`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium ${card.text}`}>{card.title}</span>
                  <Icon className={`w-5 h-5 ${card.text}`} />
                </div>
                <div className={`text-2xl font-bold ${card.text}`}>
                  {typeof card.value === 'number' ? card.value : card.value}
                </div>
                <p className={`text-xs ${card.text.replace('900', '600')} mt-1`}>{card.description}</p>
              </div>
            );
          })}
        </div>
      </div>
      <div className="border-b border-slate-200">
        <div className="flex gap-6">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-6 space-y-6">
          {activeTab === 'detalhes' && (
            <div className="space-y-6">
              {edital.descricao && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <h3 className="font-bold text-lg text-slate-900 mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-slate-600" />
                    Descrição
                  </h3>
                  <p className="text-slate-700 leading-relaxed">{edital.descricao}</p>
                </div>
              )}

              <div>
                <h3 className="font-bold text-lg text-slate-900 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-slate-600" />
                  Datas importantes
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {edital.data_publicacao && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-4 h-4 text-blue-600" />
                        <h4 className="font-semibold text-blue-900 text-sm">Publicação</h4>
                      </div>
                      <p className="text-blue-700 font-medium">{formatDate(edital.data_publicacao)}</p>
                    </div>
                  )}

                  {edital.data_inscricao_inicio && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-green-600" />
                        <h4 className="font-semibold text-green-900 text-sm">Início das inscrições</h4>
                      </div>
                      <p className="text-green-700 font-medium">{formatDate(edital.data_inscricao_inicio)}</p>
                    </div>
                  )}

                  {edital.data_inscricao_fim && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-4 h-4 text-orange-600" />
                        <h4 className="font-semibold text-orange-900 text-sm">Fim das inscrições</h4>
                      </div>
                      <p className="text-orange-700 font-medium">{formatDate(edital.data_inscricao_fim)}</p>
                    </div>
                  )}

                  {edital.data_prova_prevista && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-purple-600" />
                        <h4 className="font-semibold text-purple-900 text-sm">Prova prevista</h4>
                      </div>
                      <p className="text-purple-700 font-medium">{formatDate(edital.data_prova_prevista)}</p>
                    </div>
                  )}
                </div>
              </div>
              {(edital.link_edital_completo || edital.link_inscricao) && (
                <div>
                  <h3 className="font-bold text-lg text-slate-900 mb-3 flex items-center gap-2">
                    <ExternalLink className="w-5 h-5 text-slate-600" />
                    Links úteis
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {edital.link_edital_completo && (
                      <a
                        href={edital.link_edital_completo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <FileText className="w-5 h-5 text-blue-600" />
                        <div>
                          <div className="font-semibold text-blue-900 text-sm">Edital completo</div>
                          <div className="text-xs text-blue-600">Abrir documento oficial</div>
                        </div>
                        <ExternalLink className="w-4 h-4 text-blue-600 ml-auto" />
                      </a>
                    )}
                    {edital.link_inscricao && (
                      <a
                        href={edital.link_inscricao}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                      >
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <div>
                          <div className="font-semibold text-green-900 text-sm">Inscrição</div>
                          <div className="text-xs text-green-600">Fazer inscrição online</div>
                        </div>
                        <ExternalLink className="w-4 h-4 text-green-600 ml-auto" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {edital.tags && edital.tags.length > 0 && (
                <div>
                  <h3 className="font-bold text-lg text-slate-900 mb-3">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {edital.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {edital.observacoes && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-bold text-lg text-yellow-900 mb-3 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                    Observações
                  </h3>
                  <p className="text-yellow-800 leading-relaxed">{edital.observacoes}</p>
                </div>
              )}
            </div>
          )}
          {activeTab === 'cargos' && (
            <div>
              {Array.isArray(edital.cargos) && edital.cargos.length > 0 ? (
                <div className="space-y-4">
                  {edital.cargos.map((cargo, index) => (
                    <div
                      key={`${cargo.nome}-${index}`}
                      className="bg-slate-50 border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="font-bold text-lg text-slate-900">{cargo.nome}</h3>
                        {cargo.vagas !== undefined && (
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                            {cargo.vagas} vagas
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {cargo.salario !== undefined && (
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-green-600" />
                            <div>
                              <div className="text-xs text-slate-600">Salário</div>
                              <div className="font-semibold text-slate-900">{formatCurrency(cargo.salario)}</div>
                            </div>
                          </div>
                        )}
                        {cargo.requisitos && (
                          <div className="md:col-span-2 p-3 bg-white border border-slate-200 rounded-lg">
                            <div className="text-xs text-slate-600 mb-1">Requisitos</div>
                            <div className="text-sm text-slate-900">{cargo.requisitos}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">Nenhum cargo cadastrado.</p>
                </div>
              )}
            </div>
          )}
          {activeTab === 'disciplinas' && (
            <div>
              {Array.isArray(edital.disciplinas) && edital.disciplinas.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Disciplina
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Peso
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Questões
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {edital.disciplinas.map((disc, index) => (
                        <tr key={`${disc.nome}-${index}`} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <BookOpen className="w-4 h-4 text-blue-600" />
                              <span className="text-sm font-medium text-slate-900">{disc.nome}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-slate-600">{disc.peso ?? '—'}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                              {disc.numero_questoes ?? 0} questões
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">Nenhuma disciplina cadastrada.</p>
                </div>
              )}
            </div>
          )}
          {activeTab === 'cronograma' && (
            <div>
              {eventsLoading ? (
                <div className="py-12 text-center">
                  <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
                  <p className="text-slate-500">Carregando cronograma...</p>
                </div>
              ) : eventsError ? (
                <div className="py-12 text-center">
                  <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
                  <p className="text-red-600 mb-3">Não foi possível carregar o cronograma.</p>
                  <button
                    onClick={loadEventos}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg"
                  >
                    Tentar novamente
                  </button>
                </div>
              ) : eventos.length > 0 ? (
                <div className="space-y-4">
                  {eventos.map((evento) => (
                    <div
                      key={evento.id}
                      className={`border rounded-xl p-5 transition-all ${
                        evento.concluido
                          ? 'bg-slate-50 border-slate-200'
                          : 'bg-white border-blue-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-xl">
                              {eventTypeIcons[evento.tipo] ?? eventTypeIcons.outro}
                            </div>
                            <div>
                              <h3 className="font-bold text-lg text-slate-900">{evento.titulo}</h3>
                              <span
                                className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium mt-1 ${
                                  evento.concluido
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-blue-100 text-blue-700'
                                }`}
                              >
                                {evento.concluido ? 'Concluído' : 'Em andamento'}
                              </span>
                            </div>
                          </div>
                          {evento.descricao && (
                            <p className="text-slate-700 mb-3 ml-13">{evento.descricao}</p>
                          )}
                          <div className="flex items-center gap-2 text-sm text-slate-600 ml-13">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDateTime(evento.data_inicio)}</span>
                            {evento.data_fim && <span>até {formatDateTime(evento.data_fim)}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">Nenhum evento cadastrado no cronograma.</p>
                  <p className="text-sm text-slate-400 mt-1">Adicione datas importantes para este edital.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
