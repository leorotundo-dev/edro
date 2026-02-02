'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { apiGet } from '@/lib/api';

type ProductionFormat = {
  id: string;
  name: string;
  type: string;
  category: string;
  description?: string;
  dimensions?: {
    width?: number;
    height?: number;
    duration?: number;
  };
  specs?: {
    file_format?: string[];
    aspect_ratio?: string;
    max_size_mb?: number;
  };
  platforms?: string[];
  metrics?: {
    avg_engagement?: number;
    avg_reach?: number;
    avg_clicks?: number;
    total_uses?: number;
  };
  ml_insights?: {
    predicted_performance?: number;
    trending?: boolean;
    recommendation_score?: number;
  };
  tags?: string[];
  created_at?: string;
  updated_at?: string;
};

type CatalogStats = {
  total_formats: number;
  by_type: Record<string, number>;
  by_category: Record<string, number>;
  by_platform: Record<string, number>;
  most_used: ProductionFormat[];
  trending: ProductionFormat[];
};

export default function ProductionCatalogPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [formats, setFormats] = useState<ProductionFormat[]>([]);
  const [stats, setStats] = useState<CatalogStats | null>(null);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    loadCatalog();
  }, []);

  const loadCatalog = async () => {
    setLoading(true);
    try {
      const res = await apiGet<{ success: boolean; catalog: ProductionFormat[]; stats: CatalogStats }>(
        '/production/catalog'
      );
      if (res?.catalog) {
        setFormats(res.catalog);
      }
      if (res?.stats) {
        setStats(res.stats);
      }
    } catch (error) {
      console.error('Failed to load catalog:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredFormats = formats.filter((format) => {
    const matchesType = selectedType === 'all' || format.type === selectedType;
    const matchesCategory = selectedCategory === 'all' || format.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      format.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      format.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesCategory && matchesSearch;
  });

  const types = stats ? Object.keys(stats.by_type) : [];
  const categories = stats ? Object.keys(stats.by_category) : [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
          <div className="mt-4 text-slate-600">Loading production catalog...</div>
        </div>
      </div>
    );
  }

  return (
    <AppShell title="Production Catalog">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Production Format Catalog</h1>
          <p className="text-slate-600">Navegue e gerencie formatos de produção disponíveis</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="text-sm text-slate-600 mb-1">Total Formats</div>
              <div className="text-2xl font-bold text-slate-900">{stats.total_formats}</div>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="text-sm text-slate-600 mb-1">Types</div>
              <div className="text-2xl font-bold text-blue-600">{Object.keys(stats.by_type).length}</div>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="text-sm text-slate-600 mb-1">Categories</div>
              <div className="text-2xl font-bold text-purple-600">{Object.keys(stats.by_category).length}</div>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="text-sm text-slate-600 mb-1">Platforms</div>
              <div className="text-2xl font-bold text-green-600">{Object.keys(stats.by_platform).length}</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Search</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search formats..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Type</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                {types.map((type) => (
                  <option key={type} value={type}>
                    {type} ({stats?.by_type[type]})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category} ({stats?.by_category[category]})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">View</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`flex-1 px-3 py-2 rounded-lg border ${
                    viewMode === 'grid'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-700 border-slate-300'
                  }`}
                >
                  Grid
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex-1 px-3 py-2 rounded-lg border ${
                    viewMode === 'list'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-700 border-slate-300'
                  }`}
                >
                  List
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4 text-sm text-slate-600">
          Showing {filteredFormats.length} of {formats.length} formats
        </div>

        {/* Formats Grid/List */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFormats.map((format) => (
              <div
                key={format.id}
                className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 mb-1">{format.name}</h3>
                    <div className="flex gap-2">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
                        {format.type}
                      </span>
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-semibold">
                        {format.category}
                      </span>
                    </div>
                  </div>
                  {format.ml_insights?.trending && (
                    <span className="material-symbols-outlined text-orange-500">trending_up</span>
                  )}
                </div>

                {format.description && (
                  <p className="text-sm text-slate-600 mb-3 line-clamp-2">{format.description}</p>
                )}

                {format.dimensions && (
                  <div className="text-xs text-slate-500 mb-2">
                    {format.dimensions.width && format.dimensions.height && (
                      <div>📐 {format.dimensions.width}x{format.dimensions.height}px</div>
                    )}
                    {format.dimensions.duration && <div>⏱️ {format.dimensions.duration}s</div>}
                  </div>
                )}

                {format.platforms && format.platforms.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {format.platforms.map((platform) => (
                      <span
                        key={platform}
                        className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs"
                      >
                        {platform}
                      </span>
                    ))}
                  </div>
                )}

                {format.metrics && (
                  <div className="border-t border-slate-100 pt-3 mt-3">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {format.metrics.total_uses !== undefined && (
                        <div>
                          <div className="text-slate-500">Uses</div>
                          <div className="font-semibold text-slate-900">{format.metrics.total_uses}</div>
                        </div>
                      )}
                      {format.ml_insights?.predicted_performance !== undefined && (
                        <div>
                          <div className="text-slate-500">Score</div>
                          <div className="font-semibold text-green-600">
                            {Math.round(format.ml_insights.predicted_performance * 100)}%
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">Platforms</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">Uses</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFormats.map((format) => (
                  <tr key={format.id} className="hover:bg-slate-50 cursor-pointer">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{format.name}</div>
                      {format.description && (
                        <div className="text-sm text-slate-500 truncate max-w-xs">{format.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
                        {format.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-semibold">
                        {format.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {format.platforms?.slice(0, 3).map((platform) => (
                          <span
                            key={platform}
                            className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs"
                          >
                            {platform}
                          </span>
                        ))}
                        {format.platforms && format.platforms.length > 3 && (
                          <span className="text-xs text-slate-500">+{format.platforms.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900">
                      {format.metrics?.total_uses || 0}
                    </td>
                    <td className="px-4 py-3">
                      {format.ml_insights?.predicted_performance !== undefined && (
                        <span className="text-sm font-semibold text-green-600">
                          {Math.round(format.ml_insights.predicted_performance * 100)}%
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filteredFormats.length === 0 && (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
            <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">search_off</span>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No formats found</h3>
            <p className="text-slate-600">Try adjusting your filters or search query</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
