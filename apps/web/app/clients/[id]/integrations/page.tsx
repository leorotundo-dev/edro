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
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import { IconBrandMeta, IconBrandGoogle, IconRefresh, IconBrain, IconBrandWhatsapp, IconCheck, IconCopy } from '@tabler/icons-react';
import { apiGet, apiPost } from '@/lib/api';
import Chart from '@/components/charts/Chart';
import { baseChartOptions } from '@/utils/chartTheme';
import { useThemeMode } from '@/contexts/ThemeContext';

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
  const { isDark } = useThemeMode();
  const [tab, setTab] = useState(0);
  const [metaData, setMetaData] = useState<MetaData | null>(null);
  const [gaData, setGAData] = useState<GAData | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ synced: number; skipped: number } | null>(null);
  const [error, setError] = useState('');

  // WhatsApp connector state
  const [waMessages, setWaMessages] = useState<{ id: string; raw_text: string | null; type: string; created_at: string; briefing_id: string | null }[]>([]);
  const [waLoading, setWaLoading] = useState(false);
  const [waCopied, setWaCopied] = useState(false);
  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin.replace('3000', '3001').replace('localhost:3000', 'api.edro.studio')}/webhook/whatsapp`
    : '/webhook/whatsapp';

  const fetchWaMessages = async () => {
    setWaLoading(true);
    try {
      const data = await apiGet<{ messages: typeof waMessages }>(`/clients/${clientId}/whatsapp/messages`);
      setWaMessages(data.messages || []);
    } catch { /* connector may not be configured */ }
    finally { setWaLoading(false); }
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl).catch(() => {});
    setWaCopied(true);
    setTimeout(() => setWaCopied(false), 2000);
  };

  const fetchMeta = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiGet<MetaData>(`/clients/${clientId}/integrations/meta-ads`);
      setMetaData(data);
    } catch (err: any) {
      setError(err?.message || 'Meta Ads não configurado ou erro na API.');
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
      setError(err?.message || 'Google Analytics não configurado ou erro na API.');
    } finally {
      setLoading(false);
    }
  };

  const syncMetaPerformance = async () => {
    setSyncing(true);
    setError('');
    setSyncResult(null);
    try {
      const res = await apiPost<{ success: boolean; synced: number; skipped: number }>(
        `/clients/${clientId}/integrations/sync-meta-performance`, {},
      );
      setSyncResult({ synced: res.synced, skipped: res.skipped });
    } catch (err: any) {
      setError(err?.message || 'Falha ao sincronizar métricas.');
    } finally {
      setSyncing(false);
    }
  };

  const totalSpend = metaData?.campaigns.reduce((sum, c) => sum + parseFloat(c.insights?.spend || '0'), 0) || 0;
  const totalImpressions = metaData?.campaigns.reduce((sum, c) => sum + parseInt(c.insights?.impressions || '0', 10), 0) || 0;
  const totalClicks = metaData?.campaigns.reduce((sum, c) => sum + parseInt(c.insights?.clicks || '0', 10), 0) || 0;

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>Métricas de Performance</Typography>

      <Tabs value={tab} onChange={(_, v) => { setTab(v); if (v === 2) fetchWaMessages(); }} sx={{ mb: 3 }}>
        <Tab icon={<IconBrandMeta size={18} />} iconPosition="start" label="Meta Ads" />
        <Tab icon={<IconBrandGoogle size={18} />} iconPosition="start" label="Google Analytics" />
        <Tab icon={<IconBrandWhatsapp size={18} />} iconPosition="start" label="WhatsApp Briefing" />
      </Tabs>

      {error && <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {tab === 0 && (
        <Box>
          <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              startIcon={loading ? <CircularProgress size={16} /> : <IconRefresh size={18} />}
              onClick={fetchMeta}
              disabled={loading || syncing}
            >
              {metaData ? 'Atualizar' : 'Carregar'} Meta Ads
            </Button>
            <Button
              variant="contained"
              startIcon={syncing ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <IconBrain size={18} />}
              onClick={syncMetaPerformance}
              disabled={loading || syncing}
              sx={{ bgcolor: '#5D87FF', '&:hover': { bgcolor: '#4570ea' } }}
            >
              {syncing ? 'Sincronizando…' : 'Sincronizar métricas → IA'}
            </Button>
          </Box>

          {syncResult && (
            <Alert severity={syncResult.synced > 0 ? 'success' : 'info'} sx={{ mb: 2 }} onClose={() => setSyncResult(null)}>
              {syncResult.synced > 0
                ? `${syncResult.synced} post(s) sincronizados. O LearningEngine foi atualizado automaticamente.`
                : 'Nenhum post com instagram_media_id encontrado para sincronizar.'}
            </Alert>
          )}

          {metaData && (
            <>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                Última atualização: {new Date(metaData.fetched_at).toLocaleString('pt-BR')}
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

              {metaData.campaigns.length > 1 && (
                <Card variant="outlined" sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 1 }}>Investimento por Campanha</Typography>
                    <Chart
                      type="bar"
                      height={Math.max(200, metaData.campaigns.length * 40)}
                      series={[
                        { name: 'Gasto (R$)', data: metaData.campaigns.map((c) => parseFloat(c.insights?.spend || '0')) },
                        { name: 'Cliques', data: metaData.campaigns.map((c) => parseInt(c.insights?.clicks || '0', 10)) },
                      ]}
                      options={{
                        ...baseChartOptions(isDark),
                        chart: { ...baseChartOptions(isDark).chart, stacked: false },
                        plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '60%' } },
                        xaxis: { ...baseChartOptions(isDark).xaxis, categories: metaData.campaigns.map((c) => c.name.length > 25 ? c.name.slice(0, 25) + '...' : c.name) },
                        colors: ['#E85219', '#E85219'],
                        dataLabels: { enabled: false },
                        legend: { ...baseChartOptions(isDark).legend, position: 'top' as const },
                        tooltip: { ...baseChartOptions(isDark).tooltip, y: { formatter: (v: number, opts: any) => opts.seriesIndex === 0 ? `R$ ${v.toFixed(2)}` : v.toLocaleString('pt-BR') } },
                      }}
                    />
                  </CardContent>
                </Card>
              )}

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
                Última atualização: {new Date(gaData.fetched_at).toLocaleString('pt-BR')}
              </Typography>

              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 6, md: 3 }}>
                  <StatCard label="Sessões" value={gaData.sessions.toLocaleString('pt-BR')} />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <StatCard label="Pageviews" value={gaData.pageviews.toLocaleString('pt-BR')} />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <StatCard label="Taxa de Rejeicao" value={`${(gaData.bounceRate * 100).toFixed(1)}%`} color="warning.main" />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <StatCard label="Duração Média" value={`${Math.round(gaData.avgSessionDuration)}s`} />
                </Grid>
              </Grid>

              {gaData.rows.length > 0 && (
                <>
                  <Card variant="outlined" sx={{ mb: 3 }}>
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 1 }}>Sessões e Pageviews por Dia</Typography>
                      <Chart
                        type="area"
                        height={300}
                        series={[
                          { name: 'Sessões', data: gaData.rows.map((r) => r.sessions) },
                          { name: 'Pageviews', data: gaData.rows.map((r) => r.pageviews) },
                        ]}
                        options={{
                          ...baseChartOptions(isDark),
                          chart: { ...baseChartOptions(isDark).chart, type: 'area' as const, stacked: false },
                          colors: ['#E85219', '#13DEB9'],
                          xaxis: {
                            ...baseChartOptions(isDark).xaxis,
                            categories: gaData.rows.map((r) =>
                              r.dimension.length === 8
                                ? `${r.dimension.slice(6, 8)}/${r.dimension.slice(4, 6)}`
                                : r.dimension
                            ),
                          },
                          dataLabels: { enabled: false },
                          stroke: { curve: 'smooth' as const, width: 2 },
                          fill: { type: 'gradient', gradient: { opacityFrom: 0.4, opacityTo: 0.05 } },
                          tooltip: { ...baseChartOptions(isDark).tooltip, y: { formatter: (v: number) => v.toLocaleString('pt-BR') } },
                          legend: { ...baseChartOptions(isDark).legend, position: 'top' as const },
                        }}
                      />
                    </CardContent>
                  </Card>

                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 2 }}>Detalhamento Diario</Typography>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell><strong>Data</strong></TableCell>
                            <TableCell align="right"><strong>Sessões</strong></TableCell>
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
                </>
              )}
            </>
          )}
        </Box>
      )}
      {tab === 2 && (
        <Box>
          <Alert severity="info" sx={{ mb: 3 }}>
            <strong>Briefing via WhatsApp</strong> — o cliente envia áudio ou texto no WhatsApp e a Edro cria o briefing automaticamente usando IA (Whisper + Claude).
          </Alert>

          {/* Setup instructions */}
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconBrandWhatsapp size={20} color="#25D366" /> Configuração do Webhook
              </Typography>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    1. No Meta Business Suite → WhatsApp → Configuração → Webhooks, adicione a URL abaixo:
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <TextField
                      size="small" fullWidth value={webhookUrl} InputProps={{ readOnly: true }}
                      sx={{ fontFamily: 'monospace', '& .MuiInputBase-input': { fontSize: '0.8rem' } }}
                    />
                    <Button
                      size="small" variant="outlined" onClick={copyWebhookUrl}
                      startIcon={waCopied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                      sx={{ whiteSpace: 'nowrap', minWidth: 120 }}
                    >
                      {waCopied ? 'Copiado!' : 'Copiar URL'}
                    </Button>
                  </Stack>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    2. Crie um conector via API ou banco de dados com:
                  </Typography>
                  <Box component="pre" sx={{ bgcolor: 'action.hover', p: 1.5, borderRadius: 1, fontSize: '0.75rem', overflow: 'auto' }}>
{`provider: 'whatsapp'
status: 'active'
payload: {
  phone_number_id: "<ID do número no Meta>",
  waba_id: "<WhatsApp Business Account ID>",
  client_phone: "${/* E.164 format */'+55119...'}",
}
secrets_enc: { access_token: "...", verify_token: "edro-wa-secret" }`}
                  </Box>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    3. O número de WhatsApp do cliente deve estar no campo <strong>whatsapp_phone</strong> do perfil do cliente (Perfil → Identidade).
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          {/* Message history */}
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Typography variant="h6">
                  Mensagens Recebidas
                </Typography>
                <Button size="small" variant="outlined" startIcon={waLoading ? <CircularProgress size={14} /> : <IconRefresh size={14} />}
                  onClick={fetchWaMessages} disabled={waLoading}>
                  Atualizar
                </Button>
              </Stack>
              {waMessages.length === 0 ? (
                <Typography color="text.secondary" variant="body2">
                  {waLoading ? 'Carregando…' : 'Nenhuma mensagem recebida ainda. Configure o webhook e aguarde o primeiro áudio ou texto do cliente.'}
                </Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Data</TableCell>
                      <TableCell>Tipo</TableCell>
                      <TableCell>Mensagem / Transcrição</TableCell>
                      <TableCell>Briefing</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {waMessages.map((msg) => (
                      <TableRow key={msg.id} hover>
                        <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
                          {new Date(msg.created_at).toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          <Chip size="small" label={msg.type === 'audio' ? '🎙 Áudio' : '💬 Texto'}
                            color={msg.type === 'audio' ? 'info' : 'default'} />
                        </TableCell>
                        <TableCell sx={{ maxWidth: 300, fontSize: '0.75rem' }}>
                          {msg.raw_text ? (
                            msg.raw_text.length > 120 ? msg.raw_text.slice(0, 120) + '…' : msg.raw_text
                          ) : '—'}
                        </TableCell>
                        <TableCell>
                          {msg.briefing_id ? (
                            <Chip size="small" label="✓ Briefing criado" color="success" variant="outlined" />
                          ) : (
                            <Chip size="small" label="Sem briefing" color="default" variant="outlined" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  );
}
