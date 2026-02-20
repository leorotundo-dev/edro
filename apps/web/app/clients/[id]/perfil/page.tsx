'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
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
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import {
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandLinkedin,
  IconBrandTiktok,
  IconBrandX,
  IconBrandYoutube,
  IconBulb,
  IconExternalLink,
  IconHash,
  IconPlugConnected,
  IconTarget,
  IconUserSquare,
} from '@tabler/icons-react';
import BrandVoiceSection from '../analytics/sections/BrandVoiceSection';
import ContentGapSection from '../analytics/sections/ContentGapSection';
import BrandColorsCard from './BrandColorsCard';
import IntelligenceScoreBar from './IntelligenceScoreBar';
import ManualFieldsChecklist from './ManualFieldsChecklist';
import SectionEnrichmentCard from './SectionEnrichmentCard';

type SocialProfiles = {
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  tiktok?: string;
  youtube?: string;
  x?: string;
  other?: string;
};

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
  social_profiles?: SocialProfiles;
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
    brand_directives?: string[];
    forbidden_content?: string[];
    good_copy_examples?: string[];
    bad_copy_examples?: string[];
    logo_url?: string;
    brand_colors?: string[];
    [key: string]: any;
  } | null;
};

type ConnectorRow = {
  provider: string;
  payload?: Record<string, unknown> | null;
  secrets_meta?: Record<string, unknown> | null;
  updated_at?: string | null;
};

type SuggestionsPayload = {
  profile_suggestions?: Record<string, any>;
  sections_refreshed_at?: Record<string, string>;
  enrichment_status?: string;
  intelligence_score?: number;
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
  if (!value) return '#';
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  if (value.startsWith('@')) return `https://instagram.com/${value.replace('@', '')}`;
  return `https://${value}`;
}

function formatDate(value?: string | null) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleDateString('pt-BR');
}

export default function PerfilPage() {
  const params = useParams();
  const clientId = params.id as string;
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<ClientData | null>(null);
  const [connectors, setConnectors] = useState<ConnectorRow[]>([]);
  const [suggestionsPayload, setSuggestionsPayload] = useState<SuggestionsPayload>({
    profile_suggestions: {},
    sections_refreshed_at: {},
    enrichment_status: 'pending',
    intelligence_score: 0,
  });

  const loadSuggestions = async () => {
    try {
      const res = await apiGet<SuggestionsPayload>(`/clients/${clientId}/suggestions`);
      setSuggestionsPayload({
        profile_suggestions: res?.profile_suggestions || {},
        sections_refreshed_at: res?.sections_refreshed_at || {},
        enrichment_status: res?.enrichment_status || 'pending',
        intelligence_score: Number(res?.intelligence_score || 0),
      });
    } catch {
      setSuggestionsPayload((prev) => ({
        ...prev,
        enrichment_status: prev.enrichment_status || 'pending',
      }));
    }
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      apiGet(`/clients/${clientId}`).catch(() => null),
      apiGet<ConnectorRow[]>(`/clients/${clientId}/connectors`).catch(() => [] as ConnectorRow[]),
      apiGet<SuggestionsPayload>(`/clients/${clientId}/suggestions`).catch(() => ({} as SuggestionsPayload)),
    ]).then(([clientRes, connectorsRes, suggestionsRes]) => {
      if (cancelled) return;
      const payload =
        (clientRes as { client?: ClientData })?.client ??
        (clientRes as { data?: { client?: ClientData } })?.data?.client ??
        (clientRes as { data?: ClientData })?.data ??
        (clientRes as ClientData) ??
        null;
      setClient(payload);
      setConnectors(Array.isArray(connectorsRes) ? connectorsRes : []);
      setSuggestionsPayload({
        profile_suggestions: suggestionsRes?.profile_suggestions || {},
        sections_refreshed_at: suggestionsRes?.sections_refreshed_at || {},
        enrichment_status: suggestionsRes?.enrichment_status || 'pending',
        intelligence_score: Number(suggestionsRes?.intelligence_score || 0),
      });
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [clientId]);

  const kb = client?.profile?.knowledge_base || {};
  const socials = kb.social_profiles || {};
  const hasSocials = Object.entries(socials).some(([k, v]) => k !== 'other' && v);
  const location = [client?.city, client?.uf, client?.country].filter(Boolean).join(', ');

  const reporteiConnector = connectors.find((c) => c.provider === 'reportei') || null;
  const reporteiPayload = (reporteiConnector?.payload as Record<string, unknown>) || {};
  const reporteiConfigured = Boolean(reporteiPayload?.embed_url || reporteiPayload?.dashboard_url);

  const metaConnector = connectors.find((c) => c.provider === 'meta') || null;
  const metaPayload = (metaConnector?.payload as Record<string, unknown>) || {};
  const metaHasIds = Boolean(metaPayload?.page_id || metaPayload?.instagram_business_id);
  const metaHasSecrets = Boolean(metaConnector?.secrets_meta && Object.keys(metaConnector.secrets_meta).length > 0);
  const metaConfigured = metaHasIds && metaHasSecrets;

  const sourcesConnector = connectors.find((c) => c.provider === 'social_listening_sources') || null;
  const platforms = useMemo(() => {
    const value = (sourcesConnector?.payload as { platforms?: unknown })?.platforms;
    return Array.isArray(value) ? value.filter((p): p is string => typeof p === 'string') : [];
  }, [sourcesConnector]);

  const profileSuggestions = suggestionsPayload.profile_suggestions || {};
  const sectionRefreshedAt = suggestionsPayload.sections_refreshed_at || {};
  const suggestionSections = Object.values(profileSuggestions).filter(Boolean) as Array<{
    fields?: Record<string, any>;
  }>;
  const pendingCount = suggestionSections.reduce(
    (acc, section) => acc + Object.keys(section?.fields || {}).length,
    0
  );

  const profile = client?.profile || {};
  const missingManual = [
    !profile?.brand_directives?.length ? 'brand_directives' : null,
    !profile?.forbidden_content?.length ? 'forbidden_content' : null,
    !profile?.good_copy_examples?.length ? 'good_copy_examples' : null,
    !profile?.bad_copy_examples?.length ? 'bad_copy_examples' : null,
    !profile?.logo_url ? 'logo_url' : null,
    !profile?.brand_colors?.length ? 'brand_colors' : null,
  ].filter((value): value is string => Boolean(value));

  if (loading && !client) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 260 }}>
        <CircularProgress size={26} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Carregando perfil...</Typography>
      </Stack>
    );
  }

  return (
    <Box>
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider', '& .MuiTab-root': { minHeight: 44 } }}
      >
        <Tab label="Identidade" />
        <Tab label="DNA de Marca" />
        <Tab label="Conteúdo" />
        <Tab label="Conectores" />
      </Tabs>

      {tab === 0 && (
        <Stack spacing={3}>
          <IntelligenceScoreBar
            score={Number(suggestionsPayload.intelligence_score || 0)}
            pendingCount={pendingCount}
            missingManual={missingManual}
            clientId={clientId}
            enrichmentStatus={suggestionsPayload.enrichment_status || 'pending'}
            lastRefreshed={
              sectionRefreshedAt.identity ||
              sectionRefreshedAt.voice ||
              sectionRefreshedAt.strategy ||
              null
            }
            onRefreshRequested={loadSuggestions}
          />

          <ManualFieldsChecklist fields={missingManual} />

          <BrandColorsCard
            clientId={clientId}
            website={kb.website}
            initialColors={profile?.brand_colors || []}
            onSaved={(colors) => {
              setClient((prev) =>
                prev ? { ...prev, profile: { ...(prev.profile || {}), brand_colors: colors } } : prev
              );
            }}
          />

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <SectionEnrichmentCard
                clientId={clientId}
                sectionKey="identity"
                title="Sugestoes de Identidade"
                description="Descricao, audiencia, promessa e diferenciais."
                suggestion={profileSuggestions.identity}
                refreshedAt={sectionRefreshedAt.identity}
                onChanged={loadSuggestions}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <SectionEnrichmentCard
                clientId={clientId}
                sectionKey="voice"
                title="Sugestoes de Tom de Voz"
                description="Tonalidade, formalidade e estilo de linguagem."
                suggestion={profileSuggestions.voice}
                refreshedAt={sectionRefreshedAt.voice}
                onChanged={loadSuggestions}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <SectionEnrichmentCard
                clientId={clientId}
                sectionKey="strategy"
                title="Sugestoes de Estrategia"
                description="Pilares, keywords e mix de conteudo."
                suggestion={profileSuggestions.strategy}
                refreshedAt={sectionRefreshedAt.strategy}
                onChanged={loadSuggestions}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <SectionEnrichmentCard
                clientId={clientId}
                sectionKey="competitors"
                title="Sugestoes de Concorrentes"
                description="Concorrentes para monitoramento e comparacao."
                suggestion={profileSuggestions.competitors}
                refreshedAt={sectionRefreshedAt.competitors}
                onChanged={loadSuggestions}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <SectionEnrichmentCard
                clientId={clientId}
                sectionKey="calendar"
                title="Sugestoes de Calendario"
                description="Datas estrategicas com maior potencial para o cliente."
                suggestion={profileSuggestions.calendar}
                refreshedAt={sectionRefreshedAt.calendar}
                onChanged={loadSuggestions}
              />
            </Grid>
          </Grid>

          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                <Avatar sx={{ bgcolor: '#fff1e6', color: '#ff6600', width: 36, height: 36 }}>
                  <IconUserSquare size={20} />
                </Avatar>
                <Typography variant="h6" fontWeight={700}>Identidade do Cliente</Typography>
              </Stack>
              {kb.description && (
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, mb: 2 }}>
                  {kb.description}
                </Typography>
              )}
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Typography variant="caption" color="text.secondary">Segmento</Typography>
                  <Typography variant="subtitle2">{client?.segment_primary || '--'}</Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Typography variant="caption" color="text.secondary">Tom de voz</Typography>
                  <Typography variant="subtitle2" sx={{ textTransform: 'capitalize' }}>{client?.tone_profile || '--'}</Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Typography variant="caption" color="text.secondary">Localização</Typography>
                  <Typography variant="subtitle2">{location || '--'}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="overline" color="text.secondary" sx={{ mb: 1, display: 'block' }}>Presença digital</Typography>
                  {kb.website && (
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
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
                      <IconExternalLink size={14} color="#94a3b8" />
                    </Stack>
                  )}
                  {hasSocials ? (
                    <>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {Object.entries(SOCIAL_ICONS).map(([key, cfg]) => {
                          const value = socials[key as keyof SocialProfiles];
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
                                sx={{ bgcolor: `${cfg.color}14`, '&:hover': { bgcolor: `${cfg.color}28` } }}
                              >
                                <Icon size={20} color={cfg.color} />
                              </IconButton>
                            </Tooltip>
                          );
                        })}
                      </Stack>
                      {socials.other && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                          Outras: {socials.other}
                        </Typography>
                      )}
                    </>
                  ) : (
                    <Typography variant="body2" color="text.secondary">Sem redes configuradas.</Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="overline" color="text.secondary" sx={{ mb: 1, display: 'block' }}>Marca & posicionamento</Typography>
                  <Stack spacing={1.2}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Público-alvo</Typography>
                      <Typography variant="body2">{kb.audience || '--'}</Typography>
                    </Box>
                    <Box>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <IconTarget size={14} color="#94a3b8" />
                        <Typography variant="caption" color="text.secondary">Promessa da marca</Typography>
                      </Stack>
                      <Typography variant="body2">{kb.brand_promise || '--'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Diferenciais</Typography>
                      <Typography variant="body2">{kb.differentiators || '--'}</Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Stack>
      )}

      {tab === 1 && (
        <BrandVoiceSection clientId={clientId} />
      )}

      {tab === 2 && (
        <Stack spacing={3}>
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
                <Avatar sx={{ bgcolor: '#f5f3ff', color: '#7c3aed', width: 36, height: 36 }}>
                  <IconBulb size={20} />
                </Avatar>
                <Typography variant="h6" fontWeight={700}>Pilares e palavras-chave</Typography>
              </Stack>
              <Stack spacing={1.5}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Pilares</Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 0.75 }}>
                    {(client?.content_pillars || []).length ? (
                      (client?.content_pillars || []).map((p, i) => (
                        <Chip key={i} size="small" label={p} sx={{ bgcolor: 'primary.lighter', color: 'primary.main' }} />
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary">Sem pilares.</Typography>
                    )}
                  </Stack>
                </Box>
                <Divider />
                <Box>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <IconHash size={14} color="#94a3b8" />
                    <Typography variant="caption" color="text.secondary">Palavras-chave</Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 0.75 }}>
                    {(client?.keywords || []).length ? (
                      (client?.keywords || []).map((k, i) => <Chip key={i} size="small" variant="outlined" label={k} />)
                    ) : (
                      <Typography variant="body2" color="text.secondary">Sem palavras-chave.</Typography>
                    )}
                  </Stack>
                </Box>
              </Stack>
            </CardContent>
          </Card>
          <ContentGapSection clientId={clientId} />
        </Stack>
      )}

      {tab === 3 && (
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
              <Avatar sx={{ bgcolor: '#eef2ff', color: '#4f46e5', width: 36, height: 36 }}>
                <IconPlugConnected size={20} />
              </Avatar>
              <Typography variant="h6" fontWeight={700}>Conectores</Typography>
            </Stack>
            <Stack spacing={1}>
              {[
                { label: 'Reportei', ok: reporteiConfigured, updatedAt: reporteiConnector?.updated_at || null },
                { label: 'Meta', ok: metaConfigured, updatedAt: metaConnector?.updated_at || null },
                { label: `Fontes social (${platforms.length})`, ok: platforms.length > 0, updatedAt: sourcesConnector?.updated_at || null },
              ].map((item) => (
                <Stack key={item.label} direction="row" spacing={1.5} alignItems="center" sx={{ py: 0.75 }}>
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      bgcolor: item.ok ? '#059669' : '#e2e8f0',
                      boxShadow: item.ok ? '0 0 6px rgba(5,150,105,0.35)' : 'none',
                    }}
                  />
                  <Typography variant="body2" sx={{ flex: 1 }}>{item.label}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.updatedAt ? `Atualizado: ${formatDate(item.updatedAt)}` : '--'}
                  </Typography>
                  <Chip
                    size="small"
                    label={item.ok ? 'OK' : 'Configurar'}
                    sx={{
                      bgcolor: item.ok ? '#ecfdf5' : '#f8fafc',
                      color: item.ok ? '#059669' : '#64748b',
                      fontWeight: 700,
                    }}
                  />
                </Stack>
              ))}
            </Stack>
            <Button
              variant="outlined"
              size="small"
              component={Link}
              href={`/clients/${clientId}/connectors`}
              sx={{ mt: 2 }}
            >
              Abrir conectores
            </Button>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
