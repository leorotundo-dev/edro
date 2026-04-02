'use client';
// v7 — SCORE CARDS: ESPN/sports broadcast style, big health score as hero
import React from 'react';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { IconAlertTriangle, IconBolt, IconBrain, IconMicrophone, IconPlus, IconSparkles } from '@tabler/icons-react';

const TODAY = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

const CLIENTS = [
  { id: '1', name: 'Bradesco', initials: 'BR', color: '#cc0000', health: 42, status: 'EM RISCO', jobs: 8, approval: 3, overdue: 2, trend: '↓', trendColor: '#ff4444' },
  { id: '2', name: 'NuBank', initials: 'NU', color: '#820ad1', health: 88, status: 'ENGAJADO', jobs: 5, approval: 0, overdue: 0, trend: '↑', trendColor: '#00d084' },
  { id: '3', name: 'Itaú', initials: 'IT', color: '#f5841f', health: 61, status: 'PRESSÃO', jobs: 12, approval: 6, overdue: 1, trend: '→', trendColor: '#ffb700' },
  { id: '4', name: 'Mag. Luiza', initials: 'ML', color: '#0066cc', health: 95, status: 'ENGAJADO', jobs: 3, approval: 1, overdue: 0, trend: '↑', trendColor: '#00d084' },
  { id: '5', name: 'Ambev', initials: 'AM', color: '#d4a017', health: 73, status: 'NEUTRO', jobs: 6, approval: 2, overdue: 0, trend: '→', trendColor: '#ffb700' },
  { id: '6', name: 'Unilever', initials: 'UN', color: '#1a5a9a', health: 55, status: 'PRESSÃO', jobs: 4, approval: 1, overdue: 1, trend: '↓', trendColor: '#ff8800' },
];
const MEETINGS = [
  { time: '10:30', title: 'Alinhamento Q2', client: 'NuBank', hasBot: true },
  { time: '14:00', title: 'Review campanha', client: 'Bradesco', hasBot: false },
  { time: '16:30', title: 'Aprovação peças', client: 'Itaú', hasBot: true },
];
const PIPELINE = [
  { stage: 'Briefing', count: 4, color: '#a78bfa' },
  { stage: 'Copy IA', count: 7, color: '#60a5fa' },
  { stage: 'Aprovação', count: 14, color: '#fb923c' },
  { stage: 'Produção', count: 31, color: '#38bdf8' },
  { stage: 'Revisão', count: 8, color: '#fbbf24' },
  { stage: 'Entrega', count: 3, color: '#34d399' },
];
const JARVIS = [
  { text: 'Bradesco aprova mais rápido nas terças de manhã — reenviar agora.', Icon: IconBolt, color: '#34d399' },
  { text: 'NuBank em 40min. Edro.Studio vai gravar automaticamente.', Icon: IconBrain, color: '#60a5fa' },
  { text: 'Taxa de aprovação caiu 18% essa semana.', Icon: IconAlertTriangle, color: '#fb923c' },
];

function hc(s: number) { return s >= 80 ? '#00d084' : s >= 60 ? '#ffb700' : '#ff4444'; }
function statusBg(s: string) {
  if (s === 'EM RISCO') return 'linear-gradient(135deg, #450a0a 0%, #1a0404 100%)';
  if (s === 'ENGAJADO') return 'linear-gradient(135deg, #052e16 0%, #041a0e 100%)';
  return 'linear-gradient(135deg, #1c1917 0%, #0f0f0f 100%)';
}

export default function DashboardV7Client() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#080d18', color: '#fff', p: { xs: 2, md: 3 } }}>

      {/* Header — broadcast style */}
      <Box sx={{ background: 'linear-gradient(90deg, #0f1a2e 0%, #080d18 100%)', borderBottom: '1px solid #1e2d42', px: 3, py: 2, mx: -3, mt: -3, mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={2} alignItems="center">
            <Box sx={{ width: 4, height: 32, bgcolor: '#3b82f6', borderRadius: 1 }} />
            <Box>
              <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#3b82f6' }}>EDRO OPERATIONS</Typography>
              <Typography sx={{ fontSize: '1.1rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.01em' }}>Central de Operações</Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={2} alignItems="center">
            <Stack direction="row" spacing={1.5}>
              {[{ label: '7', sub: 'hoje', color: '#ff4444' }, { label: '14', sub: 'aprov.', color: '#ff8800' }, { label: '31', sub: 'em prod.', color: '#3b82f6' }].map((k) => (
                <Box key={k.label} sx={{ textAlign: 'center' }}>
                  <Typography sx={{ fontSize: '1.4rem', fontWeight: 900, color: k.color, lineHeight: 1 }}>{k.label}</Typography>
                  <Typography sx={{ fontSize: '0.58rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{k.sub}</Typography>
                </Box>
              ))}
            </Stack>
            <Button size="small" startIcon={<IconPlus size={14} />} sx={{ bgcolor: '#3b82f6', color: '#fff', '&:hover': { bgcolor: '#2563eb' }, fontWeight: 700, fontSize: '0.78rem' }}>
              Novo Job
            </Button>
          </Stack>
        </Stack>
      </Box>

      {/* Score cards grid */}
      <Box mb={3}>
        <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#475569', mb: 2 }}>
          Score Board — Saúde por Cliente
        </Typography>
        <Grid container spacing={1.5}>
          {CLIENTS.map((c) => {
            const score = hc(c.health);
            return (
              <Grid key={c.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <Box sx={{
                  background: statusBg(c.status),
                  border: `1px solid ${score}20`,
                  borderTop: `3px solid ${score}`,
                  borderRadius: 2,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 12px 40px ${score}15` },
                }}>
                  {/* Card header */}
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2.5, pt: 2.5, pb: 1 }}>
                    <Stack direction="row" spacing={1.25} alignItems="center">
                      <Avatar sx={{ width: 36, height: 36, bgcolor: `${c.color}25`, color: c.color, fontSize: '0.72rem', fontWeight: 900, border: `1.5px solid ${c.color}40` }}>
                        {c.initials}
                      </Avatar>
                      <Box>
                        <Typography sx={{ fontSize: '0.95rem', fontWeight: 900, color: '#fff' }}>{c.name}</Typography>
                        <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', color: score, textTransform: 'uppercase' }}>
                          {c.status}
                        </Typography>
                      </Box>
                    </Stack>
                    <Stack alignItems="center">
                      <Typography sx={{ fontSize: '0.6rem', color: '#475569', letterSpacing: '0.1em', textTransform: 'uppercase' }}>TREND</Typography>
                      <Typography sx={{ fontSize: '1.4rem', fontWeight: 900, color: c.trendColor, lineHeight: 1 }}>{c.trend}</Typography>
                    </Stack>
                  </Stack>

                  {/* Hero score */}
                  <Box sx={{ textAlign: 'center', py: 2 }}>
                    <Typography sx={{ fontSize: '5rem', fontWeight: 900, color: score, lineHeight: 1, letterSpacing: '-0.05em', fontVariantNumeric: 'tabular-nums' }}>
                      {c.health}
                    </Typography>
                    <Typography sx={{ fontSize: '0.62rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.12em', mt: 0.25 }}>SAÚDE</Typography>
                  </Box>

                  {/* Stats row */}
                  <Stack direction="row" sx={{ borderTop: '1px solid rgba(255,255,255,0.06)', px: 2.5, py: 1.5 }} spacing={0}>
                    {[
                      { label: 'JOBS', value: c.jobs, color: '#94a3b8' },
                      { label: 'APROV', value: c.approval, color: c.approval > 0 ? '#fb923c' : '#94a3b8' },
                      { label: 'LATE', value: c.overdue, color: c.overdue > 0 ? '#ff4444' : '#94a3b8' },
                    ].map((s, i) => (
                      <Box key={s.label} flex={1} textAlign="center" sx={{ borderRight: i < 2 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                        <Typography sx={{ fontSize: '1.2rem', fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</Typography>
                        <Typography sx={{ fontSize: '0.58rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</Typography>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </Box>

      {/* Bottom strip: pipeline + agenda + jarvis */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Box sx={{ bgcolor: '#0f1520', border: '1px solid #1e2d42', borderRadius: 2, p: 2.5 }}>
            <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#475569', mb: 1.75 }}>Pipeline</Typography>
            <Stack direction="row" spacing={0.3} sx={{ height: 8, borderRadius: 99, overflow: 'hidden', mb: 2 }}>
              {PIPELINE.map((p) => (
                <Tooltip key={p.stage} title={`${p.stage}: ${p.count}`}><Box sx={{ flex: p.count, bgcolor: p.color }} /></Tooltip>
              ))}
            </Stack>
            <Grid container spacing={1}>
              {PIPELINE.map((p) => (
                <Grid key={p.stage} size={4}>
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: p.color, flexShrink: 0 }} />
                    <Box>
                      <Typography sx={{ fontSize: '1rem', fontWeight: 900, color: p.color, lineHeight: 1 }}>{p.count}</Typography>
                      <Typography sx={{ fontSize: '0.58rem', color: '#475569', textTransform: 'uppercase' }}>{p.stage}</Typography>
                    </Box>
                  </Stack>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <Box sx={{ bgcolor: '#0f1520', border: '1px solid #1e2d42', borderRadius: 2, p: 2.5 }}>
            <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#475569', mb: 1.75 }}>Agenda</Typography>
            <Stack spacing={1.25}>
              {MEETINGS.map((m) => (
                <Stack key={m.time} direction="row" spacing={1.25} alignItems="center">
                  <Typography sx={{ fontSize: '0.8rem', fontWeight: 900, color: '#60a5fa', width: 40, flexShrink: 0 }}>{m.time}</Typography>
                  <Box flex={1} minWidth={0}>
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</Typography>
                    <Typography sx={{ fontSize: '0.62rem', color: '#475569' }}>{m.client}</Typography>
                  </Box>
                  {m.hasBot && <Tooltip title="Gravando"><Box sx={{ color: '#34d399' }}><IconMicrophone size={14} /></Box></Tooltip>}
                </Stack>
              ))}
            </Stack>
          </Box>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Box sx={{ bgcolor: '#0f1520', border: '1px solid #1e2d42', borderRadius: 2, p: 2.5 }}>
            <Stack direction="row" spacing={0.75} alignItems="center" mb={1.75}>
              <IconSparkles size={13} color="#475569" />
              <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#475569' }}>Jarvis</Typography>
            </Stack>
            <Stack spacing={1}>
              {JARVIS.map((j, i) => (
                <Box key={i} sx={{ p: 1.25, bgcolor: `${j.color}08`, border: `1px solid ${j.color}20`, borderRadius: 1.5 }}>
                  <Stack direction="row" spacing={0.75}>
                    <Box sx={{ color: j.color, flexShrink: 0, mt: 0.1 }}><j.Icon size={13} /></Box>
                    <Typography sx={{ fontSize: '0.7rem', color: '#94a3b8', lineHeight: 1.55 }}>{j.text}</Typography>
                  </Stack>
                </Box>
              ))}
            </Stack>
          </Box>
        </Grid>
      </Grid>

      <Box mt={3}><Typography sx={{ fontSize: '0.62rem', color: '#1e2d42' }}>⚡ Protótipo v7 Score Cards — dados mockados</Typography></Box>
    </Box>
  );
}
