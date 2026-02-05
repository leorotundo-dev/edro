'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { IconBriefcase, IconCalendar, IconChartPie, IconDotsVertical, IconSparkles } from '@tabler/icons-react';

type ClientData = {
  id: string;
  name: string;
  segment_primary?: string | null;
  profile?: {
    knowledge_base?: {
      description?: string;
    };
  } | null;
};

type PlanningStats = {
  total_posts: number;
  approved_posts: number;
  pending_posts: number;
  progress_percent: number;
};

type Campaign = {
  id: string;
  title: string;
  type: string;
  status: 'on_track' | 'review' | 'delayed';
  channels?: string[];
};

type ClientEvent = {
  id: string;
  name: string;
  date_ref: string;
  status: 'ready' | 'copywriting' | 'pending';
};

type OverviewClientProps = {
  clientId: string;
};

export default function OverviewClient({ clientId }: OverviewClientProps) {
  const [client, setClient] = useState<ClientData | null>(null);
  const [stats] = useState<PlanningStats>({ total_posts: 25, approved_posts: 18, pending_posts: 7, progress_percent: 72 });
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [events, setEvents] = useState<ClientEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [clientRes, eventsRes] = await Promise.all([
        apiGet(`/clients/${clientId}`),
        apiGet<{ events: ClientEvent[] }>(`/clients/${clientId}/calendar/upcoming?limit=5`).catch(() => ({ events: [] })),
      ]);
      const payload =
        (clientRes as { client?: ClientData })?.client ??
        (clientRes as { data?: { client?: ClientData } })?.data?.client ??
        (clientRes as { data?: ClientData })?.data ??
        (clientRes as ClientData);
      setClient(payload || null);
      setEvents(eventsRes.events || []);

      setCampaigns([
        { id: '1', title: 'Summer Launch 2024', type: 'Digital, Social, OOH', status: 'on_track' },
        { id: '2', title: 'Holiday Promo', type: 'Influencer Campaign', status: 'review' },
      ]);
    } catch (err) {
      console.error('Failed to load overview data:', err);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const clientName = client?.name || 'Cliente';
  const clientSummary =
    client?.profile?.knowledge_base?.description ||
    `${clientName} é um cliente estratégico com foco em conteúdo e presença digital.`;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      month: date.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase(),
      day: date.getDate().toString().padStart(2, '0'),
    };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'on_track':
        return <Chip size="small" color="success" label="No prazo" />;
      case 'review':
        return <Chip size="small" color="warning" label="Em revisão" />;
      case 'delayed':
        return <Chip size="small" color="default" label="Atrasado" />;
      default:
        return null;
    }
  };

  const getEventStatus = (status: string) => {
    switch (status) {
      case 'ready':
        return { color: 'success', label: 'Ready to post' } as const;
      case 'copywriting':
        return { color: 'warning', label: 'Copywriting' } as const;
      default:
        return { color: 'default', label: 'Pending' } as const;
    }
  };

  if (loading) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 300 }}>
        <CircularProgress size={28} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Carregando...
        </Typography>
      </Stack>
    );
  }

  return (
    <Box>
      <Grid container spacing={2} alignItems="flex-start">
        <Grid size={{ xs: 12, lg: 8 }}>
          <Stack spacing={2}>
            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                  <Typography variant="overline" color="text.secondary">
                    Resumo do cliente
                  </Typography>
                  <Chip size="small" color="primary" label="Cliente ativo" />
                </Stack>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                  {clientSummary}
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Segmento
                    </Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {client?.segment_primary || 'Não definido'}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Key Account Managers
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                      <Avatar sx={{ width: 28, height: 28, bgcolor: 'grey.200', fontSize: 12 }}>A</Avatar>
                      <Avatar sx={{ width: 28, height: 28, bgcolor: 'grey.200', fontSize: 12 }}>B</Avatar>
                    </Stack>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-end" spacing={2} sx={{ mb: 2 }}>
                  <Box>
                    <Typography variant="overline" color="text.secondary">
                      Status de planejamento
                    </Typography>
                    <Typography variant="h6">Ciclo atual</Typography>
                  </Box>
                  <Box textAlign="right">
                    <Typography variant="h4" color="primary">
                      {stats.progress_percent}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Pronto para publicar
                    </Typography>
                  </Box>
                </Stack>
                <LinearProgress variant="determinate" value={stats.progress_percent} sx={{ height: 8, borderRadius: 999 }} />
                <Grid container spacing={2} sx={{ mt: 2 }}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Card variant="outlined" sx={{ bgcolor: 'grey.50' }}>
                      <CardContent>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                          <Avatar sx={{ bgcolor: 'success.light', width: 28, height: 28 }}>
                            <IconBriefcase size={16} />
                          </Avatar>
                          <Typography variant="caption" color="text.secondary">
                            Aprovados
                          </Typography>
                        </Stack>
                        <Typography variant="h6">
                          {stats.approved_posts}{' '}
                          <Typography component="span" variant="body2" color="text.secondary">
                            / {stats.total_posts} posts
                          </Typography>
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Card variant="outlined" sx={{ bgcolor: 'grey.50' }}>
                      <CardContent>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                          <Avatar sx={{ bgcolor: 'warning.light', width: 28, height: 28 }}>
                            <IconCalendar size={16} />
                          </Avatar>
                          <Typography variant="caption" color="text.secondary">
                            Pendentes
                          </Typography>
                        </Stack>
                        <Typography variant="h6">
                          {stats.pending_posts}{' '}
                          <Typography component="span" variant="body2" color="text.secondary">
                            / {stats.total_posts} posts
                          </Typography>
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="overline" color="text.secondary">
                    Campanhas ativas
                  </Typography>
                  <Button size="small" component={Link} href={`/clients/${clientId}/campaigns`}>
                    Ver tudo
                  </Button>
                </Stack>
                <Stack spacing={1} divider={<Divider flexItem />}>
                  {campaigns.length > 0 ? (
                    campaigns.map((campaign) => (
                      <Stack key={campaign.id} direction="row" alignItems="center" justifyContent="space-between" spacing={2} sx={{ py: 1 }}>
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Avatar variant="rounded" sx={{ bgcolor: 'grey.100' }}>
                            <IconBriefcase size={18} />
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle2">{campaign.title}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {campaign.type}
                            </Typography>
                          </Box>
                        </Stack>
                        {getStatusBadge(campaign.status)}
                      </Stack>
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
                      Crie a primeira campanha para ver métricas.
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Stack spacing={2}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  Ações rápidas
                </Typography>
                <Stack spacing={1.5} sx={{ mt: 2 }}>
                  <Button variant="contained" startIcon={<IconSparkles size={16} />} component={Link} href={`/studio?clientId=${clientId}`}>
                    Criar post
                  </Button>
                  <Button variant="outlined" startIcon={<IconCalendar size={16} />} component={Link} href={`/clients/${clientId}/calendar`}>
                    Ver calendário
                  </Button>
                </Stack>
                <Divider sx={{ my: 2 }} />
                <Grid container spacing={1}>
                  <Grid size={{ xs: 6 }}>
                    <Button fullWidth variant="text" startIcon={<IconBriefcase size={16} />} component={Link} href={`/clients/${clientId}/library`}>
                      Biblioteca
                    </Button>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Button fullWidth variant="text" startIcon={<IconChartPie size={16} />} component={Link} href={`/clients/${clientId}/insights`}>
                      Insights
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                  <Typography variant="overline" color="text.secondary">
                    Datas do cliente
                  </Typography>
                  <IconDotsVertical size={16} />
                </Stack>
                <Stack spacing={2}>
                  {events.length > 0 ? (
                    events.slice(0, 4).map((event, idx) => {
                      const { month, day } = formatDate(event.date_ref);
                      const status = getEventStatus(event.status || 'pending');
                      return (
                        <Stack key={event.id} direction="row" spacing={2} alignItems="center">
                          <Box textAlign="center" sx={{ minWidth: 46 }}>
                            <Typography variant="caption" color="text.secondary" display="block">
                              {month}
                            </Typography>
                            <Typography variant="h6" color={idx === 0 ? 'primary' : 'text.primary'}>
                              {day}
                            </Typography>
                          </Box>
                          <Box flex={1}>
                            <Typography variant="subtitle2">{event.name}</Typography>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Chip size="small" color={status.color} label={status.label} />
                            </Stack>
                          </Box>
                        </Stack>
                      );
                    })
                  ) : (
                    <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                      Sem eventos previstos
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
