'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import {
  IconBrandWhatsapp, IconRefresh, IconLink, IconLinkOff,
  IconQrcode, IconCircleCheck, IconCircleX, IconSettings, IconExternalLink,
  IconBrain, IconUrgent, IconCheck,
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

type IntelSummary = {
  stats: { total_insights: number; unactioned: number; urgent_unactioned: number; clients_with_insights: number };
  urgent_items: { id: string; client_id: string; client_name?: string; summary: string; insight_type: string; created_at: string }[];
};

const MANAGER_URL = 'https://evolution-api-production-f05a.up.railway.app/manager';

export default function WhatsAppGroupsClient() {
  const [tab, setTab] = useState(0);
  const [status, setStatus] = useState<InstanceStatus | null>(null);
  const [qr, setQr] = useState<{ base64: string; code: string } | null>(null);
  const [linkedGroups, setLinkedGroups] = useState<LinkedGroup[]>([]);
  const [availableGroups, setAvailableGroups] = useState<AvailableGroup[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [pendingQr, setPendingQr] = useState(false);   // polling for QR
  const [qrTimeout, setQrTimeout] = useState(false);   // gave up after timeout
  const [fetchingGroups, setFetchingGroups] = useState(false);
  const [error, setError] = useState('');
  const [linkMap, setLinkMap] = useState<Record<string, string>>({}); // groupJid → clientId
  const [intelSummary, setIntelSummary] = useState<IntelSummary | null>(null);
  const [intelLoading, setIntelLoading] = useState(false);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const [statusRes, groupsRes, clientsRes] = await Promise.all([
        apiGet<InstanceStatus>('/whatsapp-groups/status'),
        apiGet<{ data: LinkedGroup[] }>('/whatsapp-groups'),
        apiGet<{ data: Client[] }>('/clients?limit=100'),
      ]);
      setStatus(statusRes ?? null);
      setLinkedGroups(
        (groupsRes?.data ?? []).slice().sort((a, b) => a.group_name.localeCompare(b.group_name, 'pt-BR')),
      );
      setClients(
        (clientsRes?.data ?? []).slice().sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  // Poll /qrcode endpoint until QR appears (max 90s) or connected
  const startQrPolling = useCallback(async () => {
    setPendingQr(true);
    setQrTimeout(false);
    const deadline = Date.now() + 90_000;
    while (Date.now() < deadline) {
      // Check if connected first
      const st = await apiGet<InstanceStatus>('/whatsapp-groups/status').catch(() => null);
      if (st?.live?.state === 'open' || st?.instance?.status === 'connected') {
        setStatus(st);
        setPendingQr(false);
        setQr(null);
        return;
      }
      // Try QR (backend polls Evolution for up to 15s internally)
      const res = await apiGet<{ qr: { base64: string; code: string } }>('/whatsapp-groups/qrcode').catch(() => null);
      if (res?.qr?.base64) {
        setQr(res.qr);
        setPendingQr(false);
        return;
      }
    }
    setPendingQr(false);
    setQrTimeout(true);
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    setError('');
    setQr(null);
    setQrTimeout(false);
    try {
      const res = await apiPost<{ success: boolean; qr: { base64: string; code: string } }>(
        '/whatsapp-groups/connect', {},
      );
      if (res?.qr?.base64) {
        setQr(res.qr);
      } else {
        // QR not ready yet — start background polling
        startQrPolling();
      }
      setTimeout(loadStatus, 5000);
    } catch (e: any) {
      setError(e.message ?? 'Erro ao conectar.');
    } finally {
      setConnecting(false);
    }
  };

  const handleRefreshQr = () => {
    setQr(null);
    setQrTimeout(false);
    startQrPolling();
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
      setAvailableGroups(
        (res?.data ?? []).slice().sort((a, b) => a.subject.localeCompare(b.subject, 'pt-BR')),
      );
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

  const loadIntelligence = useCallback(async () => {
    setIntelLoading(true);
    try {
      const res = await apiGet<{ data: IntelSummary }>('/whatsapp-groups/intelligence/summary');
      setIntelSummary(res?.data ?? null);
    } finally {
      setIntelLoading(false);
    }
  }, []);

  const handleMarkActioned = async (insightId: string) => {
    await apiPatch(`/whatsapp-groups/insights/${insightId}/action`, {});
    loadIntelligence();
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

        <Tabs
          value={tab}
          onChange={(_, v) => {
            setTab(v);
            if (v === 1 && !intelSummary) loadIntelligence();
          }}
          sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Grupos" icon={<IconBrandWhatsapp size={16} />} iconPosition="start" sx={{ minHeight: 42 }} />
          <Tab label="Intelligence" icon={<IconBrain size={16} />} iconPosition="start" sx={{ minHeight: 42 }} />
        </Tabs>

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

        {/* ─── Tab 1: Intelligence ─── */}
        {tab === 1 && (
          <Box>
            {intelLoading ? (
              <Stack alignItems="center" sx={{ py: 6 }}>
                <CircularProgress size={28} sx={{ color: EDRO_GREEN }} />
              </Stack>
            ) : !intelSummary ? (
              <Alert severity="info">Nenhum dado de inteligência disponível ainda.</Alert>
            ) : (
              <Stack spacing={2}>
                {/* Stats cards */}
                <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                  {[
                    { label: 'Insights (30d)', value: intelSummary.stats.total_insights, color: '#5D87FF' },
                    { label: 'Pendentes', value: intelSummary.stats.unactioned, color: '#ffb547' },
                    { label: 'Urgentes', value: intelSummary.stats.urgent_unactioned, color: '#ef4444' },
                    { label: 'Clientes ativos', value: intelSummary.stats.clients_with_insights, color: EDRO_GREEN },
                  ].map(s => (
                    <Card key={s.label} variant="outlined" sx={{ flex: '1 1 140px', minWidth: 140 }}>
                      <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                        <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                        <Typography variant="h5" fontWeight={700} sx={{ color: s.color }}>{s.value}</Typography>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>

                {/* Urgent items */}
                {intelSummary.urgent_items.length > 0 && (
                  <Card variant="outlined" sx={{ borderColor: '#ef4444' }}>
                    <CardContent>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                        <IconUrgent size={18} style={{ color: '#ef4444' }} />
                        <Typography variant="subtitle2" fontWeight={700} color="error">
                          Itens Urgentes ({intelSummary.urgent_items.length})
                        </Typography>
                      </Stack>
                      <Stack spacing={1}>
                        {intelSummary.urgent_items.map(item => (
                          <Stack key={item.id} direction="row" alignItems="center" spacing={1.5}
                            sx={{ p: 1.5, borderRadius: 1.5, bgcolor: 'error.main', color: 'white', opacity: 0.9 }}>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.82rem' }}>
                                {item.client_name || item.client_id}
                              </Typography>
                              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                                {item.summary}
                              </Typography>
                            </Box>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<IconCheck size={14} />}
                              onClick={() => handleMarkActioned(item.id)}
                              sx={{ color: 'white', borderColor: 'rgba(255,255,255,.5)', whiteSpace: 'nowrap', fontSize: '0.7rem' }}
                            >
                              Resolver
                            </Button>
                          </Stack>
                        ))}
                      </Stack>
                    </CardContent>
                  </Card>
                )}

                <Button
                  size="small"
                  startIcon={<IconRefresh size={14} />}
                  onClick={loadIntelligence}
                  sx={{ color: EDRO_GREEN, alignSelf: 'flex-start' }}
                >
                  Atualizar
                </Button>
              </Stack>
            )}
          </Box>
        )}

        {/* ─── Tab 0: Groups (original content) ─── */}
        {tab === 0 && (loading ? (
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
                {!connected && (qr || pendingQr || qrTimeout) && (
                  <Box sx={{ mt: 2, textAlign: 'center' }}>
                    {qr?.base64 ? (
                      <>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                          Abra o WhatsApp → Dispositivos vinculados → Vincular dispositivo → Escaneie o QR
                        </Typography>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <Box
                          component="img"
                          src={qr.base64}
                          alt="QR Code WhatsApp"
                          sx={{ width: 200, height: 200, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
                        />
                        <Box>
                          <Button size="small" onClick={handleRefreshQr} sx={{ mt: 1, color: EDRO_GREEN }}>
                            Atualizar QR Code
                          </Button>
                        </Box>
                      </>
                    ) : pendingQr ? (
                      <Stack alignItems="center" spacing={1} sx={{ py: 2 }}>
                        <CircularProgress size={32} sx={{ color: EDRO_GREEN }} />
                        <Typography variant="caption" color="text.secondary">
                          Aguardando QR Code do WhatsApp… pode levar até 90 segundos.
                        </Typography>
                      </Stack>
                    ) : qrTimeout ? (
                      <Stack alignItems="center" spacing={1.5} sx={{ py: 2 }}>
                        <Alert severity="warning" sx={{ textAlign: 'left', width: '100%', maxWidth: 440 }}>
                          <strong>QR Code não gerado.</strong> O servidor pode estar bloqueado pelo WhatsApp.
                          Tente conectar pelo painel do Evolution API ou use um servidor com IP residencial.
                        </Alert>
                        <Stack direction="row" spacing={1}>
                          <Button
                            size="small"
                            startIcon={<IconRefresh size={14} />}
                            onClick={handleRefreshQr}
                            sx={{ color: EDRO_GREEN }}
                          >
                            Tentar novamente
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<IconExternalLink size={14} />}
                            href={MANAGER_URL}
                            target="_blank"
                            rel="noopener"
                          >
                            Abrir Evolution Manager
                          </Button>
                        </Stack>
                      </Stack>
                    ) : null}
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
                              <Autocomplete
                                size="small"
                                options={clients}
                                getOptionLabel={(c) => c.name}
                                value={clients.find(c => c.id === linkMap[g.id]) ?? null}
                                onChange={(_, val) => setLinkMap(prev => ({ ...prev, [g.id]: val?.id ?? '' }))}
                                renderInput={(params) => (
                                  <TextField {...params} placeholder="Selecione cliente" sx={{ '& .MuiInputBase-input': { fontSize: '0.78rem' } }} />
                                )}
                                sx={{ minWidth: 220 }}
                                noOptionsText="Nenhum cliente"
                              />
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
        ))}
      </Box>
    </AppShell>
  );
}
