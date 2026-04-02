'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import Alert from '@mui/material/Alert';
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
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tabs from '@mui/material/Tabs';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { IconCheck, IconDownload, IconReceipt2 } from '@tabler/icons-react';
import { apiGet, apiPatch, apiPost, buildApiUrl } from '@/lib/api';

type BillingCycle = {
  id: string;
  freelancer_id: string;
  display_name: string;
  pix_key: string | null;
  cycle_start: string;
  cycle_end: string;
  due_date: string;
  total_fee_brl: string;
  job_count: number;
  status: 'open' | 'paid' | 'overdue';
  paid_at: string | null;
};

function BillingCyclesTab() {
  const [cycles, setCycles] = useState<BillingCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payingId, setPayingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res: any = await apiGet('/freelancers/admin/billing-cycles');
      setCycles(res.cycles ?? []);
    } catch (e: any) {
      setError(e.message ?? 'Erro ao carregar ciclos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleMarkPaid = async (id: string) => {
    setPayingId(id);
    try {
      await apiPost(`/freelancers/admin/billing-cycles/${id}/mark-paid`, {});
      setCycles((prev) => prev.map((c) => c.id === id ? { ...c, status: 'paid', paid_at: new Date().toISOString() } : c));
    } catch (e: any) {
      alert(e.message ?? 'Erro');
    } finally {
      setPayingId(null);
    }
  };

  const openCycles = cycles.filter((c) => c.status !== 'paid');
  const paidCycles = cycles.filter((c) => c.status === 'paid');
  const totalPending = openCycles.reduce((s, c) => s + parseFloat(c.total_fee_brl), 0);

  if (loading) return <Stack alignItems="center" py={6}><CircularProgress /></Stack>;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box>
      <Stack direction="row" spacing={2} mb={3} flexWrap="wrap">
        <Card variant="outlined" sx={{ flex: 1, minWidth: 160 }}>
          <CardContent sx={{ py: '12px !important', px: 2 }}>
            <Typography variant="caption" color="text.secondary">A pagar (D10)</Typography>
            <Typography variant="h6" fontWeight={700} color="warning.main">R$ {totalPending.toFixed(2)}</Typography>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ flex: 1, minWidth: 160 }}>
          <CardContent sx={{ py: '12px !important', px: 2 }}>
            <Typography variant="caption" color="text.secondary">Ciclos abertos</Typography>
            <Typography variant="h6" fontWeight={700}>{openCycles.length}</Typography>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ flex: 1, minWidth: 160 }}>
          <CardContent sx={{ py: '12px !important', px: 2 }}>
            <Typography variant="caption" color="text.secondary">Pagos</Typography>
            <Typography variant="h6" fontWeight={700} color="success.main">{paidCycles.length}</Typography>
          </CardContent>
        </Card>
      </Stack>

      {cycles.length === 0 ? (
        <Alert severity="info">Nenhum ciclo de pagamento encontrado. Ciclos são criados automaticamente quando um job é marcado como aprovado.</Alert>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Freelancer</TableCell>
                <TableCell>PIX</TableCell>
                <TableCell>Período</TableCell>
                <TableCell>Jobs</TableCell>
                <TableCell>Valor</TableCell>
                <TableCell>Vencimento</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Ação</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cycles.map((c) => (
                <TableRow key={c.id} sx={{ opacity: c.status === 'paid' ? 0.6 : 1 }}>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>{c.display_name}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">{c.pix_key ?? '—'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {new Date(c.cycle_start).toLocaleDateString('pt-BR')} → {new Date(c.cycle_end).toLocaleDateString('pt-BR')}
                    </Typography>
                  </TableCell>
                  <TableCell>{c.job_count}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={700} color={c.status === 'paid' ? 'success.main' : 'warning.main'}>
                      R$ {parseFloat(c.total_fee_brl).toFixed(2)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">{new Date(c.due_date).toLocaleDateString('pt-BR')}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={c.status === 'paid' ? 'Pago' : c.status === 'overdue' ? 'Em atraso' : 'Aberto'}
                      size="small"
                      color={c.status === 'paid' ? 'success' : c.status === 'overdue' ? 'error' : 'warning'}
                    />
                    {c.paid_at && (
                      <Typography variant="caption" color="text.disabled" display="block">
                        {new Date(c.paid_at).toLocaleDateString('pt-BR')}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    {c.status !== 'paid' && (
                      <Tooltip title="Marcar como pago">
                        <IconButton size="small" color="success" disabled={payingId === c.id} onClick={() => handleMarkPaid(c.id)}>
                          {payingId === c.id ? <CircularProgress size={14} /> : <IconCheck size={15} />}
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

type Payable = {
  id: string;
  freelancer_id: string;
  display_name: string;
  pix_key: string | null;
  hourly_rate_brl: string | null;
  period_month: string;
  total_minutes: number | null;
  flat_fee_brl: string | null;
  amount_brl: string;
  status: 'open' | 'paid';
  paid_at: string | null;
};

function formatHours(mins: number | null) {
  if (!mins) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function buildMonthOptions(): { value: string; label: string }[] {
  const opts = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    opts.push({ value: val, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return opts;
}

export function PagamentosView({ embedded = false }: { embedded?: boolean }) {
  const monthOptions = buildMonthOptions();
  const [tab, setTab]                     = useState(0);
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0].value);
  const [payables, setPayables]           = useState<Payable[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState('');
  const [closing, setClosing]             = useState(false);
  const [closeDialog, setCloseDialog]     = useState(false);
  const [paidLoading, setPaidLoading]     = useState<string | null>(null);
  const [pdfLoading, setPdfLoading]       = useState<string | null>(null);

  const load = async (month: string) => {
    setLoading(true);
    setError('');
    try {
      const res: any = await apiGet(`/freelancers/payables?month=${month}`);
      setPayables(res.payables ?? []);
    } catch (e: any) {
      setError(e.message ?? 'Erro ao carregar pagamentos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(selectedMonth); }, [selectedMonth]);

  const handleCloseMonth = async () => {
    setClosing(true);
    try {
      const res: any = await apiPost('/freelancers/payables/close-month', { month: selectedMonth });
      setCloseDialog(false);
      await load(selectedMonth);
      if (res.count === 0) {
        setError('Nenhum freelancer com horas registradas neste mês.');
      }
    } catch (e: any) {
      setError(e.message ?? 'Erro ao fechar mês');
    } finally {
      setClosing(false);
    }
  };

  const handleMarkPaid = async (id: string) => {
    setPaidLoading(id);
    try {
      const updated: any = await apiPatch(`/freelancers/payables/${id}/mark-paid`, {});
      setPayables((prev) => prev.map((p) => p.id === id ? { ...p, ...updated, status: 'paid' } : p));
    } catch (e: any) {
      alert(e.message ?? 'Erro');
    } finally {
      setPaidLoading(null);
    }
  };

  const handleDownloadPdf = async (p: Payable) => {
    setPdfLoading(p.id);
    try {
      const response = await fetch(buildApiUrl(`/freelancers/payables/${p.id}/pdf`), {
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('Erro ao gerar PDF');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recibo-${p.period_month}-${p.display_name.replace(/\s/g, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e.message ?? 'Erro ao baixar PDF');
    } finally {
      setPdfLoading(null);
    }
  };

  // Summary stats
  const totalAmount = payables.reduce((s, p) => s + parseFloat(p.amount_brl), 0);
  const paidCount   = payables.filter((p) => p.status === 'paid').length;
  const openCount   = payables.filter((p) => p.status === 'open').length;

  const hasPayables = payables.length > 0;

  const content = (
      <Box sx={{ p: embedded ? 0 : 3, maxWidth: embedded ? 'none' : 1100 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
          {!embedded ? (
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <IconReceipt2 size={22} />
              <Typography variant="h5" fontWeight={700}>Pagamentos</Typography>
            </Stack>
          ) : (
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Chip label={`${payables.length} repasses`} size="small" variant="outlined" />
              <Chip label={`${openCount} a pagar`} size="small" color="warning" variant="outlined" />
              <Chip label={`${paidCount} pagos`} size="small" color="success" variant="outlined" />
            </Stack>
          )}

          {tab === 0 && (
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                size="small"
                sx={{ minWidth: 180, fontSize: '0.85rem' }}
              >
                {monthOptions.map((o) => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </Select>

              {!hasPayables && (
                <Button variant="contained" size="small" onClick={() => setCloseDialog(true)}>
                  Fechar Mês
                </Button>
              )}
            </Stack>
          )}
        </Stack>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Honorários por Hora" />
          <Tab label="Ciclos de Jobs (D10)" />
        </Tabs>

        {error && <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

        {tab === 1 && <BillingCyclesTab />}

        {tab === 0 && <>
        {/* Summary cards */}
        <Grid container spacing={2} mb={3}>
          {[
            { label: 'Total a pagar', value: `R$ ${totalAmount.toFixed(2)}`, color: 'primary.main' },
            { label: 'Freelancers',   value: String(payables.length),        color: 'text.primary' },
            { label: 'Pagos',         value: String(paidCount),              color: 'success.main' },
            { label: 'A pagar',       value: String(openCount),              color: 'warning.main' },
          ].map((s) => (
            <Grid size={{ xs: 6, sm: 3 }} key={s.label}>
              <Card variant="outlined">
                <CardContent sx={{ py: '12px !important', px: 2 }}>
                  <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                  <Typography variant="h6" fontWeight={700} sx={{ color: s.color }}>{s.value}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {loading ? (
          <Stack alignItems="center" py={6}><CircularProgress /></Stack>
        ) : !hasPayables ? (
          <Box
            sx={{
              border: '1px dashed',
              borderColor: 'divider',
              borderRadius: 2,
              py: 6,
              textAlign: 'center',
            }}
          >
            <Typography variant="body2" color="text.disabled" mb={2}>
              Nenhum pagamento gerado para {selectedMonth}.
            </Typography>
            <Button variant="outlined" onClick={() => setCloseDialog(true)}>
              Fechar Mês Agora
            </Button>
          </Box>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Freelancer</TableCell>
                  <TableCell>PIX</TableCell>
                  <TableCell>Horas</TableCell>
                  <TableCell>Valor</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {payables.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{p.display_name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">{p.pix_key ?? '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{formatHours(p.total_minutes)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        R$ {parseFloat(p.amount_brl).toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={p.status === 'paid' ? 'Pago' : 'A pagar'}
                        size="small"
                        color={p.status === 'paid' ? 'success' : 'warning'}
                        sx={{ fontSize: '0.7rem' }}
                      />
                      {p.paid_at && (
                        <Typography variant="caption" color="text.disabled" display="block">
                          {new Date(p.paid_at).toLocaleDateString('pt-BR')}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        {p.status === 'open' && (
                          <Tooltip title="Marcar como pago">
                            <IconButton
                              size="small"
                              color="success"
                              disabled={paidLoading === p.id}
                              onClick={() => handleMarkPaid(p.id)}
                            >
                              {paidLoading === p.id
                                ? <CircularProgress size={14} />
                                : <IconCheck size={15} />}
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Baixar PDF">
                          <IconButton
                            size="small"
                            disabled={pdfLoading === p.id}
                            onClick={() => handleDownloadPdf(p)}
                          >
                            {pdfLoading === p.id
                              ? <CircularProgress size={14} />
                              : <IconDownload size={15} />}
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        </>}
      </Box>
  );

  const dialog = (
      <Dialog open={closeDialog} onClose={() => setCloseDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Fechar mês {selectedMonth}?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Isso calculará automaticamente o valor de cada freelancer com base nas horas registradas
            no mês. Freelancers flat-fee precisarão de lançamento manual.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCloseDialog(false)}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={closing}
            onClick={handleCloseMonth}
          >
            {closing ? <CircularProgress size={16} /> : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>
  );

  if (embedded) {
    return (
      <>
        {content}
        {dialog}
      </>
    );
  }

  return (
    <AppShell title="Pagamentos">
      {content}
      {dialog}
    </AppShell>
  );
}

export default function PagamentosPage() {
  return <PagamentosView />;
}
