'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import {
  IconBrandInstagram,
  IconBrandFacebook,
  IconHeart,
  IconMessage2,
  IconEye,
  IconBookmark,
  IconRefresh,
  IconPlugConnected,
  IconPlus,
  IconTrash,
  IconExternalLink,
  IconArrowUpRight,
  IconArrowDownRight,
} from '@tabler/icons-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type ClientPost = {
  id: string;
  platform: 'instagram' | 'facebook';
  url: string | null;
  caption: string | null;
  media_type: string | null;
  media_url: string | null;
  thumbnail_url: string | null;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  impressions: number | null;
  reach: number | null;
  saves: number | null;
  video_views: number | null;
  engagement_rate: number | null;
  published_at: string | null;
};

type ReporteiKpi = { metric: string; value: number };
type ReporteiByFormat = { format: string; score: number; kpis?: ReporteiKpi[]; notes?: string[] };
type ReporteiInsight = {
  platform?: string;
  time_window?: string;
  payload?: { by_format?: ReporteiByFormat[]; editorial_insights?: string[] };
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
  published_at?: string | null;
};

type KeywordRow = {
  id: string;
  keyword: string;
  category?: string | null;
  is_active: boolean;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(n?: number | null) {
  if (n == null || !isFinite(n)) return '–';
  return new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

function fmtDate(s?: string | null) {
  if (!s) return '';
  return new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function sentimentColor(s?: string | null): 'success' | 'error' | 'default' {
  if (s === 'positive') return 'success';
  if (s === 'negative') return 'error';
  return 'default';
}

function sentimentLabel(s?: string | null) {
  if (s === 'positive') return 'Positivo';
  if (s === 'negative') return 'Negativo';
  if (s === 'neutral') return 'Neutro';
  return s ?? '';
}

const PLATFORM_ICON: Record<string, React.ReactNode> = {
  instagram: <IconBrandInstagram size={16} />,
  facebook: <IconBrandFacebook size={16} />,
};

const PLATFORM_OPTS = [
  { value: '', label: 'Todas' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'twitter', label: 'X / Twitter' },
];

const SENTIMENT_OPTS = [
  { value: '', label: 'Todos' },
  { value: 'positive', label: 'Positivo' },
  { value: 'neutral', label: 'Neutro' },
  { value: 'negative', label: 'Negativo' },
];

// ── KPI card (Reportei aggregate) ─────────────────────────────────────────────

function KpiCard({ label, value, delta }: { label: string; value: string; delta?: number | null }) {
  const up = (delta ?? 0) >= 0;
  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mt={0.5}>
          <Typography variant="h6" fontWeight={700}>{value}</Typography>
          {delta != null && (
            <Stack direction="row" alignItems="center" spacing={0.25}
              sx={{ color: up ? 'success.main' : 'error.main', fontSize: 12 }}>
              {up ? <IconArrowUpRight size={14} /> : <IconArrowDownRight size={14} />}
              <Typography variant="caption" fontWeight={600} color="inherit">
                {Math.abs(delta).toFixed(1)}%
              </Typography>
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

// ── Post card ────────────────────────────────────────────────────────────────

function PostCard({ post }: { post: ClientPost }) {
  const thumb = post.thumbnail_url || post.media_url;
  return (
    <Card variant="outlined" sx={{ borderRadius: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Thumbnail */}
      <Box sx={{
        height: 180,
        bgcolor: 'action.hover',
        backgroundImage: thumb ? `url(${thumb})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        position: 'relative',
        flexShrink: 0,
      }}>
        <Chip
          icon={PLATFORM_ICON[post.platform] as any}
          label={post.platform}
          size="small"
          sx={{ position: 'absolute', top: 8, left: 8, textTransform: 'capitalize',
                bgcolor: 'rgba(0,0,0,0.55)', color: '#fff', '& .MuiChip-icon': { color: '#fff' } }}
        />
        {post.url && (
          <Tooltip title="Abrir post">
            <Box component="a" href={post.url} target="_blank" rel="noreferrer"
              sx={{ position: 'absolute', top: 8, right: 8, color: '#fff',
                    bgcolor: 'rgba(0,0,0,0.45)', borderRadius: 1, p: '2px', display: 'flex' }}>
              <IconExternalLink size={14} />
            </Box>
          </Tooltip>
        )}
      </Box>

      <CardContent sx={{ flex: 1, py: 1.5, px: 1.5, '&:last-child': { pb: 1.5 } }}>
        {post.caption && (
          <Typography variant="body2" color="text.secondary"
            sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', mb: 1 }}>
            {post.caption}
          </Typography>
        )}

        {/* Metrics row */}
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
          <Stack direction="row" spacing={0.4} alignItems="center">
            <IconHeart size={13} /><Typography variant="caption">{fmt(post.likes_count)}</Typography>
          </Stack>
          <Stack direction="row" spacing={0.4} alignItems="center">
            <IconMessage2 size={13} /><Typography variant="caption">{fmt(post.comments_count)}</Typography>
          </Stack>
          {post.impressions != null && (
            <Stack direction="row" spacing={0.4} alignItems="center">
              <IconEye size={13} /><Typography variant="caption">{fmt(post.impressions)}</Typography>
            </Stack>
          )}
          {post.saves != null && (
            <Stack direction="row" spacing={0.4} alignItems="center">
              <IconBookmark size={13} /><Typography variant="caption">{fmt(post.saves)}</Typography>
            </Stack>
          )}
        </Stack>

        <Typography variant="caption" color="text.disabled" display="block" mt={0.5}>
          {fmtDate(post.published_at)}
        </Typography>
      </CardContent>
    </Card>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ClientSocialPageClient({ clientId }: { clientId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const subFromUrl = searchParams.get('sub') || 'posts';
  const [sub, setSub] = useState(subFromUrl);

  const [posts, setPosts] = useState<ClientPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [postsError, setPostsError] = useState('');
  const [hasConnector, setHasConnector] = useState<boolean | null>(null);

  const [reporteiKpis, setReporteiKpis] = useState<{ label: string; value: string; delta?: number | null }[]>([]);

  const [mentions, setMentions] = useState<MentionRow[]>([]);
  const [mentionsLoading, setMentionsLoading] = useState(false);
  const [platformFilter, setPlatformFilter] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState('');
  const [platformPosts, setPlatformPosts] = useState('');

  const [keywords, setKeywords] = useState<KeywordRow[]>([]);
  const [kwInput, setKwInput] = useState('');
  const [kwLoading, setKwLoading] = useState(false);

  const changeSub = (value: string) => {
    setSub(value);
    const qs = new URLSearchParams(searchParams.toString());
    qs.set('sub', value);
    router.replace(`?${qs.toString()}`, { scroll: false });
  };

  // ── Load Posts ────────────────────────────────────────────────────────────

  const loadPosts = useCallback(async () => {
    setPostsLoading(true);
    setPostsError('');
    try {
      const qs = platformPosts ? `?platform=${platformPosts}&limit=30` : '?limit=30';
      const res = await apiGet<{ posts: ClientPost[]; total: number }>(`/clients/${clientId}/posts${qs}`);
      setPosts(res.posts || []);
    } catch (err: any) {
      if (err?.status === 404 || err?.message?.includes('connector')) {
        setHasConnector(false);
      } else {
        setPostsError(err?.message || 'Erro ao carregar posts');
      }
    } finally {
      setPostsLoading(false);
    }
  }, [clientId, platformPosts]);

  const checkConnector = useCallback(async () => {
    try {
      const res = await apiGet<any>(`/clients/${clientId}/connectors/meta`);
      setHasConnector(!!res?.provider);
    } catch {
      setHasConnector(false);
    }
  }, [clientId]);

  const syncPosts = async () => {
    setSyncing(true);
    try {
      await apiPost(`/clients/${clientId}/posts/sync`);
      await loadPosts();
    } catch (err: any) {
      setPostsError(err?.message || 'Falha ao sincronizar');
    } finally {
      setSyncing(false);
    }
  };

  // ── Load Reportei KPIs ────────────────────────────────────────────────────

  const loadReportei = useCallback(async () => {
    try {
      const res = await apiGet<{ items?: ReporteiInsight[] }>(`/clients/${clientId}/insights/reportei`);
      const ig = res.items?.find(i => i.platform?.toLowerCase().includes('instagram'));
      if (!ig?.payload?.by_format?.[0]?.kpis) return;
      const kpis = ig.payload.by_format[0].kpis!;
      const LABELS: Record<string, string> = {
        impressions: 'Impressões', reach: 'Alcance',
        engagement_rate: 'Engajamento', followers_count: 'Seguidores',
        new_followers_count: 'Novos seguidores',
      };
      setReporteiKpis(
        kpis.filter(k => LABELS[k.metric]).map(k => ({
          label: LABELS[k.metric],
          value: k.metric === 'engagement_rate'
            ? `${(k.value > 1 ? k.value : k.value * 100).toFixed(2)}%`
            : fmt(k.value),
        }))
      );
    } catch {
      // Reportei not connected — silently skip
    }
  }, [clientId]);

  // ── Load Mentions ─────────────────────────────────────────────────────────

  const loadMentions = useCallback(async () => {
    setMentionsLoading(true);
    try {
      const qs = new URLSearchParams({ clientId });
      if (platformFilter) qs.set('platform', platformFilter);
      if (sentimentFilter) qs.set('sentiment', sentimentFilter);
      const res = await apiGet<{ mentions: MentionRow[] }>(`/social-listening/mentions?${qs}`);
      setMentions(res?.mentions || []);
    } catch {
      setMentions([]);
    } finally {
      setMentionsLoading(false);
    }
  }, [clientId, platformFilter, sentimentFilter]);

  // ── Load Keywords ─────────────────────────────────────────────────────────

  const loadKeywords = useCallback(async () => {
    setKwLoading(true);
    try {
      const res = await apiGet<KeywordRow[]>(`/social-listening/keywords?clientId=${clientId}`);
      setKeywords(res || []);
    } catch {
      setKeywords([]);
    } finally {
      setKwLoading(false);
    }
  }, [clientId]);

  const addKeyword = async () => {
    const kw = kwInput.trim();
    if (!kw) return;
    try {
      await apiPost('/social-listening/keywords', { keyword: kw, clientId });
      setKwInput('');
      loadKeywords();
    } catch {}
  };

  const toggleKeyword = async (kw: KeywordRow) => {
    try {
      await apiPost(`/social-listening/keywords/${kw.id}`, { is_active: !kw.is_active });
      loadKeywords();
    } catch {}
  };

  const deleteKeyword = async (id: string) => {
    try {
      await apiPost(`/social-listening/keywords/${id}/delete`, {});
      loadKeywords();
    } catch {}
  };

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => { loadPosts(); checkConnector(); loadReportei(); }, [loadPosts, checkConnector, loadReportei]);
  useEffect(() => { if (sub === 'mencoes') loadMentions(); }, [sub, loadMentions]);
  useEffect(() => { if (sub === 'keywords') loadKeywords(); }, [sub, loadKeywords]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Box>
      <Tabs value={sub} onChange={(_, v) => changeSub(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab value="posts" label="Posts" />
        <Tab value="mencoes" label="Menções" />
        <Tab value="keywords" label="Keywords" />
      </Tabs>

      {/* ── POSTS TAB ─────────────────────────────────────────────────────── */}
      {sub === 'posts' && (
        <Box>
          {/* Reportei KPI row */}
          {reporteiKpis.length > 0 && (
            <Grid container spacing={2} mb={3}>
              {reporteiKpis.map(k => (
                <Grid key={k.label} size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
                  <KpiCard label={k.label} value={k.value} delta={k.delta} />
                </Grid>
              ))}
            </Grid>
          )}

          {/* Toolbar */}
          <Stack direction="row" spacing={2} mb={2} alignItems="center" flexWrap="wrap" useFlexGap>
            <TextField
              select size="small" value={platformPosts}
              onChange={e => setPlatformPosts(e.target.value)}
              sx={{ minWidth: 140 }} label="Plataforma"
            >
              <MenuItem value="">Todas</MenuItem>
              <MenuItem value="instagram">Instagram</MenuItem>
              <MenuItem value="facebook">Facebook</MenuItem>
            </TextField>

            <Box flex={1} />

            {hasConnector && (
              <Button
                size="small" variant="outlined" startIcon={<IconRefresh size={16} />}
                onClick={syncPosts} disabled={syncing}
              >
                {syncing ? 'Sincronizando…' : 'Sincronizar agora'}
              </Button>
            )}
          </Stack>

          {postsError && <Alert severity="error" sx={{ mb: 2 }}>{postsError}</Alert>}

          {/* No connector CTA */}
          {hasConnector === false && posts.length === 0 && !postsLoading && (
            <Card variant="outlined" sx={{ borderRadius: 2, textAlign: 'center', py: 6 }}>
              <IconPlugConnected size={40} opacity={0.3} />
              <Typography variant="h6" mt={2} mb={1}>Instagram Business não conectado</Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Conecte a conta Instagram Business do cliente para ver e sincronizar os posts publicados.
              </Typography>
              <Button
                variant="contained" size="small"
                href={`/clients/${clientId}/identidade?sub=integracoes`}
              >
                Conectar Instagram
              </Button>
            </Card>
          )}

          {/* Loading */}
          {postsLoading && (
            <Stack alignItems="center" py={6}><CircularProgress size={32} /></Stack>
          )}

          {/* Empty state — connector ok but no posts yet */}
          {!postsLoading && hasConnector !== false && posts.length === 0 && (
            <Stack alignItems="center" py={6} spacing={1}>
              <Typography color="text.secondary">Nenhum post encontrado.</Typography>
              <Button size="small" variant="outlined" startIcon={<IconRefresh size={16} />}
                onClick={syncPosts} disabled={syncing}>
                {syncing ? 'Sincronizando…' : 'Buscar posts agora'}
              </Button>
            </Stack>
          )}

          {/* Posts grid */}
          {!postsLoading && posts.length > 0 && (
            <Grid container spacing={2}>
              {posts.map(p => (
                <Grid key={p.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                  <PostCard post={p} />
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {/* ── MENÇÕES TAB ───────────────────────────────────────────────────── */}
      {sub === 'mencoes' && (
        <Box>
          <Stack direction="row" spacing={2} mb={2} flexWrap="wrap" useFlexGap>
            <TextField select size="small" label="Plataforma" value={platformFilter}
              onChange={e => setPlatformFilter(e.target.value)} sx={{ minWidth: 140 }}>
              {PLATFORM_OPTS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Sentimento" value={sentimentFilter}
              onChange={e => setSentimentFilter(e.target.value)} sx={{ minWidth: 130 }}>
              {SENTIMENT_OPTS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </TextField>
            <Button size="small" variant="outlined" startIcon={<IconRefresh size={16} />}
              onClick={loadMentions}>Atualizar</Button>
          </Stack>

          {mentionsLoading
            ? <Stack alignItems="center" py={6}><CircularProgress size={32} /></Stack>
            : mentions.length === 0
              ? <Typography color="text.secondary" py={4} textAlign="center">Nenhuma menção encontrada.</Typography>
              : (
                <Stack spacing={1.5}>
                  {mentions.map(m => (
                    <Card key={m.id} variant="outlined" sx={{ borderRadius: 2 }}>
                      <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                        <Stack direction="row" spacing={1} alignItems="flex-start" mb={0.5}>
                          <Chip label={m.platform} size="small" sx={{ textTransform: 'capitalize' }} />
                          {m.sentiment && (
                            <Chip label={sentimentLabel(m.sentiment)} size="small"
                              color={sentimentColor(m.sentiment)} variant="outlined" />
                          )}
                          <Chip label={m.keyword} size="small" variant="outlined" />
                          <Box flex={1} />
                          <Typography variant="caption" color="text.disabled">{fmtDate(m.published_at)}</Typography>
                        </Stack>

                        <Typography variant="body2" sx={{
                          display: '-webkit-box', WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}>
                          {m.content}
                        </Typography>

                        {m.author && (
                          <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                            @{m.author}
                          </Typography>
                        )}

                        <Stack direction="row" spacing={1.5} mt={1}>
                          {m.engagement_likes != null && (
                            <Stack direction="row" spacing={0.4} alignItems="center">
                              <IconHeart size={13} />
                              <Typography variant="caption">{fmt(m.engagement_likes)}</Typography>
                            </Stack>
                          )}
                          {m.engagement_comments != null && (
                            <Stack direction="row" spacing={0.4} alignItems="center">
                              <IconMessage2 size={13} />
                              <Typography variant="caption">{fmt(m.engagement_comments)}</Typography>
                            </Stack>
                          )}
                          {m.url && (
                            <Box component="a" href={m.url} target="_blank" rel="noreferrer"
                              sx={{ display: 'flex', alignItems: 'center', color: 'primary.main', ml: 'auto' }}>
                              <IconExternalLink size={14} />
                            </Box>
                          )}
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              )
          }
        </Box>
      )}

      {/* ── KEYWORDS TAB ──────────────────────────────────────────────────── */}
      {sub === 'keywords' && (
        <Box>
          <Stack direction="row" spacing={1} mb={3}>
            <TextField
              size="small" label="Nova keyword" value={kwInput}
              onChange={e => setKwInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addKeyword()}
              sx={{ flex: 1, maxWidth: 320 }}
            />
            <Button variant="contained" size="small" startIcon={<IconPlus size={16} />}
              onClick={addKeyword} disabled={!kwInput.trim()}>
              Adicionar
            </Button>
          </Stack>

          {kwLoading
            ? <Stack alignItems="center" py={4}><CircularProgress size={28} /></Stack>
            : keywords.length === 0
              ? <Typography color="text.secondary">Nenhuma keyword cadastrada.</Typography>
              : (
                <Stack spacing={1}>
                  {keywords.map(kw => (
                    <Stack key={kw.id} direction="row" spacing={1} alignItems="center">
                      <Chip
                        label={kw.keyword}
                        color={kw.is_active ? 'primary' : 'default'}
                        variant={kw.is_active ? 'filled' : 'outlined'}
                        onClick={() => toggleKeyword(kw)}
                        sx={{ cursor: 'pointer' }}
                      />
                      {kw.category && (
                        <Typography variant="caption" color="text.secondary">{kw.category}</Typography>
                      )}
                      <Box flex={1} />
                      <Tooltip title="Remover">
                        <Box component="span" sx={{ cursor: 'pointer', color: 'error.main', display: 'flex' }}
                          onClick={() => deleteKeyword(kw.id)}>
                          <IconTrash size={16} />
                        </Box>
                      </Tooltip>
                    </Stack>
                  ))}
                </Stack>
              )
          }
        </Box>
      )}
    </Box>
  );
}
