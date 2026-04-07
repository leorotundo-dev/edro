'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import PeopleDirectoryClient from './PeopleDirectoryClient';
import { apiGet } from '@/lib/api';
import type { OperationsJob } from '@/components/operations/model';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import {
  IconArrowUpRight,
  IconSearch,
  IconUsers,
  IconUserCheck,
} from '@tabler/icons-react';

// ── Types ─────────────────────────────────────────────────────────────────

type PlannerOwner = {
  owner: {
    id: string;
    name: string;
    email?: string | null;
    avatar_url?: string | null;
    role?: string | null;
    specialty?: string | null;
  };
  allocable_minutes: number;
  committed_minutes: number;
  tentative_minutes: number;
  usage: number;
  jobs: OperationsJob[];
};

type InternalPerson = {
  id: string;
  display_name: string;
  is_internal: boolean;
  avatar_url: string | null;
  identities: Array<{ type: string; value: string; primary: boolean }> | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────

function initials(name: string) {
  return (name || '').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';
}

function formatHours(minutes: number) {
  const m = Math.max(0, Math.round(minutes || 0));
  const h = Math.floor(m / 60);
  const min = m % 60;
  if (!h) return `${min}min`;
  if (!min) return `${h}h`;
  return `${h}h${min}`;
}

function ownerState(usage: number) {
  if (usage >= 1) return { label: 'Estourado', color: '#FA896B' };
  if (usage >= 0.85) return { label: 'Atenção', color: '#FFAE1F' };
  return { label: 'Controlado', color: '#13DEB9' };
}

// ── ColaboradorCard ───────────────────────────────────────────────────────

function ColaboradorCard({ row, q }: { row: PlannerOwner; q: string }) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const { owner, usage, jobs, allocable_minutes, committed_minutes, tentative_minutes } = row;
  const state = ownerState(usage);
  const freeMinutes = Math.max(0, allocable_minutes - committed_minutes - tentative_minutes);
  const pct = Math.min(100, Math.round(usage * 100));

  const nameMatch = q && owner.name.toLowerCase().includes(q.toLowerCase());
  const emailMatch = q && owner.email?.toLowerCase().includes(q.toLowerCase());
  if (q && !nameMatch && !emailMatch) return null;

  return (
    <Box
      sx={{
        borderRadius: 2.5,
        border: `1px solid ${dark ? alpha('#fff', 0.08) : alpha('#000', 0.07)}`,
        bgcolor: dark ? alpha('#fff', 0.02) : '#fff',
        p: 2.25,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        transition: 'box-shadow 0.15s',
        '&:hover': { boxShadow: dark ? '0 2px 12px rgba(0,0,0,0.35)' : '0 2px 12px rgba(0,0,0,0.08)' },
      }}
    >
      {/* Header */}
      <Stack direction="row" spacing={1.5} alignItems="flex-start" justifyContent="space-between">
        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
          <Avatar
            src={owner.avatar_url ?? undefined}
            sx={{
              width: 40, height: 40, fontSize: '0.8rem', fontWeight: 800, flexShrink: 0,
              bgcolor: alpha(theme.palette.primary.main, 0.14),
              color: 'primary.main',
            }}
          >
            {initials(owner.name)}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={800} noWrap sx={{ lineHeight: 1.2 }}>
              {owner.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', fontSize: '0.7rem' }}>
              {owner.specialty || owner.role || 'Equipe'}
            </Typography>
          </Box>
        </Stack>
        <Chip
          size="small"
          label={state.label}
          sx={{
            bgcolor: alpha(state.color, 0.14),
            color: state.color,
            fontWeight: 800,
            fontSize: '0.65rem',
            height: 20,
            flexShrink: 0,
          }}
        />
      </Stack>

      {jobs.length === 0 ? (
        /* No active jobs */
        <Chip
          label="Sem jobs ativos"
          size="small"
          variant="outlined"
          sx={{ alignSelf: 'flex-start', fontSize: '0.65rem', height: 20, color: 'text.disabled', borderColor: 'divider' }}
        />
      ) : (
        <>
          {/* Stats row */}
          <Stack direction="row" spacing={2.5}>
            <Box>
              <Typography variant="h6" fontWeight={900} sx={{ lineHeight: 1 }}>{jobs.length}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>
                jobs ativos
              </Typography>
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={900} sx={{ lineHeight: 1 }}>{formatHours(freeMinutes)}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>
                livres
              </Typography>
            </Box>
          </Stack>

          {/* Workload bar */}
          <Box>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>
                Carga comprometida
              </Typography>
              <Typography variant="caption" fontWeight={800} sx={{ color: state.color, fontSize: '0.68rem' }}>
                {pct}%
              </Typography>
            </Stack>
            <Box sx={{ height: 5, borderRadius: 99, bgcolor: alpha(state.color, 0.14) }}>
              <Box sx={{ height: 5, borderRadius: 99, width: `${pct}%`, bgcolor: state.color, transition: 'width 0.3s' }} />
            </Box>
          </Box>

          {/* Footer */}
          <Button
            component={Link}
            href={`/admin/operacoes/jobs?owner_id=${encodeURIComponent(owner.id)}`}
            size="small"
            variant="outlined"
            endIcon={<IconArrowUpRight size={13} />}
            sx={{ alignSelf: 'flex-start', fontSize: '0.7rem', fontWeight: 700, textTransform: 'none', py: 0.4, px: 1.25 }}
          >
            Ver pauta
          </Button>
        </>
      )}
    </Box>
  );
}


// ── merge helpers ─────────────────────────────────────────────────────────

function primaryEmail(identities: InternalPerson['identities']): string | null {
  if (!identities) return null;
  return identities.find((i) => i.type === 'email' && i.primary)?.value
    ?? identities.find((i) => i.type === 'email')?.value ?? null;
}

/** Merge ops-planner owners + people directory internals into a unified list. */
function mergeColaboradores(
  plannerOwners: PlannerOwner[],
  internalPeople: InternalPerson[],
): PlannerOwner[] {
  // Index planner owners by email (lowercased)
  const byEmail = new Map<string, PlannerOwner>();
  for (const o of plannerOwners) {
    if (o.owner.email) byEmail.set(o.owner.email.toLowerCase(), o);
  }

  // Start with all planner owners (they have real workload)
  const result: PlannerOwner[] = [...plannerOwners];
  const seen = new Set(plannerOwners.map((o) => o.owner.email?.toLowerCase()).filter(Boolean));

  // Add internal people who don't appear in planner (0 jobs)
  for (const p of internalPeople) {
    const email = primaryEmail(p.identities);
    const key = email?.toLowerCase() ?? '';
    if (key && seen.has(key)) {
      // Already in planner — patch avatar if missing
      const existing = byEmail.get(key);
      if (existing && !existing.owner.avatar_url && p.avatar_url) {
        existing.owner.avatar_url = p.avatar_url;
      }
      continue;
    }
    seen.add(key);
    result.push({
      owner: {
        id: p.id,
        name: p.display_name,
        email: email,
        avatar_url: p.avatar_url,
        role: null,
        specialty: null,
      },
      allocable_minutes: 960,
      committed_minutes: 0,
      tentative_minutes: 0,
      usage: 0,
      jobs: [],
    });
  }

  // Sort: with jobs first, then alphabetically
  result.sort((a, b) => {
    if (b.jobs.length !== a.jobs.length) return b.jobs.length - a.jobs.length;
    return a.owner.name.localeCompare(b.owner.name, 'pt-BR');
  });

  return result;
}

// ── ColaboradoresView ─────────────────────────────────────────────────────

function ColaboradoresView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [owners, setOwners] = useState<PlannerOwner[]>([]);
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [plannerRes, peopleRes] = await Promise.all([
        apiGet<{ data?: { owners: PlannerOwner[]; unassigned_jobs: OperationsJob[] } }>('/trello/ops-planner'),
        apiGet<{ success: boolean; data: InternalPerson[] }>('/people?internal=true&limit=200'),
      ]);
      const merged = mergeColaboradores(
        plannerRes?.data?.owners ?? [],
        peopleRes?.data ?? [],
      );
      setOwners(merged);
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar colaboradores');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const overloaded = owners.filter((o) => o.usage >= 1).length;
  const withSlack = owners.filter((o) => o.usage < 0.55 && o.jobs.length > 0).length;

  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }} justifyContent="space-between">
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip label={`${owners.length} pessoas`} size="small" variant="outlined" />
          <Chip label={`${withSlack} com folga`} size="small" color={withSlack ? 'success' : 'default'} variant="outlined" />
          {overloaded > 0 && <Chip label={`${overloaded} sob pressão`} size="small" color="error" variant="outlined" />}
        </Stack>
        <Button
          component={Link}
          href="/admin/equipe"
          size="small"
          variant="text"
          endIcon={<IconArrowUpRight size={13} />}
          sx={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'none', whiteSpace: 'nowrap' }}
        >
          Gestão da equipe
        </Button>
      </Stack>

      <TextField
        fullWidth size="small"
        placeholder="Buscar colaborador..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        InputProps={{
          startAdornment: <InputAdornment position="start"><IconSearch size={16} style={{ opacity: 0.4 }} /></InputAdornment>,
        }}
        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
      />

      {error && <Alert severity="error">{error}</Alert>}

      {loading ? (
        <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>
      ) : (
        <Grid container spacing={2}>
          {owners.map((row) => (
            <Grid key={row.owner.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <ColaboradorCard row={row} q={q} />
            </Grid>
          ))}
{!loading && owners.length === 0 && (
            <Grid size={{ xs: 12 }}>
              <Typography color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>
                Nenhum colaborador com jobs ativos encontrado.
              </Typography>
            </Grid>
          )}
        </Grid>
      )}
    </Stack>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────

type PeopleView = 'colaboradores' | 'clientes';

export default function PessoasWorkspaceClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawView = searchParams.get('view');
  const view: PeopleView = rawView === 'clientes' ? 'clientes' : 'colaboradores';

  const setView = (v: PeopleView) => {
    const params = new URLSearchParams(searchParams.toString());
    if (v === 'colaboradores') {
      params.delete('view');
    } else {
      params.set('view', v);
    }
    const q = params.toString();
    router.replace(q ? `/admin/pessoas?${q}` : '/admin/pessoas');
  };

  return (
    <AppShell title="Pessoas">
      <Stack spacing={3}>
        {/* Header */}
        <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h5" fontWeight={900}>Pessoas</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
              {view === 'colaboradores'
                ? 'Colaboradores e carga de trabalho atual.'
                : 'Contatos externos vinculados aos clientes da agência.'}
            </Typography>
          </Box>
          <ToggleButtonGroup
            value={view}
            exclusive
            onChange={(_e, v) => { if (v) setView(v); }}
            size="small"
          >
            <ToggleButton value="colaboradores" sx={{ px: 2, py: 0.6, fontSize: '0.78rem', fontWeight: 700, textTransform: 'none', gap: 0.75 }}>
              <IconUserCheck size={15} />
              Colaboradores
            </ToggleButton>
            <ToggleButton value="clientes" sx={{ px: 2, py: 0.6, fontSize: '0.78rem', fontWeight: 700, textTransform: 'none', gap: 0.75 }}>
              <IconUsers size={15} />
              Clientes
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        {/* Content */}
        {view === 'colaboradores' && <ColaboradoresView />}
        {view === 'clientes' && (
          <PeopleDirectoryClient
            embedded
            fixedFilter="external"
            title="Contatos dos Clientes"
          />
        )}
      </Stack>
    </AppShell>
  );
}
