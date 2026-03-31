'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import AppShell from '@/components/AppShell';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import {
  IconRefresh,
  IconCurrencyDollar,
  IconChartBar,
} from '@tabler/icons-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type FinancialSummary = {
  mrr: number;
  invoiced: number;
  paid: number;
  overdue: number;
  media_planned: number;
  media_realized: number;
  da_cost: number;
};

type ContractRow = {
  client_id: string;
  client_name: string;
  type: string;
  monthly_value_brl: string | null;
  status: string;
};

type InvoiceRow = {
  client_id: string;
  client_name: string;
  total_invoiced: string;
  paid_count: string;
  overdue_count: string;
  paid_amount: string | null;
};

type MediaRow = {
  client_id: string;
  client_name: string;
  total_planned: string;
  total_realized: string;
  platforms: Array<{ platform: string; planned: number; realized: number }>;
};

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(v);
}

function periodOptions(): string[] {
  const opts: string[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    opts.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return opts;
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function FinanceiroCruzadoClient({ embedded = false }: { embedded?: boolean }) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  const now = new Date();
  const defaultPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [period, setPeriod] = useState(defaultPeriod);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [mediaBudgets, setMediaBudgets] = useState<MediaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(0);

  const load = useCallback(async (p: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await apiGet<{ period: string; summary: FinancialSummary; contracts: ContractRow[]; invoices: InvoiceRow[]; media_budgets: MediaRow[] }>(
        `/admin/relatorios/financeiro?period=${p}`
      );
      setSummary(res?.summary ?? null);
      setContracts(res?.contracts ?? []);
      setInvoices(res?.invoices ?? []);
      setMediaBudgets(res?.media_budgets ?? []);
    } catch (e: any) {
      setError(e?.message || 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(period); }, [load, period]);

  const kpis = summary ? [
    { label: 'MRR (contratos ativos)', value: fmt(summary.mrr), color: '#5D87FF', note: null },
    { label: 'Faturado no mês', value: fmt(summary.invoiced), color: '#13DEB9', note: null },
    { label: 'Recebido', value: fmt(summary.paid), color: '#13DEB9', note: `${summary.invoiced > 0 ? Math.round((summary.paid / summary.invoiced) * 100) : 0}% do faturado` },
    { label: 'Em aberto / atrasado', value: fmt(summary.overdue), color: summary.overdue > 0 ? '#FA896B' : 'text.secondary', note: null },
    { label: 'Mídia planejada', value: fmt(summary.media_planned), color: '#FFAE1F', note: null },
    { label: 'Custo DAs', value: fmt(summary.da_cost), color: '#A78BFA', note: null },
  ] : [];

  const content = (
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2} mb={3}>
          <Stack>
            <Typography variant="h5" fontWeight={800}>Financeiro Cruzado</Typography>
            <Typography variant="body2" color="text.secondary">Faturamento, contratos e mídia por período.</Typography>
          </Stack>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <TextField select size="small" value={period} onChange={(e) => setPeriod(e.target.value)} sx={{ minWidth: 140 }}>
              {periodOptions().map((p) => (
                <MenuItem key={p} value={p}>{p}</MenuItem>
              ))}
            </TextField>
            <Button variant="outlined" size="small" startIcon={<IconRefresh size={16} />} onClick={() => load(period)} disabled={loading}>
              Atualizar
            </Button>
          </Stack>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {loading ? (
          <Stack alignItems="center" py={8}><CircularProgress /></Stack>
        ) : (
          <>
            {/* KPI cards */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(6, 1fr)' }, gap: 1.5, mb: 3 }}>
              {kpis.map((k) => (
                <Paper key={k.label} elevation={0} sx={{
                  p: 2, borderRadius: 2,
                  border: `1px solid ${dark ? alpha('#fff', 0.06) : alpha('#000', 0.06)}`,
                  bgcolor: dark ? alpha('#fff', 0.02) : '#fff',
                }}>
                  <Typography sx={{ fontWeight: 900, fontSize: '1.3rem', lineHeight: 1.2, color: k.color, fontVariantNumeric: 'tabular-nums' }}>
                    {k.value}
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.6rem', letterSpacing: '0.08em', display: 'block', mt: 0.5 }}>
                    {k.label}
                  </Typography>
                  {k.note && <Typography variant="caption" color="text.disabled" fontSize="0.65rem">{k.note}</Typography>}
                </Paper>
              ))}
            </Box>

            <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3, borderBottom: `1px solid ${theme.palette.divider}` }}>
              <Tab label="Faturas" />
              <Tab label="Contratos" />
              <Tab label="Mídia" />
            </Tabs>

            {/* Invoices tab */}
            {activeTab === 0 && (
              <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: dark ? alpha('#fff', 0.03) : alpha('#000', 0.02) }}>
                      <TableCell sx={{ fontWeight: 700 }}>Cliente</TableCell>
                      <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>Faturado</TableCell>
                      <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>Recebido</TableCell>
                      <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Pagas</TableCell>
                      <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Em atraso</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {invoices.length === 0 ? (
                      <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>Nenhuma fatura no período.</TableCell></TableRow>
                    ) : (
                      invoices.map((inv) => (
                        <TableRow key={inv.client_id} hover>
                          <TableCell><Typography fontWeight={600} fontSize="0.875rem">{inv.client_name}</Typography></TableCell>
                          <TableCell align="right"><Typography fontWeight={700}>{fmt(parseFloat(inv.total_invoiced))}</Typography></TableCell>
                          <TableCell align="right"><Typography fontWeight={700} color="success.main">{fmt(parseFloat(inv.paid_amount ?? '0'))}</Typography></TableCell>
                          <TableCell align="center"><Chip size="small" label={inv.paid_count} color="success" /></TableCell>
                          <TableCell align="center">
                            {parseInt(inv.overdue_count, 10) > 0
                              ? <Chip size="small" label={inv.overdue_count} color="error" />
                              : <Typography color="text.disabled">0</Typography>
                            }
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {/* Contracts tab */}
            {activeTab === 1 && (
              <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: dark ? alpha('#fff', 0.03) : alpha('#000', 0.02) }}>
                      <TableCell sx={{ fontWeight: 700 }}>Cliente</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Tipo</TableCell>
                      <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>Valor mensal</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {contracts.length === 0 ? (
                      <TableRow><TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>Nenhum contrato ativo.</TableCell></TableRow>
                    ) : (
                      contracts.map((c, i) => (
                        <TableRow key={i} hover>
                          <TableCell><Typography fontWeight={600} fontSize="0.875rem">{c.client_name}</Typography></TableCell>
                          <TableCell><Chip size="small" label={c.type} /></TableCell>
                          <TableCell align="right">
                            <Typography fontWeight={700}>{c.monthly_value_brl ? fmt(parseFloat(c.monthly_value_brl)) : '—'}</Typography>
                          </TableCell>
                          <TableCell><Chip size="small" label={c.status} color={c.status === 'active' ? 'success' : 'default'} /></TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {/* Media tab */}
            {activeTab === 2 && (
              <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: dark ? alpha('#fff', 0.03) : alpha('#000', 0.02) }}>
                      <TableCell sx={{ fontWeight: 700 }}>Cliente</TableCell>
                      <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>Planejado</TableCell>
                      <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>Realizado</TableCell>
                      <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>Execução</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Plataformas</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {mediaBudgets.length === 0 ? (
                      <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>Nenhum orçamento de mídia no período.</TableCell></TableRow>
                    ) : (
                      mediaBudgets.map((m, i) => {
                        const pct = parseFloat(m.total_planned) > 0
                          ? Math.round((parseFloat(m.total_realized) / parseFloat(m.total_planned)) * 100)
                          : 0;
                        return (
                          <TableRow key={i} hover>
                            <TableCell><Typography fontWeight={600} fontSize="0.875rem">{m.client_name}</Typography></TableCell>
                            <TableCell align="right"><Typography>{fmt(parseFloat(m.total_planned))}</Typography></TableCell>
                            <TableCell align="right"><Typography>{fmt(parseFloat(m.total_realized))}</Typography></TableCell>
                            <TableCell align="right">
                              <Typography fontWeight={700} color={pct >= 90 ? 'success.main' : pct >= 70 ? 'warning.main' : 'error.main'}>
                                {pct}%
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Stack direction="row" spacing={0.5} flexWrap="wrap">
                                {(m.platforms || []).map((p, pi) => (
                                  <Chip key={pi} size="small" label={p.platform} />
                                ))}
                              </Stack>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </>
        )}
      </Box>
  );

  if (embedded) return content;

  return (
    <AppShell title="Financeiro Cruzado">
      {content}
    </AppShell>
  );
}
