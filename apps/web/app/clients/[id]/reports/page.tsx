'use client';

import { useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Radio from '@mui/material/Radio';
import LinearProgress from '@mui/material/LinearProgress';
import Divider from '@mui/material/Divider';
import { IconFileAnalytics, IconDownload, IconMail, IconPresentation, IconChartBar, IconUsers, IconSparkles, IconAlertTriangle, IconBulb, IconTrendingUp, IconFileTypePdf } from '@tabler/icons-react';
import { apiGet, apiPost } from '@/lib/api';
import Chart from '@/components/charts/Chart';
import { baseChartOptions } from '@/utils/chartTheme';
import { useThemeMode } from '@/contexts/ThemeContext';
import CopyRoiPanel from './CopyRoiPanel';

type ReportData = {
  period: { from: string; to: string };
  summary: { total: number; completed: number; overdue: number };
  byStage: { status: string; count: number }[];
  copies: { total_copies: number; avg_chars: number };
  stageTimeline: { stage: string; avg_hours: number }[];
  briefings: { id: string; title: string; status: string; due_at: string; created_at: string }[];
};

type AiSummary = {
  narrative: string;
  strategicReview: string;
  kpis: { label: string; value: string; trend?: string }[];
  bottlenecks: string[];
  highlights: string[];
  riskAlerts: string[];
  marketContext: string | null;
  providers: { provider: string; role: string; model: string; duration_ms: number }[];
  duration_ms: number;
};

type TemplateKey = 'executivo' | 'completo' | 'cliente';

const TEMPLATES: { key: TemplateKey; label: string; description: string; icon: React.ReactNode }[] = [
  { key: 'executivo', label: 'Resumo Executivo', description: 'Stats + gráfico por etapa. 1 página.', icon: <IconPresentation size={20} /> },
  { key: 'completo', label: 'Performance Completo', description: 'Charts + timeline + tabela detalhada.', icon: <IconChartBar size={20} /> },
  { key: 'cliente', label: 'Relatório do Cliente', description: 'Visual limpo, foco em entregas.', icon: <IconUsers size={20} /> },
];

const STAGE_COLORS: Record<string, string> = {
  briefing: '#E85219',
  copy_ia: '#94a3b8',
  aprovacao: '#FFAE1F',
  producao: '#FA896B',
  revisao: '#E85219',
  entrega: '#13DEB9',
  done: '#13DEB9',
};

function escapeAiHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatAiMarkdownToSafeHtml(value: string): string {
  const escaped = escapeAiHtml(value || '');
  return escaped
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>');
}

export default function ClientReportsPage() {
  const params = useParams();
  const clientId = params.id as string;
  const reportRef = useRef<HTMLDivElement>(null);
  const { isDark } = useThemeMode();

  const [template, setTemplate] = useState<TemplateKey>('completo');
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailSent, setEmailSent] = useState('');
  const [aiSummary, setAiSummary] = useState<AiSummary | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const handleDownloadPdf = async () => {
    setPdfLoading(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/reports/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Erro ao gerar PDF.');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-${clientId}-${from}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err?.message || 'Erro ao baixar PDF.');
    } finally {
      setPdfLoading(false);
    }
  };

  const generateReport = async () => {
    setLoading(true);
    setError('');
    setAiSummary(null);
    try {
      const data = await apiGet<ReportData>(`/clients/${clientId}/reports/summary?from=${from}&to=${to}`);
      setReport(data);
    } catch (err: any) {
      setError(err?.message || 'Erro ao gerar relatório.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.open(`/clients/${clientId}/reports/print?template=${template}&from=${from}&to=${to}`, '_blank');
  };

  const handleEmail = async () => {
    const email = prompt('Email do destinatario:');
    if (!email) return;
    try {
      await apiPost(`/clients/${clientId}/reports/email`, {
        recipientEmail: email,
        from,
        to,
        template,
      });
      setEmailSent(`Relatório enviado para ${email}`);
      setTimeout(() => setEmailSent(''), 4000);
    } catch (err: any) {
      setError(err?.message || 'Erro ao enviar email.');
    }
  };

  const handleAiSummary = async () => {
    setAiLoading(true);
    setError('');
    setAiSummary(null);
    try {
      const data = await apiGet<AiSummary>(`/clients/${clientId}/reports/ai-summary?from=${from}&to=${to}&template=${template}`);
      setAiSummary(data);
    } catch (err: any) {
      setError(err?.message || 'Erro ao gerar análise estratégica.');
    } finally {
      setAiLoading(false);
    }
  };

  const showCharts = template === 'completo' || template === 'executivo';
  const showTimeline = template === 'completo';
  const showTable = template === 'completo' || template === 'cliente';
  const showDeliveryFocus = template === 'cliente';

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconFileAnalytics size={28} stroke={1.5} />
        <Box>
          <Typography variant="h5" fontWeight={700}>Relatórios</Typography>
          <Typography variant="body2" color="text.secondary">
            Gere relatórios de performance para este cliente.
          </Typography>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {emailSent && <Alert severity="success" sx={{ mb: 2 }}>{emailSent}</Alert>}

      {/* Template Selector */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {TEMPLATES.map((t) => (
          <Grid key={t.key} size={{ xs: 12, sm: 4 }}>
            <Card
              variant="outlined"
              onClick={() => setTemplate(t.key)}
              sx={{
                cursor: 'pointer',
                borderColor: template === t.key ? '#E85219' : 'divider',
                borderWidth: template === t.key ? 2 : 1,
                bgcolor: template === t.key ? 'rgba(232,82,25,0.04)' : 'transparent',
                transition: 'all 0.15s',
                '&:hover': { borderColor: '#E85219' },
              }}
            >
              <CardContent sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, py: 1.5 }}>
                <Radio checked={template === t.key} size="small" sx={{ p: 0, mt: 0.2, color: '#E85219', '&.Mui-checked': { color: '#E85219' } }} />
                <Box>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    {t.icon}
                    <Typography variant="subtitle2" fontWeight={700}>{t.label}</Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">{t.description}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Controls */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
            <TextField label="De" type="date" value={from} onChange={(e) => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} size="small" />
            <TextField label="Ate" type="date" value={to} onChange={(e) => setTo(e.target.value)} InputLabelProps={{ shrink: true }} size="small" />
            <Button variant="contained" onClick={generateReport} disabled={loading} sx={{ bgcolor: '#E85219', '&:hover': { bgcolor: '#c43e10' } }}>
              {loading ? <CircularProgress size={20} /> : 'Gerar Relatório'}
            </Button>
            {report && (
              <>
                <Button
                  variant="contained"
                  startIcon={aiLoading ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <IconSparkles size={18} />}
                  onClick={handleAiSummary}
                  disabled={aiLoading}
                  sx={{ bgcolor: '#7c3aed', '&:hover': { bgcolor: '#6d28d9' } }}
                >
                  {aiLoading ? 'Analisando...' : 'Análise Estratégica'}
                </Button>
                <Button variant="outlined" startIcon={<IconDownload size={18} />} onClick={handlePrint}>
                  Imprimir / PDF
                </Button>
                <Button
                  variant="contained"
                  startIcon={pdfLoading ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <IconFileTypePdf size={18} />}
                  onClick={handleDownloadPdf}
                  disabled={pdfLoading}
                  sx={{ bgcolor: '#E85219', '&:hover': { bgcolor: '#c94a17' }, fontWeight: 700, textTransform: 'none' }}
                >
                  {pdfLoading ? 'Gerando PDF…' : 'Baixar PDF com IA'}
                </Button>
                <Button variant="outlined" startIcon={<IconMail size={18} />} onClick={handleEmail}>
                  Enviar Email
                </Button>
              </>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Report Preview */}
      {report && (
        <Box ref={reportRef} id="report-preview">
          {/* Summary Stats */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 6, md: 3 }}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" fontWeight={700} color="primary">{report.summary.total}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {showDeliveryFocus ? 'Demandas' : 'Briefings'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" fontWeight={700} color="success.main">{report.summary.completed}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {showDeliveryFocus ? 'Entregues' : 'Concluidos'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" fontWeight={700} color="error.main">{report.summary.overdue}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {showDeliveryFocus ? 'Pendentes' : 'Atrasados'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" fontWeight={700}>{report.copies.total_copies}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {showDeliveryFocus ? 'Pecas Criadas' : 'Copies Geradas'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Charts Row: By Stage + Stage Timeline */}
          {showCharts && (
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {report.byStage.length > 0 && (
                <Grid size={{ xs: 12, md: showTimeline ? 5 : 12 }}>
                  <Card variant="outlined" sx={{ height: '100%' }}>
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 1 }}>
                        {showDeliveryFocus ? 'Status das Demandas' : 'Briefings por Etapa'}
                      </Typography>
                      <Chart
                        type="donut"
                        height={280}
                        series={report.byStage.map((s) => s.count)}
                        options={{
                          chart: { type: 'donut' as const },
                          labels: report.byStage.map((s) => s.status),
                          colors: report.byStage.map((s) => STAGE_COLORS[s.status] || '#94a3b8'),
                          legend: { position: 'bottom' as const },
                          dataLabels: { formatter: (val: number) => `${val.toFixed(0)}%` },
                          tooltip: { y: { formatter: (v: number) => `${v} briefings` } },
                        }}
                      />
                    </CardContent>
                  </Card>
                </Grid>
              )}
              {showTimeline && report.stageTimeline.length > 0 && (
                <Grid size={{ xs: 12, md: 7 }}>
                  <Card variant="outlined" sx={{ height: '100%' }}>
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 1 }}>Tempo Medio por Etapa</Typography>
                      <Chart
                        type="bar"
                        height={280}
                        series={[{ name: 'Horas', data: report.stageTimeline.map((s) => Number(s.avg_hours)) }]}
                        options={{
                          ...baseChartOptions(isDark),
                          plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '60%' } },
                          xaxis: { ...baseChartOptions(isDark).xaxis, categories: report.stageTimeline.map((s) => s.stage) },
                          colors: report.stageTimeline.map((s) => STAGE_COLORS[s.stage] || '#E85219'),
                          dataLabels: { ...baseChartOptions(isDark).dataLabels, enabled: true, formatter: (v: number) => `${v}h` },
                          tooltip: { ...baseChartOptions(isDark).tooltip, y: { formatter: (v: number) => `${v} horas` } },
                        }}
                      />
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>
          )}

          {/* Briefings List */}
          {showTable && (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  {showDeliveryFocus ? 'Entregas no Período' : 'Briefings no Período'}
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Título</strong></TableCell>
                      <TableCell><strong>Status</strong></TableCell>
                      <TableCell><strong>Prazo</strong></TableCell>
                      <TableCell><strong>Criado</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {report.briefings.map((b) => (
                      <TableRow key={b.id} hover>
                        <TableCell>{b.title}</TableCell>
                        <TableCell>
                          <Chip
                            label={b.status}
                            size="small"
                            sx={{
                              bgcolor: STAGE_COLORS[b.status] || '#94a3b8',
                              color: '#fff',
                              fontSize: '0.7rem',
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          {b.due_at ? new Date(b.due_at).toLocaleDateString('pt-BR') : '-'}
                        </TableCell>
                        <TableCell>
                          {new Date(b.created_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* AI Loading */}
          {aiLoading && (
            <Card variant="outlined" sx={{ mt: 3 }}>
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <IconSparkles size={32} style={{ color: '#7c3aed', marginBottom: 8 }} />
                <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>Gerando Análise Estratégica...</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Consolidando dados do cliente para gerar recomendações acionáveis.
                </Typography>
                <LinearProgress sx={{ maxWidth: 400, mx: 'auto', '& .MuiLinearProgress-bar': { bgcolor: '#7c3aed' } }} />
              </CardContent>
            </Card>
          )}

          {/* AI Summary */}
          {aiSummary && !aiLoading && (
            <Box sx={{ mt: 3 }}>
              <Divider sx={{ mb: 3 }}>
                <Chip icon={<IconSparkles size={16} />} label="Insights Estrategicos" sx={{ bgcolor: '#7c3aed', color: '#fff', fontWeight: 700 }} />
              </Divider>

              {/* KPIs from Gemini */}
              {aiSummary.kpis.length > 0 && (
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  {aiSummary.kpis.slice(0, 4).map((kpi, i) => (
                    <Grid key={i} size={{ xs: 6, md: 3 }}>
                      <Card variant="outlined" sx={{ borderLeft: '3px solid #7c3aed' }}>
                        <CardContent sx={{ py: 1.5 }}>
                          <Typography variant="h5" fontWeight={800} color="#7c3aed">{kpi.value}</Typography>
                          <Typography variant="caption" color="text.secondary">{kpi.label}</Typography>
                          {kpi.trend && (
                            <Typography variant="caption" display="block" sx={{ color: kpi.trend.includes('+') || kpi.trend.toLowerCase().includes('up') ? '#13DEB9' : '#FA896B', fontWeight: 600 }}>
                              {kpi.trend}
                            </Typography>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}

              {/* Alerts Row */}
              {(aiSummary.highlights.length > 0 || aiSummary.riskAlerts.length > 0 || aiSummary.bottlenecks.length > 0) && (
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  {aiSummary.highlights.length > 0 && (
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Card variant="outlined" sx={{ height: '100%' }}>
                        <CardContent>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                            <IconTrendingUp size={18} color="#13DEB9" />
                            <Typography variant="subtitle2" fontWeight={700} color="#13DEB9">Destaques</Typography>
                          </Stack>
                          {aiSummary.highlights.map((h, i) => (
                            <Typography key={i} variant="body2" sx={{ mb: 0.5, pl: 1, borderLeft: '2px solid #13DEB9' }}>{h}</Typography>
                          ))}
                        </CardContent>
                      </Card>
                    </Grid>
                  )}
                  {aiSummary.bottlenecks.length > 0 && (
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Card variant="outlined" sx={{ height: '100%' }}>
                        <CardContent>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                            <IconAlertTriangle size={18} color="#FFAE1F" />
                            <Typography variant="subtitle2" fontWeight={700} color="#FFAE1F">Gargalos</Typography>
                          </Stack>
                          {aiSummary.bottlenecks.map((b, i) => (
                            <Typography key={i} variant="body2" sx={{ mb: 0.5, pl: 1, borderLeft: '2px solid #FFAE1F' }}>{b}</Typography>
                          ))}
                        </CardContent>
                      </Card>
                    </Grid>
                  )}
                  {aiSummary.riskAlerts.length > 0 && (
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Card variant="outlined" sx={{ height: '100%' }}>
                        <CardContent>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                            <IconAlertTriangle size={18} color="#FA896B" />
                            <Typography variant="subtitle2" fontWeight={700} color="#FA896B">Riscos</Typography>
                          </Stack>
                          {aiSummary.riskAlerts.map((r, i) => (
                            <Typography key={i} variant="body2" sx={{ mb: 0.5, pl: 1, borderLeft: '2px solid #FA896B' }}>{r}</Typography>
                          ))}
                        </CardContent>
                      </Card>
                    </Grid>
                  )}
                </Grid>
              )}

              {/* Narrative */}
              <Card variant="outlined" sx={{ mb: 3 }}>
                <CardContent>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                    <IconBulb size={20} color="#E85219" />
                    <Typography variant="h6" fontWeight={700}>Diagnóstico Executivo</Typography>
                  </Stack>
                  <Typography
                    variant="body2"
                    component="div"
                    sx={{ lineHeight: 1.8, whiteSpace: 'pre-wrap', '& h2, & h3': { mt: 2, mb: 1, fontWeight: 700 } }}
                    dangerouslySetInnerHTML={{
                      __html: formatAiMarkdownToSafeHtml(aiSummary.narrative),
                    }}
                  />
                </CardContent>
              </Card>

              {/* Strategic Review (Claude) */}
              {aiSummary.strategicReview && (
                <Card variant="outlined" sx={{ mb: 3, borderColor: '#7c3aed', borderWidth: 2 }}>
                  <CardContent>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                      <IconSparkles size={20} color="#7c3aed" />
                      <Typography variant="h6" fontWeight={700} color="#7c3aed">Análise Estratégica</Typography>
                      <Chip label="Revisão Final" size="small" sx={{ bgcolor: '#7c3aed', color: '#fff', fontSize: '0.65rem' }} />
                    </Stack>
                    <Typography
                      variant="body2"
                      component="div"
                      sx={{ lineHeight: 1.8, whiteSpace: 'pre-wrap' }}
                      dangerouslySetInnerHTML={{
                        __html: formatAiMarkdownToSafeHtml(aiSummary.strategicReview),
                      }}
                    />
                  </CardContent>
                </Card>
              )}
            </Box>
          )}
        </Box>
      )}

      {/* Copy ROI Panel — always visible once clientId is known */}
      <CopyRoiPanel clientId={clientId} />
    </Box>
  );
}
