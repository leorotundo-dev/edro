'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiGet, apiPost, buildApiUrl } from '@/lib/api';

type LibraryItem = {
  id: string;
  type: string;
  title: string;
  category: string;
  created_at?: string;
  file_size?: number;
  source_url?: string;
};

type ClientLibraryClientProps = {
  clientId: string;
};

function getFileIcon(type: string, title: string): { icon: string; bgColor: string; textColor: string } {
  const ext = title?.split('.').pop()?.toLowerCase() || '';

  if (type === 'link') {
    return { icon: 'link', bgColor: 'bg-purple-50 textColor: 'text-purple-600' };
  }
  if (type === 'note') {
    return { icon: 'description', bgColor: 'bg-slate-50 textColor: 'text-slate-600' };
  }
  if (ext === 'pdf') {
    return { icon: 'picture_as_pdf', bgColor: 'bg-red-50 textColor: 'text-red-600' };
  }
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) {
    return { icon: 'image', bgColor: 'bg-blue-50 textColor: 'text-blue-600' };
  }
  if (['mp4', 'mov', 'avi', 'webm'].includes(ext)) {
    return { icon: 'movie', bgColor: 'bg-orange-50 textColor: 'text-orange-600' };
  }
  if (['doc', 'docx'].includes(ext)) {
    return { icon: 'article', bgColor: 'bg-blue-50 textColor: 'text-blue-600' };
  }
  return { icon: 'draft', bgColor: 'bg-slate-50 textColor: 'text-slate-600' };
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ClientLibraryClient({ clientId }: ClientLibraryClientProps) {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [referenceUrl, setReferenceUrl] = useState('');
  const [socialLink, setSocialLink] = useState('');
  const [uploading, setUploading] = useState(false);

  const CATEGORIES = [
    { value: '', label: 'Filter by Tag' },
    { value: 'brand_identity', label: 'Brand Identity' },
    { value: 'social_templates', label: 'Social Templates' },
    { value: 'photography', label: 'Photography' },
    { value: 'guidelines', label: 'Guidelines' },
    { value: 'reference', label: 'References' },
  ];

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams();
      if (query) qs.set('q', query);
      if (categoryFilter) qs.set('category', categoryFilter);
      const response = await apiGet(`/clients/${clientId}/library?${qs.toString()}`);
      setItems(response || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load library.');
    } finally {
      setLoading(false);
    }
  }, [clientId, query, categoryFilter]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const uploadFile = async (file: File) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('edro_token') : null;
    if (!token) return;

    setUploading(true);
    setError('');
    const form = new FormData();
    form.append('file', file);

    try {
      const response = await fetch(buildApiUrl(`/clients/${clientId}/library/upload`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });

      if (!response.ok) throw new Error('Failed to upload file.');
      await loadItems();
    } catch (err: any) {
      setError(err?.message || 'Failed to upload file.');
    } finally {
      setUploading(false);
    }
  };

  const addUrl = async (url: string, type: 'reference' | 'social') => {
    if (!url.trim()) return;
    setError('');
    try {
      await apiPost(`/clients/${clientId}/library`, {
        type: 'link',
        title: url,
        source_url: url,
        category: type === 'social' ? 'social_templates' : 'reference',
        tags: [type],
        weight: 'medium',
        use_in_ai: true,
      });
      if (type === 'reference') setReferenceUrl('');
      else setSocialLink('');
      await loadItems();
    } catch (err: any) {
      setError(err?.message || 'Failed to add link.');
    }
  };

  const downloadFile = async (itemId: string, title: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('edro_token') : null;
    if (!token) return;

    try {
      const response = await fetch(buildApiUrl(`/library/${itemId}/file`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to download file.');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = title || 'library-file';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err?.message || 'Failed to download file.');
    }
  };

  const deleteItem = async (itemId: string) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('edro_token') : null;
    if (!token) return;

    try {
      const response = await fetch(buildApiUrl(`/library/${itemId}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to delete item.');
      await loadItems();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete item.');
    }
  };

  return (
    <div className="space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Upload Zone */}
      <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center transition-all hover:border-[#FF6600]/40 group">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-[#FF6600] text-3xl">upload_file</span>
          </div>
          <h2 className="text-xl font-bold mb-2">Upload Reference Materials</h2>
          <p className="text-slate-500 text-sm mb-6 leading-relaxed">
            Drag and drop files here, or click to browse. Organize your brand's core assets for quick access.
          </p>
          <label className="bg-[#FF6600] hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-orange-500/20 mb-4 inline-flex items-center gap-2 cursor-pointer">
            <span className="material-symbols-outlined text-xl">add</span>
            {uploading ? 'Uploading...' : 'Upload Reference'}
            <input
              className="hidden"
              type="file"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadFile(file);
              }}
            />
          </label>

          {/* Add Links Section */}
          <div className="mt-6 border-t border-slate-100 pt-6 text-left">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">Add Links</div>
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-slate-600 mb-2">Reference URL</label>
                <div className="flex items-center gap-2">
                  <input
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:ring-[#FF6600] focus:border-[#FF6600]"
                    placeholder="Paste a website or drive link"
                    type="url"
                    value={referenceUrl}
                    onChange={(e) => setReferenceUrl(e.target.value)}
                  />
                  <button
                    className="px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold hover:border-[#FF6600] hover:text-[#FF6600] transition-colors"
                    type="button"
                    onClick={() => addUrl(referenceUrl, 'reference')}
                  >
                    Add URL
                  </button>
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-semibold text-slate-600 mb-2">Social Link</label>
                <div className="flex items-center gap-2">
                  <input
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:ring-[#FF6600] focus:border-[#FF6600]"
                    placeholder="Paste Instagram, TikTok, YouTube, LinkedIn..."
                    type="url"
                    value={socialLink}
                    onChange={(e) => setSocialLink(e.target.value)}
                  />
                  <button
                    className="px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold hover:border-[#FF6600] hover:text-[#FF6600] transition-colors"
                    type="button"
                    onClick={() => addUrl(socialLink, 'social')}
                  >
                    Add Link
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-3 text-xs text-slate-500">
              Links become part of the client reference library and help the AI with context.
            </div>
          </div>

          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-6">
            Supported: PDF, Brand Assets (PNG/SVG), Guidelines, URLs and Social Links
          </p>
        </div>
      </div>

      {/* Reference Library */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="font-display text-3xl">Reference Library</h3>
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
              <input
                className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm w-64 focus:ring-[#FF6600] focus:border-[#FF6600]"
                placeholder="Search assets..."
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="relative">
              <select
                className="pl-4 pr-10 py-2 bg-white border border-slate-200 rounded-lg text-sm appearance-none focus:ring-[#FF6600] focus:border-[#FF6600]"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">expand_more</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">File Name</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Category</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date Added</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Size</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-400">
                    Loading...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-400">
                    No documents added yet.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const { icon, bgColor, textColor } = getFileIcon(item.type, item.title);
                  return (
                    <tr key={item.id} className="group hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded ${bgColor} flex items-center justify-center ${textColor}`}>
                            <span className="material-symbols-outlined text-xl">{icon}</span>
                          </div>
                          <span className="font-medium text-sm">{item.title}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded uppercase">
                          {(item.category || 'general').replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">{formatDate(item.created_at)}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{formatFileSize(item.file_size)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="opacity-0 group-hover:opacity-100 flex items-center justify-end gap-2 transition-opacity">
                          {item.type === 'link' && item.source_url ? (
                            <a
                              href={item.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 hover:bg-white rounded border border-transparent hover:border-slate-200 text-slate-400 hover:text-[#FF6600] transition-colors"
                            >
                              <span className="material-symbols-outlined text-lg">open_in_new</span>
                            </a>
                          ) : (
                            <button
                              className="p-1.5 hover:bg-white rounded border border-transparent hover:border-slate-200 text-slate-400 hover:text-[#FF6600] transition-colors"
                              type="button"
                              onClick={() => downloadFile(item.id, item.title)}
                            >
                              <span className="material-symbols-outlined text-lg">download</span>
                            </button>
                          )}
                          <button
                            className="p-1.5 hover:bg-white rounded border border-transparent hover:border-slate-200 text-slate-400 hover:text-red-500 transition-colors"
                            type="button"
                            onClick={() => deleteItem(item.id)}
                          >
                            <span className="material-symbols-outlined text-lg">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
