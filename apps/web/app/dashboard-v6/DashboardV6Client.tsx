'use client';
// v6 — SPLIT PRIORITY: left = numbered action queue (big), right = context data
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
import { IconBolt, IconCheck, IconMicrophone, IconPlus, IconSparkles } from '@tabler/icons-react';

const TODAY = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

const ACTIONS = [
  { n: '01', urgency: 'CRÍTICO', label: 'Reenviar aprovação para Bradesco', detail: 'Venceu ontem. Cliente esperando.', client: 'Bradesco', color: '#dc2626', time: 'agora' },
  { n: '02', urgency: 'URGENTE', label: 'Preparar pauta — reunião NuBank', detail: 'Em 40 minutos. Bot vai gravar.', client: 'NuBank', color: '#ea580c', time: '40min' },
  { n: '03', urgency: 'URGENTE', label: 'Desbloquear 3 copies do Itaú', detail: 'Paradas há 48h sem resposta.', client: 'Itaú', color: '#ea580c', time: 'hoje' },
  { n: '04', urgency: 'NORMAL', label: 'Atribuir responsável a 4 jobs', detail: 'Sem dono. Sem prazo definido.', client: 'Sistema', color: '#64748b', time: 'hoje' },
  { n: '05', urgency: 'NORMAL', label: 'Aprovar peça OOH da Unilever', detail: 'Prazo hoje às 20h.', client: 'Unilever', color: '#64748b', time: 'hoje 20h' },
];
const CLIENTS = [
  { id: '1', name: 'Bradesco', initials: 'BR', color: '#dc2626', health: 42, jobs: 8, status: 'Em risco' },
  { id: '2', name: 'NuBank', initials: 'NU', color: '#7c3aed', health: 88, jobs: 5, status: 'Engajado' },
  { id: '3', name: 'Itaú', initials: 'IT', color: '#ea580c', health: 61, jobs: 12, status: 'Pressionado' },
  { id: '4', name: 'Mag. Luiza', initials: 'ML', color: '#2563eb', health: 95, jobs: 3, status: 'Engajado' },
  { id: '5', name: 'Ambev', initials: 'AM', color: '#ca8a04', health: 73, jobs: 6, status: 'Neutro' },
];
const PIPELINE = [
  { stage: 'Briefing', count: 4, color: '#8b5cf6' },
  { stage: 'Copy IA', count: 7, color: '#3b82f6' },
  { stage: 'Aprovação', count: 14, color: '#f97316' },
  { stage: 'Produção', count: 31, color: '#0ea5e9' },
  { stage: 'Revisão', count: 8, color: '#eab308' },
  { stage: 'Entrega', count: 3, color: '#22c55e' },
];
const MEETINGS = [
  { time: '10:30', title: 'Alinhamento Q2', client: 'NuBank', hasBot: true },
  { time: '14:00', title: 'Review campanha', client: 'Bradesco', hasBot: false },
  { time: '16:30', title: 'Aprovação peças', client: 'Itaú', hasBot: true },
];
const JARVIS = [
  { text: 'Bradesco aprova mais rápido nas terças de manhã.', Icon: IconBolt, color: '#22c55e' },
  { text: 'Taxa de aprovação caiu 18% — prazo curto no briefing.', Icon: IconSparkles, color: '#f97316' },
];

function hc(s: number) { return s >= 80 ? '#16a34a' : s >= 60 ? '#d97706' : '#dc2626'; }

export default function DashboardV6Client() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: { xs: 'column', md: 'row' } }}>

      {/* ── LEFT: Priority queue ── */}
      <Box sx={{ width: { md: '42%' }, flexShrink: 0, bgcolor: '#fff', p: { xs: 3, md: 4 }, borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column' }}>
        <Box mb={4}>
          <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#9ca3af', mb: 0.5 }}>
            Foco agora
          </Typography>
          <Typography sx={{ fontSize: '2rem', fontWeight: 900, color: '#111', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            5 coisas que<br />precisam de você.
          </Typography>
          <Typography sx={{ fontSize: '0.8rem', color: '#9ca3af', mt: 0.75, textTransform: 'capitalize' }}>{TODAY}</Typography>
        </Box>

        <Stack spacing={0} flex={1}>
          {ACTIONS.map((a, i) => (
            <Box key={a.n} sx={{ display: 'flex', gap: 2.5, py: 2.5, borderBottom: i < ACTIONS.length - 1 ? '1px solid #f3f4f6' : 'none', cursor: 'pointer', '&:hover': { bgcolor: '#f9fafb', mx: -2, px: 2, borderRadius: 1 }, transition: 'all 0.15s', position: 'relative' }}>
              <Typography sx={{ fontSize: '1.6rem', fontWeight: 900, color: a.color, lineHeight: 1, fontVariantNumeric: 'tabular-nums', opacity: 0.25, width: 44, flexShrink: 0, mt: 0.25 }}>
                {a.n}
              </Typography>
              <Box flex={1} minWidth={0}>
                <Stack direction="row" spacing={0.75} alignItems="center" mb={0.4}>
                  <Chip label={a.urgency} size="small" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 800, bgcolor: `${a.color}12`, color: a.color, border: 'none' }} />
                  <Typography sx={{ fontSize: '0.65rem', color: '#9ca3af' }}>{a.time}</Typography>
                </Stack>
                <Typography sx={{ fontSize: '0.92rem', fontWeight: 700, color: '#111', lineHeight: 1.3 }}>{a.label}</Typography>
                <Typography sx={{ fontSize: '0.75rem', color: '#6b7280', mt: 0.3 }}>{a.detail}</Typography>
              </Box>
            </Box>
          ))}
        </Stack>

        <Box mt={3}>
          <Button startIcon={<IconPlus size={14} />} sx={{ bgcolor: '#111', color: '#fff', '&:hover': { bgcolor: '#333' }, fontSize: '0.78rem', fontWeight: 700, width: '100%' }}>
            Novo Job
          </Button>
        </Box>
      </Box>

      {/* ── RIGHT: Context ── */}
      <Box sx={{ flex: 1, bgcolor: '#f8f9fc', p: { xs: 3, md: 3.5 }, overflowY: 'auto' }}>
        <Stack spacing={2.5}>

          {/* KPIs */}
          <Grid container spacing={1.25}>
            {[
              { label: 'Para hoje', value: 7, color: '#dc2626' },
              { label: 'Aprovações', value: 14, color: '#ea580c' },
              { label: 'Produção', value: 31, color: '#2563eb' },
              { label: 'Saúde média', value: '72%', color: '#16a34a' },
            ].map((k) => (
              <Grid key={k.label} size={{ xs: 6 }}>
                <Box sx={{ bgcolor: '#fff', border: '1px solid #e5e7eb', borderRadius: 2, p: 1.75 }}>
                  <Typography sx={{ fontSize: '1.9rem', fontWeight: 900, color: k.color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{k.value}</Typography>
                  <Typography sx={{ fontSize: '0.72rem', color: '#6b7280', mt: 0.4, fontWeight: 500 }}>{k.label}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>

          {/* Clients */}
          <Box sx={{ bgcolor: '#fff', border: '1px solid #e5e7eb', borderRadius: 2, p: 2 }}>
            <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#9ca3af', mb: 1.5 }}>Clientes</Typography>
            <Stack spacing={0.5}>
              {CLIENTS.map((c) => (
                <Stack key={c.id} direction="row" alignItems="center" spacing={1.25} sx={{ py: 0.75, px: 1, borderRadius: 1.5, cursor: 'pointer', '&:hover': { bgcolor: '#f9fafb' } }}>
                  <Avatar sx={{ width: 28, height: 28, bgcolor: `${c.color}18`, color: c.color, fontSize: '0.62rem', fontWeight: 900 }}>{c.initials}</Avatar>
                  <Box flex={1}>
                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#111' }}>{c.name}</Typography>
                    <Typography sx={{ fontSize: '0.65rem', color: '#9ca3af' }}>{c.jobs} jobs · {c.status}</Typography>
                  </Box>
                  <Typography sx={{ fontSize: '1.1rem', fontWeight: 900, color: hc(c.health), fontVariantNumeric: 'tabular-nums' }}>{c.health}</Typography>
                </Stack>
              ))}
            </Stack>
          </Box>

          {/* Pipeline */}
          <Box sx={{ bgcolor: '#fff', border: '1px solid #e5e7eb', borderRadius: 2, p: 2 }}>
            <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#9ca3af', mb: 1.5 }}>Pipeline</Typography>
            <Stack direction="row" spacing={0.25} sx={{ height: 6, borderRadius: 99, overflow: 'hidden', mb: 1.75 }}>
              {PIPELINE.map((p) => (
                <Tooltip key={p.stage} title={`${p.stage}: ${p.count}`}><Box sx={{ flex: p.count, bgcolor: p.color }} /></Tooltip>
              ))}
            </Stack>
            <Grid container spacing={1}>
              {PIPELINE.map((p) => (
                <Grid key={p.stage} size={2}>
                  <Typography sx={{ fontSize: '1rem', fontWeight: 900, color: p.color, lineHeight: 1 }}>{p.count}</Typography>
                  <Typography sx={{ fontSize: '0.58rem', color: '#9ca3af', textTransform: 'uppercase' }}>{p.stage}</Typography>
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* Agenda */}
          <Box sx={{ bgcolor: '#fff', border: '1px solid #e5e7eb', borderRadius: 2, p: 2 }}>
            <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#9ca3af', mb: 1.5 }}>Agenda</Typography>
            <Stack spacing={1}>
              {MEETINGS.map((m) => (
                <Stack key={m.time} direction="row" spacing={1.25} alignItems="center">
                  <Typography sx={{ fontSize: '0.8rem', fontWeight: 900, color: '#2563eb', width: 40, flexShrink: 0 }}>{m.time}</Typography>
                  <Box flex={1}>
                    <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#111' }}>{m.title}</Typography>
                    <Typography sx={{ fontSize: '0.65rem', color: '#9ca3af' }}>{m.client}</Typography>
                  </Box>
                  {m.hasBot && <Tooltip title="Edro.Studio vai gravar"><Box sx={{ color: '#16a34a' }}><IconMicrophone size={14} /></Box></Tooltip>}
                </Stack>
              ))}
            </Stack>
          </Box>

          {/* Jarvis */}
          <Box sx={{ bgcolor: '#fff', border: '1px solid #e5e7eb', borderRadius: 2, p: 2 }}>
            <Stack direction="row" spacing={0.75} alignItems="center" mb={1.5}>
              <IconSparkles size={13} color="#9ca3af" />
              <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#9ca3af' }}>Jarvis</Typography>
            </Stack>
            <Stack spacing={1}>
              {JARVIS.map((j, i) => (
                <Stack key={i} direction="row" spacing={1} sx={{ p: 1.25, bgcolor: `${j.color}08`, border: `1px solid ${j.color}20`, borderRadius: 1.5 }}>
                  <Box sx={{ color: j.color, flexShrink: 0, mt: 0.1 }}><j.Icon size={13} /></Box>
                  <Typography sx={{ fontSize: '0.73rem', color: '#4b5563', lineHeight: 1.55 }}>{j.text}</Typography>
                </Stack>
              ))}
            </Stack>
          </Box>

        </Stack>
        <Box mt={2}><Typography sx={{ fontSize: '0.62rem', color: '#d1d5db' }}>⚡ Protótipo v6 Split Priority — dados mockados</Typography></Box>
      </Box>
    </Box>
  );
}
