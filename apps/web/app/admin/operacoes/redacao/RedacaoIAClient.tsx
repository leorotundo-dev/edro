'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import {
  IconAlertTriangle,
  IconCalendarCheck,
  IconCheck,
  IconClock,
  IconEye,
  IconExternalLink,
  IconPencil,
  IconPlayerStop,
  IconRefresh,
  IconSend,
  IconSparkles,
  IconBrandTrello,
} from '@tabler/icons-react';
import OperationsShell from '@/components/operations/OperationsShell';
import { apiGet } from '@/lib/api';
import { cleanJobTitle, type OperationsJob } from '@/components/operations/model';

// ── Stage definitions ────────────────────────────────────────────────────────

type StageKey =
  | 'novo'
  | 'em_criacao'
  | 'revisao'
  | 'aprovacao'
  | 'agendado'
  | 'publicado'
  | 'parado';

type Stage = {
  key: StageKey;
  label: string;
  subtitle: string;
  color: string;
  icon: React.ReactNode;
  statuses: string[];
};

const STAGES: Stage[] = [
  {
    key: 'novo',
    label: 'Novo Post',
    subtitle: 'Entrada e planejamento',
    color: '#5D87FF',
    icon: <IconSparkles size={15} />,
    statuses: ['intake', 'planned', 'ready', 'allocated'],
  },
  {
    key: 'em_criacao',
    label: 'Em Criação',
    subtitle: 'Redação ou design em andamento',
    color: '#FFAE1F',
    icon: <IconPencil size={15} />,
    statuses: ['in_progress'],
  },
  {
    key: 'revisao',
    label: 'Revisão Interna',
    subtitle: 'Revisão criativa e ajustes',
    color: '#A855F7',
    icon: <IconEye size={15} />,
    statuses: ['in_review'],
  },
  {
    key: 'aprovacao',
    label: 'Aprovação',
    subtitle: 'Aguardando aprovação do cliente',
    color: '#E85219',
    icon: <IconCheck size={15} />,
    statuses: ['awaiting_approval', 'approved'],
  },
  {
    key: 'agendado',
    label: 'Agendado',
    subtitle: 'Aprovado e na fila de publicação',
    color: '#13DEB9',
    icon: <IconCalendarCheck size={15} />,
    statuses: ['scheduled'],
  },
  {
    key: 'publicado',
    label: 'Publicado',
    subtitle: 'Entregue ao mundo',
    color: '#13DEB9',
    icon: <IconSend size={15} />,
    statuses: ['published', 'done'],
  },
  {
    key: 'parado',
    label: 'Parado',
    subtitle: 'Aguardando desbloqueio',
    color: '#FA896B',
    icon: <IconPlayerStop size={15} />,
    statuses: ['blocked'],
  },
];

// ── Job types that are "content production" ──────────────────────────────────

const CONTENT_JOB_TYPES = new Set([
  'copy',
  'design_static',
  'design_carousel',
  'video_edit',
  'publication',
]);

const JOB_TYPE_LABELS: Record<string, string> = {
  copy: 'Copy',
  design_static: 'Design',
  design_carousel: 'Carrossel',
  video_edit: 'Vídeo',
  publication: 'Post',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

// ── Job Card ─────────────────────────────────────────────────────────────────

function JobCard({ job, stageColor }: { job: OperationsJob; stageColor: string }) {
  const theme = useTheme();
  const age = daysSince(job.created_at as string);
  const isOld = age > 5;
  const trelloUrl = (job.metadata as any)?.trello_url ?? null;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.25,
        borderRadius: 1.5,
        borderColor: isOld ? alpha('#FA896B', 0.3) : theme.palette.divider,
        bgcolor: isOld
          ? alpha('#FA896B', 0.04)
          : theme.palette.mode === 'dark'
          ? alpha(theme.palette.common.white, 0.02)
          : alpha(theme.palette.common.black, 0.01),
        '&:hover': { borderColor: alpha(stageColor, 0.4), bgcolor: alpha(stageColor, 0.04) },
        transition: 'all 160ms ease',
      }}
    >
      <Stack spacing={0.75}>
        {/* Client + age */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={0.5}>
          <Typography variant="caption" fontWeight={700} color="text.secondary" noWrap sx={{ maxWidth: '70%' }}>
            {(job as any).client_name || '—'}
          </Typography>
          <Chip
            size="small"
            label={`${age}d`}
            sx={{
              height: 16,
              fontSize: '0.6rem',
              fontWeight: 700,
              bgcolor: isOld ? alpha('#FA896B', 0.12) : alpha(stageColor, 0.1),
              color: isOld ? '#FA896B' : stageColor,
            }}
          />
        </Stack>

        {/* Title */}
        <Tooltip title={job.title} placement="top">
          <Typography variant="caption" fontWeight={600} sx={{ lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {cleanJobTitle(job.title)}
          </Typography>
        </Tooltip>

        {/* Type chip + action icons */}
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Chip
            size="small"
            label={JOB_TYPE_LABELS[job.job_type] ?? job.job_type}
            variant="outlined"
            sx={{ height: 18, fontSize: '0.62rem' }}
          />
          <Stack direction="row" spacing={0.25}>
            {trelloUrl && (
              <Tooltip title="Abrir no Trello">
                <IconButton size="small" component="a" href={trelloUrl} target="_blank" rel="noopener" sx={{ color: '#0052CC', p: 0.3 }}>
                  <IconBrandTrello size={13} />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Ver demanda">
              <IconButton size="small" component={Link} href={`/admin/operacoes/jobs/${job.id}`} sx={{ color: 'text.secondary', p: 0.3 }}>
                <IconExternalLink size={13} />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </Stack>
    </Paper>
  );
}

// ── Stage Column ──────────────────────────────────────────────────────────────

function StageColumn({ stage, jobs }: { stage: Stage; jobs: OperationsJob[] }) {
  const theme = useTheme();
  return (
    <Box sx={{ minWidth: 220, maxWidth: 260, flex: '0 0 240px' }}>
      {/* Column header */}
      <Box
        sx={{
          p: 1.5,
          mb: 1.5,
          borderRadius: 2,
          border: `1px solid ${alpha(stage.color, 0.3)}`,
          bgcolor: alpha(stage.color, theme.palette.mode === 'dark' ? 0.1 : 0.06),
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Box sx={{ color: stage.color }}>{stage.icon}</Box>
          <Box>
            <Typography variant="caption" fontWeight={900} sx={{ color: stage.color, textTransform: 'uppercase', letterSpacing: '0.07em', lineHeight: 1 }}>
              {stage.label}
            </Typography>
            <Stack direction="row" spacing={0.75} alignItems="center" mt={0.2}>
              <Chip
                size="small"
                label={jobs.length}
                sx={{ height: 16, fontSize: '0.65rem', fontWeight: 800, bgcolor: alpha(stage.color, 0.15), color: stage.color }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem' }}>{stage.subtitle}</Typography>
            </Stack>
          </Box>
        </Stack>
      </Box>

      {/* Cards */}
      <Stack spacing={1}>
        {jobs.length === 0 ? (
          <Box sx={{ py: 3, textAlign: 'center' }}>
            <Typography variant="caption" color="text.disabled">Nenhuma demanda</Typography>
          </Box>
        ) : (
          jobs.map((job) => (
            <JobCard key={job.id} job={job} stageColor={stage.color} />
          ))
        )}
      </Stack>
    </Box>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function RedacaoIAClient() {
  const [clientFilter, setClientFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [jobs, setJobs] = useState<OperationsJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await apiGet<{ data: OperationsJob[] }>('/jobs?active=true&limit=500');
      const all = res?.data ?? [];
      setJobs(all.filter((j) => CONTENT_JOB_TYPES.has(j.job_type)));
    } catch (e: any) {
      setError(e?.message || 'Erro ao carregar demandas.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on mount
  useEffect(() => { load(); }, [load]);

  // Get unique clients from jobs
  const clientOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const j of jobs) {
      const cid = j.client_id;
      const cn = (j as any).client_name;
      if (cid && cn) map.set(cid, cn);
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [jobs]);

  // Apply filters
  const filtered = useMemo(() => {
    let arr = jobs;
    if (clientFilter) arr = arr.filter((j) => j.client_id === clientFilter);
    if (typeFilter) arr = arr.filter((j) => j.job_type === typeFilter);
    return arr;
  }, [jobs, clientFilter, typeFilter]);

  // Bucket by stage
  const byStage = useMemo(() => {
    const map: Record<StageKey, OperationsJob[]> = {
      novo: [], em_criacao: [], revisao: [], aprovacao: [],
      agendado: [], publicado: [], parado: [],
    };
    for (const job of filtered) {
      for (const stage of STAGES) {
        if (stage.statuses.includes(job.status)) {
          map[stage.key].push(job);
          break;
        }
      }
    }
    return map;
  }, [filtered]);

  const active = filtered.filter((j) => !['published', 'done'].includes(j.status)).length;
  const atRisk = filtered.filter((j) => {
    if (!j.deadline_at) return false;
    return new Date(j.deadline_at) < new Date();
  }).length;

  return (
    <OperationsShell
      section="redacao"
      titleOverride="Redação IA · Pipeline de Conteúdo"
      subtitleOverride="Visão do pipeline de posts, copy e design — do briefing à publicação."
      summary={
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip label={`${filtered.length} demandas`} size="small" />
          <Chip label={`${active} em aberto`} size="small" color="primary" />
          {atRisk > 0 && <Chip label={`${atRisk} em risco`} size="small" color="error" icon={<IconAlertTriangle size={12} />} />}
        </Stack>
      }
    >
      <Stack spacing={2.5}>
        {/* Toolbar */}
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
          <TextField
            select size="small" value={clientFilter} onChange={(e) => setClientFilter(e.target.value)}
            label="Cliente" sx={{ minWidth: 180 }}
          >
            <MenuItem value="">Todos os clientes</MenuItem>
            {clientOptions.map((c) => (
              <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
            ))}
          </TextField>

          <TextField
            select size="small" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
            label="Tipo" sx={{ minWidth: 140 }}
          >
            <MenuItem value="">Todos os tipos</MenuItem>
            {Object.entries(JOB_TYPE_LABELS).map(([k, v]) => (
              <MenuItem key={k} value={k}>{v}</MenuItem>
            ))}
          </TextField>

          <Box sx={{ flex: 1 }} />
          <Button variant="outlined" size="small" component={Link} href="/admin/operacoes/ia">
            Ver handoff IA
          </Button>
          <Tooltip title="Recarregar">
            <IconButton size="small" onClick={load} disabled={loading}><IconRefresh size={16} /></IconButton>
          </Tooltip>
        </Stack>

        {error && <Alert severity="error">{error}</Alert>}

        {loading ? (
          <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>
        ) : (
          /* Horizontal pipeline */
          <Box
            sx={{
              overflowX: 'auto',
              pb: 2,
              '&::-webkit-scrollbar': { height: 6 },
              '&::-webkit-scrollbar-track': { borderRadius: 99 },
              '&::-webkit-scrollbar-thumb': { borderRadius: 99, bgcolor: 'divider' },
            }}
          >
            <Stack direction="row" spacing={2} sx={{ minWidth: 'max-content', pb: 1 }}>
              {STAGES.map((stage) => (
                <StageColumn key={stage.key} stage={stage} jobs={byStage[stage.key]} />
              ))}
            </Stack>
          </Box>
        )}

        {/* Legend */}
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <IconClock size={14} color="#FA896B" />
            <Typography variant="caption" color="text.secondary">Chip vermelho = mais de 5 dias nesta fase</Typography>
          </Stack>
          <Typography variant="caption" color="text.disabled">·</Typography>
          <Typography variant="caption" color="text.secondary">
            Apenas jobs dos tipos: Copy, Design, Carrossel, Vídeo, Post
          </Typography>
        </Stack>
      </Stack>
    </OperationsShell>
  );
}
