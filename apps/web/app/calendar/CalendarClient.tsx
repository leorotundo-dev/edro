'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar, momentLocalizer, type View } from 'react-big-calendar';
import moment from 'moment';
import AppShell from '@/components/AppShell';
import DashboardCard from '@/components/shared/DashboardCard';
import StatusChip from '@/components/shared/StatusChip';
import { apiGet, buildApiUrl } from '@/lib/api';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import {
  IconChevronLeft,
  IconChevronRight,
  IconX,
  IconPlus,
  IconChecklist,
} from '@tabler/icons-react';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './calendar-rbc.css';

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
  descricao_ai?: string | null;
  origem_ai?: string | null;
  curiosidade_ai?: string | null;
};

type CalendarRbcEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  tier: 'A' | 'B' | 'C';
  score: number;
  resource: {
    event: CalendarEventItem;
    dateISO: string;
  };
};

type EventRelevanceItem = {
  client_id: string;
  name: string;
  score: number;
  tier: 'A' | 'B' | 'C';
  is_relevant: boolean;
  why?: string;
};

type EventRelevanceResponse = {
  event_id: string;
  relevant_client_ids: string[];
  clients: EventRelevanceItem[];
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

moment.locale('pt-br');
const localizer = momentLocalizer(moment);
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const CALENDAR_MESSAGES = {
  today: 'Hoje',
  previous: 'Anterior',
  next: 'Próximo',
  month: 'Mês',
  week: 'Semana',
  day: 'Dia',
  agenda: 'Agenda',
  date: 'Data',
  time: 'Hora',
  event: 'Evento',
  noEventsInRange: 'Nenhum evento no período.',
  showMore: (total: number) => `+${total} mais`,
};
const EVENT_TIER_CLASSES: Record<CalendarEventItem['tier'], string> = {
  A: 'tier-a',
  B: 'tier-b',
  C: 'tier-c',
};

type CalendarHubProps = {
  initialClientId?: string | null;
  noShell?: boolean;
  embedded?: boolean;
  lockClient?: boolean;
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
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date);
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
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function formatEventWhy(value?: string) {
  if (!value) return '';
  const match = value.match(/base_relevance[:=]\s*(\d+)/i);
  if (!match) return value;
  return `Relevancia: ${match[1]}%`;
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

const TIER_COLORS: Record<string, string> = {
  A: 'error',
  B: 'warning',
  C: 'default',
};

export default function CalendarHubPage({ initialClientId, noShell, embedded, lockClient }: CalendarHubProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [calendars, setCalendars] = useState<CalendarRow[]>([]);
  const [eventsByDate, setEventsByDate] = useState<Map<string, CalendarEventItem[]>>(new Map());
  const [monthFilter, setMonthFilter] = useState(getCurrentMonth());
  const [activeDateISO, setActiveDateISO] = useState(toISODate(new Date()));
  const [view, setView] = useState<View>('month');
  const [activeCalendarId, setActiveCalendarId] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState<{ email?: string; role?: string }>({});
  const [selectedDayISO, setSelectedDayISO] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventItem | null>(null);
  const [selectedEventDateISO, setSelectedEventDateISO] = useState<string | null>(null);
  const [relevanceByClientId, setRelevanceByClientId] = useState<Record<string, EventRelevanceItem>>({});
  const [relevanceLoading, setRelevanceLoading] = useState(false);
  const [showAllClients, setShowAllClients] = useState(false);

  const isLocked = Boolean(lockClient && initialClientId);

  const loadClients = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiGet('/clients');
      setClients(response || []);
      if (response?.length) {
        const desired = initialClientId || searchParams.get('clientId');
        let match = desired ? response.find((client: ClientRow) => client.id === desired) : null;
        if (!match && typeof window !== 'undefined') {
          const stored = window.localStorage.getItem('edro_active_client_id');
          if (stored === 'all') {
            setSelectedClient(null);
            return;
          }
          if (stored) {
            match = response.find((client: ClientRow) => client.id === stored) || null;
          }
        }
        if (!match) {
          match = response[0] || null;
        }
        if (isLocked && match) {
          setClients([match]);
          setSelectedClient(match);
        } else {
          setSelectedClient(match || null);
        }
      } else {
        setSelectedClient(null);
      }
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar clientes.');
    } finally {
      setLoading(false);
    }
  }, [initialClientId, isLocked, searchParams]);

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
    if (!selectedClient?.id) return;
    if (selectedClientIds.includes(selectedClient.id)) return;
    if (selectedEvent) {
      const relevance = relevanceByClientId[selectedClient.id];
      if (relevance && !relevance.is_relevant) return;
    }
    setSelectedClientIds((prev) => [...prev, selectedClient.id]);
  }, [selectedClient, selectedClientIds, selectedEvent, relevanceByClientId]);

  useEffect(() => {
    setSelectedDayISO(null);
    setSelectedEvent(null);
    setSelectedEventDateISO(null);
    setRelevanceByClientId({});
    setShowAllClients(false);
  }, [selectedClient, monthFilter]);

  const loadEventRelevance = useCallback(
    async (eventId: string) => {
      setRelevanceLoading(true);
      try {
        const response = (await apiGet(`/calendar/events/${eventId}/relevance`)) as EventRelevanceResponse;
        const map: Record<string, EventRelevanceItem> = {};
        (response?.clients || []).forEach((item) => {
          map[item.client_id] = item;
        });
        setRelevanceByClientId(map);
        const recommendedIds = response?.relevant_client_ids || [];
        setSelectedClientIds(recommendedIds);
      } catch (err: any) {
        setRelevanceByClientId({});
      } finally {
        setRelevanceLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!selectedEvent?.id) {
      setRelevanceByClientId({});
      setShowAllClients(false);
      return;
    }
    if (selectedClient?.id) {
      setRelevanceByClientId({});
      setSelectedClientIds([selectedClient.id]);
      return;
    }
    loadEventRelevance(selectedEvent.id);
  }, [selectedEvent?.id, loadEventRelevance, selectedClient]);

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

  const calendarEvents = useMemo<CalendarRbcEvent[]>(() => {
    const output: CalendarRbcEvent[] = [];
    eventsByDate.forEach((items, dateISO) => {
      const startDate = parseISODate(dateISO);
      if (!startDate) return;
      const endDate = addDays(startDate, 1);
      items.forEach((item, index) => {
        output.push({
          id: `${item.id}-${dateISO}-${index}`,
          title: item.name,
          start: startDate,
          end: endDate,
          allDay: true,
          tier: item.tier,
          score: item.score,
          resource: { event: item, dateISO },
        });
      });
    });
    return output;
  }, [eventsByDate]);

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

  const selectedClients = useMemo(() => {
    if (!selectedClientIds.length) return [];
    return clients.filter((client) => selectedClientIds.includes(client.id));
  }, [clients, selectedClientIds]);

  const isFilteredToClient = Boolean(selectedClient?.id);

  const recommendedClientIds = useMemo(
    () => Object.values(relevanceByClientId).filter((item) => item.is_relevant).map((item) => item.client_id),
    [relevanceByClientId]
  );

  const recommendedClients = useMemo(
    () => clients.filter((client) => recommendedClientIds.includes(client.id)),
    [clients, recommendedClientIds]
  );

  const visibleClients = useMemo(() => {
    if (isFilteredToClient && selectedClient) return [selectedClient];
    if (showAllClients || !selectedEvent) return clients;
    if (!recommendedClients.length) return [];
    return recommendedClients;
  }, [clients, recommendedClients, selectedEvent, showAllClients, isFilteredToClient, selectedClient]);

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
    if (!selectedClient?.id) {
      setSelectedClientIds([]);
      setShowAllClients(false);
    }
  }, [selectedClient]);

  const buildStudioUrl = useCallback(
    (event: CalendarEventItem, dateISO: string) => {
      const params = new URLSearchParams();
      const primaryClient = selectedClients[0];
      if (selectedClients.length === 1 && primaryClient) {
        if (primaryClient.name) params.set('client', primaryClient.name);
        if (primaryClient.id) params.set('clientId', primaryClient.id);
        if (primaryClient.segment_primary) params.set('segment', primaryClient.segment_primary);
        const location = [primaryClient.city, primaryClient.uf].filter(Boolean).join(' / ');
        if (location) params.set('location', location);
      }
      if (selectedClients.length) {
        params.set('clientIds', selectedClients.map((client) => client.id).join(','));
        params.set('clients', selectedClients.map((client) => client.name).join(','));
      }
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
    [selectedClients]
  );

  const handleToggleClient = (clientId: string) => {
    if (isFilteredToClient) return;
    setSelectedClientIds((prev) => {
      if (prev.includes(clientId)) {
        return prev.filter((id) => id !== clientId);
      }
      return [...prev, clientId];
    });
  };

  const handleSelectAllClients = () => {
    if (isFilteredToClient && selectedClient?.id) {
      setSelectedClientIds([selectedClient.id]);
      return;
    }
    setSelectedClientIds(clients.map((client) => client.id));
  };

  const handleClearClients = () => {
    if (isFilteredToClient && selectedClient?.id) {
      setSelectedClientIds([selectedClient.id]);
      return;
    }
    setSelectedClientIds([]);
  };

  const persistStudioContext = (event: CalendarEventItem, dateISO: string) => {
    if (typeof window === 'undefined') return;
    const selected = selectedClients;
    window.localStorage.setItem('edro_selected_clients', JSON.stringify(selected));
    const activeId = selected[0]?.id || '';
    if (activeId) window.localStorage.setItem('edro_active_client_id', activeId);
    const context = {
      client: selected[0]?.name || '',
      clientId: selected[0]?.id || '',
      segment: selected[0]?.segment_primary || '',
      date: dateISO,
      event: event?.name || '',
      score: event?.score,
      tags: event?.tags?.join(', ') || '',
      categories: event?.categories?.join(', ') || '',
      source: event?.source || '',
      why: event?.why || '',
    };
    window.localStorage.setItem('edro_studio_context', JSON.stringify(context));
    window.dispatchEvent(new CustomEvent('edro-studio-context-change'));
  };

  const handleCreatePost = (event: CalendarEventItem, dateISO: string) => {
    if (!selectedClientIds.length) {
      setError('Selecione ao menos um cliente para criar o post.');
      return;
    }
    persistStudioContext(event, dateISO);
    router.push(buildStudioUrl(event, dateISO));
  };

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

  const handleRbcNavigate = useCallback(
    (date: Date) => {
      const nextMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      setMonthFilter(nextMonth);
      setActiveDateISO(toISODate(date));
    },
    []
  );

  const handleRbcSelectSlot = useCallback(
    (slotInfo: { start: Date }) => {
      const dateISO = toISODate(slotInfo.start);
      handleSelectDay(dateISO);
    },
    [handleSelectDay]
  );

  const handleRbcSelectEvent = useCallback(
    (event: CalendarRbcEvent) => {
      handleSelectEvent(event.resource.event, event.resource.dateISO);
    },
    [handleSelectEvent]
  );

  const rbcEventPropGetter = useCallback((event: CalendarRbcEvent) => {
    return { className: `tier-${event.tier.toLowerCase()}` };
  }, []);

  const CalendarEventContent = ({ event }: { event: CalendarRbcEvent }) => (
    <span className="rbc-event-content">
      <span className="truncate">{event.title}</span>
      <span className="rbc-event-score">{Math.round(event.score)}%</span>
    </span>
  );

  if (loading && clients.length === 0) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 300 }}>
        <CircularProgress size={28} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Carregando calendario...
        </Typography>
      </Stack>
    );
  }

  const content = (
    <Stack spacing={3} sx={{ minWidth: 0 }}>
      {error ? <Alert severity="error">{error}</Alert> : null}

      {/* Calendar controls and filters */}
      <DashboardCard>
        <Stack spacing={2}>
          <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" flexWrap="wrap">
            <ToggleButtonGroup
              value={view}
              exclusive
              size="small"
              onChange={(_, newView) => { if (newView) setView(newView); }}
            >
              <ToggleButton value="month">Month</ToggleButton>
              <ToggleButton value="week">Week</ToggleButton>
              <ToggleButton value="day">Day</ToggleButton>
            </ToggleButtonGroup>

            <Stack direction="row" spacing={1} alignItems="center">
              <IconButton size="small" onClick={handlePrev}>
                <IconChevronLeft size={20} />
              </IconButton>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, minWidth: 180, textAlign: 'center' }}>
                {headerLabel}
              </Typography>
              <IconButton size="small" onClick={handleNext}>
                <IconChevronRight size={20} />
              </IconButton>
            </Stack>
          </Stack>

          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
            <TextField
              select
              size="small"
              label="Client"
              value={selectedClient?.id || ''}
              onChange={(event) => {
                if (!event.target.value) {
                  setSelectedClient(null);
                  if (typeof window !== 'undefined') {
                    window.localStorage.setItem('edro_active_client_id', 'all');
                  }
                  return;
                }
                const next = clients.find((client) => client.id === event.target.value) || null;
                setSelectedClient(next);
                if (typeof window !== 'undefined' && next?.id) {
                  window.localStorage.setItem('edro_active_client_id', next.id);
                }
              }}
              disabled={isLocked}
              sx={{ minWidth: 180 }}
            >
              <MenuItem value="">All Clients</MenuItem>
              {clients.map((client) => (
                <MenuItem key={client.id} value={client.id}>{client.name}</MenuItem>
              ))}
            </TextField>

            <TextField
              select
              size="small"
              label="Calendar"
              value={activeCalendarId}
              onChange={(event) => setActiveCalendarId(event.target.value)}
              sx={{ minWidth: 200 }}
            >
              {calendars.length > 1 ? <MenuItem value="all">All Calendars</MenuItem> : null}
              {calendars.map((calendar) => (
                <MenuItem key={calendar.id} value={calendar.id}>
                  {calendar.platform} - {calendar.objective}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              type="month"
              size="small"
              label="Month"
              value={monthFilter}
              onChange={(event) => setMonthFilter(event.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 160 }}
            />

            {activeCalendar ? (
              <Button
                variant="contained"
                size="small"
                startIcon={<IconChecklist size={16} />}
                onClick={() => router.push(`/calendar/${activeCalendar.id}`)}
              >
                Review calendar
              </Button>
            ) : null}
          </Stack>
        </Stack>
      </DashboardCard>

      {/* Legend */}
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
        <Chip size="small" label="High" color="error" variant="filled" />
        <Chip size="small" label="Medium" color="warning" variant="filled" />
        <Chip size="small" label="Low" variant="outlined" />
        <Chip size="small" label={selectionLabel} variant="outlined" />
        <Chip size="small" label={`${totalPosts} posts`} variant="outlined" />
        <Chip size="small" label={`${totalEvents} dates`} variant="outlined" />
        {eventsLoading ? <Chip size="small" label="Loading dates..." variant="outlined" /> : null}
      </Stack>

      {/* Calendar + Day panel */}
      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2}>
        <Card variant="outlined" sx={{ flex: 1 }}>
          <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
            <Calendar
              localizer={localizer}
              events={calendarEvents}
              startAccessor="start"
              endAccessor="end"
              view={view}
              date={activeDate}
              toolbar={false}
              selectable
              popup
              messages={CALENDAR_MESSAGES}
              onNavigate={handleRbcNavigate}
              onView={(nextView) => setView(nextView)}
              onSelectSlot={handleRbcSelectSlot}
              onSelectEvent={handleRbcSelectEvent}
              eventPropGetter={rbcEventPropGetter}
              components={{ event: CalendarEventContent }}
              style={{ height: 720 }}
            />
          </CardContent>
        </Card>

        {selectedDayISO ? (
          <Card variant="outlined" sx={{ width: { xs: '100%', lg: 384 }, flexShrink: 0, alignSelf: 'flex-start' }}>
            <CardContent>
              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="overline" color="text.secondary">Selected day</Typography>
                    <Typography variant="h6">{selectedDayLabel || 'Selected day'}</Typography>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() => {
                      setSelectedDayISO(null);
                      setSelectedEvent(null);
                      setSelectedEventDateISO(null);
                    }}
                  >
                    <IconX size={18} />
                  </IconButton>
                </Stack>

                <Divider />

                {/* Daily events */}
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <Chip size="small" label="Daily events" />
                    <Chip size="small" label={`${selectedDayEvents.length} tasks`} variant="outlined" />
                  </Stack>
                  {selectedDayEvents.length ? (
                    <List dense disablePadding>
                      {selectedDayEvents.map((event) => (
                        <ListItemButton
                          key={event.id}
                          selected={selectedEvent?.id === event.id}
                          onClick={() => handleSelectEvent(event, selectedDayISO || activeDateISO)}
                          sx={{ borderRadius: 1, mb: 0.5 }}
                        >
                          <ListItemText
                            primary={event.name}
                            secondary={`${Math.round(event.score)}%`}
                          />
                          <Chip
                            size="small"
                            label={`Tier ${event.tier}`}
                            color={(TIER_COLORS[event.tier] || 'default') as any}
                          />
                        </ListItemButton>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary">No events for this day.</Typography>
                  )}
                </Box>

                <Divider />

                {/* Scheduled posts */}
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <Chip size="small" label="Scheduled posts" />
                    <Chip size="small" label={`${selectedDayPosts.length} posts`} variant="outlined" />
                  </Stack>
                  {selectedDayPosts.length ? (
                    <List dense disablePadding>
                      {selectedDayPosts.map((post, idx) => (
                        <ListItemButton
                          key={`${post.id || idx}-${post.calendarId}`}
                          onClick={() => router.push(`/calendar/${post.calendarId}`)}
                          sx={{ borderRadius: 1, mb: 0.5 }}
                        >
                          <ListItemText
                            primary={`${post.platform} - ${post.copy?.headline || post.theme || 'Post'}`}
                          />
                        </ListItemButton>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary">No posts for this day.</Typography>
                  )}
                </Box>

                <Divider />

                {/* Event details */}
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                    <Chip size="small" label="Event details" />
                    {selectedEvent ? (
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedEvent(null);
                          setSelectedEventDateISO(null);
                        }}
                      >
                        <IconX size={16} />
                      </IconButton>
                    ) : null}
                  </Stack>
                  {selectedEvent ? (
                    <Stack spacing={2}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="subtitle1" fontWeight={600}>{selectedEvent.name}</Typography>
                        <StatusChip status={selectedEvent.tier === 'A' ? 'high' : selectedEvent.tier === 'B' ? 'medium' : 'low'} label={`Tier ${selectedEvent.tier}`} />
                      </Stack>
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                        <Typography variant="caption" color="text.secondary">Date</Typography>
                        <Typography variant="body2">{selectedEventDateLabel || eventDetailDateISO}</Typography>
                        <Typography variant="caption" color="text.secondary">{selectedClient ? 'Relevance' : 'Base relevance'}</Typography>
                        <Typography variant="body2">{selectedEvent.score}</Typography>
                        <Typography variant="caption" color="text.secondary">Client</Typography>
                        <Typography variant="body2">{selectedClient?.name || 'Global calendar'}</Typography>
                        {selectedClient?.segment_primary ? (
                          <>
                            <Typography variant="caption" color="text.secondary">Segment</Typography>
                            <Typography variant="body2">{selectedClient.segment_primary}</Typography>
                          </>
                        ) : null}
                        {[selectedClient?.city, selectedClient?.uf].filter(Boolean).length ? (
                          <>
                            <Typography variant="caption" color="text.secondary">Location</Typography>
                            <Typography variant="body2">{[selectedClient?.city, selectedClient?.uf].filter(Boolean).join(' / ')}</Typography>
                          </>
                        ) : null}
                        {selectedEvent.source ? (
                          <>
                            <Typography variant="caption" color="text.secondary">Source</Typography>
                            <Typography variant="body2">{selectedEvent.source}</Typography>
                          </>
                        ) : null}
                      </Box>
                      {selectedEvent.why ? (
                        <Typography variant="body2" color="text.secondary">{formatEventWhy(selectedEvent.why)}</Typography>
                      ) : null}
                      {selectedEvent.descricao_ai ? (
                        <Box>
                          <Typography variant="overline" color="text.secondary">Sobre esta data</Typography>
                          <Typography variant="body2" sx={{ lineHeight: 1.6 }}>{selectedEvent.descricao_ai}</Typography>
                          {selectedEvent.origem_ai ? (
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                              <strong>Origem:</strong> {selectedEvent.origem_ai}
                            </Typography>
                          ) : null}
                          {selectedEvent.curiosidade_ai ? (
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                              <strong>Curiosidade:</strong> {selectedEvent.curiosidade_ai}
                            </Typography>
                          ) : null}
                        </Box>
                      ) : null}
                      {selectedEvent.categories?.length ? (
                        <Box>
                          <Typography variant="overline" color="text.secondary">Categories</Typography>
                          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                            {selectedEvent.categories.map((category) => (
                              <Chip key={category} label={category} size="small" variant="outlined" />
                            ))}
                          </Stack>
                        </Box>
                      ) : null}
                      {selectedEvent.tags?.length ? (
                        <Box>
                          <Typography variant="overline" color="text.secondary">Tags</Typography>
                          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                            {selectedEvent.tags.map((tag) => (
                              <Chip key={tag} label={tag} size="small" variant="outlined" />
                            ))}
                          </Stack>
                        </Box>
                      ) : null}
                      <Box>
                        <Typography variant="overline" color="text.secondary">Clientes do job</Typography>
                        {selectedEvent ? (
                          <Typography variant="body2" color="text.secondary">
                            Relevantes: {recommendedClientIds.length} de {clients.length}
                          </Typography>
                        ) : null}
                        {isFilteredToClient && selectedClient ? (
                          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                            <Chip label={selectedClient.name} size="small" color="primary" />
                          </Stack>
                        ) : (
                          <>
                            {relevanceLoading ? (
                              <Typography variant="body2" color="text.secondary">Calculando relevancia...</Typography>
                            ) : null}
                            {!relevanceLoading && !visibleClients.length ? (
                              <Typography variant="body2" color="text.secondary">Nenhum cliente relevante para este evento.</Typography>
                            ) : (
                              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                                {visibleClients.map((client) => (
                                  <Chip
                                    key={client.id}
                                    label={client.name}
                                    size="small"
                                    color={selectedClientIds.includes(client.id) ? 'primary' : 'default'}
                                    variant={selectedClientIds.includes(client.id) ? 'filled' : 'outlined'}
                                    onClick={() => handleToggleClient(client.id)}
                                  />
                                ))}
                              </Stack>
                            )}
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
                              <Button size="small" variant="text" onClick={handleSelectAllClients}>
                                Selecionar todos
                              </Button>
                              <Button size="small" variant="text" onClick={handleClearClients}>
                                Limpar
                              </Button>
                              {selectedEvent && !showAllClients ? (
                                <Button size="small" variant="text" onClick={() => setShowAllClients(true)}>
                                  Mostrar todos
                                </Button>
                              ) : null}
                              {selectedEvent && showAllClients ? (
                                <Button size="small" variant="text" onClick={() => setShowAllClients(false)}>
                                  Mostrar apenas relevantes
                                </Button>
                              ) : null}
                            </Stack>
                          </>
                        )}
                      </Box>
                      <Button
                        variant="contained"
                        fullWidth
                        onClick={() => handleCreatePost(selectedEvent, eventDetailDateISO)}
                      >
                        Create post
                      </Button>
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary">Select an event to see details.</Typography>
                  )}
                </Box>
              </Stack>
            </CardContent>
          </Card>
        ) : null}
      </Stack>
    </Stack>
  );

  if (noShell) {
    return content;
  }

  return (
    <AppShell title="Global Operational Calendar">
      {content}
    </AppShell>
  );
}
