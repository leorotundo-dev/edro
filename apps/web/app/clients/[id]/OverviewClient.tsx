'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';

type ClientData = {
  id: string;
  name: string;
  segment_primary?: string | null;
  profile?: {
    knowledge_base?: {
      description?: string;
    };
  } | null;
};

type PlanningStats = {
  total_posts: number;
  approved_posts: number;
  pending_posts: number;
  progress_percent: number;
};

type Campaign = {
  id: string;
  title: string;
  type: string;
  status: 'on_track' | 'review' | 'delayed';
  channels?: string[];
};

type ClientEvent = {
  id: string;
  name: string;
  date_ref: string;
  status: 'ready' | 'copywriting' | 'pending';
};

type OverviewClientProps = {
  clientId: string;
};

export default function OverviewClient({ clientId }: OverviewClientProps) {
  const [client, setClient] = useState<ClientData | null>(null);
  const [stats, setStats] = useState<PlanningStats>({ total_posts: 25, approved_posts: 18, pending_posts: 7, progress_percent: 72 });
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [events, setEvents] = useState<ClientEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [clientRes, eventsRes] = await Promise.all([
        apiGet<{ client: ClientData }>(`/clients/${clientId}`),
        apiGet<{ events: ClientEvent[] }>(`/clients/${clientId}/calendar/upcoming?limit=5`).catch(() => ({ events: [] })),
      ]);
      setClient(clientRes.client);
      setEvents(eventsRes.events || []);

      // Mock campaigns for now
      setCampaigns([
        { id: '1', title: 'Summer Launch 2024', type: 'Digital, Social, OOH', status: 'on_track' },
        { id: '2', title: 'Holiday Promo', type: 'Influencer Campaign', status: 'review' },
      ]);
    } catch (err) {
      console.error('Failed to load overview data:', err);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      month: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
      day: date.getDate().toString().padStart(2, '0'),
    };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'on_track':
        return <span className="px-2 py-1 bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400 text-[10px] font-bold rounded-full uppercase">On Track</span>;
      case 'review':
        return <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-400 text-[10px] font-bold rounded-full uppercase">Review</span>;
      case 'delayed':
        return <span className="px-2 py-1 bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 text-[10px] font-bold rounded-full uppercase">Delayed</span>;
      default:
        return null;
    }
  };

  const getEventStatus = (status: string) => {
    switch (status) {
      case 'ready':
        return { color: 'bg-green-500', label: 'Ready to post' };
      case 'copywriting':
        return { color: 'bg-yellow-500', label: 'Copywriting' };
      default:
        return { color: 'bg-slate-400', label: 'Pending' };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-400">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Main Content - 8 columns */}
      <div className="lg:col-span-8 space-y-6">
        {/* Client Summary */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-start justify-between mb-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Client Summary</h3>
            <span className="px-2 py-0.5 bg-orange-50 dark:bg-orange-950/30 text-[#FF6600] text-[10px] font-bold rounded uppercase">Active Client</span>
          </div>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
            {client?.profile?.knowledge_base?.description ||
              `${client?.name} is a valued client focused on strategic content and digital presence. Our collaboration aims to expand their market footprint through narrative-driven campaigns and high-production content for digital platforms.`}
          </p>
          <div className="grid grid-cols-2 gap-8 border-t border-slate-100 dark:border-slate-800 pt-6">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-2">Segment</p>
              <p className="font-semibold">{client?.segment_primary || 'Not defined'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-2">Key Account Managers</p>
              <div className="flex -space-x-2">
                <div className="w-7 h-7 rounded-full border-2 border-white dark:border-slate-900 bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                  A
                </div>
                <div className="w-7 h-7 rounded-full border-2 border-white dark:border-slate-900 bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                  B
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Planning Status */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Planning Status</h3>
              <p className="text-lg font-bold mt-1">Current Content Cycle</p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-display text-[#FF6600]">{stats.progress_percent}%</span>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Ready for Publish</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-[#FF6600] h-full transition-all"
                style={{ width: `${stats.progress_percent}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-2 text-green-600 mb-1">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider">Approved</span>
                </div>
                <p className="text-2xl font-display">
                  {stats.approved_posts} <span className="text-sm font-sans text-slate-400">/ {stats.total_posts} posts</span>
                </p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-600 mb-1">
                  <span className="material-symbols-outlined text-sm">schedule</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider">Pending Review</span>
                </div>
                <p className="text-2xl font-display">
                  {stats.pending_posts} <span className="text-sm font-sans text-slate-400">/ {stats.total_posts} posts</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Active Campaigns */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Campaigns</h3>
            <Link href={`/clients/${clientId}/campaigns`} className="text-[#FF6600] text-xs font-bold hover:underline">
              View All
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {campaigns.length > 0 ? campaigns.map((campaign) => (
              <div key={campaign.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded flex items-center justify-center ${
                    campaign.status === 'on_track' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600' : 'bg-orange-50 dark:bg-orange-900/30 text-orange-600'
                  }`}>
                    <span className="material-symbols-outlined">
                      {campaign.status === 'on_track' ? 'waves' : 'celebration'}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">{campaign.title}</h4>
                    <p className="text-xs text-slate-400">{campaign.type}</p>
                  </div>
                </div>
                {getStatusBadge(campaign.status)}
              </div>
            )) : (
              <div className="p-8 text-center bg-slate-50/50 dark:bg-slate-800/30">
                <p className="text-slate-400 text-xs italic">Start by creating your first campaign to see more metrics.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar - 4 columns */}
      <div className="lg:col-span-4 space-y-6">
        {/* Quick Actions */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Quick Actions</h3>
          <div className="space-y-3">
            <Link
              href={`/studio?clientId=${clientId}`}
              className="w-full bg-[#FF6600] hover:bg-orange-600 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-500/20"
            >
              <span className="material-symbols-outlined">add</span> Create post
            </Link>
            <Link
              href={`/clients/${clientId}/calendar`}
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-[#FF6600] dark:hover:border-[#FF6600] text-slate-700 dark:text-slate-200 font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              <span className="material-symbols-outlined">calendar_today</span> View calendar
            </Link>
          </div>
          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-4">
            <Link
              href={`/clients/${clientId}/library`}
              className="flex flex-col items-center p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors group"
            >
              <span className="material-symbols-outlined text-slate-400 group-hover:text-[#FF6600] mb-1">upload</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase">Upload Assets</span>
            </Link>
            <Link
              href={`/clients/${clientId}/insights`}
              className="flex flex-col items-center p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors group"
            >
              <span className="material-symbols-outlined text-slate-400 group-hover:text-[#FF6600] mb-1">description</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase">New Report</span>
            </Link>
          </div>
        </div>

        {/* Client Events */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Client Events</h3>
            <button type="button" className="material-symbols-outlined text-slate-400 hover:text-slate-600">more_horiz</button>
          </div>
          <div className="space-y-6">
            {events.length > 0 ? events.slice(0, 4).map((event, idx) => {
              const { month, day } = formatDate(event.date_ref);
              const status = getEventStatus(event.status || 'pending');
              const isActive = idx === 0;

              return (
                <div key={event.id} className="flex gap-4">
                  <div className="flex-shrink-0 w-10 text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{month}</p>
                    <p className={`text-xl font-display ${isActive ? 'text-[#FF6600]' : 'text-slate-300'}`}>{day}</p>
                  </div>
                  <div className={`flex-1 border-l-2 pl-4 ${isActive ? 'border-orange-100 dark:border-orange-900/30' : 'border-slate-100 dark:border-slate-800'}`}>
                    <h4 className="font-bold text-sm leading-none mb-2">{event.name}</h4>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${status.color}`} />
                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">{status.label}</span>
                    </div>
                  </div>
                </div>
              );
            }) : (
              <p className="text-sm text-slate-400 text-center py-4">No upcoming events</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
