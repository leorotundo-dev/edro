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
import Divider from '@mui/material/Divider';
import InputAdornment from '@mui/material/InputAdornment';
import {
  IconCheck,
  IconCurrencyDollar,
  IconFileText,
  IconPlus,
  IconSend,
  IconTrendingUp,
  IconWallet,
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

// ── Types ─────────────────────────────────────────────────────────────────────

type CatalogItem = {
  category: string; size: string; label: string; description: string;
  ref_price_brl: string; ref_price_max_brl: string | null;
  point_weight: string; point_weight_max: string | null;
  is_recurring: boolean;
};

type WalletData = {
  config: { monthly_fee_brl: number; tax_rate_pct: number; target_margin_pct: number; point_value_brl: number };
  wallet: {
    cost_budget: number; cost_used: number; cost_remaining: number; cost_pct: number;
    pts_budget: number; pts_used: number; pts_remaining: number; pts_pct: number;
    is_exceeded: boolean;
  };
  catalog: Record<string, CatalogItem[]>;
  burn: { jobs_count: number; refacoes_count: number };
};

const CAT_META: Record<string, { emoji: string; label: string }> = {
  design:     { emoji: '🎨', label: 'Design e Visual' },
  video:      { emoji: '🎬', label: 'Vídeo e Motion' },
  copy:       { emoji: '✍️', label: 'Copy e Estratégia' },
  management: { emoji: '⚙️', label: 'Gestão e Performance' },
};

const SIZE_COLOR: Record<string, 'default' | 'info' | 'warning' | 'error' | 'success'> = {
  PP: 'default', P: 'success', M: 'info', G: 'warning', GG: 'error',
};

function ptsBadge(pw: string, pwMax: string | null) {
  const v = parseFloat(pw);
  const label = pwMax ? `${v}–${parseFloat(pwMax)} pts` : `${v} pt${v !== 1 ? 's' : ''}`;
  return label;
}

function priceBadge(min: string, max: string | null) {
  if (max) return `${brl(min)} – ${brl(max)}`;
  return brl(min);
}

// ── Carteira Tab ───────────────────────────────────────────────────────────────

function CarteiraTab({ clientId }: { clientId: string }) {
  const [data, setData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ monthly_fee_brl: '', tax_rate_pct: '10', target_margin_pct: '60' });
  const [saved, setSaved] = useState(false);
  const [catTab, setCatTab] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await apiGet<WalletData>(`/clients/${clientId}/wallet/current-month`);
      setData(d);
      setForm({
        monthly_fee_brl: d.config.monthly_fee_brl > 0 ? String(d.config.monthly_fee_brl) : '',
        tax_rate_pct: String(d.config.tax_rate_pct),
        target_margin_pct: String(d.config.target_margin_pct),
      });
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiPatch(`/clients/${clientId}/wallet-config`, {
        monthly_fee_brl: parseFloat(form.monthly_fee_brl) || null,
        tax_rate_pct: parseFloat(form.tax_rate_pct),
        target_margin_pct: parseFloat(form.target_margin_pct),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      load();
    } finally {
      setSaving(false);
    }
  };

  // Live preview while user edits
  const POINT_VALUE = data?.config.point_value_brl ?? 50;
  const liveFee = parseFloat(form.monthly_fee_brl) || 0;
  const liveTax = parseFloat(form.tax_rate_pct) / 100 || 0;
  const liveMargin = parseFloat(form.target_margin_pct) / 100 || 0;
  const liveBudget = liveFee * (1 - liveTax - liveMargin);
  const livePts = liveBudget > 0 ? Math.floor(liveBudget / POINT_VALUE) : 0;

  if (loading) return <Box py={4} display="flex" justifyContent="center"><CircularProgress size={24} /></Box>;

  const wallet = data?.wallet;
  const pct = wallet?.pts_pct ?? 0;
  const barColor = pct >= 100 ? 'error' : pct >= 80 ? 'warning' : 'success';
  const catKeys = Object.keys(data?.catalog ?? {});

  return (
    <Stack spacing={3}>
      {/* Config card */}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>
            Configuração da Carteira
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" mb={2}>
            Orçamento mensal do fornecedor = Fee × (1 − Impostos − Margem).
            1 Ponto = {brl(POINT_VALUE)} (global para todos os clientes).
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                size="small" label="Fee mensal" fullWidth type="number"
                value={form.monthly_fee_brl}
                onChange={(e) => setForm({ ...form, monthly_fee_brl: e.target.value })}
                InputProps={{ startAdornment: <InputAdornment position="start">R$</InputAdornment> }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                size="small" label="Impostos" fullWidth type="number"
                value={form.tax_rate_pct}
                onChange={(e) => setForm({ ...form, tax_rate_pct: e.target.value })}
                InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                size="small" label="Margem alvo" fullWidth type="number"
                value={form.target_margin_pct}
                onChange={(e) => setForm({ ...form, target_margin_pct: e.target.value })}
                InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
              />
            </Grid>
          </Grid>

          {liveFee > 0 && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Orçamento calculado: <strong>{brl(liveBudget)}/mês</strong> = <strong>{livePts} pontos</strong>
              &nbsp;({brl(liveFee)} − {form.tax_rate_pct}% − {form.target_margin_pct}%, 1pt = {brl(POINT_VALUE)})
            </Alert>
          )}

          <Stack direction="row" justifyContent="flex-end" mt={2}>
            <Button
              size="small" variant="contained" onClick={handleSave}
              disabled={saving || !form.monthly_fee_brl}
              startIcon={saved ? <IconCheck size={14} /> : <IconTrendingUp size={14} />}
            >
              {saved ? 'Salvo!' : saving ? <CircularProgress size={14} /> : 'Salvar'}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Wallet status — dual BRL + points */}
      {wallet && wallet.pts_budget > 0 && (
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
              <Typography variant="subtitle2" fontWeight={700}>Burn este mês</Typography>
              <Chip
                label={wallet.is_exceeded ? 'ESTOURADA' : `${pct}% dos pontos`}
                color={wallet.is_exceeded ? 'error' : pct >= 80 ? 'warning' : 'success'}
                size="small"
              />
            </Stack>

            <LinearProgress
              variant="determinate" value={Math.min(pct, 100)} color={barColor}
              sx={{ height: 10, borderRadius: 5, mb: 2 }}
            />

            {/* Points row */}
            <Grid container spacing={1} mb={1.5}>
              <Grid size={{ xs: 4 }}>
                <Typography variant="caption" color="text.secondary">Pontos/mês</Typography>
                <Typography variant="body1" fontWeight={800}>{wallet.pts_budget} pts</Typography>
              </Grid>
              <Grid size={{ xs: 4 }}>
                <Typography variant="caption" color="text.secondary">Usados</Typography>
                <Typography variant="body1" fontWeight={800}
                  color={wallet.is_exceeded ? 'error.main' : 'text.primary'}>
                  {wallet.pts_used} pts
                </Typography>
              </Grid>
              <Grid size={{ xs: 4 }}>
                <Typography variant="caption" color="text.secondary">Restam</Typography>
                <Typography variant="body1" fontWeight={800}
                  color={wallet.pts_remaining < 0 ? 'error.main' : 'success.main'}>
                  {wallet.pts_remaining} pts
                </Typography>
              </Grid>
            </Grid>

            <Divider sx={{ my: 1 }} />

            {/* BRL row */}
            <Grid container spacing={1}>
              <Grid size={{ xs: 4 }}>
                <Typography variant="caption" color="text.secondary">Orçamento</Typography>
                <Typography variant="body2" fontWeight={700}>{brl(wallet.cost_budget)}</Typography>
              </Grid>
              <Grid size={{ xs: 4 }}>
                <Typography variant="caption" color="text.secondary">Comprometido</Typography>
                <Typography variant="body2" fontWeight={700}
                  color={wallet.is_exceeded ? 'error.main' : 'text.primary'}>
                  {brl(wallet.cost_used)}
                </Typography>
              </Grid>
              <Grid size={{ xs: 4 }}>
                <Typography variant="caption" color="text.secondary">Saldo</Typography>
                <Typography variant="body2" fontWeight={700}
                  color={wallet.cost_remaining < 0 ? 'error.main' : 'success.main'}>
                  {brl(wallet.cost_remaining)}
                </Typography>
              </Grid>
            </Grid>

            {data?.burn && (
              <Typography variant="caption" color="text.secondary" mt={1.5} display="block">
                {data.burn.jobs_count} escopos no mês
                {data.burn.refacoes_count > 0 && ` · ${data.burn.refacoes_count} refações do cliente`}
              </Typography>
            )}

            {wallet.is_exceeded && (
              <Alert severity="error" sx={{ mt: 2 }}>
                Carteira estourada. Contate o cliente para aditar ou transfira jobs para o próximo mês.
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Global catalog — 4 categories with tabs */}
      {catKeys.length > 0 && (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              Tabela de Preços Global
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
              Mesmos preços para todos os clientes. 1 Ponto = {brl(POINT_VALUE)}.
            </Typography>

            <Tabs value={catTab} onChange={(_, v) => setCatTab(v)}
              sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }} variant="scrollable">
              {catKeys.map((cat) => (
                <Tab key={cat} label={`${CAT_META[cat]?.emoji ?? ''} ${CAT_META[cat]?.label ?? cat}`}
                  sx={{ fontSize: 12, minHeight: 40 }} />
              ))}
            </Tabs>

            {catKeys.map((cat, idx) => (
              catTab === idx && (
                <Stack key={cat} spacing={1.5}>
                  {(data!.catalog[cat] ?? []).map((item) => (
                    <Stack key={`${item.category}-${item.size}`}
                      direction="row" alignItems="flex-start" spacing={1.5}
                      sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2,
                            bgcolor: item.is_recurring ? 'action.hover' : 'transparent' }}>
                      <Chip label={item.size} size="small"
                        color={SIZE_COLOR[item.size] ?? 'default'}
                        sx={{ fontWeight: 800, minWidth: 36, flexShrink: 0 }} />
                      <Box flex={1} minWidth={0}>
                        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                          <Typography variant="body2" fontWeight={700}>{item.label}</Typography>
                          {item.is_recurring && (
                            <Chip label="Recorrente" size="small" color="info" variant="outlined"
                              sx={{ fontSize: 10, height: 18 }} />
                          )}
                        </Stack>
                        <Typography variant="caption" color="text.secondary">{item.description}</Typography>
                      </Box>
                      <Box textAlign="right" flexShrink={0}>
                        <Typography variant="body2" fontWeight={800} color="primary.main">
                          {priceBadge(item.ref_price_brl, item.ref_price_max_brl)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {ptsBadge(item.point_weight, item.point_weight_max)}
                        </Typography>
                      </Box>
                    </Stack>
                  ))}
                </Stack>
              )
            ))}
          </CardContent>
        </Card>
      )}

      {!data?.config.monthly_fee_brl && !loading && (
        <Alert severity="warning">
          Configure o fee mensal acima para ativar o controle de carteira.
        </Alert>
      )}
    </Stack>
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
        <Tab label="Carteira" icon={<IconWallet size={14} />} iconPosition="start" />
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

      {/* Carteira tab */}
      {tab === 2 && <CarteiraTab clientId={clientId} />}

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
