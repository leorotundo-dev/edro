'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Card } from '@edro/ui';
import {
  CalendarRange,
  Calendar,
  BookOpen,
  RefreshCw,
  ShieldCheck,
  Map as MapIcon
} from 'lucide-react';
import { api, getCurrentUser } from '@/lib/api';

type EditalInteresse = {
  id: string;
  titulo?: string;
  banca?: string;
  data_prova_prevista?: string;
};

type MacroScheduleItem = {
  disciplina: string;
  assunto: string;
  subassunto: string;
  nivel: number;
  prioridade: number;
  type: 'new' | 'review' | 'practice';
  minutes: number;
};

type MacroScheduleDay = {
  date: string;
  phase: 'coverage' | 'consolidation' | 'final';
  items: MacroScheduleItem[];
  total_minutes: number;
  new_count: number;
  review_count: number;
  practice_minutes: number;
};

type MacroScheduleSummary = {
  edital_id: string;
  user_id: string;
  banca?: string | null;
  exam_date?: string | null;
  days_available: number;
  total_topics: number;
  total_minutes: number;
  min_minutes_per_day: number;
  coverage_days: number;
  consolidation_days: number;
  final_days: number;
  review_intervals: number[];
};

type MacroScheduleResult = {
  summary: MacroScheduleSummary;
  days: MacroScheduleDay[];
};

type WeekPlan = {
  index: number;
  rangeLabel: string;
  days: MacroScheduleDay[];
};

type BancaProfile = {
  label: string;
  format: string;
  tips: string[];
  cautions: string[];
  sources: Array<{ label: string; url: string }>;
};

const formatDateShort = (value: Date) =>
  value.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

const formatDateFull = (value: Date) =>
  value.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });

const buildWeeks = (days: MacroScheduleDay[]): WeekPlan[] => {
  const weeks: WeekPlan[] = [];
  for (let i = 0; i < days.length; i += 7) {
    const chunk = days.slice(i, i + 7);
    const start = chunk[0]?.date ? new Date(chunk[0].date) : null;
    const end = chunk[chunk.length - 1]?.date ? new Date(chunk[chunk.length - 1].date) : null;
    if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;
    weeks.push({
      index: weeks.length + 1,
      rangeLabel: `${formatDateShort(start)} - ${formatDateShort(end)}`,
      days: chunk,
    });
  }
  return weeks;
};

const resolveBancaKey = (value?: string) => {
  const normalized = (value || '').trim().toUpperCase();
  if (!normalized) return 'DEFAULT';
  if (normalized.includes('CEBRASPE') || normalized.includes('CESPE')) return 'CEBRASPE';
  return normalized;
};

const BANCA_PROFILES: Record<string, BancaProfile> = {
  CEBRASPE: {
    label: 'CEBRASPE (CESPE)',
    format: 'Certo/Errado (assertivas)',
    tips: [
      'Treine com assertivas curtas e diretas; cada item e um julgamento.',
      'Preste atencao em termos absolutos (sempre, nunca, apenas) e excecoes.',
      'Evite chute quando a regra de anulacao estiver ativa; precisa de seguranca.',
      'Leia o enunciado completo; a banca usa pegadinhas de detalhe e excecao.',
    ],
    cautions: [
      'A regra de anulacao (uma errada anula uma certa) pode variar. Sempre valide no edital.',
    ],
    sources: [
      {
        label: 'Correiobraziliense - criterio de anulacao',
        url: 'https://blogs.correiobraziliense.com.br/papodeconcurseiro/so-o-cebraspe-aplica-o-temido-criterio-uma-errada-anula-uma-certa-em-concursos/',
      },
      {
        label: 'Estrategia Concursos - metodo Cebraspe',
        url: 'https://www.estrategiaconcursos.com.br/blog/metodo-cebraspe-cespe-avaliacao/',
      },
      {
        label: 'Soma Concursos - metodo certo/errado',
        url: 'https://somaconcursos.com.br/cebraspe-no-concurso-ibama-como-funciona-o-metodo-certo-e-errado/',
      },
    ],
  },
  DEFAULT: {
    label: 'Banca nao identificada',
    format: 'Formato varia por edital',
    tips: [
      'Veja o edital para confirmar formato, pontuacao e penalidades.',
      'Analise provas anteriores para ajustar o estilo de treino.',
    ],
    cautions: [],
    sources: [],
  },
};

export default function PlanoMacroPage() {
  const [interesses, setInteresses] = useState<EditalInteresse[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<MacroScheduleResult | null>(null);
  const [expandedWeeks, setExpandedWeeks] = useState<Record<number, boolean>>({});

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
      setError(err?.message || 'Nao foi possivel carregar o plano macro.');
    } finally {
      setLoading(false);
    }
  };

  const loadSchedule = async (editalId: string) => {
    try {
      setScheduleLoading(true);
      setError(null);
      const user = getCurrentUser();
      const userId = user?.id || user?.sub;
      const response = await api.getEditalMacroPlan(editalId, userId ? { user_id: userId } : undefined);
      if (!response?.success) {
        throw new Error(response?.error || 'Erro ao carregar plano macro');
      }
      const payload = response.data ?? null;
      if (!payload?.summary) {
        throw new Error('Plano macro ainda nao esta disponivel.');
      }
      setSchedule(payload);
    } catch (err: any) {
      setError(err?.message || 'Nao foi possivel carregar o plano macro.');
      setSchedule(null);
    } finally {
      setScheduleLoading(false);
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
    void loadSchedule(selectedId);
  }, [selectedId]);

  const selectedEdital = useMemo(
    () => interesses.find((item) => item.id === selectedId) || null,
    [interesses, selectedId]
  );

  const summary = schedule?.summary;
  const weeks = useMemo(() => buildWeeks(schedule?.days ?? []), [schedule?.days]);

  const daysUntilExam = useMemo(() => {
    if (!summary?.exam_date) return null;
    const exam = new Date(summary.exam_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.ceil((exam.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return Number.isFinite(diff) && diff >= 0 ? diff : null;
  }, [summary?.exam_date]);

  const bancaKey = resolveBancaKey(selectedEdital?.banca);
  const bancaProfile = BANCA_PROFILES[bancaKey] ?? BANCA_PROFILES.DEFAULT;

  const handleToggleWeek = (index: number) => {
    setExpandedWeeks((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const handleRefresh = () => {
    void loadInteresses();
    if (selectedId) void loadSchedule(selectedId);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text-main flex items-center gap-2">
            <CalendarRange className="h-6 w-6 text-primary" />
            Plano Macro
          </h1>
          <p className="text-sm text-text-muted">
            Distribuicao inteligente do conteudo ate a prova.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} loading={loading || scheduleLoading}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </Card>
      )}

      {(loading || scheduleLoading) && (
        <Card className="p-5 text-sm text-text-muted">
          Carregando plano macro...
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

      {selectedEdital && summary && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Card padding="md" className="bg-surface-light">
              <p className="text-xs text-text-muted">Prova</p>
              <p className="text-lg font-semibold text-text-main mt-1">
                {summary.exam_date ? new Date(summary.exam_date).toLocaleDateString('pt-BR') : '-'}
              </p>
              {daysUntilExam !== null && (
                <p className="text-xs text-text-muted mt-1">{daysUntilExam} dias ate a prova</p>
              )}
            </Card>
            <Card padding="md" className="bg-surface-light">
              <p className="text-xs text-text-muted">Minimo por dia</p>
              <p className="text-lg font-semibold text-text-main mt-1">
                {summary.min_minutes_per_day} min
              </p>
            </Card>
            <Card padding="md" className="bg-surface-light">
              <p className="text-xs text-text-muted">Conteudos</p>
              <p className="text-lg font-semibold text-text-main mt-1">{summary.total_topics}</p>
            </Card>
            <Card padding="md" className="bg-surface-light">
              <p className="text-xs text-text-muted">Banca</p>
              <p className="text-lg font-semibold text-text-main mt-1">
                {selectedEdital.banca || '-'}
              </p>
            </Card>
          </div>

          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-text-main flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Calendario do edital
                </h2>
                <p className="text-sm text-text-muted">
                  Distribuicao por cobertura, consolidacao e revisao final.
                </p>
              </div>
              <Badge variant="gray">{weeks.length} semanas</Badge>
            </div>

            {schedule?.days?.length === 0 ? (
              <div className="rounded-lg border border-secondary-lilac/40 bg-secondary-bg p-4 text-sm text-text-muted">
                Conteudo programatico ainda nao informado para este edital.
              </div>
            ) : (
              <div className="space-y-3">
                {weeks.map((week) => (
                  <div key={week.index} className="rounded-xl border border-secondary-lilac/40 bg-surface-light p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-text-main">Semana {week.index}</p>
                        <p className="text-xs text-text-muted">{week.rangeLabel}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleWeek(week.index)}
                      >
                        {expandedWeeks[week.index] ? 'Ocultar' : 'Ver dias'}
                      </Button>
                    </div>

                    {expandedWeeks[week.index] && (
                      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                        {week.days.map((day) => {
                          const dayDate = new Date(day.date);
                          const phaseLabel =
                            day.phase === 'coverage'
                              ? 'Cobertura'
                              : day.phase === 'consolidation'
                              ? 'Consolidacao'
                              : 'Final';

                          return (
                            <div
                              key={day.date}
                              className={`rounded-lg border p-3 ${
                                day.phase === 'final'
                                  ? 'border-amber-200 bg-amber-50'
                                  : 'border-secondary-lilac/40 bg-surface-light'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-text-main">
                                  {Number.isNaN(dayDate.getTime()) ? day.date : formatDateFull(dayDate)}
                                </p>
                                <Badge variant={day.phase === 'final' ? 'warning' : 'gray'}>
                                  {phaseLabel}
                                </Badge>
                              </div>
                              <div className="mt-2 text-xs text-text-muted">
                                {day.total_minutes} min • {day.new_count} novos • {day.review_count} revisoes
                              </div>
                              <div className="mt-2 space-y-2">
                                {day.items.length === 0 ? (
                                  <p className="text-xs text-text-muted">Dia livre para revisao.</p>
                                ) : (
                                  day.items.slice(0, 4).map((item, index) => (
                                    <div key={`${item.subassunto}-${index}`} className="text-xs text-text-main">
                                      <span className="font-semibold text-text-main">{item.disciplina}</span>
                                      <span className="mx-2 text-secondary-lilac">/</span>
                                      <span>{item.subassunto || item.assunto}</span>
                                      {item.type === 'review' && (
                                        <span className="ml-2 text-text-muted">(revisao)</span>
                                      )}
                                    </div>
                                  ))
                                )}
                                {day.items.length > 4 && (
                                  <p className="text-[11px] text-text-muted">
                                    +{day.items.length - 4} conteudos adicionais
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-text-main flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  Perfil da banca
                </h2>
                <p className="text-sm text-text-muted">
                  Como a banca costuma cobrar e como ajustar seu estudo.
                </p>
              </div>
              <Badge variant="primary">{bancaProfile.label}</Badge>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-secondary-lilac/40 bg-secondary-bg p-4">
                <p className="text-xs text-text-muted">Formato</p>
                <p className="text-sm font-semibold text-text-main mt-1">{bancaProfile.format}</p>
                <div className="mt-3 space-y-2 text-xs text-text-main">
                  {bancaProfile.tips.map((tip) => (
                    <div key={tip} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary-500" />
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-secondary-lilac/40 bg-surface-light p-4">
                <p className="text-xs text-text-muted">Ajuste no estudo</p>
                <div className="mt-2 space-y-2 text-xs text-text-main">
                  <div className="flex items-start gap-2">
                    <MapIcon className="h-4 w-4 text-primary" />
                    <span>Transforme o conteudo em afirmacoes curtas para treinar C/E.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    <span>Reforce excecoes, detalhes e palavras absolutas.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <span>Evite chute quando houver penalizacao por erro.</span>
                  </div>
                </div>
              </div>
            </div>

            {bancaProfile.cautions.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                {bancaProfile.cautions.map((item) => (
                  <div key={item}>{item}</div>
                ))}
              </div>
            )}

            {bancaProfile.sources.length > 0 && (
              <div className="rounded-lg border border-secondary-lilac/40 bg-surface-light p-3 text-xs text-text-muted">
                <p className="font-semibold text-text-main mb-2">Fontes consultadas</p>
                <div className="space-y-1">
                  {bancaProfile.sources.map((source) => (
                    <div key={source.url}>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline"
                      >
                        {source.label}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
