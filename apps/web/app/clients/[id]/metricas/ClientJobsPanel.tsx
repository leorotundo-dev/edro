'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import {
  IconCalendarDue,
  IconCheck,
  IconClipboardCopy,
  IconRefresh,
  IconUser,
} from '@tabler/icons-react';

type Job = {
  id: string;
  title: string;
  job_type: string;
  status: string;
  priority_band: 'p0' | 'p1' | 'p2' | 'p3' | 'p4';
  deadline_at: string | null;
  estimated_delivery_at: string | null;
  owner_name: string | null;
  is_urgent: boolean;
};

const STATUS_LABELS: Record<string, string> = {
  intake: 'Entrada',
  planned: 'Classificação',
  ready: 'Pronto',
  allocated: 'Planejado',
  in_progress: 'Em produção',
  in_review: 'Revisão',
  awaiting_approval: 'Aprovação',
  approved: 'Aprovado',
  scheduled: 'Agendado',
  published: 'Entregue',
  done: 'Fechado',
  blocked: 'Bloqueado',
};

const STATUS_COLOR: Record<string, string> = {
  intake: '#94A3B8',
  planned: '#94A3B8',
  ready: '#60A5FA',
  allocated: '#60A5FA',
  in_progress: '#34D399',
  in_review: '#FBBF24',
  awaiting_approval: '#F97316',
  approved: '#34D399',
  scheduled: '#A78BFA',
  published: '#10B981',
  done: '#6B7280',
  blocked: '#EF4444',
};

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function isLate(job: Job) {
  if (!job.deadline_at || job.status === 'done' || job.status === 'published') return false;
  return new Date(job.deadline_at) < new Date();
}

function etaAfterDeadline(job: Job) {
  if (!job.deadline_at || !job.estimated_delivery_at) return false;
  return new Date(job.estimated_delivery_at) > new Date(job.deadline_at);
}

export default function ClientJobsPanel({ clientId }: { clientId: string }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiGet<{ data: Job[] }>(`/jobs?client_id=${clientId}&active=true`);
      const active = (res.data ?? []).filter(
        (j) => j.status !== 'done' && j.status !== 'archived' && j.status !== 'published',
      );
      setJobs(active);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const handleCopyETA = () => {
    const lines = jobs
      .filter((j) => j.estimated_delivery_at || j.deadline_at)
      .map((j) => {
        const eta = j.estimated_delivery_at ? formatDate(j.estimated_delivery_at) : formatDate(j.deadline_at);
        return `• ${j.title}: previsão ${eta} (${STATUS_LABELS[j.status] ?? j.status})`;
      });
    if (!lines.length) return;
    const text = `Demandas em andamento:\n${lines.join('\n')}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  if (loading) {
    return (
      <Stack spacing={1}>
        {[1, 2, 3].map((i) => <Skeleton key={i} height={52} variant="rounded" />)}
      </Stack>
    );
  }

  if (!jobs.length) {
    return (
      <Alert severity="success" sx={{ fontSize: '0.82rem' }}>
        Sem demandas ativas no momento.
      </Alert>
    );
  }

  const hasETA = jobs.some((j) => j.estimated_delivery_at);

  return (
    <Stack spacing={1.5}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={1}>
        <Typography variant="body2" fontWeight={700}>
          {jobs.length} demanda{jobs.length !== 1 ? 's' : ''} ativas
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Tooltip title="Copiar previsões para colar no WhatsApp / e-mail">
          <Button
            size="small"
            variant="outlined"
            startIcon={copied ? <IconCheck size={14} /> : <IconClipboardCopy size={14} />}
            onClick={handleCopyETA}
            color={copied ? 'success' : 'inherit'}
            sx={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'none', py: 0.4 }}
          >
            {copied ? 'Copiado!' : 'Copiar ETAs'}
          </Button>
        </Tooltip>
        <Tooltip title="Atualizar">
          <Box
            onClick={load}
            sx={{ cursor: 'pointer', display: 'flex', color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
          >
            <IconRefresh size={16} />
          </Box>
        </Tooltip>
      </Stack>

      {!hasETA && (
        <Alert severity="info" sx={{ fontSize: '0.75rem', py: 0.5 }}>
          ETAs serão calculados conforme os jobs forem alocados.
        </Alert>
      )}

      {/* Job rows */}
      {jobs.map((job) => {
        const late = isLate(job);
        const risk = etaAfterDeadline(job);
        const statusColor = STATUS_COLOR[job.status] ?? '#94A3B8';

        return (
          <Box
            key={job.id}
            sx={(theme) => ({
              px: 1.75,
              py: 1.25,
              borderRadius: 2,
              border: `1px solid`,
              borderColor: late
                ? alpha('#EF4444', 0.35)
                : risk
                  ? alpha('#F97316', 0.3)
                  : alpha(theme.palette.divider, 1),
              bgcolor: late
                ? alpha('#EF4444', 0.04)
                : risk
                  ? alpha('#F97316', 0.03)
                  : 'background.paper',
            })}
          >
            <Stack direction="row" alignItems="flex-start" spacing={1.5}>
              {/* Status dot */}
              <Box
                sx={{
                  width: 8, height: 8, borderRadius: '50%',
                  bgcolor: statusColor, flexShrink: 0, mt: 0.75,
                }}
              />

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" alignItems="center" spacing={0.75} flexWrap="wrap">
                  <Typography variant="body2" fontWeight={700} noWrap sx={{ maxWidth: 220 }}>
                    {job.title}
                  </Typography>
                  {job.is_urgent && (
                    <Chip label="Urgente" size="small" color="error"
                      sx={{ height: 16, fontSize: '0.6rem', fontWeight: 800, '& .MuiChip-label': { px: 0.6 } }} />
                  )}
                  {late && (
                    <Chip label="Atrasado" size="small"
                      sx={{ height: 16, fontSize: '0.6rem', fontWeight: 800, bgcolor: '#EF4444', color: '#fff', '& .MuiChip-label': { px: 0.6 } }} />
                  )}
                </Stack>

                <Stack direction="row" spacing={2} sx={{ mt: 0.5 }} flexWrap="wrap">
                  {/* Status */}
                  <Stack direction="row" spacing={0.4} alignItems="center">
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: statusColor }} />
                    <Typography variant="caption" sx={{ color: statusColor, fontWeight: 700, fontSize: '0.7rem' }}>
                      {STATUS_LABELS[job.status] ?? job.status}
                    </Typography>
                  </Stack>

                  {/* Owner */}
                  {job.owner_name && (
                    <Stack direction="row" spacing={0.4} alignItems="center">
                      <IconUser size={11} style={{ opacity: 0.5 }} />
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                        {job.owner_name}
                      </Typography>
                    </Stack>
                  )}

                  {/* Deadline */}
                  {job.deadline_at && (
                    <Stack direction="row" spacing={0.4} alignItems="center">
                      <IconCalendarDue size={11} style={{ opacity: 0.5 }} />
                      <Typography variant="caption" sx={{ color: late ? '#EF4444' : 'text.secondary', fontSize: '0.7rem', fontWeight: late ? 700 : 400 }}>
                        Prazo: {formatDate(job.deadline_at)}
                      </Typography>
                    </Stack>
                  )}

                  {/* ETA */}
                  {job.estimated_delivery_at && (
                    <Stack direction="row" spacing={0.4} alignItems="center">
                      <Typography variant="caption"
                        sx={{ color: risk ? '#F97316' : '#10B981', fontWeight: 700, fontSize: '0.7rem' }}>
                        ETA: {formatDate(job.estimated_delivery_at)}
                        {risk ? ' ⚠' : ''}
                      </Typography>
                    </Stack>
                  )}
                </Stack>
              </Box>
            </Stack>
          </Box>
        );
      })}
    </Stack>
  );
}
