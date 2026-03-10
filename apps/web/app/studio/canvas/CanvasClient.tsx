'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import {
  IconSend, IconPalette, IconUpload, IconX,
  IconUser, IconDownload, IconBrush, IconSparkles,
  IconChevronLeft, IconChevronRight, IconArrowsMaximize,
  IconScissors, IconCopy, IconRotate360, IconArrowLeft,
  IconClipboardList, IconInfoCircle,
} from '@tabler/icons-react';

const EDRO_ORANGE = '#E85219';

type ChatMsg = { role: 'user' | 'assistant'; content: string; timestamp: string };
type Asset = { url: string; type: 'logo' | 'product' | 'reference' | 'photo'; name: string };
type CopyState = { headline: string; body: string; cta: string };
type ClientOption = { id: string; name: string };
type BriefingContext = {
  briefingId: string | null;
  briefingTitle: string | null;
  clientId: string | null;
  clientName: string | null;
  tone: string | null;
  event: string | null;
  date: string | null;
  pillars: string[];
  message: string | null;
  objective: string | null;
};

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
      briefingId,
      briefingTitle: context?.title || null,
      clientId: client?.id || null,
      clientName: client?.name || null,
      tone: context?.tone || client?.tone || null,
      event: context?.event || null,
      date: context?.date || null,
      pillars,
      message: context?.message || null,
      objective: context?.objective || null,
    };
  } catch {
    return { briefingId: null, briefingTitle: null, clientId: null, clientName: null, tone: null, event: null, date: null, pillars: [], message: null, objective: null };
  }
}

// ── Main ─────────────────────────────────────────────────────────────
export default function CanvasClient() {
  // Briefing context from Studio
  const [briefCtx, setBriefCtx] = useState<BriefingContext>(readBriefingContext);

  // State
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientId, setClientId] = useState(briefCtx.clientId || '');
  const [clientName, setClientName] = useState(briefCtx.clientName || '');
  const [format, setFormat] = useState('Feed 1:1');
  const [platform, setPlatform] = useState('Instagram');
  const [provider, setProvider] = useState<'fal' | 'gemini' | 'leonardo'>('fal');
  const [falModel, setFalModel] = useState('nano-banana-2');
  const [showBriefPanel, setShowBriefPanel] = useState(false);

  // Canvas state
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [imageIdx, setImageIdx] = useState(0);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [copy, setCopy] = useState<CopyState>({ headline: '', body: '', cta: '' });
  const [assets, setAssets] = useState<Asset[]>([]);
  const [toolbarLoading, setToolbarLoading] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll chat
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages, loading]);

  // Load clients + listen for studio context changes
  useEffect(() => {
    apiGet<{ data?: any[] }>('/clients').then(res => {
      const list = (res?.data ?? []).map((c: any) => ({ id: c.id, name: c.name }));
      setClients(list);
    }).catch(() => {});

    const handleCtxChange = () => {
      const ctx = readBriefingContext();
      setBriefCtx(ctx);
      if (ctx.clientId && !clientId) {
        setClientId(ctx.clientId);
        setClientName(ctx.clientName || '');
      }
    };
    window.addEventListener('edro-studio-context-change', handleCtxChange);
    window.addEventListener('storage', handleCtxChange);
    return () => {
      window.removeEventListener('edro-studio-context-change', handleCtxChange);
      window.removeEventListener('storage', handleCtxChange);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle asset upload
  const handleAssetUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    e.target.value = '';
    for (const file of Array.from(files)) {
      const url = URL.createObjectURL(file);
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const type: Asset['type'] = ext === 'svg' || file.name.toLowerCase().includes('logo') ? 'logo'
        : ext === 'png' || ext === 'jpg' || ext === 'jpeg' ? 'photo' : 'reference';
      setAssets(prev => [...prev, { url, type, name: file.name }]);
    }
  }, []);

  const removeAsset = useCallback((idx: number) => {
    setAssets(prev => prev.filter((_, i) => i !== idx));
  }, []);

  // Send message — includes briefing context
  const sendMessage = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput('');

    const userMsg: ChatMsg = { role: 'user', content: msg, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));

      // Build enriched message with briefing context on first message
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
        success: boolean;
        message: string;
        actions_taken: string[];
        results: {
          image?: { success: boolean; image_url?: string; image_urls?: string[]; refined_prompt?: string; error?: string };
          copy?: { success: boolean; headline?: string; body?: string; cta?: string; error?: string };
        };
      }>('/studio/canvas/chat', {
        message: enrichedMsg,
        history,
        current_image_url: imageUrls[imageIdx] || undefined,
        current_prompt: currentPrompt || undefined,
        current_copy: (copy.headline || copy.body || copy.cta) ? copy : undefined,
        client_id: clientId || undefined,
        client_name: clientName || undefined,
        assets: assets.map(a => ({ url: a.url, type: a.type, name: a.name })),
        image_provider: provider,
        fal_model: provider === 'fal' ? falModel : undefined,
        format,
        platform,
      });

      const r = res.results || {};

      if (r.image?.success) {
        const urls = r.image.image_urls?.length ? r.image.image_urls : r.image.image_url ? [r.image.image_url] : [];
        if (urls.length) { setImageUrls(urls); setImageIdx(0); }
        if (r.image.refined_prompt) setCurrentPrompt(r.image.refined_prompt);
      }

      if (r.copy?.success) {
        setCopy({ headline: r.copy.headline || copy.headline, body: r.copy.body || copy.body, cta: r.copy.cta || copy.cta });
      }

      setMessages(prev => [...prev, { role: 'assistant', content: res.message || 'Pronto!', timestamp: new Date().toISOString() }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Erro: ${err?.message || 'Tente novamente.'}`, timestamp: new Date().toISOString() }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, imageUrls, imageIdx, currentPrompt, copy, clientId, clientName, assets, provider, falModel, format, platform, briefCtx]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const currentImage = imageUrls[imageIdx] || null;

  // ── Toolbar Actions ──────────────────────────────────────────────
  const handleToolbarAction = useCallback(async (action: string) => {
    if (!currentImage || toolbarLoading) return;
    setToolbarLoading(action);
    try {
      if (action === 'upscale') {
        const res = await apiPost<{ success: boolean; image_url?: string }>('/studio/canvas/upscale', { image_url: currentImage });
        if (res.success && res.image_url) {
          setImageUrls([res.image_url]); setImageIdx(0);
          setMessages(prev => [...prev, { role: 'assistant', content: 'Imagem upscaled 4x!', timestamp: new Date().toISOString() }]);
        }
      } else if (action === 'remove-bg') {
        const res = await apiPost<{ success: boolean; image_url?: string }>('/studio/canvas/remove-bg', { image_url: currentImage });
        if (res.success && res.image_url) {
          setImageUrls(prev => [...prev, res.image_url!]); setImageIdx(imageUrls.length);
          setMessages(prev => [...prev, { role: 'assistant', content: 'Background removido!', timestamp: new Date().toISOString() }]);
        }
      } else if (action === 'variations') {
        const ar = format.includes('9:16') ? '9:16' : format.includes('16:9') ? '16:9' : format.includes('4:5') ? '4:5' : '1:1';
        const res = await apiPost<{ success: boolean; image_urls?: string[] }>('/studio/canvas/variations', {
          image_url: currentImage, prompt: currentPrompt, aspect_ratio: ar, num_images: 3,
        });
        if (res.success && res.image_urls?.length) {
          setImageUrls(res.image_urls); setImageIdx(0);
          setMessages(prev => [...prev, { role: 'assistant', content: `${res.image_urls!.length} variações geradas!`, timestamp: new Date().toISOString() }]);
        }
      } else if (action === 'multi-angles') {
        const ar = format.includes('9:16') ? '9:16' : format.includes('16:9') ? '16:9' : '1:1';
        const res = await apiPost<{ success: boolean; image_urls?: string[] }>('/studio/canvas/multi-angles', {
          image_url: currentImage, prompt: currentPrompt, aspect_ratio: ar,
        });
        if (res.success && res.image_urls?.length) {
          setImageUrls(res.image_urls); setImageIdx(0);
          setMessages(prev => [...prev, { role: 'assistant', content: `${res.image_urls!.length} ângulos gerados!`, timestamp: new Date().toISOString() }]);
        }
      }
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Erro: ${err?.message || 'Falha na ação'}`, timestamp: new Date().toISOString() }]);
    } finally {
      setToolbarLoading(null);
    }
  }, [currentImage, toolbarLoading, imageUrls.length, currentPrompt, format]);

  const hasBriefing = !!(briefCtx.briefingId || briefCtx.briefingTitle);

  const quickActions = hasBriefing
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
      ];

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', bgcolor: '#111' }}>

      {/* ── Left: Chat Panel ────────────────────────────────────────── */}
      <Box sx={{ width: { xs: '100%', md: 380 }, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid #2a2a2a', bgcolor: '#161616' }}>

        {/* Header bar */}
        <Box sx={{ px: 1.5, py: 1, borderBottom: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Voltar ao Studio">
            <IconButton
              size="small"
              component={Link}
              href="/studio"
              sx={{ color: '#888', '&:hover': { color: '#fff' } }}
            >
              <IconArrowLeft size={18} />
            </IconButton>
          </Tooltip>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flex: 1 }}>
            <IconSparkles size={18} style={{ color: EDRO_ORANGE }} />
            <Typography variant="subtitle2" sx={{ color: '#eee', fontWeight: 700, fontSize: '0.85rem' }}>
              Canvas
            </Typography>
            {hasBriefing && (
              <Chip
                label={briefCtx.briefingTitle || 'Briefing'}
                size="small"
                icon={<IconClipboardList size={12} />}
                onClick={() => setShowBriefPanel(!showBriefPanel)}
                sx={{
                  fontSize: '0.65rem', height: 22, ml: 0.5,
                  bgcolor: `${EDRO_ORANGE}20`, color: EDRO_ORANGE, borderColor: `${EDRO_ORANGE}40`,
                  '& .MuiChip-icon': { color: EDRO_ORANGE },
                }}
              />
            )}
          </Box>
          {hasBriefing && (
            <Tooltip title="Info do briefing">
              <IconButton size="small" onClick={() => setShowBriefPanel(!showBriefPanel)} sx={{ color: '#666' }}>
                <IconInfoCircle size={16} />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* Briefing context panel (collapsible) */}
        {showBriefPanel && hasBriefing && (
          <Box sx={{ px: 1.5, py: 1.5, borderBottom: '1px solid #2a2a2a', bgcolor: '#1a1a1a' }}>
            <Stack spacing={0.75}>
              {briefCtx.clientName && (
                <Typography variant="caption" sx={{ color: '#999' }}>
                  <strong style={{ color: '#ccc' }}>Cliente:</strong> {briefCtx.clientName}
                </Typography>
              )}
              {briefCtx.objective && (
                <Typography variant="caption" sx={{ color: '#999' }}>
                  <strong style={{ color: '#ccc' }}>Objetivo:</strong> {briefCtx.objective}
                </Typography>
              )}
              {briefCtx.message && (
                <Typography variant="caption" sx={{ color: '#999' }}>
                  <strong style={{ color: '#ccc' }}>Mensagem:</strong> {briefCtx.message}
                </Typography>
              )}
              {briefCtx.tone && (
                <Typography variant="caption" sx={{ color: '#999' }}>
                  <strong style={{ color: '#ccc' }}>Tom:</strong> {briefCtx.tone}
                </Typography>
              )}
              {briefCtx.pillars.length > 0 && (
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {briefCtx.pillars.map(p => (
                    <Chip key={p} label={p} size="small" sx={{ height: 18, fontSize: '0.6rem', bgcolor: '#222', color: '#aaa' }} />
                  ))}
                </Box>
              )}
              {briefCtx.event && (
                <Typography variant="caption" sx={{ color: '#999' }}>
                  <strong style={{ color: '#ccc' }}>Evento:</strong> {briefCtx.event} {briefCtx.date ? `(${briefCtx.date})` : ''}
                </Typography>
              )}
            </Stack>
          </Box>
        )}

        {/* Controls bar */}
        <Box sx={{ px: 1.5, py: 1, borderBottom: '1px solid #2a2a2a' }}>
          <Stack spacing={0.75}>
            <Stack direction="row" spacing={0.75}>
              <Select size="small" value={clientId} onChange={e => { setClientId(e.target.value); setClientName(clients.find(c => c.id === e.target.value)?.name || ''); }} displayEmpty
                sx={{ flex: 1, fontSize: '0.75rem', color: '#ccc', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#333' }, '& .MuiSvgIcon-root': { color: '#666' } }}>
                <MenuItem value="" disabled>Cliente</MenuItem>
                {clients.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
              </Select>
              <Select size="small" value={provider} onChange={e => { setProvider(e.target.value as any); if (e.target.value !== 'fal') setFalModel('flux-pro'); }}
                sx={{ width: 90, fontSize: '0.75rem', color: '#ccc', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#333' }, '& .MuiSvgIcon-root': { color: '#666' } }}>
                <MenuItem value="fal">Fal.ai</MenuItem>
                <MenuItem value="gemini">Gemini</MenuItem>
                <MenuItem value="leonardo">Leonardo</MenuItem>
              </Select>
            </Stack>
            {provider === 'fal' && (
              <Select size="small" value={falModel} onChange={e => setFalModel(e.target.value)}
                sx={{ fontSize: '0.7rem', color: '#ccc', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#333' }, '& .MuiSvgIcon-root': { color: '#666' } }}>

                <MenuItem disabled sx={{ fontSize: '0.65rem', color: '#666', py: 0.3 }}>-- Google --</MenuItem>
                <MenuItem value="nano-banana-2">Nano Banana 2 (Gemini Flash)</MenuItem>
                <MenuItem value="nano-banana-pro">Nano Banana Pro (Gemini Pro)</MenuItem>
                <MenuItem disabled sx={{ fontSize: '0.65rem', color: '#666', py: 0.3 }}>-- Flux --</MenuItem>
                <MenuItem value="flux-pro">Flux Pro 1.1</MenuItem>
                <MenuItem value="flux-pro-ultra">Flux Pro Ultra</MenuItem>
                <MenuItem value="flux-dev">Flux Dev (rápido)</MenuItem>
                <MenuItem value="flux-realism">Flux Realism</MenuItem>
                <MenuItem disabled sx={{ fontSize: '0.65rem', color: '#666', py: 0.3 }}>-- Outros --</MenuItem>
                <MenuItem value="recraft-v3">Recraft V3</MenuItem>
                <MenuItem value="ideogram-v2">Ideogram V2</MenuItem>
                <MenuItem value="hidream-i1">HiDream I1</MenuItem>
                <MenuItem value="stable-diffusion-v35">SD 3.5 Large</MenuItem>
                <MenuItem value="minimax-image">Minimax Image</MenuItem>
                <MenuItem value="omnigen-v1">OmniGen V1</MenuItem>
              </Select>
            )}
            <Stack direction="row" spacing={0.75}>
              <Select size="small" value={format} onChange={e => setFormat(e.target.value)}
                sx={{ flex: 1, fontSize: '0.75rem', color: '#ccc', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#333' }, '& .MuiSvgIcon-root': { color: '#666' } }}>
                <MenuItem value="Feed 1:1">Feed 1:1</MenuItem>
                <MenuItem value="Story 9:16">Story 9:16</MenuItem>
                <MenuItem value="Reels 9:16">Reels 9:16</MenuItem>
                <MenuItem value="Feed 4:5">Feed 4:5</MenuItem>
                <MenuItem value="LinkedIn 1.91:1">LinkedIn 16:9</MenuItem>
                <MenuItem value="YouTube Thumb 16:9">YouTube 16:9</MenuItem>
                <MenuItem value="OOH 3:1">OOH 3:1</MenuItem>
              </Select>
              <Select size="small" value={platform} onChange={e => setPlatform(e.target.value)}
                sx={{ flex: 1, fontSize: '0.75rem', color: '#ccc', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#333' }, '& .MuiSvgIcon-root': { color: '#666' } }}>
                <MenuItem value="Instagram">Instagram</MenuItem>
                <MenuItem value="Facebook">Facebook</MenuItem>
                <MenuItem value="LinkedIn">LinkedIn</MenuItem>
                <MenuItem value="TikTok">TikTok</MenuItem>
                <MenuItem value="YouTube">YouTube</MenuItem>
                <MenuItem value="OOH">OOH</MenuItem>
              </Select>
            </Stack>
          </Stack>
        </Box>

        {/* Assets strip */}
        {assets.length > 0 && (
          <Box sx={{ px: 1.5, py: 1, borderBottom: '1px solid #2a2a2a', display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
            {assets.map((a, i) => (
              <Chip key={i} label={a.name.length > 16 ? a.name.slice(0, 14) + '…' : a.name}
                size="small" variant="outlined"
                avatar={<Avatar src={a.url} sx={{ width: 20, height: 20 }} />}
                onDelete={() => removeAsset(i)} deleteIcon={<IconX size={10} />}
                sx={{ fontSize: '0.65rem', height: 22, bgcolor: `${EDRO_ORANGE}08`, borderColor: `${EDRO_ORANGE}30`, color: '#aaa' }}
              />
            ))}
          </Box>
        )}

        {/* Chat messages */}
        <Box ref={scrollRef} sx={{ flex: 1, overflowY: 'auto', px: 1.5, py: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>

          {/* Empty state */}
          {messages.length === 0 && !loading && (
            <Box sx={{ textAlign: 'center', pt: 6 }}>
              <Box sx={{ display: 'inline-flex', p: 2.5, borderRadius: '50%', bgcolor: `${EDRO_ORANGE}15`, mb: 2.5 }}>
                <IconSparkles size={36} style={{ color: EDRO_ORANGE }} />
              </Box>
              <Typography variant="subtitle1" fontWeight={700} mb={0.5} sx={{ color: '#eee' }}>
                Canvas Criativo
              </Typography>
              <Typography variant="body2" mb={2.5} sx={{ color: '#777' }}>
                {hasBriefing
                  ? `Briefing "${briefCtx.briefingTitle}" carregado. Pede o que quiser.`
                  : 'Pede qualquer coisa. Imagem, copy, refinamento — tudo em linguagem natural.'}
              </Typography>
              <Stack spacing={0.75}>
                {quickActions.map(qa => (
                  <Chip key={qa} label={qa} variant="outlined" clickable onClick={() => sendMessage(qa)}
                    sx={{
                      fontSize: '0.73rem', justifyContent: 'flex-start', py: 0.5,
                      borderColor: '#333', color: '#999',
                      '&:hover': { borderColor: EDRO_ORANGE, color: EDRO_ORANGE, bgcolor: `${EDRO_ORANGE}10` },
                    }}
                  />
                ))}
              </Stack>
            </Box>
          )}

          {/* Messages */}
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
                border: '1px solid', borderColor: msg.role === 'user' ? '#3a3a3a' : '#2a2a2a',
              }}>
                <Typography variant="body2" sx={{ fontSize: '0.8rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {msg.content}
                </Typography>
              </Box>
            </Box>
          ))}

          {loading && (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
              <Avatar sx={{ width: 26, height: 26, bgcolor: EDRO_ORANGE }}><IconSparkles size={13} /></Avatar>
              <Box sx={{ px: 1.5, py: 0.5, borderRadius: '4px 12px 12px 12px', bgcolor: '#1e1e1e', border: '1px solid #2a2a2a' }}>
                <TypingDots />
              </Box>
            </Box>
          )}
        </Box>

        {/* Input */}
        <Box sx={{ px: 1.5, py: 1, borderTop: '1px solid #2a2a2a' }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
            <input ref={fileInputRef} type="file" accept="image/*,.svg,.pdf" multiple hidden onChange={handleAssetUpload} />
            <Tooltip title="Upload asset (logo, produto, referência)">
              <IconButton size="small" onClick={() => fileInputRef.current?.click()} sx={{ color: '#666', '&:hover': { color: EDRO_ORANGE } }}>
                <IconUpload size={18} />
              </IconButton>
            </Tooltip>
            <TextField fullWidth multiline maxRows={4} size="small" placeholder="Descreve o que você quer..."
              value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} disabled={loading}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3, fontSize: '0.84rem', color: '#ddd',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#333' },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: EDRO_ORANGE },
                },
                '& .MuiOutlinedInput-input::placeholder': { color: '#555', opacity: 1 },
              }}
            />
            <IconButton onClick={() => sendMessage()} disabled={loading || !input.trim()}
              sx={{ bgcolor: EDRO_ORANGE, color: '#fff', width: 36, height: 36, '&:hover': { bgcolor: '#c94215' }, '&.Mui-disabled': { bgcolor: '#333' } }}>
              <IconSend size={16} />
            </IconButton>
          </Box>
        </Box>
      </Box>

      {/* ── Right: Canvas ─────────────────────────────────────────── */}
      <Box sx={{ flex: 1, display: { xs: 'none', md: 'flex' }, flexDirection: 'column', bgcolor: '#111', minWidth: 0 }}>

        {/* Canvas toolbar */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 2, py: 0.75, borderBottom: '1px solid #222', flexShrink: 0, overflowX: 'auto' }}>
          <IconPalette size={16} style={{ color: EDRO_ORANGE, flexShrink: 0 }} />
          <Typography variant="caption" sx={{ color: '#555', mr: 1, whiteSpace: 'nowrap', fontSize: '0.7rem' }}>
            {currentImage ? `${imageIdx + 1}/${imageUrls.length}` : 'Vazio'}
            {format && ` · ${format}`}
          </Typography>

          {currentImage && (
            <>
              <Box sx={{ width: '1px', height: 20, bgcolor: '#2a2a2a', mx: 0.5, flexShrink: 0 }} />
              {([
                { key: 'upscale', icon: <IconArrowsMaximize size={15} />, label: 'Upscale 4x' },
                { key: 'remove-bg', icon: <IconScissors size={15} />, label: 'Remove BG' },
                { key: 'variations', icon: <IconCopy size={15} />, label: 'Variações' },
                { key: 'multi-angles', icon: <IconRotate360 size={15} />, label: 'Multi-Ângulos' },
              ] as const).map(btn => (
                <Tooltip key={btn.key} title={btn.label}>
                  <Button
                    size="small"
                    onClick={() => handleToolbarAction(btn.key)}
                    disabled={!!toolbarLoading}
                    startIcon={toolbarLoading === btn.key ? <CircularProgress size={12} sx={{ color: EDRO_ORANGE }} /> : btn.icon}
                    sx={{
                      color: '#777', fontSize: '0.7rem', textTransform: 'none', whiteSpace: 'nowrap',
                      minWidth: 'auto', px: 1, py: 0.3, borderRadius: 1,
                      '&:hover': { color: '#fff', bgcolor: '#222' },
                    }}
                  >
                    {btn.label}
                  </Button>
                </Tooltip>
              ))}
              <Box sx={{ width: '1px', height: 20, bgcolor: '#2a2a2a', mx: 0.5, flexShrink: 0 }} />
            </>
          )}

          <Box sx={{ flex: 1 }} />

          {imageUrls.length > 1 && (
            <>
              <IconButton size="small" onClick={() => setImageIdx(i => Math.max(0, i - 1))} disabled={imageIdx === 0} sx={{ color: '#666' }}>
                <IconChevronLeft size={14} />
              </IconButton>
              <IconButton size="small" onClick={() => setImageIdx(i => Math.min(imageUrls.length - 1, i + 1))} disabled={imageIdx >= imageUrls.length - 1} sx={{ color: '#666' }}>
                <IconChevronRight size={14} />
              </IconButton>
            </>
          )}
          {currentImage && (
            <Tooltip title="Download">
              <IconButton size="small" component="a" href={currentImage} target="_blank" download sx={{ color: '#666' }}>
                <IconDownload size={14} />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* Canvas area */}
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto', p: 3 }}>
          {currentImage ? (
            <Box sx={{ position: 'relative', maxWidth: '100%', maxHeight: '100%' }}>
              <Box
                component="img"
                src={currentImage}
                alt="Canvas"
                sx={{
                  maxWidth: '100%', maxHeight: 'calc(100vh - 160px)',
                  borderRadius: 2, boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
                  objectFit: 'contain',
                }}
              />
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', color: '#444' }}>
              <IconBrush size={72} style={{ opacity: 0.2, marginBottom: 20 }} />
              <Typography variant="h6" sx={{ color: '#444', fontWeight: 600 }}>
                Seu canvas
              </Typography>
              <Typography variant="body2" sx={{ color: '#3a3a3a', maxWidth: 400 }}>
                Descreve o que você quer no chat e a imagem aparece aqui. Simples assim.
              </Typography>
            </Box>
          )}
        </Box>

        {/* Copy overlay */}
        {(copy.headline || copy.body || copy.cta) && (
          <Box sx={{ px: 3, py: 2, borderTop: '1px solid #222', bgcolor: '#0d0d0d' }}>
            <Stack spacing={0.5}>
              {copy.headline && (
                <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 700 }}>{copy.headline}</Typography>
              )}
              {copy.body && (
                <Typography variant="body2" sx={{ color: '#bbb', lineHeight: 1.6 }}>{copy.body}</Typography>
              )}
              {copy.cta && (
                <Chip label={copy.cta} size="small" sx={{ alignSelf: 'flex-start', mt: 0.5, bgcolor: EDRO_ORANGE, color: '#fff', fontWeight: 600, fontSize: '0.78rem' }} />
              )}
            </Stack>
          </Box>
        )}

        {/* Image variants strip */}
        {imageUrls.length > 1 && (
          <Box sx={{ display: 'flex', gap: 1, px: 2, py: 1.5, borderTop: '1px solid #222', overflowX: 'auto' }}>
            {imageUrls.map((url, i) => (
              <Box
                key={i}
                onClick={() => setImageIdx(i)}
                sx={{
                  width: 64, height: 64, borderRadius: 1, overflow: 'hidden', cursor: 'pointer', flexShrink: 0,
                  border: i === imageIdx ? `2px solid ${EDRO_ORANGE}` : '2px solid transparent',
                  opacity: i === imageIdx ? 1 : 0.6,
                  transition: 'all 0.15s',
                  '&:hover': { opacity: 1 },
                }}
              >
                <Box component="img" src={url} alt={`Variant ${i + 1}`} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}
