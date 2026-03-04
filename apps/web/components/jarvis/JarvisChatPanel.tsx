'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import { IconSend, IconBrain, IconUser } from '@tabler/icons-react';
import { useJarvis } from '@/contexts/JarvisContext';
import { apiPost, apiGet } from '@/lib/api';
import ArtifactCard, { Artifact } from './ArtifactCard';

const EDRO_ORANGE = '#E85219';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  artifacts?: Artifact[];
};

const QUICK_ACTIONS = [
  'Quais briefings estão em aberto?',
  'Gera um brief estratégico deste mês',
  'Quais pautas estão pendentes?',
  'Analisa a inteligência do cliente',
];

export default function JarvisChatPanel() {
  const { clientId, conversationId, setConversationId, bump, isOpen } = useJarvis();
  const pathname = usePathname();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [clientName, setClientName] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load client name
  useEffect(() => {
    if (!clientId) { setClientName(null); return; }
    apiGet<{ data?: { client?: { name?: string }; name?: string } }>(`/clients/${clientId}`)
      .then(res => {
        const name = res?.data?.client?.name ?? res?.data?.name ?? null;
        setClientName(name);
      })
      .catch(() => {});
  }, [clientId]);

  // Auto-scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  // Listen for home page send events
  useEffect(() => {
    const handler = (e: Event) => {
      const msg = (e as CustomEvent).detail?.message as string;
      if (msg) sendMessage(msg);
    };
    window.addEventListener('jarvis-home-send', handler);
    return () => window.removeEventListener('jarvis-home-send', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When conversationId changes externally (loading old convo), load messages
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
      })));
    }).catch(() => {});
  }, [conversationId, clientId]);

  const sendMessage = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading || !clientId) return;

    setInput('');
    const userMsg: ChatMessage = { role: 'user', content: msg, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await apiPost<{ data?: { response?: string; conversationId?: string; artifacts?: Artifact[] } }>(
        `/clients/${clientId}/planning/chat`,
        { message: msg, conversationId, mode: 'agent', context_page: pathname }
      );

      const data = res?.data;
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: data?.response ?? 'Sem resposta.',
        timestamp: new Date().toISOString(),
        artifacts: data?.artifacts?.length ? data.artifacts : undefined,
      };

      setMessages(prev => [...prev, assistantMsg]);

      if (data?.conversationId && !conversationId) {
        setConversationId(data.conversationId);
      }

      // Bump unread if drawer was closed while waiting (unlikely but safe)
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
  }, [input, loading, clientId, conversationId, pathname, setConversationId, isOpen, bump]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const noClient = !clientId;

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
              {noClient
                ? 'Navegue até um cliente para começar.'
                : 'O que fazemos hoje?'}
            </Typography>

            {/* Quick actions */}
            {!noClient && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, justifyContent: 'center', mt: 2 }}>
                {QUICK_ACTIONS.map(qa => (
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
            <Avatar
              sx={{
                width: 28, height: 28, flexShrink: 0, fontSize: '0.7rem', fontWeight: 700,
                bgcolor: msg.role === 'user' ? 'primary.main' : EDRO_ORANGE,
              }}
            >
              {msg.role === 'user' ? <IconUser size={14} /> : <IconBrain size={14} />}
            </Avatar>
            <Box sx={{ maxWidth: '80%', minWidth: 0 }}>
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
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: '0.82rem' }}>
                  {msg.content}
                </Typography>
              </Box>
              {/* Artifacts */}
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
            <Box sx={{ px: 1.5, py: 1, borderRadius: '4px 12px 12px 12px', bgcolor: 'background.paper', border: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={12} sx={{ color: EDRO_ORANGE }} />
              <Typography variant="caption" color="text.secondary">Pensando…</Typography>
            </Box>
          </Box>
        )}
      </Box>

      {/* Input */}
      <Box sx={{ px: 2, py: 1.5, borderTop: 1, borderColor: 'divider', flexShrink: 0 }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
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
            disabled={loading || !input.trim() || noClient}
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
