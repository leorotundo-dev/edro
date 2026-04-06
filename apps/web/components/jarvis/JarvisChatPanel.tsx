'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import { IconSend, IconBrain, IconUser, IconPaperclip, IconX, IconFile } from '@tabler/icons-react';
import { useJarvis } from '@/contexts/JarvisContext';
import { apiPost, apiGet } from '@/lib/api';
import ArtifactCard, { Artifact } from './ArtifactCard';
import { collectPendingBackgroundJobIds, mergeBackgroundArtifactUpdate } from './backgroundArtifacts';
import JarvisResponseTrace, { type JarvisObservability } from './JarvisResponseTrace';

type AttachedFile = {
  name: string;
  text: string;
  chars: number;
  is_audio?: boolean;
};

const EDRO_ORANGE = '#E85219';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  artifacts?: Artifact[];
  observability?: JarvisObservability | null;
};

// ── Typing animation ─────────────────────────────────────────────────

function TypingDots() {
  return (
    <Box sx={{ display: 'flex', gap: 0.6, alignItems: 'center', py: 0.75, px: 0.5 }}>
      {[0, 1, 2].map(i => (
        <Box
          key={i}
          sx={{
            width: 7, height: 7, borderRadius: '50%', bgcolor: EDRO_ORANGE,
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
        <Box key={i} component="code" sx={{ bgcolor: 'action.hover', px: 0.5, py: 0.1, borderRadius: 0.5, fontSize: '0.76rem', fontFamily: 'monospace' }}>
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
          <Typography key={i} component="li" variant="body2" sx={{ fontSize: '0.82rem', lineHeight: 1.6 }}>
            {renderInline(item)}
          </Typography>
        ))}
      </Box>
    );
    listBuffer = null;
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Ordered list
    const olMatch = trimmed.match(/^\d+\.\s+(.+)/);
    if (olMatch) {
      if (!listBuffer || listBuffer.type !== 'ol') { flushList(`pre-ol-${idx}`); listBuffer = { type: 'ol', items: [] }; }
      listBuffer.items.push(olMatch[1]);
      return;
    }

    // Bullet list
    if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
      if (!listBuffer || listBuffer.type !== 'ul') { flushList(`pre-ul-${idx}`); listBuffer = { type: 'ul', items: [] }; }
      listBuffer.items.push(trimmed.slice(2));
      return;
    }

    flushList(`flush-${idx}`);

    if (trimmed.startsWith('### ')) {
      result.push(<Typography key={idx} variant="body2" sx={{ fontWeight: 700, mt: 0.75, mb: 0.25 }}>{renderInline(trimmed.slice(4))}</Typography>);
      return;
    }
    if (trimmed.startsWith('## ')) {
      result.push(<Typography key={idx} variant="subtitle2" sx={{ fontWeight: 700, mt: 1, mb: 0.25 }}>{renderInline(trimmed.slice(3))}</Typography>);
      return;
    }
    if (trimmed.startsWith('# ')) {
      result.push(<Typography key={idx} variant="subtitle1" sx={{ fontWeight: 700, mt: 1.5, mb: 0.5 }}>{renderInline(trimmed.slice(2))}</Typography>);
      return;
    }
    if (!trimmed) {
      result.push(<Box key={idx} sx={{ height: 6 }} />);
      return;
    }

    result.push(
      <Typography key={idx} variant="body2" sx={{ fontSize: '0.82rem', lineHeight: 1.6 }}>
        {renderInline(line)}
      </Typography>
    );
  });

  flushList('end');
  return <>{result}</>;
}

// ── Context-aware quick actions ───────────────────────────────────────

function getQuickActions(pathname: string, hasClient: boolean): string[] {
  if (pathname.includes('/studio/brief')) {
    return [
      'Sugere um título impactante para este brief',
      'Qual o melhor AMD e momento de consciência?',
      'Escreve a mensagem central em 3 linhas',
      'Recomenda tom de voz para este cliente',
    ];
  }
  if (pathname.includes('/studio/editor')) {
    return [
      'Refina o copy atual para ser mais persuasivo',
      'Cria uma versão mais curta e direta',
      'Adapta o texto para LinkedIn',
      'Sugere um CTA mais forte',
    ];
  }
  if (pathname.includes('/studio')) {
    return [
      'Cria um briefing para o próximo evento',
      'Sugere pautas de alto impacto',
      'Quais briefings estão pendentes de produção?',
    ];
  }
  if (hasClient && pathname.includes('/clients/')) {
    return [
      'Quais briefings estão em aberto?',
      'Gera um brief estratégico para este mês',
      'Analisa oportunidades e riscos',
      'Quais pautas estão pendentes?',
    ];
  }
  if (pathname.includes('/calendar')) {
    return [
      'Quais são os melhores eventos do mês?',
      'Sugere pautas para as próximas semanas',
      'Cria briefings para os Tier A desta semana',
    ];
  }
  if (pathname.includes('/edro')) {
    return [
      'Mostra briefings atrasados',
      'Quais estão aguardando aprovação?',
      'Resumo do pipeline de hoje',
    ];
  }
  return [
    'Quais briefings estão em aberto?',
    'Mostra pendências por cliente',
    'Quais são as próximas datas relevantes?',
    'Recalcula a inteligência dos clientes',
  ];
}

// ── Main component ────────────────────────────────────────────────────

export default function JarvisChatPanel() {
  const { clientId, setClientId, clientName, conversationId, setConversationId, bump, isOpen, pendingMessage, clearPendingMessage, pageData } = useJarvis();
  const pathname = usePathname();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keep a ref to always have the latest clientId (avoids stale closures in event handlers)
  const clientIdRef = useRef(clientId);
  useEffect(() => { clientIdRef.current = clientId; }, [clientId]);

  // Auto-scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    const pendingJobIds = collectPendingBackgroundJobIds(messages);
    if (!pendingJobIds.length) return;

    let cancelled = false;
    const poll = async () => {
      const responses = await Promise.all(
        pendingJobIds.map((jobId) =>
          apiGet<{ data?: { artifact?: Artifact | null } }>(`/jarvis/background-jobs/${jobId}`).catch(() => null),
        ),
      );

      if (cancelled) return;
      setMessages((prev) => {
        let next = prev;
        for (const response of responses) {
          const artifact = response?.data?.artifact;
          if (!artifact) continue;
          next = mergeBackgroundArtifactUpdate(next, artifact);
        }
        return next;
      });
    };

    void poll();
    const intervalId = window.setInterval(() => void poll(), 5000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [messages]);

  // Load conversation when conversationId changes externally
  useEffect(() => {
    if (!conversationId || !clientId) return;
    apiGet<{ data?: { conversation?: { messages?: any[] } } }>(
      `/clients/${clientId}/planning/conversations/${conversationId}`
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

  // Auto-send message from command palette when drawer opens
  useEffect(() => {
    if (isOpen && pendingMessage) {
      clearPendingMessage();
      // Small delay so the drawer is fully rendered before sending
      const timer = setTimeout(() => sendMessage(pendingMessage), 120);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, pendingMessage]);

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
          method: 'POST',
          body: form,
          credentials: 'include',
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        results.push({ name: data.filename, text: data.text, chars: data.chars });
      } catch (err: any) {
        console.error('[Jarvis] Upload failed:', err);
      }
    }
    if (results.length) setAttachedFiles(prev => [...prev, ...results]);
    setUploading(false);
  }, []);

  const removeAttachment = useCallback((idx: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const sendMessage = useCallback(async (text?: string, clientIdOverride?: string) => {
    const msg = (text ?? input).trim();
    const contextualClientId = typeof pageData?.clientId === 'string' ? pageData.clientId : null;
    const cid = clientIdOverride ?? contextualClientId ?? clientIdRef.current ?? null;
    if (!msg || loading) return;

    if (cid && cid !== clientIdRef.current) {
      clientIdRef.current = cid;
      setClientId(cid);
    }

    const filesToSend = attachedFiles.slice();
    setInput('');
    setAttachedFiles([]);

    // Build user display message
    const displayContent = filesToSend.length
      ? `${msg}\n\n📎 ${filesToSend.map(f => f.name).join(', ')}`
      : msg;
    setMessages(prev => [...prev, { role: 'user', content: displayContent, timestamp: new Date().toISOString() }]);
    setLoading(true);

    try {
      // Inject studio context when on studio pages
      let studioContext: string | undefined;
      if (pathname?.includes('/studio/')) {
        try {
          const raw = localStorage.getItem('edro_studio_context');
          if (raw) studioContext = raw;
        } catch { /* ignore */ }
      }

      const res = await apiPost<{ data?: { response?: string; conversationId?: string; artifacts?: Artifact[]; observability?: JarvisObservability } }>(
        '/jarvis/chat',
        {
          clientId: cid,
          message: msg,
          conversationId,
          context_page: pathname,
          studio_context: studioContext,
          page_data: pageData ?? undefined,
          inline_attachments: filesToSend.length ? filesToSend.map(f => ({ name: f.name, text: f.text })) : undefined,
        }
      );

      const data = res?.data;
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data?.response ?? 'Sem resposta.',
        timestamp: new Date().toISOString(),
        artifacts: data?.artifacts?.length ? data.artifacts : undefined,
        observability: data?.observability ?? null,
      }]);

      if (data?.conversationId && !conversationId) setConversationId(data.conversationId);
      if (!isOpen) bump();
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Ocorreu um erro. Tente novamente.',
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, conversationId, pathname, setConversationId, isOpen, bump, pageData, setClientId]);

  // Keep a ref to always call the latest sendMessage from event handlers
  const sendMessageRef = useRef(sendMessage);
  useEffect(() => { sendMessageRef.current = sendMessage; }, [sendMessage]);

  // Listen for home page send events and studio send events
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail ?? {};
      const msg = detail.message as string | undefined;
      const evtClientId = detail.clientId as string | undefined;
      // Override clientIdRef immediately so sendMessage uses the right client
      if (evtClientId) {
        clientIdRef.current = evtClientId;
        setClientId(evtClientId);
      }
      if (msg) sendMessageRef.current(msg, evtClientId);
    };
    window.addEventListener('jarvis-home-send', handler);
    window.addEventListener('jarvis-studio-send', handler);
    return () => {
      window.removeEventListener('jarvis-home-send', handler);
      window.removeEventListener('jarvis-studio-send', handler);
    };
  }, [setClientId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const noClient = !clientId;
  const quickActions = getQuickActions(pathname ?? '', !noClient);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>

      {/* Messages */}
      <Box ref={scrollRef} sx={{ flex: 1, overflowY: 'auto', px: 2, py: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {messages.length === 0 && !loading && (
          <Box sx={{ textAlign: 'center', pt: 2 }}>
            <Box sx={{ display: 'inline-flex', p: 2, borderRadius: '50%', bgcolor: `${EDRO_ORANGE}15`, mb: 2 }}>
              <IconBrain size={32} style={{ color: EDRO_ORANGE }} />
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
              {clientName ? `Jarvis · ${clientName}` : 'Jarvis'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {noClient ? 'Navegue até um cliente para começar.' : 'O que fazemos hoje?'}
            </Typography>

            {!noClient && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, justifyContent: 'center', mt: 2 }}>
                {quickActions.map(qa => (
                  <Chip
                    key={qa}
                    label={qa}
                    size="small"
                    variant="outlined"
                    clickable
                    onClick={() => sendMessage(qa)}
                    sx={{ fontSize: '0.68rem', cursor: 'pointer', borderColor: `${EDRO_ORANGE}40`, color: 'text.secondary', '&:hover': { borderColor: EDRO_ORANGE, color: EDRO_ORANGE } }}
                  />
                ))}
              </Box>
            )}
          </Box>
        )}

        {messages.map((msg, i) => (
          <Box key={i} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
            <Avatar sx={{ width: 28, height: 28, flexShrink: 0, fontSize: '0.7rem', fontWeight: 700, bgcolor: msg.role === 'user' ? 'primary.main' : EDRO_ORANGE }}>
              {msg.role === 'user' ? <IconUser size={14} /> : <IconBrain size={14} />}
            </Avatar>
            <Box sx={{ maxWidth: '85%', minWidth: 0 }}>
              <Box
                sx={{
                  px: 1.5, py: 1,
                  borderRadius: msg.role === 'user' ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
                  bgcolor: msg.role === 'user' ? 'primary.main' : 'background.paper',
                  color: msg.role === 'user' ? '#fff' : 'text.primary',
                  border: msg.role === 'assistant' ? 1 : 0,
                  borderColor: 'divider',
                  boxShadow: msg.role === 'assistant' ? 1 : 0,
                }}
              >
                {msg.role === 'user' ? (
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: '0.82rem' }}>
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

        {loading && (
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
            <Avatar sx={{ width: 28, height: 28, bgcolor: EDRO_ORANGE }}>
              <IconBrain size={14} />
            </Avatar>
            <Box sx={{ px: 1.5, py: 0.5, borderRadius: '4px 12px 12px 12px', bgcolor: 'background.paper', border: 1, borderColor: 'divider' }}>
              <TypingDots />
            </Box>
          </Box>
        )}
      </Box>

      {/* Input */}
      <Box sx={{ px: 2, py: 1.5, borderTop: 1, borderColor: 'divider', flexShrink: 0 }}>
        {/* Attached file chips */}
        {attachedFiles.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
            {attachedFiles.map((f, i) => (
              <Chip
                key={i}
                icon={<IconFile size={12} />}
                label={f.name.length > 24 ? f.name.slice(0, 22) + '…' : f.name}
                size="small"
                onDelete={() => removeAttachment(i)}
                deleteIcon={<IconX size={12} />}
                sx={{ fontSize: '0.7rem', bgcolor: `${EDRO_ORANGE}15`, borderColor: `${EDRO_ORANGE}40`, border: 1 }}
              />
            ))}
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
          {/* Hidden file input — visually hidden, triggered by paperclip button */}
          <Box component="label" aria-hidden="true" sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.doc,.txt,.md,.csv,.mp3,.mp4,.m4a,.wav,.ogg,.webm"
              multiple
              title="Anexar arquivo ao Jarvis"
              aria-label="Anexar arquivo ao Jarvis"
              tabIndex={-1}
              onChange={handleFileChange}
            />
          </Box>

          {/* Paperclip button */}
          <Tooltip title="Anexar arquivo (PDF, DOCX, TXT, MP3, M4A, WAV…)">
            <span>
              <IconButton
                onClick={() => fileInputRef.current?.click()}
                disabled={loading || noClient || uploading}
                size="small"
                sx={{ color: 'text.secondary', flexShrink: 0, '&:hover': { color: EDRO_ORANGE } }}
              >
                {uploading ? <CircularProgress size={16} sx={{ color: EDRO_ORANGE }} /> : <IconPaperclip size={18} />}
              </IconButton>
            </span>
          </Tooltip>

          <TextField
            fullWidth
            multiline
            maxRows={4}
            size="small"
            placeholder={noClient ? 'Selecione um cliente para começar…' : 'Mensagem para o Jarvis…'}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading || noClient}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 3,
                fontSize: '0.82rem',
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: EDRO_ORANGE },
              },
            }}
          />
          <IconButton
            onClick={() => sendMessage()}
            disabled={loading || (!input.trim() && !attachedFiles.length) || noClient}
            sx={{
              bgcolor: EDRO_ORANGE, color: '#fff', width: 36, height: 36, flexShrink: 0,
              '&:hover': { bgcolor: '#c94215' },
              '&.Mui-disabled': { bgcolor: 'action.disabledBackground' },
            }}
          >
            <IconSend size={16} />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
}
