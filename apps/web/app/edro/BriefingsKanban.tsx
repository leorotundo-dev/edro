'use client';

import { useState } from 'react';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { IconCalendar, IconCheck, IconVideo } from '@tabler/icons-react';
import EdroAvatar from '@/components/shared/EdroAvatar';
import { getLabelPreset } from './BriefingCardDrawer';

type ChecklistItem = { id: string; text: string; done: boolean };

type Briefing = {
  id: string;
  client_name: string | null;
  client_logo_url?: string | null;
  client_brand_color?: string | null;
  title: string;
  status: string;
  created_at: string;
  due_at: string | null;
  traffic_owner: string | null;
  source: string | null;
  labels?: string[];
  checklist?: ChecklistItem[];
  meeting_url?: string | null;
};

const KANBAN_COLUMNS = [
  { key: 'briefing',          label: 'Briefing',          color: '#e3f2fd', accent: '#1976d2' },
  { key: 'copy_ia',           label: 'Copy IA',           color: '#f3e5f5', accent: '#7b1fa2' },
  { key: 'alinhamento',       label: 'Alinhamento',       color: '#fff3e0', accent: '#f57c00' },
  { key: 'producao',          label: 'Produção',          color: '#e0f2f1', accent: '#00796b' },
  { key: 'aprovacao_interna', label: 'Aprovação Interna', color: '#fff8e1', accent: '#f9a825' },
  { key: 'ajustes',           label: 'Ajustes',           color: '#fce4ec', accent: '#c62828' },
  { key: 'aprovacao_cliente', label: 'Aprovação Cliente', color: '#e8eaf6', accent: '#3949ab' },
  { key: 'concluido',         label: 'Concluído',         color: '#e8f5e9', accent: '#2e7d32' },
];

function formatShortDate(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function ownerInitials(name: string | null | undefined) {
  if (!name) return '';
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

type Props = {
  briefings: Briefing[];
  onBriefingClick: (id: string) => void;
  onStageChange: (briefingId: string, newStage: string) => Promise<void>;
  stageChangingId?: string | null;
};

export default function BriefingsKanban({ briefings, onBriefingClick, onStageChange, stageChangingId }: Props) {
  const [draggingId,       setDraggingId]       = useState<string | null>(null);
  const [dropTargetColumn, setDropTargetColumn] = useState<string | null>(null);

  // Normaliza etapas legadas para o novo fluxo
  const LEGACY_MAP: Record<string, string> = {
    iclips_in: 'alinhamento',
    iclips_out: 'aprovacao_cliente',
    aprovacao: 'aprovacao_interna',
    revisao: 'ajustes',
    entrega: 'concluido',
    done: 'concluido',
  };
  const normalizedBriefings = briefings.map((b) => ({
    ...b,
    status: LEGACY_MAP[b.status] ?? b.status,
  }));

  const grouped = KANBAN_COLUMNS.reduce<Record<string, Briefing[]>>((acc, col) => {
    acc[col.key] = normalizedBriefings.filter((b) => b.status === col.key);
    return acc;
  }, {});

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'row',
        gap: 1.5,
        overflowX: 'auto',
        pb: 2,
        mx: -2,
        px: 2,
        minHeight: 400,
      }}
    >
      {KANBAN_COLUMNS.map((col) => {
        const cards  = grouped[col.key] || [];
        const isTarget = dropTargetColumn === col.key;

        return (
          <Box
            key={col.key}
            sx={{
              minWidth: 236,
              width: 236,
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              bgcolor: isTarget ? 'action.selected' : 'background.paper',
              borderRadius: 2,
              border: '1px solid',
              borderColor: isTarget ? col.accent : 'divider',
              borderStyle: isTarget ? 'dashed' : 'solid',
              borderTop: `3px solid ${col.accent}`,
              transition: 'all 0.15s',
              p: 1,
            }}
            onDragOver={(e) => { e.preventDefault(); setDropTargetColumn(col.key); }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setDropTargetColumn(null);
              }
            }}
            onDrop={async (e) => {
              e.preventDefault();
              setDropTargetColumn(null);
              const id = e.dataTransfer.getData('briefing_id');
              if (!id) return;
              const briefing = briefings.find((b) => b.id === id);
              if (!briefing || briefing.status === col.key) return;
              await onStageChange(id, col.key);
            }}
          >
            {/* Column header */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" px={0.5} py={0.25}>
              <Typography variant="caption" fontWeight={800} noWrap sx={{ color: col.accent }}>
                {col.label}
              </Typography>
              <Chip
                label={cards.length}
                size="small"
                sx={{ height: 18, fontSize: '0.6rem', bgcolor: col.color, color: col.accent, fontWeight: 700, minWidth: 24 }}
              />
            </Stack>

            {/* Cards */}
            <Stack spacing={0.75} sx={{ flex: 1, overflowY: 'auto', maxHeight: 'calc(100vh - 300px)' }}>
              {cards.length === 0 && (
                <Typography variant="caption" color="text.disabled" sx={{ px: 0.5, pt: 0.5 }}>
                  Vazio
                </Typography>
              )}
              {cards.map((briefing) => {
                const isChanging = stageChangingId === briefing.id;
                const isDragging = draggingId === briefing.id;
                const dueDate    = formatShortDate(briefing.due_at);
                const isOverdue  = briefing.due_at ? new Date(briefing.due_at) < new Date() : false;
                const labels     = briefing.labels ?? [];
                const checklist  = briefing.checklist ?? [];
                const doneCount  = checklist.filter((i) => i.done).length;
                const allDone    = checklist.length > 0 && doneCount === checklist.length;

                return (
                  <Card
                    key={briefing.id}
                    variant="outlined"
                    draggable
                    onDragStart={(e) => {
                      setDraggingId(briefing.id);
                      e.dataTransfer.setData('briefing_id', briefing.id);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragEnd={() => setDraggingId(null)}
                    onClick={() => onBriefingClick(briefing.id)}
                    sx={{
                      cursor: isDragging ? 'grabbing' : 'grab',
                      opacity: isDragging ? 0.4 : isChanging ? 0.6 : 1,
                      transition: 'opacity 0.15s, box-shadow 0.15s',
                      '&:hover': { boxShadow: 3 },
                      borderRadius: 1.5,
                    }}
                  >
                    <CardContent sx={{ p: '8px 10px !important' }}>
                      {isChanging && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 0.75 }}>
                          <CircularProgress size={14} />
                        </Box>
                      )}

                      {/* Label dots */}
                      {labels.length > 0 && (
                        <Stack direction="row" spacing={0.4} mb={0.5} flexWrap="wrap">
                          {labels.slice(0, 3).map((key) => {
                            const preset = getLabelPreset(key);
                            if (!preset) return null;
                            return (
                              <Tooltip key={key} title={preset.label} placement="top">
                                <Box sx={{
                                  width: 10,
                                  height: 10,
                                  borderRadius: '50%',
                                  bgcolor: preset.color,
                                  flexShrink: 0,
                                }} />
                              </Tooltip>
                            );
                          })}
                          {labels.length > 3 && (
                            <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.disabled' }}>
                              +{labels.length - 3}
                            </Typography>
                          )}
                        </Stack>
                      )}

                      {/* Title */}
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        title={briefing.title}
                        sx={{
                          lineHeight: 1.3,
                          mb: 0.5,
                          fontSize: '0.78rem',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {briefing.title}
                      </Typography>

                      {/* Client */}
                      {briefing.client_name && (
                        <Stack direction="row" spacing={0.4} alignItems="center" mb={0.4}>
                          <EdroAvatar
                            src={briefing.client_logo_url}
                            name={briefing.client_name}
                            size={16}
                            sx={briefing.client_brand_color ? { bgcolor: `${briefing.client_brand_color}33` } : undefined}
                          />
                          <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.68rem' }}>
                            {briefing.client_name}
                          </Typography>
                        </Stack>
                      )}

                      {/* Due date + owner avatar */}
                      <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Stack direction="row" spacing={0.4} alignItems="center">
                          {dueDate && (
                            <>
                              <IconCalendar size={11} color={isOverdue ? '#f44336' : 'gray'} />
                              <Typography
                                variant="caption"
                                color={isOverdue ? 'error' : 'text.secondary'}
                                sx={{ fontSize: '0.68rem' }}
                              >
                                {dueDate}
                              </Typography>
                            </>
                          )}
                        </Stack>
                        {briefing.traffic_owner && (
                          <Tooltip title={briefing.traffic_owner}>
                            <Avatar sx={{ width: 18, height: 18, fontSize: '0.55rem', bgcolor: 'primary.main' }}>
                              {ownerInitials(briefing.traffic_owner)}
                            </Avatar>
                          </Tooltip>
                        )}
                      </Stack>

                      {/* Checklist + meeting badges */}
                      {(checklist.length > 0 || briefing.meeting_url) && (
                        <Stack direction="row" alignItems="center" spacing={0.75} mt={0.4} flexWrap="wrap">
                          {checklist.length > 0 && (
                            <Stack direction="row" alignItems="center" spacing={0.3}>
                              <IconCheck size={10} color={allDone ? '#4caf50' : 'gray'} />
                              <Typography
                                variant="caption"
                                sx={{ fontSize: '0.65rem', color: allDone ? 'success.main' : 'text.secondary' }}
                              >
                                {doneCount}/{checklist.length}
                              </Typography>
                            </Stack>
                          )}
                          {briefing.meeting_url && (
                            <Tooltip title="Reunião vinculada" placement="top">
                              <Box
                                component="a"
                                href={briefing.meeting_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                sx={{ display: 'flex', alignItems: 'center', color: '#1976d2', lineHeight: 0 }}
                              >
                                <IconVideo size={11} />
                              </Box>
                            </Tooltip>
                          )}
                        </Stack>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </Stack>
          </Box>
        );
      })}
    </Box>
  );
}
