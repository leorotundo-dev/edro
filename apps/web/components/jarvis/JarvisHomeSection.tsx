'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import Divider from '@mui/material/Divider';
import Avatar from '@mui/material/Avatar';
import { alpha } from '@mui/material/styles';
import {
  IconBrain, IconSend, IconMessage,
  IconFileText, IconAlertTriangle, IconSparkles,
  IconMicrophone, IconChevronRight, IconInfoCircle,
  IconCheck, IconX,
} from '@tabler/icons-react';
import { apiPost } from '@/lib/api';
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

type FeedItem = {
  id: string;
  kind: 'briefing' | 'alert' | 'auto_briefing' | 'proposal' | 'opportunity';
  title: string;
  subtitle?: string;
  reasoning?: string;   // fontes/raciocínio — transparência do Jarvis
  href?: string;
  color: string;
  icon: React.ReactNode;
  cta: string;
  proposalId?: string;  // para proposals com approve/discard inline
};

type JarvisFeed = {
  briefing_pending: any[];
  alerts: any[];
  auto_briefings: any[];
  proposals: any[];
  opportunities: any[];
  total_actions: number;
};

function buildFeedItems(feed: JarvisFeed): FeedItem[] {
  const items: FeedItem[] = [];

  for (const j of feed.briefing_pending.slice(0, 3)) {
    items.push({
      id: `bp-${j.id}`,
      kind: 'briefing',
      title: j.title || 'Job sem título',
      subtitle: j.client_name,
      reasoning: 'Job em intake sem briefing preenchido',
      href: `/admin/operacoes/jobs/${j.id}/briefing`,
      color: '#FFAE1F',
      icon: <IconFileText size={14} />,
      cta: 'Preencher briefing',
    });
  }

  for (const a of feed.alerts.slice(0, 2)) {
    items.push({
      id: `al-${a.id}`,
      kind: 'alert',
      title: a.title,
      subtitle: a.client_name,
      reasoning: a.body || undefined,
      href: `/clients/${a.client_id}`,
      color: '#ef4444',
      icon: <IconAlertTriangle size={14} />,
      cta: 'Ver cliente',
    });
  }

  for (const b of feed.auto_briefings.slice(0, 2)) {
    items.push({
      id: `ab-${b.id}`,
      kind: 'auto_briefing',
      title: b.title,
      subtitle: b.client_name,
      reasoning: b.drop_pct ? `Queda de ${b.drop_pct}% de engajamento detectada` : 'Briefing gerado automaticamente pelo Jarvis',
      href: `/edro/${b.id}`,
      color: '#a855f7',
      icon: <IconSparkles size={14} />,
      cta: 'Aprovar briefing',
    });
  }

  for (const p of feed.proposals.slice(0, 3)) {
    items.push({
      id: `pr-${p.id}`,
      kind: 'proposal',
      title: p.title || p.meeting_title,
      subtitle: p.client_name,
      reasoning: p.reasoning ?? (p.meeting_title ? `Da reunião: "${p.meeting_title}"` : undefined),
      href: '/edro/jarvis',
      color: '#5D87FF',
      icon: <IconMicrophone size={14} />,
      cta: 'Aprovar',
      proposalId: p.id,
    });
  }

  for (const o of feed.opportunities.slice(0, 2)) {
    items.push({
      id: `op-${o.id}`,
      kind: 'opportunity',
      title: o.title,
      subtitle: o.client_name,
      reasoning: `${o.confidence}% de confiança · detectado via clipping/social`,
      href: `/clients/${o.client_id}`,
      color: '#13DEB9',
      icon: <IconSparkles size={14} />,
      cta: 'Ver oportunidade',
    });
  }

  return items.slice(0, 6);
}

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
  'O que está pegando hoje na agência?',
  'Me dá o daily brief da operação',
  'Quais são os alertas críticos do Jarvis agora?',
  'Quais briefings estão em aberto?',
];

export default function JarvisHomeSection() {
  const { open, setConversationId, clientId } = useJarvis();
  const [input, setInput] = useState('');
  const [conversations, setConversations] = useState<RecentConversation[]>([]);
  const [feed, setFeed] = useState<JarvisFeed | null>(null);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string | null>(null);
  const [proposalAction, setProposalAction] = useState<Record<string, 'approving' | 'discarding' | 'done'>>({});

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('edro_user') || '{}');
      setUserName(u?.name?.split(' ')[0] ?? u?.email?.split('@')[0] ?? null);
    } catch {}
  }, []);

  useEffect(() => {
    Promise.all([
      apiGet<{ data?: { conversations?: RecentConversation[] } }>('/planning/conversations?limit=5')
        .then(res => setConversations(res?.data?.conversations ?? []))
        .catch(() => setConversations([])),
      apiGet<JarvisFeed>('/jarvis/feed')
        .then(res => {
          setFeed(res);
          setFeedItems(buildFeedItems(res));
        })
        .catch(() => {}),
    ]).finally(() => setLoading(false));
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

  const handleProposalAction = async (proposalId: string, action: 'approve' | 'discard') => {
    setProposalAction((prev) => ({ ...prev, [proposalId]: action === 'approve' ? 'approving' : 'discarding' }));
    try {
      await apiPost(`/jarvis/proposals/${proposalId}/${action}`, {});
      setProposalAction((prev) => ({ ...prev, [proposalId]: 'done' }));
      setFeedItems((prev) => prev.filter((item) => item.proposalId !== proposalId));
    } catch {
      setProposalAction((prev) => { const next = { ...prev }; delete next[proposalId]; return next; });
    }
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

        {/* Fila de Decisões */}
        {(loading || feedItems.length > 0) && (
          <Box sx={{ mb: 2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="overline" color="text.disabled" sx={{ fontSize: '0.6rem', letterSpacing: '0.1em' }}>
                Fila de decisões
              </Typography>
              {feed && feed.total_actions > 6 && (
                <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
                  +{feed.total_actions - 6} mais
                </Typography>
              )}
            </Stack>
            <Stack spacing={0.5}>
              {loading
                ? [1, 2, 3].map((i) => <Skeleton key={i} height={44} sx={{ borderRadius: 1.5 }} />)
                : feedItems.map((item) => {
                    const isProposal = item.kind === 'proposal' && !!item.proposalId;
                    const pAction = item.proposalId ? proposalAction[item.proposalId] : undefined;

                    return (
                    <Box
                      key={item.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        px: 1.25,
                        py: 0.75,
                        borderRadius: 1.5,
                        border: `1px solid ${alpha(item.color, 0.18)}`,
                        bgcolor: alpha(item.color, 0.05),
                        transition: 'all 120ms ease',
                        '&:hover': { bgcolor: alpha(item.color, 0.1), borderColor: alpha(item.color, 0.35) },
                      }}
                    >
                      <Box sx={{ color: item.color, display: 'flex', flexShrink: 0 }}>{item.icon}</Box>
                      <Box
                        component={isProposal ? 'div' : Link}
                        href={!isProposal ? (item.href ?? '#') : undefined}
                        sx={{ flex: 1, minWidth: 0, textDecoration: 'none' }}
                      >
                        <Typography variant="body2" sx={{ fontSize: '0.78rem', fontWeight: 600, color: 'text.primary', lineHeight: 1.2 }} noWrap>
                          {item.title}
                        </Typography>
                        {item.subtitle && (
                          <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }} noWrap>
                            {item.subtitle}
                          </Typography>
                        )}
                        {item.reasoning && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, mt: 0.15 }}>
                            <IconInfoCircle size={10} style={{ color: 'var(--mui-palette-text-disabled)', flexShrink: 0 }} />
                            <Typography
                              variant="caption"
                              sx={{ fontSize: '0.6rem', color: 'text.disabled', lineHeight: 1.2, fontStyle: 'italic' }}
                              noWrap
                            >
                              {item.reasoning}
                            </Typography>
                          </Box>
                        )}
                      </Box>

                      {/* Proposal: inline approve/discard */}
                      {isProposal ? (
                        <Stack direction="row" spacing={0.4} flexShrink={0}>
                          <Chip
                            label={pAction === 'approving' ? '…' : <IconCheck size={11} />}
                            size="small"
                            onClick={() => !pAction && handleProposalAction(item.proposalId!, 'approve')}
                            sx={{
                              height: 22, width: 28, cursor: 'pointer',
                              bgcolor: alpha('#13DEB9', 0.12), color: '#13DEB9',
                              '& .MuiChip-label': { px: 0.5 },
                              '&:hover': { bgcolor: alpha('#13DEB9', 0.25) },
                            }}
                          />
                          <Chip
                            label={pAction === 'discarding' ? '…' : <IconX size={11} />}
                            size="small"
                            onClick={() => !pAction && handleProposalAction(item.proposalId!, 'discard')}
                            sx={{
                              height: 22, width: 28, cursor: 'pointer',
                              bgcolor: alpha('#EF4444', 0.12), color: '#EF4444',
                              '& .MuiChip-label': { px: 0.5 },
                              '&:hover': { bgcolor: alpha('#EF4444', 0.25) },
                            }}
                          />
                        </Stack>
                      ) : (
                        <Chip
                          label={item.cta}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '0.62rem',
                            fontWeight: 600,
                            bgcolor: alpha(item.color, 0.12),
                            color: item.color,
                            flexShrink: 0,
                            '& .MuiChip-label': { px: 0.75 },
                          }}
                        />
                      )}
                    </Box>
                    );
                  })}
            </Stack>
          </Box>
        )}

        {feedItems.length === 0 && !loading && (
          <Box
            sx={{
              mb: 2, px: 1.5, py: 1.25, borderRadius: 1.5,
              bgcolor: (theme) => alpha(theme.palette.success.main, 0.06),
              border: (theme) => `1px solid ${alpha(theme.palette.success.main, 0.18)}`,
            }}
          >
            <Typography variant="body2" sx={{ fontSize: '0.78rem', color: 'success.main', fontWeight: 600 }}>
              Tudo em dia — nenhuma decisão pendente.
            </Typography>
          </Box>
        )}

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
