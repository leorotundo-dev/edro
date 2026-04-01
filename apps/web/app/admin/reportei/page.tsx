'use client';

import { useState, useEffect, useCallback } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import { apiGet, apiPost } from '@/lib/api';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import {
  IconBell,
  IconLink,
  IconRefresh,
  IconCheck,
  IconX,
  IconAlertCircle,
  IconChartBar,
  IconTrendingDown,
  IconTrendingUp,
} from '@tabler/icons-react';

type PlatformEntry = { integration_id: number; name: string | null; slug: string };

type ClientRow = {
  client_id: string;
  client_name: string;
  linked: boolean;
  integration_id: number | null;
  integration_name: string | null;
  integration_slug: string | null;
  project_name: string | null;
  platforms: Record<string, PlatformEntry>;
  last_sync_ok: boolean | null;
  last_error: string | null;
};

type Integration = {
  id: number;
  name: string;
  slug: string;
  project_id: number;
  project_name: string;
};

type StatusData = {
  clients: ClientRow[];
  reportei_integrations: Integration[];
};

type AutoLinkResult = {
  client_id: string;
  client_name: string;
  platforms: Record<string, { id: number; name: string; score: number }>;
  action: 'linked' | 'skipped' | 'no_match';
};

type PerfAlert = {
  id: string;
  client_id: string;
  type: 'perf_drop' | 'perf_spike';
  severity: 'warning' | 'info';
  title: string;
  body: string;
  payload: Record<string, any>;
  sent_at: string;
};

export default function ReporteiAdminPage() {
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoLinking, setAutoLinking] = useState(false);
  const [autoLinkResults, setAutoLinkResults] = useState<AutoLinkResult[] | null>(null);
  const [manualDialog, setManualDialog] = useState<ClientRow | null>(null);
  const [selectedIntegration, setSelectedIntegration] = useState<number | ''>('');
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState(0);
  const [alerts, setAlerts] = useState<PerfAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [runningAlerts, setRunningAlerts] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet('/admin/reportei/status');
      setData(res);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAlerts = useCallback(async () => {
    setAlertsLoading(true);
    try {
      const res = await apiGet<{ alerts: PerfAlert[] }>('/admin/reportei/alerts');
      setAlerts(res?.alerts ?? []);
    } finally {
      setAlertsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (tab === 1) loadAlerts(); }, [tab, loadAlerts]);

  const runAutoLink = async (dryRun: boolean) => {
    setAutoLinking(true);
    setAutoLinkResults(null);
    try {
      const res = await apiPost('/admin/reportei/auto-link', { dry_run: dryRun });
      setAutoLinkResults(res.results ?? []);
      if (!dryRun) load();
    } finally {
      setAutoLinking(false);
    }
  };

  const runAlerts = async () => {
    setRunningAlerts(true);
    try {
      await apiPost('/admin/reportei/run-alerts', {});
      await loadAlerts();
    } finally {
      setRunningAlerts(false);
    }
  };

  const saveManualLink = async () => {
    if (!manualDialog || selectedIntegration === '') return;
    setSaving(true);
    try {
      await apiPost('/admin/reportei/link-client', {
        client_id: manualDialog.client_id,
        integration_id: Number(selectedIntegration),
      });
      setManualDialog(null);
      setSelectedIntegration('');
      load();
    } finally {
      setSaving(false);
    }
  };

  const integrations = data?.reportei_integrations ?? [];
  const igIntegrations = integrations.filter(i => i.slug === 'instagram_business');

  return (
    <AdminShell section="sistema">

      <Box sx={{ maxWidth: 1100, mx: 'auto', px: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
          <Stack direction="row" alignItems="center" gap={1}>
            <IconChartBar size={24} />
            <Typography variant="h5" fontWeight={700}>Reportei — Intelligence</Typography>
          </Stack>
          <Button
            size="small"
            variant="outlined"
            startIcon={<IconRefresh size={16} />}
            onClick={load}
            disabled={loading}
          >
            Atualizar
          </Button>
        </Stack>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Clientes" icon={<IconChartBar size={16} />} iconPosition="start" />
          <Tab label="Alertas de Performance" icon={<IconBell size={16} />} iconPosition="start" />
        </Tabs>

        {tab === 0 && (<>
        <Stack direction="row" gap={1} mb={3} flexWrap="wrap">
          <Button
            size="small"
            variant="contained"
            startIcon={<IconLink size={16} />}
            onClick={() => runAutoLink(false)}
            disabled={autoLinking}
          >
            {autoLinking ? 'Vinculando…' : 'Auto-vincular todas as plataformas'}
          </Button>
        </Stack>

        {/* Auto-link results */}
        {autoLinkResults && (
          <Box mb={3}>
            <Alert severity="info" sx={{ mb: 1 }}>
              Resultado: {autoLinkResults.filter(r => r.action === 'linked').length} vinculados,{' '}
              {autoLinkResults.filter(r => r.action === 'no_match').length} sem match
            </Alert>
            <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Cliente Edro</TableCell>
                    <TableCell>Plataformas vinculadas</TableCell>
                    <TableCell>Ação</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {autoLinkResults.map(r => (
                    <TableRow key={r.client_id}>
                      <TableCell>{r.client_name}</TableCell>
                      <TableCell>
                        {Object.keys(r.platforms).length === 0 ? (
                          <Typography variant="caption" color="text.secondary">sem match</Typography>
                        ) : (
                          <Stack direction="row" flexWrap="wrap" gap={0.5}>
                            {Object.entries(r.platforms).map(([slug, info]) => (
                              <Chip
                                key={slug}
                                size="small"
                                label={`${slug.replace('_', ' ')} · ${info.score}`}
                                color="success"
                                variant="outlined"
                              />
                            ))}
                          </Stack>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={r.action}
                          color={r.action === 'linked' ? 'success' : r.action === 'no_match' ? 'warning' : 'default'}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* Main status table */}
        {loading ? (
          <Stack alignItems="center" py={6}><CircularProgress /></Stack>
        ) : (
          <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell><Typography variant="caption" fontWeight={700}>Cliente</Typography></TableCell>
                  <TableCell><Typography variant="caption" fontWeight={700}>Status</Typography></TableCell>
                  <TableCell><Typography variant="caption" fontWeight={700}>Plataformas</Typography></TableCell>
                  <TableCell><Typography variant="caption" fontWeight={700}>Projeto</Typography></TableCell>
                  <TableCell><Typography variant="caption" fontWeight={700}>Ações</Typography></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(data?.clients ?? []).map(row => {
                  const platformEntries = Object.entries(row.platforms ?? {});
                  return (
                  <TableRow key={row.client_id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>{row.client_name}</Typography>
                    </TableCell>
                    <TableCell>
                      {row.linked ? (
                        row.last_sync_ok === false ? (
                          <Chip size="small" icon={<IconAlertCircle size={14} />} label="Erro" color="error" />
                        ) : (
                          <Chip size="small" icon={<IconCheck size={14} />} label="Vinculado" color="success" />
                        )
                      ) : (
                        <Chip size="small" icon={<IconX size={14} />} label="Não vinculado" color="default" />
                      )}
                    </TableCell>
                    <TableCell>
                      {platformEntries.length > 0 ? (
                        <Stack direction="row" flexWrap="wrap" gap={0.5}>
                          {platformEntries.map(([slug, info]) => (
                            <Chip
                              key={slug}
                              size="small"
                              label={slug.replace('_', ' ')}
                              title={info.name ?? undefined}
                              color="primary"
                              variant="outlined"
                            />
                          ))}
                        </Stack>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          {row.integration_id ? `ID ${row.integration_id}` : '—'}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{row.project_name ?? '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" gap={0.5}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            setManualDialog(row);
                            setSelectedIntegration(row.integration_id ?? '');
                          }}
                        >
                          {row.linked ? 'Alterar' : 'Vincular'}
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        </>)}

        {tab === 1 && (
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="subtitle1" fontWeight={700}>
                Alertas de Performance Automáticos
              </Typography>
              <Stack direction="row" gap={1}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<IconRefresh size={16} />}
                  onClick={loadAlerts}
                  disabled={alertsLoading}
                >
                  Atualizar
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  color="warning"
                  onClick={runAlerts}
                  disabled={runningAlerts}
                >
                  {runningAlerts ? 'Rodando detecção…' : 'Detectar alertas agora'}
                </Button>
              </Stack>
            </Stack>
            <Alert severity="info" sx={{ mb: 2 }}>
              Alertas são gerados automaticamente toda segunda-feira.
              Quedas {'>'} 20% geram alerta de queda; picos {'>'} 50% geram alerta de alta.
            </Alert>
            {alertsLoading ? (
              <Stack alignItems="center" py={6}><CircularProgress /></Stack>
            ) : alerts.length === 0 ? (
              <Alert severity="success">Nenhum alerta de performance detectado recentemente.</Alert>
            ) : (
              <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell><Typography variant="caption" fontWeight={700}>Tipo</Typography></TableCell>
                      <TableCell><Typography variant="caption" fontWeight={700}>Título</Typography></TableCell>
                      <TableCell><Typography variant="caption" fontWeight={700}>Plataforma</Typography></TableCell>
                      <TableCell align="right"><Typography variant="caption" fontWeight={700}>Delta</Typography></TableCell>
                      <TableCell><Typography variant="caption" fontWeight={700}>Data</Typography></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {alerts.map((a) => (
                      <TableRow key={a.id} hover>
                        <TableCell>
                          {a.type === 'perf_drop' ? (
                            <Chip size="small" icon={<IconTrendingDown size={12} />} label="Queda" color="error" />
                          ) : (
                            <Chip size="small" icon={<IconTrendingUp size={12} />} label="Pico" color="success" />
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>{a.title}</Typography>
                          <Typography variant="caption" color="text.secondary">{a.body}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip size="small" label={a.payload?.platform ?? '—'} />
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            variant="body2"
                            fontWeight={600}
                            color={a.type === 'perf_drop' ? 'error.main' : 'success.main'}
                          >
                            {a.payload?.delta_pct != null
                              ? `${a.payload.delta_pct > 0 ? '+' : ''}${a.payload.delta_pct.toFixed(1)}%`
                              : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(a.sent_at).toLocaleDateString('pt-BR')}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}
      </Box>

      {/* Manual link dialog */}
      <Dialog open={!!manualDialog} onClose={() => setManualDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Vincular {manualDialog?.client_name}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Selecione a integração do Reportei para este cliente:
          </Typography>
          <Select
            fullWidth
            size="small"
            value={selectedIntegration}
            onChange={e => setSelectedIntegration(e.target.value as number)}
            displayEmpty
          >
            <MenuItem value=""><em>Selecione uma integração</em></MenuItem>
            {integrations.map(i => (
              <MenuItem key={i.id} value={i.id}>
                [{i.slug}] {i.name} — {i.project_name} (id: {i.id})
              </MenuItem>
            ))}
          </Select>
          {igIntegrations.length > 0 && (
            <Typography variant="caption" color="text.secondary" mt={1} display="block">
              Sugestão Instagram Business para este cliente:{' '}
              {igIntegrations.find(i => i.project_name?.toLowerCase().includes(
                manualDialog?.client_name?.toLowerCase().split(' ')[0] ?? ''
              ))?.name ?? '—'}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManualDialog(null)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={saveManualLink}
            disabled={saving || selectedIntegration === ''}
          >
            {saving ? 'Salvando…' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>
    </AdminShell>
  );
}
