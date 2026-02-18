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
import Divider from '@mui/material/Divider';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import { IconFileAnalytics, IconDownload, IconMail } from '@tabler/icons-react';
import { apiGet, apiPost } from '@/lib/api';
import Chart from '@/components/charts/Chart';

type ReportData = {
  period: { from: string; to: string };
  summary: { total: number; completed: number; overdue: number };
  byStage: { status: string; count: number }[];
  copies: { total_copies: number; avg_chars: number };
  stageTimeline: { stage: string; avg_hours: number }[];
  briefings: { id: string; title: string; status: string; due_at: string; created_at: string }[];
};

const STAGE_COLORS: Record<string, string> = {
  briefing: '#5D87FF',
  copy_ia: '#94a3b8',
  aprovacao: '#FFAE1F',
  producao: '#FA896B',
  revisao: '#ff6600',
  entrega: '#13DEB9',
  done: '#13DEB9',
};

export default function ClientReportsPage() {
  const params = useParams();
  const clientId = params.id as string;
  const reportRef = useRef<HTMLDivElement>(null);

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

  const generateReport = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiGet<ReportData>(`/clients/${clientId}/reports/summary?from=${from}&to=${to}`);
      setReport(data);
    } catch (err: any) {
      setError(err?.message || 'Erro ao gerar relatorio.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleEmail = async () => {
    const email = prompt('Email do destinatario:');
    if (!email) return;
    try {
      await apiPost(`/clients/${clientId}/reports/email`, {
        recipientEmail: email,
        from,
        to,
      });
      setEmailSent(`Relatorio enviado para ${email}`);
      setTimeout(() => setEmailSent(''), 4000);
    } catch (err: any) {
      setError(err?.message || 'Erro ao enviar email.');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconFileAnalytics size={28} stroke={1.5} />
        <Box>
          <Typography variant="h5" fontWeight={700}>Relatorios</Typography>
          <Typography variant="body2" color="text.secondary">
            Gere relatorios de performance para este cliente.
          </Typography>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {emailSent && <Alert severity="success" sx={{ mb: 2 }}>{emailSent}</Alert>}

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
            <TextField
              label="De"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
            <TextField
              label="Ate"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
            <Button variant="contained" onClick={generateReport} disabled={loading}>
              {loading ? <CircularProgress size={20} /> : 'Gerar Relatorio'}
            </Button>
            {report && (
              <>
                <Button variant="outlined" startIcon={<IconDownload size={18} />} onClick={handlePrint}>
                  Imprimir / PDF
                </Button>
                <Button variant="outlined" startIcon={<IconMail size={18} />} onClick={handleEmail}>
                  Enviar Email
                </Button>
              </>
            )}
          </Stack>
        </CardContent>
      </Card>

      {report && (
        <Box ref={reportRef} id="report-preview">
          {/* Summary Stats */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 6, md: 3 }}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" fontWeight={700} color="primary">{report.summary.total}</Typography>
                  <Typography variant="body2" color="text.secondary">Briefings</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" fontWeight={700} color="success.main">{report.summary.completed}</Typography>
                  <Typography variant="body2" color="text.secondary">Concluidos</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" fontWeight={700} color="error.main">{report.summary.overdue}</Typography>
                  <Typography variant="body2" color="text.secondary">Atrasados</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" fontWeight={700}>{report.copies.total_copies}</Typography>
                  <Typography variant="body2" color="text.secondary">Copies Geradas</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Charts Row: By Stage + Stage Timeline */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {report.byStage.length > 0 && (
              <Grid size={{ xs: 12, md: 5 }}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 1 }}>Briefings por Etapa</Typography>
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
            {report.stageTimeline.length > 0 && (
              <Grid size={{ xs: 12, md: 7 }}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 1 }}>Tempo Medio por Etapa</Typography>
                    <Chart
                      type="bar"
                      height={280}
                      series={[{ name: 'Horas', data: report.stageTimeline.map((s) => Number(s.avg_hours)) }]}
                      options={{
                        chart: { toolbar: { show: false } },
                        plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '60%' } },
                        xaxis: { categories: report.stageTimeline.map((s) => s.stage) },
                        colors: report.stageTimeline.map((s) => STAGE_COLORS[s.stage] || '#5D87FF'),
                        dataLabels: { enabled: true, formatter: (v: number) => `${v}h` },
                        tooltip: { y: { formatter: (v: number) => `${v} horas` } },
                        grid: { borderColor: '#f0f0f0' },
                      }}
                    />
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>

          {/* Briefings List */}
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Briefings no Periodo</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Titulo</strong></TableCell>
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
        </Box>
      )}
    </Box>
  );
}
