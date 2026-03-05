'use client';

import { useState, useEffect, useCallback } from 'react';
import AppShell from '@/components/AppShell';
import AdminSubmenu from '@/components/admin/AdminSubmenu';
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
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import {
  IconLink,
  IconRefresh,
  IconCheck,
  IconX,
  IconAlertCircle,
  IconChartBar,
} from '@tabler/icons-react';

type ClientRow = {
  client_id: string;
  client_name: string;
  linked: boolean;
  integration_id: number | null;
  integration_name: string | null;
  integration_slug: string | null;
  project_name: string | null;
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
  matched_integration_id: number | null;
  matched_name: string | null;
  score: number;
  action: 'linked' | 'skipped' | 'no_match';
};

export default function ReporteiAdminPage() {
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoLinking, setAutoLinking] = useState(false);
  const [autoLinkResults, setAutoLinkResults] = useState<AutoLinkResult[] | null>(null);
  const [manualDialog, setManualDialog] = useState<ClientRow | null>(null);
  const [selectedIntegration, setSelectedIntegration] = useState<number | ''>('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet('/admin/reportei/status');
      setData(res);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const runAutoLink = async (dryRun: boolean) => {
    setAutoLinking(true);
    setAutoLinkResults(null);
    try {
      const res = await apiPost('/admin/reportei/auto-link', {
        slug_filter: 'instagram_business',
        dry_run: dryRun,
      });
      setAutoLinkResults(res.results ?? []);
      if (!dryRun) load();
    } finally {
      setAutoLinking(false);
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
    <AppShell>
      <AdminSubmenu value="reportei" />

      <Box sx={{ maxWidth: 1100, mx: 'auto', px: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
          <Stack direction="row" alignItems="center" gap={1}>
            <IconChartBar size={24} />
            <Typography variant="h5" fontWeight={700}>Reportei — Configuração de Clientes</Typography>
          </Stack>
          <Stack direction="row" gap={1}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<IconRefresh size={16} />}
              onClick={load}
              disabled={loading}
            >
              Atualizar
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => runAutoLink(true)}
              disabled={autoLinking}
            >
              Simular auto-link
            </Button>
            <Button
              size="small"
              variant="contained"
              startIcon={<IconLink size={16} />}
              onClick={() => runAutoLink(false)}
              disabled={autoLinking}
            >
              {autoLinking ? 'Vinculando…' : 'Auto-vincular Instagram'}
            </Button>
          </Stack>
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
                    <TableCell>Match Reportei</TableCell>
                    <TableCell>Score</TableCell>
                    <TableCell>Ação</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {autoLinkResults.map(r => (
                    <TableRow key={r.client_id}>
                      <TableCell>{r.client_name}</TableCell>
                      <TableCell>{r.matched_name ?? '—'}</TableCell>
                      <TableCell>{r.score}</TableCell>
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
                  <TableCell><Typography variant="caption" fontWeight={700}>Integration ID</Typography></TableCell>
                  <TableCell><Typography variant="caption" fontWeight={700}>Integração Reportei</Typography></TableCell>
                  <TableCell><Typography variant="caption" fontWeight={700}>Projeto</Typography></TableCell>
                  <TableCell><Typography variant="caption" fontWeight={700}>Ações</Typography></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(data?.clients ?? []).map(row => (
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
                      <Typography variant="caption" color="text.secondary">
                        {row.integration_id ?? '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{row.integration_name ?? '—'}</Typography>
                      {row.integration_slug && (
                        <Typography variant="caption" color="text.secondary">{row.integration_slug}</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{row.project_name ?? '—'}</Typography>
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
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
    </AppShell>
  );
}
