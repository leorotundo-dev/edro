'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import AppShell from '@/components/AppShell';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import {
  IconArrowDown,
  IconArrowRight,
  IconArrowUp,
  IconBrandInstagram,
  IconBrandLinkedin,
  IconBrandFacebook,
  IconChevronRight,
  IconCircleCheck,
  IconEye,
  IconLink,
  IconPlus,
  IconSend,
  IconTrash,
  IconWorld,
} from '@tabler/icons-react';
import { apiGet, apiPost, apiPut } from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

type ReportStatus = 'draft' | 'pending_approval' | 'approved' | 'published';

type KPI = {
  key: string;
  label: string;
  value: number;
  previous_value: number | null;
  trend: 'up' | 'down' | 'stable';
  context: string | null;
};

type Channel = {
  platform: string;
  label: string;
  kpis: KPI[];
};

type FeaturedDeliverable = {
  job_id?: string;
  title: string;
  category: string;
  description: string;
  image_url?: string | null;
};

type FullJobItem = {
  id: string;
  title: string;
  job_type: string;
  status: string;
  completed_at: string | null;
};

type Priority = { title: string; description: string };
type Risk = { description: string; owner: string };

type ReportSections = {
  status: { color: 'green' | 'yellow' | 'red'; headline: string; override: boolean };
  deliverables: { featured: FeaturedDeliverable[]; total_count: number; insight: string | null };
  metrics: { channels: Channel[]; insight: string | null };
  next_steps: { priorities: Priority[]; risks: Risk[]; director_action: string | null };
};

type MonthlyReport = {
  id: string;
  client_id: string;
  client_name: string;
  period_month: string;
  status: ReportStatus;
  sections: ReportSections;
  auto_data: { jobs_snapshot: FullJobItem[]; generated_at: string };
  access_token: string;
  approved_at: string | null;
  published_at: string | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function monthLabel(m: string) {
  const [y, mo] = m.split('-').map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
}

function capitalise(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const STATUS_META: Record<
  ReportStatus,
  { label: string; color: 'default' | 'warning' | 'success' | 'primary' }
> = {
  draft: { label: 'Rascunho', color: 'default' },
  pending_approval: { label: 'Aguardando aprovação', color: 'warning' },
  approved: { label: 'Aprovado', color: 'success' },
  published: { label: 'Publicado', color: 'primary' },
};

const PLATFORM_ICON: Record<string, React.ReactNode> = {
  instagram: <IconBrandInstagram size={18} />,
  linkedin: <IconBrandLinkedin size={18} />,
  facebook: <IconBrandFacebook size={18} />,
};

const TREND_ICON: Record<KPI['trend'], React.ReactNode> = {
  up: <IconArrowUp size={14} color="#22c55e" />,
  down: <IconArrowDown size={14} color="#ef4444" />,
  stable: <IconArrowRight size={14} color="#94a3b8" />,
};

const TREND_COLOR: Record<KPI['trend'], string> = {
  up: '#22c55e',
  down: '#ef4444',
  stable: '#94a3b8',
};

const MAX_FEATURED = 5;

function formatNumber(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ── Section header ─────────────────────────────────────────────────────────────

function SectionHeader({ number, title }: { number: string; title: string }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2.5 }}>
      <Typography
        variant="overline"
        sx={{ fontWeight: 700, color: 'primary.main', fontSize: '0.65rem', lineHeight: 1 }}
      >
        {number}
      </Typography>
      <Typography variant="subtitle1" fontWeight={700}>
        {title}
      </Typography>
    </Stack>
  );
}

// ── Section wrapper ────────────────────────────────────────────────────────────

function Section({ children }: { children: React.ReactNode }) {
  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 3,
        p: 3,
      }}
    >
      {children}
    </Paper>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ReportBuilderClient({
  params,
}: {
  params: Promise<{ clientId: string; month: string }>;
}) {
  const { clientId, month } = use(params);
  const theme = useTheme();

  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [sections, setSections] = useState<ReportSections | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Debounce save
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reportIdRef = useRef<string | null>(null);

  // ── Load ───────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const res = await apiGet<{ report: MonthlyReport }>(
        `/monthly-reports/${clientId}/${month}`,
      );
      setReport(res.report);
      setSections(res.report.sections);
      reportIdRef.current = res.report.id;
    } catch (e: any) {
      if (e?.status === 404) {
        setNotFound(true);
      } else {
        toast('Erro ao carregar relatório.', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [clientId, month]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Auto-save ──────────────────────────────────────────────────────────────

  function scheduleSave(nextSections: ReportSections) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (!reportIdRef.current) return;
      try {
        await apiPut(`/monthly-reports/${reportIdRef.current}`, { sections: nextSections });
        toast('Rascunho salvo.', 'success');
      } catch {
        toast('Erro ao salvar rascunho.', 'error');
      }
    }, 2000);
  }

  function patchSections(updater: (prev: ReportSections) => ReportSections) {
    setSections((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      scheduleSave(next);
      return next;
    });
  }

  // ── Toast ──────────────────────────────────────────────────────────────────

  function toast(message: string, severity: 'success' | 'error' = 'success') {
    setSnack({ open: true, message, severity });
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  async function handleGenerate() {
    setActionLoading(true);
    try {
      const res = await apiPost<{ report: MonthlyReport }>('/monthly-reports/generate', {
        clientId,
        periodMonth: month,
      });
      setReport(res.report);
      setSections(res.report.sections);
      reportIdRef.current = res.report.id;
      setNotFound(false);
      toast('Relatório gerado com sucesso.');
    } catch (e: any) {
      toast(e?.message ?? 'Erro ao gerar relatório.', 'error');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSaveDraft() {
    if (!reportIdRef.current || !sections) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setActionLoading(true);
    try {
      await apiPut(`/monthly-reports/${reportIdRef.current}`, { sections });
      toast('Rascunho salvo.');
    } catch (e: any) {
      toast(e?.message ?? 'Erro ao salvar.', 'error');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSendForApproval() {
    if (!reportIdRef.current) return;
    setActionLoading(true);
    try {
      const res = await apiPost<{ report: MonthlyReport }>(
        `/monthly-reports/${reportIdRef.current}/submit`,
      );
      setReport(res.report);
      toast('Enviado para aprovação do cliente.');
    } catch (e: any) {
      toast(e?.message ?? 'Erro ao enviar.', 'error');
    } finally {
      setActionLoading(false);
    }
  }

  async function handlePublish() {
    if (!reportIdRef.current) return;
    setActionLoading(true);
    try {
      const res = await apiPost<{ report: MonthlyReport }>(
        `/monthly-reports/${reportIdRef.current}/publish`,
      );
      setReport(res.report);
      toast('Publicado para o diretor.');
    } catch (e: any) {
      toast(e?.message ?? 'Erro ao publicar.', 'error');
    } finally {
      setActionLoading(false);
    }
  }

  function handleCopyLink() {
    if (!report?.access_token) return;
    const url = `${window.location.origin}/r/${report.access_token}`;
    navigator.clipboard.writeText(url).then(() => toast('Link copiado!'));
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const statusMeta = report ? STATUS_META[report.status] : null;

  const topbarRight = report ? (
    <Stack direction="row" spacing={1} alignItems="center">
      {statusMeta && (
        <Chip
          label={statusMeta.label}
          color={statusMeta.color}
          size="small"
          sx={{ fontWeight: 600 }}
        />
      )}
      {report.status === 'draft' && (
        <>
          <Button
            size="small"
            variant="outlined"
            disabled={actionLoading}
            onClick={handleSaveDraft}
          >
            Salvar rascunho
          </Button>
          <Button
            size="small"
            variant="contained"
            startIcon={actionLoading ? <CircularProgress size={14} color="inherit" /> : <IconSend size={14} />}
            disabled={actionLoading}
            onClick={handleSendForApproval}
          >
            Enviar para aprovação
          </Button>
        </>
      )}
      {report.status === 'pending_approval' && (
        <Button
          size="small"
          variant="outlined"
          disabled={actionLoading}
          onClick={handleSaveDraft}
        >
          Salvar rascunho
        </Button>
      )}
      {report.status === 'approved' && (
        <Button
          size="small"
          variant="contained"
          color="success"
          startIcon={actionLoading ? <CircularProgress size={14} color="inherit" /> : <IconCircleCheck size={14} />}
          disabled={actionLoading}
          onClick={handlePublish}
        >
          Publicar para o diretor
        </Button>
      )}
      {report.status === 'published' && (
        <>
          <Button
            size="small"
            variant="outlined"
            startIcon={<IconEye size={14} />}
            href={`/r/${report.access_token}`}
            target="_blank"
          >
            Ver como diretor
          </Button>
          <Tooltip title="Copiar link">
            <IconButton size="small" onClick={handleCopyLink}>
              <IconLink size={16} />
            </IconButton>
          </Tooltip>
        </>
      )}
    </Stack>
  ) : undefined;

  // ── Breadcrumb ─────────────────────────────────────────────────────────────

  const topbarLeft = (
    <Stack direction="row" alignItems="center" spacing={0.5}>
      <Typography variant="body2" color="text.secondary">
        Relatórios
      </Typography>
      <IconChevronRight size={14} color={theme.palette.text.disabled} />
      <Typography variant="body2" color="text.secondary">
        {report?.client_name ?? '…'}
      </Typography>
      <IconChevronRight size={14} color={theme.palette.text.disabled} />
      <Typography variant="body2" fontWeight={600}>
        {capitalise(monthLabel(month))}
      </Typography>
    </Stack>
  );

  return (
    <AppShell
      title="Construtor de Relatório"
      topbarLeft={topbarLeft}
      topbarRight={topbarRight}
    >
      {/* Loading */}
      {loading && (
        <Stack alignItems="center" justifyContent="center" py={10}>
          <CircularProgress />
        </Stack>
      )}

      {/* Not found */}
      {!loading && notFound && (
        <Stack alignItems="center" justifyContent="center" py={10} spacing={2}>
          <Typography variant="h6" color="text.secondary">
            Nenhum relatório encontrado para este mês.
          </Typography>
          <Button
            variant="contained"
            startIcon={actionLoading ? <CircularProgress size={14} color="inherit" /> : <IconPlus size={16} />}
            disabled={actionLoading}
            onClick={handleGenerate}
          >
            Gerar primeiro rascunho
          </Button>
        </Stack>
      )}

      {/* Builder */}
      {!loading && report && sections && (
        <Stack spacing={3}>

          {/* Generate button when draft */}
          {report.status === 'draft' && (
            <Stack direction="row" justifyContent="flex-end">
              <Button
                variant="text"
                size="small"
                startIcon={actionLoading ? <CircularProgress size={14} color="inherit" /> : <IconWorld size={14} />}
                disabled={actionLoading}
                onClick={handleGenerate}
                sx={{ color: 'text.secondary' }}
              >
                Gerar automaticamente
              </Button>
            </Stack>
          )}

          {/* ── Seção 1: Status ─────────────────────────────────────────── */}
          <Section>
            <SectionHeader number="01" title="Status do mês" />
            <Stack spacing={3}>
              {/* Color selector */}
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                  Semáforo
                </Typography>
                <Stack direction="row" spacing={1.5}>
                  {(
                    [
                      { value: 'green', label: 'Verde', bg: '#22c55e', emoji: '🟢' },
                      { value: 'yellow', label: 'Amarelo', bg: '#f59e0b', emoji: '🟡' },
                      { value: 'red', label: 'Vermelho', bg: '#ef4444', emoji: '🔴' },
                    ] as const
                  ).map(({ value, label, bg, emoji }) => {
                    const selected = sections.status.color === value;
                    return (
                      <Button
                        key={value}
                        variant={selected ? 'contained' : 'outlined'}
                        onClick={() =>
                          patchSections((prev) => ({
                            ...prev,
                            status: { ...prev.status, color: value, override: true },
                          }))
                        }
                        sx={{
                          minWidth: 120,
                          fontWeight: 700,
                          borderColor: selected ? bg : alpha(bg, 0.4),
                          bgcolor: selected ? bg : alpha(bg, 0.08),
                          color: selected ? '#fff' : bg,
                          '&:hover': {
                            bgcolor: selected ? bg : alpha(bg, 0.15),
                            borderColor: bg,
                          },
                        }}
                      >
                        {emoji} {label}
                      </Button>
                    );
                  })}
                </Stack>
              </Box>

              {/* Headline */}
              <Box>
                <TextField
                  fullWidth
                  label="Headline do mês"
                  placeholder="Ex: Março: infraestrutura destravada, foco em backoffice corporativo."
                  value={sections.status.headline}
                  onChange={(e) =>
                    patchSections((prev) => ({
                      ...prev,
                      status: { ...prev.status, headline: e.target.value },
                    }))
                  }
                  inputProps={{ maxLength: 200 }}
                />
                <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
                  Uma linha. O diretor lê isso em 5 segundos.
                </Typography>
              </Box>
            </Stack>
          </Section>

          {/* ── Seção 2: Entregas ───────────────────────────────────────── */}
          <Section>
            <SectionHeader number="02" title="Entregas em destaque" />

            {report.auto_data.jobs_snapshot.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Nenhum job concluído registrado neste mês.
              </Typography>
            ) : (
              <Stack spacing={1.5}>
                {report.auto_data.jobs_snapshot.map((job) => {
                  const featured = sections.deliverables.featured.find(
                    (f) => f.job_id === job.id,
                  );
                  const isSelected = Boolean(featured);
                  const atMax =
                    !isSelected && sections.deliverables.featured.length >= MAX_FEATURED;

                  return (
                    <Box key={job.id}>
                      <Paper
                        elevation={0}
                        sx={{
                          border: '1px solid',
                          borderColor: isSelected ? 'primary.main' : 'divider',
                          borderRadius: 2,
                          p: 1.5,
                          bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.04) : 'background.paper',
                        }}
                      >
                        <Stack direction="row" alignItems="flex-start" spacing={1.5}>
                          <Checkbox
                            checked={isSelected}
                            disabled={atMax}
                            size="small"
                            onChange={(e) => {
                              if (e.target.checked) {
                                patchSections((prev) => ({
                                  ...prev,
                                  deliverables: {
                                    ...prev.deliverables,
                                    featured: [
                                      ...prev.deliverables.featured,
                                      {
                                        job_id: job.id,
                                        title: job.title,
                                        category: '',
                                        description: '',
                                      },
                                    ],
                                  },
                                }));
                              } else {
                                patchSections((prev) => ({
                                  ...prev,
                                  deliverables: {
                                    ...prev.deliverables,
                                    featured: prev.deliverables.featured.filter(
                                      (f) => f.job_id !== job.id,
                                    ),
                                  },
                                }));
                              }
                            }}
                            sx={{ mt: -0.25 }}
                          />
                          <Box sx={{ flex: 1 }}>
                            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                              <Typography variant="body2" fontWeight={600}>
                                {job.title}
                              </Typography>
                              <Chip
                                label={job.job_type}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: '0.65rem' }}
                              />
                              {atMax && (
                                <Chip
                                  label={`Máx. ${MAX_FEATURED} atingido`}
                                  size="small"
                                  color="warning"
                                  sx={{ fontSize: '0.65rem' }}
                                />
                              )}
                            </Stack>

                            {/* Inline form when selected */}
                            {isSelected && featured && (
                              <Stack spacing={1.5} sx={{ mt: 1.5 }}>
                                <TextField
                                  size="small"
                                  label="Categoria"
                                  placeholder="CAPEX / B2B / Governança / Digital…"
                                  value={featured.category}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    patchSections((prev) => ({
                                      ...prev,
                                      deliverables: {
                                        ...prev.deliverables,
                                        featured: prev.deliverables.featured.map((f) =>
                                          f.job_id === job.id ? { ...f, category: val } : f,
                                        ),
                                      },
                                    }));
                                  }}
                                />
                                <TextField
                                  size="small"
                                  multiline
                                  minRows={2}
                                  maxRows={4}
                                  label="Descrição de impacto"
                                  placeholder="Uma linha conectando a entrega ao resultado"
                                  value={featured.description}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    patchSections((prev) => ({
                                      ...prev,
                                      deliverables: {
                                        ...prev.deliverables,
                                        featured: prev.deliverables.featured.map((f) =>
                                          f.job_id === job.id ? { ...f, description: val } : f,
                                        ),
                                      },
                                    }));
                                  }}
                                />
                              </Stack>
                            )}
                          </Box>
                        </Stack>
                      </Paper>
                    </Box>
                  );
                })}
              </Stack>
            )}

            <Divider sx={{ my: 2 }} />
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="caption" color="text.secondary">
                Total de entregas do mês:{' '}
                <strong>{sections.deliverables.total_count}</strong>
              </Typography>
              <Typography variant="caption" color="text.disabled">
                {sections.deliverables.featured.length}/{MAX_FEATURED} destaques selecionados
              </Typography>
            </Stack>
          </Section>

          {/* ── Seção 3: Métricas ───────────────────────────────────────── */}
          <Section>
            <SectionHeader number="03" title="Métricas de canal" />

            {sections.metrics.channels.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Nenhuma métrica de canal disponível para este mês.
              </Typography>
            ) : (
              <Stack spacing={3}>
                {sections.metrics.channels.map((channel, ci) => (
                  <Box key={channel.platform}>
                    {/* Channel header */}
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                      {PLATFORM_ICON[channel.platform.toLowerCase()] ?? <IconWorld size={18} />}
                      <Typography variant="subtitle2" fontWeight={700}>
                        {channel.label}
                      </Typography>
                    </Stack>

                    {/* KPI grid */}
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                        gap: 1.5,
                        mb: 2,
                      }}
                    >
                      {channel.kpis.map((kpi, ki) => (
                        <Paper
                          key={kpi.key}
                          elevation={0}
                          sx={{
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 2,
                            p: 1.5,
                          }}
                        >
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: 'block', mb: 0.5 }}
                          >
                            {kpi.label}
                          </Typography>
                          <Stack direction="row" alignItems="center" spacing={0.5}>
                            <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1 }}>
                              {formatNumber(kpi.value)}
                            </Typography>
                            {TREND_ICON[kpi.trend]}
                          </Stack>
                          {kpi.previous_value !== null && (
                            <Typography
                              variant="caption"
                              sx={{ color: TREND_COLOR[kpi.trend], display: 'block', mt: 0.25 }}
                            >
                              ant: {formatNumber(kpi.previous_value)}
                            </Typography>
                          )}
                          <TextField
                            size="small"
                            placeholder="Contexto (opcional)"
                            value={kpi.context ?? ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              patchSections((prev) => {
                                const channels = prev.metrics.channels.map((ch, cIdx) => {
                                  if (cIdx !== ci) return ch;
                                  return {
                                    ...ch,
                                    kpis: ch.kpis.map((k, kIdx) =>
                                      kIdx === ki ? { ...k, context: val || null } : k,
                                    ),
                                  };
                                });
                                return { ...prev, metrics: { ...prev.metrics, channels } };
                              });
                            }}
                            sx={{ mt: 1, '& .MuiInputBase-input': { fontSize: '0.72rem' } }}
                            fullWidth
                          />
                        </Paper>
                      ))}
                    </Box>

                    {ci < sections.metrics.channels.length - 1 && <Divider />}
                  </Box>
                ))}

                {/* Strategic insight */}
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block', fontWeight: 600 }}>
                    Insight estratégico
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    minRows={2}
                    maxRows={5}
                    placeholder="O que os números dizem em conjunto? Qual a narrativa para o diretor?"
                    value={sections.metrics.insight ?? ''}
                    onChange={(e) =>
                      patchSections((prev) => ({
                        ...prev,
                        metrics: { ...prev.metrics, insight: e.target.value || null },
                      }))
                    }
                  />
                </Box>
              </Stack>
            )}
          </Section>

          {/* ── Seção 4: Próximos 30 dias ────────────────────────────────── */}
          <Section>
            <SectionHeader number="04" title="Próximos 30 dias" />
            <Stack spacing={3}>

              {/* Priorities */}
              <Box>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                  <Typography variant="body2" fontWeight={700}>
                    Prioridades
                  </Typography>
                  <Button
                    size="small"
                    variant="text"
                    startIcon={<IconPlus size={14} />}
                    disabled={sections.next_steps.priorities.length >= 3}
                    onClick={() =>
                      patchSections((prev) => ({
                        ...prev,
                        next_steps: {
                          ...prev.next_steps,
                          priorities: [
                            ...prev.next_steps.priorities,
                            { title: '', description: '' },
                          ],
                        },
                      }))
                    }
                  >
                    Adicionar prioridade
                  </Button>
                </Stack>

                {sections.next_steps.priorities.length === 0 ? (
                  <Typography variant="caption" color="text.disabled">
                    Nenhuma prioridade adicionada.
                  </Typography>
                ) : (
                  <Stack spacing={1.5}>
                    {sections.next_steps.priorities.map((p, idx) => (
                      <Paper
                        key={idx}
                        elevation={0}
                        sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5 }}
                      >
                        <Stack direction="row" alignItems="flex-start" spacing={1}>
                          <Box sx={{ flex: 1 }}>
                            <Stack spacing={1}>
                              <TextField
                                size="small"
                                label="Título"
                                fullWidth
                                value={p.title}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  patchSections((prev) => ({
                                    ...prev,
                                    next_steps: {
                                      ...prev.next_steps,
                                      priorities: prev.next_steps.priorities.map((item, i) =>
                                        i === idx ? { ...item, title: val } : item,
                                      ),
                                    },
                                  }));
                                }}
                              />
                              <TextField
                                size="small"
                                label="Descrição"
                                fullWidth
                                multiline
                                minRows={1}
                                maxRows={3}
                                value={p.description}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  patchSections((prev) => ({
                                    ...prev,
                                    next_steps: {
                                      ...prev.next_steps,
                                      priorities: prev.next_steps.priorities.map((item, i) =>
                                        i === idx ? { ...item, description: val } : item,
                                      ),
                                    },
                                  }));
                                }}
                              />
                            </Stack>
                          </Box>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() =>
                              patchSections((prev) => ({
                                ...prev,
                                next_steps: {
                                  ...prev.next_steps,
                                  priorities: prev.next_steps.priorities.filter((_, i) => i !== idx),
                                },
                              }))
                            }
                          >
                            <IconTrash size={15} />
                          </IconButton>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </Box>

              <Divider />

              {/* Risks */}
              <Box>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                  <Typography variant="body2" fontWeight={700}>
                    Riscos
                  </Typography>
                  <Button
                    size="small"
                    variant="text"
                    startIcon={<IconPlus size={14} />}
                    onClick={() =>
                      patchSections((prev) => ({
                        ...prev,
                        next_steps: {
                          ...prev.next_steps,
                          risks: [...prev.next_steps.risks, { description: '', owner: '' }],
                        },
                      }))
                    }
                  >
                    Adicionar risco
                  </Button>
                </Stack>

                {sections.next_steps.risks.length === 0 ? (
                  <Typography variant="caption" color="text.disabled">
                    Nenhum risco registrado.
                  </Typography>
                ) : (
                  <Stack spacing={1.5}>
                    {sections.next_steps.risks.map((r, idx) => (
                      <Paper
                        key={idx}
                        elevation={0}
                        sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5 }}
                      >
                        <Stack direction="row" alignItems="flex-start" spacing={1}>
                          <Box sx={{ flex: 1 }}>
                            <Stack spacing={1}>
                              <TextField
                                size="small"
                                label="Risco"
                                fullWidth
                                value={r.description}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  patchSections((prev) => ({
                                    ...prev,
                                    next_steps: {
                                      ...prev.next_steps,
                                      risks: prev.next_steps.risks.map((item, i) =>
                                        i === idx ? { ...item, description: val } : item,
                                      ),
                                    },
                                  }));
                                }}
                              />
                              <TextField
                                size="small"
                                label="Responsável"
                                fullWidth
                                value={r.owner}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  patchSections((prev) => ({
                                    ...prev,
                                    next_steps: {
                                      ...prev.next_steps,
                                      risks: prev.next_steps.risks.map((item, i) =>
                                        i === idx ? { ...item, owner: val } : item,
                                      ),
                                    },
                                  }));
                                }}
                              />
                            </Stack>
                          </Box>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() =>
                              patchSections((prev) => ({
                                ...prev,
                                next_steps: {
                                  ...prev.next_steps,
                                  risks: prev.next_steps.risks.filter((_, i) => i !== idx),
                                },
                              }))
                            }
                          >
                            <IconTrash size={15} />
                          </IconButton>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </Box>

              <Divider />

              {/* Director action */}
              <Box>
                <Typography variant="body2" fontWeight={700} sx={{ mb: 1 }}>
                  Ação que depende do diretor
                </Typography>
                <TextField
                  fullWidth
                  placeholder="O que precisa ser decidido ou aprovado por ele? (opcional)"
                  value={sections.next_steps.director_action ?? ''}
                  onChange={(e) =>
                    patchSections((prev) => ({
                      ...prev,
                      next_steps: {
                        ...prev.next_steps,
                        director_action: e.target.value || null,
                      },
                    }))
                  }
                />
              </Box>
            </Stack>
          </Section>
        </Stack>
      )}

      {/* Toast */}
      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snack.severity}
          onClose={() => setSnack((prev) => ({ ...prev, open: false }))}
          sx={{ width: '100%' }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </AppShell>
  );
}
