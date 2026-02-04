'use client';

import { useEffect, useState } from 'react';

type KPICard = {
  label: string;
  value: string;
  change: number;
  trend: 'up' | 'down';
};

type PostPerformance = {
  id: string;
  date: string;
  platform: 'Instagram' | 'LinkedIn' | 'Twitter' | 'TikTok';
  content: string;
  thumbnail?: string;
  reach: string;
  engagement: string;
  roi: string;
};

type FormatPerformance = {
  format: string;
  engagement: string;
  percent: number;
};

type PlatformDistribution = {
  platform: string;
  percent: number;
  color: string;
};

type ClientPerformanceClientProps = {
  clientId: string;
};

export default function ClientPerformanceClient({ clientId }: ClientPerformanceClientProps) {
  const [loading, setLoading] = useState(true);
  const [platform, setPlatform] = useState('all');
  const [period, setPeriod] = useState('30d');
  const [kpis, setKpis] = useState<KPICard[]>([]);
  const [posts, setPosts] = useState<PostPerformance[]>([]);
  const [formats, setFormats] = useState<FormatPerformance[]>([]);
  const [platforms, setPlatforms] = useState<PlatformDistribution[]>([]);

  useEffect(() => {
    // Simulated data - replace with API call
    setTimeout(() => {
      setKpis([
        { label: 'Total Reach', value: '1,284,502', change: 12.4, trend: 'up' },
        { label: 'Engagement Rate', value: '4.82%', change: 3.2, trend: 'up' },
        { label: 'Avg. CTR', value: '1.15%', change: -0.8, trend: 'down' },
        { label: 'Conversion', value: '0.42%', change: 5.7, trend: 'up' },
      ]);
      setPosts([
        {
          id: '1',
          date: 'Oct 24, 2023',
          platform: 'Instagram',
          content: 'The Golden Hour Brew...',
          reach: '12.4k',
          engagement: '4.2%',
          roi: '3.2x',
        },
        {
          id: '2',
          date: 'Oct 22, 2023',
          platform: 'LinkedIn',
          content: 'Sustainability Report...',
          reach: '8.1k',
          engagement: '2.8%',
          roi: '1.8x',
        },
        {
          id: '3',
          date: 'Oct 20, 2023',
          platform: 'Instagram',
          content: 'Behind the Scenes...',
          reach: '24.5k',
          engagement: '5.1%',
          roi: '4.5x',
        },
      ]);
      setFormats([
        { format: 'Video / Reels', engagement: '42.5k Eng.', percent: 85 },
        { format: 'Carousel', engagement: '28.1k Eng.', percent: 60 },
        { format: 'Static Image', engagement: '12.4k Eng.', percent: 35 },
        { format: 'Stories', engagement: '9.2k Eng.', percent: 25 },
      ]);
      setPlatforms([
        { platform: 'Instagram', percent: 60, color: 'bg-[#FF6600]' },
        { platform: 'LinkedIn', percent: 25, color: 'bg-slate-400' },
        { platform: 'Other', percent: 15, color: 'bg-slate-200 },
      ]);
      setLoading(false);
    }, 600);
  }, [clientId]);

  const getPlatformBadge = (platform: string) => {
    const styles: Record<string, string> = {
      Instagram: 'bg-pink-50 text-pink-600
      LinkedIn: 'bg-blue-50 text-blue-600
      Twitter: 'bg-sky-50 text-sky-600
      TikTok: 'bg-slate-100 text-slate-700
    };
    return styles[platform] || styles.TikTok;
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-end gap-3">
        <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all font-semibold text-sm">
          <span className="material-symbols-outlined text-sm text-slate-500">file_download</span>
          Export Report
        </button>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#FF6600] text-white border border-[#FF6600] rounded-lg hover:bg-orange-600 transition-all font-semibold text-sm">
          <span className="material-symbols-outlined text-sm">refresh</span>
          Refresh Data
        </button>
      </div>

      {/* Filters */}
      <div className="px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Platform:</span>
            <select
              className="text-sm border-slate-200 rounded-md focus:ring-[#FF6600] focus:border-[#FF6600]"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
            >
              <option value="all">All Platforms</option>
              <option value="instagram">Instagram</option>
              <option value="linkedin">LinkedIn</option>
              <option value="twitter">Twitter / X</option>
              <option value="tiktok">TikTok</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Period:</span>
            <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-md text-sm cursor-pointer hover:border-slate-300">
              <span className="material-symbols-outlined text-sm text-slate-400">calendar_month</span>
              <span>Last 30 Days</span>
              <span className="material-symbols-outlined text-sm text-slate-400">expand_more</span>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-slate-500">Loading performance data...</div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpis.map((kpi, idx) => (
              <div
                key={idx}
                className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm"
              >
                <div className="flex justify-between items-start mb-4">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{kpi.label}</p>
                  <span
                    className={`text-xs font-bold flex items-center ${
                      kpi.trend === 'up' ? 'text-green-500' : 'text-red-500'
                    }`}
                  >
                    {kpi.trend === 'up' ? '+' : ''}
                    {kpi.change}%
                  </span>
                </div>
                <h3 className="text-3xl font-display text-slate-900">{kpi.value}</h3>
                <div className="mt-4 h-10 w-full flex items-end gap-1">
                  {[60, 80, 50, 90, 75].map((h, i) => (
                    <div
                      key={i}
                      className={`w-full rounded-sm ${
                        kpi.trend === 'up'
                          ? `bg-[#FF6600]/${(i + 1) * 20}`
                          : 'bg-slate-200'
                      }`}
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Engagement Over Time Chart */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Engagement Over Time</h3>
                <p className="text-sm text-slate-500">Comparative analysis of audience interactions</p>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#FF6600]"></span>
                  <span className="text-xs font-medium">Interactions</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-slate-400"></span>
                  <span className="text-xs font-medium">Reach</span>
                </div>
              </div>
            </div>
            <div className="h-80 w-full relative border-l border-b border-slate-200">
              <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none">
                <path
                  d="M 0 280 Q 150 240 300 180 T 600 140 T 900 60 T 1200 100"
                  fill="none"
                  stroke="#FF6600"
                  strokeWidth="3"
                />
                <path
                  d="M 0 200 Q 150 220 300 120 T 600 180 T 900 100 T 1200 140"
                  fill="none"
                  stroke="#94a3b8"
                  strokeDasharray="4"
                  strokeWidth="2"
                />
              </svg>
              <div className="absolute bottom-[-24px] w-full flex justify-between px-4 text-[10px] text-slate-400 font-bold">
                <span>OCT 01</span>
                <span>OCT 07</span>
                <span>OCT 14</span>
                <span>OCT 21</span>
                <span>OCT 28</span>
                <span>NOV 01</span>
              </div>
            </div>
          </div>

          {/* Distribution & Formats Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Platform Distribution */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-8">Platform Distribution</h3>
              <div className="flex items-center gap-8 h-48">
                <div className="relative w-40 h-40">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <circle
                      className="stroke-slate-100"
                      cx="18"
                      cy="18"
                      fill="none"
                      r="15.915"
                      strokeWidth="4"
                    />
                    <circle
                      className="stroke-[#FF6600]"
                      cx="18"
                      cy="18"
                      fill="none"
                      r="15.915"
                      strokeDasharray="60 40"
                      strokeDashoffset="0"
                      strokeWidth="4"
                    />
                    <circle
                      className="stroke-slate-400"
                      cx="18"
                      cy="18"
                      fill="none"
                      r="15.915"
                      strokeDasharray="25 75"
                      strokeDashoffset="-60"
                      strokeWidth="4"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-display">1.2M</span>
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Total</span>
                  </div>
                </div>
                <div className="flex-1 space-y-3">
                  {platforms.map((p) => (
                    <div key={p.platform} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${p.color}`}></span>
                        <span className="text-sm">{p.platform}</span>
                      </div>
                      <span className="text-sm font-bold">{p.percent}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top Performing Formats */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-8">Top Performing Formats</h3>
              <div className="space-y-4">
                {formats.map((f, idx) => (
                  <div key={f.format}>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span>{f.format}</span>
                      <span>{f.engagement}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full">
                      <div
                        className="bg-[#FF6600] h-full rounded-full"
                        style={{ width: `${f.percent}%`, opacity: 1 - idx * 0.2 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Post Performance Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Recent Post Performance</h3>
              <button className="text-[#FF6600] text-xs font-bold hover:underline">View Detailed Table</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Platform</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Content</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">
                      Reach
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">
                      Engagement
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">
                      ROI
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {posts.map((post) => (
                    <tr key={post.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-500">{post.date}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 text-[10px] font-bold rounded uppercase ${getPlatformBadge(
                            post.platform
                          )}`}
                        >
                          {post.platform}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-slate-100 border border-slate-200 flex items-center justify-center">
                            <span className="material-symbols-outlined text-slate-400 text-sm">image</span>
                          </div>
                          <span className="text-sm font-medium truncate max-w-[150px]">{post.content}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-right">{post.reach}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-right">{post.engagement}</td>
                      <td className="px-6 py-4 text-sm font-bold text-green-600 text-right">{post.roi}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Disconnected State */}
          <div className="bg-slate-100/50 border-2 border-dashed border-slate-200 rounded-xl p-12 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm">
              <span className="material-symbols-outlined text-3xl text-slate-300">link_off</span>
            </div>
            <h4 className="text-xl font-display text-slate-900 mb-2">Analytics Disconnected</h4>
            <p className="text-slate-500 text-sm max-w-sm mb-8">
              Certain data sources have been disconnected or need re-authorization to display real-time insights.
            </p>
            <button className="bg-[#FF6600] hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-orange-500/20 text-sm">
              Connect Data Source
            </button>
          </div>
        </>
      )}
    </div>
  );
}
