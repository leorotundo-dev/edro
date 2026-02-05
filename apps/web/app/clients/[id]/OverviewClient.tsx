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
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import {
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandLinkedin,
  IconBrandTiktok,
  IconBrandX,
  IconBrandYoutube,
  IconBriefcase,
  IconCalendar,
  IconChartPie,
  IconDotsVertical,
  IconExternalLink,
  IconHash,
  IconSparkles,
  IconTarget,
  IconUsers,
  IconWorld,
} from '@tabler/icons-react';

type KnowledgeBase = {
  description?: string;
  website?: string;
  audience?: string;
  brand_promise?: string;
  differentiators?: string;
  must_mentions?: string[];
  approved_terms?: string[];
  forbidden_claims?: string[];
  hashtags?: string[];
  notes?: string;
  social_profiles?: {
    instagram?: string;
    facebook?: string;
    linkedin?: string;
    tiktok?: string;
    youtube?: string;
    x?: string;
    other?: string;
  };
};

type ClientData = {
  id: string;
  name: string;
  segment_primary?: string | null;
  segment_secondary?: string[] | null;
  tone_profile?: string | null;
  risk_tolerance?: string | null;
  country?: string | null;
  uf?: string | null;
  city?: string | null;
  keywords?: string[] | null;
  content_pillars?: string[] | null;
  profile?: {
    knowledge_base?: KnowledgeBase;
  } | null;
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

const SOCIAL_ICONS: Record<string, { icon: typeof IconBrandInstagram; color: string; label: string }> = {
  instagram: { icon: IconBrandInstagram, color: '#E4405F', label: 'Instagram' },
  facebook: { icon: IconBrandFacebook, color: '#1877F2', label: 'Facebook' },
  linkedin: { icon: IconBrandLinkedin, color: '#0A66C2', label: 'LinkedIn' },
  tiktok: { icon: IconBrandTiktok, color: '#000000', label: 'TikTok' },
  youtube: { icon: IconBrandYoutube, color: '#FF0000', label: 'YouTube' },
  x: { icon: IconBrandX, color: '#000000', label: 'X (Twitter)' },
};

function ensureUrl(value: string): string {
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  if (value.startsWith('@')) {
    return `https://instagram.com/${value.replace('@', '')}`;
  }
  return `https://${value}`;
}

export default function OverviewClient({ clientId }: OverviewClientProps) {
  const [client, setClient] = useState<ClientData | null>(null);
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
    } catch (err) {
      console.error('Failed to load overview data:', err);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const kb = client?.profile?.knowledge_base || {};
  const socials = kb.social_profiles || {};
  const hasSocials = Object.entries(socials).some(([k, v]) => k !== 'other' && v);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      month: date.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase(),
      day: date.getDate().toString().padStart(2, '0'),
    };
  };

  const getEventStatus = (status: string) => {
    switch (status) {
      case 'ready':
        return { color: 'success', label: 'Pronto' } as const;
      case 'copywriting':
        return { color: 'warning', label: 'Copywriting' } as const;
      default:
        return { color: 'default', label: 'Pendente' } as const;
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

  const location = [client?.city, client?.uf, client?.country].filter(Boolean).join(', ');

  return (
    <Box>
      <Grid container spacing={2} alignItems="flex-start">
        {/* Left column — Client profile */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Stack spacing={2}>
            {/* Summary card */}
            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                  <Typography variant="overline" color="text.secondary">
                    Sobre o cliente
                  </Typography>
                  <Chip size="small" color="primary" label="Ativo" />
                </Stack>

                {kb.description && (
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
                    {kb.description}
                  </Typography>
                )}

                <Divider sx={{ my: 2 }} />

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Segmento
                    </Typography>
                    <Typography variant="subtitle2">
                      {client?.segment_primary || 'Não definido'}
                    </Typography>
                  </Grid>
                  {client?.tone_profile && (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Tom de voz
                      </Typography>
                      <Typography variant="subtitle2" sx={{ textTransform: 'capitalize' }}>
                        {client.tone_profile}
                      </Typography>
                    </Grid>
                  )}
                  {location && (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Localização
                      </Typography>
                      <Typography variant="subtitle2">{location}</Typography>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>

            {/* Website & Social Profiles */}
            {(kb.website || hasSocials) && (
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="overline" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                    Presença digital
                  </Typography>

                  {kb.website && (
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                      <IconWorld size={18} color="#666" />
                      <Typography
                        variant="body2"
                        component="a"
                        href={ensureUrl(kb.website)}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                      >
                        {kb.website}
                      </Typography>
                      <IconExternalLink size={14} color="#999" />
                    </Stack>
                  )}

                  {hasSocials && (
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {Object.entries(SOCIAL_ICONS).map(([key, cfg]) => {
                        const value = socials[key as keyof typeof socials];
                        if (!value) return null;
                        const Icon = cfg.icon;
                        return (
                          <Tooltip key={key} title={`${cfg.label}: ${value}`}>
                            <IconButton
                              size="small"
                              component="a"
                              href={ensureUrl(value)}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{
                                bgcolor: `${cfg.color}14`,
                                '&:hover': { bgcolor: `${cfg.color}28` },
                              }}
                            >
                              <Icon size={20} color={cfg.color} />
                            </IconButton>
                          </Tooltip>
                        );
                      })}
                    </Stack>
                  )}

                  {socials.other && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      Outras: {socials.other}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Audience & Brand */}
            {(kb.audience || kb.brand_promise || kb.differentiators) && (
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="overline" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                    Marca & Posicionamento
                  </Typography>

                  <Stack spacing={2.5}>
                    {kb.audience && (
                      <Box>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                          <IconUsers size={16} color="#666" />
                          <Typography variant="caption" color="text.secondary" fontWeight={600}>
                            Público-alvo
                          </Typography>
                        </Stack>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                          {kb.audience}
                        </Typography>
                      </Box>
                    )}
                    {kb.brand_promise && (
                      <Box>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                          <IconTarget size={16} color="#666" />
                          <Typography variant="caption" color="text.secondary" fontWeight={600}>
                            Promessa da marca
                          </Typography>
                        </Stack>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                          {kb.brand_promise}
                        </Typography>
                      </Box>
                    )}
                    {kb.differentiators && (
                      <Box>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                          <IconSparkles size={16} color="#666" />
                          <Typography variant="caption" color="text.secondary" fontWeight={600}>
                            Diferenciais
                          </Typography>
                        </Stack>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                          {kb.differentiators}
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            )}

            {/* Content pillars & keywords */}
            {((client?.content_pillars && client.content_pillars.length > 0) ||
              (client?.keywords && client.keywords.length > 0) ||
              (kb.hashtags && kb.hashtags.length > 0)) && (
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="overline" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                    Conteúdo
                  </Typography>

                  <Stack spacing={2}>
                    {client?.content_pillars && client.content_pillars.length > 0 && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 1, display: 'block' }}>
                          Pilares de conteúdo
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          {client.content_pillars.map((p, i) => (
                            <Chip key={i} size="small" label={p} sx={{ bgcolor: 'primary.lighter', color: 'primary.main', fontWeight: 500 }} />
                          ))}
                        </Stack>
                      </Box>
                    )}
                    {client?.keywords && client.keywords.length > 0 && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 1, display: 'block' }}>
                          Palavras-chave
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          {client.keywords.map((k, i) => (
                            <Chip key={i} size="small" variant="outlined" label={k} />
                          ))}
                        </Stack>
                      </Box>
                    )}
                    {kb.hashtags && kb.hashtags.length > 0 && (
                      <Box>
                        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 1 }}>
                          <IconHash size={14} color="#666" />
                          <Typography variant="caption" color="text.secondary" fontWeight={600}>
                            Hashtags
                          </Typography>
                        </Stack>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          {kb.hashtags.map((h, i) => (
                            <Chip key={i} size="small" label={h.startsWith('#') ? h : `#${h}`} sx={{ bgcolor: 'grey.100' }} />
                          ))}
                        </Stack>
                      </Box>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            )}

            {/* Guidelines */}
            {((kb.must_mentions && kb.must_mentions.length > 0) ||
              (kb.approved_terms && kb.approved_terms.length > 0) ||
              (kb.forbidden_claims && kb.forbidden_claims.length > 0) ||
              kb.notes) && (
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="overline" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                    Diretrizes
                  </Typography>

                  <Stack spacing={2}>
                    {kb.must_mentions && kb.must_mentions.length > 0 && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 1, display: 'block' }}>
                          Menções obrigatórias
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          {kb.must_mentions.map((m, i) => (
                            <Chip key={i} size="small" label={m} color="success" variant="outlined" />
                          ))}
                        </Stack>
                      </Box>
                    )}
                    {kb.approved_terms && kb.approved_terms.length > 0 && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 1, display: 'block' }}>
                          Termos aprovados
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          {kb.approved_terms.map((t, i) => (
                            <Chip key={i} size="small" label={t} color="info" variant="outlined" />
                          ))}
                        </Stack>
                      </Box>
                    )}
                    {kb.forbidden_claims && kb.forbidden_claims.length > 0 && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 1, display: 'block' }}>
                          Termos proibidos
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          {kb.forbidden_claims.map((f, i) => (
                            <Chip key={i} size="small" label={f} color="error" variant="outlined" />
                          ))}
                        </Stack>
                      </Box>
                    )}
                    {kb.notes && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.5, display: 'block' }}>
                          Observações
                        </Typography>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                          {kb.notes}
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            )}
          </Stack>
        </Grid>

        {/* Right column — Actions & Events */}
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
                    Próximas datas
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
                            <Chip size="small" color={status.color} label={status.label} />
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
