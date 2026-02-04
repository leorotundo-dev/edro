'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet } from '@/lib/api';

type Client = {
  id: string;
  name: string;
  segment_primary?: string;
  country?: string;
  uf?: string;
  city?: string;
  status?: string;
  pending_posts?: number;
  approval_rate?: number;
  urgent_tasks?: number;
  updated_at?: string;
  logo_url?: string;
};

export default function ClientsListClient() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadClients = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiGet<Client[]>('/clients');
      setClients(response || []);
    } catch {
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const filteredClients = clients.filter((client) => {
    if (!search) return true;
    const query = search.toLowerCase();
    return (
      client.name?.toLowerCase().includes(query) ||
      client.segment_primary?.toLowerCase().includes(query) ||
      client.city?.toLowerCase().includes(query)
    );
  });

  const getStatusBadge = (status?: string) => {
    if (status === 'active') {
      return (
        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-bold uppercase tracking-wider rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
          Active Planning
        </span>
      );
    }
    if (status === 'paused') {
      return (
        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-[10px] font-bold uppercase tracking-wider rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
          Paused
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider rounded-full">
        Draft
      </span>
    );
  };

  return (
    <div className="p-8 max-w-none">
      {/* Header */}
      <div className="flex items-end justify-between mb-10">
        <div>
          <h1 className="font-display text-5xl text-slate-900 dark:text-white mb-2">Clients Management</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Manage your studio's active portfolio and creative operations.
          </p>
        </div>
        <button
          className="bg-[#FF6600] hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-orange-500/20"
          onClick={() => router.push('/clients/new')}
        >
          <span className="material-symbols-outlined">add</span>
          Add Client
        </button>
      </div>

      {/* Search */}
      <div className="mb-8">
        <div className="relative max-w-xl">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
            search
          </span>
          <input
            className="w-full pl-10 pr-4 py-2 bg-slate-100/50 dark:bg-slate-800/50 border-none rounded-full text-sm focus:ring-1 focus:ring-[#FF6600] focus:bg-white transition-all"
            placeholder="Search clients by name, industry or status..."
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Clients Grid */}
      {loading ? (
        <div className="text-sm text-slate-500">Loading clients...</div>
      ) : filteredClients.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-slate-400 text-3xl">group</span>
          </div>
          <h3 className="text-lg font-semibold mb-2">No clients found</h3>
          <p className="text-slate-500 text-sm mb-6">Get started by adding your first client.</p>
          <button
            className="bg-[#FF6600] hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-xl inline-flex items-center gap-2 transition-all"
            onClick={() => router.push('/clients/new')}
          >
            <span className="material-symbols-outlined">add</span>
            Add Client
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => (
            <div
              key={client.id}
              className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 hover:shadow-xl hover:border-[#FF6600]/20 transition-all relative cursor-pointer"
              onClick={() => router.push(`/clients/${client.id}`)}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="w-14 h-14 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center border border-slate-100 dark:border-slate-700 overflow-hidden">
                  {client.logo_url ? (
                    <img src={client.logo_url} alt={client.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-slate-400 text-3xl">corporate_fare</span>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  {getStatusBadge(client.status)}
                  {client.urgent_tasks ? (
                    <div className="relative">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        {client.urgent_tasks} Urgent Tasks
                      </span>
                      <span className="absolute -top-1 -right-2 w-1.5 h-1.5 bg-red-500 rounded-full ring-2 ring-white dark:ring-slate-900"></span>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Info */}
              <div className="mb-8">
                <h3 className="font-display text-2xl text-slate-900 dark:text-white group-hover:text-[#FF6600] transition-colors">
                  {client.name}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {client.segment_primary || 'No segment'}
                </p>
                {client.city && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                    {[client.city, client.uf, client.country].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between py-4 border-y border-slate-50 dark:border-slate-800 mb-6">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Pending Posts</p>
                  <p className="text-xl font-display text-slate-900 dark:text-white">
                    {client.pending_posts || 0}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 text-right">Approval Rate</p>
                  <p className="text-xl font-display text-slate-900 dark:text-white text-right">
                    {client.approval_rate ? `${client.approval_rate}%` : '-'}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#FF6600] hover:bg-orange-600 text-white text-xs font-bold rounded-lg transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/clients/${client.id}/calendar`);
                  }}
                >
                  <span className="material-symbols-outlined text-sm">calendar_month</span>
                  Calendar
                </button>
                <button
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/studio?clientId=${client.id}`);
                  }}
                >
                  <span className="material-symbols-outlined text-sm">add_box</span>
                  Create
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
