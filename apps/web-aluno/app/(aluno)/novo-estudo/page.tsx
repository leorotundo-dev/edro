'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, Button, Badge } from '@edro/ui';
import { BookOpen, Sparkles, Mic, Square, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { readStoredAccessibility } from '@/lib/accessibility';
import {
  saveStudySession,
  type StudySession,
  type StudySessionItem,
  type StudySessionTopic,
} from '@/lib/studySession';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';
const STORAGE_KEY = 'edro_study_request';
const POLL_DELAY_MS = 8000;

type StudyRequestState = {
  topic: string;
  level?: string;
  editalId: string;
  jobId?: string | number | null;
  sourceIds?: string[];
};

type DropItem = {
  id: string;
  title?: string;
  topic_code?: string;
  difficulty?: number;
};

type SourceItem = {
  id: string;
  type: string;
  status: string;
  title?: string | null;
  url?: string | null;
  file_name?: string | null;
  error_message?: string | null;
};

const getTodayKey = () => new Intl.DateTimeFormat('en-CA').format(new Date());

const levelOptions = [
  { value: '', label: 'Nivel opcional' },
  { value: 'N1', label: 'N1 - Basico' },
  { value: 'N2', label: 'N2 - Intermediario' },
  { value: 'N3', label: 'N3 - Medio' },
  { value: 'N4', label: 'N4 - Avancado' },
  { value: 'N5', label: 'N5 - Turbo' },
];

export default function EstudarPage() {
  const router = useRouter();
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState('');
  const [editalId, setEditalId] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | number | null>(null);
  const [drops, setDrops] = useState<DropItem[]>([]);
  const [questionsTotal, setQuestionsTotal] = useState(0);
  const [requestLoading, setRequestLoading] = useState(false);
  const [dropsLoading, setDropsLoading] = useState(false);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [sourceIds, setSourceIds] = useState<string[]>([]);
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [sourceText, setSourceText] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceUploading, setSourceUploading] = useState(false);
  const [jobStatus, setJobStatus] = useState<'pending' | 'running' | 'completed' | 'failed' | null>(null);
  const [jobProgress, setJobProgress] = useState<number | null>(null);
  const [jobStep, setJobStep] = useState<string | null>(null);
  const [jobMeta, setJobMeta] = useState<Record<string, any> | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [startLoading, setStartLoading] = useState(false);

  const [recording, setRecording] = useState(false);
  const [sttLoading, setSttLoading] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as StudyRequestState;
      if (saved?.topic) setTopic(saved.topic);
      if (saved?.level) setLevel(saved.level);
      if (saved?.editalId) setEditalId(saved.editalId);
      if (saved?.jobId) setJobId(saved.jobId);
      if (Array.isArray(saved?.sourceIds)) setSourceIds(saved.sourceIds);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const persistState = (payload: StudyRequestState) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  };

  const persistCurrentState = (patch?: Partial<StudyRequestState>) => {
    persistState({
      topic,
      level: level || undefined,
      editalId: editalId || '',
      jobId: jobId ?? null,
      sourceIds,
      ...(patch || {}),
    } as StudyRequestState);
  };

  const clearState = () => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(STORAGE_KEY);
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

  const resolveTopicInfo = (drop: DropItem) => {
    const topicCode = normalizeText(drop.topic_code);
    const discipline = extractDisciplineFromCode(topicCode);
    const subtopic = extractSubtopicFromCode(topicCode);
    if (discipline && subtopic) {
      return { discipline, topic: subtopic };
    }
    const title = normalizeText(drop.title) || topicCode;
    return {
      discipline: discipline || 'Conteudo',
      topic: subtopic || title || 'Conteudo',
    };
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

  const loadDrops = async (targetEditalId: string) => {
    try {
      setDropsLoading(true);
      const response = await api.listUserDrops({
        edital_id: targetEditalId,
        origin: 'study_request',
        limit: 100,
      });
      const items = Array.isArray(response?.data) ? response.data : [];
      setDrops(items);
      setReady(items.length > 0);
      return items;
    } catch (err) {
      setError('Nao foi possivel carregar os conteudos.');
      setDrops([]);
      setReady(false);
      return [];
    } finally {
      setDropsLoading(false);
    }
  };

  const loadQuestionsCount = async (targetEditalId: string) => {
    try {
      setQuestionsLoading(true);
      const response = await api.listQuestions({
        status: 'active',
        editalId: targetEditalId,
        limit: 1,
        offset: 0,
      });
      const total = Number(response?.data?.total ?? 0);
      const normalized = Number.isFinite(total) ? total : 0;
      setQuestionsTotal(normalized);
      return normalized;
    } catch (err) {
      setQuestionsTotal(0);
      return 0;
    } finally {
      setQuestionsLoading(false);
    }
  };

  useEffect(() => {
    if (!editalId) return;
    let active = true;
    let timer: NodeJS.Timeout | null = null;

    const poll = async () => {
      const [items, total] = await Promise.all([
        loadDrops(editalId),
        loadQuestionsCount(editalId),
      ]);
      if (!active) return;
      if (items.length === 0 || total === 0) {
        timer = setTimeout(poll, POLL_DELAY_MS);
      }
    };

    void poll();

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [editalId]);

  useEffect(() => {
    if (!jobId) return;
    let active = true;
    let timer: NodeJS.Timeout | null = null;

    const poll = async () => {
      let jobData: any = null;
      try {
        const response = await api.getJobStatus(String(jobId));
        jobData = response?.data ?? response;
        if (!active || !jobData) return;
        setJobStatus(jobData.status ?? null);
        setJobError(jobData.error ?? null);
        const result = jobData.result ?? null;
        if (result && typeof result === 'object') {
          setJobProgress(typeof result.progress === 'number' ? result.progress : null);
          setJobStep(typeof result.step === 'string' ? result.step : null);
          setJobMeta(result);
          if (typeof result.questions_generated === 'number') {
            setQuestionsTotal(result.questions_generated);
          }
        } else {
          setJobProgress(null);
          setJobStep(null);
          setJobMeta(null);
        }
      } catch (err) {
        if (!active) return;
      }

      if (!active) return;
      if (jobData?.status === 'completed' || jobData?.status === 'failed') {
        return;
      }
      timer = setTimeout(poll, POLL_DELAY_MS);
    };

    void poll();

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [jobId]);

  const handleSubmit = async () => {
    const trimmed = topic.trim();
    if (trimmed.length < 3) {
      setError('Digite um tema com pelo menos 3 letras.');
      return;
    }

    try {
      setRequestLoading(true);
      setError(null);
      setReady(false);
      setDrops([]);
      setQuestionsTotal(0);
      setJobStatus(null);
      setJobProgress(null);
      setJobStep(null);
      setJobMeta(null);
      setJobError(null);

      const response = await api.createStudyRequest({
        topic: trimmed,
        level: level || undefined,
        source_ids: sourceIds.length ? sourceIds : undefined,
      });

      const payload = response?.data ?? response;
      if (!payload?.edital_id) {
        throw new Error('invalid_response');
      }

      setEditalId(payload.edital_id);
      setJobId(payload.job_id ?? null);
      persistState({
        topic: trimmed,
        level: level || undefined,
        editalId: payload.edital_id,
        jobId: payload.job_id ?? null,
        sourceIds,
      });
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('edro_selected_edital', payload.edital_id);
        const raw = window.localStorage.getItem('edro_generate_drops_jobs');
        let parsed: Record<string, string> = {};
        try {
          parsed = raw ? JSON.parse(raw) : {};
        } catch {
          parsed = {};
        }
        if (payload.job_id) {
          parsed[payload.edital_id] = String(payload.job_id);
          window.localStorage.setItem('edro_generate_drops_jobs', JSON.stringify(parsed));
        }
      }
      router.push('/biblioteca/drops');
    } catch (err: any) {
      const message = err?.message || 'Nao foi possivel iniciar o estudo.';
      setError(message);
    } finally {
      setRequestLoading(false);
    }
  };

  const handleReset = () => {
    setTopic('');
    setLevel('');
    setEditalId(null);
    setJobId(null);
    setDrops([]);
    setReady(false);
    setQuestionsTotal(0);
    setJobStatus(null);
    setJobProgress(null);
    setJobStep(null);
    setJobMeta(null);
    setJobError(null);
    setSourceIds([]);
    setSources([]);
    setSourceText('');
    setSourceUrl('');
    setSourceError(null);
    setError(null);
    clearState();
  };

  const addSourceId = (id: string) => {
    setSourceIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      persistState({
        topic,
        level: level || undefined,
        editalId: editalId || '',
        jobId: jobId ?? null,
        sourceIds: next,
      } as StudyRequestState);
      return next;
    });
  };

  const isYoutubeUrl = (value: string) => {
    const url = value.toLowerCase();
    return url.includes('youtube.com') || url.includes('youtu.be');
  };

  const handleAddTextSource = async () => {
    const text = sourceText.trim();
    if (text.length < 10) {
      setSourceError('Digite pelo menos 10 caracteres.');
      return;
    }
    try {
      setSourceError(null);
      const response = await api.createSource({
        type: 'text',
        text,
        title: text.slice(0, 40),
      });
      const source = response?.data ?? response;
      if (source?.id) {
        addSourceId(source.id);
        setSourceText('');
      }
    } catch {
      setSourceError('Nao foi possivel salvar o texto.');
    }
  };

  const handleAddUrlSource = async () => {
    const url = sourceUrl.trim();
    if (!url) {
      setSourceError('Informe um link valido.');
      return;
    }
    try {
      setSourceError(null);
      const type = isYoutubeUrl(url) ? 'youtube' : 'link';
      const response = await api.createSource({
        type,
        url,
        title: url,
      });
      const source = response?.data ?? response;
      if (source?.id) {
        addSourceId(source.id);
        setSourceUrl('');
      }
    } catch {
      setSourceError('Nao foi possivel salvar o link.');
    }
  };

  const handleUploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      setSourceUploading(true);
      setSourceError(null);
      for (const file of Array.from(files)) {
        const response = await api.createSourcePresign({
          file_name: file.name,
          content_type: file.type || 'application/octet-stream',
          size_bytes: file.size,
          title: file.name,
        });
        const payload = response?.data ?? response;
        if (!payload?.upload_url || !payload?.source_id) {
          throw new Error('upload_url_missing');
        }
        await fetch(payload.upload_url, {
          method: 'PUT',
          headers: payload.headers || {},
          body: file,
        });
        await api.completeSource(String(payload.source_id));
        addSourceId(String(payload.source_id));
      }
    } catch {
      setSourceError('Nao foi possivel enviar o arquivo.');
    } finally {
      setSourceUploading(false);
    }
  };

  const handleStartReading = async () => {
    if (!editalId || drops.length === 0) return;
    try {
      setStartLoading(true);
      const sessionItems: StudySessionItem[] = drops.map((drop) => {
        const { discipline, topic } = resolveTopicInfo(drop);
        return {
          itemId: `study-${drop.id}`,
          dropId: drop.id,
          title: drop.title || topic,
          discipline,
          topic,
          topicCode: drop.topic_code,
        };
      });

      const topicEntries = uniqueTopics(
        sessionItems
          .map((item) => {
            if (!item.discipline || !item.topic) return null;
            return { discipline: item.discipline, topic: item.topic };
          })
          .filter(Boolean) as StudySessionTopic[]
      );

      const contentCount = Math.max(1, sessionItems.length);
      const questionsPerContent = computeQuestionsPerContent(null);
      const questionTarget = Math.max(1, contentCount * questionsPerContent);
      const questionsPerTopic = Math.max(1, Math.ceil(questionTarget / Math.max(1, topicEntries.length)));

      const session: StudySession = {
        date: getTodayKey(),
        planId: null,
        items: sessionItems,
        currentIndex: 0,
        questionTarget,
        questionsPerTopic,
        questionsPerContent,
        topics: topicEntries,
        editalId,
        examBoard: null,
      };

      saveStudySession(session);
      if (typeof window !== 'undefined') {
        localStorage.setItem('edro_selected_edital', editalId);
      }
      router.push(`/estudo/${sessionItems[0].dropId}?session=1`);
    } finally {
      setStartLoading(false);
    }
  };

  const refreshSources = async (ids: string[]) => {
    if (!ids.length) {
      setSources([]);
      return [];
    }
    try {
      setSourcesLoading(true);
      setSourceError(null);
      const responses = await Promise.all(
        ids.map(async (id) => {
          try {
            const response = await api.getSource(id);
            return response?.data ?? response;
          } catch {
            return null;
          }
        })
      );
      const items = responses.filter(Boolean) as SourceItem[];
      setSources(items);
      return items;
    } catch (err) {
      setSourceError('Nao foi possivel carregar as fontes.');
      setSources([]);
      return [];
    } finally {
      setSourcesLoading(false);
    }
  };

  useEffect(() => {
    if (!sourceIds.length) return;
    let active = true;
    let timer: NodeJS.Timeout | null = null;

    const poll = async () => {
      const items = await refreshSources(sourceIds);
      if (!active) return;
      const pending = items.some(
        (item) => item.status !== 'ready' && item.status !== 'failed'
      );
      if (pending) {
        timer = setTimeout(poll, POLL_DELAY_MS);
      }
    };

    void poll();

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [sourceIds]);

  const toBase64 = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('file_read_failed'));
      reader.readAsDataURL(blob);
    });

  const startRecording = async () => {
    if (recording || sttLoading) return;
    if (typeof window === 'undefined') return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Microfone indisponivel neste navegador.');
      return;
    }

    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      audioChunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        setRecording(false);
        try {
          setSttLoading(true);
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const base64 = await toBase64(blob);
          const payload = base64.split(',')[1] || '';
          if (!payload) throw new Error('empty_audio');
          const stored = readStoredAccessibility();
          const storedToken = typeof window !== 'undefined'
            ? localStorage.getItem('token') || localStorage.getItem('edro_token')
            : null;
          const res = await fetch(`${API_URL}/api/accessibility/stt`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(storedToken
                ? { Authorization: `Bearer ${storedToken}` }
                : {}),
            },
            body: JSON.stringify({
              audioBase64: payload,
              idioma: stored?.stt_language || 'pt-BR',
            }),
          });
          const data = await res.json();
          if (!res.ok || !data.success) throw new Error(data?.error || 'stt_failed');
          const transcript = data?.data?.transcript || '';
          if (transcript) {
            setTopic((prev) => (prev ? `${prev} ${transcript}` : transcript));
          }
        } catch (err) {
          setError('Nao foi possivel transcrever o audio.');
        } finally {
          setSttLoading(false);
          if (audioStreamRef.current) {
            audioStreamRef.current.getTracks().forEach((track) => track.stop());
            audioStreamRef.current = null;
          }
          mediaRecorderRef.current = null;
          audioChunksRef.current = [];
        }
      };

      recorder.start();
      setRecording(true);
    } catch (err) {
      setError('Nao foi possivel acessar o microfone.');
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
        audioStreamRef.current = null;
      }
      mediaRecorderRef.current = null;
      audioChunksRef.current = [];
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current) return;
    if (mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const statusLabel = useMemo(() => {
    if (!editalId) return null;
    if (jobStatus === 'failed') return 'Falhou';
    if (jobStatus === 'completed') {
      if (ready && questionsTotal > 0) return 'Tudo pronto';
      if (ready) return 'Conteudos prontos';
      return 'Concluido';
    }
    if (jobStatus === 'running' || jobStatus === 'pending') return 'Preparando';
    if (ready && questionsTotal > 0) return 'Tudo pronto';
    if (ready) return 'Conteudos prontos';
    if (dropsLoading || requestLoading || questionsLoading) return 'Preparando';
    return 'Aguardando';
  }, [
    editalId,
    jobStatus,
    ready,
    dropsLoading,
    requestLoading,
    questionsLoading,
    questionsTotal,
  ]);

  const sourceSummary = useMemo(() => {
    const pending = sources.filter(
      (item) => item.status !== 'ready' && item.status !== 'failed'
    );
    const readyCount = sources.filter((item) => item.status === 'ready').length;
    const failedCount = sources.filter((item) => item.status === 'failed').length;
    return {
      pending,
      readyCount,
      failedCount,
    };
  }, [sources]);

  const stepInfo = useMemo(() => {
    if (!jobStep) return null;
    const dropsCreated = typeof jobMeta?.created === 'number' ? jobMeta.created : drops.length;
    const dropsTotal = typeof jobMeta?.total === 'number' ? jobMeta.total : drops.length;
    const questionsGenerated = typeof jobMeta?.questions_generated === 'number'
      ? jobMeta.questions_generated
      : questionsTotal;

    switch (jobStep) {
      case 'outline:start':
        return { title: 'Planejamento', detail: 'Organizando topicos' };
      case 'outline:done':
        return { title: 'Planejamento', detail: 'Topicos definidos' };
      case 'edital:updated':
        return { title: 'Planejamento', detail: 'Edital atualizado' };
      case 'auto_formacao:done':
        return { title: 'Planejamento', detail: 'Trilha inicial pronta' };
      case 'drops:processing':
        return {
          title: 'Conteudos',
          detail: `Gerando conteudos (${dropsCreated}/${dropsTotal || '?'})`,
        };
      case 'drops:done':
        return { title: 'Conteudos', detail: `Conteudos prontos (${dropsCreated})` };
      case 'questions:starting':
        return { title: 'Questoes', detail: 'Gerando questoes' };
      case 'questions:done':
        return { title: 'Questoes', detail: `Questoes ativas (${questionsGenerated})` };
      case 'completed':
        return { title: 'Finalizado', detail: 'Tudo pronto para estudar' };
      default:
        return { title: 'Processando', detail: jobStep };
    }
  }, [drops.length, jobMeta, jobStep, questionsTotal]);

  const progressSteps = useMemo(() => ([
    {
      key: 'topic',
      label: 'Tema recebido',
      helper: topic ? `Tema: ${topic}` : 'Tema confirmado',
      done: Boolean(editalId),
    },
    {
      key: 'drops',
      label: 'Conteudos gerados',
      helper: (() => {
        const dropsCreated = typeof jobMeta?.created === 'number' ? jobMeta.created : drops.length;
        const dropsTotal = typeof jobMeta?.total === 'number' ? jobMeta.total : drops.length;
        if (dropsCreated > 0 && dropsTotal > 0) {
          return `${dropsCreated}/${dropsTotal} conteudos`;
        }
        return drops.length ? `${drops.length} conteudos prontos` : 'Aguardando conteudos';
      })(),
      done: drops.length > 0,
    },
    {
      key: 'questions',
      label: 'Questoes geradas',
      helper: (() => {
        const generated = typeof jobMeta?.questions_generated === 'number'
          ? jobMeta.questions_generated
          : questionsTotal;
        return generated ? `${generated} questoes ativas` : 'Aguardando questoes';
      })(),
      done: questionsTotal > 0,
    },
  ]), [drops.length, editalId, jobMeta, questionsTotal, topic]);

  return (
    <div className="min-h-screen bg-background-light">
      <div className="container mx-auto px-6 py-8 max-w-4xl space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-text-main">
              <Sparkles className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-title font-bold">Novo estudo</h1>
            </div>
            <p className="text-sm text-text-muted">
              Diga o assunto e o Edro monta o conteudo e as questoes.
            </p>
          </div>
          {statusLabel ? (
            <Badge
              variant={
                jobStatus === 'failed'
                  ? 'danger'
                  : ready && questionsTotal > 0
                  ? 'success'
                  : 'warning'
              }
              size="sm"
            >
              {statusLabel}
            </Badge>
          ) : null}
        </header>

        <Card className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-text-main">
              O que voce quer estudar agora?
            </label>
            <textarea
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              className="w-full min-h-[96px] rounded-xl border border-secondary-lilac/40 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Ex: Bolo de chocolate, Concurso Camara dos Deputados, AWS Solutions Architect"
              disabled={requestLoading}
            />
            <div className="flex items-center justify-between gap-3 text-xs text-text-muted">
              <span>Voce pode falar se preferir.</span>
              <Button
                variant="outline"
                size="sm"
                onClick={recording ? stopRecording : startRecording}
                disabled={requestLoading || sttLoading}
                className="flex items-center gap-2"
              >
                {recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                {recording ? 'Parar' : sttLoading ? 'Transcrevendo' : 'Gravar'}
              </Button>
            </div>
          </div>

          <div className="space-y-3 border-t border-secondary-lilac/40 pt-4">
            <div>
              <h3 className="text-sm font-semibold text-text-main">Materiais adicionais</h3>
              <p className="text-xs text-text-muted">
                Cole links, envie PDFs, imagens, audio ou video para usar como base.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-end">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-text-muted">Link ou video</label>
                <input
                  value={sourceUrl}
                  onChange={(event) => setSourceUrl(event.target.value)}
                  className="w-full rounded-xl border border-secondary-lilac/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Cole um link de site ou YouTube"
                  disabled={sourceUploading}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddUrlSource}
                disabled={sourceUploading}
                className="w-full md:w-auto"
              >
                Adicionar link
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-text-muted">Texto colado</label>
              <textarea
                value={sourceText}
                onChange={(event) => setSourceText(event.target.value)}
                className="w-full min-h-[80px] rounded-xl border border-secondary-lilac/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Cole aqui qualquer texto ou anotacoes"
                disabled={sourceUploading}
              />
              <div className="flex items-center justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddTextSource}
                  disabled={sourceUploading}
                >
                  Salvar texto
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-text-muted">Arquivos</label>
              <input
                type="file"
                multiple
                accept="application/pdf,image/*,audio/*,video/*"
                capture="environment"
                onChange={(event) => void handleUploadFiles(event.target.files)}
                disabled={sourceUploading}
                className="block w-full text-sm text-text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-secondary-bg file:px-3 file:py-2 file:text-sm file:text-text-main hover:file:bg-secondary-bg"
              />
              {sourceUploading ? (
                <p className="text-xs text-text-muted">Enviando arquivos...</p>
              ) : null}
            </div>

            {sourceError ? (
              <Card className="border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                {sourceError}
              </Card>
            ) : null}

            {sources.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-xs text-text-muted">
                  <span>{sources.length} materiais</span>
                  <span>{sourceSummary.readyCount} prontos</span>
                  {sourceSummary.pending.length > 0 ? (
                    <span>{sourceSummary.pending.length} processando</span>
                  ) : null}
                  {sourceSummary.failedCount > 0 ? (
                    <span>{sourceSummary.failedCount} com erro</span>
                  ) : null}
                </div>
                <div className="space-y-2">
                  {sources.map((source) => (
                    <div
                      key={source.id}
                      className="flex items-center justify-between rounded-lg border border-secondary-lilac/40 bg-surface-light px-3 py-2 text-xs dark:bg-surface-dark"
                    >
                      <div className="space-y-1">
                        <p className="font-medium text-text-main">
                          {source.title || source.file_name || source.url || 'Material enviado'}
                        </p>
                        <p className="text-text-muted">{source.type}</p>
                      </div>
                      <Badge
                        size="sm"
                        variant={
                          source.status === 'ready'
                            ? 'success'
                            : source.status === 'failed'
                            ? 'danger'
                            : 'warning'
                        }
                      >
                        {source.status === 'ready'
                          ? 'Pronto'
                          : source.status === 'failed'
                          ? 'Falha'
                          : 'Processando'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-text-main">Nivel</label>
              <select
                value={level}
                onChange={(event) => setLevel(event.target.value)}
                className="w-full rounded-xl border border-secondary-lilac/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                disabled={requestLoading}
              >
                {levelOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <Button
              variant="primary"
              size="md"
              onClick={handleSubmit}
              disabled={requestLoading || sourceSummary.pending.length > 0}
              className="w-full md:w-auto"
            >
              {requestLoading ? 'Preparando...' : 'Preparar meu estudo'}
            </Button>
          </div>

          {error ? (
            <Card className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </Card>
          ) : null}
        </Card>

        {editalId ? (
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <h2 className="text-lg font-title font-semibold text-text-main">Seu estudo esta em preparo</h2>
                <p className="text-sm text-text-muted">
                  Assim que os conteudos estiverem prontos, voce pode abrir direto daqui.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void loadDrops(editalId)}
                  disabled={dropsLoading}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Atualizar
                </Button>
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  Novo tema
                </Button>
              </div>
            </div>

            {jobId ? (
              <div className="text-xs text-text-muted">
                Referencia do processamento: {jobId}
              </div>
            ) : null}

            {stepInfo ? (
              <div className="rounded-xl border border-secondary-lilac/40 bg-surface-light p-4 dark:bg-surface-dark">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-text-main">{stepInfo.title}</p>
                    <p className="text-xs text-text-muted">{stepInfo.detail}</p>
                  </div>
                  {jobProgress !== null ? (
                    <Badge variant="primary" size="sm">
                      {jobProgress}%
                    </Badge>
                  ) : null}
                </div>
                {jobProgress !== null ? (
                  <div className="mt-3 h-2 rounded-full bg-secondary-lilac/60">
                    <div
                      className="h-2 rounded-full bg-primary-500 transition-all"
                      style={{ width: `${Math.max(4, Math.min(100, jobProgress))}%` }}
                    />
                  </div>
                ) : null}
                {jobError ? (
                  <p className="mt-2 text-xs text-red-600">
                    Falha: {jobError}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="grid gap-3 md:grid-cols-3">
              {progressSteps.map((step) => (
                <div
                  key={step.key}
                  className={`rounded-xl border p-3 ${
                    step.done ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20' : 'border-secondary-lilac/40 bg-surface-light dark:bg-surface-dark'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-text-main">{step.label}</p>
                    <Badge variant={step.done ? 'success' : 'gray'} size="sm">
                      {step.done ? 'ok' : '...'}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-text-muted">{step.helper}</p>
                </div>
              ))}
            </div>

            <div className="text-xs text-text-muted">
              Voce pode sair e voltar depois. O material fica salvo na Biblioteca.
            </div>

            {dropsLoading && drops.length === 0 ? (
              <div className="rounded-xl border border-secondary-lilac/40 bg-secondary-bg/60 p-4 text-sm text-text-muted">
                Estamos montando o material. Isso pode levar alguns minutos.
              </div>
            ) : null}

            {drops.length > 0 ? (
              <div className="space-y-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-text-main">Leitura pronta</p>
                    <p className="text-xs text-text-muted">
                      {drops.length} conteudos gerados
                      {questionsTotal > 0 ? ` · ${questionsTotal} questoes ativas` : ' · questoes em preparo'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleStartReading}
                      disabled={startLoading}
                    >
                      {startLoading ? 'Abrindo...' : 'Comecar leitura'}
                    </Button>
                    <Link href="/questoes" className="text-xs font-semibold text-primary">
                      {questionsTotal > 0 ? 'Questoes' : 'Ver questoes'}
                    </Link>
                  </div>
                </div>
                <div className="space-y-3">
                  <details className="rounded-xl border border-secondary-lilac/40 bg-surface-light p-4 dark:bg-surface-dark">
                    <summary className="cursor-pointer text-sm font-semibold text-text-main">
                      Ver conteudos
                    </summary>
                    <div className="mt-3 space-y-3">
                      {drops.map((drop) => (
                        <Card key={drop.id} className="flex items-center justify-between gap-4 p-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <BookOpen className="h-4 w-4 text-primary-500" />
                              <p className="truncate font-semibold text-text-main">
                                {drop.title || drop.topic_code || 'Conteudo gerado'}
                              </p>
                            </div>
                            <p className="text-xs text-text-muted truncate">{drop.topic_code || drop.id}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {drop.difficulty ? (
                              <Badge variant="gray" size="sm">
                                N{drop.difficulty}
                              </Badge>
                            ) : null}
                            <Link href={`/estudo/${drop.id}`}>
                              <Button variant="outline" size="sm">
                                Abrir
                              </Button>
                            </Link>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </details>
                </div>
              </div>
            ) : null}
          </Card>
        ) : null}
      </div>
    </div>
  );
}
