'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiGet, apiPatch } from '@/lib/api';
import AppShell from '@/components/AppShell';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import AvatarGroup from '@mui/material/AvatarGroup';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import {
  IconArrowLeft,
  IconBrandTrello,
  IconCalendar,
  IconCheck,
  IconExternalLink,
  IconRefresh,
  IconX,
} from '@tabler/icons-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type CardMember = {
  id: string;
  display_name: string;
  avatar_url?: string | null;
};

type ProjectCard = {
  id: string;
  list_id: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  due_complete: boolean;
  labels: { color: string; name: string }[];
  cover_color?: string | null;
  is_archived: boolean;
  trello_url?: string | null;
  members: CardMember[];
  position: number;
};

type ProjectList = {
  id: string;
  name: string;
  position: number;
  cards: ProjectCard[];
};

type ProjectBoard = {
  id: string;
  name: string;
  description?: string | null;
  client_id?: string | null;
  trello_board_id?: string | null;
  trello_url?: string | null;
  lists: ProjectList[];
};

type CardDetail = ProjectCard & {
  checklists: { id: string; name: string; items: { text: string; checked: boolean }[] }[];
  comments: { id: string; body: string; author_name: string; commented_at: string }[];
};

// ─── Label colors ─────────────────────────────────────────────────────────────

const LABEL_COLORS: Record<string, string> = {
  green: '#61bd4f', yellow: '#f2d600', orange: '#ff9f1a',
  red: '#eb5a46', purple: '#c377e0', blue: '#0079bf',
  sky: '#00c2e0', lime: '#51e898', pink: '#ff78cb',
  black: '#344563',
};

function labelBg(color: string) {
  return LABEL_COLORS[color] ?? '#64748b';
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(v?: string | null) {
  if (!v) return null;
  return new Date(v).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

function isDueOverdue(due?: string | null, complete?: boolean) {
  if (!due || complete) return false;
  return new Date(due) < new Date();
}

// ─── Card component ───────────────────────────────────────────────────────────

function KanbanCard({ card, onClick }: { card: ProjectCard; onClick: () => void }) {
  const overdue = isDueOverdue(card.due_date, card.due_complete);

  return (
    <Box
      onClick={onClick}
      sx={{
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1.5,
        p: 1.25,
        cursor: 'pointer',
        '&:hover': { boxShadow: 2 },
        ...(card.cover_color ? { borderTop: `3px solid ${labelBg(card.cover_color)}` } : {}),
      }}
    >
      {/* Labels */}
      {card.labels.length > 0 && (
        <Stack direction="row" flexWrap="wrap" gap={0.5} mb={0.75}>
          {card.labels.map((l, i) => (
            <Box
              key={i}
              sx={{
                width: 36, height: 8, borderRadius: 4,
                bgcolor: labelBg(l.color),
              }}
            />
          ))}
        </Stack>
      )}

      <Typography variant="body2" sx={{ lineHeight: 1.4, mb: 0.5 }}>
        {card.title}
      </Typography>

      <Stack direction="row" justifyContent="space-between" alignItems="center" mt={0.75}>
        {/* Due date */}
        {card.due_date && (
          <Chip
            label={fmtDate(card.due_date)}
            size="small"
            icon={<IconCalendar size={12} />}
            color={card.due_complete ? 'success' : overdue ? 'error' : 'default'}
            sx={{ height: 20, fontSize: 11 }}
          />
        )}
        <Box flex={1} />

        {/* Members */}
        {card.members?.length > 0 && (
          <AvatarGroup max={3} sx={{ '& .MuiAvatar-root': { width: 22, height: 22, fontSize: 10 } }}>
            {card.members.map((m) => (
              <Tooltip key={m.id} title={m.display_name}>
                <Avatar src={m.avatar_url ?? undefined} sx={{ width: 22, height: 22, fontSize: 10 }}>
                  {initials(m.display_name)}
                </Avatar>
              </Tooltip>
            ))}
          </AvatarGroup>
        )}
      </Stack>
    </Box>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProjectBoardClient({ boardId }: { boardId: string }) {
  const [board, setBoard] = useState<ProjectBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedCard, setSelectedCard] = useState<CardDetail | null>(null);
  const [loadingCard, setLoadingCard] = useState(false);

  const loadBoard = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet(`/trello/project-boards/${boardId}`);
      setBoard(data.board);
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao carregar board.');
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  async function openCard(card: ProjectCard) {
    setLoadingCard(true);
    try {
      const data = await apiGet(`/trello/project-boards/${boardId}/cards/${card.id}`);
      setSelectedCard(data.card);
    } catch {
      setSelectedCard({ ...card, checklists: [], comments: [] });
    } finally {
      setLoadingCard(false);
    }
  }

  async function toggleDueComplete(card: ProjectCard) {
    await apiPatch(`/trello/project-boards/${boardId}/cards/${card.id}`, {
      due_complete: !card.due_complete,
    });
    await loadBoard();
    if (selectedCard?.id === card.id) {
      setSelectedCard((prev) => prev ? { ...prev, due_complete: !prev.due_complete } : prev);
    }
  }

  if (loading) return (
    <AppShell title="Projetos">
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    </AppShell>
  );

  if (error) return (
    <AppShell title="Projetos">
      <Box sx={{ p: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    </AppShell>
  );

  const lists = board?.lists ?? [];

  return (
    <AppShell title={board?.name ?? 'Projetos'}>
      {/* Header */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.5}
        sx={{ px: 3, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}
      >
        <IconButton size="small" href="/projetos">
          <IconArrowLeft size={18} />
        </IconButton>
        <IconBrandTrello size={20} color="#0052cc" />
        <Typography variant="h6" fontWeight={700} flex={1}>
          {board?.name}
        </Typography>
        {board?.trello_url && (
          <Tooltip title="Ver no Trello">
            <IconButton size="small" component="a" href={board.trello_url} target="_blank" rel="noreferrer">
              <IconExternalLink size={16} />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="Recarregar">
          <IconButton size="small" onClick={loadBoard}>
            <IconRefresh size={16} />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* Kanban columns */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          gap: 2,
          p: 2,
          overflowX: 'auto',
          alignItems: 'flex-start',
          minHeight: 'calc(100vh - 120px)',
          bgcolor: '#f0f2f5',
        }}
      >
        {lists.filter((l) => !l.cards?.every((c) => c.is_archived)).map((list) => {
          const activeCards = list.cards.filter((c) => !c.is_archived);
          return (
            <Box
              key={list.id}
              sx={{
                minWidth: 272,
                maxWidth: 272,
                bgcolor: '#ebecf0',
                borderRadius: 2,
                flexShrink: 0,
              }}
            >
              {/* List header */}
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ px: 1.5, pt: 1.5, pb: 1 }}
              >
                <Typography variant="subtitle2" fontWeight={700}>
                  {list.name}
                </Typography>
                <Chip label={activeCards.length} size="small" sx={{ height: 18, fontSize: 11 }} />
              </Stack>

              {/* Cards */}
              <Stack spacing={1} sx={{ px: 1.5, pb: 1.5 }}>
                {activeCards
                  .sort((a, b) => a.position - b.position)
                  .map((card) => (
                    <KanbanCard key={card.id} card={card} onClick={() => openCard(card)} />
                  ))}
              </Stack>
            </Box>
          );
        })}
      </Box>

      {/* Card detail drawer */}
      <Drawer
        anchor="right"
        open={!!selectedCard || loadingCard}
        onClose={() => setSelectedCard(null)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 480 } } }}
      >
        {loadingCard ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
            <CircularProgress />
          </Box>
        ) : selectedCard && (
          <Box sx={{ p: 3, height: '100%', overflowY: 'auto' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
              <Typography variant="h6" fontWeight={700} sx={{ flex: 1, pr: 2 }}>
                {selectedCard.title}
              </Typography>
              <IconButton size="small" onClick={() => setSelectedCard(null)}>
                <IconX size={18} />
              </IconButton>
            </Stack>

            {/* Labels */}
            {selectedCard.labels.length > 0 && (
              <Stack direction="row" flexWrap="wrap" gap={0.5} mb={2}>
                {selectedCard.labels.map((l, i) => (
                  <Chip
                    key={i}
                    label={l.name || l.color}
                    size="small"
                    sx={{ bgcolor: labelBg(l.color), color: '#fff', height: 20, fontSize: 11 }}
                  />
                ))}
              </Stack>
            )}

            {/* Due date */}
            {selectedCard.due_date && (
              <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                <IconCalendar size={16} />
                <Typography variant="body2">
                  Prazo: {fmtDate(selectedCard.due_date)}
                </Typography>
                <Button
                  size="small"
                  variant={selectedCard.due_complete ? 'contained' : 'outlined'}
                  color={selectedCard.due_complete ? 'success' : isDueOverdue(selectedCard.due_date) ? 'error' : 'primary'}
                  startIcon={selectedCard.due_complete ? <IconCheck size={14} /> : undefined}
                  onClick={() => toggleDueComplete(selectedCard)}
                  sx={{ py: 0, px: 1, fontSize: 11, height: 24 }}
                >
                  {selectedCard.due_complete ? 'Concluído' : 'Marcar como feito'}
                </Button>
              </Stack>
            )}

            {/* Members */}
            {selectedCard.members?.length > 0 && (
              <Stack direction="row" spacing={1} alignItems="center" mb={2} flexWrap="wrap">
                {selectedCard.members.map((m) => (
                  <Stack key={m.id} direction="row" spacing={0.75} alignItems="center">
                    <Avatar src={m.avatar_url ?? undefined} sx={{ width: 28, height: 28, fontSize: 12 }}>
                      {initials(m.display_name)}
                    </Avatar>
                    <Typography variant="caption">{m.display_name}</Typography>
                  </Stack>
                ))}
              </Stack>
            )}

            {/* Description */}
            {selectedCard.description && (
              <Box mb={2}>
                <Typography variant="subtitle2" fontWeight={600} mb={0.5}>Descrição</Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: 'text.secondary' }}>
                  {selectedCard.description}
                </Typography>
              </Box>
            )}

            {/* Checklists */}
            {selectedCard.checklists?.map((cl) => (
              <Box key={cl.id} mb={2}>
                <Typography variant="subtitle2" fontWeight={600} mb={0.5}>{cl.name}</Typography>
                <Stack spacing={0.5}>
                  {cl.items.map((item, i) => (
                    <Stack key={i} direction="row" spacing={0.75} alignItems="flex-start">
                      <Box
                        sx={{
                          width: 16, height: 16, borderRadius: 0.5, mt: 0.25, flexShrink: 0,
                          bgcolor: item.checked ? 'success.main' : 'action.disabled',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        {item.checked && <IconCheck size={10} color="#fff" />}
                      </Box>
                      <Typography
                        variant="body2"
                        sx={{ textDecoration: item.checked ? 'line-through' : 'none', color: item.checked ? 'text.disabled' : 'text.primary' }}
                      >
                        {item.text}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            ))}

            {/* Comments */}
            {selectedCard.comments?.length > 0 && (
              <Box>
                <Typography variant="subtitle2" fontWeight={600} mb={1}>
                  Comentários ({selectedCard.comments.length})
                </Typography>
                <Stack spacing={1.5}>
                  {selectedCard.comments.map((c) => (
                    <Box key={c.id}>
                      <Stack direction="row" spacing={0.75} alignItems="center" mb={0.25}>
                        <Avatar sx={{ width: 22, height: 22, fontSize: 10 }}>
                          {initials(c.author_name)}
                        </Avatar>
                        <Typography variant="caption" fontWeight={600}>{c.author_name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(c.commented_at).toLocaleDateString('pt-BR')}
                        </Typography>
                      </Stack>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', pl: 3.5, color: 'text.secondary' }}>
                        {c.body}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}

            {/* Open in Trello */}
            {selectedCard.trello_url && (
              <Box mt={3}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<IconExternalLink size={14} />}
                  href={selectedCard.trello_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ver no Trello
                </Button>
              </Box>
            )}
          </Box>
        )}
      </Drawer>
    </AppShell>
  );
}
