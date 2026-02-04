'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { apiGet, apiPost } from '@/lib/api';

type ClientRow = {
  id: string;
  name: string;
  segment_primary?: string | null;
  city?: string | null;
};

type ClippingItem = {
  id: string;
  title: string;
  snippet?: string | null;
  url?: string | null;
  image_url?: string | null;
  score?: number | null;
  status?: string | null;
  type?: string | null;
  source_name?: string | null;
  source_url?: string | null;
  published_at?: string | null;
};

type ClippingStats = {
  total_items?: number;
  new_items?: number;
  triaged_items?: number;
  items_last_7_days?: number;
  avg_score?: number | null;
};

type SourceRow = {
  id: string;
  name: string;
  url: string;
  type: string;
  scope: string;
  client_id?: string | null;
  is_active: boolean;
  updated_at?: string | null;
};

type ClippingClientProps = {
  clientId?: string;
  noShell?: boolean;
};

const STATUS_OPTIONS = [
  { value: '', label: 'Todos status' },
  { value: 'NEW', label: 'Novos' },
  { value: 'TRIAGED', label: 'Triados' },
  { value: 'PINNED', label: 'Fixados' },
  { value: 'ARCHIVED', label: 'Arquivados' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'Todos tipos' },
  { value: 'NEWS', label: 'Noticias' },
  { value: 'TREND', label: 'Tendencias' },
];

const RECENCY_OPTIONS = [
  { value: '', label: 'Periodo' },
  { value: '24h', label: '24h' },
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
];

function formatNumber(value?: number | null) {
  if (!Number.isFinite(value)) return '0';
  return new Intl.NumberFormat('pt-BR').format(Number(value));
}

function formatDate(value?: string | null) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleDateString('pt-BR');
}

export default function ClippingClient({ clientId, noShell }: ClippingClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lockedClientId = clientId || searchParams.get('clientId') || '';
  const isLocked = Boolean(lockedClientId);

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null);
  const [stats, setStats] = useState<ClippingStats>({});
  const [items, setItems] = useState<ClippingItem[]>([]);
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [recencyFilter, setRecencyFilter] = useState('');
  const [minScore, setMinScore] = useState('');
  const [query, setQuery] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceType, setSourceType] = useState('RSS');
  const [sourceScope, setSourceScope] = useState('GLOBAL');
  const [ingestUrl, setIngestUrl] = useState('');
  const [savingSource, setSavingSource] = useState(false);
  const [ingesting, setIngesting] = useState(false);

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
    try {
      const response = await apiGet<any>('/clipping/dashboard');
      const payload = response?.stats ?? response?.data ?? response ?? {};
      setStats({
        total_items: payload.total_items ?? 0,
        new_items: payload.new_items ?? 0,
        triaged_items: payload.triaged_items ?? 0,
        items_last_7_days: payload.items_last_7_days ?? payload.items_this_week ?? 0,
        avg_score: payload.avg_score ?? 0,
      });
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar dashboard.');
    }
  }, []);

  const loadSources = useCallback(async () => {
    try {
      if (!selectedClient) {
        const response = await apiGet<SourceRow[]>('/clipping/sources?scope=GLOBAL');
        setSources(response || []);
        return;
      }

      const [globalSources, clientSources] = await Promise.all([
        apiGet<SourceRow[]>('/clipping/sources?scope=GLOBAL'),
        apiGet<SourceRow[]>(
          `/clipping/sources?scope=CLIENT&clientId=${encodeURIComponent(selectedClient.id)}`
        ),
      ]);

      const merged = [...(clientSources || []), ...(globalSources || [])];
      const seen = new Set<string>();
      const deduped = merged.filter((source) => {
        if (seen.has(source.id)) return false;
        seen.add(source.id);
        return true;
      });
      setSources(deduped);
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar fontes.');
    }
  }, [selectedClient]);

  const loadItems = useCallback(async () => {
    const qs = new URLSearchParams();
    if (statusFilter) qs.set('status', statusFilter);
    if (typeFilter) qs.set('type', typeFilter);
    if (recencyFilter) qs.set('recency', recencyFilter);
    if (minScore) qs.set('minScore', minScore);
    if (query) qs.set('q', query);
    if (selectedClient?.id) qs.set('clientId', selectedClient.id);

    setLoading(true);
    setError('');
    try {
      const response = await apiGet<ClippingItem[]>(`/clipping/items?${qs.toString()}`);
      setItems(response || []);
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar itens do radar.');
    } finally {
      setLoading(false);
    }
  }, [minScore, query, recencyFilter, selectedClient, statusFilter, typeFilter]);

  useEffect(() => {
    if (isLocked && lockedClientId) {
      loadClientDetail(lockedClientId);
    } else {
      loadClients();
    }
  }, [isLocked, lockedClientId, loadClientDetail, loadClients]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (!selectedClient) return;
    loadItems();
    loadSources();
  }, [selectedClient, loadItems, loadSources]);

  const handleSaveSource = async () => {
    if (!sourceName.trim() || !sourceUrl.trim()) return;
    setSavingSource(true);
    setError('');
    setSuccess('');
    try {
      await apiPost('/clipping/sources', {
        scope: sourceScope,
        client_id: sourceScope === 'CLIENT' ? selectedClient?.id : undefined,
        name: sourceName.trim(),
        url: sourceUrl.trim(),
        type: sourceType,
      });
      setSourceName('');
      setSourceUrl('');
      setSuccess('Fonte adicionada.');
      await loadSources();
    } catch (err: any) {
      setError(err?.message || 'Falha ao salvar fonte.');
    } finally {
      setSavingSource(false);
    }
  };

  const handleIngestUrl = async () => {
    if (!ingestUrl.trim()) return;
    setIngesting(true);
    setError('');
    setSuccess('');
    try {
      await apiPost('/clipping/items/ingest-url', { url: ingestUrl.trim() });
      setSuccess('URL ingerida com sucesso.');
      setIngestUrl('');
      await loadItems();
    } catch (err: any) {
      setError(err?.message || 'Falha ao ingerir URL.');
    } finally {
      setIngesting(false);
    }
  };

  const totalLabel = useMemo(() => `${items.length} itens`, [items.length]);

  if (loading && clients.length === 0) {
    return (
      <div className="loading-screen">
        <div className="pulse">Carregando Radar...</div>
      </div>
    );
  }

  const content = (
      <div className="page-content page-content-left">
        <div>
          <h1>Radar & Clipping</h1>
          <p>Fontes configuradas, triagem inteligente e acionamento de posts.</p>
        </div>

        {error ? <div className="notice error">{error}</div> : null}
        {success ? <div className="notice success">{success}</div> : null}

        <div className="edro-hero-stats">
          <div className="stat-card">
            <span>Total</span>
            <strong>{formatNumber(stats.total_items)}</strong>
          </div>
          <div className="stat-card">
            <span>Novos</span>
            <strong>{formatNumber(stats.new_items)}</strong>
          </div>
          <div className="stat-card">
            <span>Triados</span>
            <strong>{formatNumber(stats.triaged_items)}</strong>
          </div>
          <div className="stat-card">
            <span>Ultimos 7 dias</span>
            <strong>{formatNumber(stats.items_last_7_days)}</strong>
          </div>
          <div className="stat-card accent">
            <span>Score medio</span>
            <strong>{formatNumber(stats.avg_score)}</strong>
          </div>
        </div>

        <div className="filter-bar">
          <div className="filter-meta">
            <span>Cliente</span>
            <strong>{selectedClient?.name || 'Global'}</strong>
            <small>{selectedClient?.segment_primary || 'Radar global'}</small>
          </div>
          <div className="filter-actions">
            <select
              className="edro-select"
              value={selectedClient?.id || ''}
              onChange={(event) => {
                const match = clients.find((client) => client.id === event.target.value) || null;
                setSelectedClient(match);
                if (match) router.replace(`/clipping?clientId=${match.id}`);
              }}
              disabled={isLocked}
            >
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
            <select className="edro-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select className="edro-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              {TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select className="edro-select" value={recencyFilter} onChange={(e) => setRecencyFilter(e.target.value)}>
              {RECENCY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <input
              className="edro-input"
              placeholder="Score minimo"
              value={minScore}
              onChange={(event) => setMinScore(event.target.value)}
            />
            <input
              className="edro-input"
              placeholder="Buscar titulo ou resumo"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <button className="btn primary" type="button" onClick={loadItems}>
              Atualizar
            </button>
          </div>
        </div>

        <div className="panel-grid clipping-layout">
          <aside className="panel-sidebar space-y-4">
            <div className="card">
              <div className="card-top">
                <span className="badge">Fontes</span>
              </div>
              <div className="detail-list">
                {sources.length ? (
                  sources.map((source) => (
                    <div key={source.id} className="copy-block">
                      <div className="card-title">
                        <h3>{source.name}</h3>
                        <span className="status">{source.type}</span>
                      </div>
                      <p className="card-text">{source.url}</p>
                      <div className="card-footer">
                        <span className="chip">{source.scope}</span>
                        <span className="text-xs text-slate-400">{source.is_active ? 'Ativa' : 'Pausada'}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty">Nenhuma fonte cadastrada.</div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-top">
                <span className="badge">Nova fonte</span>
              </div>
              <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
                <label className="field">
                  Nome
                  <input value={sourceName} onChange={(event) => setSourceName(event.target.value)} />
                </label>
                <label className="field">
                  URL
                  <input value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} />
                </label>
                <label className="field">
                  Tipo
                  <select value={sourceType} onChange={(event) => setSourceType(event.target.value)}>
                    <option value="RSS">RSS</option>
                    <option value="URL">URL</option>
                    <option value="YOUTUBE">YOUTUBE</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </label>
                <label className="field">
                  Escopo
                  <select value={sourceScope} onChange={(event) => setSourceScope(event.target.value)}>
                    <option value="GLOBAL">Global</option>
                    <option value="CLIENT">Cliente</option>
                  </select>
                </label>
                <button className="btn primary" type="button" onClick={handleSaveSource} disabled={savingSource}>
                  {savingSource ? 'Salvando...' : 'Adicionar fonte'}
                </button>
              </div>
            </div>

            <div className="card">
              <div className="card-top">
                <span className="badge">Ingerir URL</span>
              </div>
              <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
                <label className="field">
                  URL
                  <input value={ingestUrl} onChange={(event) => setIngestUrl(event.target.value)} />
                </label>
                <button className="btn primary" type="button" onClick={handleIngestUrl} disabled={ingesting}>
                  {ingesting ? 'Ingerindo...' : 'Ingerir'}
                </button>
              </div>
            </div>
          </aside>

          <section className="panel-main">
            <div className="card">
              <div className="card-top">
                <span className="badge">Itens ({totalLabel})</span>
              </div>
              <div className="clipping-grid">
                {items.length ? (
                  items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="clipping-card"
                      onClick={() => router.push(`/clipping/${item.id}`)}
                    >
                      <div className="clipping-card-thumb">
                        {item.image_url ? (
                          <img src={item.image_url} alt="" />
                        ) : (
                          <div className="clipping-thumb-placeholder">
                            <span className="material-symbols-outlined">image</span>
                          </div>
                        )}
                      </div>
                      <div className="clipping-card-body">
                        <div className="card-title">
                          <h3>{item.title}</h3>
                          <span className="status">{item.status || 'NEW'}</span>
                        </div>
                        <p className="card-text">{item.snippet || 'Sem resumo.'}</p>
                        <div className="card-footer">
                          <div className="card-tags">
                            <span className="chip">{item.type || 'NEWS'}</span>
                            <span className="chip">Score {formatNumber(item.score)}</span>
                          </div>
                          <div className="text-xs text-slate-400">{formatDate(item.published_at)}</div>
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="empty">Nenhum item encontrado.</div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
  );

  if (noShell) {
    return content;
  }

  return (
    <AppShell
      title="Radar"
      topbarLeft={
        <nav className="flex items-center space-x-2 text-sm text-slate-400">
          <span className="text-muted">Radar</span>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="text-ink font-medium">Clipping & Noticias</span>
        </nav>
      }
    >
      {content}
    </AppShell>
  );
}
