'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Card } from '@edro/ui';
import { BookOpen, ChevronDown, ChevronUp, Layers, RefreshCw, Target } from 'lucide-react';
import { api, getCurrentUser } from '@/lib/api';
import { ProgressBar } from '@/components/ProgressBar';

type EditalInteresse = {
  id: string;
  titulo?: string;
  banca?: string;
};

type DisciplinaProgress = {
  disciplina: string;
  peso?: number | null;
  numero_questoes?: number | null;
  total_conteudos: number;
  drops_gerados: number;
  concluidos: number;
  progresso: number;
  questoes_respondidas: number;
  questoes_corretas: number;
  taxa_acerto: number | null;
  subtopicos?: Array<{
    subtopico: string;
    assunto?: string | null;
    total_conteudos: number;
    drops_gerados: number;
    concluidos: number;
    progresso: number;
    questoes_respondidas: number;
    questoes_corretas: number;
    taxa_acerto: number | null;
  }>;
};

type MateriasProgressPayload = {
  edital_id: string;
  user_id: string;
  disciplinas: DisciplinaProgress[];
};

const performanceLabel = (taxa: number | null) => {
  if (taxa === null) return { label: 'Sem dados', variant: 'gray' as const };
  if (taxa >= 80) return { label: 'Forte', variant: 'success' as const };
  if (taxa >= 60) return { label: 'Estavel', variant: 'primary' as const };
  if (taxa >= 40) return { label: 'Ajustar', variant: 'warning' as const };
  return { label: 'Critico', variant: 'danger' as const };
};

const formatPercent = (value: number) => `${Math.round(value)}%`;

export default function MateriasPage() {
  const [interesses, setInteresses] = useState<EditalInteresse[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [payload, setPayload] = useState<MateriasProgressPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const loadInteresses = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.listEditaisInteresses();
      if (!response?.success) {
        throw new Error(response?.error || 'Erro ao carregar editais');
      }
      const data = (response.data ?? []) as EditalInteresse[];
      setInteresses(data);

      const storedId = typeof window !== 'undefined'
        ? localStorage.getItem('edro_selected_edital')
        : null;
      const storedValid = storedId ? data.some((item) => item.id === storedId) : false;
      setSelectedId((prev) => {
        if (prev && data.some((item) => item.id === prev)) return prev;
        if (storedValid) return storedId ?? null;
        return data[0]?.id ?? null;
      });
    } catch (err: any) {
      setError(err?.message || 'Nao foi possivel carregar as materias.');
    } finally {
      setLoading(false);
    }
  };

  const loadProgress = async (editalId: string) => {
    try {
      setDataLoading(true);
      setError(null);
      const user = getCurrentUser();
      const userId = user?.id || user?.sub;
      const response = await api.getEditalMateriasProgress(editalId, userId ? { user_id: userId } : undefined);
      if (!response?.success) {
        throw new Error(response?.error || 'Erro ao carregar progresso');
      }
      setPayload(response.data ?? null);
    } catch (err: any) {
      setPayload(null);
      setError(err?.message || 'Nao foi possivel carregar as materias.');
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    void loadInteresses();
  }, []);

  useEffect(() => {
    if (!selectedId || typeof window === 'undefined') return;
    localStorage.setItem('edro_selected_edital', selectedId);
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    void loadProgress(selectedId);
  }, [selectedId]);

  const selectedEdital = useMemo(
    () => interesses.find((item) => item.id === selectedId) || null,
    [interesses, selectedId]
  );

  const disciplinas = useMemo(() => payload?.disciplinas ?? [], [payload?.disciplinas]);

  const summary = useMemo(() => {
    if (!disciplinas.length) {
      return {
        totalDisciplinas: 0,
        totalConteudos: 0,
        concluidos: 0,
        progresso: 0,
        taxaAcerto: null as number | null,
      };
    }
    const totals = disciplinas.reduce(
      (acc, item) => {
        const total = item.drops_gerados || item.total_conteudos || 0;
        acc.totalDisciplinas += 1;
        acc.totalConteudos += total;
        acc.concluidos += item.concluidos || 0;
        acc.respondidas += item.questoes_respondidas || 0;
        acc.corretas += item.questoes_corretas || 0;
        return acc;
      },
      { totalDisciplinas: 0, totalConteudos: 0, concluidos: 0, respondidas: 0, corretas: 0 }
    );
    const progresso = totals.totalConteudos > 0 ? (totals.concluidos / totals.totalConteudos) * 100 : 0;
    const taxaAcerto = totals.respondidas > 0 ? (totals.corretas / totals.respondidas) * 100 : null;
    return { ...totals, progresso, taxaAcerto };
  }, [disciplinas]);

  const handleRefresh = () => {
    void loadInteresses();
    if (selectedId) void loadProgress(selectedId);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text-main flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" />
            Materias
          </h1>
          <p className="text-sm text-text-muted">
            Veja o andamento de cada materia e seu desempenho.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} loading={loading || dataLoading}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </Card>
      )}
      {(loading || dataLoading) && (
        <Card className="p-5 text-sm text-text-muted">
          Carregando materias...
        </Card>
      )}
      {!loading && !selectedEdital && (
        <Card className="p-6 text-sm text-text-muted">
          Nenhum edital selecionado. Selecione um edital em{' '}
          <Link href="/editais" className="text-primary underline">
            Editais
          </Link>
          .
        </Card>
      )}
      {selectedEdital && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Card padding="md" className="bg-surface-light">
              <p className="text-xs text-text-muted">Disciplinas</p>
              <p className="text-lg font-semibold text-text-main mt-1">
                {summary.totalDisciplinas}
              </p>
            </Card>
            <Card padding="md" className="bg-surface-light">
              <p className="text-xs text-text-muted">Conteudos</p>
              <p className="text-lg font-semibold text-text-main mt-1">
                {summary.totalConteudos}
              </p>
            </Card>
            <Card padding="md" className="bg-surface-light">
              <p className="text-xs text-text-muted">Progresso geral</p>
              <p className="text-lg font-semibold text-text-main mt-1">
                {formatPercent(summary.progresso)}
              </p>
            </Card>
            <Card padding="md" className="bg-surface-light">
              <p className="text-xs text-text-muted">Desempenho</p>
              <p className="text-lg font-semibold text-text-main mt-1">
                {summary.taxaAcerto === null ? 'Sem dados' : formatPercent(summary.taxaAcerto)}
              </p>
            </Card>
          </div>

          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-text-main flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Mapa de materias
                </h2>
                <p className="text-sm text-text-muted">
                  {selectedEdital.titulo || 'Edital selecionado'}
                </p>
              </div>
              <Badge variant="gray">{disciplinas.length} materias</Badge>
            </div>

            {disciplinas.length === 0 ? (
              <div className="rounded-lg border border-secondary-lilac/40 bg-secondary-bg p-4 text-sm text-text-muted">
                Conteudo programatico ainda nao carregado.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {disciplinas.map((item) => {
                  const totalBase = item.drops_gerados || item.total_conteudos || 0;
                  const progressValue = totalBase > 0 ? (item.concluidos / totalBase) * 100 : 0;
                  const perf = performanceLabel(item.taxa_acerto);
                  const subtopics = item.subtopicos ?? [];
                  const showAll = expanded[item.disciplina] ?? true;
                  const isCollapsed = collapsed[item.disciplina] ?? false;
                  const visibleSubtopics = showAll ? subtopics : subtopics.slice(0, 4);
                  const hasMore = subtopics.length > visibleSubtopics.length;

                  return (
                    <div key={item.disciplina} className="rounded-xl border border-secondary-lilac/40 bg-surface-light p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-text-main">{item.disciplina}</p>
                          <p className="text-xs text-text-muted mt-1">
                            {totalBase} conteudos · {item.concluidos} concluidos
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={perf.variant}>{perf.label}</Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setCollapsed((prev) => ({
                                ...prev,
                                [item.disciplina]: !isCollapsed,
                              }))
                            }
                            className="flex items-center gap-1 text-xs"
                          >
                            {isCollapsed ? (
                              <>
                                <ChevronDown className="h-3.5 w-3.5" />
                                Abrir
                              </>
                            ) : (
                              <>
                                <ChevronUp className="h-3.5 w-3.5" />
                                Fechar
                              </>
                            )}
                          </Button>
                        </div>
                      </div>

                      <div className="mt-3">
                        <ProgressBar value={progressValue} size="sm" showPercentage />
                      </div>


                      {!isCollapsed && (
                        <>
                          <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-text-muted">
                          <div className="rounded-lg border border-secondary-lilac/40 bg-secondary-bg p-2">
                            <p className="text-[11px] text-text-muted">Peso</p>
                            <p className="font-semibold text-text-main">
                              {item.peso ?? '-'}
                            </p>
                            {item.peso === null && (
                              <p className="text-[10px] text-text-muted">Nao informado no edital</p>
                            )}
                          </div>
                          <div className="rounded-lg border border-secondary-lilac/40 bg-secondary-bg p-2">
                            <p className="text-[11px] text-text-muted">Questoes</p>
                            <p className="font-semibold text-text-main">
                              {item.numero_questoes ?? '-'}
                            </p>
                            {item.numero_questoes === null && (
                              <p className="text-[10px] text-text-muted">Nao informado no edital</p>
                            )}
                          </div>
                        </div>

                          <div className="mt-3 flex items-center justify-between text-xs text-text-muted">
                            <span className="flex items-center gap-2">
                              <Target className="h-3.5 w-3.5 text-primary" />
                              {item.taxa_acerto === null
                                ? 'Sem respostas ainda'
                                : `Acerto: ${formatPercent(item.taxa_acerto)}`}
                            </span>
                            {totalBase === 0 && (
                              <span className="text-[11px] text-amber-600">Em preparacao</span>
                            )}
                          </div>

                          {subtopics.length > 0 && (
                            <div className="mt-4 border-t border-secondary-lilac/40 pt-3">
                              <div className="flex items-center justify-between text-xs text-text-muted">
                                <span>{subtopics.length} subtopicos</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    setExpanded((prev) => ({
                                      ...prev,
                                      [item.disciplina]: !showAll,
                                    }))
                                  }
                                >
                                  {showAll ? 'Ocultar' : 'Ver subtopicos'}
                                </Button>
                              </div>
                              <div className="mt-3 space-y-2">
                                {visibleSubtopics.map((sub) => {
                                  const base = sub.drops_gerados || sub.total_conteudos || 0;
                                  const progress = base > 0 ? (sub.concluidos / base) * 100 : 0;
                                  return (
                                    <div key={sub.subtopico} className="rounded-lg border border-secondary-lilac/40 bg-secondary-bg p-2">
                                      <div className="flex items-center justify-between gap-2 text-xs">
                                        <span className="font-semibold text-text-main">
                                          {sub.subtopico}
                                        </span>
                                        <span className="text-[11px] text-text-muted">
                                          {sub.concluidos}/{base || 0} conteudos
                                        </span>
                                      </div>
                                      <ProgressBar
                                        value={progress}
                                        size="sm"
                                        showPercentage={false}
                                        className="mt-1"
                                      />
                                    </div>
                                  );
                                })}
                                {hasMore && (
                                  <p className="text-[11px] text-text-muted">
                                    {subtopics.length - visibleSubtopics.length} subtopicos adicionais.
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
