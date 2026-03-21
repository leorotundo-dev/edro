'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar, momentLocalizer, type View } from 'react-big-calendar';
import moment from 'moment';
import AppShell from '@/components/AppShell';
import DashboardCard from '@/components/shared/DashboardCard';
import StatusChip from '@/components/shared/StatusChip';
import { apiGet, apiPost, apiPatch, apiDelete, buildApiUrl } from '@/lib/api';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import InputAdornment from '@mui/material/InputAdornment';
import Popover from '@mui/material/Popover';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Skeleton from '@mui/material/Skeleton';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import {
  IconChevronLeft,
  IconChevronRight,
  IconX,
  IconPlus,
  IconChecklist,
  IconPencil,
  IconTrash,
  IconDotsVertical,
  IconBook2,
  IconLeaf,
  IconReceipt2,
  IconMicrophone2,
  IconStar,
  IconMusic,
  IconHeart,
  IconBriefcase,
  IconFlag,
  IconCalendarEvent,
  IconGlobe,
  IconUsersGroup,
  IconFileText,
  IconSearch,
  IconExternalLink,
  IconCalendarPlus,
  IconRobot,
  IconCircleCheck,
  IconAlertCircle,
  IconPlayerPlay,
  IconClock,
  IconBrandInstagram,
  IconBrandLinkedin,
  IconBrandTiktok,
  IconBrandFacebook,
  IconBrandYoutube,
  IconBrandX,
  IconBrandWhatsapp,
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
  is_relevant?: boolean;
  layer?: 'editorial' | 'operational';
  origin?: string;
  kind?: string;
  client_id?: string | null;
  client_name?: string | null;
  status?: string | null;
  starts_at?: string | null;
  time_label?: string | null;
  description?: string | null;
  editable?: boolean;
  supports_relevance?: boolean;
  supports_briefing?: boolean;
  possible_clients?: Array<{
    client_id: string;
    name: string;
    score: number;
    tier: 'A' | 'B' | 'C';
  }>;
  descricao_ai?: string | null;
  origem_ai?: string | null;
  curiosidade_ai?: string | null;
  base_relevance?: number | null;
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

// ── Production Calendar Layer ─────────────────────────────────────────────────
type ProductionCard = {
  id: string;
  raw_title: string;
  display_title: string;
  due_date: string;
  due_complete: boolean;
  is_overdue: boolean;
  stage_name: string;
  stage_class: string;
  board_id: string;
  board_name: string;
  client_id: string | null;
  platform: string | null;
  format: string | null;
  trello_url: string | null;
  labels: { color: string; name: string }[];
  color_index: number;
};

type ProductionBoard = { id: string; name: string; client_id: string | null; color_index: number };

const PRODUCTION_PALETTE = [
  '#2563eb', '#16a34a', '#d97706', '#9333ea',
  '#0891b2', '#65a30d', '#db2777', '#7c3aed',
  '#ea580c', '#dc2626', '#0d9488', '#b45309',
];

function getBoardColor(colorIndex: number): string {
  return PRODUCTION_PALETTE[colorIndex % PRODUCTION_PALETTE.length];
}

type CalendarHubProps = {
  initialClientId?: string | null;
  noShell?: boolean;
  embedded?: boolean;
  lockClient?: boolean;
  brandColor?: string;
};

type CalendarLayerMode = 'all' | 'editorial' | 'operational';

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
  return value
    .replace(/\s*\|\s*/g, ' • ')
    .replace(/base_relevance[:=]\s*(\d+)/gi, 'Relevância base: $1%');
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
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
  const relevant = events.filter((event) => event.is_relevant !== false);
  if (relevant.some((event) => event.tier === 'A')) return 'relevance-high';
  if (relevant.some((event) => event.tier === 'B')) return 'relevance-mid';
  return '';
}

const TIER_COLORS: Record<string, string> = {
  A: 'error',
  B: 'warning',
  C: 'default',
};

const ORIGIN_LABELS: Record<string, string> = {
  editorial_global: 'Datas editoriais',
  editorial_client: 'Eventos do cliente',
  meeting_recorded: 'Reuniões gravadas',
  meeting_scheduled: 'Google Calendar',
  briefing_deadline: 'Prazos',
  publication: 'Publicações',
  invoice: 'Financeiro',
};

const ORIGIN_COLORS: Record<string, string> = {
  editorial_global: '#E85219',
  editorial_client: '#8B5CF6',
  meeting_recorded: '#2563EB',
  meeting_scheduled: '#0EA5E9',
  briefing_deadline: '#F97316',
  publication: '#16A34A',
  invoice: '#DC2626',
};

const LAYER_LABELS: Record<CalendarLayerMode, string> = {
  all: 'Tudo',
  editorial: 'Editorial',
  operational: 'Operacional',
};

const ORIGIN_FILTER_OPTIONS: Array<{
  value: string;
  label: string;
  layerModes: CalendarLayerMode[];
}> = [
  { value: 'all', label: 'Todas as origens', layerModes: ['all', 'editorial', 'operational'] },
  { value: 'editorial_global', label: 'Datas editoriais', layerModes: ['all', 'editorial'] },
  { value: 'editorial_client', label: 'Eventos do cliente', layerModes: ['all', 'editorial'] },
  { value: 'meeting_recorded', label: 'Reuniões gravadas', layerModes: ['all', 'operational'] },
  { value: 'meeting_scheduled', label: 'Google Calendar', layerModes: ['all', 'operational'] },
  { value: 'briefing_deadline', label: 'Prazos', layerModes: ['all', 'operational'] },
  { value: 'publication', label: 'Publicações', layerModes: ['all', 'operational'] },
  { value: 'invoice', label: 'Financeiro', layerModes: ['all', 'operational'] },
];

function getOriginLabel(origin?: string) {
  if (!origin) return 'Calendário';
  return ORIGIN_LABELS[origin] || origin;
}

type PlatformMeta = { Icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }> | null; color: string };
function getPlatformMeta(title: string, platform?: string | null): PlatformMeta {
  const t = (platform || title).toLowerCase();
  if (/instagram|stories|reels|carrossel|carousel/.test(t)) return { Icon: IconBrandInstagram, color: '#E1306C' };
  if (/linkedin/.test(t)) return { Icon: IconBrandLinkedin, color: '#0A66C2' };
  if (/tiktok/.test(t)) return { Icon: IconBrandTiktok, color: '#010101' };
  if (/facebook|fb/.test(t)) return { Icon: IconBrandFacebook, color: '#1877F2' };
  if (/youtube/.test(t)) return { Icon: IconBrandYoutube, color: '#FF0000' };
  if (/twitter|twit\b/.test(t)) return { Icon: IconBrandX, color: '#000000' };
  if (/whatsapp/.test(t)) return { Icon: IconBrandWhatsapp, color: '#25D366' };
  return { Icon: null, color: '' };
}

function getEventColorByOrigin(origin?: string, fallbackTier?: 'A' | 'B' | 'C') {
  if (origin && ORIGIN_COLORS[origin]) return ORIGIN_COLORS[origin];
  if (fallbackTier === 'A') return '#D32F2F';
  if (fallbackTier === 'B') return '#ED6C02';
  return '#7c8fac';
}

function getMeetingStatusMeta(status?: string | null): { Icon: React.ComponentType<{ size?: number }>; color: string } {
  if (!status) return { Icon: IconMicrophone2, color: '#2563EB' };
  if (status === 'completed' || status === 'analyzed' || status === 'approved') return { Icon: IconCircleCheck, color: '#16A34A' };
  if (status === 'failed') return { Icon: IconAlertCircle, color: '#DC2626' };
  if (status === 'in_call' || status === 'joining') return { Icon: IconPlayerPlay, color: '#F97316' };
  if (status === 'bot_scheduled' || status === 'bot_created') return { Icon: IconRobot, color: '#0EA5E9' };
  if (status === 'recorded' || status === 'transcribed' || status === 'analysis_pending' || status === 'transcript_pending') return { Icon: IconClock, color: '#8B5CF6' };
  if (status === 'processed' || status === 'bot_scheduled') return { Icon: IconRobot, color: '#0EA5E9' };
  return { Icon: IconMicrophone2, color: '#2563EB' };
}

function getEventMeta(event: Pick<CalendarEventItem, 'name' | 'categories' | 'tags' | 'origin' | 'tier'> & { status?: string | null }) {
  if (event.origin === 'meeting_recorded' || event.origin === 'meeting_scheduled') {
    return getMeetingStatusMeta(event.status);
  }
  if (event.origin === 'briefing_deadline') {
    return { Icon: IconChecklist, color: getEventColorByOrigin(event.origin, event.tier) };
  }
  if (event.origin === 'publication') {
    return { Icon: IconCalendarPlus, color: getEventColorByOrigin(event.origin, event.tier) };
  }
  if (event.origin === 'invoice') {
    return { Icon: IconReceipt2, color: getEventColorByOrigin(event.origin, event.tier) };
  }

  const { name, categories, tags } = event;
  const text = `${name} ${(categories ?? []).join(' ')} ${(tags ?? []).join(' ')}`.toLowerCase();
  if (/livro|leitura|bibliote|escola|educa|estudant|alfabetiz|literatu/.test(text))
    return { Icon: IconBook2, color: '#E85219' };
  if (/ecolog|animal|urso|baleia|fauna|natureza|planta|floresta|ambient|conserv|biodiversi|pand[ao]|leão|lobo|peixe|mar|ocean/.test(text))
    return { Icon: IconLeaf, color: '#13DEB9' };
  if (/fiscal|receita|imposto|tribut|contab|finanç|econom|previdên|pensão|aposentad/.test(text))
    return { Icon: IconReceipt2, color: '#FA896B' };
  if (/orador|discurso|palestra|comunicação|imprensa|jornalis|rádio|mídia|locutor|podcast/.test(text))
    return { Icon: IconMicrophone2, color: '#7E4CC8' };
  if (/são|santo|santa|religio|padre|pastor|cristã|evangel|catolic|espirit|bíblia|deus/.test(text))
    return { Icon: IconStar, color: '#FFAE1F' };
  if (/música|canção|samba|funk|rock|artista|cultura|arte|teatro|cinema|dança|carnaval|chorinho/.test(text))
    return { Icon: IconMusic, color: '#7E4CC8' };
  if (/saúde|médico|enfermei|hospital|nutricion|farmac|diabetes|câncer|doença|psicolog|quiroprax/.test(text))
    return { Icon: IconHeart, color: '#FA896B' };
  if (/trabalho|trabalhador|profissional|emprego|operári|engenhei|arquitet|advogad|dentist|veterinár/.test(text))
    return { Icon: IconBriefcase, color: '#E85219' };
  if (/brasil|república|independên|pátria|bandeira|nacional|municip|estado|governo|cidadan/.test(text))
    return { Icon: IconFlag, color: '#13DEB9' };
  if (/internacion|mundial|global|mundo|onu|unicef|solidariedade/.test(text))
    return { Icon: IconGlobe, color: '#E85219' };
  if (/família|mãe|pai|avó|avô|criança|infantil|juventude|idoso|mulher|homem|amizade/.test(text))
    return { Icon: IconUsersGroup, color: '#FFAE1F' };
  return { Icon: IconCalendarEvent, color: '#7c8fac' };
}

function getLayerLabel(layer?: CalendarEventItem['layer']) {
  return layer === 'operational' ? 'Operacional' : 'Editorial';
}

function formatStatusLabel(status?: string | null) {
  if (!status) return 'Sem status';
  return status
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildEventSecondaryText(event: CalendarEventItem, selectedClient: ClientRow | null) {
  if (event.layer === 'operational') {
    return [
      event.time_label || null,
      !selectedClient && event.client_name ? event.client_name : null,
      event.status ? formatStatusLabel(event.status) : null,
      getOriginLabel(event.origin),
    ]
      .filter(Boolean)
      .join(' • ');
  }

  const parts = [`${Math.round(event.score)}%`];

  if (!selectedClient && event.origin === 'editorial_client' && event.client_name) {
    parts.push(event.client_name);
  }

  if (!selectedClient && (event.possible_clients?.length || 0)) {
    parts.push(`${event.possible_clients?.length} clientes possíveis`);
  } else if (!selectedClient && event.is_relevant === false) {
    parts.push('não relevante');
  }

  return parts.join(' • ');
}

export default function CalendarHubPage({ initialClientId, noShell, embedded, lockClient, brandColor }: CalendarHubProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [calendars, setCalendars] = useState<CalendarRow[]>([]);
  const [eventsByDate, setEventsByDate] = useState<Map<string, CalendarEventItem[]>>(new Map());
  const [monthFilter, setMonthFilter] = useState(getCurrentMonth());
  const [layerMode, setLayerMode] = useState<CalendarLayerMode>('all');
  const [originFilter, setOriginFilter] = useState<string>('all');
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
  const [dayPanelTab, setDayPanelTab] = useState<0 | 1 | 2>(0);
  const [relevanceByClientId, setRelevanceByClientId] = useState<Record<string, EventRelevanceItem>>({});
  const [relevanceLoading, setRelevanceLoading] = useState(false);
  const [showAllClients, setShowAllClients] = useState(false);
  const [showNonRelevant, setShowNonRelevant] = useState(false);
  const [notice, setNotice] = useState('');
  const [addEventLoading, setAddEventLoading] = useState(false);
  const [addEventDialogOpen, setAddEventDialogOpen] = useState(false);
  const [addEventName, setAddEventName] = useState('');
  const [addEventDate, setAddEventDate] = useState('');
  const [addEventScore, setAddEventScore] = useState('70');
  const [addEventClientIds, setAddEventClientIds] = useState<string[]>([]);
  const [addEventAllClients, setAddEventAllClients] = useState(false);
  const [eventActionLoading, setEventActionLoading] = useState<string | null>(null);
  const [eventMenuAnchor, setEventMenuAnchor] = useState<null | HTMLElement>(null);
  const [eventMenuId, setEventMenuId] = useState<string | null>(null);
  const [manualRelevance, setManualRelevance] = useState('');
  const [manualRelevanceClientId, setManualRelevanceClientId] = useState('');
  const [saveRelevanceLoading, setSaveRelevanceLoading] = useState(false);
  const [deleteConfirmEvent, setDeleteConfirmEvent] = useState<CalendarEventItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [editEventDialogOpen, setEditEventDialogOpen] = useState(false);
  const [editEventTarget, setEditEventTarget] = useState<CalendarEventItem | null>(null);
  const [editEventName, setEditEventName] = useState('');
  const [editEventScore, setEditEventScore] = useState('');

  const [eventBriefingMap, setEventBriefingMap] = useState<Record<string, string>>({});

  // ── Production Layer (Trello jobs supra-board) ─────────────────────────────
  const [showProductionLayer, setShowProductionLayer] = useState(false);
  const [productionCards, setProductionCards] = useState<ProductionCard[]>([]);
  const [productionBoards, setProductionBoards] = useState<ProductionBoard[]>([]);
  const [productionLoading, setProductionLoading] = useState(false);
  // ──────────────────────────────────────────────────────────────────────────

  // ── Calendar Search ────────────────────────────────────────────────────────
  type LocalSearchResult = { dateISO: string; event: CalendarEventItem };
  type TavilyResult = { title: string; url: string; snippet: string };
  const [searchQuery, setSearchQuery] = useState('');
  const [searchAnchorEl, setSearchAnchorEl] = useState<HTMLDivElement | null>(null);
  const [localSearchResults, setLocalSearchResults] = useState<LocalSearchResult[]>([]);
  const [tavilyResults, setTavilyResults] = useState<TavilyResult[]>([]);
  const [tavilyAnswer, setTavilyAnswer] = useState<string | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [tavilyLoading, setTavilyLoading] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // ──────────────────────────────────────────────────────────────────────────

  // ── Date extraction from Tavily text ──────────────────────────────────────
  function extractDateFromText(text: string): string | null {
    const MONTHS: Record<string, number> = {
      janeiro: 1, fevereiro: 2, março: 3, marco: 3, abril: 4, maio: 5, junho: 6,
      julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
      jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6,
      jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12,
    };
    const norm = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    // "10 de maio de 2026" or "10 de maio 2026"
    const ptFull = /(\d{1,2})\s+de\s+([a-z]+)\s+(?:de\s+)?(\d{4})/;
    const m1 = norm.match(ptFull);
    if (m1) {
      const day = parseInt(m1[1]);
      const month = MONTHS[m1[2]];
      const year = parseInt(m1[3]);
      if (month && year >= 2024 && day >= 1 && day <= 31) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
    // "10/05/2026"
    const numeric = /(\d{1,2})\/(\d{1,2})\/(\d{4})/;
    const m2 = norm.match(numeric);
    if (m2) {
      const day = parseInt(m2[1]);
      const month = parseInt(m2[2]);
      const year = parseInt(m2[3]);
      if (year >= 2024 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
    return null;
  }
  // ──────────────────────────────────────────────────────────────────────────

  // ── Calendar Search handlers ───────────────────────────────────────────────
  function normalizeForSearch(text: string) {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function searchLocalEvents(q: string): LocalSearchResult[] {
    const norm = normalizeForSearch(q);
    if (!norm) return [];
    const results: LocalSearchResult[] = [];
    for (const [dateISO, events] of Array.from(filteredEventsByDate.entries())) {
      for (const event of events) {
        const haystack = normalizeForSearch(
          [
            event.name,
            event.slug ?? '',
            event.client_name ?? '',
            event.description ?? '',
            event.status ?? '',
            ...(event.categories ?? []),
            ...(event.tags ?? []),
          ].join(' ')
        );
        if (haystack.includes(norm)) {
          results.push({ dateISO, event });
        }
      }
    }
    results.sort((a, b) => a.dateISO.localeCompare(b.dateISO));
    return results.slice(0, 15);
  }

  async function runTavilySearch(q: string) {
    setTavilyLoading(true);
    setTavilyResults([]);
    setTavilyAnswer(null);
    try {
      const res = await apiPost<{ answer: string | null; results: TavilyResult[] }>(
        '/calendar/search/tavily',
        { q }
      );
      setTavilyResults(res?.results ?? []);
      setTavilyAnswer(res?.answer ?? null);
    } catch { /* non-blocking */ }
    finally { setTavilyLoading(false); }
  }

  function handleSearchChange(value: string) {
    setSearchQuery(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!value.trim()) {
      setLocalSearchResults([]);
      setTavilyResults([]);
      setTavilyAnswer(null);
      setSearchAnchorEl(null);
      return;
    }
    setSearchAnchorEl(searchContainerRef.current);
    const local = searchLocalEvents(value);
    setLocalSearchResults(local);

    // Only call Tavily when no local results found
    if (local.length === 0) {
      searchDebounceRef.current = setTimeout(() => {
        runTavilySearch(value.trim());
      }, 600);
    } else {
      setTavilyResults([]);
      setTavilyAnswer(null);
    }
  }

  function handleSearchResultClick(dateISO: string) {
    // Navigate calendar to that month and highlight the date
    const [year, month] = dateISO.split('-');
    if (year && month) setMonthFilter(`${year}-${month}`);
    setSelectedDayISO(dateISO);
    setSearchQuery('');
    setSearchAnchorEl(null);
    setLocalSearchResults([]);
    setTavilyResults([]);
  }

  function handleAddTavilyEventToCalendar(result: TavilyResult) {
    // Try to extract the event date from title + snippet
    const extracted = extractDateFromText(result.title) || extractDateFromText(result.snippet);
    setAddEventName(result.title.split('|')[0].trim()); // strip "| Source" from title
    setAddEventDate(extracted || '');
    setAddEventDialogOpen(true);
    setSearchAnchorEl(null);
    setSearchQuery('');
    setLocalSearchResults([]);
    setTavilyResults([]);
  }
  // ──────────────────────────────────────────────────────────────────────────

  // ── Creative Inspirations ──────────────────────────────────────────────────
  type Inspiration = { id: string; title: string; snippet: string | null; url: string; source_lang: string };
  const [inspirations, setInspirations] = useState<Inspiration[]>([]);
  const [inspirationsLoading, setInspirationsLoading] = useState(false);
  const [adaptingId, setAdaptingId] = useState<string | null>(null);
  const [adaptResult, setAdaptResult] = useState<{ inspirationId: string; text: string } | null>(null);

  const loadInspirations = useCallback(async (eventId: string) => {
    setInspirationsLoading(true);
    setInspirations([]);
    setAdaptResult(null);
    try {
      const res = await apiGet(`/calendar/events/${eventId}/inspirations`);
      setInspirations(res?.inspirations ?? []);
    } catch { /* non-blocking */ }
    finally { setInspirationsLoading(false); }
  }, []);

  const handleAdaptInspiration = useCallback(async (inspirationId: string) => {
    if (!selectedEvent || !selectedClient) return;
    setAdaptingId(inspirationId);
    try {
      const res = await apiPost(`/calendar/events/${selectedEvent.id}/inspirations/${inspirationId}/adapt`, {
        clientId: selectedClient.id,
      });
      setAdaptResult({ inspirationId, text: res?.adapted_ideas ?? '' });
    } catch { /* show nothing */ }
    finally { setAdaptingId(null); }
  }, [selectedEvent, selectedClient]);
  // ──────────────────────────────────────────────────────────────────────────

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
      const query = new URLSearchParams();
      query.set('layer', layerMode);
      if (!clientId && showNonRelevant && layerMode !== 'operational') {
        query.set('include_non_relevant', 'true');
      }
      const queryString = query.toString() ? `?${query.toString()}` : '';
      const response = (await apiGet(
        clientId
          ? `/clients/${clientId}/calendar/month/${month}${queryString}`
          : `/calendar/events/${month}${queryString}`
      )) as MonthEventsResponse;
      const days = response?.days || {};
      const map = new Map<string, CalendarEventItem[]>();
      Object.entries(days).forEach(([date, items]) => {
        const unique = new Map<string, CalendarEventItem>();
        (items || []).forEach((item, index) => {
          const nameKey = `${item.slug || item.name || ''}`.trim().toLowerCase();
          const key = `${item.layer || 'editorial'}:${item.id || nameKey || String(index)}`;
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
  }, [layerMode, showNonRelevant]);

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

  // Load production cards whenever the layer is toggled on or the month changes
  useEffect(() => {
    if (!showProductionLayer) { setProductionCards([]); setProductionBoards([]); return; }
    setProductionLoading(true);
    apiGet(`/trello/calendar?month=${monthFilter}`)
      .then((data: any) => {
        setProductionCards(data.cards ?? []);
        setProductionBoards(data.boards ?? []);
      })
      .catch(() => {})
      .finally(() => setProductionLoading(false));
  }, [showProductionLayer, monthFilter]);

  useEffect(() => {
    setSelectedDayISO(null);
    setSelectedEvent(null);
    setSelectedEventDateISO(null);
    setRelevanceByClientId({});
    setShowAllClients(false);
  }, [selectedClient, monthFilter, layerMode]);

  useEffect(() => {
    apiGet<{ success: boolean; eventMap: Record<string, string> }>('/edro/briefings/event-map')
      .then((res) => { if (res?.eventMap) setEventBriefingMap(res.eventMap); })
      .catch(() => {});
  }, []);

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
    if (selectedEvent.supports_relevance === false) {
      setRelevanceByClientId({});
      setShowAllClients(false);
      if (selectedClient?.id) {
        setSelectedClientIds([selectedClient.id]);
      } else if (selectedEvent.client_id) {
        setSelectedClientIds([selectedEvent.client_id]);
      } else {
        setSelectedClientIds([]);
      }
      return;
    }
    if (selectedClient?.id) {
      setRelevanceByClientId({});
      setSelectedClientIds([selectedClient.id]);
      return;
    }
    loadEventRelevance(selectedEvent.id);
  }, [selectedEvent?.id, selectedEvent?.client_id, selectedEvent?.supports_relevance, loadEventRelevance, selectedClient]);

  // Load creative inspirations for high-relevance events
  useEffect(() => {
    if (!selectedEvent?.id || selectedEvent.supports_briefing === false) { setInspirations([]); return; }
    if ((selectedEvent.base_relevance ?? 0) >= 50) {
      loadInspirations(selectedEvent.id);
    } else {
      setInspirations([]);
    }
  }, [selectedEvent?.id, selectedEvent?.supports_briefing, loadInspirations]);

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
    const path =
      kind === 'csv'
        ? `/api/calendars/${id}/export.csv`
        : `/api/calendars/${id}/export.iclips.json`;

    const response = await fetch(buildApiUrl(path));
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

  const availableOriginFilters = useMemo(
    () => ORIGIN_FILTER_OPTIONS.filter((option) => option.layerModes.includes(layerMode)),
    [layerMode]
  );

  useEffect(() => {
    if (availableOriginFilters.some((option) => option.value === originFilter)) return;
    setOriginFilter('all');
  }, [availableOriginFilters, originFilter]);

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

  const filteredEventsByDate = useMemo(() => {
    if (originFilter === 'all') return eventsByDate;

    const map = new Map<string, CalendarEventItem[]>();
    eventsByDate.forEach((items, dateISO) => {
      const filtered = items.filter((item) => item.origin === originFilter);
      if (filtered.length) {
        map.set(dateISO, filtered);
      }
    });
    return map;
  }, [eventsByDate, originFilter]);

  const calendarEvents = useMemo<CalendarRbcEvent[]>(() => {
    const output: CalendarRbcEvent[] = [];
    filteredEventsByDate.forEach((items, dateISO) => {
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

    // ── Production Layer: inject Trello job due dates ─────────────────────────
    if (showProductionLayer) {
      productionCards.forEach((card) => {
        const startDate = parseISODate(card.due_date);
        if (!startDate) return;
        output.push({
          id: `prod-${card.id}`,
          title: card.display_title,
          start: startDate,
          end: addDays(startDate, 1),
          allDay: true,
          tier: 'A',
          score: 0,
          resource: {
            event: {
              id: card.id,
              name: card.display_title,
              tier: 'A' as const,
              score: 0,
              layer: 'operational' as const,
              origin: 'production_job',
            },
            dateISO: card.due_date,
            productionCard: card,
            isProductionCard: true,
          } as any,
        });
      });
    }

    return output;
  }, [filteredEventsByDate, showProductionLayer, productionCards]);

  const dayEvents = useMemo(() => {
    return filteredEventsByDate.get(activeDateISO) || [];
  }, [filteredEventsByDate, activeDateISO]);

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
    filteredEventsByDate.forEach((items) => {
      total += items.length;
    });
    return total;
  }, [filteredEventsByDate]);

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

  const relevanceClientOptions = useMemo(() => {
    if (selectedClient?.id) return [selectedClient];
    return clients;
  }, [clients, selectedClient]);

  const manualRelevanceTargetClient = useMemo(() => {
    if (selectedClient?.id) return selectedClient;
    if (!manualRelevanceClientId) return null;
    return clients.find((client) => client.id === manualRelevanceClientId) || null;
  }, [clients, manualRelevanceClientId, selectedClient]);

  const selectedDayLabel = useMemo(() => {
    if (!selectedDayISO) return '';
    return formatDayLabel(selectedDayISO);
  }, [selectedDayISO]);

  const selectedDayEvents = useMemo(() => {
    if (!selectedDayISO) return [];
    return filteredEventsByDate.get(selectedDayISO) || [];
  }, [filteredEventsByDate, selectedDayISO]);

  // Production cards (Trello) for the selected day — separate from filteredEventsByDate
  const selectedDayProductionCards = useMemo(() => {
    if (!selectedDayISO || !showProductionLayer) return [];
    return productionCards.filter((c) => c.due_date.slice(0, 10) === selectedDayISO);
  }, [selectedDayISO, showProductionLayer, productionCards]);

  const selectedDayPosts = useMemo(() => {
    if (!selectedDayISO) return [];
    return postsByDate.get(selectedDayISO) || [];
  }, [postsByDate, selectedDayISO]);

  const eventDetailDateISO = selectedEventDateISO || selectedDayISO || activeDateISO;

  useEffect(() => {
    if (!selectedEvent || !eventDetailDateISO) return;
    const visibleItems = filteredEventsByDate.get(eventDetailDateISO) || [];
    if (visibleItems.some((item) => item.id === selectedEvent.id)) return;
    setSelectedEvent(null);
    setSelectedEventDateISO(null);
    setDayPanelTab(0);
  }, [eventDetailDateISO, filteredEventsByDate, selectedEvent]);

  const selectedEventDateLabel = useMemo(() => {
    if (!eventDetailDateISO) return '';
    return formatDayLabel(eventDetailDateISO);
  }, [eventDetailDateISO]);

  useEffect(() => {
    if (!selectedEvent) {
      setManualRelevance('');
      setManualRelevanceClientId('');
      return;
    }
    setManualRelevance(String(clampScore(Number(selectedEvent.score || 0))));
    if (selectedClient?.id) {
      setManualRelevanceClientId(selectedClient.id);
      return;
    }
    const possibleClients = selectedEvent.possible_clients || [];
    if (possibleClients.length === 1) {
      setManualRelevanceClientId(possibleClients[0].client_id);
      return;
    }
    setManualRelevanceClientId((prev) => {
      if (!prev) return '';
      const stillValid = possibleClients.some((item) => item.client_id === prev);
      return stillValid ? prev : '';
    });
  }, [selectedClient?.id, selectedEvent]);

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
    setDayPanelTab(2);
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
      return query ? `/studio/brief?${query}` : '/studio/brief';
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
    if (event.supports_briefing === false) {
      setError('Este item não gera briefing a partir do calendário.');
      return;
    }
    if (!selectedClientIds.length) {
      setError('Selecione ao menos um cliente para criar o briefing.');
      return;
    }
    const primaryClient = selectedClients[0];
    const params = new URLSearchParams();
    if (primaryClient?.id) params.set('client_id', primaryClient.id);
    if (primaryClient?.name) params.set('client_name', primaryClient.name);
    // Pre-fill briefing title with event + date
    const dateLabel = dateISO
      ? new Date(dateISO + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      : '';
    const titleSuggestion = event?.name
      ? `${event.name}${dateLabel ? ` — ${dateLabel}` : ''}`
      : '';
    if (titleSuggestion) params.set('title', titleSuggestion);
    if (dateISO) params.set('date', dateISO);
    if (event?.name) params.set('event', event.name);
    if (event?.why) params.set('event_why', event.why);
    if (event?.categories?.length) params.set('event_categories', event.categories.join(', '));
    persistStudioContext(event, dateISO);
    router.push(`/edro/novo?${params.toString()}`);
  };

  const handleOpenAddEvent = () => {
    setAddEventName('');
    setAddEventDate(selectedDayISO || activeDateISO || '');
    setAddEventScore('70');
    if (selectedClient?.id) {
      setAddEventClientIds([selectedClient.id]);
      setAddEventAllClients(false);
    } else {
      setAddEventClientIds([]);
      setAddEventAllClients(true);
    }
    setAddEventDialogOpen(true);
  };

  const handleSubmitAddEvent = async () => {
    if (!addEventName.trim()) return;
    const dateISO = addEventDate || selectedDayISO || activeDateISO;
    const score = clampScore(Number(addEventScore || 70));
    const clientIdsToSend = addEventAllClients ? clients.map((c) => c.id) : addEventClientIds;

    setAddEventLoading(true);
    setNotice('');
    setError('');
    try {
      await apiPost('/calendar/events/manual', {
        name: addEventName.trim(),
        date: dateISO,
        relevance_score: score,
        client_ids: clientIdsToSend,
      });
      await loadMonthEvents(selectedClient?.id ?? null, monthFilter);
      setActiveDateISO(dateISO);
      setSelectedDayISO(dateISO);
      setNotice('Evento adicionado com sucesso.');
      setAddEventDate('');
      setAddEventDialogOpen(false);
    } catch (err: any) {
      setError(err?.message || 'Falha ao adicionar evento.');
    } finally {
      setAddEventLoading(false);
    }
  };

  const handleEventMenuOpen = (e: React.MouseEvent<HTMLElement>, eventId: string) => {
    e.stopPropagation();
    setEventMenuAnchor(e.currentTarget);
    setEventMenuId(eventId);
  };

  const handleEventMenuClose = () => {
    setEventMenuAnchor(null);
    setEventMenuId(null);
  };

  const handleEditEvent = (event: CalendarEventItem) => {
    handleEventMenuClose();
    setEditEventTarget(event);
    setEditEventName(event.name);
    setEditEventScore(String(Math.round(event.score)));
    setEditEventDialogOpen(true);
  };

  const handleEditConfirm = async () => {
    if (!editEventTarget) return;
    setEditEventDialogOpen(false);
    const newScore = clampScore(Number(editEventScore) || Math.round(editEventTarget.score));
    setEventActionLoading(editEventTarget.id);
    setError('');
    setNotice('');
    try {
      await apiPatch(`/calendar/events/${editEventTarget.id}/edit`, {
        name: editEventName.trim() || editEventTarget.name,
        relevance_score: newScore,
      });
      await loadMonthEvents(selectedClient?.id ?? null, monthFilter);
      setNotice('Evento atualizado.');
    } catch (err: any) {
      setError(err?.message || 'Falha ao editar evento.');
    } finally {
      setEventActionLoading(null);
    }
  };

  const handleDeleteClick = (event: CalendarEventItem) => {
    handleEventMenuClose();
    setDeleteConfirmEvent(event);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmEvent) return;
    const event = deleteConfirmEvent;
    setDeleteConfirmEvent(null);
    setDeleteLoading(true);
    setEventActionLoading(event.id);
    setError('');
    setNotice('');
    try {
      await apiDelete(`/calendar/events/${event.id}/edit`);
      await loadMonthEvents(selectedClient?.id ?? null, monthFilter);
      if (selectedEvent?.id === event.id) setSelectedEvent(null);
      setNotice('Evento excluído.');
    } catch (err: any) {
      setError(err?.message || 'Falha ao excluir evento.');
    } finally {
      setEventActionLoading(null);
      setDeleteLoading(false);
    }
  };

  const handleSaveEventRelevance = async () => {
    if (selectedEvent?.supports_relevance === false) {
      setError('Este item não aceita ajuste de relevância.');
      return;
    }
    const targetClientId = selectedClient?.id || manualRelevanceClientId;
    if (!targetClientId) {
      setError('Selecione um cliente-alvo para ajustar a relevância.');
      return;
    }
    if (!selectedEvent?.id) {
      setError('Selecione um evento para ajustar a relevância.');
      return;
    }

    const score = clampScore(Number(manualRelevance));
    setSaveRelevanceLoading(true);
    setError('');
    setNotice('');
    try {
      // custom_priority é 1–10; backend retorna priority*10 como score final (sem boosts adicionais)
      const customPriority = Math.max(1, Math.min(10, Math.round(score / 10) || 1));
      const effectiveScore = customPriority * 10; // score real que vai aparecer após reload
      await apiPost(`/clients/${targetClientId}/calendar/overrides`, {
        calendar_event_id: selectedEvent.id,
        force_include: true,
        force_exclude: false,
        custom_priority: customPriority,
        notes: `manual_relevance:${score}`,
      });
      const tier: 'A' | 'B' | 'C' = effectiveScore >= 80 ? 'A' : effectiveScore >= 55 ? 'B' : 'C';

      setSelectedEvent((prev) =>
        prev
          ? {
              ...prev,
              score: effectiveScore,
              tier,
              why: prev.why ? `${prev.why} | override:priority:${customPriority}` : `override:priority:${customPriority}`,
            }
          : prev
      );
      setManualRelevance(String(effectiveScore));
      await loadMonthEvents(selectedClient?.id ?? null, monthFilter);
      // Se global view, recarrega relevâncias por cliente para atualizar "Clientes possíveis"
      if (!selectedClient && selectedEvent?.id) {
        loadEventRelevance(selectedEvent.id);
      }
      const clientLabel = manualRelevanceTargetClient?.name || selectedClient?.name || 'cliente';
      setNotice(`Score de ${clientLabel} atualizado para ${effectiveScore}%`);
    } catch (err: any) {
      setError(err?.message || 'Falha ao salvar relevância.');
    } finally {
      setSaveRelevanceLoading(false);
    }
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
    // ── Production job (Trello) — left-border accent, soft background ─────────
    if ((event.resource as any).isProductionCard) {
      const card = (event.resource as any).productionCard as ProductionCard;
      const baseColor = card.is_overdue ? '#dc2626' : getBoardColor(card.color_index);
      return {
        style: {
          backgroundColor: `${baseColor}18`,
          borderLeft: `3px solid ${baseColor}`,
          border: 'none',
          opacity: card.due_complete ? 0.55 : 1,
          color: baseColor,
          fontStyle: card.stage_class === 'done' ? 'italic' : 'normal',
        },
      };
    }
    // ── Operational event (meetings, deadlines, publications) ─────────────────
    const item = event.resource.event;
    if (item.origin && item.origin !== 'editorial_global') {
      const c = getEventColorByOrigin(item.origin, event.tier);
      return {
        style: {
          backgroundColor: `${c}18`,
          borderLeft: `3px solid ${c}`,
          border: 'none',
          color: c,
        },
      };
    }
    // ── Editorial global event — brand color or tier class ────────────────────
    if (brandColor) {
      const alpha = event.tier === 'A' ? '22' : event.tier === 'B' ? '18' : '10';
      const borderAlpha = event.tier === 'A' ? 'ff' : event.tier === 'B' ? 'cc' : '88';
      return {
        style: {
          backgroundColor: `${brandColor}${alpha}`,
          borderLeft: `3px solid ${brandColor}${borderAlpha}`,
          border: 'none',
          color: brandColor,
        },
      };
    }
    return { className: `tier-${event.tier.toLowerCase()}` };
  }, [brandColor]);

  const rbcDayPropGetter = useCallback((date: Date) => {
    const dateISO = toISODate(date);
    if (dateISO === selectedDayISO && dateISO !== todayISO) {
      return { className: 'rbc-selected-day' };
    }
    return {};
  }, [selectedDayISO, todayISO]);

  const CustomDateHeader = useCallback(({ date, label }: { date: Date; label: string; drilldownView: string; isOffRange: boolean; onDrillDown: () => void }) => {
    const dateISO = toISODate(date);
    const isToday = dateISO === todayISO;
    const isSelected = dateISO === selectedDayISO && !isToday;
    const cls = isToday
      ? 'rbc-date-num rbc-date-num--today'
      : isSelected
      ? 'rbc-date-num rbc-date-num--selected'
      : 'rbc-date-num';
    return <span className={cls}>{label}</span>;
  }, [todayISO, selectedDayISO]);

  const CalendarEventContent = ({ event }: { event: CalendarRbcEvent }) => {
    const item = event.resource.event;
    const isProductionCard = (event.resource as any).isProductionCard;
    const productionCard = isProductionCard ? (event.resource as any).productionCard as ProductionCard : null;
    const { Icon: PlatformIcon } = getPlatformMeta(event.title, productionCard?.platform ?? null);
    const scoreLabel = item.layer === 'operational'
      ? item.time_label || null
      : Math.round(event.score) > 0 ? `${Math.round(event.score)}%` : null;
    return (
      <span className="rbc-event-content">
        {PlatformIcon && <PlatformIcon size={10} style={{ flexShrink: 0, opacity: 0.9 }} />}
        <span className="rbc-event-title truncate">{event.title}</span>
        {scoreLabel && <span className="rbc-event-score">{scoreLabel}</span>}
      </span>
    );
  };

  if (loading && clients.length === 0) {
    return (
      <AppShell title="Calendário">
        <Stack spacing={3}>
          {/* Controls bar */}
          <Card variant="outlined">
            <CardContent>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" justifyContent="space-between">
                <Stack direction="row" spacing={1}>
                  <Skeleton variant="rounded" width={32} height={32} />
                  <Skeleton variant="rounded" width={120} height={32} />
                  <Skeleton variant="rounded" width={32} height={32} />
                </Stack>
                <Stack direction="row" spacing={1}>
                  {['Mes', 'Semana', 'Dia'].map((l) => (
                    <Skeleton key={l} variant="rounded" width={64} height={32} />
                  ))}
                </Stack>
                <Skeleton variant="rounded" width={140} height={32} />
              </Stack>
            </CardContent>
          </Card>

          {/* Calendar grid */}
          <Card variant="outlined">
            <CardContent>
              {/* Weekday header */}
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, mb: 1 }}>
                {Array.from({ length: 7 }).map((_, i) => (
                  <Skeleton key={i} variant="text" height={16} />
                ))}
              </Box>
              {/* Calendar days — 5 rows × 7 cols */}
              {Array.from({ length: 5 }).map((_, row) => (
                <Box key={row} sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, mb: 1 }}>
                  {Array.from({ length: 7 }).map((_, col) => (
                    <Box key={col} sx={{ minHeight: 80 }}>
                      <Skeleton variant="text" width={24} height={18} />
                      {row === 0 && col % 3 === 0 && <Skeleton variant="rounded" height={22} sx={{ mt: 0.5 }} />}
                      {row === 1 && col % 2 === 0 && <Skeleton variant="rounded" height={22} sx={{ mt: 0.5 }} />}
                      {row === 2 && col % 4 === 0 && <Skeleton variant="rounded" height={22} sx={{ mt: 0.5 }} />}
                    </Box>
                  ))}
                </Box>
              ))}
            </CardContent>
          </Card>
        </Stack>
      </AppShell>
    );
  }

  const content = (
    <Stack spacing={3} sx={{ minWidth: 0 }}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {notice ? <Alert severity="success" onClose={() => setNotice('')}>{notice}</Alert> : null}

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
            <ToggleButtonGroup
              value={layerMode}
              exclusive
              size="small"
              onChange={(_, nextLayer) => {
                if (nextLayer) setLayerMode(nextLayer);
              }}
            >
              <ToggleButton value="all">Tudo</ToggleButton>
              <ToggleButton value="editorial">Editorial</ToggleButton>
              <ToggleButton value="operational">Operacional</ToggleButton>
            </ToggleButtonGroup>

            {/* Production layer toggle */}
            <Chip
              label={
                productionLoading
                  ? 'Carregando jobs…'
                  : showProductionLayer
                  ? `Jobs (${productionCards.length})`
                  : 'Ver Jobs de Produção'
              }
              onClick={() => setShowProductionLayer((v) => !v)}
              color={showProductionLayer ? 'primary' : 'default'}
              variant={showProductionLayer ? 'filled' : 'outlined'}
              size="small"
              icon={productionLoading ? <CircularProgress size={12} color="inherit" /> : undefined}
              sx={{ fontWeight: 600, cursor: 'pointer' }}
            />

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

            <TextField
              select
              size="small"
              label="Origem"
              value={originFilter}
              onChange={(event) => setOriginFilter(event.target.value)}
              sx={{ minWidth: 220 }}
            >
              {availableOriginFilters.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>

            {!selectedClient && layerMode !== 'operational' ? (
              <Stack direction="row" spacing={1} alignItems="center" sx={{ minHeight: 40 }}>
                <Switch
                  size="small"
                  checked={showNonRelevant}
                  onChange={(event) => setShowNonRelevant(event.target.checked)}
                />
                <Typography variant="body2" color="text.secondary">
                  Mostrar não relevantes
                </Typography>
              </Stack>
            ) : null}

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

          {/* Search bar */}
          <Box ref={searchContainerRef} sx={{ position: 'relative' }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Buscar data ou evento comemorativo…"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => { if (searchQuery.trim()) setSearchAnchorEl(searchContainerRef.current); }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <IconSearch size={18} color="gray" />
                  </InputAdornment>
                ),
                endAdornment: searchLoading || tavilyLoading ? (
                  <InputAdornment position="end">
                    <CircularProgress size={16} />
                  </InputAdornment>
                ) : searchQuery ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => { setSearchQuery(''); setSearchAnchorEl(null); setLocalSearchResults([]); setTavilyResults([]); }}>
                      <IconX size={14} />
                    </IconButton>
                  </InputAdornment>
                ) : undefined,
              }}
              sx={{ bgcolor: 'background.paper', borderRadius: 1 }}
            />
          </Box>
        </Stack>
      </DashboardCard>

      {/* Search results popover */}
      <Popover
        open={Boolean(searchAnchorEl) && (localSearchResults.length > 0 || tavilyResults.length > 0 || tavilyLoading)}
        anchorEl={searchAnchorEl}
        onClose={() => setSearchAnchorEl(null)}
        disableAutoFocus
        disableEnforceFocus
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        PaperProps={{ sx: { width: searchContainerRef.current?.offsetWidth ?? 600, maxHeight: 480, overflow: 'auto', p: 0, mt: 0.5 } }}
      >
        {localSearchResults.length > 0 && (
          <Box>
            <Typography variant="caption" sx={{ px: 2, pt: 1.5, pb: 0.5, display: 'block', color: 'text.secondary', fontWeight: 600 }}>
              NO CALENDÁRIO ({localSearchResults.length})
            </Typography>
            <List dense disablePadding>
              {localSearchResults.map(({ dateISO, event }) => (
                <ListItemButton key={`${dateISO}-${event.id}`} onClick={() => handleSearchResultClick(dateISO)} sx={{ py: 0.75, px: 2 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <IconCalendarEvent size={18} color="#5D87FF" />
                  </ListItemIcon>
                  <ListItemText
                    primary={event.name}
                    secondary={formatDayLabel(dateISO)}
                    primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                  <Chip label={event.tier} size="small" color={TIER_COLORS[event.tier] as any} sx={{ fontSize: 10, height: 18 }} />
                </ListItemButton>
              ))}
            </List>
          </Box>
        )}

        {tavilyLoading && (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 2, py: 1.5 }}>
            <CircularProgress size={14} />
            <Typography variant="body2" color="text.secondary">Buscando na web…</Typography>
          </Stack>
        )}

        {tavilyResults.length > 0 && (
          <Box>
            <Divider />
            <Typography variant="caption" sx={{ px: 2, pt: 1.5, pb: 0.5, display: 'block', color: 'text.secondary', fontWeight: 600 }}>
              RESULTADOS DA WEB (TAVILY)
            </Typography>
            {tavilyAnswer && (
              <Alert severity="info" sx={{ mx: 2, mb: 1, py: 0.5 }}>
                <Typography variant="caption">{tavilyAnswer}</Typography>
              </Alert>
            )}
            <List dense disablePadding>
              {tavilyResults.map((r, i) => (
                <ListItemButton key={i} sx={{ py: 0.75, px: 2, alignItems: 'flex-start' }}>
                  <ListItemIcon sx={{ minWidth: 36, mt: 0.5 }}>
                    <IconGlobe size={18} color="#13DEB9" />
                  </ListItemIcon>
                  <ListItemText
                    primary={r.title}
                    secondary={r.snippet}
                    primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                    secondaryTypographyProps={{ variant: 'caption', sx: { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } }}
                  />
                  <Stack direction="row" spacing={0.5} sx={{ ml: 1, flexShrink: 0, mt: 0.5 }}>
                    <IconButton
                      size="small"
                      title="Adicionar ao calendário"
                      onClick={(e) => { e.stopPropagation(); handleAddTavilyEventToCalendar(r); }}
                    >
                      <IconCalendarPlus size={16} />
                    </IconButton>
                    <IconButton
                      size="small"
                      title="Abrir fonte"
                      onClick={(e) => { e.stopPropagation(); window.open(r.url, '_blank', 'noopener'); }}
                    >
                      <IconExternalLink size={16} />
                    </IconButton>
                  </Stack>
                </ListItemButton>
              ))}
            </List>
          </Box>
        )}
      </Popover>

      {/* Legend */}
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
        <Chip size="small" label="High" color="error" variant="filled" />
        <Chip size="small" label="Medium" color="warning" variant="filled" />
        <Chip size="small" label="Low" variant="outlined" />
        <Chip size="small" label={`Camada: ${LAYER_LABELS[layerMode]}`} variant="outlined" />
        {originFilter !== 'all' ? (
          <Chip size="small" label={`Origem: ${getOriginLabel(originFilter)}`} variant="outlined" />
        ) : null}
        <Chip size="small" label={selectionLabel} variant="outlined" />
        <Chip size="small" label={`${totalPosts} posts`} variant="outlined" />
        <Chip size="small" label={`${totalEvents} itens`} variant="outlined" />
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
              dayPropGetter={rbcDayPropGetter}
              components={{ event: CalendarEventContent, month: { dateHeader: CustomDateHeader } }}
              style={{ height: 1100 }}
            />
            {/* Production layer board color legend — inside the card, below the calendar */}
            {showProductionLayer && productionBoards.length > 0 && (
              <Stack direction="row" flexWrap="wrap" gap={1.5} sx={{ px: 2, py: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                {productionBoards.map((board) => (
                  <Stack key={board.id} direction="row" spacing={0.75} alignItems="center">
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: getBoardColor(board.color_index), flexShrink: 0 }} />
                    <Typography variant="caption" color="text.secondary">{board.name}</Typography>
                  </Stack>
                ))}
                <Typography variant="caption" color="text.disabled" sx={{ ml: 'auto' }}>
                  Vermelho = atrasado · Verde tracejado = concluído
                </Typography>
              </Stack>
            )}
          </CardContent>
        </Card>

        {selectedDayISO ? (
          <Card variant="outlined" sx={{ width: { xs: '100%', lg: 384 }, flexShrink: 0, alignSelf: 'flex-start' }}>
            <CardContent>
              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    {/* Mini calendar-page badge */}
                    <Box sx={{
                      width: 48, height: 52,
                      borderRadius: 1.5,
                      border: '1px solid',
                      borderColor: 'divider',
                      overflow: 'hidden',
                      flexShrink: 0,
                      boxShadow: '0 2px 6px rgba(0,0,0,0.07)',
                    }}>
                      <Box sx={{ bgcolor: 'primary.main', py: 0.4, textAlign: 'center' }}>
                        <Typography sx={{ fontSize: 9, fontWeight: 700, color: '#fff', letterSpacing: '0.08em', textTransform: 'uppercase', lineHeight: 1 }}>
                          {selectedDayISO
                            ? new Date(selectedDayISO + 'T12:00:00').toLocaleString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase()
                            : ''}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center', py: 0.5 }}>
                        <Typography sx={{ fontSize: 22, fontWeight: 800, lineHeight: 1, color: 'text.primary' }}>
                          {selectedDayISO ? parseInt(selectedDayISO.slice(8, 10), 10) : ''}
                        </Typography>
                      </Box>
                    </Box>
                    <Box>
                      <Typography variant="overline" color="text.secondary">Selected day</Typography>
                      <Typography variant="h6">{selectedDayLabel || 'Selected day'}</Typography>
                    </Box>
                  </Stack>
                  <IconButton
                    size="small"
                    onClick={() => {
                      setSelectedDayISO(null);
                      setSelectedEvent(null);
                      setSelectedEventDateISO(null);
                      setDayPanelTab(0);
                    }}
                  >
                    <IconX size={18} />
                  </IconButton>
                </Stack>

                {/* ── Tab navigation ── */}
                <Tabs
                  value={dayPanelTab}
                  onChange={(_, v) => setDayPanelTab(v as 0 | 1 | 2)}
                  variant="fullWidth"
                  sx={{ borderBottom: 1, borderColor: 'divider', mx: -2, px: 0 }}
                >
                  <Tab
                    label={(selectedDayEvents.length + selectedDayProductionCards.length) > 0 ? `Eventos (${selectedDayEvents.length + selectedDayProductionCards.length})` : 'Eventos'}
                    value={0}
                    sx={{ minHeight: 40, fontSize: '0.72rem', textTransform: 'none' }}
                  />
                  <Tab
                    label={selectedDayPosts.length ? `Posts (${selectedDayPosts.length})` : 'Posts'}
                    value={1}
                    sx={{ minHeight: 40, fontSize: '0.72rem', textTransform: 'none' }}
                  />
                  <Tab
                    label={selectedEvent
                      ? (selectedEvent.name.length > 13 ? selectedEvent.name.slice(0, 13) + '…' : selectedEvent.name)
                      : 'Detalhes'}
                    value={2}
                    disabled={!selectedEvent}
                    sx={{ minHeight: 40, fontSize: '0.72rem', textTransform: 'none' }}
                  />
                </Tabs>

                {/* ── Tab 0: Daily events ── */}
                {dayPanelTab === 0 && (
                <Box>
                  {layerMode !== 'operational' ? (
                    <Stack direction="row" alignItems="center" justifyContent="flex-end" sx={{ mb: 1, mt: 0.5 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<IconPlus size={14} />}
                        onClick={handleOpenAddEvent}
                        disabled={addEventLoading}
                      >
                        {addEventLoading ? 'Adicionando...' : 'Adicionar evento'}
                      </Button>
                    </Stack>
                  ) : null}
                  {(selectedDayEvents.length || selectedDayProductionCards.length) ? (
                    <>
                      {selectedDayProductionCards.length > 0 && (
                        <List dense disablePadding sx={{ mb: selectedDayEvents.length ? 1 : 0 }}>
                          {selectedDayProductionCards.map((card) => (
                            <ListItemButton
                              key={card.id}
                              component={card.trello_url ? 'a' : 'div'}
                              href={card.trello_url || undefined}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{ borderRadius: 1, mb: 0.5 }}
                            >
                              <ListItemIcon sx={{ minWidth: 36 }}>
                                <Avatar sx={{ width: 28, height: 28, bgcolor: `${PRODUCTION_PALETTE[card.color_index % PRODUCTION_PALETTE.length]}22`, color: PRODUCTION_PALETTE[card.color_index % PRODUCTION_PALETTE.length] }}>
                                  <IconBriefcase size={15} />
                                </Avatar>
                              </ListItemIcon>
                              <ListItemText
                                primary={card.display_title}
                                secondary={[card.stage_name, card.board_name].filter(Boolean).join(' · ')}
                              />
                              <Chip
                                size="small"
                                label="Job"
                                sx={{ bgcolor: '#f3f4f6', color: '#6b7280', fontSize: '0.65rem', height: 20 }}
                              />
                            </ListItemButton>
                          ))}
                        </List>
                      )}
                      {selectedDayEvents.length > 0 && (
                      <List dense disablePadding>
                      {selectedDayEvents.map((event) => {
                          const isActioning = eventActionLoading === event.id;
                          const { Icon: EvIcon, color: evColor } = getEventMeta(event);
                          return (
                            <ListItemButton
                              key={event.id}
                              selected={selectedEvent?.id === event.id}
                              onClick={() => handleSelectEvent(event, selectedDayISO || activeDateISO)}
                              sx={{
                                borderRadius: 1,
                                mb: 0.5,
                                ...(Math.round(event.score) >= 100 && {
                                  bgcolor: 'rgba(19, 222, 185, 0.18)',
                                  color: '#0f766e',
                                  '& .MuiListItemText-secondary': { color: '#0f766e', opacity: 0.75 },
                                  '&:hover': { bgcolor: 'rgba(19, 222, 185, 0.28)' },
                                  '&.Mui-selected': { bgcolor: 'rgba(19, 222, 185, 0.30)' },
                                }),
                              }}
                            >
                              <ListItemIcon sx={{ minWidth: 36 }}>
                                <Avatar sx={{ width: 28, height: 28, bgcolor: `${evColor}22`, color: evColor }}>
                                  <EvIcon size={15} />
                                </Avatar>
                              </ListItemIcon>
                              <ListItemText
                                primary={event.name}
                                secondary={buildEventSecondaryText(event, selectedClient)}
                              />
                              <Stack direction="row" spacing={0.5} alignItems="center" onClick={(e) => e.stopPropagation()}>
                                {event.supports_briefing !== false && eventBriefingMap[event.name.toLowerCase().trim()] && (
                                  <Chip
                                    size="small"
                                    label="Briefing"
                                    icon={<IconFileText size={11} />}
                                    sx={{ bgcolor: 'success.light', color: 'success.dark', fontSize: '0.65rem', height: 20 }}
                                    onClick={() => router.push(`/edro/${eventBriefingMap[event.name.toLowerCase().trim()]}`)}
                                  />
                                )}
                                {isActioning ? (
                                  <CircularProgress size={14} />
                                ) : event.editable !== false ? (
                                  <IconButton
                                    size="small"
                                    onClick={(e) => handleEventMenuOpen(e, event.id)}
                                    sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}
                                  >
                                    <IconDotsVertical size={14} />
                                  </IconButton>
                                ) : null}
                                <Chip
                                  size="small"
                                  label={event.layer === 'operational' ? getOriginLabel(event.origin) : `Tier ${event.tier}`}
                                  color={event.layer === 'operational' ? 'default' : (TIER_COLORS[event.tier] || 'default') as any}
                                  sx={event.layer === 'operational' ? {
                                    bgcolor: `${getEventColorByOrigin(event.origin, event.tier)}22`,
                                    color: getEventColorByOrigin(event.origin, event.tier),
                                  } : undefined}
                                />
                              </Stack>
                            </ListItemButton>
                          );
                        })}
                      </List>
                      )}

                      {/* Menu de ações do evento */}
                      <Menu
                        anchorEl={eventMenuAnchor}
                        open={Boolean(eventMenuAnchor) && Boolean(eventMenuId)}
                        onClose={handleEventMenuClose}
                        slotProps={{ paper: { sx: { minWidth: 140 } } }}
                      >
                        {(() => {
                          const ev = selectedDayEvents.find((e) => e.id === eventMenuId);
                          if (!ev || ev.editable === false) return null;
                          return [
                            <MenuItem key="edit" onClick={() => handleEditEvent(ev)}>
                              <IconPencil size={15} style={{ marginRight: 8 }} />
                              Editar
                            </MenuItem>,
                            <MenuItem key="delete" onClick={() => handleDeleteClick(ev)} sx={{ color: 'error.main' }}>
                              <IconTrash size={15} style={{ marginRight: 8 }} />
                              Excluir
                            </MenuItem>,
                          ];
                        })()}
                      </Menu>
                    </>
                  ) : (
                    <Typography variant="body2" color="text.secondary">No events for this day.</Typography>
                  )}
                </Box>
                )}

                {/* ── Tab 1: Scheduled posts ── */}
                {dayPanelTab === 1 && (
                  <Box sx={{ mt: 0.5 }}>
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
                )}

                {/* ── Tab 2: Event details ── */}
                {dayPanelTab === 2 && selectedEvent && (
                  <Stack spacing={2} sx={{ mt: 0.5 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Box>
                        <Typography variant="subtitle1" fontWeight={600}>{selectedEvent.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{selectedEventDateLabel || eventDetailDateISO}</Typography>
                      </Box>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Chip
                          size="small"
                          label={getOriginLabel(selectedEvent.origin)}
                          sx={{
                            bgcolor: `${getEventColorByOrigin(selectedEvent.origin, selectedEvent.tier)}22`,
                            color: getEventColorByOrigin(selectedEvent.origin, selectedEvent.tier),
                          }}
                        />
                        <StatusChip status={selectedEvent.tier === 'A' ? 'high' : selectedEvent.tier === 'B' ? 'medium' : 'low'} label={`Tier ${selectedEvent.tier}`} />
                        <IconButton size="small" onClick={() => { setSelectedEvent(null); setSelectedEventDateISO(null); setDayPanelTab(0); }}>
                          <IconX size={16} />
                        </IconButton>
                      </Stack>
                    </Stack>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                      <Typography variant="caption" color="text.secondary">Camada</Typography>
                      <Typography variant="body2">{getLayerLabel(selectedEvent.layer)}</Typography>
                      <Typography variant="caption" color="text.secondary">Origem</Typography>
                      <Typography variant="body2">{getOriginLabel(selectedEvent.origin)}</Typography>
                      <Typography variant="caption" color="text.secondary">{selectedEvent.supports_relevance === false ? 'Prioridade' : selectedClient ? 'Relevance' : 'Base relevance'}</Typography>
                      <Typography variant="body2">{selectedEvent.score}</Typography>
                      <Typography variant="caption" color="text.secondary">Client</Typography>
                      <Typography variant="body2">{selectedEvent.client_name || selectedClient?.name || 'Global calendar'}</Typography>
                      {selectedEvent.time_label ? (
                        <>
                          <Typography variant="caption" color="text.secondary">Horário</Typography>
                          <Typography variant="body2">{selectedEvent.time_label}</Typography>
                        </>
                      ) : null}
                      {selectedEvent.status ? (
                        <>
                          <Typography variant="caption" color="text.secondary">Status</Typography>
                          <Typography variant="body2">{formatStatusLabel(selectedEvent.status)}</Typography>
                        </>
                      ) : null}
                      {!selectedClient && selectedEvent.supports_relevance !== false && selectedEvent.possible_clients?.length ? (
                        <>
                          <Typography variant="caption" color="text.secondary">Clientes possíveis</Typography>
                          <Typography variant="body2">
                            {selectedEvent.possible_clients.slice(0, 5).map((client) => `${client.name} (${Math.round(client.score)}%)`).join(' • ')}
                          </Typography>
                        </>
                      ) : null}
                      {!selectedClient && selectedEvent.supports_relevance !== false && selectedEvent.is_relevant === false ? (
                        <>
                          <Typography variant="caption" color="text.secondary">Match</Typography>
                          <Typography variant="body2">Sem cliente relevante para este evento</Typography>
                        </>
                      ) : null}
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
                    {selectedEvent.description ? (
                      <Box>
                        <Typography variant="overline" color="text.secondary">Descrição</Typography>
                        <Typography variant="body2" sx={{ lineHeight: 1.6 }}>{selectedEvent.description}</Typography>
                      </Box>
                    ) : null}
                    {selectedEvent.supports_relevance !== false ? (
                      <Box>
                        <Typography variant="overline" color="text.secondary">Ajuste de relevância</Typography>
                        {selectedClient || relevanceClientOptions.length ? (
                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'flex-end' }}>
                            {!selectedClient ? (
                              <TextField
                                select
                                size="small"
                                label="Cliente alvo"
                                value={manualRelevanceClientId}
                                onChange={(event) => setManualRelevanceClientId(event.target.value)}
                                sx={{ minWidth: 180 }}
                              >
                                <MenuItem value="">Selecione</MenuItem>
                                {relevanceClientOptions.map((client) => (
                                  <MenuItem key={client.id} value={client.id}>{client.name}</MenuItem>
                                ))}
                              </TextField>
                            ) : null}
                            <TextField
                              type="number"
                              size="small"
                              label="Relevância (%)"
                              value={manualRelevance}
                              onChange={(event) => setManualRelevance(event.target.value)}
                              inputProps={{ min: 0, max: 100 }}
                              sx={{ width: 140 }}
                            />
                            <Button size="small" variant="contained" onClick={handleSaveEventRelevance} disabled={saveRelevanceLoading}>
                              {saveRelevanceLoading ? 'Salvando...' : 'Salvar'}
                            </Button>
                          </Stack>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Nenhum cliente disponível para ajuste de relevância neste evento.
                          </Typography>
                        )}
                        {!selectedClient && manualRelevanceTargetClient ? (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                            Ajuste será aplicado para: {manualRelevanceTargetClient.name}
                          </Typography>
                        ) : null}
                      </Box>
                    ) : null}
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
                    {/* ── Creative Inspirations Panel ───────────────── */}
                    {selectedEvent.supports_briefing !== false && (selectedEvent.base_relevance ?? 0) >= 50 && (
                      <Box>
                        <Typography variant="overline" color="text.secondary">Inspirações Criativas</Typography>
                        {inspirationsLoading && (
                          <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
                            <CircularProgress size={14} />
                            <Typography variant="caption" color="text.secondary">Buscando referências...</Typography>
                          </Stack>
                        )}
                        {!inspirationsLoading && inspirations.length === 0 && (
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                            Ainda coletando inspirações para esta data...
                          </Typography>
                        )}
                        {!inspirationsLoading && inspirations.length > 0 && (
                          <Stack spacing={1} sx={{ mt: 1 }}>
                            {inspirations.slice(0, 6).map((ins) => (
                              <Box key={ins.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.25, bgcolor: 'background.paper' }}>
                                <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
                                  <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', lineHeight: 1.3 }} noWrap>
                                      {ins.title}
                                    </Typography>
                                    {ins.snippet && (
                                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
                                        {ins.snippet.slice(0, 150)}{ins.snippet.length > 150 ? '…' : ''}
                                      </Typography>
                                    )}
                                    <Stack direction="row" spacing={1} sx={{ mt: 0.75 }} alignItems="center">
                                      <Chip label={ins.source_lang === 'en' ? 'EN' : 'PT'} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.65rem' }} />
                                      <Typography component="a" href={ins.url} target="_blank" rel="noopener noreferrer" variant="caption" color="primary" sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                                        Ver fonte
                                      </Typography>
                                    </Stack>
                                  </Box>
                                  {selectedClient && (
                                    <Button size="small" variant="outlined" sx={{ minWidth: 'unset', px: 1, py: 0.5, fontSize: '0.7rem', flexShrink: 0 }} disabled={adaptingId === ins.id} onClick={() => handleAdaptInspiration(ins.id)}>
                                      {adaptingId === ins.id ? <CircularProgress size={12} /> : 'Adaptar'}
                                    </Button>
                                  )}
                                </Stack>
                                {adaptResult?.inspirationId === ins.id && (
                                  <Box sx={{ mt: 1, p: 1, bgcolor: 'action.hover', borderRadius: 1, borderLeft: '3px solid', borderColor: 'primary.main' }}>
                                    <Typography variant="caption" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{adaptResult.text}</Typography>
                                  </Box>
                                )}
                              </Box>
                            ))}
                          </Stack>
                        )}
                      </Box>
                    )}
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
                    {selectedEvent.supports_relevance !== false ? (
                      <Box>
                        <Typography variant="overline" color="text.secondary">Clientes do job</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Relevantes: {recommendedClientIds.length} de {clients.length}
                        </Typography>
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
                              <Button size="small" variant="text" onClick={handleSelectAllClients}>Selecionar todos</Button>
                              <Button size="small" variant="text" onClick={handleClearClients}>Limpar</Button>
                              {!showAllClients ? (
                                <Button size="small" variant="text" onClick={() => setShowAllClients(true)}>Mostrar todos</Button>
                              ) : (
                                <Button size="small" variant="text" onClick={() => setShowAllClients(false)}>Mostrar apenas relevantes</Button>
                              )}
                            </Stack>
                          </>
                        )}
                      </Box>
                    ) : null}
                    {selectedEvent.supports_briefing !== false ? (
                      <>
                        {(() => {
                          const existingId = selectedEvent && eventBriefingMap[selectedEvent.name.toLowerCase().trim()];
                          return existingId ? (
                            <Alert
                              severity="success"
                              icon={<IconFileText size={15} />}
                              action={
                                <Button size="small" color="success" onClick={() => router.push(`/edro/${existingId}`)}>
                                  Ver
                                </Button>
                              }
                              sx={{ py: 0.5 }}
                            >
                              Briefing já existe para este evento.
                            </Alert>
                          ) : null;
                        })()}
                        <Button variant="contained" fullWidth onClick={() => handleCreatePost(selectedEvent, eventDetailDateISO)}>
                          Criar Briefing
                        </Button>
                      </>
                    ) : null}
                  </Stack>
                )}
              </Stack>
            </CardContent>
          </Card>
        ) : null}
      </Stack>

    </Stack>
  );

  // ── Confirmar Exclusão Dialog ────────────────────────────────────
  const deleteConfirmDialog = (
    <Dialog open={Boolean(deleteConfirmEvent)} onClose={() => setDeleteConfirmEvent(null)} maxWidth="xs" fullWidth>
      <DialogTitle>Excluir evento</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary">
          Excluir &quot;{deleteConfirmEvent?.name}&quot;? Esta ação não pode ser desfeita.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={() => setDeleteConfirmEvent(null)} variant="outlined" size="small">
          Cancelar
        </Button>
        <Button onClick={handleDeleteConfirm} variant="contained" color="error" size="small" disabled={deleteLoading}>
          Excluir
        </Button>
      </DialogActions>
    </Dialog>
  );

  // ── Editar Evento Dialog ──────────────────────────────────────────
  const editEventDialog = (
    <Dialog open={editEventDialogOpen} onClose={() => setEditEventDialogOpen(false)} maxWidth="xs" fullWidth>
      <DialogTitle>Editar Evento</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Nome do evento"
            value={editEventName}
            onChange={(e) => setEditEventName(e.target.value)}
            autoFocus
            fullWidth
            onKeyDown={(e) => e.key === 'Enter' && handleEditConfirm()}
          />
          <TextField
            label="Relevância (0–100)"
            type="number"
            value={editEventScore}
            onChange={(e) => setEditEventScore(e.target.value)}
            inputProps={{ min: 0, max: 100 }}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setEditEventDialogOpen(false)}>Cancelar</Button>
        <Button variant="contained" onClick={handleEditConfirm} disabled={!editEventName.trim()}>
          Salvar
        </Button>
      </DialogActions>
    </Dialog>
  );

  // ── Adicionar Evento Dialog ──────────────────────────────────────────
  const addEventDialog = (
    <Dialog open={addEventDialogOpen} onClose={() => { setAddEventDialogOpen(false); setAddEventDate(''); }} maxWidth="sm" fullWidth>
      <DialogTitle>Adicionar Evento</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Nome do evento"
            value={addEventName}
            onChange={(e) => setAddEventName(e.target.value)}
            autoFocus
            fullWidth
            onKeyDown={(e) => e.key === 'Enter' && handleSubmitAddEvent()}
          />
          <TextField
            label="Data do evento"
            type="date"
            value={addEventDate}
            onChange={(e) => setAddEventDate(e.target.value)}
            fullWidth
            InputLabelProps={{ shrink: true }}
            helperText={addEventDate ? undefined : 'Obrigatório — defina a data em que o evento ocorre'}
            error={!addEventDate}
          />
          <TextField
            label="Relevância (0–100)"
            type="number"
            value={addEventScore}
            onChange={(e) => setAddEventScore(e.target.value)}
            inputProps={{ min: 0, max: 100 }}
            fullWidth
          />
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Clientes</Typography>
            <FormGroup>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={addEventAllClients}
                    onChange={(e) => {
                      setAddEventAllClients(e.target.checked);
                      if (e.target.checked) setAddEventClientIds([]);
                    }}
                  />
                }
                label={<Typography fontWeight={600}>Todos os clientes</Typography>}
              />
              {!addEventAllClients && (
                <Box sx={{ pl: 1, maxHeight: 240, overflowY: 'auto' }}>
                  {clients.map((client) => (
                    <FormControlLabel
                      key={client.id}
                      control={
                        <Checkbox
                          size="small"
                          checked={addEventClientIds.includes(client.id)}
                          onChange={(e) => {
                            setAddEventClientIds((prev) =>
                              e.target.checked ? [...prev, client.id] : prev.filter((id) => id !== client.id)
                            );
                          }}
                        />
                      }
                      label={client.name}
                    />
                  ))}
                </Box>
              )}
            </FormGroup>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setAddEventDialogOpen(false)}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleSubmitAddEvent}
          disabled={addEventLoading || !addEventName.trim() || !addEventDate}
        >
          {addEventLoading ? <CircularProgress size={16} /> : 'Adicionar'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  if (noShell) {
    return <>{content}{deleteConfirmDialog}{editEventDialog}{addEventDialog}</>;
  }

  return (
    <AppShell title="Global Operational Calendar">
      {content}
      {deleteConfirmDialog}
      {editEventDialog}
      {addEventDialog}
    </AppShell>
  );
}
