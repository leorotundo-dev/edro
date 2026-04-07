'use client';

import type { GetRoomResponse, ListRoomMessagesResponse, ListRoomsResponse, RoomMessage, RoomPresence, RoomStreamEvent, RoomSummary } from '@edro/shared';
import { useEffect, useMemo, useState } from 'react';
import { apiGet, apiPost, apiPut, buildApiUrl } from '@/lib/api';
import { useJarvisPage } from '@/hooks/useJarvisPage';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

function upsertMessage(list: RoomMessage[], incoming: RoomMessage) {
  const map = new Map(list.map((item) => [item.id, item]));
  map.set(incoming.id, incoming);
  return Array.from(map.values()).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export default function RoomsPage() {
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [presence, setPresence] = useState<RoomPresence[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [composer, setComposer] = useState('');
  const [error, setError] = useState('');

  const activeRoom = useMemo(() => rooms.find((room) => room.id === activeRoomId) ?? null, [rooms, activeRoomId]);

  useJarvisPage(
    {
      screen: 'studio_rooms',
      roomId: activeRoom?.id ?? null,
      roomName: activeRoom?.name ?? null,
      roomScope: activeRoom?.scope ?? null,
      roomContextType: activeRoom?.contextType ?? null,
      roomContextId: activeRoom?.contextId ?? null,
      clientId: activeRoom?.clientId ?? null,
      edroClientId: activeRoom?.edroClientId ?? null,
    },
    [activeRoom?.id, activeRoom?.name, activeRoom?.scope, activeRoom?.contextType, activeRoom?.contextId, activeRoom?.clientId, activeRoom?.edroClientId],
  );

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    apiGet<ListRoomsResponse>('/rooms')
      .then((res) => {
        if (!mounted) return;
        const nextRooms = res?.rooms ?? [];
        setRooms(nextRooms);
        setActiveRoomId((prev) => prev && nextRooms.some((room) => room.id === prev) ? prev : nextRooms[0]?.id ?? null);
      })
      .catch((err) => mounted && setError(err?.message || 'Nao foi possivel carregar as salas.'))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!activeRoomId) return;
    let cancelled = false;
    setError('');
    Promise.all([
      apiGet<GetRoomResponse>(`/rooms/${activeRoomId}`),
      apiGet<ListRoomMessagesResponse>(`/rooms/${activeRoomId}/messages`),
    ])
      .then(([roomData, messagesData]) => {
        if (cancelled) return;
        setPresence(roomData?.presence ?? []);
        setMessages(messagesData?.messages ?? []);
        void apiPut(`/rooms/${activeRoomId}/read`, {});
        setRooms((prev) => prev.map((room) => room.id === activeRoomId ? { ...room, unreadCount: 0 } : room));
      })
      .catch((err) => !cancelled && setError(err?.message || 'Nao foi possivel abrir a sala.'));

    const stream = new EventSource(buildApiUrl(`/rooms/${activeRoomId}/stream`));
    const onSnapshot = (raw: MessageEvent<string>) => {
      const event = JSON.parse(raw.data) as Extract<RoomStreamEvent, { type: 'snapshot' }>;
      if (cancelled) return;
      setMessages(event.messages ?? []);
      setPresence(event.presence ?? []);
      setRooms((prev) => prev.map((room) => room.id === event.room.id ? { ...room, ...event.room, unreadCount: 0 } : room));
    };
    const onMessageCreated = (raw: MessageEvent<string>) => {
      const event = JSON.parse(raw.data) as Extract<RoomStreamEvent, { type: 'message.created' }>;
      if (cancelled) return;
      setMessages((prev) => upsertMessage(prev, event.message));
      setRooms((prev) => prev.map((room) => room.id === activeRoomId ? {
        ...room,
        lastMessageAt: event.message.createdAt,
        lastMessagePreview: event.message.body.slice(0, 160),
        unreadCount: 0,
      } : room));
      void apiPut(`/rooms/${activeRoomId}/read`, { lastReadMessageId: event.message.id });
    };
    const onPresenceUpdated = (raw: MessageEvent<string>) => {
      const event = JSON.parse(raw.data) as Extract<RoomStreamEvent, { type: 'presence.updated' }>;
      if (cancelled) return;
      setPresence((prev) => {
        const map = new Map(prev.map((item) => [item.userId, item]));
        map.set(event.presence.userId, event.presence);
        return Array.from(map.values()).sort((a, b) => a.name?.localeCompare(b.name || '') || 0);
      });
    };
    stream.addEventListener('snapshot', onSnapshot);
    stream.addEventListener('message.created', onMessageCreated);
    stream.addEventListener('presence.updated', onPresenceUpdated);
    stream.onerror = () => setError((current) => current || 'Conexao em tempo real do Rooms indisponivel.');

    const heartbeat = setInterval(() => {
      void apiPut(`/rooms/${activeRoomId}/presence`, { status: 'online', pathname: '/studio/rooms' });
    }, 30000);
    void apiPut(`/rooms/${activeRoomId}/presence`, { status: 'online', pathname: '/studio/rooms' });

    return () => {
      cancelled = true;
      clearInterval(heartbeat);
      stream.close();
    };
  }, [activeRoomId]);

  const handleSend = async () => {
    const body = composer.trim();
    if (!activeRoomId || !body) return;
    setSending(true);
    setError('');
    try {
      const created = await apiPost<RoomMessage>(`/rooms/${activeRoomId}/messages`, { body });
      setMessages((prev) => upsertMessage(prev, created));
      setComposer('');
    } catch (err: any) {
      setError(err?.message || 'Nao foi possivel enviar a mensagem.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Box sx={{ px: { xs: 2, md: 3 }, py: 3 }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="h4" fontWeight={800}>Rooms</Typography>
          <Typography variant="body2" color="text.secondary">
            Conversa persistente do Studio com presenca, unread e stream em tempo real.
          </Typography>
        </Box>

        {error && <Alert severity="warning" onClose={() => setError('')}>{error}</Alert>}

        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems="stretch">
          <Card variant="outlined" sx={{ width: { xs: '100%', lg: 320 } }}>
            <CardContent>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>Salas</Typography>
              {loading ? <CircularProgress size={20} /> : (
                <Stack spacing={1}>
                  {rooms.map((room) => (
                    <Button
                      key={room.id}
                      variant={room.id === activeRoomId ? 'contained' : 'text'}
                      color={room.id === activeRoomId ? 'primary' : 'inherit'}
                      onClick={() => setActiveRoomId(room.id)}
                      sx={{ justifyContent: 'space-between', textTransform: 'none', px: 1.5, py: 1.25 }}
                    >
                      <Stack alignItems="flex-start" sx={{ minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={700} noWrap>{room.name}</Typography>
                        <Typography variant="caption" color="inherit" noWrap>{room.lastMessagePreview || 'Sem mensagens ainda.'}</Typography>
                      </Stack>
                      <Chip size="small" label={room.unreadCount || room.scope} />
                    </Button>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ flex: 1, minHeight: 560 }}>
            <CardContent sx={{ height: '100%' }}>
              {!activeRoom ? (
                <Typography variant="body2" color="text.secondary">Nenhuma sala disponivel.</Typography>
              ) : (
                <Stack spacing={2} sx={{ height: '100%' }}>
                  <Box>
                    <Typography variant="h6" fontWeight={700}>{activeRoom.name}</Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                      <Chip size="small" label={activeRoom.scope} />
                      {presence.map((item) => <Chip key={item.userId} size="small" color="success" label={item.name || item.userId} />)}
                    </Stack>
                  </Box>

                  <Divider />

                  <Stack spacing={1.25} sx={{ flex: 1, overflowY: 'auto', pr: 1 }}>
                    {messages.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">Sem mensagens ainda. Comece a conversa.</Typography>
                    ) : messages.map((message) => (
                      <Box key={message.id} sx={{ alignSelf: 'stretch' }}>
                        <Typography variant="caption" color="text.secondary">
                          {message.authorName || (message.authorKind === 'system' ? 'Sistema' : 'Jarvis')} · {new Date(message.createdAt).toLocaleString('pt-BR')}
                        </Typography>
                        <Card variant="outlined" sx={{ mt: 0.5, bgcolor: message.authorKind === 'jarvis' ? 'rgba(93,135,255,0.06)' : 'background.paper' }}>
                          <CardContent sx={{ py: 1.25, '&:last-child': { pb: 1.25 } }}>
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{message.body}</Typography>
                          </CardContent>
                        </Card>
                      </Box>
                    ))}
                  </Stack>

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
                    <TextField
                      fullWidth
                      multiline
                      minRows={2}
                      maxRows={5}
                      placeholder="Escreva no room..."
                      value={composer}
                      onChange={(event) => setComposer(event.target.value)}
                    />
                    <Button variant="contained" disabled={sending || !composer.trim()} onClick={handleSend}>
                      {sending ? 'Enviando...' : 'Enviar'}
                    </Button>
                  </Stack>
                </Stack>
              )}
            </CardContent>
          </Card>
        </Stack>
      </Stack>
    </Box>
  );
}
