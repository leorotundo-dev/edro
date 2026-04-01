'use client';
// v3 — EDITORIAL: large typography, warm white, minimal color
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
import { IconAlertTriangle, IconBolt, IconBrain, IconCheck, IconClock, IconFileText, IconLayoutKanban, IconMessageCircle, IconMicrophone, IconPlus, IconSparkles, IconTrendingUp } from '@tabler/icons-react';

const TODAY = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

const CLIENTS = [
  { id: '1', name: 'Bradesco', initials: 'BR', color: '#cc0000', health: 42, temp: 'at_risk', tempLabel: 'Em risco', jobs: 8, approval: 3, overdue: 2, deadline: 'Hoje 18h', pulse: 'Aprovação vencida — cliente pressionando.' },
  { id: '2', name: 'NuBank', initials: 'NU', color: '#820ad1', health: 88, temp: 'engaged', tempLabel: 'Engajado', jobs: 5, approval: 0, overdue: 0, deadline: 'Sex 12h', pulse: 'Reunião de alinhamento agendada.' },
  { id: '3', name: 'Itaú', initials: 'IT', color: '#f5841f', health: 61, temp: 'pressured', tempLabel: 'Pressionado', jobs: 12, approval: 6, overdue: 1, deadline: 'Amanhã 9h', pulse: '3 copies sem resposta há 48h.' },
  { id: '4', name: 'Mag. Luiza', initials: 'ML', color: '#0066cc', health: 95, temp: 'engaged', tempLabel: 'Engajado', jobs: 3, approval: 1, overdue: 0, deadline: 'Seg 10h', pulse: 'Campanha de Páscoa aprovada.' },
  { id: '5', name: 'Ambev', initials: 'AM', color: '#d4a017', health: 73, temp: 'neutral', tempLabel: 'Neutro', jobs: 6, approval: 2, overdue: 0, deadline: 'Sex 17h', pulse: 'Aguardando briefing Q2.' },
  { id: '6', name: 'Unilever', initials: 'UN', color: '#1a5a9a', health: 55, temp: 'pressured', tempLabel: 'Pressionado', jobs: 4, approval: 1, overdue: 1, deadline: 'Hoje 20h', pulse: 'Peça OOH precisa de aprovação.' },
];
const KPI = [
  { label: 'entregas\nhoje', value: 7, color: '#cc2200' },
  { label: 'aguardando\naprovação', value: 14, color: '#c45000' },
  { label: 'em\nprodução', value: 31, color: '#1a56cc' },
  { label: 'saúde\nmédia', value: '72%', color: '#157a3c' },
];
const PRIORITIES = [
  { label: 'Reenviar aprovação Bradesco — venceu ontem', client: 'Bradesco', color: '#cc2200' },
  { label: 'Preparar pauta para reunião NuBank 10:30', client: 'NuBank', color: '#c45000' },
  { label: 'Resolver 3 copies Itaú parados há 48h', client: 'Itaú', color: '#c45000' },
  { label: 'Atribuir responsável para 4 jobs sem dono', client: 'Sistema', color: '#666' },
  { label: 'Revisar aprovação Unilever — OOH vence hoje', client: 'Unilever', color: '#666' },
];
const PIPELINE = [
  { stage: 'Briefing', count: 4, color: '#8b5cf6' },
  { stage: 'Copy IA', count: 7, color: '#1a56cc' },
  { stage: 'Aprovação', count: 14, color: '#c45000' },
  { stage: 'Produção', count: 31, color: '#0ea5e9' },
  { stage: 'Revisão', count: 8, color: '#d4a017' },
  { stage: 'Entrega', count: 3, color: '#157a3c' },
];
const JARVIS = [
  { id: 1, text: 'Bradesco aprova mais nas terças — reenviar agora pode acelerar.', type: 'tip', Icon: IconBolt },
  { id: 2, text: 'NuBank em 40min. Edro.Studio vai gravar automaticamente.', type: 'info', Icon: IconBrain },
  { id: 3, text: 'Taxa de aprovação caiu 18%. Causa: prazo curto no briefing.', type: 'alert', Icon: IconAlertTriangle },
];

function hc(s: number) { return s >= 80 ? '#157a3c' : s >= 60 ? '#b07a00' : '#cc2200'; }
function tc(t: string) { return t === 'at_risk' ? '#cc2200' : t === 'pressured' ? '#c45000' : t === 'engaged' ? '#157a3c' : '#888'; }

export default function DashboardV3Client() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#fafaf8', color: '#111', p: { xs: 2, md: 4 } }}>

      {/* Header */}
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'flex-end' }} mb={4}>
        <Box>
          <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#999', mb: 0.5 }}>
            Central de Operações
          </Typography>
          <Typography sx={{ fontSize: '2.8rem', fontWeight: 900, lineHeight: 1, letterSpacing: '-0.03em', color: '#111' }}>
            Bom dia, Leo.
          </Typography>
          <Typography sx={{ fontSize: '0.9rem', color: '#888', mt: 0.75, textTransform: 'capitalize' }}>{TODAY}</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" size="small" sx={{ borderColor: '#ddd', color: '#666', fontSize: '0.78rem' }}>
            Atualizar
          </Button>
          <Button size="small" startIcon={<IconPlus size={14} />} sx={{ bgcolor: '#111', color: '#fff', '&:hover': { bgcolor: '#333' }, fontSize: '0.78rem', px: 2 }}>
            Novo Job
          </Button>
        </Stack>
      </Stack>

      <Divider sx={{ mb: 4, borderColor: '#e8e8e4' }} />

      {/* KPI strip — editorial large numbers */}
      <Grid container spacing={0} mb={5} sx={{ borderLeft: '1px solid #e8e8e4' }}>
        {KPI.map((k, i) => (
          <Grid key={k.label} size={{ xs: 6, sm: 3 }}>
            <Box sx={{ px: 3, py: 2, borderRight: '1px solid #e8e8e4' }}>
              <Typography sx={{ fontSize: '3.5rem', fontWeight: 900, color: k.color, lineHeight: 1, letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums' }}>
                {k.value}
              </Typography>
              <Typography sx={{ fontSize: '0.72rem', color: '#999', mt: 0.5, whiteSpace: 'pre-line', lineHeight: 1.4, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                {k.label}
              </Typography>
            </Box>
          </Grid>
        ))}
      </Grid>

      {/* Client strip — horizontal scroll */}
      <Box mb={5}>
        <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#bbb', mb: 1.5 }}>
          Clientes
        </Typography>
        <Stack direction="row" spacing={1.5} sx={{ overflowX: 'auto', pb: 1, '&::-webkit-scrollbar': { height: 4 }, '&::-webkit-scrollbar-track': { bgcolor: '#f0f0ec' }, '&::-webkit-scrollbar-thumb': { bgcolor: '#ccc', borderRadius: 2 } }}>
          {CLIENTS.map((c) => (
            <Box key={c.id} sx={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 1.25, px: 1.75, py: 1.25, border: `1.5px solid ${c.overdue > 0 || c.temp === 'at_risk' ? tc(c.temp) + '40' : '#e8e8e4'}`, borderRadius: 2, cursor: 'pointer', bgcolor: c.overdue > 0 || c.temp === 'at_risk' ? `${tc(c.temp)}06` : '#fff', '&:hover': { borderColor: '#ccc', bgcolor: '#f5f5f2' }, transition: 'all 0.15s' }}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: `${c.color}18`, color: c.color, fontSize: '0.68rem', fontWeight: 900 }}>{c.initials}</Avatar>
              <Box>
                <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: '#111', lineHeight: 1.2 }}>{c.name}</Typography>
                <Stack direction="row" spacing={0.5} alignItems="center" mt={0.2}>
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: tc(c.temp) }} />
                  <Typography sx={{ fontSize: '0.65rem', color: '#888', fontVariantNumeric: 'tabular-nums' }}>saúde {c.health}</Typography>
                </Stack>
              </Box>
            </Box>
          ))}
        </Stack>
      </Box>

      <Divider sx={{ mb: 4, borderColor: '#e8e8e4' }} />

      {/* Three-column layout */}
      <Grid container spacing={5}>

        {/* Priorities */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#bbb', mb: 2 }}>
            Prioridades agora
          </Typography>
          <Stack spacing={2.5}>
            {PRIORITIES.map((p, i) => (
              <Box key={p.label} sx={{ display: 'flex', gap: 2, cursor: 'pointer', '&:hover .p-action': { opacity: 1 } }}>
                <Typography sx={{ fontSize: '2rem', fontWeight: 900, color: p.color, lineHeight: 1, width: 40, flexShrink: 0, fontVariantNumeric: 'tabular-nums', opacity: 0.35 }}>
                  {String(i + 1).padStart(2, '0')}
                </Typography>
                <Box>
                  <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: '#222', lineHeight: 1.4 }}>{p.label}</Typography>
                  <Typography sx={{ fontSize: '0.68rem', color: '#999', mt: 0.3 }}>{p.client}</Typography>
                </Box>
              </Box>
            ))}
          </Stack>
        </Grid>

        {/* Pipeline */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#bbb', mb: 2 }}>
            Pipeline
          </Typography>
          <Stack spacing={1.5}>
            {PIPELINE.map((p) => (
              <Box key={p.stage}>
                <Stack direction="row" justifyContent="space-between" alignItems="baseline" mb={0.5}>
                  <Typography sx={{ fontSize: '0.78rem', color: '#555', fontWeight: 500 }}>{p.stage}</Typography>
                  <Typography sx={{ fontSize: '1.4rem', fontWeight: 900, color: p.color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{p.count}</Typography>
                </Stack>
                <Box sx={{ height: 2, bgcolor: '#eee', borderRadius: 1, overflow: 'hidden' }}>
                  <Box sx={{ height: '100%', width: `${Math.min(100, (p.count / 31) * 100)}%`, bgcolor: p.color, borderRadius: 1 }} />
                </Box>
              </Box>
            ))}
          </Stack>
        </Grid>

        {/* Jarvis */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Stack direction="row" alignItems="center" spacing={0.75} mb={2}>
            <IconSparkles size={13} color="#999" />
            <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#bbb' }}>
              Jarvis
            </Typography>
          </Stack>
          <Stack spacing={2}>
            {JARVIS.map((j) => {
              const c = j.type === 'alert' ? '#c45000' : j.type === 'tip' ? '#157a3c' : '#1a56cc';
              return (
                <Box key={j.id} sx={{ pl: 1.5, borderLeft: `2px solid ${c}40` }}>
                  <Typography sx={{ fontSize: '0.78rem', color: '#444', lineHeight: 1.6 }}>{j.text}</Typography>
                </Box>
              );
            })}
          </Stack>
        </Grid>
      </Grid>

      <Divider sx={{ my: 4, borderColor: '#e8e8e4' }} />
      <Typography sx={{ fontSize: '0.65rem', color: '#ccc' }}>⚡ Protótipo v3 Editorial — dados mockados</Typography>
    </Box>
  );
}
