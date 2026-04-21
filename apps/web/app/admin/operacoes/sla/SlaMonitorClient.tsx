'use client';

import { useCallback, useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconClock,
  IconExternalLink,
  IconFilter,
  IconRefresh,
  IconBrandTrello,
} from '@tabler/icons-react';
import { apiGet } from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

type SlaRow = {
  id: string;
  client_id: string | null;
  client_name: string | null;
  owner_name: string | null;
  title: string;
  job_type: string;
  status: string;
  trello_card_id: string | null;
  trello_list_name: string | null;
  sla_agreed_days: number | null;
  deadline_at: string | null;
  created_at: string;
  completed_at: string | null;
  tempo_real_dias: number | null;
  dias_overdue: number | null;
  avaliacao: 'Estourado' | 'Em andamento' | 'No Prazo';
  sla_met: boolean | null;
  trello_url: string | null;
};

type ClientOption = { client_id: string; client_name: string };

type MonitorData = {
  rows: SlaRow[];
  total: number;
  period_days: number;
  clients: ClientOption[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const JOB_TYPE_LABELS: Record<string, string> = {
  campaign: 'Campanha',
  briefing: 'Briefing',
  meeting: 'Reunião',
  approval: 'Aprovação',
  copy: 'Copy',
  design_static: 'Design Estático',
  design_carousel: 'Carrossel',
  video_edit: 'Vídeo',
  publication: 'Post',
  urgent_request: 'Urgente',
};

const STATUS_LABELS: Record<string, string> = {
  intake: 'Entrada',
  planned: 'Planejado',
  ready: 'Pronto',
  allocated: 'Alocado',
  in_progress: 'Em Produção',
  blocked: 'Bloqueado',
  in_review: 'Em Revisão',
  awaiting_approval: 'Aguardando Aprovação',
  approved: 'Aprovado',
  scheduled: 'Agendado',
  published: 'Publicado',
  done: 'Entregue',
  archived: 'Arquivado',
};

function AvaliacaoChip({ val }: { val: SlaRow['avaliacao'] }) {
  const map = {
    Estourado:    { color: '#FA896B', bg: alpha('#FA896B', 0.12), icon: <IconAlertTriangle size={12} />, label: '🔴 Estourado' },
    'Em andamento': { color: '#FFAE1F', bg: alpha('#FFAE1F', 0.12), icon: <IconClock size={12} />, label: '🟡 Em andamento' },
    'No Prazo':   { color: '#13DEB9', bg: alpha('#13DEB9', 0.12), icon: <IconCircleCheck size={12} />, label: '✅ No Prazo' },
  } as const;
  const m = map[val] ?? map['Em andamento'];
  return (
    <Chip
      size="small"
      label={m.label}
      icon={m.icon}
      sx={{ bgcolor: m.bg, color: m.color, fontWeight: 700, fontSize: '0.68rem', height: 22, '& .MuiChip-icon': { color: m.color } }}
    />
  );
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function SlaMonitorClient({ embedded = false }: { embedded?: boolean }) {
  const theme = useTheme();

  // Filters
  const [days, setDays] = useState('90');
  const [clientId, setClientId] = useState('');
  const [avaliacao, setAvaliacao] = useState('');

  // Data
  const [data, setData] = useState<MonitorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ days });
      if (clientId) params.set('client_id', clientId);
      if (avaliacao) params.set('avaliacao', avaliacao);
      const res = await apiGet<{ data: MonitorData }>(`/jobs/sla-monitor?${params}`);
      setData(res?.data ?? null);
    } catch (e: any) {
      setError(e?.message || 'Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  }, [days, clientId, avaliacao]);

  useEffect(() => { load(); }, [load]);

  const rows = data?.rows ?? [];

  const summary = (
    <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
      {data && (
        <>
          <Chip size="small" label={`${data.total} demandas`} variant="outlined" />
          <Chip size="small" label={`${rows.filter(r => r.avaliacao === 'Estourado').length} estouradas`} sx={{ bgcolor: alpha('#FA896B', 0.1), color: '#FA896B', fontWeight: 700 }} />
          <Chip size="small" label={`${rows.filter(r => r.avaliacao === 'No Prazo').length} no prazo`} sx={{ bgcolor: alpha('#13DEB9', 0.1), color: '#13DEB9', fontWeight: 700 }} />
        </>
      )}
    </Stack>
  );

  const content = (
    <Stack spacing={2}>
      {/* Toolbar */}
      <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
        <IconFilter size={16} color={theme.palette.text.secondary} />
        <TextField
          select size="small" value={days} onChange={(e) => setDays(e.target.value)}
          sx={{ minWidth: 130 }}
        >
          {[['30','30 dias'],['60','60 dias'],['90','90 dias'],['180','6 meses'],['365','1 ano']].map(([v,l]) => (
            <MenuItem key={v} value={v}>{l}</MenuItem>
          ))}
        </TextField>

        <TextField
          select size="small" value={clientId} onChange={(e) => setClientId(e.target.value)}
          sx={{ minWidth: 180 }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><Typography variant="caption" color="text.secondary">Cliente</Typography></InputAdornment>,
          }}
        >
          <MenuItem value="">Todos os clientes</MenuItem>
          {(data?.clients ?? []).map((c) => (
            <MenuItem key={c.client_id} value={c.client_id}>{c.client_name}</MenuItem>
          ))}
        </TextField>

        <TextField
          select size="small" value={avaliacao} onChange={(e) => setAvaliacao(e.target.value)}
          sx={{ minWidth: 160 }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><Typography variant="caption" color="text.secondary">Status</Typography></InputAdornment>,
          }}
        >
          <MenuItem value="">Todos</MenuItem>
          <MenuItem value="Estourado">🔴 Estourado</MenuItem>
          <MenuItem value="Em andamento">🟡 Em andamento</MenuItem>
          <MenuItem value="No Prazo">✅ No Prazo</MenuItem>
        </TextField>

        <Box sx={{ flex: 1 }} />
        {summary}
        <Tooltip title="Recarregar">
          <IconButton size="small" onClick={load} disabled={loading}>
            <IconRefresh size={16} />
          </IconButton>
        </Tooltip>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      {loading ? (
        <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      ) : rows.length === 0 ? (
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <Typography variant="body2" color="text.disabled">Nenhuma demanda encontrada com os filtros aplicados.</Typography>
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                {[
                  'Cliente',
                  'Demanda',
                  'Categoria',
                  'Status Trello',
                  'SLA Acordado',
                  'Tempo Real (dias)',
                  'Variância',
                  'Avaliação',
                  '',
                ].map((h) => (
                  <TableCell
                    key={h}
                    sx={{
                      fontWeight: 800,
                      fontSize: '0.7rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: 'text.secondary',
                      bgcolor: theme.palette.mode === 'dark'
                        ? alpha(theme.palette.common.white, 0.04)
                        : alpha(theme.palette.common.black, 0.03),
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => {
                const isOverdue = row.avaliacao === 'Estourado';
                return (
                  <TableRow
                    key={row.id}
                    sx={{
                      '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) },
                      bgcolor: isOverdue ? alpha('#FA896B', 0.035) : 'transparent',
                    }}
                  >
                    {/* Cliente */}
                    <TableCell sx={{ maxWidth: 130 }}>
                      <Typography variant="caption" fontWeight={700} noWrap>
                        {row.client_name || '—'}
                      </Typography>
                    </TableCell>

                    {/* Demanda */}
                    <TableCell sx={{ maxWidth: 260 }}>
                      <Tooltip title={row.title} placement="top">
                        <Typography variant="caption" fontWeight={600} noWrap display="block">
                          {row.title}
                        </Typography>
                      </Tooltip>
                      {row.owner_name && (
                        <Typography variant="caption" color="text.disabled" noWrap display="block">
                          {row.owner_name}
                        </Typography>
                      )}
                    </TableCell>

                    {/* Categoria */}
                    <TableCell>
                      <Chip
                        size="small"
                        label={JOB_TYPE_LABELS[row.job_type] ?? row.job_type}
                        variant="outlined"
                        sx={{ fontSize: '0.65rem', height: 20 }}
                      />
                    </TableCell>

                    {/* Status Trello (list name) */}
                    <TableCell sx={{ maxWidth: 140 }}>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {row.trello_list_name || STATUS_LABELS[row.status] || row.status}
                      </Typography>
                    </TableCell>

                    {/* SLA Acordado */}
                    <TableCell align="center">
                      <Typography variant="caption" fontWeight={700}>
                        {row.sla_agreed_days != null ? `${row.sla_agreed_days}d` : '—'}
                      </Typography>
                    </TableCell>

                    {/* Tempo Real */}
                    <TableCell align="center">
                      <Typography
                        variant="caption"
                        fontWeight={800}
                        sx={{ color: isOverdue ? '#FA896B' : 'text.primary' }}
                      >
                        {row.tempo_real_dias != null ? `${row.tempo_real_dias}d` : '—'}
                      </Typography>
                    </TableCell>

                    {/* Variância */}
                    <TableCell align="center">
                      {row.dias_overdue != null ? (
                        <Typography
                          variant="caption"
                          fontWeight={700}
                          sx={{
                            color: row.dias_overdue > 0 ? '#FA896B' : '#13DEB9',
                          }}
                        >
                          {row.dias_overdue > 0 ? `+${row.dias_overdue}d` : `${row.dias_overdue}d`}
                        </Typography>
                      ) : (
                        <Typography variant="caption" color="text.disabled">—</Typography>
                      )}
                    </TableCell>

                    {/* Avaliação */}
                    <TableCell>
                      <AvaliacaoChip val={row.avaliacao} />
                    </TableCell>

                    {/* Actions */}
                    <TableCell align="right" sx={{ pr: 1.5 }}>
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        {row.trello_url && (
                          <Tooltip title="Abrir no Trello">
                            <IconButton
                              size="small"
                              component="a"
                              href={row.trello_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{ color: '#0052CC' }}
                            >
                              <IconBrandTrello size={14} />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Ver detalhes">
                          <IconButton
                            size="small"
                            component="a"
                            href={`/admin/operacoes/jobs/${row.id}`}
                            sx={{ color: 'text.secondary' }}
                          >
                            <IconExternalLink size={14} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {data && data.total > rows.length && (
        <Typography variant="caption" color="text.secondary" textAlign="center">
          Mostrando {rows.length} de {data.total} demandas. Use filtros para refinar.
        </Typography>
      )}
    </Stack>
  );

  return content;
}
