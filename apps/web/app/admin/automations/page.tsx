'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import AdminSubmenu from '@/components/admin/AdminSubmenu';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Switch from '@mui/material/Switch';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import { IconRobot, IconPlus, IconTrash } from '@tabler/icons-react';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';

type Trigger = {
  id: string;
  trigger_event: string;
  action_type: string;
  config: Record<string, any>;
  enabled: boolean;
  created_at: string;
};

const TRIGGER_EVENTS = [
  { id: 'briefing_created', label: 'Briefing Criado' },
  { id: 'stage_changed_to_copy_ia', label: 'Etapa: Copy IA' },
  { id: 'stage_changed_to_aprovacao', label: 'Etapa: Aprovacao' },
  { id: 'stage_changed_to_producao', label: 'Etapa: Producao' },
  { id: 'stage_changed_to_revisao', label: 'Etapa: Revisao' },
  { id: 'stage_changed_to_entrega', label: 'Etapa: Entrega' },
  { id: 'stage_changed_to_done', label: 'Etapa: Concluido' },
  { id: 'briefing_overdue', label: 'Briefing Atrasado' },
];

const ACTION_TYPES = [
  { id: 'notify_team', label: 'Notificar Equipe', color: 'info' as const },
  { id: 'notify_client', label: 'Notificar Cliente', color: 'warning' as const },
  { id: 'generate_copy', label: 'Gerar Copy Automatica', color: 'success' as const },
];

export default function AutomationsPage() {
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newEvent, setNewEvent] = useState('');
  const [newAction, setNewAction] = useState('');

  const loadTriggers = async () => {
    try {
      setLoading(true);
      const data = await apiGet<{ triggers: Trigger[] }>('/automations');
      setTriggers(data.triggers || []);
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar automacoes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTriggers(); }, []);

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      await apiPatch(`/automations/${id}`, { enabled });
      setTriggers((prev) => prev.map((t) => (t.id === id ? { ...t, enabled } : t)));
    } catch (err: any) {
      setError(err?.message || 'Erro ao atualizar.');
    }
  };

  const handleCreate = async () => {
    if (!newEvent || !newAction) return;
    try {
      setError('');
      const data = await apiPost<{ trigger: Trigger }>('/automations', {
        trigger_event: newEvent,
        action_type: newAction,
      });
      setTriggers((prev) => [data.trigger, ...prev]);
      setDialogOpen(false);
      setNewEvent('');
      setNewAction('');
    } catch (err: any) {
      setError(err?.message || 'Erro ao criar automacao.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiDelete(`/automations/${id}`);
      setTriggers((prev) => prev.filter((t) => t.id !== id));
    } catch (err: any) {
      setError(err?.message || 'Erro ao excluir.');
    }
  };

  const getEventLabel = (event: string) =>
    TRIGGER_EVENTS.find((e) => e.id === event)?.label || event;
  const getActionInfo = (action: string) =>
    ACTION_TYPES.find((a) => a.id === action) || { label: action, color: 'default' as const };

  return (
    <AppShell title="System Admin">
      <Box sx={{ p: 3, width: '100%', maxWidth: 1400, mx: 'auto' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconRobot size={28} stroke={1.5} />
            <Box>
              <Typography variant="h5" fontWeight={700}>Automacoes</Typography>
              <Typography variant="body2" color="text.secondary">
                Configure triggers automaticos para o workflow de briefings.
              </Typography>
            </Box>
          </Box>
          <Button variant="contained" startIcon={<IconPlus size={18} />} onClick={() => setDialogOpen(true)}>
            Nova Automacao
          </Button>
        </Box>

        <AdminSubmenu value="automacoes" />

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : triggers.length === 0 ? (
          <Card variant="outlined">
            <CardContent sx={{ py: 6, textAlign: 'center' }}>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                Nenhuma automacao configurada.
              </Typography>
              <Button variant="outlined" onClick={() => setDialogOpen(true)}>
                Criar primeira automacao
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Grid container spacing={2}>
            {triggers.map((t) => {
              const actionInfo = getActionInfo(t.action_type);
              return (
                <Grid key={t.id} size={{ xs: 12, md: 6 }}>
                  <Card variant="outlined">
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Switch
                        checked={t.enabled}
                        onChange={(e) => handleToggle(t.id, e.target.checked)}
                      />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2">
                          Quando: <strong>{getEventLabel(t.trigger_event)}</strong>
                        </Typography>
                        <Box sx={{ mt: 0.5 }}>
                          <Chip
                            label={actionInfo.label}
                            color={actionInfo.color}
                            size="small"
                          />
                        </Box>
                      </Box>
                      <IconButton size="small" color="error" onClick={() => handleDelete(t.id)}>
                        <IconTrash size={18} />
                      </IconButton>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}

        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Nova Automacao</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
            <FormControl fullWidth>
              <InputLabel>Quando (Evento)</InputLabel>
              <Select value={newEvent} onChange={(e) => setNewEvent(e.target.value)} label="Quando (Evento)">
                {TRIGGER_EVENTS.map((e) => (
                  <MenuItem key={e.id} value={e.id}>{e.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Entao (Acao)</InputLabel>
              <Select value={newAction} onChange={(e) => setNewAction(e.target.value)} label="Entao (Acao)">
                {ACTION_TYPES.map((a) => (
                  <MenuItem key={a.id} value={a.id}>{a.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button variant="contained" onClick={handleCreate} disabled={!newEvent || !newAction}>
              Criar
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </AppShell>
  );
}
