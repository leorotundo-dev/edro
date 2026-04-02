'use client';

import { useState, useRef, useEffect } from 'react';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { IconRobot, IconSend, IconRefresh } from '@tabler/icons-react';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

type PortalCapability = 'read' | 'request' | 'approve';
type ClientMe = {
  id: string;
  name: string;
  status: string;
  contact_role?: 'viewer' | 'requester' | 'approver' | 'admin' | null;
  capabilities?: PortalCapability[];
};

const SUGGESTED_PROMPTS = [
  'O que depende de mim agora?',
  'Qual a próxima entrega?',
  'Que pedidos estão abertos?',
  'Quando foi a última reunião?',
  'Tem alguma fatura pendente?',
  'Quais pedidos estão em produção?',
];

export default function AssistentePage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { data: meData } = useSWR<{ client: ClientMe }>('/portal/client/me', swrFetcher);

  const portalRole = meData?.client?.contact_role ?? null;
  const portalCapabilities = meData?.client?.capabilities ?? ['read'];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    setError('');
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // POST /portal/client/assistant — NEW endpoint
      const res = await fetch('/api/proxy/portal/client/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
        }),
        cache: 'no-store',
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as any)?.error ?? `Erro ${res.status}`);
      }

      const data = await res.json();
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply ?? data.message ?? 'Sem resposta.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      setError(err.message ?? 'Erro ao enviar mensagem.');
      // Remove user message on error so user can retry
      setMessages(prev => prev.filter(m => m.id !== userMsg.id));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <Stack spacing={3} sx={{ height: 'calc(100vh - 140px)', maxHeight: 800 }}>
      {/* Header */}
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box sx={{ p: 1.5, bgcolor: 'primary.light', borderRadius: 2, color: 'primary.dark', display: 'flex' }}>
          <IconRobot size={22} />
        </Box>
        <Box>
          <Typography variant="overline" color="text.secondary">Assistente</Typography>
          <Typography variant="h4" sx={{ mt: 0 }}>Assistente da conta</Typography>
        </Box>
      </Stack>
      <Typography variant="body1" color="text.secondary">
        Pergunte sobre pedidos, prazos, aprovações ou histórico da conta.
      </Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Chip
          label={`Perfil: ${portalRole ?? 'legado'}`}
          size="small"
          color="default"
          variant="outlined"
        />
        {portalCapabilities.map((capability) => (
          <Chip
            key={capability}
            label={
              capability === 'read'
                ? 'Pode consultar'
                : capability === 'request'
                ? 'Pode solicitar'
                : 'Pode aprovar'
            }
            size="small"
            color={capability === 'approve' ? 'warning' : capability === 'request' ? 'info' : 'default'}
            variant="outlined"
          />
        ))}
      </Stack>

      {/* Chat area */}
      <Card sx={{ borderRadius: 3, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Messages */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
          {messages.length === 0 ? (
            <Stack spacing={2} alignItems="center" justifyContent="center" sx={{ height: '100%', py: 4 }}>
              <Box sx={{ p: 2.5, bgcolor: 'action.hover', borderRadius: 4 }}>
                <IconRobot size={36} color="#9ca3af" />
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" gutterBottom>Como posso ajudar?</Typography>
                <Typography variant="body2" color="text.secondary">
                  Pergunte sobre o status dos seus pedidos, prazos, aprovações ou qualquer aspecto da conta.
                </Typography>
              </Box>
              {/* Suggested prompts */}
              <Stack direction="row" flexWrap="wrap" gap={1} justifyContent="center" sx={{ mt: 1, maxWidth: 480 }}>
                {SUGGESTED_PROMPTS.map(prompt => (
                  <Chip
                    key={prompt}
                    label={prompt}
                    onClick={() => sendMessage(prompt)}
                    clickable
                    variant="outlined"
                    size="small"
                    sx={{ cursor: 'pointer' }}
                  />
                ))}
              </Stack>
            </Stack>
          ) : (
            <Stack spacing={1.5}>
              {messages.map((msg) => (
                <Box
                  key={msg.id}
                  sx={{
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <Box
                    sx={{
                      maxWidth: '75%',
                      px: 2,
                      py: 1.5,
                      borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      bgcolor: msg.role === 'user' ? 'primary.main' : 'action.hover',
                      color: msg.role === 'user' ? 'primary.contrastText' : 'text.primary',
                    }}
                  >
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                      {msg.content}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        mt: 0.5,
                        opacity: 0.6,
                        textAlign: 'right',
                        fontSize: '0.65rem',
                      }}
                    >
                      {msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                  </Box>
                </Box>
              ))}
              {loading && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ px: 2, py: 1.5, borderRadius: '16px 16px 16px 4px', bgcolor: 'action.hover' }}>
                    <CircularProgress size={16} />
                  </Box>
                </Box>
              )}
              <div ref={messagesEndRef} />
            </Stack>
          )}
        </Box>

        {error && (
          <Box sx={{ px: 2, pb: 1 }}>
            <Alert
              severity="error"
              sx={{ borderRadius: 2 }}
              action={
                <Button size="small" startIcon={<IconRefresh size={14} />} onClick={() => setError('')}>
                  OK
                </Button>
              }
            >
              {error}
            </Alert>
          </Box>
        )}

        {/* Suggested prompts — show when there are messages */}
        {messages.length > 0 && messages.length < 4 && (
          <Box sx={{ px: 2, pb: 1 }}>
            <Stack direction="row" flexWrap="wrap" gap={0.75}>
              {SUGGESTED_PROMPTS.slice(0, 3).map(prompt => (
                <Chip
                  key={prompt}
                  label={prompt}
                  onClick={() => sendMessage(prompt)}
                  clickable
                  variant="outlined"
                  size="small"
                />
              ))}
            </Stack>
          </Box>
        )}

        {/* Input */}
        <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Stack direction="row" spacing={1} alignItems="flex-end">
            <TextField
              fullWidth
              multiline
              maxRows={4}
              placeholder="Pergunte algo sobre a sua conta…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              size="small"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
            />
            <IconButton
              color="primary"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              sx={{ p: 1.25, bgcolor: 'primary.main', color: 'primary.contrastText', borderRadius: 2, '&:hover': { bgcolor: 'primary.dark' }, '&.Mui-disabled': { bgcolor: 'action.disabledBackground' } }}
            >
              <IconSend size={18} />
            </IconButton>
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
            Enter para enviar · Shift+Enter para nova linha
          </Typography>
        </Box>
      </Card>
    </Stack>
  );
}
