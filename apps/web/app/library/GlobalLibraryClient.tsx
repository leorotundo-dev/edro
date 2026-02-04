'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiGet, apiPost, buildApiUrl } from '@/lib/api';

type LibraryFile = {
  id: string;
  filename: string;
  original_filename?: string;
  file_type?: string;
  mime_type?: string;
  size?: number;
  client_id?: string;
  client_name?: string;
  category?: string;
  created_at?: string;
  url?: string;
};

type Client = {
  id: string;
  name: string;
};

const FILE_TYPE_ICONS: Record<string, { icon: string; bg: string }> = {
  pdf: { icon: 'picture_as_pdf', bg: 'bg-red-100 text-red-600' },
  image: { icon: 'image', bg: 'bg-blue-100 text-blue-600' },
  video: { icon: 'videocam', bg: 'bg-purple-100 text-purple-600' },
  doc: { icon: 'description', bg: 'bg-yellow-100 text-yellow-600' },
  default: { icon: 'insert_drive_file', bg: 'bg-slate-100 text-slate-600' },
};

function getFileIcon(file: LibraryFile) {
  const mime = file.mime_type?.toLowerCase() || '';
  const ext = file.filename?.split('.').pop()?.toLowerCase() || '';
  if (mime.includes('pdf') || ext === 'pdf') return FILE_TYPE_ICONS.pdf;
  if (mime.includes('image') || ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return FILE_TYPE_ICONS.image;
  if (mime.includes('video') || ['mp4', 'mov', 'avi', 'webm'].includes(ext)) return FILE_TYPE_ICONS.video;
  if (['doc', 'docx', 'txt'].includes(ext)) return FILE_TYPE_ICONS.doc;
  return FILE_TYPE_ICONS.default;
}

function formatSize(bytes?: number) {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function GlobalLibraryClient() {
  const [files, setFiles] = useState<LibraryFile[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [filesRes, clientsRes] = await Promise.all([
        apiGet<{ files: LibraryFile[] }>('/library'),
        apiGet<Client[]>('/clients'),
      ]);
      setFiles(filesRes?.files || []);
      setClients(clientsRes || []);
    } catch {
      setFiles([]);
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList?.length) return;

    setUploading(true);
    try {
      const formData = new FormData();
      Array.from(fileList).forEach((file) => formData.append('files', file));

      const token = typeof window !== 'undefined' ? localStorage.getItem('edro_token') : null;
      await fetch(buildApiUrl('/library/upload'), {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      loadData();
    } catch {
      // ignore
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const filteredFiles = files.filter((file) => {
    if (search && !file.filename?.toLowerCase().includes(search.toLowerCase())) return false;
    if (clientFilter && file.client_id !== clientFilter) return false;
    if (typeFilter) {
      const { icon } = getFileIcon(file);
      if (typeFilter === 'pdf' && icon !== 'picture_as_pdf') return false;
      if (typeFilter === 'image' && icon !== 'image') return false;
      if (typeFilter === 'video' && icon !== 'videocam') return false;
    }
    return true;
  });

  return (
    <div className="p-8 max-w-none space-y-10">
      {/* Header */}
      <div>
        <h1 className="font-display text-5xl text-slate-900 dark:text-white mb-2">Global Reference Library Hub</h1>
        <p className="text-slate-500">Centralized repository for operational assets, brand guidelines, and reference materials.</p>
      </div>

      {/* Upload Zone */}
      <section
        className="bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-10 text-center transition-colors hover:border-[#FF6600]/50 group cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleUpload}
        />
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 bg-orange-50 dark:bg-orange-950/20 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-[#FF6600] text-3xl">upload_file</span>
          </div>
          <h3 className="text-lg font-semibold mb-1">Upload Reference Materials</h3>
          <p className="text-slate-500 text-sm mb-6">
            Drag and drop your documents here, or browse from your computer. Supports PDF, PNG, JPG, and MP4.
          </p>
          <button
            className="bg-[#FF6600] hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-500/20 mx-auto"
            disabled={uploading}
          >
            <span className="material-symbols-outlined">add</span>
            {uploading ? 'Uploading...' : 'Select Files'}
          </button>
        </div>
      </section>

      {/* Filters */}
      <section className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                search
              </span>
              <input
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-sm focus:ring-1 focus:ring-[#FF6600]"
                placeholder="Search references..."
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-sm py-2 px-4 pr-10 focus:ring-1 focus:ring-[#FF6600]"
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
            >
              <option value="">All Clients</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
            <select
              className="bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-sm py-2 px-4 pr-10 focus:ring-1 focus:ring-[#FF6600]"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">File Type</option>
              <option value="pdf">PDF</option>
              <option value="image">Image</option>
              <option value="video">Video</option>
            </select>
          </div>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Showing {filteredFiles.length} Files
          </div>
        </div>

        {/* Files Table */}
        {loading ? (
          <div className="text-sm text-slate-500">Loading files...</div>
        ) : filteredFiles.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-slate-400 text-3xl">folder_open</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">No files found</h3>
            <p className="text-slate-500 text-sm">Upload some files to get started.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    File
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Client
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Category
                  </th>
                  <th className="px-6 py-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Size
                  </th>
                  <th className="px-6 py-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredFiles.map((file) => {
                  const { icon, bg } = getFileIcon(file);
                  return (
                    <tr key={file.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${bg}`}>
                            <span className="material-symbols-outlined">{icon}</span>
                          </div>
                          <div>
                            <p className="font-medium text-sm">{file.original_filename || file.filename}</p>
                            <p className="text-[10px] text-slate-400 uppercase">{file.file_type || 'File'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {file.client_name || 'Global'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-[10px] font-bold rounded uppercase">
                          {file.category || 'General'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-slate-500">
                        {formatSize(file.size)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {file.url && (
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-slate-500 hover:text-[#FF6600] transition-colors"
                              title="Download"
                            >
                              <span className="material-symbols-outlined text-[18px]">download</span>
                            </a>
                          )}
                          <button
                            className="p-2 text-slate-500 hover:text-red-500 transition-colors"
                            title="Delete"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
