'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Slide from '@mui/material/Slide';
import {
  IconSend, IconBrain, IconUser, IconPaperclip, IconX,
  IconFile, IconPlus, IconClockHour3, IconArrowsMinimize,
} from '@tabler/icons-react';
import { useJarvis } from '@/contexts/JarvisContext';
import { apiPost, apiGet } from '@/lib/api';
import ArtifactCard, { Artifact } from '@/components/jarvis/ArtifactCard';
import JarvisResponseTrace, { type JarvisObservability } from '@/components/jarvis/JarvisResponseTrace';
import ConversationList from '@/components/jarvis/ConversationList';
import AppShell from '@/components/AppShell';

type AttachedFile = { name: string; text: string; chars: number; is_audio?: boolean };
type ChatMessage = { role: 'user' | 'assistant'; content: string; timestamp: string; artifacts?: Artifact[]; observability?: JarvisObservability | null };
type ClientOption = { id: string; name: string };
type ConversationMemory = {
  id: string;
  source_type: string;
  title: string;
  excerpt: string;
  published_at?: string | null;
  metadata?: Record<string, any>;
};

const EDRO_ORANGE = '#E85219';

function formatMemoryLabel(sourceType: string) {
  switch (sourceType) {
    case 'whatsapp_message':
      return 'WhatsApp';
    case 'whatsapp_insight':
      return 'Insight';
    case 'whatsapp_digest':
      return 'Digest';
    case 'meeting':
      return 'Reunião';
    default:
      return 'Memória';
  }
}

function formatMemoryDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

// ── Typing dots ──────────────────────────────────────────────────────
function TypingDots() {
  return (
    <Box sx={{ display: 'flex', gap: 0.6, alignItems: 'center', py: 0.75, px: 0.5 }}>
      {[0, 1, 2].map(i => (
        <Box
          key={i}
          sx={{
            width: 8, height: 8, borderRadius: '50%', bgcolor: EDRO_ORANGE,
            animation: 'jarvisTyping 1.2s infinite ease-in-out',
            animationDelay: `${i * 0.18}s`,
            '@keyframes jarvisTyping': {
              '0%, 80%, 100%': { transform: 'scale(0.6)', opacity: 0.35 },
              '40%': { transform: 'scale(1)', opacity: 1 },
            },
          }}
        />
      ))}
    </Box>
  );
}

// ── Markdown renderer ────────────────────────────────────────────────
function renderInline(text: string): React.ReactNode[] {
  const tokens = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return tokens.map((token, i) => {
    if (token.startsWith('**') && token.endsWith('**') && token.length > 4)
      return <strong key={i}>{token.slice(2, -2)}</strong>;
    if (token.startsWith('*') && token.endsWith('*') && token.length > 2)
      return <em key={i}>{token.slice(1, -1)}</em>;
    if (token.startsWith('`') && token.endsWith('`') && token.length > 2)
      return (
        <Box key={i} component="code" sx={{ bgcolor: 'action.hover', px: 0.5, py: 0.1, borderRadius: 0.5, fontSize: '0.85rem', fontFamily: 'monospace' }}>
          {token.slice(1, -1)}
        </Box>
      );
    return token;
  });
}

function MarkdownText({ text }: { text: string }) {
  const lines = text.split('\n');
  const result: React.ReactNode[] = [];
  let listBuffer: { type: 'ul' | 'ol'; items: string[] } | null = null;

  const flushList = (key: string) => {
    if (!listBuffer) return;
    const { type, items } = listBuffer;
    result.push(
      <Box key={key} component={type} sx={{ pl: 2.5, my: 0.5 }}>
        {items.map((item, i) => (
          <Typography key={i} component="li" variant="body2" sx={{ fontSize: '0.88rem', lineHeight: 1.7 }}>
            {renderInline(item)}
          </Typography>
        ))}
      </Box>,
    );
    listBuffer = null;
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    const olMatch = trimmed.match(/^\d+\.\s+(.+)/);
    if (olMatch) {
      if (!listBuffer || listBuffer.type !== 'ol') { flushList(`pre-ol-${idx}`); listBuffer = { type: 'ol', items: [] }; }
      listBuffer.items.push(olMatch[1]);
      return;
    }
    if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
      if (!listBuffer || listBuffer.type !== 'ul') { flushList(`pre-ul-${idx}`); listBuffer = { type: 'ul', items: [] }; }
      listBuffer.items.push(trimmed.slice(2));
      return;
    }
    flushList(`flush-${idx}`);
    if (trimmed.startsWith('### ')) { result.push(<Typography key={idx} variant="body1" sx={{ fontWeight: 700, mt: 1, mb: 0.25 }}>{renderInline(trimmed.slice(4))}</Typography>); return; }
    if (trimmed.startsWith('## ')) { result.push(<Typography key={idx} variant="h6" sx={{ fontWeight: 700, mt: 1.5, mb: 0.25, fontSize: '1rem' }}>{renderInline(trimmed.slice(3))}</Typography>); return; }
    if (trimmed.startsWith('# ')) { result.push(<Typography key={idx} variant="h5" sx={{ fontWeight: 700, mt: 2, mb: 0.5, fontSize: '1.1rem' }}>{renderInline(trimmed.slice(2))}</Typography>); return; }
    if (!trimmed) { result.push(<Box key={idx} sx={{ height: 8 }} />); return; }
    result.push(
      <Typography key={idx} variant="body2" sx={{ fontSize: '0.88rem', lineHeight: 1.7 }}>
        {renderInline(line)}
      </Typography>,
    );
  });
  flushList('end');
  return <>{result}</>;
}

// ── Main ─────────────────────────────────────────────────────────────
export default function JarvisFullClient() {
  const router = useRouter();
  const { clientId, setClientId, clientName, conversationId, setConversationId, open: openDrawer } = useJarvis();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [conversationMemories, setConversationMemories] = useState<ConversationMemory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const clientIdRef = useRef(clientId);

  useEffect(() => { clientIdRef.current = clientId; }, [clientId]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages, loading]);

  // Load clients for selector
  useEffect(() => {
    apiGet<{ data?: any[] }>('/clients')
      .then(res => {
        const list = (res?.data ?? []).map((c: any) => ({ id: c.id, name: c.name }));
        setClients(list);
      })
      .catch(() => {});
  }, []);

  // Load conversation when conversationId changes
  useEffect(() => {
    if (!conversationId || !clientId) return;
    apiGet<{ data?: { conversation?: { messages?: any[] } } }>(
      `/clients/${clientId}/planning/conversations/${conversationId}`,
    ).then(res => {
      const msgs = res?.data?.conversation?.messages ?? [];
      setMessages(msgs.map((m: any) => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp ?? new Date().toISOString(),
        artifacts: Array.isArray(m.metadata?.artifacts) && m.metadata.artifacts.length ? m.metadata.artifacts : undefined,
        observability: m.metadata?.observability ?? null,
      })));
    }).catch(() => {});
  }, [conversationId, clientId]);

  useEffect(() => {
    if (!clientId) {
      setConversationMemories([]);
      return;
    }

    let cancelled = false;
    apiGet<{ memories?: ConversationMemory[] }>(`/clients/${clientId}/intelligence`)
      .then((response) => {
        if (cancelled) return;
        setConversationMemories((response?.memories ?? []).slice(0, 6));
      })
      .catch(() => {
        if (!cancelled) setConversationMemories([]);
      });

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length || !clientIdRef.current) return;
    e.target.value = '';
    setUploading(true);
    const results: AttachedFile[] = [];
    for (const file of Array.from(files)) {
      try {
        const form = new FormData();
        form.append('file', file);
        const res = await fetch(`/api/clients/${clientIdRef.current}/jarvis/upload`, {
          method: 'POST', body: form, credentials: 'include',
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        results.push({ name: data.filename, text: data.text, chars: data.chars });
      } catch (err: any) { console.error('[Jarvis] Upload failed:', err); }
    }
    if (results.length) setAttachedFiles(prev => [...prev, ...results]);
    setUploading(false);
  }, []);

  const removeAttachment = useCallback((idx: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const sendMessage = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim();
    const cid = clientIdRef.current;
    if (!msg || loading || !cid) return;

    const filesToSend = attachedFiles.slice();
    setInput('');
    setAttachedFiles([]);

    const displayContent = filesToSend.length ? `${msg}\n\n📎 ${filesToSend.map(f => f.name).join(', ')}` : msg;
    setMessages(prev => [...prev, { role: 'user', content: displayContent, timestamp: new Date().toISOString() }]);
    setLoading(true);

    try {
      const res = await apiPost<{ data?: { response?: string; conversationId?: string; artifacts?: Artifact[]; observability?: JarvisObservability } }>(
        '/jarvis/chat',
        {
          clientId: cid,
          message: msg,
          conversationId,
          context_page: '/jarvis',
          inline_attachments: filesToSend.length ? filesToSend.map(f => ({ name: f.name, text: f.text })) : undefined,
        },
      );
      const data = res?.data;
      setMessages(prev => [...prev, {
        role: 'assistant', content: data?.response ?? 'Sem resposta.', timestamp: new Date().toISOString(),
        artifacts: data?.artifacts?.length ? data.artifacts : undefined,
        observability: data?.observability ?? null,
      }]);
      if (data?.conversationId && !conversationId) setConversationId(data.conversationId);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Ocorreu um erro. Tente novamente.', timestamp: new Date().toISOString() }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, conversationId, setConversationId, attachedFiles]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleNewConversation = () => { setConversationId(null); setMessages([]); setShowHistory(false); };
  const handleSelectConversation = (conv: { id: string }) => { setConversationId(conv.id); setShowHistory(false); };

  const noClient = !clientId;

  const quickActions = [
    'Quais briefings estão em aberto?',
    'Mostra pendências por cliente',
    'Quais são as próximas datas relevantes?',
    'Recalcula a inteligência dos clientes',
    'Gera um brief estratégico para este mês',
    'Resumo do pipeline de hoje',
  ];

  return (
    <AppShell title="Jarvis">
      <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)', maxHeight: 'calc(100vh - 64px)', overflow: 'hidden' }}>

        {/* Sidebar — history */}
        <Slide direction="right" in={showHistory} mountOnEnter unmountOnExit>
          <Box sx={{
            width: 320, flexShrink: 0, borderRight: 1, borderColor: 'divider',
            bgcolor: 'background.paper', overflow: 'hidden',
          }}>
            <ConversationList
              clientId={clientId}
              onSelect={handleSelectConversation}
              onBack={() => setShowHistory(false)}
            />
          </Box>
        </Slide>

        {/* Main chat area */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

          {/* Top bar */}
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 2, px: 3, py: 1.5,
            borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper', flexShrink: 0,
          }}>
            <Avatar sx={{ width: 36, height: 36, bgcolor: EDRO_ORANGE }}>
              <IconBrain size={18} />
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                Jarvis{clientName ? ` · ${clientName}` : ''}
              </Typography>
              {conversationId && (
                <Typography variant="caption" color="text.disabled">Conversa ativa</Typography>
              )}
            </Box>

            {/* Client selector */}
            {clients.length > 0 && (
              <Select
                size="small"
                value={clientId ?? ''}
                onChange={e => { if (e.target.value) { setClientId(e.target.value); setMessages([]); setConversationId(null); } }}
                displayEmpty
                sx={{ minWidth: 200, fontSize: '0.82rem' }}
              >
                <MenuItem value="" disabled>Selecionar cliente</MenuItem>
                {clients.map(c => (
                  <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                ))}
              </Select>
            )}

            <Tooltip title="Nova conversa">
              <IconButton size="small" onClick={handleNewConversation} sx={{ color: 'text.secondary' }}>
                <IconPlus size={20} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Histórico">
              <IconButton
                size="small"
                onClick={() => setShowHistory(prev => !prev)}
                sx={{ color: showHistory ? EDRO_ORANGE : 'text.secondary' }}
              >
                <IconClockHour3 size={20} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Minimizar para drawer">
              <IconButton size="small" onClick={() => { openDrawer(); router.back(); }} sx={{ color: 'text.secondary' }}>
                <IconArrowsMinimize size={20} />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Messages */}
          <Box ref={scrollRef} sx={{
            flex: 1, overflowY: 'auto', px: { xs: 2, md: 6, lg: 10 }, py: 3,
            display: 'flex', flexDirection: 'column', gap: 2.5,
          }}>
            {!!clientId && conversationMemories.length > 0 && (
              <Box
                sx={{
                  maxWidth: 800,
                  width: '100%',
                  alignSelf: 'center',
                  p: 2,
                  borderRadius: 3,
                  border: 1,
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  boxShadow: 1,
                }}
              >
                <Typography variant="overline" sx={{ color: EDRO_ORANGE, fontWeight: 700, letterSpacing: '0.08em' }}>
                  Memoria do cliente
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  Historico recente de WhatsApp e reunioes usado pelo Jarvis nesta conversa.
                </Typography>
                <Box sx={{ display: 'grid', gap: 1 }}>
                  {conversationMemories.map((memory) => (
                    <Box
                      key={memory.id}
                      sx={{
                        p: 1.25,
                        borderRadius: 2,
                        bgcolor: 'background.default',
                        border: 1,
                        borderColor: 'divider',
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'center', mb: 0.5 }}>
                        <Chip
                          label={formatMemoryLabel(memory.source_type)}
                          size="small"
                          variant="outlined"
                          sx={{
                            height: 22,
                            fontSize: '0.7rem',
                            borderColor: `${EDRO_ORANGE}40`,
                            color: EDRO_ORANGE,
                          }}
                        />
                        <Typography variant="caption" color="text.disabled">
                          {formatMemoryDate(memory.published_at)}
                        </Typography>
                      </Box>
                      <Typography variant="subtitle2" sx={{ lineHeight: 1.35, mb: 0.25 }}>
                        {memory.title || 'Memoria sem titulo'}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          lineHeight: 1.55,
                        }}
                      >
                        {memory.excerpt || 'Sem resumo disponivel.'}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {/* Empty state */}
            {messages.length === 0 && !loading && (
              <Box sx={{ textAlign: 'center', pt: 8 }}>
                <Box sx={{ display: 'inline-flex', p: 3, borderRadius: '50%', bgcolor: `${EDRO_ORANGE}12`, mb: 3 }}>
                  <IconBrain size={48} style={{ color: EDRO_ORANGE }} />
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                  {clientName ? `Jarvis · ${clientName}` : 'Jarvis'}
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  {noClient ? 'Selecione um cliente acima para começar.' : 'O que fazemos hoje?'}
                </Typography>

                {!noClient && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', maxWidth: 600, mx: 'auto' }}>
                    {quickActions.map(qa => (
                      <Chip
                        key={qa}
                        label={qa}
                        variant="outlined"
                        clickable
                        onClick={() => sendMessage(qa)}
                        sx={{
                          fontSize: '0.8rem', py: 0.5, cursor: 'pointer',
                          borderColor: `${EDRO_ORANGE}40`, color: 'text.secondary',
                          '&:hover': { borderColor: EDRO_ORANGE, color: EDRO_ORANGE },
                        }}
                      />
                    ))}
                  </Box>
                )}
              </Box>
            )}

            {/* Message bubbles */}
            {messages.map((msg, i) => (
              <Box
                key={i}
                sx={{
                  display: 'flex', gap: 2, alignItems: 'flex-start',
                  flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                  maxWidth: 800, alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  width: '100%',
                }}
              >
                <Avatar sx={{
                  width: 34, height: 34, flexShrink: 0, fontSize: '0.75rem', fontWeight: 700,
                  bgcolor: msg.role === 'user' ? 'primary.main' : EDRO_ORANGE,
                }}>
                  {msg.role === 'user' ? <IconUser size={16} /> : <IconBrain size={16} />}
                </Avatar>
                <Box sx={{ maxWidth: '90%', minWidth: 0 }}>
                  <Box sx={{
                    px: 2, py: 1.5,
                    borderRadius: msg.role === 'user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                    bgcolor: msg.role === 'user' ? 'primary.main' : 'background.paper',
                    color: msg.role === 'user' ? '#fff' : 'text.primary',
                    border: msg.role === 'assistant' ? 1 : 0,
                    borderColor: 'divider',
                    boxShadow: msg.role === 'assistant' ? 1 : 0,
                  }}>
                    {msg.role === 'user' ? (
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, fontSize: '0.88rem' }}>
                        {msg.content}
                      </Typography>
                    ) : (
                      <MarkdownText text={msg.content} />
                    )}
                  </Box>
                  {msg.role === 'assistant' ? <JarvisResponseTrace observability={msg.observability} /> : null}
                  {msg.artifacts?.map((artifact, ai) => (
                    <ArtifactCard key={ai} artifact={artifact} clientId={clientId} />
                  ))}
                </Box>
              </Box>
            ))}

            {/* Loading */}
            {loading && (
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', maxWidth: 800 }}>
                <Avatar sx={{ width: 34, height: 34, bgcolor: EDRO_ORANGE }}>
                  <IconBrain size={16} />
                </Avatar>
                <Box sx={{ px: 2, py: 1, borderRadius: '4px 16px 16px 16px', bgcolor: 'background.paper', border: 1, borderColor: 'divider' }}>
                  <TypingDots />
                </Box>
              </Box>
            )}
          </Box>

          {/* Input area */}
          <Box sx={{ px: { xs: 2, md: 6, lg: 10 }, py: 2, borderTop: 1, borderColor: 'divider', flexShrink: 0, bgcolor: 'background.paper' }}>
            {attachedFiles.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                {attachedFiles.map((f, i) => (
                  <Chip
                    key={i}
                    icon={<IconFile size={14} />}
                    label={f.name.length > 30 ? f.name.slice(0, 28) + '…' : f.name}
                    size="small"
                    onDelete={() => removeAttachment(i)}
                    deleteIcon={<IconX size={12} />}
                    sx={{ fontSize: '0.75rem', bgcolor: `${EDRO_ORANGE}15`, borderColor: `${EDRO_ORANGE}40`, border: 1 }}
                  />
                ))}
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-end', maxWidth: 800, mx: 'auto' }}>
              <Box component="label" sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.doc,.txt,.md,.csv,.mp3,.mp4,.m4a,.wav,.ogg,.webm"
                  multiple
                  title="Anexar arquivo"
                  aria-label="Anexar arquivo"
                  tabIndex={-1}
                  onChange={handleFileChange}
                />
              </Box>

              <Tooltip title="Anexar arquivo">
                <span>
                  <IconButton
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading || noClient || uploading}
                    sx={{ color: 'text.secondary', '&:hover': { color: EDRO_ORANGE } }}
                  >
                    {uploading ? <CircularProgress size={18} sx={{ color: EDRO_ORANGE }} /> : <IconPaperclip size={20} />}
                  </IconButton>
                </span>
              </Tooltip>

              <TextField
                fullWidth
                multiline
                maxRows={6}
                size="small"
                placeholder={noClient ? 'Selecione um cliente para começar…' : 'Mensagem para o Jarvis…'}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading || noClient}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3, fontSize: '0.9rem',
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: EDRO_ORANGE },
                  },
                }}
              />

              <IconButton
                onClick={() => sendMessage()}
                disabled={loading || (!input.trim() && !attachedFiles.length) || noClient}
                sx={{
                  bgcolor: EDRO_ORANGE, color: '#fff', width: 42, height: 42, flexShrink: 0,
                  '&:hover': { bgcolor: '#c94215' },
                  '&.Mui-disabled': { bgcolor: 'action.disabledBackground' },
                }}
              >
                <IconSend size={18} />
              </IconButton>
            </Box>
          </Box>
        </Box>
      </Box>
    </AppShell>
  );
}
