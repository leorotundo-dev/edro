'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import {
  IconAlertTriangle,
  IconCalendarCheck,
  IconCheck,
  IconClock,
  IconEye,
  IconPencil,
  IconPlayerStop,
  IconRefresh,
  IconSend,
  IconSparkles,
} from '@tabler/icons-react';
import OperationsShell from '@/components/operations/OperationsShell';
import { OpsCard } from '@/components/operations/primitives';
import JobWorkbenchDrawer from '@/components/operations/JobWorkbenchDrawer';
import { useOperationsData } from '@/components/operations/useOperationsData';
import { type OperationsJob } from '@/components/operations/model';

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

// Job types considered "content production"
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

// ── Stage Column ──────────────────────────────────────────────────────────────

function StageColumn({
  stage,
  jobs,
  onCardClick,
  onAdvance,
  onAssign,
  owners,
}: {
  stage: Stage;
  jobs: OperationsJob[];
  onCardClick: (job: OperationsJob) => void;
  onAdvance: (jobId: string, status: string) => void;
  onAssign: (jobId: string, ownerId: string) => void;
  owners: OperationsJob[];
}) {
  const theme = useTheme();
  return (
    <Box sx={{ minWidth: 260, maxWidth: 290, flex: '0 0 270px' }}>
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
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem' }}>
                {stage.subtitle}
              </Typography>
            </Stack>
          </Box>
        </Stack>
      </Box>

      {/* Cards — canonical OpsCard */}
      <Stack spacing={1}>
        {jobs.length === 0 ? (
          <Box
            sx={{
              py: 3,
              textAlign: 'center',
              borderRadius: 2,
              border: `1px dashed ${alpha(stage.color, 0.2)}`,
            }}
          >
            <Typography variant="caption" color="text.disabled">Nenhuma demanda</Typography>
          </Box>
        ) : (
          jobs.map((job) => (
            <OpsCard
              key={job.id}
              job={job}
              onClick={() => onCardClick(job)}
              onAdvance={onAdvance}
              onAssign={onAssign}
              owners={owners as any}
            />
          ))
        )}
      </Stack>
    </Box>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function RedacaoIAClient() {
  const theme = useTheme();
  const { jobs, lookups, loading, error, refresh, currentUserId, createJob, updateJob, changeStatus, fetchJob } =
    useOperationsData('?active=true');

  const [selectedJob, setSelectedJob] = useState<OperationsJob | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [clientFilter, setClientFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Only content production jobs
  const contentJobs = useMemo(
    () => jobs.filter((j) => CONTENT_JOB_TYPES.has(j.job_type)),
    [jobs],
  );

  const filtered = useMemo(() => {
    let arr = contentJobs;
    if (clientFilter) arr = arr.filter((j) => j.client_id === clientFilter);
    if (typeFilter) arr = arr.filter((j) => j.job_type === typeFilter);
    return arr;
  }, [contentJobs, clientFilter, typeFilter]);

  // Unique clients for filter dropdown
  const clientOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const j of contentJobs) {
      if (j.client_id && j.client_name) map.set(j.client_id, j.client_name);
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [contentJobs]);

  // Bucket by pipeline stage
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

  const openDetail = async (job: OperationsJob) => {
    setSelectedJob(job);
    setDetailOpen(true);
    try {
      const fresh = await fetchJob(job.id);
      if (fresh) setSelectedJob(fresh as OperationsJob);
    } catch {
      // keep stale
    }
  };

  const active = filtered.filter((j) => !['published', 'done'].includes(j.status)).length;
  const atRisk = filtered.filter((j) => j.deadline_at && new Date(j.deadline_at) < new Date()).length;

  return (
    <>
      <OperationsShell
        section="redacao"
        titleOverride="Redação IA · Pipeline de Conteúdo"
        subtitleOverride="Pipeline de posts, copy e design do briefing à publicação."
        summary={
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip label={`${filtered.length} demandas`} size="small" />
            <Chip label={`${active} em aberto`} size="small" color="primary" />
            {atRisk > 0 && (
              <Chip
                label={`${atRisk} em risco`}
                size="small"
                color="error"
                icon={<IconAlertTriangle size={12} />}
              />
            )}
          </Stack>
        }
      >
        <Stack spacing={2.5}>
          {/* Toolbar */}
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
            <TextField
              select size="small" value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              label="Cliente" sx={{ minWidth: 180 }}
            >
              <MenuItem value="">Todos os clientes</MenuItem>
              {clientOptions.map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </TextField>

            <TextField
              select size="small" value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
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
            <Button
              variant="outlined"
              size="small"
              onClick={refresh}
              disabled={loading}
              startIcon={<IconRefresh size={14} />}
            >
              Atualizar
            </Button>
          </Stack>

          {error && <Alert severity="error">{error}</Alert>}

          {loading ? (
            <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress />
            </Box>
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
                  <StageColumn
                    key={stage.key}
                    stage={stage}
                    jobs={byStage[stage.key]}
                    onCardClick={openDetail}
                    onAdvance={changeStatus}
                    onAssign={async (jobId, ownerId) => {
                      await updateJob(jobId, { owner_id: ownerId });
                      await refresh();
                    }}
                    owners={lookups.owners as any}
                  />
                ))}
              </Stack>
            </Box>
          )}

          {/* Legend */}
          <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <IconClock size={14} color={theme.palette.warning.main} />
              <Typography variant="caption" color="text.secondary">
                Chip vermelho no card = mais de 3 dias sem atualização
              </Typography>
            </Stack>
            <Typography variant="caption" color="text.disabled">·</Typography>
            <Typography variant="caption" color="text.secondary">
              Tipos: Copy · Design · Carrossel · Vídeo · Post
            </Typography>
          </Stack>
        </Stack>
      </OperationsShell>

      <JobWorkbenchDrawer
        open={detailOpen && Boolean(selectedJob)}
        mode="edit"
        job={selectedJob}
        presentation="modal"
        jobTypes={lookups.jobTypes}
        skills={lookups.skills}
        channels={lookups.channels}
        clients={lookups.clients}
        owners={lookups.owners}
        currentUserId={currentUserId}
        onClose={() => { setDetailOpen(false); setSelectedJob(null); }}
        onCreate={createJob}
        onUpdate={async (jobId, payload) => {
          const updated = await updateJob(jobId, payload);
          await refresh();
          setSelectedJob(updated as OperationsJob);
          return updated;
        }}
        onStatusChange={async (jobId, status, reason) => {
          const updated = await changeStatus(jobId, status, reason);
          await refresh();
          const fresh = await fetchJob(jobId);
          const next = (fresh ?? updated) as OperationsJob;
          setSelectedJob(next);
          return next;
        }}
        onFetchDetail={fetchJob}
      />
    </>
  );
}
