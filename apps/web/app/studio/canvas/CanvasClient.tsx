'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import AppShell from '@/components/AppShell';
import { apiGet, apiPost } from '@/lib/api';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
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
  IconSend, IconPalette, IconPhoto, IconUpload, IconX,
  IconUser, IconDownload, IconRefresh, IconFileTypePdf,
  IconBrush, IconSparkles, IconChevronLeft, IconChevronRight,
} from '@tabler/icons-react';

const EDRO_ORANGE = '#E85219';

type ChatMsg = { role: 'user' | 'assistant'; content: string; timestamp: string };
type Asset = { url: string; type: 'logo' | 'product' | 'reference' | 'photo'; name: string };
type CopyState = { headline: string; body: string; cta: string };
type ClientOption = { id: string; name: string };

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

// ── Main ─────────────────────────────────────────────────────────────
export default function CanvasClient() {
  // State
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientId, setClientId] = useState('');
  const [clientName, setClientName] = useState('');
  const [format, setFormat] = useState('Feed 1:1');
  const [platform, setPlatform] = useState('Instagram');
  const [provider, setProvider] = useState<'fal' | 'gemini' | 'leonardo'>('fal');

  // Canvas state
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [imageIdx, setImageIdx] = useState(0);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [copy, setCopy] = useState<CopyState>({ headline: '', body: '', cta: '' });
  const [assets, setAssets] = useState<Asset[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll chat
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages, loading]);

  // Load clients
  useEffect(() => {
    apiGet<{ data?: any[] }>('/clients').then(res => {
      const list = (res?.data ?? []).map((c: any) => ({ id: c.id, name: c.name }));
      setClients(list);
    }).catch(() => {});
  }, []);

  // Handle asset upload
  const handleAssetUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    e.target.value = '';

    for (const file of Array.from(files)) {
      // For now, create object URLs for preview; in production you'd upload to S3
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

  // Send message
  const sendMessage = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput('');

    const userMsg: ChatMsg = { role: 'user', content: msg, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));

      const res = await apiPost<{
        success: boolean;
        message: string;
        actions_taken: string[];
        results: {
          image?: { success: boolean; image_url?: string; image_urls?: string[]; refined_prompt?: string; error?: string };
          copy?: { success: boolean; headline?: string; body?: string; cta?: string; error?: string };
        };
      }>('/studio/canvas/chat', {
        message: msg,
        history,
        current_image_url: imageUrls[imageIdx] || undefined,
        current_prompt: currentPrompt || undefined,
        current_copy: (copy.headline || copy.body || copy.cta) ? copy : undefined,
        client_id: clientId || undefined,
        client_name: clientName || undefined,
        assets: assets.map(a => ({ url: a.url, type: a.type, name: a.name })),
        image_provider: provider,
        format,
        platform,
      });

      // Process results
      const r = res.results || {};

      if (r.image?.success) {
        const urls = r.image.image_urls?.length ? r.image.image_urls : r.image.image_url ? [r.image.image_url] : [];
        if (urls.length) {
          setImageUrls(urls);
          setImageIdx(0);
        }
        if (r.image.refined_prompt) setCurrentPrompt(r.image.refined_prompt);
      }

      if (r.copy?.success) {
        setCopy({
          headline: r.copy.headline || copy.headline,
          body: r.copy.body || copy.body,
          cta: r.copy.cta || copy.cta,
        });
      }

      const assistantMsg: ChatMsg = {
        role: 'assistant',
        content: res.message || 'Pronto!',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMsg]);

    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Erro: ${err?.message || 'Tente novamente.'}`, timestamp: new Date().toISOString() }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, imageUrls, imageIdx, currentPrompt, copy, clientId, clientName, assets, provider, format, platform]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const currentImage = imageUrls[imageIdx] || null;

  const quickActions = [
    'Cria um post impactante sobre lancamento de produto',
    'Gera uma imagem de fundo profissional e minimalista',
    'Escreve headline + CTA para Instagram',
    'Cria versao para Stories 9:16',
    'Gera uma foto de produto em estudio',
  ];

  return (
    <AppShell title="Canvas">
      <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>

        {/* ── Left: Chat ────────────────────────────────────────────── */}
        <Box sx={{ width: { xs: '100%', md: 380 }, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: 1, borderColor: 'divider', bgcolor: 'background.default' }}>

          {/* Controls bar */}
          <Box sx={{ px: 1.5, py: 1, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
            <Stack spacing={1}>
              <Stack direction="row" spacing={1}>
                <Select size="small" value={clientId} onChange={e => { setClientId(e.target.value); setClientName(clients.find(c => c.id === e.target.value)?.name || ''); }} displayEmpty sx={{ flex: 1, fontSize: '0.78rem' }}>
                  <MenuItem value="" disabled>Cliente</MenuItem>
                  {clients.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                </Select>
                <Select size="small" value={provider} onChange={e => setProvider(e.target.value as any)} sx={{ width: 100, fontSize: '0.78rem' }}>
                  <MenuItem value="fal">Flux</MenuItem>
                  <MenuItem value="gemini">Gemini</MenuItem>
                  <MenuItem value="leonardo">Leonardo</MenuItem>
                </Select>
              </Stack>
              <Stack direction="row" spacing={1}>
                <Select size="small" value={format} onChange={e => setFormat(e.target.value)} sx={{ flex: 1, fontSize: '0.78rem' }}>
                  <MenuItem value="Feed 1:1">Feed 1:1</MenuItem>
                  <MenuItem value="Story 9:16">Story 9:16</MenuItem>
                  <MenuItem value="Reels 9:16">Reels 9:16</MenuItem>
                  <MenuItem value="Feed 4:5">Feed 4:5</MenuItem>
                  <MenuItem value="LinkedIn 1.91:1">LinkedIn 16:9</MenuItem>
                  <MenuItem value="YouTube Thumb 16:9">YouTube 16:9</MenuItem>
                  <MenuItem value="OOH 3:1">OOH 3:1</MenuItem>
                </Select>
                <Select size="small" value={platform} onChange={e => setPlatform(e.target.value)} sx={{ flex: 1, fontSize: '0.78rem' }}>
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
            <Box sx={{ px: 1.5, py: 1, borderBottom: 1, borderColor: 'divider', display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
              {assets.map((a, i) => (
                <Chip key={i} label={a.name.length > 16 ? a.name.slice(0, 14) + '…' : a.name}
                  size="small" variant="outlined"
                  avatar={<Avatar src={a.url} sx={{ width: 20, height: 20 }} />}
                  onDelete={() => removeAsset(i)} deleteIcon={<IconX size={10} />}
                  sx={{ fontSize: '0.68rem', height: 24, bgcolor: `${EDRO_ORANGE}08`, borderColor: `${EDRO_ORANGE}30` }}
                />
              ))}
            </Box>
          )}

          {/* Chat messages */}
          <Box ref={scrollRef} sx={{ flex: 1, overflowY: 'auto', px: 1.5, py: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>

            {/* Empty state */}
            {messages.length === 0 && !loading && (
              <Box sx={{ textAlign: 'center', pt: 4 }}>
                <Box sx={{ display: 'inline-flex', p: 2, borderRadius: '50%', bgcolor: `${EDRO_ORANGE}12`, mb: 2 }}>
                  <IconSparkles size={32} style={{ color: EDRO_ORANGE }} />
                </Box>
                <Typography variant="subtitle1" fontWeight={700} mb={0.5}>Canvas Criativo</Typography>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  Pede qualquer coisa. Imagem, copy, refinamento — tudo em linguagem natural.
                </Typography>
                <Stack spacing={0.75}>
                  {quickActions.map(qa => (
                    <Chip key={qa} label={qa} variant="outlined" clickable onClick={() => sendMessage(qa)}
                      sx={{ fontSize: '0.74rem', justifyContent: 'flex-start', borderColor: `${EDRO_ORANGE}30`, '&:hover': { borderColor: EDRO_ORANGE, color: EDRO_ORANGE } }}
                    />
                  ))}
                </Stack>
              </Box>
            )}

            {/* Messages */}
            {messages.map((msg, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
                <Avatar sx={{ width: 26, height: 26, fontSize: '0.65rem', bgcolor: msg.role === 'user' ? 'primary.main' : EDRO_ORANGE }}>
                  {msg.role === 'user' ? <IconUser size={13} /> : <IconSparkles size={13} />}
                </Avatar>
                <Box sx={{
                  maxWidth: '85%', px: 1.5, py: 0.75,
                  borderRadius: msg.role === 'user' ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
                  bgcolor: msg.role === 'user' ? 'primary.main' : 'background.paper',
                  color: msg.role === 'user' ? '#fff' : 'text.primary',
                  border: msg.role === 'assistant' ? 1 : 0, borderColor: 'divider',
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
                <Box sx={{ px: 1.5, py: 0.5, borderRadius: '4px 12px 12px 12px', bgcolor: 'background.paper', border: 1, borderColor: 'divider' }}>
                  <TypingDots />
                </Box>
              </Box>
            )}
          </Box>

          {/* Input */}
          <Box sx={{ px: 1.5, py: 1, borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
              <input ref={fileInputRef} type="file" accept="image/*,.svg,.pdf" multiple hidden onChange={handleAssetUpload} />
              <Tooltip title="Upload asset (logo, produto, referencia)">
                <IconButton size="small" onClick={() => fileInputRef.current?.click()} sx={{ color: 'text.secondary', '&:hover': { color: EDRO_ORANGE } }}>
                  <IconUpload size={18} />
                </IconButton>
              </Tooltip>
              <TextField fullWidth multiline maxRows={4} size="small" placeholder="Descreve o que voce quer..."
                value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} disabled={loading}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3, fontSize: '0.84rem', '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: EDRO_ORANGE } } }}
              />
              <IconButton onClick={() => sendMessage()} disabled={loading || !input.trim()}
                sx={{ bgcolor: EDRO_ORANGE, color: '#fff', width: 36, height: 36, '&:hover': { bgcolor: '#c94215' }, '&.Mui-disabled': { bgcolor: 'action.disabledBackground' } }}>
                <IconSend size={16} />
              </IconButton>
            </Box>
          </Box>
        </Box>

        {/* ── Right: Canvas ─────────────────────────────────────────── */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: '#1a1a1a', minWidth: 0 }}>

          {/* Canvas toolbar */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1, borderBottom: '1px solid #333', flexShrink: 0 }}>
            <IconPalette size={18} style={{ color: EDRO_ORANGE }} />
            <Typography variant="caption" sx={{ color: '#999', flex: 1 }}>
              {currentImage ? `Imagem ${imageIdx + 1}/${imageUrls.length}` : 'Canvas vazio — pede algo no chat'}
              {format && ` · ${format}`}
            </Typography>
            {imageUrls.length > 1 && (
              <>
                <IconButton size="small" onClick={() => setImageIdx(i => Math.max(0, i - 1))} disabled={imageIdx === 0} sx={{ color: '#999' }}>
                  <IconChevronLeft size={16} />
                </IconButton>
                <IconButton size="small" onClick={() => setImageIdx(i => Math.min(imageUrls.length - 1, i + 1))} disabled={imageIdx >= imageUrls.length - 1} sx={{ color: '#999' }}>
                  <IconChevronRight size={16} />
                </IconButton>
              </>
            )}
            {currentImage && (
              <Tooltip title="Download">
                <IconButton size="small" component="a" href={currentImage} target="_blank" download sx={{ color: '#999' }}>
                  <IconDownload size={16} />
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
                    maxWidth: '100%', maxHeight: 'calc(100vh - 200px)',
                    borderRadius: 2, boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                    objectFit: 'contain',
                  }}
                />
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', color: '#555' }}>
                <IconBrush size={64} style={{ opacity: 0.3, marginBottom: 16 }} />
                <Typography variant="h6" sx={{ color: '#555', fontWeight: 600 }}>
                  Seu canvas
                </Typography>
                <Typography variant="body2" sx={{ color: '#444', maxWidth: 400 }}>
                  Descreve o que voce quer no chat e a imagem aparece aqui. Simples assim.
                </Typography>
              </Box>
            )}
          </Box>

          {/* Copy overlay — shows at bottom when copy exists */}
          {(copy.headline || copy.body || copy.cta) && (
            <Box sx={{ px: 3, py: 2, borderTop: '1px solid #333', bgcolor: '#111' }}>
              <Stack spacing={0.5}>
                {copy.headline && (
                  <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 700 }}>
                    {copy.headline}
                  </Typography>
                )}
                {copy.body && (
                  <Typography variant="body2" sx={{ color: '#ccc', lineHeight: 1.6 }}>
                    {copy.body}
                  </Typography>
                )}
                {copy.cta && (
                  <Chip label={copy.cta} size="small" sx={{ alignSelf: 'flex-start', mt: 0.5, bgcolor: EDRO_ORANGE, color: '#fff', fontWeight: 600, fontSize: '0.78rem' }} />
                )}
              </Stack>
            </Box>
          )}

          {/* Image variants strip */}
          {imageUrls.length > 1 && (
            <Box sx={{ display: 'flex', gap: 1, px: 2, py: 1.5, borderTop: '1px solid #333', overflowX: 'auto' }}>
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
    </AppShell>
  );
}
