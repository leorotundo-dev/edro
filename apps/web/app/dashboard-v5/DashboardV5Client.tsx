'use client';
// v5 — TERMINAL: monospace, matrix green on black, ASCII tables
import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

const MONO = "'Courier New', Courier, 'Lucida Console', monospace";
const GREEN = '#00ff41';
const DIM = '#00aa2b';
const WARN = '#ffb700';
const ERR = '#ff4444';
const MUTED = '#005510';

const CLIENTS = [
  { name: 'Bradesco        ', initials: 'BR', health: 42, status: 'AT_RISK  ', jobs: 8,  aprov: 3, late: 2, deadline: 'HOJE 18:00' },
  { name: 'NuBank          ', initials: 'NU', health: 88, status: 'ENGAGED  ', jobs: 5,  aprov: 0, late: 0, deadline: 'SEX  12:00' },
  { name: 'Itaú            ', initials: 'IT', health: 61, status: 'PRESSURED', jobs: 12, aprov: 6, late: 1, deadline: 'AMAN  9:00' },
  { name: 'Mag. Luiza      ', initials: 'ML', health: 95, status: 'ENGAGED  ', jobs: 3,  aprov: 1, late: 0, deadline: 'SEG  10:00' },
  { name: 'Ambev           ', initials: 'AM', health: 73, status: 'NEUTRAL  ', jobs: 6,  aprov: 2, late: 0, deadline: 'SEX  17:00' },
  { name: 'Unilever        ', initials: 'UN', health: 55, status: 'PRESSURED', jobs: 4,  aprov: 1, late: 1, deadline: 'HOJE 20:00' },
];
const PIPELINE = [
  { stage: 'BRIEFING ', count: 4  },
  { stage: 'COPY_AI  ', count: 7  },
  { stage: 'APROVACAO', count: 14 },
  { stage: 'PRODUCAO ', count: 31 },
  { stage: 'REVISAO  ', count: 8  },
  { stage: 'ENTREGA  ', count: 3  },
];
const ALERTS = [
  { level: 'CRIT', msg: 'Bradesco — aprovação vencida há 1 dia' },
  { level: 'WARN', msg: 'NuBank — reunião em 40min [BOT=ON]' },
  { level: 'WARN', msg: 'Itaú — 3 copies sem atividade 48h' },
  { level: 'INFO', msg: 'Jarvis: Bradesco aprova mais nas terças' },
  { level: 'INFO', msg: '4 jobs sem responsável no sistema' },
];

function statusColor(s: string) {
  if (s.includes('AT_RISK')) return ERR;
  if (s.includes('PRESSURED')) return WARN;
  if (s.includes('ENGAGED')) return GREEN;
  return DIM;
}
function healthColor(h: number) { return h >= 80 ? GREEN : h >= 60 ? WARN : ERR; }
function bar(n: number, max: number, w = 20) {
  const filled = Math.round((n / max) * w);
  return '█'.repeat(filled) + '░'.repeat(w - filled);
}

export default function DashboardV5Client() {
  const [time, setTime] = useState('');
  const [blink, setBlink] = useState(true);

  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setBlink(b => !b), 530);
    return () => clearInterval(t);
  }, []);

  const T = ({ children, color = GREEN, bold = false, dim = false }: { children: React.ReactNode; color?: string; bold?: boolean; dim?: boolean }) => (
    <Box component="span" sx={{ color: dim ? MUTED : color, fontWeight: bold ? 700 : 400, fontFamily: MONO }}>{children}</Box>
  );
  const Line = ({ children, mt = 0 }: { children: React.ReactNode; mt?: number }) => (
    <Box sx={{ mt, lineHeight: 1.6 }}>{children}</Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#000', p: { xs: 2, md: 3 }, fontFamily: MONO }}>

      {/* Header */}
      <Line>
        <T color={GREEN} bold>╔══════════════════════════════════════════════════════════════╗</T>
      </Line>
      <Line>
        <T color={GREEN} bold>║  EDRO.OS v2.1.0 — SISTEMA DE OPERAÇÕES DE AGÊNCIA           ║</T>
      </Line>
      <Line>
        <T color={GREEN} bold>╚══════════════════════════════════════════════════════════════╝</T>
      </Line>
      <Line mt={0.5}>
        <T dim>$ uptime: </T><T>{time}</T>
        <T dim>  |  sessions: </T><T>4 online</T>
        <T dim>  |  jobs_active: </T><T color={WARN}>67</T>
        <T dim>  |  alerts: </T><T color={ERR}>3 CRIT</T>
      </Line>

      {/* Alerts */}
      <Line mt={2}><T color={DIM}>━━━ ALERTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</T></Line>
      {ALERTS.map((a, i) => (
        <Line key={i}>
          <T color={a.level === 'CRIT' ? ERR : a.level === 'WARN' ? WARN : DIM} bold>[{a.level}]</T>
          <T> {a.msg}</T>
        </Line>
      ))}

      {/* Client table */}
      <Line mt={2}><T color={DIM}>━━━ CLIENTES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</T></Line>
      <Line>
        <T dim>  CLIENTE          STATUS      SAUDE  JOBS  APROV  LATE  PRAZO</T>
      </Line>
      <Line><T dim>  {'─'.repeat(68)}</T></Line>
      {CLIENTS.map((c) => (
        <Line key={c.name}>
          <T color={DIM}>  </T>
          <T>{c.name}</T>
          <T color={statusColor(c.status)}>{c.status} </T>
          <T color={healthColor(c.health)}>{String(c.health).padStart(3)}    </T>
          <T>{String(c.jobs).padStart(4)}  </T>
          <T color={c.aprov > 0 ? WARN : DIM}>{String(c.aprov).padStart(5)}  </T>
          <T color={c.late > 0 ? ERR : DIM}>{String(c.late).padStart(4)}  </T>
          <T color={c.deadline.includes('HOJE') ? ERR : DIM}>{c.deadline}</T>
        </Line>
      ))}

      {/* Pipeline bars */}
      <Line mt={2}><T color={DIM}>━━━ PIPELINE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</T></Line>
      {PIPELINE.map((p) => (
        <Line key={p.stage}>
          <T dim>  </T>
          <T>{p.stage} </T>
          <T color={DIM}>[</T>
          <T color={GREEN}>{bar(p.count, 31)}</T>
          <T color={DIM}>] </T>
          <T color={WARN} bold>{String(p.count).padStart(2)}</T>
        </Line>
      ))}

      {/* Health bars */}
      <Line mt={2}><T color={DIM}>━━━ HEALTH MAP ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</T></Line>
      {CLIENTS.map((c) => (
        <Line key={c.name + '_h'}>
          <T dim>  </T>
          <T>{c.initials} </T>
          <T color={DIM}>[</T>
          <T color={healthColor(c.health)}>{bar(c.health, 100, 30)}</T>
          <T color={DIM}>] </T>
          <T color={healthColor(c.health)} bold>{c.health}%</T>
        </Line>
      ))}

      {/* Footer */}
      <Line mt={2}><T color={DIM}>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</T></Line>
      <Line>
        <T color={GREEN}>edro@ops:~$ </T>
        <T>{blink ? '█' : ' '}</T>
      </Line>
      <Line mt={0.5}><T dim>[PROTOTYPE v5 TERMINAL — MOCK DATA]</T></Line>
    </Box>
  );
}
