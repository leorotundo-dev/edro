'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import PeopleDirectoryClient from './PeopleDirectoryClient';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api';
import type { OperationsJob } from '@/components/operations/model';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import {
  IconArrowUpRight,
  IconBrandWhatsapp,
  IconBriefcase,
  IconClock,
  IconDots,
  IconEdit,
  IconMail,
  IconPlus,
  IconSearch,
  IconTrash,
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
  // Source tracking for edit/delete
  _people_id?: string | null;
  _freelancer_id?: string | null;
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

function ColaboradorCard({ row, q, onEdit, onDelete }: {
  row: PlannerOwner;
  q: string;
  onEdit?: (row: PlannerOwner) => void;
  onDelete?: (row: PlannerOwner) => void;
}) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const { owner, usage, jobs, allocable_minutes, committed_minutes, tentative_minutes } = row;
  const state = ownerState(usage);
  const freeMinutes = Math.max(0, allocable_minutes - committed_minutes - tentative_minutes);
  const pct = Math.min(100, Math.round(usage * 100));
  const hasJobs = jobs.length > 0;

  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const nameMatch = q && owner.name.toLowerCase().includes(q.toLowerCase());
  const emailMatch = q && owner.email?.toLowerCase().includes(q.toLowerCase());
  if (q && !nameMatch && !emailMatch) return null;

  const previewJobs = jobs.slice(0, 3);
  const extraJobs = jobs.length - previewJobs.length;

  // bar color based on load
  const barColor = pct >= 100 ? '#FA896B' : pct >= 85 ? '#FFAE1F' : '#13DEB9';

  return (
    <Box
      sx={{
        borderRadius: 3,
        border: `1px solid ${dark ? alpha('#fff', 0.08) : alpha('#000', 0.07)}`,
        bgcolor: dark ? alpha('#fff', 0.02) : '#fff',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'box-shadow 0.15s, transform 0.15s',
        '&:hover': {
          boxShadow: dark ? '0 4px 24px rgba(0,0,0,0.4)' : '0 4px 24px rgba(0,0,0,0.1)',
          transform: 'translateY(-2px)',
        },
      }}
    >
      {/* ── Avatar (full-width) ── */}
      <Box
        component={Link}
        href={`/admin/pessoas/${encodeURIComponent(owner.id)}`}
        sx={{ textDecoration: 'none', color: 'inherit', position: 'relative', bgcolor: alpha(theme.palette.primary.main, 0.06), pt: '72%', display: 'block' }}
      >
        <Avatar
          src={owner.avatar_url ?? undefined}
          sx={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            borderRadius: 0, fontSize: '2.8rem', fontWeight: 900,
            bgcolor: alpha(theme.palette.primary.main, 0.12), color: 'primary.main',
          }}
        >
          {initials(owner.name)}
        </Avatar>

        {/* Status badge */}
        <Chip
          size="small"
          label={hasJobs ? state.label : 'Disponível'}
          sx={{
            position: 'absolute', bottom: 10, left: 10,
            bgcolor: hasJobs ? alpha(state.color, 0.88) : alpha('#13DEB9', 0.88),
            color: '#fff', fontWeight: 800, fontSize: '0.6rem', height: 20,
            backdropFilter: 'blur(4px)',
          }}
        />

        {/* 3-dot menu button */}
        <IconButton
          size="small"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuAnchor(e.currentTarget); }}
          sx={{
            position: 'absolute', top: 8, right: 8,
            bgcolor: alpha('#000', 0.35), color: '#fff', backdropFilter: 'blur(4px)',
            width: 26, height: 26,
            '&:hover': { bgcolor: alpha('#000', 0.55) },
          }}
        >
          <IconDots size={14} />
        </IconButton>
      </Box>

      {/* ── Body ── */}
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 0, flex: 1 }}>
        {/* Name + specialty + contact icons */}
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box
            component={Link}
            href={`/admin/pessoas/${encodeURIComponent(owner.id)}`}
            sx={{ textDecoration: 'none', color: 'inherit', flex: 1, minWidth: 0 }}
          >
            <Typography variant="subtitle1" fontWeight={900} sx={{ lineHeight: 1.2 }} noWrap>
              {owner.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }} noWrap>
              {owner.specialty || owner.role || 'Equipe'}
            </Typography>
          </Box>
          <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0, mt: 0.25 }}>
            {owner.email && (
              <Tooltip title={owner.email}>
                <IconButton size="small" component="a" href={`mailto:${owner.email}`} onClick={(e) => e.stopPropagation()}
                  sx={{ p: 0.5, color: 'text.disabled', '&:hover': { color: '#5D87FF' } }}>
                  <IconMail size={14} />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </Stack>

        <Divider sx={{ my: 1.5 }} />

        {/* Position */}
        <Box sx={{ mb: 1.5 }}>
          <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'text.disabled', display: 'block', mb: 0.3 }}>
            Posição
          </Typography>
          <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.82rem' }} noWrap>
            {owner.specialty || owner.role || '—'}
          </Typography>
        </Box>

        {/* Availability bar */}
        <Box sx={{ mb: 1.75 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
            <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'text.disabled' }}>
              Disponibilidade
            </Typography>
            <Typography variant="caption" sx={{ fontSize: '0.68rem', fontWeight: 700, color: barColor }}>
              {hasJobs ? `${formatHours(freeMinutes)} livres` : 'Livre'}
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={pct}
            sx={{
              height: 5, borderRadius: 3,
              bgcolor: dark ? alpha('#fff', 0.08) : alpha('#000', 0.06),
              '& .MuiLinearProgress-bar': { bgcolor: barColor, borderRadius: 3 },
            }}
          />
        </Box>

        {/* Jobs preview + CTA */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 'auto' }}>
          <Stack direction="row" spacing={-0.75}>
            {previewJobs.map((job, i) => (
              <Tooltip key={job.id} title={job.title}>
                <Avatar
                  sx={{
                    width: 24, height: 24, fontSize: '0.5rem', fontWeight: 800,
                    border: `2px solid ${dark ? '#1e1e2d' : '#fff'}`,
                    bgcolor: alpha('#5D87FF', 0.15), color: '#5D87FF',
                    zIndex: previewJobs.length - i,
                  }}
                >
                  {(job.client_name || job.title || '?')[0].toUpperCase()}
                </Avatar>
              </Tooltip>
            ))}
            {extraJobs > 0 && (
              <Avatar sx={{ width: 24, height: 24, fontSize: '0.5rem', fontWeight: 800, border: `2px solid ${dark ? '#1e1e2d' : '#fff'}`, bgcolor: 'action.selected', zIndex: 0 }}>
                +{extraJobs}
              </Avatar>
            )}
            {!hasJobs && (
              <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.68rem' }}>Sem jobs ativos</Typography>
            )}
          </Stack>
          <Button
            component={Link}
            href={`/admin/pessoas/${encodeURIComponent(owner.id)}`}
            size="small"
            endIcon={<IconArrowUpRight size={12} />}
            sx={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'none', color: 'text.secondary', p: '2px 6px', minWidth: 0 }}
          >
            Ver perfil
          </Button>
        </Stack>
      </Box>

      {/* Context menu */}
      <Menu
        anchorEl={menuAnchor}
        open={!!menuAnchor}
        onClose={() => setMenuAnchor(null)}
        slotProps={{ paper: { sx: { borderRadius: 2, minWidth: 160, boxShadow: '0 4px 20px rgba(0,0,0,0.12)' } } }}
      >
        <MenuItem component={Link} href={`/admin/pessoas/${encodeURIComponent(owner.id)}`} onClick={() => setMenuAnchor(null)}
          sx={{ fontSize: '0.82rem', gap: 1 }}>
          Ver perfil completo
        </MenuItem>
        {(row._people_id || row._freelancer_id) && onEdit && (
          <MenuItem onClick={() => { setMenuAnchor(null); onEdit(row); }}
            sx={{ fontSize: '0.82rem', gap: 1 }}>
            <IconEdit size={14} /> Editar
          </MenuItem>
        )}
        {owner.email && (
          <MenuItem component="a" href={`mailto:${owner.email}`} onClick={() => setMenuAnchor(null)}
            sx={{ fontSize: '0.82rem', gap: 1 }}>
            <IconMail size={14} /> Enviar email
          </MenuItem>
        )}
        {owner.email && (
          <MenuItem onClick={() => { navigator.clipboard.writeText(owner.email!); setMenuAnchor(null); }}
            sx={{ fontSize: '0.82rem', gap: 1 }}>
            Copiar email
          </MenuItem>
        )}
        {row._people_id && onDelete && (
          <MenuItem onClick={() => { setMenuAnchor(null); onDelete(row); }}
            sx={{ fontSize: '0.82rem', gap: 1, color: 'error.main' }}>
            <IconTrash size={14} /> Excluir
          </MenuItem>
        )}
      </Menu>
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
      _freelancer_id: fp.id,
      owner: {
        ...o.owner,
        // Keep planner's proper name (e.g. "Leo Rotundo") — fall back to fp name only if planner has none
        name:       o.owner.name || fp.user_name || fp.display_name,
        specialty:  fp.specialty   ?? fp.role_title ?? o.owner.specialty,
        avatar_url: o.owner.avatar_url ?? fp.avatar_url,
      },
    };
  });

  // Index planner owners by email AND name for dedup
  const byEmail = new Map<string, PlannerOwner>();
  const byName  = new Map<string, PlannerOwner>();
  for (const o of result) {
    if (o.owner.email) byEmail.set(o.owner.email.toLowerCase(), o);
    byName.set(o.owner.name.toLowerCase(), o);
  }
  const seen = new Set(result.map((o) => o.owner.email?.toLowerCase()).filter(Boolean));

  // Add internal people who don't appear in planner (0 jobs) — enrich from freelancer profiles
  for (const p of internalPeople) {
    const email = primaryEmail(p.identities);
    const key = email?.toLowerCase() ?? '';

    // Dedup by email
    if (key && seen.has(key)) {
      const existing = byEmail.get(key);
      if (existing) {
        if (!existing.owner.avatar_url && p.avatar_url) existing.owner.avatar_url = p.avatar_url;
        if (!existing._people_id) existing._people_id = p.id;
      }
      continue;
    }

    // Dedup by display_name (catches duplicates without email, e.g. two "Leo Rotundo")
    const nameKey = p.display_name.toLowerCase();
    if (byName.has(nameKey)) {
      const existing = byName.get(nameKey)!;
      if (!existing.owner.avatar_url && p.avatar_url) existing.owner.avatar_url = p.avatar_url;
      if (!existing._people_id) existing._people_id = p.id;
      continue;
    }

    seen.add(key);
    // Match freelancer: by email first, then by display_name (handles missing identities)
    const fp = (email ? fpByEmail.get(email.toLowerCase()) : undefined)
      ?? fpByDisplayName.get(p.display_name.toLowerCase());

    const newEntry: PlannerOwner = {
      _people_id: p.id,
      _freelancer_id: fp?.id ?? null,
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
    };
    result.push(newEntry);
    byName.set(newEntry.owner.name.toLowerCase(), newEntry);
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

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState('');

  // Edit dialog
  const [editTarget, setEditTarget] = useState<PlannerOwner | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<PlannerOwner | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

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

  const openEdit = useCallback((row: PlannerOwner) => {
    setEditTarget(row);
    setEditName(row.owner.name);
    setEditEmail(row.owner.email ?? '');
    setEditError('');
  }, []);

  const openDelete = useCallback((row: PlannerOwner) => {
    setDeleteError('');
    setDeleteTarget(row);
  }, []);

  const handleCreate = async () => {
    if (!createName.trim()) { setCreateError('Nome obrigatório'); return; }
    if (!createEmail.trim()) { setCreateError('Email obrigatório para enviar o onboarding'); return; }
    setCreateSaving(true); setCreateError('');
    try {
      const result = await apiPost('/freelancers', {
        display_name: createName.trim(),
        user_email: createEmail.trim(),
        send_invite_email: true,
      });
      if (result?.invite_email_sent === false) {
        setCreateError(result?.warning ?? 'Colaborador criado, mas o e-mail inicial não foi enviado.');
        await load();
        return;
      }
      setCreateOpen(false); setCreateName(''); setCreateEmail('');
      await load();
    } catch (e: any) { setCreateError(e.message ?? 'Erro ao criar'); }
    finally { setCreateSaving(false); }
  };

  const handleEdit = async () => {
    if (!editTarget || !editName.trim()) { setEditError('Nome obrigatório'); return; }
    setEditSaving(true); setEditError('');
    try {
      if (editTarget._people_id) {
        await apiPatch(`/people/${editTarget._people_id}`, {
          display_name: editName.trim(),
          email: editEmail.trim() || null,
        });
      } else if (editTarget._freelancer_id) {
        await apiPatch(`/freelancers/${editTarget._freelancer_id}`, { display_name: editName.trim() });
      }
      setEditTarget(null);
      await load();
    } catch (e: any) { setEditError(e.message ?? 'Erro ao salvar'); }
    finally { setEditSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget?._people_id) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await apiDelete(`/people/${deleteTarget._people_id}`);
      setDeleteError('');
      setDeleteTarget(null);
      await load();
    } catch (e: any) {
      setDeleteError(e.message ?? 'Erro ao excluir');
    }
    finally { setDeleting(false); }
  };

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
        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            size="small"
            variant="contained"
            startIcon={<IconPlus size={14} />}
            onClick={() => { setCreateOpen(true); setCreateName(''); setCreateEmail(''); setCreateError(''); }}
          >
            Novo colaborador
          </Button>
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
              <ColaboradorCard row={row} q={q} onEdit={openEdit} onDelete={openDelete} />
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

      {/* ── Create dialog ────────────────────────────── */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Novo colaborador</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Nome completo" size="small" fullWidth autoFocus
              value={createName} onChange={(e) => setCreateName(e.target.value)}
            />
            <TextField
              label="Email" size="small" fullWidth type="email"
              value={createEmail} onChange={(e) => setCreateEmail(e.target.value)}
              helperText="Obrigatório — recebe o onboarding e o primeiro código de acesso"
            />
            {createError && <Alert severity="error">{createError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreateOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleCreate} disabled={createSaving || !createName.trim() || !createEmail.trim()}>
            {createSaving ? <CircularProgress size={16} /> : 'Criar e convidar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Edit dialog ──────────────────────────────── */}
      <Dialog open={!!editTarget} onClose={() => setEditTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Editar colaborador</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Nome completo" size="small" fullWidth autoFocus
              value={editName} onChange={(e) => setEditName(e.target.value)}
            />
            <TextField
              label="Email" size="small" fullWidth type="email"
              value={editEmail} onChange={(e) => setEditEmail(e.target.value)}
              helperText={editTarget?._people_id ? 'Email de acesso ao sistema' : 'Disponível apenas para edição via perfil completo'}
              disabled={!editTarget?._people_id}
            />
            {editError && <Alert severity="error">{editError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditTarget(null)}>Cancelar</Button>
          <Button variant="contained" onClick={handleEdit} disabled={editSaving || !editName.trim()}>
            {editSaving ? <CircularProgress size={16} /> : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete confirm dialog ────────────────────── */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Excluir colaborador?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Tem certeza que deseja excluir <strong>{deleteTarget?.owner.name}</strong>?
            Esta ação não pode ser desfeita.
          </Typography>
          {deleteError && <Alert severity="error" sx={{ mt: 2 }}>{deleteError}</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setDeleteTarget(null); setDeleteError(''); }} disabled={deleting}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={deleting}>
            {deleting ? <CircularProgress size={16} /> : 'Excluir'}
          </Button>
        </DialogActions>
      </Dialog>
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
