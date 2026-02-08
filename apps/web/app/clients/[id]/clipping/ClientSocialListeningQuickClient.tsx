'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardCard from '@/components/shared/DashboardCard';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import {
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandLinkedin,
  IconBrandReddit,
  IconBrandTiktok,
  IconBrandX,
  IconBrandYoutube,
  IconDeviceFloppy,
  IconPlus,
  IconRefresh,
  IconSparkles,
  IconTrash,
  IconMessageCircle,
  IconMoodSmile,
  IconMoodNeutral,
  IconMoodSad,
} from '@tabler/icons-react';

type ClientRow = {
  id: string;
  name: string;
  segment_primary?: string | null;
  city?: string | null;
  uf?: string | null;
  country?: string | null;
};

type KeywordRow = {
  id: string;
  keyword: string;
  category?: string | null;
  client_id?: string | null;
  is_active: boolean;
};

type MentionRow = {
  id: string;
  platform: string;
  keyword: string;
  content: string;
  author?: string | null;
  url?: string | null;
  sentiment?: string | null;
  engagement_likes?: number | null;
  engagement_comments?: number | null;
  engagement_shares?: number | null;
  engagement_views?: number | null;
  published_at?: string | null;
};

type StatsResponse = {
  summary?: {
    total?: number;
    positive?: number;
    negative?: number;
    neutral?: number;
    avg_score?: number;
  };
  platforms?: { platform: string; total: number }[];
  top_keywords?: { keyword: string; total: number }[];
};

type ConnectorRow = {
  provider: string;
  payload?: Record<string, any> | null;
  secrets_meta?: Record<string, any> | null;
  updated_at?: string | null;
};

type SocialPlatform = 'twitter' | 'youtube' | 'tiktok' | 'reddit' | 'linkedin' | 'instagram' | 'facebook';

const ALL_SOCIAL_PLATFORMS: SocialPlatform[] = ['twitter', 'youtube', 'tiktok', 'reddit', 'linkedin', 'instagram', 'facebook'];
const DEFAULT_SOURCES: SocialPlatform[] = ['twitter', 'youtube', 'tiktok', 'reddit', 'linkedin'];
const SOURCES_CONNECTOR_PROVIDER = 'social_listening_sources';

const PLATFORM_META: Record<SocialPlatform, { label: string; color: string; icon: typeof IconBrandInstagram; tokenLabel: string }> = {
  twitter: { label: 'X / Twitter', color: '#0F172A', icon: IconBrandX, tokenLabel: 'Token / API Key (opcional)' },
  youtube: { label: 'YouTube', color: '#FF0000', icon: IconBrandYoutube, tokenLabel: 'Token / API Key (opcional)' },
  tiktok: { label: 'TikTok', color: '#0F172A', icon: IconBrandTiktok, tokenLabel: 'Token / API Key (opcional)' },
  reddit: { label: 'Reddit', color: '#FF4500', icon: IconBrandReddit, tokenLabel: 'Token / API Key (opcional)' },
  linkedin: { label: 'LinkedIn', color: '#0A66C2', icon: IconBrandLinkedin, tokenLabel: 'Token / API Key (opcional)' },
  instagram: { label: 'Instagram', color: '#E4405F', icon: IconBrandInstagram, tokenLabel: 'Meta Access Token' },
  facebook: { label: 'Facebook', color: '#1877F2', icon: IconBrandFacebook, tokenLabel: 'Meta Access Token' },
};

const LEGAL_SUFFIXES = new Set([
  'ltda',
  'ltda.',
  's/a',
  'sa',
  's.a',
  'me',
  'eireli',
  'holding',
  'grupo',
  'group',
  'company',
  'co',
  'inc',
  'llc',
  'corp',
]);

function normalizeForCompare(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function toSlug(value: string) {
  const normalized = normalizeForCompare(value);
  return normalized.replace(/[^a-z0-9]+/g, '');
}

function stripLegalSuffixes(value: string) {
  const tokens = value
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);

  const cleaned = tokens.filter((token) => !LEGAL_SUFFIXES.has(normalizeForCompare(token)));
  return cleaned.join(' ').trim();
}

function deriveKeywords(companyName: string) {
  const base = companyName.trim();
  if (!base) return [];

  const variants = new Set<string>();
  variants.add(base);

  const noSuffix = stripLegalSuffixes(base);
  if (noSuffix && noSuffix.toLowerCase() !== base.toLowerCase()) variants.add(noSuffix);

  const slugSource = noSuffix || base;
  const slug = toSlug(slugSource);
  const shouldAddSlugVariants = /\s/.test(slugSource) || /[^a-z0-9]/i.test(slugSource);
  if (slug.length >= 3 && shouldAddSlugVariants) {
    // Useful for hashtag/handle patterns (YouTube/TikTok) when the brand has multiple words.
    variants.add(slug);
    variants.add(`#${slug}`);
  }

  return Array.from(variants).slice(0, 6);
}

function formatDateTime(value?: string | null) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString('pt-BR');
}

function sentimentChip(sentiment?: string | null) {
  if (sentiment === 'positive') return { label: 'Positivo', color: 'success' as const, icon: IconMoodSmile };
  if (sentiment === 'negative') return { label: 'Negativo', color: 'error' as const, icon: IconMoodSad };
  if (sentiment === 'neutral') return { label: 'Neutro', color: 'warning' as const, icon: IconMoodNeutral };
  return { label: 'Indefinido', color: 'default' as const, icon: IconMoodNeutral };
}

function isSocialPlatform(value: any): value is SocialPlatform {
  return ALL_SOCIAL_PLATFORMS.includes(value);
}

function uniq<T>(items: T[]) {
  return Array.from(new Set(items));
}

type ClientSocialListeningQuickClientProps = {
  clientId: string;
};

export default function ClientSocialListeningQuickClient({ clientId }: ClientSocialListeningQuickClientProps) {
  const [client, setClient] = useState<ClientRow | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [keywords, setKeywords] = useState<KeywordRow[]>([]);
  const [mentions, setMentions] = useState<MentionRow[]>([]);
  const [stats, setStats] = useState<StatsResponse>({});
  const [connectors, setConnectors] = useState<ConnectorRow[]>([]);
  const [sources, setSources] = useState<SocialPlatform[]>(DEFAULT_SOURCES);
  const [sourceToAdd, setSourceToAdd] = useState<SocialPlatform | ''>('');
  const [sourcesBusy, setSourcesBusy] = useState(false);
  const [sourcesError, setSourcesError] = useState('');
  const [sourcesSuccess, setSourcesSuccess] = useState('');
  const [sourceDraft, setSourceDraft] = useState<Record<SocialPlatform, Record<string, string>>>({
    twitter: { token: '' },
    youtube: { token: '' },
    tiktok: { token: '' },
    reddit: { token: '' },
    linkedin: { token: '' },
    facebook: { page_id: '', access_token: '' },
    instagram: { instagram_business_id: '', access_token: '' },
  });
  const [platformFilter, setPlatformFilter] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [keywordsBusy, setKeywordsBusy] = useState(false);
  const [keywordsError, setKeywordsError] = useState('');
  const [keywordsSuccess, setKeywordsSuccess] = useState('');
  const [keywordEditOpen, setKeywordEditOpen] = useState(false);
  const [keywordEditing, setKeywordEditing] = useState<KeywordRow | null>(null);
  const [keywordEditValue, setKeywordEditValue] = useState('');
  const [keywordEditActive, setKeywordEditActive] = useState(true);

  const getConnector = useCallback(
    (provider: string) => connectors.find((item) => item.provider === provider) || null,
    [connectors]
  );

  const saveSources = useCallback(
    async (nextSources: SocialPlatform[]) => {
      setSourcesBusy(true);
      setSourcesError('');
      setSourcesSuccess('');
      try {
        await apiPost(`/clients/${clientId}/connectors/${SOURCES_CONNECTOR_PROVIDER}`, {
          payload: { platforms: nextSources },
        });
        setSourcesSuccess('Fontes atualizadas.');
        return true;
      } catch (err: any) {
        setSourcesError(err?.message || 'Falha ao salvar fontes.');
        return false;
      } finally {
        setSourcesBusy(false);
      }
    },
    [clientId]
  );

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [clientRes, keywordsRes, statsRes, mentionsRes, connectorsRes] = await Promise.all([
        apiGet<ClientRow>(`/clients/${clientId}`),
        apiGet<KeywordRow[]>(`/social-listening/keywords?clientId=${encodeURIComponent(clientId)}`),
        apiGet<StatsResponse>(`/social-listening/stats?clientId=${encodeURIComponent(clientId)}`),
        apiGet<{ mentions?: MentionRow[] }>(
          `/social-listening/mentions?clientId=${encodeURIComponent(clientId)}&limit=25`
        ),
        apiGet<ConnectorRow[]>(`/clients/${clientId}/connectors`),
      ]);

      setClient(clientRes || null);
      setCompanyName((prev) => prev || clientRes?.name || '');
      setKeywords(Array.isArray(keywordsRes) ? keywordsRes : []);
      setStats(statsRes || {});
      setMentions(Array.isArray(mentionsRes?.mentions) ? mentionsRes.mentions : []);

      const connectorList = Array.isArray(connectorsRes) ? connectorsRes : [];
      setConnectors(connectorList);

      const sourcesRow = connectorList.find((item) => item.provider === SOURCES_CONNECTOR_PROVIDER);
      const platforms = (sourcesRow?.payload as any)?.platforms;
      if (Array.isArray(platforms)) {
        setSources(uniq(platforms.filter(isSocialPlatform)));
      }

      const metaRow = connectorList.find((item) => item.provider === 'meta');
      const metaPayload = (metaRow?.payload as any) || {};
      setSourceDraft((prev) => ({
        ...prev,
        facebook: {
          ...prev.facebook,
          page_id: String(metaPayload.page_id || metaPayload.facebook_page_id || ''),
        },
        instagram: {
          ...prev.instagram,
          instagram_business_id: String(metaPayload.instagram_business_id || metaPayload.ig_business_id || ''),
        },
      }));
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar social listening.');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const loadKeywordsOnly = useCallback(async () => {
    try {
      const keywordsRes = await apiGet<KeywordRow[]>(
        `/social-listening/keywords?clientId=${encodeURIComponent(clientId)}`
      );
      setKeywords(Array.isArray(keywordsRes) ? keywordsRes : []);
    } catch (err: any) {
      setKeywordsError(err?.message || 'Falha ao carregar keywords.');
    }
  }, [clientId]);

  const handleAddKeywordManual = async () => {
    const value = keywordInput.trim();
    if (value.length < 2) return;

    setKeywordsBusy(true);
    setKeywordsError('');
    setKeywordsSuccess('');
    try {
      await apiPost('/social-listening/keywords', {
        clientId,
        keyword: value,
        category: 'manual',
      });
      setKeywordInput('');
      setKeywordsSuccess('Keyword adicionada.');
      await loadKeywordsOnly();
    } catch (err: any) {
      setKeywordsError(err?.message || 'Falha ao adicionar keyword.');
    } finally {
      setKeywordsBusy(false);
    }
  };

  const openKeywordEdit = (kw: KeywordRow) => {
    if (!kw.client_id) return;
    setKeywordsError('');
    setKeywordsSuccess('');
    setKeywordEditing(kw);
    setKeywordEditValue(kw.keyword);
    setKeywordEditActive(kw.is_active);
    setKeywordEditOpen(true);
  };

  const closeKeywordEdit = () => {
    setKeywordEditOpen(false);
    setKeywordEditing(null);
    setKeywordEditValue('');
    setKeywordEditActive(true);
  };

  const saveKeywordEdit = async () => {
    if (!keywordEditing?.client_id) return;
    const value = keywordEditValue.trim();
    if (value.length < 2) {
      setKeywordsError('A keyword precisa ter pelo menos 2 caracteres.');
      return;
    }

    setKeywordsBusy(true);
    setKeywordsError('');
    setKeywordsSuccess('');
    try {
      await apiPatch(`/social-listening/keywords/${keywordEditing.id}`, {
        keyword: value,
        is_active: keywordEditActive,
      });
      setKeywordsSuccess('Keyword atualizada.');
      closeKeywordEdit();
      await loadKeywordsOnly();
    } catch (err: any) {
      setKeywordsError(err?.message || 'Falha ao atualizar keyword.');
    } finally {
      setKeywordsBusy(false);
    }
  };

  const handleDeleteKeyword = async (kw: KeywordRow) => {
    if (!kw.client_id) return;
    const ok = window.confirm(`Remover a keyword \"${kw.keyword}\"?`);
    if (!ok) return;

    setKeywordsBusy(true);
    setKeywordsError('');
    setKeywordsSuccess('');
    try {
      await apiDelete(`/social-listening/keywords/${kw.id}`);
      if (keywordEditing?.id === kw.id) closeKeywordEdit();
      setKeywordsSuccess('Keyword removida.');
      await loadKeywordsOnly();
    } catch (err: any) {
      setKeywordsError(err?.message || 'Falha ao remover keyword.');
    } finally {
      setKeywordsBusy(false);
    }
  };

  const filteredMentions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (mentions || []).filter((mention) => {
      if (platformFilter && mention.platform !== platformFilter) return false;
      if (sentimentFilter && mention.sentiment !== sentimentFilter) return false;
      if (!q) return true;
      const haystack = `${mention.content || ''} ${mention.author || ''} ${mention.keyword || ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [mentions, platformFilter, sentimentFilter, search]);

  const summary = stats.summary || {};
  const platformTotals = stats.platforms || [];

  const availableToAdd = useMemo(() => {
    return ALL_SOCIAL_PLATFORMS.filter((platform) => !sources.includes(platform));
  }, [sources]);

  const handleAddSource = async () => {
    const selected = sourceToAdd;
    if (!selected) return;
    const next = uniq([...sources, selected]);

    const prev = sources;
    setSources(next);
    setSourceToAdd('');

    const ok = await saveSources(next);
    if (!ok) {
      setSources(prev);
    }
  };

  const handleRemoveSource = async (platform: SocialPlatform) => {
    const next = sources.filter((item) => item !== platform);
    const prev = sources;
    setSources(next);

    const ok = await saveSources(next);
    if (!ok) {
      setSources(prev);
    }
  };

  const saveMetaConfig = async (platform: 'facebook' | 'instagram') => {
    setSourcesBusy(true);
    setSourcesError('');
    setSourcesSuccess('');
    try {
      const metaRow = getConnector('meta');
      const currentPayload = (metaRow?.payload as any) || {};
      const nextPayload = { ...currentPayload };

      if (platform === 'facebook') {
        const pageId = sourceDraft.facebook.page_id.trim();
        if (pageId) {
          nextPayload.page_id = pageId;
        } else {
          delete nextPayload.page_id;
          delete nextPayload.facebook_page_id;
        }
      } else {
        const igId = sourceDraft.instagram.instagram_business_id.trim();
        if (igId) {
          nextPayload.instagram_business_id = igId;
        } else {
          delete nextPayload.instagram_business_id;
          delete nextPayload.ig_business_id;
        }
      }

      const token = (platform === 'facebook'
        ? sourceDraft.facebook.access_token
        : sourceDraft.instagram.access_token
      ).trim();

      const body: any = { payload: nextPayload };
      if (token) body.secrets = { access_token: token };

      await apiPost(`/clients/${clientId}/connectors/meta`, body);
      setSourcesSuccess(`${PLATFORM_META[platform].label} atualizado.`);
      setSourceDraft((prev) => ({
        ...prev,
        [platform]: { ...prev[platform], access_token: '' },
      }));
    } catch (err: any) {
      setSourcesError(err?.message || 'Falha ao salvar configuracao Meta.');
    } finally {
      setSourcesBusy(false);
    }
  };

  const saveTokenConfig = async (platform: Exclude<SocialPlatform, 'facebook' | 'instagram'>) => {
    const token = sourceDraft[platform].token.trim();
    if (!token) return;

    setSourcesBusy(true);
    setSourcesError('');
    setSourcesSuccess('');
    try {
      await apiPost(`/clients/${clientId}/connectors/social_listening_${platform}`, {
        payload: {},
        secrets: { token },
      });
      setSourcesSuccess(`${PLATFORM_META[platform].label}: token salvo.`);
      setSourceDraft((prev) => ({ ...prev, [platform]: { ...prev[platform], token: '' } }));
    } catch (err: any) {
      setSourcesError(err?.message || 'Falha ao salvar token.');
    } finally {
      setSourcesBusy(false);
    }
  };

  const handleQuickStart = async () => {
    const name = companyName.trim();
    if (name.length < 2) return;
    if (!sources.length) {
      setError('Adicione pelo menos 1 fonte antes de coletar.');
      return;
    }

    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const candidates = deriveKeywords(name);
      for (const keyword of candidates) {
        await apiPost('/social-listening/keywords', {
          clientId,
          keyword,
          category: 'auto',
        });
      }

      const collectResult = await apiPost<{ collected?: number; analyzed?: number; errors?: string[] }>(
        '/social-listening/collect',
        { clientId, platforms: sources, includeComments: true, commentsPostsLimit: 10, commentsLimitPerPost: 50 }
      );
      const collected = Number(collectResult?.collected || 0);
      setSuccess(collected > 0 ? `Coleta concluida: ${collected} mencoes.` : 'Coleta concluida, mas nenhuma mencao foi coletada.');
      await loadAll();
    } catch (err: any) {
      setError(err?.message || 'Falha ao ativar social listening.');
    } finally {
      setBusy(false);
    }
  };

  if (loading && !client) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 220 }}>
        <CircularProgress size={28} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Carregando Social Listening...
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack spacing={3} sx={{ minWidth: 0 }}>
      <Box>
        <Typography variant="h4" fontWeight={700}>Social Listening</Typography>
        <Typography variant="body2" color="text.secondary">
          Digite o nome da empresa e a ferramenta configura keywords e coleta mencoes automaticamente.
        </Typography>
      </Box>

      {error ? (
        <Card variant="outlined">
          <CardContent>
            <Typography color="error">{error}</Typography>
          </CardContent>
        </Card>
      ) : null}
      {success ? (
        <Card variant="outlined">
          <CardContent>
            <Typography color="success.main">{success}</Typography>
          </CardContent>
        </Card>
      ) : null}

      <DashboardCard
        title="Setup rapido"
        subtitle={client ? `${client.name} - ${client.segment_primary || 'Sem segmento'}` : undefined}
        action={<Chip size="small" label={`${keywords.length} keywords`} color="info" variant="outlined" />}
      >
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Empresa"
              size="small"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Ex: Azul Linhas Aereas"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ height: '100%' }}>
              <Button
                variant="contained"
                startIcon={<IconSparkles size={16} />}
                onClick={handleQuickStart}
                disabled={busy || companyName.trim().length < 2}
              >
                {busy ? 'Coletando...' : 'Ativar e coletar'}
              </Button>
              <Button
                variant="outlined"
                startIcon={<IconRefresh size={16} />}
                onClick={loadAll}
                disabled={busy}
              >
                Atualizar
              </Button>
            </Stack>
          </Grid>

          {keywords.length ? (
            <Grid size={{ xs: 12 }}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {keywords.map((kw) => (
                  <Chip
                    key={kw.id}
                    size="small"
                    label={kw.keyword}
                    variant={kw.is_active ? 'filled' : 'outlined'}
                    color={kw.is_active ? 'primary' : 'default'}
                    clickable={Boolean(kw.client_id)}
                    onClick={kw.client_id ? () => openKeywordEdit(kw) : undefined}
                    onDelete={kw.client_id ? () => void handleDeleteKeyword(kw) : undefined}
                    deleteIcon={<IconTrash size={16} />}
                  />
                ))}
              </Stack>
            </Grid>
          ) : (
            <Grid size={{ xs: 12 }}>
              <Typography variant="body2" color="text.secondary">
                Nenhuma keyword configurada para este cliente ainda. Clique em &quot;Ativar e coletar&quot;.
              </Typography>
            </Grid>
          )}

          <Grid size={{ xs: 12 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ md: 'center' }}>
              <TextField
                fullWidth
                size="small"
                label="Adicionar keyword"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                disabled={keywordsBusy}
                placeholder="Ex: nome do produto, hashtag..."
              />
              <Button
                variant="outlined"
                startIcon={<IconPlus size={16} />}
                onClick={handleAddKeywordManual}
                disabled={keywordsBusy || keywordInput.trim().length < 2}
              >
                Adicionar
              </Button>
            </Stack>
            {keywordsError ? (
              <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                {keywordsError}
              </Typography>
            ) : null}
            {keywordsSuccess ? (
              <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
                {keywordsSuccess}
              </Typography>
            ) : null}
          </Grid>
        </Grid>
      </DashboardCard>

      <Dialog
        open={keywordEditOpen}
        onClose={() => {
          if (keywordsBusy) return;
          closeKeywordEdit();
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Editar keyword</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              fullWidth
              size="small"
              label="Keyword"
              value={keywordEditValue}
              onChange={(e) => setKeywordEditValue(e.target.value)}
              disabled={keywordsBusy}
            />
            <FormControlLabel
              control={(
                <Switch
                  checked={keywordEditActive}
                  onChange={(e) => setKeywordEditActive(e.target.checked)}
                  disabled={keywordsBusy}
                />
              )}
              label="Ativa"
            />
            {keywordsError ? (
              <Typography variant="body2" color="error">
                {keywordsError}
              </Typography>
            ) : null}
            {keywordsSuccess ? (
              <Typography variant="body2" color="success.main">
                {keywordsSuccess}
              </Typography>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeKeywordEdit} disabled={keywordsBusy}>
            Cancelar
          </Button>
          <Button
            color="error"
            onClick={() => (keywordEditing ? void handleDeleteKeyword(keywordEditing) : null)}
            disabled={keywordsBusy || !keywordEditing}
          >
            Excluir
          </Button>
          <Button
            variant="contained"
            onClick={saveKeywordEdit}
            disabled={keywordsBusy || keywordEditValue.trim().length < 2}
          >
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      <DashboardCard
        title="Fontes"
        subtitle="Escolha as plataformas monitoradas e configure tokens quando necessario."
        action={<Chip size="small" label={`${sources.length} fontes`} color="info" variant="outlined" />}
      >
        <Stack spacing={2}>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                select
                fullWidth
                size="small"
                label="Adicionar fonte"
                value={sourceToAdd}
                onChange={(e) => setSourceToAdd(e.target.value as any)}
                disabled={sourcesBusy || availableToAdd.length === 0}
              >
                <MenuItem value="">Selecione...</MenuItem>
                {availableToAdd.map((platform) => (
                  <MenuItem key={platform} value={platform}>
                    {PLATFORM_META[platform].label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Button
                  variant="outlined"
                  startIcon={<IconPlus size={16} />}
                  onClick={handleAddSource}
                  disabled={sourcesBusy || !sourceToAdd}
                >
                  Adicionar
                </Button>
                <Typography variant="caption" color="text.secondary">
                  Tokens salvos nao sao exibidos; cole novamente para atualizar.
                </Typography>
              </Stack>
            </Grid>
          </Grid>

          {sourcesError ? (
            <Typography variant="body2" color="error">
              {sourcesError}
            </Typography>
          ) : null}
          {sourcesSuccess ? (
            <Typography variant="body2" color="success.main">
              {sourcesSuccess}
            </Typography>
          ) : null}

          <Grid container spacing={2}>
            {sources.map((platform) => {
              const meta = PLATFORM_META[platform];
              const Icon = meta.icon;
              const connectorUpdatedAt =
                platform === 'facebook' || platform === 'instagram'
                  ? getConnector('meta')?.updated_at
                  : getConnector(`social_listening_${platform}`)?.updated_at;

              return (
                <Grid key={platform} size={{ xs: 12, md: 6, lg: 4 }}>
                  <Card variant="outlined" sx={{ height: '100%' }}>
                    <CardContent>
                      <Stack spacing={2}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
                            <Avatar sx={{ bgcolor: `${meta.color}22`, color: meta.color, width: 44, height: 44 }}>
                              <Icon size={22} />
                            </Avatar>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant="subtitle1" fontWeight={700} noWrap>
                                {meta.label}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                {connectorUpdatedAt ? `Atualizado em ${formatDateTime(connectorUpdatedAt)}` : 'Sem configuracao salva ainda.'}
                              </Typography>
                            </Box>
                          </Stack>
                          <IconButton
                            size="small"
                            onClick={() => handleRemoveSource(platform)}
                            disabled={sourcesBusy}
                            aria-label={`Remover ${meta.label}`}
                          >
                            <IconTrash size={18} />
                          </IconButton>
                        </Stack>

                        {platform === 'facebook' ? (
                          <Stack spacing={1}>
                            <TextField
                              fullWidth
                              size="small"
                              label="Facebook Page ID"
                              value={sourceDraft.facebook.page_id}
                              onChange={(e) =>
                                setSourceDraft((prev) => ({
                                  ...prev,
                                  facebook: { ...prev.facebook, page_id: e.target.value },
                                }))
                              }
                            />
                            <TextField
                              fullWidth
                              size="small"
                              label={meta.tokenLabel}
                              type="password"
                              value={sourceDraft.facebook.access_token}
                              onChange={(e) =>
                                setSourceDraft((prev) => ({
                                  ...prev,
                                  facebook: { ...prev.facebook, access_token: e.target.value },
                                }))
                              }
                              placeholder="Cole o token para salvar/atualizar"
                            />
                            <Button
                              variant="contained"
                              startIcon={<IconDeviceFloppy size={16} />}
                              onClick={() => saveMetaConfig('facebook')}
                              disabled={sourcesBusy}
                            >
                              Salvar
                            </Button>
                          </Stack>
                        ) : platform === 'instagram' ? (
                          <Stack spacing={1}>
                            <TextField
                              fullWidth
                              size="small"
                              label="Instagram Business ID"
                              value={sourceDraft.instagram.instagram_business_id}
                              onChange={(e) =>
                                setSourceDraft((prev) => ({
                                  ...prev,
                                  instagram: { ...prev.instagram, instagram_business_id: e.target.value },
                                }))
                              }
                            />
                            <TextField
                              fullWidth
                              size="small"
                              label={meta.tokenLabel}
                              type="password"
                              value={sourceDraft.instagram.access_token}
                              onChange={(e) =>
                                setSourceDraft((prev) => ({
                                  ...prev,
                                  instagram: { ...prev.instagram, access_token: e.target.value },
                                }))
                              }
                              placeholder="Cole o token para salvar/atualizar"
                            />
                            <Button
                              variant="contained"
                              startIcon={<IconDeviceFloppy size={16} />}
                              onClick={() => saveMetaConfig('instagram')}
                              disabled={sourcesBusy}
                            >
                              Salvar
                            </Button>
                          </Stack>
                        ) : (
                          <Stack spacing={1}>
                            <TextField
                              fullWidth
                              size="small"
                              label={meta.tokenLabel}
                              type="password"
                              value={sourceDraft[platform].token}
                              onChange={(e) =>
                                setSourceDraft((prev) => ({
                                  ...prev,
                                  [platform]: { ...prev[platform], token: e.target.value },
                                }))
                              }
                              placeholder="Cole o token (opcional) para salvar/atualizar"
                            />
                            <Button
                              variant="outlined"
                              startIcon={<IconDeviceFloppy size={16} />}
                              onClick={() => saveTokenConfig(platform)}
                              disabled={sourcesBusy || !sourceDraft[platform].token.trim()}
                            >
                              Salvar token
                            </Button>
                          </Stack>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Stack>
      </DashboardCard>

      <Grid container spacing={2}>
        <Grid size={{ xs: 6, md: 3 }}>
          <DashboardCard>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar sx={{ bgcolor: '#5d87ff22', color: '#5d87ff', width: 44, height: 44 }}>
                <IconMessageCircle size={22} />
              </Avatar>
              <Box>
                <Typography variant="caption" color="text.secondary" noWrap>Total (7d)</Typography>
                <Typography variant="h5" fontWeight={700}>{Number(summary.total || 0)}</Typography>
              </Box>
            </Stack>
          </DashboardCard>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <DashboardCard>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar sx={{ bgcolor: '#4caf5022', color: '#4caf50', width: 44, height: 44 }}>
                <IconMoodSmile size={22} />
              </Avatar>
              <Box>
                <Typography variant="caption" color="text.secondary" noWrap>Positivas</Typography>
                <Typography variant="h5" fontWeight={700}>{Number(summary.positive || 0)}</Typography>
              </Box>
            </Stack>
          </DashboardCard>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <DashboardCard>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar sx={{ bgcolor: '#ff980022', color: '#ff9800', width: 44, height: 44 }}>
                <IconMoodNeutral size={22} />
              </Avatar>
              <Box>
                <Typography variant="caption" color="text.secondary" noWrap>Neutras</Typography>
                <Typography variant="h5" fontWeight={700}>{Number(summary.neutral || 0)}</Typography>
              </Box>
            </Stack>
          </DashboardCard>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <DashboardCard>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar sx={{ bgcolor: '#f4433622', color: '#f44336', width: 44, height: 44 }}>
                <IconMoodSad size={22} />
              </Avatar>
              <Box>
                <Typography variant="caption" color="text.secondary" noWrap>Negativas</Typography>
                <Typography variant="h5" fontWeight={700}>{Number(summary.negative || 0)}</Typography>
              </Box>
            </Stack>
          </DashboardCard>
        </Grid>
      </Grid>

      <DashboardCard
        title="Mencoes"
        subtitle="Ultimas 25 (filtre por plataforma/sentimento)"
        action={<Chip size="small" label={`${filteredMentions.length} itens`} color="primary" variant="outlined" />}
      >
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              select
              fullWidth
              size="small"
              label="Plataforma"
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
            >
              <MenuItem value="">Todas</MenuItem>
              {platformTotals.map((p) => (
                <MenuItem key={p.platform} value={p.platform}>
                  {p.platform} ({p.total})
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              select
              fullWidth
              size="small"
              label="Sentimento"
              value={sentimentFilter}
              onChange={(e) => setSentimentFilter(e.target.value)}
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="positive">Positivo</MenuItem>
              <MenuItem value="neutral">Neutro</MenuItem>
              <MenuItem value="negative">Negativo</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              fullWidth
              size="small"
              label="Busca"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Texto, autor, keyword..."
            />
          </Grid>
        </Grid>

        <Stack spacing={1}>
          {filteredMentions.length ? (
            filteredMentions.map((mention) => {
              const chip = sentimentChip(mention.sentiment);
              return (
                <Card
                  key={mention.id}
                  variant="outlined"
                  sx={{ transition: 'all 0.2s', '&:hover': { borderColor: 'primary.light', boxShadow: 2 } }}
                >
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between">
                      <Box sx={{ minWidth: 0 }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                          <Chip size="small" label={mention.platform} variant="outlined" />
                          <Chip size="small" label={mention.keyword} variant="outlined" />
                          <Chip size="small" color={chip.color} icon={<chip.icon size={14} />} label={chip.label} />
                        </Stack>
                        <Typography variant="subtitle2" sx={{ whiteSpace: 'pre-line' }}>
                          {String(mention.content || '').slice(0, 280) || 'Sem conteudo.'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                          {(mention.author || 'Autor desconhecido') + ' - ' + formatDateTime(mention.published_at)}
                        </Typography>
                      </Box>
                      {mention.url ? (
                        <Button
                          size="small"
                          variant="text"
                          href={mention.url}
                          target="_blank"
                          rel="noreferrer"
                          sx={{ alignSelf: { xs: 'flex-start', md: 'center' } }}
                        >
                          Abrir
                        </Button>
                      ) : null}
                    </Stack>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              Nenhuma mencao encontrada.
            </Typography>
          )}
        </Stack>
      </DashboardCard>
    </Stack>
  );
}
