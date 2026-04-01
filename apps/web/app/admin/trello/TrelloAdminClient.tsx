'use client';

import { useCallback, useEffect, useState } from 'react';
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
import Stack from '@mui/material/Stack';
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
  IconLinkOff,
  IconTrash,
} from '@tabler/icons-react';

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

type ClientRow = { id: string; name: string };

const TRELLO_HELP_URL = 'https://trello.com/app-key';

function fmtDate(v?: string | null) {
  if (!v) return '—';
  return new Date(v).toLocaleString('pt-BR');
}

export default function TrelloAdminClient() {
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

  // Import dialog state
  const [importing, setImporting] = useState<string | null>(null); // trelloBoardId being imported
  const [savingBoardId, setSavingBoardId] = useState<string | null>(null);
  const [importClientId, setImportClientId] = useState<Record<string, string>>({});
  const [importResult, setImportResult] = useState<Record<string, string>>({});

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
    setClients(data.clients ?? data.rows ?? []);
  }, []);

  useEffect(() => {
    loadConnector();
    loadProjectBoards();
    loadClients();
  }, [loadConnector, loadProjectBoards, loadClients]);

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
      const res = await apiPost(`/trello/boards/${trelloBoardId}/sync`, {
        client_id: selectedClientId,
      });
      setImportResult((prev) => ({
        ...prev,
        [trelloBoardId]: `✓ ${res.cardsSync} cards importados`,
      }));
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
      await apiPatch(`/trello/project-boards/${boardId}`, {
        client_id: nextClientId || null,
      });
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

  async function handleDetachProjectBoard(boardId: string) {
    setSavingBoardId(boardId);
    setImportResult((prev) => ({ ...prev, [boardId]: '' }));
    try {
      await apiPatch(`/trello/project-boards/${boardId}`, { client_id: null });
      setImportClientId((prev) => ({ ...prev, [boardId]: '' }));
      setImportResult((prev) => ({
        ...prev,
        [boardId]: '✓ Board desvinculado do cliente',
      }));
      await loadProjectBoards();
    } catch (err: any) {
      setImportResult((prev) => ({
        ...prev,
        [boardId]: `Erro: ${err?.message ?? 'Falha ao desvincular board.'}`,
      }));
    } finally {
      setSavingBoardId(null);
    }
  }

  const isConnected = connector?.connected && connector.is_active;

  return (
    <AppShell title="Integração Trello">
      <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 960, mx: 'auto' }}>
        <Stack direction="row" alignItems="center" spacing={1.5} mb={3}>
          <IconBrandTrello size={28} color="#0052cc" />
          <Typography variant="h5" fontWeight={700}>Integração Trello</Typography>
          {isConnected && (
            <Chip label="Conectado" color="success" size="small" icon={<IconCheck size={14} />} />
          )}
        </Stack>

        {/* ── Connector Card ── */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={600} mb={1.5}>
              Credenciais
            </Typography>

            {isConnected ? (
              <Stack spacing={1}>
                <Typography variant="body2" color="text.secondary">
                  Conector ativo · última sync: {fmtDate(connector?.last_synced_at)}
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    startIcon={<IconRefresh size={16} />}
                    variant="outlined"
                    onClick={handleSyncAll}
                  >
                    Sincronizar agora
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<IconPlugOff size={16} />}
                    variant="outlined"
                    onClick={handleDisconnect}
                  >
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
                  <TextField
                    label="API Key"
                    size="small"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    sx={{ flex: 1 }}
                    type="password"
                  />
                  <TextField
                    label="API Token"
                    size="small"
                    value={apiToken}
                    onChange={(e) => setApiToken(e.target.value)}
                    sx={{ flex: 1 }}
                    type="password"
                  />
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

        {/* ── Import Boards ── */}
        {isConnected && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="subtitle1" fontWeight={600}>
                  Importar Boards do Trello
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
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
                  <Box
                    key={board.id}
                    sx={{
                      p: 1.5,
                      mb: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1.5,
                      bgcolor: alreadyImported ? 'action.hover' : 'background.paper',
                    }}
                  >
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
                        {board.desc && (
                          <Typography variant="caption" color="text.secondary">{board.desc}</Typography>
                        )}
                      </Box>

                      <TextField
                        select
                        size="small"
                        label="Cliente (opcional)"
                        value={selectedClientId}
                        onChange={(e) => setImportClientId((prev) => ({ ...prev, [board.id]: e.target.value }))}
                        sx={{ minWidth: 160 }}
                      >
                        <MenuItem value="">Nenhum / Interno</MenuItem>
                        {clients.map((c) => (
                          <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                        ))}
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
                      <Typography
                        variant="caption"
                        color={result.startsWith('Erro') ? 'error' : 'success.main'}
                        sx={{ mt: 0.5, display: 'block' }}
                      >
                        {result}
                      </Typography>
                    )}
                  </Box>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* ── Boards Importados ── */}
        {projectBoards.length > 0 && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>
                Boards no Edro ({projectBoards.length})
              </Typography>
              <Stack spacing={1}>
                {projectBoards.map((board) => {
                  const selectedClientId = importClientId[board.id] ?? board.client_id ?? '';
                  const clientName = clients.find((client) => client.id === (board.client_id ?? ''))?.name;
                  const result = importResult[board.id];
                  return (
                    <Box key={board.id}>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
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
                            select
                            size="small"
                            label="Cliente"
                            value={selectedClientId}
                            onChange={(e) => setImportClientId((prev) => ({ ...prev, [board.id]: e.target.value }))}
                            sx={{ minWidth: 180 }}
                          >
                            <MenuItem value="">Nenhum / Interno</MenuItem>
                            {clients.map((c) => (
                              <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                            ))}
                          </TextField>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => handleAssignProjectBoard(board.id, board.client_id)}
                            disabled={savingBoardId === board.id}
                          >
                            {savingBoardId === board.id ? 'Salvando...' : 'Salvar vínculo'}
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="inherit"
                            startIcon={<IconLinkOff size={15} />}
                            onClick={() => handleDetachProjectBoard(board.id)}
                            disabled={savingBoardId === board.id || !board.client_id}
                          >
                            Desvincular
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            href={`/projetos/${board.id}`}
                          >
                            Abrir kanban
                          </Button>
                        </Stack>
                      </Stack>
                      {result && (
                        <Typography
                          variant="caption"
                          color={result.startsWith('Erro') ? 'error' : 'success.main'}
                          sx={{ mt: 0.5, display: 'block' }}
                        >
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

        {/* ── Sync Log ── */}
        {syncLogs.length > 0 && (
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>
                Log de Sincronizações
              </Typography>
              <Stack spacing={0.5}>
                {syncLogs.slice(0, 10).map((log) => (
                  <Stack
                    key={log.id}
                    direction="row"
                    spacing={1.5}
                    alignItems="center"
                    sx={{ py: 0.75 }}
                  >
                    <Chip
                      label={log.status}
                      size="small"
                      color={log.status === 'done' ? 'success' : log.status === 'error' ? 'error' : 'default'}
                    />
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      {log.board_name ?? log.trello_board_id}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {log.status === 'done' ? `${log.cards_synced} cards · ${log.actions_synced} comentários` : log.error_message ?? ''}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                      {fmtDate(log.started_at)}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        )}
      </Box>
    </AppShell>
  );
}
