'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { apiGet, apiPost, buildApiUrl } from '@/lib/api';

type PostAsset = {
  id: string;
  post_index: number;
  status: string;
  payload: any;
};

const STATUS_STYLES: Record<string, string> = {
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200',
  review: 'bg-amber-50 text-amber-700 border-amber-200',
  draft: 'bg-slate-100 text-slate-600 border-slate-200',
};

function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="btn ghost" type="button" onClick={onClose}>
            Fechar
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export default function CalendarReviewPage() {
  const router = useRouter();
  const params = useParams();
  const calendarId = String(params?.id || '');

  const [rows, setRows] = useState<PostAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Record<number, boolean>>({});

  const [iclipsUrl, setIclipsUrl] = useState('');
  const [iclipsKey, setIclipsKey] = useState('');
  const [iclipsResult, setIclipsResult] = useState('');

  const [briefsOpen, setBriefsOpen] = useState(false);
  const [briefs, setBriefs] = useState<any[]>([]);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [sourcesTarget, setSourcesTarget] = useState<PostAsset | null>(null);
  const [sources, setSources] = useState<any[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiGet(`/calendars/${calendarId}/posts`);
      setRows(data || []);
      setSelected({});
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar posts.');
    } finally {
      setLoading(false);
    }
  }, [calendarId]);

  useEffect(() => {
    loadPosts();
  }, [calendarId, loadPosts]);

  const indices = useMemo(
    () => Object.entries(selected).filter(([, value]) => value).map(([key]) => Number(key)),
    [selected]
  );

  const hasSelection = indices.length > 0;

  const setStatus = async (index: number, status: string) => {
    setError('');
    try {
      await apiPost(`/calendars/${calendarId}/posts/${index}/status`, { status });
      await loadPosts();
    } catch (err: any) {
      setError(err?.message || 'Falha ao atualizar status.');
    }
  };

  const bulkAction = async (action: 'approve' | 'reject' | 'move_to_review') => {
    if (!indices.length) {
      setError('Selecione pelo menos um post.');
      return;
    }
    setError('');
    try {
      await apiPost(`/calendars/${calendarId}/posts/bulk`, { action, indices });
      await loadPosts();
    } catch (err: any) {
      setError(err?.message || 'Falha na aprovacao em lote.');
    }
  };

  const downloadFile = async (kind: 'csv' | 'iclips') => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('edro_token') : null;
    if (!token) return;

    const path =
      kind === 'csv'
        ? `/api/calendars/${calendarId}/export.csv`
        : `/api/calendars/${calendarId}/export.iclips.json`;

    const response = await fetch(buildApiUrl(path), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      setError('Falha ao exportar.');
      return;
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = kind === 'csv' ? `calendar-${calendarId}.csv` : `calendar-${calendarId}.iclips.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleIclipsPush = async () => {
    setError('');
    setIclipsResult('');
    try {
      const res = await apiPost(`/integrations/iclips/push/${calendarId}`, {
        url: iclipsUrl,
        apiKey: iclipsKey || undefined,
      });
      setIclipsResult(typeof res === 'string' ? res : JSON.stringify(res));
    } catch (err: any) {
      setError(err?.message || 'Falha ao enviar para iClips.');
    }
  };

  const loadBriefs = async () => {
    setError('');
    try {
      const data = await apiGet(`/calendars/${calendarId}/briefs`);
      setBriefs(Array.isArray(data) ? data : []);
      setBriefsOpen(true);
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar briefs.');
    }
  };

  const loadSources = async (post: PostAsset) => {
    setSourcesTarget(post);
    setSourcesOpen(true);
    setSourcesLoading(true);
    setError('');
    try {
      const data = await apiGet(`/posts/${post.id}/sources`);
      setSources(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar fontes.');
      setSources([]);
    } finally {
      setSourcesLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="pulse">Carregando aprovacao...</div>
      </div>
    );
  }

  return (
    <AppShell
      title="Calendar Review"
      meta={`Calendar ${calendarId}`}
      topbarExtra={
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg hover:text-primary transition-colors"
            type="button"
            onClick={() => router.push('/calendar')}
          >
            Back to calendar
          </button>
          <button
            className="px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg hover:text-primary transition-colors"
            type="button"
            onClick={() => router.push('/clients')}
          >
            Clients
          </button>
        </div>
      }
    >
      <div className="page-content">
        {error ? <div className="notice error">{error}</div> : null}

        <div className="flex flex-col gap-6">
        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">Calendar Review</div>
              <h2 className="font-display text-3xl text-slate-900">Calendar {calendarId}</h2>
              <p className="text-sm text-slate-500">{rows.length} posts prontos para aprovacao</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg hover:text-primary transition-colors"
                type="button"
                onClick={() => downloadFile('csv')}
              >
                Export CSV
              </button>
              <button
                className="px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg hover:text-primary transition-colors"
                type="button"
                onClick={() => downloadFile('iclips')}
              >
                Export iClips
              </button>
              <button
                className="px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg hover:text-primary transition-colors"
                type="button"
                onClick={loadBriefs}
              >
                Briefs AdCreative
              </button>
            </div>
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Selected {indices.length} posts
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className={`px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg transition-colors ${
                  hasSelection ? 'hover:text-primary' : 'opacity-50 cursor-not-allowed'
                }`}
                type="button"
                onClick={() => bulkAction('move_to_review')}
                disabled={!hasSelection}
              >
                Mover p/ review
              </button>
              <button
                className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                  hasSelection ? 'bg-primary text-white hover:bg-orange-600' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
                type="button"
                onClick={() => bulkAction('approve')}
                disabled={!hasSelection}
              >
                Aprovar em lote
              </button>
              <button
                className={`px-3 py-2 text-xs font-semibold border rounded-lg transition-colors ${
                  hasSelection ? 'border-rose-200 text-rose-600 hover:bg-rose-50' : 'border-slate-200 text-slate-300 cursor-not-allowed'
                }`}
                type="button"
                onClick={() => bulkAction('reject')}
                disabled={!hasSelection}
              >
                Rejeitar em lote
              </button>
            </div>
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Sel</th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">#</th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Status</th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Data</th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Formato</th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Headline</th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const statusClass = STATUS_STYLES[row.status] || 'bg-slate-100 text-slate-600 border-slate-200';

                return (
                  <tr key={row.id} className="border-b border-slate-100">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-primary"
                        checked={!!selected[row.post_index]}
                        onChange={(event) =>
                          setSelected((state) => ({ ...state, [row.post_index]: event.target.checked }))
                        }
                      />
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-700">{row.post_index}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-1 text-[10px] font-semibold uppercase tracking-widest rounded-full border ${statusClass}`}
                      >
                        {row.status || 'pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{row.payload?.date}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{row.payload?.format}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {row.payload?.copy?.headline || 'Sem headline'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="px-3 py-1 text-xs font-semibold border border-slate-200 rounded-lg hover:text-primary transition-colors"
                          type="button"
                          onClick={() => loadSources(row)}
                        >
                          Fontes
                        </button>
                        <button
                          className="px-3 py-1 text-xs font-semibold border border-slate-200 rounded-lg hover:text-primary transition-colors"
                          type="button"
                          onClick={() => setStatus(row.post_index, 'review')}
                        >
                          Review
                        </button>
                        <button
                          className="px-3 py-1 text-xs font-semibold bg-primary text-white rounded-lg hover:bg-orange-600 transition-colors"
                          type="button"
                          onClick={() => setStatus(row.post_index, 'approved')}
                        >
                          Aprovar
                        </button>
                        <button
                          className="px-3 py-1 text-xs font-semibold border border-rose-200 text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                          type="button"
                          onClick={() => setStatus(row.post_index, 'rejected')}
                        >
                          Rejeitar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {rows.length === 0 ? (
            <div className="px-4 py-6 text-sm text-slate-400">Nenhum post encontrado.</div>
          ) : null}
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div>
            <h3 className="font-display text-2xl text-slate-900">Ponte iClips</h3>
            <p className="text-sm text-slate-500">Envio direto via webhook/endpoint</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <label className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              URL do endpoint
              <input
                className="mt-2 w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700"
                value={iclipsUrl}
                onChange={(event) => setIclipsUrl(event.target.value)}
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              API Key (opcional)
              <input
                className="mt-2 w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700"
                value={iclipsKey}
                onChange={(event) => setIclipsKey(event.target.value)}
              />
            </label>
          </div>
          <div className="flex justify-end">
            <button
              className="bg-primary hover:bg-orange-600 text-white text-xs font-bold px-4 py-3 rounded-lg transition-colors"
              type="button"
              onClick={handleIclipsPush}
            >
              Enviar para iClips
            </button>
          </div>
          {iclipsResult ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {iclipsResult}
            </div>
          ) : null}
        </section>
        </div>
      </div>

      <Modal open={briefsOpen} title="Briefs para AdCreative" onClose={() => setBriefsOpen(false)}>
        {briefs.length === 0 ? (
          <p>Sem briefs encontrados.</p>
        ) : (
          <div className="detail-grid">
            {briefs.map((item: any) => (
              <div key={item.post_id} className="copy-block">
                <strong>
                  {item.date} · {item.platform} · {item.format}
                </strong>
                <pre>{JSON.stringify(item.brief, null, 2)}</pre>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <Modal
        open={sourcesOpen}
        title={sourcesTarget ? `Fontes do post #${sourcesTarget.post_index}` : 'Fontes do post'}
        onClose={() => setSourcesOpen(false)}
      >
        {sourcesLoading ? (
          <p>Carregando fontes...</p>
        ) : sources.length === 0 ? (
          <p>Nenhuma fonte registrada.</p>
        ) : (
          <div className="detail-grid">
            {sources.map((source: any) => (
              <div key={source.id} className="copy-block">
                <strong>{source.title}</strong>
                <div style={{ opacity: 0.7, fontSize: 12 }}>
                  {source.type} | {source.category} | peso {source.weight}
                </div>
                <div style={{ opacity: 0.7, fontSize: 12 }}>
                  score {Number(source.score || 0).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
