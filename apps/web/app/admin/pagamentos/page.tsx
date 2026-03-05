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
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { IconCheck, IconDownload, IconReceipt2 } from '@tabler/icons-react';
import { apiGet, apiPatch, apiPost } from '@/lib/api';

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

export default function PagamentosPage() {
  const monthOptions = buildMonthOptions();
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
      const response = await fetch(`/api/freelancers/payables/${p.id}/pdf`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') ?? ''}` },
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

  return (
    <AppShell title="Pagamentos">
      <Box sx={{ p: 3, maxWidth: 1100 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <IconReceipt2 size={22} />
            <Typography variant="h5" fontWeight={700}>Pagamentos</Typography>
          </Stack>

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
              <Button
                variant="contained"
                size="small"
                onClick={() => setCloseDialog(true)}
              >
                Fechar Mês
              </Button>
            )}
          </Stack>
        </Stack>

        {error && <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

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
      </Box>

      {/* Close month confirmation dialog */}
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
    </AppShell>
  );
}
