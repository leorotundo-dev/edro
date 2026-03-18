'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { alpha, useTheme } from '@mui/material/styles';
import {
  IconBriefcase,
  IconCalendarDue,
  IconCheck,
  IconClock,
  IconFlame,
  IconPlayerPlay,
} from '@tabler/icons-react';
import AppShell from '@/components/AppShell';
import { OpsJobRow } from '@/components/operations/primitives';
import JobWorkbenchDrawer from '@/components/operations/JobWorkbenchDrawer';
import { sortByOperationalPriority } from '@/components/operations/derived';
import { getRisk, STAGE_LABELS, type OperationsJob } from '@/components/operations/model';
import { useOperationsData } from '@/components/operations/useOperationsData';

const CLOSED = new Set(['published', 'done', 'archived']);

export default function MinhaFilaClient() {
  const theme = useTheme();
  const { jobs, lookups, loading, error, refresh, currentUserId, updateJob, changeStatus, fetchJob, createJob } = useOperationsData('?active=true');
  const [selectedJob, setSelectedJob] = useState<OperationsJob | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Only my jobs
  const myJobs = useMemo(() => {
    if (!currentUserId) return [];
    return jobs.filter((j) => j.owner_id === currentUserId).sort(sortByOperationalPriority);
  }, [jobs, currentUserId]);

  const now = new Date();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  const weekEnd = new Date(now.getTime() + 7 * 24 * 3600_000);

  const urgent = myJobs.filter((j) => j.is_urgent || getRisk(j).level === 'critical');
  const overdue = myJobs.filter((j) => j.deadline_at && new Date(j.deadline_at) < now && !CLOSED.has(j.status));
  const dueToday = myJobs.filter((j) => j.deadline_at && new Date(j.deadline_at) >= now && new Date(j.deadline_at) <= todayEnd);
  const dueWeek = myJobs.filter((j) => j.deadline_at && new Date(j.deadline_at) > todayEnd && new Date(j.deadline_at) <= weekEnd);
  const inProgress = myJobs.filter((j) => ['in_progress', 'in_review'].includes(j.status));
  const waitingApproval = myJobs.filter((j) => j.status === 'awaiting_approval');

  useEffect(() => {
    if (!selectedJob) return;
    const fresh = myJobs.find((j) => j.id === selectedJob.id);
    if (fresh) setSelectedJob(fresh);
    else setSelectedJob(null);
  }, [myJobs, selectedJob]);

  const statCards = [
    { label: 'Em produção', value: inProgress.length, icon: <IconPlayerPlay size={20} />, color: '#13DEB9' },
    { label: 'Aguardando aprovação', value: waitingApproval.length, icon: <IconClock size={20} />, color: '#FFAE1F' },
    { label: 'Atrasados', value: overdue.length, icon: <IconCalendarDue size={20} />, color: '#dc2626' },
    { label: 'Total ativo', value: myJobs.length, icon: <IconBriefcase size={20} />, color: '#5D87FF' },
  ];

  return (
    <AppShell title="Minha Fila">
      <Stack spacing={3}>
        <Box>
          <Typography variant="h5" fontWeight={800}>Minha fila</Typography>
          <Typography variant="body2" color="text.secondary">Suas demandas ativas, ordenadas por urgência.</Typography>
        </Box>

        {error && <Alert severity="error">{error}</Alert>}

        {loading ? (
          <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>
        ) : (
          <>
            {/* Stats */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              {statCards.map((s) => (
                <Card key={s.label} sx={{ flex: 1 }}>
                  <CardContent>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Box sx={{ width: 38, height: 38, borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: alpha(s.color, 0.12), color: s.color, flexShrink: 0 }}>
                        {s.icon}
                      </Box>
                      <Box>
                        <Typography variant="h5" fontWeight={800}>{s.value}</Typography>
                        <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>

            {myJobs.length === 0 ? (
              <Card>
                <CardContent sx={{ py: 6, textAlign: 'center' }}>
                  <IconCheck size={40} color={theme.palette.success.main} />
                  <Typography variant="h6" fontWeight={700} sx={{ mt: 1 }}>Fila limpa!</Typography>
                  <Typography variant="body2" color="text.secondary">Nenhuma demanda atribuída a você no momento.</Typography>
                </CardContent>
              </Card>
            ) : (
              <Grid container spacing={2.5}>
                {/* Urgentes/críticos */}
                {urgent.length > 0 && (
                  <Grid size={{ xs: 12 }}>
                    <JobSection
                      label="Urgente / Crítico"
                      icon={<IconFlame size={15} />}
                      color="#dc2626"
                      jobs={urgent}
                      selectedJob={selectedJob}
                      onSelectJob={(j) => { setSelectedJob(j); setDetailOpen(true); }}
                      owners={lookups.owners}
                      onAdvance={async (id, s) => { await changeStatus(id, s); await refresh(); }}
                      onAssign={async (id, oid) => { await updateJob(id, { owner_id: oid }); await refresh(); }}
                    />
                  </Grid>
                )}
                {/* Atrasados */}
                {overdue.length > 0 && (
                  <Grid size={{ xs: 12 }}>
                    <JobSection
                      label="Prazo vencido"
                      icon={<IconCalendarDue size={15} />}
                      color="#FA896B"
                      jobs={overdue.filter((j) => !urgent.find((u) => u.id === j.id))}
                      selectedJob={selectedJob}
                      onSelectJob={(j) => { setSelectedJob(j); setDetailOpen(true); }}
                      owners={lookups.owners}
                      onAdvance={async (id, s) => { await changeStatus(id, s); await refresh(); }}
                      onAssign={async (id, oid) => { await updateJob(id, { owner_id: oid }); await refresh(); }}
                    />
                  </Grid>
                )}
                {/* Hoje */}
                {dueToday.length > 0 && (
                  <Grid size={{ xs: 12, md: 6 }}>
                    <JobSection
                      label="Prazo hoje"
                      icon={<IconCalendarDue size={15} />}
                      color="#FFAE1F"
                      jobs={dueToday}
                      selectedJob={selectedJob}
                      onSelectJob={(j) => { setSelectedJob(j); setDetailOpen(true); }}
                      owners={lookups.owners}
                      onAdvance={async (id, s) => { await changeStatus(id, s); await refresh(); }}
                      onAssign={async (id, oid) => { await updateJob(id, { owner_id: oid }); await refresh(); }}
                    />
                  </Grid>
                )}
                {/* Semana */}
                {dueWeek.length > 0 && (
                  <Grid size={{ xs: 12, md: 6 }}>
                    <JobSection
                      label="Essa semana"
                      icon={<IconCalendarDue size={15} />}
                      color="#5D87FF"
                      jobs={dueWeek}
                      selectedJob={selectedJob}
                      onSelectJob={(j) => { setSelectedJob(j); setDetailOpen(true); }}
                      owners={lookups.owners}
                      onAdvance={async (id, s) => { await changeStatus(id, s); await refresh(); }}
                      onAssign={async (id, oid) => { await updateJob(id, { owner_id: oid }); await refresh(); }}
                    />
                  </Grid>
                )}
                {/* Restantes */}
                {(() => {
                  const shown = new Set([...urgent, ...overdue, ...dueToday, ...dueWeek].map((j) => j.id));
                  const rest = myJobs.filter((j) => !shown.has(j.id));
                  if (!rest.length) return null;
                  return (
                    <Grid size={{ xs: 12 }}>
                      <JobSection
                        label="Demais demandas"
                        icon={<IconBriefcase size={15} />}
                        color="#94a3b8"
                        jobs={rest}
                        selectedJob={selectedJob}
                        onSelectJob={(j) => { setSelectedJob(j); setDetailOpen(true); }}
                        owners={lookups.owners}
                        onAdvance={async (id, s) => { await changeStatus(id, s); await refresh(); }}
                        onAssign={async (id, oid) => { await updateJob(id, { owner_id: oid }); await refresh(); }}
                      />
                    </Grid>
                  );
                })()}
              </Grid>
            )}
          </>
        )}
      </Stack>

      <JobWorkbenchDrawer
        open={detailOpen && Boolean(selectedJob)}
        mode="edit"
        job={selectedJob}
        jobTypes={lookups.jobTypes} skills={lookups.skills} channels={lookups.channels}
        clients={lookups.clients} owners={lookups.owners}
        currentUserId={currentUserId}
        onClose={() => setDetailOpen(false)}
        onCreate={createJob}
        onUpdate={async (id, p) => { const u = await updateJob(id, p); await refresh(); setSelectedJob(u as OperationsJob); return u; }}
        onStatusChange={async (id, s, r) => { const u = await changeStatus(id, s, r); await refresh(); setSelectedJob(u as OperationsJob); return u; }}
        onFetchDetail={fetchJob}
      />
    </AppShell>
  );
}

function JobSection({
  label, icon, color, jobs, selectedJob, onSelectJob, owners, onAdvance, onAssign,
}: {
  label: string; icon: React.ReactNode; color: string;
  jobs: OperationsJob[]; selectedJob: OperationsJob | null;
  onSelectJob: (j: OperationsJob) => void;
  owners: any[];
  onAdvance: (id: string, status: string) => void;
  onAssign: (id: string, ownerId: string) => void;
}) {
  const theme = useTheme();
  if (!jobs.length) return null;
  return (
    <Box sx={{ borderRadius: 2, overflow: 'hidden', border: `1px solid ${alpha(color, 0.2)}`, bgcolor: alpha(color, 0.02) }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 2, py: 1, bgcolor: alpha(color, 0.06), borderBottom: `1px solid ${alpha(color, 0.1)}` }}>
        <Box sx={{ color, display: 'flex' }}>{icon}</Box>
        <Typography variant="body2" fontWeight={800}>{label}</Typography>
        <Chip label={jobs.length} size="small" sx={{ height: 18, fontSize: '0.7rem', fontWeight: 900, bgcolor: alpha(color, 0.12), color }} />
      </Stack>
      <Box sx={{ py: 0.5 }}>
        {jobs.map((job) => (
          <OpsJobRow key={job.id} job={job} selected={selectedJob?.id === job.id} onClick={() => onSelectJob(job)} showStage onAdvance={onAdvance} onAssign={onAssign} owners={owners} />
        ))}
      </Box>
    </Box>
  );
}
