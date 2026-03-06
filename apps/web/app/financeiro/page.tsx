'use client';

import { useEffect, useState, useCallback } from 'react';
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
  IconBuildingBank,
  IconCheck,
  IconClipboardList,
  IconCopy,
  IconCurrencyDollar,
  IconFileText,
  IconPlus,
  IconSend,
  IconTrash,
  IconTrendingUp,
  IconX,
} from '@tabler/icons-react';
import { apiGet, apiPatch, apiPost } from '@/lib/api';

// ── Types ──────────────────────────────────────────────────────────────────────

type PLRow = {
  client_id: string;
  client_name: string;
  receita_brl: string;
  custo_producao_brl: string;
  custo_midia_brl: string;
  margem_brl: string;
  margem_pct: string | null;
};

type Contract = {
  id: string;
  client_id: string;
  client_name?: string;
  type: 'retainer' | 'project' | 'hourly';
  title: string;
  monthly_value_brl: string | null;
  project_value_brl: string | null;
  hourly_rate_brl: string | null;
  start_date: string | null;
  end_date: string | null;
  status: 'draft' | 'active' | 'paused' | 'ended';
  omie_client_id: number | null;
};

type Invoice = {
  id: string;
  client_id: string;
  client_name?: string;
  description: string;
  amount_brl: string;
  due_date: string | null;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  paid_at: string | null;
  omie_os_id: number | null;
  period_month: string | null;
};

type MediaBudget = {
  id: string;
  client_id: string;
  client_name?: string;
  period_month: string;
  platform: string;
  planned_brl: string;
  realized_brl: string;
  markup_pct: string;
};

type Client = { id: string; name: string };

// ── Helpers ────────────────────────────────────────────────────────────────────

function brl(val: string | number | null | undefined) {
  const n = parseFloat(String(val ?? 0));
  return isNaN(n) ? 'R$ 0,00' : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR');
}

const INVOICE_STATUS_COLOR: Record<string, 'default' | 'warning' | 'success' | 'error'> = {
  draft: 'default',
  sent: 'warning',
  paid: 'success',
  overdue: 'error',
  cancelled: 'default',
};

const INVOICE_STATUS_LABEL: Record<string, string> = {
  draft: 'Rascunho',
  sent: 'Enviada',
  paid: 'Paga',
  overdue: 'Vencida',
  cancelled: 'Cancelada',
};

const CONTRACT_STATUS_COLOR: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
  draft: 'default',
  active: 'success',
  paused: 'warning',
  ended: 'error',
};

const CONTRACT_STATUS_LABEL: Record<string, string> = {
  draft: 'Rascunho',
  active: 'Ativo',
  paused: 'Pausado',
  ended: 'Encerrado',
};

const PLATFORM_LABEL: Record<string, string> = {
  meta_ads: 'Meta Ads',
  google_ads: 'Google Ads',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
};

// ── P&L Tab ────────────────────────────────────────────────────────────────────

function PLTab() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [rows, setRows] = useState<PLRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<{ rows: PLRow[] }>(`/financial/pl?month=${month}`);
      setRows(data.rows ?? []);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => { load(); }, [load]);

  const totalReceita = rows.reduce((s, r) => s + parseFloat(r.receita_brl), 0);
  const totalMargem = rows.reduce((s, r) => s + parseFloat(r.margem_brl), 0);

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6">P&L por Cliente</Typography>
        <TextField
          type="month"
          size="small"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          sx={{ width: 160 }}
        />
      </Stack>

      <Grid container spacing={2} mb={3}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">Receita Total</Typography>
              <Typography variant="h5" fontWeight={700} color="primary">{brl(totalReceita)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">Margem Total</Typography>
              <Typography variant="h5" fontWeight={700} color={totalMargem >= 0 ? 'success.main' : 'error.main'}>
                {brl(totalMargem)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">Margem Média</Typography>
              <Typography variant="h5" fontWeight={700}>
                {totalReceita > 0 ? ((totalMargem / totalReceita) * 100).toFixed(1) + '%' : '—'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {loading ? (
        <CircularProgress />
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Cliente</TableCell>
                <TableCell align="right">Receita</TableCell>
                <TableCell align="right">Custo Prod.</TableCell>
                <TableCell align="right">Custo Mídia</TableCell>
                <TableCell align="right">Margem</TableCell>
                <TableCell align="right">Margem %</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography color="text.secondary" variant="body2" py={3}>
                      Nenhum dado para {month}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => {
                const pct = r.margem_pct ? parseFloat(r.margem_pct) : null;
                return (
                  <TableRow key={r.client_id} hover>
                    <TableCell>{r.client_name}</TableCell>
                    <TableCell align="right">{brl(r.receita_brl)}</TableCell>
                    <TableCell align="right">{brl(r.custo_producao_brl)}</TableCell>
                    <TableCell align="right">{brl(r.custo_midia_brl)}</TableCell>
                    <TableCell align="right" sx={{ color: parseFloat(r.margem_brl) >= 0 ? 'success.main' : 'error.main', fontWeight: 600 }}>
                      {brl(r.margem_brl)}
                    </TableCell>
                    <TableCell align="right">
                      {pct !== null ? (
                        <Chip
                          label={`${pct.toFixed(1)}%`}
                          size="small"
                          color={pct >= 30 ? 'success' : pct >= 0 ? 'warning' : 'error'}
                        />
                      ) : '—'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

// ── Contracts Tab ──────────────────────────────────────────────────────────────

function ContractsTab() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [openNew, setOpenNew] = useState(false);
  const [form, setForm] = useState({
    client_id: '', type: 'retainer', title: '',
    monthly_value_brl: '', hourly_rate_brl: '', start_date: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, cl] = await Promise.all([
        apiGet<{ contracts: Contract[] }>('/financial/contracts'),
        apiGet<{ clients: Client[] }>('/clients?status=active&limit=200'),
      ]);
      setContracts(c.contracts ?? []);
      setClients(cl.clients ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    setSaving(true);
    setError('');
    try {
      await apiPost('/financial/contracts', {
        client_id: form.client_id,
        type: form.type,
        title: form.title,
        monthly_value_brl: form.monthly_value_brl || null,
        hourly_rate_brl: form.hourly_rate_brl || null,
        start_date: form.start_date || null,
      });
      setOpenNew(false);
      setForm({ client_id: '', type: 'retainer', title: '', monthly_value_brl: '', hourly_rate_brl: '', start_date: '' });
      load();
    } catch (e: any) {
      setError(e.message ?? 'Erro ao criar contrato');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    await apiPatch(`/financial/contracts/${id}`, { status });
    load();
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6">Contratos</Typography>
        <Button variant="contained" startIcon={<IconPlus size={16} />} size="small" onClick={() => setOpenNew(true)}>
          Novo Contrato
        </Button>
      </Stack>

      {loading ? <CircularProgress /> : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Cliente</TableCell>
                <TableCell>Título</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell align="right">Valor</TableCell>
                <TableCell>Início</TableCell>
                <TableCell>Status</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {contracts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography color="text.secondary" variant="body2" py={3}>Nenhum contrato cadastrado</Typography>
                  </TableCell>
                </TableRow>
              )}
              {contracts.map((c) => (
                <TableRow key={c.id} hover>
                  <TableCell>{c.client_name ?? c.client_id}</TableCell>
                  <TableCell>{c.title}</TableCell>
                  <TableCell sx={{ textTransform: 'capitalize' }}>{c.type}</TableCell>
                  <TableCell align="right">
                    {c.type === 'retainer' ? brl(c.monthly_value_brl) + '/mês'
                      : c.type === 'hourly' ? brl(c.hourly_rate_brl) + '/h'
                      : brl(c.project_value_brl)}
                  </TableCell>
                  <TableCell>{fmtDate(c.start_date)}</TableCell>
                  <TableCell>
                    <Chip
                      label={CONTRACT_STATUS_LABEL[c.status] ?? c.status}
                      color={CONTRACT_STATUS_COLOR[c.status] ?? 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      size="small"
                      value={c.status}
                      onChange={(e) => handleStatusChange(c.id, e.target.value)}
                      sx={{ fontSize: 12 }}
                    >
                      <MenuItem value="draft">Rascunho</MenuItem>
                      <MenuItem value="active">Ativo</MenuItem>
                      <MenuItem value="paused">Pausado</MenuItem>
                      <MenuItem value="ended">Encerrado</MenuItem>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={openNew} onClose={() => setOpenNew(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Novo Contrato</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            {error && <Alert severity="error">{error}</Alert>}
            <Select
              size="small"
              value={form.client_id}
              onChange={(e) => setForm({ ...form, client_id: e.target.value })}
              displayEmpty
              fullWidth
            >
              <MenuItem value="" disabled>Selecionar cliente</MenuItem>
              {clients.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
            </Select>
            <TextField
              size="small"
              label="Título"
              fullWidth
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <Select
              size="small"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              fullWidth
            >
              <MenuItem value="retainer">Retainer mensal</MenuItem>
              <MenuItem value="project">Projeto</MenuItem>
              <MenuItem value="hourly">Por hora</MenuItem>
            </Select>
            {form.type === 'retainer' && (
              <TextField
                size="small"
                label="Valor mensal (R$)"
                type="number"
                fullWidth
                value={form.monthly_value_brl}
                onChange={(e) => setForm({ ...form, monthly_value_brl: e.target.value })}
              />
            )}
            {form.type === 'hourly' && (
              <TextField
                size="small"
                label="Taxa por hora (R$)"
                type="number"
                fullWidth
                value={form.hourly_rate_brl}
                onChange={(e) => setForm({ ...form, hourly_rate_brl: e.target.value })}
              />
            )}
            <TextField
              size="small"
              label="Data de início"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenNew(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleCreate} disabled={saving || !form.client_id || !form.title}>
            {saving ? <CircularProgress size={18} /> : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ── Invoices Tab ───────────────────────────────────────────────────────────────

function InvoicesTab() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [openNew, setOpenNew] = useState(false);
  const [form, setForm] = useState({
    client_id: '', description: '', amount_brl: '', due_date: '', period_month: '',
  });
  const [saving, setSaving] = useState(false);
  const [omieLoading, setOmieLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [inv, cl] = await Promise.all([
        apiGet<{ invoices: Invoice[] }>('/financial/invoices'),
        apiGet<{ clients: Client[] }>('/clients?status=active&limit=200'),
      ]);
      setInvoices(inv.invoices ?? []);
      setClients(cl.clients ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    setSaving(true);
    try {
      await apiPost('/financial/invoices', {
        client_id: form.client_id,
        description: form.description,
        amount_brl: parseFloat(form.amount_brl),
        due_date: form.due_date || null,
        period_month: form.period_month || null,
      });
      setOpenNew(false);
      setForm({ client_id: '', description: '', amount_brl: '', due_date: '', period_month: '' });
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleSendOmie = async (id: string) => {
    setOmieLoading(id);
    try {
      await apiPost(`/financial/invoices/${id}/send-omie`, {});
      load();
    } catch (e: any) {
      alert(e.message ?? 'Erro ao enviar ao Omie');
    } finally {
      setOmieLoading(null);
    }
  };

  const handleMarkPaid = async (id: string) => {
    await apiPatch(`/financial/invoices/${id}`, { status: 'paid', paid_at: new Date().toISOString() });
    load();
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6">Faturas</Typography>
        <Button variant="contained" startIcon={<IconPlus size={16} />} size="small" onClick={() => setOpenNew(true)}>
          Nova Fatura
        </Button>
      </Stack>

      {loading ? <CircularProgress /> : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Cliente</TableCell>
                <TableCell>Descrição</TableCell>
                <TableCell>Período</TableCell>
                <TableCell align="right">Valor</TableCell>
                <TableCell>Vencimento</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Omie OS</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {invoices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography color="text.secondary" variant="body2" py={3}>Nenhuma fatura</Typography>
                  </TableCell>
                </TableRow>
              )}
              {invoices.map((inv) => (
                <TableRow key={inv.id} hover>
                  <TableCell>{inv.client_name ?? inv.client_id}</TableCell>
                  <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {inv.description}
                  </TableCell>
                  <TableCell>{inv.period_month ?? '—'}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>{brl(inv.amount_brl)}</TableCell>
                  <TableCell>{fmtDate(inv.due_date)}</TableCell>
                  <TableCell>
                    <Chip
                      label={INVOICE_STATUS_LABEL[inv.status] ?? inv.status}
                      color={INVOICE_STATUS_COLOR[inv.status] ?? 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {inv.omie_os_id ? (
                      <Chip label={`OS #${inv.omie_os_id}`} size="small" variant="outlined" />
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5}>
                      {!inv.omie_os_id && inv.status !== 'cancelled' && (
                        <Tooltip title="Enviar ao Omie">
                          <IconButton
                            size="small"
                            onClick={() => handleSendOmie(inv.id)}
                            disabled={omieLoading === inv.id}
                          >
                            {omieLoading === inv.id ? <CircularProgress size={14} /> : <IconSend size={14} />}
                          </IconButton>
                        </Tooltip>
                      )}
                      {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                        <Tooltip title="Marcar como pago">
                          <IconButton size="small" color="success" onClick={() => handleMarkPaid(inv.id)}>
                            <IconCheck size={14} />
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

      <Dialog open={openNew} onClose={() => setOpenNew(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nova Fatura</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <Select
              size="small"
              value={form.client_id}
              onChange={(e) => setForm({ ...form, client_id: e.target.value })}
              displayEmpty
              fullWidth
            >
              <MenuItem value="" disabled>Selecionar cliente</MenuItem>
              {clients.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
            </Select>
            <TextField
              size="small"
              label="Descrição"
              fullWidth
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <TextField
              size="small"
              label="Valor (R$)"
              type="number"
              fullWidth
              value={form.amount_brl}
              onChange={(e) => setForm({ ...form, amount_brl: e.target.value })}
            />
            <TextField
              size="small"
              label="Período (YYYY-MM)"
              placeholder="2025-03"
              fullWidth
              value={form.period_month}
              onChange={(e) => setForm({ ...form, period_month: e.target.value })}
            />
            <TextField
              size="small"
              label="Vencimento"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenNew(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={saving || !form.client_id || !form.description || !form.amount_brl}
          >
            {saving ? <CircularProgress size={18} /> : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ── Media Budget Tab ───────────────────────────────────────────────────────────

function MediaTab() {
  const [budgets, setBudgets] = useState<MediaBudget[]>([]);
  const [alerts, setAlerts] = useState<MediaBudget[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [openNew, setOpenNew] = useState(false);
  const [form, setForm] = useState({
    client_id: '', period_month: '', platform: 'meta_ads',
    planned_brl: '', realized_brl: '', markup_pct: '15',
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [b, a, cl] = await Promise.all([
        apiGet<{ budgets: MediaBudget[] }>(`/financial/media-budgets?month=${month}`),
        apiGet<{ alerts: MediaBudget[] }>('/financial/media-budgets/alerts'),
        apiGet<{ clients: Client[] }>('/clients?status=active&limit=200'),
      ]);
      setBudgets(b.budgets ?? []);
      setAlerts(a.alerts ?? []);
      setClients(cl.clients ?? []);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    setSaving(true);
    try {
      await apiPost('/financial/media-budgets', {
        client_id: form.client_id,
        period_month: form.period_month || month,
        platform: form.platform,
        planned_brl: parseFloat(form.planned_brl),
        realized_brl: parseFloat(form.realized_brl) || 0,
        markup_pct: parseFloat(form.markup_pct) || 15,
      });
      setOpenNew(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      {alerts.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <strong>{alerts.length} cliente(s)</strong> com budget de mídia acima de 85% de consumo:{' '}
          {alerts.map((a) => a.client_name ?? a.client_id).join(', ')}
        </Alert>
      )}

      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6">Budget de Mídia</Typography>
        <Stack direction="row" spacing={1}>
          <TextField
            type="month"
            size="small"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            sx={{ width: 160 }}
          />
          <Button variant="contained" startIcon={<IconPlus size={16} />} size="small" onClick={() => setOpenNew(true)}>
            Novo
          </Button>
        </Stack>
      </Stack>

      {loading ? <CircularProgress /> : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Cliente</TableCell>
                <TableCell>Plataforma</TableCell>
                <TableCell align="right">Planejado</TableCell>
                <TableCell align="right">Realizado</TableCell>
                <TableCell align="right">Markup</TableCell>
                <TableCell sx={{ width: 160 }}>Consumo</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {budgets.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography color="text.secondary" variant="body2" py={3}>Nenhum budget para {month}</Typography>
                  </TableCell>
                </TableRow>
              )}
              {budgets.map((b) => {
                const planned = parseFloat(b.planned_brl);
                const realized = parseFloat(b.realized_brl);
                const pct = planned > 0 ? (realized / planned) * 100 : 0;
                return (
                  <TableRow key={b.id} hover>
                    <TableCell>{b.client_name ?? b.client_id}</TableCell>
                    <TableCell>{PLATFORM_LABEL[b.platform] ?? b.platform}</TableCell>
                    <TableCell align="right">{brl(b.planned_brl)}</TableCell>
                    <TableCell align="right">{brl(b.realized_brl)}</TableCell>
                    <TableCell align="right">{parseFloat(b.markup_pct).toFixed(0)}%</TableCell>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(pct, 100)}
                          color={pct > 85 ? 'error' : pct > 60 ? 'warning' : 'primary'}
                          sx={{ flex: 1, height: 6, borderRadius: 3 }}
                        />
                        <Typography variant="caption" sx={{ minWidth: 36 }}>
                          {pct.toFixed(0)}%
                        </Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={openNew} onClose={() => setOpenNew(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Novo Budget de Mídia</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <Select size="small" value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} displayEmpty fullWidth>
              <MenuItem value="" disabled>Selecionar cliente</MenuItem>
              {clients.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
            </Select>
            <Select size="small" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} fullWidth>
              <MenuItem value="meta_ads">Meta Ads</MenuItem>
              <MenuItem value="google_ads">Google Ads</MenuItem>
              <MenuItem value="linkedin">LinkedIn</MenuItem>
              <MenuItem value="tiktok">TikTok</MenuItem>
            </Select>
            <TextField size="small" label="Período (YYYY-MM)" value={form.period_month || month} onChange={(e) => setForm({ ...form, period_month: e.target.value })} fullWidth />
            <TextField size="small" label="Budget planejado (R$)" type="number" value={form.planned_brl} onChange={(e) => setForm({ ...form, planned_brl: e.target.value })} fullWidth />
            <TextField size="small" label="Realizado (R$)" type="number" value={form.realized_brl} onChange={(e) => setForm({ ...form, realized_brl: e.target.value })} fullWidth />
            <TextField size="small" label="Markup %" type="number" value={form.markup_pct} onChange={(e) => setForm({ ...form, markup_pct: e.target.value })} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenNew(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleCreate} disabled={saving || !form.client_id || !form.planned_brl}>
            {saving ? <CircularProgress size={18} /> : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ── Proposals Tab ──────────────────────────────────────────────────────────────

type ProposalItem = { description: string; qty: number; unit_price: number; total: number };

type Proposal = {
  id: string;
  client_id: string | null;
  client_name?: string;
  title: string;
  items: ProposalItem[];
  subtotal_brl: string;
  discount_brl: string;
  total_brl: string;
  validity_days: number;
  notes: string | null;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  sent_at: string | null;
  accepted_at: string | null;
  accept_token: string | null;
};

const PROPOSAL_STATUS_COLOR: Record<string, 'default' | 'warning' | 'success' | 'error' | 'info'> = {
  draft: 'default',
  sent: 'info',
  accepted: 'success',
  rejected: 'error',
  expired: 'default',
};

const PROPOSAL_STATUS_LABEL: Record<string, string> = {
  draft: 'Rascunho',
  sent: 'Enviada',
  accepted: 'Aceita',
  rejected: 'Recusada',
  expired: 'Expirada',
};

function PropostasTab() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [clients,   setClients]   = useState<Client[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [openNew,   setOpenNew]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [linkDialog, setLinkDialog] = useState<{ url: string; title: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({
    client_id: '',
    title: '',
    validity_days: '15',
    discount_brl: '0',
    notes: '',
  });
  const [items, setItems] = useState<ProposalItem[]>([
    { description: '', qty: 1, unit_price: 0, total: 0 },
  ]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, cl] = await Promise.all([
        apiGet<{ proposals: Proposal[] }>('/financial/proposals'),
        apiGet<{ clients: Client[] }>('/clients?status=active&limit=200'),
      ]);
      setProposals(p.proposals ?? []);
      setClients(cl.clients ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateItem = (i: number, field: keyof ProposalItem, val: string) => {
    setItems((prev) => {
      const next = prev.map((it, idx) => {
        if (idx !== i) return it;
        const updated = { ...it, [field]: field === 'description' ? val : parseFloat(val) || 0 };
        updated.total = updated.qty * updated.unit_price;
        return updated;
      });
      return next;
    });
  };

  const subtotal = items.reduce((s, it) => s + it.total, 0);
  const discount = parseFloat(form.discount_brl) || 0;
  const total    = subtotal - discount;

  const handleCreate = async () => {
    setSaving(true);
    try {
      await apiPost('/financial/proposals', {
        client_id:    form.client_id || null,
        title:        form.title,
        items:        items.filter((it) => it.description),
        subtotal_brl: subtotal,
        discount_brl: discount,
        total_brl:    total,
        validity_days: parseInt(form.validity_days) || 15,
        notes:        form.notes || null,
      });
      setOpenNew(false);
      setForm({ client_id: '', title: '', validity_days: '15', discount_brl: '0', notes: '' });
      setItems([{ description: '', qty: 1, unit_price: 0, total: 0 }]);
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async (p: Proposal) => {
    setSendingId(p.id);
    try {
      const res = await apiPost<{ accept_url: string }>(`/financial/proposals/${p.id}/send`, {});
      setLinkDialog({ url: res.accept_url, title: p.title });
      load();
    } catch (e: any) {
      alert(e.message ?? 'Erro ao enviar proposta');
    } finally {
      setSendingId(null);
    }
  };

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6">Propostas</Typography>
        <Button variant="contained" startIcon={<IconPlus size={16} />} size="small" onClick={() => setOpenNew(true)}>
          Nova Proposta
        </Button>
      </Stack>

      {loading ? <CircularProgress /> : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Cliente</TableCell>
                <TableCell>Título</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell>Validade</TableCell>
                <TableCell>Status</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {proposals.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography color="text.secondary" variant="body2" py={3}>Nenhuma proposta criada</Typography>
                  </TableCell>
                </TableRow>
              )}
              {proposals.map((p) => (
                <TableRow key={p.id} hover>
                  <TableCell>{p.client_name ?? '—'}</TableCell>
                  <TableCell sx={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.title}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>{brl(p.total_brl)}</TableCell>
                  <TableCell>{p.validity_days}d</TableCell>
                  <TableCell>
                    <Chip
                      label={PROPOSAL_STATUS_LABEL[p.status] ?? p.status}
                      color={PROPOSAL_STATUS_COLOR[p.status] ?? 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5}>
                      {p.status === 'draft' && (
                        <Tooltip title="Gerar link e enviar ao cliente">
                          <IconButton
                            size="small"
                            color="primary"
                            disabled={sendingId === p.id}
                            onClick={() => handleSend(p)}
                          >
                            {sendingId === p.id ? <CircularProgress size={14} /> : <IconSend size={14} />}
                          </IconButton>
                        </Tooltip>
                      )}
                      {p.status === 'sent' && p.accept_token && (
                        <Tooltip title="Copiar link de aceite">
                          <IconButton
                            size="small"
                            onClick={() => setLinkDialog({
                              url: `${typeof window !== 'undefined' ? window.location.origin : ''}/proposta/${p.accept_token}`,
                              title: p.title,
                            })}
                          >
                            <IconCopy size={14} />
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

      {/* Link dialog */}
      <Dialog open={Boolean(linkDialog)} onClose={() => setLinkDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Link de Aceite</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Envie este link para o cliente assinar a proposta <strong>{linkDialog?.title}</strong>:
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Alert severity="info" sx={{ flex: 1, py: 0.5, '& .MuiAlert-message': { wordBreak: 'break-all', fontSize: '0.8rem' } }}>
              {linkDialog?.url}
            </Alert>
            <Tooltip title={copied ? 'Copiado!' : 'Copiar'}>
              <IconButton onClick={() => linkDialog && handleCopy(linkDialog.url)} color={copied ? 'success' : 'default'}>
                {copied ? <IconCheck size={18} /> : <IconCopy size={18} />}
              </IconButton>
            </Tooltip>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLinkDialog(null)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* New Proposal Dialog */}
      <Dialog open={openNew} onClose={() => setOpenNew(false)} maxWidth="md" fullWidth>
        <DialogTitle>Nova Proposta</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Select
                size="small"
                value={form.client_id}
                onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                displayEmpty
                sx={{ flex: 1 }}
              >
                <MenuItem value="">Sem cliente (proposta genérica)</MenuItem>
                {clients.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
              </Select>
              <TextField
                size="small"
                label="Título da proposta"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                sx={{ flex: 2 }}
              />
            </Stack>

            {/* Items table */}
            <Box>
              <Typography variant="caption" fontWeight={700} color="text.secondary" mb={0.5} display="block">
                Itens
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell>Descrição</TableCell>
                      <TableCell align="center" sx={{ width: 70 }}>Qtd</TableCell>
                      <TableCell align="right" sx={{ width: 120 }}>Valor unit.</TableCell>
                      <TableCell align="right" sx={{ width: 120 }}>Total</TableCell>
                      <TableCell sx={{ width: 40 }} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map((it, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <TextField
                            size="small"
                            placeholder="Descreva o serviço..."
                            value={it.description}
                            onChange={(e) => updateItem(i, 'description', e.target.value)}
                            fullWidth
                            variant="standard"
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            value={it.qty}
                            onChange={(e) => updateItem(i, 'qty', e.target.value)}
                            inputProps={{ min: 1, style: { textAlign: 'center' } }}
                            variant="standard"
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            value={it.unit_price || ''}
                            onChange={(e) => updateItem(i, 'unit_price', e.target.value)}
                            inputProps={{ style: { textAlign: 'right' } }}
                            variant="standard"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={600}>{brl(it.total)}</Typography>
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => setItems((p) => p.filter((_, idx) => idx !== i))}
                            disabled={items.length === 1}
                          >
                            <IconTrash size={13} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Button
                size="small"
                startIcon={<IconPlus size={13} />}
                onClick={() => setItems((p) => [...p, { description: '', qty: 1, unit_price: 0, total: 0 }])}
                sx={{ mt: 0.5 }}
              >
                Adicionar item
              </Button>
            </Box>

            {/* Totals + config row */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
              <Stack spacing={1.5} sx={{ flex: 1 }}>
                <TextField
                  size="small"
                  label="Desconto (R$)"
                  type="number"
                  value={form.discount_brl}
                  onChange={(e) => setForm({ ...form, discount_brl: e.target.value })}
                  fullWidth
                />
                <TextField
                  size="small"
                  label="Validade (dias)"
                  type="number"
                  value={form.validity_days}
                  onChange={(e) => setForm({ ...form, validity_days: e.target.value })}
                  fullWidth
                />
                <TextField
                  size="small"
                  label="Observações"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  multiline
                  rows={2}
                  fullWidth
                />
              </Stack>
              <Paper variant="outlined" sx={{ p: 2, minWidth: 200 }}>
                <Stack spacing={0.75}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary">Subtotal</Typography>
                    <Typography variant="caption">{brl(subtotal)}</Typography>
                  </Stack>
                  {discount > 0 && (
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="caption" color="text.secondary">Desconto</Typography>
                      <Typography variant="caption" color="error.main">− {brl(discount)}</Typography>
                    </Stack>
                  )}
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" fontWeight={700}>Total</Typography>
                    <Typography variant="body2" fontWeight={700} color="primary">{brl(total)}</Typography>
                  </Stack>
                </Stack>
              </Paper>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenNew(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={saving || !form.title}
          >
            {saving ? <CircularProgress size={18} /> : 'Criar Proposta'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

const TABS = [
  { label: 'P&L', icon: <IconTrendingUp size={16} /> },
  { label: 'Contratos', icon: <IconFileText size={16} /> },
  { label: 'Faturas', icon: <IconCurrencyDollar size={16} /> },
  { label: 'Mídia', icon: <IconBuildingBank size={16} /> },
  { label: 'Propostas', icon: <IconClipboardList size={16} /> },
];

export default function FinanceiroPage() {
  const [tab, setTab] = useState(0);

  return (
    <AppShell title="Financeiro">
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Financeiro</Typography>
        <Typography variant="body2" color="text.secondary">
          P&L por cliente, contratos, faturas e budget de mídia
        </Typography>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        {TABS.map((t, i) => (
          <Tab key={i} label={t.label} icon={t.icon} iconPosition="start" />
        ))}
      </Tabs>

      {tab === 0 && <PLTab />}
      {tab === 1 && <ContractsTab />}
      {tab === 2 && <InvoicesTab />}
      {tab === 3 && <MediaTab />}
      {tab === 4 && <PropostasTab />}
    </AppShell>
  );
}
