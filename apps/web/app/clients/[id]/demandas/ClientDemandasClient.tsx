'use client';

import { useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import {
  IconChevronDown,
  IconChevronUp,
  IconInbox,
  IconLoader2,
  IconPlus,
  IconPlayerPlay,
  IconRefresh,
  IconTruck,
} from '@tabler/icons-react';
import JobWorkbenchDrawer from '@/components/operations/JobWorkbenchDrawer';
import { OpsJobRow } from '@/components/operations/primitives';
import { groupBy, STAGE_LABELS, type OperationsJob } from '@/components/operations/model';
import { sortByOperationalPriority } from '@/components/operations/derived';
import { useOperationsData } from '@/components/operations/useOperationsData';

const BUCKETS = [
  {
    key: 'entrou',
    label: 'Entrou',
    icon: <IconInbox size={14} />,
    stages: ['intake', 'planned', 'ready'],
    color: '#4570EA',
    bgColor: 'rgba(69,112,234,0.08)',
  },
  {
    key: 'producao',
    label: 'Em produção',
    icon: <IconPlayerPlay size={14} />,
    stages: ['allocated', 'in_progress', 'in_review'],
    color: '#13DEB9',
    bgColor: 'rgba(19,222,185,0.08)',
  },
  {
    key: 'esperando',
    label: 'Esperando',
    icon: <IconLoader2 size={14} />,
    stages: ['awaiting_approval', 'approved', 'scheduled', 'blocked'],
    color: '#FFAE1F',
    bgColor: 'rgba(255,174,31,0.08)',
  },
  {
    key: 'entregue',
    label: 'Entregue',
    icon: <IconTruck size={14} />,
    stages: ['published', 'done'],
    color: '#a0a0a0',
    bgColor: 'rgba(0,0,0,0.04)',
  },
] as const;

const STAGE_ORDER = ['intake', 'planned', 'ready', 'allocated', 'in_progress', 'in_review', 'awaiting_approval', 'approved', 'scheduled', 'published', 'done', 'blocked'];

function BucketSection({
  bucketKey,
  label,
  color,
  bgColor,
  icon,
  jobs,
  selectedJobId,
  onSelect,
  onAdvance,
  onAssign,
  owners,
}: {
  bucketKey: string;
  label: string;
  color: string;
  bgColor: string;
  icon: React.ReactElement;
  jobs: OperationsJob[];
  selectedJobId?: string | null;
  onSelect: (job: OperationsJob) => void;
  onAdvance: (jobId: string, nextStatus: string) => void;
  onAssign: (jobId: string, ownerId: string) => void;
  owners: ReturnType<typeof useOperationsData>['lookups']['owners'];
}) {
  const [open, setOpen] = useState(bucketKey !== 'entregue');
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  if (jobs.length === 0) return null;

  return (
    <Box>
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        onClick={() => setOpen((v) => !v)}
        sx={{
          px: 1.5,
          py: 0.75,
          borderRadius: 1.5,
          cursor: 'pointer',
          bgcolor: open ? bgColor : 'transparent',
          border: `1px solid ${open ? color : 'transparent'}`,
          transition: 'all 150ms ease',
          '&:hover': { bgcolor: bgColor },
        }}
      >
        <Box sx={{ color, display: 'flex', alignItems: 'center' }}>{icon}</Box>
        <Typography variant="caption" fontWeight={700} sx={{ color, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.7rem' }}>
          {label}
        </Typography>
        <Chip
          label={jobs.length}
          size="small"
          sx={{ height: 18, fontSize: '0.68rem', fontWeight: 700, bgcolor: color, color: '#fff', minWidth: 24, '& .MuiChip-label': { px: 0.75 } }}
        />
        <Box sx={{ ml: 'auto !important', color: dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)' }}>
          {open ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
        </Box>
      </Stack>

      <Collapse in={open} unmountOnExit={false}>
        <Box sx={{ mt: 0.5, display: 'flex', flexDirection: 'column', gap: 0 }}>
          {jobs.map((job) => (
            <OpsJobRow
              key={job.id}
              job={job}
              selected={selectedJobId === job.id}
              onClick={() => onSelect(job)}
              showStage
              onAdvance={onAdvance}
              onAssign={onAssign}
              owners={owners}
            />
          ))}
        </Box>
      </Collapse>
    </Box>
  );
}

export default function ClientDemandasClient({ clientId }: { clientId: string }) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  const { jobs, lookups, loading, error, refresh, currentUserId, createJob, updateJob, changeStatus, fetchJob, deleteJob } =
    useOperationsData(`?active=true&client_id=${clientId}`);

  const [selectedJob, setSelectedJob] = useState<OperationsJob | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  const sortedJobs = useMemo(() => [...jobs].sort(sortByOperationalPriority), [jobs]);

  const grouped = useMemo(() => groupBy(sortedJobs, (job) => job.status), [sortedJobs]);

  const bucketCounts = useMemo(() => {
    return BUCKETS.map((b) => ({
      ...b,
      count: b.stages.reduce((sum, s) => sum + (grouped[s]?.length ?? 0), 0),
    }));
  }, [grouped]);

  const handleAdvance = async (jobId: string, nextStatus: string) => {
    await changeStatus(jobId, nextStatus);
    await refresh();
  };

  const handleAssign = async (jobId: string, ownerId: string) => {
    await updateJob(jobId, { owner_id: ownerId });
    await refresh();
  };

  if (loading) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ py: 8 }}>
        <CircularProgress size={32} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Carregando demandas...</Typography>
      </Stack>
    );
  }

  if (error) {
    return (
      <Alert severity="error" action={<Button size="small" onClick={() => refresh()}>Tentar novamente</Button>}>
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Pipeline summary strip */}
      <Stack
        direction="row"
        spacing={1.5}
        sx={{
          p: 2,
          borderRadius: 2,
          bgcolor: dark ? alpha(theme.palette.common.white, 0.03) : alpha(theme.palette.common.black, 0.02),
          border: `1px solid ${alpha(theme.palette.divider, dark ? 0.12 : 0.1)}`,
          flexWrap: 'wrap',
        }}
      >
        {bucketCounts.map((b) => (
          <Stack key={b.key} direction="row" alignItems="center" spacing={0.75} sx={{ flex: '0 0 auto' }}>
            <Box sx={{ color: b.color, display: 'flex', alignItems: 'center' }}>{b.icon}</Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>{b.label}</Typography>
            <Typography variant="caption" fontWeight={800} sx={{ color: b.color, fontSize: '0.8rem' }}>{b.count}</Typography>
          </Stack>
        ))}

        <Box sx={{ ml: 'auto !important', display: 'flex', gap: 0.75, alignItems: 'center' }}>
          <IconButton size="small" onClick={() => refresh()} sx={{ color: 'text.disabled' }}>
            <IconRefresh size={15} />
          </IconButton>
          <Button
            variant="contained"
            size="small"
            startIcon={<IconPlus size={14} />}
            onClick={() => setComposerOpen(true)}
            sx={{ bgcolor: '#4570EA', '&:hover': { bgcolor: '#3560d4' }, textTransform: 'none', fontSize: '0.78rem', py: 0.5 }}
          >
            Nova demanda
          </Button>
        </Box>
      </Stack>

      {/* Empty state */}
      {sortedJobs.length === 0 && (
        <Stack alignItems="center" justifyContent="center" sx={{ py: 6, gap: 1 }}>
          <IconInbox size={32} style={{ opacity: 0.3 }} />
          <Typography variant="body2" color="text.secondary">Nenhuma demanda ativa para este cliente.</Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<IconPlus size={14} />}
            onClick={() => setComposerOpen(true)}
            sx={{ mt: 1, textTransform: 'none' }}
          >
            Criar primeira demanda
          </Button>
        </Stack>
      )}

      {/* Bucket groups */}
      {sortedJobs.length > 0 && (
        <Stack spacing={1}>
          {BUCKETS.map((bucket) => {
            const bucketJobs = bucket.stages
              .flatMap((s) => grouped[s] ?? [])
              .sort(sortByOperationalPriority);

            return (
              <BucketSection
                key={bucket.key}
                bucketKey={bucket.key}
                label={bucket.label}
                color={bucket.color}
                bgColor={bucket.bgColor}
                icon={bucket.icon}
                jobs={bucketJobs}
                selectedJobId={selectedJob?.id}
                onSelect={(job) => { setSelectedJob(job); setDetailOpen(true); }}
                onAdvance={handleAdvance}
                onAssign={handleAssign}
                owners={lookups.owners}
              />
            );
          })}
        </Stack>
      )}

      {/* Create drawer */}
      <JobWorkbenchDrawer
        open={composerOpen && !selectedJob}
        mode="create"
        job={{ client_id: clientId } as OperationsJob}
        jobTypes={lookups.jobTypes}
        skills={lookups.skills}
        channels={lookups.channels}
        clients={lookups.clients}
        owners={lookups.owners}
        currentUserId={currentUserId}
        onClose={() => setComposerOpen(false)}
        onCreate={async (payload) => {
          const created = await createJob(payload);
          await refresh();
          setComposerOpen(false);
          setSelectedJob(created);
          setDetailOpen(true);
          return created;
        }}
        onUpdate={updateJob}
        onStatusChange={changeStatus}
        onFetchDetail={fetchJob}
      />

      {/* Edit drawer */}
      <JobWorkbenchDrawer
        open={detailOpen && Boolean(selectedJob)}
        mode="edit"
        job={selectedJob}
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
          return updated;
        }}
        onDelete={async (jobId) => {
          await deleteJob(jobId);
          setDetailOpen(false);
          setSelectedJob(null);
          await refresh();
        }}
        onStatusChange={async (jobId, status, reason) => {
          const updated = await changeStatus(jobId, status, reason);
          await refresh();
          return updated;
        }}
        onFetchDetail={fetchJob}
      />
    </Box>
  );
}
