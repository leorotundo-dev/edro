'use client';

import { useState } from 'react';
import useSWR from 'swr';
import AppShell from '@/components/AppShell';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { IconCheck, IconSend, IconX } from '@tabler/icons-react';
import { apiGet, apiPost } from '@/lib/api';

type InReviewJob = {
  id: string;
  title: string;
  owner_name: string | null;
  client_name: string | null;
  job_size: string | null;
  fee_brl: string | null;
  delivered_at: string | null;
  delivered_link: string | null;
  delivery_notes: string | null;
  sla_paused_at: string | null;
  deadline_at: string | null;
};

function swrFetcher(url: string) {
  return apiGet(url);
}

function daysSince(d: string | null) {
  if (!d) return null;
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
}

function JobReviewCard({ job, onAction }: { job: InReviewJob; onAction: () => void }) {
  const [feedback, setFeedback] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [approving, setApproving] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [err, setErr] = useState('');
  const days = daysSince(job.delivered_at);

  async function approve() {
    setApproving(true); setErr('');
    try {
      await apiPost(`/jobs/${job.id}/b2b-approve`, {});
      onAction();
    } catch (e: any) { setErr(e.message ?? 'Erro'); }
    finally { setApproving(false); }
  }

  async function requestAdjustment() {
    if (!feedback.trim()) { setErr('Informe o feedback'); return; }
    setRequesting(true); setErr('');
    try {
      await apiPost(`/jobs/${job.id}/b2b-adjustment`, { feedback });
      onAction();
    } catch (e: any) { setErr(e.message ?? 'Erro'); }
    finally { setRequesting(false); }
  }

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2} flexWrap="wrap">
        <Box flex={1} minWidth={0}>
          <Stack direction="row" spacing={1} alignItems="center" mb={0.5} flexWrap="wrap">
            <Typography fontWeight={700} fontSize={15}>{job.title}</Typography>
            {job.job_size && <Chip label={job.job_size} size="small" variant="outlined" />}
            {days !== null && (
              <Chip
                label={`${days === 0 ? 'hoje' : `${days}d`} em revisão`}
                size="small"
                color={days >= 2 ? 'error' : 'warning'}
              />
            )}
          </Stack>
          <Stack direction="row" spacing={2} flexWrap="wrap">
            {job.client_name && <Typography variant="caption" color="text.secondary">{job.client_name}</Typography>}
            {job.owner_name && <Typography variant="caption" color="text.secondary">Freelancer: {job.owner_name}</Typography>}
            {job.fee_brl && <Typography variant="caption" color="success.main" fontWeight={700}>R$ {parseFloat(job.fee_brl).toFixed(2)}</Typography>}
          </Stack>
          {job.delivered_link && (
            <Box mt={1}>
              <a href={job.delivered_link} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 12, color: '#5D87FF' }}>
                Ver entrega →
              </a>
            </Box>
          )}
          {job.delivery_notes && (
            <Typography variant="caption" color="text.secondary" display="block" mt={0.5} sx={{ fontStyle: 'italic' }}>
              "{job.delivery_notes}"
            </Typography>
          )}
        </Box>

        <Stack direction="row" spacing={1} flexShrink={0}>
          <Button
            variant="contained" color="success" size="small"
            startIcon={approving ? <CircularProgress size={14} /> : <IconCheck size={14} />}
            onClick={approve} disabled={approving}
          >
            Aprovar
          </Button>
          <Button
            variant="outlined" color="warning" size="small"
            startIcon={<IconX size={14} />}
            onClick={() => setShowFeedback(v => !v)}
          >
            Ajuste
          </Button>
        </Stack>
      </Stack>

      {showFeedback && (
        <Box mt={2}>
          <TextField
            fullWidth size="small" multiline rows={2}
            placeholder="Descreva o que precisa ser ajustado..."
            value={feedback} onChange={e => setFeedback(e.target.value)}
          />
          {err && <Alert severity="error" sx={{ mt: 1 }}>{err}</Alert>}
          <Stack direction="row" spacing={1} mt={1} justifyContent="flex-end">
            <Button size="small" onClick={() => setShowFeedback(false)}>Cancelar</Button>
            <Button
              size="small" variant="contained" color="warning"
              startIcon={requesting ? <CircularProgress size={12} /> : <IconSend size={12} />}
              onClick={requestAdjustment} disabled={requesting || !feedback.trim()}
            >
              Solicitar Ajuste
            </Button>
          </Stack>
        </Box>
      )}
      {err && !showFeedback && <Alert severity="error" sx={{ mt: 1 }}>{err}</Alert>}
    </Paper>
  );
}

export default function HomologacaoPage() {
  const { data, isLoading, mutate } = useSWR<{ jobs: InReviewJob[] }>(
    '/jobs?status=in_review&source=ops_job&limit=100',
    swrFetcher,
    { refreshInterval: 30000 },
  );

  const jobs = (data?.jobs ?? []).filter(j => (j as any).status === 'in_review');

  return (
    <AppShell title="Homologação">
      <Box p={3}>
        <Typography variant="h5" fontWeight={800} mb={0.5}>🔍 Fila de Homologação</Typography>
        <Typography color="text.secondary" mb={3} fontSize={13}>
          Entregas de freelancers aguardando aprovação. Aprove ou solicite ajuste com feedback.
        </Typography>

        {isLoading ? (
          <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
        ) : jobs.length === 0 ? (
          <Alert severity="success" icon="✅">
            Nenhuma entrega aguardando homologação. Tudo em dia!
          </Alert>
        ) : (
          <Stack spacing={2}>
            <Alert severity="info">
              {jobs.length} entrega{jobs.length !== 1 ? 's' : ''} aguardando homologação
            </Alert>
            {jobs.map(job => (
              <JobReviewCard key={job.id} job={job} onAction={() => mutate()} />
            ))}
          </Stack>
        )}
      </Box>
    </AppShell>
  );
}
