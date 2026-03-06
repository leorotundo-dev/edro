'use client';
import { Handle, Position } from '@xyflow/react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import { IconChartBar, IconRefresh, IconEye, IconHeart, IconClick, IconUsers } from '@tabler/icons-react';
import { useState } from 'react';
import NodeShell from '../NodeShell';
import { usePipeline } from '../PipelineContext';

type KPI = {
  label: string;
  value: number | string;
  unit?: string;
  icon: React.ReactNode;
  color: string;
  trend?: number; // % change
};

type PerformanceData = {
  score: number; // 0-100
  reach: number;
  impressions: number;
  engagement_rate: number;
  ctr: number;
  days: number[];    // 7 data points for sparkline
};

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const w = 60; const h = 20;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h}`).join(' ');
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ScoreCircle({ score }: { score: number }) {
  const r = 24; const circ = 2 * Math.PI * r;
  const color = score >= 70 ? '#13DEB9' : score >= 40 ? '#F8A800' : '#E85219';
  const offset = circ - (score / 100) * circ;
  return (
    <Box sx={{ position: 'relative', width: 60, height: 60, flexShrink: 0 }}>
      <svg width={60} height={60} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={30} cy={30} r={r} fill="none" stroke="#2a2a2a" strokeWidth={4} />
        <circle cx={30} cy={30} r={r} fill="none" stroke={color} strokeWidth={4}
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease', strokeLinecap: 'round' }} />
      </svg>
      <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, color }}>{score}</Typography>
      </Box>
    </Box>
  );
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export default function PerformanceNode() {
  const { nodeStatus, briefing, activeFormat } = usePipeline();
  // Available after scheduling or exporting
  const isAvailable = nodeStatus.arte === 'done';

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PerformanceData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState('');

  const clientId = typeof window !== 'undefined'
    ? window.localStorage.getItem('edro_active_client_id')
    : null;

  const fetchMetrics = async () => {
    if (!clientId) {
      setError('Cliente não identificado. Conecte ao Reportei primeiro.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { apiGet } = await import('@/lib/api');
      const res = await apiGet<any>(`/analytics/posts?client_id=${clientId}&limit=7`);
      const posts: any[] = res?.data?.posts ?? res?.posts ?? [];
      if (!posts.length) {
        setError('Nenhum dado de performance encontrado ainda.');
        setLoading(false);
        return;
      }
      const totalReach = posts.reduce((s, p) => s + (p.reach || 0), 0);
      const totalImpressions = posts.reduce((s, p) => s + (p.impressions || 0), 0);
      const avgEngRate = posts.reduce((s, p) => s + (parseFloat(p.engagement_rate) || 0), 0) / posts.length;
      const avgCtr = posts.reduce((s, p) => s + (parseFloat(p.ctr) || 0), 0) / posts.length;
      const dayData = posts.slice(0, 7).map((p) => parseFloat(p.engagement_rate) || 0).reverse();
      const score = Math.min(100, Math.round(avgEngRate * 20 + (avgCtr * 10) + (totalReach > 1000 ? 20 : 0)));
      setData({ score, reach: totalReach, impressions: totalImpressions, engagement_rate: avgEngRate, ctr: avgCtr, days: dayData });
      setLastUpdated(new Date());
    } catch {
      setError('Erro ao carregar métricas do Reportei.');
    } finally {
      setLoading(false);
    }
  };

  const kpis: KPI[] = data ? [
    { label: 'Alcance',      value: fmt(data.reach),       icon: <IconUsers size={11} />,  color: '#0EA5E9' },
    { label: 'Impressões',   value: fmt(data.impressions),  icon: <IconEye size={11} />,    color: '#5D87FF' },
    { label: 'Engajamento',  value: `${data.engagement_rate.toFixed(1)}%`, icon: <IconHeart size={11} />, color: '#13DEB9' },
    { label: 'CTR',          value: `${data.ctr.toFixed(2)}%`, icon: <IconClick size={11} />, color: '#F8A800' },
  ] : [];

  const collapsedSummary = (
    <Stack direction="row" spacing={1} alignItems="center">
      {data && <ScoreCircle score={data.score} />}
      <Stack spacing={0.25}>
        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'text.primary' }}>Score de performance</Typography>
        <Typography sx={{ fontSize: '0.6rem', color: 'text.disabled' }}>
          {data ? `Alcance: ${fmt(data.reach)} · Eng: ${data.engagement_rate.toFixed(1)}%` : ''}
        </Typography>
      </Stack>
    </Stack>
  );

  return (
    <Box>
      <Handle type="target" position={Position.Left} id="performance_in"
        style={{ background: '#444', width: 8, height: 8, border: 'none' }} />
      <NodeShell
        title="Performance"
        icon={<IconChartBar size={14} />}
        status={data ? 'done' : loading ? 'running' : isAvailable ? 'active' : 'locked'}
        accentColor="#0EA5E9"
        width={280}
        collapsedSummary={collapsedSummary}
      >
        <Stack spacing={1.25}>
          {!data ? (
            <>
              <Typography sx={{ fontSize: '0.6rem', color: '#888' }}>
                Carregue as métricas de performance das últimas publicações via Reportei.
              </Typography>
              {error && <Typography sx={{ fontSize: '0.6rem', color: '#FF4D4D' }}>{error}</Typography>}
              <Button
                variant="contained" size="small" fullWidth
                onClick={fetchMetrics}
                disabled={loading || !isAvailable}
                startIcon={loading ? <CircularProgress size={12} sx={{ color: '#fff' }} /> : <IconChartBar size={13} />}
                sx={{
                  bgcolor: '#0EA5E9', color: '#fff', fontWeight: 700,
                  fontSize: '0.7rem', textTransform: 'none',
                  '&:hover': { bgcolor: '#0284c7' },
                  '&.Mui-disabled': { bgcolor: '#2a2a2a', color: '#555' },
                }}
              >
                {loading ? 'Carregando…' : 'Carregar Performance'}
              </Button>
            </>
          ) : (
            <>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <ScoreCircle score={data.score} />
                <Box>
                  <Typography sx={{ fontSize: '0.6rem', color: '#888' }}>Score geral</Typography>
                  <Sparkline data={data.days} color="#0EA5E9" />
                </Box>
              </Stack>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.75 }}>
                {kpis.map((kpi) => (
                  <Box key={kpi.label} sx={{
                    p: 0.75, borderRadius: 1.5,
                    bgcolor: `${kpi.color}0a`, border: `1px solid ${kpi.color}22`,
                  }}>
                    <Stack direction="row" spacing={0.5} alignItems="center" mb={0.25}>
                      <Box sx={{ color: kpi.color }}>{kpi.icon}</Box>
                      <Typography sx={{ fontSize: '0.55rem', color: '#555' }}>{kpi.label}</Typography>
                    </Stack>
                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: kpi.color }}>
                      {kpi.value}
                    </Typography>
                  </Box>
                ))}
              </Box>

              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography sx={{ fontSize: '0.55rem', color: '#444' }}>
                  {lastUpdated ? `Atualizado ${lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}
                </Typography>
                <Button size="small" onClick={fetchMetrics} disabled={loading}
                  startIcon={<IconRefresh size={11} />}
                  sx={{ textTransform: 'none', fontSize: '0.58rem', color: '#555', p: 0,
                    '&:hover': { color: '#0EA5E9', bgcolor: 'transparent' } }}>
                  Atualizar
                </Button>
              </Stack>
            </>
          )}
        </Stack>
      </NodeShell>
      <Handle type="source" position={Position.Right} id="performance_out"
        style={{ background: '#0EA5E9', width: 8, height: 8, border: 'none' }} />
    </Box>
  );
}
