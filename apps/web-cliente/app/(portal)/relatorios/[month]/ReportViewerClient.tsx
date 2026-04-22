'use client';

import { use, useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import {
  IconSparkles,
  IconAlertTriangle,
  IconBulb,
  IconCircleCheck,
  IconBrandInstagram,
  IconBrandLinkedin,
  IconBrandFacebook,
  IconBrandTiktok,
  IconBrandYoutube,
  IconChartBar,
  IconTarget,
  IconRocket,
  IconTrendingUp,
  IconClockHour4,
} from '@tabler/icons-react';
import { apiGet, apiPost } from '@/lib/api';
import type {
  MonthlyReport,
  KPI,
  Channel,
  FeaturedDeliverable,
  Priority,
  Risk,
  BusinessImpactItem,
  DeliverableCategory,
  Pipeline,
  ExecutiveContext,
} from '@/types/monthly-report';

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Parse hex → [r, g, b] 0-255 */
function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.replace('#', '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return null;
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

/** Lighten a hex color by mixing with white (0–1 factor) */
function lighten(hex: string, factor: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const [r, g, b] = rgb.map((c) => Math.round(c + (255 - c) * factor));
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

/** Darken a hex color by scaling toward black */
function darken(hex: string, factor: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const [r, g, b] = rgb.map((c) => Math.round(c * (1 - factor)));
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

/** Perceived brightness (0-255) */
function brightness(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 128;
  return (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
}

/** Build a 3-stop hero gradient from a brand hex color */
function heroGradient(brandHex: string | null | undefined): string {
  const base = (brandHex && /^#[0-9a-fA-F]{6}$/.test(brandHex)) ? brandHex : '#ff6600';
  return `linear-gradient(135deg, ${darken(base, 0.08)} 0%, ${base} 50%, ${lighten(base, 0.22)} 100%)`;
}

/** Pick text color (white vs dark) based on brand brightness */
function heroTextColor(brandHex: string | null | undefined): string {
  const base = (brandHex && /^#[0-9a-fA-F]{6}$/.test(brandHex)) ? brandHex : '#ff6600';
  return brightness(base) > 165 ? 'rgba(0,0,0,0.82)' : '#ffffff';
}

function formatPeriod(p: string) {
  const [y, m] = p.split('-');
  const label = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('pt-BR', {
    month: 'long', year: 'numeric',
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

// ─── Platform icons & colors ─────────────────────────────────────────────────

const PLATFORM_CONFIG: Record<string, {
  icon: React.ReactNode;
  gradient: string;
  dot: string;
}> = {
  instagram: {
    icon: <IconBrandInstagram size={20} color="#fff" />,
    gradient: 'linear-gradient(135deg, #f9ce34, #ee2a7b, #6228d7)',
    dot: '#ee2a7b',
  },
  linkedin: {
    icon: <IconBrandLinkedin size={20} color="#fff" />,
    gradient: '#0a66c2',
    dot: '#0a66c2',
  },
  facebook: {
    icon: <IconBrandFacebook size={20} color="#fff" />,
    gradient: '#1877f2',
    dot: '#1877f2',
  },
  tiktok: {
    icon: <IconBrandTiktok size={20} color="#fff" />,
    gradient: 'linear-gradient(135deg, #010101, #69c9d0)',
    dot: '#69c9d0',
  },
  youtube: {
    icon: <IconBrandYoutube size={20} color="#fff" />,
    gradient: '#ff0000',
    dot: '#ff0000',
  },
};

function PlatformIcon({ platform }: { platform: string }) {
  const cfg = PLATFORM_CONFIG[platform.toLowerCase()];
  return (
    <Box
      sx={{
        width: 36, height: 36, borderRadius: '10px',
        background: cfg?.gradient ?? '#5D87FF',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        boxShadow: `0 4px 12px ${alpha(cfg?.dot ?? '#5D87FF', 0.35)}`,
      }}
    >
      {cfg?.icon ?? <IconChartBar size={20} color="#fff" />}
    </Box>
  );
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_COLOR = {
  green:  { bg: '#16A34A', light: alpha('#16A34A', 0.06), label: 'Verde',    text: 'Operação em dia' },
  yellow: { bg: '#D97706', light: alpha('#D97706', 0.06), label: 'Amarelo',  text: 'Atenção necessária' },
  red:    { bg: '#DC2626', light: alpha('#DC2626', 0.06), label: 'Vermelho', text: 'Ação imediata' },
};

const TREND = {
  up:     { color: '#13DEB9', bg: alpha('#13DEB9', 0.05), arrow: '↑', border: '#13DEB9' },
  down:   { color: '#FA896B', bg: alpha('#FA896B', 0.05), arrow: '↓', border: '#FA896B' },
  stable: { color: '#98aab4', bg: 'transparent',          arrow: '→', border: '#e8edf2' },
};

// ─── Benchmark zone config ────────────────────────────────────────────────────

const ZONE = {
  below: { color: '#FA896B', bg: alpha('#FA896B', 0.12), label: '↓ abaixo', rangeBg: alpha('#FA896B', 0.22) },
  in:    { color: '#13DEB9', bg: alpha('#13DEB9', 0.12), label: '✓ em faixa', rangeBg: alpha('#13DEB9', 0.22) },
  above: { color: '#5D87FF', bg: alpha('#5D87FF', 0.12), label: '↑ acima',  rangeBg: alpha('#5D87FF', 0.22) },
};

function fmtNum(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toLocaleString('pt-BR');
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({ kpi }: { kpi: KPI }) {
  const t    = TREND[kpi.trend];
  const zone = kpi.benchmark_zone ? ZONE[kpi.benchmark_zone] : null;
  const pct  = kpi.previous_value !== null && kpi.previous_value > 0
    ? Math.round(((kpi.value - kpi.previous_value) / kpi.previous_value) * 100)
    : null;

  // Benchmark bar geometry
  // Scale: 0 → benchmark_max * 1.6  (leaves room to show "above" values)
  const hasBm = zone !== null
    && typeof kpi.benchmark_min === 'number'
    && typeof kpi.benchmark_max === 'number';

  let rangeLeft = 0, rangeWidth = 0, dotLeft = 0;
  if (hasBm) {
    const scale = (kpi.benchmark_max as number) * 1.6;
    rangeLeft  = Math.round(((kpi.benchmark_min as number) / scale) * 100);
    rangeWidth = Math.round((((kpi.benchmark_max as number) - (kpi.benchmark_min as number)) / scale) * 100);
    dotLeft    = Math.min(96, Math.max(4, Math.round((kpi.value / scale) * 100)));
  }

  const topColor  = zone ? zone.color : t.color;
  const valueBg   = zone ? zone.bg    : t.bg;

  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid', borderColor: 'divider',
        borderRadius: '14px', p: '16px 10px 12px',
        textAlign: 'center',
        bgcolor: valueBg,
        position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        '&::before': {
          content: '""', position: 'absolute',
          top: 0, left: 0, right: 0, height: '3px',
          bgcolor: topColor, borderRadius: '2px 2px 0 0',
        },
      }}
    >
      <Typography
        sx={{
          fontSize: '2rem', fontWeight: 900, lineHeight: 1, mb: 0.5,
          color: topColor, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
        }}
      >
        {fmtNum(kpi.value)}
      </Typography>

      {kpi.previous_value !== null && (
        <Typography sx={{ fontSize: '10px', fontWeight: 700, color: t.color, mb: 0.5 }}>
          {t.arrow} ant. {fmtNum(kpi.previous_value)}
          {pct !== null ? ` (${pct > 0 ? '+' : ''}${pct}%)` : ''}
        </Typography>
      )}

      <Typography sx={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: 'text.disabled', mb: hasBm ? 1 : 0 }}>
        {kpi.label}
      </Typography>

      {/* ── Benchmark bar ── */}
      {hasBm && zone && (
        <Box sx={{ mt: 'auto' }}>
          {/* bar track */}
          <Box sx={{ position: 'relative', height: '4px', borderRadius: '2px', bgcolor: alpha('#000', 0.07), mx: '2px', mb: '5px' }}>
            {/* reference range fill */}
            <Box sx={{
              position: 'absolute', top: 0, height: '4px', borderRadius: '2px',
              bgcolor: zone.rangeBg,
              left: `${rangeLeft}%`, width: `${rangeWidth}%`,
            }} />
            {/* client dot */}
            <Box sx={{
              position: 'absolute', top: '-3px',
              width: '10px', height: '10px', borderRadius: '50%',
              bgcolor: zone.color, border: '2px solid #fff',
              boxShadow: `0 1px 4px ${alpha(zone.color, 0.5)}`,
              left: `${dotLeft}%`, transform: 'translateX(-50%)',
            }} />
          </Box>
          {/* label */}
          <Typography sx={{ fontSize: '8.5px', fontWeight: 700, color: 'text.disabled', lineHeight: 1.2 }}>
            {kpi.benchmark_label}
            {' '}
            <Box component="span" sx={{
              fontWeight: 800, fontSize: '8px',
              px: '5px', py: '1px', borderRadius: '100px',
              bgcolor: alpha(zone.color, 0.12), color: zone.color,
            }}>
              {zone.label}
            </Box>
          </Typography>
        </Box>
      )}
    </Paper>
  );
}

// ─── Channel section ──────────────────────────────────────────────────────────

function ChannelSection({ channel }: { channel: Channel }) {
  return (
    <Box sx={{ mb: 3.5 }}>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
        <PlatformIcon platform={channel.platform} />
        <Typography variant="h6" fontWeight={800} sx={{ fontSize: '16px' }}>
          {channel.label || channel.platform}
        </Typography>
      </Stack>
      <Grid container spacing={1.5}>
        {channel.kpis.map((kpi) => (
          <Grid key={kpi.key} size={{ xs: 6, sm: 3 }}>
            <KpiCard kpi={kpi} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

// ─── Deliverable card ─────────────────────────────────────────────────────────

const DELIVERABLE_THUMBS = [
  'linear-gradient(135deg, #f9ce34, #ee2a7b, #6228d7)',
  'linear-gradient(135deg, #5D87FF, #7ca8ff)',
  'linear-gradient(135deg, #13DEB9, #4fe8d0)',
  'linear-gradient(135deg, #7460EE, #9d8ff0)',
  'linear-gradient(135deg, #ff6600, #ff9933)',
];

function DeliverableCard({ item, index }: { item: FeaturedDeliverable; index: number }) {
  const thumb = DELIVERABLE_THUMBS[index % DELIVERABLE_THUMBS.length];
  return (
    <Paper
      elevation={0}
      sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,.05)' }}
    >
      {item.image_url ? (
        <Box
          sx={{
            height: 130, backgroundImage: `url(${item.image_url})`,
            backgroundSize: 'cover', backgroundPosition: 'center',
          }}
        />
      ) : (
        <Box
          sx={{
            height: 130, background: thumb,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '44px',
          }}
        >
          🎯
        </Box>
      )}
      <Box sx={{ p: 2 }}>
        <Chip
          label={item.category}
          size="small"
          sx={{
            mb: 1, fontWeight: 700, fontSize: '10px',
            bgcolor: alpha('#5D87FF', 0.1), color: '#5D87FF',
            height: 22,
          }}
        />
        <Typography variant="subtitle2" fontWeight={800} gutterBottom sx={{ fontSize: '13px' }}>
          {item.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '12px' }}>
          {item.description}
        </Typography>
      </Box>
    </Paper>
  );
}

// ─── Section title ────────────────────────────────────────────────────────────

function SectionTitle({ children, number }: { children: React.ReactNode; number?: number }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2.5 }}>
      {number !== undefined && (
        <Box
          sx={{
            width: 22, height: 22, borderRadius: '6px',
            background: 'linear-gradient(135deg, #5D87FF, #7ca8ff)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Typography sx={{ fontSize: '10px', fontWeight: 900, color: '#fff', lineHeight: 1 }}>
            {number}
          </Typography>
        </Box>
      )}
      {number === undefined && (
        <Box sx={{ width: 4, height: 14, borderRadius: '2px', bgcolor: '#5D87FF', flexShrink: 0 }} />
      )}
      <Typography sx={{ fontSize: '10px', fontWeight: 800, letterSpacing: '.15em', textTransform: 'uppercase', color: 'text.disabled' }}>
        {children}
      </Typography>
    </Stack>
  );
}

// ─── Numbered section card ────────────────────────────────────────────────────

function SectionCard({ children, sx = {} }: { children: React.ReactNode; sx?: object }) {
  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid', borderColor: 'divider',
        borderRadius: '16px', p: { xs: '24px', md: '28px 32px' },
        boxShadow: '0 2px 12px rgba(0,0,0,.04)',
        ...sx,
      }}
    >
      {children}
    </Paper>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type Props =
  | { mode: 'portal'; params: Promise<{ month: string }>; report?: never; token?: never }
  | { mode: 'public'; report: MonthlyReport; params?: never; token?: never };

export default function ReportViewerClient(props: Props) {
  const [report, setReport] = useState<MonthlyReport | null>(props.mode === 'public' ? props.report : null);
  const [loading, setLoading]     = useState(props.mode === 'portal');
  const [error, setError]         = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [approved, setApproved]   = useState(false);

  const resolvedParams = props.mode === 'portal' ? use(props.params) : null;
  const month = resolvedParams?.month ?? null;

  useEffect(() => {
    if (props.mode !== 'portal' || !month) return;
    apiGet<{ report: MonthlyReport }>(`/monthly-reports/mine/${month}`)
      .then((res) => setReport(res.report))
      .catch(() => setError('Não foi possível carregar o relatório.'))
      .finally(() => setLoading(false));
  }, [props.mode, month]);

  async function handleApprove() {
    if (!report) return;
    setApproving(true);
    try {
      await apiPost(`/monthly-reports/mine/${report.id}/approve`);
      setApproved(true);
      setReport((prev) => prev ? { ...prev, status: 'approved' } : prev);
    } catch {
      setError('Erro ao aprovar. Tente novamente.');
    } finally {
      setApproving(false);
    }
  }

  if (loading) return (
    <Stack alignItems="center" justifyContent="center" py={10}><CircularProgress size={28} /></Stack>
  );

  if (error && !report) return (
    <Box sx={{ maxWidth: 860, mx: 'auto', px: { xs: 2, md: 4 }, py: 4 }}>
      <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>
    </Box>
  );

  if (!report) return (
    <Box sx={{ maxWidth: 860, mx: 'auto', px: { xs: 2, md: 4 }, py: 4 }}>
      <Alert severity="info" sx={{ borderRadius: 2 }}>Relatório não encontrado.</Alert>
    </Box>
  );

  const { sections } = report;
  const statusCfg   = STATUS_COLOR[sections.status.color];
  const isPending   = report.status === 'pending_approval' && props.mode === 'portal';
  const brandColor  = sections.brand_color ?? null;
  const gradient    = heroGradient(brandColor);
  const textColor   = heroTextColor(brandColor);
  const shadowColor = brandColor ?? '#ff6600';

  // optional new fields (backward-compatible)
  const facts              = sections.status.facts              ?? [];
  const attention          = sections.status.attention          ?? null;
  const execCtx            = sections.executive_context         ?? null;
  const categories         = sections.deliverables.categories   ?? [];
  const businessImpact     = sections.business_impact           ?? null;
  const kpiNarrative       = sections.metrics.kpi_narrative     ?? null;
  const pipeline           = sections.next_steps.pipeline       ?? null;
  const synthesis          = sections.synthesis                 ?? null;

  let sectionNum = 1;

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      <Box sx={{ maxWidth: 860, mx: 'auto', px: { xs: 2, md: 4 }, py: { xs: 3, md: 5 } }}>
        <Stack spacing={3.5}>

          {/* ── Approval banner ── */}
          {isPending && !approved && (
            <Box
              sx={{
                background: 'linear-gradient(135deg, #FFAE1F, #ffd166)',
                borderRadius: '12px',
                p: '14px 20px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                flexWrap: 'wrap', gap: 1.5,
                boxShadow: '0 4px 16px rgba(255,174,31,.22)',
              }}
            >
              <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#7a4800' }}>
                ⚠️ Este relatório aguarda sua aprovação antes de ir para a diretoria.
              </Typography>
              <Button
                variant="contained"
                size="small"
                disabled={approving}
                startIcon={approving ? <CircularProgress size={14} color="inherit" /> : <IconCircleCheck size={16} />}
                onClick={handleApprove}
                sx={{
                  bgcolor: '#fff', color: '#b87600', fontWeight: 800,
                  '&:hover': { bgcolor: alpha('#fff', 0.9) },
                  boxShadow: '0 2px 8px rgba(0,0,0,.1)',
                }}
              >
                Aprovar relatório
              </Button>
            </Box>
          )}

          {approved && <Alert severity="success" sx={{ borderRadius: 2 }}>Relatório aprovado com sucesso!</Alert>}
          {error     && <Alert severity="error"   sx={{ borderRadius: 2 }}>{error}</Alert>}

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* ── Hero ── */}
          {/* ════════════════════════════════════════════════════════════════ */}
          <Box
            sx={{
              background: gradient,
              borderRadius: '16px',
              p: { xs: '28px 24px', md: '36px 40px' },
              color: textColor,
              position: 'relative', overflow: 'hidden',
              boxShadow: `0 8px 32px ${alpha(shadowColor, 0.28)}`,
            }}
          >
            {/* decorative circles */}
            <Box sx={{ position: 'absolute', top: -80, right: -60, width: 280, height: 280, borderRadius: '50%', bgcolor: 'rgba(255,255,255,.08)' }} />
            <Box sx={{ position: 'absolute', bottom: -60, right: 60, width: 160, height: 160, borderRadius: '50%', bgcolor: 'rgba(255,255,255,.06)' }} />

            {/* eyebrow badge */}
            <Box
              sx={{
                display: 'inline-flex', alignItems: 'center', gap: 0.75,
                bgcolor: 'rgba(255,255,255,.22)', backdropFilter: 'blur(6px)',
                borderRadius: '100px', px: 1.75, py: 0.5,
                fontSize: '10px', fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase',
                color: textColor,
                mb: 1.5,
              }}
            >
              📊 Relatório Gerencial de Comunicação
            </Box>

            {/* Client name */}
            <Typography
              sx={{
                fontSize: { xs: '32px', md: '42px' },
                fontWeight: 900, letterSpacing: '-.03em', lineHeight: 1,
                mb: 1, position: 'relative', color: textColor,
              }}
            >
              {report.client_name}
            </Typography>

            {/* Period — BIGGER */}
            <Typography
              sx={{
                fontSize: { xs: '20px', md: '24px' },
                fontWeight: 700, opacity: .9, mb: 3, position: 'relative', color: textColor,
              }}
            >
              Consolidado de {formatPeriod(report.period_month)}
            </Typography>

            {/* Status pill — BIGGER */}
            <Box
              sx={{
                display: 'inline-flex', alignItems: 'center', gap: 1.5,
                bgcolor: 'rgba(255,255,255,.2)', backdropFilter: 'blur(6px)',
                borderRadius: '100px', px: 2.5, py: 1.25,
                position: 'relative',
              }}
            >
              <Box sx={{
                width: 12, height: 12, borderRadius: '50%',
                bgcolor: statusCfg.bg,
                boxShadow: `0 0 0 3px ${alpha(statusCfg.bg, 0.4)}`,
              }} />
              <Typography sx={{ fontSize: '15px', fontWeight: 800, color: textColor }}>
                Status {statusCfg.label} — {statusCfg.text}
              </Typography>
            </Box>
          </Box>

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* ── 1. Contexto Executivo ── */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {(execCtx || sections.status.headline) && (
            <SectionCard>
              <SectionTitle number={sectionNum++}>Contexto Executivo e Accountability</SectionTitle>

              {sections.status.headline && (
                <Paper
                  elevation={0}
                  sx={{
                    background: 'linear-gradient(135deg, rgba(93,135,255,.06), rgba(19,222,185,.04))',
                    border: '1px solid', borderColor: alpha('#5D87FF', 0.2),
                    borderRadius: '12px', p: '16px 20px',
                    mb: execCtx ? 2.5 : 0,
                    display: 'flex', gap: 1.5, alignItems: 'flex-start',
                  }}
                >
                  <Box sx={{ color: '#5D87FF', flexShrink: 0, mt: 0.25 }}>
                    <IconSparkles size={18} />
                  </Box>
                  <Typography sx={{ fontSize: '16px', fontWeight: 800, lineHeight: 1.4, color: 'text.primary' }}>
                    {sections.status.headline}
                  </Typography>
                </Paper>
              )}

              {execCtx && (
                <>
                  {execCtx.focus_areas.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography sx={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: 'text.disabled', mb: 1 }}>
                        Foco estratégico do mês
                      </Typography>
                      <Stack direction="row" flexWrap="wrap" gap={0.75}>
                        {execCtx.focus_areas.map((area, i) => (
                          <Chip
                            key={i}
                            label={area}
                            size="small"
                            sx={{
                              fontWeight: 700, fontSize: '11px',
                              bgcolor: alpha('#ff6600', 0.08), color: '#ff6600',
                              border: `1px solid ${alpha('#ff6600', 0.2)}`,
                            }}
                          />
                        ))}
                      </Stack>
                    </Box>
                  )}

                  <Typography sx={{ fontSize: '14px', lineHeight: 1.7, color: 'text.primary' }}>
                    {execCtx.execution_narrative}
                  </Typography>
                </>
              )}
            </SectionCard>
          )}

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* ── 2. Cenário, Status e Riscos ── */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {(facts.length > 0 || attention) && (
            <SectionCard>
              <SectionTitle number={sectionNum++}>Cenário, Status e Riscos</SectionTitle>

              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <Box
                  sx={{
                    display: 'inline-flex', alignItems: 'center', gap: 1,
                    bgcolor: statusCfg.light,
                    border: `1px solid ${alpha(statusCfg.bg, 0.25)}`,
                    borderRadius: '100px', px: 2, py: 0.75,
                  }}
                >
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: statusCfg.bg }} />
                  <Typography sx={{ fontSize: '12px', fontWeight: 800, color: statusCfg.bg }}>
                    Status {statusCfg.label} — {statusCfg.text}
                  </Typography>
                </Box>
              </Stack>

              {facts.length > 0 && (
                <Box sx={{ mb: attention ? 2.5 : 0 }}>
                  <Typography sx={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: 'text.disabled', mb: 1.5 }}>
                    Fatos Relevantes
                  </Typography>
                  <Stack spacing={0.75}>
                    {facts.map((fact, i) => (
                      <Stack key={i} direction="row" spacing={1.5} alignItems="flex-start">
                        <Box
                          sx={{
                            width: 20, height: 20, borderRadius: '6px',
                            bgcolor: alpha('#13DEB9', 0.1),
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0, mt: '1px',
                          }}
                        >
                          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#13DEB9' }} />
                        </Box>
                        <Typography variant="body2" sx={{ lineHeight: 1.6 }}>{fact}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Box>
              )}

              {attention && (
                <Box
                  sx={{
                    bgcolor: alpha('#FFAE1F', 0.06),
                    border: '1px solid', borderColor: alpha('#FFAE1F', 0.3),
                    borderLeft: '4px solid #FFAE1F',
                    borderRadius: '12px', p: '12px 16px',
                    display: 'flex', gap: 1.5, alignItems: 'flex-start',
                  }}
                >
                  <Box sx={{ color: '#FFAE1F', flexShrink: 0, mt: 0.2 }}>
                    <IconAlertTriangle size={16} />
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: '#FFAE1F', mb: 0.5 }}>
                      Ponto de Atenção
                    </Typography>
                    <Typography variant="body2">{attention}</Typography>
                  </Box>
                </Box>
              )}
            </SectionCard>
          )}

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* ── 3. Detalhamento das Entregas ── */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {sections.deliverables.total_count > 0 && (
            <SectionCard>
              <SectionTitle number={sectionNum++}>O Detalhamento das Entregas</SectionTitle>

              {/* Total count badge */}
              <Box
                sx={{
                  display: 'inline-flex', alignItems: 'center', gap: 1.5,
                  bgcolor: alpha('#5D87FF', 0.06),
                  border: `1px solid ${alpha('#5D87FF', 0.18)}`,
                  borderRadius: '12px', px: 2.5, py: 1.25,
                  mb: categories.length > 0 || sections.deliverables.featured.length > 0 ? 2.5 : 0,
                }}
              >
                <Typography sx={{ fontSize: '2rem', fontWeight: 900, color: '#5D87FF', lineHeight: 1 }}>
                  {sections.deliverables.total_count}
                </Typography>
                <Typography sx={{ fontSize: '13px', color: 'text.secondary', lineHeight: 1.3 }}>
                  {sections.deliverables.total_count === 1 ? 'ação concluída' : 'ações concluídas'}<br />
                  <span style={{ fontSize: '11px' }}>no período</span>
                </Typography>
              </Box>

              {/* Categorised deliverables */}
              {categories.length > 0 && (
                <Stack spacing={2} sx={{ mb: sections.deliverables.featured.length > 0 ? 2.5 : 0 }}>
                  {categories.map((cat: DeliverableCategory, ci: number) => (
                    <Box key={ci}>
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                        <Box
                          sx={{
                            width: 24, height: 24, borderRadius: '8px',
                            background: 'linear-gradient(135deg, #5D87FF, #7ca8ff)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Typography sx={{ fontSize: '10px', fontWeight: 900, color: '#fff' }}>
                            {ci + 1}
                          </Typography>
                        </Box>
                        <Typography sx={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: 'text.secondary' }}>
                          {cat.label}
                        </Typography>
                      </Stack>
                      <Stack spacing={0.5} sx={{ pl: 4 }}>
                        {cat.items.map((item: string, ii: number) => (
                          <Stack key={ii} direction="row" spacing={1} alignItems="flex-start">
                            <Typography sx={{ color: '#5D87FF', fontSize: '14px', lineHeight: 1.5, flexShrink: 0 }}>•</Typography>
                            <Typography variant="body2" sx={{ lineHeight: 1.55 }}>{item}</Typography>
                          </Stack>
                        ))}
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              )}

              {/* Featured deliverables (cards with images) */}
              {sections.deliverables.featured.length > 0 && (
                <Grid container spacing={2}>
                  {sections.deliverables.featured.map((item, i) => (
                    <Grid key={(item as FeaturedDeliverable).job_id ?? i} size={{ xs: 12, sm: 6 }}>
                      <DeliverableCard item={item as FeaturedDeliverable} index={i} />
                    </Grid>
                  ))}
                </Grid>
              )}

              {/* Extra count */}
              {categories.length === 0 && sections.deliverables.featured.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  {sections.deliverables.total_count} {sections.deliverables.total_count === 1 ? 'item concluído' : 'itens concluídos'} no período.
                </Typography>
              )}
            </SectionCard>
          )}

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* ── 4. Impacto no Negócio ── */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {businessImpact && businessImpact.length > 0 && (
            <SectionCard>
              <SectionTitle number={sectionNum++}>Impacto no Negócio</SectionTitle>
              <Stack spacing={2}>
                {businessImpact.map((item: BusinessImpactItem, i: number) => (
                  <Box
                    key={i}
                    sx={{
                      display: 'flex', gap: 2, alignItems: 'flex-start',
                      p: '16px 18px',
                      bgcolor: i === 0 ? alpha('#ff6600', 0.04) : alpha('#5D87FF', 0.03),
                      border: '1px solid',
                      borderColor: i === 0 ? alpha('#ff6600', 0.15) : alpha('#5D87FF', 0.12),
                      borderRadius: '12px',
                    }}
                  >
                    <Box
                      sx={{
                        width: 36, height: 36, borderRadius: '10px', flexShrink: 0,
                        background: i === 0
                          ? 'linear-gradient(135deg, #ff6600, #ff9933)'
                          : i === 1
                            ? 'linear-gradient(135deg, #5D87FF, #7ca8ff)'
                            : 'linear-gradient(135deg, #13DEB9, #4fe8d0)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: `0 4px 10px ${alpha(i === 0 ? '#ff6600' : '#5D87FF', 0.3)}`,
                      }}
                    >
                      {i === 0
                        ? <IconRocket size={18} color="#fff" />
                        : i === 1
                          ? <IconTrendingUp size={18} color="#fff" />
                          : <IconTarget size={18} color="#fff" />}
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: '14px', fontWeight: 800, mb: 0.5 }}>{item.title}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>{item.description}</Typography>
                    </Box>
                  </Box>
                ))}
              </Stack>
            </SectionCard>
          )}

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* ── 5. Performance e KPIs ── */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {sections.metrics.channels.length > 0 && (
            <SectionCard>
              <SectionTitle number={sectionNum++}>Performance e KPIs</SectionTitle>

              {sections.metrics.channels.map((channel, i) => (
                <ChannelSection key={channel.platform + i} channel={channel} />
              ))}

              {/* KPI narrative — "what the numbers mean" */}
              {kpiNarrative && (
                <Box
                  sx={{
                    mt: 0.5,
                    bgcolor: alpha('#7460EE', 0.05),
                    border: '1px solid', borderColor: alpha('#7460EE', 0.2),
                    borderLeft: '4px solid #7460EE',
                    borderRadius: '12px', p: '14px 18px',
                    display: 'flex', gap: 1.5, alignItems: 'flex-start',
                  }}
                >
                  <Box sx={{ color: '#7460EE', flexShrink: 0, mt: 0.25 }}><IconSparkles size={16} /></Box>
                  <Box>
                    <Typography sx={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: '#7460EE', mb: 0.5 }}>
                      Leitura Estratégica dos Números
                    </Typography>
                    <Typography variant="body2" sx={{ lineHeight: 1.65 }}>{kpiNarrative}</Typography>
                  </Box>
                </Box>
              )}

              {/* Standard metrics insight */}
              {sections.metrics.insight && (
                <Box
                  sx={{
                    mt: 1.5,
                    bgcolor: alpha('#5D87FF', 0.05),
                    border: '1px solid', borderColor: alpha('#5D87FF', 0.2),
                    borderLeft: '4px solid #5D87FF',
                    borderRadius: '12px', p: 2,
                    display: 'flex', gap: 1.5, alignItems: 'flex-start',
                  }}
                >
                  <Box sx={{ color: '#5D87FF', flexShrink: 0, mt: 0.25 }}><IconBulb size={18} /></Box>
                  <Typography variant="body2" sx={{ lineHeight: 1.65 }}>
                    {sections.metrics.insight}
                  </Typography>
                </Box>
              )}
            </SectionCard>
          )}

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* ── 6. Prioridades do Mês Corrente ── */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {sections.next_steps.priorities.length > 0 && (
            <SectionCard>
              <SectionTitle number={sectionNum++}>Prioridades do Próximo Mês</SectionTitle>
              <Stack spacing={1.5}>
                {sections.next_steps.priorities.map((p: Priority, i: number) => (
                  <Box
                    key={i}
                    sx={{
                      display: 'flex', gap: 2, alignItems: 'flex-start',
                      border: '1px solid', borderColor: 'divider',
                      borderRadius: '14px', p: '16px 18px',
                      boxShadow: '0 2px 10px rgba(0,0,0,.04)',
                    }}
                  >
                    <Box
                      sx={{
                        width: 38, height: 38, borderRadius: '12px',
                        background: 'linear-gradient(135deg, #5D87FF, #7ca8ff)',
                        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '16px', fontWeight: 900, flexShrink: 0,
                      }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: '14px', fontWeight: 800, mb: 0.4 }}>{p.title}</Typography>
                      <Typography variant="body2" color="text.secondary">{p.description}</Typography>
                    </Box>
                  </Box>
                ))}
              </Stack>

              {/* Director action */}
              {sections.next_steps.director_action && (
                <Box
                  sx={{
                    mt: 2.5,
                    background: 'linear-gradient(135deg, rgba(93,135,255,.07), rgba(93,135,255,.02))',
                    border: '2px solid #5D87FF',
                    borderRadius: '14px', p: { xs: '20px', md: '20px 24px' },
                    position: 'relative', overflow: 'hidden',
                    '&::after': { content: '"⚡"', position: 'absolute', right: '20px', top: '16px', fontSize: '28px', opacity: .12 },
                  }}
                >
                  <Typography sx={{ fontSize: '10px', fontWeight: 800, letterSpacing: '.15em', textTransform: 'uppercase', color: '#5D87FF', mb: 1, display: 'block' }}>
                    ⚡ Ação do Diretor
                  </Typography>
                  <Typography sx={{ fontSize: '15px', fontWeight: 700, lineHeight: 1.5 }}>
                    {sections.next_steps.director_action}
                  </Typography>
                </Box>
              )}
            </SectionCard>
          )}

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* ── 7. Previsibilidade & Pipeline ── */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {(sections.next_steps.risks.length > 0 || pipeline) && (
            <SectionCard>
              <SectionTitle number={sectionNum++}>Previsibilidade e Pipeline</SectionTitle>

              {/* Pipeline */}
              {pipeline && (
                <Box sx={{ mb: sections.next_steps.risks.length > 0 ? 3 : 0 }}>
                  <Typography sx={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: 'text.disabled', mb: 1.5 }}>
                    Pipeline de Iniciativas
                  </Typography>
                  <Stack spacing={1}>
                    {pipeline.short && (
                      <Stack direction="row" spacing={1.5} alignItems="flex-start">
                        <Box
                          sx={{
                            width: 72, height: 22, borderRadius: '6px', flexShrink: 0,
                            bgcolor: alpha('#13DEB9', 0.1),
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          <Typography sx={{ fontSize: '9px', fontWeight: 800, color: '#13DEB9', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                            Curto
                          </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ lineHeight: 1.6 }}>{pipeline.short}</Typography>
                      </Stack>
                    )}
                    {pipeline.medium && (
                      <Stack direction="row" spacing={1.5} alignItems="flex-start">
                        <Box
                          sx={{
                            width: 72, height: 22, borderRadius: '6px', flexShrink: 0,
                            bgcolor: alpha('#FFAE1F', 0.1),
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          <Typography sx={{ fontSize: '9px', fontWeight: 800, color: '#D97706', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                            Médio
                          </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ lineHeight: 1.6 }}>{pipeline.medium}</Typography>
                      </Stack>
                    )}
                    {pipeline.long && (
                      <Stack direction="row" spacing={1.5} alignItems="flex-start">
                        <Box
                          sx={{
                            width: 72, height: 22, borderRadius: '6px', flexShrink: 0,
                            bgcolor: alpha('#7460EE', 0.1),
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          <Typography sx={{ fontSize: '9px', fontWeight: 800, color: '#7460EE', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                            Longo
                          </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ lineHeight: 1.6 }}>{pipeline.long}</Typography>
                      </Stack>
                    )}
                  </Stack>

                  {pipeline.risk_window && (
                    <Box
                      sx={{
                        mt: 1.5,
                        bgcolor: alpha('#FA896B', 0.05),
                        border: '1px solid', borderColor: alpha('#FA896B', 0.2),
                        borderLeft: '4px solid #FA896B',
                        borderRadius: '10px', p: '12px 16px',
                        display: 'flex', gap: 1.5, alignItems: 'flex-start',
                      }}
                    >
                      <Box sx={{ color: '#FA896B', flexShrink: 0, mt: 0.1 }}><IconClockHour4 size={15} /></Box>
                      <Box>
                        <Typography sx={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: '#FA896B', mb: 0.4 }}>
                          Janela de Risco
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: '12px' }}>{pipeline.risk_window}</Typography>
                      </Box>
                    </Box>
                  )}
                </Box>
              )}

              {/* Risks */}
              {sections.next_steps.risks.length > 0 && (
                <Box>
                  {pipeline && (
                    <Typography sx={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: 'text.disabled', mb: 1.5 }}>
                      Riscos Identificados
                    </Typography>
                  )}
                  <Stack spacing={1}>
                    {sections.next_steps.risks.map((r: Risk, i: number) => (
                      <Box
                        key={i}
                        sx={{
                          bgcolor: alpha('#FA896B', 0.05),
                          border: '1px solid', borderColor: alpha('#FA896B', 0.2),
                          borderLeft: '4px solid #FA896B',
                          borderRadius: '12px', p: '14px 18px',
                          display: 'flex', gap: 1.5, alignItems: 'flex-start',
                        }}
                      >
                        <Box sx={{ color: '#FA896B', flexShrink: 0, mt: 0.2 }}><IconAlertTriangle size={16} /></Box>
                        <Box>
                          <Typography variant="body2">{r.description}</Typography>
                          <Chip
                            size="small"
                            label={`Responsável: ${r.owner}`}
                            variant="outlined"
                            sx={{ mt: 0.75, fontSize: '10px', height: 20 }}
                          />
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )}
            </SectionCard>
          )}

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* ── 8. Síntese e Fechamento ── */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {synthesis && (
            <SectionCard
              sx={{
                background: 'linear-gradient(135deg, rgba(93,135,255,.05) 0%, rgba(116,96,238,.03) 100%)',
                border: '1px solid', borderColor: alpha('#5D87FF', 0.2),
              }}
            >
              <SectionTitle number={sectionNum++}>Consolidação e Fechamento</SectionTitle>
              <Stack spacing={0.75} sx={{ mb: 2.5 }}>
                <Typography sx={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em', color: '#5D87FF', mb: 0.5 }}>
                  Síntese do Mês
                </Typography>
                <Typography sx={{ fontSize: '14px', lineHeight: 1.75, color: 'text.primary' }}>
                  {synthesis}
                </Typography>
              </Stack>

              <Divider sx={{ my: 2 }} />

              {/* Next-steps summary chips */}
              {sections.next_steps.priorities.length > 0 && (
                <Box>
                  <Typography sx={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: 'text.disabled', mb: 1.25 }}>
                    Próximos Passos ({formatPeriod(report.period_month).split(' ')[0] + ' →'})
                  </Typography>
                  <Stack spacing={0.75}>
                    {sections.next_steps.priorities.map((p: Priority, i: number) => (
                      <Stack key={i} direction="row" spacing={1.5} alignItems="flex-start">
                        <Typography sx={{ fontWeight: 900, fontSize: '13px', color: '#5D87FF', minWidth: 20, lineHeight: '20px' }}>
                          {i + 1}.
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{p.title}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Box>
              )}
            </SectionCard>
          )}

          {/* ── Rodapé ── */}
          <Box sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 2.5 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={0.5}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#ff6600' }} />
                <Typography sx={{ fontSize: '12px', fontWeight: 800 }}>Edro Studio</Typography>
                <Typography variant="caption" color="text.disabled">
                  · Relatório Gerencial de Comunicação · {formatPeriod(report.period_month)}
                </Typography>
              </Stack>
              {report.published_at && (
                <Typography variant="caption" color="text.disabled">
                  Publicado em {formatDate(report.published_at)}
                </Typography>
              )}
            </Stack>
          </Box>

        </Stack>
      </Box>
    </Box>
  );
}
