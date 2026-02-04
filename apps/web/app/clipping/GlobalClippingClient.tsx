'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet } from '@/lib/api';

type RadarItem = {
  id: string;
  title: string;
  summary?: string;
  source?: string;
  image_url?: string;
  score?: number;
  tier?: 'A' | 'B' | 'C';
  status?: string;
  created_at?: string;
  clients?: string[];
};

export default function GlobalClippingClient() {
  const router = useRouter();
  const [items, setItems] = useState<RadarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'high'>('all');

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiGet<{ items: RadarItem[] }>('/radar');
      setItems(response?.items || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const filteredItems = items.filter((item) => {
    if (search && !item.title?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'high' && item.tier !== 'A') return false;
    return true;
  });

  const getTierBadge = (tier?: string) => {
    if (tier === 'A') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (tier === 'B') return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-8 max-w-none">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-8">
          <div className="relative w-full md:w-96">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
              search
            </span>
            <input
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-[#FF6600] focus:border-[#FF6600] text-sm transition-all"
              placeholder="Search radar items..."
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
            <button
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
                filter === 'high'
                  ? 'bg-[#FF6600] text-white hover:bg-orange-600'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
              onClick={() => setFilter(filter === 'high' ? 'all' : 'high')}
            >
              <span className="material-symbols-outlined text-sm">trending_up</span>
              High Relevance
            </button>
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1">
              <button className="px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">
                Date
              </button>
              <button className="px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">
                Status
              </button>
            </div>
            <button className="flex items-center gap-2 px-3 py-2 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <span className="material-symbols-outlined text-sm">filter_list</span>
              More Filters
            </button>
          </div>
        </div>

        {/* Items Grid */}
        {loading ? (
          <div className="text-sm text-slate-500">Loading radar items...</div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-slate-400 text-3xl">radar</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">No radar items found</h3>
            <p className="text-slate-500 text-sm">Try adjusting your filters or check back later.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredItems.map((item) => (
              <article
                key={item.id}
                className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden hover:shadow-xl hover:border-[#FF6600]/20 transition-all cursor-pointer"
                onClick={() => router.push(`/clipping/${item.id}`)}
              >
                <div className="relative">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="h-44 w-full object-cover"
                    />
                  ) : (
                    <div className="h-44 w-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center">
                      <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-5xl">
                        article
                      </span>
                    </div>
                  )}
                  <div className="absolute top-3 left-3 bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1">
                    <div className="text-[9px] font-bold uppercase text-slate-400">Score</div>
                    <div className="text-lg font-display text-[#FF6600] leading-none">
                      {item.score || 0}
                    </div>
                  </div>
                  <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                    <button
                      className="p-2 text-slate-600 bg-white/90 hover:text-[#FF6600] rounded-lg transition-colors"
                      title="Assign to client"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="material-symbols-outlined text-[18px]">person_add</span>
                    </button>
                    <button
                      className="p-2 text-slate-600 bg-white/90 hover:text-[#FF6600] rounded-lg transition-colors"
                      title="Create post"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/studio?radarId=${item.id}`);
                      }}
                    >
                      <span className="material-symbols-outlined text-[18px]">add_box</span>
                    </button>
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${getTierBadge(item.tier)}`}>
                      Tier {item.tier || 'C'}
                    </span>
                    {item.source && (
                      <span className="text-[10px] text-slate-400 font-medium">{item.source}</span>
                    )}
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-2 line-clamp-2 group-hover:text-[#FF6600] transition-colors">
                    {item.title}
                  </h3>
                  {item.summary && (
                    <p className="text-sm text-slate-500 line-clamp-2">{item.summary}</p>
                  )}
                  {item.clients?.length ? (
                    <div className="mt-4 flex flex-wrap gap-1">
                      {item.clients.slice(0, 3).map((client) => (
                        <span
                          key={client}
                          className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-[10px] font-bold rounded"
                        >
                          {client}
                        </span>
                      ))}
                      {item.clients.length > 3 && (
                        <span className="text-[10px] text-slate-400">+{item.clients.length - 3}</span>
                      )}
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
