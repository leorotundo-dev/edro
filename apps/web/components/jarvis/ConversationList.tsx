'use client';

import { useEffect, useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import { IconArrowLeft, IconTrash, IconMessage } from '@tabler/icons-react';
import { apiGet, apiDelete } from '@/lib/api';

type Conversation = {
  id: string;
  title: string;
  provider: string;
  status: string;
  created_at: string;
  updated_at: string;
  message_count: string;
  client_name?: string;
  client_text_id?: string;
};

type Props = {
  clientId: string | null;
  onSelect: (conv: Conversation) => void;
  onBack: () => void;
};

function groupByDate(conversations: Conversation[]) {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const groups: Record<string, Conversation[]> = {};

  for (const conv of conversations) {
    const d = new Date(conv.updated_at).toDateString();
    const label = d === today ? 'Hoje' : d === yesterday ? 'Ontem' : new Date(conv.updated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    if (!groups[label]) groups[label] = [];
    groups[label].push(conv);
  }
  return groups;
}

export default function ConversationList({ clientId, onSelect, onBack }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const res = await apiGet<{ data: { conversations: Conversation[] } }>(
        `/clients/${clientId}/planning/conversations`
      );
      setConversations(res.data?.conversations ?? []);
    } catch {
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!clientId) return;
    await apiDelete(`/clients/${clientId}/planning/conversations/${id}`).catch(() => {});
    setConversations(prev => prev.filter(c => c.id !== id));
  };

  const groups = groupByDate(conversations);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
        <IconButton size="small" onClick={onBack}>
          <IconArrowLeft size={18} />
        </IconButton>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Histórico</Typography>
      </Box>

      {/* List */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 1.5, py: 1 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : conversations.length === 0 ? (
          <Box sx={{ textAlign: 'center', pt: 4 }}>
            <IconMessage size={32} style={{ opacity: 0.3 }} />
            <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 1 }}>
              Nenhuma conversa ainda
            </Typography>
          </Box>
        ) : (
          Object.entries(groups).map(([label, convs]) => (
            <Box key={label} sx={{ mb: 2 }}>
              <Typography variant="overline" color="text.disabled" sx={{ fontSize: '0.65rem', px: 1, display: 'block', mb: 0.5 }}>
                {label}
              </Typography>
              {convs.map(conv => (
                <Box
                  key={conv.id}
                  onClick={() => onSelect(conv)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 1.5,
                    py: 1,
                    borderRadius: 2,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' },
                    '&:hover .delete-btn': { opacity: 1 },
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500, lineHeight: 1.3 }} noWrap>
                      {conv.title || 'Conversa sem título'}
                    </Typography>
                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
                      {conv.message_count} msgs · {new Date(conv.updated_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                  </Box>
                  <Tooltip title="Deletar">
                    <IconButton
                      size="small"
                      className="delete-btn"
                      onClick={(e) => handleDelete(conv.id, e)}
                      sx={{ opacity: 0, transition: 'opacity 0.15s', color: 'error.main', p: 0.5 }}
                    >
                      <IconTrash size={14} />
                    </IconButton>
                  </Tooltip>
                </Box>
              ))}
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
}
