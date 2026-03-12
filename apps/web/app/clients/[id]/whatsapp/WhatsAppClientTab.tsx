'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { IconBrandWhatsapp, IconRefresh, IconSend } from '@tabler/icons-react';

const EDRO_GREEN = '#25D366';

type Message = {
  id: string; content: string | null; direction: string; type: string;
  created_at: string; briefing_id: string | null; channel: string;
  sender_name: string | null; group_name: string | null;
  contact_type: 'client_contact' | 'freelancer' | null;
};

export default function WhatsAppClientTab({ clientId }: { clientId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendText, setSendText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) { setLoading(true); setError(''); }
    try {
      const res = await apiGet<{ success: boolean; data: Message[] }>(`/whatsapp/messages?client_id=${clientId}`);
      const fresh = res?.data ?? [];
      setMessages(prev => {
        if (!silent || fresh.length !== prev.length) {
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
        return fresh;
      });
    } catch (err: any) {
      if (!silent) setError(err?.message ?? 'Erro ao carregar mensagens');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  // Poll every 10s for new messages
  useEffect(() => {
    const id = setInterval(() => load(true), 10_000);
    return () => clearInterval(id);
  }, [load]);

  const handleSend = async () => {
    if (!sendText.trim()) return;
    setSending(true); setError('');
    try {
      await apiPost('/whatsapp/send', { client_id: clientId, message: sendText.trim() });
      setSendText('');
      await load();
    } catch (e: any) {
      setError(e?.hint ?? e?.message ?? 'Erro ao enviar');
    } finally {
      setSending(false);
    }
  };

  const briefingsCount = messages.filter(m => m.briefing_id).length;
  const inboundCount = messages.filter(m => m.direction === 'inbound').length;

  return (
    <Box sx={{ p: 2 }}>
      {/* Header stats */}
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
        <IconBrandWhatsapp size={20} style={{ color: EDRO_GREEN }} />
        <Typography variant="subtitle1" fontWeight={700}>WhatsApp</Typography>
        <Chip size="small" label={`${messages.length} mensagens`} sx={{ bgcolor: `${EDRO_GREEN}20`, color: EDRO_GREEN }} />
        {briefingsCount > 0 && <Chip size="small" label={`${briefingsCount} briefings gerados`} color="primary" />}
        {inboundCount > 0 && <Chip size="small" label={`${inboundCount} recebidas`} />}
        <Box sx={{ flex: 1 }} />
        <IconButton size="small" onClick={load} disabled={loading}>{loading ? <CircularProgress size={14} /> : <IconRefresh size={14} />}</IconButton>
      </Stack>

      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}

      {/* Thread */}
      <Box sx={{ bgcolor: '#f0f2f5', borderRadius: 2, p: 2, minHeight: 300, maxHeight: 500, overflow: 'auto', mb: 2 }}>
        {loading ? (
          <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress size={24} sx={{ color: EDRO_GREEN }} /></Stack>
        ) : messages.length === 0 ? (
          <Stack alignItems="center" sx={{ py: 6 }}>
            <Typography variant="body2" color="text.secondary">Nenhuma mensagem WhatsApp para este cliente.</Typography>
          </Stack>
        ) : (
          messages.map(msg => {
            const isOut = msg.direction === 'outbound';
            return (
              <Stack key={msg.id} direction="row" justifyContent={isOut ? 'flex-end' : 'flex-start'} sx={{ mb: 1 }}>
                <Box sx={{ maxWidth: '75%' }}>
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
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                  }}>
                    <Typography variant="body2" sx={{ color: isOut ? 'white' : 'text.primary', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {msg.type === 'audio' ? '🎤 Mensagem de voz' : msg.type === 'document' ? '📄 Documento' : (msg.content ?? '')}
                    </Typography>
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center" sx={{ mt: 0.25 }}>
                      {msg.briefing_id && (
                        <Tooltip title="Briefing gerado">
                          <Chip label="📋" size="small" sx={{ height: 14, fontSize: '0.55rem', bgcolor: isOut ? 'rgba(255,255,255,0.3)' : '#E3F2FD', '& .MuiChip-label': { px: 0.5 } }} />
                        </Tooltip>
                      )}
                      <Typography variant="caption" sx={{ color: isOut ? 'rgba(255,255,255,0.7)' : 'text.disabled', fontSize: '0.65rem' }}>
                        {new Date(msg.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
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

      {/* Send */}
      <Stack direction="row" spacing={1} alignItems="flex-end">
        <TextField
          fullWidth multiline maxRows={3} size="small"
          placeholder="Enviar mensagem via WhatsApp Cloud API…"
          value={sendText} onChange={e => setSendText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
        />
        <IconButton
          onClick={handleSend} disabled={!sendText.trim() || sending}
          sx={{ bgcolor: EDRO_GREEN, color: 'white', '&:hover': { bgcolor: '#1ea855' }, '&.Mui-disabled': { bgcolor: 'action.disabledBackground' }, width: 40, height: 40 }}
        >
          {sending ? <CircularProgress size={18} color="inherit" /> : <IconSend size={18} />}
        </IconButton>
      </Stack>
    </Box>
  );
}
