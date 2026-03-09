'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import {
  IconBrandWhatsapp, IconRefresh, IconLink, IconLinkOff,
  IconQrcode, IconCircleCheck, IconCircleX, IconSettings,
} from '@tabler/icons-react';
import AppShell from '@/components/AppShell';

const EDRO_GREEN = '#25D366';

type InstanceStatus = {
  configured: boolean;
  instance?: { status: string; phone_number?: string };
  live?: { state: string; profileName?: string; number?: string };
};

type AvailableGroup = { id: string; subject: string; size: number };
type LinkedGroup = {
  id: string; group_jid: string; group_name: string;
  client_id?: string; client_name?: string;
  auto_briefing: boolean; notify_jarvis: boolean; active: boolean;
  message_count: number; last_message_at?: string;
};
type Client = { id: string; name: string };

export default function WhatsAppGroupsClient() {
  const [status, setStatus] = useState<InstanceStatus | null>(null);
  const [qr, setQr] = useState<{ base64: string; code: string } | null>(null);
  const [linkedGroups, setLinkedGroups] = useState<LinkedGroup[]>([]);
  const [availableGroups, setAvailableGroups] = useState<AvailableGroup[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [fetchingGroups, setFetchingGroups] = useState(false);
  const [error, setError] = useState('');
  const [linkMap, setLinkMap] = useState<Record<string, string>>({}); // groupJid → clientId

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const [statusRes, groupsRes, clientsRes] = await Promise.all([
        apiGet<InstanceStatus>('/whatsapp-groups/status'),
        apiGet<{ data: LinkedGroup[] }>('/whatsapp-groups'),
        apiGet<{ data: Client[] }>('/clients?limit=100'),
      ]);
      setStatus(statusRes ?? null);
      setLinkedGroups(groupsRes?.data ?? []);
      setClients(clientsRes?.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const handleConnect = async () => {
    setConnecting(true);
    setError('');
    setQr(null);
    try {
      const res = await apiPost<{ success: boolean; qr: { base64: string; code: string } }>(
        '/whatsapp-groups/connect', {},
      );
      if (res?.qr) setQr(res.qr);
      setTimeout(loadStatus, 5000);
    } catch (e: any) {
      setError(e.message ?? 'Erro ao conectar.');
    } finally {
      setConnecting(false);
    }
  };

  const handleRefreshQr = async () => {
    setConnecting(true);
    try {
      const res = await apiGet<{ qr: { base64: string; code: string } }>('/whatsapp-groups/qrcode');
      if (res?.qr) setQr(res.qr);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Desconectar o WhatsApp? Os grupos ficarão inativos.')) return;
    await apiDelete('/whatsapp-groups/disconnect');
    setQr(null);
    loadStatus();
  };

  const loadAvailableGroups = async () => {
    setFetchingGroups(true);
    setError('');
    try {
      const res = await apiGet<{ data: AvailableGroup[] }>('/whatsapp-groups/available');
      setAvailableGroups(res?.data ?? []);
    } catch (e: any) {
      setError(e.message ?? 'Erro ao buscar grupos.');
    } finally {
      setFetchingGroups(false);
    }
  };

  const handleLinkGroup = async (group: AvailableGroup) => {
    const clientId = linkMap[group.id];
    if (!clientId) { setError('Selecione um cliente para este grupo.'); return; }
    await apiPost('/whatsapp-groups/link', {
      group_jid: group.id, client_id: clientId,
      auto_briefing: false, notify_jarvis: true,
    });
    loadStatus();
  };

  const handleToggle = async (groupId: string, field: 'auto_briefing' | 'notify_jarvis', value: boolean) => {
    await apiPatch(`/whatsapp-groups/${groupId}`, { [field]: value });
    setLinkedGroups(prev => prev.map(g => g.id === groupId ? { ...g, [field]: value } : g));
  };

  const handleUnlink = async (groupId: string) => {
    if (!confirm('Desvincular este grupo?')) return;
    await apiDelete(`/whatsapp-groups/${groupId}`);
    loadStatus();
  };

  const connected = status?.live?.state === 'open' || status?.instance?.status === 'connected';

  return (
    <AppShell title="WhatsApp Grupos">
      <Box sx={{ maxWidth: 960, mx: 'auto', py: 3, px: { xs: 2, md: 3 } }}>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
          <Avatar sx={{ bgcolor: EDRO_GREEN, width: 40, height: 40 }}>
            <IconBrandWhatsapp size={22} />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight={700}>WhatsApp Grupos</Typography>
            <Typography variant="body2" color="text.secondary">
              Conecte o WhatsApp da agência e vincule grupos de clientes ao Jarvis.
            </Typography>
          </Box>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

        {loading ? (
          <Stack alignItems="center" sx={{ py: 6 }}>
            <CircularProgress size={28} sx={{ color: EDRO_GREEN }} />
          </Stack>
        ) : !status?.configured ? (
          <Alert severity="warning">
            Evolution API não configurada. Adicione <strong>EVOLUTION_API_URL</strong> e <strong>EVOLUTION_API_KEY</strong> nas variáveis de ambiente do servidor.
          </Alert>
        ) : (
          <>
            {/* Connection card */}
            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent>
                <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    {connected ? (
                      <IconCircleCheck size={22} style={{ color: EDRO_GREEN }} />
                    ) : (
                      <IconCircleX size={22} style={{ color: '#ef4444' }} />
                    )}
                    <Box>
                      <Typography variant="subtitle2" fontWeight={700}>
                        {connected ? 'WhatsApp Conectado' : 'WhatsApp Desconectado'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {status?.live?.profileName ?? status?.live?.number ?? status?.instance?.phone_number ?? '—'}
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    {!connected ? (
                      <Button
                        variant="contained"
                        startIcon={connecting ? <CircularProgress size={14} color="inherit" /> : <IconQrcode size={16} />}
                        disabled={connecting}
                        onClick={handleConnect}
                        sx={{ bgcolor: EDRO_GREEN, '&:hover': { bgcolor: '#1ea855' } }}
                      >
                        {connecting ? 'Aguardando…' : 'Conectar via QR Code'}
                      </Button>
                    ) : (
                      <>
                        <Button size="small" startIcon={<IconRefresh size={14} />} onClick={loadStatus}>
                          Atualizar
                        </Button>
                        <Button size="small" color="error" startIcon={<IconLinkOff size={14} />} onClick={handleDisconnect}>
                          Desconectar
                        </Button>
                      </>
                    )}
                  </Stack>
                </Stack>

                {/* QR Code display */}
                {qr && !connected && (
                  <Box sx={{ mt: 2, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                      Abra o WhatsApp → Dispositivos vinculados → Vincular dispositivo → Escaneie o QR
                    </Typography>
                    {qr.base64 && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={qr.base64} alt="QR Code WhatsApp" width={200} height={200} style={{ borderRadius: 8, border: '1px solid #e0e0e0' }} />
                    )}
                    <Box>
                      <Button size="small" onClick={handleRefreshQr} sx={{ mt: 1, color: EDRO_GREEN }}>
                        Atualizar QR Code
                      </Button>
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* Linked groups */}
            {linkedGroups.length > 0 && (
              <Card variant="outlined" sx={{ mb: 3 }}>
                <CardContent sx={{ pb: '8px !important' }}>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
                    Grupos Vinculados ({linkedGroups.length})
                  </Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Grupo</TableCell>
                        <TableCell>Cliente</TableCell>
                        <TableCell align="center">Jarvis</TableCell>
                        <TableCell align="center">Auto Briefing</TableCell>
                        <TableCell align="center">Msgs</TableCell>
                        <TableCell />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {linkedGroups.map(g => (
                        <TableRow key={g.id}>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8rem' }}>{g.group_name}</Typography>
                            <Typography variant="caption" color="text.secondary">{g.group_jid}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{g.client_name ?? '—'}</Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Switch
                              size="small"
                              checked={g.notify_jarvis}
                              onChange={e => handleToggle(g.id, 'notify_jarvis', e.target.checked)}
                              sx={{ '& .Mui-checked': { color: EDRO_GREEN }, '& .Mui-checked + .MuiSwitch-track': { bgcolor: EDRO_GREEN } }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Switch
                              size="small"
                              checked={g.auto_briefing}
                              onChange={e => handleToggle(g.id, 'auto_briefing', e.target.checked)}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="caption">{g.message_count}</Typography>
                          </TableCell>
                          <TableCell>
                            <Button size="small" color="error" onClick={() => handleUnlink(g.id)} sx={{ minWidth: 0, px: 1 }}>
                              <IconLinkOff size={14} />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Add groups */}
            {connected && (
              <Card variant="outlined">
                <CardContent>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" fontWeight={700}>Adicionar Grupos</Typography>
                    <Button
                      size="small"
                      startIcon={fetchingGroups ? <CircularProgress size={12} /> : <IconRefresh size={14} />}
                      onClick={loadAvailableGroups}
                      disabled={fetchingGroups}
                      sx={{ color: EDRO_GREEN }}
                    >
                      Buscar grupos
                    </Button>
                  </Stack>

                  {availableGroups.length === 0 && !fetchingGroups && (
                    <Typography variant="body2" color="text.secondary">
                      Clique em "Buscar grupos" para listar os grupos disponíveis no WhatsApp conectado.
                    </Typography>
                  )}

                  <Stack spacing={1}>
                    {availableGroups.map(g => {
                      const alreadyLinked = linkedGroups.some(l => l.group_jid === g.id);
                      return (
                        <Stack key={g.id} direction="row" alignItems="center" spacing={1.5}
                          sx={{ p: 1, borderRadius: 1.5, border: 1, borderColor: 'divider', opacity: alreadyLinked ? 0.5 : 1 }}>
                          <Box sx={{ p: 0.75, bgcolor: `${EDRO_GREEN}15`, borderRadius: 1 }}>
                            <IconBrandWhatsapp size={16} style={{ color: EDRO_GREEN }} />
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" fontWeight={600} noWrap sx={{ fontSize: '0.82rem' }}>{g.subject}</Typography>
                            <Typography variant="caption" color="text.secondary">{g.size} participantes</Typography>
                          </Box>
                          {alreadyLinked ? (
                            <Chip label="Vinculado" size="small" color="success" sx={{ fontSize: '0.65rem' }} />
                          ) : (
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Select
                                size="small"
                                displayEmpty
                                value={linkMap[g.id] ?? ''}
                                onChange={e => setLinkMap(prev => ({ ...prev, [g.id]: e.target.value }))}
                                sx={{ minWidth: 180, fontSize: '0.78rem', '& .MuiSelect-select': { py: 0.5 } }}
                              >
                                <MenuItem value="" disabled><em>Selecione cliente</em></MenuItem>
                                {clients.map(c => (
                                  <MenuItem key={c.id} value={c.id} sx={{ fontSize: '0.78rem' }}>{c.name}</MenuItem>
                                ))}
                              </Select>
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<IconLink size={14} />}
                                onClick={() => handleLinkGroup(g)}
                                disabled={!linkMap[g.id]}
                                sx={{ borderColor: EDRO_GREEN, color: EDRO_GREEN, whiteSpace: 'nowrap' }}
                              >
                                Vincular
                              </Button>
                            </Stack>
                          )}
                        </Stack>
                      );
                    })}
                  </Stack>
                </CardContent>
              </Card>
            )}

            <Divider sx={{ my: 3 }} />

            {/* Setup instructions */}
            <Card variant="outlined" sx={{ bgcolor: 'action.hover' }}>
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                  <IconSettings size={18} />
                  <Typography variant="subtitle2" fontWeight={700}>Como configurar a Evolution API</Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary" component="div">
                  <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 2 }}>
                    <li>Suba a Evolution API no Railway/VPS: <code>docker run -d atendai/evolution-api:latest</code></li>
                    <li>Adicione as variáveis de ambiente no servidor Edro:
                      <br /><code>EVOLUTION_API_URL=https://evolution.seuservidor.com</code>
                      <br /><code>EVOLUTION_API_KEY=sua-chave-global</code>
                    </li>
                    <li>Configure o webhook na Evolution API apontando para:
                      <br /><code>https://api.edro.digital/webhook/evolution</code>
                      <br />Events: <code>MESSAGES_UPSERT, CONNECTION_UPDATE</code>
                    </li>
                    <li>Volte aqui e clique em "Conectar via QR Code".</li>
                  </ol>
                </Typography>
              </CardContent>
            </Card>
          </>
        )}
      </Box>
    </AppShell>
  );
}
