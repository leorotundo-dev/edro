'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import {
  IconArrowLeft,
  IconBolt,
  IconBrandInstagram,
  IconBrandLinkedin,
  IconBrandTiktok,
  IconBrandYoutube,
  IconBriefcase,
  IconCalendar,
  IconChartBar,
  IconCheck,
  IconClock,
  IconDeviceLaptop,
  IconEdit,
  IconFlame,
  IconLanguage,
  IconLink,
  IconRobot,
  IconStar,
  IconTarget,
  IconTool,
  IconTrendingUp,
  IconUserCheck,
  IconX,
} from '@tabler/icons-react';
import { apiGet } from '@/lib/api';

// ── Types ────────────────────────────────────────────────────────────────────

type FreelancerStats = {
  profile: {
    id: string;
    user_id: string;
    display_name: string;
    email: string;
    specialty: string | null;
    role_title: string | null;
    department: string | null;
    experience_level: 'junior' | 'mid' | 'senior' | null;
    skills: string[] | null;
    tools: string[] | null;
    ai_tools: string[] | null;
    platform_expertise: string[] | null;
    languages: string[] | null;
    punctuality_score: number | null;
    approval_rate: number | null;
    jobs_completed: number;
    jobs_late: number;
    jobs_revised: number;
    max_concurrent_jobs: number;
    weekly_capacity_hours: number | null;
    available_days: string[] | null;
    available_hours_start: string | null;
    available_hours_end: string | null;
    portfolio_url: string | null;
    unavailable_until: string | null;
    notes: string | null;
  };
  recentJobs: {
    id: string;
    title: string;
    status: string;
    job_type: string;
    complexity: string;
    priority_band: string;
    deadline_at: string | null;
    completed_at: string | null;
    estimated_minutes: number | null;
    actual_minutes: number | null;
    revision_count: number;
    client_name: string | null;
  }[];
  workload: {
    activeJobs: number;
    activeMinutes: number;
    weeklyCapacityMinutes: number;
  };
  monthlyTrend: { month: string; count: number; punctuality: number }[];
  timeAccuracy: {
    avgEstimated: number;
    avgActual: number;
    sampleCount: number;
    driftPercent: number;
  } | null;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  '#E85219', '#4570EA', '#13DEB9', '#7c3aed',
  '#f59e0b', '#10b981', '#3b82f6', '#ec4899',
];

function avatarColor(name: string) {
  const code = (name?.charCodeAt(0) ?? 0) + (name?.charCodeAt(1) ?? 0);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

function formatMins(mins: number) {
  if (!mins) return '0h';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

const LEVEL_CONFIG = {
  junior: { label: 'Júnior', short: 'JR', color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
  mid:    { label: 'Pleno',  short: 'PL', color: '#d97706', bg: 'rgba(217,119,6,0.12)' },
  senior: { label: 'Sênior', short: 'SR', color: '#4570EA', bg: 'rgba(69,112,234,0.12)' },
};

const DAY_LABELS: Record<string, string> = {
  mon: 'Seg', tue: 'Ter', wed: 'Qua', thu: 'Qui', fri: 'Sex', sat: 'Sáb', sun: 'Dom',
};
const ALL_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  intake:            { label: 'Entrada',    color: '#6b7280' },
  planned:           { label: 'Planejado',  color: '#6b7280' },
  ready:             { label: 'Pronto',     color: '#3b82f6' },
  allocated:         { label: 'Alocado',    color: '#8b5cf6' },
  in_progress:       { label: 'Em andamento', color: '#f59e0b' },
  in_review:         { label: 'Revisão',    color: '#f59e0b' },
  awaiting_approval: { label: 'Aprovação',  color: '#f59e0b' },
  approved:          { label: 'Aprovado',   color: '#10b981' },
  scheduled:         { label: 'Agendado',   color: '#10b981' },
  published:         { label: 'Publicado',  color: '#10b981' },
  done:              { label: 'Entregue',   color: '#13DEB9' },
  blocked:           { label: 'Bloqueado',  color: '#ef4444' },
};

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  instagram: <IconBrandInstagram size={14} />,
  tiktok:    <IconBrandTiktok size={14} />,
  linkedin:  <IconBrandLinkedin size={14} />,
  youtube:   <IconBrandYoutube size={14} />,
};

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  label, value, unit, color, icon, sub,
}: {
  label: string;
  value: string | number;
  unit?: string;
  color: string;
  icon: React.ReactNode;
  sub?: string;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2.5,
        borderRadius: 3,
        borderColor: alpha(color, 0.25),
        bgcolor: alpha(color, 0.04),
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background glow */}
      <Box sx={{
        position: 'absolute', top: -20, right: -20,
        width: 80, height: 80, borderRadius: '50%',
        bgcolor: alpha(color, 0.12),
        filter: 'blur(20px)',
      }} />
      <Stack spacing={0.5}>
        <Stack direction="row" alignItems="center" spacing={0.75}>
          <Box sx={{ color, opacity: 0.8 }}>{icon}</Box>
          <Typography variant="caption" fontWeight={700} sx={{ color: alpha(color, 0.8), textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.65rem' }}>
            {label}
          </Typography>
        </Stack>
        <Stack direction="row" alignItems="baseline" spacing={0.5}>
          <Typography sx={{ fontSize: '2.6rem', fontWeight: 900, lineHeight: 1, color }}>
            {value}
          </Typography>
          {unit && (
            <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: alpha(color, 0.7) }}>
              {unit}
            </Typography>
          )}
        </Stack>
        {sub && (
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
            {sub}
          </Typography>
        )}
      </Stack>
    </Paper>
  );
}

function ScoreRing({ value, color, size = 88 }: { value: number; color: string; size?: number }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <Box sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={alpha(color, 0.12)} strokeWidth={8} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <Typography sx={{ fontSize: size > 80 ? '1.4rem' : '1rem', fontWeight: 900, lineHeight: 1, color }}>
          {value}
        </Typography>
        <Typography sx={{ fontSize: '0.55rem', fontWeight: 700, color: alpha(color, 0.7), textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          score
        </Typography>
      </Box>
    </Box>
  );
}

function MiniBarChart({ data }: { data: { month: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <Stack direction="row" spacing={0.5} alignItems="flex-end" sx={{ height: 48 }}>
      {data.map((d) => (
        <Tooltip key={d.month} title={`${d.month}: ${d.count} jobs`}>
          <Stack spacing={0.25} alignItems="center" sx={{ flex: 1 }}>
            <Box sx={{
              width: '100%', borderRadius: '3px 3px 0 0',
              height: `${Math.max(4, (d.count / max) * 44)}px`,
              bgcolor: '#4570EA',
              transition: 'height 0.5s ease',
              opacity: 0.8,
            }} />
            <Typography sx={{ fontSize: '0.55rem', color: 'text.disabled', whiteSpace: 'nowrap' }}>
              {d.month.slice(5)}
            </Typography>
          </Stack>
        </Tooltip>
      ))}
    </Stack>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function FreelancerProfileClient({ id }: { id: string }) {
  const router = useRouter();
  const [data, setData] = useState<FreelancerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<FreelancerStats>(`/freelancers/${id}/stats`)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <AppShell title="Perfil">
        <Stack alignItems="center" justifyContent="center" sx={{ minHeight: '60vh' }}>
          <CircularProgress />
        </Stack>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell title="Perfil">
        <Stack alignItems="center" justifyContent="center" sx={{ minHeight: '60vh' }}>
          <Typography color="text.secondary">Freelancer não encontrado.</Typography>
          <Button onClick={() => router.back()} sx={{ mt: 2 }}>Voltar</Button>
        </Stack>
      </AppShell>
    );
  }

  const { profile, recentJobs, workload, monthlyTrend, timeAccuracy } = data;
  const levelCfg = profile.experience_level ? LEVEL_CONFIG[profile.experience_level] : null;
  const color = avatarColor(profile.display_name);

  const punctuality = Math.round(profile.punctuality_score ?? 0);
  const approval = Math.round(profile.approval_rate ?? 0);
  const overallScore = profile.punctuality_score != null && profile.approval_rate != null
    ? Math.round((punctuality * 0.5 + approval * 0.5))
    : null;
  const scoreColor = overallScore == null ? '#6b7280'
    : overallScore >= 85 ? '#13DEB9'
    : overallScore >= 65 ? '#f59e0b'
    : '#ef4444';

  const capUsedPct = workload.weeklyCapacityMinutes > 0
    ? Math.round((workload.activeMinutes / workload.weeklyCapacityMinutes) * 100)
    : 0;
  const capColor = capUsedPct >= 90 ? '#ef4444' : capUsedPct >= 70 ? '#f59e0b' : '#13DEB9';

  const isUnavailable = profile.unavailable_until && new Date(profile.unavailable_until) >= new Date();

  return (
    <AppShell title={profile.display_name}>
      <Box sx={{ maxWidth: 960, mx: 'auto', px: { xs: 2, md: 3 }, py: 3 }}>

        {/* Back */}
        <Button
          startIcon={<IconArrowLeft size={16} />}
          onClick={() => router.push('/admin/equipe')}
          sx={{ mb: 2.5, color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
        >
          Equipe
        </Button>

        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        <Paper
          variant="outlined"
          sx={{
            p: { xs: 2.5, md: 3.5 },
            borderRadius: 4,
            mb: 3,
            background: `linear-gradient(135deg, ${alpha(color, 0.06)} 0%, transparent 60%)`,
            borderColor: alpha(color, 0.2),
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Decorative blobs */}
          <Box sx={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', bgcolor: alpha(color, 0.07), filter: 'blur(40px)', pointerEvents: 'none' }} />
          <Box sx={{ position: 'absolute', bottom: -30, left: 80, width: 150, height: 150, borderRadius: '50%', bgcolor: alpha('#4570EA', 0.06), filter: 'blur(30px)', pointerEvents: 'none' }} />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems={{ xs: 'center', sm: 'flex-start' }}>
            {/* Avatar + level */}
            <Box sx={{ position: 'relative', flexShrink: 0 }}>
              <Avatar
                sx={{
                  width: 96, height: 96,
                  bgcolor: color,
                  fontSize: '2rem', fontWeight: 900,
                  border: `3px solid ${alpha(color, 0.4)}`,
                  boxShadow: `0 0 0 6px ${alpha(color, 0.12)}`,
                }}
              >
                {initials(profile.display_name)}
              </Avatar>
              {levelCfg && (
                <Box sx={{
                  position: 'absolute', bottom: -4, right: -4,
                  px: 0.75, py: 0.25, borderRadius: 1.5,
                  bgcolor: levelCfg.bg, border: `1.5px solid ${alpha(levelCfg.color, 0.4)}`,
                }}>
                  <Typography sx={{ fontSize: '0.65rem', fontWeight: 900, color: levelCfg.color, letterSpacing: '0.05em' }}>
                    {levelCfg.short}
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Name + meta */}
            <Box sx={{ flex: 1, minWidth: 0, textAlign: { xs: 'center', sm: 'left' } }}>
              <Stack direction="row" alignItems="center" spacing={1.5} justifyContent={{ xs: 'center', sm: 'flex-start' }} flexWrap="wrap">
                <Typography variant="h4" fontWeight={900} sx={{ lineHeight: 1.1 }}>
                  {profile.display_name}
                </Typography>
                {isUnavailable && (
                  <Chip
                    size="small"
                    icon={<IconX size={11} />}
                    label={`Indisponível até ${new Date(profile.unavailable_until!).toLocaleDateString('pt-BR')}`}
                    sx={{ bgcolor: 'rgba(239,68,68,0.1)', color: '#dc2626', borderColor: 'rgba(239,68,68,0.3)', fontWeight: 700, fontSize: '0.7rem', border: '1px solid' }}
                  />
                )}
              </Stack>
              <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
                {[profile.role_title, profile.department, profile.specialty].filter(Boolean).join(' · ') || profile.email}
              </Typography>
              {levelCfg && (
                <Chip
                  size="small"
                  label={levelCfg.label}
                  sx={{ mt: 1, fontWeight: 700, bgcolor: levelCfg.bg, color: levelCfg.color, fontSize: '0.72rem' }}
                />
              )}
              {profile.notes && (
                <Typography variant="body2" color="text.disabled" sx={{ mt: 1, fontStyle: 'italic', maxWidth: 480 }}>
                  "{profile.notes}"
                </Typography>
              )}
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap>
                {profile.portfolio_url && (
                  <Button size="small" startIcon={<IconLink size={13} />} href={profile.portfolio_url} target="_blank"
                    sx={{ fontSize: '0.7rem', py: 0.25 }}>
                    Portfólio
                  </Button>
                )}
                <Button
                  size="small"
                  startIcon={<IconBriefcase size={13} />}
                  onClick={() => router.push(`/admin/operacoes/jobs?owner_id=${profile.user_id}`)}
                  sx={{ fontSize: '0.7rem', py: 0.25 }}
                >
                  Ver demandas
                </Button>
                <Button size="small" startIcon={<IconEdit size={13} />}
                  onClick={() => router.push('/admin/equipe')}
                  sx={{ fontSize: '0.7rem', py: 0.25 }}>
                  Editar
                </Button>
              </Stack>
            </Box>

            {/* Overall score ring */}
            {overallScore !== null && (
              <Stack alignItems="center" spacing={0.5} sx={{ flexShrink: 0 }}>
                <ScoreRing value={overallScore} color={scoreColor} size={96} />
                <Typography variant="caption" fontWeight={700} sx={{ color: 'text.secondary', fontSize: '0.65rem', textTransform: 'uppercase' }}>
                  Performance
                </Typography>
              </Stack>
            )}
          </Stack>
        </Paper>

        {/* ── BIG NUMBERS ──────────────────────────────────────────────────── */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 6, sm: 3 }}>
            <StatCard
              label="Jobs entregues"
              value={profile.jobs_completed}
              color="#4570EA"
              icon={<IconBriefcase size={16} />}
              sub={profile.jobs_late > 0 ? `${profile.jobs_late} com atraso` : 'Sem atrasos'}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <StatCard
              label="Pontualidade"
              value={profile.punctuality_score != null ? punctuality : '—'}
              unit={profile.punctuality_score != null ? '%' : undefined}
              color={punctuality >= 85 ? '#13DEB9' : punctuality >= 65 ? '#f59e0b' : '#ef4444'}
              icon={<IconClock size={16} />}
              sub={`${profile.jobs_late} entregues com atraso`}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <StatCard
              label="Taxa aprovação"
              value={profile.approval_rate != null ? approval : '—'}
              unit={profile.approval_rate != null ? '%' : undefined}
              color={approval >= 85 ? '#13DEB9' : approval >= 65 ? '#f59e0b' : '#ef4444'}
              icon={<IconUserCheck size={16} />}
              sub={`${profile.jobs_revised} precisaram de revisão`}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <StatCard
              label="Jobs ativos"
              value={`${workload.activeJobs}/${profile.max_concurrent_jobs}`}
              color={capColor}
              icon={<IconFlame size={16} />}
              sub={`${capUsedPct}% da capacidade usada`}
            />
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          {/* ── LEFT COLUMN ──────────────────────────────────────────────── */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Stack spacing={3}>

              {/* Capacidade semanal */}
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                  <IconTarget size={16} color="#4570EA" />
                  <Typography variant="subtitle2" fontWeight={800}>Capacidade semanal</Typography>
                </Stack>
                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      {formatMins(workload.activeMinutes)} em andamento
                    </Typography>
                    <Typography variant="body2" fontWeight={700} sx={{ color: capColor }}>
                      {capUsedPct}% usado
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, capUsedPct)}
                    sx={{
                      height: 10, borderRadius: 5,
                      bgcolor: alpha(capColor, 0.12),
                      '& .MuiLinearProgress-bar': { bgcolor: capColor, borderRadius: 5 },
                    }}
                  />
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption" color="text.disabled">0h</Typography>
                    <Typography variant="caption" color="text.disabled">
                      {profile.weekly_capacity_hours ?? 20}h/semana
                    </Typography>
                  </Stack>
                </Stack>

                {/* Availability days */}
                <Divider sx={{ my: 2 }} />
                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  Dias disponíveis
                </Typography>
                <Stack direction="row" spacing={0.75}>
                  {ALL_DAYS.map((d) => {
                    const active = profile.available_days?.includes(d) ?? true;
                    return (
                      <Box key={d} sx={{
                        width: 32, height: 32, borderRadius: 1.5,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        bgcolor: active ? alpha('#4570EA', 0.12) : 'action.hover',
                        border: `1.5px solid ${active ? alpha('#4570EA', 0.35) : 'transparent'}`,
                        transition: 'all 0.2s',
                      }}>
                        <Typography sx={{ fontSize: '0.6rem', fontWeight: active ? 800 : 500, color: active ? '#4570EA' : 'text.disabled' }}>
                          {DAY_LABELS[d]}
                        </Typography>
                      </Box>
                    );
                  })}
                </Stack>
                {(profile.available_hours_start || profile.available_hours_end) && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Horário: {profile.available_hours_start ?? '?'} às {profile.available_hours_end ?? '?'}
                  </Typography>
                )}
              </Paper>

              {/* Precisão de estimativas */}
              {timeAccuracy && (
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                    <IconTrendingUp size={16} color="#f59e0b" />
                    <Typography variant="subtitle2" fontWeight={800}>Precisão de estimativas</Typography>
                    <Chip size="small" label={`${timeAccuracy.sampleCount} jobs`} sx={{ ml: 'auto', fontSize: '0.65rem', height: 18 }} />
                  </Stack>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6 }}>
                      <Box sx={{ textAlign: 'center', p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
                        <Typography sx={{ fontSize: '1.6rem', fontWeight: 900, color: '#6b7280' }}>
                          {formatMins(timeAccuracy.avgEstimated)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" fontWeight={700}>Estimado</Typography>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Box sx={{ textAlign: 'center', p: 1.5, borderRadius: 2, bgcolor: timeAccuracy.driftPercent > 20 ? 'rgba(239,68,68,0.06)' : 'rgba(19,222,185,0.06)' }}>
                        <Typography sx={{ fontSize: '1.6rem', fontWeight: 900, color: timeAccuracy.driftPercent > 20 ? '#ef4444' : '#13DEB9' }}>
                          {formatMins(timeAccuracy.avgActual)}
                        </Typography>
                        <Typography variant="caption" fontWeight={700} sx={{ color: timeAccuracy.driftPercent > 20 ? '#ef4444' : '#13DEB9' }}>
                          Real {timeAccuracy.driftPercent > 0 ? `+${timeAccuracy.driftPercent}%` : `${timeAccuracy.driftPercent}%`}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>
              )}

              {/* Jobs recentes */}
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                  <IconChartBar size={16} color="#4570EA" />
                  <Typography variant="subtitle2" fontWeight={800}>Jobs recentes</Typography>
                </Stack>
                <Stack spacing={1}>
                  {recentJobs.slice(0, 10).map((job) => {
                    const sc = STATUS_CONFIG[job.status] ?? { label: job.status, color: '#6b7280' };
                    const isLate = job.deadline_at && job.completed_at && new Date(job.completed_at) > new Date(job.deadline_at);
                    return (
                      <Box key={job.id} sx={{
                        p: 1.25, borderRadius: 2,
                        border: '1px solid', borderColor: 'divider',
                        '&:hover': { borderColor: alpha('#4570EA', 0.3), bgcolor: alpha('#4570EA', 0.02) },
                        transition: 'all 0.15s',
                      }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: sc.color, flexShrink: 0 }} />
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" fontWeight={700} noWrap>{job.title}</Typography>
                            <Typography variant="caption" color="text.secondary" noWrap>
                              {job.client_name ?? 'Sem cliente'} · {sc.label}
                            </Typography>
                          </Box>
                          <Stack direction="row" spacing={0.5} alignItems="center" flexShrink={0}>
                            {job.revision_count > 0 && (
                              <Chip size="small" label={`${job.revision_count}× revisão`}
                                sx={{ height: 16, fontSize: '0.58rem', bgcolor: 'rgba(245,158,11,0.1)', color: '#d97706' }} />
                            )}
                            {isLate && (
                              <Chip size="small" label="Atrasado"
                                sx={{ height: 16, fontSize: '0.58rem', bgcolor: 'rgba(239,68,68,0.1)', color: '#dc2626' }} />
                            )}
                            {job.actual_minutes && (
                              <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
                                {formatMins(job.actual_minutes)}
                              </Typography>
                            )}
                          </Stack>
                        </Stack>
                      </Box>
                    );
                  })}
                  {recentJobs.length === 0 && (
                    <Typography variant="body2" color="text.disabled" sx={{ textAlign: 'center', py: 2 }}>
                      Nenhum job ainda.
                    </Typography>
                  )}
                </Stack>
              </Paper>

            </Stack>
          </Grid>

          {/* ── RIGHT COLUMN ─────────────────────────────────────────────── */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Stack spacing={3}>

              {/* Score breakdown */}
              {(profile.punctuality_score != null || profile.approval_rate != null) && (
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                    <IconStar size={16} color="#f59e0b" />
                    <Typography variant="subtitle2" fontWeight={800}>Métricas de performance</Typography>
                  </Stack>
                  <Stack spacing={1.75}>
                    {profile.punctuality_score != null && (
                      <Box>
                        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                          <Typography variant="caption" fontWeight={700}>Pontualidade</Typography>
                          <Typography variant="caption" fontWeight={900} sx={{ color: punctuality >= 85 ? '#13DEB9' : '#f59e0b' }}>{punctuality}%</Typography>
                        </Stack>
                        <LinearProgress variant="determinate" value={punctuality}
                          sx={{ height: 8, borderRadius: 4,
                            bgcolor: alpha(punctuality >= 85 ? '#13DEB9' : '#f59e0b', 0.12),
                            '& .MuiLinearProgress-bar': { bgcolor: punctuality >= 85 ? '#13DEB9' : punctuality >= 65 ? '#f59e0b' : '#ef4444', borderRadius: 4 } }} />
                      </Box>
                    )}
                    {profile.approval_rate != null && (
                      <Box>
                        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                          <Typography variant="caption" fontWeight={700}>Taxa de aprovação</Typography>
                          <Typography variant="caption" fontWeight={900} sx={{ color: approval >= 85 ? '#13DEB9' : '#f59e0b' }}>{approval}%</Typography>
                        </Stack>
                        <LinearProgress variant="determinate" value={approval}
                          sx={{ height: 8, borderRadius: 4,
                            bgcolor: alpha(approval >= 85 ? '#13DEB9' : '#f59e0b', 0.12),
                            '& .MuiLinearProgress-bar': { bgcolor: approval >= 85 ? '#13DEB9' : approval >= 65 ? '#f59e0b' : '#ef4444', borderRadius: 4 } }} />
                      </Box>
                    )}
                  </Stack>
                </Paper>
              )}

              {/* Monthly trend */}
              {monthlyTrend.length > 0 && (
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                    <IconTrendingUp size={16} color="#4570EA" />
                    <Typography variant="subtitle2" fontWeight={800}>Jobs por mês</Typography>
                  </Stack>
                  <MiniBarChart data={monthlyTrend} />
                </Paper>
              )}

              {/* Skills */}
              {(profile.skills?.length ?? 0) > 0 && (
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                    <IconBolt size={16} color="#E85219" />
                    <Typography variant="subtitle2" fontWeight={800}>Skills</Typography>
                  </Stack>
                  <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                    {profile.skills!.map((s) => (
                      <Chip key={s} label={s} size="small"
                        sx={{ height: 24, fontSize: '0.72rem', fontWeight: 700,
                          bgcolor: alpha('#E85219', 0.1), color: '#E85219', border: `1px solid ${alpha('#E85219', 0.25)}` }} />
                    ))}
                  </Stack>
                </Paper>
              )}

              {/* Tools + AI Tools */}
              {((profile.tools?.length ?? 0) > 0 || (profile.ai_tools?.length ?? 0) > 0) && (
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
                  {(profile.tools?.length ?? 0) > 0 && (
                    <>
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.25 }}>
                        <IconTool size={15} color="#6b7280" />
                        <Typography variant="caption" fontWeight={800} color="text.secondary">FERRAMENTAS</Typography>
                      </Stack>
                      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
                        {profile.tools!.map((t) => (
                          <Chip key={t} label={t} size="small" variant="outlined"
                            sx={{ height: 22, fontSize: '0.68rem', fontWeight: 600 }} />
                        ))}
                      </Stack>
                    </>
                  )}
                  {(profile.ai_tools?.length ?? 0) > 0 && (
                    <>
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.25 }}>
                        <IconRobot size={15} color="#8b5cf6" />
                        <Typography variant="caption" fontWeight={800} sx={{ color: '#8b5cf6' }}>IAs</Typography>
                      </Stack>
                      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                        {profile.ai_tools!.map((t) => (
                          <Chip key={t} label={t} size="small"
                            sx={{ height: 22, fontSize: '0.68rem', fontWeight: 700,
                              bgcolor: alpha('#8b5cf6', 0.1), color: '#8b5cf6', border: `1px solid ${alpha('#8b5cf6', 0.25)}` }} />
                        ))}
                      </Stack>
                    </>
                  )}
                </Paper>
              )}

              {/* Platforms + Languages */}
              {((profile.platform_expertise?.length ?? 0) > 0 || (profile.languages?.length ?? 0) > 0) && (
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
                  {(profile.platform_expertise?.length ?? 0) > 0 && (
                    <>
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.25 }}>
                        <IconDeviceLaptop size={15} color="#3b82f6" />
                        <Typography variant="caption" fontWeight={800} sx={{ color: '#3b82f6' }}>PLATAFORMAS</Typography>
                      </Stack>
                      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
                        {profile.platform_expertise!.map((p) => {
                          const platformIcon = PLATFORM_ICONS[p] as React.ReactElement | undefined;
                          return (
                            <Chip key={p} icon={platformIcon} label={p} size="small"
                              sx={{ height: 24, fontSize: '0.68rem', fontWeight: 700, textTransform: 'capitalize',
                                bgcolor: alpha('#3b82f6', 0.1), color: '#3b82f6', border: `1px solid ${alpha('#3b82f6', 0.25)}` }} />
                          );
                        })}
                      </Stack>
                    </>
                  )}
                  {(profile.languages?.length ?? 0) > 0 && (
                    <>
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.25 }}>
                        <IconLanguage size={15} color="#10b981" />
                        <Typography variant="caption" fontWeight={800} sx={{ color: '#10b981' }}>IDIOMAS</Typography>
                      </Stack>
                      <Stack direction="row" spacing={0.75}>
                        {profile.languages!.map((l) => (
                          <Chip key={l} label={l.toUpperCase()} size="small"
                            sx={{ height: 24, fontSize: '0.72rem', fontWeight: 900,
                              bgcolor: alpha('#10b981', 0.1), color: '#10b981', border: `1px solid ${alpha('#10b981', 0.25)}` }} />
                        ))}
                      </Stack>
                    </>
                  )}
                </Paper>
              )}

            </Stack>
          </Grid>
        </Grid>
      </Box>
    </AppShell>
  );
}
