'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import InputBase from '@mui/material/InputBase';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Popover from '@mui/material/Popover';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import {
  IconCalendar,
  IconCheck,
  IconClock,
  IconExternalLink,
  IconLabel,
  IconPlayerPlay,
  IconPlayerStop,
  IconPlus,
  IconTrash,
  IconUser,
  IconX,
} from '@tabler/icons-react';
import { apiGet, apiPatch, apiPost } from '@/lib/api';

// ── Label presets ────────────────────────────────────────────────────────────

export const LABEL_PRESETS = [
  { key: 'urgent',     label: 'Urgente',        color: '#ef5350' },
  { key: 'revision',   label: 'Revisão',         color: '#ff9800' },
  { key: 'client_vip', label: 'Cliente VIP',     color: '#4caf50' },
  { key: 'blocked',    label: 'Bloqueado',       color: '#ffc107' },
  { key: 'ai_done',    label: 'Copy IA Pronto',  color: '#2196f3' },
  { key: 'approved',   label: 'Aprovado',        color: '#9c27b0' },
];

export function getLabelPreset(key: string) {
  return LABEL_PRESETS.find((l) => l.key === key);
}

// ── Workflow stages ───────────────────────────────────────────────────────────

const WORKFLOW_STAGES = [
  { key: 'briefing',   label: 'Briefing' },
  { key: 'iclips_in',  label: 'iClips Entrada' },
  { key: 'alinhamento',label: 'Alinhamento' },
  { key: 'copy_ia',    label: 'Copy IA' },
  { key: 'aprovacao',  label: 'Aprovação' },
  { key: 'producao',   label: 'Produção' },
  { key: 'revisao',    label: 'Revisão' },
  { key: 'iclips_out', label: 'iClips Saída' },
  { key: 'done',       label: 'Concluído' },
];

// ── Types ────────────────────────────────────────────────────────────────────

type ChecklistItem = { id: string; text: string; done: boolean };

type BriefingDetail = {
  id: string;
  title: string;
  status: string;
  due_at: string | null;
  traffic_owner: string | null;
  labels: string[];
  checklist: ChecklistItem[];
  client_name?: string | null;
  client_logo_url?: string | null;
  client_brand_color?: string | null;
};

type FreelancerProfile = {
  id: string;
  display_name: string;
  specialty: string | null;
  hourly_rate_brl: string | null;
};

type ActiveTimer = {
  id: string;
  freelancer_id: string;
  briefing_id: string;
  started_at: string;
};

type Props = {
  briefingId: string | null;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<BriefingDetail>) => void;
};

// ── Helper ───────────────────────────────────────────────────────────────────

function initials(name: string | null | undefined) {
  if (!name) return '?';
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ── LabelPicker ───────────────────────────────────────────────────────────────

function LabelPicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (labels: string[]) => void;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  const toggle = (key: string) => {
    const next = selected.includes(key)
      ? selected.filter((k) => k !== key)
      : [...selected, key];
    onChange(next);
  };

  return (
    <>
      <Stack direction="row" flexWrap="wrap" gap={0.5} alignItems="center">
        {selected.map((key) => {
          const preset = getLabelPreset(key);
          if (!preset) return null;
          return (
            <Chip
              key={key}
              label={preset.label}
              size="small"
              onDelete={() => toggle(key)}
              sx={{
                bgcolor: preset.color + '22',
                color: preset.color,
                fontWeight: 600,
                fontSize: '0.7rem',
                borderLeft: `3px solid ${preset.color}`,
                borderRadius: 1,
                '& .MuiChip-deleteIcon': { color: preset.color, fontSize: 14 },
              }}
            />
          );
        })}
        <Tooltip title="Adicionar label">
          <IconButton size="small" onClick={(e) => setAnchor(e.currentTarget)}>
            <IconLabel size={14} />
          </IconButton>
        </Tooltip>
      </Stack>

      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ p: 1.5, minWidth: 180 }}>
          <Typography variant="caption" fontWeight={700} color="text.secondary" mb={1} display="block">
            Labels
          </Typography>
          <Stack spacing={0.5}>
            {LABEL_PRESETS.map((preset) => {
              const active = selected.includes(preset.key);
              return (
                <Stack
                  key={preset.key}
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  onClick={() => toggle(preset.key)}
                  sx={{
                    cursor: 'pointer',
                    borderRadius: 1,
                    px: 1,
                    py: 0.5,
                    bgcolor: active ? preset.color + '22' : 'transparent',
                    '&:hover': { bgcolor: preset.color + '11' },
                  }}
                >
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: preset.color, flexShrink: 0 }} />
                  <Typography variant="body2" sx={{ flex: 1 }}>{preset.label}</Typography>
                  {active && <IconCheck size={14} color={preset.color} />}
                </Stack>
              );
            })}
          </Stack>
        </Box>
      </Popover>
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function BriefingCardDrawer({ briefingId, onClose, onUpdate }: Props) {
  const [data, setData]       = useState<BriefingDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [newItem, setNewItem] = useState('');
  const [saving, setSaving]   = useState(false);
  const newItemRef            = useRef<HTMLInputElement>(null);

  // Timer state
  const [freelancers,      setFreelancers]      = useState<FreelancerProfile[]>([]);
  const [selectedFl,       setSelectedFl]       = useState<string>('');
  const [activeTimer,      setActiveTimer]       = useState<ActiveTimer | null>(null);
  const [elapsedSeconds,   setElapsedSeconds]   = useState(0);
  const [timerLoading,     setTimerLoading]     = useState(false);
  const [totalMinutes,     setTotalMinutes]     = useState<number>(0);
  const [stopDialogOpen,   setStopDialogOpen]   = useState(false);
  const [stopDescription,  setStopDescription]  = useState('');

  // Load briefing detail when drawer opens
  useEffect(() => {
    if (!briefingId) { setData(null); return; }
    setLoading(true);
    apiGet<{ success: boolean; data: { briefing: BriefingDetail } }>(
      `/edro/briefings/${briefingId}`
    )
      .then((res) => {
        const b = res.data.briefing;
        setData({
          ...b,
          labels:    Array.isArray(b.labels)    ? b.labels    : [],
          checklist: Array.isArray(b.checklist) ? b.checklist : [],
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [briefingId]);

  // Load freelancer list once
  useEffect(() => {
    apiGet<FreelancerProfile[]>('/freelancers')
      .then((rows) => {
        const list = Array.isArray(rows) ? rows : (rows as any)?.data ?? [];
        setFreelancers(list);
        if (list.length === 1) setSelectedFl(list[0].id);
      })
      .catch(() => {});
  }, []);

  // When briefing changes: load active timer + total hours
  useEffect(() => {
    if (!briefingId || !selectedFl) return;
    apiGet<{ timers: ActiveTimer[] }>(`/freelancers/${selectedFl}/timer/active`)
      .then((res) => {
        const timer = res.timers?.find((t) => t.briefing_id === briefingId) ?? null;
        setActiveTimer(timer);
        if (timer) {
          setElapsedSeconds(Math.floor((Date.now() - new Date(timer.started_at).getTime()) / 1000));
        } else {
          setElapsedSeconds(0);
        }
      })
      .catch(() => {});

    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    apiGet<{ entries: { minutes: number }[] }>(`/freelancers/${selectedFl}/time-entries?month=${month}`)
      .then((res) => {
        const total = (res.entries ?? [])
          .filter((e: any) => e.briefing_id === briefingId || true) // all for now
          .reduce((s: number, e: any) => s + (e.minutes ?? 0), 0);
        // filter to this briefing
        apiGet<{ entries: { minutes: number; briefing_id: string }[] }>(`/freelancers/${selectedFl}/time-entries`)
          .then((r) => {
            const sum = (r.entries ?? [])
              .filter((e) => (e as any).briefing_id === briefingId)
              .reduce((s, e) => s + (e.minutes ?? 0), 0);
            setTotalMinutes(sum);
          })
          .catch(() => {});
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [briefingId, selectedFl]);

  // Tick elapsed seconds while timer is running
  useEffect(() => {
    if (!activeTimer) return;
    const interval = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [activeTimer]);

  const handleTimerStart = async () => {
    if (!selectedFl || !briefingId) return;
    setTimerLoading(true);
    try {
      const res = await apiPost<{ timer: ActiveTimer }>('/freelancers/timer/start', {
        freelancer_id: selectedFl,
        briefing_id: briefingId,
      });
      setActiveTimer(res.timer);
      setElapsedSeconds(0);
    } catch { /* silent */ } finally {
      setTimerLoading(false);
    }
  };

  const handleTimerStop = async () => {
    if (!selectedFl || !briefingId || !activeTimer) return;
    setTimerLoading(true);
    try {
      const res = await apiPost<{ entry: { minutes: number } }>('/freelancers/timer/stop', {
        freelancer_id: selectedFl,
        briefing_id: briefingId,
        description: stopDescription.trim() || null,
      });
      setActiveTimer(null);
      setElapsedSeconds(0);
      setStopDialogOpen(false);
      setStopDescription('');
      if (res.entry) setTotalMinutes((m) => m + (res.entry.minutes ?? 0));
    } catch { /* silent */ } finally {
      setTimerLoading(false);
    }
  };

  function formatElapsed(secs: number) {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  }

  function formatTotalMinutes(mins: number) {
    if (!mins) return '0min';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m > 0 ? m + 'min' : ''}`.trim() : `${m}min`;
  }

  // Debounced title save
  const debouncedTitle = useDebounce(data?.title ?? '', 800);
  const titleSavedRef = useRef('');
  useEffect(() => {
    if (!data?.id || !debouncedTitle || debouncedTitle === titleSavedRef.current) return;
    titleSavedRef.current = debouncedTitle;
    patch({ title: debouncedTitle });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedTitle]);

  const patch = useCallback(async (fields: Partial<BriefingDetail>) => {
    if (!data?.id) return;
    setSaving(true);
    try {
      await apiPatch(`/edro/briefings/${data.id}`, fields);
      onUpdate(data.id, fields);
    } catch { /* silent */ } finally {
      setSaving(false);
    }
  }, [data?.id, onUpdate]);

  const handleLabelChange = (labels: string[]) => {
    setData((d) => d ? { ...d, labels } : d);
    patch({ labels });
  };

  const handleStatusChange = (status: string) => {
    setData((d) => d ? { ...d, status } : d);
    patch({ status });
  };

  const handleOwnerChange = (traffic_owner: string) => {
    setData((d) => d ? { ...d, traffic_owner } : d);
    patch({ traffic_owner });
  };

  const handleDueDateChange = (due_at: string) => {
    setData((d) => d ? { ...d, due_at } : d);
    patch({ due_at });
  };

  const toggleCheckItem = (itemId: string) => {
    if (!data) return;
    const checklist = data.checklist.map((item) =>
      item.id === itemId ? { ...item, done: !item.done } : item
    );
    setData({ ...data, checklist });
    patch({ checklist });
  };

  const deleteCheckItem = (itemId: string) => {
    if (!data) return;
    const checklist = data.checklist.filter((item) => item.id !== itemId);
    setData({ ...data, checklist });
    patch({ checklist });
  };

  const addCheckItem = () => {
    if (!newItem.trim() || !data) return;
    const item: ChecklistItem = {
      id: crypto.randomUUID(),
      text: newItem.trim(),
      done: false,
    };
    const checklist = [...data.checklist, item];
    setData({ ...data, checklist });
    patch({ checklist });
    setNewItem('');
    setTimeout(() => newItemRef.current?.focus(), 50);
  };

  const doneCount  = data?.checklist.filter((i) => i.done).length ?? 0;
  const totalCount = data?.checklist.length ?? 0;
  const progress   = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <Drawer
      anchor="right"
      open={Boolean(briefingId)}
      onClose={onClose}
      PaperProps={{
        sx: { width: { xs: '100vw', sm: 520 }, display: 'flex', flexDirection: 'column' },
      }}
    >
      {/* Header */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          {saving && <CircularProgress size={14} />}
          {data?.client_name && (
            <Typography variant="caption" color="text.secondary" noWrap>
              {data.client_name}
            </Typography>
          )}
        </Stack>
        <Stack direction="row" spacing={0.5}>
          {data && (
            <Tooltip title="Abrir página completa">
              <IconButton size="small" href={`/edro/${data.id}`} target="_blank" component="a">
                <IconExternalLink size={16} />
              </IconButton>
            </Tooltip>
          )}
          <IconButton size="small" onClick={onClose}>
            <IconX size={16} />
          </IconButton>
        </Stack>
      </Stack>

      {/* Body */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2.5 }}>
        {loading ? (
          <Stack alignItems="center" py={6}><CircularProgress /></Stack>
        ) : !data ? null : (
          <Stack spacing={2.5}>
            {/* Title */}
            <InputBase
              value={data.title}
              onChange={(e) => setData({ ...data, title: e.target.value })}
              multiline
              fullWidth
              sx={{
                fontSize: '1.1rem',
                fontWeight: 700,
                lineHeight: 1.4,
                '& textarea': { p: 0 },
              }}
            />

            {/* Stage + Due date + Owner row */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Box flex={1}>
                <Typography variant="caption" color="text.secondary" mb={0.5} display="block">Etapa</Typography>
                <Select
                  size="small"
                  value={data.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  fullWidth
                  sx={{ fontSize: '0.85rem' }}
                >
                  {WORKFLOW_STAGES.map((s) => (
                    <MenuItem key={s.key} value={s.key}>{s.label}</MenuItem>
                  ))}
                </Select>
              </Box>

              <Box flex={1}>
                <Typography variant="caption" color="text.secondary" mb={0.5} display="block">
                  <IconCalendar size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                  Data de entrega
                </Typography>
                <TextField
                  type="date"
                  size="small"
                  fullWidth
                  value={data.due_at ? data.due_at.slice(0, 10) : ''}
                  onChange={(e) => handleDueDateChange(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ '& input': { fontSize: '0.85rem' } }}
                />
              </Box>

              <Box flex={1}>
                <Typography variant="caption" color="text.secondary" mb={0.5} display="block">
                  <IconUser size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                  Responsável
                </Typography>
                <TextField
                  size="small"
                  fullWidth
                  value={data.traffic_owner ?? ''}
                  placeholder="Nome do responsável"
                  onChange={(e) => setData({ ...data, traffic_owner: e.target.value })}
                  onBlur={(e) => handleOwnerChange(e.target.value)}
                  sx={{ '& input': { fontSize: '0.85rem' } }}
                />
              </Box>
            </Stack>

            <Divider />

            {/* Labels */}
            <Box>
              <Typography variant="caption" fontWeight={700} color="text.secondary" mb={0.75} display="block">
                Labels
              </Typography>
              <LabelPicker selected={data.labels} onChange={handleLabelChange} />
            </Box>

            <Divider />

            {/* Checklist */}
            <Box>
              <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                <Typography variant="caption" fontWeight={700} color="text.secondary">
                  Checklist {totalCount > 0 && `(${doneCount}/${totalCount})`}
                </Typography>
              </Stack>

              {totalCount > 0 && (
                <Box sx={{ mb: 1.5 }}>
                  <LinearProgress
                    variant="determinate"
                    value={progress}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      bgcolor: 'action.hover',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: progress === 100 ? 'success.main' : 'primary.main',
                        borderRadius: 3,
                      },
                    }}
                  />
                </Box>
              )}

              <Stack spacing={0.5} mb={1}>
                {data.checklist.map((item) => (
                  <Stack
                    key={item.id}
                    direction="row"
                    alignItems="center"
                    spacing={0.5}
                    sx={{
                      borderRadius: 1,
                      px: 0.5,
                      '&:hover .delete-btn': { opacity: 1 },
                    }}
                  >
                    <Checkbox
                      size="small"
                      checked={item.done}
                      onChange={() => toggleCheckItem(item.id)}
                      sx={{ p: 0.5 }}
                    />
                    <Typography
                      variant="body2"
                      sx={{
                        flex: 1,
                        fontSize: '0.82rem',
                        textDecoration: item.done ? 'line-through' : 'none',
                        color: item.done ? 'text.disabled' : 'text.primary',
                      }}
                    >
                      {item.text}
                    </Typography>
                    <IconButton
                      size="small"
                      className="delete-btn"
                      onClick={() => deleteCheckItem(item.id)}
                      sx={{ opacity: 0, transition: 'opacity 0.15s', p: 0.25 }}
                    >
                      <IconTrash size={13} />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>

              <Stack direction="row" alignItems="center" spacing={0.5}>
                <InputBase
                  inputRef={newItemRef}
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCheckItem(); } }}
                  placeholder="Adicionar item..."
                  sx={{
                    flex: 1,
                    fontSize: '0.82rem',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    px: 1,
                    py: 0.4,
                  }}
                />
                <IconButton size="small" onClick={addCheckItem} disabled={!newItem.trim()}>
                  <IconPlus size={14} />
                </IconButton>
              </Stack>
            </Box>

            {/* Timer / Timesheet */}
            {freelancers.length > 0 && (
              <>
                <Divider />
                <Box>
                  <Stack direction="row" alignItems="center" spacing={0.75} mb={1.25}>
                    <IconClock size={14} />
                    <Typography variant="caption" fontWeight={700} color="text.secondary">
                      Horas
                    </Typography>
                    {totalMinutes > 0 && (
                      <Typography variant="caption" color="text.disabled" sx={{ ml: 'auto !important' }}>
                        Total: {formatTotalMinutes(totalMinutes)}
                      </Typography>
                    )}
                  </Stack>

                  <Stack direction="row" alignItems="center" spacing={1}>
                    {/* Freelancer select */}
                    <Select
                      size="small"
                      value={selectedFl}
                      onChange={(e) => setSelectedFl(e.target.value)}
                      displayEmpty
                      sx={{ fontSize: '0.8rem', flex: 1 }}
                    >
                      <MenuItem value="" disabled><em>Freelancer</em></MenuItem>
                      {freelancers.map((fl) => (
                        <MenuItem key={fl.id} value={fl.id} sx={{ fontSize: '0.8rem' }}>
                          {fl.display_name}
                        </MenuItem>
                      ))}
                    </Select>

                    {/* Timer display when running */}
                    {activeTimer && (
                      <Typography
                        variant="caption"
                        sx={{
                          fontVariantNumeric: 'tabular-nums',
                          fontFamily: 'monospace',
                          fontSize: '0.85rem',
                          color: 'warning.main',
                          minWidth: 56,
                          textAlign: 'right',
                        }}
                      >
                        {formatElapsed(elapsedSeconds)}
                      </Typography>
                    )}

                    {/* Start / Stop button */}
                    {!activeTimer ? (
                      <Tooltip title="Iniciar timer">
                        <span>
                          <IconButton
                            size="small"
                            color="primary"
                            disabled={!selectedFl || timerLoading}
                            onClick={handleTimerStart}
                            sx={{ bgcolor: 'primary.main', color: 'white', borderRadius: 1.5,
                                  '&:hover': { bgcolor: 'primary.dark' },
                                  '&:disabled': { bgcolor: 'action.disabledBackground' } }}
                          >
                            {timerLoading ? <CircularProgress size={14} color="inherit" /> : <IconPlayerPlay size={14} />}
                          </IconButton>
                        </span>
                      </Tooltip>
                    ) : (
                      <Tooltip title="Parar timer">
                        <IconButton
                          size="small"
                          color="error"
                          disabled={timerLoading}
                          onClick={() => setStopDialogOpen(true)}
                          sx={{ bgcolor: 'error.main', color: 'white', borderRadius: 1.5,
                                '&:hover': { bgcolor: 'error.dark' } }}
                        >
                          {timerLoading ? <CircularProgress size={14} color="inherit" /> : <IconPlayerStop size={14} />}
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>

                  {/* Stop description dialog (inline) */}
                  {stopDialogOpen && (
                    <Box
                      sx={{
                        mt: 1.5,
                        p: 1.5,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1.5,
                        bgcolor: 'background.paper',
                      }}
                    >
                      <Typography variant="caption" fontWeight={600} mb={0.75} display="block">
                        Descrição do trabalho (opcional)
                      </Typography>
                      <InputBase
                        value={stopDescription}
                        onChange={(e) => setStopDescription(e.target.value)}
                        placeholder="Ex: Revisão de copy do anúncio..."
                        fullWidth
                        sx={{
                          fontSize: '0.82rem',
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
                          px: 1,
                          py: 0.5,
                          mb: 1,
                        }}
                      />
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <IconButton size="small" onClick={() => setStopDialogOpen(false)}>
                          <IconX size={13} />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={handleTimerStop}
                          disabled={timerLoading}
                          sx={{ bgcolor: 'error.main', color: 'white', borderRadius: 1,
                                '&:hover': { bgcolor: 'error.dark' } }}
                        >
                          {timerLoading
                            ? <CircularProgress size={12} color="inherit" />
                            : <IconPlayerStop size={13} />}
                        </IconButton>
                      </Stack>
                    </Box>
                  )}
                </Box>
              </>
            )}
          </Stack>
        )}
      </Box>

      {/* Footer: owner avatar strip */}
      {data?.traffic_owner && (
        <Box sx={{ px: 2.5, py: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Avatar sx={{ width: 24, height: 24, fontSize: '0.65rem', bgcolor: 'primary.main' }}>
              {initials(data.traffic_owner)}
            </Avatar>
            <Typography variant="caption" color="text.secondary">{data.traffic_owner}</Typography>
          </Stack>
        </Box>
      )}
    </Drawer>
  );
}
