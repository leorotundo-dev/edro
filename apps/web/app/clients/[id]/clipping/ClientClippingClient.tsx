'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ClippingClient from '@/app/clipping/ClippingClient';
import ClippingDetailClient from '@/app/clipping/ClippingDetailClient';
import ClientClippingKeywordsQuickClient from './ClientClippingKeywordsQuickClient';
import ClientSocialListeningQuickClient from './ClientSocialListeningQuickClient';
import { apiGet, apiPost } from '@/lib/api';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import TextField from '@mui/material/TextField';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { IconWorldSearch, IconExternalLink } from '@tabler/icons-react';

type ClientClippingClientProps = {
  clientId: string;
  forceTab?: TabValue;
};

type TabValue = 'clipping' | 'social' | 'perplexity';

// ── Perplexity Search Panel ─────────────────────────────────────────

function PerplexitySearchPanel({ clientId }: { clientId: string }) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<{ content: string; citations: string[] } | null>(null);
  const [searching, setSearching] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [trendingLoading, setTrendingLoading] = useState(false);

  useEffect(() => {
    apiGet<{ data: { configured: boolean } }>('/edro/perplexity/status')
      .then((r) => setConfigured(r.data.configured))
      .catch(() => setConfigured(false));
  }, []);

  if (configured === null) return <CircularProgress size={24} />;
  if (configured === false) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <IconWorldSearch size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Pesquisa Web não configurada
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Configure a TAVILY_API_KEY no servidor para ativar pesquisa web em tempo real.
        </Typography>
      </Box>
    );
  }

  const doSearch = async () => {
    if (!query.trim() || searching) return;
    setSearching(true);
    try {
      const res = await apiPost<{ data: { content: string; citations: string[] } }>('/edro/perplexity/search', {
        query: query.trim(),
        search_recency_filter: 'week',
        max_tokens: 1024,
      });
      setResult(res.data);
    } catch {
      setResult({ content: 'Erro ao buscar. Tente novamente.', citations: [] });
    } finally {
      setSearching(false);
    }
  };

  const fetchTrending = async () => {
    setTrendingLoading(true);
    try {
      const res = await apiPost<{ data: { content: string; citations: string[] } }>(
        `/edro/clients/${clientId}/perplexity/trending`,
        {},
      );
      setResult(res.data);
    } catch {
      setResult({ content: 'Erro ao buscar tendências. Tente novamente.', citations: [] });
    } finally {
      setTrendingLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Quick actions */}
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Button
          variant="outlined"
          size="small"
          startIcon={trendingLoading ? <CircularProgress size={14} /> : <IconWorldSearch size={16} />}
          onClick={fetchTrending}
          disabled={trendingLoading}
          sx={{ textTransform: 'none' }}
        >
          Tendências do Cliente
        </Button>
      </Stack>

      {/* Search bar */}
      <Stack direction="row" spacing={1}>
        <TextField
          size="small"
          fullWidth
          placeholder="Pesquisar tendências, notícias, dados de mercado..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && doSearch()}
        />
        <Button
          variant="contained"
          size="small"
          onClick={doSearch}
          disabled={searching || !query.trim()}
          sx={{ textTransform: 'none', minWidth: 100 }}
        >
          {searching ? 'Buscando...' : 'Pesquisar'}
        </Button>
      </Stack>

      {/* Results */}
      {(searching || trendingLoading) && !result && (
        <Stack alignItems="center" spacing={1} sx={{ py: 4 }}>
          <CircularProgress size={28} />
          <Typography variant="body2" color="text.secondary">Pesquisando na web...</Typography>
        </Stack>
      )}

      {result && (
        <Box sx={{ bgcolor: '#fafafa', borderRadius: 2, p: 2.5, border: '1px solid #eee' }}>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 2, lineHeight: 1.7 }}>
            {result.content}
          </Typography>
          {result.citations.length > 0 && (
            <Box sx={{ borderTop: '1px solid #eee', pt: 1.5 }}>
              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                Fontes ({result.citations.length})
              </Typography>
              <Stack spacing={0.5}>
                {result.citations.slice(0, 10).map((url, idx) => (
                  <Stack key={idx} direction="row" alignItems="center" spacing={0.5}>
                    <IconExternalLink size={12} style={{ opacity: 0.5, flexShrink: 0 }} />
                    <Typography
                      variant="caption"
                      color="primary"
                      component="a"
                      href={url}
                      target="_blank"
                      rel="noopener"
                      sx={{
                        textDecoration: 'none',
                        '&:hover': { textDecoration: 'underline' },
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'block',
                      }}
                    >
                      {url}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}

// ── Main Component ──────────────────────────────────────────────────

export default function ClientClippingClient({ clientId, forceTab }: ClientClippingClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [tab, setTab] = useState<TabValue>(() => {
    if (forceTab) return forceTab;
    const t = searchParams.get('tab');
    if (t === 'social') return 'social';
    if (t === 'perplexity') return 'perplexity';
    return 'clipping';
  });

  const itemId = searchParams.get('item');
  const baseRoute = forceTab ? `/clients/${clientId}/inteligencia` : `/clients/${clientId}/clipping`;

  useEffect(() => {
    if (forceTab) {
      setTab(forceTab);
      return;
    }
    const t = searchParams.get('tab');
    if (t === 'social') setTab('social');
    else if (t === 'perplexity') setTab('perplexity');
    else setTab('clipping');
  }, [forceTab, searchParams]);

  const changeTab = (value: TabValue) => {
    if (forceTab) return;
    setTab(value);
    const next = new URLSearchParams(searchParams.toString());
    next.delete('item');
    if (value === 'clipping') next.delete('tab');
    else next.set('tab', value);
    const qs = next.toString();
    router.replace(qs ? `${baseRoute}?${qs}` : baseRoute);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
      {!forceTab && (
        <Tabs
          value={tab}
          onChange={(_, value) => changeTab(value)}
          variant="scrollable"
          allowScrollButtonsMobile
          sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
        >
          <Tab label="Clipping" value="clipping" />
          <Tab label="Social Listening" value="social" />
          <Tab
            label={
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <IconWorldSearch size={16} />
                <span>Pesquisa Web</span>
              </Stack>
            }
            value="perplexity"
          />
        </Tabs>
      )}

      {tab === 'clipping' ? (
        itemId ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
            <Box>
              <Button
                size="small"
                variant="text"
                onClick={() => {
                  const next = new URLSearchParams(searchParams.toString());
                  next.delete('item');
                  const qs = next.toString();
                  router.replace(qs ? `${baseRoute}?${qs}` : baseRoute);
                }}
              >
                Voltar
              </Button>
            </Box>
            <ClippingDetailClient itemId={itemId} noShell embedded backHref={baseRoute} />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
            <ClientClippingKeywordsQuickClient clientId={clientId} />
            <ClippingClient clientId={clientId} noShell embedded />
          </Box>
        )
      ) : tab === 'social' ? (
        <ClientSocialListeningQuickClient clientId={clientId} />
      ) : (
        <PerplexitySearchPanel clientId={clientId} />
      )}
    </Box>
  );
}
