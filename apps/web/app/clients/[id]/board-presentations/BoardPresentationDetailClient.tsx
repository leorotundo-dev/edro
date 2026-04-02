'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { IconArrowLeft, IconCheck, IconDeviceFloppy, IconPresentation, IconSparkles } from '@tabler/icons-react';
import { apiGet, apiPatch, apiPost, buildApiUrl } from '@/lib/api';

type BoardPresentationMetricBlock = {
  label: string;
  value: string;
  footnote?: string;
  tone: 'neutral' | 'positive' | 'warning';
  source: string;
  platform?: string;
};

type BoardPresentationSlideBlock = {
  heading: string;
  bullets: string[];
  body?: string;
};

type BoardPresentationChart = {
  type: 'line' | 'bar';
  title: string;
  categories: string[];
  series: Array<{ name: string; values: number[] }>;
  y_label?: string;
  source: string;
};

type BoardPresentationSlide = {
  key: string;
  order: number;
  title: string;
  subtitle?: string;
  kicker?: string;
  blocks: BoardPresentationSlideBlock[];
  big_numbers: BoardPresentationMetricBlock[];
  charts: BoardPresentationChart[];
  notes?: string;
  data_sources: string[];
};

type BoardPresentationManualInputs = {
  diretriz_da_ultima_reuniao: string;
  leitura_geral_do_mes: string;
  ponto_de_atencao_do_mes: string;
  proximos_passos_para_o_board: string;
};

type BoardPresentationReadiness = {
  status: 'ready' | 'blocked';
  blocking_reasons: string[];
  missing_metrics: Array<{ platform: string; metric: string; reason: string }>;
};

type BoardPresentationDetail = {
  id: string;
  period_month: string;
  status: 'draft' | 'review' | 'approved' | 'exported';
  source_snapshot: {
    client: { name: string };
    period: { label: string };
    readiness: BoardPresentationReadiness;
  };
  manual_inputs: BoardPresentationManualInputs;
  effective_slides: BoardPresentationSlide[];
  pptx_key: string | null;
};

const EMPTY_MANUAL_INPUTS: BoardPresentationManualInputs = {
  diretriz_da_ultima_reuniao: '',
  leitura_geral_do_mes: '',
  ponto_de_atencao_do_mes: '',
  proximos_passos_para_o_board: '',
};

function bulletsToText(value: string[]) {
  return value.join('\n');
}

function bulletsFromText(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);
}

function statusColor(status: BoardPresentationDetail['status']) {
  if (status === 'exported') return 'success';
  if (status === 'approved') return 'primary';
  if (status === 'review') return 'warning';
  return 'default';
}

export default function BoardPresentationDetailClient({
  clientId,
  presentationId,
}: {
  clientId: string;
  presentationId: string;
}) {
  const [presentation, setPresentation] = useState<BoardPresentationDetail | null>(null);
  const [manualInputs, setManualInputs] = useState<BoardPresentationManualInputs>(EMPTY_MANUAL_INPUTS);
  const [slides, setSlides] = useState<BoardPresentationSlide[]>([]);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [savingInputs, setSavingInputs] = useState(false);
  const [savingSlides, setSavingSlides] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [approving, setApproving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadPresentation = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiGet<{ presentation: BoardPresentationDetail }>(
        `/clients/${clientId}/board-presentations/${presentationId}`,
      );
      setPresentation(data.presentation);
      setManualInputs(data.presentation.manual_inputs || EMPTY_MANUAL_INPUTS);
      setSlides(data.presentation.effective_slides || []);
      setActiveSlideIndex(0);
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar apresentação.');
    } finally {
      setLoading(false);
    }
  }, [clientId, presentationId]);

  useEffect(() => {
    loadPresentation();
  }, [loadPresentation]);

  const activeSlide = slides[activeSlideIndex] || null;

  const handleManualInputChange = (field: keyof BoardPresentationManualInputs, value: string) => {
    setManualInputs((current) => ({ ...current, [field]: value }));
  };

  const updateSlide = (mutator: (slide: BoardPresentationSlide) => BoardPresentationSlide) => {
    setSlides((current) => current.map((slide, index) => (
      index === activeSlideIndex ? mutator(slide) : slide
    )));
  };

  const saveManualInputs = async () => {
    setSavingInputs(true);
    setError('');
    setSuccess('');
    try {
      const data = await apiPatch<{ presentation: BoardPresentationDetail }>(
        `/clients/${clientId}/board-presentations/${presentationId}/manual-inputs`,
        { manual_inputs: manualInputs },
      );
      setPresentation(data.presentation);
      setManualInputs(data.presentation.manual_inputs);
      setSuccess('Contexto executivo salvo.');
    } catch (err: any) {
      setError(err?.message || 'Erro ao salvar contexto.');
    } finally {
      setSavingInputs(false);
    }
  };

  const generateNarrative = async () => {
    setGenerating(true);
    setError('');
    setSuccess('');
    try {
      const data = await apiPost<{ presentation: BoardPresentationDetail }>(
        `/clients/${clientId}/board-presentations/${presentationId}/generate-ai-draft`,
      );
      setPresentation(data.presentation);
      setSlides(data.presentation.effective_slides);
      setActiveSlideIndex(0);
      setSuccess('Rascunho executivo gerado com sucesso.');
    } catch (err: any) {
      setError(err?.message || 'Erro ao gerar rascunho executivo.');
    } finally {
      setGenerating(false);
    }
  };

  const saveSlides = async () => {
    setSavingSlides(true);
    setError('');
    setSuccess('');
    try {
      const data = await apiPatch<{ presentation: BoardPresentationDetail }>(
        `/clients/${clientId}/board-presentations/${presentationId}/slides`,
        { slides },
      );
      setPresentation(data.presentation);
      setSlides(data.presentation.effective_slides);
      setSuccess('Slides revisados salvos.');
    } catch (err: any) {
      setError(err?.message || 'Erro ao salvar slides.');
    } finally {
      setSavingSlides(false);
    }
  };

  const approvePresentation = async () => {
    setApproving(true);
    setError('');
    setSuccess('');
    try {
      const data = await apiPost<{ presentation: BoardPresentationDetail }>(
        `/clients/${clientId}/board-presentations/${presentationId}/approve`,
      );
      setPresentation(data.presentation);
      setSuccess('Apresentação aprovada para exportação.');
    } catch (err: any) {
      setError(err?.message || 'Erro ao aprovar apresentação.');
    } finally {
      setApproving(false);
    }
  };

  const exportPptx = async () => {
    setExporting(true);
    setError('');
    try {
      const response = await fetch(
        buildApiUrl(`/clients/${clientId}/board-presentations/${presentationId}/export-pptx`),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        },
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || 'Erro ao exportar PPTX.');
      }
      const blob = await response.blob();
      const disposition = response.headers.get('content-disposition') || '';
      const match = disposition.match(/filename=\"?([^"]+)\"?/i);
      const fileName = match?.[1] || `board-presentation-${presentationId}.pptx`;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(url);
      await loadPresentation();
      setSuccess('PPTX exportado com sucesso.');
    } catch (err: any) {
      setError(err?.message || 'Erro ao exportar PPTX.');
    } finally {
      setExporting(false);
    }
  };

  const sourceSummary = useMemo(() => {
    if (!activeSlide) return [];
    return activeSlide.big_numbers.slice(0, 4);
  }, [activeSlide]);

  if (loading) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 420 }}>
        <CircularProgress size={28} />
      </Stack>
    );
  }

  if (!presentation) {
    return <Alert severity="error">Não foi possível carregar a apresentação.</Alert>;
  }

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <Button component={Link} href={`/clients/${clientId}/board-presentations`} startIcon={<IconArrowLeft size={16} />}>
          Voltar
        </Button>
        <Chip label={presentation.status} color={statusColor(presentation.status)} size="small" />
      </Stack>

      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>
          {presentation.source_snapshot.client.name} · {presentation.source_snapshot.period.label}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Deck executivo fixo de 9 slides com bloqueio de dados. Slides 3, 5 e 6 sempre carregam os big numbers.
        </Typography>
      </Box>

      {error ? <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert> : null}
      {success ? <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert> : null}

      {presentation.source_snapshot.readiness.status === 'blocked' ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Esta apresentação segue bloqueada por dados. Corrija o preflight antes de aprovar ou exportar.
        </Alert>
      ) : null}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, xl: 4 }}>
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
                Contexto executivo obrigatório
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                O deck não gera narrativa sem esse contexto. É aqui que o Board ganha direção.
              </Typography>
              <Stack spacing={2}>
                <TextField
                  label="Diretriz da última reunião"
                  multiline
                  minRows={3}
                  value={manualInputs.diretriz_da_ultima_reuniao}
                  onChange={(event) => handleManualInputChange('diretriz_da_ultima_reuniao', event.target.value)}
                  fullWidth
                />
                <TextField
                  label="Leitura geral do mês"
                  multiline
                  minRows={3}
                  value={manualInputs.leitura_geral_do_mes}
                  onChange={(event) => handleManualInputChange('leitura_geral_do_mes', event.target.value)}
                  fullWidth
                />
                <TextField
                  label="Ponto de atenção do mês"
                  multiline
                  minRows={3}
                  value={manualInputs.ponto_de_atencao_do_mes}
                  onChange={(event) => handleManualInputChange('ponto_de_atencao_do_mes', event.target.value)}
                  fullWidth
                />
                <TextField
                  label="Próximos passos para o Board"
                  multiline
                  minRows={3}
                  value={manualInputs.proximos_passos_para_o_board}
                  onChange={(event) => handleManualInputChange('proximos_passos_para_o_board', event.target.value)}
                  fullWidth
                />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <Button
                    variant="outlined"
                    startIcon={<IconDeviceFloppy size={16} />}
                    onClick={saveManualInputs}
                    disabled={savingInputs}
                  >
                    Salvar contexto
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<IconSparkles size={16} />}
                    onClick={generateNarrative}
                    disabled={generating || presentation.source_snapshot.readiness.status !== 'ready'}
                  >
                    Gerar rascunho IA
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                Slides do deck
              </Typography>
              <List disablePadding>
                {slides.map((slide, index) => (
                  <ListItemButton
                    key={slide.key}
                    selected={index === activeSlideIndex}
                    onClick={() => setActiveSlideIndex(index)}
                    sx={{ borderRadius: 2, mb: 0.75 }}
                  >
                    <ListItemText
                      primary={`${slide.order}. ${slide.title}`}
                      secondary={slide.kicker || slide.key}
                    />
                  </ListItemButton>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, xl: 8 }}>
          {activeSlide ? (
            <Card variant="outlined">
              <CardContent>
                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  justifyContent="space-between"
                  alignItems={{ xs: 'flex-start', md: 'center' }}
                  spacing={2}
                  sx={{ mb: 2 }}
                >
                  <Box>
                    <Typography variant="overline" color="primary.main">{activeSlide.kicker || activeSlide.key}</Typography>
                    <Typography variant="h5" fontWeight={700}>{activeSlide.title}</Typography>
                    {activeSlide.subtitle ? (
                      <Typography variant="body2" color="text.secondary">{activeSlide.subtitle}</Typography>
                    ) : null}
                  </Box>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Button variant="outlined" onClick={saveSlides} disabled={savingSlides}>
                      Salvar slides
                    </Button>
                    <Button variant="outlined" startIcon={<IconCheck size={16} />} onClick={approvePresentation} disabled={approving}>
                      Aprovar
                    </Button>
                    <Button variant="contained" startIcon={<IconPresentation size={16} />} onClick={exportPptx} disabled={exporting}>
                      Exportar PPTX
                    </Button>
                  </Stack>
                </Stack>

                {sourceSummary.length > 0 ? (
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    {sourceSummary.map((metric) => (
                      <Grid key={`${metric.label}-${metric.value}`} size={{ xs: 12, md: 6 }}>
                        <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
                          <Typography variant="caption" color="text.secondary">{metric.label}</Typography>
                          <Typography variant="h4" fontWeight={800} color="primary.main">{metric.value}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {metric.source}{metric.footnote ? ` · ${metric.footnote}` : ''}
                          </Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                ) : null}

                <Stack spacing={2}>
                  <TextField
                    label="Título do slide"
                    value={activeSlide.title}
                    onChange={(event) => updateSlide((slide) => ({ ...slide, title: event.target.value }))}
                    fullWidth
                  />
                  <TextField
                    label="Subtítulo"
                    value={activeSlide.subtitle || ''}
                    onChange={(event) => updateSlide((slide) => ({ ...slide, subtitle: event.target.value }))}
                    fullWidth
                  />

                  {activeSlide.blocks.map((block, blockIndex) => (
                    <Box key={`${activeSlide.key}-${blockIndex}`} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>Bloco {blockIndex + 1}</Typography>
                      <Stack spacing={2}>
                        <TextField
                          label="Heading"
                          value={block.heading}
                          onChange={(event) => updateSlide((slide) => ({
                            ...slide,
                            blocks: slide.blocks.map((item, itemIndex) => (
                              itemIndex === blockIndex ? { ...item, heading: event.target.value } : item
                            )),
                          }))}
                          fullWidth
                        />
                        <TextField
                          label="Bullets (uma por linha)"
                          multiline
                          minRows={4}
                          value={bulletsToText(block.bullets)}
                          onChange={(event) => updateSlide((slide) => ({
                            ...slide,
                            blocks: slide.blocks.map((item, itemIndex) => (
                              itemIndex === blockIndex
                                ? { ...item, bullets: bulletsFromText(event.target.value) }
                                : item
                            )),
                          }))}
                          fullWidth
                        />
                        <TextField
                          label="Corpo opcional"
                          multiline
                          minRows={2}
                          value={block.body || ''}
                          onChange={(event) => updateSlide((slide) => ({
                            ...slide,
                            blocks: slide.blocks.map((item, itemIndex) => (
                              itemIndex === blockIndex ? { ...item, body: event.target.value } : item
                            )),
                          }))}
                          fullWidth
                        />
                      </Stack>
                    </Box>
                  ))}

                  <Divider />

                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Gráficos didáticos deste slide</Typography>
                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                      {activeSlide.charts.map((chart) => (
                        <Chip key={chart.title} label={`${chart.title} · ${chart.type}`} variant="outlined" />
                      ))}
                      {activeSlide.charts.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">Sem gráfico associado neste slide.</Typography>
                      ) : null}
                    </Stack>
                  </Box>

                  <TextField
                    label="Notas do slide"
                    multiline
                    minRows={3}
                    value={activeSlide.notes || ''}
                    onChange={(event) => updateSlide((slide) => ({ ...slide, notes: event.target.value }))}
                    fullWidth
                  />
                </Stack>
              </CardContent>
            </Card>
          ) : null}
        </Grid>
      </Grid>
    </Box>
  );
}
