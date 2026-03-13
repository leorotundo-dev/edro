'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import Divider from '@mui/material/Divider';
import Avatar from '@mui/material/Avatar';
import { alpha } from '@mui/material/styles';
import Link from 'next/link';
import { IconBrain, IconSend, IconMessage } from '@tabler/icons-react';
import { useJarvis } from '@/contexts/JarvisContext';
import { apiGet } from '@/lib/api';

const EDRO_ORANGE = '#E85219';

type RecentConversation = {
  id: string;
  title: string;
  updated_at: string;
  client_name?: string;
  client_text_id?: string;
  message_count: string;
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min}min atrás`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h atrás`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function initials(name?: string) {
  return String(name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || '?';
}

const QUICK_ACTIONS = [
  'Quais briefings estão em aberto?',
  'Gera o brief estratégico do mês',
  'Quais são as oportunidades ativas?',
  'Recalcula a inteligência dos clientes',
];

export default function JarvisHomeSection() {
  const { open, setConversationId, clientId } = useJarvis();
  const [input, setInput] = useState('');
  const [conversations, setConversations] = useState<RecentConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('edro_user') || '{}');
      setUserName(u?.name?.split(' ')[0] ?? u?.email?.split('@')[0] ?? null);
    } catch {}
  }, []);

  useEffect(() => {
    apiGet<{ data?: { conversations?: RecentConversation[] } }>('/planning/conversations?limit=5')
      .then(res => setConversations(res?.data?.conversations ?? []))
      .catch(() => setConversations([]))
      .finally(() => setLoading(false));
  }, []);

  const handleSend = (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg) return;
    setInput('');
    setConversationId(null);
    open(clientId ?? undefined);
    // Small delay to let drawer open, then trigger message via custom event
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('jarvis-home-send', { detail: { message: msg } }));
    }, 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <Box
      sx={{
        py: 0.5,
      }}
    >
      <Box sx={{ px: 0.25 }}>
        {/* Greeting */}
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2.5 }}>
          <Box
            sx={(theme) => ({
              p: 1,
              borderRadius: 1.5,
              bgcolor: alpha(EDRO_ORANGE, theme.palette.mode === 'dark' ? 0.12 : 0.08),
              border: `1px solid ${alpha(EDRO_ORANGE, theme.palette.mode === 'dark' ? 0.22 : 0.16)}`,
            })}
          >
            <IconBrain size={22} style={{ color: EDRO_ORANGE }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              {getGreeting()}{userName ? `, ${userName}` : ''}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              O que fazemos hoje?
            </Typography>
          </Box>
        </Stack>

        {/* Input */}
        <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Fale com o Jarvis…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 1.5,
                bgcolor: (theme) =>
                  theme.palette.mode === 'dark'
                    ? alpha(theme.palette.common.white, 0.02)
                    : alpha(theme.palette.common.black, 0.018),
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: EDRO_ORANGE },
              },
            }}
          />
          <IconButton
            onClick={() => handleSend()}
            disabled={!input.trim()}
            sx={(theme) => ({
              bgcolor: EDRO_ORANGE,
              color: theme.palette.getContrastText(EDRO_ORANGE),
              '&:hover': { bgcolor: '#c94215' },
              '&.Mui-disabled': {
                bgcolor: theme.palette.action.disabledBackground,
                color: theme.palette.action.disabled,
              },
              flexShrink: 0,
              width: 40,
              height: 40,
              borderRadius: 1.5,
            })}
          >
            <IconSend size={16} />
          </IconButton>
        </Box>

        {/* Quick actions */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2.5 }}>
          {QUICK_ACTIONS.map(qa => (
            <Chip
              key={qa}
              label={qa}
              size="small"
              variant="outlined"
              clickable
              onClick={() => handleSend(qa)}
              sx={(theme) => ({
                fontSize: '0.68rem',
                borderRadius: 1,
                borderColor: alpha(EDRO_ORANGE, theme.palette.mode === 'dark' ? 0.28 : 0.22),
                color: theme.palette.text.secondary,
                '&:hover': {
                  borderColor: EDRO_ORANGE,
                  color: EDRO_ORANGE,
                  bgcolor: alpha(EDRO_ORANGE, theme.palette.mode === 'dark' ? 0.08 : 0.05),
                },
              })}
            />
          ))}
        </Box>

        {/* Recent conversations */}
        {(loading || conversations.length > 0) && (
          <>
            <Divider sx={{ mb: 1.5 }} />
            <Typography variant="overline" color="text.disabled" sx={{ fontSize: '0.65rem', display: 'block', mb: 1 }}>
              Conversas recentes
            </Typography>
            <Stack spacing={0.5}>
              {loading
                ? [1, 2, 3].map(i => <Skeleton key={i} height={32} sx={{ borderRadius: 2 }} />)
                : conversations.map(conv => (
                    <Box
                      key={conv.id}
                      onClick={() => {
                        setConversationId(conv.id);
                        open(conv.client_text_id ?? undefined);
                      }}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        px: 0.5,
                        py: 0.75,
                        cursor: 'pointer',
                        '&:hover': {
                          bgcolor: (theme) =>
                            theme.palette.mode === 'dark'
                              ? alpha(theme.palette.common.white, 0.03)
                              : alpha(theme.palette.common.black, 0.03),
                        },
                      }}
                    >
                      <Avatar
                        sx={(theme) => ({
                          width: 22,
                          height: 22,
                          fontSize: '0.62rem',
                          bgcolor: alpha(EDRO_ORANGE, theme.palette.mode === 'dark' ? 0.14 : 0.09),
                          color: EDRO_ORANGE,
                          border: `1px solid ${alpha(EDRO_ORANGE, theme.palette.mode === 'dark' ? 0.24 : 0.18)}`,
                          flexShrink: 0,
                        })}
                      >
                        {conv.client_name ? initials(conv.client_name) : <IconMessage size={11} />}
                      </Avatar>
                      <Typography variant="body2" sx={{ flex: 1, fontSize: '0.78rem' }} noWrap>
                        {conv.title || 'Conversa'}
                      </Typography>
                      {conv.client_name && (
                        <Chip label={conv.client_name} size="small" sx={{ fontSize: '0.6rem', height: 18, maxWidth: 100 }} />
                      )}
                      <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem', flexShrink: 0 }}>
                        {relativeTime(conv.updated_at)}
                      </Typography>
                    </Box>
                  ))
              }
            </Stack>
          </>
        )}
      </Box>
    </Box>
  );
}
