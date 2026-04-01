'use client';

import React from 'react';
import AppShell from '@/components/AppShell';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import {
  IconAlertTriangle,
  IconArrowRight,
  IconBolt,
  IconBrain,
  IconCalendarClock,
  IconCheck,
  IconChevronRight,
  IconCircleCheck,
  IconClock,
  IconFileText,
  IconFlame,
  IconInbox,
  IconLayoutKanban,
  IconMessageCircle,
  IconMicrophone,
  IconPlayerPlay,
  IconPlus,
  IconRefresh,
  IconSparkles,
  IconTrendingUp,
} from '@tabler/icons-react';

// ── Mock data ─────────────────────────────────────────────────────────────────

const TODAY = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

const ALERTS = [
  { id: 1, label: 'Bradesco — aprovação venceu ontem', color: '#ff3b30', icon: <IconFlame size={13} /> },
  { id: 2, label: 'NuBank — reunião em 40 min', color: '#ff6600', icon: <IconClock size={13} /> },
  { id: 3, label: 'Itaú — 3 copies aguardando há 2 dias', color: '#f59e0b', icon: <IconAlertTriangle size={13} /> },
];

const KPI = [
  { label: 'Entregas hoje', value: 7, color: '#ff3b30', sub: '2 atrasadas' },
  { label: 'Aguardando aprovação', value: 14, color: '#ff6600', sub: '3 vencidas' },
  { label: 'Em produção', value: 31, color: '#5D87FF', sub: 'normal' },
  { label: 'Saúde geral', value: '74%', color: '#22c55e', sub: '↑ vs semana passada' },
];

const CLIENTS = [
  {
    id: '1', name: 'Bradesco', initials: 'BR', color: '#cc0000',
    health: 42, temp: 'at_risk', tempLabel: 'Em risco',
    jobs: 8, approval: 3, overdue: 2, nextDeadline: 'Hoje 18h',
    pulse: 'Cliente pressionando por resposta na campanha de março.',
    members: ['Ana', 'Carlos', 'Lu'],
  },
  {
    id: '2', name: 'NuBank', initials: 'NU', color: '#820ad1',
    health: 88, temp: 'engaged', tempLabel: 'Engajado',
    jobs: 5, approval: 0, overdue: 0, nextDeadline: 'Sex 12h',
    pulse: 'Reunião de alinhamento agendada — preparar pauta.',
    members: ['Marcos', 'Bianca'],
  },
  {
    id: '3', name: 'Itaú', initials: 'IT', color: '#f5841f',
    health: 61, temp: 'pressured', tempLabel: 'Pressionado',
    jobs: 12, approval: 6, overdue: 1, nextDeadline: 'Amanhã 9h',
    pulse: '3 copies em aprovação há mais de 48h sem resposta.',
    members: ['Ana', 'Leo', 'Pri'],
  },
  {
    id: '4', name: 'Magazine Luiza', initials: 'ML', color: '#0066cc',
    health: 95, temp: 'engaged', tempLabel: 'Engajado',
    jobs: 3, approval: 1, overdue: 0, nextDeadline: 'Seg 10h',
    pulse: 'Campanha de Páscoa aprovada — produção iniciada.',
    members: ['Carlos'],
  },
  {
    id: '5', name: 'Ambev', initials: 'AM', color: '#fbbf24',
    health: 73, temp: 'neutral', tempLabel: 'Neutro',
    jobs: 6, approval: 2, overdue: 0, nextDeadline: 'Sex 17h',
    pulse: 'Aguardando briefing de Q2 do cliente.',
    members: ['Lu', 'Marcos'],
  },
];

const MEETINGS = [
  { id: '1', client: 'NuBank', time: '10:30', title: 'Alinhamento Q2', duration: '1h', hasBot: true },
  { id: '2', client: 'Bradesco', time: '14:00', title: 'Review campanha março', duration: '45min', hasBot: false },
  { id: '3', client: 'Itaú', time: '16:30', title: 'Aprovação peças digitais', duration: '30min', hasBot: true },
];

const PIPELINE = [
  { stage: 'Briefing', count: 4, color: '#8b5cf6' },
  { stage: 'Copy IA', count: 7, color: '#5D87FF' },
  { stage: 'Aprovação', count: 14, color: '#ff6600' },
  { stage: 'Produção', count: 31, color: '#0ea5e9' },
  { stage: 'Revisão', count: 8, color: '#f59e0b' },
  { stage: 'Entrega', count: 3, color: '#22c55e' },
];

const JARVIS_INSIGHTS = [
  { id: 1, text: 'Bradesco tende a aprovar mais rápido nas terças pela manhã — considere reenviar as peças agora.', type: 'tip' },
  { id: 2, text: 'NuBank tem reunião em 40min. Edro.Studio vai gravar e enviar resumo automaticamente.', type: 'info' },
  { id: 3, text: 'Taxa de aprovação caiu 18% essa semana. Principal motivo: prazo curto no briefing.', type: 'alert' },
];

const TEAM = [
  { name: 'Ana Lima', role: 'Redatora', active: 'Itaú — copy redes', avatar: 'AL' },
  { name: 'Carlos Silva', role: 'Designer', active: 'Bradesco — banner', avatar: 'CS' },
  { name: 'Luisa Martins', role: 'Atendimento', active: 'NuBank — briefing', avatar: 'LM' },
  { name: 'Marcos Rocha', role: 'Mídia', active: 'Ambev — relatório', avatar: 'MR' },
];

const INBOX_UNASSIGNED = [
  { id: 'j1', title: 'Post Páscoa — carrossel', client: 'Magazine Luiza', clientInitials: 'ML', clientColor: '#0066cc', owner: null, typeColor: '#0066cc' },
  { id: 'j2', title: 'Banner Dia dos Pais', client: 'Bradesco', clientInitials: 'BR', clientColor: '#cc0000', owner: null, typeColor: '#cc0000' },
  { id: 'j3', title: 'Copy e-mail CRM Q2', client: 'Itaú', clientInitials: 'IT', clientColor: '#f5841f', owner: null, typeColor: '#f5841f' },
  { id: 'j4', title: 'Reels trend — aprovado', client: 'NuBank', clientInitials: 'NU', clientColor: '#820ad1', owner: null, typeColor: '#820ad1' },
];

const INBOX_TODAY = [
  { id: 'j5', title: 'Story promoção — entrega hoje', client: 'Ambev', clientInitials: 'AM', clientColor: '#fbbf24', owner: 'Marcos', typeColor: '#fbbf24' },
];

const INBOX_APPROVALS = [
  { id: 'j6', title: 'Campanha brand awareness', client: 'NuBank', clientInitials: 'NU', clientColor: '#820ad1', owner: 'Bianca', typeColor: '#820ad1', stage: 'Aguardando cliente' },
  { id: 'j7', title: 'Peças digitais Q1', client: 'Itaú', clientInitials: 'IT', clientColor: '#f5841f', owner: 'Ana', typeColor: '#f5841f', stage: 'Bloqueado 48h' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function tempColor(temp: string) {
  if (temp === 'at_risk') return '#ff3b30';
  if (temp === 'pressured') return '#ff6600';
  if (temp === 'neutral') return '#64748b';
  if (temp === 'engaged') return '#22c55e';
  return '#5D87FF';
}

function healthColor(score: number) {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#f59e0b';
  return '#ff3b30';
}

// ── Components ────────────────────────────────────────────────────────────────

function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
      <Typography variant="subtitle1" fontWeight={700} fontSize="0.85rem" color="text.primary" sx={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {children}
      </Typography>
      {action}
    </Stack>
  );
}

function ClientCard({ c }: { c: typeof CLIENTS[0] }) {
  const tc = tempColor(c.temp);
  const hc = healthColor(c.health);
  const isToday = c.nextDeadline.includes('Hoje');
  return (
    <Card
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderTop: `3px solid ${tc}`,
        boxShadow: 'none',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        '&:hover': { boxShadow: '0 6px 24px rgba(0,0,0,0.09)', transform: 'translateY(-2px)' },
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>

        {/* Row 1: avatar + name + status + health score */}
        <Stack direction="row" alignItems="flex-start" spacing={1.5} mb={1}>
          <Avatar sx={{ bgcolor: c.color, width: 36, height: 36, fontSize: '0.72rem', fontWeight: 800, flexShrink: 0 }}>
            {c.initials}
          </Avatar>
          <Box flex={1} minWidth={0}>
            <Stack direction="row" alignItems="center" spacing={0.75} mb={0.2}>
              <Typography fontWeight={800} fontSize="0.88rem" noWrap>{c.name}</Typography>
              <Chip
                label={c.tempLabel}
                size="small"
                sx={{ height: 17, fontSize: '0.65rem', fontWeight: 700, bgcolor: `${tc}18`, color: tc, border: 'none', flexShrink: 0 }}
              />
            </Stack>
            <Typography variant="caption" color="text.secondary" fontSize="0.72rem" sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {c.pulse}
            </Typography>
          </Box>
          {/* Health score — right-aligned hero number */}
          <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
            <Typography fontSize="1.5rem" fontWeight={900} color={hc} lineHeight={1}>{c.health}</Typography>
            <LinearProgress
              variant="determinate"
              value={c.health}
              sx={{ height: 3, borderRadius: 2, mt: 0.5, width: 36, bgcolor: `${hc}22`, '& .MuiLinearProgress-bar': { bgcolor: hc } }}
            />
          </Box>
        </Stack>

        {/* Row 2: KPI chips */}
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
          <Chip
            size="small"
            label={`${c.jobs} jobs`}
            sx={{ height: 20, fontSize: '0.68rem', fontWeight: 600, bgcolor: 'action.hover', color: 'text.secondary' }}
          />
          {c.approval > 0 && (
            <Chip
              size="small"
              label={`${c.approval} aprovação`}
              sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700, bgcolor: '#ff660015', color: '#ff6600' }}
            />
          )}
          {c.overdue > 0 && (
            <Chip
              size="small"
              label={`${c.overdue} atrasado`}
              sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700, bgcolor: '#ff3b3015', color: '#ff3b30' }}
            />
          )}
          <Box flex={1} />
          <Stack direction="row" alignItems="center" spacing={0.4}>
            <IconClock size={11} color={isToday ? '#ff3b30' : '#94a3b8'} />
            <Typography variant="caption" fontSize="0.68rem" fontWeight={isToday ? 700 : 400} color={isToday ? '#ff3b30' : 'text.disabled'}>
              {c.nextDeadline}
            </Typography>
          </Stack>
        </Stack>

      </CardContent>
    </Card>
  );
}

type InboxJob = {
  id: string; title: string; client: string; clientInitials: string;
  clientColor: string; owner: string | null; typeColor: string; stage?: string;
};

function InboxJobRow({ job, showStage }: { job: InboxJob; showStage?: boolean }) {
  return (
    <Box
      sx={(theme) => ({
        display: 'flex',
        my: 0.4,
        borderRadius: 1.5,
        overflow: 'hidden',
        border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.025)' : '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        cursor: 'pointer',
        transition: 'all 150ms ease',
        '&:hover': { boxShadow: '0 3px 10px rgba(0,0,0,0.1)', transform: 'translateY(-1px)' },
      })}
    >
      {/* Status bar */}
      <Box sx={{ width: 4, flexShrink: 0, bgcolor: job.typeColor }} />
      <Box sx={{ flex: 1, px: 1.5, py: 1.25 }}>
        <Stack direction="row" spacing={1.25} alignItems="center">
          <Avatar sx={{ width: 32, height: 32, borderRadius: 1.25, fontSize: '0.65rem', fontWeight: 900, bgcolor: `${job.clientColor}22`, color: job.clientColor, border: `2px solid ${job.clientColor}38`, flexShrink: 0 }}>
            {job.clientInitials}
          </Avatar>
          <Box flex={1} minWidth={0}>
            <Typography variant="body2" fontWeight={700} noWrap fontSize="0.8rem" lineHeight={1.3}>
              {job.title}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap fontSize="0.7rem">
              {job.client} · {job.owner || 'Sem responsável'}
            </Typography>
            {showStage && job.stage && (
              <Box mt={0.3}>
                <Chip
                  size="small"
                  label={job.stage}
                  sx={{
                    height: 16, fontSize: '0.62rem', fontWeight: 700,
                    bgcolor: job.stage.includes('Bloqueado') ? '#ff3b3015' : '#ff660012',
                    color: job.stage.includes('Bloqueado') ? '#ff3b30' : '#ff6600',
                    border: `1px solid ${job.stage.includes('Bloqueado') ? '#ff3b3030' : '#ff660030'}`,
                    '& .MuiChip-label': { px: 0.75 },
                  }}
                />
              </Box>
            )}
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}

function InboxSection({
  icon, color, label, count, countColor, jobs, empty, showStage,
}: {
  icon: React.ReactNode; color: string; label: string; count: number;
  countColor: 'default' | 'warning' | 'error'; jobs: InboxJob[];
  empty: string; showStage?: boolean;
}) {
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <Box sx={{ width: 26, height: 26, borderRadius: 1.25, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: `${color}1f`, color }}>
            {icon}
          </Box>
          <Typography variant="body2" fontWeight={700} fontSize="0.82rem">{label}</Typography>
        </Stack>
        <Chip
          size="small"
          label={count}
          color={count === 0 ? 'default' : countColor}
          sx={{ height: 20, fontSize: '0.7rem', fontWeight: 800, minWidth: 28, '& .MuiChip-label': { px: 0.75 } }}
        />
      </Stack>
      {jobs.length ? (
        <Stack spacing={0}>
          {jobs.map((job) => <InboxJobRow key={job.id} job={job} showStage={showStage} />)}
        </Stack>
      ) : (
        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', py: 0.75, fontStyle: 'italic', fontSize: '0.75rem' }}>
          {empty}
        </Typography>
      )}
    </Box>
  );
}

function InboxCard() {
  return (
    <Paper
      elevation={0}
      sx={(theme) => ({
        borderRadius: 3,
        border: 'none',
        boxShadow: theme.palette.mode === 'dark' ? '0 2px 16px rgba(0,0,0,0.3)' : '0 2px 16px rgba(0,0,0,0.07)',
        overflow: 'hidden',
      })}
    >
      {/* Orange header stripe */}
      <Box sx={{ background: 'linear-gradient(135deg, #E85219 0%, #ff6600 100%)', px: 2.5, py: 1.75 }}>
        <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.62rem', letterSpacing: '0.16em', fontWeight: 800, lineHeight: 1 }}>
          O QUE ENTROU
        </Typography>
        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 800, fontSize: '1rem', lineHeight: 1.25, mt: 0.25 }}>
          Demandas para organizar
        </Typography>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.72rem', lineHeight: 1.4 }}>
          Itens que precisam de responsável, prazo ou decisão.
        </Typography>
      </Box>

      {/* Sections */}
      <Box sx={{ px: 2.5, py: 2.5 }}>
        <Stack spacing={2.5}>
          <InboxSection
            icon={<IconInbox size={14} />}
            color="#E85219"
            label="Sem responsável"
            count={INBOX_UNASSIGNED.length}
            countColor="warning"
            jobs={INBOX_UNASSIGNED}
            empty="Nenhuma demanda sem responsável."
          />
          <Divider />
          <InboxSection
            icon={<IconCalendarClock size={14} />}
            color="#FFAE1F"
            label="Vence hoje"
            count={INBOX_TODAY.length}
            countColor="warning"
            jobs={INBOX_TODAY}
            empty="Nenhuma entrega vence hoje."
          />
          <Divider />
          <InboxSection
            icon={<IconCircleCheck size={14} />}
            color="#13DEB9"
            label="Aprovações do cliente"
            count={INBOX_APPROVALS.length}
            countColor="error"
            jobs={INBOX_APPROVALS}
            empty="Nenhuma aprovação pendente."
            showStage
          />
        </Stack>
      </Box>
    </Paper>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function DashboardPreviewClient() {
  return (
    <AppShell title="Central de Operações">
      <Box sx={{ maxWidth: 1400, mx: 'auto', px: { xs: 1, md: 2 } }}>

        {/* ── Header ── */}
        <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} justifyContent="space-between" mb={3} spacing={2}>
          <Box>
            <Typography variant="h5" fontWeight={800} fontSize="1.35rem">
              Bom dia, Leo 👋
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
              {TODAY}
            </Typography>
          </Box>

          {/* Alert chips */}
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {ALERTS.map((a) => (
              <Chip
                key={a.id}
                icon={<Box sx={{ color: a.color, display: 'flex', pl: 0.5 }}>{a.icon}</Box>}
                label={a.label}
                size="small"
                sx={{
                  bgcolor: `${a.color}12`,
                  color: a.color,
                  fontWeight: 600,
                  fontSize: '0.72rem',
                  border: `1px solid ${a.color}30`,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: `${a.color}20` },
                }}
              />
            ))}
          </Stack>

          <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
            <Button size="small" variant="outlined" startIcon={<IconRefresh size={14} />} sx={{ fontSize: '0.78rem' }}>
              Atualizar
            </Button>
            <Button size="small" variant="contained" startIcon={<IconPlus size={14} />} sx={{ fontSize: '0.78rem' }}>
              Novo Job
            </Button>
          </Stack>
        </Stack>

        {/* ── KPI Strip ── */}
        <Grid container spacing={1.5} mb={3}>
          {KPI.map((k) => (
            <Grid key={k.label} size={{ xs: 6, md: 3 }}>
              <Card sx={{ boxShadow: 'none', border: '1px solid', borderColor: 'divider', cursor: 'pointer', '&:hover': { borderColor: k.color } }}>
                <CardContent sx={{ py: 2, px: 2.5, '&:last-child': { pb: 2 } }}>
                  <Typography variant="h4" fontWeight={800} color={k.color} lineHeight={1}>{k.value}</Typography>
                  <Typography variant="body2" fontWeight={600} mt={0.5} fontSize="0.82rem">{k.label}</Typography>
                  <Typography variant="caption" color="text.secondary" fontSize="0.72rem">{k.sub}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* ── Main Grid ── */}
        <Grid container spacing={2.5}>

          {/* ── Far Left: O QUE ENTROU ── */}
          <Grid size={{ xs: 12, lg: 3 }}>
            <InboxCard />
          </Grid>

          {/* ── Center: Clients ── */}
          <Grid size={{ xs: 12, lg: 5 }}>
            <SectionTitle action={
              <Button size="small" endIcon={<IconArrowRight size={14} />} sx={{ fontSize: '0.75rem' }}>
                Ver todos
              </Button>
            }>
              Clientes — Pulso em Tempo Real
            </SectionTitle>

            <Grid container spacing={1.5}>
              {CLIENTS.map((c) => (
                <Grid key={c.id} size={{ xs: 12, sm: 6 }}>
                  <ClientCard c={c} />
                </Grid>
              ))}
            </Grid>
          </Grid>

          {/* ── Right column ── */}
          <Grid size={{ xs: 12, lg: 4 }}>
            <Stack spacing={2.5}>

              {/* Agenda de hoje */}
              <Box>
                <SectionTitle>
                  Agenda de hoje
                </SectionTitle>
                <Stack spacing={1}>
                  {MEETINGS.map((m) => (
                    <Card key={m.id} sx={{ boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
                      <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                          <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: '#5D87FF18', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Typography fontSize="0.75rem" fontWeight={800} color="primary.main" lineHeight={1}>{m.time}</Typography>
                          </Box>
                          <Box flex={1} minWidth={0}>
                            <Typography fontWeight={700} fontSize="0.82rem" noWrap>{m.title}</Typography>
                            <Typography variant="caption" color="text.secondary">{m.client} · {m.duration}</Typography>
                          </Box>
                          {m.hasBot && (
                            <Tooltip title="Edro.Studio vai gravar">
                              <Box sx={{ color: '#22c55e', display: 'flex' }}>
                                <IconMicrophone size={16} />
                              </Box>
                            </Tooltip>
                          )}
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              </Box>

              {/* Jarvis insights */}
              <Box>
                <SectionTitle>
                  <Stack direction="row" alignItems="center" spacing={0.75}>
                    <IconSparkles size={14} color="#5D87FF" />
                    <span>Jarvis — insights do dia</span>
                  </Stack>
                </SectionTitle>
                <Stack spacing={1}>
                  {JARVIS_INSIGHTS.map((i) => (
                    <Card key={i.id} sx={{ boxShadow: 'none', border: '1px solid', borderColor: i.type === 'alert' ? '#ff660030' : 'divider', bgcolor: i.type === 'alert' ? '#ff660008' : 'background.paper' }}>
                      <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                        <Stack direction="row" spacing={1}>
                          <Box sx={{ flexShrink: 0, mt: 0.2, color: i.type === 'alert' ? '#ff6600' : i.type === 'tip' ? '#22c55e' : '#5D87FF' }}>
                            {i.type === 'alert' ? <IconAlertTriangle size={14} /> : i.type === 'tip' ? <IconBolt size={14} /> : <IconBrain size={14} />}
                          </Box>
                          <Typography variant="caption" color="text.secondary" lineHeight={1.5} fontSize="0.78rem">
                            {i.text}
                          </Typography>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              </Box>

              {/* Equipe ativa */}
              <Box>
                <SectionTitle>Equipe agora</SectionTitle>
                <Stack spacing={0.75}>
                  {TEAM.map((t) => (
                    <Stack key={t.name} direction="row" alignItems="center" spacing={1.5} sx={{ py: 0.75, px: 1.5, borderRadius: 2, '&:hover': { bgcolor: 'action.hover' }, cursor: 'pointer' }}>
                      <Avatar sx={{ width: 30, height: 30, fontSize: '0.7rem', bgcolor: '#5D87FF', flexShrink: 0 }}>{t.avatar}</Avatar>
                      <Box flex={1} minWidth={0}>
                        <Typography fontSize="0.8rem" fontWeight={600} noWrap>{t.name}</Typography>
                        <Typography variant="caption" color="text.secondary" fontSize="0.7rem" noWrap>{t.active}</Typography>
                      </Box>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#22c55e', flexShrink: 0 }} />
                    </Stack>
                  ))}
                </Stack>
              </Box>

            </Stack>
          </Grid>
        </Grid>

        {/* ── Pipeline strip ── */}
        <Box mt={3}>
          <SectionTitle action={
            <Button size="small" endIcon={<IconLayoutKanban size={14} />} sx={{ fontSize: '0.75rem' }}>
              Abrir Kanban
            </Button>
          }>
            Pipeline — visão geral
          </SectionTitle>
          <Grid container spacing={1.5}>
            {PIPELINE.map((p) => (
              <Grid key={p.stage} size={{ xs: 4, md: 2 }}>
                <Card sx={{ boxShadow: 'none', border: '1px solid', borderColor: 'divider', textAlign: 'center', cursor: 'pointer', '&:hover': { borderColor: p.color } }}>
                  <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: p.color, mx: 'auto', mb: 1 }} />
                    <Typography fontSize="1.4rem" fontWeight={800} color={p.color} lineHeight={1}>{p.count}</Typography>
                    <Typography variant="caption" color="text.secondary" fontSize="0.72rem" display="block" mt={0.5}>{p.stage}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* ── Quick actions ── */}
        <Stack direction="row" spacing={1.5} mt={3} flexWrap="wrap" useFlexGap>
          {[
            { label: 'Novo briefing rápido', icon: <IconFileText size={15} />, color: '#5D87FF' },
            { label: 'Ver aprovações pendentes', icon: <IconCheck size={15} />, color: '#ff6600', badge: 14 },
            { label: 'Entrar em reunião', icon: <IconPlayerPlay size={15} />, color: '#22c55e' },
            { label: 'Ver mensagens do grupo', icon: <IconMessageCircle size={15} />, color: '#8b5cf6' },
            { label: 'Relatório da semana', icon: <IconTrendingUp size={15} />, color: '#0ea5e9' },
          ].map((a) => (
            <Button
              key={a.label}
              variant="outlined"
              startIcon={<Box sx={{ color: a.color }}>{a.icon}</Box>}
              size="small"
              sx={{ fontSize: '0.78rem', borderColor: `${a.color}40`, color: 'text.primary', '&:hover': { borderColor: a.color, bgcolor: `${a.color}08` } }}
            >
              {a.label}
              {a.badge && <Chip label={a.badge} size="small" sx={{ ml: 0.5, height: 16, fontSize: '0.65rem', bgcolor: a.color, color: '#fff', '& .MuiChip-label': { px: 0.75 } }} />}
            </Button>
          ))}
        </Stack>

        <Box mt={4} mb={2}>
          <Typography variant="caption" color="text.disabled" fontSize="0.7rem">
            ⚡ Protótipo — dados mockados para visualização do conceito
          </Typography>
        </Box>

      </Box>
    </AppShell>
  );
}
