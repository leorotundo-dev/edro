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
import Link from 'next/link';
import { IconRefresh, IconPlus, IconCalendar, IconEdit, IconSend, IconWorld } from '@tabler/icons-react';
import { apiGet, apiPost } from '@/lib/api';

type ReportStatus = 'draft' | 'pending_approval' | 'approved' | 'published';

type Report = {
  id: string;
  client_id: string;
  client_name: string | null;
  period_month: string;
  title: string;
  status: ReportStatus;
  access_token: string;
  generated_at: string;
};

const STATUS_CONFIG: Record<ReportStatus, { label: string; color: 'default' | 'warning' | 'success' | 'info' | 'primary' }> = {
  draft:            { label: 'Rascunho',             color: 'default' },
  pending_approval: { label: 'Ag. aprovação',        color: 'warning' },
  approved:         { label: 'Aprovado',             color: 'success' },
  published:        { label: 'Publicado',            color: 'info'    },
};

function monthLabel(m: string) {
  const [y, mo] = m.split('-').map(Number);
  const label = new Date(y, mo - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function lastMonths(n = 12) {
  const months: string[] = [];
  const now = new Date();
  for (let i = 1; i <= n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

export default function RelatoriosMensaisClient({ embedded = false }: { embedded?: boolean } = {}) {
  const [reports, setReports]       = useState<Report[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError]     = useState('');
  const [genSuccess, setGenSuccess] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now  = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
  });
  const [filterClient, setFilterClient] = useState('');

  const months = lastMonths(12);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiGet<{ reports: Report[] }>('/monthly-reports');
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
        '/monthly-reports/generate-all',
        { periodMonth: selectedMonth },
      );
      setGenSuccess(`${res.generated} relatório(s) gerado(s) para ${monthLabel(res.month)}${res.failed > 0 ? ` (${res.failed} falha(s))` : ''}.`);
      await load();
    } catch (e: any) {
      setGenError(e?.message ?? 'Erro ao gerar relatórios');
    } finally {
      setGenerating(false);
    }
  }

  const filtered = reports.filter(r =>
    !filterClient || (r.client_name ?? '').toLowerCase().includes(filterClient.toLowerCase()),
  );

  // Group by month
  const byMonth: Record<string, Report[]> = {};
  for (const r of filtered) {
    if (!byMonth[r.period_month]) byMonth[r.period_month] = [];
    byMonth[r.period_month].push(r);
  }
  const sortedMonths = Object.keys(byMonth).sort((a, b) => b.localeCompare(a));

  const content = (
    <Box sx={{ p: embedded ? 0 : { xs: 2, md: 3 } }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2} sx={{ mb: 3 }}>
        {!embedded ? (
          <Box>
            <Typography variant="h5" fontWeight={700}>Relatórios Mensais</Typography>
            <Typography variant="body2" color="text.secondary">
              Leitura executiva mensal — construa, envie para aprovação e publique.
            </Typography>
          </Box>
        ) : (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip label={`${reports.length} relatórios`} size="small" variant="outlined" />
            <Chip label={monthLabel(selectedMonth)} size="small" color="primary" variant="outlined" />
          </Stack>
        )}
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

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Painel de geração */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'background.paper' }}>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
          Gerar Relatórios
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
          <TextField
            select
            size="small"
            label="Mês de referência"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            sx={{ minWidth: 200 }}
          >
            {months.map((m) => (
              <MenuItem key={m} value={m}>{monthLabel(m)}</MenuItem>
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
        {genError   && <Alert severity="error"   sx={{ mt: 1.5 }}>{genError}</Alert>}
      </Paper>

      {/* Filtro */}
      <TextField
        size="small"
        placeholder="Filtrar por cliente…"
        value={filterClient}
        onChange={(e) => setFilterClient(e.target.value)}
        sx={{ mb: 2, width: 260 }}
      />

      {loading ? (
        <Stack alignItems="center" py={6}><CircularProgress size={32} /></Stack>
      ) : filtered.length === 0 ? (
        <Stack alignItems="center" py={6} spacing={2}>
          <Typography color="text.secondary">Nenhum relatório encontrado.</Typography>
          <Typography variant="caption" color="text.disabled">
            Gere relatórios acima para começar.
          </Typography>
        </Stack>
      ) : (
        <Stack spacing={3}>
          {sortedMonths.map((month) => (
            <Box key={month}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <IconCalendar size={16} color="#888" />
                <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
                  {monthLabel(month)}
                </Typography>
                <Chip label={`${byMonth[month].length} cliente(s)`} size="small" sx={{ fontSize: '0.65rem' }} />
              </Stack>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Cliente</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Gerado em</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {byMonth[month].map((report) => {
                      const cfg = STATUS_CONFIG[report.status] ?? STATUS_CONFIG.draft;
                      return (
                        <TableRow key={report.id} hover>
                          <TableCell sx={{ fontSize: '0.78rem', fontWeight: 600 }}>
                            {report.client_name ?? report.client_id}
                          </TableCell>
                          <TableCell>
                            <Chip size="small" label={cfg.label} color={cfg.color} sx={{ fontSize: '0.68rem' }} />
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.72rem', color: 'text.disabled' }}>
                            {report.generated_at
                              ? new Date(report.generated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
                              : '—'}
                          </TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={0.75} justifyContent="flex-end">
                              <Tooltip title="Construir / editar relatório">
                                <Button
                                  size="small"
                                  variant="contained"
                                  startIcon={<IconEdit size={13} />}
                                  component={Link}
                                  href={`/admin/relatorios/${report.client_id}/${month}`}
                                  sx={{ fontSize: '0.68rem' }}
                                >
                                  Construir
                                </Button>
                              </Tooltip>
                              {report.status === 'draft' && (
                                <Tooltip title="Enviar para aprovação do cliente">
                                  <SubmitButton reportId={report.id} onDone={load} />
                                </Tooltip>
                              )}
                              {report.status === 'approved' && (
                                <Tooltip title="Publicar e gerar link público">
                                  <PublishButton reportId={report.id} onDone={load} />
                                </Tooltip>
                              )}
                              {report.status === 'published' && (
                                <Tooltip title="Copiar link público">
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<IconWorld size={13} />}
                                    component="a"
                                    href={`/r/${report.access_token}`}
                                    target="_blank"
                                    sx={{ fontSize: '0.68rem' }}
                                  >
                                    Link
                                  </Button>
                                </Tooltip>
                              )}
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );

  if (embedded) return content;
  return <AppShell title="Relatórios Mensais">{content}</AppShell>;
}

// ── Inline action buttons ──────────────────────────────────────────────────────

function SubmitButton({ reportId, onDone }: { reportId: string; onDone: () => void }) {
  const [loading, setLoading] = useState(false);
  async function handle() {
    setLoading(true);
    try {
      await apiPost(`/monthly-reports/${reportId}/submit`, {});
      onDone();
    } finally {
      setLoading(false);
    }
  }
  return (
    <Button
      size="small"
      variant="outlined"
      color="warning"
      startIcon={loading ? <CircularProgress size={12} color="inherit" /> : <IconSend size={13} />}
      onClick={handle}
      disabled={loading}
      sx={{ fontSize: '0.68rem' }}
    >
      Enviar
    </Button>
  );
}

function PublishButton({ reportId, onDone }: { reportId: string; onDone: () => void }) {
  const [loading, setLoading] = useState(false);
  async function handle() {
    setLoading(true);
    try {
      await apiPost(`/monthly-reports/${reportId}/publish`, {});
      onDone();
    } finally {
      setLoading(false);
    }
  }
  return (
    <Button
      size="small"
      variant="outlined"
      color="info"
      startIcon={loading ? <CircularProgress size={12} color="inherit" /> : <IconWorld size={13} />}
      onClick={handle}
      disabled={loading}
      sx={{ fontSize: '0.68rem' }}
    >
      Publicar
    </Button>
  );
}
