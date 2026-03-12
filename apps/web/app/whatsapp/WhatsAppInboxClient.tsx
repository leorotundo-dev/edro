'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import List from '@mui/material/List';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import {
  IconBrandWhatsapp, IconMessageCircle, IconRefresh, IconSearch, IconSend,
} from '@tabler/icons-react';
import AppShell from '@/components/AppShell';

const EDRO_GREEN = '#25D366';

type Conversation = {
  client_id: string; client_name: string;
  last_message: string | null; last_direction: string; last_type: string;
  last_at: string; channel: 'cloud' | 'evolution'; message_count: number;
};
type Message = {
  id: string; client_id: string; content: string | null; direction: string;
  type: string; created_at: string; briefing_id: string | null;
  channel: 'cloud' | 'evolution'; sender_name: string | null; group_name: string | null;
  sender_phone: string | null; contact_type: 'client_contact' | 'freelancer' | null;
};
type Stats = { messages_today: number; briefings_today: number; total_messages: number };

function relativeTime(ts: string): string {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 3600) return `${Math.max(1, Math.round(diff / 60))}min`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h`;
  const d = new Date(ts);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function WhatsAppInboxClient() {
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sendText, setSendText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const selectedConv = convs.find(c => c.client_id === selectedId) ?? null;

  const loadConvs = useCallback(async (silent = false) => {
    if (!silent) setLoadingConvs(true);
    try {
      const [convRes, statsRes] = await Promise.all([
        apiGet<{ data: Conversation[] }>('/whatsapp/conversations'),
        apiGet<Stats>('/whatsapp/stats'),
      ]);
      setConvs((convRes as any)?.data ?? []);
      setStats((statsRes as any) ?? null);
    } finally {
      if (!silent) setLoadingConvs(false);
    }
  }, []);

  const loadMessages = useCallback(async (clientId: string, silent = false) => {
    if (!silent) { setLoadingMsgs(true); setMessages([]); }
    try {
      const res = await apiGet<{ data: Message[] }>(`/whatsapp/messages?client_id=${clientId}`);
      const fresh = (res as any)?.data ?? [];
      setMessages(prev => {
        if (!silent || fresh.length !== prev.length) {
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
        return fresh;
      });
    } finally {
      if (!silent) setLoadingMsgs(false);
    }
  }, []);

  useEffect(() => { loadConvs(); }, [loadConvs]);
  useEffect(() => { if (selectedId) loadMessages(selectedId); }, [selectedId, loadMessages]);

  // Poll every 10s for new messages + conversation updates
  useEffect(() => {
    const id = setInterval(() => {
      loadConvs(true);
      if (selectedId) loadMessages(selectedId, true);
    }, 10_000);
    return () => clearInterval(id);
  }, [loadConvs, loadMessages, selectedId]);

  const handleSend = async () => {
    if (!selectedId || !sendText.trim()) return;
    setSending(true);
    setSendError('');
    try {
      await apiPost('/whatsapp/send', { client_id: selectedId, message: sendText.trim() });
      setSendText('');
      await loadMessages(selectedId);
      await loadConvs();
    } catch (e: any) {
      const hint = e?.hint ?? e?.message ?? 'Erro ao enviar';
      setSendError(hint);
    } finally {
      setSending(false);
    }
  };

  const filtered = convs.filter(c =>
    !search || c.client_name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <AppShell title="WhatsApp">
      <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
        {/* Stats bar */}
        <Stack direction="row" spacing={3} sx={{ px: 3, py: 1.5, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Avatar sx={{ bgcolor: EDRO_GREEN, width: 28, height: 28 }}><IconBrandWhatsapp size={16} /></Avatar>
            <Typography variant="subtitle2" fontWeight={700}>WhatsApp Inbox</Typography>
          </Stack>
          {stats && (
            <Stack direction="row" spacing={2}>
              <Chip size="small" label={`${stats.messages_today} msgs hoje`} sx={{ bgcolor: `${EDRO_GREEN}20`, color: EDRO_GREEN, fontWeight: 600 }} />
              {stats.briefings_today > 0 && <Chip size="small" label={`${stats.briefings_today} briefings gerados`} color="primary" />}
              <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>{stats.total_messages} total</Typography>
            </Stack>
          )}
          <Box sx={{ flex: 1 }} />
          <IconButton size="small" onClick={loadConvs} disabled={loadingConvs}>
            {loadingConvs ? <CircularProgress size={16} /> : <IconRefresh size={16} />}
          </IconButton>
        </Stack>

        {/* Main area */}
        <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Left: conversation list */}
          <Box sx={{ width: 340, borderRight: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column', bgcolor: 'background.paper' }}>
            <Box sx={{ p: 1.5 }}>
              <TextField
                fullWidth size="small" placeholder="Buscar cliente…"
                value={search} onChange={e => setSearch(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><IconSearch size={16} /></InputAdornment> }}
              />
            </Box>
            <Divider />
            {loadingConvs ? (
              <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress size={24} sx={{ color: EDRO_GREEN }} /></Stack>
            ) : filtered.length === 0 ? (
              <Stack alignItems="center" sx={{ py: 6, px: 2 }}>
                <IconMessageCircle size={32} opacity={0.3} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Nenhuma conversa</Typography>
              </Stack>
            ) : (
              <List dense disablePadding sx={{ flex: 1, overflow: 'auto' }}>
                {filtered.map(c => (
                  <ListItemButton
                    key={c.client_id}
                    selected={selectedId === c.client_id}
                    onClick={() => setSelectedId(c.client_id)}
                    sx={{ px: 2, py: 1.25, '&.Mui-selected': { bgcolor: `${EDRO_GREEN}15` } }}
                  >
                    <ListItemAvatar sx={{ minWidth: 44 }}>
                      <Avatar sx={{ width: 36, height: 36, bgcolor: EDRO_GREEN, fontSize: 14, fontWeight: 700 }}>
                        {c.client_name[0].toUpperCase()}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 160 }}>{c.client_name}</Typography>
                          <Typography variant="caption" color="text.secondary">{relativeTime(c.last_at)}</Typography>
                        </Stack>
                      }
                      secondary={
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 170 }}>
                            {c.last_direction === 'outbound' ? '✓ ' : ''}{c.last_type === 'audio' ? '🎤 Áudio' : (c.last_message ?? '').slice(0, 40)}
                          </Typography>
                          {c.message_count > 0 && (
                            <Chip label={c.message_count} size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: EDRO_GREEN, color: 'white', ml: 0.5, '& .MuiChip-label': { px: 0.75 } }} />
                          )}
                        </Stack>
                      }
                    />
                  </ListItemButton>
                ))}
              </List>
            )}
          </Box>

          {/* Right: chat thread */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: '#f0f2f5' }}>
            {!selectedId ? (
              <Stack alignItems="center" justifyContent="center" sx={{ flex: 1 }}>
                <Avatar sx={{ bgcolor: `${EDRO_GREEN}20`, width: 72, height: 72, mb: 2 }}>
                  <IconBrandWhatsapp size={36} style={{ color: EDRO_GREEN }} />
                </Avatar>
                <Typography variant="h6" color="text.secondary" fontWeight={600}>Selecione uma conversa</Typography>
                <Typography variant="body2" color="text.secondary">Escolha um cliente na lista à esquerda</Typography>
              </Stack>
            ) : (
              <>
                {/* Thread header */}
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ px: 2, py: 1.5, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
                  <Avatar sx={{ bgcolor: EDRO_GREEN, width: 38, height: 38, fontSize: 15, fontWeight: 700 }}>
                    {selectedConv?.client_name[0].toUpperCase()}
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700}>{selectedConv?.client_name}</Typography>
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <Chip
                        size="small"
                        label={selectedConv?.channel === 'evolution' ? 'Evolution API' : 'Cloud API'}
                        sx={{
                          height: 16, fontSize: '0.6rem',
                          bgcolor: selectedConv?.channel === 'evolution' ? '#8B5CF620' : '#3B82F620',
                          color: selectedConv?.channel === 'evolution' ? '#7C3AED' : '#2563EB',
                        }}
                      />
                      <Typography variant="caption" color="text.secondary">{selectedConv?.message_count} mensagens</Typography>
                    </Stack>
                  </Box>
                </Stack>

                {/* Messages */}
                <Box sx={{ flex: 1, overflow: 'auto', px: 2, py: 2 }}>
                  {loadingMsgs ? (
                    <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress size={24} sx={{ color: EDRO_GREEN }} /></Stack>
                  ) : messages.length === 0 ? (
                    <Stack alignItems="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">Nenhuma mensagem</Typography>
                    </Stack>
                  ) : (
                    messages.map(msg => {
                      const isOut = msg.direction === 'outbound';
                      return (
                        <Stack key={msg.id} direction="row" justifyContent={isOut ? 'flex-end' : 'flex-start'} sx={{ mb: 1 }}>
                          <Box sx={{ maxWidth: '70%' }}>
                            {!isOut && msg.sender_name && (
                              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ ml: 1, mb: 0.25 }}>
                                <Typography variant="caption" sx={{ color: msg.contact_type ? '#1976d2' : EDRO_GREEN, fontWeight: 600 }}>
                                  {msg.sender_name}{msg.group_name ? ` · ${msg.group_name}` : ''}
                                </Typography>
                                {msg.contact_type && (
                                  <Chip size="small" label={msg.contact_type === 'freelancer' ? 'Equipe' : 'Contato'}
                                    sx={{ height: 14, fontSize: '0.55rem', bgcolor: msg.contact_type === 'freelancer' ? '#E8EAF6' : '#E3F2FD', color: msg.contact_type === 'freelancer' ? '#3949AB' : '#1565C0', '& .MuiChip-label': { px: 0.5 } }} />
                                )}
                              </Stack>
                            )}
                            <Paper elevation={0} sx={{
                              px: 1.5, py: 1,
                              borderRadius: isOut ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                              bgcolor: isOut ? EDRO_GREEN : 'white',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
                            }}>
                              <Typography variant="body2" sx={{ color: isOut ? 'white' : 'text.primary', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                {msg.type === 'audio' ? '🎤 Mensagem de voz' : msg.type === 'document' ? '📄 Documento' : (msg.content ?? '')}
                              </Typography>
                              <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center" sx={{ mt: 0.25 }}>
                                {msg.briefing_id && (
                                  <Tooltip title="Briefing gerado">
                                    <Chip label="📋 Brief" size="small" sx={{ height: 14, fontSize: '0.55rem', bgcolor: isOut ? 'rgba(255,255,255,0.3)' : '#E3F2FD', color: isOut ? 'white' : '#1565C0', '& .MuiChip-label': { px: 0.5 } }} />
                                  </Tooltip>
                                )}
                                <Typography variant="caption" sx={{ color: isOut ? 'rgba(255,255,255,0.75)' : 'text.disabled', fontSize: '0.65rem' }}>
                                  {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </Typography>
                              </Stack>
                            </Paper>
                          </Box>
                        </Stack>
                      );
                    })
                  )}
                  <div ref={bottomRef} />
                </Box>

                {/* Send box */}
                <Box sx={{ px: 2, py: 1.5, bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider' }}>
                  {sendError && <Alert severity="error" onClose={() => setSendError('')} sx={{ mb: 1, py: 0 }}>{sendError}</Alert>}
                  <Stack direction="row" spacing={1} alignItems="flex-end">
                    <TextField
                      fullWidth multiline maxRows={4} size="small"
                      placeholder="Mensagem…"
                      value={sendText}
                      onChange={e => setSendText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                    />
                    <IconButton
                      onClick={handleSend}
                      disabled={!sendText.trim() || sending}
                      sx={{ bgcolor: EDRO_GREEN, color: 'white', '&:hover': { bgcolor: '#1ea855' }, '&.Mui-disabled': { bgcolor: 'action.disabledBackground' }, width: 40, height: 40 }}
                    >
                      {sending ? <CircularProgress size={18} color="inherit" /> : <IconSend size={18} />}
                    </IconButton>
                  </Stack>
                </Box>
              </>
            )}
          </Box>
        </Box>
      </Box>
    </AppShell>
  );
}
