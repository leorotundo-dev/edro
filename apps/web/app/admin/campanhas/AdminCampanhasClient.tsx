'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import {
  IconBrain,
  IconCalendar,
  IconChartBar,
  IconCheck,
  IconCoin,
  IconExternalLink,
  IconFlag,
  IconPlayerPlay,
  IconRefresh,
  IconSearch,
  IconTarget,
  IconTrendingUp,
} from '@tabler/icons-react';
import { apiGet } from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

type Campaign = {
  id: string;
  client_id: string;
  client_name?: string | null;
  client_logo_url?: string | null;
  client_brand_color?: string | null;
  name: string;
  objective: string;
  budget_brl: number | null;
  start_date: string;
  end_date: string | null;
  status: string;
  created_at: string;
  job_count?: number;
  job_done_count?: number;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  active: 'Ativa',
  paused: 'Pausada',
  completed: 'Concluída',
  cancelled: 'Cancelada',
};

const OBJ_LABEL: Record<string, string> = {
  performance: 'Performance',
  branding: 'Branding',
  balanced: 'Equilibrado',
};

function statusColor(s: string): 'success' | 'warning' | 'default' | 'error' {
  if (s === 'active') return 'success';
  if (s === 'paused') return 'warning';
  if (s === 'cancelled') return 'error';
  return 'default';
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' });
}

function fmtBrl(v: number | null) {
  if (!v) return null;
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

// ── Campaign Card ─────────────────────────────────────────────────────────────

function CampaignCard({ c }: { c: Campaign }) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const total = c.job_count ?? 0;
  const done = c.job_done_count ?? 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : null;
  const allDone = total > 0 && done === total;

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 3,
        borderColor: c.client_brand_color ? alpha(c.client_brand_color, 0.35) : 'divider',
        transition: 'box-shadow 0.15s',
        '&:hover': { boxShadow: '0 4px 16px rgba(0,0,0,0.1)' },
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        {/* Header: client avatar + campaign name */}
        <Stack direction="row" spacing={1.25} alignItems="flex-start" sx={{ mb: 1.5 }}>
          <Avatar
            src={c.client_logo_url ?? undefined}
            sx={{
              width: 32, height: 32, fontSize: '0.7rem', fontWeight: 800, flexShrink: 0,
              bgcolor: c.client_brand_color ?? '#5D87FF',
            }}
          >
            {initials(c.client_name ?? 'C')}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              component={Link}
              href={`/clients/${c.client_id}/campaigns`}
              variant="subtitle2"
              sx={{
                fontWeight: 700, display: 'block',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                textDecoration: 'none', color: 'text.primary',
                '&:hover': { color: 'primary.main' },
              }}
            >
              {c.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
              {c.client_name ?? '—'}
            </Typography>
          </Box>
          <Chip
            size="small"
            label={STATUS_LABEL[c.status] ?? c.status}
            color={statusColor(c.status)}
            sx={{ height: 20, fontSize: '0.62rem', fontWeight: 700, flexShrink: 0 }}
          />
        </Stack>

        {/* Chips row */}
        <Stack direction="row" spacing={0.75} flexWrap="wrap" sx={{ mb: 1.25 }}>
          <Chip size="small" label={OBJ_LABEL[c.objective] ?? c.objective} variant="outlined" sx={{ height: 18, fontSize: '0.6rem' }} />
          {c.budget_brl && (
            <Chip
              size="small"
              icon={<IconCoin size={11} />}
              label={fmtBrl(c.budget_brl)}
              sx={{ height: 18, fontSize: '0.6rem' }}
            />
          )}
        </Stack>

        {/* Job progress */}
        {total > 0 && (
          <Box sx={{ mb: 1.25 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.66rem' }}>
                Jobs: {done}/{total}
              </Typography>
              <Typography
                variant="caption"
                sx={{ fontSize: '0.66rem', fontWeight: 700, color: allDone ? '#13DEB9' : '#5D87FF' }}
              >
                {pct}%
              </Typography>
            </Stack>
            <Box sx={{ borderRadius: 99, overflow: 'hidden', height: 5, bgcolor: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)' }}>
              <Box
                sx={{
                  height: '100%', width: `${pct}%`,
                  bgcolor: allDone ? '#13DEB9' : '#5D87FF',
                  transition: 'width 0.4s ease', borderRadius: 99,
                }}
              />
            </Box>
          </Box>
        )}

        <Divider sx={{ mb: 1 }} />

        {/* Footer: dates + actions */}
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={0.5} alignItems="center">
            <IconCalendar size={12} color="#94a3b8" />
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem' }}>
              {fmtDate(c.start_date)}{c.end_date ? ` → ${fmtDate(c.end_date)}` : ''}
            </Typography>
          </Stack>
          <Tooltip title="Ver campanha">
            <IconButton
              size="small"
              component={Link}
              href={`/clients/${c.client_id}/campaigns`}
              sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}
            >
              <IconExternalLink size={13} />
            </IconButton>
          </Tooltip>
        </Stack>
      </CardContent>
    </Card>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

const STATUSES = ['active', 'paused', 'completed', 'cancelled'];

export default function AdminCampanhasClient() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('active');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet<{ success: boolean; data: Campaign[] }>('/campaigns');
      setCampaigns(res?.data ?? []);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = campaigns.filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        (c.client_name ?? '').toLowerCase().includes(q) ||
        c.objective.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Stats
  const active = campaigns.filter((c) => c.status === 'active').length;
  const withJobs = campaigns.filter((c) => (c.job_count ?? 0) > 0).length;
  const totalJobs = campaigns.reduce((s, c) => s + (c.job_count ?? 0), 0);
  const doneJobs = campaigns.reduce((s, c) => s + (c.job_done_count ?? 0), 0);
  const budget = campaigns.reduce((s, c) => s + (c.budget_brl ?? 0), 0);

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Campanhas</Typography>
          <Typography variant="body2" color="text.secondary">
            Visão executiva · todas as campanhas ativas na agência
          </Typography>
        </Box>
        <IconButton onClick={load} disabled={loading} size="small">
          {loading ? <CircularProgress size={18} /> : <IconRefresh size={18} />}
        </IconButton>
      </Stack>

      {/* Stats */}
      {!loading && campaigns.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Ativas', value: active, icon: <IconPlayerPlay size={18} />, color: '#13DEB9' },
            { label: 'Com jobs', value: withJobs, icon: <IconFlag size={18} />, color: '#5D87FF' },
            { label: 'Jobs concluídos', value: `${doneJobs}/${totalJobs}`, icon: <IconCheck size={18} />, color: '#FFAE1F' },
            { label: 'Budget total', value: fmtBrl(budget) ?? '—', icon: <IconCoin size={18} />, color: '#FA896B' },
          ].map(({ label, value, icon, color }) => (
            <Grid size={{ xs: 6, md: 3 }} key={label}>
              <Card variant="outlined" sx={{ borderRadius: 3 }}>
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Stack direction="row" alignItems="center" spacing={1.25}>
                    <Box sx={{ color, opacity: 0.85 }}>{icon}</Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">{label}</Typography>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.1 }}>{value}</Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Filters */}
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }} flexWrap="wrap">
        <TextField
          size="small"
          placeholder="Buscar campanha ou cliente…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><IconSearch size={16} /></InputAdornment> }}
          sx={{ width: 260 }}
        />
        {['all', ...STATUSES].map((s) => (
          <Chip
            key={s}
            size="small"
            label={s === 'all' ? 'Todas' : (STATUS_LABEL[s] ?? s)}
            onClick={() => setStatusFilter(s)}
            color={statusFilter === s ? 'primary' : 'default'}
            variant={statusFilter === s ? 'filled' : 'outlined'}
            sx={{ cursor: 'pointer' }}
          />
        ))}
      </Stack>

      {/* Loading */}
      {loading && (
        <Stack alignItems="center" justifyContent="center" sx={{ py: 10 }}>
          <CircularProgress size={28} />
        </Stack>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardContent>
            <Stack alignItems="center" spacing={2} sx={{ py: 6 }}>
              <IconBrain size={36} stroke={1.5} color="#94a3b8" />
              <Typography variant="h6" color="text.secondary">
                {search ? 'Nenhuma campanha encontrada' : 'Nenhuma campanha ainda'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', maxWidth: 340 }}>
                {search
                  ? 'Tente outro termo de busca.'
                  : 'As campanhas criadas nos perfis de clientes aparecem aqui.'}
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Grid */}
      {!loading && filtered.length > 0 && (
        <Grid container spacing={2}>
          {filtered.map((c) => (
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={c.id}>
              <CampaignCard c={c} />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
