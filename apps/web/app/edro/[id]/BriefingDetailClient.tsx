'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { apiGet, apiDelete, apiPatch, apiPost } from '@/lib/api';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import {
  IconArchive,
  IconBuilding,
  IconCalendar,
  IconCheck,
  IconChevronRight,
  IconClock,
  IconExternalLink,
  IconMail,
  IconMessageCircle,
  IconPhoto,
  IconPlayerPlay,
  IconRefresh,
  IconRobot,
  IconSparkles,
  IconTarget,
  IconTrash,
  IconUser,
  IconUsers,
  IconAB2,
  IconBulb,
  IconWorld,
  IconHash,
  IconVolume,
  IconLayoutKanban,
  IconLink,
  IconTrophy,
} from '@tabler/icons-react';

type ClientContext = {
  id: string;
  name: string;
  segment_primary: string | null;
  keywords: string[];
  pillars: string[];
  tone: string | null;
  audience: string | null;
  brand_promise: string | null;
  must_mentions: string[];
  forbidden_claims: string[];
  competitors: string[];
  website: string | null;
  social_profiles: Record<string, string>;
};

type Briefing = {
  id: string;
  client_id: string | null;
  client_name: string | null;
  title: string;
  status: string;
  payload: Record<string, any>;
  created_at: string;
  due_at: string | null;
  traffic_owner: string | null;
};

type Stage = {
  id: string;
  briefing_id: string;
  stage: string;
  status: 'pending' | 'in_progress' | 'done';
  updated_at: string;
  updated_by: string | null;
};

type Copy = {
  id: string;
  briefing_id: string;
  language: string;
  output: string;
  created_at: string;
  created_by: string | null;
};

type Task = {
  id: string;
  briefing_id: string;
  type: string;
  assigned_to: string;
  status: string;
  created_at: string;
};

type TimelineEvent = {
  id: string;
  type: 'stage_change' | 'copy_generated' | 'notification' | 'task';
  label: string;
  detail: string;
  actor: string | null;
  metadata: Record<string, any> | null;
  timestamp: string;
};

const WORKFLOW_STAGES = [
  { key: 'briefing', label: 'Briefing' },
  { key: 'iclips_in', label: 'iClips In' },
  { key: 'alinhamento', label: 'Alinhamento' },
  { key: 'copy_ia', label: 'Copy IA' },
  { key: 'aprovacao', label: 'Aprovação' },
  { key: 'producao', label: 'Produção' },
  { key: 'revisao', label: 'Revisão' },
  { key: 'entrega', label: 'Entrega' },
  { key: 'iclips_out', label: 'iClips Out' },
];

const STATUS_COLORS: Record<string, 'default' | 'warning' | 'success' | 'error' | 'info'> = {
  active: 'success',
  draft: 'default',
  archived: 'warning',
  done: 'success',
  cancelled: 'error',
};

function statusLabel(s: string) {
  const map: Record<string, string> = {
    active: 'Ativo',
    draft: 'Rascunho',
    archived: 'Arquivado',
    done: 'Concluído',
    cancelled: 'Cancelado',
  };
  return map[s] || s;
}

function timelineIcon(type: string) {
  switch (type) {
    case 'stage_change': return <IconPlayerPlay size={14} />;
    case 'copy_generated': return <IconRobot size={14} />;
    case 'notification': return <IconMail size={14} />;
    case 'task': return <IconMessageCircle size={14} />;
    default: return <IconClock size={14} />;
  }
}

function timelineColor(type: string) {
  switch (type) {
    case 'stage_change': return '#6366f1';
    case 'copy_generated': return '#8b5cf6';
    case 'notification': return '#f59e0b';
    case 'task': return '#3b82f6';
    default: return '#94a3b8';
  }
}

function formatDate(iso?: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(iso?: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/* Friendly label for payload keys */
const PAYLOAD_LABELS: Record<string, string> = {
  objective: 'Objetivo',
  target_audience: 'Público-alvo',
  channels: 'Canais / Plataformas',
  key_message: 'Mensagem-Chave',
  tone: 'Tom de Voz',
  tone_of_voice: 'Tom de Voz',
  format: 'Formato',
  formats: 'Formatos',
  budget: 'Orçamento',
  deadline: 'Prazo interno',
  hashtags: 'Hashtags',
  notes: 'Notas',
  description: 'Descrição',
  campaign_name: 'Nome da Campanha',
  campaign_objective: 'Objetivo da Campanha',
  platforms: 'Plataformas',
  production_type: 'Tipo de Produção',
  web_research_refs: 'Referências Web (IA)',
  context: 'Contexto',
  insights: 'Insights',
  restrictions: 'Restrições',
  cta: 'CTA',
  landing_page: 'Landing Page',
};

const PAYLOAD_ICONS: Record<string, React.ReactNode> = {
  objective: <IconTarget size={15} />,
  target_audience: <IconUsers size={15} />,
  channels: <IconWorld size={15} />,
  platforms: <IconWorld size={15} />,
  key_message: <IconBulb size={15} />,
  tone: <IconVolume size={15} />,
  tone_of_voice: <IconVolume size={15} />,
  hashtags: <IconHash size={15} />,
  web_research_refs: <IconSparkles size={15} />,
};

/* Fields to skip entirely in the detail view (shown elsewhere or internal) */
const PAYLOAD_SKIP = new Set([
  'id', 'created_at', 'updated_at', 'allow_auto_stage', 'source', 'origin',
  'client_id', 'clientId', 'tenant_id', 'briefing_id',
  'web_research_refs', 'web_research_articles', // shown in sidebar "Referências Web"
  'client_ref',  // internal tracking
]);

/* Render a single payload value */
function PayloadValue({ value }: { value: any }) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'boolean') return <Typography variant="body2">{value ? 'Sim' : 'Não'}</Typography>;
  if (typeof value === 'number') return <Typography variant="body2">{value}</Typography>;
  if (typeof value === 'string') {
    if (value.startsWith('http')) {
      return (
        <Box component="a" href={value} target="_blank" rel="noopener noreferrer" sx={{ fontSize: 13, color: '#6366f1', wordBreak: 'break-all' }}>
          {value}
        </Box>
      );
    }
    return <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{value}</Typography>;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    if (typeof value[0] === 'string') {
      return (
        <Stack direction="row" flexWrap="wrap" gap={0.5}>
          {value.map((v: string, i: number) => (
            <Chip key={i} label={v} size="small" variant="outlined" sx={{ fontSize: 11 }} />
          ))}
        </Stack>
      );
    }
    return <Typography variant="body2" color="text.secondary">{JSON.stringify(value)}</Typography>;
  }
  if (typeof value === 'object') {
    return (
      <Stack spacing={0.5}>
        {Object.entries(value).map(([k, v]) => (
          v !== null && v !== undefined && v !== '' ? (
            <Typography key={k} variant="body2">
              <Box component="span" sx={{ color: '#64748b', mr: '4px' }}>{k}:</Box>
              {typeof v === 'object' ? JSON.stringify(v) : String(v)}
            </Typography>
          ) : null
        ))}
      </Stack>
    );
  }
  return <Typography variant="body2">{String(value)}</Typography>;
}

/* ── Priority fields shown first ── */
const PRIORITY_KEYS = ['objective', 'campaign_objective', 'target_audience', 'key_message', 'channels', 'platforms', 'tone', 'tone_of_voice', 'format', 'formats', 'budget', 'deadline', 'hashtags', 'cta', 'landing_page', 'notes', 'web_research_refs'];

function sortedPayloadEntries(payload: Record<string, any>) {
  const entries = Object.entries(payload).filter(
    ([k, v]) => !PAYLOAD_SKIP.has(k) && v !== null && v !== undefined && v !== ''
  );
  const priority: [string, any][] = [];
  const rest: [string, any][] = [];
  for (const entry of entries) {
    if (PRIORITY_KEYS.includes(entry[0])) priority.push(entry);
    else rest.push(entry);
  }
  priority.sort((a, b) => PRIORITY_KEYS.indexOf(a[0]) - PRIORITY_KEYS.indexOf(b[0]));
  return [...priority, ...rest];
}

export default function BriefingDetailClient({ briefingId }: { briefingId: string }) {
  const router = useRouter();
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [copies, setCopies] = useState<Copy[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [abTests, setAbTests] = useState<any[]>([]);
  const [abCreating, setAbCreating] = useState(false);
  const [showKanban, setShowKanban] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [clientContext, setClientContext] = useState<ClientContext | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [researchArticles, setResearchArticles] = useState<{ title: string; snippet: string | null; url: string }[]>([]);

  const loadBriefing = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiGet<{
        success: boolean;
        data: { briefing: Briefing; stages: Stage[]; copies: Copy[]; tasks: Task[]; client_context: ClientContext | null };
      }>(`/edro/briefings/${briefingId}`);

      if (response?.data) {
        setBriefing(response.data.briefing);
        setStages(response.data.stages);
        setCopies(response.data.copies);
        setTasks(response.data.tasks);
        setClientContext(response.data.client_context ?? null);
        // Load pre-saved articles from payload if available
        const arts = response.data.briefing.payload?.web_research_articles;
        if (Array.isArray(arts)) setResearchArticles(arts);
      }

      apiGet<{ data: TimelineEvent[] }>(`/edro/briefings/${briefingId}/timeline`)
        .then((res) => setTimeline(res?.data ?? []))
        .catch(() => {});
      apiGet<{ data: any[] }>(`/edro/briefings/${briefingId}/ab-tests`)
        .then((res) => setAbTests(res?.data ?? []))
        .catch(() => {});
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar briefing.');
    } finally {
      setLoading(false);
    }
  }, [briefingId]);

  const handleResearch = async () => {
    setSearching(true);
    setSearchError('');
    try {
      const res = await apiPost<{ success: boolean; articles: { title: string; snippet: string | null; url: string }[]; error?: string }>(
        `/edro/briefings/${briefingId}/research`, {}
      );
      if (res?.articles) {
        setResearchArticles(res.articles);
        await loadBriefing();
      } else if (res?.error === 'tavily_not_configured') {
        setSearchError('TAVILY_API_KEY não configurada no servidor.');
      }
    } catch (err: any) {
      const msg: string = err?.message || '';
      if (msg.includes('401') || msg.toLowerCase().includes('unauthorized') || msg.toLowerCase().includes('invalid api key')) {
        setSearchError('Chave Tavily inválida ou expirada. Verifique TAVILY_API_KEY no Railway e aguarde o redeploy do backend.');
      } else if (msg.includes('503')) {
        setSearchError('TAVILY_API_KEY não configurada no servidor. Adicione a variável no Railway.');
      } else {
        setSearchError('Falha ao buscar referências. Tente novamente em alguns instantes.');
      }
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => { loadBriefing(); }, [loadBriefing]);

  const handleStageAction = async (stageKey: string, action: 'start' | 'complete') => {
    setActionLoading(stageKey);
    try {
      const status = action === 'start' ? 'in_progress' : 'done';
      await apiPatch(`/edro/briefings/${briefingId}/stages/${stageKey}`, { status });
      await loadBriefing();
    } catch (err: any) { alert(err?.message || 'Erro ao atualizar etapa.'); }
    finally { setActionLoading(null); }
  };

  const handleGenerateCopy = async () => {
    setActionLoading('copy_ia');
    setCopySuccess(false);
    try {
      await apiPost(`/edro/briefings/${briefingId}/copy`, { language: 'pt', count: 10 });
      await loadBriefing();
      setCopySuccess(true);
    } catch (err: any) { alert(err?.message || 'Erro ao gerar copies.'); }
    finally { setActionLoading(null); }
  };

  const handleGenerateCreative = async (copyId: string) => {
    if (!confirm('Deseja gerar um criativo visual para esta copy?')) return;
    setActionLoading('creative');
    try {
      const result = await apiPost<{ success: boolean; data: { image_url: string; format: string } }>(
        `/edro/briefings/${briefingId}/generate-creative`,
        { copy_version_id: copyId, format: 'instagram-feed', style: 'modern' }
      );
      if (result?.data?.image_url) window.open(result.data.image_url, '_blank');
      await loadBriefing();
    } catch (err: any) { alert(err?.message || 'Erro ao gerar criativo.'); }
    finally { setActionLoading(null); }
  };

  const handleArchive = async () => {
    if (!briefing) return;
    if (!confirm('Arquivar este briefing?')) return;
    try {
      await apiPatch(`/edro/briefings/${briefingId}/archive`);
      setBriefing({ ...briefing, status: 'archived' });
    } catch (err: any) { alert(err?.message || 'Erro ao arquivar briefing.'); }
  };

  const handleDelete = async () => {
    if (!confirm('Excluir este briefing permanentemente? Todas as copies e tarefas associadas serão removidas.')) return;
    try {
      await apiDelete(`/edro/briefings/${briefingId}`);
      router.push('/edro');
    } catch (err: any) { alert(err?.message || 'Erro ao excluir briefing.'); }
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Stack alignItems="center" spacing={2}>
          <CircularProgress size={32} />
          <Typography variant="body2" color="text.secondary">Carregando briefing...</Typography>
        </Stack>
      </Box>
    );
  }

  if (error || !briefing) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Stack alignItems="center" spacing={2}>
          <Typography variant="h2">&#x26A0;&#xFE0F;</Typography>
          <Typography variant="h6">Erro</Typography>
          <Typography variant="body2" color="text.secondary">{error || 'Briefing não encontrado.'}</Typography>
          <Button variant="contained" onClick={() => router.push('/edro')}>Voltar</Button>
        </Stack>
      </Box>
    );
  }

  const stageMap = Object.fromEntries(stages.map((s) => [s.stage, s]));
  const doneCount = stages.filter((s) => s.status === 'done').length;
  const progressPct = Math.round((doneCount / WORKFLOW_STAGES.length) * 100);
  const payloadEntries = sortedPayloadEntries(briefing.payload || {});

  return (
    <AppShell
      title={briefing.title}
      topbarLeft={
        <Stack direction="row" spacing={1} alignItems="center">
          <Button size="small" onClick={() => router.push('/edro')} sx={{ color: 'text.secondary', textTransform: 'none', minWidth: 0, p: '2px 6px' }}>
            Edro
          </Button>
          <IconChevronRight size={14} />
          <Typography variant="body2" fontWeight={500} noWrap sx={{ maxWidth: 400 }}>
            {briefing.title}
          </Typography>
        </Stack>
      }
    >
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1280, mx: 'auto' }}>

        {/* ── HEADER ── */}
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'flex-start' }} spacing={2} sx={{ mb: 3 }}>
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
              <Chip
                label={statusLabel(briefing.status)}
                color={STATUS_COLORS[briefing.status] || 'default'}
                size="small"
              />
              {copies.length > 0 && (
                <Chip label={`${copies.length} cop${copies.length === 1 ? 'y' : 'ies'}`} size="small" color="secondary" variant="outlined" />
              )}
              {abTests.length > 0 && (
                <Chip label={`${abTests.length} A/B`} size="small" variant="outlined" />
              )}
            </Stack>
            <Typography variant="h4" fontWeight={700} sx={{ mb: 0.5, lineHeight: 1.25 }}>
              {briefing.title}
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
              {briefing.client_name && (
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <IconBuilding size={14} color="#94a3b8" />
                  <Typography variant="body2" color="text.secondary">{briefing.client_name}</Typography>
                </Stack>
              )}
              {briefing.traffic_owner && (
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <IconUser size={14} color="#94a3b8" />
                  <Typography variant="body2" color="text.secondary">{briefing.traffic_owner}</Typography>
                </Stack>
              )}
              {briefing.created_at && (
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <IconClock size={14} color="#94a3b8" />
                  <Typography variant="body2" color="text.secondary">Criado em {formatDate(briefing.created_at)}</Typography>
                </Stack>
              )}
              {briefing.due_at && (
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <IconCalendar size={14} color="#94a3b8" />
                  <Typography variant="body2" color="text.secondary">Prazo: {formatDate(briefing.due_at)}</Typography>
                </Stack>
              )}
            </Stack>
          </Box>

          {/* Action buttons */}
          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ flexShrink: 0 }}>
            <Button
              variant="contained"
              size="small"
              startIcon={actionLoading === 'copy_ia' ? <CircularProgress size={14} color="inherit" /> : <IconRobot size={16} />}
              onClick={handleGenerateCopy}
              disabled={!!actionLoading}
              sx={{ fontWeight: 600 }}
            >
              {actionLoading === 'copy_ia' ? 'Gerando...' : 'Gerar Copy IA'}
            </Button>
            {copies.length >= 2 && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<IconAB2 size={16} />}
                onClick={async () => {
                  setAbCreating(true);
                  try {
                    await apiPost(`/edro/briefings/${briefingId}/ab-test`, {
                      variant_a_id: copies[0].id, variant_b_id: copies[1].id, metric: 'engagement',
                    });
                    const res = await apiGet<{ data: any[] }>(`/edro/briefings/${briefingId}/ab-tests`);
                    setAbTests(res?.data ?? []);
                  } catch { /* ignore */ }
                  setAbCreating(false);
                }}
                disabled={abCreating}
              >
                {abCreating ? 'Criando...' : 'Novo Teste A/B'}
              </Button>
            )}
            {briefing.status !== 'archived' && (
              <Button
                variant="outlined"
                size="small"
                color="warning"
                startIcon={<IconArchive size={16} />}
                onClick={handleArchive}
              >
                Arquivar
              </Button>
            )}
            <Button
              variant="outlined"
              size="small"
              color="error"
              startIcon={<IconTrash size={16} />}
              onClick={handleDelete}
            >
              Excluir
            </Button>
          </Stack>
        </Stack>

        {copySuccess && (
          <Alert severity="success" onClose={() => setCopySuccess(false)} sx={{ mb: 2 }}>
            Copies geradas com sucesso!
          </Alert>
        )}

        {/* ── WORKFLOW PROGRESS BAR ── */}
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <IconLayoutKanban size={16} color="#6366f1" />
                <Typography variant="subtitle2" color="text.secondary">
                  Fluxo de Produção — {doneCount}/{WORKFLOW_STAGES.length} etapas concluídas ({progressPct}%)
                </Typography>
              </Stack>
              <Button
                size="small"
                variant="text"
                sx={{ fontSize: 12, textTransform: 'none', color: 'text.secondary' }}
                onClick={() => setShowKanban(!showKanban)}
              >
                {showKanban ? 'Ocultar detalhes' : 'Gerenciar etapas'}
              </Button>
            </Stack>

            {/* Progress dots */}
            <Stack direction="row" spacing={0} alignItems="center" sx={{ overflowX: 'auto', pb: 0.5 }}>
              {WORKFLOW_STAGES.map((ws, idx) => {
                const s = stageMap[ws.key];
                const status = s?.status || 'pending';
                const isDone = status === 'done';
                const isInProgress = status === 'in_progress';
                return (
                  <Stack key={ws.key} direction="row" alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
                    <Tooltip title={ws.label} arrow placement="top">
                      <Stack alignItems="center" spacing={0.25} sx={{ cursor: 'default', minWidth: 0, flex: 1 }}>
                        <Box
                          sx={{
                            width: 28, height: 28, borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            bgcolor: isDone ? 'success.main' : isInProgress ? 'primary.main' : 'grey.200',
                            color: isDone || isInProgress ? 'white' : 'text.disabled',
                            fontSize: 11, fontWeight: 600,
                            flexShrink: 0,
                          }}
                        >
                          {isDone ? <IconCheck size={14} /> : idx + 1}
                        </Box>
                        <Typography
                          variant="caption"
                          noWrap
                          sx={{
                            fontSize: 9.5,
                            color: isDone ? 'success.main' : isInProgress ? 'primary.main' : 'text.disabled',
                            fontWeight: isInProgress ? 700 : 400,
                            maxWidth: 64,
                            textAlign: 'center',
                          }}
                        >
                          {ws.label}
                        </Typography>
                      </Stack>
                    </Tooltip>
                    {idx < WORKFLOW_STAGES.length - 1 && (
                      <Box sx={{ height: 2, flex: 1, minWidth: 8, bgcolor: isDone ? 'success.light' : 'grey.200', mx: 0.25 }} />
                    )}
                  </Stack>
                );
              })}
            </Stack>

            {/* Expandable Kanban actions */}
            {showKanban && (
              <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                <Grid container spacing={1.5}>
                  {WORKFLOW_STAGES.map((ws) => {
                    const s = stageMap[ws.key];
                    const status = s?.status || 'pending';
                    const isPending = status === 'pending';
                    const isInProgress = status === 'in_progress';
                    const isDone = status === 'done';
                    return (
                      <Grid key={ws.key} size={{ xs: 6, sm: 4, md: 2 }}>
                        <Box
                          sx={{
                            p: 1.5, borderRadius: 1.5, border: '1px solid',
                            borderColor: isDone ? 'success.light' : isInProgress ? 'primary.light' : 'divider',
                            bgcolor: isDone ? '#f0fdf4' : isInProgress ? '#eef2ff' : 'background.paper',
                          }}
                        >
                          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1 }}>
                            <Box
                              sx={{
                                width: 18, height: 18, borderRadius: '50%',
                                bgcolor: isDone ? 'success.main' : isInProgress ? 'primary.main' : 'grey.300',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              {isDone && <IconCheck size={11} color="white" />}
                            </Box>
                            <Typography variant="caption" fontWeight={600} noWrap>{ws.label}</Typography>
                          </Stack>
                          {isPending && (
                            <Button fullWidth size="small" variant="contained" sx={{ fontSize: 11, py: 0.25 }}
                              onClick={() => handleStageAction(ws.key, 'start')}
                              disabled={actionLoading === ws.key}
                            >
                              {actionLoading === ws.key ? '...' : 'Iniciar'}
                            </Button>
                          )}
                          {isInProgress && (
                            <Stack spacing={0.75}>
                              {ws.key === 'copy_ia' && copies.length === 0 && (
                                <Button fullWidth size="small" variant="contained" color="info" sx={{ fontSize: 11, py: 0.25 }}
                                  onClick={handleGenerateCopy} disabled={actionLoading === 'copy_ia'}
                                >
                                  Gerar Copies
                                </Button>
                              )}
                              {ws.key === 'aprovacao' && copies.length > 0 && (
                                <Button fullWidth size="small" variant="contained" color="warning" sx={{ fontSize: 11, py: 0.25 }}
                                  onClick={() => router.push(`/edro/${briefingId}/aprovacao`)}
                                >
                                  Aprovar
                                </Button>
                              )}
                              {ws.key === 'producao' && (
                                <Button fullWidth size="small" variant="contained" sx={{ fontSize: 11, py: 0.25, bgcolor: 'secondary.main' }}
                                  onClick={() => router.push(`/edro/${briefingId}/producao`)}
                                >
                                  Designer
                                </Button>
                              )}
                              <Button fullWidth size="small" variant="contained" color="success" sx={{ fontSize: 11, py: 0.25 }}
                                onClick={() => handleStageAction(ws.key, 'complete')}
                                disabled={actionLoading === ws.key}
                              >
                                {actionLoading === ws.key ? '...' : 'Concluir'}
                              </Button>
                            </Stack>
                          )}
                          {isDone && s?.updated_at && (
                            <Typography variant="caption" color="success.main" sx={{ fontSize: 9.5 }}>
                              {formatDateTime(s.updated_at)}
                            </Typography>
                          )}
                        </Box>
                      </Grid>
                    );
                  })}
                </Grid>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* ── MAIN CONTENT: 2/3 + 1/3 ── */}
        <Grid container spacing={3}>

          {/* LEFT — Briefing Document + Copies + A/B */}
          <Grid size={{ xs: 12, lg: 8 }}>

            {/* Briefing Data */}
            {payloadEntries.length > 0 && (
              <Card variant="outlined" sx={{ mb: 3 }}>
                <CardContent>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                    <IconSparkles size={18} color="#6366f1" />
                    <Typography variant="h6" fontWeight={600}>Dados do Briefing</Typography>
                  </Stack>
                  <Stack spacing={0}>
                    {payloadEntries.map(([key, value], idx) => {
                      const label = PAYLOAD_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
                      const icon = PAYLOAD_ICONS[key] || null;
                      const isWeb = key === 'web_research_refs';
                      return (
                        <Box key={key}>
                          {idx > 0 && <Divider sx={{ my: 1.5 }} />}
                          <Stack direction="row" spacing={1} alignItems="flex-start">
                            {icon && (
                              <Box sx={{ mt: 0.2, color: isWeb ? 'secondary.main' : 'text.disabled', flexShrink: 0 }}>
                                {icon}
                              </Box>
                            )}
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography
                                variant="caption"
                                sx={{
                                  fontWeight: 600,
                                  textTransform: 'uppercase',
                                  letterSpacing: 0.5,
                                  color: isWeb ? 'secondary.main' : 'text.secondary',
                                  display: 'block',
                                  mb: 0.25,
                                }}
                              >
                                {label}
                              </Typography>
                              <PayloadValue value={value} />
                            </Box>
                          </Stack>
                        </Box>
                      );
                    })}
                  </Stack>
                </CardContent>
              </Card>
            )}

            {/* Copies */}
            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <IconRobot size={18} color="#8b5cf6" />
                    <Typography variant="h6" fontWeight={600}>
                      Copies Geradas{copies.length > 0 ? ` (${copies.length})` : ''}
                    </Typography>
                  </Stack>
                  <Button
                    variant={copies.length === 0 ? 'contained' : 'outlined'}
                    size="small"
                    startIcon={actionLoading === 'copy_ia' ? <CircularProgress size={13} color="inherit" /> : <IconRobot size={14} />}
                    onClick={handleGenerateCopy}
                    disabled={!!actionLoading}
                  >
                    {actionLoading === 'copy_ia' ? 'Gerando...' : copies.length === 0 ? 'Gerar agora' : 'Regenerar'}
                  </Button>
                </Stack>

                {copies.length === 0 ? (
                  <Box sx={{ py: 3, textAlign: 'center' }}>
                    <IconRobot size={36} color="#e2e8f0" />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Nenhuma copy gerada ainda. Clique em "Gerar Copy IA" para começar.
                    </Typography>
                  </Box>
                ) : (
                  <Stack spacing={2}>
                    {copies.map((copy, index) => (
                      <Box key={copy.id}>
                        {index > 0 && <Divider sx={{ mb: 2 }} />}
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Chip label={`Versão ${index + 1}`} size="small" color="secondary" variant="outlined" />
                            <Typography variant="caption" color="text.secondary">
                              {formatDateTime(copy.created_at)}
                            </Typography>
                          </Stack>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<IconPhoto size={13} />}
                            onClick={() => handleGenerateCreative(copy.id)}
                            disabled={actionLoading === 'creative'}
                            sx={{ fontSize: 12 }}
                          >
                            Gerar Criativo
                          </Button>
                        </Stack>
                        <Typography
                          variant="body2"
                          sx={{
                            whiteSpace: 'pre-wrap',
                            lineHeight: 1.7,
                            bgcolor: 'grey.50',
                            p: 1.5,
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'divider',
                          }}
                        >
                          {copy.output}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>

            {/* A/B Tests */}
            {(copies.length >= 2 || abTests.length > 0) && (
              <Card variant="outlined" sx={{ mb: 3 }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <IconAB2 size={18} color="#6366f1" />
                      <Typography variant="h6" fontWeight={600}>
                        Testes A/B{abTests.length > 0 ? ` (${abTests.length})` : ''}
                      </Typography>
                    </Stack>
                    {copies.length >= 2 && (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<IconAB2 size={14} />}
                        onClick={async () => {
                          setAbCreating(true);
                          try {
                            await apiPost(`/edro/briefings/${briefingId}/ab-test`, {
                              variant_a_id: copies[0].id, variant_b_id: copies[1].id, metric: 'engagement',
                            });
                            const res = await apiGet<{ data: any[] }>(`/edro/briefings/${briefingId}/ab-tests`);
                            setAbTests(res?.data ?? []);
                          } catch { /* ignore */ }
                          setAbCreating(false);
                        }}
                        disabled={abCreating}
                      >
                        {abCreating ? 'Criando...' : 'Novo Teste'}
                      </Button>
                    )}
                  </Stack>

                  {abTests.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      Nenhum teste A/B criado. Gere pelo menos 2 copies e clique em "Novo Teste".
                    </Typography>
                  ) : (
                    <Stack spacing={2}>
                      {abTests.map((test) => {
                        const varA = copies.find((c) => c.id === test.variant_a_id);
                        const varB = copies.find((c) => c.id === test.variant_b_id);
                        return (
                          <Box key={test.id}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                              <Chip
                                label={test.status === 'completed' ? 'Concluído' : test.status === 'running' ? 'Em andamento' : test.status}
                                size="small"
                                color={test.status === 'completed' ? 'success' : test.status === 'running' ? 'primary' : 'default'}
                              />
                              <Typography variant="caption" color="text.secondary">Métrica: {test.metric}</Typography>
                            </Stack>
                            <Grid container spacing={1.5}>
                              {[
                                { label: 'Variante A', copy: varA, id: test.variant_a_id },
                                { label: 'Variante B', copy: varB, id: test.variant_b_id },
                              ].map(({ label, copy: c, id }) => (
                                <Grid key={id} size={{ xs: 12, md: 6 }}>
                                  <Box sx={{
                                    p: 1.5, borderRadius: 1, border: '1px solid',
                                    borderColor: test.winner_id === id ? 'success.main' : 'divider',
                                    bgcolor: test.winner_id === id ? '#f0fdf4' : 'grey.50',
                                  }}>
                                    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.75 }}>
                                      <Typography variant="caption" fontWeight={700}>{label}</Typography>
                                      {test.winner_id === id && <IconTrophy size={14} color="#16a34a" />}
                                    </Stack>
                                    <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                                      {c?.output?.slice(0, 200) || 'Copy removida'}...
                                    </Typography>
                                  </Box>
                                </Grid>
                              ))}
                            </Grid>
                            {test.status === 'running' && (
                              <Button
                                size="small" variant="contained" color="success"
                                startIcon={<IconTrophy size={14} />}
                                sx={{ mt: 1.5 }}
                                onClick={async () => {
                                  try {
                                    await apiPost(`/edro/ab-tests/${test.id}/declare-winner`, {});
                                    const res = await apiGet<{ data: any[] }>(`/edro/briefings/${briefingId}/ab-tests`);
                                    setAbTests(res?.data ?? []);
                                  } catch { /* ignore */ }
                                }}
                              >
                                Declarar Vencedor
                              </Button>
                            )}
                          </Box>
                        );
                      })}
                    </Stack>
                  )}
                </CardContent>
              </Card>
            )}
          </Grid>

          {/* RIGHT — Sidebar: Client Context + Research + Tasks + Timeline */}
          <Grid size={{ xs: 12, lg: 4 }}>

            {/* Referências Web (Tavily) */}
            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <IconWorld size={16} color="#6366f1" />
                    <Typography variant="subtitle1" fontWeight={600}>Referências Web</Typography>
                  </Stack>
                  <Button
                    size="small"
                    variant={researchArticles.length === 0 ? 'contained' : 'outlined'}
                    startIcon={searching ? <CircularProgress size={13} color="inherit" /> : <IconRefresh size={14} />}
                    onClick={handleResearch}
                    disabled={searching}
                    sx={{ fontSize: 11 }}
                  >
                    {searching ? 'Buscando...' : researchArticles.length === 0 ? 'Buscar via Tavily' : 'Atualizar'}
                  </Button>
                </Stack>

                {searchError && (
                  <Alert severity="warning" sx={{ mb: 1.5, fontSize: 12 }}>{searchError}</Alert>
                )}

                {researchArticles.length === 0 && !searchError ? (
                  <Box sx={{ py: 2, textAlign: 'center' }}>
                    <IconWorld size={28} color="#e2e8f0" />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      Clique em "Buscar via Tavily" para coletar referências da web sobre este briefing.
                    </Typography>
                  </Box>
                ) : (
                  <Stack spacing={1.5}>
                    {researchArticles.map((art, i) => (
                      <Box key={i} sx={{ p: 1.25, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={0.5}>
                          <Typography variant="caption" fontWeight={600} sx={{ lineHeight: 1.3, flex: 1 }}>
                            {art.title}
                          </Typography>
                          <Box
                            component="a"
                            href={art.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ color: '#6366f1', flexShrink: 0, mt: '1px' }}
                          >
                            <IconExternalLink size={13} />
                          </Box>
                        </Stack>
                        {art.snippet && (
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', lineHeight: 1.4 }}>
                            {art.snippet}
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>

            {/* Contexto do Cliente */}
            {clientContext && (
              <Card variant="outlined" sx={{ mb: 3 }}>
                <CardContent>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                    <IconBuilding size={16} color="#3b82f6" />
                    <Typography variant="subtitle1" fontWeight={600}>Contexto do Cliente</Typography>
                    {clientContext.segment_primary && (
                      <Chip label={clientContext.segment_primary} size="small" variant="outlined" sx={{ fontSize: 10, ml: 'auto !important' }} />
                    )}
                  </Stack>

                  <Stack spacing={1.5}>
                    {clientContext.keywords.length > 0 && (
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary', display: 'block', mb: 0.5 }}>
                          Keywords
                        </Typography>
                        <Stack direction="row" flexWrap="wrap" gap={0.5}>
                          {clientContext.keywords.map((k, i) => (
                            <Chip key={i} label={k} size="small" color="primary" variant="outlined" sx={{ fontSize: 11 }} />
                          ))}
                        </Stack>
                      </Box>
                    )}

                    {clientContext.pillars.length > 0 && (
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary', display: 'block', mb: 0.5 }}>
                          Pilares de Conteúdo
                        </Typography>
                        <Stack direction="row" flexWrap="wrap" gap={0.5}>
                          {clientContext.pillars.map((p, i) => (
                            <Chip key={i} label={p} size="small" color="secondary" variant="outlined" sx={{ fontSize: 11 }} />
                          ))}
                        </Stack>
                      </Box>
                    )}

                    {clientContext.tone && (
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary', display: 'block', mb: 0.25 }}>
                          Tom de Voz
                        </Typography>
                        <Typography variant="body2">{clientContext.tone}</Typography>
                      </Box>
                    )}

                    {clientContext.audience && (
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary', display: 'block', mb: 0.25 }}>
                          Público-alvo
                        </Typography>
                        <Typography variant="body2">{clientContext.audience}</Typography>
                      </Box>
                    )}

                    {clientContext.brand_promise && (
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary', display: 'block', mb: 0.25 }}>
                          Promessa da Marca
                        </Typography>
                        <Typography variant="body2" sx={{ fontStyle: 'italic' }}>{clientContext.brand_promise}</Typography>
                      </Box>
                    )}

                    {clientContext.must_mentions.length > 0 && (
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary', display: 'block', mb: 0.5 }}>
                          Menções Obrigatórias
                        </Typography>
                        <Stack spacing={0.25}>
                          {clientContext.must_mentions.map((m, i) => (
                            <Typography key={i} variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <IconCheck size={11} color="#16a34a" />{m}
                            </Typography>
                          ))}
                        </Stack>
                      </Box>
                    )}

                    {clientContext.forbidden_claims.length > 0 && (
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary', display: 'block', mb: 0.5 }}>
                          Proibições / Restrições
                        </Typography>
                        <Stack spacing={0.25}>
                          {clientContext.forbidden_claims.map((f, i) => (
                            <Typography key={i} variant="caption" color="error.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Box component="span" sx={{ fontWeight: 700 }}>✕</Box> {f}
                            </Typography>
                          ))}
                        </Stack>
                      </Box>
                    )}

                    {clientContext.competitors.length > 0 && (
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary', display: 'block', mb: 0.5 }}>
                          Concorrentes
                        </Typography>
                        <Stack direction="row" flexWrap="wrap" gap={0.5}>
                          {clientContext.competitors.map((c, i) => (
                            <Chip key={i} label={c} size="small" variant="outlined" sx={{ fontSize: 11 }} />
                          ))}
                        </Stack>
                      </Box>
                    )}

                    {clientContext.website && (
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary', display: 'block', mb: 0.25 }}>
                          Website
                        </Typography>
                        <Box component="a" href={clientContext.website} target="_blank" rel="noopener noreferrer" sx={{ fontSize: 12, color: '#6366f1', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <IconLink size={12} />{clientContext.website}
                        </Box>
                      </Box>
                    )}

                    {Object.keys(clientContext.social_profiles).filter(k => clientContext.social_profiles[k]).length > 0 && (
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary', display: 'block', mb: 0.5 }}>
                          Redes Sociais
                        </Typography>
                        <Stack spacing={0.25}>
                          {Object.entries(clientContext.social_profiles).filter(([, v]) => v).map(([network, handle]) => (
                            <Typography key={network} variant="caption" sx={{ textTransform: 'capitalize' }}>
                              <Box component="span" sx={{ color: 'text.secondary', mr: 0.5 }}>{network}:</Box>{handle}
                            </Typography>
                          ))}
                        </Stack>
                      </Box>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            )}

            {/* Tasks */}
            {tasks.length > 0 && (
              <Card variant="outlined" sx={{ mb: 3 }}>
                <CardContent>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                    <IconCheck size={16} color="#3b82f6" />
                    <Typography variant="subtitle1" fontWeight={600}>Tarefas ({tasks.length})</Typography>
                  </Stack>
                  <Stack spacing={1}>
                    {tasks.map((task) => (
                      <Stack key={task.id} direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="body2" fontWeight={500} sx={{ textTransform: 'capitalize' }}>
                            {task.type.replace(/_/g, ' ')}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">{task.assigned_to}</Typography>
                        </Box>
                        <Chip
                          label={task.status}
                          size="small"
                          color={task.status === 'done' ? 'success' : task.status === 'in_progress' ? 'primary' : 'default'}
                          sx={{ fontSize: 11, textTransform: 'capitalize' }}
                        />
                      </Stack>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            )}

            {/* Activity Timeline */}
            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                  <IconClock size={16} color="#94a3b8" />
                  <Typography variant="subtitle1" fontWeight={600}>
                    Histórico{timeline.length > 0 ? ` (${timeline.length})` : ''}
                  </Typography>
                </Stack>

                {timeline.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">Nenhum evento registrado.</Typography>
                ) : (
                  <Stack spacing={0}>
                    {timeline.slice(0, 20).map((event, index) => (
                      <Box key={event.id + index}>
                        <Stack direction="row" spacing={1.5} sx={{ py: 1.25 }}>
                          <Box
                            sx={{
                              width: 26, height: 26, borderRadius: '50%',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              bgcolor: `${timelineColor(event.type)}18`,
                              color: timelineColor(event.type),
                              flexShrink: 0, mt: 0.1,
                            }}
                          >
                            {timelineIcon(event.type)}
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="caption" fontWeight={500} sx={{ display: 'block', lineHeight: 1.4 }}>
                              {event.label}
                              {event.detail && event.detail !== event.label && (
                                <Box component="span" sx={{ color: 'text.disabled', ml: '4px' }}>· {event.detail}</Box>
                              )}
                            </Typography>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10.5 }}>
                                {formatDateTime(event.timestamp)}
                              </Typography>
                              {event.actor && (
                                <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10.5 }}>
                                  por {event.actor}
                                </Typography>
                              )}
                            </Stack>
                          </Box>
                        </Stack>
                        {index < Math.min(timeline.length, 20) - 1 && <Divider sx={{ ml: 4.5 }} />}
                      </Box>
                    ))}
                    {timeline.length > 20 && (
                      <Typography variant="caption" color="text.secondary" sx={{ pt: 1, display: 'block', textAlign: 'center' }}>
                        + {timeline.length - 20} eventos anteriores
                      </Typography>
                    )}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </AppShell>
  );
}
