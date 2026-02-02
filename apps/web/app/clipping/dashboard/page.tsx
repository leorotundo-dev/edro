'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { apiGet } from '@/lib/api';

type ClippingDashboard = {
  total_sources: number;
  active_sources: number;
  total_items: number;
  items_today: number;
  items_this_week: number;
  items_this_month: number;
  by_source: {
    source_id: string;
    source_name: string;
    source_url: string;
    item_count: number;
    last_item_date?: string;
  }[];
  by_score: {
    high: number; // score >= 70
    medium: number; // 40 <= score < 70
    low: number; // score < 40
  };
  top_items: {
    id: string;
    title: string;
    source_name: string;
    score: number;
    published_at: string;
    url?: string;
  }[];
  trends: {
    keyword: string;
    count: number;
    trend: 'up' | 'down' | 'stable';
  }[];
  recent_items: {
    id: string;
    title: string;
    source_name: string;
    score: number;
    published_at: string;
    url?: string;
  }[];
};

export default function ClippingDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<ClippingDashboard | null>(null);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('week');

  useEffect(() => {
    loadDashboard();
  }, [timeRange]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await apiGet<{ success: boolean; data: ClippingDashboard }>(
        `/clipping/dashboard?range=${timeRange}`
      );
      if (res?.data) {
        setDashboard(res.data);
      }
    } catch (error) {
      console.error('Failed to load clipping dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600 bg-green-100';
    if (score >= 40) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    if (trend === 'up') return { icon: 'trending_up', color: 'text-green-600' };
    if (trend === 'down') return { icon: 'trending_down', color: 'text-red-600' };
    return { icon: 'trending_flat', color: 'text-slate-600' };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
          <div className="mt-4 text-slate-600">Loading clipping dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <AppShell title="Clipping Dashboard">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Clipping Dashboard</h1>
              <p className="text-slate-600">Monitore conteúdos capturados e tendências</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={loadDashboard}
                className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">refresh</span>
                Refresh
              </button>
              <button
                onClick={() => router.push('/clipping')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">view_list</span>
                View All Items
              </button>
            </div>
          </div>

          {/* Time Range Selector */}
          <div className="flex gap-2">
            {(['today', 'week', 'month'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  timeRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                }`}
              >
                {range === 'today' ? 'Hoje' : range === 'week' ? 'Esta Semana' : 'Este Mês'}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600">Total Sources</span>
              <span className="material-symbols-outlined text-blue-600">rss_feed</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">{dashboard?.total_sources || 0}</div>
            <div className="text-xs text-green-600 mt-1">
              {dashboard?.active_sources || 0} active
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600">Total Items</span>
              <span className="material-symbols-outlined text-purple-600">article</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">{dashboard?.total_items || 0}</div>
            <div className="text-xs text-slate-500 mt-1">All time</div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600">
                {timeRange === 'today' ? 'Today' : timeRange === 'week' ? 'This Week' : 'This Month'}
              </span>
              <span className="material-symbols-outlined text-green-600">trending_up</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">
              {timeRange === 'today'
                ? dashboard?.items_today || 0
                : timeRange === 'week'
                ? dashboard?.items_this_week || 0
                : dashboard?.items_this_month || 0}
            </div>
            <div className="text-xs text-slate-500 mt-1">New items</div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600">High Score Items</span>
              <span className="material-symbols-outlined text-orange-600">star</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">{dashboard?.by_score?.high || 0}</div>
            <div className="text-xs text-slate-500 mt-1">Score ≥ 70</div>
          </div>
        </div>

        {/* Score Distribution */}
        {dashboard?.by_score && (
          <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
            <h3 className="font-semibold text-slate-900 mb-4">Score Distribution</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-700">{dashboard.by_score.high}</div>
                <div className="text-sm text-green-600 mt-1">High (≥70)</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-700">{dashboard.by_score.medium}</div>
                <div className="text-sm text-orange-600 mt-1">Medium (40-69)</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-700">{dashboard.by_score.low}</div>
                <div className="text-sm text-red-600 mt-1">Low (&lt;40)</div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Top Sources */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Top Sources</h3>
            <div className="space-y-3">
              {dashboard?.by_source && dashboard.by_source.length > 0 ? (
                dashboard.by_source.slice(0, 5).map((source) => (
                  <div
                    key={source.source_id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-slate-900">{source.source_name}</div>
                      <div className="text-xs text-slate-500 truncate">{source.source_url}</div>
                      {source.last_item_date && (
                        <div className="text-xs text-slate-400 mt-1">
                          Last: {new Date(source.last_item_date).toLocaleDateString('pt-BR')}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">{source.item_count}</div>
                      <div className="text-xs text-slate-500">items</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500">No sources found</div>
              )}
            </div>
          </div>

          {/* Trending Keywords */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Trending Keywords</h3>
            <div className="space-y-2">
              {dashboard?.trends && dashboard.trends.length > 0 ? (
                dashboard.trends.slice(0, 10).map((trend, idx) => {
                  const trendInfo = getTrendIcon(trend.trend);
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 hover:bg-slate-50 rounded"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`material-symbols-outlined text-sm ${trendInfo.color}`}>
                          {trendInfo.icon}
                        </span>
                        <span className="text-sm text-slate-900">{trend.keyword}</span>
                      </div>
                      <span className="text-sm font-semibold text-slate-700">{trend.count}</span>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-slate-500">No trends available</div>
              )}
            </div>
          </div>
        </div>

        {/* Top Items */}
        {dashboard?.top_items && dashboard.top_items.length > 0 && (
          <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
            <h3 className="font-semibold text-slate-900 mb-4">Top Scored Items</h3>
            <div className="space-y-3">
              {dashboard.top_items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer"
                  onClick={() => item.url && window.open(item.url, '_blank')}
                >
                  <div className="flex-1">
                    <div className="font-medium text-slate-900 mb-1">{item.title}</div>
                    <div className="text-sm text-slate-600">{item.source_name}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      {new Date(item.published_at).toLocaleString('pt-BR')}
                    </div>
                  </div>
                  <div className="ml-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getScoreColor(item.score)}`}>
                      {item.score}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Items */}
        {dashboard?.recent_items && dashboard.recent_items.length > 0 && (
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Recent Items</h3>
            <div className="space-y-2">
              {dashboard.recent_items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg cursor-pointer"
                  onClick={() => item.url && window.open(item.url, '_blank')}
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-900">{item.title}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                      <span>{item.source_name}</span>
                      <span>•</span>
                      <span>{new Date(item.published_at).toLocaleString('pt-BR')}</span>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${getScoreColor(item.score)}`}>
                    {item.score}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!dashboard && (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
            <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">inbox</span>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Data Available</h3>
            <p className="text-slate-600">Configure clipping sources to start monitoring content</p>
            <button
              onClick={() => router.push('/clipping')}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Configure Sources
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
