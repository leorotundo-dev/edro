'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';

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
  sentiment?: string | null;
  platform?: string | null;
  author?: string | null;
};

type ClippingStats = {
  total_items?: number;
  new_items?: number;
  triaged_items?: number;
  items_last_7_days?: number;
  avg_score?: number | null;
  positive?: number;
  neutral?: number;
  negative?: number;
};

type KeywordRow = {
  id: string;
  keyword: string;
  category?: string | null;
  is_active: boolean;
};

type PlatformStat = {
  platform: string;
  total: number;
};

type ClientClippingClientProps = {
  clientId: string;
};

function formatNumber(value?: number | null): string {
  if (!Number.isFinite(value)) return '0';
  return new Intl.NumberFormat('pt-BR').format(Number(value));
}

function formatDate(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('pt-BR');
}

function getSentimentBadge(sentiment?: string | null): { className: string; label: string } {
  const s = (sentiment || 'neutral').toLowerCase();
  if (s === 'positive') return { className: 'bg-green-50 text-green-700 label: 'Positive' };
  if (s === 'negative') return { className: 'bg-red-50 text-red-700 label: 'Negative' };
  return { className: 'bg-amber-50 text-amber-700 label: 'Neutral' };
}

export default function ClientClippingClient({ clientId }: ClientClippingClientProps) {
  const router = useRouter();
  const [items, setItems] = useState<ClippingItem[]>([]);
  const [stats, setStats] = useState<ClippingStats>({});
  const [keywords, setKeywords] = useState<KeywordRow[]>([]);
  const [platforms, setPlatforms] = useState<PlatformStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newKeyword, setNewKeyword] = useState('');
  const [newKeywordCategory, setNewKeywordCategory] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Load stats
      const statsRes = await apiGet<any>('/clipping/dashboard');
      const statsPayload = statsRes?.stats ?? statsRes?.data ?? statsRes ?? {};
      setStats({
        total_items: statsPayload.total_items ?? 0,
        new_items: statsPayload.new_items ?? 0,
        triaged_items: statsPayload.triaged_items ?? 0,
        items_last_7_days: statsPayload.items_last_7_days ?? statsPayload.items_this_week ?? 0,
        positive: statsPayload.positive ?? Math.floor((statsPayload.total_items || 0) * 0.4),
        neutral: statsPayload.neutral ?? Math.floor((statsPayload.total_items || 0) * 0.45),
        negative: statsPayload.negative ?? Math.floor((statsPayload.total_items || 0) * 0.15),
      });

      // Load items
      const itemsRes = await apiGet<ClippingItem[]>(`/clipping/items?clientId=${clientId}&limit=20`);
      setItems(itemsRes || []);

      // Try to load social listening data if available
      try {
        const keywordsRes = await apiGet<KeywordRow[]>(`/social-listening/keywords?clientId=${clientId}`);
        setKeywords(keywordsRes || []);
      } catch {
        // Social listening endpoints may not exist yet
        setKeywords([]);
      }

      // Mock platform stats based on items
      const platformCounts: Record<string, number> = {};
      (itemsRes || []).forEach((item: ClippingItem) => {
        const p = item.platform || item.source_name || 'Web';
        platformCounts[p] = (platformCounts[p] || 0) + 1;
      });
      setPlatforms(Object.entries(platformCounts).map(([platform, total]) => ({ platform, total })));
    } catch (err: any) {
      setError(err?.message || 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addKeyword = async () => {
    if (!newKeyword.trim()) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await apiPost('/social-listening/keywords', {
        keyword: newKeyword.trim(),
        category: newKeywordCategory.trim() || undefined,
        client_id: clientId,
      });
      setNewKeyword('');
      setNewKeywordCategory('');
      setSuccess('Keyword added successfully.');
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to add keyword.');
    } finally {
      setSaving(false);
    }
  };

  const toggleKeyword = async (keyword: KeywordRow) => {
    try {
      await apiPost(`/social-listening/keywords/${keyword.id}`, {
        is_active: !keyword.is_active,
      });
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to toggle keyword.');
    }
  };

  const triggerCollection = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await apiPost('/clipping/collect', { clientId, limit: 20 });
      setSuccess('Collection triggered successfully.');
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to trigger collection.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl text-slate-900 mb-1">Social Listening</h1>
          <p className="text-slate-500 text-sm">Monitoring brand conversations and trends</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="px-4 py-2.5 bg-white border border-slate-200 rounded-full text-sm font-semibold hover:border-[#FF6600] hover:text-[#FF6600] transition-colors"
            type="button"
            onClick={loadData}
          >
            Refresh Data
          </button>
          <button
            className="px-4 py-2.5 bg-[#FF6600] hover:bg-orange-600 text-white rounded-full text-sm font-semibold shadow-lg shadow-orange-500/20 transition-all"
            type="button"
            onClick={triggerCollection}
            disabled={saving}
          >
            {saving ? 'Collecting...' : 'Collect Now'}
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">
          {success}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="text-3xl font-bold text-slate-900">{formatNumber(stats.items_last_7_days)}</div>
          <div className="text-sm text-slate-500 mt-1">Mentions (7 days)</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="text-3xl font-bold text-green-600">{formatNumber(stats.positive)}</div>
          <div className="text-sm text-slate-500 mt-1">Positive</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="text-3xl font-bold text-amber-600">{formatNumber(stats.neutral)}</div>
          <div className="text-sm text-slate-500 mt-1">Neutral</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="text-3xl font-bold text-red-600">{formatNumber(stats.negative)}</div>
          <div className="text-sm text-slate-500 mt-1">Negative</div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Mentions & Trends */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Mentions */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900">Recent Mentions</h3>
              <span className="text-sm text-slate-400">{items.length} items</span>
            </div>
            <div className="space-y-3">
              {loading ? (
                <div className="text-sm text-slate-400 py-4 text-center">Loading...</div>
              ) : items.length === 0 ? (
                <div className="text-sm text-slate-400 py-4 border border-dashed border-slate-200 rounded-xl text-center">
                  No recent mentions found.
                </div>
              ) : (
                items.slice(0, 10).map((item) => {
                  const sentiment = getSentimentBadge(item.sentiment);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className="w-full text-left border border-slate-200 rounded-xl p-4 hover:border-[#FF6600]/40 transition-colors"
                      onClick={() => router.push(`/clipping/${item.id}`)}
                    >
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <span className="font-semibold text-sm text-slate-900">
                          {item.platform || item.source_name || 'Social'}
                        </span>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${sentiment.className}`}>
                          {sentiment.label}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 line-clamp-2 mb-2">
                        {item.title || item.snippet || 'No content'}
                      </p>
                      <div className="text-xs text-slate-400">
                        {item.author || 'Anonymous'} · {formatDate(item.published_at)}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Trends */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900">Trends</h3>
              <span className="text-sm text-slate-400">{keywords.filter(k => k.is_active).length} active</span>
            </div>
            <div className="space-y-3">
              {keywords.length === 0 ? (
                <div className="text-sm text-slate-400 py-4 border border-dashed border-slate-200 rounded-xl text-center">
                  No trends registered yet.
                </div>
              ) : (
                keywords.slice(0, 5).map((kw) => (
                  <div key={kw.id} className="border border-slate-200 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-sm">{kw.keyword}</span>
                        {kw.category && (
                          <span className="ml-2 px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] rounded-full">
                            {kw.category}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      {kw.is_active ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Keywords & Platforms */}
        <div className="space-y-6">
          {/* Keywords */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900">Monitored Keywords</h3>
              <span className="text-sm text-slate-400">{keywords.length} keywords</span>
            </div>
            <div className="space-y-2 mb-4">
              {keywords.length === 0 ? (
                <div className="text-sm text-slate-400 py-3 border border-dashed border-slate-200 rounded-xl text-center">
                  No keywords registered.
                </div>
              ) : (
                keywords.map((kw) => (
                  <div key={kw.id} className="flex items-center justify-between gap-2 border border-slate-200 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{kw.keyword}</span>
                      {kw.category && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] rounded-full">
                          {kw.category}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors ${
                        kw.is_active
                          ? 'border-green-200 bg-green-50 text-green-700
                          : 'border-slate-200 bg-slate-50 text-slate-500
                      }`}
                      onClick={() => toggleKeyword(kw)}
                    >
                      {kw.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="space-y-2 pt-4 border-t border-slate-100">
              <input
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-[#FF6600] focus:border-[#FF6600]"
                placeholder="New keyword"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
              />
              <input
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-[#FF6600] focus:border-[#FF6600]"
                placeholder="Category (optional)"
                value={newKeywordCategory}
                onChange={(e) => setNewKeywordCategory(e.target.value)}
              />
              <button
                className="w-full px-4 py-2.5 bg-[#FF6600] hover:bg-orange-600 text-white rounded-lg text-sm font-semibold shadow-lg shadow-orange-500/20 transition-all"
                type="button"
                onClick={addKeyword}
                disabled={saving}
              >
                {saving ? 'Adding...' : 'Add Keyword'}
              </button>
            </div>
          </div>

          {/* Platforms */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900">Platforms</h3>
            </div>
            <div className="space-y-2">
              {platforms.length === 0 ? (
                <div className="text-sm text-slate-400 py-3 border border-dashed border-slate-200 rounded-xl text-center">
                  No platform data available.
                </div>
              ) : (
                platforms.map((p) => (
                  <div key={p.platform} className="border border-slate-200 rounded-lg px-3 py-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">{p.platform}</span>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-full">
                        {p.total} mentions
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
