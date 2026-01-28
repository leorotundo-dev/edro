'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { apiGet, apiPatch, apiPost, buildApiUrl } from '@/lib/api';

type ClientRow = {
  id: string;
  name: string;
  country?: string | null;
  uf?: string | null;
  city?: string | null;
  segment_primary?: string | null;
};

type LibraryItem = {
  id: string;
  type: string;
  title: string;
  category: string;
  weight: string;
  use_in_ai: boolean;
  status: string;
};

type LibraryClientProps = {
  clientId?: string;
};

export default function LibraryClient({ clientId }: LibraryClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null);
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const lockedClientId = clientId || searchParams.get('clientId') || '';
  const isLocked = Boolean(lockedClientId);

  const loadClient = useCallback(async (id: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await apiGet(`/clients/${id}`);
      if (response?.id) {
        setSelectedClient(response);
        setClients([response]);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load client.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadClients = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiGet('/clients');
      setClients(response || []);
      if (response?.length) {
        const desired = lockedClientId;
        const match = desired ? response.find((client: ClientRow) => client.id === desired) : null;
        setSelectedClient(match || response[0]);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load clients.');
    } finally {
      setLoading(false);
    }
  }, [lockedClientId]);

  const loadItems = useCallback(async () => {
    if (!selectedClient) return;
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams();
      if (query) qs.set('q', query);
      if (typeFilter) qs.set('type', typeFilter);
      const response = await apiGet(`/clients/${selectedClient.id}/library?${qs.toString()}`);
      setItems(response || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load library.');
    } finally {
      setLoading(false);
    }
  }, [query, selectedClient, typeFilter]);

  useEffect(() => {
    if (isLocked && lockedClientId) {
      loadClient(lockedClientId);
    } else {
      loadClients();
    }
  }, [isLocked, lockedClientId, loadClient, loadClients]);

  useEffect(() => {
    if (!selectedClient) return;
    loadItems();
  }, [selectedClient, loadItems]);

  const toggleAI = async (item: LibraryItem) => {
    setError('');
    try {
      await apiPatch(`/library/${item.id}`, { use_in_ai: !item.use_in_ai });
      await loadItems();
    } catch (err: any) {
      setError(err?.message || 'Failed to update item.');
    }
  };

  const createNote = async () => {
    if (!selectedClient) return;
    const title = window.prompt('Note title:');
    if (!title) return;
    const notes = window.prompt('Note content:') || '';
    try {
      await apiPost(`/clients/${selectedClient.id}/library`, {
        type: 'note',
        title,
        notes,
        category: 'general',
        tags: [],
        weight: 'medium',
        use_in_ai: true,
      });
      await loadItems();
    } catch (err: any) {
      setError(err?.message || 'Failed to create note.');
    }
  };

  const createLink = async () => {
    if (!selectedClient) return;
    const title = window.prompt('Link title:');
    if (!title) return;
    const sourceUrl = window.prompt('URL:');
    if (!sourceUrl) return;
    try {
      await apiPost(`/clients/${selectedClient.id}/library`, {
        type: 'link',
        title,
        source_url: sourceUrl,
        category: 'general',
        tags: [],
        weight: 'medium',
        use_in_ai: true,
      });
      await loadItems();
    } catch (err: any) {
      setError(err?.message || 'Failed to create link.');
    }
  };

  const uploadFile = async (file: File) => {
    if (!selectedClient) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('edro_token') : null;
    if (!token) return;

    const form = new FormData();
    form.append('file', file);

    const response = await fetch(buildApiUrl(`/clients/${selectedClient.id}/library/upload`), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: form,
    });

    if (!response.ok) {
      setError('Failed to upload file.');
      return;
    }

    await loadItems();
  };

  const openFile = async (itemId: string, title: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('edro_token') : null;
    if (!token) return;
    setError('');

    try {
      const response = await fetch(buildApiUrl(`/library/${itemId}/file`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to open file.');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = title || 'library-file';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err?.message || 'Failed to open file.');
    }
  };

  const totalLabel = useMemo(() => `Showing ${items.length} files`, [items.length]);

  if (loading && clients.length === 0) {
    return (
      <div className="loading-screen">
        <div className="pulse">Loading library...</div>
      </div>
    );
  }

  return (
    <AppShell
      title="Library"
      topbarLeft={
        <nav className="flex items-center space-x-2 text-sm text-slate-400">
          <span className="text-slate-500">Studio</span>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="text-slate-900 font-medium">Global Reference Library</span>
        </nav>
      }
    >
      {error ? (
        <div className="mx-8 mt-4 border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="p-8 w-full max-w-none space-y-10">
        <div>
          <h1 className="font-display text-5xl text-slate-900 mb-2">Global Reference Library Hub</h1>
          <p className="text-slate-500">
            Centralized repository for operational assets, brand guidelines, and reference materials.
          </p>
        </div>

        <section className="bg-surface-light border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center transition-colors hover:border-primary/50 group">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-primary text-3xl">upload_file</span>
            </div>
            <h3 className="text-lg font-semibold mb-1">Upload Reference Materials</h3>
            <p className="text-slate-500 text-sm mb-6">
              Drag and drop your documents here, or browse from your computer. Supports PDF, PNG, JPG, and MP4.
            </p>
            <label className="bg-primary hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-500/20 mx-auto cursor-pointer">
              <span className="material-symbols-outlined">add</span>
              Select Files
              <input
                className="hidden"
                type="file"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) uploadFile(file);
                }}
              />
            </label>
            <div className="mt-4 flex items-center justify-center gap-3 text-xs text-slate-400">
              <button className="hover:text-primary" type="button" onClick={createNote}>
                New note
              </button>
              <span>•</span>
              <button className="hover:text-primary" type="button" onClick={createLink}>
                New link
              </button>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-surface-light border border-slate-200 p-4 rounded-xl shadow-sm">
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                  search
                </span>
                <input
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-1 focus:ring-primary"
                  placeholder="Search references..."
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <select
                className="bg-slate-50 border-none rounded-lg text-sm py-2 px-4 pr-10 focus:ring-1 focus:ring-primary"
                value={selectedClient?.id || ''}
                onChange={(event) => {
                  const match = clients.find((client) => client.id === event.target.value) || null;
                  setSelectedClient(match);
                  if (match) router.replace(`/library?clientId=${match.id}`);
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
                className="bg-slate-50 border-none rounded-lg text-sm py-2 px-4 pr-10 focus:ring-1 focus:ring-primary"
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
              >
                <option value="">File Type</option>
                <option value="file">File</option>
                <option value="note">Note</option>
                <option value="link">Link</option>
              </select>
            </div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{totalLabel}</div>
          </div>

          <div className="bg-surface-light border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">File Name</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Client Association</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Category</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Weight</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100">
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                      <div className="text-xs text-slate-400 uppercase tracking-widest">{item.type}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {selectedClient?.name || 'Global'}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 uppercase tracking-widest">
                      {item.category || 'General'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full bg-slate-100 text-slate-500">
                        {item.status || 'ready'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 uppercase tracking-widest">
                      {item.weight || 'medium'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 row-action">
                        <button
                          className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg hover:text-primary"
                          type="button"
                          onClick={() => openFile(item.id, item.title)}
                        >
                          Open
                        </button>
                        <button
                          className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg hover:text-primary"
                          type="button"
                          onClick={() => toggleAI(item)}
                        >
                          {item.use_in_ai ? 'Disable AI' : 'Enable AI'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {items.length === 0 ? (
              <div className="px-6 py-10 text-sm text-slate-400">No documents added yet.</div>
            ) : null}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
