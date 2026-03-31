'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import useSWR, { mutate } from 'swr';
import AppShell from '@/components/AppShell';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tabs from '@mui/material/Tabs';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import {
  IconBriefcase,
  IconCalendarStats,
  IconCurrencyDollar,
  IconCircleCheck,
  IconClock,
  IconAlertTriangle,
} from '@tabler/icons-react';
import { apiGet, apiPost } from '@/lib/api';

const swrFetcher = (url: string) => apiGet(url);

// ─── Types ────────────────────────────────────────────────────────────────────

type DAJob = {
  id: string;
  title: string;
  client_name: string | null;
  status: string;
  job_size: string | null;
  deadline_at: string | null;
  estimated_minutes: number | null;
  created_at: string;
};

type CapacitySlot = {
  freelancer_id: string;
  name: string;
  slots_total: number;
  slots_used: number;
  slots_available: number;
  week_start: string;
};

type BillingEntry = {
  id: string;
  job_id: string;
  job_title: string | null;
  client_name: string | null;
  job_size: string;
  rate_cents: number;
  status: 'pending' | 'approved' | 'paid';
  period_month: string;
  approved_at: string | null;
  paid_at: string | null;
  created_at: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function brl(cents: number) {
  return `R$ ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const STATUS_CHIP: Record<string, { label: string; color: 'default' | 'warning' | 'success' | 'error' | 'info' }> = {
  intake:             { label: 'Entrada',          color: 'default' },
  briefing:           { label: 'Briefing',          color: 'info' },
  aprovacao_briefing: { label: 'Aguarda aprovação', color: 'warning' },
  copy_ia:            { label: 'Copy IA',           color: 'info' },
  copy_review:        { label: 'Revisão copy',      color: 'warning' },
  alinhamento:        { label: 'Alinhamento',       color: 'info' },
  producao:           { label: 'Produção',          color: 'info' },
  aprovacao_interna:  { label: 'Aprovação interna', color: 'warning' },
  ajustes:            { label: 'Ajustes',           color: 'warning' },
  aprovacao_cliente:  { label: 'Aprovação cliente', color: 'warning' },
  ajustes_cliente:    { label: 'Ajustes cliente',   color: 'warning' },
  finalizing:         { label: 'Finalizando',       color: 'info' },
  billing:            { label: 'Cobrança',          color: 'info' },
  done:               { label: 'Concluído',         color: 'success' },
  archived:           { label: 'Arquivado',         color: 'default' },
};

const BILLING_STATUS_CHIP: Record<string, { label: string; color: 'default' | 'warning' | 'success' | 'error' }> = {
  pending:  { label: 'Aguardando',  color: 'warning' },
  approved: { label: 'Aprovado',    color: 'success' },
  paid:     { label: 'Pago',        color: 'default' },
};

function isOverdue(deadline: string | null) {
  if (!deadline) return false;
  return new Date(deadline) < new Date();
}

// ─── Jobs Tab ─────────────────────────────────────────────────────────────────

function JobsTab() {
  const [jobs, setJobs] = useState<DAJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'active' | 'done'>('active');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet<{ success: boolean; data: DAJob[] }>('/jobs/mine');
      setJobs(res.data ?? []);
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = jobs.filter((j) =>
    filter === 'active'
      ? !['done', 'archived'].includes(j.status)
      : ['done', 'archived'].includes(j.status),
  );

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={28} /></Box>;

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1}>
        <Chip
          label={`Ativos (${jobs.filter(j => !['done','archived'].includes(j.status)).length})`}
          color={filter === 'active' ? 'primary' : 'default'}
          onClick={() => setFilter('active')}
          sx={{ cursor: 'pointer' }}
        />
        <Chip
          label={`Concluídos (${jobs.filter(j => ['done','archived'].includes(j.status)).length})`}
          color={filter === 'done' ? 'primary' : 'default'}
          onClick={() => setFilter('done')}
          sx={{ cursor: 'pointer' }}
        />
      </Stack>

      {filtered.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
          <IconBriefcase size={36} opacity={0.3} />
          <Typography variant="body2" mt={1}>
            {filter === 'active' ? 'Nenhum job ativo no momento.' : 'Nenhum job concluído ainda.'}
          </Typography>
        </Box>
      ) : (
        <Stack spacing={1.5}>
          {filtered.map((job) => {
            const chip = STATUS_CHIP[job.status] ?? { label: job.status, color: 'default' as const };
            const overdue = isOverdue(job.deadline_at);
            return (
              <Paper
                key={job.id}
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 2,
                  borderColor: overdue ? 'error.main' : 'divider',
                  bgcolor: overdue ? 'error.50' : 'background.paper',
                }}
              >
                <Stack direction="row" alignItems="flex-start" spacing={1.5}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                      <Typography variant="body2" fontWeight={700} noWrap sx={{ maxWidth: 320 }}>
                        {job.title}
                      </Typography>
                      {job.job_size && (
                        <Chip label={job.job_size} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.65rem' }} />
                      )}
                      {overdue && (
                        <Chip
                          icon={<IconAlertTriangle size={11} />}
                          label="Atrasado"
                          size="small"
                          color="error"
                          sx={{ height: 18, fontSize: '0.65rem' }}
                        />
                      )}
                    </Stack>
                    <Stack direction="row" spacing={1} mt={0.5} alignItems="center" flexWrap="wrap">
                      {job.client_name && (
                        <Typography variant="caption" color="text.secondary">{job.client_name}</Typography>
                      )}
                      {job.deadline_at && (
                        <>
                          <Typography variant="caption" color="text.disabled">·</Typography>
                          <Typography variant="caption" color={overdue ? 'error.main' : 'text.secondary'}>
                            <IconClock size={11} style={{ verticalAlign: 'middle', marginRight: 2 }} />
                            {new Date(job.deadline_at).toLocaleDateString('pt-BR')}
                          </Typography>
                        </>
                      )}
                      {job.estimated_minutes && (
                        <>
                          <Typography variant="caption" color="text.disabled">·</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {job.estimated_minutes < 60
                              ? `${job.estimated_minutes}min`
                              : `${(job.estimated_minutes / 60).toFixed(1)}h`}
                          </Typography>
                        </>
                      )}
                    </Stack>
                  </Box>
                  <Chip
                    label={chip.label}
                    size="small"
                    color={chip.color}
                    sx={{ flexShrink: 0, fontSize: '0.72rem' }}
                  />
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}

// ─── Capacity Tab ─────────────────────────────────────────────────────────────

function CapacidadeTab() {
  const { data, isLoading } = useSWR<{ success: boolean; data: CapacitySlot[] }>(
    '/api/da-billing/capacity',
    swrFetcher,
  );

  const slots = data?.data ?? [];

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={28} /></Box>;

  if (!slots.length) {
    return (
      <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
        <IconCalendarStats size={36} opacity={0.3} />
        <Typography variant="body2" mt={1}>Nenhum dado de capacidade disponível.</Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Capacidade semanal atual de cada designer & redator.
      </Typography>
      <Stack spacing={2}>
        {slots.map((s) => {
          const pct = s.slots_total > 0 ? (s.slots_used / s.slots_total) * 100 : 0;
          const color = s.slots_available === 0 ? 'error' : s.slots_available <= 1 ? 'warning' : 'success';
          return (
            <Paper key={s.freelancer_id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar sx={{ width: 36, height: 36, bgcolor: `${color}.main`, fontSize: '0.8rem', fontWeight: 700 }}>
                  {(s.name ?? '?').charAt(0).toUpperCase()}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" mb={0.75}>
                    <Typography variant="body2" fontWeight={700}>{s.name}</Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="caption" color="text.secondary">
                        {s.slots_used}/{s.slots_total} slots
                      </Typography>
                      <Chip
                        size="small"
                        label={s.slots_available === 0 ? 'Lotado' : s.slots_available <= 1 ? 'Quase cheio' : `${s.slots_available} livres`}
                        color={color as any}
                        sx={{ height: 18, fontSize: '0.65rem' }}
                      />
                    </Stack>
                  </Stack>
                  <Tooltip title={`${Math.round(pct)}% da capacidade em uso`}>
                    <LinearProgress
                      variant="determinate"
                      value={pct}
                      color={color as any}
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                  </Tooltip>
                </Box>
              </Stack>
            </Paper>
          );
        })}
      </Stack>
    </Stack>
  );
}

// ─── Extrato Tab ──────────────────────────────────────────────────────────────

function ExtratoTab() {
  const [period, setPeriod] = useState(currentPeriod());

  const periods = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const { data, isLoading } = useSWR<{ success: boolean; data: BillingEntry[] }>(
    `/api/da-billing/me?period=${period}`,
    swrFetcher,
  );

  const entries = data?.data ?? [];

  const totalPending  = entries.filter(e => e.status === 'pending').reduce((s, e) => s + e.rate_cents, 0);
  const totalApproved = entries.filter(e => e.status === 'approved').reduce((s, e) => s + e.rate_cents, 0);
  const totalPaid     = entries.filter(e => e.status === 'paid').reduce((s, e) => s + e.rate_cents, 0);

  return (
    <Stack spacing={3}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h6" fontWeight={700}>Extrato de Pagamentos</Typography>
        <Select
          size="small"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          sx={{ minWidth: 130 }}
        >
          {periods.map((p) => (
            <MenuItem key={p} value={p}>{p}</MenuItem>
          ))}
        </Select>
      </Stack>

      {/* Summary cards */}
      <Stack direction="row" spacing={1.5}>
        {[
          { label: 'Aguardando', value: totalPending, color: '#f97316' },
          { label: 'Aprovado', value: totalApproved, color: '#22c55e' },
          { label: 'Pago', value: totalPaid, color: '#6b7280' },
        ].map((item) => (
          <Box
            key={item.label}
            sx={{
              flex: 1,
              p: 1.5,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              textAlign: 'center',
            }}
          >
            <Typography variant="caption" color="text.secondary" display="block">{item.label}</Typography>
            <Typography variant="h6" fontWeight={800} sx={{ color: item.value > 0 ? item.color : 'text.disabled' }}>
              {brl(item.value)}
            </Typography>
          </Box>
        ))}
      </Stack>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={24} /></Box>
      ) : entries.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
          <IconCurrencyDollar size={36} opacity={0.3} />
          <Typography variant="body2" mt={1}>Nenhum lançamento para {period}.</Typography>
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Job</TableCell>
                <TableCell>Cliente</TableCell>
                <TableCell align="center">Tamanho</TableCell>
                <TableCell align="right">Valor</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="right">Data</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {entries.map((entry) => {
                const chip = BILLING_STATUS_CHIP[entry.status] ?? { label: entry.status, color: 'default' as const };
                return (
                  <TableRow key={entry.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} sx={{ maxWidth: 200 }} noWrap>
                        {entry.job_title ?? '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">{entry.client_name ?? '—'}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={entry.job_size}
                        size="small"
                        variant="outlined"
                        sx={{ height: 18, fontSize: '0.65rem' }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={700}>{brl(entry.rate_cents)}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={chip.label}
                        size="small"
                        color={chip.color}
                        sx={{ fontSize: '0.68rem' }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="caption" color="text.secondary">
                        {new Date(entry.created_at).toLocaleDateString('pt-BR')}
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Stack>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type PortalTab = 'jobs' | 'capacidade' | 'extrato';

export default function MinhaAreaClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobsSummary = useSWR<{ success: boolean; data: DAJob[] }>('/jobs/mine', swrFetcher);
  const capacitySummary = useSWR<{ success: boolean; data: CapacitySlot[] }>('/api/da-billing/capacity', swrFetcher);
  const billingSummary = useSWR<{ success: boolean; data: BillingEntry[] }>(
    `/api/da-billing/me?period=${currentPeriod()}`,
    swrFetcher,
  );
  const [tab, setTab] = useState<PortalTab>(() => {
    const t = searchParams.get('tab');
    if (t === 'capacidade' || t === 'extrato') return t;
    return 'jobs';
  });

  const jobs = jobsSummary.data?.data ?? [];
  const slots = capacitySummary.data?.data ?? [];
  const billing = billingSummary.data?.data ?? [];
  const activeJobs = jobs.filter((job) => !['done', 'archived'].includes(job.status));
  const overdueJobs = activeJobs.filter((job) => isOverdue(job.deadline_at));
  const availableSlots = slots.reduce((sum, slot) => sum + slot.slots_available, 0);
  const pendingCents = billing
    .filter((entry) => entry.status === 'pending' || entry.status === 'approved')
    .reduce((sum, entry) => sum + entry.rate_cents, 0);
  const finishedJobs = jobs.filter((job) => ['done', 'archived'].includes(job.status)).length;
  const activeTabLabel =
    tab === 'jobs' ? 'Jobs e entregas' : tab === 'capacidade' ? 'Capacidade da semana' : 'Extrato e repasses';

  const changeTab = (value: PortalTab) => {
    setTab(value);
    const qs = value === 'jobs' ? '' : `?tab=${value}`;
    router.replace(`/minha-area${qs}`);
  };

  return (
    <AppShell title="Minha Área">
      <Stack spacing={3}>
        <Paper
          variant="outlined"
          sx={{
            p: { xs: 2.5, md: 3 },
            borderRadius: 4,
            borderColor: 'divider',
            background:
              'linear-gradient(135deg, rgba(79,70,229,0.08) 0%, rgba(59,130,246,0.03) 52%, rgba(255,255,255,1) 100%)',
          }}
        >
          <Stack spacing={2.5}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={2}
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', md: 'center' }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar
                  sx={{
                    width: 52,
                    height: 52,
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    fontWeight: 800,
                  }}
                >
                  MA
                </Avatar>
                <Box>
                  <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 800, letterSpacing: 0.9 }}>
                    Workspace pessoal
                  </Typography>
                  <Typography variant="h4" fontWeight={800}>
                    Minha Área
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Acompanhe suas entregas, sua carga desta semana e o que ainda falta virar repasse.
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip
                  icon={<IconCircleCheck size={14} />}
                  label={`${finishedJobs} concluídos`}
                  color="success"
                  variant="outlined"
                />
                <Chip
                  icon={<IconClock size={14} />}
                  label={activeTabLabel}
                  color="primary"
                  sx={{ fontWeight: 700 }}
                />
              </Stack>
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
              {[
                {
                  label: 'Jobs ativos',
                  value: String(activeJobs.length),
                  tone: '#4f46e5',
                  helper: overdueJobs.length ? `${overdueJobs.length} em atraso` : 'Tudo em movimento',
                },
                {
                  label: 'Capacidade livre',
                  value: `${availableSlots}`,
                  tone: '#0f766e',
                  helper: slots.length ? 'Slots disponíveis nesta semana' : 'Sem leitura disponível',
                },
                {
                  label: 'A receber',
                  value: brl(pendingCents),
                  tone: '#ea580c',
                  helper: 'Pendentes e aprovados do mês atual',
                },
              ].map((item) => (
                <Box
                  key={item.label}
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                    p: 2,
                  }}
                >
                  <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                    {item.label}
                  </Typography>
                  <Typography variant="h5" fontWeight={800} sx={{ color: item.tone }}>
                    {item.value}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.helper}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Stack>
        </Paper>

        <Box>
        <Tabs
          value={tab}
          onChange={(_, v) => changeTab(v)}
          sx={{ mb: 3, borderBottom: 1, borderColor: 'divider', '& .MuiTab-root': { minHeight: 44 } }}
        >
          <Tab
            value="jobs"
            label="Jobs"
            icon={<IconBriefcase size={16} />}
            iconPosition="start"
            sx={{ fontSize: '0.85rem' }}
          />
          <Tab
            value="capacidade"
            label="Capacidade"
            icon={<IconCalendarStats size={16} />}
            iconPosition="start"
            sx={{ fontSize: '0.85rem' }}
          />
          <Tab
            value="extrato"
            label="Extrato"
            icon={<IconCurrencyDollar size={16} />}
            iconPosition="start"
            sx={{ fontSize: '0.85rem' }}
          />
        </Tabs>

        {tab === 'jobs' && <JobsTab />}
        {tab === 'capacidade' && <CapacidadeTab />}
        {tab === 'extrato' && <ExtratoTab />}
        </Box>
      </Stack>
    </AppShell>
  );
}
