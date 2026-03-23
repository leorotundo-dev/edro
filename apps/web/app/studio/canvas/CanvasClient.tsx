'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiGet, apiPost, apiPostFormData } from '@/lib/api';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Menu from '@mui/material/Menu';
import {
  IconSend, IconPalette, IconUpload, IconX,
  IconUser, IconDownload, IconBrush, IconSparkles,
  IconChevronLeft, IconChevronRight, IconArrowsMaximize,
  IconScissors, IconCopy, IconRotate360, IconArrowLeft,
  IconClipboardList, IconInfoCircle, IconHandStop,
  IconPointer, IconPointFilled, IconEraser,
  IconArrowBackUp, IconArrowForwardUp, IconStack2,
  IconLayersSubtract, IconMovie, IconWand,
  IconPhoto, IconPaint, IconFileExport,
  IconZoomIn, IconZoomOut, IconZoomReset,
  IconEye, IconEyeOff, IconGridDots,
  IconLayoutBoard,
} from '@tabler/icons-react';
import CanvasViewport from './components/CanvasViewport';
import LayerPanel from './components/LayerPanel';
import BoldnessSlider from './components/BoldnessSlider';
import CampaignCanvasView from './components/CampaignCanvasView';
import { useCanvasLayers } from './hooks/useCanvasLayers';
import type { GenerateLayoutResponse, GenerateCampaignResponse, CampaignPieceResult } from './types';
import {
  buildStudioHref,
  persistStudioWorkflowContext,
  syncLegacyStudioStorageFromCreativeContext,
} from '../studioWorkflow';

const EDRO_ORANGE = '#E85219';
const DARK_BG = '#111';
const PANEL_BG = '#161616';
const BORDER = '#2a2a2a';

type ChatMsg = { role: 'user' | 'assistant'; content: string; timestamp: string };
type Asset = { url: string; type: 'logo' | 'product' | 'reference' | 'photo'; name: string };
type CopyState = { headline: string; body: string; cta: string };
type ClientOption = { id: string; name: string };
type CanvasTool = 'select' | 'pan' | 'brush' | 'mark' | 'eraser';
type LayerItem = { id: string; name: string; imageUrl: string; type: string; visible: boolean; opacity: number };
type HistoryEntry = { imageUrls: string[]; imageIdx: number; copy: CopyState; layers: LayerItem[] };
type BriefingContext = {
  briefingId: string | null; briefingTitle: string | null;
  clientId: string | null; clientName: string | null;
  tone: string | null; event: string | null; date: string | null;
  pillars: string[]; message: string | null; objective: string | null;
};

const STYLE_PRESETS = [
  { key: 'oil-painting', label: 'Óleo', icon: '🎨' },
  { key: 'watercolor', label: 'Aquarela', icon: '💧' },
  { key: 'pencil-sketch', label: 'Lápis', icon: '✏️' },
  { key: 'anime', label: 'Anime', icon: '🌸' },
  { key: 'pop-art', label: 'Pop Art', icon: '🎯' },
  { key: 'cyberpunk', label: 'Cyberpunk', icon: '🌆' },
  { key: 'vintage-film', label: 'Vintage', icon: '📷' },
  { key: 'neon-glow', label: 'Neon', icon: '✨' },
  { key: 'minimalist-flat', label: 'Flat', icon: '◼️' },
  { key: 'comic-book', label: 'Comic', icon: '💥' },
  { key: 'impressionist', label: 'Impressão', icon: '🖌️' },
  { key: 'surrealist', label: 'Surreal', icon: '🌀' },
] as const;

const CARTOON_STYLES = [
  { key: 'anime', label: 'Anime' },
  { key: 'cartoon', label: 'Cartoon' },
  { key: 'pixar', label: 'Pixar 3D' },
  { key: 'caricature', label: 'Caricatura' },
] as const;

// ── Typing Dots ──────────────────────────────────────────────────────
function TypingDots() {
  return (
    <Box sx={{ display: 'flex', gap: 0.6, alignItems: 'center', py: 0.75 }}>
      {[0, 1, 2].map(i => (
        <Box key={i} sx={{
          width: 7, height: 7, borderRadius: '50%', bgcolor: EDRO_ORANGE,
          animation: 'canvasTyping 1.2s infinite ease-in-out', animationDelay: `${i * 0.18}s`,
          '@keyframes canvasTyping': { '0%,80%,100%': { transform: 'scale(0.6)', opacity: 0.35 }, '40%': { transform: 'scale(1)', opacity: 1 } },
        }} />
      ))}
    </Box>
  );
}

/** Read Studio briefing context from localStorage */
function readBriefingContext(): BriefingContext {
  if (typeof window === 'undefined') {
    return { briefingId: null, briefingTitle: null, clientId: null, clientName: null, tone: null, event: null, date: null, pillars: [], message: null, objective: null };
  }
  try {
    const briefingId = window.localStorage.getItem('edro_briefing_id') || null;
    const contextRaw = window.localStorage.getItem('edro_studio_context') || '{}';
    const context = JSON.parse(contextRaw) as Record<string, any>;
    const selectedClients = JSON.parse(window.localStorage.getItem('edro_selected_clients') || '[]') as any[];
    const activeClientId = window.localStorage.getItem('edro_active_client_id') || '';
    const client = activeClientId
      ? selectedClients.find((c: any) => c.id === activeClientId) || selectedClients[0]
      : selectedClients[0];
    const pillarsRaw = context?.pillars;
    const pillars = Array.isArray(pillarsRaw) ? pillarsRaw : String(pillarsRaw || '').split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
    return {
      briefingId, briefingTitle: context?.title || null,
      clientId: client?.id || null, clientName: client?.name || null,
      tone: context?.tone || client?.tone || null,
      event: context?.event || null, date: context?.date || null,
      pillars, message: context?.message || null, objective: context?.objective || null,
    };
  } catch {
    return { briefingId: null, briefingTitle: null, clientId: null, clientName: null, tone: null, event: null, date: null, pillars: [], message: null, objective: null };
  }
}

// ── Main Component ────────────────────────────────────────────────────
export default function CanvasClient() {
  const searchParams = useSearchParams();
  const queryJobId = searchParams.get('jobId') || '';
  const querySessionId = searchParams.get('sessionId') || '';

  // Briefing context
  const [briefCtx, setBriefCtx] = useState<BriefingContext>(readBriefingContext);
  const [creativeJobId, setCreativeJobId] = useState(queryJobId);
  const [creativeSessionId, setCreativeSessionId] = useState(querySessionId);

  // Chat state
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Client/settings
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientId, setClientId] = useState(briefCtx.clientId || '');
  const [clientName, setClientName] = useState(briefCtx.clientName || '');
  const [format, setFormat] = useState('Feed 1:1');
  const [platform, setPlatform] = useState('Instagram');
  const [provider, setProvider] = useState<'fal' | 'gemini' | 'leonardo'>('fal');
  const [falModel, setFalModel] = useState('auto');
  const [showBriefPanel, setShowBriefPanel] = useState(false);

  // Canvas state
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [imageIdx, setImageIdx] = useState(0);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [copy, setCopy] = useState<CopyState>({ headline: '', body: '', cta: '' });
  const [assets, setAssets] = useState<Asset[]>([]);
  const [toolbarLoading, setToolbarLoading] = useState<string | null>(null);

  // ── Layout mode ──────────────────────────────────────────────
  const [layoutMode, setLayoutMode] = useState(false);
  const [boldness, setBoldness] = useState(0.5);
  const [layoutLoading, setLayoutLoading] = useState(false);
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const layoutCanvasRef = useRef<HTMLDivElement>(null);
  const canvasLayers = useCanvasLayers();

  // ── Campaign mode ───────────────────────────────────────────────
  const [campaignMode, setCampaignMode] = useState(false);
  const [campaignPieces, setCampaignPieces] = useState<CampaignPieceResult[]>([]);
  const [campaignName, setCampaignName] = useState('');
  const [campaignId, setCampaignId] = useState('');
  const [campaignLoading, setCampaignLoading] = useState(false);
  const [campaignArtDirection, setCampaignArtDirection] = useState<Record<string, any>>({});
  const [regeneratingPieceIdx, setRegeneratingPieceIdx] = useState<number | null>(null);

  // ── New: Canvas tools ──────────────────────────────────────────
  const [activeTool, setActiveTool] = useState<CanvasTool>('select');
  const [brushSize, setBrushSize] = useState(30);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });

  // ── Layers ─────────────────────────────────────────────────────
  const [layers, setLayers] = useState<LayerItem[]>([]);
  const [showLayers, setShowLayers] = useState(false);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);

  // ── History / Undo-Redo ────────────────────────────────────────
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);

  // ── Brush mask drawing ─────────────────────────────────────────
  const [isDrawing, setIsDrawing] = useState(false);
  const [maskDataUrl, setMaskDataUrl] = useState<string | null>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);

  // ── Touch Edit / Mark Mode ─────────────────────────────────────
  const [marks, setMarks] = useState<Array<{ x: number; y: number; maskUrl?: string }>>([]);
  const [markLoading, setMarkLoading] = useState(false);

  // ── Menus ──────────────────────────────────────────────────────
  const [styleMenuAnchor, setStyleMenuAnchor] = useState<null | HTMLElement>(null);
  const [cartoonMenuAnchor, setCartoonMenuAnchor] = useState<null | HTMLElement>(null);
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);
  const lastSavedDraftRef = useRef('');

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const currentImage = imageUrls[imageIdx] || null;
  const hasBriefing = !!(briefCtx.briefingId || briefCtx.briefingTitle);

  useEffect(() => {
    let cancelled = false;

    const loadCreativeContext = async () => {
      const storedJobId = typeof window !== 'undefined' ? (window.localStorage.getItem('edro_job_id') || '') : '';
      const storedSessionId = typeof window !== 'undefined' ? (window.localStorage.getItem('edro_creative_session_id') || '') : '';
      const resolvedJobId = queryJobId || storedJobId;
      const resolvedSessionId = querySessionId || storedSessionId;
      if (!resolvedJobId) return;

      try {
        let ctx: any = null;
        if (resolvedSessionId) {
          const res = await apiPost<{ success: boolean; data: any }>(`/creative-sessions/${resolvedSessionId}/canvas/open`, {});
          ctx = res?.data;
        } else {
          const res = await apiPost<{ success: boolean; data: any }>(`/jobs/${resolvedJobId}/creative-session/open`, {});
          ctx = res?.data;
        }
        if (cancelled || !ctx?.session) return;
        syncLegacyStudioStorageFromCreativeContext(ctx);

        setCreativeJobId(ctx.job?.id || resolvedJobId);
        setCreativeSessionId(ctx.session.id);
        setBriefCtx((prev) => ({
          ...prev,
          briefingId: ctx.session?.briefing_id || prev.briefingId,
          briefingTitle: ctx.briefing?.title || prev.briefingTitle || ctx.job?.title || null,
          clientId: ctx.job?.client_id || prev.clientId,
          clientName: ctx.job?.client_name || prev.clientName,
          tone: ctx.briefing?.tone || prev.tone,
          event: ctx.briefing?.event || prev.event,
          date: ctx.briefing?.date || prev.date,
          message: ctx.briefing?.message || prev.message,
          objective: ctx.briefing?.objective || prev.objective,
          pillars: prev.pillars,
        }));

        if (typeof window !== 'undefined') {
          persistStudioWorkflowContext({
            jobId: ctx.job?.id || resolvedJobId,
            sessionId: ctx.session.id,
          });
        }

        if (!clientId && ctx.job?.client_id) setClientId(ctx.job.client_id);
        if (!clientName && ctx.job?.client_name) setClientName(ctx.job.client_name);

        const selectedCopy = ctx.selected_copy_version?.payload || {};
        if (!copy.headline && !copy.body && !copy.cta && Object.keys(selectedCopy).length) {
          setCopy({
            headline: selectedCopy.headline || selectedCopy.title || selectedCopy.text || '',
            body: selectedCopy.body || selectedCopy.caption || '',
            cta: selectedCopy.cta || '',
          });
        }

        const selectedAsset = ctx.selected_asset;
        if (!currentImage && selectedAsset?.file_url) {
          setImageUrls([selectedAsset.file_url]);
          setImageIdx(0);
        }

        if (!currentPrompt && ctx.session?.last_canvas_snapshot?.prompt) {
          setCurrentPrompt(String(ctx.session.last_canvas_snapshot.prompt || ''));
        }
      } catch {
        // keep legacy flow
      }
    };

    loadCreativeContext();
    return () => { cancelled = true; };
  }, [queryJobId, querySessionId]);

  useEffect(() => {
    if (!creativeSessionId || !creativeJobId) return;

    const snapshot = {
      prompt: currentPrompt || '',
      copy,
      format,
      platform,
      provider,
      falModel,
      client_id: clientId || null,
      current_image_url: currentImage || null,
    };
    const signature = JSON.stringify(snapshot);
    if (signature === lastSavedDraftRef.current) return;

    const timer = window.setTimeout(async () => {
      try {
        await apiPost(`/creative-sessions/${creativeSessionId}/canvas/save-draft`, {
          job_id: creativeJobId,
          snapshot,
          ...(currentImage ? {
            draft_asset: {
              asset_type: 'image',
              file_url: currentImage,
              thumb_url: currentImage,
              metadata: {
                prompt: currentPrompt || '',
                provider,
                fal_model: falModel,
                platform,
                format,
              },
            },
          } : {}),
        });
        lastSavedDraftRef.current = signature;
      } catch {
        // keep canvas resilient; save failures should not break editing
      }
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [creativeSessionId, creativeJobId, currentPrompt, copy, format, platform, provider, falModel, clientId, currentImage]);

  // ── Push history entry ─────────────────────────────────────────
  const pushHistory = useCallback(() => {
    const entry: HistoryEntry = { imageUrls: [...imageUrls], imageIdx, copy: { ...copy }, layers: [...layers] };
    setHistory(prev => {
      const trimmed = prev.slice(0, historyIdx + 1);
      return [...trimmed, entry].slice(-50); // keep last 50
    });
    setHistoryIdx(prev => prev + 1);
  }, [imageUrls, imageIdx, copy, layers, historyIdx]);

  const undo = useCallback(() => {
    if (historyIdx <= 0) return;
    const entry = history[historyIdx - 1];
    setImageUrls(entry.imageUrls);
    setImageIdx(entry.imageIdx);
    setCopy(entry.copy);
    setLayers(entry.layers);
    setHistoryIdx(prev => prev - 1);
  }, [history, historyIdx]);

  const redo = useCallback(() => {
    if (historyIdx >= history.length - 1) return;
    const entry = history[historyIdx + 1];
    setImageUrls(entry.imageUrls);
    setImageIdx(entry.imageIdx);
    setCopy(entry.copy);
    setLayers(entry.layers);
    setHistoryIdx(prev => prev + 1);
  }, [history, historyIdx]);

  // ── Auto-scroll chat ──────────────────────────────────────────
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages, loading]);

  // ── Load clients + listen for studio context changes ──────────
  useEffect(() => {
    apiGet<{ data?: any[] }>('/clients').then(res => {
      const list = (res?.data ?? []).map((c: any) => ({ id: c.id, name: c.name }));
      setClients(list);
    }).catch(() => {});

    const handleCtxChange = () => {
      const ctx = readBriefingContext();
      setBriefCtx(ctx);
      if (ctx.clientId && !clientId) { setClientId(ctx.clientId); setClientName(ctx.clientName || ''); }
    };
    window.addEventListener('edro-studio-context-change', handleCtxChange);
    window.addEventListener('storage', handleCtxChange);
    return () => { window.removeEventListener('edro-studio-context-change', handleCtxChange); window.removeEventListener('storage', handleCtxChange); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load campaign piece or layout from URL params ────────────
  useEffect(() => {
    const layoutParam = searchParams.get('layout');
    const imageUrl = searchParams.get('image_url');
    const paramClientId = searchParams.get('client_id');
    const paramCampaignId = searchParams.get('campaign_id');
    const paramCampaignName = searchParams.get('campaign_name');

    if (layoutParam) {
      try {
        const layout = JSON.parse(layoutParam);
        canvasLayers.loadLayout(layout);
        setLayoutMode(true);
        setShowLayerPanel(true);
        if (imageUrl) setImageUrls([imageUrl]);
        if (paramClientId) setClientId(paramClientId);
        window.history.replaceState({}, '', buildStudioHref('/studio/canvas', searchParams, { jobId: creativeJobId, sessionId: creativeSessionId }));
      } catch {
        // Invalid layout param — ignore
      }
    }

    // Auto-launch campaign generation if campaign_id is in URL
    if (paramCampaignId) {
      setCampaignId(paramCampaignId);
      if (paramCampaignName) setCampaignName(decodeURIComponent(paramCampaignName));
      if (paramClientId) setClientId(paramClientId);
      window.history.replaceState({}, '', buildStudioHref('/studio/canvas', searchParams, { jobId: creativeJobId, sessionId: creativeSessionId }));
      // Trigger campaign generation after mount
      setTimeout(() => generateCampaignPieces(paramCampaignId), 100);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Keyboard shortcuts ────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Don't capture when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.key === 'v' || e.key === 'V') { setActiveTool('select'); e.preventDefault(); }
      if (e.key === 'h' || e.key === 'H') { setActiveTool('pan'); e.preventDefault(); }
      if (e.key === 'b' || e.key === 'B') { setActiveTool('brush'); e.preventDefault(); }
      if (e.key === 'm' || e.key === 'M') { setActiveTool('mark'); e.preventDefault(); }
      if (e.key === 'e' || e.key === 'E') { setActiveTool('eraser'); e.preventDefault(); }

      // Ctrl+Z / Ctrl+Shift+Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { undo(); e.preventDefault(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) { redo(); e.preventDefault(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') { redo(); e.preventDefault(); }

      // Zoom
      if (e.key === '+' || e.key === '=') { setZoom(z => Math.min(5, z + 0.25)); e.preventDefault(); }
      if (e.key === '-') { setZoom(z => Math.max(0.1, z - 0.25)); e.preventDefault(); }
      if (e.key === '0') { setZoom(1); setPanOffset({ x: 0, y: 0 }); e.preventDefault(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [undo, redo]);

  // ── Mouse wheel zoom ──────────────────────────────────────────
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setZoom(z => Math.max(0.1, Math.min(5, z - e.deltaY * 0.002)));
    }
  }, []);

  // ── Pan handlers ──────────────────────────────────────────────
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (activeTool === 'pan' || (e.button === 1) || (activeTool === 'select' && e.altKey)) {
      setIsPanning(true);
      panStart.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
      e.preventDefault();
    }
  }, [activeTool, panOffset]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setPanOffset({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
    }
  }, [isPanning]);

  const handleCanvasMouseUp = useCallback(() => { setIsPanning(false); }, []);

  // ── Brush drawing on mask canvas ──────────────────────────────
  const initMaskCanvas = useCallback(() => {
    const canvas = maskCanvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d');
    if (ctx) { ctx.fillStyle = 'black'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  }, []);

  const drawOnMask = useCallback((e: React.MouseEvent, erase = false) => {
    const canvas = maskCanvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !isDrawing) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = img.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    ctx.beginPath();
    ctx.arc(x, y, (brushSize * scaleX) / 2, 0, Math.PI * 2);
    ctx.fillStyle = erase ? 'black' : 'white';
    ctx.fill();
  }, [isDrawing, brushSize]);

  const startDrawing = useCallback((e: React.MouseEvent) => {
    if (activeTool !== 'brush' && activeTool !== 'eraser') return;
    if (!maskCanvasRef.current?.width) initMaskCanvas();
    setIsDrawing(true);
    // Draw first point
    const canvas = maskCanvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = img.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    ctx.beginPath();
    ctx.arc(x, y, (brushSize * scaleX) / 2, 0, Math.PI * 2);
    ctx.fillStyle = activeTool === 'eraser' ? 'black' : 'white';
    ctx.fill();
  }, [activeTool, brushSize, initMaskCanvas]);

  const stopDrawing = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = maskCanvasRef.current;
    if (canvas) setMaskDataUrl(canvas.toDataURL('image/png'));
  }, [isDrawing]);

  // ── Touch Edit / Mark Mode ────────────────────────────────────
  const handleMarkClick = useCallback(async (e: React.MouseEvent) => {
    if (activeTool !== 'mark' || !currentImage || markLoading) return;
    const img = imageRef.current;
    if (!img) return;
    const rect = img.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;

    if (marks.length >= 10) return; // max 10 marks
    const newMark = { x, y };
    setMarks(prev => [...prev, newMark]);
    setMarkLoading(true);

    try {
      const res = await apiPost<{ success: boolean; mask_urls?: string[] }>('/studio/canvas/segment', {
        image_url: currentImage,
        points: [{ x, y, label: 1 }],
      });
      if (res.success && res.mask_urls?.length) {
        setMarks(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, maskUrl: res.mask_urls![0] } : m));
        setMaskDataUrl(res.mask_urls[0]);
        setMessages(prev => [...prev, { role: 'assistant', content: 'Objeto selecionado! Use o chat para editar (ex: "mude a cor para azul") ou aplique Inpaint/Remover.', timestamp: new Date().toISOString() }]);
      }
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Erro no segmento: ${err?.message}`, timestamp: new Date().toISOString() }]);
    } finally {
      setMarkLoading(false);
    }
  }, [activeTool, currentImage, markLoading, marks.length]);

  // ── Asset upload ──────────────────────────────────────────────
  const handleAssetUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    e.target.value = '';
    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const type: Asset['type'] = ext === 'svg' || file.name.toLowerCase().includes('logo') ? 'logo'
        : ext === 'png' || ext === 'jpg' || ext === 'jpeg' ? 'photo' : 'reference';
      // Upload to server via proxy (same auth flow as other API calls)
      try {
        const fd = new FormData();
        fd.append('file', file);
        const data = await apiPostFormData<{ success: boolean; url?: string }>('/studio/canvas/upload', fd);
        if (data.url) {
          setAssets(prev => [...prev, { url: data.url, type, name: file.name }]);
        } else {
          setAssets(prev => [...prev, { url: URL.createObjectURL(file), type, name: file.name }]);
        }
      } catch {
        setAssets(prev => [...prev, { url: URL.createObjectURL(file), type, name: file.name }]);
      }
    }
  }, []);

  const removeAsset = useCallback((idx: number) => { setAssets(prev => prev.filter((_, i) => i !== idx)); }, []);

  // ── Add chat notification ──────────────────────────────────────
  const notify = useCallback((msg: string) => {
    setMessages(prev => [...prev, { role: 'assistant', content: msg, timestamp: new Date().toISOString() }]);
  }, []);

  // ── Send message ──────────────────────────────────────────────
  const sendMessage = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg, timestamp: new Date().toISOString() }]);
    setLoading(true);

    try {
      const chatHistory = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));
      let enrichedMsg = msg;
      if (messages.length === 0 && briefCtx.briefingId) {
        const parts: string[] = [];
        if (briefCtx.briefingTitle) parts.push(`Briefing: ${briefCtx.briefingTitle}`);
        if (briefCtx.objective) parts.push(`Objetivo: ${briefCtx.objective}`);
        if (briefCtx.message) parts.push(`Mensagem-chave: ${briefCtx.message}`);
        if (briefCtx.tone) parts.push(`Tom de voz: ${briefCtx.tone}`);
        if (briefCtx.pillars.length) parts.push(`Pilares: ${briefCtx.pillars.join(', ')}`);
        if (briefCtx.event) parts.push(`Evento: ${briefCtx.event}${briefCtx.date ? ` (${briefCtx.date})` : ''}`);
        if (parts.length) enrichedMsg = `[Contexto do Briefing]\n${parts.join('\n')}\n\n${msg}`;
      }

      const res = await apiPost<{
        success: boolean; message: string; actions_taken: string[];
        results: {
          image?: { success: boolean; image_url?: string; image_urls?: string[]; refined_prompt?: string; prompt_used?: string; model?: string; error?: string };
          copy?: { success: boolean; headline?: string; body?: string; cta?: string; error?: string };
        };
      }>('/studio/canvas/chat', {
        message: enrichedMsg, history: chatHistory,
        current_image_url: currentImage || undefined,
        current_prompt: currentPrompt || undefined,
        current_copy: (copy.headline || copy.body || copy.cta) ? copy : undefined,
        client_id: clientId || undefined, client_name: clientName || undefined,
        job_id: creativeJobId || undefined,
        briefing_id: briefCtx.briefingId || undefined,
        assets: assets.map(a => ({ url: a.url, type: a.type, name: a.name })),
        image_provider: provider, fal_model: provider === 'fal' ? falModel : undefined,
        format, platform,
      });

      const r = res.results || {};
      if (r.image?.success) {
        pushHistory();
        const urls = r.image.image_urls?.length ? r.image.image_urls : r.image.image_url ? [r.image.image_url] : [];
        if (urls.length) { setImageUrls(urls); setImageIdx(0); }
        if (r.image.refined_prompt) setCurrentPrompt(r.image.refined_prompt);
        else if (r.image.prompt_used) setCurrentPrompt(r.image.prompt_used);
      }
      if (r.copy?.success) {
        pushHistory();
        setCopy({ headline: r.copy.headline || copy.headline, body: r.copy.body || copy.body, cta: r.copy.cta || copy.cta });
      }

      const modelInfo = r.image?.model ? ` (${r.image.model})` : '';
      setMessages(prev => [...prev, { role: 'assistant', content: (res.message || 'Pronto!') + modelInfo, timestamp: new Date().toISOString() }]);
    } catch (err: any) {
      notify(`Erro: ${err?.message || 'Tente novamente.'}`);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, currentImage, currentPrompt, copy, clientId, clientName, assets, provider, falModel, format, platform, briefCtx, pushHistory, notify]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // ── Generate full layout piece ──────────────────────────────
  const generateLayoutPiece = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || layoutLoading) return;
    setInput('');
    setLayoutLoading(true);
    setMessages(prev => [...prev, { role: 'user', content: msg, timestamp: new Date().toISOString() }]);
    notify('Gerando peça completa (copy → direção de arte → layout → imagem)...');

    try {
      const res = await apiPost<GenerateLayoutResponse>('/studio/canvas/generate-layout', {
        message: msg,
        client_id: clientId || undefined,
        format,
        platform,
        boldness,
        image_provider: provider === 'leonardo' ? 'fal' : provider,
        fal_model: provider === 'fal' ? falModel : 'flux-pro',
      });

      if (res.success && res.layout) {
        canvasLayers.loadLayout(res.layout);
        setLayoutMode(true);
        setShowLayerPanel(true);

        // Also update copy state
        if (res.copy) {
          setCopy({
            headline: res.copy.headline || '',
            body: res.copy.body || '',
            cta: res.copy.cta || '',
          });
        }

        // Set image for legacy canvas view too
        if (res.image_url) {
          setImageUrls([res.image_url]);
          setImageIdx(0);
        }

        notify(`Peça gerada! Layout "${res.layout.compositionType}" com ${res.layout.layers.length} layers. Clique nos elementos para editar.`);
      } else {
        notify('Erro ao gerar layout. Tente novamente.');
      }
    } catch (err: any) {
      notify(`Erro: ${err?.message || 'Falha na geração'}`);
    } finally {
      setLayoutLoading(false);
    }
  }, [input, layoutLoading, clientId, format, platform, boldness, provider, falModel, canvasLayers, notify]);

  // ── Generate campaign pieces ──────────────────────────────────
  const generateCampaignPieces = useCallback(async (overrideCampaignId?: string) => {
    const cId = overrideCampaignId || campaignId;
    if (!cId || campaignLoading) return;
    setCampaignLoading(true);
    setCampaignMode(true);
    notify('Gerando peças da campanha (copy → direção de arte → layout → imagens)...');

    try {
      // Default pieces: Feed + Stories + Feed 4:5
      const pieces = [
        { format: 'Feed 1:1', platform },
        { format: 'Stories 9:16', platform },
        { format: 'Feed 4:5', platform },
      ];

      const res = await apiPost<GenerateCampaignResponse>('/studio/canvas/generate-campaign', {
        campaign_id: cId,
        pieces,
        boldness,
        image_provider: provider === 'leonardo' ? 'fal' : provider,
        fal_model: provider === 'fal' ? falModel : 'flux-pro',
      });

      if (res.success) {
        setCampaignPieces(res.pieces);
        setCampaignName(res.campaign_name);
        setCampaignArtDirection(res.art_direction);
        notify(`Campanha "${res.campaign_name}" — ${res.generated}/${res.total} peças geradas!`);
      } else {
        notify('Erro ao gerar campanha. Tente novamente.');
      }
    } catch (err: any) {
      notify(`Erro: ${err?.message || 'Falha na geração de campanha'}`);
    } finally {
      setCampaignLoading(false);
    }
  }, [campaignId, campaignLoading, platform, boldness, provider, falModel, notify]);

  const handleOpenCampaignPiece = useCallback((piece: CampaignPieceResult) => {
    if (!piece.layout?.layers?.length) return;
    canvasLayers.loadLayout(piece.layout);
    setLayoutMode(true);
    setShowLayerPanel(true);
    setCampaignMode(false); // close campaign overlay, show editor
    if (piece.copy) {
      setCopy({
        headline: piece.copy.headline || '',
        body: piece.copy.body || '',
        cta: piece.copy.cta || '',
      });
    }
    if (piece.image_url) {
      setImageUrls([piece.image_url]);
      setImageIdx(0);
    }
  }, [canvasLayers]);

  const handleRegeneratePiece = useCallback(async (pieceIndex: number) => {
    const piece = campaignPieces[pieceIndex];
    if (!piece || regeneratingPieceIdx !== null) return;
    setRegeneratingPieceIdx(pieceIndex);

    try {
      const res = await apiPost<{ success: boolean; layout: any; copy: any; image_url?: string }>('/studio/canvas/regenerate-piece', {
        format: piece.format,
        platform: piece.platform,
        copy: piece.copy,
        art_direction: campaignArtDirection,
        boldness,
        image_provider: provider === 'leonardo' ? 'fal' : provider,
        fal_model: provider === 'fal' ? falModel : 'flux-pro',
      });

      if (res.success) {
        setCampaignPieces(prev => prev.map((p, i) =>
          i === pieceIndex
            ? { ...p, layout: res.layout, copy: res.copy, image_url: res.image_url, error: undefined }
            : p
        ));
        notify(`Peça ${pieceIndex + 1} regenerada!`);
      }
    } catch (err: any) {
      notify(`Erro ao regenerar peça: ${err?.message}`);
    } finally {
      setRegeneratingPieceIdx(null);
    }
  }, [campaignPieces, regeneratingPieceIdx, campaignArtDirection, boldness, provider, falModel, notify]);

  // ── Toolbar Actions ───────────────────────────────────────────
  const handleToolbarAction = useCallback(async (action: string, extraParams?: Record<string, any>) => {
    if (!currentImage || toolbarLoading) return;
    setToolbarLoading(action);
    pushHistory();
    const ar = format.includes('9:16') ? '9:16' : format.includes('16:9') ? '16:9' : format.includes('4:5') ? '4:5' : '1:1';

    try {
      if (action === 'upscale') {
        const res = await apiPost<{ success: boolean; image_url?: string }>('/studio/canvas/upscale', { image_url: currentImage });
        if (res.success && res.image_url) { setImageUrls([res.image_url]); setImageIdx(0); notify('Upscaled 4x!'); }
      } else if (action === 'remove-bg') {
        const res = await apiPost<{ success: boolean; image_url?: string }>('/studio/canvas/remove-bg', { image_url: currentImage });
        if (res.success && res.image_url) { setImageUrls(prev => [...prev, res.image_url!]); setImageIdx(imageUrls.length); notify('Background removido!'); }
      } else if (action === 'variations') {
        const res = await apiPost<{ success: boolean; image_urls?: string[] }>('/studio/canvas/variations', { image_url: currentImage, prompt: currentPrompt, aspect_ratio: ar, num_images: 3 });
        if (res.success && res.image_urls?.length) { setImageUrls(res.image_urls); setImageIdx(0); notify(`${res.image_urls.length} variações!`); }
      } else if (action === 'multi-angles') {
        const res = await apiPost<{ success: boolean; image_urls?: string[] }>('/studio/canvas/multi-angles', { image_url: currentImage, prompt: currentPrompt, aspect_ratio: ar });
        if (res.success && res.image_urls?.length) { setImageUrls(res.image_urls); setImageIdx(0); notify(`${res.image_urls.length} ângulos!`); }
      } else if (action === 'inpaint') {
        if (!maskDataUrl) { notify('Pinte a área que quer editar com o Brush (B) primeiro.'); setToolbarLoading(null); return; }
        const prompt = extraParams?.prompt || 'high quality, same style, seamless edit';
        const res = await apiPost<{ success: boolean; image_urls?: string[] }>('/studio/canvas/inpaint', {
          image_url: currentImage, mask_image_url: maskDataUrl, prompt, num_images: 2,
        });
        if (res.success && res.image_urls?.length) { setImageUrls(res.image_urls); setImageIdx(0); clearMask(); notify('Inpainting aplicado!'); }
      } else if (action === 'object-remove') {
        if (!maskDataUrl) { notify('Pinte o objeto que quer remover com o Brush (B).'); setToolbarLoading(null); return; }
        const res = await apiPost<{ success: boolean; image_url?: string }>('/studio/canvas/object-remove', {
          image_url: currentImage, mask_image_url: maskDataUrl,
        });
        if (res.success && res.image_url) { setImageUrls(prev => [...prev, res.image_url!]); setImageIdx(imageUrls.length); clearMask(); notify('Objeto removido!'); }
      } else if (action === 'outpaint') {
        const res = await apiPost<{ success: boolean; image_url?: string }>('/studio/canvas/outpaint', {
          image_url: currentImage, prompt: currentPrompt || 'seamless natural extension', top: 256, bottom: 256, left: 256, right: 256,
        });
        if (res.success && res.image_url) { setImageUrls(prev => [...prev, res.image_url!]); setImageIdx(imageUrls.length); notify('Imagem expandida!'); }
      } else if (action === 'split-layers') {
        const res = await apiPost<{ success: boolean; layers?: LayerItem[] }>('/studio/canvas/split-layers', { image_url: currentImage });
        if (res.success && res.layers?.length) {
          setLayers(res.layers.map(l => ({ ...l, visible: true, opacity: 1 })));
          setShowLayers(true);
          notify(`${res.layers.length} layers separados!`);
        }
      } else if (action === 'style-transfer') {
        const style = extraParams?.style;
        if (!style) return;
        const res = await apiPost<{ success: boolean; image_urls?: string[] }>('/studio/canvas/style-transfer', {
          image_url: currentImage, style, strength: 0.7,
        });
        if (res.success && res.image_urls?.length) { setImageUrls(res.image_urls); setImageIdx(0); notify(`Estilo "${style}" aplicado!`); }
      } else if (action === 'cartoonize') {
        const style = extraParams?.style || 'anime';
        const res = await apiPost<{ success: boolean; image_urls?: string[] }>('/studio/canvas/cartoonize', { image_url: currentImage, style });
        if (res.success && res.image_urls?.length) { setImageUrls(res.image_urls); setImageIdx(0); notify(`Cartoonizado (${style})!`); }
      } else if (action === 'image-to-video') {
        notify('Gerando vídeo... isso leva 60-120s.');
        const res = await apiPost<{ success: boolean; video_url?: string }>('/studio/canvas/image-to-video', {
          image_url: currentImage, prompt: currentPrompt || 'cinematic smooth motion', duration: 5,
        });
        if (res.success && res.video_url) { notify(`Vídeo pronto! ${res.video_url}`); }
      }
    } catch (err: any) {
      notify(`Erro: ${err?.message || 'Falha na ação'}`);
    } finally {
      setToolbarLoading(null);
    }
  }, [currentImage, toolbarLoading, imageUrls.length, currentPrompt, format, maskDataUrl, pushHistory, notify]);

  const clearMask = useCallback(() => {
    setMaskDataUrl(null);
    setMarks([]);
    const canvas = maskCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) { ctx.fillStyle = 'black'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    }
  }, []);

  // ── Export ─────────────────────────────────────────────────────
  const handleExport = useCallback(async (fmt: 'png' | 'jpg' | 'pdf') => {
    setExportMenuAnchor(null);

    // Layout mode: export composed canvas via html-to-image
    if (layoutMode && layoutCanvasRef.current) {
      try {
        const { toPng, toJpeg } = await import('html-to-image');
        const fn = fmt === 'jpg' ? toJpeg : toPng;
        const dataUrl = await fn(layoutCanvasRef.current, {
          width: canvasLayers.canvasSize.width,
          height: canvasLayers.canvasSize.height,
          pixelRatio: 2,
          style: { transform: 'none' },
        });
        if (fmt === 'pdf') {
          const w = window.open('', '_blank', 'noopener,noreferrer');
          if (w) {
            w.document.write(`<html><body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#000"><img src="${dataUrl}" style="max-width:100%;max-height:100vh" /></body></html>`);
            w.document.title = 'Canvas Edro — PDF';
            setTimeout(() => w.print(), 500);
          }
        } else {
          const a = document.createElement('a');
          a.href = dataUrl;
          a.download = `canvas-edro.${fmt}`;
          a.click();
        }
        notify(`Exportado como ${fmt.toUpperCase()}`);
      } catch (err: any) {
        notify(`Erro ao exportar: ${err?.message}`);
      }
      return;
    }

    // Classic mode
    if (!currentImage) return;
    if (fmt === 'png' || fmt === 'jpg') {
        const a = document.createElement('a');
        a.href = currentImage;
        a.download = `canvas-edro.${fmt}`;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.click();
      } else if (fmt === 'pdf') {
      const w = window.open('', '_blank', 'noopener,noreferrer');
        if (w) {
        w.document.write(`<html><body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#000"><img src="${currentImage}" style="max-width:100%;max-height:100vh" /></body></html>`);
        w.document.title = 'Canvas Edro — PDF';
        setTimeout(() => w.print(), 500);
      }
    }
    notify(`Exportado como ${fmt.toUpperCase()}`);
  }, [currentImage, layoutMode, canvasLayers.canvasSize, notify]);

  // ── Quick actions ──────────────────────────────────────────────
  const quickActions = useMemo(() => hasBriefing
    ? [
        `Cria imagem para o briefing "${briefCtx.briefingTitle || 'atual'}"`,
        `Escreve headline + CTA usando o tom ${briefCtx.tone || 'do briefing'}`,
        'Gera variações do visual para Stories e Feed',
        'Cria mockup profissional do produto',
        'Sugere paleta de cores para essa campanha',
      ]
    : [
        'Cria um post impactante sobre lançamento de produto',
        'Gera uma imagem de fundo profissional e minimalista',
        'Escreve headline + CTA para Instagram',
        'Cria versão para Stories 9:16',
        'Gera uma foto de produto em estúdio',
      ], [hasBriefing, briefCtx]);

  // ── Layout quick actions ──────────────────────────────────
  const layoutQuickActions = useMemo(() => hasBriefing
    ? [
        `Gera peça completa para "${briefCtx.briefingTitle || 'briefing'}"`,
        'Cria post para Feed com copy + imagem',
        'Gera peça para Stories 9:16',
      ]
    : [
        'Cria post profissional para Instagram',
        'Gera peça de promoção de verão',
        'Cria banner institucional minimalista',
      ], [hasBriefing, briefCtx]);

  // ── Tool cursor ────────────────────────────────────────────────
  const canvasCursor = activeTool === 'pan' ? 'grab'
    : activeTool === 'brush' ? 'crosshair'
    : activeTool === 'eraser' ? 'crosshair'
    : activeTool === 'mark' ? 'cell'
    : 'default';

  // ── Select styling shorthand ──────────────────────────────────
  const selSx = { fontSize: '0.75rem', color: '#ccc', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#333' }, '& .MuiSvgIcon-root': { color: '#666' } };

  // ── Tool button helper ─────────────────────────────────────────
  const ToolBtn = ({ tool, icon, label, shortcut }: { tool: CanvasTool; icon: React.ReactNode; label: string; shortcut: string }) => (
    <Tooltip title={`${label} (${shortcut})`}>
      <IconButton
        size="small"
        onClick={() => setActiveTool(tool)}
        sx={{
          color: activeTool === tool ? '#fff' : '#666',
          bgcolor: activeTool === tool ? `${EDRO_ORANGE}30` : 'transparent',
          border: activeTool === tool ? `1px solid ${EDRO_ORANGE}` : '1px solid transparent',
          '&:hover': { color: '#fff', bgcolor: '#222' },
          width: 32, height: 32,
        }}
      >
        {icon}
      </IconButton>
    </Tooltip>
  );

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', bgcolor: DARK_BG }}>

      {/* ── Left: Chat Panel ──────────────────────────────────────── */}
      <Box sx={{ width: { xs: '100%', md: 360 }, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: `1px solid ${BORDER}`, bgcolor: PANEL_BG }}>

        {/* Header */}
        <Box sx={{ px: 1.5, py: 1, borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Voltar ao Studio">
            <IconButton size="small" component={Link} href={buildStudioHref('/studio', searchParams, { jobId: creativeJobId, sessionId: creativeSessionId })} sx={{ color: '#888', '&:hover': { color: '#fff' } }}>
              <IconArrowLeft size={18} />
            </IconButton>
          </Tooltip>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flex: 1 }}>
            <IconSparkles size={18} style={{ color: EDRO_ORANGE }} />
            <Typography variant="subtitle2" sx={{ color: '#eee', fontWeight: 700, fontSize: '0.85rem' }}>Canvas</Typography>
            {hasBriefing && (
              <Chip label={briefCtx.briefingTitle || 'Briefing'} size="small" icon={<IconClipboardList size={12} />}
                onClick={() => setShowBriefPanel(!showBriefPanel)}
                sx={{ fontSize: '0.65rem', height: 22, ml: 0.5, bgcolor: `${EDRO_ORANGE}20`, color: EDRO_ORANGE, borderColor: `${EDRO_ORANGE}40`, '& .MuiChip-icon': { color: EDRO_ORANGE } }}
              />
            )}
          </Box>
          {hasBriefing && (
            <Tooltip title="Info do briefing">
              <IconButton size="small" onClick={() => setShowBriefPanel(!showBriefPanel)} sx={{ color: '#666' }}><IconInfoCircle size={16} /></IconButton>
            </Tooltip>
          )}
        </Box>

        {/* Briefing panel */}
        {showBriefPanel && hasBriefing && (
          <Box sx={{ px: 1.5, py: 1.5, borderBottom: `1px solid ${BORDER}`, bgcolor: '#1a1a1a' }}>
            <Stack spacing={0.75}>
              {briefCtx.clientName && <Typography variant="caption" sx={{ color: '#999' }}><strong style={{ color: '#ccc' }}>Cliente:</strong> {briefCtx.clientName}</Typography>}
              {briefCtx.objective && <Typography variant="caption" sx={{ color: '#999' }}><strong style={{ color: '#ccc' }}>Objetivo:</strong> {briefCtx.objective}</Typography>}
              {briefCtx.message && <Typography variant="caption" sx={{ color: '#999' }}><strong style={{ color: '#ccc' }}>Mensagem:</strong> {briefCtx.message}</Typography>}
              {briefCtx.tone && <Typography variant="caption" sx={{ color: '#999' }}><strong style={{ color: '#ccc' }}>Tom:</strong> {briefCtx.tone}</Typography>}
              {briefCtx.pillars.length > 0 && (
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {briefCtx.pillars.map(p => <Chip key={p} label={p} size="small" sx={{ height: 18, fontSize: '0.6rem', bgcolor: '#222', color: '#aaa' }} />)}
                </Box>
              )}
              {briefCtx.event && <Typography variant="caption" sx={{ color: '#999' }}><strong style={{ color: '#ccc' }}>Evento:</strong> {briefCtx.event} {briefCtx.date ? `(${briefCtx.date})` : ''}</Typography>}
            </Stack>
          </Box>
        )}

        {/* Controls */}
        <Box sx={{ px: 1.5, py: 1, borderBottom: `1px solid ${BORDER}` }}>
          <Stack spacing={0.75}>
            <Stack direction="row" spacing={0.75}>
              <Select size="small" value={clientId} onChange={e => { setClientId(e.target.value); setClientName(clients.find(c => c.id === e.target.value)?.name || ''); }} displayEmpty sx={{ flex: 1, ...selSx }}>
                <MenuItem value="" disabled>Cliente</MenuItem>
                {clients.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
              </Select>
              <Select size="small" value={provider} onChange={e => { setProvider(e.target.value as any); if (e.target.value !== 'fal') setFalModel('auto'); }} sx={{ width: 90, ...selSx }}>
                <MenuItem value="fal">Fal.ai</MenuItem>
                <MenuItem value="gemini">Gemini</MenuItem>
                <MenuItem value="leonardo">Leonardo</MenuItem>
              </Select>
            </Stack>
            {provider === 'fal' && (
              <Select size="small" value={falModel} onChange={e => setFalModel(e.target.value)} sx={{ fontSize: '0.7rem', ...selSx }}>
                <MenuItem value="auto" sx={{ fontWeight: 700, color: EDRO_ORANGE }}>Auto (IA escolhe)</MenuItem>
                <MenuItem disabled sx={{ fontSize: '0.65rem', color: '#666', py: 0.3 }}>-- Google --</MenuItem>
                <MenuItem value="nano-banana-2">Nano Banana 2 (Gemini Flash)</MenuItem>
                <MenuItem value="nano-banana-pro">Nano Banana Pro (Gemini Pro)</MenuItem>
                <MenuItem disabled sx={{ fontSize: '0.65rem', color: '#666', py: 0.3 }}>-- Flux --</MenuItem>
                <MenuItem value="flux-pro">Flux Pro 1.1</MenuItem>
                <MenuItem value="flux-pro-ultra">Flux Pro Ultra</MenuItem>
                <MenuItem value="flux-dev">Flux Dev (rápido)</MenuItem>
                <MenuItem value="flux-realism">Flux Realism</MenuItem>
                <MenuItem disabled sx={{ fontSize: '0.65rem', color: '#666', py: 0.3 }}>-- Outros --</MenuItem>
                <MenuItem value="recraft-v3">Recraft V3 (logos/ícones)</MenuItem>
                <MenuItem value="ideogram-v2">Ideogram V2 (texto em imagem)</MenuItem>
                <MenuItem value="hidream-i1">HiDream I1</MenuItem>
                <MenuItem value="stable-diffusion-v35">SD 3.5 Large</MenuItem>
                <MenuItem value="minimax-image">Minimax Image</MenuItem>
                <MenuItem value="omnigen-v1">OmniGen V1</MenuItem>
              </Select>
            )}
            <Stack direction="row" spacing={0.75}>
              <Select size="small" value={format} onChange={e => setFormat(e.target.value)} sx={{ flex: 1, ...selSx }}>
                <MenuItem value="Feed 1:1">Feed 1:1</MenuItem>
                <MenuItem value="Story 9:16">Story 9:16</MenuItem>
                <MenuItem value="Reels 9:16">Reels 9:16</MenuItem>
                <MenuItem value="Feed 4:5">Feed 4:5</MenuItem>
                <MenuItem value="LinkedIn 1.91:1">LinkedIn 16:9</MenuItem>
                <MenuItem value="YouTube Thumb 16:9">YouTube 16:9</MenuItem>
                <MenuItem value="OOH 3:1">OOH 3:1</MenuItem>
              </Select>
              <Select size="small" value={platform} onChange={e => setPlatform(e.target.value)} sx={{ flex: 1, ...selSx }}>
                <MenuItem value="Instagram">Instagram</MenuItem>
                <MenuItem value="Facebook">Facebook</MenuItem>
                <MenuItem value="LinkedIn">LinkedIn</MenuItem>
                <MenuItem value="TikTok">TikTok</MenuItem>
                <MenuItem value="YouTube">YouTube</MenuItem>
                <MenuItem value="OOH">OOH</MenuItem>
              </Select>
            </Stack>
            {/* Boldness slider + Generate Layout button */}
            <Stack direction="row" spacing={0.75} alignItems="center">
              <BoldnessSlider value={boldness} onChange={setBoldness} />
              <Button
                size="small"
                variant={layoutMode ? 'outlined' : 'contained'}
                startIcon={layoutLoading ? <CircularProgress size={12} sx={{ color: '#fff' }} /> : <IconLayoutBoard size={14} />}
                onClick={() => {
                  if (input.trim()) generateLayoutPiece();
                }}
                disabled={layoutLoading || !input.trim()}
                sx={{
                  flex: 1, fontSize: '0.7rem', textTransform: 'none',
                  bgcolor: layoutMode ? 'transparent' : EDRO_ORANGE,
                  borderColor: EDRO_ORANGE, color: '#fff',
                  '&:hover': { bgcolor: layoutMode ? `${EDRO_ORANGE}20` : '#c94215' },
                  '&.Mui-disabled': { bgcolor: '#333', color: '#666' },
                }}
              >
                Gerar Peça
              </Button>
            </Stack>
          </Stack>
        </Box>

        {/* Assets */}
        {assets.length > 0 && (
          <Box sx={{ px: 1.5, py: 1, borderBottom: `1px solid ${BORDER}`, display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
            {assets.map((a, i) => (
              <Chip key={i} label={a.name.length > 16 ? a.name.slice(0, 14) + '…' : a.name} size="small" variant="outlined"
                avatar={<Avatar src={a.url} sx={{ width: 20, height: 20 }} />}
                onDelete={() => removeAsset(i)} deleteIcon={<IconX size={10} />}
                sx={{ fontSize: '0.65rem', height: 22, bgcolor: `${EDRO_ORANGE}08`, borderColor: `${EDRO_ORANGE}30`, color: '#aaa' }}
              />
            ))}
          </Box>
        )}

        {/* Chat */}
        <Box ref={scrollRef} sx={{ flex: 1, overflowY: 'auto', px: 1.5, py: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {messages.length === 0 && !loading && (
            <Box sx={{ textAlign: 'center', pt: 6 }}>
              <Box sx={{ display: 'inline-flex', p: 2.5, borderRadius: '50%', bgcolor: `${EDRO_ORANGE}15`, mb: 2.5 }}>
                <IconSparkles size={36} style={{ color: EDRO_ORANGE }} />
              </Box>
              <Typography variant="subtitle1" fontWeight={700} mb={0.5} sx={{ color: '#eee' }}>Canvas Criativo</Typography>
              <Typography variant="body2" mb={2.5} sx={{ color: '#777' }}>
                {hasBriefing ? `Briefing "${briefCtx.briefingTitle}" carregado. Pede o que quiser.` : 'Pede qualquer coisa — imagem, copy, refinamento, tudo em linguagem natural.'}
              </Typography>
              <Stack spacing={0.75}>
                {quickActions.map(qa => (
                  <Chip key={qa} label={qa} variant="outlined" clickable onClick={() => sendMessage(qa)}
                    sx={{ fontSize: '0.73rem', justifyContent: 'flex-start', py: 0.5, borderColor: '#333', color: '#999', '&:hover': { borderColor: EDRO_ORANGE, color: EDRO_ORANGE, bgcolor: `${EDRO_ORANGE}10` } }}
                  />
                ))}
              </Stack>
            </Box>
          )}
          {messages.map((msg, i) => (
            <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
              <Avatar sx={{ width: 26, height: 26, fontSize: '0.65rem', bgcolor: msg.role === 'user' ? '#333' : EDRO_ORANGE }}>
                {msg.role === 'user' ? <IconUser size={13} /> : <IconSparkles size={13} />}
              </Avatar>
              <Box sx={{
                maxWidth: '85%', px: 1.5, py: 0.75,
                borderRadius: msg.role === 'user' ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
                bgcolor: msg.role === 'user' ? '#2a2a2a' : '#1e1e1e',
                color: msg.role === 'user' ? '#eee' : '#ccc',
                border: `1px solid ${msg.role === 'user' ? '#3a3a3a' : BORDER}`,
              }}>
                <Typography variant="body2" sx={{ fontSize: '0.8rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{msg.content}</Typography>
              </Box>
            </Box>
          ))}
          {loading && (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
              <Avatar sx={{ width: 26, height: 26, bgcolor: EDRO_ORANGE }}><IconSparkles size={13} /></Avatar>
              <Box sx={{ px: 1.5, py: 0.5, borderRadius: '4px 12px 12px 12px', bgcolor: '#1e1e1e', border: `1px solid ${BORDER}` }}><TypingDots /></Box>
            </Box>
          )}
        </Box>

        {/* Input */}
        <Box sx={{ px: 1.5, py: 1, borderTop: `1px solid ${BORDER}` }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
            <input ref={fileInputRef} type="file" accept="image/*,.svg,.pdf" multiple hidden onChange={handleAssetUpload} />
            <Tooltip title="Upload asset"><IconButton size="small" onClick={() => fileInputRef.current?.click()} sx={{ color: '#666', '&:hover': { color: EDRO_ORANGE } }}><IconUpload size={18} /></IconButton></Tooltip>
            <TextField fullWidth multiline maxRows={4} size="small" placeholder="Descreve o que você quer..."
              value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} disabled={loading}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3, fontSize: '0.84rem', color: '#ddd', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#333' }, '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: EDRO_ORANGE } }, '& .MuiOutlinedInput-input::placeholder': { color: '#555', opacity: 1 } }}
            />
            <IconButton onClick={() => sendMessage()} disabled={loading || !input.trim()}
              sx={{ bgcolor: EDRO_ORANGE, color: '#fff', width: 36, height: 36, '&:hover': { bgcolor: '#c94215' }, '&.Mui-disabled': { bgcolor: '#333' } }}>
              <IconSend size={16} />
            </IconButton>
          </Box>
        </Box>
      </Box>

      {/* ── Right: Canvas + Tools ─────────────────────────────────── */}
      <Box sx={{ flex: 1, display: { xs: 'none', md: 'flex' }, flexDirection: 'column', bgcolor: DARK_BG, minWidth: 0 }}>

        {/* ── Top Toolbar ────────────────────────────────────────── */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1.5, py: 0.5, borderBottom: `1px solid #222`, flexShrink: 0, overflowX: 'auto' }}>
          {/* Tools */}
          <ToolBtn tool="select" icon={<IconPointer size={15} />} label="Select" shortcut="V" />
          <ToolBtn tool="pan" icon={<IconHandStop size={15} />} label="Pan" shortcut="H" />
          <ToolBtn tool="brush" icon={<IconBrush size={15} />} label="Brush (Mask)" shortcut="B" />
          <ToolBtn tool="eraser" icon={<IconEraser size={15} />} label="Eraser" shortcut="E" />
          <ToolBtn tool="mark" icon={<IconPointFilled size={15} />} label="Touch Edit" shortcut="M" />

          {/* Brush size */}
          {(activeTool === 'brush' || activeTool === 'eraser') && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 1, minWidth: 100 }}>
              <Typography variant="caption" sx={{ color: '#555', fontSize: '0.65rem' }}>{brushSize}px</Typography>
              <Slider size="small" min={5} max={100} value={brushSize} onChange={(_, v) => setBrushSize(v as number)}
                sx={{ width: 80, color: EDRO_ORANGE, '& .MuiSlider-thumb': { width: 12, height: 12 } }}
              />
            </Box>
          )}

          <Box sx={{ width: '1px', height: 20, bgcolor: '#222', mx: 0.5, flexShrink: 0 }} />

          {/* Undo/Redo */}
          <Tooltip title="Desfazer (Ctrl+Z)"><IconButton size="small" onClick={undo} disabled={historyIdx <= 0} sx={{ color: '#666' }}><IconArrowBackUp size={15} /></IconButton></Tooltip>
          <Tooltip title="Refazer (Ctrl+Shift+Z)"><IconButton size="small" onClick={redo} disabled={historyIdx >= history.length - 1} sx={{ color: '#666' }}><IconArrowForwardUp size={15} /></IconButton></Tooltip>

          <Box sx={{ width: '1px', height: 20, bgcolor: '#222', mx: 0.5, flexShrink: 0 }} />

          {/* Zoom controls */}
          <Tooltip title="Zoom Out (-)"><IconButton size="small" onClick={() => setZoom(z => Math.max(0.1, z - 0.25))} sx={{ color: '#666' }}><IconZoomOut size={14} /></IconButton></Tooltip>
          <Typography variant="caption" sx={{ color: '#555', fontSize: '0.65rem', minWidth: 36, textAlign: 'center' }}>{Math.round(zoom * 100)}%</Typography>
          <Tooltip title="Zoom In (+)"><IconButton size="small" onClick={() => setZoom(z => Math.min(5, z + 0.25))} sx={{ color: '#666' }}><IconZoomIn size={14} /></IconButton></Tooltip>
          <Tooltip title="Reset (0)"><IconButton size="small" onClick={() => { setZoom(1); setPanOffset({ x: 0, y: 0 }); }} sx={{ color: '#666' }}><IconZoomReset size={14} /></IconButton></Tooltip>

          <Box sx={{ flex: 1 }} />

          {/* Image info */}
          <Typography variant="caption" sx={{ color: '#444', fontSize: '0.65rem', mr: 0.5 }}>
            {currentImage ? `${imageIdx + 1}/${imageUrls.length} · ${format}` : 'Vazio'}
          </Typography>

          {imageUrls.length > 1 && (
            <>
              <IconButton size="small" onClick={() => setImageIdx(i => Math.max(0, i - 1))} disabled={imageIdx === 0} sx={{ color: '#666' }}><IconChevronLeft size={14} /></IconButton>
              <IconButton size="small" onClick={() => setImageIdx(i => Math.min(imageUrls.length - 1, i + 1))} disabled={imageIdx >= imageUrls.length - 1} sx={{ color: '#666' }}><IconChevronRight size={14} /></IconButton>
            </>
          )}
        </Box>

        {/* ── Action Toolbar (image actions) ──────────────────────── */}
        {currentImage && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, px: 1.5, py: 0.4, borderBottom: '1px solid #1a1a1a', overflowX: 'auto', flexShrink: 0 }}>
            {([
              { key: 'upscale', icon: <IconArrowsMaximize size={13} />, label: 'Upscale 4x' },
              { key: 'remove-bg', icon: <IconScissors size={13} />, label: 'Remove BG' },
              { key: 'variations', icon: <IconCopy size={13} />, label: 'Variações' },
              { key: 'multi-angles', icon: <IconRotate360 size={13} />, label: 'Multi-Ângulos' },
              { key: 'inpaint', icon: <IconWand size={13} />, label: 'Inpaint' },
              { key: 'object-remove', icon: <IconEraser size={13} />, label: 'Remover Objeto' },
              { key: 'outpaint', icon: <IconPhoto size={13} />, label: 'Expandir' },
              { key: 'split-layers', icon: <IconLayersSubtract size={13} />, label: 'Split Layers' },
            ] as const).map(btn => (
              <Tooltip key={btn.key} title={btn.label}>
                <Button size="small" onClick={() => handleToolbarAction(btn.key)} disabled={!!toolbarLoading}
                  startIcon={toolbarLoading === btn.key ? <CircularProgress size={10} sx={{ color: EDRO_ORANGE }} /> : btn.icon}
                  sx={{ color: '#666', fontSize: '0.65rem', textTransform: 'none', whiteSpace: 'nowrap', minWidth: 'auto', px: 0.75, py: 0.2, borderRadius: 1, '&:hover': { color: '#fff', bgcolor: '#1e1e1e' } }}
                >{btn.label}</Button>
              </Tooltip>
            ))}

            <Box sx={{ width: '1px', height: 16, bgcolor: '#222', mx: 0.25, flexShrink: 0 }} />

            {/* Style Transfer */}
            <Tooltip title="Transferência de Estilo">
              <Button size="small" onClick={e => setStyleMenuAnchor(e.currentTarget)} disabled={!!toolbarLoading}
                startIcon={<IconPaint size={13} />}
                sx={{ color: '#666', fontSize: '0.65rem', textTransform: 'none', minWidth: 'auto', px: 0.75, py: 0.2, borderRadius: 1, '&:hover': { color: '#fff', bgcolor: '#1e1e1e' } }}
              >Estilo</Button>
            </Tooltip>
            <Menu anchorEl={styleMenuAnchor} open={!!styleMenuAnchor} onClose={() => setStyleMenuAnchor(null)}
              PaperProps={{ sx: { bgcolor: '#1e1e1e', border: `1px solid ${BORDER}`, maxHeight: 300 } }}>
              {STYLE_PRESETS.map(s => (
                <MenuItem key={s.key} onClick={() => { setStyleMenuAnchor(null); handleToolbarAction('style-transfer', { style: s.key }); }}
                  sx={{ fontSize: '0.75rem', color: '#ccc', '&:hover': { bgcolor: '#2a2a2a' } }}>
                  {s.icon} {s.label}
                </MenuItem>
              ))}
            </Menu>

            {/* Cartoonize */}
            <Tooltip title="Cartoonizar">
              <Button size="small" onClick={e => setCartoonMenuAnchor(e.currentTarget)} disabled={!!toolbarLoading}
                startIcon={<IconGridDots size={13} />}
                sx={{ color: '#666', fontSize: '0.65rem', textTransform: 'none', minWidth: 'auto', px: 0.75, py: 0.2, borderRadius: 1, '&:hover': { color: '#fff', bgcolor: '#1e1e1e' } }}
              >Cartoon</Button>
            </Tooltip>
            <Menu anchorEl={cartoonMenuAnchor} open={!!cartoonMenuAnchor} onClose={() => setCartoonMenuAnchor(null)}
              PaperProps={{ sx: { bgcolor: '#1e1e1e', border: `1px solid ${BORDER}` } }}>
              {CARTOON_STYLES.map(s => (
                <MenuItem key={s.key} onClick={() => { setCartoonMenuAnchor(null); handleToolbarAction('cartoonize', { style: s.key }); }}
                  sx={{ fontSize: '0.75rem', color: '#ccc' }}>{s.label}</MenuItem>
              ))}
            </Menu>

            {/* Video */}
            <Tooltip title="Gerar Vídeo (Kling AI, ~60-120s)">
              <Button size="small" onClick={() => handleToolbarAction('image-to-video')} disabled={!!toolbarLoading}
                startIcon={toolbarLoading === 'image-to-video' ? <CircularProgress size={10} sx={{ color: EDRO_ORANGE }} /> : <IconMovie size={13} />}
                sx={{ color: '#666', fontSize: '0.65rem', textTransform: 'none', minWidth: 'auto', px: 0.75, py: 0.2, borderRadius: 1, '&:hover': { color: '#fff', bgcolor: '#1e1e1e' } }}
              >Vídeo</Button>
            </Tooltip>

            <Box sx={{ flex: 1 }} />

            {/* Export */}
            <Tooltip title="Exportar">
              <Button size="small" onClick={e => setExportMenuAnchor(e.currentTarget)}
                startIcon={<IconFileExport size={13} />}
                sx={{ color: '#666', fontSize: '0.65rem', textTransform: 'none', minWidth: 'auto', px: 0.75, py: 0.2, borderRadius: 1, '&:hover': { color: '#fff', bgcolor: '#1e1e1e' } }}
              >Exportar</Button>
            </Tooltip>
            <Menu anchorEl={exportMenuAnchor} open={!!exportMenuAnchor} onClose={() => setExportMenuAnchor(null)}
              PaperProps={{ sx: { bgcolor: '#1e1e1e', border: `1px solid ${BORDER}` } }}>
              <MenuItem onClick={() => handleExport('png')} sx={{ fontSize: '0.75rem', color: '#ccc' }}>PNG (transparência)</MenuItem>
              <MenuItem onClick={() => handleExport('jpg')} sx={{ fontSize: '0.75rem', color: '#ccc' }}>JPG (web)</MenuItem>
              <MenuItem onClick={() => handleExport('pdf')} sx={{ fontSize: '0.75rem', color: '#ccc' }}>PDF (impressão)</MenuItem>
            </Menu>

            {/* Layout mode toggle */}
            {layoutMode && (
              <Tooltip title="Voltar ao modo clássico">
                <Button size="small" onClick={() => setLayoutMode(false)}
                  sx={{ color: '#666', fontSize: '0.6rem', textTransform: 'none', minWidth: 'auto', px: 0.5 }}>
                  Clássico
                </Button>
              </Tooltip>
            )}

            {/* Layers toggle */}
            <Tooltip title="Layers">
              <IconButton size="small" onClick={() => {
                if (layoutMode) setShowLayerPanel(!showLayerPanel);
                else setShowLayers(!showLayers);
              }}
                sx={{ color: (layoutMode ? showLayerPanel : showLayers) ? EDRO_ORANGE : '#666', '&:hover': { color: '#fff' } }}>
                <IconStack2 size={14} />
              </IconButton>
            </Tooltip>

            {/* Download */}
            <Tooltip title="Download">
              <IconButton size="small" component="a" href={currentImage} target="_blank" rel="noopener noreferrer" download sx={{ color: '#666' }}>
                <IconDownload size={14} />
              </IconButton>
            </Tooltip>

            {/* Clear mask */}
            {maskDataUrl && (
              <Tooltip title="Limpar máscara">
                <IconButton size="small" onClick={clearMask} sx={{ color: EDRO_ORANGE }}><IconX size={14} /></IconButton>
              </Tooltip>
            )}
          </Box>
        )}

        {/* ── Canvas Area ─────────────────────────────────────────── */}
        <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>

          {layoutMode && canvasLayers.layers.length > 0 ? (
            /* ── Layout Mode: editable layer composition ──────── */
            <>
              <CanvasViewport
                layers={canvasLayers.layers}
                canvasWidth={canvasLayers.canvasSize.width}
                canvasHeight={canvasLayers.canvasSize.height}
                backgroundColor={canvasLayers.backgroundColor}
                selectedLayerId={canvasLayers.selectedLayerId}
                onSelectLayer={canvasLayers.setSelectedLayerId}
                onContentChange={canvasLayers.updateContent}
                onDragEnd={canvasLayers.moveLayer}
                onResizeEnd={canvasLayers.resizeLayer}
                exportRef={layoutCanvasRef}
              />
              {showLayerPanel && (
                <LayerPanel
                  layers={canvasLayers.layers}
                  selectedLayerId={canvasLayers.selectedLayerId}
                  onSelect={canvasLayers.setSelectedLayerId}
                  onClose={() => setShowLayerPanel(false)}
                  onDelete={canvasLayers.deleteLayer}
                  onReorder={canvasLayers.reorderLayer}
                  onUpdateLayer={canvasLayers.updateLayer}
                  onUpdateStyle={canvasLayers.updateLayerStyle}
                />
              )}
            </>
          ) : (
            /* ── Classic Mode: single image with pan/zoom ─────── */
            <>
              <Box
                ref={canvasContainerRef}
                onWheel={handleWheel}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={(e) => { handleCanvasMouseMove(e); if (isDrawing) drawOnMask(e, activeTool === 'eraser'); }}
                onMouseUp={() => { handleCanvasMouseUp(); stopDrawing(); }}
                onMouseLeave={() => { handleCanvasMouseUp(); stopDrawing(); }}
                sx={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden', cursor: isPanning ? 'grabbing' : canvasCursor, position: 'relative',
                }}
              >
                {currentImage ? (
                  <Box sx={{
                    position: 'relative',
                    transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
                    transformOrigin: 'center center',
                    transition: isPanning ? 'none' : 'transform 0.15s ease',
                  }}>
                    <Box
                      component="img"
                      ref={imageRef}
                      src={currentImage}
                      alt="Canvas"
                      onMouseDown={startDrawing}
                      onClick={handleMarkClick}
                      sx={{ maxWidth: '80vw', maxHeight: 'calc(100vh - 200px)', borderRadius: 2, boxShadow: '0 8px 40px rgba(0,0,0,0.5)', objectFit: 'contain', userSelect: 'none', pointerEvents: 'auto' }}
                    />
                    {maskDataUrl && (
                      <Box component="img" src={maskDataUrl}
                        sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.35, mixBlendMode: 'screen', pointerEvents: 'none', borderRadius: 2, filter: 'hue-rotate(0deg) saturate(3)' }}
                      />
                    )}
                    {marks.map((m, i) => (
                      <Box key={i} sx={{
                        position: 'absolute', left: `${m.x * 100}%`, top: `${m.y * 100}%`,
                        transform: 'translate(-50%, -50%)', width: 20, height: 20, borderRadius: '50%',
                        bgcolor: `${EDRO_ORANGE}80`, border: `2px solid ${EDRO_ORANGE}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.6rem', color: '#fff', fontWeight: 700, pointerEvents: 'none',
                      }}>
                        {i + 1}
                      </Box>
                    ))}
                    <canvas ref={maskCanvasRef} style={{ display: 'none' }} />
                  </Box>
                ) : (
                  <Box sx={{ textAlign: 'center', color: '#444' }}>
                    <IconBrush size={72} style={{ opacity: 0.2, marginBottom: 20 }} />
                    <Typography variant="h6" sx={{ color: '#444', fontWeight: 600 }}>Seu canvas</Typography>
                    <Typography variant="body2" sx={{ color: '#3a3a3a', maxWidth: 400 }}>
                      Descreve o que quer no chat ou use &quot;Gerar Peça&quot; para criar um layout completo.
                    </Typography>
                    {/* Layout quick actions */}
                    <Stack spacing={0.75} sx={{ mt: 3, maxWidth: 380, mx: 'auto' }}>
                      {layoutQuickActions.map(qa => (
                        <Chip key={qa} label={qa} variant="outlined" clickable
                          icon={<IconLayoutBoard size={14} />}
                          onClick={() => { setInput(qa); generateLayoutPiece(qa); }}
                          sx={{
                            fontSize: '0.73rem', justifyContent: 'flex-start', py: 0.5,
                            borderColor: `${EDRO_ORANGE}40`, color: '#999',
                            '& .MuiChip-icon': { color: EDRO_ORANGE },
                            '&:hover': { borderColor: EDRO_ORANGE, color: EDRO_ORANGE, bgcolor: `${EDRO_ORANGE}10` },
                          }}
                        />
                      ))}
                    </Stack>
                  </Box>
                )}
              </Box>

              {/* Legacy layers panel */}
              {showLayers && (
                <Box sx={{ width: 220, borderLeft: `1px solid ${BORDER}`, bgcolor: PANEL_BG, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                  <Box sx={{ px: 1.5, py: 1, borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="caption" sx={{ color: '#aaa', fontWeight: 700, fontSize: '0.75rem' }}>Layers</Typography>
                    <IconButton size="small" onClick={() => setShowLayers(false)} sx={{ color: '#666' }}><IconX size={12} /></IconButton>
                  </Box>
                  <Box sx={{ flex: 1, overflowY: 'auto', p: 1 }}>
                    {layers.length === 0 ? (
                      <Box sx={{ textAlign: 'center', pt: 4 }}>
                        <Typography variant="caption" sx={{ color: '#555' }}>Nenhum layer.</Typography>
                        <Typography variant="caption" sx={{ color: '#444', display: 'block', mt: 0.5 }}>Use &quot;Split Layers&quot; ou &quot;Gerar Peça&quot;.</Typography>
                      </Box>
                    ) : (
                      <Stack spacing={0.5}>
                        {layers.map((layer) => (
                          <Box key={layer.id} onClick={() => setActiveLayerId(layer.id)}
                            sx={{
                              display: 'flex', alignItems: 'center', gap: 1, p: 0.75, borderRadius: 1, cursor: 'pointer',
                              bgcolor: activeLayerId === layer.id ? `${EDRO_ORANGE}15` : 'transparent',
                              border: activeLayerId === layer.id ? `1px solid ${EDRO_ORANGE}40` : '1px solid transparent',
                              '&:hover': { bgcolor: '#1e1e1e' },
                            }}>
                            <Box component="img" src={layer.imageUrl} sx={{ width: 36, height: 36, borderRadius: 0.5, objectFit: 'cover' }} />
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="caption" sx={{ color: '#ccc', fontSize: '0.7rem', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{layer.name}</Typography>
                              <Typography variant="caption" sx={{ color: '#555', fontSize: '0.6rem' }}>{layer.type}</Typography>
                            </Box>
                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); setLayers(prev => prev.map(l => l.id === layer.id ? { ...l, visible: !l.visible } : l)); }}
                              sx={{ color: layer.visible ? '#666' : '#333' }}>
                              {layer.visible ? <IconEye size={12} /> : <IconEyeOff size={12} />}
                            </IconButton>
                          </Box>
                        ))}
                      </Stack>
                    )}
                  </Box>
                </Box>
              )}
            </>
          )}
        </Box>

        {/* Copy overlay */}
        {(copy.headline || copy.body || copy.cta) && (
          <Box sx={{ px: 3, py: 2, borderTop: '1px solid #222', bgcolor: '#0d0d0d' }}>
            <Stack spacing={0.5}>
              {copy.headline && <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 700 }}>{copy.headline}</Typography>}
              {copy.body && <Typography variant="body2" sx={{ color: '#bbb', lineHeight: 1.6 }}>{copy.body}</Typography>}
              {copy.cta && <Chip label={copy.cta} size="small" sx={{ alignSelf: 'flex-start', mt: 0.5, bgcolor: EDRO_ORANGE, color: '#fff', fontWeight: 600, fontSize: '0.78rem' }} />}
            </Stack>
          </Box>
        )}

        {/* Image variants strip */}
        {imageUrls.length > 1 && (
          <Box sx={{ display: 'flex', gap: 1, px: 2, py: 1.5, borderTop: '1px solid #222', overflowX: 'auto' }}>
            {imageUrls.map((url, i) => (
              <Box key={i} onClick={() => setImageIdx(i)} sx={{
                width: 64, height: 64, borderRadius: 1, overflow: 'hidden', cursor: 'pointer', flexShrink: 0,
                border: i === imageIdx ? `2px solid ${EDRO_ORANGE}` : '2px solid transparent',
                opacity: i === imageIdx ? 1 : 0.6, transition: 'all 0.15s', '&:hover': { opacity: 1 },
              }}>
                <Box component="img" src={url} alt={`Variant ${i + 1}`} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* ── Campaign overlay ────────────────────────────────────── */}
      {campaignMode && campaignPieces.length > 0 && (
        <CampaignCanvasView
          campaignName={campaignName}
          pieces={campaignPieces}
          onOpenPiece={handleOpenCampaignPiece}
          onRegeneratePiece={handleRegeneratePiece}
          onClose={() => setCampaignMode(false)}
          regeneratingIdx={regeneratingPieceIdx}
        />
      )}

      {/* Campaign loading overlay */}
      {campaignLoading && (
        <Box sx={{
          position: 'fixed', inset: 0, zIndex: 1400,
          bgcolor: 'rgba(0,0,0,0.85)', display: 'flex',
          flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
        }}>
          <CircularProgress size={48} sx={{ color: EDRO_ORANGE }} />
          <Typography variant="h6" sx={{ color: '#eee', fontWeight: 600 }}>
            Gerando peças da campanha...
          </Typography>
          <Typography variant="body2" sx={{ color: '#888' }}>
            Copy + Direção de Arte + Layout + Imagens
          </Typography>
        </Box>
      )}
    </Box>
  );
}
