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
  IconBriefcase,
  IconClock,
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

type FreelancerProfileLite = {
  id: string;
  user_id: string;
  email: string;
  display_name: string;
  user_name?: string | null;
  specialty: string | null;
  role_title: string | null;
  avatar_url: string | null;
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
  const hasJobs = jobs.length > 0;

  const nameMatch = q && owner.name.toLowerCase().includes(q.toLowerCase());
  const emailMatch = q && owner.email?.toLowerCase().includes(q.toLowerCase());
  if (q && !nameMatch && !emailMatch) return null;

  return (
    <Box
      component={Link}
      href={`/admin/pessoas/${encodeURIComponent(owner.id)}`}
      sx={{
        textDecoration: 'none',
        color: 'inherit',
        borderRadius: 3,
        border: `1px solid ${dark ? alpha('#fff', 0.08) : alpha('#000', 0.07)}`,
        bgcolor: dark ? alpha('#fff', 0.02) : '#fff',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        transition: 'box-shadow 0.15s, transform 0.15s',
        '&:hover': {
          boxShadow: dark ? '0 4px 24px rgba(0,0,0,0.4)' : '0 4px 24px rgba(0,0,0,0.1)',
          transform: 'translateY(-2px)',
        },
      }}
    >
      {/* Avatar area — fills top */}
      <Box sx={{ position: 'relative', bgcolor: alpha(theme.palette.primary.main, 0.06), pt: '72%' }}>
        <Avatar
          src={owner.avatar_url ?? undefined}
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            borderRadius: 0,
            fontSize: '2.8rem',
            fontWeight: 900,
            bgcolor: alpha(theme.palette.primary.main, 0.12),
            color: 'primary.main',
          }}
        >
          {initials(owner.name)}
        </Avatar>

        {/* Status badge top-right */}
        <Chip
          size="small"
          label={hasJobs ? state.label : 'Disponível'}
          sx={{
            position: 'absolute',
            top: 10,
            right: 10,
            bgcolor: hasJobs ? alpha(state.color, 0.85) : alpha('#13DEB9', 0.85),
            color: '#fff',
            fontWeight: 800,
            fontSize: '0.62rem',
            height: 20,
            backdropFilter: 'blur(4px)',
          }}
        />
      </Box>

      {/* Body */}
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5, flex: 1 }}>
        {/* Name + role */}
        <Box>
          <Typography variant="subtitle1" fontWeight={900} sx={{ lineHeight: 1.2 }}>
            {owner.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
            {owner.specialty || owner.role || 'Equipe'}
          </Typography>
        </Box>

        {/* Stats row */}
        <Stack
          direction="row"
          divider={<Box sx={{ width: '1px', bgcolor: 'divider', my: 0.25 }} />}
          sx={{
            borderRadius: 2,
            border: `1px solid ${theme.palette.divider}`,
            overflow: 'hidden',
          }}
        >
          {[
            { icon: <IconBriefcase size={13} />, value: hasJobs ? String(jobs.length) : '0', label: 'Jobs' },
            { icon: <IconClock size={13} />, value: hasJobs ? formatHours(freeMinutes) : '16h', label: 'Livres' },
            {
              icon: <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: hasJobs ? state.color : '#13DEB9' }} />,
              value: hasJobs ? `${pct}%` : '0%',
              label: 'Carga',
            },
          ].map((stat, i) => (
            <Box
              key={i}
              sx={{ flex: 1, py: 1, px: 0.5, textAlign: 'center', bgcolor: dark ? 'transparent' : alpha('#000', 0.01) }}
            >
              <Stack direction="row" spacing={0.4} alignItems="center" justifyContent="center" sx={{ color: 'text.secondary', mb: 0.3 }}>
                {stat.icon}
              </Stack>
              <Typography variant="body2" fontWeight={900} sx={{ lineHeight: 1, fontSize: '0.85rem' }}>
                {stat.value}
              </Typography>
              <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.62rem' }}>
                {stat.label}
              </Typography>
            </Box>
          ))}
        </Stack>

        {/* CTA row */}
        <Stack direction="row" justifyContent="flex-end" alignItems="center" sx={{ mt: 'auto' }}>
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ opacity: 0.45, fontSize: '0.72rem', fontWeight: 700 }}>
            <Typography variant="caption" fontWeight={700} sx={{ fontSize: '0.72rem' }}>Ver perfil</Typography>
            <IconArrowUpRight size={13} />
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
}


// ── merge helpers ─────────────────────────────────────────────────────────

function primaryEmail(identities: InternalPerson['identities']): string | null {
  if (!identities) return null;
  return identities.find((i) => i.type === 'email' && i.primary)?.value
    ?? identities.find((i) => i.type === 'email')?.value ?? null;
}

/** Merge ops-planner + people directory + freelancer profiles into a unified list. */
function mergeColaboradores(
  plannerOwners: PlannerOwner[],
  internalPeople: InternalPerson[],
  freelancers: FreelancerProfileLite[],
): PlannerOwner[] {
  // Index freelancer profiles by email, user_id and display_name for fast lookup
  const fpByEmail       = new Map<string, FreelancerProfileLite>();
  const fpByUserId      = new Map<string, FreelancerProfileLite>();
  const fpByDisplayName = new Map<string, FreelancerProfileLite>();
  for (const fp of freelancers) {
    if (fp.email)        fpByEmail.set(fp.email.toLowerCase(), fp);
    if (fp.user_id)      fpByUserId.set(fp.user_id, fp);
    if (fp.display_name) fpByDisplayName.set(fp.display_name.toLowerCase(), fp);
  }

  // Start with all planner owners — enrich from freelancer profile where possible
  const result: PlannerOwner[] = plannerOwners.map((o) => {
    const fp = fpByUserId.get(o.owner.id) ?? (o.owner.email ? fpByEmail.get(o.owner.email.toLowerCase()) : undefined);
    if (!fp) return o;
    return {
      ...o,
      owner: {
        ...o.owner,
        // Keep planner's proper name (e.g. "Leo Rotundo") — fall back to fp name only if planner has none
        name:       o.owner.name || fp.user_name || fp.display_name,
        specialty:  fp.specialty   ?? fp.role_title ?? o.owner.specialty,
        avatar_url: o.owner.avatar_url ?? fp.avatar_url,
      },
    };
  });

  // Index planner owners by email for dedup
  const byEmail = new Map<string, PlannerOwner>();
  for (const o of result) {
    if (o.owner.email) byEmail.set(o.owner.email.toLowerCase(), o);
  }
  const seen = new Set(result.map((o) => o.owner.email?.toLowerCase()).filter(Boolean));

  // Add internal people who don't appear in planner (0 jobs) — enrich from freelancer profiles
  for (const p of internalPeople) {
    const email = primaryEmail(p.identities);
    const key = email?.toLowerCase() ?? '';
    if (key && seen.has(key)) {
      // Already in planner — patch avatar if still missing
      const existing = byEmail.get(key);
      if (existing && !existing.owner.avatar_url && p.avatar_url) {
        existing.owner.avatar_url = p.avatar_url;
      }
      continue;
    }
    seen.add(key);
    // Match freelancer: by email first, then by display_name (handles missing identities)
    const fp = (email ? fpByEmail.get(email.toLowerCase()) : undefined)
      ?? fpByDisplayName.get(p.display_name.toLowerCase());
    result.push({
      owner: {
        // Use fp.id (freelancer_profiles PK) so the profile page can match via f.id === decodedId
        id:         fp?.id ?? p.id,
        // Prefer eu.name (proper full name) → fp.display_name (username) → p.display_name
        name:       fp?.user_name || fp?.display_name || p.display_name,
        email:      email ?? fp?.email ?? null,
        avatar_url: fp?.avatar_url ?? p.avatar_url,
        role:       fp?.role_title ?? null,
        specialty:  fp?.specialty ?? null,
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
      const [plannerRes, peopleRes, freelancersRes] = await Promise.all([
        apiGet<{ data?: { owners: PlannerOwner[]; unassigned_jobs: OperationsJob[] } }>('/trello/ops-planner'),
        apiGet<{ success: boolean; data: InternalPerson[] }>('/people?internal=true&limit=200'),
        apiGet<FreelancerProfileLite[]>('/freelancers').catch(() => [] as FreelancerProfileLite[]),
      ]);
      const merged = mergeColaboradores(
        plannerRes?.data?.owners ?? [],
        peopleRes?.data ?? [],
        freelancersRes ?? [],
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
