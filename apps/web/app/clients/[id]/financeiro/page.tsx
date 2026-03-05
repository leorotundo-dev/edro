'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
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
import LinearProgress from '@mui/material/LinearProgress';
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
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import {
  IconCheck,
  IconCurrencyDollar,
  IconFileText,
  IconPlus,
  IconSend,
  IconTrendingUp,
} from '@tabler/icons-react';

// ── Types ──────────────────────────────────────────────────────────────────────

type Contract = {
  id: string;
  type: 'retainer' | 'project' | 'hourly';
  title: string;
  monthly_value_brl: string | null;
  project_value_brl: string | null;
  hourly_rate_brl: string | null;
  start_date: string | null;
  status: 'draft' | 'active' | 'paused' | 'ended';
  omie_client_id: number | null;
};

type Invoice = {
  id: string;
  description: string;
  amount_brl: string;
  due_date: string | null;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  paid_at: string | null;
  omie_os_id: number | null;
  period_month: string | null;
};

type HealthScore = {
  score: number;
  trend: 'up' | 'stable' | 'down';
  factors: Record<string, any>;
  period_date: string;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function brl(val: string | number | null | undefined) {
  const n = parseFloat(String(val ?? 0));
  return isNaN(n) ? 'R$ 0,00' : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR');
}

const INV_STATUS_COLOR: Record<string, 'default' | 'warning' | 'success' | 'error'> = {
  draft: 'default', sent: 'warning', paid: 'success', overdue: 'error', cancelled: 'default',
};
const INV_STATUS_LABEL: Record<string, string> = {
  draft: 'Rascunho', sent: 'Enviada', paid: 'Paga', overdue: 'Vencida', cancelled: 'Cancelada',
};
const CONTRACT_STATUS_COLOR: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
  draft: 'default', active: 'success', paused: 'warning', ended: 'error',
};

// ── Health Score Card ──────────────────────────────────────────────────────────

function HealthCard({ clientId }: { clientId: string }) {
  const [hs, setHs] = useState<HealthScore | null>(null);

  useEffect(() => {
    apiGet<{ score: HealthScore }>(`/clients/${clientId}/health-score`)
      .then((r) => setHs(r.score))
      .catch(() => {});
  }, [clientId]);

  if (!hs) return null;

  const color = hs.score >= 70 ? 'success' : hs.score >= 40 ? 'warning' : 'error';
  const trendIcon = hs.trend === 'up' ? '↑' : hs.trend === 'down' ? '↓' : '→';

  return (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: `${color}.light`,
              border: '3px solid',
              borderColor: `${color}.main`,
            }}
          >
            <Typography variant="h5" fontWeight={800} color={`${color}.main`}>
              {hs.score}
            </Typography>
          </Box>
          <Box>
            <Typography variant="subtitle2" fontWeight={700}>
              Health Score {trendIcon}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Atualizado em {fmtDate(hs.period_date)}
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={0.5} mt={0.5}>
              {hs.factors.invoice_delay_days !== undefined && (
                <Chip label={`Atraso faturas: ${hs.factors.invoice_delay_days.toFixed(1)}d`} size="small" variant="outlined" />
              )}
              {hs.factors.briefings_60d !== undefined && (
                <Chip label={`Briefings 60d: ${hs.factors.briefings_60d}`} size="small" variant="outlined" />
              )}
            </Stack>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function ClientFinanceiroPage() {
  const { id: clientId } = useParams<{ id: string }>();
  const [tab, setTab] = useState(0);

  // Contracts
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loadingContracts, setLoadingContracts] = useState(true);
  const [openContract, setOpenContract] = useState(false);
  const [contractForm, setContractForm] = useState({ type: 'retainer', title: '', monthly_value_brl: '', start_date: '' });
  const [savingContract, setSavingContract] = useState(false);

  // Invoices
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [openInvoice, setOpenInvoice] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({ description: '', amount_brl: '', due_date: '', period_month: '' });
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [omieLoading, setOmieLoading] = useState<string | null>(null);

  const loadContracts = useCallback(async () => {
    setLoadingContracts(true);
    try {
      const data = await apiGet<{ contracts: Contract[] }>(`/financial/contracts?client_id=${clientId}`);
      setContracts(data.contracts ?? []);
    } finally {
      setLoadingContracts(false);
    }
  }, [clientId]);

  const loadInvoices = useCallback(async () => {
    setLoadingInvoices(true);
    try {
      const data = await apiGet<{ invoices: Invoice[] }>(`/financial/invoices?client_id=${clientId}`);
      setInvoices(data.invoices ?? []);
    } finally {
      setLoadingInvoices(false);
    }
  }, [clientId]);

  useEffect(() => { loadContracts(); }, [loadContracts]);
  useEffect(() => { loadInvoices(); }, [loadInvoices]);

  const handleCreateContract = async () => {
    setSavingContract(true);
    try {
      await apiPost('/financial/contracts', {
        client_id: clientId,
        type: contractForm.type,
        title: contractForm.title,
        monthly_value_brl: contractForm.monthly_value_brl || null,
        start_date: contractForm.start_date || null,
      });
      setOpenContract(false);
      setContractForm({ type: 'retainer', title: '', monthly_value_brl: '', start_date: '' });
      loadContracts();
    } finally {
      setSavingContract(false);
    }
  };

  const handleCreateInvoice = async () => {
    setSavingInvoice(true);
    try {
      await apiPost('/financial/invoices', {
        client_id: clientId,
        description: invoiceForm.description,
        amount_brl: parseFloat(invoiceForm.amount_brl),
        due_date: invoiceForm.due_date || null,
        period_month: invoiceForm.period_month || null,
      });
      setOpenInvoice(false);
      setInvoiceForm({ description: '', amount_brl: '', due_date: '', period_month: '' });
      loadInvoices();
    } finally {
      setSavingInvoice(false);
    }
  };

  const handleSendOmie = async (id: string) => {
    setOmieLoading(id);
    try {
      await apiPost(`/financial/invoices/${id}/send-omie`, {});
      loadInvoices();
    } catch (e: any) {
      alert(e.message ?? 'Erro ao enviar ao Omie');
    } finally {
      setOmieLoading(null);
    }
  };

  const handleMarkPaid = async (id: string) => {
    await apiPatch(`/financial/invoices/${id}`, { status: 'paid', paid_at: new Date().toISOString() });
    loadInvoices();
  };

  // Summary metrics
  const totalReceita = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + parseFloat(i.amount_brl), 0);
  const totalPendente = invoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled').reduce((s, i) => s + parseFloat(i.amount_brl), 0);
  const activeContract = contracts.find(c => c.status === 'active');

  return (
    <Box>
      <HealthCard clientId={clientId} />

      {/* Summary cards */}
      <Grid container spacing={2} mb={3}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card variant="outlined">
            <CardContent sx={{ py: 1.5 }}>
              <Typography variant="caption" color="text.secondary">Receita recebida</Typography>
              <Typography variant="h6" fontWeight={700} color="success.main">{brl(totalReceita)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card variant="outlined">
            <CardContent sx={{ py: 1.5 }}>
              <Typography variant="caption" color="text.secondary">Pendente</Typography>
              <Typography variant="h6" fontWeight={700} color="warning.main">{brl(totalPendente)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card variant="outlined">
            <CardContent sx={{ py: 1.5 }}>
              <Typography variant="caption" color="text.secondary">Contrato ativo</Typography>
              <Typography variant="h6" fontWeight={700} noWrap>
                {activeContract
                  ? (activeContract.type === 'retainer'
                    ? `${brl(activeContract.monthly_value_brl)}/mês`
                    : activeContract.title)
                  : '—'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="Contratos" icon={<IconFileText size={14} />} iconPosition="start" />
        <Tab label="Faturas" icon={<IconCurrencyDollar size={14} />} iconPosition="start" />
      </Tabs>

      {/* Contracts tab */}
      {tab === 0 && (
        <Box>
          <Stack direction="row" justifyContent="flex-end" mb={1.5}>
            <Button size="small" variant="contained" startIcon={<IconPlus size={14} />} onClick={() => setOpenContract(true)}>
              Novo Contrato
            </Button>
          </Stack>
          {loadingContracts ? <CircularProgress size={20} /> : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Título</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell align="right">Valor</TableCell>
                    <TableCell>Início</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {contracts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Typography color="text.secondary" variant="body2" py={2}>Nenhum contrato</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                  {contracts.map((c) => (
                    <TableRow key={c.id} hover>
                      <TableCell>{c.title}</TableCell>
                      <TableCell sx={{ textTransform: 'capitalize' }}>{c.type}</TableCell>
                      <TableCell align="right">
                        {c.type === 'retainer' ? `${brl(c.monthly_value_brl)}/mês`
                          : c.type === 'hourly' ? `${brl(c.hourly_rate_brl)}/h`
                          : brl(c.project_value_brl)}
                      </TableCell>
                      <TableCell>{fmtDate(c.start_date)}</TableCell>
                      <TableCell>
                        <Chip
                          label={c.status}
                          size="small"
                          color={CONTRACT_STATUS_COLOR[c.status] ?? 'default'}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {/* Invoices tab */}
      {tab === 1 && (
        <Box>
          <Stack direction="row" justifyContent="flex-end" mb={1.5}>
            <Button size="small" variant="contained" startIcon={<IconPlus size={14} />} onClick={() => setOpenInvoice(true)}>
              Nova Fatura
            </Button>
          </Stack>
          {loadingInvoices ? <CircularProgress size={20} /> : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Descrição</TableCell>
                    <TableCell>Período</TableCell>
                    <TableCell align="right">Valor</TableCell>
                    <TableCell>Vencimento</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Omie</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoices.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography color="text.secondary" variant="body2" py={2}>Nenhuma fatura</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                  {invoices.map((inv) => (
                    <TableRow key={inv.id} hover>
                      <TableCell sx={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {inv.description}
                      </TableCell>
                      <TableCell>{inv.period_month ?? '—'}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>{brl(inv.amount_brl)}</TableCell>
                      <TableCell>{fmtDate(inv.due_date)}</TableCell>
                      <TableCell>
                        <Chip
                          label={INV_STATUS_LABEL[inv.status] ?? inv.status}
                          color={INV_STATUS_COLOR[inv.status] ?? 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {inv.omie_os_id
                          ? <Chip label={`OS #${inv.omie_os_id}`} size="small" variant="outlined" />
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5}>
                          {!inv.omie_os_id && inv.status !== 'cancelled' && (
                            <Tooltip title="Enviar ao Omie">
                              <IconButton size="small" onClick={() => handleSendOmie(inv.id)} disabled={omieLoading === inv.id}>
                                {omieLoading === inv.id ? <CircularProgress size={12} /> : <IconSend size={12} />}
                              </IconButton>
                            </Tooltip>
                          )}
                          {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                            <Tooltip title="Marcar como pago">
                              <IconButton size="small" color="success" onClick={() => handleMarkPaid(inv.id)}>
                                <IconCheck size={12} />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {/* New Contract Dialog */}
      <Dialog open={openContract} onClose={() => setOpenContract(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Novo Contrato</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField size="small" label="Título" fullWidth value={contractForm.title}
              onChange={(e) => setContractForm({ ...contractForm, title: e.target.value })} />
            <Select size="small" value={contractForm.type} fullWidth
              onChange={(e) => setContractForm({ ...contractForm, type: e.target.value })}>
              <MenuItem value="retainer">Retainer mensal</MenuItem>
              <MenuItem value="project">Projeto</MenuItem>
              <MenuItem value="hourly">Por hora</MenuItem>
            </Select>
            {contractForm.type === 'retainer' && (
              <TextField size="small" label="Valor mensal (R$)" type="number" fullWidth
                value={contractForm.monthly_value_brl}
                onChange={(e) => setContractForm({ ...contractForm, monthly_value_brl: e.target.value })} />
            )}
            <TextField size="small" label="Data de início" type="date" fullWidth
              InputLabelProps={{ shrink: true }}
              value={contractForm.start_date}
              onChange={(e) => setContractForm({ ...contractForm, start_date: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenContract(false)}>Cancelar</Button>
          <Button variant="contained" disabled={savingContract || !contractForm.title} onClick={handleCreateContract}>
            {savingContract ? <CircularProgress size={16} /> : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* New Invoice Dialog */}
      <Dialog open={openInvoice} onClose={() => setOpenInvoice(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Nova Fatura</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField size="small" label="Descrição" fullWidth value={invoiceForm.description}
              onChange={(e) => setInvoiceForm({ ...invoiceForm, description: e.target.value })} />
            <TextField size="small" label="Valor (R$)" type="number" fullWidth value={invoiceForm.amount_brl}
              onChange={(e) => setInvoiceForm({ ...invoiceForm, amount_brl: e.target.value })} />
            <TextField size="small" label="Período (YYYY-MM)" fullWidth value={invoiceForm.period_month}
              onChange={(e) => setInvoiceForm({ ...invoiceForm, period_month: e.target.value })} />
            <TextField size="small" label="Vencimento" type="date" fullWidth InputLabelProps={{ shrink: true }}
              value={invoiceForm.due_date}
              onChange={(e) => setInvoiceForm({ ...invoiceForm, due_date: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenInvoice(false)}>Cancelar</Button>
          <Button variant="contained" disabled={savingInvoice || !invoiceForm.description || !invoiceForm.amount_brl} onClick={handleCreateInvoice}>
            {savingInvoice ? <CircularProgress size={16} /> : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
