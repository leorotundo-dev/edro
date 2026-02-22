'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet } from '@/lib/api';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { IconExternalLink, IconPlus } from '@tabler/icons-react';

// ── Tipos ─────────────────────────────────────────────────────────────────────

type Briefing = {
  id: string;
  title: string;
  status: string;
  current_stage: string | null;
  client_name: string | null;
  created_at: string;
  due_at: string | null;
  payload: Record<string, any>;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  briefing: 'Briefing',
  iclips_in: 'iClips Entrada',
  alinhamento: 'Alinhamento',
  copy_ia: 'Copy IA',
  aprovacao: 'Aprovação',
  producao: 'Produção',
  revisao: 'Revisão',
  iclips_out: 'iClips Saída',
  done: 'Concluído',
  archived: 'Arquivado',
};

const STATUS_COLORS: Record<string, 'default' | 'info' | 'warning' | 'success' | 'error' | 'primary' | 'secondary'> = {
  briefing: 'default',
  iclips_in: 'info',
  alinhamento: 'info',
  copy_ia: 'primary',
  aprovacao: 'warning',
  producao: 'warning',
  revisao: 'warning',
  iclips_out: 'info',
  done: 'success',
  archived: 'error',
};

function formatDate(value?: string | null) {
  if (!value) return '--';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '--';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function ClientBriefingsClient({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [briefings, setBriefings] = useState<Briefing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientName, setClientName] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Busca briefings vinculados a este cliente (main_client_id OU client_id legado)
      const res = await apiGet<{ success: boolean; data: Briefing[]; total: number }>(
        `/edro/briefings?clientId=${clientId}&limit=50`
      );
      const rows = res?.data || [];
      setBriefings(rows);
      if (rows[0]?.client_name) setClientName(rows[0].client_name);
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar briefings.');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  // Também busca o nome do cliente se não veio nos briefings
  useEffect(() => {
    load();
    apiGet<{ success: boolean; data: { name: string } }>(`/clients/${clientId}`)
      .then((r) => { if (r?.data?.name) setClientName(r.data.name); })
      .catch(() => {});
  }, [clientId, load]);

  const handleNovoBriefing = () => {
    const params = new URLSearchParams({ client_id: clientId });
    if (clientName) params.set('client_name', clientName);
    router.push(`/edro/novo?${params.toString()}`);
  };

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Stack>
          <Typography variant="h6" fontWeight={700}>
            Briefings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Todos os briefings vinculados a este cliente
          </Typography>
        </Stack>
        <Button
          variant="contained"
          startIcon={<IconPlus size={16} />}
          onClick={handleNovoBriefing}
          size="small"
        >
          Novo Briefing
        </Button>
      </Stack>

      {/* Estado de carregamento */}
      {loading && (
        <Stack alignItems="center" sx={{ py: 6 }}>
          <CircularProgress size={28} />
        </Stack>
      )}

      {/* Erro */}
      {!loading && error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Lista vazia */}
      {!loading && !error && briefings.length === 0 && (
        <Stack alignItems="center" sx={{ py: 8, gap: 2 }}>
          <Typography color="text.secondary" variant="body2">
            Nenhum briefing encontrado para este cliente.
          </Typography>
          <Button variant="outlined" startIcon={<IconPlus size={16} />} onClick={handleNovoBriefing}>
            Criar primeiro briefing
          </Button>
        </Stack>
      )}

      {/* Tabela de briefings */}
      {!loading && !error && briefings.length > 0 && (
        <Box
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>TÍTULO</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>STATUS</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>CANAL</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>CRIADO EM</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>ENTREGA</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }} align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {briefings.map((b) => (
                <TableRow
                  key={b.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => router.push(`/edro/${b.id}`)}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 280 }}>
                      {b.title}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={STATUS_LABELS[b.current_stage || b.status] || b.status}
                      color={STATUS_COLORS[b.current_stage || b.status] || 'default'}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {(b.payload?.channels as string) || '--'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(b.created_at)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="caption"
                      color={
                        b.due_at && new Date(b.due_at) < new Date()
                          ? 'error.main'
                          : 'text.secondary'
                      }
                    >
                      {formatDate(b.due_at)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <IconExternalLink size={14} color="gray" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Box sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary">
              {briefings.length} briefing{briefings.length !== 1 ? 's' : ''} encontrado{briefings.length !== 1 ? 's' : ''}
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
}
