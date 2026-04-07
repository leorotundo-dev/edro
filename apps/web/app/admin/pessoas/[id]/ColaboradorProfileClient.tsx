'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { apiGet } from '@/lib/api';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import {
  IconArrowLeft,
  IconArrowUpRight,
  IconBriefcase,
  IconCheck,
  IconClock,
  IconMail,
  IconPhone,
  IconBrandWhatsapp,
  IconStar,
} from '@tabler/icons-react';

// ── Types ─────────────────────────────────────────────────────────────────

type FreelancerProfile = {
  id: string;
  user_id: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
  specialty: string | null;
  role_title: string | null;
  department: string | null;
  experience_level: 'junior' | 'mid' | 'senior' | null;
  skills: string[] | null;
  tools: string[] | null;
  platform_expertise: string[] | null;
  languages: string[] | null;
  weekly_capacity_hours: number | null;
  hourly_rate_brl: number | null;
  phone: string | null;
  whatsapp_jid: string | null;
  notes: string | null;
  is_active: boolean;
};

type FreelancerStats = {
  profile: FreelancerProfile;
  recentJobs: Array<{
    id: string;
    title: string;
    status: string;
    client_name: string | null;
    deadline_at: string | null;
    complexity: string | null;
  }>;
  workload: { activeJobs: number; activeMinutes: number; weeklyCapacityMinutes: number };
  monthlyTrend: Array<{ month: string; count: number; punctuality: number }>;
  timeAccuracy: { avgEstimated: number; avgActual: number; sampleCount: number; driftPercent: number } | null;
};

type PlannerOwner = {
  owner: { id: string; name: string; email?: string | null; avatar_url?: string | null };
  usage: number;
  jobs: Array<{ id: string; title: string; status: string | null; client_name: string | null; deadline_at?: string | null }>;
  allocable_minutes: number;
  committed_minutes: number;
  tentative_minutes: number;
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
  return { label: 'Disponível', color: '#13DEB9' };
}

function expLabel(level: string | null) {
  if (level === 'senior') return 'Sênior';
  if (level === 'mid') return 'Pleno';
  if (level === 'junior') return 'Júnior';
  return null;
}

function statusColor(status: string | null) {
  if (!status) return '#999';
  const s = status.toLowerCase();
  if (s.includes('done') || s.includes('published')) return '#13DEB9';
  if (s.includes('review') || s.includes('aprovacao')) return '#FFAE1F';
  if (s.includes('cancel') || s.includes('blocked')) return '#FA896B';
  return '#5D87FF';
}

// ── StatBox ───────────────────────────────────────────────────────────────

function StatBox({ value, label, sub, color }: { value: string; label: string; sub?: string; color?: string }) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  return (
    <Box
      sx={{
        flex: 1,
        textAlign: 'center',
        py: 2.5,
        px: 1,
        borderRadius: 2.5,
        border: `1px solid ${dark ? alpha('#fff', 0.07) : alpha('#000', 0.07)}`,
        bgcolor: dark ? alpha('#fff', 0.02) : '#fff',
      }}
    >
      <Typography variant="h4" fontWeight={900} sx={{ color: color || 'text.primary', lineHeight: 1 }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontSize: '0.72rem' }}>
        {label}
      </Typography>
      {sub && (
        <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
          {sub}
        </Typography>
      )}
    </Box>
  );
}

// ── TagList ───────────────────────────────────────────────────────────────

function TagList({ items, color }: { items: string[]; color?: string }) {
  if (!items.length) return <Typography variant="caption" color="text.disabled">—</Typography>;
  return (
    <Stack direction="row" flexWrap="wrap" spacing={0.6} useFlexGap>
      {items.map((item, i) => (
        <Chip
          key={i}
          label={item}
          size="small"
          sx={{
            fontSize: '0.68rem',
            height: 22,
            fontWeight: 600,
            bgcolor: color ? alpha(color, 0.1) : undefined,
            color: color || undefined,
          }}
        />
      ))}
    </Stack>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────

export default function ColaboradorProfileClient({ id }: { id: string }) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Data from two sources
  const [planner, setPlanner] = useState<PlannerOwner | null>(null);
  const [stats, setStats] = useState<FreelancerStats | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const decodedId = decodeURIComponent(id);

        // 1. Parallel: ops-planner + all freelancer profiles
        const [plannerRes, freelancersRes] = await Promise.all([
          apiGet<{ data?: { owners: PlannerOwner[] } }>('/trello/ops-planner'),
          apiGet<FreelancerProfile[]>('/freelancers').catch(() => null),
        ]);

        const owner = plannerRes?.data?.owners.find((o) => o.owner.id === decodedId) ?? null;
        if (active) setPlanner(owner);

        // 2. Find freelancer profile — by user_id, fp.id, or email match via planner
        let fp = (freelancersRes ?? []).find(
          (f) => f.user_id === decodedId || f.id === decodedId,
        ) ?? null;

        // 3. Fallback: if id was a people.id (old card URL), match by planner owner email
        if (!fp && owner?.owner.email) {
          fp = (freelancersRes ?? []).find(
            (f) => f.email?.toLowerCase() === owner.owner.email!.toLowerCase(),
          ) ?? null;
        }

        // 4. Fallback: if still not found, try people directory to resolve email then match
        if (!fp && !owner) {
          const peopleRes = await apiGet<{ success: boolean; data: Array<{ id: string; display_name: string; avatar_url: string | null; identities: Array<{ type: string; value: string; primary: boolean }> | null }> }>('/people?internal=true&limit=200').catch(() => null);
          const person = (peopleRes?.data ?? []).find((p) => p.id === decodedId);
          if (person) {
            const email = person.identities?.find((i) => i.type === 'email' && i.primary)?.value
              ?? person.identities?.find((i) => i.type === 'email')?.value ?? null;
            if (email) {
              fp = (freelancersRes ?? []).find(
                (f) => f.email?.toLowerCase() === email.toLowerCase(),
              ) ?? null;
            }
            // If still no fp, set planner-like data from people record so at least name shows
            if (!fp && active) {
              setPlanner({
                owner: { id: decodedId, name: person.display_name, email, avatar_url: person.avatar_url },
                usage: 0, jobs: [], allocable_minutes: 960, committed_minutes: 0, tentative_minutes: 0,
              });
            }
          }
        }

        if (fp) {
          const statsRes = await apiGet<FreelancerStats>(`/freelancers/${fp.id}/stats`);
          if (active) setStats(statsRes);
        }
      } catch (err: any) {
        if (active) setError(err?.message || 'Erro ao carregar perfil');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [id]);

  // Merge data — prefer stats.profile, fall back to planner
  const profile = stats?.profile ?? null;
  const name = profile?.display_name ?? planner?.owner.name ?? '—';
  const avatarUrl = profile?.avatar_url ?? planner?.owner.avatar_url ?? null;
  const role = profile?.role_title ?? profile?.specialty ?? planner?.owner.email ?? '';
  const specialty = profile?.specialty ?? null;
  const freeMinutes = planner
    ? Math.max(0, planner.allocable_minutes - planner.committed_minutes - planner.tentative_minutes)
    : null;
  const usage = planner?.usage ?? 0;
  const state = ownerState(usage);
  const activeJobs = planner?.jobs ?? stats?.recentJobs?.filter((j) => !['done', 'published', 'archived'].includes(j.status)) ?? [];
  const pct = Math.min(100, Math.round(usage * 100));

  if (loading) {
    return (
      <AppShell title="Perfil">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}><CircularProgress /></Box>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell title="Perfil">
        <Alert severity="error">{error}</Alert>
      </AppShell>
    );
  }

  return (
    <AppShell title={name}>
      <Stack spacing={4}>

        {/* Back link */}
        <Box>
          <Button
            component={Link}
            href="/admin/pessoas"
            variant="text"
            startIcon={<IconArrowLeft size={16} />}
            sx={{ color: 'text.secondary', fontWeight: 700, fontSize: '0.78rem', textTransform: 'none', px: 0 }}
          >
            Pessoas
          </Button>
        </Box>

        {/* ── Hero: photo left + info right ── */}
        <Grid container spacing={3} alignItems="stretch">
          {/* Photo */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Box
              sx={{
                borderRadius: 4,
                overflow: 'hidden',
                height: { xs: 280, md: '100%' },
                minHeight: 340,
                bgcolor: alpha(theme.palette.primary.main, 0.06),
                position: 'relative',
              }}
            >
              <Avatar
                src={avatarUrl ?? undefined}
                sx={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  borderRadius: 0,
                  fontSize: '5rem',
                  fontWeight: 900,
                  bgcolor: alpha(theme.palette.primary.main, 0.12),
                  color: 'primary.main',
                }}
              >
                {initials(name)}
              </Avatar>
              {/* Status badge */}
              <Chip
                label={activeJobs.length > 0 ? state.label : 'Disponível'}
                sx={{
                  position: 'absolute',
                  bottom: 16,
                  left: 16,
                  bgcolor: alpha(activeJobs.length > 0 ? state.color : '#13DEB9', 0.88),
                  color: '#fff',
                  fontWeight: 800,
                  backdropFilter: 'blur(6px)',
                }}
              />
            </Box>
          </Grid>

          {/* Info column */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Stack spacing={2.5} sx={{ height: '100%' }}>

              {/* Quote / status bubble */}
              {specialty && (
                <Box
                  sx={{
                    borderRadius: 3,
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
                    p: 2,
                  }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="flex-start">
                    <Box
                      sx={{
                        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                        bgcolor: theme.palette.primary.main,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Typography sx={{ color: '#fff', fontSize: '1rem', lineHeight: 1 }}>"</Typography>
                    </Box>
                    <Typography variant="body2" sx={{ fontStyle: 'italic', lineHeight: 1.6 }}>
                      {specialty}
                    </Typography>
                  </Stack>
                </Box>
              )}

              {/* Profile card */}
              <Box
                sx={{
                  flex: 1,
                  borderRadius: 3,
                  border: `1px solid ${dark ? alpha('#fff', 0.08) : alpha('#000', 0.07)}`,
                  bgcolor: dark ? alpha('#fff', 0.02) : '#fff',
                  p: 2.5,
                }}
              >
                {/* Name + mini avatar */}
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                  <Avatar src={avatarUrl ?? undefined} sx={{ width: 44, height: 44, fontSize: '0.9rem', fontWeight: 800 }}>
                    {initials(name)}
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight={900} sx={{ lineHeight: 1.2 }}>{name}</Typography>
                    <Typography variant="caption" color="text.secondary">{role}</Typography>
                  </Box>
                  {expLabel(profile?.experience_level ?? null) && (
                    <Chip
                      label={expLabel(profile?.experience_level ?? null)}
                      size="small"
                      sx={{ ml: 'auto', fontWeight: 700, bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main' }}
                    />
                  )}
                </Stack>

                <Divider sx={{ mb: 2 }} />

                {/* Key details */}
                <Stack spacing={1}>
                  {profile?.email && (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <IconMail size={14} style={{ opacity: 0.5, flexShrink: 0 }} />
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                        {profile.email}
                      </Typography>
                    </Stack>
                  )}
                  {profile?.phone && (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <IconPhone size={14} style={{ opacity: 0.5, flexShrink: 0 }} />
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>{profile.phone}</Typography>
                    </Stack>
                  )}
                  {profile?.whatsapp_jid && (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <IconBrandWhatsapp size={14} style={{ opacity: 0.5, flexShrink: 0 }} />
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                        {profile.whatsapp_jid.replace(/@.*/, '')}
                      </Typography>
                    </Stack>
                  )}
                  {profile?.weekly_capacity_hours && (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <IconClock size={14} style={{ opacity: 0.5, flexShrink: 0 }} />
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                        {profile.weekly_capacity_hours}h/semana de capacidade
                      </Typography>
                    </Stack>
                  )}
                  {profile?.hourly_rate_brl && (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <IconStar size={14} style={{ opacity: 0.5, flexShrink: 0 }} />
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                        R$ {profile.hourly_rate_brl.toFixed(2)}/h
                      </Typography>
                    </Stack>
                  )}
                </Stack>

                {profile?.notes && (
                  <>
                    <Divider sx={{ my: 1.5 }} />
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.78rem', lineHeight: 1.6 }}>
                      {profile.notes}
                    </Typography>
                  </>
                )}
              </Box>
            </Stack>
          </Grid>
        </Grid>

        {/* ── Stats row ── */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <StatBox
            value={String(activeJobs.length)}
            label="Jobs ativos"
            color={activeJobs.length > 0 ? state.color : '#13DEB9'}
          />
          <StatBox
            value={freeMinutes !== null ? formatHours(freeMinutes) : '—'}
            label="Horas livres"
            sub="esta semana"
          />
          <StatBox
            value={`${pct}%`}
            label="Carga"
            color={state.color}
          />
          {stats?.monthlyTrend && stats.monthlyTrend.length > 0 && (
            <StatBox
              value={String(stats.monthlyTrend.reduce((s, t) => s + t.count, 0))}
              label="Jobs entregues"
              sub="últimos 6 meses"
              color="#5D87FF"
            />
          )}
        </Stack>

        {/* ── Bottom panels ── */}
        <Grid container spacing={3}>
          {/* Jobs ativos */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Box
              sx={{
                borderRadius: 3,
                border: `1px solid ${dark ? alpha('#fff', 0.07) : alpha('#000', 0.07)}`,
                bgcolor: dark ? alpha('#fff', 0.02) : '#fff',
                p: 2.5,
                height: '100%',
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={900}>Jobs ativos</Typography>
                <Button
                  component={Link}
                  href={`/admin/operacoes/jobs?owner_id=${encodeURIComponent(id)}`}
                  size="small"
                  variant="text"
                  endIcon={<IconArrowUpRight size={13} />}
                  sx={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'none' }}
                >
                  Ver todos
                </Button>
              </Stack>
              <Stack spacing={1.25}>
                {activeJobs.length === 0 ? (
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 3, opacity: 0.5 }}>
                    <IconCheck size={16} />
                    <Typography variant="body2" color="text.secondary">Nenhum job ativo no momento.</Typography>
                  </Stack>
                ) : activeJobs.slice(0, 8).map((job) => (
                  <Box
                    key={job.id}
                    sx={{
                      borderRadius: 2,
                      border: `1px solid ${dark ? alpha('#fff', 0.06) : alpha('#000', 0.06)}`,
                      bgcolor: dark ? alpha('#fff', 0.02) : alpha('#000', 0.01),
                      px: 1.5, py: 1.25,
                    }}
                  >
                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' }}>
                      {job.client_name || 'Sem cliente'}
                    </Typography>
                    <Typography variant="body2" fontWeight={700} sx={{ mt: 0.2, lineHeight: 1.3 }}>
                      {job.title}
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                      <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: statusColor(job.status), flexShrink: 0 }} />
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                        {job.status}
                      </Typography>
                      {job.deadline_at && (
                        <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
                          · {new Date(job.deadline_at).toLocaleDateString('pt-BR')}
                        </Typography>
                      )}
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </Box>
          </Grid>

          {/* Skills / Tools / Platforms */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Stack spacing={2.5} sx={{ height: '100%' }}>

              {/* Habilidades */}
              {(profile?.skills?.length || profile?.tools?.length || profile?.platform_expertise?.length) ? (
                <>
                  {profile?.skills?.length ? (
                    <Box
                      sx={{
                        borderRadius: 3,
                        border: `1px solid ${dark ? alpha('#fff', 0.07) : alpha('#000', 0.07)}`,
                        bgcolor: dark ? alpha('#fff', 0.02) : '#fff',
                        p: 2.5,
                      }}
                    >
                      <Typography variant="subtitle2" fontWeight={900} sx={{ mb: 1.25 }}>Habilidades</Typography>
                      <TagList items={profile.skills} color={theme.palette.primary.main} />
                    </Box>
                  ) : null}

                  {profile?.tools?.length ? (
                    <Box
                      sx={{
                        borderRadius: 3,
                        border: `1px solid ${dark ? alpha('#fff', 0.07) : alpha('#000', 0.07)}`,
                        bgcolor: dark ? alpha('#fff', 0.02) : '#fff',
                        p: 2.5,
                      }}
                    >
                      <Typography variant="subtitle2" fontWeight={900} sx={{ mb: 1.25 }}>Ferramentas</Typography>
                      <TagList items={profile.tools} color="#FFAE1F" />
                    </Box>
                  ) : null}

                  {profile?.platform_expertise?.length ? (
                    <Box
                      sx={{
                        borderRadius: 3,
                        border: `1px solid ${dark ? alpha('#fff', 0.07) : alpha('#000', 0.07)}`,
                        bgcolor: dark ? alpha('#fff', 0.02) : '#fff',
                        p: 2.5,
                      }}
                    >
                      <Typography variant="subtitle2" fontWeight={900} sx={{ mb: 1.25 }}>Plataformas</Typography>
                      <TagList items={profile.platform_expertise} color="#13DEB9" />
                    </Box>
                  ) : null}
                </>
              ) : (
                <Box
                  sx={{
                    flex: 1,
                    borderRadius: 3,
                    border: `1px dashed ${dark ? alpha('#fff', 0.1) : alpha('#000', 0.1)}`,
                    p: 2.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography variant="body2" color="text.disabled" sx={{ textAlign: 'center' }}>
                    Habilidades, ferramentas e plataformas<br />
                    podem ser adicionadas no perfil de equipe.
                  </Typography>
                </Box>
              )}

            </Stack>
          </Grid>
        </Grid>

      </Stack>
    </AppShell>
  );
}
