'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getCurrentUser } from '@/lib/api';
import { Badge, Button, Card } from '@edro/ui';
import {
  clearStudySession,
  loadStudySession,
  saveStudySession,
  type StudySession,
  type StudySessionItem,
  type StudySessionTopic,
} from '@/lib/studySession';

const getTodayKey = () => new Intl.DateTimeFormat('en-CA').format(new Date());

type ApiPlanItem = {
  id: string;
  type: string;
  content_id?: string;
  title: string;
  description?: string;
  duration_minutes: number;
  difficulty?: number;
  order: number;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
};

type ApiPlan = {
  id: string;
  date: string;
  items: ApiPlanItem[];
};

type DropData = {
  id: string;
  title?: string;
  topic_code?: string | null;
  difficulty?: number | null;
  origin_meta?: any;
};

type JobInfo = {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  step?: string | null;
  disciplina?: string | null;
  topic?: string | null;
  dropsCount?: number | null;
  totalTopics?: number | null;
  updatedAt?: string | null;
  error?: string | null;
};

type SessionPreviewItem = StudySessionItem & {
  durationMinutes: number;
  order: number;
  status: ApiPlanItem['status'];
};

const normalizeType = (value: string) => {
  const trimmed = String(value || '').trim().toLowerCase();
  if (trimmed === 'bloco' || trimmed === 'block') return 'block';
  return trimmed;
};

const isContentItem = (value: string) => {
  const normalized = normalizeType(value);
  return normalized === 'drop' || normalized === 'block';
};

const normalizeText = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const extractDisciplineFromCode = (value?: string | null): string | null => {
  const trimmed = normalizeText(value);
  if (!trimmed || !trimmed.includes('::')) return null;
  const parts = trimmed.split('::').map((part) => part.trim()).filter(Boolean);
  return parts.length ? parts[0] : null;
};

const extractSubtopicFromCode = (value?: string | null): string | null => {
  const trimmed = normalizeText(value);
  if (!trimmed || !trimmed.includes('::')) return null;
  const parts = trimmed.split('::').map((part) => part.trim()).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : null;
};

const resolveDisciplineLabel = (drop: DropData): string | null => {
  const meta = drop.origin_meta || {};
  return (
    normalizeText(meta?.disciplina || meta?.discipline) ||
    extractDisciplineFromCode(drop.topic_code)
  );
};

const resolveSubassuntoLabel = (drop: DropData): string | null => {
  const meta = drop.origin_meta || {};
  return (
    normalizeText(meta?.subtopico) ||
    normalizeText(meta?.subtopic) ||
    normalizeText(meta?.sub_topico) ||
    extractSubtopicFromCode(drop.topic_code)
  );
};

const resolveTitle = (drop: DropData): string => {
  const title = normalizeText(drop.title);
  return title || resolveSubassuntoLabel(drop) || 'Conteudo';
};

const uniqueTopics = (items: StudySessionTopic[]) => {
  const seen = new Set<string>();
  const result: StudySessionTopic[] = [];
  items.forEach((item) => {
    const key = `${item.discipline.toLowerCase()}::${item.topic.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    result.push(item);
  });
  return result;
};

const computeQuestionsPerContent = (daysToExam: number | null) => {
  if (daysToExam === null) return 2;
  if (daysToExam <= 14) return 4;
  if (daysToExam <= 30) return 3;
  if (daysToExam <= 60) return 2;
  return 1;
};

const formatTime = (minutesFromStart: number) => {
  const hours = Math.floor(minutesFromStart / 60);
  const minutes = minutesFromStart % 60;
  const padded = String(minutes).padStart(2, '0');
  return `${hours.toString().padStart(2, '0')}:${padded}`;
};

const resolveIcon = (discipline?: string) => {
  const value = (discipline || '').toLowerCase();
  if (value.includes('portugues')) return 'menu_book';
  if (value.includes('ingles')) return 'language';
  if (value.includes('logico') || value.includes('matematica')) return 'calculate';
  if (value.includes('administrativo')) return 'gavel';
  if (value.includes('constitucional')) return 'account_balance';
  if (value.includes('politica')) return 'public';
  if (value.includes('governanca')) return 'insights';
  if (value.includes('tecnologia')) return 'memory';
  if (value.includes('regimento')) return 'policy';
  return 'auto_stories';
};

const resolveTagLabel = (discipline?: string) => discipline || 'Conteudo';

export default function EstudarPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusLabel, setStatusLabel] = useState<string>('Preparando sua trilha');
  const [activeEditalId, setActiveEditalId] = useState<string | null>(null);
  const [jobInfo, setJobInfo] = useState<JobInfo | null>(null);
  const [jobLoading, setJobLoading] = useState(false);
  const [lastCheckAt, setLastCheckAt] = useState<Date | null>(null);
  const [lastCheckLabel, setLastCheckLabel] = useState<string>('');
  const [sessionPreview, setSessionPreview] = useState<StudySession | null>(null);
  const [previewItems, setPreviewItems] = useState<SessionPreviewItem[]>([]);
  const [totalMinutes, setTotalMinutes] = useState(0);

  const resolveEditalId = useCallback(async (userId: string | null) => {
    let editalId: string | null = null;
    if (typeof window !== 'undefined') {
      editalId = localStorage.getItem('edro_selected_edital');
    }

    if (!editalId && userId) {
      try {
        const interesses = await api.listEditaisInteresses({ user_id: userId });
        const items = (interesses?.data ?? []) as Array<{ id: string }>;
        editalId = items[0]?.id ?? null;
        if (editalId && typeof window !== 'undefined') {
          localStorage.setItem('edro_selected_edital', editalId);
        }
      } catch {
        editalId = null;
      }
    }

    return editalId;
  }, []);

  const loadLatestJob = async (editalId: string | null) => {
    if (!editalId) {
      setJobInfo(null);
      return;
    }

    setJobLoading(true);
    try {
      const response = await api.getEditalLatestJob(editalId, { type: 'generate_edital_drops' });
      const job = response?.data as any;
      if (!job) {
        setJobInfo(null);
        return;
      }

      const result = job.result || {};
      const rawProgress = typeof result.computed_progress === 'number'
        ? result.computed_progress
        : typeof result.progress === 'number'
          ? result.progress
          : result.total
            ? Math.round((Number(result.processed || 0) / Number(result.total)) * 100)
            : 0;
      const progress = Math.max(0, Math.min(100, Math.round(rawProgress || 0)));
      const dropsCount = typeof result.drops_count === 'number' ? result.drops_count : null;
      const totalTopics = typeof result.total === 'number' ? result.total : null;

      const status: JobInfo['status'] =
        job.status === 'completed' || job.status === 'failed' || job.status === 'running' || job.status === 'pending'
          ? job.status
          : 'pending';

      setJobInfo({
        id: String(job.id),
        status,
        progress,
        step: result.step ?? null,
        disciplina: result.disciplina ?? null,
        topic: result.topic ?? null,
        dropsCount,
        totalTopics,
        updatedAt: result.updated_at ?? job.updated_at ?? null,
        error: job.error ?? null
      });
      setLastCheckAt(new Date());
    } catch {
      setJobInfo(null);
    } finally {
      setJobLoading(false);
    }
  };

  const buildSession = useCallback(async (persist: boolean) => {
    const todayKey = getTodayKey();
    const existing = loadStudySession();
    const existingIsValid = existing && existing.date === todayKey && existing.items.length > 0;
    const existingIndex = existingIsValid ? existing.currentIndex : 0;

    if (existing && (!existingIsValid || existing.date !== todayKey)) {
      clearStudySession();
    }

    try {
      setLoading(true);
      setError(null);
      setStatusLabel('Preparando sua trilha');

      const user = getCurrentUser();
      const userId = user?.id || user?.sub || null;
      const resolvedEditalId = await resolveEditalId(userId);
      setActiveEditalId(resolvedEditalId);

      const planResponse = await api.getPlanToday({ date: todayKey });
      let plan = (planResponse?.data ?? null) as ApiPlan | null;
      if (!plan) {
        const generateResponse = await api.generatePlan({ date: todayKey });
        plan = (generateResponse?.data ?? null) as ApiPlan | null;
      }

      if (!plan) {
        throw new Error('Plano indisponivel');
      }

      const contentItems = (plan.items || [])
        .filter((item) => isContentItem(item.type) && item.content_id)
        .sort((a, b) => a.order - b.order);

      if (contentItems.length === 0) {
        setError('Nenhum conteudo novo para hoje.');
        setLoading(false);
        return null;
      }

      setStatusLabel('Carregando conteudos');

      const drops = await Promise.all(
        contentItems.map(async (item) => {
          try {
            const response = await api.getDropById(item.content_id as string);
            return response?.data as DropData;
          } catch {
            return null;
          }
        })
      );

      const sessionItems: StudySessionItem[] = [];
      const preview: SessionPreviewItem[] = [];
      const topicEntries: StudySessionTopic[] = [];

      drops.forEach((drop, index) => {
        const item = contentItems[index];
        if (!drop || !item?.content_id) return;
        const discipline = resolveDisciplineLabel(drop) || 'Conteudo';
        const subtopic = resolveSubassuntoLabel(drop) || normalizeText(drop.topic_code) || 'Conteudo';
        const title = resolveTitle(drop);

        const sessionItem = {
          itemId: item.id,
          dropId: item.content_id as string,
          title,
          discipline,
          topic: subtopic,
          topicCode: drop.topic_code || undefined,
        };

        sessionItems.push(sessionItem);
        preview.push({
          ...sessionItem,
          durationMinutes: Math.max(5, Number(item.duration_minutes || 0)),
          order: item.order,
          status: item.status
        });

        if (discipline && subtopic) {
          topicEntries.push({
            discipline,
            topic: subtopic,
            nivel: drop.difficulty ? Math.round(drop.difficulty) : undefined,
          });
        }
      });

      if (sessionItems.length === 0) {
        throw new Error('Conteudos indisponiveis');
      }

      let daysToExam: number | null = null;
      let banca: string | null = null;

      if (resolvedEditalId && userId) {
        try {
          const macro = await api.getEditalMacroPlan(resolvedEditalId, { user_id: userId });
          const summary = macro?.data?.summary;
          banca = summary?.banca ?? null;
          if (summary?.exam_date) {
            const exam = new Date(summary.exam_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const diff = Math.ceil((exam.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            if (Number.isFinite(diff) && diff >= 0) {
              daysToExam = diff;
            }
          }
        } catch {
          daysToExam = null;
        }
      }

      const topics = uniqueTopics(topicEntries);
      const contentCount = Math.max(1, sessionItems.length);
      const questionsPerContent = computeQuestionsPerContent(daysToExam);
      const questionTarget = Math.max(1, contentCount * questionsPerContent);
      const questionsPerTopic = Math.max(1, Math.ceil(questionTarget / Math.max(1, topics.length)));
      const total = contentItems.reduce((sum, item) => sum + (item.duration_minutes || 0), 0);

      const session: StudySession = {
        date: todayKey,
        planId: plan.id,
        items: sessionItems,
        currentIndex: existingIndex,
        questionTarget,
        questionsPerTopic,
        questionsPerContent,
        topics,
        editalId: resolvedEditalId,
        examBoard: banca,
      };

      setSessionPreview(session);
      setPreviewItems(preview);
      setTotalMinutes(total);

      if (persist) {
        saveStudySession(session);
      }

      setLoading(false);
      return session;
    } catch (err: any) {
      setError(err?.message || 'Nao foi possivel iniciar o estudo.');
      setLoading(false);
      return null;
    }
  }, [resolveEditalId]);

  const handleStartPlan = async () => {
    const session = await buildSession(true);
    if (!session) return;
    const current = session.items[session.currentIndex] || session.items[0];
    if (current) {
      router.replace(`/estudo/${current.dropId}?session=1`);
    }
  };

  useEffect(() => {
    void buildSession(false);
  }, [buildSession]);

  useEffect(() => {
    if (!error || !activeEditalId) return;
    void loadLatestJob(activeEditalId);
    const interval = setInterval(() => {
      void loadLatestJob(activeEditalId);
    }, 20000);
    return () => clearInterval(interval);
  }, [error, activeEditalId]);

  useEffect(() => {
    if (!lastCheckAt) return;
    const updateLabel = () => {
      const diffMs = Date.now() - lastCheckAt.getTime();
      const diffSec = Math.max(0, Math.round(diffMs / 1000));
      if (diffSec < 60) {
        setLastCheckLabel(`Atualizado ha ${diffSec}s`);
        return;
      }
      const diffMin = Math.floor(diffSec / 60);
      setLastCheckLabel(`Atualizado ha ${diffMin} min`);
    };
    updateLabel();
    const interval = setInterval(updateLabel, 1000);
    return () => clearInterval(interval);
  }, [lastCheckAt]);

  const isJobReady =
    !!jobInfo &&
    jobInfo.progress >= 100 &&
    (jobInfo.totalTopics ? (jobInfo.dropsCount ?? 0) >= jobInfo.totalTopics : true);

  useEffect(() => {
    if (!jobInfo) return;
    if (!error) return;
    if (jobInfo.status === 'completed' || isJobReady) {
      void buildSession(false);
    }
  }, [jobInfo, error, isJobReady, buildSession]);

  const totalCount = previewItems.length;
  const completedCount = sessionPreview ? Math.min(sessionPreview.currentIndex, totalCount) : 0;
  const progressPercent = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;
  const totalHours = totalMinutes > 0 ? Math.max(0.5, Math.round((totalMinutes / 60) * 10) / 10) : 0;
  const activeIndex = sessionPreview?.currentIndex ?? 0;
  const nextItem = previewItems[activeIndex] || previewItems[0];

  if (loading && !error) {
    return (
      <div className="min-h-[70vh] bg-background-light">
        <div className="relative mx-auto flex min-h-[70vh] w-full max-w-md flex-col items-center justify-center px-6 py-10 text-center">
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-[420px] w-[420px] rounded-full bg-primary/10 blur-[90px]" />
          </div>
          <div className="relative z-10 flex w-full flex-col items-center gap-6">
            <div className="flex size-12 items-center justify-center rounded-full bg-surface-light/80 text-primary shadow-soft">
              <span className="material-symbols-outlined text-[22px]">auto_awesome</span>
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-bold text-text-main">Preparando seu estudo</h1>
              <p className="text-sm text-text-muted">{statusLabel}</p>
            </div>
            <div className="w-full space-y-2">
              <div className="h-3 w-full rounded-full bg-secondary-lilac/60">
                <div className="h-3 w-1/2 rounded-full bg-gradient-to-r from-primary/70 via-primary to-primary/70 animate-pulse" />
              </div>
              <div className="flex justify-between text-xs text-text-muted">
                <span>Organizando conteudos</span>
                <span>carregando...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    const isJobRunning = jobInfo && (jobInfo.status === 'running' || jobInfo.status === 'pending');
    const jobProgress = jobInfo?.progress ?? 0;
    const jobDetails = [jobInfo?.disciplina, jobInfo?.topic].filter(Boolean).join(' / ');

    return (
      <div className="min-h-[70vh] bg-background-light">
        <div className="mx-auto w-full max-w-md px-6 py-10">
          <div className="rounded-[2rem] border border-secondary-lilac/40 bg-surface-light/80 p-6 text-center shadow-soft">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-[22px]">calendar_month</span>
            </div>
            <div className="mt-4 space-y-2">
              <h1 className="text-xl font-bold text-text-main">
                {isJobRunning
                  ? 'Gerando conteudos do edital'
                  : isJobReady
                    ? 'Finalizando conteudos'
                    : 'Estudo do dia indisponivel'}
              </h1>
              <p className="text-sm text-text-muted">
                {isJobRunning
                  ? 'Seu conteudo esta sendo preparado. Assim que finalizar, seu plano diario sera liberado.'
                  : isJobReady
                    ? 'Validando os ultimos itens e preparando sua trilha de estudo.'
                    : error}
              </p>
            </div>
            {isJobRunning && (
              <div className="mt-6 space-y-3 text-left">
                <div className="flex items-center justify-between text-xs text-text-muted">
                  <span>{jobInfo?.step ? `Etapa: ${jobInfo.step}` : 'Processando'}</span>
                  <span>{jobProgress}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary-lilac/60">
                  <div
                    className="relative h-2 rounded-full bg-gradient-to-r from-primary/70 via-primary to-primary/70 transition-all"
                    style={{ width: `${jobProgress}%` }}
                  >
                    <div className="absolute inset-0 animate-pulse bg-surface-light/40" />
                  </div>
                </div>
                {jobDetails ? <p className="text-xs text-text-muted">{jobDetails}</p> : null}
                {typeof jobInfo?.dropsCount === 'number' && typeof jobInfo?.totalTopics === 'number' ? (
                  <p className="text-xs text-text-muted">
                    Conteudos gerados: {Math.min(jobInfo.dropsCount, jobInfo.totalTopics)} / {jobInfo.totalTopics}
                  </p>
                ) : null}
                {jobInfo?.updatedAt ? (
                  <p className="text-[11px] text-text-muted">
                    Atualizado: {new Date(jobInfo.updatedAt).toLocaleString('pt-BR')}
                  </p>
                ) : null}
                {lastCheckLabel ? <p className="text-[11px] text-text-muted">{lastCheckLabel}</p> : null}
              </div>
            )}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleStartPlan}
                className="flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-white shadow-soft transition-transform active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-[18px]">refresh</span>
                Tentar novamente
              </button>
              <button
                type="button"
                onClick={() => loadLatestJob(activeEditalId)}
                disabled={jobLoading}
                className="flex items-center gap-2 rounded-full border border-secondary-lilac/40 px-5 py-3 text-sm font-semibold text-text-muted transition-transform active:scale-[0.98] disabled:opacity-60"
              >
                <span className={`material-symbols-outlined text-[18px] ${jobLoading ? 'animate-spin' : ''}`}>
                  sync
                </span>
                Atualizar status
              </button>
              <button
                type="button"
                onClick={() => router.push('/plano-macro')}
                className="flex items-center gap-2 rounded-full border border-secondary-lilac/40 px-5 py-3 text-sm font-semibold text-text-muted transition-transform active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                Ver plano da prova
              </button>
            </div>
            {!isJobRunning && (
              <p className="mt-4 text-xs text-text-muted">Ajuste seu edital para liberar mais conteudo.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 pb-28 pt-4">
        <header className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="flex items-center justify-center rounded-full p-2 text-text-main transition-colors hover:bg-secondary-bg"
          >
            <span className="material-symbols-outlined text-[22px]">arrow_back</span>
          </button>
          <h2 className="text-lg font-bold text-text-main">Plano diario</h2>
          <div className="w-10" />
        </header>

        <section className="px-2">
          <h1 className="text-3xl font-bold text-text-main">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit' })}
          </h1>
          <p className="text-sm text-text-muted">
            Meta diaria: {totalHours ? `${totalHours} horas` : '---'}
          </p>
        </section>

        <section className="px-2">
          <Card className="p-4 border border-secondary-lilac/40">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-text-main">
                {completedCount} de {totalCount} tarefas concluidas
              </p>
              <span className="material-symbols-outlined text-primary">emoji_events</span>
            </div>
            <div className="mt-3 h-2.5 w-full rounded-full bg-secondary-lilac/40">
              <div
                className="h-2.5 rounded-full bg-primary transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="mt-3 text-sm text-text-muted">
              {nextItem ? `Pronto para comecar? Vamos em ${nextItem.discipline || 'conteudos'}.` : 'Pronto para comecar?'}
            </p>
          </Card>
        </section>

        <section className="px-2">
          <div className="relative flex flex-col gap-6">
            <div className="absolute left-7 top-6 bottom-6 w-0.5 bg-secondary-lilac/40" />
            {previewItems.length === 0 && (
              <p className="text-sm text-text-muted">Nenhum conteudo disponivel hoje.</p>
            )}
            {(() => {
              let cursor = 8 * 60;
              return previewItems.map((item, index) => {
                const start = cursor;
                const end = cursor + item.durationMinutes;
                cursor = end;
                const timeLabel = `${formatTime(start)} - ${formatTime(end)}`;
                const isActive = index === activeIndex;

                return (
                  <div key={item.itemId} className="relative grid grid-cols-[56px_1fr] gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-full border-4 border-background-light shadow-soft ${
                          isActive ? 'bg-primary text-white' : 'bg-surface-light text-text-muted border-secondary-lilac/40'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[22px]">{resolveIcon(item.discipline)}</span>
                      </div>
                    </div>
                    <div
                      className={`rounded-2xl border p-4 shadow-sm transition-colors ${
                        isActive
                          ? 'border-primary/40 bg-surface-light'
                          : 'border-secondary-lilac/40 bg-surface-light/80'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="rounded-full bg-secondary-bg px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-primary">
                          {timeLabel}
                        </span>
                        <span className="rounded-full bg-secondary-lilac/40 px-2 py-0.5 text-xs font-semibold text-text-main">
                          {resolveTagLabel(item.discipline)}
                        </span>
                      </div>
                      <h3 className="mt-2 text-lg font-semibold text-text-main">
                        {item.title || 'Conteudo'}
                      </h3>
                      <div className="mt-2 flex items-center gap-1 text-sm text-text-muted">
                        <span className="material-symbols-outlined text-[16px]">subdirectory_arrow_right</span>
                        <span>{item.topic || item.title || 'Conteudo'}</span>
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </section>
      </div>

      <div className="fixed bottom-0 left-0 w-full bg-gradient-to-t from-background-light via-background-light to-transparent pb-6 pt-12">
        <div className="mx-auto w-full max-w-md px-4">
          <Button fullWidth size="lg" onClick={handleStartPlan}>
            <span className="material-symbols-outlined text-[20px]">play_arrow</span>
            {completedCount > 0 ? 'Continuar plano' : 'Comecar plano'}
          </Button>
        </div>
      </div>
    </div>
  );
}
