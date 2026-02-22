'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiGet, apiPost, apiPatch } from '@/lib/api';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import {
  IconPlus,
  IconChartBar,
  IconLock,
  IconLockOpen,
  IconRefresh,
  IconTrash,
  IconX,
  IconTarget,
  IconCoin,
  IconCalendar,
  IconBrain,
  IconTrendingUp,
  IconCheck,
  IconSparkles,
  IconArrowLeft,
  IconArrowRight,
  IconExternalLink,
  IconStarFilled,
} from '@tabler/icons-react';

// ── Types ────────────────────────────────────────────────────────────────────

type Campaign = {
  id: string;
  client_id: string;
  name: string;
  objective: string;
  budget_brl: number | null;
  start_date: string;
  end_date: string | null;
  status: string;
  created_at: string;
};

type CampaignFormat = {
  id: string;
  campaign_id: string;
  format_name: string;
  platform: string;
  production_type: string;
  predicted_ml_score: number;
  predicted_measurability_score: number;
  predicted_roi_multiplier: number;
  predicted_success_probability: number;
  predicted_confidence_level: string;
  predicted_time_to_results: string;
  predicted_market_trend: string;
  estimated_production_cost_min_brl: number;
  estimated_production_cost_max_brl: number;
  estimated_media_cost_brl: number | null;
  estimated_hours: number;
  estimated_skill_level: string;
  actual_production_cost_brl: number | null;
  actual_media_cost_brl: number | null;
  actual_hours_spent: number | null;
  produced_at: string | null;
  launched_at: string | null;
  is_locked: boolean;
  locked_at: string | null;
};

type FormatSummary = {
  total_impressions: number;
  total_reach: number;
  total_clicks: number;
  total_engagements: number;
  total_conversions: number;
  total_revenue_brl: number;
  total_spend_brl: number;
  avg_engagement_rate: number | null;
  actual_roi_multiplier: number | null;
  actual_roas: number | null;
  predicted_ml_score: number;
  predicted_roi_multiplier: number;
  score_accuracy: number | null;
  is_finalized: boolean;
};

type FormatRow = {
  format_name: string;
  platform: string;
  production_type: string;
};

type RecoFormat = {
  format_id?: string;
  format_name: string;
  platform: string;
  production_type: string;
  recommendation_score: number;
  recommendation_reasons?: string[];
  estimated_hours_total?: number;
};

type RecoCase = {
  title: string;
  snippet: string | null;
  url: string;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const OBJECTIVES = ['performance', 'branding', 'balanced'];
const STATUSES = ['active', 'paused', 'completed', 'cancelled'];
const PLATFORMS = ['Instagram', 'LinkedIn', 'YouTube', 'TikTok', 'Facebook', 'Google', 'Twitter/X', 'WhatsApp'];

function fmtBrl(v: number | null | undefined): string {
  if (v == null) return '—';
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('pt-BR'); } catch { return d; }
}

function scoreColor(score: number): string {
  if (score >= 80) return '#16a34a';
  if (score >= 60) return '#2563eb';
  if (score >= 40) return '#d97706';
  return '#dc2626';
}

function statusColor(s: string): 'success' | 'warning' | 'default' | 'error' {
  if (s === 'active') return 'success';
  if (s === 'paused') return 'warning';
  if (s === 'cancelled') return 'error';
  return 'default';
}

function objectiveLabel(o: string): string {
  const map: Record<string, string> = { performance: 'Performance', branding: 'Branding', balanced: 'Equilibrado' };
  return map[o] || o;
}

// ── Score Bar ────────────────────────────────────────────────────────────────

function ScoreBar({ label, value, max = 100 }: { label: string; value: number; max?: number }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.25 }}>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="caption" sx={{ fontWeight: 700, color: scoreColor(pct) }}>{value}</Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          height: 5, borderRadius: 3,
          bgcolor: 'grey.100',
          '& .MuiLinearProgress-bar': { borderRadius: 3, bgcolor: scoreColor(pct) },
        }}
      />
    </Box>
  );
}

// ── Format Metrics Dialog ────────────────────────────────────────────────────

function MetricsDialog({
  open,
  format,
  clientId,
  onClose,
  onSuccess,
}: {
  open: boolean;
  format: CampaignFormat | null;
  clientId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState({
    measurement_date: new Date().toISOString().slice(0, 10),
    impressions: '',
    reach: '',
    clicks: '',
    likes: '',
    comments: '',
    shares: '',
    saves: '',
    conversions: '',
    revenue_brl: '',
    spend_brl: '',
    roas: '',
    data_source: '',
  });

  const set = (k: string, v: string) => setFields((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!format) return;
    setSaving(true);
    try {
      await apiPost(`/campaign-formats/${format.id}/metrics`, {
        measurement_date: fields.measurement_date,
        impressions: fields.impressions ? Number(fields.impressions) : 0,
        reach: fields.reach ? Number(fields.reach) : 0,
        clicks: fields.clicks ? Number(fields.clicks) : 0,
        likes: fields.likes ? Number(fields.likes) : 0,
        comments: fields.comments ? Number(fields.comments) : 0,
        shares: fields.shares ? Number(fields.shares) : 0,
        saves: fields.saves ? Number(fields.saves) : 0,
        conversions: fields.conversions ? Number(fields.conversions) : 0,
        revenue_brl: fields.revenue_brl ? Number(fields.revenue_brl) : null,
        spend_brl: fields.spend_brl ? Number(fields.spend_brl) : null,
        roas: fields.roas ? Number(fields.roas) : null,
        data_source: fields.data_source || null,
      });
      onSuccess();
      onClose();
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Registrar Métricas</Typography>
          <IconButton size="small" onClick={onClose}><IconX size={18} /></IconButton>
        </Stack>
        {format && (
          <Typography variant="caption" color="text.secondary">
            {format.format_name} · {format.platform}
          </Typography>
        )}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Data de medição"
            type="date"
            size="small"
            value={fields.measurement_date}
            onChange={(e) => set('measurement_date', e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <Grid container spacing={1.5}>
            {[
              { k: 'impressions', label: 'Impressões' },
              { k: 'reach', label: 'Alcance' },
              { k: 'clicks', label: 'Cliques' },
              { k: 'likes', label: 'Curtidas' },
              { k: 'comments', label: 'Comentários' },
              { k: 'shares', label: 'Compartilhamentos' },
              { k: 'saves', label: 'Salvamentos' },
              { k: 'conversions', label: 'Conversões' },
            ].map(({ k, label }) => (
              <Grid size={{ xs: 6 }} key={k}>
                <TextField
                  label={label}
                  size="small"
                  type="number"
                  value={(fields as any)[k]}
                  onChange={(e) => set(k, e.target.value)}
                  fullWidth
                />
              </Grid>
            ))}
          </Grid>
          <Divider />
          <Grid container spacing={1.5}>
            <Grid size={{ xs: 4 }}>
              <TextField label="Receita (R$)" size="small" type="number" value={fields.revenue_brl} onChange={(e) => set('revenue_brl', e.target.value)} fullWidth InputProps={{ startAdornment: <InputAdornment position="start">R$</InputAdornment> }} />
            </Grid>
            <Grid size={{ xs: 4 }}>
              <TextField label="Gasto (R$)" size="small" type="number" value={fields.spend_brl} onChange={(e) => set('spend_brl', e.target.value)} fullWidth InputProps={{ startAdornment: <InputAdornment position="start">R$</InputAdornment> }} />
            </Grid>
            <Grid size={{ xs: 4 }}>
              <TextField label="ROAS" size="small" type="number" value={fields.roas} onChange={(e) => set('roas', e.target.value)} fullWidth />
            </Grid>
          </Grid>
          <TextField
            label="Fonte dos dados"
            size="small"
            placeholder="ex: Meta Ads, Google Analytics"
            value={fields.data_source}
            onChange={(e) => set('data_source', e.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">Cancelar</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? <CircularProgress size={16} sx={{ mr: 1 }} /> : null}
          Salvar métricas
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Campaign Detail Panel ─────────────────────────────────────────────────────

function CampaignDetail({
  campaign,
  clientId,
  onRefresh,
}: {
  campaign: Campaign;
  clientId: string;
  onRefresh: () => void;
}) {
  const [formats, setFormats] = useState<CampaignFormat[]>([]);
  const [summaries, setSummaries] = useState<Record<string, FormatSummary>>({});
  const [loading, setLoading] = useState(true);
  const [metricsFormat, setMetricsFormat] = useState<CampaignFormat | null>(null);
  const [recalcLoading, setRecalcLoading] = useState<string | null>(null);
  const [lockLoading, setLockLoading] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet<{ success: boolean; data: { campaign: Campaign; formats: CampaignFormat[] } }>(
        `/campaigns/${campaign.id}`
      );
      const fmts = res?.data?.formats || [];
      setFormats(fmts);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  }, [campaign.id]);

  useEffect(() => { loadDetail(); }, [loadDetail]);

  const handleLock = async (format: CampaignFormat) => {
    setLockLoading(format.id);
    try {
      await apiPost(`/campaign-formats/${format.id}/lock`, {});
      await loadDetail();
    } catch {
      //
    } finally {
      setLockLoading(null);
    }
  };

  const handleRecalc = async (format: CampaignFormat) => {
    setRecalcLoading(format.id);
    try {
      const res = await apiPost<{ success: boolean; data: FormatSummary }>(
        `/campaign-formats/${format.id}/summary/recalc`,
        {}
      );
      if (res?.data) {
        setSummaries((prev) => ({ ...prev, [format.id]: res.data }));
      }
    } catch {
      //
    } finally {
      setRecalcLoading(null);
    }
  };

  const handleActualUpdate = async (format: CampaignFormat, field: string, value: string) => {
    try {
      await apiPatch(`/campaign-formats/${format.id}`, { [field]: value ? Number(value) : null });
      await loadDetail();
    } catch {
      //
    }
  };

  if (loading) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ py: 6 }}>
        <CircularProgress size={24} />
      </Stack>
    );
  }

  return (
    <Box>
      {/* Campaign Header */}
      <Card variant="outlined" sx={{ mb: 2, borderRadius: 3 }}>
        <CardContent>
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between" flexWrap="wrap" gap={1}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>{campaign.name}</Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 0.75 }} flexWrap="wrap">
                <Chip size="small" label={objectiveLabel(campaign.objective)} color="primary" variant="outlined" />
                <Chip size="small" label={campaign.status} color={statusColor(campaign.status)} />
              </Stack>
            </Box>
            <Stack spacing={0.5} alignItems="flex-end">
              {campaign.budget_brl && (
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{fmtBrl(campaign.budget_brl)}</Typography>
              )}
              <Typography variant="caption" color="text.secondary">
                {fmtDate(campaign.start_date)}{campaign.end_date ? ` → ${fmtDate(campaign.end_date)}` : ''}
              </Typography>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Formats */}
      <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.08em' }}>
        Formatos ({formats.length})
      </Typography>

      {formats.length === 0 && (
        <Typography variant="body2" color="text.secondary">Nenhum formato nesta campanha.</Typography>
      )}

      <Stack spacing={2}>
        {formats.map((fmt) => {
          const summary = summaries[fmt.id];
          return (
            <Card key={fmt.id} variant="outlined" sx={{ borderRadius: 3, borderColor: fmt.is_locked ? 'success.light' : 'divider' }}>
              <CardContent>
                {/* Format Header */}
                <Stack direction="row" alignItems="flex-start" justifyContent="space-between" sx={{ mb: 1.5 }}>
                  <Box>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{fmt.format_name}</Typography>
                      {fmt.is_locked && (
                        <Chip size="small" icon={<IconLock size={10} />} label="Finalizado" color="success" sx={{ height: 18, fontSize: '0.62rem' }} />
                      )}
                    </Stack>
                    <Stack direction="row" spacing={0.75} sx={{ mt: 0.5 }} flexWrap="wrap">
                      {fmt.platform && <Chip size="small" label={fmt.platform} variant="outlined" sx={{ height: 18, fontSize: '0.62rem' }} />}
                      {fmt.production_type && <Chip size="small" label={fmt.production_type} variant="outlined" sx={{ height: 18, fontSize: '0.62rem' }} />}
                      {fmt.predicted_market_trend && <Chip size="small" label={fmt.predicted_market_trend} sx={{ height: 18, fontSize: '0.62rem', bgcolor: 'primary.lighter', color: 'primary.main' }} />}
                    </Stack>
                  </Box>
                  <Stack direction="row" spacing={0.5}>
                    <Tooltip title="Adicionar métricas">
                      <IconButton size="small" onClick={() => setMetricsFormat(fmt)} disabled={fmt.is_locked}>
                        <IconChartBar size={16} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Recalcular resumo">
                      <span>
                        <IconButton size="small" onClick={() => handleRecalc(fmt)} disabled={recalcLoading === fmt.id}>
                          {recalcLoading === fmt.id ? <CircularProgress size={14} /> : <IconRefresh size={16} />}
                        </IconButton>
                      </span>
                    </Tooltip>
                    {!fmt.is_locked && (
                      <Tooltip title="Finalizar formato (imutável)">
                        <span>
                          <IconButton size="small" onClick={() => handleLock(fmt)} disabled={lockLoading === fmt.id} color="success">
                            {lockLoading === fmt.id ? <CircularProgress size={14} /> : <IconLock size={16} />}
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                  </Stack>
                </Stack>

                {/* Predicted Scores */}
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 1 }}>PREDIÇÕES</Typography>
                    <Stack spacing={0.75}>
                      <ScoreBar label="Score ML" value={fmt.predicted_ml_score} />
                      <ScoreBar label="Mensurabilidade" value={fmt.predicted_measurability_score} />
                      <ScoreBar label="Probabilidade sucesso" value={fmt.predicted_success_probability} />
                    </Stack>
                    <Stack direction="row" justifyContent="space-between" sx={{ mt: 1.5 }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">ROI Previsto</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{fmt.predicted_roi_multiplier}x</Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="caption" color="text.secondary">Confiança</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{fmt.predicted_confidence_level}</Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="caption" color="text.secondary">Resultado em</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{fmt.predicted_time_to_results}</Typography>
                      </Box>
                    </Stack>
                  </Grid>

                  <Grid size={{ xs: 12, md: 4 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 1 }}>ESTIMATIVAS</Typography>
                    <Stack spacing={0.5}>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="caption" color="text.secondary">Produção</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                          {fmtBrl(fmt.estimated_production_cost_min_brl)} – {fmtBrl(fmt.estimated_production_cost_max_brl)}
                        </Typography>
                      </Stack>
                      {fmt.estimated_media_cost_brl != null && (
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="caption" color="text.secondary">Mídia</Typography>
                          <Typography variant="caption" sx={{ fontWeight: 600 }}>{fmtBrl(fmt.estimated_media_cost_brl)}</Typography>
                        </Stack>
                      )}
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="caption" color="text.secondary">Horas</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>{fmt.estimated_hours}h · {fmt.estimated_skill_level}</Typography>
                      </Stack>
                    </Stack>

                    {/* Actual editable fields */}
                    {!fmt.is_locked && (
                      <Box sx={{ mt: 1.5 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 0.75 }}>REALIZADO</Typography>
                        <Stack spacing={1}>
                          <TextField
                            label="Custo produção real (R$)"
                            size="small"
                            type="number"
                            defaultValue={fmt.actual_production_cost_brl ?? ''}
                            onBlur={(e) => handleActualUpdate(fmt, 'actual_production_cost_brl', e.target.value)}
                            sx={{ '& .MuiInputBase-input': { fontSize: '0.75rem' } }}
                          />
                          <TextField
                            label="Custo mídia real (R$)"
                            size="small"
                            type="number"
                            defaultValue={fmt.actual_media_cost_brl ?? ''}
                            onBlur={(e) => handleActualUpdate(fmt, 'actual_media_cost_brl', e.target.value)}
                            sx={{ '& .MuiInputBase-input': { fontSize: '0.75rem' } }}
                          />
                          <TextField
                            label="Horas reais"
                            size="small"
                            type="number"
                            defaultValue={fmt.actual_hours_spent ?? ''}
                            onBlur={(e) => handleActualUpdate(fmt, 'actual_hours_spent', e.target.value)}
                            sx={{ '& .MuiInputBase-input': { fontSize: '0.75rem' } }}
                          />
                        </Stack>
                      </Box>
                    )}
                    {fmt.is_locked && (
                      <Box sx={{ mt: 1 }}>
                        <Stack spacing={0.5}>
                          <Stack direction="row" justifyContent="space-between">
                            <Typography variant="caption" color="text.secondary">Produção real</Typography>
                            <Typography variant="caption" sx={{ fontWeight: 600 }}>{fmtBrl(fmt.actual_production_cost_brl)}</Typography>
                          </Stack>
                          <Stack direction="row" justifyContent="space-between">
                            <Typography variant="caption" color="text.secondary">Mídia real</Typography>
                            <Typography variant="caption" sx={{ fontWeight: 600 }}>{fmtBrl(fmt.actual_media_cost_brl)}</Typography>
                          </Stack>
                          <Stack direction="row" justifyContent="space-between">
                            <Typography variant="caption" color="text.secondary">Horas reais</Typography>
                            <Typography variant="caption" sx={{ fontWeight: 600 }}>{fmt.actual_hours_spent != null ? `${fmt.actual_hours_spent}h` : '—'}</Typography>
                          </Stack>
                        </Stack>
                      </Box>
                    )}
                  </Grid>

                  {/* Summary column */}
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 1 }}>
                      PERFORMANCE ACUMULADA
                    </Typography>
                    {summary ? (
                      <Stack spacing={0.5}>
                        {[
                          { label: 'Impressões', v: summary.total_impressions.toLocaleString('pt-BR') },
                          { label: 'Alcance', v: summary.total_reach.toLocaleString('pt-BR') },
                          { label: 'Cliques', v: summary.total_clicks.toLocaleString('pt-BR') },
                          { label: 'Engajamentos', v: summary.total_engagements.toLocaleString('pt-BR') },
                          { label: 'Conversões', v: summary.total_conversions.toLocaleString('pt-BR') },
                          { label: 'Receita', v: fmtBrl(summary.total_revenue_brl) },
                          { label: 'Gasto', v: fmtBrl(summary.total_spend_brl) },
                          { label: 'ROI real', v: summary.actual_roi_multiplier != null ? `${summary.actual_roi_multiplier.toFixed(2)}x` : '—' },
                          { label: 'ROAS real', v: summary.actual_roas != null ? summary.actual_roas.toFixed(2) : '—' },
                        ].map(({ label, v }) => (
                          <Stack key={label} direction="row" justifyContent="space-between">
                            <Typography variant="caption" color="text.secondary">{label}</Typography>
                            <Typography variant="caption" sx={{ fontWeight: 600 }}>{v}</Typography>
                          </Stack>
                        ))}
                        {summary.score_accuracy != null && (
                          <Box sx={{ mt: 1 }}>
                            <ScoreBar label="Acurácia do score ML" value={Math.round(summary.score_accuracy)} />
                          </Box>
                        )}
                      </Stack>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        Adicione métricas e clique em
                        <IconRefresh size={12} style={{ verticalAlign: 'middle', margin: '0 2px' }} />
                        para calcular.
                      </Typography>
                    )}
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          );
        })}
      </Stack>

      <MetricsDialog
        open={!!metricsFormat}
        format={metricsFormat}
        clientId={clientId}
        onClose={() => setMetricsFormat(null)}
        onSuccess={loadDetail}
      />
    </Box>
  );
}

// ── Create Campaign Dialog ────────────────────────────────────────────────────

function CreateCampaignDialog({
  open,
  clientId,
  onClose,
  onCreated,
}: {
  open: boolean;
  clientId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [dialogStep, setDialogStep] = useState<0 | 1>(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    objective: 'performance',
    budget_brl: '',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: '',
    status: 'active',
  });
  const [formats, setFormats] = useState<FormatRow[]>([{ format_name: '', platform: 'Instagram', production_type: '' }]);

  // IA state
  const [briefingText, setBriefingText] = useState('');
  const [recommending, setRecommending] = useState(false);
  const [recoFormats, setRecoFormats] = useState<RecoFormat[]>([]);
  const [recoCases, setRecoCases] = useState<RecoCase[]>([]);
  const [usedRecos, setUsedRecos] = useState<Set<string>>(new Set());

  const setF = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const addFormat = () => setFormats((f) => [...f, { format_name: '', platform: 'Instagram', production_type: '' }]);
  const removeFormat = (i: number) => setFormats((f) => f.filter((_, idx) => idx !== i));
  const setFormatField = (i: number, k: keyof FormatRow, v: string) =>
    setFormats((f) => f.map((row, idx) => (idx === i ? { ...row, [k]: v } : row)));

  const handleRecommend = async () => {
    setRecommending(true);
    setRecoFormats([]);
    setRecoCases([]);
    try {
      const res = await apiPost<{ recommended_formats: RecoFormat[]; reference_cases: RecoCase[] }>(
        '/recommendations/enxoval',
        {
          briefing_text: briefingText || form.name || 'campanha de marketing',
          objective: form.objective,
          budget_total: form.budget_brl ? Number(form.budget_brl) : undefined,
          client_id: clientId,
          include_cases: true,
        }
      );
      setRecoFormats(res?.recommended_formats?.slice(0, 6) || []);
      setRecoCases(res?.reference_cases || []);
    } catch { /* silent */ }
    finally { setRecommending(false); }
  };

  const handleUseFormat = (fmt: RecoFormat) => {
    const key = `${fmt.format_name}::${fmt.platform}`;
    setUsedRecos((prev) => { const next = new Set(prev); next.add(key); return next; });
    setFormats((prev) => {
      const clean = prev.filter((f) => f.format_name.trim());
      return [...clean, { format_name: fmt.format_name, platform: fmt.platform, production_type: fmt.production_type }];
    });
  };

  const handleCreate = async () => {
    setError('');
    if (!form.name.trim()) { setError('Nome obrigatório.'); return; }
    const validFormats = formats.filter((f) => f.format_name.trim());
    if (validFormats.length === 0) { setError('Adicione ao menos 1 formato com nome.'); return; }

    setSaving(true);
    try {
      await apiPost('/campaigns', {
        client_id: clientId,
        name: form.name.trim(),
        objective: form.objective,
        budget_brl: form.budget_brl ? Number(form.budget_brl) : null,
        start_date: form.start_date,
        end_date: form.end_date || null,
        status: form.status,
        formats: validFormats,
      });
      onCreated();
      onClose();
      // Reset
      setDialogStep(0);
      setForm({ name: '', objective: 'performance', budget_brl: '', start_date: new Date().toISOString().slice(0, 10), end_date: '', status: 'active' });
      setFormats([{ format_name: '', platform: 'Instagram', production_type: '' }]);
      setBriefingText('');
      setRecoFormats([]);
      setRecoCases([]);
      setUsedRecos(new Set());
    } catch (e: any) {
      setError(e?.message || 'Erro ao criar campanha.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    onClose();
    setDialogStep(0);
    setError('');
    setRecoFormats([]);
    setRecoCases([]);
    setUsedRecos(new Set());
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Typography variant="h6">Nova Campanha</Typography>
            {/* Step indicator */}
            <Stack direction="row" spacing={0.75} alignItems="center">
              {[0, 1].map((s) => (
                <Box
                  key={s}
                  sx={{
                    width: s === dialogStep ? 20 : 8,
                    height: 8,
                    borderRadius: 4,
                    bgcolor: s === dialogStep ? '#ff6600' : s < dialogStep ? '#13DEB9' : 'grey.300',
                    transition: 'all 0.2s',
                  }}
                />
              ))}
              <Typography variant="caption" color="text.secondary">
                {dialogStep === 0 ? 'Dados básicos' : 'Formatos + IA'}
              </Typography>
            </Stack>
          </Stack>
          <IconButton size="small" onClick={handleClose}><IconX size={18} /></IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        {/* ── STEP 0: Dados básicos ─────────────────────────────────────── */}
        {dialogStep === 0 && (
          <Stack spacing={2.5} sx={{ mt: 0.5 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField label="Nome da campanha *" size="small" fullWidth value={form.name} onChange={(e) => setF('name', e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Objetivo</InputLabel>
                  <Select label="Objetivo" value={form.objective} onChange={(e) => setF('objective', e.target.value)}>
                    {OBJECTIVES.map((o) => <MenuItem key={o} value={o}>{objectiveLabel(o)}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label="Budget (R$)" size="small" type="number" fullWidth value={form.budget_brl}
                  onChange={(e) => setF('budget_brl', e.target.value)}
                  InputProps={{ startAdornment: <InputAdornment position="start">R$</InputAdornment> }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField label="Início *" size="small" type="date" fullWidth value={form.start_date}
                  onChange={(e) => setF('start_date', e.target.value)} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField label="Fim" size="small" type="date" fullWidth value={form.end_date}
                  onChange={(e) => setF('end_date', e.target.value)} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select label="Status" value={form.status} onChange={(e) => setF('status', e.target.value)}>
                    {STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Stack>
        )}

        {/* ── STEP 1: Formatos + IA ─────────────────────────────────────── */}
        {dialogStep === 1 && (
          <Stack spacing={2.5} sx={{ mt: 0.5 }}>

            {/* AI Assistant Card */}
            <Box sx={{ border: '1px dashed rgba(255,102,0,0.4)', borderRadius: 2, p: 2, bgcolor: 'rgba(255,102,0,0.025)' }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                <IconSparkles size={18} color="#ff6600" />
                <Typography variant="subtitle2" fontWeight={700} color="#ff6600">
                  Assistente IA — Recomendação de Formatos
                </Typography>
              </Stack>
              <TextField
                multiline
                rows={2}
                fullWidth
                size="small"
                placeholder="Descreva o briefing da campanha... Ex: quero gerar leads qualificados para o produto X, público 30-50 anos, presença forte no Instagram e LinkedIn"
                value={briefingText}
                onChange={(e) => setBriefingText(e.target.value)}
                sx={{ mb: 1.5 }}
              />
              <Button
                variant="contained"
                size="small"
                startIcon={recommending ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <IconSparkles size={15} />}
                onClick={handleRecommend}
                disabled={recommending}
                sx={{ bgcolor: '#ff6600', '&:hover': { bgcolor: '#e65c00' } }}
              >
                {recommending ? 'Analisando...' : 'Sugerir formatos com IA'}
              </Button>

              {/* Recommended formats */}
              {recoFormats.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Formatos recomendados para esta campanha
                  </Typography>
                  <Grid container spacing={1.5}>
                    {recoFormats.map((fmt, idx) => {
                      const key = `${fmt.format_name}::${fmt.platform}`;
                      const used = usedRecos.has(key);
                      return (
                        <Grid key={idx} size={{ xs: 12, sm: 6 }}>
                          <Card variant="outlined" sx={{ opacity: used ? 0.5 : 1, transition: 'opacity 0.2s', borderColor: used ? 'success.light' : 'divider' }}>
                            <CardContent sx={{ p: '10px !important' }}>
                              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Typography variant="caption" fontWeight={700} noWrap sx={{ display: 'block' }}>
                                    {fmt.format_name}
                                  </Typography>
                                  <Stack direction="row" spacing={0.5} sx={{ mt: 0.25 }}>
                                    <Chip label={fmt.platform} size="small" sx={{ height: 16, fontSize: '0.6rem' }} />
                                    {fmt.production_type && (
                                      <Chip label={fmt.production_type} size="small" variant="outlined" sx={{ height: 16, fontSize: '0.6rem' }} />
                                    )}
                                  </Stack>
                                </Box>
                                <Stack alignItems="center" spacing={0.5} sx={{ ml: 1 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                                    <IconStarFilled size={11} color={scoreColor(fmt.recommendation_score)} />
                                    <Typography variant="caption" sx={{ fontWeight: 700, color: scoreColor(fmt.recommendation_score), lineHeight: 1 }}>
                                      {fmt.recommendation_score}
                                    </Typography>
                                  </Box>
                                  <Button
                                    size="small"
                                    variant={used ? 'outlined' : 'contained'}
                                    onClick={() => !used && handleUseFormat(fmt)}
                                    disabled={used}
                                    startIcon={used ? <IconCheck size={12} /> : <IconPlus size={12} />}
                                    sx={{
                                      fontSize: '0.65rem', py: 0.25, px: 0.75, minWidth: 0,
                                      bgcolor: used ? 'transparent' : '#5D87FF',
                                      '&:hover': { bgcolor: used ? 'transparent' : '#4570EA' },
                                    }}
                                  >
                                    {used ? 'Adicionado' : 'Usar'}
                                  </Button>
                                </Stack>
                              </Stack>
                              {fmt.recommendation_reasons && fmt.recommendation_reasons.length > 0 && (
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'block', lineHeight: 1.3, fontSize: '0.62rem' }}>
                                  {fmt.recommendation_reasons[0]}
                                </Typography>
                              )}
                            </CardContent>
                          </Card>
                        </Grid>
                      );
                    })}
                  </Grid>
                </Box>
              )}

              {/* Tavily cases */}
              {recoCases.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Cases de inspiração (buscados na web)
                  </Typography>
                  <Stack spacing={1}>
                    {recoCases.map((c, i) => (
                      <Box
                        key={i}
                        component="a"
                        href={c.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          display: 'block', p: 1.25, borderRadius: 1.5,
                          border: '1px solid', borderColor: 'divider',
                          bgcolor: 'background.paper',
                          textDecoration: 'none', color: 'inherit',
                          '&:hover': { borderColor: '#ff6600', bgcolor: 'rgba(255,102,0,0.03)' },
                          transition: 'all 0.15s',
                        }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="caption" fontWeight={700} sx={{ display: 'block', lineHeight: 1.3 }}>
                              {c.title}
                            </Typography>
                            {c.snippet && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.3, mt: 0.25 }}>
                                {c.snippet}
                              </Typography>
                            )}
                          </Box>
                          <IconExternalLink size={13} color="#999" style={{ marginLeft: 8, flexShrink: 0, marginTop: 2 }} />
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )}
            </Box>

            <Divider>
              <Typography variant="caption" color="text.secondary">Formatos da campanha</Typography>
            </Divider>

            {/* Manual formats */}
            <Box>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {formats.filter(f => f.format_name.trim()).length} formato{formats.filter(f => f.format_name.trim()).length !== 1 ? 's' : ''} adicionado{formats.filter(f => f.format_name.trim()).length !== 1 ? 's' : ''}
                </Typography>
                <Button size="small" startIcon={<IconPlus size={14} />} onClick={addFormat}>Adicionar manualmente</Button>
              </Stack>
              <Stack spacing={1.5}>
                {formats.map((fmt, i) => (
                  <Grid container spacing={1.5} key={i} alignItems="center">
                    <Grid size={{ xs: 12, md: 5 }}>
                      <TextField
                        label="Nome do formato *" size="small" fullWidth
                        placeholder="ex: Carrossel educativo, Reels trending..."
                        value={fmt.format_name}
                        onChange={(e) => setFormatField(i, 'format_name', e.target.value)}
                      />
                    </Grid>
                    <Grid size={{ xs: 6, md: 3 }}>
                      <FormControl size="small" fullWidth>
                        <InputLabel>Plataforma</InputLabel>
                        <Select label="Plataforma" value={fmt.platform} onChange={(e) => setFormatField(i, 'platform', e.target.value)}>
                          {PLATFORMS.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid size={{ xs: 5, md: 3 }}>
                      <TextField
                        label="Tipo produção" size="small" fullWidth
                        placeholder="ex: vídeo, imagem"
                        value={fmt.production_type}
                        onChange={(e) => setFormatField(i, 'production_type', e.target.value)}
                      />
                    </Grid>
                    <Grid size={{ xs: 1 }}>
                      {formats.length > 1 && (
                        <IconButton size="small" onClick={() => removeFormat(i)} color="error">
                          <IconTrash size={15} />
                        </IconButton>
                      )}
                    </Grid>
                  </Grid>
                ))}
              </Stack>
            </Box>

            {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'space-between' }}>
        {dialogStep === 0 ? (
          <>
            <Button onClick={handleClose} color="inherit">Cancelar</Button>
            <Button
              variant="contained"
              endIcon={<IconArrowRight size={16} />}
              onClick={() => {
                if (!form.name.trim()) { setError('Informe o nome da campanha.'); return; }
                setError('');
                setDialogStep(1);
              }}
              sx={{ bgcolor: '#ff6600', '&:hover': { bgcolor: '#e65c00' } }}
            >
              Próximo: Formatos
            </Button>
          </>
        ) : (
          <>
            <Button startIcon={<IconArrowLeft size={16} />} onClick={() => { setDialogStep(0); setError(''); }} color="inherit">
              Voltar
            </Button>
            <Button
              variant="contained"
              onClick={handleCreate}
              disabled={saving}
              startIcon={saving ? <CircularProgress size={14} /> : <IconCheck size={16} />}
              sx={{ bgcolor: '#13DEB9', color: '#000', fontWeight: 700, '&:hover': { bgcolor: '#0fc9a8' } }}
            >
              {saving ? 'Criando...' : 'Criar Campanha'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function CampaignsClient({ clientId }: { clientId: string }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);

  const selected = campaigns.find((c) => c.id === selectedId) || null;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet<{ success: boolean; data: Campaign[] }>(
        `/campaigns?client_id=${clientId}`
      );
      setCampaigns(Array.isArray(res?.data) ? res.data : []);
    } catch {
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const filtered = statusFilter === 'all' ? campaigns : campaigns.filter((c) => c.status === statusFilter);

  const stats = {
    total: campaigns.length,
    active: campaigns.filter((c) => c.status === 'active').length,
    completed: campaigns.filter((c) => c.status === 'completed').length,
    budget: campaigns.reduce((sum, c) => sum + (c.budget_brl || 0), 0),
  };

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Campanhas</Typography>
          <Typography variant="body2" color="text.secondary">Motor comportamental · predição e rastreamento de formatos</Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<IconPlus size={16} />}
          onClick={() => setCreateOpen(true)}
          sx={{ borderRadius: 2 }}
        >
          Nova campanha
        </Button>
      </Stack>

      {/* Stats row */}
      {!loading && campaigns.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Total', value: stats.total, icon: <IconTarget size={18} />, color: '#6366f1' },
            { label: 'Ativas', value: stats.active, icon: <IconTrendingUp size={18} />, color: '#16a34a' },
            { label: 'Concluídas', value: stats.completed, icon: <IconCheck size={18} />, color: '#2563eb' },
            { label: 'Budget total', value: fmtBrl(stats.budget), icon: <IconCoin size={18} />, color: '#d97706' },
          ].map(({ label, value, icon, color }) => (
            <Grid size={{ xs: 6, md: 3 }} key={label}>
              <Card variant="outlined" sx={{ borderRadius: 3 }}>
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Stack direction="row" alignItems="center" spacing={1.25}>
                    <Box sx={{ color, opacity: 0.85 }}>{icon}</Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">{label}</Typography>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.1 }}>{value}</Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Main layout: list + detail */}
      <Grid container spacing={2}>
        {/* Left: campaign list */}
        <Grid size={{ xs: 12, md: selected ? 4 : 12 }}>
          {/* Filter */}
          <Stack direction="row" spacing={1} sx={{ mb: 1.5 }} flexWrap="wrap">
            {['all', ...STATUSES].map((s) => (
              <Chip
                key={s}
                size="small"
                label={s === 'all' ? 'Todas' : s}
                onClick={() => setStatusFilter(s)}
                color={statusFilter === s ? 'primary' : 'default'}
                variant={statusFilter === s ? 'filled' : 'outlined'}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Stack>

          {loading && (
            <Stack alignItems="center" justifyContent="center" sx={{ py: 6 }}>
              <CircularProgress size={24} />
            </Stack>
          )}

          {!loading && filtered.length === 0 && (
            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <CardContent>
                <Stack alignItems="center" spacing={2} sx={{ py: 5 }}>
                  <IconBrain size={36} stroke={1.5} color="#94a3b8" />
                  <Typography variant="h6">Nenhuma campanha ainda</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', maxWidth: 340 }}>
                    Crie a primeira campanha para começar a rastrear predições vs. resultados reais.
                  </Typography>
                  <Button variant="contained" startIcon={<IconPlus size={16} />} onClick={() => setCreateOpen(true)}>
                    Nova campanha
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          )}

          <Stack spacing={1.5}>
            {filtered.map((c) => {
              const isSelected = c.id === selectedId;
              return (
                <Card
                  key={c.id}
                  variant="outlined"
                  onClick={() => setSelectedId(isSelected ? null : c.id)}
                  sx={{
                    borderRadius: 3,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    borderColor: isSelected ? 'primary.main' : 'divider',
                    bgcolor: isSelected ? 'primary.lighter' : 'background.paper',
                    '&:hover': { borderColor: 'primary.light', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
                  }}
                >
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {c.name}
                        </Typography>
                        <Stack direction="row" spacing={0.75} sx={{ mt: 0.5 }} flexWrap="wrap">
                          <Chip size="small" label={objectiveLabel(c.objective)} variant="outlined" sx={{ height: 18, fontSize: '0.62rem' }} />
                          <Chip size="small" label={c.status} color={statusColor(c.status)} sx={{ height: 18, fontSize: '0.62rem' }} />
                        </Stack>
                      </Box>
                      <Box sx={{ textAlign: 'right', flexShrink: 0, ml: 1 }}>
                        {c.budget_brl && (
                          <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>{fmtBrl(c.budget_brl)}</Typography>
                        )}
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <IconCalendar size={11} color="#94a3b8" />
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>{fmtDate(c.start_date)}</Typography>
                        </Stack>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        </Grid>

        {/* Right: campaign detail */}
        {selected && (
          <Grid size={{ xs: 12, md: 8 }}>
            <Box sx={{ position: 'sticky', top: 16 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                <Typography variant="subtitle2" color="text.secondary">Detalhes da campanha</Typography>
                <IconButton size="small" onClick={() => setSelectedId(null)}><IconX size={16} /></IconButton>
              </Stack>
              <CampaignDetail campaign={selected} clientId={clientId} onRefresh={load} />
            </Box>
          </Grid>
        )}
      </Grid>

      <CreateCampaignDialog
        open={createOpen}
        clientId={clientId}
        onClose={() => setCreateOpen(false)}
        onCreated={load}
      />
    </Box>
  );
}
