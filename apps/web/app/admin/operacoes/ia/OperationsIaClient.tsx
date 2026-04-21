'use client';

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import {
  IconAlertTriangle,
  IconChecks,
  IconClockHour4,
  IconFileText,
  IconProgress,
  IconSparkles,
} from '@tabler/icons-react';
import OperationsShell from '@/components/operations/OperationsShell';
import JobWorkbenchDrawer from '@/components/operations/JobWorkbenchDrawer';
import { OpsCard } from '@/components/operations/primitives';
import { useJarvisPage } from '@/hooks/useJarvisPage';
import {
  getDeliveryStatus,
  getTrelloListName,
  getTrelloLabelNames,
  isApprovalQueueJob,
  isCopyReadyJob,
  isWaitingBriefing,
  isWaitingInfo,
  cleanJobTitle,
  type OperationsJob,
} from '@/components/operations/model';
import { useOperationsData } from '@/components/operations/useOperationsData';

type LaneDefinition = {
  key: 'waiting_briefing' | 'waiting_info' | 'copy_ready' | 'approval';
  label: string;
  subtitle: string;
  color: string;
  icon: ReactNode;
};

const LANES: LaneDefinition[] = [
  {
    key: 'waiting_briefing',
    label: 'Aguardando briefing',
    subtitle: 'Demandas que ainda precisam completar a entrada antes de seguir para criação.',
    color: '#5D87FF',
    icon: <IconFileText size={16} />,
  },
  {
    key: 'waiting_info',
    label: 'Aguardando infos',
    subtitle: 'Jobs parados por falta de contexto, material ou retorno do cliente.',
    color: '#FFAE1F',
    icon: <IconAlertTriangle size={16} />,
  },
  {
    key: 'copy_ready',
    label: 'Prontas para copy',
    subtitle: 'Cards do Trello já prontos para virar copy, direção ou briefing assistido.',
    color: '#13DEB9',
    icon: <IconSparkles size={16} />,
  },
  {
    key: 'approval',
    label: 'Para aprovar',
    subtitle: 'Itens que já pedem revisão final, aprovação interna ou cliente.',
    color: '#E85219',
    icon: <IconChecks size={16} />,
  },
];

function getDueState(job: OperationsJob) {
  const label = getDeliveryStatus(job).label;
  if (label === 'Atrasado' || label === 'Máxima') return { label, tone: 'critical' as const };
  if (label === 'Stand-by') return { label, tone: 'warning' as const };
  return { label, tone: 'ok' as const };
}

function getLaneJobs(jobs: OperationsJob[], key: LaneDefinition['key']) {
  switch (key) {
    case 'waiting_briefing':
      return jobs.filter(isWaitingBriefing);
    case 'waiting_info':
      return jobs.filter((job) => !isWaitingBriefing(job) && isWaitingInfo(job));
    case 'copy_ready':
      return jobs.filter((job) => !isWaitingBriefing(job) && !isWaitingInfo(job) && isCopyReadyJob(job));
    case 'approval':
      return jobs.filter(isApprovalQueueJob);
    default:
      return [];
  }
}

function getPrimaryActionHref(job: OperationsJob, lane: LaneDefinition['key']) {
  if (lane === 'waiting_briefing') return `/admin/operacoes/jobs/${job.id}/briefing`;
  if (lane === 'copy_ready') return `/studio?jobId=${job.id}`;
  return null;
}

function getPrimaryActionLabel(lane: LaneDefinition['key']) {
  if (lane === 'waiting_briefing') return 'Abrir briefing';
  if (lane === 'copy_ready') return 'Abrir Studio';
  return 'Ver demanda';
}

export default function OperationsIaClient() {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const { jobs, lookups, loading, error, refresh, currentUserId, createJob, updateJob, changeStatus, fetchJob } = useOperationsData('?active=true');
  const [selectedJob, setSelectedJob] = useState<OperationsJob | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const lanes = useMemo(
    () =>
      LANES.reduce<Record<LaneDefinition['key'], OperationsJob[]>>((acc, lane) => {
        acc[lane.key] = getLaneJobs(jobs, lane.key);
        return acc;
      }, {
        waiting_briefing: [],
        waiting_info: [],
        copy_ready: [],
        approval: [],
      }),
    [jobs]
  );

  const totalInFlow = useMemo(
    () => Object.values(lanes).reduce((acc, laneJobs) => acc + laneJobs.length, 0),
    [lanes]
  );
  const readyNow = lanes.copy_ready.length;
  const overdueTotal = useMemo(
    () => Object.values(lanes).flat().filter((job) => getDueState(job).tone === 'critical').length,
    [lanes]
  );

  const openJobDetail = async (job: OperationsJob) => {
    setSelectedJob(job);
    setDetailOpen(true);
    try {
      const fresh = await fetchJob(job.id);
      if (fresh) setSelectedJob(fresh);
    } catch {
      setSelectedJob(job);
    }
  };

  useJarvisPage(
    {
      screen: 'operations_ia',
      operationsView: 'ia',
      clientId: selectedJob?.client_id ?? null,
      currentJobId: selectedJob?.id ?? null,
      currentJobTitle: selectedJob?.title ?? null,
      currentJobStatus: selectedJob?.status ?? null,
      currentJobOwner: selectedJob?.owner_name ?? null,
      currentJobType: selectedJob?.job_type ?? null,
      currentJobChannel: selectedJob?.channel ?? null,
      currentJobList: getTrelloListName(selectedJob || {}),
      currentJobLabels: getTrelloLabelNames(selectedJob || {}),
    },
    [
      selectedJob?.id,
      selectedJob?.client_id,
      selectedJob?.title,
      selectedJob?.status,
      selectedJob?.owner_name,
      selectedJob?.job_type,
      selectedJob?.channel,
      selectedJob?.metadata?.list_name,
      JSON.stringify(getTrelloLabelNames(selectedJob || {})),
    ]
  );

  return (
    <OperationsShell
      section="jobs"
      titleOverride="Pauta Geral · Handoff criativo"
      subtitleOverride="Recorte salvo da pauta para briefing, copy e aprovação, sem criar um fluxo paralelo."
      summary={
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip label={`${totalInFlow} itens na bandeja`} size="small" />
          <Chip label={`${readyNow} prontos para redação`} size="small" color="primary" />
          <Chip label={`${lanes.approval.length} para aprovar`} size="small" color="warning" />
          <Chip label={`${overdueTotal} em pressão`} size="small" color={overdueTotal ? 'error' : 'default'} />
        </Stack>
      }
    >
      <Stack spacing={3}>
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            px: 2.5,
            py: 2.25,
            border: `1px solid ${alpha(theme.palette.primary.main, dark ? 0.24 : 0.14)}`,
            bgcolor: dark ? alpha(theme.palette.primary.main, 0.08) : alpha(theme.palette.primary.main, 0.03),
          }}
        >
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} justifyContent="space-between">
            <Box>
              <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 900, letterSpacing: '0.18em' }}>
                RECORTE DA PAUTA GERAL
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.4 }}>
                Handoff criativo dentro da carteira
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 760, mt: 0.8 }}>
                Isso não é um sistema à parte. É só a parte da pauta que, neste momento, pede briefing,
                copy, revisão criativa ou aprovação. Tudo continua vindo do mesmo Trello e da mesma carteira operacional.
              </Typography>
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
              <Button component={Link} href="/admin/operacoes/jobs?view=table&group=client" variant="contained">
                Abrir pauta geral
              </Button>
              <Button component={Link} href="/admin/operacoes/jobs?view=table" variant="outlined">
                Abrir banco mestre
              </Button>
              <Button component={Link} href="/studio/editor" variant="outlined">
                Abrir Studio
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {error ? <Alert severity="error">{error}</Alert> : null}

        {loading ? (
          <Stack alignItems="center" justifyContent="center" sx={{ py: 10 }}>
            <CircularProgress size={28} />
          </Stack>
        ) : (
          <>
            <Grid container spacing={2}>
              {LANES.map((lane) => (
                <Grid key={lane.key} size={{ xs: 12, sm: 6, xl: 3 }}>
                  <Paper
                    elevation={0}
                    sx={{
                      borderRadius: 2.5,
                      px: 2,
                      py: 1.75,
                      border: `1px solid ${alpha(lane.color, 0.22)}`,
                      bgcolor: dark ? alpha(lane.color, 0.08) : alpha(lane.color, 0.04),
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
                      <Box>
                        <Stack direction="row" spacing={0.9} alignItems="center">
                          <Box sx={{ color: lane.color, display: 'inline-flex' }}>{lane.icon}</Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
                            {lane.label}
                          </Typography>
                        </Stack>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.8 }}>
                          {lane.subtitle}
                        </Typography>
                      </Box>
                      <Typography variant="h4" sx={{ fontWeight: 900, color: lane.color, lineHeight: 1 }}>
                        {lanes[lane.key].length}
                      </Typography>
                    </Stack>
                  </Paper>
                </Grid>
              ))}
            </Grid>

            <Grid container spacing={2}>
              {LANES.map((lane) => (
                <Grid key={lane.key} size={{ xs: 12, xl: 3 }}>
                  <Paper
                    elevation={0}
                    sx={{
                      borderRadius: 2.5,
                      border: `1px solid ${alpha(theme.palette.text.primary, dark ? 0.08 : 0.07)}`,
                      bgcolor: dark ? alpha(theme.palette.common.white, 0.02) : '#fff',
                      minHeight: 420,
                    }}
                  >
                    <Stack spacing={1.5} sx={{ p: 2 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
                            {lane.label}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {lanes[lane.key].length} no fluxo
                          </Typography>
                        </Box>
                        <Chip
                          size="small"
                          label={lanes[lane.key].length}
                          sx={{
                            bgcolor: alpha(lane.color, 0.12),
                            color: lane.color,
                            fontWeight: 900,
                          }}
                        />
                      </Stack>

                      <Stack spacing={1}>
                        {lanes[lane.key].length ? (
                          lanes[lane.key].slice(0, 10).map((job) => (
                            <OpsCard
                              key={job.id}
                              job={job}
                              onClick={() => void openJobDetail(job)}
                              onAdvance={changeStatus}
                              onAssign={async (jobId, ownerId) => { await updateJob(jobId, { owner_id: ownerId }); await refresh(); }}
                              owners={lookups.owners}
                            />
                          ))
                        ) : (
                          <Box
                            sx={{
                              borderRadius: 2,
                              p: 2,
                              border: `1px dashed ${alpha(theme.palette.text.primary, dark ? 0.12 : 0.1)}`,
                            }}
                          >
                            <Typography variant="body2" color="text.secondary">
                              Nada nessa etapa agora.
                            </Typography>
                          </Box>
                        )}
                      </Stack>
                    </Stack>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </>
        )}
      </Stack>

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
        onClose={() => {
          setDetailOpen(false);
          setSelectedJob(null);
        }}
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
    </OperationsShell>
  );
}
