'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import AppShell from '@/components/AppShell';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import AvatarGroup from '@mui/material/AvatarGroup';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import InputBase from '@mui/material/InputBase';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import LinearProgress from '@mui/material/LinearProgress';
import {
  IconArrowLeft,
  IconBrandTrello,
  IconCalendar,
  IconCheck,
  IconExternalLink,
  IconPlus,
  IconRefresh,
  IconUserCheck,
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
  updated_at?: string | null;
};

type ProjectList = {
  id: string;
  name: string;
  position: number;
  is_archived?: boolean;
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

type AllocSuggestion = {
  display_name: string;
  email: string;
  score: number;
  reason: string;
  active_cards: number;
  sla_rate: number | null;
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

function isDueSoon(due?: string | null, complete?: boolean, hoursThreshold = 24) {
  if (!due || complete) return false;
  const diff = new Date(due).getTime() - Date.now();
  return diff > 0 && diff < hoursThreshold * 3_600_000;
}

function hoursSince(iso?: string | null): number | null {
  if (!iso) return null;
  return (Date.now() - new Date(iso).getTime()) / 3_600_000;
}

type JarvisAction = { label: string; color: 'error' | 'warning' | 'info' | 'secondary' };

function getJarvisAction(card: ProjectCard, listName: string): JarvisAction | null {
  const listUpper = listName.toUpperCase();
  const staleSince = hoursSince(card.updated_at);

  if (card.members.length === 0)
    return { label: 'Alocar', color: 'secondary' };

  if (isDueOverdue(card.due_date, card.due_complete))
    return { label: 'Atrasado', color: 'error' };

  if (isDueSoon(card.due_date, card.due_complete))
    return { label: 'Priorizar', color: 'warning' };

  const isAwaitingClient = listUpper.includes('APROVAÇÃO') || listUpper.includes('AGUARDANDO');
  if (isAwaitingClient && staleSince != null && staleSince > 48)
    return { label: 'Acionar', color: 'warning' };

  const isInProgress = listUpper.includes('ANDAMENTO') || listUpper.includes('PRODUÇÃO');
  if (isInProgress && staleSince != null && staleSince > 48)
    return { label: 'Verificar', color: 'info' };

  return null;
}

// ─── KanbanCard ───────────────────────────────────────────────────────────────

function KanbanCard({
  card, index, listName, onClick, onAllocate,
}: { card: ProjectCard; index: number; listName: string; onClick: () => void; onAllocate: (card: ProjectCard) => void }) {
  const overdue = isDueOverdue(card.due_date, card.due_complete);
  const jarvisAction = getJarvisAction(card, listName);

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <Box
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          sx={{
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: snapshot.isDragging ? 'primary.main' : 'divider',
            borderRadius: 1.5,
            p: 1.25,
            cursor: 'grab',
            boxShadow: snapshot.isDragging ? 4 : 0,
            opacity: snapshot.isDragging ? 0.95 : 1,
            transition: 'box-shadow 0.1s',
            '&:hover': { boxShadow: 2 },
            ...(card.cover_color ? { borderTop: `3px solid ${labelBg(card.cover_color)}` } : {}),
          }}
        >
          {card.labels.length > 0 && (
            <Stack direction="row" flexWrap="wrap" gap={0.5} mb={0.75}>
              {card.labels.map((l, i) => (
                <Box key={i} sx={{ width: 36, height: 8, borderRadius: 4, bgcolor: labelBg(l.color) }} />
              ))}
            </Stack>
          )}
          <Typography variant="body2" sx={{ lineHeight: 1.4, mb: 0.5 }}>
            {card.title}
          </Typography>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mt={0.75}>
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
            {jarvisAction && (
              <Chip
                label={jarvisAction.label}
                size="small"
                color={jarvisAction.color}
                sx={{ height: 18, fontSize: 10, fontWeight: 700, mr: 0.5, cursor: 'pointer' }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (jarvisAction.label === 'Alocar') onAllocate(card);
                }}
              />
            )}
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
      )}
    </Draggable>
  );
}

// ─── AddCardForm ──────────────────────────────────────────────────────────────

function AddCardForm({ onAdd, onCancel }: { onAdd: (title: string) => Promise<void>; onCancel: () => void }) {
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  async function handleSubmit() {
    const t = title.trim();
    if (!t) return;
    setSaving(true);
    try { await onAdd(t); } finally { setSaving(false); }
  }

  return (
    <Box
      sx={{
        bgcolor: 'background.paper', border: '1px solid', borderColor: 'primary.main',
        borderRadius: 1.5, p: 1,
      }}
    >
      <InputBase
        inputRef={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título do card..."
        multiline
        fullWidth
        sx={{ fontSize: 14, mb: 0.5 }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
          if (e.key === 'Escape') onCancel();
        }}
      />
      <Stack direction="row" spacing={0.5} mt={0.5}>
        <Button
          size="small" variant="contained" disabled={saving || !title.trim()}
          onClick={handleSubmit}
          sx={{ fontSize: 12, py: 0.25 }}
        >
          {saving ? <CircularProgress size={12} /> : 'Adicionar'}
        </Button>
        <IconButton size="small" onClick={onCancel}><IconX size={14} /></IconButton>
      </Stack>
    </Box>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProjectBoardClient({ boardId, noShell }: { boardId: string; noShell?: boolean }) {
  const [lists, setLists] = useState<ProjectList[]>([]);
  const [board, setBoard] = useState<ProjectBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCard, setSelectedCard] = useState<CardDetail | null>(null);
  const [loadingCard, setLoadingCard] = useState(false);
  const [addingToList, setAddingToList] = useState<string | null>(null);
  const [allocatingCard, setAllocatingCard] = useState<ProjectCard | null>(null);
  const [allocSuggestions, setAllocSuggestions] = useState<AllocSuggestion[]>([]);
  const [allocLoading, setAllocLoading] = useState(false);
  const [allocAssigning, setAllocAssigning] = useState<string | null>(null);

  const loadBoard = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet(`/trello/project-boards/${boardId}`);
      setBoard(data.board);
      setLists(data.board.lists ?? []);
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao carregar board.');
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => { loadBoard(); }, [loadBoard]);

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

  // ── Drag & drop ─────────────────────────────────────────────────────────────

  function onDragEnd(result: DropResult) {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const srcListId = source.droppableId;
    const dstListId = destination.droppableId;

    // Optimistic update
    setLists((prev) => {
      const next = prev.map((l) => ({ ...l, cards: [...l.cards] }));
      const srcList = next.find((l) => l.id === srcListId)!;
      const dstList = next.find((l) => l.id === dstListId)!;
      const activeCards = (l: ProjectList) => l.cards.filter((c) => !c.is_archived).sort((a, b) => a.position - b.position);

      const srcActive = activeCards(srcList);
      const [moved] = srcActive.splice(source.index, 1);

      if (srcListId === dstListId) {
        srcActive.splice(destination.index, 0, moved);
        srcActive.forEach((c, i) => { c.position = i * 65536; });
      } else {
        const dstActive = activeCards(dstList);
        dstActive.splice(destination.index, 0, { ...moved, list_id: dstListId });
        dstActive.forEach((c, i) => { c.position = i * 65536; });
        // rebuild both lists' cards arrays
        srcList.cards = srcList.cards.filter((c) => c.id !== draggableId || c.is_archived);
        dstList.cards = [
          ...dstList.cards.filter((c) => c.id !== draggableId || c.is_archived),
          ...dstActive,
        ];
        return next;
      }

      srcList.cards = [
        ...srcList.cards.filter((c) => c.is_archived),
        ...srcActive,
      ];
      return next;
    });

    // Compute new position for backend
    const dstList = lists.find((l) => l.id === dstListId)!;
    const dstActive = dstList.cards.filter((c) => !c.is_archived && c.id !== draggableId).sort((a, b) => a.position - b.position);
    const before = dstActive[destination.index - 1]?.position ?? 0;
    const after = dstActive[destination.index]?.position ?? (before + 131072);
    const newPos = (before + after) / 2;

    // Background sync
    apiPatch(`/trello/project-boards/${boardId}/cards/${draggableId}`, {
      list_id: dstListId,
      position: newPos,
    }).catch((err) => {
      console.error('Move sync failed:', err);
      loadBoard(); // revert on error
    });
  }

  // ── Add card ─────────────────────────────────────────────────────────────────

  async function addCard(listId: string, title: string) {
    await apiPost(`/trello/project-boards/${boardId}/cards`, { list_id: listId, title });
    setAddingToList(null);
    await loadBoard();
  }

  // ── Allocation ───────────────────────────────────────────────────────────────

  async function openAllocate(card: ProjectCard) {
    setAllocatingCard(card);
    setAllocSuggestions([]);
    setAllocLoading(true);
    try {
      const data = await apiGet(`/trello/ops-suggest-owner/${card.id}`);
      setAllocSuggestions(data.suggestions ?? []);
    } finally {
      setAllocLoading(false);
    }
  }

  async function assignOwner(email: string) {
    if (!allocatingCard) return;
    setAllocAssigning(email);
    try {
      await apiPost(`/trello/ops-cards/${allocatingCard.id}/assign`, { email });
      setAllocatingCard(null);
      await loadBoard();
    } finally {
      setAllocAssigning(null);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const Shell = noShell ? Box : ({ children }: { children: React.ReactNode }) => <AppShell title="Projetos" fullBleed>{children}</AppShell>;

  if (loading) return (
    <Shell>
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    </Shell>
  );

  if (error) return (
    <Shell>
      <Box sx={{ p: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    </Shell>
  );

  const visibleLists = lists.filter((l) => !l.is_archived);

  return (
    <Shell>
      {/* Header */}
      <Stack
        direction="row" alignItems="center" spacing={1.5}
        sx={{ px: 3, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', flexShrink: 0 }}
      >
        <IconButton size="small" href="/projetos">
          <IconArrowLeft size={18} />
        </IconButton>
        <IconBrandTrello size={20} color="#0052cc" />
        <Typography variant="h6" fontWeight={700} flex={1}>{board?.name}</Typography>
        {board?.trello_url && (
          <Tooltip title="Ver no Trello">
            <IconButton size="small" component="a" href={board.trello_url} target="_blank" rel="noreferrer">
              <IconExternalLink size={16} />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="Recarregar">
          <IconButton size="small" onClick={loadBoard}><IconRefresh size={16} /></IconButton>
        </Tooltip>
      </Stack>

      {/* Kanban */}
      <DragDropContext onDragEnd={onDragEnd}>
        <Box
          sx={{
            display: 'flex', flexDirection: 'row', gap: 2, p: 2,
            overflowX: 'auto', alignItems: 'flex-start',
            minHeight: 'calc(100vh - 120px)', bgcolor: '#f0f2f5',
          }}
        >
          {visibleLists.map((list) => {
            const activeCards = list.cards
              .filter((c) => !c.is_archived)
              .sort((a, b) => a.position - b.position);

            return (
              <Box
                key={list.id}
                sx={{ minWidth: 272, maxWidth: 272, bgcolor: '#ebecf0', borderRadius: 2, flexShrink: 0 }}
              >
                {/* List header */}
                <Stack
                  direction="row" justifyContent="space-between" alignItems="center"
                  sx={{ px: 1.5, pt: 1.5, pb: 1 }}
                >
                  <Typography variant="subtitle2" fontWeight={700}>{list.name}</Typography>
                  <Chip label={activeCards.length} size="small" sx={{ height: 18, fontSize: 11 }} />
                </Stack>

                {/* Cards */}
                <Droppable droppableId={list.id}>
                  {(provided, snapshot) => (
                    <Box
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      sx={{
                        px: 1.5, pb: 1, minHeight: 8,
                        bgcolor: snapshot.isDraggingOver ? '#d0d4db' : 'transparent',
                        borderRadius: 1, transition: 'background 0.15s',
                      }}
                    >
                      <Stack spacing={1}>
                        {activeCards.map((card, index) => (
                          <KanbanCard
                            key={card.id}
                            card={card}
                            index={index}
                            listName={list.name}
                            onClick={() => openCard(card)}
                            onAllocate={openAllocate}
                          />
                        ))}
                        {provided.placeholder}
                      </Stack>
                    </Box>
                  )}
                </Droppable>

                {/* Add card */}
                <Box sx={{ px: 1.5, pb: 1.5 }}>
                  {addingToList === list.id ? (
                    <AddCardForm
                      onAdd={(title) => addCard(list.id, title)}
                      onCancel={() => setAddingToList(null)}
                    />
                  ) : (
                    <Button
                      size="small"
                      startIcon={<IconPlus size={14} />}
                      onClick={() => setAddingToList(list.id)}
                      sx={{
                        width: '100%', justifyContent: 'flex-start',
                        color: 'text.secondary', fontWeight: 400,
                        '&:hover': { bgcolor: '#d4d8de', color: 'text.primary' },
                      }}
                    >
                      Adicionar card
                    </Button>
                  )}
                </Box>
              </Box>
            );
          })}
        </Box>
      </DragDropContext>

      {/* Allocation drawer */}
      <Drawer
        anchor="right"
        open={!!allocatingCard}
        onClose={() => setAllocatingCard(null)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 400 } } }}
      >
        <Box sx={{ p: 3, height: '100%', overflowY: 'auto' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Stack direction="row" spacing={1} alignItems="center">
              <IconUserCheck size={20} />
              <Typography variant="h6" fontWeight={700}>Alocar responsável</Typography>
            </Stack>
            <IconButton size="small" onClick={() => setAllocatingCard(null)}>
              <IconX size={18} />
            </IconButton>
          </Stack>

          {allocatingCard && (
            <Typography variant="body2" color="text.secondary" mb={2}>
              {allocatingCard.title}
            </Typography>
          )}

          <Divider sx={{ mb: 2 }} />

          {allocLoading ? (
            <Box>
              <LinearProgress sx={{ mb: 1 }} />
              <Typography variant="body2" color="text.secondary">Buscando sugestões...</Typography>
            </Box>
          ) : allocSuggestions.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Nenhum membro encontrado. Adicione membros ao board primeiro.
            </Typography>
          ) : (
            <Stack spacing={1.5}>
              {allocSuggestions.map((s, i) => (
                <Box
                  key={s.email}
                  sx={{
                    border: '1px solid', borderColor: 'divider', borderRadius: 1.5,
                    p: 1.5, bgcolor: i === 0 ? 'primary.lighter' : 'background.paper',
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box flex={1} mr={1}>
                      <Stack direction="row" spacing={1} alignItems="center" mb={0.25}>
                        <Typography variant="body2" fontWeight={700}>{s.display_name}</Typography>
                        {i === 0 && (
                          <Chip label="Recomendado" size="small" color="primary"
                            sx={{ height: 16, fontSize: 10, fontWeight: 700 }} />
                        )}
                      </Stack>
                      <Typography variant="caption" color="text.secondary">{s.reason}</Typography>
                    </Box>
                    <Stack alignItems="flex-end" spacing={0.5}>
                      <Typography variant="caption" fontWeight={700} color={s.score >= 70 ? 'success.main' : 'warning.main'}>
                        {s.score}pts
                      </Typography>
                      <Button
                        size="small" variant={i === 0 ? 'contained' : 'outlined'}
                        disabled={allocAssigning !== null}
                        onClick={() => assignOwner(s.email)}
                        sx={{ fontSize: 11, py: 0.25, px: 1, minWidth: 80 }}
                      >
                        {allocAssigning === s.email ? <CircularProgress size={12} /> : 'Atribuir'}
                      </Button>
                    </Stack>
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
        </Box>
      </Drawer>

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

            {selectedCard.labels.length > 0 && (
              <Stack direction="row" flexWrap="wrap" gap={0.5} mb={2}>
                {selectedCard.labels.map((l, i) => (
                  <Chip key={i} label={l.name || l.color} size="small"
                    sx={{ bgcolor: labelBg(l.color), color: '#fff', height: 20, fontSize: 11 }} />
                ))}
              </Stack>
            )}

            {selectedCard.due_date && (
              <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                <IconCalendar size={16} />
                <Typography variant="body2">Prazo: {fmtDate(selectedCard.due_date)}</Typography>
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

            {selectedCard.description && (
              <Box mb={2}>
                <Typography variant="subtitle2" fontWeight={600} mb={0.5}>Descrição</Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: 'text.secondary' }}>
                  {selectedCard.description}
                </Typography>
              </Box>
            )}

            {selectedCard.checklists?.map((cl) => (
              <Box key={cl.id} mb={2}>
                <Typography variant="subtitle2" fontWeight={600} mb={0.5}>{cl.name}</Typography>
                <Stack spacing={0.5}>
                  {cl.items.map((item, i) => (
                    <Stack key={i} direction="row" spacing={0.75} alignItems="flex-start">
                      <Box sx={{
                        width: 16, height: 16, borderRadius: 0.5, mt: 0.25, flexShrink: 0,
                        bgcolor: item.checked ? 'success.main' : 'action.disabled',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {item.checked && <IconCheck size={10} color="#fff" />}
                      </Box>
                      <Typography variant="body2"
                        sx={{ textDecoration: item.checked ? 'line-through' : 'none', color: item.checked ? 'text.disabled' : 'text.primary' }}>
                        {item.text}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            ))}

            {selectedCard.comments?.length > 0 && (
              <Box>
                <Typography variant="subtitle2" fontWeight={600} mb={1}>
                  Comentários ({selectedCard.comments.length})
                </Typography>
                <Stack spacing={1.5}>
                  {selectedCard.comments.map((c) => (
                    <Box key={c.id}>
                      <Stack direction="row" spacing={0.75} alignItems="center" mb={0.25}>
                        <Avatar sx={{ width: 22, height: 22, fontSize: 10 }}>{initials(c.author_name)}</Avatar>
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

            {selectedCard.trello_url && (
              <Box mt={3}>
                <Button size="small" variant="outlined" startIcon={<IconExternalLink size={14} />}
                  href={selectedCard.trello_url} target="_blank" rel="noreferrer">
                  Ver no Trello
                </Button>
              </Box>
            )}
          </Box>
        )}
      </Drawer>
    </Shell>
  );
}
