'use client';

import React from 'react';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import {
  IconAlertTriangle,
  IconBolt,
  IconBrain,
  IconCheck,
  IconFileText,
  IconInbox,
  IconLayoutKanban,
  IconMessageCircle,
  IconMicrophone,
  IconPlus,
  IconSearch,
  IconSparkles,
  IconTrendingUp,
} from '@tabler/icons-react';

// ── Design tokens ──────────────────────────────────────────────────────────────
const D = {
  bg: '#0c0c15',
  bgGrad: 'linear-gradient(135deg, #0c0c15 0%, #100d1e 100%)',
  surface: 'rgba(255,255,255,0.04)',
  surfaceHover: 'rgba(255,255,255,0.07)',
  border: 'rgba(255,255,255,0.08)',
  borderHover: 'rgba(255,255,255,0.16)',
  text: 'rgba(255,255,255,0.92)',
  textSub: 'rgba(255,255,255,0.48)',
  textDim: 'rgba(255,255,255,0.2)',
  orange: '#ff5500',
  red: '#ff4040',
  green: '#00d084',
  blue: '#4f8ef7',
  yellow: '#f59e0b',
  purple: '#a78bfa',
};

// ── Mock data ──────────────────────────────────────────────────────────────────
const TODAY = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

const CLIENTS = [
  { id: '1', name: 'Bradesco', initials: 'BR', color: '#cc0000', health: 42, temp: 'at_risk', tempLabel: 'Em risco', jobs: 8, approval: 3, overdue: 2, nextDeadline: 'Hoje 18h', pulse: 'Cliente pressionando resposta na campanha de março.' },
  { id: '2', name: 'NuBank', initials: 'NU', color: '#820ad1', health: 88, temp: 'engaged', tempLabel: 'Engajado', jobs: 5, approval: 0, overdue: 0, nextDeadline: 'Sex 12h', pulse: 'Reunião de alinhamento agendada — preparar pauta.' },
  { id: '3', name: 'Itaú', initials: 'IT', color: '#f5841f', health: 61, temp: 'pressured', tempLabel: 'Pressionado', jobs: 12, approval: 6, overdue: 1, nextDeadline: 'Amanhã 9h', pulse: '3 copies em aprovação há mais de 48h sem resposta.' },
  { id: '4', name: 'Mag. Luiza', initials: 'ML', color: '#0066cc', health: 95, temp: 'engaged', tempLabel: 'Engajado', jobs: 3, approval: 1, overdue: 0, nextDeadline: 'Seg 10h', pulse: 'Campanha de Páscoa aprovada — produção iniciada.' },
  { id: '5', name: 'Ambev', initials: 'AM', color: '#d4a017', health: 73, temp: 'neutral', tempLabel: 'Neutro', jobs: 6, approval: 2, overdue: 0, nextDeadline: 'Sex 17h', pulse: 'Aguardando briefing de Q2 do cliente.' },
  { id: '6', name: 'Unilever', initials: 'UN', color: '#1a5a9a', health: 55, temp: 'pressured', tempLabel: 'Pressionado', jobs: 4, approval: 1, overdue: 1, nextDeadline: 'Hoje 20h', pulse: 'Peça OOH precisa de aprovação urgente.' },
];

const ALERTS = [
  { id: 1, label: 'Bradesco — aprovação venceu ontem', color: D.red },
  { id: 2, label: 'NuBank — reunião em 40min', color: D.orange },
  { id: 3, label: 'Itaú — 3 copies sem resposta há 2 dias', color: D.yellow },
];

const KPI = [
  { label: 'Para hoje', value: '7', sub: '2 atrasadas', color: D.red },
  { label: 'Aprovações', value: '14', sub: '3 vencidas', color: D.orange },
  { label: 'Em produção', value: '31', sub: 'normal', color: D.blue },
  { label: 'Saúde média', value: '72', sub: '↑ +4 pts', color: D.green },
];

const MEETINGS = [
  { id: '1', client: 'NuBank', time: '10:30', title: 'Alinhamento Q2', hasBot: true },
  { id: '2', client: 'Bradesco', time: '14:00', title: 'Review campanha', hasBot: false },
  { id: '3', client: 'Itaú', time: '16:30', title: 'Aprovação peças', hasBot: true },
];

const PIPELINE = [
  { stage: 'Briefing', count: 4, color: D.purple },
  { stage: 'Copy IA', count: 7, color: D.blue },
  { stage: 'Aprovação', count: 14, color: D.orange },
  { stage: 'Produção', count: 31, color: '#0ea5e9' },
  { stage: 'Revisão', count: 8, color: D.yellow },
  { stage: 'Entrega', count: 3, color: D.green },
];

const JARVIS = [
  { id: 1, text: 'Bradesco aprova mais rápido nas terças de manhã — considere reenviar as peças agora.', type: 'tip', Icon: IconBolt },
  { id: 2, text: 'NuBank em 40min. Edro.Studio vai gravar e enviar resumo automaticamente.', type: 'info', Icon: IconBrain },
  { id: 3, text: 'Taxa de aprovação caiu 18% essa semana. Motivo: prazo curto no briefing.', type: 'alert', Icon: IconAlertTriangle },
];

const INBOX = [
  { id: 'j1', title: 'CRONOGRAMA TÁTICO', client: 'CS Mobi Cuiabá', initials: 'CM', color: D.orange, owner: null },
  { id: 'j2', title: 'Passo a passo assinaturas', client: 'CS Infra (Holding)', initials: 'CI', color: D.blue, owner: 'Camila M.' },
  { id: 'j3', title: 'ANIVERSÁRIO DE CUIABÁ', client: 'CS Mobi Cuiabá', initials: 'CM', color: D.red, owner: 'Leonardo R.' },
  { id: 'j4', title: 'Instagram Páscoa — carrossel', client: 'CS Mobi Leste SP', initials: 'CM', color: D.purple, owner: 'Camila M.' },
];

const TEAM = [
  { name: 'Ana Lima', role: 'Copy', active: 'Itaú — copy redes', avatar: 'AL', color: D.blue },
  { name: 'Carlos Silva', role: 'Design', active: 'Bradesco — banner', avatar: 'CS', color: D.purple },
  { name: 'Luisa M.', role: 'Atend.', active: 'NuBank — briefing', avatar: 'LM', color: D.green },
  { name: 'Marcos R.', role: 'Mídia', active: 'Ambev — relatório', avatar: 'MR', color: D.yellow },
];

const QUICK_ACTIONS = [
  { label: 'Novo briefing', Icon: IconFileText, color: D.blue },
  { label: 'Ver aprovações', Icon: IconCheck, color: D.orange, badge: 14 },
  { label: 'Kanban', Icon: IconLayoutKanban, color: D.purple },
  { label: 'Relatório', Icon: IconTrendingUp, color: D.green },
  { label: 'WhatsApp grupos', Icon: IconMessageCircle, color: '#25d366' },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
function tempColor(t: string) {
  if (t === 'at_risk') return D.red;
  if (t === 'pressured') return D.orange;
  if (t === 'neutral') return D.textSub;
  return D.green;
}
function healthColor(s: number) {
  return s >= 80 ? D.green : s >= 60 ? D.yellow : D.red;
}

// ── Primitives ─────────────────────────────────────────────────────────────────
function GlassCard({ children, sx, glow, onClick }: {
  children: React.ReactNode; sx?: object; glow?: string; onClick?: () => void;
}) {
  return (
    <Box onClick={onClick} sx={{
      background: D.surface,
      border: `1px solid ${D.border}`,
      borderRadius: 2.5,
      backdropFilter: 'blur(12px)',
      transition: 'all 0.2s ease',
      cursor: onClick ? 'pointer' : 'default',
      ...(glow ? { boxShadow: `0 0 36px ${glow}` } : {}),
      '&:hover': onClick ? { background: D.surfaceHover, border: `1px solid ${D.borderHover}`, transform: 'translateY(-1px)', boxShadow: `0 8px 32px rgba(0,0,0,0.4)` } : {},
      ...sx,
    }}>
      {children}
    </Box>
  );
}

function HealthRing({ value, size = 50 }: { value: number; size?: number }) {
  const color = healthColor(value);
  const r = (size - 7) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  return (
    <Box sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={3.5} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={3.5}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography sx={{ fontSize: '0.82rem', fontWeight: 900, color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
          {value}
        </Typography>
      </Box>
    </Box>
  );
}

function PulseDot({ color = D.green }: { color?: string }) {
  return (
    <Box sx={{ position: 'relative', width: 8, height: 8, flexShrink: 0 }}>
      <Box sx={{
        position: 'absolute', inset: 0, borderRadius: '50%', bgcolor: color,
        animation: 'pulse-ring 2s ease-out infinite',
        '@keyframes pulse-ring': { '0%': { opacity: 0.7, transform: 'scale(1)' }, '100%': { opacity: 0, transform: 'scale(2.8)' } },
      }} />
      <Box sx={{ position: 'relative', width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
    </Box>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: D.textDim, mb: 1 }}>
      {children}
    </Typography>
  );
}

// ── Section components ─────────────────────────────────────────────────────────
function KpiStrip() {
  return (
    <Grid container spacing={1.5}>
      {KPI.map((k) => (
        <Grid key={k.label} size={{ xs: 6, sm: 3 }}>
          <GlassCard sx={{ p: 2.25 }} onClick={() => {}}>
            <Typography sx={{ fontSize: '2.2rem', fontWeight: 900, color: k.color, lineHeight: 1, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
              {k.value}
            </Typography>
            <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: D.text, mt: 0.5 }}>{k.label}</Typography>
            <Typography sx={{ fontSize: '0.68rem', color: D.textSub, mt: 0.15 }}>{k.sub}</Typography>
          </GlassCard>
        </Grid>
      ))}
    </Grid>
  );
}

function ClientGrid() {
  return (
    <Grid container spacing={1.25}>
      {CLIENTS.map((c) => {
        const tc = tempColor(c.temp);
        const isUrgent = c.overdue > 0 || c.temp === 'at_risk';
        return (
          <Grid key={c.id} size={{ xs: 12, sm: 6 }}>
            <GlassCard
              onClick={() => {}}
              glow={isUrgent ? `${tc}18` : undefined}
              sx={{ p: 2, borderLeft: `3px solid ${tc}` }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <HealthRing value={c.health} size={50} />
                <Box flex={1} minWidth={0}>
                  <Stack direction="row" alignItems="center" spacing={0.75} mb={0.35}>
                    <Typography sx={{ fontSize: '0.9rem', fontWeight: 800, color: D.text }}>{c.name}</Typography>
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: tc, flexShrink: 0 }} />
                  </Stack>
                  <Typography sx={{ fontSize: '0.68rem', color: D.textSub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.pulse}
                  </Typography>
                  <Stack direction="row" spacing={0} mt={0.6} alignItems="center">
                    <Typography sx={{ fontSize: '0.64rem', color: D.textDim }}>{c.jobs} jobs</Typography>
                    {c.approval > 0 && (
                      <Typography sx={{ fontSize: '0.64rem', color: D.orange, fontWeight: 700, ml: 0.75 }}>
                        · {c.approval} aprovação
                      </Typography>
                    )}
                    {c.overdue > 0 && (
                      <Typography sx={{ fontSize: '0.64rem', color: D.red, fontWeight: 700, ml: 0.75 }}>
                        · {c.overdue} atrasado
                      </Typography>
                    )}
                  </Stack>
                </Box>
                <Stack alignItems="flex-end" spacing={0.5} sx={{ flexShrink: 0 }}>
                  <Chip
                    label={c.tempLabel}
                    size="small"
                    sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700, bgcolor: `${tc}18`, color: tc, border: 'none' }}
                  />
                  <Typography sx={{
                    fontSize: '0.62rem',
                    fontWeight: c.nextDeadline.includes('Hoje') ? 700 : 400,
                    color: c.nextDeadline.includes('Hoje') ? D.red : D.textDim,
                  }}>
                    {c.nextDeadline}
                  </Typography>
                </Stack>
              </Stack>
            </GlassCard>
          </Grid>
        );
      })}
    </Grid>
  );
}

function PipelineViz() {
  const total = PIPELINE.reduce((s, p) => s + p.count, 0);
  return (
    <GlassCard sx={{ p: 2.5 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <SectionLabel>Pipeline — {total} demandas ativas</SectionLabel>
        <Stack direction="row" alignItems="center" spacing={0.75}>
          <PulseDot color={D.green} />
          <Typography sx={{ fontSize: '0.62rem', color: D.textDim }}>ao vivo</Typography>
        </Stack>
      </Stack>

      {/* Segmented bar */}
      <Stack direction="row" spacing={0.3} sx={{ height: 6, borderRadius: 99, overflow: 'hidden', mb: 2.5 }}>
        {PIPELINE.map((p) => (
          <Tooltip key={p.stage} title={`${p.stage}: ${p.count}`} placement="top">
            <Box sx={{ flex: p.count, bgcolor: p.color, transition: 'flex 0.4s ease', cursor: 'pointer', '&:hover': { opacity: 0.8 } }} />
          </Tooltip>
        ))}
      </Stack>

      {/* Stage numbers */}
      <Grid container spacing={1.5}>
        {PIPELINE.map((p) => (
          <Grid key={p.stage} size={{ xs: 4, sm: 2 }}>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: p.color, flexShrink: 0 }} />
              <Box>
                <Typography sx={{ fontSize: '1.3rem', fontWeight: 900, color: p.color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                  {p.count}
                </Typography>
                <Typography sx={{ fontSize: '0.58rem', color: D.textDim, textTransform: 'uppercase', letterSpacing: '0.06em', mt: 0.15 }}>
                  {p.stage}
                </Typography>
              </Box>
            </Stack>
          </Grid>
        ))}
      </Grid>
    </GlassCard>
  );
}

function InboxPanel() {
  return (
    <GlassCard sx={{ p: 2.5 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={1.25} mb={1.5}>
        <Box sx={{ width: 30, height: 30, borderRadius: 1.5, bgcolor: `${D.orange}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: D.orange, flexShrink: 0 }}>
          <IconInbox size={15} />
        </Box>
        <Box flex={1}>
          <Typography sx={{ fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: D.orange, lineHeight: 1 }}>
            O QUE ENTROU
          </Typography>
          <Typography sx={{ fontSize: '0.85rem', fontWeight: 800, color: D.text, lineHeight: 1.3 }}>
            Para organizar
          </Typography>
        </Box>
        <Box sx={{ px: 1, py: 0.3, borderRadius: 1, bgcolor: `${D.orange}20`, minWidth: 24, textAlign: 'center' }}>
          <Typography sx={{ fontSize: '0.72rem', color: D.orange, fontWeight: 900 }}>
            {INBOX.length}
          </Typography>
        </Box>
      </Stack>

      <Stack spacing={0.6}>
        {INBOX.map((job) => (
          <Box key={job.id} sx={{
            display: 'flex', gap: 1.25, p: 1.25, borderRadius: 1.5,
            bgcolor: 'rgba(255,255,255,0.03)', border: `1px solid ${D.border}`,
            cursor: 'pointer', transition: 'all 0.15s',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.06)', borderColor: D.borderHover },
          }}>
            <Box sx={{ width: 3, borderRadius: 1, bgcolor: job.color, flexShrink: 0, alignSelf: 'stretch' }} />
            <Avatar sx={{ width: 26, height: 26, bgcolor: `${job.color}22`, color: job.color, fontSize: '0.58rem', fontWeight: 900, borderRadius: 1, flexShrink: 0 }}>
              {job.initials}
            </Avatar>
            <Box flex={1} minWidth={0}>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: D.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {job.title}
              </Typography>
              <Typography sx={{ fontSize: '0.64rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <Box component="span" sx={{ color: D.textSub }}>{job.client} · </Box>
                <Box component="span" sx={{ color: job.owner ? D.textSub : D.orange, fontWeight: job.owner ? 400 : 700 }}>
                  {job.owner ?? 'Sem responsável'}
                </Box>
              </Typography>
            </Box>
          </Box>
        ))}
      </Stack>

      <Divider sx={{ borderColor: D.border, my: 1.5 }} />
      <Stack direction="row" spacing={2}>
        <Box>
          <SectionLabel>Vence hoje</SectionLabel>
          <Typography sx={{ fontSize: '0.7rem', color: D.textDim, fontStyle: 'italic' }}>Nenhuma.</Typography>
        </Box>
        <Box>
          <SectionLabel>Aprovações</SectionLabel>
          <Typography sx={{ fontSize: '0.7rem', color: D.textDim, fontStyle: 'italic' }}>Nenhuma.</Typography>
        </Box>
      </Stack>
    </GlassCard>
  );
}

function JarvisPanel() {
  return (
    <GlassCard sx={{ p: 2.5 }}>
      <Stack direction="row" alignItems="center" spacing={1} mb={1.75}>
        <IconSparkles size={15} color={D.blue} />
        <SectionLabel>Jarvis — insights do dia</SectionLabel>
        <Box flex={1} />
        <PulseDot color={D.blue} />
      </Stack>
      <Stack spacing={1}>
        {JARVIS.map((i) => {
          const color = i.type === 'alert' ? D.orange : i.type === 'tip' ? D.green : D.blue;
          return (
            <Box key={i.id} sx={{ display: 'flex', gap: 1.25, p: 1.25, borderRadius: 1.5, bgcolor: `${color}08`, border: `1px solid ${color}20` }}>
              <Box sx={{ color, flexShrink: 0, mt: 0.1 }}><i.Icon size={13} /></Box>
              <Typography sx={{ fontSize: '0.72rem', color: D.textSub, lineHeight: 1.6 }}>{i.text}</Typography>
            </Box>
          );
        })}
      </Stack>
    </GlassCard>
  );
}

function AgendaPanel() {
  return (
    <GlassCard sx={{ p: 2.5 }}>
      <SectionLabel>Agenda de hoje</SectionLabel>
      <Stack spacing={1}>
        {MEETINGS.map((m) => (
          <Stack key={m.id} direction="row" spacing={1.5} alignItems="center" sx={{ py: 0.5 }}>
            <Box sx={{ width: 42, textAlign: 'center', flexShrink: 0 }}>
              <Typography sx={{ fontSize: '0.82rem', fontWeight: 900, color: D.blue, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {m.time}
              </Typography>
            </Box>
            <Box flex={1} minWidth={0}>
              <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: D.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {m.title}
              </Typography>
              <Typography sx={{ fontSize: '0.64rem', color: D.textSub }}>{m.client}</Typography>
            </Box>
            {m.hasBot && (
              <Tooltip title="Edro.Studio vai gravar">
                <Box sx={{ color: D.green, display: 'flex' }}><IconMicrophone size={14} /></Box>
              </Tooltip>
            )}
          </Stack>
        ))}
      </Stack>
    </GlassCard>
  );
}

function TeamPanel() {
  return (
    <GlassCard sx={{ p: 2.5 }}>
      <SectionLabel>Equipe agora</SectionLabel>
      <Stack spacing={0.25}>
        {TEAM.map((t) => (
          <Stack key={t.name} direction="row" spacing={1.25} alignItems="center"
            sx={{ px: 0.75, py: 0.75, borderRadius: 1.5, cursor: 'pointer', transition: 'all 0.15s', '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' } }}
          >
            <Box sx={{ position: 'relative' }}>
              <Avatar sx={{ width: 28, height: 28, fontSize: '0.62rem', bgcolor: `${t.color}22`, color: t.color, fontWeight: 800 }}>
                {t.avatar}
              </Avatar>
              <Box sx={{ position: 'absolute', bottom: -1, right: -1, width: 8, height: 8, borderRadius: '50%', bgcolor: D.green, border: `1.5px solid ${D.bg}` }} />
            </Box>
            <Box flex={1} minWidth={0}>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: D.text }}>{t.name}</Typography>
              <Typography sx={{ fontSize: '0.64rem', color: D.textSub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {t.active}
              </Typography>
            </Box>
            <Typography sx={{ fontSize: '0.6rem', color: D.textDim, flexShrink: 0 }}>{t.role}</Typography>
          </Stack>
        ))}
      </Stack>
    </GlassCard>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function DashboardV2Client() {
  return (
    <Box sx={{ minHeight: '100vh', background: D.bgGrad, p: { xs: 2, md: 3 }, color: D.text }}>

      {/* ── Top bar ── */}
      <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} justifyContent="space-between" mb={3} spacing={2}>
        <Box>
          <Typography sx={{ fontSize: '1.7rem', fontWeight: 900, color: D.text, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
            Bom dia, Leo
          </Typography>
          <Typography sx={{ fontSize: '0.78rem', color: D.textSub, mt: 0.3, textTransform: 'capitalize' }}>{TODAY}</Typography>
        </Box>

        {/* Live alerts */}
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
          {ALERTS.map((a) => (
            <Stack key={a.id} direction="row" alignItems="center" spacing={0.75}
              sx={{ px: 1.25, py: 0.6, borderRadius: 1.5, bgcolor: `${a.color}12`, border: `1px solid ${a.color}30`, cursor: 'pointer', '&:hover': { bgcolor: `${a.color}20` } }}
            >
              <PulseDot color={a.color} />
              <Typography sx={{ fontSize: '0.7rem', color: a.color, fontWeight: 600 }}>{a.label}</Typography>
            </Stack>
          ))}
        </Stack>

        {/* Search + CTA */}
        <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
          <Stack direction="row" alignItems="center" spacing={1}
            sx={{ px: 1.5, py: 0.75, borderRadius: 1.5, bgcolor: D.surface, border: `1px solid ${D.border}`, cursor: 'pointer', minWidth: 150, '&:hover': { border: `1px solid ${D.borderHover}` } }}
          >
            <IconSearch size={13} color={D.textDim} />
            <Typography sx={{ fontSize: '0.75rem', color: D.textDim, flex: 1 }}>Buscar…</Typography>
            <Box sx={{ px: 0.6, py: 0.2, borderRadius: 0.75, bgcolor: 'rgba(255,255,255,0.06)', border: `1px solid ${D.border}` }}>
              <Typography sx={{ fontSize: '0.58rem', color: D.textDim, lineHeight: 1 }}>⌘K</Typography>
            </Box>
          </Stack>
          <Button
            size="small"
            startIcon={<IconPlus size={14} />}
            sx={{ bgcolor: D.orange, color: '#fff', '&:hover': { bgcolor: '#e04400' }, fontSize: '0.78rem', fontWeight: 700, px: 2, borderRadius: 1.5 }}
          >
            Novo Job
          </Button>
        </Stack>
      </Stack>

      {/* ── KPI Strip ── */}
      <Box mb={2.5}>
        <KpiStrip />
      </Box>

      {/* ── Main 2-col ── */}
      <Grid container spacing={2} mb={2}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <SectionLabel>Clientes — pulso em tempo real</SectionLabel>
          <ClientGrid />
        </Grid>
        <Grid size={{ xs: 12, lg: 5 }}>
          <Stack spacing={2}>
            <InboxPanel />
            <JarvisPanel />
          </Stack>
        </Grid>
      </Grid>

      {/* ── Pipeline ── */}
      <Box mb={2}>
        <PipelineViz />
      </Box>

      {/* ── Agenda + Team ── */}
      <Grid container spacing={2} mb={2.5}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <AgendaPanel />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TeamPanel />
        </Grid>
      </Grid>

      {/* ── Quick actions ── */}
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {QUICK_ACTIONS.map((a) => (
          <Stack key={a.label} direction="row" alignItems="center" spacing={0.75}
            sx={{ px: 1.5, py: 0.75, borderRadius: 1.5, bgcolor: D.surface, border: `1px solid ${D.border}`, cursor: 'pointer', transition: 'all 0.15s', '&:hover': { bgcolor: D.surfaceHover, border: `1px solid ${D.borderHover}`, transform: 'translateY(-1px)' } }}
          >
            <Box sx={{ color: a.color, display: 'flex' }}><a.Icon size={14} /></Box>
            <Typography sx={{ fontSize: '0.75rem', color: D.text, fontWeight: 600 }}>{a.label}</Typography>
            {'badge' in a && a.badge && (
              <Box sx={{ px: 0.7, py: 0.1, borderRadius: 1, bgcolor: `${a.color}22`, minWidth: 20, textAlign: 'center' }}>
                <Typography sx={{ fontSize: '0.62rem', color: a.color, fontWeight: 800 }}>{a.badge}</Typography>
              </Box>
            )}
          </Stack>
        ))}
      </Stack>

      <Box mt={4} mb={1}>
        <Typography sx={{ fontSize: '0.62rem', color: D.textDim }}>⚡ Protótipo v2 — dados mockados para visualização do conceito</Typography>
      </Box>

    </Box>
  );
}
