'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { apiGet } from '@/lib/api';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Avatar from '@mui/material/Avatar';
import CircularProgress from '@mui/material/CircularProgress';
import StatusChip from '@/components/shared/StatusChip';
import {
  IconDownload,
  IconPlus,
  IconCalendar,
  IconUser,
  IconBuilding,
  IconSourceCode,
  IconAlertTriangle,
  IconClipboardList,
  IconFileText,
  IconUsers,
} from '@tabler/icons-react';

type Briefing = {
  id: string;
  client_name: string | null;
  title: string;
  status: string;
  created_at: string;
  due_at: string | null;
  traffic_owner: string | null;
  source: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  briefing: 'Briefing',
  iclips_in: 'iClips Entrada',
  alinhamento: 'Alinhamento',
  copy_ia: 'Copy IA',
  aprovacao: 'Aprovação',
  producao: 'Produção',
  revisao: 'Revisão',
  iclips_out: 'iClips Saída',
  done: 'Concluído',
};

function formatDate(value?: string | null) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatRelativeDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `Atrasado ${Math.abs(diffDays)}d`;
  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Amanhã';
  if (diffDays <= 7) return `${diffDays} dias`;
  return null;
}

type Metrics = {
  total: number;
  byStatus: Record<string, number>;
  avgTimePerStage: Record<string, number>;
  totalCopies: number;
  tasksByType: Record<string, number>;
  recentBriefings: number;
  bottlenecks: { stage: string; count: number }[];
};

export default function BriefingsClient() {
  const router = useRouter();
  const [briefings, setBriefings] = useState<Briefing[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  const loadBriefings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);

      const response = await apiGet<{ success: boolean; data: Briefing[] }>(
        `/edro/briefings?${params.toString()}`
      );
      setBriefings(response?.data || []);
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar briefings.');
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  const loadMetrics = useCallback(async () => {
    try {
      const response = await apiGet<{ success: boolean; data: Metrics }>('/edro/metrics');
      setMetrics(response?.data || null);
    } catch (err: any) {
      console.error('Falha ao carregar métricas:', err);
    }
  }, []);

  useEffect(() => {
    loadBriefings();
    loadMetrics();
  }, [loadBriefings, loadMetrics]);

  const handleNewBriefing = () => {
    router.push('/edro/novo');
  };

  const handleBriefingClick = (id: string) => {
    router.push(`/edro/${id}`);
  };

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const url = `/edro/reports/export?format=${format}`;

      if (format === 'csv') {
        window.open(`${process.env.NEXT_PUBLIC_API_URL || '/api'}${url}`, '_blank');
      } else {
        const response = await apiGet<{ success: boolean; data: any[] }>(url);
        const blob = new Blob([JSON.stringify(response?.data || [], null, 2)], {
          type: 'application/json',
        });
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `edro-briefings-${Date.now()}.json`;
        a.click();
      }
    } catch (err: any) {
      alert(err?.message || 'Erro ao exportar relatório.');
    }
  };

  if (loading && briefings.length === 0) {
    return (
      <Box sx={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Stack alignItems="center" spacing={2}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary">
            Carregando briefings...
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <AppShell
      title="Briefings Edro"
      topbarLeft={
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="caption" color="text.secondary">
            Edro
          </Typography>
          <Typography variant="caption" color="text.secondary">
            / Briefings
          </Typography>
        </Stack>
      }
      topbarRight={
        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            variant="outlined"
            size="small"
            startIcon={<IconDownload size={16} />}
            onClick={() => handleExport('csv')}
          >
            Exportar CSV
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<IconPlus size={16} />}
            onClick={handleNewBriefing}
          >
            Novo Briefing
          </Button>
        </Stack>
      }
    >
      <Stack spacing={3}>
        {error && <Alert severity="error">{error}</Alert>}

        {metrics && (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6, lg: 3 }}>
              <Card variant="outlined">
                <CardContent>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar variant="rounded" sx={{ bgcolor: 'grey.100', color: 'primary.main' }}>
                      <IconFileText size={18} />
                    </Avatar>
                    <Box>
                      <Typography variant="h4">{metrics.total}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Briefings
                      </Typography>
                    </Box>
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    +{metrics.recentBriefings} últimos 7 dias
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 6, lg: 3 }}>
              <Card variant="outlined">
                <CardContent>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar variant="rounded" sx={{ bgcolor: 'grey.100', color: 'primary.main' }}>
                      <IconClipboardList size={18} />
                    </Avatar>
                    <Box>
                      <Typography variant="h4">{metrics.totalCopies}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Copies Geradas
                      </Typography>
                    </Box>
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    IA automatizada
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 6, lg: 3 }}>
              <Card variant="outlined">
                <CardContent>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar variant="rounded" sx={{ bgcolor: 'grey.100', color: 'primary.main' }}>
                      <IconCalendar size={18} />
                    </Avatar>
                    <Box>
                      <Typography variant="h4">{metrics.byStatus.aprovacao || 0}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Em Aprovação
                      </Typography>
                    </Box>
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Aguardando gestor
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 6, lg: 3 }}>
              <Card variant="outlined">
                <CardContent>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar variant="rounded" sx={{ bgcolor: 'grey.100', color: 'primary.main' }}>
                      <IconUsers size={18} />
                    </Avatar>
                    <Box>
                      <Typography variant="h4">{metrics.byStatus.done || 0}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Concluídos
                      </Typography>
                    </Box>
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Entregues
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {metrics && metrics.bottlenecks.length > 0 && (
          <Alert
            severity="warning"
            icon={<IconAlertTriangle size={18} />}
          >
            <Stack spacing={1}>
              <Typography variant="subtitle2">Etapas com Gargalos</Typography>
              <Stack direction="row" spacing={2} flexWrap="wrap">
                {metrics.bottlenecks.map((bottleneck) => (
                  <Chip
                    key={bottleneck.stage}
                    label={`${STATUS_LABELS[bottleneck.stage] || bottleneck.stage}: ${bottleneck.count}`}
                    size="small"
                  />
                ))}
              </Stack>
            </Stack>
          </Alert>
        )}

        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Button
            variant={filterStatus === '' ? 'contained' : 'outlined'}
            size="small"
            onClick={() => setFilterStatus('')}
          >
            Todos
          </Button>
          {Object.keys(STATUS_LABELS).map((status) => (
            <Button
              key={status}
              variant={filterStatus === status ? 'contained' : 'outlined'}
              size="small"
              onClick={() => setFilterStatus(status)}
            >
              {STATUS_LABELS[status]}
            </Button>
          ))}
        </Stack>

        {briefings.length === 0 && !loading ? (
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant="h6" gutterBottom>
                Nenhum briefing encontrado
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Comece criando seu primeiro briefing para automatizar o fluxo da agência.
              </Typography>
              <Button variant="contained" onClick={handleNewBriefing}>
                Criar Primeiro Briefing
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Stack spacing={2}>
            {briefings.map((briefing) => {
              const relativeDate = formatRelativeDate(briefing.due_at);
              const isOverdue = relativeDate?.includes('Atrasado');

              return (
                <Card
                  key={briefing.id}
                  variant="outlined"
                  sx={{
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': { boxShadow: 3 },
                  }}
                  onClick={() => handleBriefingClick(briefing.id)}
                >
                  <CardContent>
                    <Stack spacing={2}>
                      <Stack
                        direction={{ xs: 'column', md: 'row' }}
                        spacing={2}
                        justifyContent="space-between"
                        alignItems={{ xs: 'flex-start', md: 'center' }}
                      >
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Avatar variant="rounded" sx={{ bgcolor: 'grey.100', color: 'primary.main' }}>
                            <IconFileText size={18} />
                          </Avatar>
                          <Box>
                            <Typography variant="h6">{briefing.title}</Typography>
                            <Stack direction="row" spacing={2} flexWrap="wrap" mt={0.5}>
                              {briefing.client_name && (
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                  <IconBuilding size={14} />
                                  <Typography variant="body2" color="text.secondary">
                                    {briefing.client_name}
                                  </Typography>
                                </Stack>
                              )}
                              {briefing.traffic_owner && (
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                  <IconUser size={14} />
                                  <Typography variant="body2" color="text.secondary">
                                    {briefing.traffic_owner}
                                  </Typography>
                                </Stack>
                              )}
                              <Stack direction="row" spacing={0.5} alignItems="center">
                                <IconCalendar size={14} />
                                <Typography variant="body2" color="text.secondary">
                                  {formatDate(briefing.created_at)}
                                </Typography>
                              </Stack>
                              {briefing.source && (
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                  <IconSourceCode size={14} />
                                  <Typography variant="body2" color="text.secondary">
                                    {briefing.source}
                                  </Typography>
                                </Stack>
                              )}
                            </Stack>
                          </Box>
                        </Stack>
                        <Stack direction="row" spacing={2} alignItems="center">
                          <StatusChip
                            status={briefing.status}
                            label={STATUS_LABELS[briefing.status] || briefing.status}
                          />
                          {briefing.due_at && (
                            <Stack spacing={0} alignItems="flex-end">
                              <Typography
                                variant="body2"
                                color={isOverdue ? 'error.main' : 'text.secondary'}
                              >
                                {relativeDate || formatDate(briefing.due_at)}
                              </Typography>
                              {relativeDate && (
                                <Typography variant="caption" color="text.secondary">
                                  {formatDate(briefing.due_at)}
                                </Typography>
                              )}
                            </Stack>
                          )}
                        </Stack>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        )}
      </Stack>
    </AppShell>
  );
}
