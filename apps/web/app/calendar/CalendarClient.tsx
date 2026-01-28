'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { apiGet, buildApiUrl } from '@/lib/api';

type ClientRow = {
  id: string;
  name: string;
  country?: string | null;
  uf?: string | null;
  city?: string | null;
  segment_primary?: string | null;
  updated_at?: string | null;
};

type CalendarPost = {
  id?: string;
  date?: string;
  platform?: string;
  objective?: string;
  format?: string;
  theme?: string;
  copy?: {
    headline?: string;
  };
};

type CalendarEventItem = {
  id: string;
  name: string;
  slug?: string;
  categories?: string[];
  tags?: string[];
  source?: string;
  score: number;
  tier: 'A' | 'B' | 'C';
  why?: string;
};

type MonthEventsResponse = {
  month: string;
  client_id?: string;
  total_events: number;
  days: Record<string, CalendarEventItem[]>;
};

type CalendarRow = {
  id: string;
  month: string;
  platform: string;
  objective: string;
  created_at?: string | null;
  posts?: CalendarPost[];
};

type CalendarCell = {
  date: Date;
  dateISO: string;
  day: number;
  inMonth: boolean;
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const EVENT_TIER_CLASSES: Record<CalendarEventItem['tier'], string> = {
  A: 'tier-a',
  B: 'tier-b',
  C: 'tier-c',
};

type CalendarHubProps = {
  initialClientId?: string | null;
};

function parseISODate(dateISO: string) {
  const [year, month, day] = dateISO.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function addDays(date: Date, delta: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + delta);
  return next;
}

function startOfWeek(date: Date) {
  const day = date.getDay();
  return addDays(date, -day);
}

function getCurrentMonth() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${now.getFullYear()}-${month}`;
}

function formatMonthLabel(month: string) {
  const [year, monthNum] = month.split('-').map(Number);
  if (!year || !monthNum) return month;
  const date = new Date(year, monthNum - 1, 1);
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);
}

function shiftMonth(month: string, delta: number) {
  const [year, monthNum] = month.split('-').map(Number);
  if (!year || !monthNum) return month;
  const date = new Date(year, monthNum - 1 + delta, 1);
  const nextMonth = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${nextMonth}`;
}

function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDayLabel(dateISO: string) {
  const date = parseISODate(dateISO);
  if (!date) return dateISO;
  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function formatEventWhy(value?: string) {
  if (!value) return '';
  const match = value.match(/base_relevance[:=]\s*(\d+)/i);
  if (!match) return value;
  return `Relevância: ${match[1]}%`;
}

function buildMonthGrid(month: string): CalendarCell[] {
  const [year, monthNum] = month.split('-').map(Number);
  if (!year || !monthNum) return [];

  const firstDay = new Date(year, monthNum - 1, 1);
  const startDay = firstDay.getDay();
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  const daysInPrevMonth = new Date(year, monthNum - 1, 0).getDate();

  const cells: CalendarCell[] = [];
  for (let i = 0; i < 42; i += 1) {
    const dayIndex = i - startDay + 1;
    let date: Date;
    let inMonth = true;

    if (dayIndex < 1) {
      date = new Date(year, monthNum - 2, daysInPrevMonth + dayIndex);
      inMonth = false;
    } else if (dayIndex > daysInMonth) {
      date = new Date(year, monthNum - 1, dayIndex);
      inMonth = false;
    } else {
      date = new Date(year, monthNum - 1, dayIndex);
    }

    cells.push({
      date,
      dateISO: toISODate(date),
      day: date.getDate(),
      inMonth,
    });
  }

  return cells;
}

function getDayTierClass(events: CalendarEventItem[]) {
  if (events.some((event) => event.tier === 'A')) return 'relevance-high';
  if (events.some((event) => event.tier === 'B')) return 'relevance-mid';
  return '';
}

export default function CalendarHubPage({ initialClientId }: CalendarHubProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null);
  const [calendars, setCalendars] = useState<CalendarRow[]>([]);
  const [eventsByDate, setEventsByDate] = useState<Map<string, CalendarEventItem[]>>(new Map());
  const [monthFilter, setMonthFilter] = useState(getCurrentMonth());
  const [activeDateISO, setActiveDateISO] = useState(toISODate(new Date()));
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [activeCalendarId, setActiveCalendarId] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState<{ email?: string; role?: string }>({});
  const [selectedDayISO, setSelectedDayISO] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventItem | null>(null);
  const [selectedEventDateISO, setSelectedEventDateISO] = useState<string | null>(null);

  const loadClients = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiGet('/clients');
      setClients(response || []);
      if (response?.length) {
        const desired = initialClientId || searchParams.get('clientId');
        const match = desired ? response.find((client: ClientRow) => client.id === desired) : null;
        setSelectedClient(match || null);
      } else {
        setSelectedClient(null);
      }
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar clientes.');
    } finally {
      setLoading(false);
    }
  }, [initialClientId, searchParams]);

  const loadCalendars = useCallback(async (clientId: string, month?: string) => {
    setLoading(true);
    setError('');
    try {
      const query = month ? `?month=${month}` : '';
      const response = await apiGet(`/clients/${clientId}/calendars${query}`);
      setCalendars(response || []);
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar calendarios.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMonthEvents = useCallback(async (clientId: string | null, month: string) => {
    setEventsLoading(true);
    setError('');
    try {
      const response = (await apiGet(
        clientId ? `/clients/${clientId}/calendar/month/${month}` : `/calendar/events/${month}`
      )) as MonthEventsResponse;
      const days = response?.days || {};
      const map = new Map<string, CalendarEventItem[]>();
      Object.entries(days).forEach(([date, items]) => {
        const unique = new Map<string, CalendarEventItem>();
        (items || []).forEach((item, index) => {
          const nameKey = `${item.slug || item.name || ''}`.trim().toLowerCase();
          const key = nameKey || item.id || String(index);
          if (!unique.has(key)) unique.set(key, item);
        });
        map.set(date, Array.from(unique.values()));
      });
      setEventsByDate(map);
    } catch (err: any) {
      setEventsByDate(new Map());
      setError(err?.message || 'Falha ao carregar datas do calendario.');
    } finally {
      setEventsLoading(false);
    }
  }, []);

  useEffect(() => {
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem('edro_user') : null;
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        setUser({});
      }
    }

    loadClients();
  }, [loadClients]);

  useEffect(() => {
    if (selectedClient) {
      loadCalendars(selectedClient.id, monthFilter);
    } else {
      setCalendars([]);
      setActiveCalendarId('all');
    }
    loadMonthEvents(selectedClient?.id ?? null, monthFilter);
  }, [selectedClient, monthFilter, loadCalendars, loadMonthEvents]);

  useEffect(() => {
    setSelectedDayISO(null);
    setSelectedEvent(null);
    setSelectedEventDateISO(null);
  }, [selectedClient, monthFilter]);

  useEffect(() => {
    if (!activeDateISO.startsWith(monthFilter)) {
      setActiveDateISO(`${monthFilter}-01`);
    }
  }, [monthFilter, activeDateISO]);

  useEffect(() => {
    if (!calendars.length) {
      setActiveCalendarId('all');
      return;
    }
    const exists = calendars.some((calendar) => calendar.id === activeCalendarId);
    if (!exists) {
      setActiveCalendarId(calendars.length > 1 ? 'all' : calendars[0].id);
    }
  }, [calendars, activeCalendarId]);

  const handleExport = async (id: string, kind: 'csv' | 'iclips') => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('edro_token') : null;
    if (!token) return;

    const path =
      kind === 'csv'
        ? `/api/calendars/${id}/export.csv`
        : `/api/calendars/${id}/export.iclips.json`;

    const response = await fetch(buildApiUrl(path), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      setError('Falha ao exportar.');
      return;
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = kind === 'csv' ? `calendar-${id}.csv` : `calendar-${id}.iclips.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const visibleCalendars = useMemo(() => {
    if (!calendars.length) return [];
    if (activeCalendarId === 'all') return calendars;
    return calendars.filter((calendar) => calendar.id === activeCalendarId);
  }, [calendars, activeCalendarId]);

  const postsByDate = useMemo(() => {
    const map = new Map<string, Array<CalendarPost & { calendarId: string }>>();
    for (const calendar of visibleCalendars) {
      const posts = calendar.posts || [];
      for (const post of posts) {
        const dateISO = String(post.date || '');
        if (!dateISO) continue;
        if (!map.has(dateISO)) {
          map.set(dateISO, []);
        }
        map.get(dateISO)!.push({
          ...post,
          calendarId: calendar.id,
          platform: calendar.platform,
          objective: calendar.objective,
        });
      }
    }
    return map;
  }, [visibleCalendars]);

  const dayEvents = useMemo(() => {
    return eventsByDate.get(activeDateISO) || [];
  }, [eventsByDate, activeDateISO]);

  const dayPosts = useMemo(() => {
    return postsByDate.get(activeDateISO) || [];
  }, [postsByDate, activeDateISO]);

  const monthCells = useMemo(() => buildMonthGrid(monthFilter), [monthFilter]);
  const todayISO = useMemo(() => toISODate(new Date()), []);
  const monthLabel = useMemo(() => formatMonthLabel(monthFilter), [monthFilter]);
  const activeDate = useMemo(() => parseISODate(activeDateISO) || new Date(), [activeDateISO]);
  const weekStart = useMemo(() => startOfWeek(activeDate), [activeDate]);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );
  const headerLabel = useMemo(() => {
    if (view === 'month') return monthLabel;
    if (view === 'week') {
      const startISO = toISODate(weekStart);
      const endISO = toISODate(addDays(weekStart, 6));
      return `${formatDayLabel(startISO)} - ${formatDayLabel(endISO)}`;
    }
    return formatDayLabel(activeDateISO);
  }, [view, monthLabel, weekStart, activeDateISO]);

  const totalPosts = useMemo(() => {
    return visibleCalendars.reduce((sum, calendar) => sum + (calendar.posts?.length || 0), 0);
  }, [visibleCalendars]);

  const totalEvents = useMemo(() => {
    let total = 0;
    eventsByDate.forEach((items) => {
      total += items.length;
    });
    return total;
  }, [eventsByDate]);

  const activeCalendar = useMemo(() => {
    if (activeCalendarId === 'all') return null;
    return calendars.find((calendar) => calendar.id === activeCalendarId) || null;
  }, [calendars, activeCalendarId]);

  const selectionLabel = useMemo(() => {
    if (!selectedClient) return 'Global calendar';
    const location = [selectedClient.city, selectedClient.uf].filter(Boolean).join(' / ');
    return location ? `${selectedClient.name} / ${location}` : selectedClient.name;
  }, [selectedClient]);

  const selectedDayLabel = useMemo(() => {
    if (!selectedDayISO) return '';
    return formatDayLabel(selectedDayISO);
  }, [selectedDayISO]);

  const selectedDayEvents = useMemo(() => {
    if (!selectedDayISO) return [];
    return eventsByDate.get(selectedDayISO) || [];
  }, [eventsByDate, selectedDayISO]);

  const selectedDayPosts = useMemo(() => {
    if (!selectedDayISO) return [];
    return postsByDate.get(selectedDayISO) || [];
  }, [postsByDate, selectedDayISO]);

  const eventDetailDateISO = selectedEventDateISO || selectedDayISO || activeDateISO;

  const selectedEventDateLabel = useMemo(() => {
    if (!eventDetailDateISO) return '';
    return formatDayLabel(eventDetailDateISO);
  }, [eventDetailDateISO]);

  const handleSelectDay = useCallback((dateISO: string) => {
    setActiveDateISO(dateISO);
    setSelectedDayISO(dateISO);
    setSelectedEvent(null);
    setSelectedEventDateISO(null);
  }, []);

  const handleSelectEvent = useCallback((event: CalendarEventItem, dateISO: string) => {
    setActiveDateISO(dateISO);
    setSelectedDayISO(dateISO);
    setSelectedEvent(event);
    setSelectedEventDateISO(dateISO);
  }, []);

  const buildStudioUrl = useCallback(
    (event: CalendarEventItem, dateISO: string) => {
      const params = new URLSearchParams();
      if (selectedClient?.name) params.set('client', selectedClient.name);
      if (selectedClient?.id) params.set('clientId', selectedClient.id);
      if (selectedClient?.segment_primary) params.set('segment', selectedClient.segment_primary);
      const location = [selectedClient?.city, selectedClient?.uf].filter(Boolean).join(' / ');
      if (location) params.set('location', location);
      if (dateISO) params.set('date', dateISO);
      if (event?.name) params.set('event', event.name);
      if (Number.isFinite(event?.score)) params.set('score', String(event.score));
      if (event?.tier) params.set('tier', event.tier);
      if (event?.categories?.length) params.set('categories', event.categories.join(', '));
      if (event?.tags?.length) params.set('tags', event.tags.join(', '));
      if (event?.why) params.set('why', event.why);
      if (event?.source) params.set('source', event.source);
      const query = params.toString();
      return query ? `/studio?${query}` : '/studio';
    },
    [selectedClient]
  );

  const handlePrev = () => {
    if (view === 'month') {
      setMonthFilter(shiftMonth(monthFilter, -1));
      return;
    }
    const delta = view === 'week' ? -7 : -1;
    setActiveDateISO(toISODate(addDays(activeDate, delta)));
  };

  const handleNext = () => {
    if (view === 'month') {
      setMonthFilter(shiftMonth(monthFilter, 1));
      return;
    }
    const delta = view === 'week' ? 7 : 1;
    setActiveDateISO(toISODate(addDays(activeDate, delta)));
  };

  if (loading && clients.length === 0) {
    return (
      <div className="loading-screen">
        <div className="pulse">Carregando calendario...</div>
      </div>
    );
  }

  return (
    <AppShell title="Global Operational Calendar">
      <div className="page-content">
        {error ? (
          <div className="notice error" style={{ margin: 0 }}>
            {error}
          </div>
        ) : null}

        <div className="calendar-month">
          <div className="calendar-controls">
            <div className="toolbar">
              {(['month', 'week', 'day'] as const).map((item) => (
                <button
                  key={item}
                  className={`btn ${view === item ? 'primary' : 'ghost'}`}
                  type="button"
                  aria-pressed={view === item}
                  onClick={() => setView(item)}
                >
                  {item === 'month' ? 'Month' : item === 'week' ? 'Week' : 'Day'}
                </button>
              ))}
            </div>
            <div className="calendar-controls">
              <button className="icon-btn ghost" type="button" onClick={handlePrev}>
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <div className="calendar-month-label">{headerLabel}</div>
              <button className="icon-btn ghost" type="button" onClick={handleNext}>
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          </div>
          <div className="calendar-filters">
            <select
              className="edro-select"
              value={selectedClient?.id || ''}
              onChange={(event) => {
                if (!event.target.value) {
                  setSelectedClient(null);
                  return;
                }
                const next = clients.find((client) => client.id === event.target.value) || null;
                setSelectedClient(next);
              }}
            >
              <option value="">All Clients</option>
              {clients.length === 0 ? null : (
                clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))
              )}
            </select>
            <select
              className="edro-select"
              value={activeCalendarId}
              onChange={(event) => setActiveCalendarId(event.target.value)}
            >
              {calendars.length > 1 ? <option value="all">All Calendars</option> : null}
              {calendars.map((calendar) => (
                <option key={calendar.id} value={calendar.id}>
                  {calendar.platform} • {calendar.objective}
                </option>
              ))}
            </select>
            <input
              className="edro-input"
              type="month"
              value={monthFilter}
              onChange={(event) => setMonthFilter(event.target.value)}
            />
            {activeCalendar ? (
              <button
                className="btn primary"
                type="button"
                onClick={() => router.push(`/calendar/${activeCalendar.id}`)}
              >
                <span className="material-symbols-outlined">fact_check</span>
                Review calendar
              </button>
            ) : null}
          </div>
        </div>
  
        <div className="calendar-legend">
          <span className="legend-item tier-a">High</span>
          <span className="legend-item tier-b">Medium</span>
          <span className="legend-item tier-c">Low</span>
          <span className="legend-status">{selectionLabel}</span>
          <span className="legend-status">{totalPosts} posts</span>
          <span className="legend-status">{totalEvents} dates</span>
          {eventsLoading ? <span className="legend-status">Loading dates...</span> : null}
        </div>
  
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="calendar-surface flex-1">
            {view === 'month' ? (
              <div className="min-w-[900px]">
                <div className="calendar-weekdays">
                  {WEEKDAYS.map((day) => (
                    <span key={day}>{day}</span>
                  ))}
                </div>
                <div className="calendar-grid">
                  {monthCells.map((cell) => {
                    const posts = postsByDate.get(cell.dateISO) || [];
                    const events = eventsByDate.get(cell.dateISO) || [];
                    const visibleEvents = events.slice(0, 2);
                    const extraEvents = events.length - visibleEvents.length;
                    const visiblePosts = posts.slice(0, 2);
                    const extraPosts = posts.length - visiblePosts.length;
                    const isToday = cell.dateISO === todayISO;
                    const tierClass = getDayTierClass(events);
  
                    return (
                      <div
                        key={cell.dateISO}
                        className={`calendar-day ${cell.inMonth ? '' : 'muted'} ${isToday ? 'today' : ''} ${tierClass}`}
                      >
                        <button
                          type="button"
                          className="calendar-day-head bg-transparent border-0 p-0 text-left"
                          onClick={() => handleSelectDay(cell.dateISO)}
                        >
                          <span className="calendar-day-number">{cell.day}</span>
                          <div className="calendar-day-meta">
                            {events.length ? (
                              <span className="calendar-day-count events">{events.length} events</span>
                            ) : null}
                            {posts.length ? (
                              <span className="calendar-day-count posts">{posts.length} posts</span>
                            ) : null}
                          </div>
                        </button>
                        <div className="calendar-day-items">
                          {visibleEvents.map((event) => (
                            <button
                              key={`${event.id}-${cell.dateISO}`}
                              type="button"
                              className={`calendar-event ${EVENT_TIER_CLASSES[event.tier]}`}
                              onClick={() => handleSelectDay(cell.dateISO)}
                            >
                              <span className="calendar-event-title">{event.name}</span>
                              <span className="calendar-event-score">{event.score}</span>
                            </button>
                          ))}
                          {visiblePosts.map((post, idx) => (
                            <button
                              key={`${post.id || idx}-${post.calendarId}`}
                              type="button"
                              className="calendar-chip"
                              onClick={() => router.push(`/calendar/${post.calendarId}`)}
                            >
                              <span className="truncate">
                                {post.platform} · {post.copy?.headline || post.theme}
                              </span>
                            </button>
                          ))}
                          {extraEvents > 0 ? (
                            <div className="calendar-more">+{extraEvents} more events</div>
                          ) : null}
                          {extraPosts > 0 ? (
                            <div className="calendar-more">+{extraPosts} more posts</div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : view === 'week' ? (
              <div className="min-w-[900px]">
                <div className="calendar-weekdays">
                  {weekDays.map((day) => (
                    <span key={day.toISOString()}>
                      {day.toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                  ))}
                </div>
                <div className="calendar-grid">
                  {weekDays.map((day) => {
                    const dateISO = toISODate(day);
                    const posts = postsByDate.get(dateISO) || [];
                    const events = eventsByDate.get(dateISO) || [];
                    const visibleEvents = events.slice(0, 3);
                    const extraEvents = events.length - visibleEvents.length;
                    const visiblePosts = posts.slice(0, 2);
                    const extraPosts = posts.length - visiblePosts.length;
                    const isToday = dateISO === todayISO;
                    const inMonth = dateISO.startsWith(monthFilter);
                    const tierClass = getDayTierClass(events);
  
                    return (
                      <div
                        key={dateISO}
                        className={`calendar-day ${inMonth ? '' : 'muted'} ${isToday ? 'today' : ''} ${tierClass}`}
                      >
                        <button
                          type="button"
                          className="calendar-day-head bg-transparent border-0 p-0 text-left"
                          onClick={() => handleSelectDay(dateISO)}
                        >
                          <span className="calendar-day-number">
                            {day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                          <div className="calendar-day-meta">
                            {events.length ? (
                              <span className="calendar-day-count events">{events.length} events</span>
                            ) : null}
                            {posts.length ? (
                              <span className="calendar-day-count posts">{posts.length} posts</span>
                            ) : null}
                          </div>
                        </button>
                        <div className="calendar-day-items">
                          {visibleEvents.map((event) => (
                            <button
                              key={`${event.id}-${dateISO}`}
                              type="button"
                              className={`calendar-event ${EVENT_TIER_CLASSES[event.tier]}`}
                              onClick={() => handleSelectDay(dateISO)}
                            >
                              <span className="calendar-event-title">{event.name}</span>
                              <span className="calendar-event-score">{event.score}</span>
                            </button>
                          ))}
                          {visiblePosts.map((post, idx) => (
                            <button
                              key={`${post.id || idx}-${post.calendarId}`}
                              type="button"
                              className="calendar-chip"
                              onClick={() => router.push(`/calendar/${post.calendarId}`)}
                            >
                              <span className="truncate">
                                {post.platform} · {post.copy?.headline || post.theme}
                              </span>
                            </button>
                          ))}
                          {extraEvents > 0 ? (
                            <div className="calendar-more">+{extraEvents} more events</div>
                          ) : null}
                          {extraPosts > 0 ? (
                            <div className="calendar-more">+{extraPosts} more posts</div>
                          ) : null}
                          {events.length === 0 && posts.length === 0 ? (
                            <div className="calendar-more">No items</div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-4 lg:p-6">
                <div className="border-b border-slate-200 pb-4 mb-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400 font-semibold">
                    Selected day
                  </div>
                  <h3 className="calendar-month-label mt-2">{formatDayLabel(activeDateISO)}</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {activeDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric' })}
                  </p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="card">
                    <div className="card-top">
                      <span className="badge">Daily events</span>
                      <span className="badge outline">{dayEvents.length} tasks</span>
                    </div>
                    {dayEvents.length ? (
                      <div className="calendar-day-items">
                        {dayEvents.map((event) => (
                          <button
                            key={event.id}
                            type="button"
                            className="copy-block text-left cursor-pointer"
                            aria-pressed={selectedEvent?.id === event.id}
                            onClick={() => handleSelectEvent(event, activeDateISO)}
                          >
                            <div className={`calendar-event ${EVENT_TIER_CLASSES[event.tier]}`}>
                              <span className="calendar-event-title">{event.name}</span>
                              <span className="calendar-event-score">{`${Math.round(event.score)}%`}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="empty">No events for this day.</div>
                    )}
                  </div>
                  <div className="card">
                    <div className="card-top">
                      <span className="badge">Scheduled posts</span>
                      <span className="badge outline">{dayPosts.length} posts</span>
                    </div>
                    {dayPosts.length ? (
                      <div className="calendar-day-items">
                        {dayPosts.map((post, idx) => (
                          <button
                            key={`${post.id || idx}-${post.calendarId}`}
                            type="button"
                            className="calendar-chip"
                            onClick={() => router.push(`/calendar/${post.calendarId}`)}
                          >
                            <span className="truncate">
                              {post.platform} · {post.copy?.headline || post.theme || 'Post'}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="empty">No posts for this day.</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
  
          {selectedDayISO ? (
            <aside className="card w-full lg:w-96 self-start">
              <div className="card-top">
                <div>
                  <div className="card-sub">Selected day</div>
                  <h3 className="font-display text-xl">{selectedDayLabel || 'Selected day'}</h3>
                </div>
                <button
                  className="icon-btn ghost"
                  type="button"
                  onClick={() => {
                    setSelectedDayISO(null);
                    setSelectedEvent(null);
                    setSelectedEventDateISO(null);
                  }}
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="detail-grid">
                <div>
                  <div className="card-top">
                    <span className="badge">Daily events</span>
                    <span className="badge outline">{selectedDayEvents.length} tasks</span>
                  </div>
                  {selectedDayEvents.length ? (
                    <div className="calendar-day-items">
                      {selectedDayEvents.map((event) => (
                        <button
                          key={event.id}
                          type="button"
                          className="copy-block text-left cursor-pointer"
                          aria-pressed={selectedEvent?.id === event.id}
                          onClick={() => handleSelectEvent(event, selectedDayISO || activeDateISO)}
                        >
                          <div className={`calendar-event ${EVENT_TIER_CLASSES[event.tier]}`}>
                            <span className="calendar-event-title">{event.name}</span>
                            <span className="calendar-event-score">{`${Math.round(event.score)}%`}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="empty">No events for this day.</div>
                  )}
                </div>
                <div>
                  <div className="card-top">
                    <span className="badge">Scheduled posts</span>
                    <span className="badge outline">{selectedDayPosts.length} posts</span>
                  </div>
                  {selectedDayPosts.length ? (
                    <div className="calendar-day-items">
                      {selectedDayPosts.map((post, idx) => (
                        <button
                          key={`${post.id || idx}-${post.calendarId}`}
                          type="button"
                          className="calendar-chip"
                          onClick={() => router.push(`/calendar/${post.calendarId}`)}
                        >
                          <span className="truncate">
                            {post.platform} · {post.copy?.headline || post.theme || 'Post'}
                          </span>
                        </button>
                      ))}
                    </div>
                    ) : (
                      <div className="empty">No posts for this day.</div>
                    )}
                  </div>
                  <div>
                    <div className="card-top">
                      <span className="badge">Event details</span>
                      {selectedEvent ? (
                        <button
                          className="icon-btn ghost"
                          type="button"
                          onClick={() => {
                            setSelectedEvent(null);
                            setSelectedEventDateISO(null);
                          }}
                        >
                          <span className="material-symbols-outlined">close</span>
                        </button>
                      ) : null}
                    </div>
                    {selectedEvent ? (
                      <div className="copy-block">
                        <div className="card-title">
                          <h3>{selectedEvent.name}</h3>
                          <span className="status">Tier {selectedEvent.tier}</span>
                        </div>
                        <ul className="detail-list">
                          <li>
                            <span>Date</span>
                            <span>{selectedEventDateLabel || eventDetailDateISO}</span>
                          </li>
                          <li>
                            <span>Relevance</span>
                            <span>{selectedEvent.score}</span>
                          </li>
                          <li>
                            <span>Client</span>
                            <span>{selectedClient?.name || 'Global calendar'}</span>
                          </li>
                          {selectedClient?.segment_primary ? (
                            <li>
                              <span>Segment</span>
                              <span>{selectedClient.segment_primary}</span>
                            </li>
                          ) : null}
                          {[selectedClient?.city, selectedClient?.uf].filter(Boolean).length ? (
                            <li>
                              <span>Location</span>
                              <span>{[selectedClient?.city, selectedClient?.uf].filter(Boolean).join(' / ')}</span>
                            </li>
                          ) : null}
                          {selectedEvent.source ? (
                            <li>
                              <span>Source</span>
                              <span>{selectedEvent.source}</span>
                            </li>
                          ) : null}
                        </ul>
                        {selectedEvent.why ? (
                          <div className="detail-text">{formatEventWhy(selectedEvent.why)}</div>
                        ) : null}
                        {selectedEvent.categories?.length ? (
                          <div>
                            <div className="card-sub">Categories</div>
                            <div className="card-tags">
                              {selectedEvent.categories.map((category) => (
                                <span key={category} className="chip">
                                  {category}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : null}
                        {selectedEvent.tags?.length ? (
                          <div>
                            <div className="card-sub">Tags</div>
                            <div className="card-tags">
                              {selectedEvent.tags.map((tag) => (
                                <span key={tag} className="chip">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : null}
                        <button
                          className="btn primary w-full"
                          type="button"
                          onClick={() => router.push(buildStudioUrl(selectedEvent, eventDetailDateISO))}
                        >
                          Create post
                        </button>
                      </div>
                    ) : (
                      <div className="empty">Select an event to see details.</div>
                    )}
                  </div>
                </div>
            </aside>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
