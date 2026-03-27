'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Drawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';
import { IconSend, IconBrain, IconUser, IconX, IconPlus } from '@tabler/icons-react';
import { apiPost } from '@/lib/api';

const EDRO_ORANGE = '#E85219';
const DRAWER_WIDTH = 440;

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
};

const QUICK_ACTIONS = [
  'O que tá pegando fogo?',
  'Jobs sem responsável',
  'Quem tá sobrecarregado?',
  'Riscos da semana',
  'Resumo da operação',
];

// ── Inline markdown renderer ───────────────────────────────

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
      </Box>,
    );
    listBuffer = null;
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    const olMatch = trimmed.match(/^\d+\.\s+(.+)/);
    if (olMatch) {
      if (!listBuffer || listBuffer.type !== 'ol') { flushList(`f-${idx}`); listBuffer = { type: 'ol', items: [] }; }
      listBuffer.items.push(olMatch[1]);
      return;
    }
    const ulMatch = trimmed.match(/^[-*]\s+(.+)/);
    if (ulMatch) {
      if (!listBuffer || listBuffer.type !== 'ul') { flushList(`f-${idx}`); listBuffer = { type: 'ul', items: [] }; }
      listBuffer.items.push(ulMatch[1]);
      return;
    }
    flushList(`f-${idx}`);
    if (!trimmed) { result.push(<Box key={idx} sx={{ height: 6 }} />); return; }
    if (trimmed.startsWith('### ')) {
      result.push(<Typography key={idx} variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.84rem', mt: 1 }}>{renderInline(trimmed.slice(4))}</Typography>);
    } else if (trimmed.startsWith('## ')) {
      result.push(<Typography key={idx} variant="subtitle1" sx={{ fontWeight: 800, fontSize: '0.88rem', mt: 1.5 }}>{renderInline(trimmed.slice(3))}</Typography>);
    } else if (trimmed.startsWith('# ')) {
      result.push(<Typography key={idx} variant="h6" sx={{ fontWeight: 800, fontSize: '0.92rem', mt: 1.5 }}>{renderInline(trimmed.slice(2))}</Typography>);
    } else if (/^[-━═─]{3,}$/.test(trimmed)) {
      result.push(<Divider key={idx} sx={{ my: 1 }} />);
    } else {
      result.push(<Typography key={idx} variant="body2" sx={{ fontSize: '0.82rem', lineHeight: 1.6 }}>{renderInline(trimmed)}</Typography>);
    }
  });
  flushList('end');
  return <>{result}</>;
}

// ── Typing dots ──────────────────────────────────────────────

function TypingDots() {
  return (
    <Box sx={{ display: 'flex', gap: 0.6, alignItems: 'center', py: 0.75, px: 0.5 }}>
      {[0, 1, 2].map(i => (
        <Box
          key={i}
          sx={{
            width: 7, height: 7, borderRadius: '50%', bgcolor: EDRO_ORANGE,
            animation: 'opsJarvisTyping 1.2s infinite ease-in-out',
            animationDelay: `${i * 0.18}s`,
            '@keyframes opsJarvisTyping': {
              '0%, 80%, 100%': { transform: 'scale(0.6)', opacity: 0.35 },
              '40%': { transform: 'scale(1)', opacity: 1 },
            },
          }}
        />
      ))}
    </Box>
  );
}

// ── Main Component ───────────────────────────────────────────

export default function OperationsJarvisDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  // Listen for operations jarvis commands from the shell command bar
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail ?? {};
      const msg = detail.message as string | undefined;
      if (msg) sendMessage(msg);
    };
    window.addEventListener('jarvis-ops-send', handler);
    return () => window.removeEventListener('jarvis-ops-send', handler);
  });

  const sendMessage = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: msg, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await apiPost<{ data?: { response?: string; conversationId?: string } }>(
        '/jarvis/chat',
        { message: msg, conversationId, context_page: '/admin/operacoes' },
      );

      const reply = res?.data?.response || 'Sem resposta do agente.';
      if (res?.data?.conversationId) setConversationId(res.data.conversationId);

      setMessages(prev => [...prev, { role: 'assistant', content: reply, timestamp: new Date().toISOString() }]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `Erro: ${err?.message || 'Falha na comunicação.'}`, timestamp: new Date().toISOString() },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, conversationId]);

  const handleNewConversation = () => {
    setMessages([]);
    setConversationId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      variant="temporary"
      ModalProps={{ keepMounted: true }}
      PaperProps={{
        sx: {
          width: { xs: '100vw', sm: DRAWER_WIDTH },
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.default',
          borderLeft: 1,
          borderColor: 'divider',
          overflow: 'hidden',
        },
      }}
      sx={{ zIndex: 1300 }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 2,
          py: 1.5,
          borderBottom: 1,
          borderColor: 'divider',
          flexShrink: 0,
          bgcolor: 'background.paper',
        }}
      >
        <Avatar sx={{ width: 32, height: 32, bgcolor: EDRO_ORANGE, fontSize: '0.75rem', fontWeight: 700 }}>
          <IconBrain size={16} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            Jarvis · Operações
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
            Controle total da central
          </Typography>
        </Box>
        <Tooltip title="Nova conversa">
          <IconButton size="small" onClick={handleNewConversation} sx={{ color: 'text.secondary' }}>
            <IconPlus size={18} />
          </IconButton>
        </Tooltip>
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
        <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary' }}>
          <IconX size={18} />
        </IconButton>
      </Box>

      {/* Messages area */}
      <Box
        ref={scrollRef}
        sx={{
          flex: 1,
          overflowY: 'auto',
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
        }}
      >
        {messages.length === 0 && !loading && (
          <Box sx={{ textAlign: 'center', mt: 6 }}>
            <Avatar sx={{ width: 48, height: 48, bgcolor: EDRO_ORANGE, mx: 'auto', mb: 1.5 }}>
              <IconBrain size={24} />
            </Avatar>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
              Jarvis Operações
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', mb: 2.5 }}>
              Peça qualquer coisa: mover jobs, atribuir responsáveis, ver riscos, criar demandas...
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, justifyContent: 'center' }}>
              {QUICK_ACTIONS.map(qa => (
                <Chip
                  key={qa}
                  label={qa}
                  size="small"
                  variant="outlined"
                  clickable
                  onClick={() => sendMessage(qa)}
                  sx={{
                    fontSize: '0.7rem',
                    cursor: 'pointer',
                    borderColor: `${EDRO_ORANGE}40`,
                    color: 'text.secondary',
                    '&:hover': { borderColor: EDRO_ORANGE, color: EDRO_ORANGE },
                  }}
                />
              ))}
            </Box>
          </Box>
        )}

        {messages.map((msg, i) => (
          <Box
            key={i}
            sx={{
              display: 'flex',
              gap: 1,
              alignItems: 'flex-start',
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
            }}
          >
            <Avatar
              sx={{
                width: 28,
                height: 28,
                bgcolor: msg.role === 'assistant' ? EDRO_ORANGE : 'primary.main',
                flexShrink: 0,
                mt: 0.3,
              }}
            >
              {msg.role === 'assistant' ? <IconBrain size={14} /> : <IconUser size={14} />}
            </Avatar>
            <Box
              sx={{
                maxWidth: '82%',
                bgcolor: msg.role === 'user' ? 'primary.main' : 'background.paper',
                color: msg.role === 'user' ? '#fff' : 'text.primary',
                px: 1.5,
                py: 1,
                borderRadius: 2,
                borderTopRightRadius: msg.role === 'user' ? 4 : undefined,
                borderTopLeftRadius: msg.role === 'assistant' ? 4 : undefined,
                border: msg.role === 'assistant' ? 1 : 0,
                borderColor: 'divider',
              }}
            >
              {msg.role === 'assistant' ? (
                <MarkdownText text={msg.content} />
              ) : (
                <Typography variant="body2" sx={{ fontSize: '0.82rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {msg.content}
                </Typography>
              )}
            </Box>
          </Box>
        ))}

        {loading && (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
            <Avatar sx={{ width: 28, height: 28, bgcolor: EDRO_ORANGE, flexShrink: 0, mt: 0.3 }}>
              <IconBrain size={14} />
            </Avatar>
            <Box sx={{ bgcolor: 'background.paper', px: 1.5, py: 1, borderRadius: 2, borderTopLeftRadius: 4, border: 1, borderColor: 'divider' }}>
              <TypingDots />
            </Box>
          </Box>
        )}
      </Box>

      {/* Input area */}
      <Box
        sx={{
          p: 1.5,
          borderTop: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          display: 'flex',
          gap: 1,
          alignItems: 'flex-end',
        }}
      >
        <TextField
          fullWidth
          multiline
          maxRows={4}
          size="small"
          placeholder="Mensagem para Jarvis Operações…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          sx={{
            '& .MuiOutlinedInput-root': {
              fontSize: '0.82rem',
              borderRadius: 2,
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: EDRO_ORANGE },
            },
          }}
        />
        <IconButton
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          sx={{
            bgcolor: EDRO_ORANGE,
            color: '#fff',
            width: 36,
            height: 36,
            flexShrink: 0,
            '&:hover': { bgcolor: '#c94215' },
            '&.Mui-disabled': { bgcolor: 'action.disabledBackground' },
          }}
        >
          {loading ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <IconSend size={16} />}
        </IconButton>
      </Box>
    </Drawer>
  );
}
