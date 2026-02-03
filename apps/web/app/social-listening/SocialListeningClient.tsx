'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api';

type ClientRow = {
  id: string;
  name: string;
  country?: string | null;
  uf?: string | null;
  city?: string | null;
  segment_primary?: string | null;
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

type TrendRow = {
  keyword: string;
  platform: string;
  mention_count: number;
  total_engagement: number;
  average_sentiment: number;
  created_at?: string;
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

type ReporteiKpi = {
  metric: string;
  value: number;
};

type ReporteiByFormat = {
  format: string;
  score: number;
  kpis?: ReporteiKpi[];
  notes?: string[];
};

type ReporteiByTag = {
  tag: string;
  score: number;
  kpis?: ReporteiKpi[];
};

type ReporteiPayload = {
  by_format?: ReporteiByFormat[];
  by_tag?: ReporteiByTag[];
  editorial_insights?: string[];
  observed_at?: string;
  window?: string;
};

type ReporteiInsight = {
  platform?: string;
  time_window?: string;
  created_at?: string;
  payload?: ReporteiPayload;
};

type ReporteiResponse = {
  items?: ReporteiInsight[];
  updated_at?: string | null;
};

type SocialListeningClientProps = {
  clientId?: string;
};

const PLATFORM_OPTIONS = [
  { value: '', label: 'Todas plataformas' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'twitter', label: 'X / Twitter' },
  { value: 'reddit', label: 'Reddit' },
];

const SENTIMENT_OPTIONS = [
  { value: '', label: 'Todos sentimentos' },
  { value: 'positive', label: 'Positivo' },
  { value: 'neutral', label: 'Neutro' },
  { value: 'negative', label: 'Negativo' },
];

const KPI_LABELS: Record<string, string> = {
  impressions: 'Impressoes',
  reach: 'Alcance',
  engagements: 'Engajamentos',
  engagement_rate: 'Taxa de engajamento',
  clicks: 'Cliques',
  ctr: 'CTR',
  cpc: 'CPC',
  cpm: 'CPM',
  conversions: 'Conversoes',
  cost: 'Custo',
};

const RATE_METRICS = new Set(['ctr', 'engagement_rate']);
const CURRENCY_METRICS = new Set(['cpc', 'cpm', 'cost']);

function formatNumber(value?: number | null) {
  if (!Number.isFinite(value)) return '0';
  return new Intl.NumberFormat('pt-BR').format(Number(value));
}

function formatCurrency(value?: number | null) {
  if (!Number.isFinite(value)) return '--';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
}

function formatDate(value?: string | null) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString('pt-BR');
}

function formatKpiValue(metric: string, value: number) {
  if (!Number.isFinite(value)) return '--';
  if (RATE_METRICS.has(metric)) {
    const display = value > 1 ? value : value * 100;
    return `${display.toFixed(2)}%`;
  }
  if (CURRENCY_METRICS.has(metric)) {
    return formatCurrency(value);
  }
  return formatNumber(value);
}

function pickTop<T extends { score?: number }>(items?: T[]) {
  if (!items || items.length === 0) return null;
  return [...items].sort((a, b) => Number(b.score ?? 0) - Number(a.score ?? 0))[0] || null;
}

function getSentimentLabel(sentiment?: string | null) {
  if (sentiment === 'positive') return 'Positivo';
  if (sentiment === 'negative') return 'Negativo';
  if (sentiment === 'neutral') return 'Neutro';
  return 'Indefinido';
}

export default function SocialListeningClient({ clientId }: SocialListeningClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lockedClientId = clientId || searchParams.get('clientId') || '';
  const isLocked = Boolean(lockedClientId);

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null);
  const [keywords, setKeywords] = useState<KeywordRow[]>([]);
  const [mentions, setMentions] = useState<MentionRow[]>([]);
  const [trends, setTrends] = useState<TrendRow[]>([]);
  const [stats, setStats] = useState<StatsResponse>({});
  const [reporteiItems, setReporteiItems] = useState<ReporteiInsight[]>([]);
  const [reporteiUpdatedAt, setReporteiUpdatedAt] = useState<string | null>(null);
  const [reporteiLoading, setReporteiLoading] = useState(false);
  const [reporteiError, setReporteiError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('');
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState('');
  const [keywordFilter, setKeywordFilter] = useState('');
  const [collecting, setCollecting] = useState(false);

  const loadClients = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiGet<ClientRow[]>('/clients');
      setClients(response || []);
      if (response?.length) {
        const desired = lockedClientId;
        const match = desired ? response.find((client) => client.id === desired) : response[0];
        setSelectedClient(match || response[0]);
      }
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar clientes.');
    } finally {
      setLoading(false);
    }
  }, [lockedClientId]);

  const loadClientDetail = useCallback(async (id: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await apiGet<ClientRow>(`/clients/${id}`);
      if (response?.id) {
        setSelectedClient(response);
        setClients([response]);
      }
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar cliente.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    if (!selectedClient) return;
    try {
      const response = await apiGet<StatsResponse>(`/social-listening/stats?clientId=${selectedClient.id}`);
      setStats(response || {});
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar estatisticas.');
    }
  }, [selectedClient]);

  const loadKeywords = useCallback(async () => {
    if (!selectedClient) return;
    try {
      const response = await apiGet<KeywordRow[]>(
        `/social-listening/keywords?clientId=${selectedClient.id}`
      );
      setKeywords(response || []);
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar keywords.');
    }
  }, [selectedClient]);

  const loadTrends = useCallback(async () => {
    if (!selectedClient) return;
    const qs = new URLSearchParams();
    qs.set('clientId', selectedClient.id);
    if (platformFilter) qs.set('platform', platformFilter);
    if (keywordFilter) qs.set('keyword', keywordFilter);
    try {
      const response = await apiGet<TrendRow[]>(`/social-listening/trends?${qs.toString()}`);
      setTrends(response || []);
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar tendencias.');
    }
  }, [selectedClient, platformFilter, keywordFilter]);

  const loadMentions = useCallback(async () => {
    if (!selectedClient) return;
    const qs = new URLSearchParams();
    qs.set('clientId', selectedClient.id);
    if (platformFilter) qs.set('platform', platformFilter);
    if (sentimentFilter) qs.set('sentiment', sentimentFilter);
    if (keywordFilter) qs.set('keyword', keywordFilter);
    if (search) qs.set('q', search);
    try {
      const response = await apiGet<{ mentions: MentionRow[] }>(
        `/social-listening/mentions?${qs.toString()}`
      );
      setMentions(response?.mentions || []);
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar mencoes.');
    }
  }, [keywordFilter, platformFilter, search, selectedClient, sentimentFilter]);

  const loadReportei = useCallback(async () => {
    if (!selectedClient) return;
    setReporteiLoading(true);
    setReporteiError('');
    try {
      const response = await apiGet<ReporteiResponse>(
        `/social-listening/reportei?clientId=${selectedClient.id}`
      );
      setReporteiItems(response?.items || []);
      setReporteiUpdatedAt(response?.updated_at || null);
    } catch (err: any) {
      setReporteiItems([]);
      setReporteiUpdatedAt(null);
      setReporteiError(err?.message || 'Falha ao carregar Reportei.');
    } finally {
      setReporteiLoading(false);
    }
  }, [selectedClient]);

  useEffect(() => {
    if (isLocked && lockedClientId) {
      loadClientDetail(lockedClientId);
    } else {
      loadClients();
    }
  }, [isLocked, lockedClientId, loadClients, loadClientDetail]);

  useEffect(() => {
    if (!selectedClient) return;
    loadStats();
    loadKeywords();
    loadTrends();
    loadMentions();
    loadReportei();
  }, [selectedClient, loadStats, loadKeywords, loadMentions, loadTrends, loadReportei]);

  useEffect(() => {
    if (!selectedClient) return;
    loadMentions();
    loadTrends();
  }, [platformFilter, sentimentFilter, keywordFilter, search, selectedClient, loadMentions, loadTrends]);

  const handleAddKeyword = async () => {
    if (!keywordInput.trim() || !selectedClient) return;
    setError('');
    setSuccess('');
    try {
      await apiPost('/social-listening/keywords', {
        keyword: keywordInput.trim(),
        category: categoryInput.trim() || undefined,
        client_id: selectedClient.id,
      });
      setKeywordInput('');
      setCategoryInput('');
      setSuccess('Keyword adicionada.');
      await loadKeywords();
    } catch (err: any) {
      setError(err?.message || 'Falha ao adicionar keyword.');
    }
  };

  const toggleKeyword = async (keyword: KeywordRow) => {
    setError('');
    try {
      await apiPatch(`/social-listening/keywords/${keyword.id}`, { is_active: !keyword.is_active });
      await loadKeywords();
    } catch (err: any) {
      setError(err?.message || 'Falha ao atualizar keyword.');
    }
  };

  const deleteKeyword = async (keyword: KeywordRow) => {
    const ok = window.confirm(`Remover keyword "${keyword.keyword}"?`);
    if (!ok) return;
    setError('');
    try {
      await apiDelete(`/social-listening/keywords/${keyword.id}`);
      await loadKeywords();
    } catch (err: any) {
      setError(err?.message || 'Falha ao remover keyword.');
    }
  };

  const handleCollect = async () => {
    if (!selectedClient) return;
    setCollecting(true);
    setError('');
    setSuccess('');
    try {
      const body: Record<string, any> = { clientId: selectedClient.id, limit: 20 };
      if (platformFilter) body.platforms = [platformFilter];
      await apiPost('/social-listening/collect', body);
      setSuccess('Coleta disparada. Atualizando resultados...');
      await loadStats();
      await loadMentions();
      await loadTrends();
    } catch (err: any) {
      setError(err?.message || 'Falha ao coletar mencoes.');
    } finally {
      setCollecting(false);
    }
  };

  const topKeywords = useMemo(() => stats.top_keywords || [], [stats]);
  const platforms = useMemo(() => stats.platforms || [], [stats]);
  const summary = stats.summary || {};

  if (loading && clients.length === 0) {
    return (
      <div className="loading-screen">
        <div className="pulse">Carregando Social Listening...</div>
      </div>
    );
  }

  return (
    <AppShell
      title="Social Listening"
      topbarLeft={
        <nav className="flex items-center space-x-2 text-sm text-slate-400">
          <span className="text-muted">Radar</span>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="text-ink font-medium">Social Listening</span>
        </nav>
      }
    >
      <div className="page-content">
        <div>
          <h1>Social Listening</h1>
          <p>Monitoramento em tempo real das conversas e tendencias para cada cliente.</p>
        </div>

        {error ? <div className="notice error">{error}</div> : null}
        {success ? <div className="notice success">{success}</div> : null}

        <div className="edro-hero-stats">
          <div className="stat-card">
            <span>Total 7 dias</span>
            <strong>{formatNumber(summary.total)}</strong>
          </div>
          <div className="stat-card">
            <span>Positivas</span>
            <strong>{formatNumber(summary.positive)}</strong>
          </div>
          <div className="stat-card">
            <span>Neutras</span>
            <strong>{formatNumber(summary.neutral)}</strong>
          </div>
          <div className="stat-card">
            <span>Negativas</span>
            <strong>{formatNumber(summary.negative)}</strong>
          </div>
          <div className="stat-card accent">
            <span>Sentimento medio</span>
            <strong>{formatNumber(summary.avg_score)}%</strong>
          </div>
        </div>

        <div className="filter-bar">
          <div className="filter-meta">
            <span>Cliente</span>
            <strong>{selectedClient?.name || 'Global'}</strong>
            <small>
              {selectedClient?.segment_primary
                ? `${selectedClient.segment_primary} • ${selectedClient.city || ''}`
                : 'Base global'}
            </small>
          </div>
          <div className="filter-actions">
            <select
              className="edro-select"
              value={selectedClient?.id || ''}
              onChange={(event) => {
                const match = clients.find((client) => client.id === event.target.value) || null;
                setSelectedClient(match);
                if (match) router.replace(`/social-listening?clientId=${match.id}`);
              }}
              disabled={isLocked}
            >
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
            <select
              className="edro-select"
              value={platformFilter}
              onChange={(event) => setPlatformFilter(event.target.value)}
            >
              {PLATFORM_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              className="edro-select"
              value={sentimentFilter}
              onChange={(event) => setSentimentFilter(event.target.value)}
            >
              {SENTIMENT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <input
              className="edro-input"
              placeholder="Buscar por termo ou autor"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <button className="btn primary" type="button" onClick={handleCollect} disabled={collecting}>
              {collecting ? 'Coletando...' : 'Atualizar'}
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-top flex items-center justify-between">
            <span className="badge">Reportei Performance</span>
            <span className="text-xs text-muted">
              {reporteiUpdatedAt ? `Atualizado em ${formatDate(reporteiUpdatedAt)}` : 'Sem atualizacao recente'}
            </span>
          </div>

          {reporteiError ? <div className="notice error">{reporteiError}</div> : null}

          {reporteiLoading ? (
            <div className="empty">Carregando dados do Reportei...</div>
          ) : reporteiItems.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {reporteiItems.map((item, index) => {
                const payload = item.payload || {};
                const topFormat = pickTop(payload.by_format);
                const topTag = pickTop(payload.by_tag);
                const kpis = (topFormat?.kpis?.length ? topFormat.kpis : topTag?.kpis || []).slice(0, 4);
                const editorial = (payload.editorial_insights || []).slice(0, 3);

                return (
                  <div key={item.platform || `reportei-${index}`} className="copy-block">
                    <div className="card-title">
                      <h3>{item.platform || 'Plataforma'}</h3>
                      <span className="status">{item.time_window || '30d'}</span>
                    </div>

                    <div className="space-y-2 text-sm text-muted">
                      <div className="flex items-center justify-between">
                        <span>Top formato</span>
                        <strong className="text-ink">
                          {topFormat?.format || 'N/A'} {topFormat?.score != null ? `(${Math.round(topFormat.score)})` : ''}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Top tag</span>
                        <strong className="text-ink">
                          {topTag?.tag || 'N/A'} {topTag?.score != null ? `(${Math.round(topTag.score)})` : ''}
                        </strong>
                      </div>
                    </div>

                    {kpis.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {kpis.map((kpi) => (
                          <span key={`${item.platform}-${kpi.metric}`} className="chip">
                            {KPI_LABELS[kpi.metric] || kpi.metric}: {formatKpiValue(kpi.metric, kpi.value)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-3 text-xs text-muted">Sem KPIs disponiveis.</div>
                    )}

                    {editorial.length ? (
                      <div className="mt-3 text-xs text-muted">
                        <strong className="text-ink">Insights:</strong>
                        <ul className="list-disc list-inside mt-1 space-y-1">
                          {editorial.map((line, idx) => (
                            <li key={`${item.platform}-insight-${idx}`}>{line}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty">Sem dados do Reportei para este cliente.</div>
          )}
        </div>

        <div className="panel-grid">
          <aside className="panel-sidebar space-y-4">
            <div className="card">
              <div className="card-top">
                <span className="badge">Keywords ativas</span>
              </div>
              <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
                <label className="field">
                  Nova keyword
                  <input
                    value={keywordInput}
                    onChange={(event) => setKeywordInput(event.target.value)}
                    placeholder="Ex: mobilidade"
                  />
                </label>
                <label className="field">
                  Categoria
                  <input
                    value={categoryInput}
                    onChange={(event) => setCategoryInput(event.target.value)}
                    placeholder="Ex: setor"
                  />
                </label>
                <button className="btn primary" type="button" onClick={handleAddKeyword}>
                  Adicionar keyword
                </button>
              </div>
              <div className="detail-list">
                {keywords.length ? (
                  keywords.map((keyword) => (
                    <div key={keyword.id} className="copy-block">
                      <div className="card-title">
                        <h3>{keyword.keyword}</h3>
                        <span className="status">{keyword.category || 'geral'}</span>
                      </div>
                      <div className="card-actions">
                        <button className="btn ghost" type="button" onClick={() => toggleKeyword(keyword)}>
                          {keyword.is_active ? 'Desativar' : 'Ativar'}
                        </button>
                        <button className="btn danger" type="button" onClick={() => deleteKeyword(keyword)}>
                          Remover
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty">Nenhuma keyword ativa.</div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-top">
                <span className="badge">Tendencias (24h)</span>
              </div>
              <div className="detail-list">
                {trends.length ? (
                  trends.map((trend) => (
                    <div key={`${trend.keyword}-${trend.platform}`} className="copy-block">
                      <div className="card-title">
                        <h3>{trend.keyword}</h3>
                        <span className="status">{trend.platform}</span>
                      </div>
                      <p className="card-text">
                        {formatNumber(trend.mention_count)} mencoes • {formatNumber(trend.total_engagement)} engajamentos
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="empty">Sem tendencias disponiveis.</div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-top">
                <span className="badge">Plataformas</span>
              </div>
              <div className="detail-list">
                {platforms.length ? (
                  platforms.map((platform) => (
                    <div key={platform.platform} className="detail-list" style={{ gap: '4px' }}>
                      <div className="card-title">
                        <h3>{platform.platform}</h3>
                        <span className="status">{formatNumber(platform.total)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty">Sem dados por plataforma.</div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-top">
                <span className="badge">Top keywords</span>
              </div>
              <div className="detail-list">
                {topKeywords.length ? (
                  topKeywords.map((keyword) => (
                    <div key={keyword.keyword} className="card-title">
                      <h3>{keyword.keyword}</h3>
                      <span className="status">{formatNumber(keyword.total)}</span>
                    </div>
                  ))
                ) : (
                  <div className="empty">Sem palavras-chave.</div>
                )}
              </div>
            </div>
          </aside>

          <section className="panel-main">
            <div className="card">
              <div className="card-top">
                <span className="badge">Mencoes recentes</span>
                <select
                  className="edro-select"
                  value={keywordFilter}
                  onChange={(event) => setKeywordFilter(event.target.value)}
                >
                  <option value="">Todas keywords</option>
                  {keywords.map((keyword) => (
                    <option key={keyword.id} value={keyword.keyword}>
                      {keyword.keyword}
                    </option>
                  ))}
                </select>
              </div>

              <div className="detail-list">
                {mentions.length ? (
                  mentions.map((mention) => (
                    <div key={mention.id} className="copy-block">
                      <div className="card-title">
                        <div>
                          <h3>{mention.author || 'Anonimo'}</h3>
                          <p>{mention.platform} • {mention.keyword}</p>
                        </div>
                        <span className="status">{getSentimentLabel(mention.sentiment)}</span>
                      </div>
                      <p className="card-text">{mention.content}</p>
                      <div className="card-footer">
                        <div className="card-tags">
                          <span className="chip">❤ {formatNumber(mention.engagement_likes)}</span>
                          <span className="chip">💬 {formatNumber(mention.engagement_comments)}</span>
                          <span className="chip">↗ {formatNumber(mention.engagement_shares)}</span>
                          <span className="chip">▶ {formatNumber(mention.engagement_views)}</span>
                        </div>
                        <div className="text-xs text-slate-400">{formatDate(mention.published_at)}</div>
                      </div>
                      {mention.url ? (
                        <a className="text-xs text-primary" href={mention.url} target="_blank" rel="noreferrer">
                          Abrir fonte
                        </a>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className="empty">Nenhuma mencao encontrada.</div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
