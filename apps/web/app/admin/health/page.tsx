'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import {
  IconHeartbeat, IconAlertTriangle, IconTrendingUp, IconRefresh, IconSearch,
  IconChevronRight,
} from '@tabler/icons-react';
import { apiGet } from '@/lib/api';

type ClientHealth = {
  id: string;
  name: string;
  segment: string | null;
  score: number | null;
  status: string;
  statusColor: string;
  briefings?: number;
  bottlenecks?: number;
};

type HealthSummary = {
  total: number;
  excellent: number;
  good: number;
  warning: number;
  critical: number;
  avg_score: number;
  total_bottlenecks: number;
};

type HealthData = {
  clients: ClientHealth[];
  summary: HealthSummary;
};

const STATUS_ORDER = ['critical', 'warning', 'good', 'excellent', 'no_data', 'error'];

export default function AdminHealthPage() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'score' | 'name' | 'status' | 'bottlenecks'>('status');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await apiGet<HealthData>('/admin/clients-health');
      setData(result);
    } catch (e: any) {
      setError(e?.message || 'Erro ao carregar dados de saúde.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const filtered = (data?.clients || [])
    .filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'score') return (b.score ?? -1) - (a.score ?? -1);
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'bottlenecks') return (b.bottlenecks ?? 0) - (a.bottlenecks ?? 0);
      // status: critical first
      return STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
    });

  const statusLabel: Record<string, string> = {
    excellent: 'Excelente', good: 'Bom', warning: 'Atenção', critical: 'Crítico', no_data: 'Sem dados', error: 'Erro',
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
        <IconHeartbeat size={28} color="#ff6600" />
        <Box flex={1}>
          <Typography variant="h5" fontWeight={700}>Health Score — Todos os Clientes</Typography>
          <Typography variant="body2" color="text.secondary">Visão geral da saúde de produção de cada cliente.</Typography>
        </Box>
        <Button variant="outlined" startIcon={loading ? <CircularProgress size={16} /> : <IconRefresh size={18} />}
          onClick={load} disabled={loading} size="small">
          Atualizar
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Summary cards */}
      {data && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Score Médio', value: `${data.summary.avg_score}`, color: '#ff6600', sub: `${data.summary.total} clientes` },
            { label: 'Excelentes', value: `${data.summary.excellent}`, color: '#13DEB9', sub: 'Score ≥ 80' },
            { label: 'Em Atenção', value: `${data.summary.warning + data.summary.critical}`, color: '#FA896B', sub: 'Score < 60' },
            { label: 'Gargalos Ativos', value: `${data.summary.total_bottlenecks}`, color: '#FFAE1F', sub: 'Briefings >48h parados' },
          ].map((s) => (
            <Grid key={s.label} size={{ xs: 6, md: 3 }}>
              <Card variant="outlined" sx={{ textAlign: 'center', borderColor: `${s.color}30` }}>
                <CardContent sx={{ py: 2 }}>
                  <Typography variant="h3" fontWeight={800} sx={{ color: s.color }}>{s.value}</Typography>
                  <Typography variant="subtitle2" fontWeight={600}>{s.label}</Typography>
                  <Typography variant="caption" color="text.secondary">{s.sub}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Filters */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }} alignItems="center">
        <TextField
          size="small" placeholder="Buscar cliente..." value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><IconSearch size={16} /></InputAdornment> }}
          sx={{ width: 240 }}
        />
        <Stack direction="row" spacing={1}>
          {(['status', 'score', 'bottlenecks', 'name'] as const).map((s) => (
            <Chip
              key={s}
              label={s === 'status' ? 'Por Criticidade' : s === 'score' ? 'Por Score' : s === 'bottlenecks' ? 'Por Gargalos' : 'A-Z'}
              size="small"
              onClick={() => setSortBy(s)}
              sx={{ cursor: 'pointer', bgcolor: sortBy === s ? '#ff6600' : undefined, color: sortBy === s ? '#fff' : undefined }}
            />
          ))}
        </Stack>
      </Stack>

      {/* Client grid */}
      {loading && !data ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <CircularProgress size={32} sx={{ color: '#ff6600' }} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Calculando scores para todos os clientes...
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {filtered.map((client) => (
            <Grid key={client.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card
                component={Link}
                href={`/clients/${client.id}/analytics`}
                variant="outlined"
                sx={{
                  display: 'block', textDecoration: 'none', cursor: 'pointer',
                  borderLeft: `4px solid ${client.statusColor}`,
                  transition: 'all 0.15s',
                  '&:hover': { boxShadow: `0 4px 16px ${client.statusColor}30`, transform: 'translateY(-1px)' },
                }}
              >
                <CardContent sx={{ py: 2 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
                    <Box flex={1} sx={{ minWidth: 0, mr: 1 }}>
                      <Typography variant="subtitle2" fontWeight={700} noWrap>{client.name}</Typography>
                      {client.segment && (
                        <Typography variant="caption" color="text.secondary" noWrap>{client.segment}</Typography>
                      )}
                    </Box>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      {(client.bottlenecks ?? 0) > 0 && (
                        <Chip
                          icon={<IconAlertTriangle size={12} />}
                          label={`${client.bottlenecks}`}
                          size="small"
                          sx={{ bgcolor: '#FA896B', color: '#fff', fontSize: '0.65rem', height: 20, '& .MuiChip-icon': { color: '#fff' } }}
                        />
                      )}
                      <IconChevronRight size={16} color="#94a3b8" />
                    </Stack>
                  </Stack>

                  {client.score !== null ? (
                    <>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                        <Typography variant="h4" fontWeight={800} sx={{ color: client.statusColor }}>
                          {client.score}
                        </Typography>
                        <Chip
                          label={statusLabel[client.status] || client.status}
                          size="small"
                          sx={{ bgcolor: client.statusColor, color: '#fff', fontWeight: 700, fontSize: '0.65rem', height: 20 }}
                        />
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={client.score}
                        sx={{
                          height: 4, borderRadius: 2,
                          bgcolor: `${client.statusColor}20`,
                          '& .MuiLinearProgress-bar': { bgcolor: client.statusColor },
                        }}
                      />
                      {(client.briefings ?? 0) > 0 && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                          {client.briefings} briefings nos últimos 30 dias
                        </Typography>
                      )}
                    </>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                      Sem dados de produção
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
          {filtered.length === 0 && !loading && (
            <Grid size={12}>
              <Alert severity="info">Nenhum cliente encontrado{search ? ` para "${search}"` : ''}.</Alert>
            </Grid>
          )}
        </Grid>
      )}
    </Box>
  );
}
