'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet } from '@/lib/api';

type CalendarEvent = {
  id?: string;
  name: string;
  score?: number;
  tier?: string;
  categories?: string[];
  tags?: string[];
};

type ClientCalendarClientProps = {
  clientId: string;
};

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(date);
}

function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit' }).format(date);
}

function getTierStyle(tier?: string): string {
  if (tier === 'A') return 'bg-emerald-100 text-emerald-800
  if (tier === 'B') return 'bg-yellow-100 text-yellow-800
  return 'bg-slate-100 text-slate-700
}

function getIconForCategory(categories: string[] = [], tags: string[] = []): { icon: string; bgClass: string } {
  const tokens = [...categories, ...tags].map(t => t.toLowerCase());
  if (tokens.some(t => t.includes('comercial') || t.includes('promo'))) return { icon: 'local_offer', bgClass: 'bg-orange-100 text-orange-600' };
  if (tokens.some(t => t.includes('cultural') || t.includes('arte'))) return { icon: 'theater_comedy', bgClass: 'bg-purple-100 text-purple-600' };
  if (tokens.some(t => t.includes('esportivo') || t.includes('esporte'))) return { icon: 'sports_soccer', bgClass: 'bg-emerald-100 text-emerald-600' };
  if (tokens.some(t => t.includes('social') || t.includes('causa'))) return { icon: 'volunteer_activism', bgClass: 'bg-rose-100 text-rose-600' };
  return { icon: 'event', bgClass: 'bg-blue-100 text-blue-600' };
}

export default function ClientCalendarClient({ clientId }: ClientCalendarClientProps) {
  const router = useRouter();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<{ date: string; event: CalendarEvent }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const today = new Date();
  const todayISO = today.toISOString().slice(0, 10);
  const monthKey = todayISO.slice(0, 7);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const payload = await apiGet<any>(`/calendar/events/${monthKey}`);
      const days = payload?.days || {};
      const todayEvents = days[todayISO] || [];
      setEvents(todayEvents);

      // Get upcoming events
      const upcoming: { date: string; event: CalendarEvent }[] = [];
      const sortedDates = Object.keys(days).filter(d => d > todayISO).sort();
      for (const dateKey of sortedDates.slice(0, 4)) {
        if (days[dateKey]?.length) {
          upcoming.push({ date: dateKey, event: days[dateKey][0] });
        }
      }
      setUpcomingEvents(upcoming);
    } catch (err: any) {
      setError(err?.message || 'Failed to load calendar.');
    } finally {
      setLoading(false);
    }
  }, [monthKey, todayISO]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const pendingCount = events.filter(e => e.tier === 'C').length;
  const priorityTags = Array.from(new Set(events.flatMap(e => e.tags || []))).slice(0, 3);

  return (
    <div className="space-y-10">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Today Hero Block */}
      <section className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-8 flex flex-wrap justify-between items-end gap-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="font-display text-5xl font-black text-slate-900 tracking-tight">
                {String(today.getDate()).padStart(2, '0')}/{String(today.getMonth() + 1).padStart(2, '0')}
              </h2>
              <span className="px-3 py-1 rounded-full border border-slate-200 text-xs font-bold text-slate-500 bg-slate-100">
                {formatDate(today).split(',')[0]}
              </span>
            </div>
            <p className="text-lg text-slate-500 font-medium">Operational Roadmap & Key Events</p>
          </div>
          <div className="flex gap-3">
            <button
              className="flex items-center gap-2 px-6 py-3 bg-[#FF6600] text-white font-bold rounded-lg shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all"
              onClick={() => router.push('/studio')}
            >
              <span className="material-symbols-outlined text-sm">add_box</span>
              Create post
            </button>
            <button
              className="flex items-center gap-2 px-6 py-3 border-2 border-slate-200 text-slate-900 font-bold rounded-lg hover:bg-slate-50 transition-all"
              onClick={() => router.push(`/calendar?date=${todayISO}`)}
            >
              <span className="material-symbols-outlined text-sm">calendar_view_day</span>
              View in calendar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-8">
          {/* Today's Observances */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Today's observances</h3>
              <button
                className="text-xs font-semibold text-[#FF6600] hover:underline"
                onClick={() => router.push(`/calendar?date=${todayISO}`)}
              >
                Open day view
              </button>
            </div>
            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-2">
              {loading ? (
                <div className="text-xs text-slate-500">Loading calendar...</div>
              ) : events.length === 0 ? (
                <div className="text-xs text-slate-500">No observances for today.</div>
              ) : (
                events.map((event, idx) => {
                  const { icon, bgClass } = getIconForCategory(event.categories, event.tags);
                  const score = Math.round(event.score || 0);
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 bg-white hover:border-[#FF6600]/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bgClass}`}>
                          <span className="material-symbols-outlined text-2xl">{icon}</span>
                        </div>
                        <div>
                          <h4 className="font-semibold">{event.name}</h4>
                          <p className="text-xs text-slate-500">Relevance: {score}%</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider ${getTierStyle(event.tier)}`}>
                        Tier {event.tier || 'C'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* At a glance */}
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">At a glance</p>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Total observances</span>
                  <span className="font-semibold text-slate-900">{events.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Clients impacted</span>
                  <span className="font-semibold text-slate-900">1</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Pending actions</span>
                  <span className="font-semibold text-[#FF6600]">{pendingCount}</span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Priority segments</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {priorityTags.length === 0 ? (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">General</span>
                ) : (
                  priorityTags.map((tag, idx) => (
                    <span
                      key={tag}
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        idx === 0 ? 'bg-orange-100 text-orange-700' : idx === 1 ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {tag}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Upcoming Relevant Dates */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl font-bold">Upcoming Relevant Dates</h2>
          <button className="text-sm font-bold text-[#FF6600] hover:underline" onClick={() => router.push('/calendar')}>
            View Roadmap
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {upcomingEvents.length === 0 ? (
            <div className="text-xs text-slate-500">No upcoming events this month.</div>
          ) : (
            upcomingEvents.map((item) => {
              const eventDate = new Date(item.date);
              const score = Math.round(item.event.score || 0);
              return (
                <div
                  key={item.date}
                  className="bg-white p-5 rounded-xl border border-slate-200 hover:border-[#FF6600]/50 transition-all cursor-pointer"
                  onClick={() => router.push(`/calendar?date=${item.date}`)}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">{formatShortDate(eventDate)}</p>
                      <h4 className="font-bold text-sm">{item.event.name}</h4>
                    </div>
                    <span className="text-xs bg-slate-100 px-2 py-1 rounded">Relevance {score}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-[#FF6600] h-full" style={{ width: `${score}%` }} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Weekly Performance */}
      <section className="space-y-6">
        <h2 className="font-display text-2xl font-bold">Weekly Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Best Post */}
          <div className="bg-white rounded-xl border-l-4 border-green-500 shadow-sm border border-y border-r border-slate-200 p-5">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] font-black uppercase text-green-600 tracking-tighter">Best Post of the Week</span>
              <span className="material-symbols-outlined text-green-500">trending_up</span>
            </div>
            <div className="flex gap-4 items-center">
              <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-slate-400">image</span>
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-bold text-slate-500">Top performing content</p>
                <h5 className="text-sm font-bold leading-tight">Weekly highlight post</h5>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Engagement Rate</p>
                <p className="text-lg font-black text-green-600">8.42%</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Reach</p>
                <p className="text-lg font-black">1.2M</p>
              </div>
            </div>
          </div>

          {/* Worst Post */}
          <div className="bg-white rounded-xl border-l-4 border-red-400 shadow-sm border border-y border-r border-slate-200 p-5 opacity-80">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] font-black uppercase text-red-500 tracking-tighter">Underperforming</span>
              <span className="material-symbols-outlined text-red-400">trending_down</span>
            </div>
            <div className="flex gap-4 items-center">
              <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center grayscale">
                <span className="material-symbols-outlined text-slate-400">image</span>
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-bold text-slate-500">Needs improvement</p>
                <h5 className="text-sm font-bold leading-tight">Lowest engagement content</h5>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Engagement Rate</p>
                <p className="text-lg font-black text-red-400">0.12%</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Reach</p>
                <p className="text-lg font-black">4.5K</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
