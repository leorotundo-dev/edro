'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, apiPost } from '@/lib/api';
import { renderHeadlineAccented } from '@/lib/renderHeadlineAccented';
import { InstagramFeedMockup } from '@/components/mockups/instagram/InstagramFeedMockup';
import { InstagramStoryMockup } from '@/components/mockups/instagram/InstagramStoryMockup';
import { InstagramProfileMockup } from '@/components/mockups/instagram/InstagramProfileMockup';
import { InstagramGridMockup } from '@/components/mockups/instagram/InstagramGridMockup';
import {
  buildMockupKeyCandidates,
  findBestMockupKey,
  mockupRegistry,
  normalizeMockupKey,
  resolveMockupComponent,
} from '@/components/mockups/mockupRegistry';
import { buildCatalogKey, mockupCatalogMap } from '@/components/mockups/mockupCatalogMap';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import LoadingButton from '@mui/lab/LoadingButton';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import Snackbar from '@mui/material/Snackbar';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import LinearProgress from '@mui/material/LinearProgress';
import {
  IconZoomIn,
  IconZoomOut,
  IconRefresh,
  IconArrowLeft,
  IconArrowRight,
  IconUpload,
  IconEdit,
  IconX,
  IconPhoto,
  IconLink,
  IconSparkles,
  IconCopy,
  IconWand,
  IconCheck,
} from '@tabler/icons-react';

type InventoryItem = {
  id?: string;
  platform?: string;
  platformId?: string;
  format?: string;
  name?: string;
};

type MockupItem = {
  id: string;
  platform: string;
  format: string;
  generated: boolean;
  createdAt: string;
  serverId?: string;
  status?: string | null;
  title?: string | null;
  baseId?: string;
  variantIndex?: number;
  variantLabel?: string;
  variantCopy?: string;
};

type ServerMockup = {
  id: string;
  briefing_id?: string | null;
  client_id?: string | null;
  platform?: string | null;
  format?: string | null;
  production_type?: string | null;
  status?: string | null;
  title?: string | null;
  html_key?: string | null;
  json_key?: string | null;
  metadata?: Record<string, any> | null;
  created_at?: string;
  updated_at?: string;
};

const safeParse = <T,>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try {
    return (JSON.parse(value) as T) ?? fallback;
  } catch {
    return fallback;
  }
};

const safeGet = (key: string) => {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.localStorage.getItem(key);
    if (value !== null && value !== undefined) return value;
  } catch {
    // ignore
  }
  try {
    if (window.top && window.top !== window) {
      return window.top.localStorage.getItem(key);
    }
  } catch {
    // ignore
  }
  return null;
};

const safeSet = (key: string, value: string) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
  try {
    if (window.top && window.top !== window) {
      window.top.localStorage.setItem(key, value);
    }
  } catch {
    // ignore
  }
};

const wrapText = (text: string, maxChars = 24, maxLines = 5) => {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines: string[] = [];
  let current = '';
  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  });
  if (current) lines.push(current);
  return lines.slice(0, maxLines);
};

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim();

const removeAccents = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const normalizeProductionType = (value: string) =>
  removeAccents(normalizeWhitespace(value || ''))
    .toLowerCase()
    .replace(/_/g, '-')
    .replace(/\s+/g, '-');

const normalizeCatalogToken = (value: string) =>
  removeAccents(normalizeWhitespace(value || ''));

const stripMarkdown = (value: string) =>
  value
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/^\s*#{1,6}\s*/gm, '')
    .trim();

const cleanCopy = (value: string) => {
  if (!value) return '';
  const withoutMarkdown = stripMarkdown(value).replace(/\r/g, '');
  const withoutLabels = withoutMarkdown.replace(
    /(^|\n)\s*(t[ií]tulo|headline|chamada|assunto|corpo|mensagem|texto|cta|chamada\s+para\s+a[cç][aã]o)\s*[:\-–—]\s*/gim,
    '$1'
  );
  return withoutLabels.replace(/[*_`~]+/g, '').trim();
};

const extractCopyVariants = (raw: string) => {
  const normalized = raw.replace(/\r/g, '').trim();
  if (!normalized) return [];
  const withBreaks = normalized
    .replace(/([^\n])\s+(\d{1,2}[\.)]\s+)/g, '$1\n$2')
    .replace(/([^\n])\s+(\d{1,2}\s*[-–—]\s+)/g, '$1\n$2')
    .replace(
      /([^\n])\s+(op[cç]a?o\s*\d+|varia[cç][aã]o\s*\d+)\s*[:\-–—]?\s*/gi,
      '$1\n$2 '
    );
  const markerRegex = /(?:^|\n)\s*(?:\d{1,2}[\.)]|\d{1,2}\s*[-–—]|op[cç]a?o\s*\d+|varia[cç][aã]o\s*\d+)\s*[:\-–—]?\s*/gi;
  const markers = Array.from(withBreaks.matchAll(markerRegex));
  if (markers.length >= 2) {
    const slices = markers.map((match) => match.index ?? 0);
    const variants = slices.map((start, index) => {
      const end = index < slices.length - 1 ? slices[index + 1] : withBreaks.length;
      const chunk = withBreaks.slice(start, end);
      return chunk.replace(markerRegex, '').trim();
    });
    return variants.filter(Boolean);
  }
  if (withBreaks.includes('\n---\n')) {
    const parts = withBreaks.split(/\n---\n/g).map((part) => part.trim()).filter(Boolean);
    if (parts.length > 1) return parts;
  }
  return [withBreaks];
};

const extractCopyFields = (raw: string) => {
  const cleaned = cleanCopy(raw || '');
  const lines = cleaned
    .split('\n')
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean);
  const fields: Record<string, string> = {};
  const labelMatchers: Array<{ key: string; regex: RegExp }> = [
    { key: 'headline', regex: /^(?:t[ií]tulo|headline|chamada|assunto)\s*[:\-]\s*/i },
    { key: 'body', regex: /^(?:corpo|mensagem|texto)\s*[:\-]\s*/i },
    { key: 'cta', regex: /^(?:cta|chamada\s+para\s+a[cç][aã]o|acao)\s*[:\-]\s*/i },
  ];
  let currentKey = '';

  lines.forEach((line) => {
    const matcher = labelMatchers.find(({ regex }) => regex.test(line));
    if (matcher) {
      currentKey = matcher.key;
      const value = line.replace(matcher.regex, '').trim();
      if (value) {
        fields[currentKey] = fields[currentKey]
          ? `${fields[currentKey]} ${value}`
          : value;
      }
      return;
    }
    if (currentKey) {
      fields[currentKey] = fields[currentKey]
        ? `${fields[currentKey]} ${line}`
        : line;
      return;
    }
    if (!fields.headline) {
      fields.headline = line;
    } else if (!fields.body) {
      fields.body = line;
    } else {
      fields.body = `${fields.body} ${line}`.trim();
    }
  });

  return {
    headline: fields.headline || '',
    body: fields.body || '',
    cta: fields.cta || '',
    fullText: cleaned,
  };
};

const clampText = (value: string, max = 140) => {
  const normalized = normalizeWhitespace(value || '');
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1)}…`;
};

const DISPLAY_SCALE = 0.45;
const GRID_GAP_PX = 28;
const DEFAULT_ZOOM = 0.75;
const MIN_ZOOM = 0.55;
const MAX_ZOOM = 1.05;

const getGridColumns = (width: number) => {
  if (width >= 1536) return 4;
  if (width >= 1280) return 3;
  if (width >= 768) return 2;
  return 1;
};

const buildMinimalCopy = (
  item: MockupItem,
  fields: { headline: string; body: string; cta: string; fullText: string },
  fallbackText: string
) => {
  const key = normalizeWhitespace(`${item.platform} ${item.format}`).toLowerCase();
  const isOOH =
    /outdoor|ooh|busdoor|frontlight|backlight|painel|placa|rel[oó]gio|totem|empena|taxi|tri-vis/i.test(
      key
    );
  const isRadio =
    /radio|spot|vinheta|jingle|podcast|locu[cç][aã]o|audio|a[uú]dio/i.test(key);
  const isStory = /story|reels|9:16|vertical|shorts/i.test(key);
  const isSquare = /1:1|feed|post|square/i.test(key);

  const headlineMax = isOOH ? 52 : isStory ? 44 : isSquare ? 40 : 60;
  const bodyMax = isOOH ? 120 : isRadio ? 220 : isStory ? 140 : 180;
  const ctaMax = isOOH ? 42 : 60;

  let headline = clampText(fields.headline || fields.body || fallbackText, headlineMax);
  let body = clampText(fields.body || fields.fullText || fallbackText, bodyMax);
  let cta = clampText(fields.cta || '', ctaMax);

  if (isRadio && (!headline || headline.length < 6)) {
    headline = 'Roteiro';
  }
  if (isOOH) {
    body = clampText(fields.body || '', Math.min(bodyMax, 60));
    if (body.length < 12) body = '';
  }
  if (!cta && isOOH && fields.body) {
    cta = clampText(fields.body.split('.').pop() || '', ctaMax);
  }

  return { headline, body, cta, isRadio, isOOH };
};

const resolveFormatRatio = (format: string, platform?: string) => {
  const text = normalizeWhitespace(format || '').toLowerCase();
  const match = text.match(/(\d+(?:\.\d+)?)\s*[x:]\s*(\d+(?:\.\d+)?)/);
  if (match) {
    const w = parseFloat(match[1]);
    const h = parseFloat(match[2]);
    if (w > 0 && h > 0) return w / h;
  }
  if (text.includes('9:16') || text.includes('story') || text.includes('reels')) return 9 / 16;
  if (text.includes('4:5')) return 4 / 5;
  if (text.includes('16:9')) return 16 / 9;
  if (text.includes('1:1') || text.includes('feed') || text.includes('post')) return 1;
  if (text.includes('outdoor') || text.includes('ooh') || text.includes('busdoor')) return 3;
  if ((platform || '').toLowerCase().includes('ooh')) return 3;
  return null;
};

const resolveFrameSize = (format: string, platform?: string, ratioOverride?: number | null) => {
  const ratio = ratioOverride ?? resolveFormatRatio(format, platform) ?? 4 / 3;
  let width = 420;
  if (ratio >= 2.8) width = 900;
  else if (ratio >= 2.4) width = 780;
  else if (ratio >= 2.0) width = 700;
  else if (ratio >= 1.6) width = 600;
  else if (ratio >= 1.2) width = 520;
  else if (ratio <= 0.8) width = 340;
  const height = Math.max(220, Math.round(width / ratio));
  return { width, height, ratio };
};

const parseRatioValue = (value?: string | null) => {
  if (!value) return null;
  const match = String(value).match(/(\d+(?:\.\d+)?)\s*[:x]\s*(\d+(?:\.\d+)?)/i);
  if (!match) return null;
  const w = parseFloat(match[1]);
  const h = parseFloat(match[2]);
  if (!w || !h) return null;
  return w / h;
};

const createSvgDataUri = (text: string, width: number, height: number, accent = '#E85219') => {
  const safeText = text || 'Preview';
  const lines = wrapText(safeText, 26, 6);
  const lineHeight = Math.round(height / 8);
  const startY = Math.round(height / 2 - (lines.length * lineHeight) / 2);
  const textNodes = lines
    .map(
      (line, index) =>
        `<tspan x="50%" y="${startY + index * lineHeight}" text-anchor="middle">${line}</tspan>`
    )
    .join('');
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#111827"/>
          <stop offset="100%" stop-color="${accent}"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)" />
      <text x="50%" y="50%" font-size="${Math.round(width / 18)}" fill="#ffffff" font-family="Inter, sans-serif">
        ${textNodes}
      </text>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const buildSatoriMockupUrl = (
  text: string,
  platform: string,
  format: string,
  brand: string
) => {
  const normalizedPlatform = normalizeWhitespace(platform || '').toLowerCase();
  const normalizedFormat = normalizeWhitespace(format || '').toLowerCase();
  const isInstagram = normalizedPlatform.includes('instagram');
  const isFeedLike =
    isInstagram &&
    !/story|reels|9:16|vertical|shorts|profile|grid/.test(normalizedFormat) &&
    (/feed|post|1:1|4:5|igtv|explore|shopping|video|carousel/.test(normalizedFormat) ||
      normalizedFormat.length === 0);

  if (!isFeedLike) return '';

  const fields = extractCopyFields(text || '');
  const headline = fields.headline || fields.body || fields.fullText || brand;
  const body = fields.body || fields.fullText || '';
  const cta = fields.cta || '';
  const params = new URLSearchParams();
  params.set('headline', headline);
  if (body) params.set('body', body);
  if (cta) params.set('cta', cta);
  if (brand) params.set('brand', brand);
  return `/api/mockups/instagram?${params.toString()}`;
};

const getCopyMap = () => safeParse<Record<string, string>>(safeGet('edro_copy_by_platform_format'), {});

const getContext = () => safeParse<Record<string, any>>(safeGet('edro_studio_context'), {});

const getActiveClientId = () => safeGet('edro_active_client_id') || '';

const getSelectedClients = () =>
  safeParse<Array<{ id: string; name: string }>>(safeGet('edro_selected_clients'), []);

const getCopyOptionsMap = () =>
  safeParse<Record<string, Array<{ title?: string; body?: string; cta?: string; raw?: string }>>>(
    safeGet('edro_copy_options_by_platform_format'),
    {}
  );

const getCopyMetaMap = () =>
  safeParse<Record<string, any>>(safeGet('edro_copy_meta_by_platform_format'), {});

const getCopyFor = (platform: string, format: string, context: Record<string, any>) => {
  const map = getCopyMap();
  const key = `${platform}::${format}`;
  const activeClientId = getActiveClientId();
  const clientKey = activeClientId ? `${activeClientId}::${key}` : '';
  const raw = (clientKey && map[clientKey]) || map[key] || context?.message || context?.event || '';
  return typeof raw === 'string' ? raw : String(raw);
};

const getCopyOptionsFor = (platform: string, format: string) => {
  const map = getCopyOptionsMap();
  const key = `${platform}::${format}`;
  const activeClientId = getActiveClientId();
  const clientKey = activeClientId ? `${activeClientId}::${key}` : '';
  const options = (clientKey && map[clientKey]) || map[key];
  return Array.isArray(options) ? options : [];
};

const buildOptionText = (option: { title?: string; body?: string; cta?: string; raw?: string }) => {
  const parts = [option.title, option.body, option.cta].map((value) => String(value || '').trim()).filter(Boolean);
  if (parts.length) return parts.join('\n');
  return String(option.raw || '').trim();
};

const getCopyMetaFor = (platform: string, format: string) => {
  const meta = getCopyMetaMap();
  const key = `${platform}::${format}`;
  const activeClientId = getActiveClientId();
  const clientKey = activeClientId ? `${activeClientId}::${key}` : '';
  return (clientKey && meta?.[clientKey]) || meta?.[key] || null;
};

const resolveProviderLabel = (meta: any) => {
  if (!meta) return '';
  const creativeProvider = meta?.creative_provider || meta?.provider || meta?.payload?.provider || '';
  const reviewProvider = meta?.review_provider || meta?.validator_provider || '';
  const rawModel =
    meta?.model ||
    meta?.creative_model ||
    meta?.payload?.model ||
    meta?.review_model ||
    meta?.engine ||
    '';

  const toLabel = (value: string) => {
    const candidate = String(value || '').toLowerCase();
    if (candidate.includes('gpt') || candidate.includes('openai')) return 'OpenAI';
    if (candidate.includes('gemini')) return 'Gemini';
    if (candidate.includes('claude')) return 'Claude';
    return value ? value : '';
  };

  const creativeLabel = toLabel(String(creativeProvider || ''));
  const reviewLabel = toLabel(String(reviewProvider || ''));
  const modelLabel = rawModel ? String(rawModel) : '';

  if (creativeLabel && reviewLabel && creativeLabel !== reviewLabel) {
    return `${creativeLabel} + ${reviewLabel}`;
  }
  if (creativeLabel && modelLabel) return `${creativeLabel} • ${modelLabel}`;
  return creativeLabel || reviewLabel || modelLabel || '';
};

const expandMockups = (items: MockupItem[], context: Record<string, any>) => {
  const expanded: MockupItem[] = [];
  items.forEach((item) => {
    const optionList = getCopyOptionsFor(item.platform, item.format);
    if (optionList.length) {
      optionList.forEach((option, index) => {
        expanded.push({
          ...item,
          id: `${item.id}::opt${index + 1}`,
          baseId: item.baseId || item.id,
          variantIndex: index,
          variantLabel: `Opção ${index + 1}`,
          variantCopy: buildOptionText(option),
        });
      });
      return;
    }
    const copy = item.variantCopy ?? getCopyFor(item.platform, item.format, context);
    const variants = extractCopyVariants(copy);
    if (!variants.length) {
      expanded.push({ ...item, baseId: item.baseId || item.id, variantIndex: 0, variantCopy: copy });
      return;
    }
    variants.forEach((variant, index) => {
      expanded.push({
        ...item,
        id: `${item.id}::v${index + 1}`,
        baseId: item.baseId || item.id,
        variantIndex: index,
        variantLabel: `Opção ${index + 1}`,
        variantCopy: variant,
      });
    });
  });
  return expanded;
};

const buildMockups = (inventory: InventoryItem[]): MockupItem[] =>
  inventory.map((item, index) => ({
    id: item.id || `${item.platform || 'platform'}-${item.format || item.name || 'format'}-${index}`,
    platform: item.platform || item.platformId || 'Instagram',
    format: item.format || item.name || 'Post',
    generated: false,
    createdAt: new Date().toISOString(),
  }));

const extractServerList = (payload: any): ServerMockup[] => {
  if (Array.isArray(payload)) return payload as ServerMockup[];
  if (Array.isArray(payload?.data)) return payload.data as ServerMockup[];
  if (Array.isArray(payload?.items)) return payload.items as ServerMockup[];
  return [];
};

const extractCopyText = (payload: any): string => {
  if (!payload) return '';
  if (typeof payload === 'string') return payload;
  if (typeof payload?.copy === 'string') return payload.copy;
  if (typeof payload?.captionText === 'string') return payload.captionText;
  if (typeof payload?.caption === 'string') return payload.caption;
  if (typeof payload?.text === 'string') return payload.text;
  if (typeof payload?.description === 'string') return payload.description;
  return '';
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const buildHtmlDocument = (inner: string, data: Record<string, any>) => {
  const serialized = escapeHtml(JSON.stringify(data ?? {}));
  const body = inner || '<div></div>';
  return `<!doctype html>
<html lang="pt-br">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Edro Mockup</title>
    <style>
      body { margin: 0; padding: 24px; font-family: Inter, Arial, sans-serif; background: #f8fafc; }
      .edro-mockup-shell { display: flex; align-items: center; justify-content: center; }
    </style>
  </head>
  <body>
    <script type="application/json" id="edro-mockup-data">${serialized}</script>
    <div class="edro-mockup-shell">${body}</div>
  </body>
</html>`;
};

const rebuildInventory = () => {
  const stored = safeParse<Record<string, string[]>>(safeGet('edro_selected_formats_by_platform'), {});
  const entries = Object.entries(stored).filter(([, list]) => Array.isArray(list) && list.length);
  const inventory: InventoryItem[] = [];
  entries.forEach(([platform, formats]) => {
    formats.forEach((format) => {
      inventory.push({ id: `${platform}-${format}`.toLowerCase(), platform, format });
    });
  });
  if (inventory.length) {
    safeSet('edro_selected_inventory', JSON.stringify(inventory));
    safeSet('edro_selected_platforms', JSON.stringify(entries.map(([platform]) => platform)));
  }
  return inventory;
};

const rebuildInventoryFromList = () => {
  const stored = safeParse<string[]>(safeGet('edro_selected_formats'), []);
  if (!stored.length) return [];
  const inventory: InventoryItem[] = [];
  const formatsByPlatform: Record<string, string[]> = {};
  stored.forEach((entry, index) => {
    const parts = entry.split(':').map((part) => part.trim()).filter(Boolean);
    const platform = parts.length > 1 ? parts[0] : 'Plataforma';
    const format = parts.length > 1 ? parts.slice(1).join(':') : entry;
    if (!formatsByPlatform[platform]) formatsByPlatform[platform] = [];
    formatsByPlatform[platform].push(format);
    inventory.push({
      id: `${platform}-${format}-${index}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      platform,
      platformId: platform,
      format,
    });
  });
  if (inventory.length) {
    safeSet('edro_selected_inventory', JSON.stringify(inventory));
    safeSet('edro_selected_formats_by_platform', JSON.stringify(formatsByPlatform));
    safeSet('edro_selected_platforms', JSON.stringify(Object.keys(formatsByPlatform)));
  }
  return inventory;
};

type PageProps = { embedded?: boolean };

export default function Page({ embedded }: PageProps = {}) {
  const [mockups, setMockups] = useState<MockupItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [focusedMockupId, setFocusedMockupId] = useState<string | null>(null);
  const [displayMap, setDisplayMap] = useState<Record<string, string>>({});
  const [context, setContext] = useState<Record<string, any>>({});
  const [catalogRatios, setCatalogRatios] = useState<Record<string, number>>({});
  const [measuredSizes, setMeasuredSizes] = useState<Record<string, { width: number; height: number }>>({});
  const [gridColumnWidth, setGridColumnWidth] = useState<number | null>(null);
  const [clientLogo, setClientLogo] = useState<string>('');
  const [zoomLevel, setZoomLevel] = useState<number>(DEFAULT_ZOOM);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [creativeImageUrl, setCreativeImageUrl] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePrompt, setImagePrompt] = useState('');
  const [generatingPrompt, setGeneratingPrompt] = useState(false);
  const [showCopyEditor, setShowCopyEditor] = useState(false);
  // AI Generation panel
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiProvider, setAiProvider] = useState<'gemini' | 'leonardo'>('gemini');
  const [aiModel, setAiModel] = useState('leonardo-phoenix');
  const [aiPromptVariations, setAiPromptVariations] = useState<string[]>([]);
  const [aiSelectedVariation, setAiSelectedVariation] = useState(0);
  const [aiCustomPrompt, setAiCustomPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiGeneratedImages, setAiGeneratedImages] = useState<string[]>([]);
  const [aiElapsedSec, setAiElapsedSec] = useState(0);
  const aiTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Art Director panel
  const [showArtDirectorPanel, setShowArtDirectorPanel] = useState(false);
  const [artDirectorGatilho, setArtDirectorGatilho] = useState('');
  const [artDirectorBrandColor, setArtDirectorBrandColor] = useState('#F5C518');
  const [artDirectorBrandColors, setArtDirectorBrandColors] = useState<string[]>([]);
  const [artDirectorOrchestrating, setArtDirectorOrchestrating] = useState(false);
  const [artDirectorLayout, setArtDirectorLayout] = useState<{
    eyebrow: string; headline: string; accentWord: string; accentColor: string;
    cta: string; body: string; overlayStrength: number;
  } | null>(null);
  const [artDirectorVariants, setArtDirectorVariants] = useState<string[]>([]);
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);
  const [artDirectorCritique, setArtDirectorCritique] = useState<{
    pass: boolean; score: number; issues: string[];
  } | null>(null);
  const [artDirectorBrandTokensActive, setArtDirectorBrandTokensActive] = useState(false);
  const [artDirectorRefImage, setArtDirectorRefImage] = useState<string>('');
  const [artDirectorRefStrength, setArtDirectorRefStrength] = useState(0.15);
  const [artDirectorRefUploading, setArtDirectorRefUploading] = useState(false);
  const artDirectorRefInputRef = useRef<HTMLInputElement>(null);
  const [exportError, setExportError] = useState('');
  const [editedCopy, setEditedCopy] = useState<{ headline: string; body: string; cta: string }>({
    headline: '',
    body: '',
    cta: '',
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const sizeObserversRef = useRef<Map<string, ResizeObserver>>(new Map());
  const gridRef = useRef<HTMLDivElement | null>(null);

  const buildMeasureRef = useCallback(
    (key: string) => (node: HTMLDivElement | null) => {
      const observers = sizeObserversRef.current;
      const currentObserver = observers.get(key);
      if (currentObserver) {
        currentObserver.disconnect();
        observers.delete(key);
      }
      if (!node) return;

      const updateSize = (rect: DOMRectReadOnly) => {
        const nextWidth = Math.round(rect.width);
        const nextHeight = Math.round(rect.height);
        if (!nextWidth || !nextHeight) return;
        setMeasuredSizes((prev) => {
          const current = prev[key];
          if (
            current &&
            Math.abs(current.width - nextWidth) < 2 &&
            Math.abs(current.height - nextHeight) < 2
          ) {
            return prev;
          }
          return { ...prev, [key]: { width: nextWidth, height: nextHeight } };
        });
      };

      updateSize(node.getBoundingClientRect());
      const observer = new ResizeObserver((entries) => {
        entries.forEach((entry) => updateSize(entry.contentRect));
      });
      observer.observe(node);
      observers.set(key, observer);
    },
    []
  );

  const productionTypeKey = useMemo(
    () =>
      normalizeProductionType(
        context?.productionType ||
          context?.production_type ||
          safeGet('edro_studio_production_type') ||
          ''
      ),
    [context]
  );

  const resolveClientId = useCallback((ctx?: Record<string, any>) => {
    const resolved = ctx ?? getContext();
    return (
      getActiveClientId() ||
      resolved?.clientId ||
      resolved?.client_id ||
      safeGet('edro_client_id') ||
      ''
    );
  }, []);

  const buildSnapshotPayload = (item: MockupItem) => {
    const productionType =
      context?.productionType ||
      context?.production_type ||
      safeGet('edro_studio_production_type') ||
      '';
    const rawCopy = item.variantCopy ?? getCopyFor(item.platform, item.format, context);
    const variant = item.variantCopy
      ? rawCopy
      : extractCopyVariants(rawCopy)[item.variantIndex ?? 0] || rawCopy;
    const fields = extractCopyFields(variant);
    const captionText = normalizeWhitespace(fields.body || fields.fullText || rawCopy);
    const shortText = clampText(fields.headline || captionText || `${item.platform} ${item.format}`, 120);
      const activeClient =
        getSelectedClients().find((client) => client.id === getActiveClientId()) ||
        getSelectedClients()[0] ||
        null;
      const payload = {
        platform: item.platform,
        format: item.format,
        productionType,
        copy: captionText || rawCopy,
        shortText,
        client: activeClient?.name || context?.client || context?.clientName || '',
        clientId: activeClient?.id || resolveClientId(),
        event: context?.event || '',
        updatedAt: new Date().toISOString(),
      };

    let htmlBody = '';
    if (typeof document !== 'undefined') {
      const node = document.querySelector(`[data-mockup-id="${item.id}"] [data-export-root]`) as HTMLElement | null;
      if (node) {
        htmlBody = node.outerHTML;
      }
    }
    if (!htmlBody) {
      htmlBody = `<div style="padding:24px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;">
  <h2 style="margin:0 0 8px;font-size:18px;color:#0f172a;">${escapeHtml(item.platform)} • ${escapeHtml(item.format)}</h2>
  <p style="margin:0;font-size:14px;color:#475569;white-space:pre-line;">${escapeHtml(
        captionText || rawCopy || 'Mockup gerado no Creative Studio.'
      )}</p>
</div>`;
    }

    return {
      payload,
      html: buildHtmlDocument(htmlBody, payload),
      copy: captionText || rawCopy,
      productionType,
    };
  };

  const syncRemoteMockups = useCallback(async (inventory: InventoryItem[], ctx?: Record<string, any>) => {
    const briefingId = safeGet('edro_briefing_id');
    const resolvedContext = ctx ?? getContext();
    const clientId = resolveClientId(resolvedContext);
    if (!briefingId && !clientId) return;
    const params = new URLSearchParams();
    if (briefingId) params.set('briefing_id', briefingId);
    if (clientId) params.set('client_id', clientId);

    setSyncing(true);
    try {
      const response = await api.get(`/mockups?${params.toString()}`);
      const items = extractServerList(response);
      if (!items.length) return;

      const serverMap = new Map<string, ServerMockup>();
      items.forEach((item) => {
        const platform = item.platform || 'Instagram';
        const format = item.format || 'Post';
        serverMap.set(`${platform}::${format}`, item);
      });

      const copyMap = { ...getCopyMap() };
      items.forEach((item) => {
        const platform = item.platform || 'Instagram';
        const format = item.format || 'Post';
        const key = `${platform}::${format}`;
        const metaCopy = extractCopyText(item.metadata);
        if (metaCopy) {
          copyMap[key] = metaCopy;
        }
      });

      const missingCopy = items.filter((item) => item.json_key);
      await Promise.allSettled(
        missingCopy.map(async (item) => {
          const platform = item.platform || 'Instagram';
          const format = item.format || 'Post';
          const key = `${platform}::${format}`;
          if (copyMap[key]) return;
          try {
            const jsonResponse = await api.get(`/mockups/${item.id}/json`);
            const payload = jsonResponse?.data ?? jsonResponse;
            const jsonCopy = extractCopyText(payload);
            if (jsonCopy) {
              copyMap[key] = jsonCopy;
            }
          } catch {
            // ignore
          }
        })
      );
      safeSet('edro_copy_by_platform_format', JSON.stringify(copyMap));

      const inventoryItems = inventory.length ? buildMockups(inventory) : [];
      const inventoryMap = new Map(
        inventoryItems.map((item) => [`${item.platform}::${item.format}`, item])
      );

      setMockups((prev) => {
        const prevMap = new Map(prev.map((item) => [`${item.platform}::${item.format}`, item]));
        const keys = new Set<string>([
          ...Array.from(prevMap.keys()),
          ...Array.from(inventoryMap.keys()),
          ...Array.from(serverMap.keys()),
        ]);
        const merged: MockupItem[] = [];

        keys.forEach((key) => {
          const [platform, format] = key.split('::');
          const base =
            prevMap.get(key) ||
            inventoryMap.get(key) || {
              id: `mockup-${platform}-${format}`.toLowerCase(),
              platform: platform || 'Instagram',
              format: format || 'Post',
              generated: false,
              createdAt: new Date().toISOString(),
            };

          const serverItem = serverMap.get(key);
          if (serverItem) {
            merged.push({
              ...base,
              platform: serverItem.platform || base.platform,
              format: serverItem.format || base.format,
              serverId: serverItem.id,
              status: serverItem.status ?? base.status,
              title: serverItem.title ?? base.title,
              createdAt: serverItem.created_at
                ? new Date(serverItem.created_at).toISOString()
                : base.createdAt,
              generated: true,
            });
            return;
          }

          merged.push(base);
        });

        return merged;
      });
    } finally {
      setSyncing(false);
    }
  }, [resolveClientId]);

    useEffect(() => {
      const storedContext = getContext();
      setContext(storedContext);

    const map = safeParse<Record<string, string>>(safeGet('edro_platform_display_map'), {});
    setDisplayMap(map);

    let inventory = safeParse<InventoryItem[]>(safeGet('edro_selected_inventory'), []);
    if (!inventory.length) {
      inventory = rebuildInventory();
    }
    if (!inventory.length) {
      inventory = rebuildInventoryFromList();
    }

    const storedMockups = safeParse<MockupItem[]>(safeGet('edro_mockups'), []);
    if (storedMockups.length) {
      setMockups(storedMockups);
    } else {
      const next = buildMockups(inventory);
      setMockups(next);
      safeSet('edro_mockups', JSON.stringify(next));
    }

    setClientLogo('');

      syncRemoteMockups(inventory, storedContext).catch(() => null);
    }, [resolveClientId, syncRemoteMockups]);

    useEffect(() => {
      const handler = () => {
        setContext(getContext());
      };
      if (typeof window !== 'undefined') {
        window.addEventListener('edro-studio-context-change', handler);
      }
      return () => {
        if (typeof window !== 'undefined') {
          window.removeEventListener('edro-studio-context-change', handler);
        }
      };
    }, []);

  useEffect(() => {
    const observers = sizeObserversRef.current;
    return () => {
      observers.forEach((observer) => observer.disconnect());
      observers.clear();
    };
  }, []);

  useEffect(() => {
    const node = gridRef.current;
    if (!node || typeof ResizeObserver === 'undefined') return;

    const update = () => {
      const rect = node.getBoundingClientRect();
      const width = Math.max(0, rect.width);
      if (!width) return;
      const columns = getGridColumns(width);
      const totalGap = GRID_GAP_PX * Math.max(0, columns - 1);
      const columnWidth = (width - totalGap) / columns;
      if (!columnWidth || Number.isNaN(columnWidth)) return;
      setGridColumnWidth(Math.max(220, Math.floor(columnWidth)));
    };

    update();
    const observer = new ResizeObserver(() => update());
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!productionTypeKey) return;
    api
      .get(`/production/catalog?production_type=${productionTypeKey}`)
      .then((response: any) => {
        const payload = response?.data || response;
        const items = Array.isArray(payload?.items) ? payload.items : Array.isArray(payload) ? payload : [];
        const next: Record<string, number> = {};
        items.forEach((item: any) => {
          const ratio =
            parseRatioValue(item?.specs?.ratio) ||
            (item?.specs?.width_px && item?.specs?.height_px
              ? Number(item.specs.width_px) / Number(item.specs.height_px)
              : null);
          if (!ratio || !item?.format_name) return;
          const productionType = normalizeProductionType(item.production_type || productionTypeKey);
          const platform = String(item.platform || '').trim();
          const format = String(item.format_name || '').trim();
          if (!platform || !format) return;
          next[`${productionType}::${platform}::${format}`] = ratio;
          next[`${platform}::${format}`] = ratio;
        });
        setCatalogRatios(next);
      })
      .catch(() => null);
  }, [productionTypeKey]);

  useEffect(() => {
    if (!mockups.length) return;
    safeSet('edro_mockups', JSON.stringify(mockups));
  }, [mockups]);

  const displayMockups = useMemo(() => expandMockups(mockups, context), [mockups, context]);

  useEffect(() => {
    if (!selectedIds.length) return;
    setSelectedIds((prev) => prev.filter((id) => displayMockups.some((item) => item.id === id)));
  }, [displayMockups, selectedIds.length]);

  useEffect(() => {
    const hydrateFromBriefing = async () => {
      const briefingId = safeGet('edro_briefing_id');
      if (!briefingId) return;
      try {
        const response = await api.get(`/edro/briefings/${briefingId}`);
        const payload = response?.data || response;
        const stages = Array.isArray(payload?.stages) ? payload.stages : [];
        const alignment = stages.find((stage: any) => stage?.stage === 'alinhamento');
        const metadata = alignment?.metadata || {};
        if (metadata?.inventory) {
          safeSet('edro_selected_inventory', JSON.stringify(metadata.inventory));
        }
        if (metadata?.formatsByPlatform) {
          safeSet('edro_selected_formats_by_platform', JSON.stringify(metadata.formatsByPlatform));
        }
        if (metadata?.activePlatform) {
          safeSet('edro_active_platform', metadata.activePlatform);
        }
        if (metadata?.activeFormat) {
          safeSet('edro_active_format', metadata.activeFormat);
        }

        // Load creative image generated in step 3 (Editor)
        const creativeUrl = payload?.briefing?.creative_image_url || null;
        if (creativeUrl) {
          setCreativeImageUrl(creativeUrl);
        }

        const inventory = metadata?.inventory?.length
          ? metadata.inventory
          : safeParse<InventoryItem[]>(safeGet('edro_selected_inventory'), []);
        if (inventory.length) {
          const storedMockups = safeParse<MockupItem[]>(safeGet('edro_mockups'), []);
          const storedMap = new Map(
            storedMockups.map((item) => [`${item.platform}::${item.format}`, item])
          );
          const next = inventory.map((item: InventoryItem, index: number) => {
            const platform = item.platform || item.platformId || 'Instagram';
            const format = item.format || item.name || 'Post';
            const key = `${platform}::${format}`;
            const existing = storedMap.get(key);
            return existing
              ? { ...existing, platform, format }
              : {
                  id: item.id || `${platform}-${format}-${index}`,
                  platform,
                  format,
                  generated: false,
                  createdAt: new Date().toISOString(),
                };
          });
          setMockups(next);
          safeSet('edro_mockups', JSON.stringify(next));
          syncRemoteMockups(inventory, getContext()).catch(() => null);
        }
      } catch {
        // ignore
      }
    };

    hydrateFromBriefing();
  }, [syncRemoteMockups]);

  useEffect(() => {
    const briefingId = safeGet('edro_briefing_id');
    if (!briefingId || embedded) return;
    api.patch(`/edro/briefings/${briefingId}/stages/producao`, { status: 'in_progress' }).catch(() => null);
  }, []);

  const markGeneratedFromCopy = useCallback(() => {
    if (!mockups.length) return;
    const map = getCopyMap();
    const activeClientId = getActiveClientId();
    let changed = false;
    const next = mockups.map((item) => {
      const key = `${item.platform}::${item.format}`;
      const clientKey = activeClientId ? `${activeClientId}::${key}` : key;
      const stored = map[clientKey] || map[key] || '';
      if (stored && !item.generated) {
        changed = true;
        return { ...item, generated: true };
      }
      return item;
    });
    if (changed) setMockups(next);
  }, [mockups]);

  useEffect(() => {
    markGeneratedFromCopy();
  }, [markGeneratedFromCopy, context]);

  const orderedMockups = useMemo(
    () =>
      [...displayMockups].sort((a, b) => {
        const aTime = new Date(a.createdAt || 0).getTime();
        const bTime = new Date(b.createdAt || 0).getTime();
        return bTime - aTime;
      }),
    [displayMockups]
  );
  const generatedCount = useMemo(
    () => displayMockups.filter((item) => item.generated).length,
    [displayMockups]
  );
  const platformsCount = useMemo(
    () => new Set(displayMockups.map((item) => item.platform)).size,
    [displayMockups]
  );
  const selectedCount = selectedIds.length;

  const username = useMemo(() => {
    const raw = context?.client || context?.clientName || 'sua_marca';
    return String(raw).toLowerCase().replace(/\s+/g, '');
  }, [context]);

  const displayName = useMemo(() => context?.client || 'sua_marca', [context]);

  const persistMockup = async (item: MockupItem, statusOverride?: string) => {
    const briefingId = safeGet('edro_briefing_id');
    const clientId = resolveClientId();
    const { payload, html, copy, productionType } = buildSnapshotPayload(item);
    const status = statusOverride ?? (item.generated ? 'saved' : 'draft');
    const title = item.title || resolveLabel(item.platform, item.format);
      const metadata = {
        copy: copy || payload.copy || '',
        shortText: payload.shortText || '',
        platform: item.platform,
        format: item.format,
        productionType: productionType || undefined,
        client: payload.client || '',
        clientId: payload.clientId || '',
        date: context?.date || '',
        updatedAt: payload.updatedAt,
        source: 'creative-studio',
      };

    const key = `${item.platform}::${item.format}`;
    if (copy) {
      const copyMap = { ...getCopyMap(), [key]: copy };
      safeSet('edro_copy_by_platform_format', JSON.stringify(copyMap));
    }

    if (item.serverId) {
      const response = await api.patch(`/mockups/${item.serverId}`, {
        status,
        title,
        metadata,
        html,
        json: payload,
      });
      return (response?.data ?? response) as ServerMockup;
    }

    const response = await api.post('/mockups', {
      briefing_id: briefingId || undefined,
      client_id: clientId || undefined,
      platform: item.platform,
      format: item.format,
      production_type: productionType || undefined,
      status,
      title,
      metadata,
      html,
      json: payload,
    });
    return (response?.data ?? response) as ServerMockup;
  };

  const persistSelected = async (ids: string[], statusOverride?: string) => {
    if (!ids.length) return;
    const displayMapLocal = new Map(displayMockups.map((item) => [item.id, item]));
    const targetsMap = new Map<string, MockupItem>();
    ids.forEach((id) => {
      const item = displayMapLocal.get(id);
      if (!item) return;
      const baseKey = item.baseId || item.id;
      targetsMap.set(baseKey, item);
    });
    const targets = Array.from(targetsMap.values());
    const updates = await Promise.allSettled(
      targets.map(async (item) => {
        const record = await persistMockup(item, statusOverride);
        return { id: item.baseId || item.id, record };
      })
    );

    const recordMap = new Map<string, ServerMockup>();
    updates.forEach((result) => {
      if (result.status === 'fulfilled' && result.value?.record) {
        recordMap.set(result.value.id, result.value.record);
      }
    });

    setMockups((prev) =>
      prev.map((item) => {
        const record = recordMap.get(item.id) || recordMap.get(item.baseId || '');
        if (!record) return item;
        return {
          ...item,
          serverId: record.id,
          status: record.status ?? item.status,
          title: record.title ?? item.title,
          createdAt: record.created_at ? new Date(record.created_at).toISOString() : item.createdAt,
          generated: true,
        };
      })
    );
  };

  const handleGenerateAll = () => {
    if (!mockups.length) return;
    setMockups((prev) => prev.map((item) => ({ ...item, generated: true })));
  };

  const handleZoomIn = () => setZoomLevel((value) => Math.min(MAX_ZOOM, Number((value + 0.07).toFixed(2))));
  const handleZoomOut = () => setZoomLevel((value) => Math.max(MIN_ZOOM, Number((value - 0.07).toFixed(2))));
  const handleZoomReset = () => setZoomLevel(DEFAULT_ZOOM);

  const handleCreativeImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const briefingId = safeGet('edro_briefing_id');
    if (briefingId) {
      setUploadingImage(true);
      try {
        const form = new FormData();
        form.append('file', file);
        await api.post(`/edro/briefings/${briefingId}/creative-image`, form);
      } catch {
        // fallback to local preview
      } finally {
        setUploadingImage(false);
      }
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setCreativeImageUrl(result);
    };
    reader.readAsDataURL(file);
    if (e.target) e.target.value = '';
  };

  const handleCreativeImageUrlPaste = (url: string) => {
    if (!url) return;
    setCreativeImageUrl(url);
    const briefingId = safeGet('edro_briefing_id');
    if (briefingId) {
      api.post(`/edro/briefings/${briefingId}/creative-image`, { imageUrl: url }).catch(() => null);
    }
  };

  const handleRemoveCreativeImage = () => {
    setCreativeImageUrl('');
    const briefingId = safeGet('edro_briefing_id');
    if (briefingId) {
      api.delete(`/edro/briefings/${briefingId}/creative-image`).catch(() => null);
    }
  };

  const handleGenerateImagePrompt = async () => {
    setGeneratingPrompt(true);
    try {
      const briefingId = safeGet('edro_briefing_id');
      const clientId = safeGet('edro_active_client_id') || undefined;
      const contextRaw = safeGet('edro_studio_context');
      let brief = '';
      let briefEvent = '';
      try {
        const ctx = JSON.parse(contextRaw || '{}');
        brief = ctx.title || ctx.event || '';
        briefEvent = ctx.event || '';
      } catch { /* ignore */ }

      const activeMockup = displayMockups.find((m) => m.id === focusedMockupId) ?? displayMockups[0];
      const platform = activeMockup?.platform || safeGet('edro_active_platform') || '';
      const format = activeMockup?.format || '';

      const res = await apiPost<{ success: boolean; prompt: string }>('/ai/image-prompt', {
        client_id: clientId,
        brief,
        platform,
        format,
        event: briefEvent,
      });
      if (res?.prompt) setImagePrompt(res.prompt);
    } catch {
      // silently fail
    } finally {
      setGeneratingPrompt(false);
    }
  };

  // ── AI Generation helpers ──────────────────────────────────────────────
  const getAiPayloadBase = () => {
    const activeMockup = displayMockups[0];
    const platform = activeMockup?.platform || safeGet('edro_active_platform') || 'Instagram';
    const format = activeMockup?.format || 'Feed 1:1';
    const clientId = safeGet('edro_active_client_id') || undefined;
    let copy = '';
    let headline = '';
    try {
      const ctx = JSON.parse(safeGet('edro_studio_context') || '{}');
      copy = ctx.message || ctx.event || ctx.title || '';
      headline = ctx.title || ctx.event || '';
    } catch { /* ignore */ }
    if (!copy && activeMockup) {
      copy = getCopyFor(platform, format, context);
    }
    const fields = extractCopyFields(copy);
    return { platform, format, clientId, copy, headline: headline || fields.headline, bodyText: fields.body };
  };

  const handleAiGetVariations = async () => {
    setGeneratingPrompt(true);
    setAiPromptVariations([]);
    setAiCustomPrompt('');
    try {
      const { platform, format, clientId, copy, headline, bodyText } = getAiPayloadBase();
      const res = await apiPost<{ success: boolean; prompt_variations: string[] }>('/studio/creative/generate', {
        copy,
        headline,
        body_text: bodyText,
        format,
        platform,
        client_id: clientId,
        image_provider: aiProvider,
        prompt_only: true,
      });
      if (res?.prompt_variations?.length) {
        setAiPromptVariations(res.prompt_variations);
        setAiSelectedVariation(0);
        setAiCustomPrompt(res.prompt_variations[0]);
      }
    } catch {
      // silently fail
    } finally {
      setGeneratingPrompt(false);
    }
  };

  const handleAiGenerateImage = async () => {
    setAiGenerating(true);
    setAiGeneratedImages([]);
    setAiElapsedSec(0);
    if (aiTimerRef.current) clearInterval(aiTimerRef.current);
    aiTimerRef.current = setInterval(() => setAiElapsedSec((s) => s + 1), 1000);
    try {
      const { platform, format, clientId, copy, headline, bodyText } = getAiPayloadBase();
      const aspectRatio = format.includes('9:16') ? '9:16' : format.includes('16:9') ? '16:9' : format.includes('4:5') ? '4:5' : '1:1';
      const res = await apiPost<{ success: boolean; image_url?: string; image_urls?: string[] }>('/studio/creative/generate', {
        copy,
        headline,
        body_text: bodyText,
        format,
        platform,
        client_id: clientId,
        image_provider: aiProvider,
        image_model: aiProvider === 'leonardo' ? aiModel : undefined,
        aspect_ratio: aspectRatio,
        num_images: aiProvider === 'leonardo' ? 3 : 1,
        custom_prompt: aiCustomPrompt || undefined,
      });
      if (res?.success) {
        const urls = res.image_urls?.length ? res.image_urls : res.image_url ? [res.image_url] : [];
        setAiGeneratedImages(urls);
      }
    } catch {
      // silently fail
    } finally {
      setAiGenerating(false);
      if (aiTimerRef.current) { clearInterval(aiTimerRef.current); aiTimerRef.current = null; }
    }
  };

  const handleAiUseImage = (url: string) => {
    setCreativeImageUrl(url);
    const briefingId = safeGet('edro_briefing_id');
    if (briefingId) {
      apiPost(`/edro/briefings/${briefingId}/creative-image`, { imageUrl: url }).catch(() => null);
    }
    setShowAiPanel(false);
  };

  const handleRefImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setArtDirectorRefUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      setArtDirectorRefImage(reader.result as string);
      setArtDirectorRefUploading(false);
    };
    reader.readAsDataURL(file);
    if (e.target) e.target.value = '';
  };

  const handleArtDirectorOrchestrate = async (withImage: boolean) => {
    setArtDirectorOrchestrating(true);
    try {
      const { platform, format, clientId, copy } = getAiPayloadBase();
      const res = await apiPost<{
        success: boolean;
        layout?: typeof artDirectorLayout;
        imgPrompt?: { positive: string; negative: string; aspectRatio: string };
        brand_colors?: string[];
        brand_tokens?: Record<string, any> | null;
        image_url?: string;
        image_urls?: string[];
        critique?: { pass: boolean; score: number; issues: string[] } | null;
      }>('/studio/creative/orchestrate', {
        copy,
        gatilho: artDirectorGatilho || undefined,
        brand: { primaryColor: artDirectorBrandColor },
        format,
        platform,
        client_id: clientId,
        with_image: withImage,
        image_provider: 'fal',
        num_variants: 3,
        reference_image_url: artDirectorRefImage || undefined,
        reference_image_strength: artDirectorRefImage ? artDirectorRefStrength : undefined,
      });
      if (res?.success && res.layout) {
        setArtDirectorLayout(res.layout);
      }
      if (res?.brand_colors?.length) {
        setArtDirectorBrandColors(res.brand_colors);
        if (artDirectorBrandColor === '#F5C518') {
          setArtDirectorBrandColor(res.brand_colors[0]);
        }
      }
      setArtDirectorBrandTokensActive(Boolean(res?.brand_tokens && Object.keys(res.brand_tokens).length > 0));
      if (res?.critique) {
        setArtDirectorCritique(res.critique);
      }
      if (withImage && res?.image_urls?.length) {
        setArtDirectorVariants(res.image_urls);
        setSelectedVariantIdx(0);
        const firstUrl = res.image_urls[0];
        setCreativeImageUrl(firstUrl);
        const briefingId = safeGet('edro_briefing_id');
        if (briefingId) {
          apiPost(`/edro/briefings/${briefingId}/creative-image`, { imageUrl: firstUrl }).catch(() => null);
        }
      } else if (withImage && res?.image_url) {
        setCreativeImageUrl(res.image_url);
      }
    } catch {
      // silently fail
    } finally {
      setArtDirectorOrchestrating(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleSelectAll = () => setSelectedIds(displayMockups.map((item) => item.id));

  const handleClearSelection = () => setSelectedIds([]);

  const handleDeleteSelected = async () => {
    if (!selectedIds.length) return;
    const displayMapLocal = new Map(displayMockups.map((item) => [item.id, item]));
    const baseIds = new Set<string>();
    selectedIds.forEach((id) => {
      const item = displayMapLocal.get(id);
      if (!item) return;
      baseIds.add(item.baseId || item.id);
    });
    const targets = mockups.filter((item) => baseIds.has(item.id) && item.serverId);
    if (targets.length) {
      await Promise.allSettled(
        targets.map((item) => api.delete(`/mockups/${item.serverId}`))
      );
    }
    setMockups((prev) => prev.filter((item) => !baseIds.has(item.id)));
    setSelectedIds([]);
  };

  const handleSaveSelected = async () => {
    if (!selectedIds.length) return;
    await persistSelected(selectedIds, 'saved');
    setSelectedIds([]);
  };

  const handleSaveDraftAll = async () => {
    if (!mockups.length) return;
    const ids = mockups.map((item) => item.id);
    await persistSelected(ids, 'draft');
  };

  const handleExportSelected = async () => {
    if (!displayMockups.length) return;
    const ids = selectedIds.length ? selectedIds : displayMockups.map((item) => item.id);
    try {
      const [{ toPng }, jsZipModule] = await Promise.all([import('html-to-image'), import('jszip')]);
      const JSZip = jsZipModule.default;
      const zip = new JSZip();
      const mockupMap = new Map(displayMockups.map((item) => [item.id, item]));
      for (const id of ids) {
        const item = mockupMap.get(id);
        const node = document.querySelector(`[data-mockup-id="${id}"] [data-export-root]`) as HTMLElement | null;
        if (!node) continue;
        const dataUrl = await toPng(node, {
          cacheBust: true,
          pixelRatio: 2,
          backgroundColor: '#ffffff',
        });
        const base64 = dataUrl.split(',')[1];
        const filename = `mockup-${id}.png`;
        zip.file(filename, base64, { base64: true });
        if (item) {
          const rawCopy = item.variantCopy ?? getCopyFor(item.platform, item.format, context);
          const variant = item.variantCopy
            ? rawCopy
            : extractCopyVariants(rawCopy)[item.variantIndex ?? 0] || rawCopy;
          const satoriUrl = buildSatoriMockupUrl(
            variant,
            item.platform,
            item.format,
            displayName || username
          );
          if (satoriUrl) {
            try {
              const response = await fetch(satoriUrl, { cache: 'no-store' });
              if (response.ok) {
                const svgText = await response.text();
                zip.file(`mockup-${id}.svg`, svgText);
              }
            } catch (error) {
              console.warn('Falha ao gerar SVG do mockup', error);
            }
          }
        }
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `mockups-${new Date().toISOString().slice(0, 10)}.zip`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1500);
    } catch (error) {
      console.error('Erro ao exportar mockups', error);
      setExportError('Não foi possível exportar os mockups. Verifique as imagens e tente novamente.');
    }
  };

  const updateStageDone = () => {
    const briefingId = safeGet('edro_briefing_id');
    if (!briefingId) return;
    api.patch(`/edro/briefings/${briefingId}/stages/producao`, { status: 'done' }).catch(() => null);
  };

  const resolveLabel = (platform: string, format: string) => {
    const label = displayMap?.[platform] || platform;
    return `${label} • ${format}`;
  };

  const getFrameSizeForItem = useCallback((item: MockupItem) => {
    const key = `${productionTypeKey}::${item.platform}::${item.format}`;
    const ratioOverride = catalogRatios[key] || catalogRatios[`${item.platform}::${item.format}`];
    const baseKey = item.baseId || item.id;
    const measured = measuredSizes[baseKey];

    const applyClamp = (width: number, ratio: number) => {
      const cappedWidth = gridColumnWidth ? Math.min(width, gridColumnWidth) : width;
      const safeWidth = Math.max(220, Math.round(cappedWidth));
      const safeHeight = Math.max(180, Math.round(safeWidth / ratio));
      return { width: safeWidth, height: safeHeight, ratio: safeWidth / safeHeight };
    };

    if (measured?.width && measured?.height) {
      const ratio = measured.width / measured.height;
      const scaledWidth = Math.round(measured.width * DISPLAY_SCALE);
      return applyClamp(scaledWidth, ratio || 1);
    }

    const frame = resolveFrameSize(item.format, item.platform, ratioOverride);
    const ratio = frame.ratio || frame.width / frame.height || 1;
    const scaledWidth = Math.round(frame.width * DISPLAY_SCALE);
    return applyClamp(scaledWidth, ratio);
  }, [productionTypeKey, catalogRatios, measuredSizes, gridColumnWidth]);

  const getMeasureFrameSize = (item: MockupItem) => {
    const key = `${productionTypeKey}::${item.platform}::${item.format}`;
    const ratio = catalogRatios[key] || catalogRatios[`${item.platform}::${item.format}`];
    const frame = resolveFrameSize(item.format, item.platform, ratio);
    const width = Math.max(960, Math.round(frame.width * 1.4));
    const height = Math.max(320, Math.round(width / frame.ratio));
    return { width, height };
  };

  const getDisplayFrame = useCallback(
    (item: MockupItem) => {
      const frame = getFrameSizeForItem(item);
      const ratio = frame.ratio || frame.width / frame.height || 1;
      return { frame, ratio };
    },
    [getFrameSizeForItem]
  );

  const renderMockup = (item: MockupItem) => {
    try {
      const productionType =
        context?.productionType ||
        context?.production_type ||
        safeGet('edro_studio_production_type') ||
        '';
      const rawCopy = item.variantCopy ?? getCopyFor(item.platform, item.format, context);
      const variant = item.variantCopy
        ? rawCopy
        : extractCopyVariants(rawCopy)[item.variantIndex ?? 0] || rawCopy;
      const fields = extractCopyFields(variant);

      // Live copy editor overrides
      const useEdited = showCopyEditor && (editedCopy.headline || editedCopy.body || editedCopy.cta);
      if (useEdited) {
        if (editedCopy.headline) fields.headline = editedCopy.headline;
        if (editedCopy.body) fields.body = editedCopy.body;
        if (editedCopy.cta) fields.cta = editedCopy.cta;
      }

      const caption = fields.fullText || rawCopy || 'Digite ou gere o copy para visualizar o mockup.';
      const captionText = normalizeWhitespace(fields.body || caption).slice(0, 2200);
      const shortText = clampText(fields.headline || captionText || `${item.platform} ${item.format}`, 90);
      const subheadline = clampText(fields.body || fields.cta || captionText, 140);
      const profileImage = '';
      const likes = Math.max(120, Math.round((context?.score || 60) * 25));
      const comments = Math.max(12, Math.round(likes / 18));
      const shares = Math.max(5, Math.round(likes / 30));
      const frame = getFrameSizeForItem(item);
      const ratio = frame.ratio || 16 / 9;
      const wideWidth = Math.max(960, Math.round(frame.width * 2));
      const wideHeight = Math.max(320, Math.round(wideWidth / ratio));
      const wideImage = createSvgDataUri(shortText, wideWidth, wideHeight);
      const squareImage = createSvgDataUri(shortText, 1080, 1080);
      const tallImage = createSvgDataUri(shortText, 1080, 1920);
      const baseProps: Record<string, any> = {
        username,
        name: displayName || username,
        brandName: displayName || username,
        profileImage,
        avatar: profileImage,
        logo: profileImage,
        brandLogo: profileImage,
        channelImage: profileImage,
        channelName: displayName,
        postText: captionText,
        caption: captionText,
        description: captionText,
        body: fields.body || captionText,
        text: captionText,
        title: shortText,
        headline: shortText,
        subheadline,
        subtitle: context?.event || '',
        cta: fields.cta || '',
        ctaText: fields.cta || 'Saiba mais',
        timeAgo: '2h',
        likes,
        comments,
        shares,
        views: `${likes * 4} views`,
        postImage: squareImage,
        image: squareImage,
        thumbnail: wideImage,
        coverImage: wideImage,
        bannerImage: wideImage,
        storyImage: tallImage,
        videoThumbnail: wideImage,
        adImage: wideImage,
      };

      const minimal = buildMinimalCopy(
        item,
        { ...fields, fullText: captionText },
        captionText || shortText
      );
      const satoriUrl = buildSatoriMockupUrl(
        rawCopy || captionText,
        item.platform,
        item.format,
        displayName || username
      );
      if (satoriUrl) {
        baseProps.postImage = satoriUrl;
        baseProps.image = satoriUrl;
        baseProps.coverImage = satoriUrl;
        baseProps.thumbnail = satoriUrl;
        baseProps.bannerImage = satoriUrl;
      }

      // Creative image override — uploaded image takes priority
      if (creativeImageUrl) {
        baseProps.postImage = creativeImageUrl;
        baseProps.image = creativeImageUrl;
        baseProps.thumbnail = creativeImageUrl;
        baseProps.coverImage = creativeImageUrl;
        baseProps.bannerImage = creativeImageUrl;
        baseProps.storyImage = creativeImageUrl;
        baseProps.videoThumbnail = creativeImageUrl;
        baseProps.adImage = creativeImageUrl;
      }

      // Art Director layout override — applies eyebrow/accentWord/accentColor when set.
      // The headline is pre-rendered as a ReactNode with the accent word highlighted,
      // so ALL mockup components get the visual emphasis without needing individual changes.
      // Components that already handle accentWord (Instagram, Facebook, LinkedIn) receive
      // an empty accentWord and short-circuit their own renderHeadlineAccented call,
      // rendering the already-processed ReactNode correctly.
      if (artDirectorLayout) {
        if (artDirectorLayout.eyebrow) {
          baseProps.eyebrow = artDirectorLayout.eyebrow;
          // Universal fallback: components that use subheadline/subtitle as their secondary slot
          baseProps.subheadline = artDirectorLayout.eyebrow;
          baseProps.subtitle = artDirectorLayout.eyebrow;
        }
        if (artDirectorLayout.headline) {
          // Pre-render with accent word so ALL components (740+) benefit without individual changes
          const renderedHeadline = renderHeadlineAccented(
            artDirectorLayout.headline,
            artDirectorLayout.accentWord || undefined,
            artDirectorLayout.accentColor || undefined,
          );
          baseProps.headline = renderedHeadline;
          baseProps.arteHeadline = renderedHeadline;
          baseProps.title = renderedHeadline;
          baseProps.name = renderedHeadline;
        }
        // Clear accentWord/accentColor: headline is already pre-rendered,
        // prevents double-processing in social components that handle these props internally
        baseProps.accentWord = '';
        baseProps.accentColor = '';
        if (artDirectorLayout.body) {
          baseProps.body = artDirectorLayout.body;
          baseProps.arteBody = artDirectorLayout.body;
          baseProps.description = artDirectorLayout.body;
          baseProps.postText = artDirectorLayout.body;
        }
        if (artDirectorLayout.cta) {
          baseProps.cta = artDirectorLayout.cta;
          baseProps.ctaText = artDirectorLayout.cta;
        }
      }

      const fontScale = Math.max(0.85, Math.min(1.05, frame.width / 520));
      const clampStyle = (lines: number) =>
        ({
          display: '-webkit-box',
          WebkitLineClamp: lines,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }) as React.CSSProperties;

      const renderMinimal = () => {
        const headlineLines = minimal.isOOH ? 2 : minimal.isRadio ? 2 : 2;
        const bodyLines = minimal.isOOH ? 2 : minimal.isRadio ? 3 : 3;
        const ctaLines = minimal.isOOH ? 1 : 1;
        const headlineScale = minimal.isOOH ? 1.08 : minimal.isRadio ? 0.95 : 1;
        return (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              border: 1,
              borderColor: 'grey.300',
              borderRadius: '18px',
              display: 'flex',
              flexDirection: 'column',
              bgcolor: 'rgba(255,255,255,0.4)',
              p: `${Math.max(12, Math.round(14 * fontScale))}px`,
              gap: `${Math.max(6, Math.round(8 * fontScale))}px`,
            }}
          >
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
              <Box
                component="div"
                sx={{
                  color: 'grey.900',
                  fontWeight: 500,
                  lineHeight: 1.4,
                  wordBreak: 'break-word',
                  fontSize: `${Math.max(12, Math.round(15 * fontScale * headlineScale))}px`,
                  ...clampStyle(headlineLines),
                }}
              >
                {minimal.headline}
              </Box>
              {minimal.body ? (
                <Box
                  component="div"
                  sx={{
                    color: 'grey.600',
                    mt: 1,
                    lineHeight: 1.4,
                    wordBreak: 'break-word',
                    fontSize: `${Math.max(10, Math.round(11 * fontScale))}px`,
                    ...clampStyle(bodyLines),
                  }}
                >
                  {minimal.body}
                </Box>
              ) : null}
              {minimal.cta ? (
                <Box
                  component="div"
                  sx={{
                    color: 'grey.800',
                    mt: 1.5,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.18em',
                    fontSize: `${Math.max(9, Math.round(9 * fontScale))}px`,
                    ...clampStyle(ctaLines),
                  }}
                >
                  {minimal.cta}
                </Box>
              ) : null}
            </Box>
          </Box>
        );
      };

      const normalizedPlatform = normalizeCatalogToken(item.platform || '');
      const normalizedFormat = normalizeCatalogToken(item.format || '');
      const productionKey = normalizeProductionType(productionType);
      const catalogKey = buildCatalogKey(productionKey, normalizedPlatform, normalizedFormat);
      const fallbackKey = buildCatalogKey(productionKey, normalizedPlatform, normalizedFormat).toLowerCase();
      const componentName =
        mockupCatalogMap[catalogKey] ||
        Object.entries(mockupCatalogMap).find(
          ([key]) => removeAccents(key).toLowerCase() === fallbackKey
        )?.[1];
      let RegistryComponent = componentName ? mockupRegistry[normalizeMockupKey(componentName)] : null;
      if (!RegistryComponent) {
        const candidates = buildMockupKeyCandidates({
          platform: item.platform,
          format: item.format,
          platformLabel: displayMap[item.platform],
        });
        RegistryComponent = resolveMockupComponent(candidates);
      }
      if (!RegistryComponent) {
        const bestKey = findBestMockupKey({
          productionType,
          platform: item.platform,
          format: item.format,
        });
        RegistryComponent = bestKey ? mockupRegistry[bestKey] : null;
      }

      if (componentName === 'InstagramStoryMockup') {
        return (
          <InstagramStoryMockup
            username={username}
            profileImage={profileImage}
            storyImage={createSvgDataUri(shortText, 1080, 1920)}
            timeAgo="2h"
          />
        );
      }
      if (componentName === 'InstagramProfileMockup') {
        return (
          <InstagramProfileMockup
            username={username}
            profileImage={profileImage}
            bio={captionText.slice(0, 120)}
            website="edro.studio"
            posts={12}
            followers={1520}
            following={320}
            stories={[
              { title: 'Campanha', image: createSvgDataUri(shortText, 400, 400) },
              { title: 'Bastidores', image: createSvgDataUri(shortText, 400, 400, '#2563eb') },
            ]}
            gridImages={Array.from({ length: 9 }).map((_, idx) =>
              createSvgDataUri(`${shortText} ${idx + 1}`, 400, 400, '#f97316')
            )}
          />
        );
      }
      if (componentName === 'InstagramGridMockup') {
        return (
          <InstagramGridMockup
            username={username}
            gridImages={Array.from({ length: 9 }).map((_, idx) =>
              createSvgDataUri(`${shortText} ${idx + 1}`, 400, 400, '#0ea5e9')
            )}
          />
        );
      }
      if (componentName === 'InstagramFeedMockup') {
        return (
          <InstagramFeedMockup
            username={username}
            profileImage={profileImage}
            postImage={baseProps.postImage}
            likes={Math.max(120, Math.round((context?.score || 60) * 25))}
            caption={captionText.slice(0, 180)}
            comments={[
              { username: 'cliente_real', text: 'Curti muito!' },
              { username: 'edro_team', text: 'Vamos nessa' },
            ]}
          />
        );
      }

      if (RegistryComponent) {
        return <RegistryComponent {...baseProps} />;
      }

      // Fallback: render minimal copy preview when no matching rich component found
      return renderMinimal();
    } catch (error) {
      console.warn('mockup render failed', error);
      return null;
    }
  };

  return (
    <Box sx={{ flex: 1 }}>
      {/* Page Header */}
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Geração de Mockups</Typography>
          <Typography variant="body2" color="text.secondary">
            Mockups realistas para aprovação e exportação imediata.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Chip size="small" variant="outlined" label={`${generatedCount} de ${displayMockups.length} gerados`} />
          <Chip size="small" variant="outlined" label={`${platformsCount} plataformas`} />
          <Chip size="small" variant="outlined" label={selectedCount ? `${selectedCount} selecionado(s)` : 'Nenhuma seleção'} />
        </Stack>
      </Stack>

      {/* Toolbar */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ md: 'center' }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Stack
            direction="row"
            spacing={0}
            alignItems="center"
            sx={{
              borderRadius: 99,
              border: 1,
              borderColor: 'grey.200',
              bgcolor: 'background.paper',
              px: 1,
              py: 0.5,
            }}
          >
            <IconButton size="small" onClick={handleZoomOut} sx={{ color: 'text.secondary' }}>
              <IconZoomOut size={18} />
            </IconButton>
            <IconButton size="small" onClick={handleZoomReset} sx={{ color: 'text.secondary' }}>
              <IconRefresh size={18} />
            </IconButton>
            <IconButton size="small" onClick={handleZoomIn} sx={{ color: 'text.secondary' }}>
              <IconZoomIn size={18} />
            </IconButton>
          </Stack>
          <Typography variant="overline" color="text.disabled" sx={{ fontSize: 11, letterSpacing: '0.2em' }}>
            {syncing ? 'Sincronizando...' : 'Grade dinâmica'}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
          <Button variant="text" size="small" onClick={handleSelectAll}>
            Selecionar todos
          </Button>
          <Button variant="text" size="small" onClick={handleClearSelection}>
            Limpar
          </Button>
          <Button variant="text" size="small" onClick={handleSaveSelected} disabled={!selectedCount || syncing}>
            Salvar
          </Button>
          <Button variant="outlined" size="small" color="error" onClick={handleDeleteSelected} disabled={!selectedCount || syncing}>
            Excluir
          </Button>
          <Button variant="contained" size="small" onClick={handleExportSelected} disabled={!displayMockups.length || syncing}>
            Exportar ZIP
          </Button>
        </Stack>
      </Stack>

      {/* Creative Image + Copy Editor Panel */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }}>
        {/* Creative Image Upload */}
        <Card variant="outlined" sx={{ flex: '0 0 auto', minWidth: 280 }}>
          <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <IconPhoto size={16} />
              <Typography variant="subtitle2" fontSize={13}>Imagem do Criativo</Typography>
            </Stack>
            {creativeImageUrl ? (
              <Stack spacing={1}>
                <Box
                  component="img"
                  src={creativeImageUrl}
                  alt="Creative"
                  sx={{ width: '100%', maxHeight: 120, objectFit: 'cover', borderRadius: 1 }}
                />
                <Button size="small" color="error" startIcon={<IconX size={14} />} onClick={handleRemoveCreativeImage}>
                  Remover
                </Button>
              </Stack>
            ) : (
              <Stack spacing={1}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  aria-label="Upload imagem do criativo"
                  style={{ display: 'none' }}
                  onChange={handleCreativeImageUpload}
                />
                {/* Art AI — toggle panel */}
                <Button
                  size="small"
                  variant={showArtDirectorPanel ? 'contained' : 'outlined'}
                  startIcon={<IconWand size={14} />}
                  color="secondary"
                  onClick={() => { setShowArtDirectorPanel((v) => !v); setShowAiPanel(false); }}
                  sx={{ fontSize: '0.75rem' }}
                >
                  Art AI
                </Button>

                {showArtDirectorPanel && (
                  <Box sx={{ border: '1px solid', borderColor: 'secondary.light', borderRadius: 1.5, p: 1.5, bgcolor: 'rgba(156,39,176,0.03)' }}>
                    {/* Hidden reference image input */}
                    <Box
                      ref={artDirectorRefInputRef}
                      component="input"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      aria-label="Upload imagem de referência visual"
                      onChange={handleRefImageUpload}
                      sx={{ display: 'none' }}
                    />

                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', fontWeight: 600, display: 'block', mb: 1 }}>
                      Gatilho Psicológico
                    </Typography>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
                      {[
                        { id: 'G01', label: 'G01 Perda' },
                        { id: 'G02', label: 'G02 Específico' },
                        { id: 'G03', label: 'G03 Zeigarnik' },
                        { id: 'G04', label: 'G04 Âncora' },
                        { id: 'G05', label: 'G05 Social' },
                        { id: 'G06', label: 'G06 Pratfall' },
                        { id: 'G07', label: 'G07 Dark' },
                      ].map((g) => (
                        <Chip
                          key={g.id}
                          label={g.label}
                          size="small"
                          variant={artDirectorGatilho === g.id ? 'filled' : 'outlined'}
                          color={artDirectorGatilho === g.id ? 'secondary' : 'default'}
                          onClick={() => setArtDirectorGatilho((prev) => prev === g.id ? '' : g.id)}
                          sx={{ fontSize: '0.65rem', cursor: 'pointer' }}
                        />
                      ))}
                    </Stack>

                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: artDirectorBrandColors.length ? 0.75 : 1.5 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', whiteSpace: 'nowrap' }}>
                        Cor acento
                      </Typography>
                      <Box
                        component="input"
                        type="color"
                        value={artDirectorBrandColor}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setArtDirectorBrandColor(e.target.value)}
                        sx={{ width: 36, height: 28, p: 0.25, border: '1px solid', borderColor: 'divider', borderRadius: 1, cursor: 'pointer' }}
                      />
                      <Typography variant="caption" sx={{ fontSize: '0.65rem', fontFamily: 'monospace' }}>
                        {artDirectorBrandColor}
                      </Typography>
                    </Stack>
                    {artDirectorBrandColors.length > 0 && (
                      <Stack direction="row" spacing={0.5} sx={{ mb: 1.5, flexWrap: 'wrap', gap: 0.5 }}>
                        {artDirectorBrandColors.map((c) => (
                          <Box
                            key={c}
                            onClick={() => setArtDirectorBrandColor(c)}
                            title={c}
                            sx={{
                              width: 20, height: 20, borderRadius: '50%',
                              bgcolor: c, cursor: 'pointer',
                              border: artDirectorBrandColor === c ? '2px solid' : '1.5px solid rgba(0,0,0,0.15)',
                              borderColor: artDirectorBrandColor === c ? 'primary.main' : 'rgba(0,0,0,0.15)',
                            }}
                          />
                        ))}
                      </Stack>
                    )}

                    {/* Brand tokens active badge */}
                    {artDirectorBrandTokensActive && (
                      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 1 }}>
                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'success.main' }} />
                        <Typography variant="caption" sx={{ fontSize: '0.62rem', color: 'success.main', fontWeight: 600 }}>
                          Brand tokens ativos
                        </Typography>
                      </Stack>
                    )}

                    {/* Reference image widget */}
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', whiteSpace: 'nowrap' }}>
                        Ref. visual
                      </Typography>
                      {artDirectorRefImage ? (
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <Box
                            sx={{ width: 32, height: 32, borderRadius: 0.75, overflow: 'hidden', border: '1.5px solid', borderColor: 'secondary.main', flexShrink: 0 }}
                          >
                            <Box component="img" src={artDirectorRefImage} alt="ref" sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                          </Box>
                          <Button
                            size="small"
                            color="inherit"
                            sx={{ fontSize: '0.6rem', minWidth: 0, p: 0.25, opacity: 0.5 }}
                            onClick={() => setArtDirectorRefImage('')}
                          >
                            ✕
                          </Button>
                          <Box sx={{ flex: 1, minWidth: 60 }}>
                            <Typography variant="caption" sx={{ fontSize: '0.58rem', color: 'text.secondary' }}>
                              Influência
                            </Typography>
                            <Box
                              component="input"
                              type="range"
                              min={0}
                              max={1}
                              step={0.05}
                              value={artDirectorRefStrength}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setArtDirectorRefStrength(Number(e.target.value))}
                              sx={{ width: '100%', accentColor: 'secondary.main' }}
                            />
                            <Typography variant="caption" sx={{ fontSize: '0.58rem', color: 'text.secondary' }}>
                              {(artDirectorRefStrength * 100).toFixed(0)}%
                            </Typography>
                          </Box>
                        </Stack>
                      ) : (
                        <Button
                          size="small"
                          variant="outlined"
                          color="secondary"
                          disabled={artDirectorRefUploading}
                          onClick={() => artDirectorRefInputRef.current?.click()}
                          sx={{ fontSize: '0.62rem', py: 0.25, px: 1 }}
                        >
                          {artDirectorRefUploading ? '...' : '+ Upload'}
                        </Button>
                      )}
                    </Stack>

                    <Stack direction="row" spacing={0.75} sx={{ mb: 1 }}>
                      <LoadingButton
                        size="small"
                        variant="outlined"
                        color="secondary"
                        startIcon={<IconWand size={13} />}
                        loading={artDirectorOrchestrating}
                        onClick={() => handleArtDirectorOrchestrate(false)}
                        sx={{ fontSize: '0.7rem', flex: 1 }}
                      >
                        Layout
                      </LoadingButton>
                      <LoadingButton
                        size="small"
                        variant="contained"
                        color="secondary"
                        startIcon={<IconSparkles size={13} />}
                        loading={artDirectorOrchestrating}
                        onClick={() => handleArtDirectorOrchestrate(true)}
                        sx={{ fontSize: '0.7rem', flex: 1 }}
                      >
                        Layout + Imagem
                      </LoadingButton>
                    </Stack>

                    {/* Variant thumbnails */}
                    {artDirectorVariants.length > 0 && (
                      <Stack direction="row" spacing={0.75} sx={{ mb: 1, flexWrap: 'wrap', gap: 0.75 }}>
                        {artDirectorVariants.map((url, i) => (
                          <Box
                            key={i}
                            onClick={() => { setSelectedVariantIdx(i); setCreativeImageUrl(url); }}
                            sx={{
                              width: 56, height: 56, borderRadius: 1, overflow: 'hidden', cursor: 'pointer',
                              border: selectedVariantIdx === i ? '2.5px solid' : '1.5px solid',
                              borderColor: selectedVariantIdx === i ? 'secondary.main' : 'divider',
                              flexShrink: 0,
                            }}
                          >
                            <Box component="img" src={url} alt={`Variante ${i + 1}`} sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                          </Box>
                        ))}
                      </Stack>
                    )}

                    {artDirectorLayout && (
                      <Box sx={{ bgcolor: 'rgba(0,0,0,0.04)', borderRadius: 1, p: 1 }}>
                        {artDirectorLayout.eyebrow && (
                          <Typography variant="caption" sx={{ display: 'block', fontSize: '0.62rem', color: 'text.secondary', letterSpacing: '0.08em', textTransform: 'uppercase', mb: 0.25 }}>
                            {artDirectorLayout.eyebrow}
                          </Typography>
                        )}
                        <Typography variant="caption" sx={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, lineHeight: 1.3, mb: 0.5 }}>
                          {artDirectorLayout.headline}
                          {artDirectorLayout.accentWord && (
                            <Box component="span" sx={{ color: artDirectorLayout.accentColor }}> [{artDirectorLayout.accentWord}]</Box>
                          )}
                        </Typography>
                        {artDirectorLayout.cta && (
                          <Chip label={artDirectorLayout.cta} size="small" sx={{ fontSize: '0.62rem', height: 18 }} />
                        )}

                        {/* Critique badge */}
                        {artDirectorCritique && (
                          <Box sx={{ mt: 0.75 }}>
                            <Chip
                              label={artDirectorCritique.pass ? `✓ PASS ${artDirectorCritique.score}/10` : `✗ FAIL ${artDirectorCritique.score}/10`}
                              size="small"
                              color={artDirectorCritique.pass ? 'success' : 'error'}
                              sx={{ fontSize: '0.6rem', height: 18, mb: artDirectorCritique.issues.length ? 0.5 : 0 }}
                            />
                            {artDirectorCritique.issues.map((issue, i) => (
                              <Typography key={i} variant="caption" sx={{ display: 'block', fontSize: '0.6rem', color: 'error.main', lineHeight: 1.4 }}>
                                · {issue}
                              </Typography>
                            ))}
                          </Box>
                        )}

                        <Button
                          size="small"
                          color="inherit"
                          sx={{ fontSize: '0.62rem', mt: 0.5, p: 0, minWidth: 0, textTransform: 'none', opacity: 0.5 }}
                          onClick={() => {
                            setArtDirectorLayout(null);
                            setArtDirectorVariants([]);
                            setArtDirectorCritique(null);
                            setArtDirectorRefImage('');
                            setArtDirectorBrandTokensActive(false);
                          }}
                        >
                          Limpar
                        </Button>
                      </Box>
                    )}
                  </Box>
                )}

                {/* Gerar com IA — toggle panel */}
                <Button
                  size="small"
                  variant={showAiPanel ? 'contained' : 'outlined'}
                  startIcon={<IconSparkles size={14} />}
                  color="primary"
                  onClick={() => { setShowAiPanel((v) => !v); setShowArtDirectorPanel(false); }}
                  sx={{ fontSize: '0.75rem' }}
                >
                  Gerar com IA
                </Button>

                {showAiPanel && (
                  <Box sx={{ border: '1px solid', borderColor: 'primary.light', borderRadius: 1.5, p: 1.5, bgcolor: 'rgba(25,118,210,0.03)' }}>
                    {/* Provider selector */}
                    <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                      {(['gemini', 'leonardo'] as const).map((p) => (
                        <Chip
                          key={p}
                          label={p === 'gemini' ? 'Gemini' : 'Leonardo'}
                          size="small"
                          variant={aiProvider === p ? 'filled' : 'outlined'}
                          color={aiProvider === p ? 'primary' : 'default'}
                          onClick={() => setAiProvider(p)}
                          sx={{ fontSize: '0.7rem', cursor: 'pointer' }}
                        />
                      ))}
                    </Stack>

                    {/* Leonardo model selector */}
                    {aiProvider === 'leonardo' && (
                      <Box sx={{ mb: 1.5 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', mb: 0.5, display: 'block' }}>
                          Modelo
                        </Typography>
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                          {[
                            { id: 'leonardo-phoenix', label: 'Phoenix' },
                            { id: 'leonardo-lightning-xl', label: 'Lightning' },
                            { id: 'leonardo-kino-xl', label: 'Kino' },
                          ].map((m) => (
                            <Chip
                              key={m.id}
                              label={m.label}
                              size="small"
                              variant={aiModel === m.id ? 'filled' : 'outlined'}
                              color={aiModel === m.id ? 'secondary' : 'default'}
                              onClick={() => setAiModel(m.id)}
                              sx={{ fontSize: '0.68rem', cursor: 'pointer' }}
                            />
                          ))}
                        </Stack>
                      </Box>
                    )}

                    {/* Art Director variations */}
                    <LoadingButton
                      size="small"
                      fullWidth
                      variant="outlined"
                      startIcon={<IconWand size={13} />}
                      loading={generatingPrompt}
                      onClick={handleAiGetVariations}
                      sx={{ fontSize: '0.72rem', mb: aiPromptVariations.length ? 1 : 0 }}
                    >
                      Gerar variações de cena (IA)
                    </LoadingButton>

                    {aiPromptVariations.length > 0 && (
                      <Stack spacing={0.5} sx={{ mb: 1 }}>
                        {aiPromptVariations.map((v, i) => (
                          <Box
                            key={i}
                            onClick={() => { setAiSelectedVariation(i); setAiCustomPrompt(v); }}
                            sx={{
                              p: 0.75,
                              borderRadius: 1,
                              border: '1px solid',
                              borderColor: aiSelectedVariation === i ? 'primary.main' : 'divider',
                              bgcolor: aiSelectedVariation === i ? 'rgba(25,118,210,0.07)' : 'background.default',
                              cursor: 'pointer',
                              fontSize: '0.66rem',
                              lineHeight: 1.4,
                              color: 'text.secondary',
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            <Typography variant="caption" sx={{ fontSize: '0.64rem', fontWeight: 700, color: 'primary.main', display: 'block', mb: 0.25 }}>
                              {['A — Metafórica', 'B — Ambiental', 'C — Humana'][i] || `Opção ${i + 1}`}
                            </Typography>
                            {v.slice(0, 160)}{v.length > 160 ? '…' : ''}
                          </Box>
                        ))}
                      </Stack>
                    )}

                    {/* Editable scene prompt */}
                    <TextField
                      size="small"
                      fullWidth
                      multiline
                      minRows={2}
                      maxRows={5}
                      value={aiCustomPrompt}
                      onChange={(e) => setAiCustomPrompt(e.target.value)}
                      placeholder="Descreva a cena ou edite a variação acima..."
                      InputProps={{ sx: { fontSize: '0.72rem' } }}
                      sx={{ mb: 1 }}
                    />

                    {/* Generate button + timer */}
                    <LoadingButton
                      size="small"
                      fullWidth
                      variant="contained"
                      color="primary"
                      startIcon={<IconSparkles size={13} />}
                      loading={aiGenerating}
                      onClick={handleAiGenerateImage}
                      sx={{ fontSize: '0.75rem', mb: 0.5 }}
                    >
                      {aiGenerating
                        ? `Gerando${aiProvider === 'leonardo' ? ` (${aiElapsedSec}s)` : '…'}`
                        : 'Gerar Imagem'}
                    </LoadingButton>
                    {aiGenerating && (
                      <LinearProgress sx={{ borderRadius: 1, height: 3 }} />
                    )}

                    {/* Generated images grid */}
                    {aiGeneratedImages.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', display: 'block', mb: 0.5 }}>
                          {aiGeneratedImages.length > 1 ? `${aiGeneratedImages.length} variações geradas — clique para usar` : 'Imagem gerada — clique para usar'}
                        </Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 0.75 }}>
                          {aiGeneratedImages.map((url, i) => (
                            <Box
                              key={i}
                              onClick={() => handleAiUseImage(url)}
                              sx={{
                                position: 'relative',
                                borderRadius: 1,
                                overflow: 'hidden',
                                cursor: 'pointer',
                                border: '2px solid transparent',
                                '&:hover': { borderColor: 'primary.main' },
                                '&:hover .use-btn': { opacity: 1 },
                              }}
                            >
                              <Box
                                component="img"
                                src={url}
                                alt={`Variação ${i + 1}`}
                                sx={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }}
                              />
                              <Box
                                className="use-btn"
                                sx={{
                                  position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.55)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  opacity: 0, transition: 'opacity 0.15s',
                                }}
                              >
                                <IconCheck size={22} color="#fff" />
                              </Box>
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    )}
                  </Box>
                )}

                <LoadingButton
                  size="small"
                  variant="outlined"
                  startIcon={<IconUpload size={14} />}
                  onClick={() => fileInputRef.current?.click()}
                  loading={uploadingImage}
                  sx={{ fontSize: '0.72rem' }}
                >
                  Upload Imagem
                </LoadingButton>
                <TextField
                  size="small"
                  placeholder="Ou cole a URL da imagem"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreativeImageUrlPaste((e.target as HTMLInputElement).value);
                      (e.target as HTMLInputElement).value = '';
                    }
                  }}
                  InputProps={{ sx: { fontSize: 12 } }}
                />
                <LoadingButton
                  size="small"
                  variant="outlined"
                  onClick={handleGenerateImagePrompt}
                  loading={generatingPrompt && !showAiPanel}
                  startIcon={<IconSparkles size={14} />}
                  color="inherit"
                  sx={{ fontSize: '0.68rem', color: 'text.secondary' }}
                >
                  Prompt para Midjourney/DALL-E
                </LoadingButton>
                {imagePrompt && (
                  <Box sx={{ p: 1, bgcolor: 'rgba(232,82,25,0.06)', borderRadius: 1, border: '1px solid rgba(232,82,25,0.2)' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 0.5 }}>
                      <Typography variant="caption" fontWeight={700} color="#E85219" sx={{ fontSize: '0.62rem' }}>
                        PROMPT GERADO
                      </Typography>
                      <IconButton size="small" onClick={() => { navigator.clipboard?.writeText(imagePrompt).catch(() => {}); }}
                        sx={{ p: 0.25 }}>
                        <IconCopy size={12} />
                      </IconButton>
                    </Stack>
                    <Typography variant="caption" sx={{ fontSize: '0.72rem', fontFamily: 'monospace', lineHeight: 1.5, display: 'block' }}>
                      {imagePrompt}
                    </Typography>
                  </Box>
                )}
              </Stack>
            )}
          </CardContent>
        </Card>

        {/* Copy Editor Toggle */}
        <Card variant="outlined" sx={{ flex: 1 }}>
          <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <IconEdit size={16} />
                <Typography variant="subtitle2" fontSize={13}>Editor de Copy</Typography>
              </Stack>
              <Button
                size="small"
                variant={showCopyEditor ? 'contained' : 'outlined'}
                onClick={() => setShowCopyEditor((v) => !v)}
              >
                {showCopyEditor ? 'Fechar Editor' : 'Editar Copy'}
              </Button>
            </Stack>
            {showCopyEditor && (
              <Stack spacing={1.5}>
                <TextField
                  size="small"
                  label="Headline"
                  value={editedCopy.headline}
                  onChange={(e) => setEditedCopy((prev) => ({ ...prev, headline: e.target.value }))}
                  placeholder="Título principal do criativo"
                  fullWidth
                  InputProps={{ sx: { fontSize: 13 } }}
                />
                <TextField
                  size="small"
                  label="Corpo"
                  value={editedCopy.body}
                  onChange={(e) => setEditedCopy((prev) => ({ ...prev, body: e.target.value }))}
                  placeholder="Texto principal / caption"
                  multiline
                  rows={3}
                  fullWidth
                  InputProps={{ sx: { fontSize: 13 } }}
                />
                <TextField
                  size="small"
                  label="CTA"
                  value={editedCopy.cta}
                  onChange={(e) => setEditedCopy((prev) => ({ ...prev, cta: e.target.value }))}
                  placeholder="Ex: Saiba mais, Compre agora"
                  fullWidth
                  InputProps={{ sx: { fontSize: 13 } }}
                />
                <Typography variant="caption" color="text.secondary">
                  Alterações aplicadas em tempo real nos mockups abaixo.
                </Typography>
              </Stack>
            )}
          </CardContent>
        </Card>
      </Stack>

      {/* Grid Area */}
      <Box sx={{ flex: 1, position: 'relative' }}>
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            opacity: 0,
            background: 'linear-gradient(transparent 23px, #e2e8f0 24px), linear-gradient(90deg, transparent 23px, #e2e8f0 24px)',
            backgroundSize: '24px 24px',
          }}
        />
        <Box
          ref={gridRef}
          sx={{
            position: 'relative',
            width: '100%',
            height: '100%',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 320px))',
            gap: '28px',
            py: 3,
            justifyContent: 'flex-start',
            alignItems: 'flex-start',
          }}
        >
          {!orderedMockups.length ? (
            <Card sx={{ maxWidth: 560 }}>
              <CardContent>
                <Chip size="small" label="Sem peças selecionadas" sx={{ mb: 2 }} />
                <Typography variant="body2" color="text.secondary">
                  Não encontramos formatos selecionados para gerar mockups. Volte ao passo 2 e selecione as peças.
                </Typography>
                <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
                  <Button variant="contained" component={Link} href="/studio/platforms">
                    Voltar ao passo 2
                  </Button>
                  <Button
                    variant="text"
                    onClick={() => {
                      const inv = rebuildInventory() || rebuildInventoryFromList();
                      if (inv && inv.length) {
                        const next = buildMockups(inv);
                        setMockups(next);
                        safeSet('edro_mockups', JSON.stringify(next));
                      }
                    }}
                  >
                    Recarregar formatos
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          ) : null}

          {orderedMockups.length ? (
            orderedMockups.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              const label = resolveLabel(item.platform, item.format);
              const optionLabel = item.variantLabel ? `${label} • ${item.variantLabel}` : label;
              const providerLabel = resolveProviderLabel(getCopyMetaFor(item.platform, item.format));
              const activeClient =
                getSelectedClients().find((client) => client.id === getActiveClientId()) ||
                getSelectedClients()[0] ||
                null;
              const contextDate = context?.date || context?.day || '';
              const clientLabel = activeClient?.name || '';
              const statusLabel = item.status === 'saved' ? 'Salvo' : item.status === 'draft' ? 'Rascunho' : 'Novo';
              const baseKey = item.baseId || item.id;
              const shouldMeasure = (item.variantIndex ?? 0) === 0;
              const measureSize = getMeasureFrameSize(item);
              const { frame } = getDisplayFrame(item);
              return (
                <Box key={item.id} sx={{ position: 'relative', minWidth: 0 }}>
                  {shouldMeasure ? (
                    <Box
                      ref={buildMeasureRef(baseKey)}
                      sx={{
                        position: 'absolute',
                        left: -9999,
                        top: -9999,
                        opacity: 0,
                        pointerEvents: 'none',
                      }}
                      style={{ width: measureSize.width, height: measureSize.height }}
                    >
                      {renderMockup(item)}
                    </Box>
                  ) : null}
                  <Box
                    component="button"
                    data-mockup-id={item.id}
                    onClick={() => { toggleSelect(item.id); setFocusedMockupId(item.id); }}
                    sx={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      minWidth: 0,
                      maxWidth: '100%',
                      transition: 'all 0.2s',
                      cursor: 'pointer',
                      border: 'none',
                      bgcolor: 'transparent',
                      p: 0,
                      ...(isSelected
                        ? {
                            outline: '2px solid',
                            outlineColor: 'primary.main',
                            outlineOffset: 8,
                          }
                        : focusedMockupId === item.id
                        ? {
                            outline: '2px dashed',
                            outlineColor: 'secondary.main',
                            outlineOffset: 8,
                          }
                        : {
                            '&:hover': { boxShadow: 6 },
                          }),
                    }}
                    style={{ width: frame.width, height: frame.height }}
                  >
                    <Typography
                      variant="overline"
                      sx={{
                        position: 'absolute',
                        top: 16,
                        left: 16,
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: '0.12em',
                        color: 'text.disabled',
                      }}
                    >
                      {optionLabel}
                    </Typography>
                    {(clientLabel || contextDate) ? (
                      <Typography
                        variant="overline"
                        sx={{
                          position: 'absolute',
                          top: 40,
                          left: 16,
                          fontSize: 10,
                          fontWeight: 600,
                          letterSpacing: '0.12em',
                          color: 'grey.400',
                        }}
                      >
                        {[clientLabel, contextDate].filter(Boolean).join(' • ')}
                      </Typography>
                    ) : null}
                    {providerLabel ? (
                      <Typography
                        variant="overline"
                        sx={{
                          position: 'absolute',
                          top: 64,
                          left: 16,
                          fontSize: 10,
                          fontWeight: 600,
                          letterSpacing: '0.12em',
                          color: 'grey.400',
                        }}
                      >
                        {providerLabel}
                      </Typography>
                    ) : null}
                    <Typography
                      variant="overline"
                      sx={{
                        position: 'absolute',
                        top: 16,
                        right: 16,
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: '0.12em',
                        color: 'text.disabled',
                      }}
                    >
                      {statusLabel}
                    </Typography>
                    <Box
                      data-export-root
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        pointerEvents: 'none',
                        transform: `scale(${zoomLevel})`,
                        transformOrigin: 'center',
                      }}
                    >
                      {renderMockup(item)}
                    </Box>
                  </Box>
                </Box>
              );
            })
          ) : (
            <Typography variant="body2" color="text.disabled" sx={{ gridColumn: '1 / -1' }}>
              Nenhum formato selecionado ainda.
            </Typography>
          )}
        </Box>
      </Box>

      {/* Footer — hidden when embedded inside EditorClient */}
      {!embedded && (
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 3 }}>
          <Button
            variant="text"
            component={Link}
            href="/studio/editor"
            startIcon={<IconArrowLeft size={18} />}
            sx={{ color: 'text.disabled', fontWeight: 700, '&:hover': { color: 'text.primary' } }}
          >
            Voltar ao Passo 3
          </Button>
          <Stack direction="row" spacing={2} alignItems="center">
            <Button
              variant="outlined"
              onClick={handleSaveDraftAll}
              disabled={syncing || !displayMockups.length}
            >
              Salvar como Rascunho
            </Button>
            <Button
              variant="contained"
              component={Link}
              href="/studio/export"
              onClick={updateStageDone}
              endIcon={<IconArrowRight size={18} />}
              sx={{ boxShadow: 2 }}
            >
              Exportar
            </Button>
          </Stack>
        </Stack>
      )}
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        {syncing
          ? 'Sincronizando mockups...'
          : `${generatedCount} de ${displayMockups.length} mockups gerados`}
      </Typography>

      <Snackbar
        open={!!exportError}
        autoHideDuration={5000}
        onClose={() => setExportError('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setExportError('')} sx={{ width: '100%' }}>
          {exportError}
        </Alert>
      </Snackbar>
    </Box>
  );
}
