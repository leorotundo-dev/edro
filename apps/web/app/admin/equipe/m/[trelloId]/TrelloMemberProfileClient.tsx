'use client';

import { useEffect, useState } from 'react';
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
  IconBriefcase,
  IconCheck,
  IconClock,
  IconAlertTriangle,
  IconCircleCheck,
  IconChecklist,
  IconBolt,
  IconFlame,
  IconChartBar,
  IconRobot,
  IconExternalLink,
} from '@tabler/icons-react';
import { apiGet } from '@/lib/api';

// ── Types ────────────────────────────────────────────────────────────────────

type TrelloCard = {
  id: string;
  title: string;
  due_date: string | null;
  updated_at?: string;
  board_name: string;
  list_name: string | null;
  labels: Array<{ name: string; color: string }> | null;
};

type BoardEntry = {
  board_id: string;
  board_name: string;
  active_count: number;
};

type MemberProfile = {
  member: {
    display_name: string;
    email: string | null;
    avatar_url: string | null;
    trello_member_id: string;
    freelancer_id: string | null;
    specialty: string | null;
    role_title: string | null;
    experience_level: 'junior' | 'mid' | 'senior' | null;
    skills: string[] | null;
    ai_tools: string[] | null;
    portfolio_url: string | null;
  };
  activeCards: TrelloCard[];
  completedCards: TrelloCard[];
  boards: BoardEntry[];
  metrics: {
    score: number;
    active_cards: number;
    completed_month: number;
    sla_rate: number | null;
    total_done_60d: number;
  };
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

function scoreColor(s: number) {
  return s >= 85 ? '#13DEB9' : s >= 65 ? '#f59e0b' : '#ef4444';
}

function scoreLabel(s: number) {
  return s >= 85 ? 'Excelente' : s >= 65 ? 'Regular' : 'Atenção';
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function isOverdue(due_date: string | null) {
  if (!due_date) return false;
  return new Date(due_date) < new Date();
}

const TRELLO_LABEL_COLORS: Record<string, string> = {
  green: '#13DEB9', yellow: '#f59e0b', orange: '#E85219', red: '#ef4444',
  purple: '#7c3aed', blue: '#4570EA', sky: '#0ea5e9', lime: '#84cc16',
  pink: '#ec4899', black: '#374151',
};

const LEVEL_CONFIG = {
  junior: { label: 'Júnior', color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
  mid:    { label: 'Pleno',  color: '#d97706', bg: 'rgba(217,119,6,0.12)' },
  senior: { label: 'Sênior', color: '#4570EA', bg: 'rgba(69,112,234,0.12)' },
};

function CardRow({ card, done }: { card: TrelloCard; done: boolean }) {
  const overdue = !done && isOverdue(card.due_date);
  const labels: Array<{ name: string; color: string }> = Array.isArray(card.labels) ? card.labels : [];

  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1.5}
      sx={{
        px: 1.5, py: 1.25,
        borderRadius: 2,
        bgcolor: overdue ? 'rgba(239,68,68,0.05)' : done ? 'rgba(19,222,185,0.04)' : 'transparent',
        border: '1px solid',
        borderColor: overdue ? 'rgba(239,68,68,0.2)' : done ? 'rgba(19,222,185,0.15)' : 'divider',
        '&:hover': { bgcolor: overdue ? 'rgba(239,68,68,0.08)' : done ? 'rgba(19,222,185,0.08)' : 'action.hover' },
      }}
    >
      <Box sx={{ flexShrink: 0, color: done ? '#13DEB9' : overdue ? '#ef4444' : '#9ca3af' }}>
        {done ? <IconCircleCheck size={16} /> : overdue ? <IconAlertTriangle size={16} /> : <IconClock size={16} />}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" fontWeight={600} noWrap sx={{ fontSize: '0.8rem' }}>
          {card.title}
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center" mt={0.25} flexWrap="wrap">
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>
            {card.board_name}
            {card.list_name && ` › ${card.list_name}`}
          </Typography>
          {labels.slice(0, 3).map((l, i) => (
            <Box key={i} sx={{
              px: 0.75, py: 0.1, borderRadius: 99, fontSize: '0.6rem', fontWeight: 700,
              bgcolor: alpha(TRELLO_LABEL_COLORS[l.color] ?? '#6b7280', 0.15),
              color: TRELLO_LABEL_COLORS[l.color] ?? '#6b7280',
            }}>
              {l.name}
            </Box>
          ))}
        </Stack>
      </Box>
      <Typography variant="caption" color={overdue ? 'error' : 'text.secondary'}
        sx={{ flexShrink: 0, fontSize: '0.68rem', fontWeight: overdue ? 700 : 400 }}>
        {done ? formatDate(card.updated_at) : formatDate(card.due_date)}
      </Typography>
    </Stack>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function TrelloMemberProfileClient({ trelloId }: { trelloId: string }) {
  const router = useRouter();
  const [data, setData] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<MemberProfile>(`/trello/member-profile/${trelloId}`)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [trelloId]);

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
        <Stack alignItems="center" justifyContent="center" sx={{ minHeight: '60vh' }} spacing={1}>
          <Typography color="text.secondary">Colaborador não encontrado.</Typography>
          <Button onClick={() => router.push('/admin/equipe')}>Voltar para Equipe</Button>
        </Stack>
      </AppShell>
    );
  }

  const { member, activeCards, completedCards, boards, metrics } = data;
  const color = avatarColor(member.display_name);
  const sc = scoreColor(metrics.score);
  const levelCfg = member.experience_level ? LEVEL_CONFIG[member.experience_level] : null;

  // Trello avatar URL: append /170.png for medium size
  const avatarSrc = member.avatar_url ? `${member.avatar_url}/170.png` : undefined;

  const r = 34;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - metrics.score / 100);

  return (
    <AppShell title={member.display_name}>
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
            borderRadius: 4, mb: 3,
            background: `linear-gradient(135deg, ${alpha(color, 0.08)} 0%, transparent 55%)`,
            borderColor: alpha(color, 0.22),
            position: 'relative', overflow: 'hidden',
          }}
        >
          {/* Cover strip */}
          <Box sx={{
            height: 80,
            background: `linear-gradient(120deg, ${alpha(color, 0.25)} 0%, ${alpha('#4570EA', 0.15)} 100%)`,
          }} />

          {/* Decorative blob */}
          <Box sx={{ position: 'absolute', top: -20, right: -40, width: 200, height: 200, borderRadius: '50%', bgcolor: alpha(color, 0.08), filter: 'blur(40px)', pointerEvents: 'none' }} />

          <Box sx={{ px: { xs: 2.5, md: 3.5 }, pb: 3 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} alignItems={{ xs: 'flex-start', sm: 'flex-end' }} sx={{ mt: -4, mb: 2 }}>
              {/* Avatar — elevated over cover strip */}
              <Avatar
                src={avatarSrc}
                sx={{
                  width: 88, height: 88, fontSize: '1.8rem', fontWeight: 900,
                  bgcolor: color,
                  border: '4px solid', borderColor: 'background.paper',
                  boxShadow: `0 0 0 3px ${alpha(color, 0.25)}`,
                  flexShrink: 0,
                }}
              >
                {initials(member.display_name)}
              </Avatar>

              {/* Name block */}
              <Box sx={{ flex: 1, minWidth: 0, pb: 0.5 }}>
                <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap">
                  <Typography variant="h5" fontWeight={900} sx={{ lineHeight: 1.15 }}>
                    {member.display_name}
                  </Typography>
                  <Chip
                    size="small"
                    icon={<IconChecklist size={12} />}
                    label={scoreLabel(metrics.score)}
                    sx={{ height: 22, fontSize: '0.7rem', fontWeight: 700, bgcolor: alpha(sc, 0.12), color: sc }}
                  />
                  {levelCfg && (
                    <Chip size="small" label={levelCfg.label}
                      sx={{ height: 22, fontSize: '0.7rem', fontWeight: 700, bgcolor: levelCfg.bg, color: levelCfg.color }} />
                  )}
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {[member.role_title, member.specialty].filter(Boolean).join(' · ') || member.email || 'Colaborador Trello'}
                </Typography>
                <Stack direction="row" spacing={1} mt={1} flexWrap="wrap" useFlexGap>
                  {member.portfolio_url && (
                    <Button size="small" startIcon={<IconExternalLink size={13} />}
                      href={member.portfolio_url} target="_blank" rel="noopener noreferrer"
                      sx={{ fontSize: '0.7rem', py: 0.25 }}>
                      Portfólio
                    </Button>
                  )}
                  {member.freelancer_id && (
                    <Button size="small" startIcon={<IconBriefcase size={13} />}
                      onClick={() => router.push(`/admin/equipe/${member.freelancer_id}`)}
                      sx={{ fontSize: '0.7rem', py: 0.25 }}>
                      Perfil completo
                    </Button>
                  )}
                </Stack>
              </Box>

              {/* Score ring */}
              <Box sx={{ textAlign: 'center', flexShrink: 0, pb: 0.5 }}>
                <Box sx={{ position: 'relative', width: 80, height: 80 }}>
                  <Box component="svg" width={80} height={80} sx={{ transform: 'rotate(-90deg)' }}>
                    <circle cx={40} cy={40} r={r} fill="none" stroke={alpha(sc, 0.12)} strokeWidth={7} />
                    <Box
                      component="circle" cx={40} cy={40} r={r}
                      fill="none" stroke={sc} strokeWidth={7}
                      strokeDasharray={circ}
                      strokeDashoffset={offset}
                      strokeLinecap="round"
                      sx={{ transition: 'stroke-dashoffset 1s ease' }}
                    />
                  </Box>
                  <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                    <Typography sx={{ fontSize: '1.4rem', fontWeight: 900, lineHeight: 1, color: sc }}>{metrics.score}</Typography>
                    <Typography sx={{ fontSize: '0.5rem', fontWeight: 700, color: alpha(sc, 0.7), textTransform: 'uppercase', letterSpacing: '0.06em' }}>score</Typography>
                  </Box>
                </Box>
              </Box>
            </Stack>

            {/* SLA bar */}
            {metrics.sla_rate !== null && (
              <Box>
                <Stack direction="row" justifyContent="space-between" mb={0.5}>
                  <Typography variant="caption" color="text.secondary">SLA (entregas no prazo)</Typography>
                  <Typography variant="caption" fontWeight={700} sx={{ color: sc }}>{metrics.sla_rate}%</Typography>
                </Stack>
                <LinearProgress
                  variant="determinate" value={metrics.sla_rate}
                  sx={{ height: 5, borderRadius: 99, bgcolor: alpha(sc, 0.12), '& .MuiLinearProgress-bar': { bgcolor: sc, borderRadius: 99 } }}
                />
              </Box>
            )}
          </Box>
        </Paper>

        {/* ── MÉTRICAS ─────────────────────────────────────────────────────── */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Jobs ativos', value: metrics.active_cards, icon: <IconBriefcase size={18} />, color: '#4570EA' },
            { label: 'Entregues este mês', value: metrics.completed_month, icon: <IconFlame size={18} />, color: '#E85219' },
            { label: 'Entregues (60d)', value: metrics.total_done_60d, icon: <IconCheck size={18} />, color: '#13DEB9' },
            { label: 'SLA', value: metrics.sla_rate !== null ? `${metrics.sla_rate}%` : '—', icon: <IconChartBar size={18} />, color: sc },
          ].map((m) => (
            <Grid key={m.label} size={{ xs: 6, sm: 3 }}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, borderColor: alpha(m.color, 0.2), height: '100%' }}>
                <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                  <Box sx={{ color: m.color }}>{m.icon}</Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>{m.label}</Typography>
                </Stack>
                <Typography sx={{ fontSize: '1.8rem', fontWeight: 900, lineHeight: 1, color: m.color }}>
                  {m.value}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={3}>
          {/* ── LEFT: Cards ──────────────────────────────────────────────── */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Stack spacing={2.5}>

              {/* Jobs ativos */}
              <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
                <Stack direction="row" alignItems="center" sx={{ px: 2.5, py: 1.75, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ flex: 1 }}>
                    Jobs Ativos
                    {activeCards.length > 0 && (
                      <Box component="span" sx={{ ml: 1, px: 0.75, py: 0.1, borderRadius: 99, fontSize: '0.65rem', fontWeight: 800, bgcolor: 'rgba(69,112,234,0.12)', color: '#4570EA' }}>
                        {activeCards.length}
                      </Box>
                    )}
                  </Typography>
                </Stack>
                <Stack spacing={0.75} sx={{ p: 2 }}>
                  {activeCards.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                      Nenhum job ativo no momento.
                    </Typography>
                  ) : (
                    activeCards.map((card) => <CardRow key={card.id} card={card} done={false} />)
                  )}
                </Stack>
              </Paper>

              {/* Histórico */}
              <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
                <Stack direction="row" alignItems="center" sx={{ px: 2.5, py: 1.75, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ flex: 1 }}>
                    Histórico (últimos 60 dias)
                    {completedCards.length > 0 && (
                      <Box component="span" sx={{ ml: 1, px: 0.75, py: 0.1, borderRadius: 99, fontSize: '0.65rem', fontWeight: 800, bgcolor: 'rgba(19,222,185,0.12)', color: '#13DEB9' }}>
                        {completedCards.length}
                      </Box>
                    )}
                  </Typography>
                </Stack>
                <Stack spacing={0.75} sx={{ p: 2 }}>
                  {completedCards.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                      Nenhuma entrega nos últimos 60 dias.
                    </Typography>
                  ) : (
                    completedCards.map((card) => <CardRow key={card.id} card={card} done />)
                  )}
                </Stack>
              </Paper>

            </Stack>
          </Grid>

          {/* ── RIGHT: Attributes ────────────────────────────────────────── */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Stack spacing={2.5}>

              {/* Boards ativos */}
              {boards.length > 0 && (
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                    <IconBolt size={16} color="#4570EA" />
                    <Typography variant="subtitle2" fontWeight={800}>Boards ativos</Typography>
                  </Stack>
                  <Stack spacing={0.75}>
                    {boards.map((b) => (
                      <Stack key={b.board_id} direction="row" alignItems="center" justifyContent="space-between">
                        <Typography variant="body2" fontWeight={600} noWrap sx={{ fontSize: '0.82rem' }}>{b.board_name}</Typography>
                        <Chip size="small" label={`${b.active_count} job${b.active_count !== 1 ? 's' : ''}`}
                          sx={{ height: 18, fontSize: '0.62rem', bgcolor: 'rgba(69,112,234,0.1)', color: '#4570EA' }} />
                      </Stack>
                    ))}
                  </Stack>
                </Paper>
              )}

              {/* Skills */}
              {(member.skills?.length ?? 0) > 0 && (
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                    <IconBolt size={16} color="#E85219" />
                    <Typography variant="subtitle2" fontWeight={800}>Skills</Typography>
                  </Stack>
                  <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                    {member.skills!.map((s) => (
                      <Chip key={s} label={s} size="small"
                        sx={{ height: 24, fontSize: '0.72rem', fontWeight: 700,
                          bgcolor: alpha('#E85219', 0.1), color: '#E85219', border: `1px solid ${alpha('#E85219', 0.25)}` }} />
                    ))}
                  </Stack>
                </Paper>
              )}

              {/* AI Tools */}
              {(member.ai_tools?.length ?? 0) > 0 && (
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                    <IconRobot size={16} color="#8b5cf6" />
                    <Typography variant="subtitle2" fontWeight={800}>IAs que usa</Typography>
                  </Stack>
                  <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                    {member.ai_tools!.map((t) => (
                      <Chip key={t} label={t} size="small"
                        sx={{ height: 22, fontSize: '0.68rem', fontWeight: 700,
                          bgcolor: alpha('#8b5cf6', 0.1), color: '#8b5cf6', border: `1px solid ${alpha('#8b5cf6', 0.25)}` }} />
                    ))}
                  </Stack>
                </Paper>
              )}

              {/* Link to full freelancer profile if available */}
              {!member.freelancer_id && (
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, borderStyle: 'dashed' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', lineHeight: 1.5 }}>
                    Este colaborador ainda não tem perfil cadastrado no sistema Edro.<br />
                    <Tooltip title="Cadastrar como freelancer para ver métricas completas">
                      <Box component="span" sx={{ textDecoration: 'underline', cursor: 'pointer' }}>Saiba mais</Box>
                    </Tooltip>
                  </Typography>
                </Paper>
              )}

            </Stack>
          </Grid>
        </Grid>

      </Box>
    </AppShell>
  );
}
