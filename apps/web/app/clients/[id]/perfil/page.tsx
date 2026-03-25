'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ClientLibraryClient from '../library/ClientLibraryClient';
import {
  IconBooks,
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandLinkedin,
  IconBrandTiktok,
  IconBrandX,
  IconBrandYoutube,
  IconBulb,
  IconCheck,
  IconEdit,
  IconExternalLink,
  IconHash,
  IconPlugConnected,
  IconTarget,
  IconUsers,
  IconUserSquare,
  IconWorld,
  IconX,
} from '@tabler/icons-react';
import BrandVoiceSection from '../analytics/sections/BrandVoiceSection';
import ContentGapSection from '../analytics/sections/ContentGapSection';
import BrandColorsCard from './BrandColorsCard';
import BrandTokensCard from './BrandTokensCard';
import PersonaManager from './PersonaManager';
import IntelligenceScoreBar from './IntelligenceScoreBar';
import ManualFieldsChecklist from './ManualFieldsChecklist';
import ContactsManager from './ContactsManager';
import SectionEnrichmentCard from './SectionEnrichmentCard';
import VisualStyleCard from './VisualStyleCard';
import { isReporteiConfigured } from '@/lib/reportei';

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
  whatsapp_phone?: string | null;
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
  last_sync_ok?: boolean | null;
  last_sync_at?: string | null;
  last_error?: string | null;
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

  const [editingIdentity, setEditingIdentity] = useState(false);
  const [identityForm, setIdentityForm] = useState({ segment_primary: '', segment_secondary: '', city: '', uf: '', country: '', whatsapp_phone: '' });
  const [savingIdentity, setSavingIdentity] = useState(false);

  const [editingContent, setEditingContent] = useState(false);
  const [contentForm, setContentForm] = useState({ pillars: '', keywords: '' });
  const [savingContent, setSavingContent] = useState(false);

  const openContentEdit = () => {
    setContentForm({
      pillars: (client?.content_pillars || []).join(', '),
      keywords: (client?.keywords || []).join(', '),
    });
    setEditingContent(true);
  };

  const saveContent = async () => {
    setSavingContent(true);
    try {
      await apiPatch(`/clients/${clientId}`, {
        content_pillars: contentForm.pillars ? contentForm.pillars.split(/[,;]/).map((s) => s.trim()).filter(Boolean) : [],
        keywords: contentForm.keywords ? contentForm.keywords.split(/[,;]/).map((s) => s.trim()).filter(Boolean) : [],
      });
      setEditingContent(false);
      await loadClient();
    } finally {
      setSavingContent(false);
    }
  };
  const [webIntelLoading, setWebIntelLoading] = useState(false);
  const [webIntelQueued, setWebIntelQueued] = useState(false);

  const handleWebEnrich = async () => {
    setWebIntelLoading(true);
    setWebIntelQueued(false);
    try {
      await apiPost(`/clients/${clientId}/web-enrich`, {});
      setWebIntelQueued(true);
    } catch {} finally {
      setWebIntelLoading(false);
    }
  };

  const loadClient = async () => {
    try {
      const clientRes = await apiGet(`/clients/${clientId}`);
      const payload =
        (clientRes as { client?: ClientData })?.client ??
        (clientRes as { data?: { client?: ClientData } })?.data?.client ??
        (clientRes as { data?: ClientData })?.data ??
        (clientRes as ClientData) ??
        null;
      if (payload) setClient(payload);
    } catch {}
  };

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

  const onProfileChanged = async () => {
    await Promise.all([loadClient(), loadSuggestions()]);
  };

  const openIdentityEdit = () => {
    setIdentityForm({
      segment_primary: client?.segment_primary || '',
      segment_secondary: (client?.segment_secondary || []).join(', '),
      city: client?.city || '',
      uf: client?.uf || '',
      country: client?.country || '',
      whatsapp_phone: client?.whatsapp_phone || '',
    });
    setEditingIdentity(true);
  };

  const saveIdentity = async () => {
    setSavingIdentity(true);
    try {
      await apiPatch(`/clients/${clientId}`, {
        segment_primary: identityForm.segment_primary.trim() || null,
        segment_secondary: identityForm.segment_secondary
          ? identityForm.segment_secondary.split(/[,;]/).map((s) => s.trim()).filter(Boolean)
          : [],
        city: identityForm.city.trim() || null,
        uf: identityForm.uf.trim() || null,
        country: identityForm.country.trim() || null,
        whatsapp_phone: identityForm.whatsapp_phone.trim() || null,
      });
      setEditingIdentity(false);
      await loadClient();
    } finally {
      setSavingIdentity(false);
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

  // Helper: convert profile values to strings for pre-filling manual forms
  const toStr = (val: any): string => {
    if (val == null) return '';
    if (typeof val === 'string') return val;
    if (Array.isArray(val)) return val.map((v) => (v && typeof v === 'object' ? (v.name ?? JSON.stringify(v)) : String(v ?? ''))).join(', ');
    if (typeof val === 'object') return JSON.stringify(val, null, 2);
    return String(val);
  };

  const p = client?.profile || {};
  const sectionExistingValues: Record<string, Record<string, string>> = {
    identity: {
      description: toStr(kb.description),
      audience: toStr(kb.audience),
      brand_promise: toStr(kb.brand_promise),
      differentiators: toStr(kb.differentiators),
      website: toStr(kb.website),
    },
    voice: {
      tone_description: toStr(p.tone_description),
      personality_traits: toStr(p.personality_traits),
      formality_level: p.formality_level != null ? String(p.formality_level) : '',
      emoji_usage: toStr(p.emoji_usage),
    },
    strategy: {
      pillars: toStr(p.pillars),
      keywords: toStr(p.keywords),
      negative_keywords: toStr(p.negative_keywords),
      content_mix: toStr(p.content_mix),
    },
    competitors: {
      competitors: toStr(p.competitors),
    },
    calendar: {
      strategic_dates: toStr(p.strategic_dates),
    },
  };

  const reporteiConnector = connectors.find((c) => c.provider === 'reportei') || null;
  const reporteiPayload = (reporteiConnector?.payload as Record<string, unknown>) || {};
  const reporteiConfigured = isReporteiConfigured(reporteiPayload);

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
        <Tab icon={<IconUsers size={16} />} iconPosition="start" label="Contatos" sx={{ fontSize: '0.85rem' }} />
        <Tab icon={<IconBooks size={16} />} iconPosition="start" label="Library" sx={{ fontSize: '0.85rem' }} />
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
            onRefreshRequested={onProfileChanged}
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

          <BrandTokensCard
            clientId={clientId}
            initialTokens={profile?.brand_tokens || null}
            initialWebsite={kb.website || ''}
            initialSocialProfiles={kb.social_profiles || {}}
            onSaved={(tokens) => {
              setClient((prev) =>
                prev ? { ...prev, profile: { ...(prev.profile || {}), brand_tokens: tokens } } : prev
              );
            }}
          />

          <PersonaManager clientId={clientId} />

          {/* Web Market Intelligence Card */}
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1.5}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: 'rgba(232,82,25,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IconWorld size={18} color="#E85219" />
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600}>Inteligência de Mercado via Web</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Pesquisa automática de tendências, concorrentes e referências do setor
                    </Typography>
                  </Box>
                </Stack>
                <Stack direction="row" alignItems="center" spacing={1}>
                  {sectionRefreshedAt.web_intelligence && !webIntelQueued && (
                    <Chip
                      size="small"
                      label={`Última: ${formatDate(sectionRefreshedAt.web_intelligence)}`}
                      sx={{ fontSize: 11, bgcolor: 'rgba(19,222,185,0.08)', color: '#13DEB9', border: '1px solid rgba(19,222,185,0.2)' }}
                    />
                  )}
                  {webIntelQueued && (
                    <Chip
                      size="small"
                      icon={<IconCheck size={13} />}
                      label="Pesquisa agendada!"
                      sx={{ fontSize: 11, bgcolor: 'rgba(19,222,185,0.1)', color: '#13DEB9', border: '1px solid rgba(19,222,185,0.3)' }}
                    />
                  )}
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleWebEnrich}
                    disabled={webIntelLoading || webIntelQueued}
                    startIcon={webIntelLoading ? <CircularProgress size={13} /> : <IconWorld size={14} />}
                    sx={{ borderRadius: 1.5, fontSize: 12, textTransform: 'none', borderColor: 'rgba(232,82,25,0.4)', color: '#E85219', '&:hover': { borderColor: '#E85219', bgcolor: 'rgba(232,82,25,0.05)' } }}
                  >
                    {webIntelLoading ? 'Agendando...' : 'Atualizar pesquisa'}
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <SectionEnrichmentCard
                clientId={clientId}
                sectionKey="identity"
                title="Sugestões de Identidade"
                description="Descrição, audiência, promessa e diferenciais."
                suggestion={profileSuggestions.identity}
                refreshedAt={sectionRefreshedAt.identity}
                existingValues={sectionExistingValues.identity}
                onChanged={onProfileChanged}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <SectionEnrichmentCard
                clientId={clientId}
                sectionKey="voice"
                title="Sugestões de Tom de Voz"
                description="Tonalidade, formalidade e estilo de linguagem."
                suggestion={profileSuggestions.voice}
                refreshedAt={sectionRefreshedAt.voice}
                existingValues={sectionExistingValues.voice}
                onChanged={onProfileChanged}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <SectionEnrichmentCard
                clientId={clientId}
                sectionKey="strategy"
                title="Sugestões de Estratégia"
                description="Pilares, keywords e mix de conteúdo."
                suggestion={profileSuggestions.strategy}
                refreshedAt={sectionRefreshedAt.strategy}
                existingValues={sectionExistingValues.strategy}
                onChanged={onProfileChanged}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <SectionEnrichmentCard
                clientId={clientId}
                sectionKey="competitors"
                title="Sugestões de Concorrentes"
                description="Concorrentes para monitoramento e comparação."
                suggestion={profileSuggestions.competitors}
                refreshedAt={sectionRefreshedAt.competitors}
                existingValues={sectionExistingValues.competitors}
                onChanged={onProfileChanged}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <SectionEnrichmentCard
                clientId={clientId}
                sectionKey="calendar"
                title="Sugestões de Calendário"
                description="Datas estratégicas com maior potencial para o cliente."
                suggestion={profileSuggestions.calendar}
                refreshedAt={sectionRefreshedAt.calendar}
                existingValues={sectionExistingValues.calendar}
                onChanged={onProfileChanged}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <VisualStyleCard clientId={clientId} />
            </Grid>
          </Grid>

          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Avatar sx={{ bgcolor: '#fdeee8', color: '#E85219', width: 36, height: 36 }}>
                    <IconUserSquare size={20} />
                  </Avatar>
                  <Typography variant="h6" fontWeight={700}>Identidade do Cliente</Typography>
                </Stack>
                {!editingIdentity ? (
                  <Tooltip title="Editar segmento e localização">
                    <IconButton size="small" onClick={openIdentityEdit}>
                      <IconEdit size={16} />
                    </IconButton>
                  </Tooltip>
                ) : (
                  <Stack direction="row" spacing={0.5}>
                    <IconButton size="small" color="success" onClick={saveIdentity} disabled={savingIdentity}>
                      {savingIdentity ? <CircularProgress size={14} /> : <IconCheck size={16} />}
                    </IconButton>
                    <IconButton size="small" onClick={() => setEditingIdentity(false)} disabled={savingIdentity}>
                      <IconX size={16} />
                    </IconButton>
                  </Stack>
                )}
              </Stack>

              {kb.description && (
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, mb: 2 }}>
                  {kb.description}
                </Typography>
              )}

              <Collapse in={editingIdentity} unmountOnExit>
                <Grid container spacing={1.5} sx={{ mb: 2 }}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField fullWidth size="small" label="Segmento primário"
                      value={identityForm.segment_primary}
                      onChange={(e) => setIdentityForm((f) => ({ ...f, segment_primary: e.target.value }))} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField fullWidth size="small" label="Segmentos secundários" placeholder="Ex: mobilidade, saúde"
                      value={identityForm.segment_secondary}
                      onChange={(e) => setIdentityForm((f) => ({ ...f, segment_secondary: e.target.value }))}
                      helperText="Separe por vírgula" />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField fullWidth size="small" label="Cidade"
                      value={identityForm.city}
                      onChange={(e) => setIdentityForm((f) => ({ ...f, city: e.target.value }))} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField fullWidth size="small" label="Estado (UF)"
                      value={identityForm.uf}
                      onChange={(e) => setIdentityForm((f) => ({ ...f, uf: e.target.value }))} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField fullWidth size="small" label="País"
                      value={identityForm.country}
                      onChange={(e) => setIdentityForm((f) => ({ ...f, country: e.target.value }))} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField fullWidth size="small" label="WhatsApp (com DDI)"
                      placeholder="+5511999999999"
                      value={identityForm.whatsapp_phone}
                      onChange={(e) => setIdentityForm((f) => ({ ...f, whatsapp_phone: e.target.value }))}
                      helperText="Notificações automáticas de aprovação e relatórios" />
                  </Grid>
                </Grid>
                <Divider sx={{ mb: 2 }} />
              </Collapse>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Typography variant="caption" color="text.secondary">Segmento</Typography>
                  <Typography variant="subtitle2">{client?.segment_primary || '--'}</Typography>
                  {(client?.segment_secondary || []).length > 0 && (
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                      {(client?.segment_secondary || []).map((s) => (
                        <Chip key={s} size="small" label={s} variant="outlined" sx={{ fontSize: '0.7rem' }} />
                      ))}
                    </Stack>
                  )}
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Typography variant="caption" color="text.secondary">Tom de voz</Typography>
                  <Typography
                    variant="subtitle2"
                    sx={{ textTransform: p.tone_description ? 'none' : 'capitalize',
                          overflow: 'hidden', display: '-webkit-box',
                          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
                    title={p.tone_description || client?.tone_profile || undefined}
                  >
                    {p.tone_description || client?.tone_profile || '--'}
                  </Typography>
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
              <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Avatar sx={{ bgcolor: '#f5f3ff', color: '#7c3aed', width: 36, height: 36 }}>
                    <IconBulb size={20} />
                  </Avatar>
                  <Typography variant="h6" fontWeight={700}>Pilares e palavras-chave</Typography>
                </Stack>
                {!editingContent ? (
                  <Tooltip title="Editar pilares e palavras-chave">
                    <IconButton size="small" onClick={openContentEdit}>
                      <IconEdit size={16} />
                    </IconButton>
                  </Tooltip>
                ) : (
                  <Stack direction="row" spacing={0.5}>
                    <IconButton size="small" color="success" onClick={saveContent} disabled={savingContent}>
                      {savingContent ? <CircularProgress size={14} /> : <IconCheck size={16} />}
                    </IconButton>
                    <IconButton size="small" onClick={() => setEditingContent(false)} disabled={savingContent}>
                      <IconX size={16} />
                    </IconButton>
                  </Stack>
                )}
              </Stack>

              <Collapse in={editingContent} unmountOnExit>
                <Stack spacing={1.5} sx={{ mb: 2 }}>
                  <TextField
                    fullWidth size="small" label="Pilares de conteúdo"
                    placeholder="Ex: Educação, Bastidores, Cases"
                    value={contentForm.pillars}
                    onChange={(e) => setContentForm((f) => ({ ...f, pillars: e.target.value }))}
                    helperText="Separe por vírgula"
                  />
                  <TextField
                    fullWidth size="small" label="Palavras-chave"
                    placeholder="Ex: leilão, imóveis, oportunidade"
                    value={contentForm.keywords}
                    onChange={(e) => setContentForm((f) => ({ ...f, keywords: e.target.value }))}
                    helperText="Separe por vírgula"
                  />
                </Stack>
                <Divider sx={{ mb: 2 }} />
              </Collapse>

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
                { label: 'Reportei', ok: reporteiConfigured, updatedAt: reporteiConnector?.updated_at || null, syncOk: reporteiConnector?.last_sync_ok, syncAt: reporteiConnector?.last_sync_at, syncError: reporteiConnector?.last_error },
                { label: 'Meta', ok: metaConfigured, updatedAt: metaConnector?.updated_at || null, syncOk: metaConnector?.last_sync_ok, syncAt: metaConnector?.last_sync_at, syncError: metaConnector?.last_error },
                { label: `Fontes social (${platforms.length})`, ok: platforms.length > 0, updatedAt: sourcesConnector?.updated_at || null, syncOk: null, syncAt: null, syncError: null },
              ].map((item) => {
                const hasError = item.ok && item.syncOk === false;
                const dotColor = hasError ? '#dc2626' : item.ok ? '#059669' : '#e2e8f0';
                const dotShadow = hasError ? '0 0 6px rgba(220,38,38,0.35)' : item.ok ? '0 0 6px rgba(5,150,105,0.35)' : 'none';
                const chipLabel = !item.ok ? 'Configurar' : hasError ? 'Erro' : 'OK';
                const chipBg = !item.ok ? '#f8fafc' : hasError ? '#fef2f2' : '#ecfdf5';
                const chipColor = !item.ok ? '#64748b' : hasError ? '#dc2626' : '#059669';
                const timeLabel = item.syncAt ? `Testado: ${formatDate(item.syncAt)}` : item.updatedAt ? `Atualizado: ${formatDate(item.updatedAt)}` : '--';
                return (
                <Stack key={item.label} direction="row" spacing={1.5} alignItems="center" sx={{ py: 0.75 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: dotColor, boxShadow: dotShadow }} />
                  <Typography variant="body2" sx={{ flex: 1 }}>{item.label}</Typography>
                  <Typography variant="caption" color="text.secondary">{timeLabel}</Typography>
                  <Chip size="small" label={chipLabel} sx={{ bgcolor: chipBg, color: chipColor, fontWeight: 700 }} />
                </Stack>
                );
              })}
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

      {tab === 4 && <ContactsManager clientId={clientId} />}

      {tab === 5 && <ClientLibraryClient clientId={clientId} />}
    </Box>
  );
}
