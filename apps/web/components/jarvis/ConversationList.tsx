'use client';

import { useEffect, useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import Button from '@mui/material/Button';
import InputBase from '@mui/material/InputBase';
import { alpha } from '@mui/material/styles';
import { IconArrowLeft, IconTrash, IconMessage, IconPlus, IconSearch } from '@tabler/icons-react';
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
  hideBack?: boolean;
  onNewConversation?: () => void;
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

export default function ConversationList({ clientId, onSelect, onBack, hideBack = false, onNewConversation }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = clientId
        ? `/clients/${clientId}/planning/conversations`
        : `/planning/conversations?limit=30`;
      const res = await apiGet<{ data: { conversations: Conversation[] } }>(url);
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
    const url = clientId
      ? `/clients/${clientId}/planning/conversations/${id}`
      : `/planning/conversations/${id}`;
    await apiDelete(url).catch(() => {});
    setConversations(prev => prev.filter(c => c.id !== id));
  };

  const groups = groupByDate(conversations);
  const filteredEntries = Object.entries(groups)
    .map(([label, convs]) => [
      label,
      convs.filter((conv) => !query || conv.title.toLowerCase().includes(query.toLowerCase())),
    ] as const)
    .filter(([, convs]) => convs.length > 0);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <Box sx={{ px: 2, py: 1.75, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          {!hideBack ? (
            <IconButton size="small" onClick={onBack}>
              <IconArrowLeft size={18} />
            </IconButton>
          ) : null}
          <Typography variant="subtitle1" sx={{ fontWeight: 800, flex: 1 }}>
            {hideBack ? 'Conversas' : 'Histórico'}
          </Typography>
          {onNewConversation ? (
            <Button
              size="small"
              variant="contained"
              startIcon={<IconPlus size={14} />}
              onClick={onNewConversation}
              sx={{ textTransform: 'none', borderRadius: 2 }}
            >
              Novo chat
            </Button>
          ) : null}
        </Box>

        <Box
          sx={(theme) => ({
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 1.25,
            py: 0.9,
            borderRadius: 2.5,
            border: `1px solid ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.08 : 0.08)}`,
            bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.02) : alpha(theme.palette.common.black, 0.015),
          })}
        >
          <IconSearch size={16} style={{ opacity: 0.6 }} />
          <InputBase
            fullWidth
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar conversa"
            sx={{ fontSize: '0.9rem' }}
          />
        </Box>
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
        ) : filteredEntries.length === 0 ? (
          <Box sx={{ textAlign: 'center', pt: 4 }}>
            <IconMessage size={32} style={{ opacity: 0.3 }} />
            <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 1 }}>
              Nenhuma conversa encontrada
            </Typography>
          </Box>
        ) : (
          filteredEntries.map(([label, convs]) => (
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
                    border: '1px solid',
                    borderColor: 'transparent',
                    '&:hover': { bgcolor: 'action.hover', borderColor: 'divider' },
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
