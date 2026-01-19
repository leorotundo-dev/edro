'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Bell, Calendar, CheckCircle2, Plus, RefreshCw, Search, Volume2 } from 'lucide-react';
import { ApiError } from '@edro/shared';
import { api } from '@/lib/api';
import { playTts } from '@/lib/tts';
import { VoiceNote } from '@/components/VoiceNote';

type ApiResponse<T> = {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: Record<string, any>;
};

type Edital = {
  id: string;
  codigo: string;
  titulo: string;
  orgao: string;
  banca?: string;
  status: string;
  data_publicacao?: string;
  data_prova_prevista?: string;
  numero_vagas?: number;
  tags?: string[];
};

type EditalInteresse = Edital & {
  cargo_interesse?: string | null;
  notificacoes_ativas?: boolean;
  interesse_em?: string;
};

type AutoFormacaoPayload = {
  banca?: string;
  modulos?: Array<{ id: string; nome: string; trilhas: string[]; cargos?: string[] }>;
  trilhas?: Array<{
    id: string;
    nome: string;
    disciplina: string;
    nivel: number;
    drops: string[];
    carga_sugerida_horas: number;
    drops_sugeridos: number;
  }>;
  drops?: Array<{ id: string; disciplina: string; subtopico: string; nivel: number; prioridade: number }>;
  resumo?: Record<string, any>;
  signals?: Record<string, any>;
};

type AutoFormacaoMeta = {
  version?: number;
  source_hash?: string;
  updated_at?: string;
};

type PaywallPayload = {
  plan?: string;
  feature?: string;
  limit?: number;
  current?: number;
  suggestedPlan?: string | null;
  upgradeUrl?: string | null;
  offer?: {
    code?: string;
    name?: string;
    price?: number | null;
    currency?: string;
  } | null;
};

const statusLabels: Record<string, string> = {
  rascunho: 'Rascunho',
  publicado: 'Publicado',
  em_andamento: 'Em andamento',
  suspenso: 'Suspenso',
  cancelado: 'Cancelado',
  concluido: 'Concluido',
};

export default function EditaisPage() {
  const [editais, setEditais] = useState<Edital[]>([]);
  const [interesses, setInteresses] = useState<EditalInteresse[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoLoading, setAutoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoError, setAutoError] = useState<string | null>(null);
  const [paywall, setPaywall] = useState<PaywallPayload | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [bancaFilter, setBancaFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionId, setActionId] = useState<string | null>(null);
  const [autoFormacao, setAutoFormacao] = useState<AutoFormacaoPayload | null>(null);
  const [autoMeta, setAutoMeta] = useState<AutoFormacaoMeta | null>(null);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [voiceNote, setVoiceNote] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      setPaywall(null);
      const [editaisRes, interessesRes] = await Promise.all([
        api.listEditais({ limit: 120 }),
        api.listEditaisInteresses(),
      ]);

      if (!editaisRes?.success) {
        throw new Error(editaisRes?.error || 'Erro ao carregar editais');
      }

      setEditais(editaisRes.data ?? []);
      setInteresses(interessesRes?.data ?? []);
      const storedId = typeof window !== 'undefined'
        ? localStorage.getItem('edro_selected_edital')
        : null;
      const storedValid = storedId
        ? interessesRes?.data?.some((item: EditalInteresse) => item.id === storedId)
        : false;
      setSelectedId((prev) => prev ?? (storedValid ? storedId : interessesRes?.data?.[0]?.id ?? null));
    } catch (err: any) {
      console.error('Erro ao carregar editais:', err);
      setError(err?.message || 'Nao foi possivel carregar os editais.');
    } finally {
      setLoading(false);
    }
  };

  const loadAutoFormacao = async (editalId: string, refresh?: boolean) => {
    try {
      setAutoLoading(true);
      setAutoError(null);
      const response = await api.getAutoFormacoes(editalId, refresh ? { refresh: true } : undefined);
      if (!response?.success) {
        throw new Error(response?.error || 'Erro ao carregar auto-formacao');
      }
      setAutoFormacao(response.data ?? null);
      setAutoMeta((response as ApiResponse<AutoFormacaoPayload>).meta ?? null);
    } catch (err: any) {
      console.error('Erro ao carregar auto-formacao:', err);
      setAutoError(err?.message || 'Nao foi possivel carregar auto-formacao.');
      setAutoFormacao(null);
      setAutoMeta(null);
    } finally {
      setAutoLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setAutoFormacao(null);
      setAutoMeta(null);
      return;
    }
    void loadAutoFormacao(selectedId);
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId || typeof window === 'undefined') return;
    localStorage.setItem('edro_selected_edital', selectedId);
  }, [selectedId]);

  const bancaOptions = useMemo(() => {
    const values = new Set<string>();
    editais.forEach((edital) => {
      if (edital.banca) values.add(edital.banca);
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [editais]);

  const interesseIds = useMemo(() => new Set(interesses.map((item) => item.id)), [interesses]);

  const filteredEditais = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return editais.filter((edital) => {
      if (interesseIds.has(edital.id)) return false;
      const matchesSearch =
        !search ||
        edital.titulo.toLowerCase().includes(search) ||
        edital.codigo.toLowerCase().includes(search) ||
        edital.orgao.toLowerCase().includes(search);
      const matchesBanca = bancaFilter === 'all' || edital.banca === bancaFilter;
      const matchesStatus = statusFilter === 'all' || edital.status === statusFilter;
      return matchesSearch && matchesBanca && matchesStatus;
    });
  }, [editais, interesseIds, searchTerm, bancaFilter, statusFilter]);

  const selectedEdital =
    interesses.find((item) => item.id === selectedId) || editais.find((item) => item.id === selectedId) || null;

  const autoResumo = (autoFormacao?.resumo || {}) as Record<string, any>;
  const autoPersonalizacao = (autoResumo?.personalizacao || {}) as Record<string, any>;
  const autoDropsSorted = Array.isArray(autoFormacao?.drops)
    ? [...autoFormacao!.drops].sort((a, b) => (b.prioridade || 0) - (a.prioridade || 0))
    : [];

  const formatDate = (value?: string) => {
    if (!value) return '-';
    try {
      return new Date(value).toLocaleDateString('pt-BR');
    } catch {
      return value;
    }
  };

  const formatCurrency = (value?: number | null) => {
    if (value === null || value === undefined) return null;
    if (!Number.isFinite(value)) return null;
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleFollow = async (editalId: string) => {
    try {
      setActionId(editalId);
      setPaywall(null);
      const response = await api.addEditalInteresse(editalId);
      if (!response?.success) {
        throw new Error(response?.error || 'Erro ao acompanhar edital');
      }
      await loadData();
    } catch (err: any) {
      console.error(err);
      if (err instanceof ApiError) {
        const payload = err.data?.paywall as PaywallPayload | undefined;
        if (payload) {
          setPaywall(payload);
          setError(err.data?.error || err.message);
          return;
        }
        setError(err.data?.error || err.message || 'Nao foi possivel acompanhar este edital.');
        return;
      }
      setError(err?.message || 'Nao foi possivel acompanhar este edital.');
    } finally {
      setActionId(null);
    }
  };

  const handleUnfollow = async (editalId: string) => {
    try {
      setActionId(editalId);
      const response = await api.removeEditalInteresse(editalId);
      if (!response?.success) {
        throw new Error(response?.error || 'Erro ao remover interesse');
      }
      const next = interesses.filter((item) => item.id !== editalId);
      setInteresses(next);
      if (selectedId === editalId) {
        setSelectedId(next[0]?.id ?? null);
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Nao foi possivel remover interesse.');
    } finally {
      setActionId(null);
    }
  };

  const handleToggleNotifications = async (item: EditalInteresse) => {
    try {
      setActionId(item.id);
      const response = await api.updateEditalInteresse(item.id, {
        notificacoes_ativas: !item.notificacoes_ativas,
      });
      if (!response?.success) {
        throw new Error(response?.error || 'Erro ao atualizar notificacoes');
      }
      setInteresses((prev) =>
        prev.map((edital) =>
          edital.id === item.id ? { ...edital, notificacoes_ativas: !item.notificacoes_ativas } : edital
        )
      );
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Nao foi possivel atualizar notificacoes.');
    } finally {
      setActionId(null);
    }
  };

  const buildTtsText = () => {
    if (!selectedEdital) return '';
    const parts = [
      selectedEdital.titulo,
      selectedEdital.banca ? `Banca ${selectedEdital.banca}` : '',
      selectedEdital.status ? `Status ${statusLabels[selectedEdital.status] || selectedEdital.status}` : '',
      `Prova ${formatDate(selectedEdital.data_prova_prevista)}`,
      autoFormacao
        ? `Auto-formacao com ${autoResumo.total_disciplinas ?? 0} disciplinas e ${autoResumo.total_drops ?? 0} drops.`
        : '',
    ].filter(Boolean);

    const topDrops = autoDropsSorted.slice(0, 5).map((drop) => drop.subtopico).filter(Boolean);
    if (topDrops.length) {
      parts.push(`Prioridades: ${topDrops.join(', ')}`);
    }
    return parts.join('\n');
  };

  const handleTts = async () => {
    const ttsText = buildTtsText();
    if (!ttsText) return;
    try {
      setTtsLoading(true);
      await playTts(ttsText);
    } catch (err) {
      console.error('Erro ao gerar audio:', err);
      setError('Nao foi possivel gerar o audio.');
    } finally {
      setTtsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Editais</h1>
        <p className="text-sm text-slate-600">
          Acompanhe editais, mantenha notificacoes ativas e gere auto-formacoes personalizadas.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {paywall && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-semibold">Limite de editais do plano gratuito atingido.</p>
          <p className="mt-1 text-xs text-amber-700">
            Voce pode acompanhar {paywall.limit ?? 1} edital gratuito. Para liberar mais, faca upgrade.
          </p>
          {paywall.offer && (
            <p className="mt-2 text-xs text-amber-700">
              Plano sugerido: {paywall.offer.name ?? paywall.offer.code}
              {formatCurrency(paywall.offer.price) ? ` · ${formatCurrency(paywall.offer.price)}` : ''}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {paywall.upgradeUrl ? (
              <a
                href={paywall.upgradeUrl}
                className="inline-flex items-center gap-2 rounded-md border border-amber-300 bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-200"
              >
                Fazer upgrade
              </a>
            ) : (
              <Link
                href="/configuracoes/planos"
                className="inline-flex items-center gap-2 rounded-md border border-amber-300 bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-200"
              >
                Ver planos
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Meus editais</h2>
                <p className="text-xs text-slate-500">Editais acompanhados e ativos para voce.</p>
              </div>
              <span className="text-xs text-slate-500">{interesses.length} ativos</span>
            </div>

            {loading ? (
              <p className="text-sm text-slate-500">Carregando...</p>
            ) : interesses.length === 0 ? (
              <p className="text-sm text-slate-500">Voce ainda nao acompanha nenhum edital.</p>
            ) : (
              <div className="space-y-3">
                {interesses.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-lg border p-3 ${
                      selectedId === item.id ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{item.titulo}</p>
                        <p className="text-xs text-slate-500">
                          {item.banca || 'Banca N/A'} • {statusLabels[item.status] || item.status}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedId(item.id)}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Ver auto-formacao
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                      <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5">
                        Prova: {formatDate(item.data_prova_prevista)}
                      </span>
                      {item.cargo_interesse && (
                        <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5">
                          Cargo: {item.cargo_interesse}
                        </span>
                      )}
                      <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5">
                        Notificacoes: {item.notificacoes_ativas === false ? 'off' : 'on'}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleNotifications(item)}
                        disabled={actionId === item.id}
                        className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-60"
                      >
                        <Bell className="h-3.5 w-3.5" />
                        {item.notificacoes_ativas === false ? 'Ativar' : 'Silenciar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUnfollow(item.id)}
                        disabled={actionId === item.id}
                        className="inline-flex items-center gap-2 rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Buscar editais</h2>
                <p className="text-xs text-slate-500">Filtre e acompanhe novos editais.</p>
              </div>
              <div className="relative w-full md:w-56">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar por titulo, codigo..."
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs"
                />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-500">Banca</label>
                <select
                  value={bancaFilter}
                  onChange={(event) => setBancaFilter(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                >
                  <option value="all">Todas</option>
                  {bancaOptions.map((banca) => (
                    <option key={banca} value={banca}>
                      {banca}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500">Status</label>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                >
                  <option value="all">Todos</option>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500">Total</label>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  {filteredEditais.length} editais disponiveis
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {loading ? (
                <p className="text-sm text-slate-500">Carregando editais...</p>
              ) : filteredEditais.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhum edital encontrado com esses filtros.</p>
              ) : (
                filteredEditais.map((edital) => (
                  <div key={edital.id} className="rounded-lg border border-slate-200 bg-white p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{edital.titulo}</p>
                        <p className="text-xs text-slate-500">
                          {edital.banca || 'Banca N/A'} • {statusLabels[edital.status] || edital.status}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                          <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5">
                            Prova: {formatDate(edital.data_prova_prevista)}
                          </span>
                          {edital.numero_vagas ? (
                            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5">
                              Vagas: {edital.numero_vagas}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleFollow(edital.id)}
                        disabled={actionId === edital.id}
                        className="inline-flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700 hover:bg-blue-100 disabled:opacity-60"
                      >
                        <Plus className="h-4 w-4" />
                        Acompanhar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Auto-formacao</h2>
                <p className="text-xs text-slate-500">Resumo do plano gerado automaticamente.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTts}
                  disabled={!selectedEdital || ttsLoading}
                  className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-60"
                >
                  <Volume2 className="h-3.5 w-3.5" />
                  {ttsLoading ? 'Audio...' : 'Ouvir'}
                </button>
                <button
                  type="button"
                  onClick={() => selectedId && loadAutoFormacao(selectedId, true)}
                  disabled={!selectedId || autoLoading}
                  className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-60"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${autoLoading ? 'animate-spin' : ''}`} />
                  Atualizar
                </button>
              </div>
            </div>

            {!selectedEdital ? (
              <p className="mt-4 text-sm text-slate-500">Selecione um edital para ver a auto-formacao.</p>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-sm font-semibold text-slate-900">{selectedEdital.titulo}</p>
                  <p className="text-xs text-slate-500">{selectedEdital.banca || 'Banca N/A'}</p>
                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                    <Calendar className="h-3.5 w-3.5" />
                    Prova: {formatDate(selectedEdital.data_prova_prevista)}
                  </div>
                </div>

                {autoError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {autoError}
                  </div>
                )}

                {autoLoading ? (
                  <p className="text-xs text-slate-500">Carregando auto-formacao...</p>
                ) : !autoFormacao ? (
                  <p className="text-xs text-slate-500">Nenhuma auto-formacao gerada ainda.</p>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'Disciplinas', value: autoResumo.total_disciplinas ?? 0 },
                        { label: 'Trilhas', value: autoResumo.total_trilhas ?? 0 },
                        { label: 'Drops', value: autoResumo.total_drops ?? 0 },
                        { label: 'Versao', value: autoMeta?.version ?? '-' },
                      ].map((item) => (
                        <div key={item.label} className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                          <p className="text-[11px] text-slate-500">{item.label}</p>
                          <p className="text-sm font-semibold text-slate-900">{item.value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white p-3">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Fonte: {autoPersonalizacao.fonte || 'sem dados'}</span>
                        <span>Erros: {autoPersonalizacao.total_erros || 0}</span>
                      </div>
                      <div className="mt-3 space-y-2 max-h-64 overflow-y-auto pr-1">
                        {autoDropsSorted.slice(0, 12).map((drop) => (
                          <div key={drop.id} className="rounded-md border border-slate-100 bg-slate-50 p-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-slate-800">{drop.subtopico}</span>
                              <span className="text-[11px] text-slate-500">N{drop.nivel}</span>
                            </div>
                            <p className="text-[11px] text-slate-500">
                              {drop.disciplina} • Prioridade {Math.round((drop.prioridade || 0) * 100)}%
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <VoiceNote
                  value={voiceNote}
                  onChange={setVoiceNote}
                  label="Notas por voz"
                  helper="Dite observacoes sobre este edital."
                  placeholder="Digite ou grave suas notas..."
                  className="mt-4"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
