'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import AppShell from '@/components/AppShell';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import InputAdornment from '@mui/material/InputAdornment';
import LinearProgress from '@mui/material/LinearProgress';
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
import { alpha, useTheme } from '@mui/material/styles';
import {
  IconRefresh,
  IconSearch,
  IconExternalLink,
  IconAlertTriangle,
  IconCircleCheck,
  IconAlertCircle,
} from '@tabler/icons-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type ClientRow = {
  id: string;
  name: string;
  segment: string | null;
  health_score: number | null;
  health_trend: 'up' | 'stable' | 'down' | null;
  active_jobs: number;
  blocked_jobs: number;
  overdue_jobs: number;
  last_job_activity: string | null;
  last_metric_sync: string | null;
  risk: 'critical' | 'warning' | 'ok';
};

type Summary = {
  total: number;
  critical: number;
  warning: number;
  ok: number;
  avg_health: number | null;
};

function RiskChip({ risk }: { risk: ClientRow['risk'] }) {
  if (risk === 'critical') return <Chip size="small" label="Crítico" color="error" icon={<IconAlertCircle size={14} />} />;
  if (risk === 'warning') return <Chip size="small" label="Atenção" color="warning" icon={<IconAlertTriangle size={14} />} />;
  return <Chip size="small" label="OK" color="success" icon={<IconCircleCheck size={14} />} />;
}

function HealthBar({ score }: { score: number | null }) {
  if (score === null) return <Typography variant="caption" color="text.disabled">—</Typography>;
  const color = score >= 70 ? '#13DEB9' : score >= 50 ? '#FFAE1F' : '#FA896B';
  return (
    <Stack spacing={0.5} sx={{ minWidth: 80 }}>
      <Typography variant="caption" fontWeight={700} color={color}>{score}/100</Typography>
      <LinearProgress variant="determinate" value={score}
        sx={{ height: 4, borderRadius: 2, bgcolor: alpha(color, 0.15), '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 2 } }}
      />
    </Stack>
  );
}

function TrendIcon({ trend }: { trend: string | null }) {
  if (trend === 'up') return <Typography color="success.main" fontSize="1rem">↑</Typography>;
  if (trend === 'down') return <Typography color="error.main" fontSize="1rem">↓</Typography>;
  return <Typography color="text.disabled" fontSize="1rem">→</Typography>;
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function PainelExecutivoClient({ embedded = false }: { embedded?: boolean } = {}) {
  const theme = useTheme();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<'all' | 'critical' | 'warning' | 'ok'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiGet<{ clients: ClientRow[]; summary: Summary }>('/admin/relatorios/painel');
      setClients(res?.clients ?? []);
      setSummary(res?.summary ?? null);
    } catch (e: any) {
      setError(e?.message || 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = clients.filter((c) => {
    if (riskFilter !== 'all' && c.risk !== riskFilter) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const dark = theme.palette.mode === 'dark';

  const content = (
      <Box sx={{ p: embedded ? 0 : { xs: 2, md: 3 } }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2} mb={3}>
          {!embedded ? (
            <Stack>
              <Typography variant="h5" fontWeight={800}>Painel Executivo</Typography>
              <Typography variant="body2" color="text.secondary">Visão cruzada de todos os clientes — saúde, risco e produção.</Typography>
            </Stack>
          ) : (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip label={`${summary?.total ?? 0} clientes`} size="small" variant="outlined" />
              <Chip label={`${summary?.critical ?? 0} críticos`} size="small" color="error" variant="outlined" />
              <Chip label={`${summary?.warning ?? 0} atenção`} size="small" color="warning" variant="outlined" />
            </Stack>
          )}
          <Button variant="outlined" size="small" startIcon={<IconRefresh size={16} />} onClick={load} disabled={loading}>
            Atualizar
          </Button>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {loading ? (
          <Stack alignItems="center" py={8}><CircularProgress /></Stack>
        ) : (
          <>
            {/* Summary KPIs */}
            {summary && (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(5, 1fr)' }, gap: 1.5, mb: 3 }}>
                {[
                  { value: summary.total,        label: 'Total',        color: '#E85219', light: '#fdeee8' },
                  { value: summary.critical,     label: 'Críticos',     color: '#FA896B', light: '#FDEDE8' },
                  { value: summary.warning,      label: 'Atenção',      color: '#FFAE1F', light: '#FEF5E5' },
                  { value: summary.ok,           label: 'Saudáveis',    color: '#13DEB9', light: '#E6FFFA' },
                  { value: summary.avg_health !== null ? `${summary.avg_health}/100` : '—', label: 'Saúde média', color: '#E85219', light: '#fdeee8' },
                ].map((k) => (
                  <Paper key={k.label} elevation={0} sx={{
                    p: 3, textAlign: 'center', borderRadius: 2,
                    border: `1px solid ${alpha(k.color, 0.18)}`,
                    bgcolor: dark ? alpha(k.color, 0.1) : k.light,
                    boxShadow: 'none',
                  }}>
                    <Typography sx={{ fontWeight: 900, fontSize: '2.25rem', lineHeight: 1, color: k.color, fontVariantNumeric: 'tabular-nums', mb: 0.75 }}>
                      {k.value}
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: `${k.color}aa`, textTransform: 'uppercase', fontSize: '0.6rem', letterSpacing: '0.1em' }}>
                      {k.label}
                    </Typography>
                  </Paper>
                ))}
              </Box>
            )}

            {/* Filters */}
            <Stack direction="row" spacing={1.5} mb={2} flexWrap="wrap">
              <TextField size="small" placeholder="Buscar cliente..." value={search} onChange={(e) => setSearch(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><IconSearch size={16} /></InputAdornment> }}
                sx={{ minWidth: 240 }}
              />
              <TextField select size="small" value={riskFilter} onChange={(e) => setRiskFilter(e.target.value as any)} sx={{ minWidth: 140 }}>
                <MenuItem value="all">Todos os riscos</MenuItem>
                <MenuItem value="critical">Crítico</MenuItem>
                <MenuItem value="warning">Atenção</MenuItem>
                <MenuItem value="ok">OK</MenuItem>
              </TextField>
            </Stack>

            {/* Table */}
            <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: dark ? alpha('#fff', 0.03) : alpha('#000', 0.02) }}>
                    <TableCell sx={{ fontWeight: 700 }}>Cliente</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Risco</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Saúde</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Trend</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Jobs ativos</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Bloqueados</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Atrasados</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Última atividade</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        Nenhum cliente encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((cl) => (
                      <TableRow key={cl.id} hover sx={{
                        bgcolor: cl.risk === 'critical' ? alpha(theme.palette.error.main, 0.04) :
                                 cl.risk === 'warning' ? alpha(theme.palette.warning.main, 0.03) : 'inherit',
                      }}>
                        <TableCell>
                          <Typography fontWeight={600} fontSize="0.875rem">{cl.name}</Typography>
                          {cl.segment && <Typography variant="caption" color="text.secondary">{cl.segment}</Typography>}
                        </TableCell>
                        <TableCell><RiskChip risk={cl.risk} /></TableCell>
                        <TableCell><HealthBar score={cl.health_score} /></TableCell>
                        <TableCell><TrendIcon trend={cl.health_trend} /></TableCell>
                        <TableCell align="center">
                          <Typography fontWeight={700} color={cl.active_jobs > 10 ? 'warning.main' : 'text.primary'}>{cl.active_jobs}</Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography fontWeight={700} color={cl.blocked_jobs > 0 ? 'error.main' : 'text.disabled'}>{cl.blocked_jobs}</Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography fontWeight={700} color={cl.overdue_jobs > 0 ? 'error.main' : 'text.disabled'}>{cl.overdue_jobs}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {cl.last_job_activity ? new Date(cl.last_job_activity).toLocaleDateString('pt-BR') : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Tooltip title="Ver cliente">
                            <Button component={Link} href={`/clients/${cl.id}`} size="small" sx={{ minWidth: 0, p: 0.5 }}>
                              <IconExternalLink size={16} />
                            </Button>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </Box>
  );

  if (embedded) return content;

  return (
    <AppShell title="Painel Executivo">
      {content}
    </AppShell>
  );
}
