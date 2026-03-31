'use client';

import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import {
  IconArrowDown,
  IconArrowUp,
  IconChartBar,
  IconCircleCheck,
  IconClock,
  IconMinus,
  IconSparkles,
} from '@tabler/icons-react';
import OperationsShell from '@/components/operations/OperationsShell';
import { apiGet } from '@/lib/api';

// ── Types ────────────────────────────────────────────────────────────────────

type CalibrationEntry = {
  jobType: string;
  complexity: string;
  sampleCount: number;
  medianMinutes: number;
  p25Minutes: number;
  p75Minutes: number;
  staticMinutes: number;
  confidence: 'high' | 'medium' | 'low' | 'none';
  driftPercent: number;
};

type CalibrationReport = {
  generatedAt: string;
  lookbackDays: number;
  entries: CalibrationEntry[];
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const JOB_TYPE_LABELS: Record<string, string> = {
  briefing: 'Briefing',
  copy: 'Copy',
  design_static: 'Design estático',
  design_carousel: 'Carrossel',
  video_edit: 'Edição de vídeo',
  campaign: 'Campanha',
  meeting: 'Reunião',
  approval: 'Aprovação',
  publication: 'Publicação',
  urgent_request: 'Urgência',
};

const COMPLEXITY_LABELS: Record<string, string> = {
  s: 'S', m: 'M', l: 'L',
  low: 'S', medium: 'M', high: 'L',
};

function formatMins(mins: number) {
  if (!mins) return '0h';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function confidenceColor(c: CalibrationEntry['confidence']) {
  if (c === 'high') return '#059669';
  if (c === 'medium') return '#d97706';
  if (c === 'low') return '#9ca3af';
  return '#d1d5db';
}

function confidenceLabel(c: CalibrationEntry['confidence']) {
  if (c === 'high') return 'Alta';
  if (c === 'medium') return 'Média';
  if (c === 'low') return 'Baixa';
  return 'Sem dados';
}

function driftColor(pct: number) {
  if (Math.abs(pct) <= 10) return '#059669';
  if (pct > 30) return '#dc2626';
  if (pct > 10) return '#d97706';
  return '#3b82f6';
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SummaryCard({
  label, value, sub, color, icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, borderColor: alpha(color, 0.25), bgcolor: alpha(color, 0.04), height: '100%', position: 'relative', overflow: 'hidden' }}>
      <Box sx={{ position: 'absolute', top: -16, right: -16, width: 64, height: 64, borderRadius: '50%', bgcolor: alpha(color, 0.1), filter: 'blur(16px)' }} />
      <Stack spacing={0.5}>
        <Stack direction="row" alignItems="center" spacing={0.75}>
          <Box sx={{ color, opacity: 0.8 }}>{icon}</Box>
          <Typography variant="caption" fontWeight={700} sx={{ color: alpha(color, 0.8), textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.62rem' }}>
            {label}
          </Typography>
        </Stack>
        <Typography sx={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1, color }}>{value}</Typography>
        {sub && <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>{sub}</Typography>}
      </Stack>
    </Paper>
  );
}

function DriftBar({ pct, maxAbs = 60 }: { pct: number; maxAbs?: number }) {
  const clamped = Math.max(-maxAbs, Math.min(maxAbs, pct));
  const pctWidth = (Math.abs(clamped) / maxAbs) * 50;
  const color = driftColor(pct);
  const isPos = pct >= 0;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, width: '100%' }}>
      {/* Negative side */}
      <Box sx={{ flex: 1, height: 6, borderRadius: '3px 0 0 3px', overflow: 'hidden', bgcolor: 'action.hover', display: 'flex', justifyContent: 'flex-end' }}>
        {!isPos && (
          <Box sx={{ width: `${pctWidth * 2}%`, height: '100%', bgcolor: '#3b82f6', borderRadius: '3px 0 0 3px' }} />
        )}
      </Box>
      {/* Center line */}
      <Box sx={{ width: 1, height: 12, bgcolor: 'divider', flexShrink: 0 }} />
      {/* Positive side */}
      <Box sx={{ flex: 1, height: 6, borderRadius: '0 3px 3px 0', overflow: 'hidden', bgcolor: 'action.hover' }}>
        {isPos && (
          <Box sx={{ width: `${pctWidth * 2}%`, height: '100%', bgcolor: color, borderRadius: '0 3px 3px 0' }} />
        )}
      </Box>
    </Box>
  );
}

function RangeBar({ p25, median, p75, max }: { p25: number; median: number; p75: number; max: number }) {
  if (!max) return null;
  const p25Pct = (p25 / max) * 100;
  const medPct = (median / max) * 100;
  const p75Pct = (p75 / max) * 100;
  const rangePct = p75Pct - p25Pct;
  return (
    <Box sx={{ position: 'relative', height: 8, bgcolor: 'action.hover', borderRadius: 4, overflow: 'visible' }}>
      {/* IQR band */}
      <Box sx={{
        position: 'absolute', top: 0, height: '100%',
        left: `${p25Pct}%`, width: `${rangePct}%`,
        bgcolor: alpha('#4570EA', 0.25), borderRadius: 4,
      }} />
      {/* Median dot */}
      <Box sx={{
        position: 'absolute', top: '50%', transform: 'translate(-50%, -50%)',
        left: `${medPct}%`,
        width: 10, height: 10, borderRadius: '50%',
        bgcolor: '#4570EA', border: '2px solid #fff',
        boxShadow: '0 0 0 1px #4570EA',
        zIndex: 1,
      }} />
    </Box>
  );
}

function EntryRow({ entry }: { entry: CalibrationEntry }) {
  const cc = confidenceColor(entry.confidence);
  const dc = driftColor(entry.driftPercent);
  const isAccurate = Math.abs(entry.driftPercent) <= 10;
  const isOver = entry.driftPercent > 10;
  const maxForBar = Math.max(entry.p75Minutes, entry.staticMinutes) * 1.1;

  return (
    <Box sx={{
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', md: '180px 40px 96px 120px 1fr 100px 90px 80px' },
      gap: { xs: 1, md: 0 },
      alignItems: 'center',
      px: 2, py: 1.25,
      borderBottom: '1px solid',
      borderColor: 'divider',
      '&:last-child': { borderBottom: 'none' },
      '&:hover': { bgcolor: 'action.hover' },
      transition: 'background 0.1s',
    }}>
      {/* Job type */}
      <Typography variant="body2" fontWeight={700} noWrap>
        {JOB_TYPE_LABELS[entry.jobType] ?? entry.jobType}
      </Typography>

      {/* Complexity */}
      <Box sx={{
        width: 24, height: 24, borderRadius: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        bgcolor: 'action.hover',
      }}>
        <Typography sx={{ fontSize: '0.72rem', fontWeight: 900, color: 'text.secondary' }}>
          {COMPLEXITY_LABELS[entry.complexity] ?? entry.complexity.toUpperCase()}
        </Typography>
      </Box>

      {/* Samples + confidence */}
      <Stack direction="row" alignItems="center" spacing={0.5}>
        <Box sx={{
          width: 8, height: 8, borderRadius: '50%', bgcolor: cc, flexShrink: 0,
          boxShadow: `0 0 0 2px ${alpha(cc, 0.25)}`,
        }} />
        <Typography variant="caption" fontWeight={700} sx={{ color: cc, fontSize: '0.7rem' }}>
          {entry.sampleCount} jobs
        </Typography>
      </Stack>

      {/* Estimativa estática */}
      <Stack direction="row" alignItems="center" spacing={0.5}>
        <IconClock size={12} style={{ opacity: 0.4 }} />
        <Typography variant="caption" color="text.secondary">{formatMins(entry.staticMinutes)}</Typography>
      </Stack>

      {/* Range bar */}
      <Tooltip
        title={`P25: ${formatMins(entry.p25Minutes)} · Mediana: ${formatMins(entry.medianMinutes)} · P75: ${formatMins(entry.p75Minutes)}`}
        arrow
      >
        <Box sx={{ px: 1 }}>
          <RangeBar p25={entry.p25Minutes} median={entry.medianMinutes} p75={entry.p75Minutes} max={maxForBar} />
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem', mt: 0.25, display: 'block', textAlign: 'center' }}>
            {formatMins(entry.medianMinutes)} real
          </Typography>
        </Box>
      </Tooltip>

      {/* Drift bar */}
      <Tooltip title={`Desvio de ${entry.driftPercent > 0 ? '+' : ''}${entry.driftPercent}% em relação à estimativa padrão`} arrow>
        <Box><DriftBar pct={entry.driftPercent} /></Box>
      </Tooltip>

      {/* Drift chip */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Chip
          size="small"
          icon={
            isAccurate ? <IconCircleCheck size={11} /> :
            isOver ? <IconArrowUp size={11} /> :
            <IconArrowDown size={11} />
          }
          label={`${entry.driftPercent > 0 ? '+' : ''}${entry.driftPercent}%`}
          sx={{
            height: 20, fontSize: '0.65rem', fontWeight: 900,
            bgcolor: alpha(dc, 0.1),
            color: dc,
            border: `1px solid ${alpha(dc, 0.3)}`,
            '& .MuiChip-icon': { color: 'inherit' },
          }}
        />
      </Box>
    </Box>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CalibracaoClient({ embedded = false }: { embedded?: boolean }) {
  const [report, setReport] = useState<CalibrationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lookback, setLookback] = useState(90);
  const [filterType, setFilterType] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    apiGet<{ data: CalibrationReport }>(`/jobs/calibration?days=${lookback}`)
      .then((res) => setReport(res?.data ?? null))
      .catch(() => setError('Erro ao carregar relatório de calibração.'))
      .finally(() => setLoading(false));
  }, [lookback]);

  const entries = report?.entries ?? [];
  const filtered = filterType ? entries.filter((e) => e.jobType === filterType) : entries;
  const jobTypes = Array.from(new Set(entries.map((e) => e.jobType))).sort();

  // Summary stats
  const trackedTypes = new Set(entries.map((e) => e.jobType)).size;
  const totalSamples = entries.reduce((s, e) => s + e.sampleCount, 0);
  const highConfidence = entries.filter((e) => e.confidence === 'high' || e.confidence === 'medium').length;
  const avgDrift = entries.length > 0
    ? Math.round(entries.reduce((s, e) => s + e.driftPercent, 0) / entries.length)
    : 0;
  const mostUnderestimated = entries.length > 0
    ? entries.reduce((a, b) => a.driftPercent > b.driftPercent ? a : b)
    : null;

  const content = (
    <>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Controls */}
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }} flexWrap="wrap" useFlexGap>
        <TextField
          select size="small" label="Período" value={lookback}
          onChange={(e) => setLookback(Number(e.target.value))}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value={30}>Últimos 30 dias</MenuItem>
          <MenuItem value={60}>Últimos 60 dias</MenuItem>
          <MenuItem value={90}>Últimos 90 dias</MenuItem>
          <MenuItem value={180}>Últimos 6 meses</MenuItem>
        </TextField>
        <TextField
          select size="small" label="Tipo de trabalho" value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">Todos os tipos</MenuItem>
          {jobTypes.map((t) => (
            <MenuItem key={t} value={t}>{JOB_TYPE_LABELS[t] ?? t}</MenuItem>
          ))}
        </TextField>
        {report && (
          <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto !important' }}>
            Gerado {new Date(report.generatedAt).toLocaleString('pt-BR')} · {report.lookbackDays} dias
          </Typography>
        )}
      </Stack>

      {loading ? (
        <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Summary cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 6, sm: 3 }}>
              <SummaryCard
                label="Tipos rastreados" value={trackedTypes}
                sub={`de ${Object.keys(JOB_TYPE_LABELS).length} tipos cadastrados`}
                color="#4570EA" icon={<IconChartBar size={15} />}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <SummaryCard
                label="Amostras coletadas" value={totalSamples}
                sub="jobs concluídos com tempo real"
                color="#13DEB9" icon={<IconClock size={15} />}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <SummaryCard
                label="Alta confiança" value={highConfidence}
                sub={`de ${entries.length} combinações`}
                color="#059669" icon={<IconCircleCheck size={15} />}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <SummaryCard
                label="Desvio médio" value={`${avgDrift > 0 ? '+' : ''}${avgDrift}%`}
                sub={avgDrift > 10 ? 'Estimativas consistentemente baixas' : avgDrift < -10 ? 'Estimativas conservadoras' : 'Estimativas calibradas'}
                color={Math.abs(avgDrift) <= 10 ? '#13DEB9' : avgDrift > 0 ? '#d97706' : '#3b82f6'}
                icon={<IconSparkles size={15} />}
              />
            </Grid>
          </Grid>

          {/* Destaque: mais subestimado */}
          {mostUnderestimated && mostUnderestimated.driftPercent > 20 && (
            <Alert
              severity="warning"
              sx={{ mb: 2.5, '& .MuiAlert-message': { width: '100%' } }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" useFlexGap>
                <span>
                  <strong>{JOB_TYPE_LABELS[mostUnderestimated.jobType] ?? mostUnderestimated.jobType}</strong> ({COMPLEXITY_LABELS[mostUnderestimated.complexity] ?? mostUnderestimated.complexity.toUpperCase()}) está
                  sendo consistentemente subestimado: estimativa estática {formatMins(mostUnderestimated.staticMinutes)},
                  real {formatMins(mostUnderestimated.medianMinutes)} (+{mostUnderestimated.driftPercent}%).
                </span>
                <Chip size="small" label={`${mostUnderestimated.sampleCount} amostras`} />
              </Stack>
            </Alert>
          )}

          {/* Legend */}
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1.5 }} flexWrap="wrap" useFlexGap>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>
              Barra de range: <Box component="span" sx={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', bgcolor: '#4570EA', verticalAlign: 'middle', mx: 0.25 }} /> mediana · faixa = P25–P75
            </Typography>
            <Stack direction="row" spacing={1.5}>
              {[['Alta', '#059669'], ['Média', '#d97706'], ['Baixa', '#9ca3af']].map(([label, color]) => (
                <Stack key={label} direction="row" spacing={0.5} alignItems="center">
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>Confiança {label}</Typography>
                </Stack>
              ))}
            </Stack>
          </Stack>

          {/* Table */}
          {filtered.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
              <Typography color="text.secondary" variant="body2">
                Nenhum dado disponível. Complete jobs com tempo real registrado.
              </Typography>
            </Paper>
          ) : (
            <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
              {/* Header */}
              <Box sx={{
                display: { xs: 'none', md: 'grid' },
                gridTemplateColumns: '180px 40px 96px 120px 1fr 100px 90px 80px',
                px: 2, py: 1,
                bgcolor: 'action.hover',
                borderBottom: '1px solid', borderColor: 'divider',
              }}>
                {['Tipo', 'Cmx', 'Amostras', 'Estimativa padrão', 'Mediana real (P25–P75)', 'Desvio', '', ''].map((h, i) => (
                  <Typography key={i} variant="caption" fontWeight={800} color="text.secondary" sx={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {h}
                  </Typography>
                ))}
              </Box>

              {filtered.map((entry) => (
                <EntryRow key={`${entry.jobType}-${entry.complexity}`} entry={entry} />
              ))}
            </Paper>
          )}
        </>
      )}
    </>
  );

  if (embedded) return content;

  return (
    <OperationsShell section="quality">
      {content}
    </OperationsShell>
  );
}
