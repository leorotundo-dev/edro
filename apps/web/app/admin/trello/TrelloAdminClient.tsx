'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AppShell from '@/components/AppShell';
import {
  IconBrandTrello,
  IconCheck,
  IconPlugConnected,
  IconPlugOff,
  IconRefresh,
  IconExternalLink,
  IconTrash,
  IconAlertTriangle,
  IconAlertCircle,
  IconCircleCheck,
  IconClockHour4,
  IconList,
  IconUsers,
  IconChartBar,
} from '@tabler/icons-react';

// ── Types ────────────────────────────────────────────────────────────────────

type ConnectorStatus = {
  connected: boolean;
  member_id?: string;
  is_active?: boolean;
  last_synced_at?: string;
};

type TrelloBoard = {
  id: string;
  name: string;
  desc: string;
  url: string;
  closed: boolean;
};

type ProjectBoard = {
  id: string;
  name: string;
  client_id: string | null;
  trello_board_id: string | null;
  last_synced_at: string | null;
  card_count: number;
};

type SyncLog = {
  id: string;
  trello_board_id: string;
  board_name: string;
  status: string;
  cards_synced: number;
  actions_synced: number;
  error_message: string | null;
  started_at: string;
  finished_at: string | null;
};

type HealthBoard = {
  id: string;
  name: string;
  trello_board_id: string | null;
  client_id: string | null;
  client_name: string | null;
  last_synced_at: string | null;
  sync_age_hours: number | null;
  last_sync_status: string | null;
  last_sync_error: string | null;
  last_cards_synced: number | null;
  active_cards: number;
  sync_status: 'ok' | 'stale' | 'error' | 'never';
};

type UnmappedList = {
  list_id: string;
  list_name: string;
  board_id: string;
  board_name: string;
  card_count: number;
};

type HealthData = {
  boards: HealthBoard[];
  unmappedLists: UnmappedList[];
  summary: {
    total_boards: number;
    ok_count: number;
    stale_count: number;
    error_count: number;
    never_count: number;
    unlinked_count: number;
    unmapped_list_count: number;
    members_without_email: number;
  };
};

type MapListEntry = {
  list_id: string;
  list_name: string;
  card_count: number;
  detected_status: string;
  effective_status: string;
  override_status: string | null;
};

type ClientRow = { id: string; name: string };

const OPS_STATUSES = [
  { value: 'intake', label: 'Entrada (Intake)' },
  { value: 'planned', label: 'Planejado' },
  { value: 'allocated', label: 'Alocado' },
  { value: 'in_progress', label: 'Em Produção' },
  { value: 'in_review', label: 'Em Revisão' },
  { value: 'awaiting_approval', label: 'Aguardando Aprovação' },
  { value: 'approved', label: 'Aprovado' },
  { value: 'ready', label: 'Pronto para Postar' },
  { value: 'done', label: 'Concluído' },
  { value: 'published', label: 'Publicado' },
  { value: 'blocked', label: 'Bloqueado' },
];

const TRELLO_HELP_URL = 'https://trello.com/app-key';

function fmtDate(v?: string | null) {
  if (!v) return '—';
  return new Date(v).toLocaleString('pt-BR');
}

function fmtAge(hours: number | null) {
  if (hours === null) return '—';
  if (hours < 1) return '< 1h';
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d`;
}

function SyncStatusChip({ status }: { status: HealthBoard['sync_status'] }) {
  const map = {
    ok: { label: 'OK', color: 'success' as const },
    stale: { label: 'Desatualizado', color: 'warning' as const },
    error: { label: 'Erro', color: 'error' as const },
    never: { label: 'Nunca sincronizado', color: 'default' as const },
  };
  const { label, color } = map[status];
  return <Chip label={label} color={color} size="small" />;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function TrelloAdminClient() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const initialTab = tabParam === 'mapping' ? 2 : tabParam === 'health' ? 1 : 0;
  const [activeTab, setActiveTab] = useState(initialTab);

  // ── Boards tab state
  const [connector, setConnector] = useState<ConnectorStatus | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState('');
  const [trelloBoards, setTrelloBoards] = useState<TrelloBoard[]>([]);
  const [loadingBoards, setLoadingBoards] = useState(false);
  const [projectBoards, setProjectBoards] = useState<ProjectBoard[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [importing, setImporting] = useState<string | null>(null);
  const [savingBoardId, setSavingBoardId] = useState<string | null>(null);
  const [importClientId, setImportClientId] = useState<Record<string, string>>({});
  const [importResult, setImportResult] = useState<Record<string, string>>({});

  // ── Health tab state
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [listOverrides, setListOverrides] = useState<Record<string, string>>({});
  const [savingListId, setSavingListId] = useState<string | null>(null);

  // ── Map tab state
  const [mapBoardId, setMapBoardId] = useState('');
  const [mapLists, setMapLists] = useState<MapListEntry[]>([]);
  const [loadingMapLists, setLoadingMapLists] = useState(false);
  const [mapOverrides, setMapOverrides] = useState<Record<string, string>>({});
  const [savingMap, setSavingMap] = useState(false);

  // ── Loaders ──────────────────────────────────────────────────────────────

  const loadConnector = useCallback(async () => {
    const data = await apiGet('/trello/connector');
    setConnector(data);
  }, []);

  const loadProjectBoards = useCallback(async () => {
    const [boardsData, logsData] = await Promise.all([
      apiGet('/trello/project-boards'),
      apiGet('/trello/sync-log'),
    ]);
    setProjectBoards(boardsData.boards ?? []);
    setSyncLogs(logsData.logs ?? []);
  }, []);

  const loadClients = useCallback(async () => {
    const data = await apiGet('/clients?limit=200&status=active');
    setClients(Array.isArray(data) ? data : (data.clients ?? data.rows ?? []));
  }, []);

  const loadHealth = useCallback(async () => {
    setLoadingHealth(true);
    try {
      const data = await apiGet('/trello/health');
      setHealth(data);
    } finally {
      setLoadingHealth(false);
    }
  }, []);

  const loadMapLists = useCallback(async (boardId: string) => {
    if (!boardId) return;
    setLoadingMapLists(true);
    try {
      const data = await apiGet(`/trello/list-status-map/${boardId}`);
      setMapLists(data.lists ?? []);
      const overrides: Record<string, string> = {};
      for (const l of (data.lists ?? [])) {
        if (l.override_status) overrides[l.list_id] = l.override_status;
      }
      setMapOverrides(overrides);
    } finally {
      setLoadingMapLists(false);
    }
  }, []);

  useEffect(() => {
    loadConnector();
    loadProjectBoards();
    loadClients();
  }, [loadConnector, loadProjectBoards, loadClients]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  function handleTabChange(_: React.SyntheticEvent, newTab: number) {
    setActiveTab(newTab);
    if (newTab === 1 && !health) loadHealth();
    if (newTab === 2 && projectBoards.length > 0 && !mapBoardId) {
      const first = projectBoards[0].id;
      setMapBoardId(first);
      loadMapLists(first);
    }
  }

  async function handleConnect() {
    if (!apiKey.trim() || !apiToken.trim()) return;
    setConnecting(true);
    setConnectError('');
    try {
      await apiPost('/trello/connect', { api_key: apiKey.trim(), api_token: apiToken.trim() });
      setApiKey('');
      setApiToken('');
      await loadConnector();
    } catch (err: any) {
      setConnectError(err?.message ?? 'Credenciais inválidas.');
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm('Desconectar o Trello? Os boards já importados continuam funcionando no Edro.')) return;
    await apiDelete('/trello/connector');
    await loadConnector();
  }

  async function handleListBoards() {
    setLoadingBoards(true);
    try {
      const data = await apiGet('/trello/boards');
      setTrelloBoards(data.boards ?? []);
    } catch (err: any) {
      alert(err?.message ?? 'Erro ao listar boards.');
    } finally {
      setLoadingBoards(false);
    }
  }

  async function handleImport(trelloBoardId: string) {
    setImporting(trelloBoardId);
    setImportResult((prev) => ({ ...prev, [trelloBoardId]: '' }));
    try {
      const existingBoard = projectBoards.find((board) => board.trello_board_id === trelloBoardId);
      const selectedClientId = importClientId[trelloBoardId] || existingBoard?.client_id || undefined;
      const res = await apiPost(`/trello/boards/${trelloBoardId}/sync`, { client_id: selectedClientId });
      setImportResult((prev) => ({ ...prev, [trelloBoardId]: `✓ ${res.cardsSync} cards importados` }));
      await loadProjectBoards();
    } catch (err: any) {
      setImportResult((prev) => ({ ...prev, [trelloBoardId]: `Erro: ${err?.message}` }));
    } finally {
      setImporting(null);
    }
  }

  async function handleSyncAll() {
    await apiPost('/trello/sync-all', {});
    setTimeout(loadProjectBoards, 3000);
  }

  async function handleAssignProjectBoard(boardId: string, fallbackClientId: string | null) {
    setSavingBoardId(boardId);
    setImportResult((prev) => ({ ...prev, [boardId]: '' }));
    try {
      const nextClientId = importClientId[boardId] ?? fallbackClientId ?? '';
      await apiPatch(`/trello/project-boards/${boardId}`, { client_id: nextClientId || null });
      setImportResult((prev) => ({
        ...prev,
        [boardId]: nextClientId ? '✓ Cliente vinculado ao board' : '✓ Board desvinculado do cliente',
      }));
      await loadProjectBoards();
    } catch (err: any) {
      setImportResult((prev) => ({ ...prev, [boardId]: `Erro: ${err?.message ?? 'Falha ao vincular board.'}` }));
    } finally {
      setSavingBoardId(null);
    }
  }

  async function handleSaveListOverride(listId: string, boardId: string) {
    setSavingListId(listId);
    try {
      const status = listOverrides[listId] ?? null;
      await apiPost(`/trello/list-status-map/${boardId}`, { mappings: [{ list_id: listId, ops_status: status }] });
      await loadHealth();
    } finally {
      setSavingListId(null);
    }
  }

  async function handleSaveAllMapOverrides() {
    if (!mapBoardId) return;
    setSavingMap(true);
    try {
      const mappings = mapLists.map((l) => ({
        list_id: l.list_id,
        ops_status: mapOverrides[l.list_id] ?? null,
      }));
      await apiPost(`/trello/list-status-map/${mapBoardId}`, { mappings });
      await loadMapLists(mapBoardId);
    } finally {
      setSavingMap(false);
    }
  }

  const isConnected = connector?.connected && connector.is_active;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AppShell title="Integração Trello">
      <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1000, mx: 'auto' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.5} mb={3} flexWrap="wrap" gap={1}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <IconBrandTrello size={28} color="#0052cc" />
            <Typography variant="h5" fontWeight={700}>Integração Trello</Typography>
            {isConnected && <Chip label="Conectado" color="success" size="small" icon={<IconCheck size={14} />} />}
          </Stack>
          <Button
            size="small"
            variant="outlined"
            startIcon={<IconChartBar size={16} />}
            href="/admin/trello/insights"
            component="a"
          >
            Ver Relatórios
          </Button>
        </Stack>

        <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Boards" />
          <Tab label="Saúde do Sistema" />
          <Tab label="Mapeamento de Listas" />
        </Tabs>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* TAB 0 — BOARDS                                                 */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {activeTab === 0 && (
          <>
            {/* Connector Card */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600} mb={1.5}>Credenciais</Typography>
                {isConnected ? (
                  <Stack spacing={1}>
                    <Typography variant="body2" color="text.secondary">
                      Conector ativo · última sync: {fmtDate(connector?.last_synced_at)}
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      <Button size="small" startIcon={<IconRefresh size={16} />} variant="outlined" onClick={handleSyncAll}>
                        Sincronizar agora
                      </Button>
                      <Button size="small" color="error" startIcon={<IconPlugOff size={16} />} variant="outlined" onClick={handleDisconnect}>
                        Desconectar
                      </Button>
                    </Stack>
                  </Stack>
                ) : (
                  <Stack spacing={2}>
                    <Alert severity="info" sx={{ py: 0.5 }}>
                      Acesse <strong><a href={TRELLO_HELP_URL} target="_blank" rel="noreferrer">trello.com/app-key</a></strong> para obter sua API Key e gerar um Token.
                    </Alert>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      <TextField label="API Key" size="small" value={apiKey} onChange={(e) => setApiKey(e.target.value)} sx={{ flex: 1 }} type="password" />
                      <TextField label="API Token" size="small" value={apiToken} onChange={(e) => setApiToken(e.target.value)} sx={{ flex: 1 }} type="password" />
                      <Button
                        variant="contained"
                        startIcon={connecting ? <CircularProgress size={14} color="inherit" /> : <IconPlugConnected size={16} />}
                        onClick={handleConnect}
                        disabled={connecting || !apiKey.trim() || !apiToken.trim()}
                        sx={{ whiteSpace: 'nowrap' }}
                      >
                        Conectar
                      </Button>
                    </Stack>
                    {connectError && <Alert severity="error">{connectError}</Alert>}
                  </Stack>
                )}
              </CardContent>
            </Card>

            {/* Import Boards */}
            {isConnected && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="subtitle1" fontWeight={600}>Importar Boards do Trello</Typography>
                    <Button
                      size="small" variant="outlined"
                      startIcon={loadingBoards ? <CircularProgress size={14} /> : <IconBrandTrello size={16} />}
                      onClick={handleListBoards}
                      disabled={loadingBoards}
                    >
                      Listar boards
                    </Button>
                  </Stack>

                  {trelloBoards.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      Clique em "Listar boards" para ver os boards disponíveis na sua conta Trello.
                    </Typography>
                  )}

                  {trelloBoards.map((board) => {
                    const alreadyImported = projectBoards.find((b) => b.trello_board_id === board.id);
                    const selectedClientId = importClientId[board.id] ?? alreadyImported?.client_id ?? '';
                    const result = importResult[board.id];
                    return (
                      <Box key={board.id} sx={{ p: 1.5, mb: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1.5, bgcolor: alreadyImported ? 'action.hover' : 'background.paper' }}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
                          <Box flex={1}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography variant="body2" fontWeight={600}>{board.name}</Typography>
                              {alreadyImported && <Chip label="Importado" size="small" color="success" />}
                              <Tooltip title="Ver no Trello">
                                <a href={board.url} target="_blank" rel="noreferrer" aria-label="Ver no Trello">
                                  <IconExternalLink size={14} />
                                </a>
                              </Tooltip>
                            </Stack>
                            {board.desc && <Typography variant="caption" color="text.secondary">{board.desc}</Typography>}
                          </Box>
                          <TextField
                            select size="small" label="Cliente (opcional)"
                            value={selectedClientId}
                            onChange={(e) => setImportClientId((prev) => ({ ...prev, [board.id]: e.target.value }))}
                            sx={{ minWidth: 160 }}
                          >
                            <MenuItem value="">Nenhum / Interno</MenuItem>
                            {clients.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                          </TextField>
                          <Button
                            size="small"
                            variant={alreadyImported ? 'outlined' : 'contained'}
                            startIcon={importing === board.id ? <CircularProgress size={14} color="inherit" /> : <IconRefresh size={16} />}
                            onClick={() => handleImport(board.id)}
                            disabled={importing === board.id}
                            sx={{ whiteSpace: 'nowrap' }}
                          >
                            {alreadyImported ? 'Re-sincronizar' : 'Importar'}
                          </Button>
                        </Stack>
                        {result && (
                          <Typography variant="caption" color={result.startsWith('Erro') ? 'error' : 'success.main'} sx={{ mt: 0.5, display: 'block' }}>
                            {result}
                          </Typography>
                        )}
                      </Box>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Boards no Edro */}
            {projectBoards.length > 0 && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={600} mb={2}>Boards no Edro ({projectBoards.length})</Typography>
                  <Stack spacing={1}>
                    {projectBoards.map((board) => {
                      const selectedClientId = importClientId[board.id] ?? board.client_id ?? '';
                      const clientName = clients.find((c) => c.id === (board.client_id ?? ''))?.name;
                      const result = importResult[board.id];
                      return (
                        <Box key={board.id}>
                          <Stack
                            direction="row" justifyContent="space-between" alignItems="center"
                            sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}
                          >
                            <Box>
                              <Typography variant="body2" fontWeight={600}>{board.name}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {board.card_count} cards · sync {fmtDate(board.last_synced_at)}
                                {clientName ? ` · cliente ${clientName}` : ' · sem cliente vinculado'}
                              </Typography>
                            </Box>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                              <TextField
                                select size="small" label="Cliente"
                                value={selectedClientId}
                                onChange={(e) => setImportClientId((prev) => ({ ...prev, [board.id]: e.target.value }))}
                                sx={{ minWidth: 180 }}
                              >
                                <MenuItem value="">Nenhum / Interno</MenuItem>
                                {clients.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                              </TextField>
                              <Button size="small" variant="outlined" onClick={() => handleAssignProjectBoard(board.id, board.client_id)} disabled={savingBoardId === board.id}>
                                {savingBoardId === board.id ? 'Salvando...' : 'Salvar vínculo'}
                              </Button>
                              <Button size="small" variant="outlined" href={`/projetos/${board.id}`}>
                                Abrir kanban
                              </Button>
                            </Stack>
                          </Stack>
                          {result && (
                            <Typography variant="caption" color={result.startsWith('Erro') ? 'error' : 'success.main'} sx={{ mt: 0.5, display: 'block' }}>
                              {result}
                            </Typography>
                          )}
                        </Box>
                      );
                    })}
                  </Stack>
                </CardContent>
              </Card>
            )}

            {/* Sync Log */}
            {syncLogs.length > 0 && (
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={600} mb={2}>Log de Sincronizações</Typography>
                  <Stack spacing={0.5}>
                    {syncLogs.slice(0, 10).map((log) => (
                      <Stack key={log.id} direction="row" spacing={1.5} alignItems="center" sx={{ py: 0.75 }}>
                        <Chip label={log.status} size="small" color={log.status === 'done' ? 'success' : log.status === 'error' ? 'error' : 'default'} />
                        <Typography variant="body2" sx={{ flex: 1 }}>{log.board_name ?? log.trello_board_id}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {log.status === 'done' ? `${log.cards_synced} cards · ${log.actions_synced} comentários` : log.error_message ?? ''}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>{fmtDate(log.started_at)}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* TAB 1 — SAÚDE DO SISTEMA                                       */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {activeTab === 1 && (
          <>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Saúde do Sistema</Typography>
              <Button size="small" startIcon={loadingHealth ? <CircularProgress size={14} /> : <IconRefresh size={16} />} variant="outlined" onClick={loadHealth} disabled={loadingHealth}>
                Atualizar
              </Button>
            </Stack>

            {loadingHealth && !health && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress />
              </Box>
            )}

            {health && (
              <>
                {/* Summary chips */}
                <Stack direction="row" spacing={2} mb={3} flexWrap="wrap" useFlexGap>
                  <Paper variant="outlined" sx={{ p: 2, minWidth: 100, textAlign: 'center' }}>
                    <Stack alignItems="center" spacing={0.5}>
                      <IconCircleCheck size={22} color="#2e7d32" />
                      <Typography variant="h5" fontWeight={700} color="success.main">{health.summary.ok_count}</Typography>
                      <Typography variant="caption" color="text.secondary">OK</Typography>
                    </Stack>
                  </Paper>
                  <Paper variant="outlined" sx={{ p: 2, minWidth: 100, textAlign: 'center' }}>
                    <Stack alignItems="center" spacing={0.5}>
                      <IconClockHour4 size={22} color="#ed6c02" />
                      <Typography variant="h5" fontWeight={700} color="warning.main">{health.summary.stale_count}</Typography>
                      <Typography variant="caption" color="text.secondary">Desatualizados</Typography>
                    </Stack>
                  </Paper>
                  <Paper variant="outlined" sx={{ p: 2, minWidth: 100, textAlign: 'center' }}>
                    <Stack alignItems="center" spacing={0.5}>
                      <IconAlertCircle size={22} color="#d32f2f" />
                      <Typography variant="h5" fontWeight={700} color="error.main">{health.summary.error_count}</Typography>
                      <Typography variant="caption" color="text.secondary">Com Erro</Typography>
                    </Stack>
                  </Paper>
                  <Paper variant="outlined" sx={{ p: 2, minWidth: 100, textAlign: 'center' }}>
                    <Stack alignItems="center" spacing={0.5}>
                      <IconAlertTriangle size={22} color="#ed6c02" />
                      <Typography variant="h5" fontWeight={700} color="warning.main">{health.summary.unlinked_count}</Typography>
                      <Typography variant="caption" color="text.secondary">Sem Cliente</Typography>
                    </Stack>
                  </Paper>
                  <Paper variant="outlined" sx={{ p: 2, minWidth: 100, textAlign: 'center' }}>
                    <Stack alignItems="center" spacing={0.5}>
                      <IconList size={22} color="#1565c0" />
                      <Typography variant="h5" fontWeight={700} color="info.main">{health.summary.unmapped_list_count}</Typography>
                      <Typography variant="caption" color="text.secondary">Listas sem status</Typography>
                    </Stack>
                  </Paper>
                  <Paper variant="outlined" sx={{ p: 2, minWidth: 100, textAlign: 'center' }}>
                    <Stack alignItems="center" spacing={0.5}>
                      <IconUsers size={22} color="#666" />
                      <Typography variant="h5" fontWeight={700} color="text.secondary">{health.summary.members_without_email}</Typography>
                      <Typography variant="caption" color="text.secondary">Membros sem email</Typography>
                    </Stack>
                  </Paper>
                </Stack>

                {(health.summary.stale_count > 0 || health.summary.error_count > 0) && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    {health.summary.error_count > 0 && `${health.summary.error_count} board(s) com erro de sync. `}
                    {health.summary.stale_count > 0 && `${health.summary.stale_count} board(s) com dados desatualizados (>2h). `}
                    Verifique a aba Boards e re-sincronize se necessário.
                  </Alert>
                )}

                {health.summary.unlinked_count > 0 && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    {health.summary.unlinked_count} board(s) sem cliente vinculado. Cards desses boards aparecem na Central de Operações sem cliente. Vincule na aba Boards.
                  </Alert>
                )}

                {/* Boards table */}
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} mb={2}>Status por Board ({health.boards.length})</Typography>
                    <Stack spacing={0}>
                      {health.boards.map((b, i) => (
                        <Box key={b.id}>
                          {i > 0 && <Divider />}
                          <Stack direction="row" spacing={2} alignItems="center" sx={{ py: 1.25, px: 0.5 }}>
                            <SyncStatusChip status={b.sync_status} />
                            <Box flex={1} minWidth={0}>
                              <Typography variant="body2" fontWeight={600} noWrap>{b.name}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {b.client_name ?? <em>sem cliente</em>}
                                {b.last_sync_error && ` · Erro: ${b.last_sync_error}`}
                              </Typography>
                            </Box>
                            <Stack alignItems="flex-end" sx={{ minWidth: 80 }}>
                              <Typography variant="body2">{b.active_cards} cards</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {b.last_synced_at ? `há ${fmtAge(b.sync_age_hours)}` : 'nunca'}
                              </Typography>
                            </Stack>
                          </Stack>
                        </Box>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>

                {/* Unmapped lists */}
                {health.unmappedLists.length > 0 && (
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight={600} mb={0.5}>
                        Listas sem classificação ({health.unmappedLists.length})
                      </Typography>
                      <Typography variant="body2" color="text.secondary" mb={2}>
                        Estas listas têm cards ativos mas o nome não foi reconhecido automaticamente. Defina o status para que apareçam corretamente na Central de Operações.
                      </Typography>
                      <Stack spacing={1}>
                        {health.unmappedLists.map((list) => (
                          <Stack
                            key={list.list_id}
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={1.5}
                            alignItems={{ sm: 'center' }}
                            sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}
                          >
                            <Box flex={1}>
                              <Typography variant="body2" fontWeight={600}>{list.list_name}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {list.board_name} · {list.card_count} card(s)
                              </Typography>
                            </Box>
                            <TextField
                              select size="small" label="Status na Operações"
                              value={listOverrides[list.list_id] ?? ''}
                              onChange={(e) => setListOverrides((prev) => ({ ...prev, [list.list_id]: e.target.value }))}
                              sx={{ minWidth: 220 }}
                            >
                              <MenuItem value="">— Manter como Intake —</MenuItem>
                              {OPS_STATUSES.map((s) => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
                            </TextField>
                            <Button
                              size="small"
                              variant="contained"
                              disabled={savingListId === list.list_id || !listOverrides[list.list_id]}
                              onClick={() => handleSaveListOverride(list.list_id, list.board_id)}
                            >
                              {savingListId === list.list_id ? 'Salvando...' : 'Salvar'}
                            </Button>
                          </Stack>
                        ))}
                      </Stack>
                    </CardContent>
                  </Card>
                )}

                {health.unmappedLists.length === 0 && (
                  <Alert severity="success">
                    Todas as listas com cards ativos estão classificadas. Nenhuma ação necessária.
                  </Alert>
                )}
              </>
            )}
          </>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* TAB 2 — MAPEAMENTO COMPLETO DE LISTAS                          */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {activeTab === 2 && (
          <>
            <Typography variant="h6" mb={2}>Mapeamento de Listas</Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Defina explicitamente o status operacional de cada lista de um board. O status definido aqui sobrepõe o reconhecimento automático por nome.
            </Typography>

            <Stack direction="row" spacing={2} alignItems="center" mb={3}>
              <TextField
                select size="small" label="Board"
                value={mapBoardId}
                onChange={(e) => {
                  setMapBoardId(e.target.value);
                  loadMapLists(e.target.value);
                }}
                sx={{ minWidth: 240 }}
              >
                {projectBoards.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
              </TextField>
              {mapBoardId && (
                <Button
                  variant="contained"
                  disabled={savingMap || loadingMapLists}
                  startIcon={savingMap ? <CircularProgress size={14} color="inherit" /> : undefined}
                  onClick={handleSaveAllMapOverrides}
                >
                  Salvar tudo
                </Button>
              )}
            </Stack>

            {loadingMapLists && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            )}

            {!loadingMapLists && mapLists.length > 0 && (
              <Card>
                <CardContent>
                  <Stack spacing={0}>
                    {mapLists.map((list, i) => (
                      <Box key={list.list_id}>
                        {i > 0 && <Divider />}
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} sx={{ py: 1.25 }}>
                          <Box flex={1}>
                            <Typography variant="body2" fontWeight={600}>{list.list_name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {list.card_count} cards · automático: <strong>{list.detected_status}</strong>
                            </Typography>
                          </Box>
                          <TextField
                            select size="small" label="Status override"
                            value={mapOverrides[list.list_id] ?? ''}
                            onChange={(e) => setMapOverrides((prev) => ({ ...prev, [list.list_id]: e.target.value }))}
                            sx={{ minWidth: 220 }}
                          >
                            <MenuItem value="">— Usar automático ({list.detected_status}) —</MenuItem>
                            {OPS_STATUSES.map((s) => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
                          </TextField>
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            )}

            {!loadingMapLists && mapLists.length === 0 && mapBoardId && (
              <Alert severity="info">Nenhuma lista encontrada para este board.</Alert>
            )}
          </>
        )}
      </Box>
    </AppShell>
  );
}
