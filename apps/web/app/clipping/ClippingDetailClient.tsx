'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { apiGet, apiPost } from '@/lib/api';

type ClientRow = {
  id: string;
  name: string;
};

type ActionRow = {
  id: string;
  action: string;
  payload?: Record<string, any> | null;
  created_at?: string | null;
};

type ClippingItemDetail = {
  id: string;
  title: string;
  snippet?: string | null;
  content?: string | null;
  url?: string | null;
  image_url?: string | null;
  score?: number | null;
  status?: string | null;
  type?: string | null;
  source_name?: string | null;
  source_url?: string | null;
  published_at?: string | null;
  actions?: ActionRow[];
};

type ClippingDetailClientProps = {
  itemId: string;
};

function formatNumber(value?: number | null) {
  if (!Number.isFinite(value)) return '0';
  return new Intl.NumberFormat('pt-BR').format(Number(value));
}

function formatDate(value?: string | null) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString('pt-BR');
}

export default function ClippingDetailClient({ itemId }: ClippingDetailClientProps) {
  const router = useRouter();
  const [item, setItem] = useState<ClippingItemDetail | null>(null);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [clientId, setClientId] = useState('');
  const [platform, setPlatform] = useState('Instagram');
  const [format, setFormat] = useState('Feed');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiGet<ClippingItemDetail>(`/clipping/items/${itemId}`);
      setItem(response || null);
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar item.');
    } finally {
      setLoading(false);
    }
  }, [itemId]);

  const loadClients = useCallback(async () => {
    try {
      const response = await apiGet<ClientRow[]>('/clients');
      setClients(response || []);
      if (response?.length && !clientId) {
        setClientId(response[0].id);
      }
    } catch {
      setClients([]);
    }
  }, [clientId]);

  useEffect(() => {
    loadDetail();
    loadClients();
  }, [loadDetail, loadClients]);

  const handleAssign = async () => {
    if (!clientId) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await apiPost(`/clipping/items/${itemId}/assign`, { clientIds: [clientId] });
      setSuccess('Item atribuido ao cliente.');
      await loadDetail();
    } catch (err: any) {
      setError(err?.message || 'Falha ao atribuir item.');
    } finally {
      setSaving(false);
    }
  };

  const handlePin = async () => {
    if (!clientId) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await apiPost(`/clipping/items/${itemId}/pin`, { scope: 'CLIENT', client_id: clientId });
      setSuccess('Item fixado.');
      await loadDetail();
    } catch (err: any) {
      setError(err?.message || 'Falha ao fixar item.');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await apiPost(`/clipping/items/${itemId}/archive`, {});
      setSuccess('Item arquivado.');
      await loadDetail();
    } catch (err: any) {
      setError(err?.message || 'Falha ao arquivar item.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreatePost = async () => {
    if (!clientId) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await apiPost(`/clipping/items/${itemId}/create-post`, {
        clientIds: [clientId],
        platform,
        format,
      });
      setSuccess('Post criado no calendario.');
    } catch (err: any) {
      setError(err?.message || 'Falha ao criar post.');
    } finally {
      setSaving(false);
    }
  };

  const actions = useMemo(() => item?.actions || [], [item]);

  if (loading && !item) {
    return (
      <div className="loading-screen">
        <div className="pulse">Carregando detalhe...</div>
      </div>
    );
  }

  return (
    <AppShell
      title="Radar"
      topbarLeft={
        <nav className="flex items-center space-x-2 text-sm text-slate-400">
          <button className="text-muted hover:text-primary" type="button" onClick={() => router.push('/clipping')}>
            Radar
          </button>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="text-ink font-medium">Detalhe do item</span>
        </nav>
      }
    >
      <div className="page-content">
        {error ? <div className="notice error">{error}</div> : null}
        {success ? <div className="notice success">{success}</div> : null}

        <div className="card">
          <div className="card-top">
            <span className="badge">{item?.status || 'NEW'}</span>
            <span className="status">Score {formatNumber(item?.score)}</span>
          </div>
          {item?.image_url ? (
            <div className="clipping-hero">
              <img src={item.image_url} alt="" />
            </div>
          ) : null}
          <h2>{item?.title}</h2>
          <p>{item?.snippet || item?.content || 'Sem resumo.'}</p>
          <div className="detail-list">
            <div className="card-title">
              <h3>Fonte</h3>
              {item?.source_url ? (
                <a className="text-primary text-xs" href={item.source_url} target="_blank" rel="noreferrer">
                  Abrir fonte
                </a>
              ) : null}
            </div>
            <p className="card-text">{item?.source_name || 'Nao informado'}</p>
            <div className="card-footer">
              <span className="chip">{item?.type || 'NEWS'}</span>
              <span className="text-xs text-slate-400">{formatDate(item?.published_at)}</span>
            </div>
          </div>
        </div>

        <div className="panel-grid">
          <aside className="panel-sidebar space-y-4">
            <div className="card">
              <div className="card-top">
                <span className="badge">Acoes</span>
              </div>
              <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
                <label className="field">
                  Cliente
                  <select value={clientId} onChange={(event) => setClientId(event.target.value)}>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Plataforma
                  <input value={platform} onChange={(event) => setPlatform(event.target.value)} />
                </label>
                <label className="field">
                  Formato
                  <input value={format} onChange={(event) => setFormat(event.target.value)} />
                </label>
                <button className="btn primary" type="button" onClick={handleCreatePost} disabled={saving}>
                  Criar post
                </button>
                <button className="btn ghost" type="button" onClick={handleAssign} disabled={saving}>
                  Atribuir ao cliente
                </button>
                <button className="btn ghost" type="button" onClick={handlePin} disabled={saving}>
                  Fixar no cliente
                </button>
                <button className="btn danger" type="button" onClick={handleArchive} disabled={saving}>
                  Arquivar
                </button>
              </div>
            </div>
          </aside>

          <section className="panel-main">
            <div className="card">
              <div className="card-top">
                <span className="badge">Historico</span>
              </div>
              <div className="detail-list">
                {actions.length ? (
                  actions.map((action) => (
                    <div key={action.id} className="copy-block">
                      <div className="card-title">
                        <h3>{action.action}</h3>
                        <span className="status">{formatDate(action.created_at)}</span>
                      </div>
                      {action.payload ? (
                        <pre>{JSON.stringify(action.payload, null, 2)}</pre>
                      ) : (
                        <p className="card-text">Sem detalhes.</p>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="empty">Nenhuma acao registrada.</div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
