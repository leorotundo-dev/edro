'use client';

import { useCallback, useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import { IconRefresh, IconDownload, IconFileTypePdf, IconPlus, IconCalendar } from '@tabler/icons-react';
import { apiGet, apiPost } from '@/lib/api';

type Report = {
  id: string;
  client_id: string;
  client_name: string;
  period_month: string;
  title: string;
  pdf_key: string;
  generated_at: string;
};

function monthLabel(m: string) {
  const [y, mo] = m.split('-').map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

// Generate last 12 months as options
function lastMonths(n = 12) {
  const months: string[] = [];
  const now = new Date();
  for (let i = 1; i <= n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months.push(m);
  }
  return months;
}

export default function RelatoriosMensaisClient() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  const [genSuccess, setGenSuccess] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
  });
  const [filterClient, setFilterClient] = useState('');
  const [downloading, setDownloading] = useState<string | null>(null);

  const months = lastMonths(12);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiGet<{ reports: Report[] }>('/admin/reports/monthly');
      setReports(res.reports ?? []);
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao carregar relatórios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleGenerate() {
    setGenerating(true);
    setGenError('');
    setGenSuccess('');
    try {
      const res = await apiPost<{ generated: number; failed: number; month: string }>(
        '/admin/reports/monthly/generate',
        { month: selectedMonth },
      );
      setGenSuccess(`${res.generated} relatório(s) gerado(s) para ${monthLabel(res.month)}${res.failed > 0 ? ` (${res.failed} falha(s))` : ''}.`);
      await load();
    } catch (e: any) {
      setGenError(e?.message ?? 'Erro ao gerar relatórios');
    } finally {
      setGenerating(false);
    }
  }

  async function handleDownload(report: Report) {
    setDownloading(report.id);
    try {
      const response = await fetch(`/api/portal/client/reports/${report.client_id}/${report.period_month}/pdf`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Erro ao baixar PDF');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.title.replace(/\s+/g, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e?.message ?? 'Erro ao baixar PDF');
    } finally {
      setDownloading(null);
    }
  }

  const filtered = reports.filter(r =>
    !filterClient || r.client_name.toLowerCase().includes(filterClient.toLowerCase())
  );

  // Group by month
  const byMonth: Record<string, Report[]> = {};
  for (const r of filtered) {
    if (!byMonth[r.period_month]) byMonth[r.period_month] = [];
    byMonth[r.period_month].push(r);
  }
  const sortedMonths = Object.keys(byMonth).sort((a, b) => b.localeCompare(a));

  return (
    <AppShell title="Relatórios Mensais">
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2} sx={{ mb: 3 }}>
          <Box>
            <Typography variant="h5" fontWeight={700}>Relatórios Mensais</Typography>
            <Typography variant="body2" color="text.secondary">
              PDFs gerados automaticamente no dia 1 de cada mês para todos os clientes ativos.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              variant="outlined"
              startIcon={<IconRefresh size={16} />}
              onClick={load}
              disabled={loading}
              size="small"
            >
              Atualizar
            </Button>
          </Stack>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* Generate panel */}
        <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'background.paper' }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
            Gerar Relatórios Manualmente
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
            <TextField
              select
              size="small"
              label="Mês"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              sx={{ minWidth: 200 }}
            >
              {months.map((m) => (
                <MenuItem key={m} value={m}>
                  {monthLabel(m).charAt(0).toUpperCase() + monthLabel(m).slice(1)}
                </MenuItem>
              ))}
            </TextField>
            <Button
              variant="contained"
              startIcon={generating ? <CircularProgress size={14} color="inherit" /> : <IconPlus size={16} />}
              onClick={handleGenerate}
              disabled={generating}
              size="small"
            >
              Gerar para todos os clientes
            </Button>
          </Stack>
          {genSuccess && <Alert severity="success" sx={{ mt: 1.5 }}>{genSuccess}</Alert>}
          {genError && <Alert severity="error" sx={{ mt: 1.5 }}>{genError}</Alert>}
        </Paper>

        {/* Filter */}
        <TextField
          size="small"
          placeholder="Filtrar por cliente…"
          value={filterClient}
          onChange={(e) => setFilterClient(e.target.value)}
          sx={{ mb: 2, width: 260 }}
        />

        {loading ? (
          <Stack alignItems="center" py={6}>
            <CircularProgress size={32} />
          </Stack>
        ) : filtered.length === 0 ? (
          <Stack alignItems="center" py={6} spacing={2}>
            <IconFileTypePdf size={40} color="#555" />
            <Typography color="text.secondary">Nenhum relatório encontrado.</Typography>
            <Typography variant="caption" color="text.disabled">
              Gere relatórios acima ou aguarde o dia 1 do mês para geração automática.
            </Typography>
          </Stack>
        ) : (
          <Stack spacing={3}>
            {sortedMonths.map((month) => (
              <Box key={month}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                  <IconCalendar size={16} color="#888" />
                  <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
                    {monthLabel(month).charAt(0).toUpperCase() + monthLabel(month).slice(1)}
                  </Typography>
                  <Chip label={`${byMonth[month].length} cliente(s)`} size="small" sx={{ fontSize: '0.65rem' }} />
                </Stack>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Cliente</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Título</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Gerado em</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Ações</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {byMonth[month].map((report) => (
                        <TableRow key={report.id} hover>
                          <TableCell sx={{ fontSize: '0.78rem', fontWeight: 600 }}>
                            {report.client_name}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                            {report.title}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.72rem', color: 'text.disabled' }}>
                            {report.generated_at
                              ? new Date(report.generated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
                              : '—'}
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title="Baixar PDF">
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={downloading === report.id
                                  ? <CircularProgress size={12} color="inherit" />
                                  : <IconDownload size={14} />}
                                onClick={() => handleDownload(report)}
                                disabled={downloading === report.id}
                                sx={{ fontSize: '0.68rem', minWidth: 90 }}
                              >
                                PDF
                              </Button>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            ))}
          </Stack>
        )}
      </Box>
    </AppShell>
  );
}
