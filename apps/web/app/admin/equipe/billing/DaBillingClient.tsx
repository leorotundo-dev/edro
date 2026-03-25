'use client';

import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import AppShell from '@/components/AppShell';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { apiGet, apiPost } from '@/lib/api';

const swrFetcher = (url: string) => apiGet(url);

// ─── Types ────────────────────────────────────────────────────────────────────

type SummaryRow = {
  freelancer_id: string;
  name: string;
  status: string;
  total_cents: number;
  count: number;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function brl(cents: number) {
  return `R$ ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const STATUS_CHIP: Record<string, { label: string; color: 'default' | 'warning' | 'success' | 'error' }> = {
  pending:  { label: 'Pendente',  color: 'warning' },
  approved: { label: 'Aprovado',  color: 'success' },
  paid:     { label: 'Pago',      color: 'default' },
  disputed: { label: 'Disputado', color: 'error'   },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function DaBillingClient() {
  const [period, setPeriod] = useState(currentPeriod());
  const [approving, setApproving] = useState<Record<string, boolean>>({});

  // Generate last 6 months as period options
  const periods = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const { data, error, isLoading } = useSWR<{ success: boolean; data: SummaryRow[] }>(
    `/api/da-billing/summary/${period}`,
    swrFetcher,
  );

  // Group by freelancer, pivot by status
  const byFreelancer = (data?.data ?? []).reduce(
    (acc, row) => {
      if (!acc[row.freelancer_id]) {
        acc[row.freelancer_id] = { name: row.name, statuses: {} };
      }
      acc[row.freelancer_id].statuses[row.status] = { total_cents: row.total_cents, count: row.count };
      return acc;
    },
    {} as Record<string, { name: string; statuses: Record<string, { total_cents: number; count: number }> }>,
  );

  async function approvePendingForFreelancer(freelancerId: string) {
    // Approve all pending entries for this freelancer in the period
    setApproving((prev) => ({ ...prev, [freelancerId]: true }));
    try {
      await apiPost(`/api/da-billing/approve-period`, { freelancer_id: freelancerId, period_month: period });
      mutate(`/api/da-billing/summary/${period}`);
    } catch (e: any) {
      alert(`Erro: ${e?.message}`);
    } finally {
      setApproving((prev) => ({ ...prev, [freelancerId]: false }));
    }
  }

  return (
    <AppShell title="Cobrança de DAs">
      <Stack spacing={3}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h5" fontWeight={700}>Cobrança de Designers & Redatores</Typography>
          <Select
            size="small"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            sx={{ minWidth: 140 }}
          >
            {periods.map((p) => (
              <MenuItem key={p} value={p}>{p}</MenuItem>
            ))}
          </Select>
        </Stack>

        {isLoading && <CircularProgress size={28} />}
        {error && <Alert severity="error">Erro ao carregar dados de cobrança.</Alert>}

        {!isLoading && !error && (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>DA</TableCell>
                  <TableCell align="right">Pendente</TableCell>
                  <TableCell align="right">Aprovado</TableCell>
                  <TableCell align="right">Pago</TableCell>
                  <TableCell align="right">Total Jobs</TableCell>
                  <TableCell align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(byFreelancer).map(([fId, info]) => {
                  const pending  = info.statuses['pending']  ?? { total_cents: 0, count: 0 };
                  const approved = info.statuses['approved'] ?? { total_cents: 0, count: 0 };
                  const paid     = info.statuses['paid']     ?? { total_cents: 0, count: 0 };
                  const totalJobs = pending.count + approved.count + paid.count;

                  return (
                    <TableRow key={fId} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{info.name}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        {pending.total_cents > 0 ? (
                          <Box>
                            <Typography variant="body2">{brl(pending.total_cents)}</Typography>
                            <Typography variant="caption" color="text.secondary">{pending.count} jobs</Typography>
                          </Box>
                        ) : '—'}
                      </TableCell>
                      <TableCell align="right">
                        {approved.total_cents > 0 ? (
                          <Box>
                            <Typography variant="body2">{brl(approved.total_cents)}</Typography>
                            <Typography variant="caption" color="text.secondary">{approved.count} jobs</Typography>
                          </Box>
                        ) : '—'}
                      </TableCell>
                      <TableCell align="right">
                        {paid.total_cents > 0 ? (
                          <Box>
                            <Typography variant="body2">{brl(paid.total_cents)}</Typography>
                            <Chip label="Pago" size="small" color="default" />
                          </Box>
                        ) : '—'}
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">{totalJobs}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        {pending.count > 0 && (
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => approvePendingForFreelancer(fId)}
                            disabled={approving[fId]}
                          >
                            {approving[fId] ? <CircularProgress size={14} /> : 'Aprovar'}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {Object.keys(byFreelancer).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography variant="body2" color="text.secondary" py={2}>
                        Nenhum lançamento para {period}.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Capacity Section */}
        <CapacitySection />
      </Stack>
    </AppShell>
  );
}

// ─── Capacity Section ─────────────────────────────────────────────────────────

function CapacitySection() {
  const { data, isLoading } = useSWR<{ success: boolean; data: any[] }>(
    '/api/da-billing/capacity',
    swrFetcher,
  );

  const slots = data?.data ?? [];
  if (isLoading) return null;
  if (!slots.length) return null;

  return (
    <>
      <Typography variant="h6" fontWeight={700} mt={2}>Capacidade Semanal</Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>DA</TableCell>
              <TableCell align="right">Disponível</TableCell>
              <TableCell align="right">Em uso</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {slots.map((s: any) => (
              <TableRow key={s.freelancer_id} hover>
                <TableCell>{s.name ?? s.freelancer_id}</TableCell>
                <TableCell align="right">
                  <Typography
                    variant="body2"
                    fontWeight={700}
                    color={s.slots_available > 2 ? 'success.main' : s.slots_available > 0 ? 'warning.main' : 'error.main'}
                  >
                    {s.slots_available}
                  </Typography>
                </TableCell>
                <TableCell align="right">{s.slots_used}</TableCell>
                <TableCell align="right">{s.slots_total}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={s.slots_available === 0 ? 'Lotado' : s.slots_available <= 1 ? 'Quase cheio' : 'Disponível'}
                    color={s.slots_available === 0 ? 'error' : s.slots_available <= 1 ? 'warning' : 'success'}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}
