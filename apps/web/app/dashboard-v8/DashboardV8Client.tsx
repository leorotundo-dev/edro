'use client';
// v8 — SWIMLANE: clients as horizontal lanes, jobs flow through pipeline stages
import React, { useState } from 'react';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { IconAlertTriangle, IconBolt, IconBrain, IconPlus, IconSparkles } from '@tabler/icons-react';

const TODAY = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

const STAGES = [
  { key: 'briefing', label: 'Briefing', color: '#8b5cf6' },
  { key: 'copy', label: 'Copy IA', color: '#3b82f6' },
  { key: 'approval', label: 'Aprovação', color: '#f97316' },
  { key: 'production', label: 'Produção', color: '#0ea5e9' },
  { key: 'review', label: 'Revisão', color: '#eab308' },
  { key: 'done', label: 'Entrega', color: '#22c55e' },
];

const CLIENTS: Array<{
  id: string; name: string; initials: string; color: string; health: number;
  temp: string; deadline: string;
  jobs: Record<string, Array<{ id: string; title: string; urgent?: boolean }>>;
}> = [
  {
    id: '1', name: 'Bradesco', initials: 'BR', color: '#dc2626', health: 42, temp: 'at_risk', deadline: 'Hoje 18h',
    jobs: {
      briefing: [],
      copy: [{ id: 'b1', title: 'Copy Páscoa', urgent: true }, { id: 'b2', title: 'Email CRM' }],
      approval: [{ id: 'b3', title: 'Banner digital', urgent: true }, { id: 'b4', title: 'Post feed' }, { id: 'b5', title: 'Story promo' }],
      production: [{ id: 'b6', title: 'OOH Campanha' }, { id: 'b7', title: 'Print PDF' }],
      review: [{ id: 'b8', title: 'Relatório Q1' }],
      done: [],
    },
  },
  {
    id: '2', name: 'NuBank', initials: 'NU', color: '#7c3aed', health: 88, temp: 'engaged', deadline: 'Sex 12h',
    jobs: {
      briefing: [{ id: 'n1', title: 'Campanha Q2' }],
      copy: [{ id: 'n2', title: 'Blog post' }],
      approval: [{ id: 'n3', title: 'Banner social' }],
      production: [{ id: 'n4', title: 'Vídeo institucional' }, { id: 'n5', title: 'Reels série' }],
      review: [],
      done: [{ id: 'n6', title: 'Email boas-vindas' }],
    },
  },
  {
    id: '3', name: 'Itaú', initials: 'IT', color: '#ea580c', health: 61, temp: 'pressured', deadline: 'Amanhã 9h',
    jobs: {
      briefing: [{ id: 'i1', title: 'Campanha junho' }, { id: 'i2', title: 'Peças OOH' }],
      copy: [{ id: 'i3', title: 'Copy app', urgent: true }, { id: 'i4', title: 'SMS CRM', urgent: true }, { id: 'i5', title: 'Email promo' }],
      approval: [{ id: 'i6', title: 'Feed posts' }, { id: 'i7', title: 'Stories' }, { id: 'i8', title: 'Banner' }, { id: 'i9', title: 'Pop-up web' }],
      production: [{ id: 'i10', title: 'Motion logo' }, { id: 'i11', title: 'PDF relatório' }, { id: 'i12', title: 'Print folders' }],
      review: [{ id: 'i13', title: 'Vídeo brand' }],
      done: [],
    },
  },
  {
    id: '4', name: 'Mag. Luiza', initials: 'ML', color: '#2563eb', health: 95, temp: 'engaged', deadline: 'Seg 10h',
    jobs: {
      briefing: [],
      copy: [{ id: 'm1', title: 'Campanha Páscoa' }],
      approval: [{ id: 'm2', title: 'Posts promoção' }],
      production: [{ id: 'm3', title: 'Banner e-comm' }],
      review: [],
      done: [{ id: 'm4', title: 'Email semana' }, { id: 'm5', title: 'Story flash' }],
    },
  },
  {
    id: '5', name: 'Ambev', initials: 'AM', color: '#ca8a04', health: 73, temp: 'neutral', deadline: 'Sex 17h',
    jobs: {
      briefing: [{ id: 'a1', title: 'Briefing Q2' }],
      copy: [{ id: 'a2', title: 'Campanha verão' }],
      approval: [{ id: 'a3', title: 'Peças PDV' }, { id: 'a4', title: 'Banner digital' }],
      production: [{ id: 'a5', title: 'Vídeo 15s' }, { id: 'a6', title: 'Print cartaz' }],
      review: [],
      done: [],
    },
  },
];

function hc(s: number) { return s >= 80 ? '#16a34a' : s >= 60 ? '#d97706' : '#dc2626'; }
function tc(t: string) { return t === 'at_risk' ? '#dc2626' : t === 'pressured' ? '#ea580c' : t === 'engaged' ? '#16a34a' : '#94a3b8'; }
function totalJobs(c: typeof CLIENTS[0]) { return Object.values(c.jobs).reduce((s, arr) => s + arr.length, 0); }

export default function DashboardV8Client() {
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', color: '#111' }}>

      {/* Header */}
      <Box sx={{ bgcolor: '#fff', borderBottom: '1px solid #e2e8f0', px: 3, py: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography sx={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
              Pipeline por Cliente
            </Typography>
            <Typography sx={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'capitalize' }}>{TODAY}</Typography>
          </Box>
          <Stack direction="row" spacing={1.5} alignItems="center">
            {[{ v: 7, l: 'hoje', c: '#dc2626' }, { v: 14, l: 'aprovação', c: '#ea580c' }, { v: 31, l: 'produção', c: '#2563eb' }].map((k) => (
              <Box key={k.l} sx={{ textAlign: 'center' }}>
                <Typography sx={{ fontSize: '1.3rem', fontWeight: 900, color: k.c, lineHeight: 1 }}>{k.v}</Typography>
                <Typography sx={{ fontSize: '0.6rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{k.l}</Typography>
              </Box>
            ))}
            <Button size="small" startIcon={<IconPlus size={14} />} sx={{ bgcolor: '#0f172a', color: '#fff', '&:hover': { bgcolor: '#1e293b' }, fontWeight: 700, fontSize: '0.78rem', ml: 1 }}>
              Novo Job
            </Button>
          </Stack>
        </Stack>
      </Box>

      {/* Swimlane table */}
      <Box sx={{ overflowX: 'auto' }}>
        <Box sx={{ minWidth: 900 }}>

          {/* Stage header row */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '200px repeat(6, 1fr)', bgcolor: '#fff', borderBottom: '2px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 10 }}>
            <Box sx={{ p: 1.5, borderRight: '1px solid #e2e8f0' }}>
              <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#94a3b8' }}>Cliente</Typography>
            </Box>
            {STAGES.map((s) => (
              <Box key={s.key} sx={{ p: 1.5, borderRight: '1px solid #f1f5f9', borderTop: `3px solid ${s.color}`, textAlign: 'center' }}>
                <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: s.color }}>{s.label}</Typography>
              </Box>
            ))}
          </Box>

          {/* Client rows */}
          {CLIENTS.map((c, ci) => (
            <Box key={c.id} sx={{ display: 'grid', gridTemplateColumns: '200px repeat(6, 1fr)', borderBottom: '1px solid #e2e8f0', bgcolor: ci % 2 === 0 ? '#fff' : '#f8fafc', '&:hover': { bgcolor: '#f0f9ff' }, transition: 'bgcolor 0.1s' }}>

              {/* Client info cell */}
              <Box sx={{ p: 1.75, borderRight: '1px solid #e2e8f0', borderLeft: `4px solid ${tc(c.temp)}`, display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <Avatar sx={{ width: 30, height: 30, bgcolor: `${c.color}18`, color: c.color, fontSize: '0.62rem', fontWeight: 900, flexShrink: 0 }}>{c.initials}</Avatar>
                <Box minWidth={0}>
                  <Typography sx={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</Typography>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: hc(c.health) }}>{c.health}</Typography>
                    <Typography sx={{ fontSize: '0.62rem', color: '#94a3b8' }}>· {totalJobs(c)} jobs</Typography>
                  </Stack>
                  <Typography sx={{ fontSize: '0.6rem', color: c.deadline.includes('Hoje') ? '#dc2626' : '#94a3b8', fontWeight: c.deadline.includes('Hoje') ? 700 : 400 }}>
                    {c.deadline}
                  </Typography>
                </Box>
              </Box>

              {/* Stage cells */}
              {STAGES.map((s) => {
                const jobs = c.jobs[s.key] || [];
                const cellKey = `${c.id}-${s.key}`;
                const isHovered = hoveredCell === cellKey;
                return (
                  <Box
                    key={s.key}
                    onMouseEnter={() => setHoveredCell(cellKey)}
                    onMouseLeave={() => setHoveredCell(null)}
                    sx={{ p: 1.25, borderRight: '1px solid #f1f5f9', verticalAlign: 'top', minHeight: 72, cursor: jobs.length > 0 ? 'pointer' : 'default' }}
                  >
                    {jobs.length === 0 ? (
                      <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography sx={{ fontSize: '0.65rem', color: '#e2e8f0' }}>—</Typography>
                      </Box>
                    ) : (
                      <Stack spacing={0.4}>
                        {jobs.slice(0, isHovered ? jobs.length : 3).map((job) => (
                          <Box key={job.id} sx={{
                            px: 0.75, py: 0.4, borderRadius: 1,
                            bgcolor: job.urgent ? `${s.color}18` : `${s.color}0c`,
                            border: `1px solid ${job.urgent ? s.color + '40' : s.color + '1a'}`,
                          }}>
                            <Typography sx={{ fontSize: '0.62rem', fontWeight: job.urgent ? 700 : 500, color: job.urgent ? s.color : '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {job.urgent ? '⚡ ' : ''}{job.title}
                            </Typography>
                          </Box>
                        ))}
                        {jobs.length > 3 && !isHovered && (
                          <Typography sx={{ fontSize: '0.6rem', color: '#94a3b8', pl: 0.5 }}>+{jobs.length - 3} mais</Typography>
                        )}
                      </Stack>
                    )}
                  </Box>
                );
              })}
            </Box>
          ))}

          {/* Totals row */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '200px repeat(6, 1fr)', bgcolor: '#0f172a', borderTop: '2px solid #1e293b' }}>
            <Box sx={{ p: 1.5, borderRight: '1px solid #1e293b' }}>
              <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total</Typography>
            </Box>
            {STAGES.map((s) => {
              const total = CLIENTS.reduce((sum, c) => sum + (c.jobs[s.key]?.length ?? 0), 0);
              return (
                <Box key={s.key} sx={{ p: 1.5, textAlign: 'center', borderRight: '1px solid #1e293b' }}>
                  <Typography sx={{ fontSize: '1.2rem', fontWeight: 900, color: s.color, lineHeight: 1 }}>{total}</Typography>
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>

      <Box sx={{ p: 2, bgcolor: '#f8fafc' }}>
        <Typography sx={{ fontSize: '0.62rem', color: '#cbd5e1' }}>⚡ Protótipo v8 Swimlane — dados mockados</Typography>
      </Box>
    </Box>
  );
}
