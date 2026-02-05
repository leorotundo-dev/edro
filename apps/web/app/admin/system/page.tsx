'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { apiGet, apiPost } from '@/lib/api';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Tab from '@mui/material/Tab';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import {
  IconRefresh,
  IconPlayerPlay,
  IconChartBar,
} from '@tabler/icons-react';

type FeatureFlag = {
  key: string;
  enabled: boolean;
  description?: string;
  updated_at?: string;
};

type SecurityLog = {
  id: string;
  tenant_id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  field_name: string;
  old_value: string;
  new_value: string;
  timestamp: string;
};

type AccessLog = {
  id: string;
  tenant_id: string;
  user_id: string;
  table_name: string;
  operation: string;
  record_id: string;
  timestamp: string;
};

type SecurityDashboard = {
  total_immutable_changes: number;
  total_access_logs: number;
  recent_suspicious_activity: any[];
  top_users_by_activity: any[];
};

export default function AdminSystemPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);

  // Feature Flags
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loadingFlags, setLoadingFlags] = useState(false);

  // Security Logs
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [securityDashboard, setSecurityDashboard] = useState<SecurityDashboard | null>(null);
  const [loadingSecurity, setLoadingSecurity] = useState(false);

  // Jobs
  const [jobStatus, setJobStatus] = useState<string>('');
  const [loadingJob, setLoadingJob] = useState(false);
  const [insightsStatus, setInsightsStatus] = useState<string>('');
  const [loadingInsights, setLoadingInsights] = useState(false);

  useEffect(() => {
    if (activeTab === 0) {
      loadFlags();
    } else if (activeTab === 1) {
      loadSecurityLogs();
    } else if (activeTab === 3) {
      loadSecurityDashboard();
    }
  }, [activeTab]);

  const loadFlags = async () => {
    setLoadingFlags(true);
    try {
      const res = await apiGet<{ success: boolean; flags: FeatureFlag[] }>('/flags');
      if (res?.flags) {
        setFlags(res.flags);
      }
    } catch (error) {
      console.error('Failed to load flags:', error);
    } finally {
      setLoadingFlags(false);
    }
  };

  const toggleFlag = async (key: string, currentEnabled: boolean) => {
    try {
      await apiPost(`/flags/${key}`, { enabled: !currentEnabled });
      await loadFlags();
    } catch (error) {
      console.error('Failed to toggle flag:', error);
    }
  };

  const loadSecurityLogs = async () => {
    setLoadingSecurity(true);
    try {
      const [immutableRes, accessRes] = await Promise.all([
        apiGet<{ success: boolean; logs: SecurityLog[] }>('/security/immutable-audit'),
        apiGet<{ success: boolean; logs: AccessLog[] }>('/security/access-logs'),
      ]);

      if (immutableRes?.logs) setSecurityLogs(immutableRes.logs);
      if (accessRes?.logs) setAccessLogs(accessRes.logs);
    } catch (error) {
      console.error('Failed to load security logs:', error);
    } finally {
      setLoadingSecurity(false);
    }
  };

  const loadSecurityDashboard = async () => {
    setLoadingSecurity(true);
    try {
      const res = await apiGet<{ success: boolean; data: SecurityDashboard }>('/security/dashboard');
      if (res?.data) {
        setSecurityDashboard(res.data);
      }
    } catch (error) {
      console.error('Failed to load security dashboard:', error);
    } finally {
      setLoadingSecurity(false);
    }
  };

  const triggerLibraryJob = async () => {
    setLoadingJob(true);
    setJobStatus('');
    try {
      const res = await apiPost<{ success: boolean; message: string }>('/admin/jobs/library', {});
      setJobStatus(res?.message || 'Job triggered successfully');
    } catch (error: any) {
      setJobStatus(`Error: ${error.message}`);
    } finally {
      setLoadingJob(false);
    }
  };

  const triggerInsightsJob = async () => {
    setLoadingInsights(true);
    setInsightsStatus('');
    try {
      const res = await apiPost<{ ok?: boolean }>('/admin/jobs/insights', {});
      setInsightsStatus(res?.ok ? 'Insights atualizados com sucesso.' : 'Job de insights iniciado.');
    } catch (error: any) {
      setInsightsStatus(`Error: ${error.message}`);
    } finally {
      setLoadingInsights(false);
    }
  };

  const getOperationColor = (operation: string): 'info' | 'success' | 'warning' | 'error' => {
    if (operation === 'SELECT') return 'info';
    if (operation === 'INSERT') return 'success';
    if (operation === 'UPDATE') return 'warning';
    return 'error';
  };

  const renderFeatureFlags = () => (
    <Stack spacing={3}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography variant="h6">Feature Flags</Typography>
          <Typography variant="body2" color="text.secondary">
            Gerencie features toggles do sistema
          </Typography>
        </Box>
        <IconButton onClick={loadFlags}>
          <IconRefresh size={20} />
        </IconButton>
      </Stack>

      {loadingFlags ? (
        <Stack alignItems="center" sx={{ py: 4 }}>
          <CircularProgress size={32} />
        </Stack>
      ) : (
        <Card variant="outlined">
          {flags.length > 0 ? (
            flags.map((flag, index) => (
              <Box key={flag.key}>
                {index > 0 && <Divider />}
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ px: 3, py: 2, '&:hover': { bgcolor: 'action.hover' } }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2">{flag.key}</Typography>
                    {flag.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {flag.description}
                      </Typography>
                    )}
                    {flag.updated_at && (
                      <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
                        Updated: {new Date(flag.updated_at).toLocaleString('pt-BR')}
                      </Typography>
                    )}
                  </Box>
                  <Switch
                    checked={flag.enabled}
                    onChange={() => toggleFlag(flag.key, flag.enabled)}
                  />
                </Stack>
              </Box>
            ))
          ) : (
            <CardContent>
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                Nenhum feature flag encontrado
              </Typography>
            </CardContent>
          )}
        </Card>
      )}
    </Stack>
  );

  const renderSecurityLogs = () => (
    <Stack spacing={4}>
      <Box>
        <Typography variant="h6" sx={{ mb: 2 }}>Immutable Field Audit Logs</Typography>
        <Card variant="outlined">
          {loadingSecurity ? (
            <Stack alignItems="center" sx={{ py: 4 }}>
              <CircularProgress size={32} />
            </Stack>
          ) : securityLogs.length > 0 ? (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Timestamp</TableCell>
                    <TableCell>User</TableCell>
                    <TableCell>Action</TableCell>
                    <TableCell>Entity</TableCell>
                    <TableCell>Field</TableCell>
                    <TableCell>Old Value</TableCell>
                    <TableCell>New Value</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {securityLogs.slice(0, 50).map((log) => (
                    <TableRow key={log.id} hover>
                      <TableCell>{new Date(log.timestamp).toLocaleString('pt-BR')}</TableCell>
                      <TableCell>{log.user_id}</TableCell>
                      <TableCell>
                        <Chip size="small" color="error" label={log.action} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {log.entity_type} ({log.entity_id})
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {log.field_name}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 200 }}>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {log.old_value}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 200 }}>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {log.new_value}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <CardContent>
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                Nenhum log de auditoria encontrado
              </Typography>
            </CardContent>
          )}
        </Card>
      </Box>

      <Box>
        <Typography variant="h6" sx={{ mb: 2 }}>Access Logs</Typography>
        <Card variant="outlined">
          {accessLogs.length > 0 ? (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Timestamp</TableCell>
                    <TableCell>User</TableCell>
                    <TableCell>Table</TableCell>
                    <TableCell>Operation</TableCell>
                    <TableCell>Record ID</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {accessLogs.slice(0, 50).map((log) => (
                    <TableRow key={log.id} hover>
                      <TableCell>{new Date(log.timestamp).toLocaleString('pt-BR')}</TableCell>
                      <TableCell>{log.user_id}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }} color="text.secondary">
                          {log.table_name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip size="small" color={getOperationColor(log.operation)} label={log.operation} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {log.record_id}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <CardContent>
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                Nenhum access log encontrado
              </Typography>
            </CardContent>
          )}
        </Card>
      </Box>
    </Stack>
  );

  const renderJobs = () => (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h6">Manual Job Triggers</Typography>
        <Typography variant="body2" color="text.secondary">
          Acione jobs de processamento manualmente
        </Typography>
      </Box>

      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" gutterBottom>Library Processing Job</Typography>
              <Typography variant="body2" color="text.secondary">
                Processa arquivos pendentes na biblioteca de clientes (OCR, embeddings, etc.)
              </Typography>
            </Box>
            <Button
              variant="contained"
              onClick={triggerLibraryJob}
              disabled={loadingJob}
              startIcon={loadingJob ? <CircularProgress size={16} color="inherit" /> : <IconPlayerPlay size={16} />}
            >
              {loadingJob ? 'Processando...' : 'Executar Job'}
            </Button>
          </Stack>

          {jobStatus && (
            <Alert severity={jobStatus.startsWith('Error') ? 'error' : 'success'} sx={{ mt: 2 }}>
              {jobStatus}
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" gutterBottom>Reportei Insights Job</Typography>
              <Typography variant="body2" color="text.secondary">
                Coleta metricas do Reportei e salva insights para cada cliente.
              </Typography>
            </Box>
            <Button
              variant="contained"
              color="secondary"
              onClick={triggerInsightsJob}
              disabled={loadingInsights}
              startIcon={loadingInsights ? <CircularProgress size={16} color="inherit" /> : <IconChartBar size={16} />}
            >
              {loadingInsights ? 'Processando...' : 'Rodar Reportei'}
            </Button>
          </Stack>

          {insightsStatus && (
            <Alert severity={insightsStatus.startsWith('Error') ? 'error' : 'success'} sx={{ mt: 2 }}>
              {insightsStatus}
            </Alert>
          )}
        </CardContent>
      </Card>
    </Stack>
  );

  const renderSecurityDashboard = () => (
    <Stack spacing={4}>
      <Typography variant="h6">Security Analytics</Typography>

      {loadingSecurity ? (
        <Stack alignItems="center" sx={{ py: 4 }}>
          <CircularProgress size={32} />
        </Stack>
      ) : securityDashboard ? (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Total Immutable Changes
                </Typography>
                <Typography variant="h3" color="error.main">
                  {securityDashboard.total_immutable_changes}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Tentativas de alterar campos imutaveis
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Total Access Logs
                </Typography>
                <Typography variant="h3" color="info.main">
                  {securityDashboard.total_access_logs}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Registros de acesso ao banco
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {securityDashboard.recent_suspicious_activity?.length > 0 && (
            <Grid size={{ xs: 12 }}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>Recent Suspicious Activity</Typography>
                  <Stack spacing={1}>
                    {securityDashboard.recent_suspicious_activity.map((activity: any, idx: number) => (
                      <Alert key={idx} severity="error" variant="outlined">
                        {JSON.stringify(activity)}
                      </Alert>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          )}

          {securityDashboard.top_users_by_activity?.length > 0 && (
            <Grid size={{ xs: 12 }}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>Top Users by Activity</Typography>
                  <Stack spacing={1}>
                    {securityDashboard.top_users_by_activity.map((user: any, idx: number) => (
                      <Stack
                        key={idx}
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}
                      >
                        <Typography variant="body2">{user.user_id || user.email}</Typography>
                        <Typography variant="body2" fontWeight={600} color="text.secondary">
                          {user.count} actions
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          Nenhum dado de seguranca disponivel
        </Typography>
      )}
    </Stack>
  );

  return (
    <AppShell title="System Admin">
      <Box sx={{ p: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" gutterBottom>System Administration</Typography>
          <Typography variant="body2" color="text.secondary">
            Gerencie configuracoes avancadas do sistema
          </Typography>
        </Box>

        <Tabs
          value={activeTab}
          onChange={(_, value) => setActiveTab(value)}
          sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Feature Flags" />
          <Tab label="Security Logs" />
          <Tab label="Jobs" />
          <Tab label="Dashboard" />
        </Tabs>

        <Box>
          {activeTab === 0 && renderFeatureFlags()}
          {activeTab === 1 && renderSecurityLogs()}
          {activeTab === 2 && renderJobs()}
          {activeTab === 3 && renderSecurityDashboard()}
        </Box>
      </Box>
    </AppShell>
  );
}
