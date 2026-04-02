'use client';
// v4 — HEATMAP: clients as colored blocks, health = color intensity
import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { IconAlertTriangle, IconBolt, IconBrain, IconPlus, IconSparkles } from '@tabler/icons-react';

const TODAY = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

const CLIENTS = [
  { id: '1', name: 'Bradesco', initials: 'BR', health: 42, temp: 'at_risk', jobs: 8, approval: 3, overdue: 2, deadline: 'Hoje 18h', pulse: 'Aprovação vencida. Cliente pressionando.', size: 2 },
  { id: '2', name: 'NuBank', initials: 'NU', health: 88, temp: 'engaged', jobs: 5, approval: 0, overdue: 0, deadline: 'Sex 12h', pulse: 'Reunião agendada. Tudo ok.', size: 1 },
  { id: '3', name: 'Itaú', initials: 'IT', health: 61, temp: 'pressured', jobs: 12, approval: 6, overdue: 1, deadline: 'Amanhã 9h', pulse: '3 copies paradas há 48h.', size: 2 },
  { id: '4', name: 'Mag. Luiza', initials: 'ML', health: 95, temp: 'engaged', jobs: 3, approval: 1, overdue: 0, deadline: 'Seg 10h', pulse: 'Campanha aprovada. Em produção.', size: 1 },
  { id: '5', name: 'Ambev', initials: 'AM', health: 73, temp: 'neutral', jobs: 6, approval: 2, overdue: 0, deadline: 'Sex 17h', pulse: 'Aguardando briefing Q2.', size: 1 },
  { id: '6', name: 'Unilever', initials: 'UN', health: 55, temp: 'pressured', jobs: 4, approval: 1, overdue: 1, deadline: 'Hoje 20h', pulse: 'Peça OOH precisa de aprovação urgente.', size: 1 },
];
const PIPELINE = [
  { stage: 'Briefing', count: 4, color: '#8b5cf6' },
  { stage: 'Copy IA', count: 7, color: '#3b82f6' },
  { stage: 'Aprovação', count: 14, color: '#f97316' },
  { stage: 'Produção', count: 31, color: '#0ea5e9' },
  { stage: 'Revisão', count: 8, color: '#eab308' },
  { stage: 'Entrega', count: 3, color: '#22c55e' },
];
const JARVIS = [
  { id: 1, text: 'Bradesco aprova mais nas terças de manhã.', type: 'tip', Icon: IconBolt },
  { id: 2, text: 'NuBank em 40min. Bot vai gravar.', type: 'info', Icon: IconBrain },
  { id: 3, text: 'Taxa de aprovação caiu 18% essa semana.', type: 'alert', Icon: IconAlertTriangle },
];
const total = PIPELINE.reduce((s, p) => s + p.count, 0);

function healthBg(h: number, t: string) {
  if (t === 'at_risk') return { bg: '#7f1d1d', text: '#fca5a5', sub: '#fca5a580' };
  if (h >= 80) return { bg: '#14532d', text: '#86efac', sub: '#86efac80' };
  if (h >= 60) return { bg: '#713f12', text: '#fde68a', sub: '#fde68a80' };
  return { bg: '#7f1d1d', text: '#fca5a5', sub: '#fca5a580' };
}

export default function DashboardV4Client() {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0f0f0f', color: '#fff', p: { xs: 2, md: 3 } }}>

      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography sx={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>Central de Operações</Typography>
          <Typography sx={{ fontSize: '0.75rem', color: '#555', textTransform: 'capitalize' }}>{TODAY}</Typography>
        </Box>
        <Button size="small" startIcon={<IconPlus size={14} />} sx={{ bgcolor: '#fff', color: '#000', '&:hover': { bgcolor: '#ddd' }, fontWeight: 700, fontSize: '0.78rem' }}>
          Novo Job
        </Button>
      </Stack>

      {/* Heatmap grid */}
      <Box mb={3}>
        <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#555', mb: 1.5 }}>
          Mapa de Saúde — {CLIENTS.length} clientes
        </Typography>
        <Grid container spacing={1.5}>
          {CLIENTS.map((c) => {
            const colors = healthBg(c.health, c.temp);
            const isHovered = hovered === c.id;
            return (
              <Grid key={c.id} size={{ xs: 12, sm: c.size === 2 ? 6 : 4, md: c.size === 2 ? 4 : 2 }}>
                <Box
                  onMouseEnter={() => setHovered(c.id)}
                  onMouseLeave={() => setHovered(null)}
                  sx={{
                    bgcolor: colors.bg,
                    borderRadius: 2,
                    p: 2.5,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    minHeight: 130,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    border: `1px solid ${colors.text}20`,
                    transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                    boxShadow: isHovered ? `0 8px 32px ${colors.bg}80` : 'none',
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: colors.sub, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        {c.temp === 'at_risk' ? '⚠ Em risco' : c.temp === 'pressured' ? '↑ Pressionado' : c.temp === 'engaged' ? '✓ Engajado' : '— Neutro'}
                      </Typography>
                      <Typography sx={{ fontSize: '1.1rem', fontWeight: 900, color: colors.text, mt: 0.25 }}>{c.name}</Typography>
                    </Box>
                    <Typography sx={{ fontSize: '2.5rem', fontWeight: 900, color: colors.text, lineHeight: 1, letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums', opacity: 0.9 }}>
                      {c.health}
                    </Typography>
                  </Stack>

                  {isHovered && (
                    <Box sx={{ mt: 1.5 }}>
                      <Typography sx={{ fontSize: '0.72rem', color: colors.sub, lineHeight: 1.5, mb: 1 }}>{c.pulse}</Typography>
                      <Stack direction="row" spacing={1.5}>
                        <Typography sx={{ fontSize: '0.65rem', color: colors.sub }}>{c.jobs} jobs</Typography>
                        {c.approval > 0 && <Typography sx={{ fontSize: '0.65rem', color: colors.text, fontWeight: 700 }}>{c.approval} aprov.</Typography>}
                        {c.overdue > 0 && <Typography sx={{ fontSize: '0.65rem', color: '#f87171', fontWeight: 700 }}>{c.overdue} atrasado</Typography>}
                        <Typography sx={{ fontSize: '0.65rem', color: colors.sub }}>· {c.deadline}</Typography>
                      </Stack>
                    </Box>
                  )}

                  {!isHovered && (
                    <Stack direction="row" spacing={1.5} mt={1}>
                      <Typography sx={{ fontSize: '0.65rem', color: colors.sub }}>{c.jobs} jobs</Typography>
                      {c.overdue > 0 && <Typography sx={{ fontSize: '0.65rem', color: '#f87171', fontWeight: 700 }}>· {c.overdue} atrasado</Typography>}
                    </Stack>
                  )}
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </Box>

      {/* Pipeline bar */}
      <Box mb={3}>
        <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#555', mb: 1.5 }}>
          Pipeline — {total} demandas
        </Typography>
        <Stack direction="row" spacing={0.25} sx={{ height: 10, borderRadius: 99, overflow: 'hidden', mb: 2 }}>
          {PIPELINE.map((p) => (
            <Tooltip key={p.stage} title={`${p.stage}: ${p.count}`} placement="top">
              <Box sx={{ flex: p.count, bgcolor: p.color, cursor: 'pointer', '&:hover': { opacity: 0.75 } }} />
            </Tooltip>
          ))}
        </Stack>
        <Grid container spacing={1}>
          {PIPELINE.map((p) => (
            <Grid key={p.stage} size={{ xs: 4, sm: 2 }}>
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: p.color }} />
                <Box>
                  <Typography sx={{ fontSize: '1.2rem', fontWeight: 900, color: p.color, lineHeight: 1 }}>{p.count}</Typography>
                  <Typography sx={{ fontSize: '0.58rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{p.stage}</Typography>
                </Box>
              </Stack>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Jarvis */}
      <Box>
        <Stack direction="row" alignItems="center" spacing={0.75} mb={1.5}>
          <IconSparkles size={13} color="#555" />
          <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#555' }}>Jarvis</Typography>
        </Stack>
        <Grid container spacing={1.5}>
          {JARVIS.map((j) => {
            const c = j.type === 'alert' ? '#f97316' : j.type === 'tip' ? '#22c55e' : '#3b82f6';
            return (
              <Grid key={j.id} size={{ xs: 12, sm: 4 }}>
                <Box sx={{ p: 1.75, bgcolor: `${c}10`, border: `1px solid ${c}25`, borderRadius: 2 }}>
                  <Box sx={{ color: c, mb: 0.75 }}><j.Icon size={14} /></Box>
                  <Typography sx={{ fontSize: '0.75rem', color: '#aaa', lineHeight: 1.6 }}>{j.text}</Typography>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </Box>

      <Box mt={3}><Typography sx={{ fontSize: '0.62rem', color: '#333' }}>⚡ Protótipo v4 Heatmap — dados mockados</Typography></Box>
    </Box>
  );
}
