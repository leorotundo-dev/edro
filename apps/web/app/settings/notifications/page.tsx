'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import AdminSubmenu from '@/components/admin/AdminSubmenu';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Switch from '@mui/material/Switch';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import { IconBellCog } from '@tabler/icons-react';
import { apiGet, apiPatch } from '@/lib/api';

const EVENT_TYPES = [
  { id: 'stage_change', label: 'Mudanca de Etapa', description: 'Quando um briefing muda de etapa no workflow' },
  { id: 'briefing_deadline', label: 'Prazo Próximo', description: 'Alerta quando um briefing está perto do prazo' },
  { id: 'task_assigned', label: 'Tarefa Atribuída', description: 'Quando uma tarefa é atribuída a você' },
  { id: 'copy_approved', label: 'Copy Aprovada', description: 'Quando uma copy gerada é aprovada' },
  { id: 'weekly_digest', label: 'Resumo Semanal', description: 'Resumo semanal de atividades e métricas' },
] as const;

const CHANNELS = [
  { id: 'in_app', label: 'In-App' },
  { id: 'email', label: 'Email' },
  { id: 'whatsapp', label: 'WhatsApp' },
] as const;

type PrefMap = Record<string, Record<string, boolean>>;

export default function NotificationPreferencesPage() {
  const [prefs, setPrefs] = useState<PrefMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [browserPermission, setBrowserPermission] = useState<string>('unsupported');
  const [browserEnabled, setBrowserEnabled] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiGet<{ preferences: { event_type: string; channel: string; enabled: boolean }[] }>(
          '/notifications/preferences'
        );
        const map: PrefMap = {};
        for (const et of EVENT_TYPES) {
          map[et.id] = {};
          for (const ch of CHANNELS) {
            map[et.id][ch.id] = true; // default enabled
          }
        }
        for (const p of data.preferences || []) {
          if (map[p.event_type]) {
            map[p.event_type][p.channel] = p.enabled;
          }
        }
        setPrefs(map);
      } catch (err: any) {
        setError(err?.message || 'Erro ao carregar preferencias.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') {
      setBrowserPermission('unsupported');
      return;
    }
    setBrowserPermission(Notification.permission);
    setBrowserEnabled(window.localStorage.getItem('edro_browser_notifications_enabled') !== 'false');
  }, []);

  const toggle = (eventType: string, channel: string) => {
    setPrefs((prev) => ({
      ...prev,
      [eventType]: {
        ...prev[eventType],
        [channel]: !prev[eventType]?.[channel],
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const preferences: { event_type: string; channel: string; enabled: boolean }[] = [];
      for (const et of EVENT_TYPES) {
        for (const ch of CHANNELS) {
          preferences.push({
            event_type: et.id,
            channel: ch.id,
            enabled: prefs[et.id]?.[ch.id] ?? true,
          });
        }
      }
      await apiPatch('/notifications/preferences', { preferences });
      setSuccess('Preferencias salvas com sucesso.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err?.message || 'Erro ao salvar preferencias.');
    } finally {
      setSaving(false);
    }
  };

  const handleEnableBrowserNotifications = async () => {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') return;
    const permission = await Notification.requestPermission();
    setBrowserPermission(permission);
    const enabled = permission === 'granted';
    window.localStorage.setItem('edro_browser_notifications_enabled', enabled ? 'true' : 'false');
    setBrowserEnabled(enabled);
  };

  const handleDisableBrowserNotifications = () => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('edro_browser_notifications_enabled', 'false');
    setBrowserEnabled(false);
  };

  return (
    <AppShell title="System Admin">
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <IconBellCog size={28} stroke={1.5} />
          <Box>
            <Typography variant="h5" fontWeight={700}>Preferências de Notificação</Typography>
            <Typography variant="body2" color="text.secondary">
              Escolha como e quando você quer ser notificado.
            </Typography>
          </Box>
        </Box>

        <AdminSubmenu value="settings" />

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                Alertas do navegador
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Mostra notificação nativa quando a aba da Edro estiver em segundo plano.
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                Status: {browserPermission === 'granted'
                  ? browserEnabled ? 'ativo' : 'desativado'
                  : browserPermission === 'denied'
                  ? 'bloqueado no navegador'
                  : browserPermission === 'default'
                  ? 'aguardando permissão'
                  : 'não suportado'}
              </Typography>
              {browserPermission !== 'granted' ? (
                <Button variant="outlined" onClick={handleEnableBrowserNotifications}>
                  Ativar alertas do navegador
                </Button>
              ) : browserEnabled ? (
                <Button variant="outlined" color="inherit" onClick={handleDisableBrowserNotifications}>
                  Desativar alertas do navegador
                </Button>
              ) : (
                <Button variant="outlined" onClick={handleEnableBrowserNotifications}>
                  Reativar alertas do navegador
                </Button>
              )}
            </Paper>

            <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ minWidth: 200 }}><strong>Evento</strong></TableCell>
                    {CHANNELS.map((ch) => (
                      <TableCell key={ch.id} align="center"><strong>{ch.label}</strong></TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {EVENT_TYPES.map((et) => (
                    <TableRow key={et.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{et.label}</Typography>
                        <Typography variant="caption" color="text.secondary">{et.description}</Typography>
                      </TableCell>
                      {CHANNELS.map((ch) => (
                        <TableCell key={ch.id} align="center">
                          <Switch
                            checked={prefs[et.id]?.[ch.id] ?? true}
                            onChange={() => toggle(et.id, ch.id)}
                            size="small"
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Button variant="contained" onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar Preferencias'}
            </Button>
          </>
        )}
      </Box>
    </AppShell>
  );
}
