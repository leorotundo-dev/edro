'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import { IconBrandMeta, IconBrandGoogle, IconRefresh } from '@tabler/icons-react';
import { apiGet } from '@/lib/api';

type MetaData = {
  campaigns: {
    id: string;
    name: string;
    status: string;
    objective: string;
    insights?: { spend: string; impressions: string; clicks: string; reach: string };
  }[];
  account_id: string;
  fetched_at: string;
};

type GAData = {
  sessions: number;
  pageviews: number;
  bounceRate: number;
  avgSessionDuration: number;
  rows: { dimension: string; sessions: number; pageviews: number }[];
  fetched_at: string;
};

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <Card variant="outlined">
      <CardContent sx={{ textAlign: 'center', py: 2 }}>
        <Typography variant="h4" fontWeight={700} color={color || 'primary'}>{value}</Typography>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
      </CardContent>
    </Card>
  );
}

export default function ClientIntegrationsPage() {
  const params = useParams();
  const clientId = params.id as string;
  const [tab, setTab] = useState(0);
  const [metaData, setMetaData] = useState<MetaData | null>(null);
  const [gaData, setGAData] = useState<GAData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchMeta = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiGet<MetaData>(`/clients/${clientId}/integrations/meta-ads`);
      setMetaData(data);
    } catch (err: any) {
      setError(err?.message || 'Meta Ads nao configurado ou erro na API.');
    } finally {
      setLoading(false);
    }
  };

  const fetchGA = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiGet<GAData>(`/clients/${clientId}/integrations/google-analytics`);
      setGAData(data);
    } catch (err: any) {
      setError(err?.message || 'Google Analytics nao configurado ou erro na API.');
    } finally {
      setLoading(false);
    }
  };

  const totalSpend = metaData?.campaigns.reduce((sum, c) => sum + parseFloat(c.insights?.spend || '0'), 0) || 0;
  const totalImpressions = metaData?.campaigns.reduce((sum, c) => sum + parseInt(c.insights?.impressions || '0', 10), 0) || 0;
  const totalClicks = metaData?.campaigns.reduce((sum, c) => sum + parseInt(c.insights?.clicks || '0', 10), 0) || 0;

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>Metricas de Performance</Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab icon={<IconBrandMeta size={18} />} iconPosition="start" label="Meta Ads" />
        <Tab icon={<IconBrandGoogle size={18} />} iconPosition="start" label="Google Analytics" />
      </Tabs>

      {error && <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {tab === 0 && (
        <Box>
          <Button
            variant="outlined"
            startIcon={loading ? <CircularProgress size={16} /> : <IconRefresh size={18} />}
            onClick={fetchMeta}
            disabled={loading}
            sx={{ mb: 2 }}
          >
            {metaData ? 'Atualizar' : 'Carregar'} Meta Ads
          </Button>

          {metaData && (
            <>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                Ultima atualizacao: {new Date(metaData.fetched_at).toLocaleString('pt-BR')}
              </Typography>

              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 6, md: 3 }}>
                  <StatCard label="Investimento" value={`R$ ${totalSpend.toFixed(2)}`} />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <StatCard label="Impressoes" value={totalImpressions.toLocaleString('pt-BR')} />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <StatCard label="Cliques" value={totalClicks.toLocaleString('pt-BR')} />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <StatCard
                    label="CTR"
                    value={totalImpressions > 0 ? `${((totalClicks / totalImpressions) * 100).toFixed(2)}%` : '-'}
                  />
                </Grid>
              </Grid>

              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>Campanhas</Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Nome</strong></TableCell>
                        <TableCell><strong>Status</strong></TableCell>
                        <TableCell><strong>Objetivo</strong></TableCell>
                        <TableCell align="right"><strong>Gasto</strong></TableCell>
                        <TableCell align="right"><strong>Impressoes</strong></TableCell>
                        <TableCell align="right"><strong>Cliques</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {metaData.campaigns.map((c) => (
                        <TableRow key={c.id} hover>
                          <TableCell>{c.name}</TableCell>
                          <TableCell>
                            <Chip
                              label={c.status}
                              size="small"
                              color={c.status === 'ACTIVE' ? 'success' : 'default'}
                            />
                          </TableCell>
                          <TableCell>{c.objective}</TableCell>
                          <TableCell align="right">R$ {parseFloat(c.insights?.spend || '0').toFixed(2)}</TableCell>
                          <TableCell align="right">{parseInt(c.insights?.impressions || '0', 10).toLocaleString('pt-BR')}</TableCell>
                          <TableCell align="right">{parseInt(c.insights?.clicks || '0', 10).toLocaleString('pt-BR')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </Box>
      )}

      {tab === 1 && (
        <Box>
          <Button
            variant="outlined"
            startIcon={loading ? <CircularProgress size={16} /> : <IconRefresh size={18} />}
            onClick={fetchGA}
            disabled={loading}
            sx={{ mb: 2 }}
          >
            {gaData ? 'Atualizar' : 'Carregar'} Google Analytics
          </Button>

          {gaData && (
            <>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                Ultima atualizacao: {new Date(gaData.fetched_at).toLocaleString('pt-BR')}
              </Typography>

              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 6, md: 3 }}>
                  <StatCard label="Sessoes" value={gaData.sessions.toLocaleString('pt-BR')} />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <StatCard label="Pageviews" value={gaData.pageviews.toLocaleString('pt-BR')} />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <StatCard label="Taxa de Rejeicao" value={`${(gaData.bounceRate * 100).toFixed(1)}%`} color="warning.main" />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <StatCard label="Duracao Media" value={`${Math.round(gaData.avgSessionDuration)}s`} />
                </Grid>
              </Grid>

              {gaData.rows.length > 0 && (
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>Por Dia</Typography>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell><strong>Data</strong></TableCell>
                          <TableCell align="right"><strong>Sessoes</strong></TableCell>
                          <TableCell align="right"><strong>Pageviews</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {gaData.rows.map((r) => (
                          <TableRow key={r.dimension} hover>
                            <TableCell>
                              {r.dimension.length === 8
                                ? `${r.dimension.slice(6, 8)}/${r.dimension.slice(4, 6)}/${r.dimension.slice(0, 4)}`
                                : r.dimension}
                            </TableCell>
                            <TableCell align="right">{r.sessions.toLocaleString('pt-BR')}</TableCell>
                            <TableCell align="right">{r.pageviews.toLocaleString('pt-BR')}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </Box>
      )}
    </Box>
  );
}
