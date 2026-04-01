'use client';

import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { IconReceipt, IconDownload } from '@tabler/icons-react';

type Invoice = { id: string; description: string; amount_brl: string; status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'; due_date: string | null; paid_at: string | null; period_month: string | null; pdf_url: string | null };

const STATUS_META: Record<string, { label: string; color: 'default' | 'info' | 'success' | 'error' | 'warning' }> = {
  paid:      { label: 'Paga', color: 'success' },
  sent:      { label: 'Enviada', color: 'info' },
  overdue:   { label: 'Vencida', color: 'error' },
  cancelled: { label: 'Cancelada', color: 'default' },
  draft:     { label: 'Rascunho', color: 'default' },
};

export default function FaturasPage() {
  const { data, isLoading } = useSWR<{ invoices: Invoice[] }>('/portal/client/invoices', swrFetcher);
  const invoices = data?.invoices ?? [];

  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box sx={{ p: 1.5, bgcolor: 'success.light', borderRadius: 2, color: 'success.dark', display: 'flex' }}>
          <IconReceipt size={22} />
        </Box>
        <Box>
          <Typography variant="overline" color="text.secondary">Financeiro</Typography>
          <Typography variant="h4" sx={{ mt: 0 }}>Faturas</Typography>
        </Box>
      </Stack>
      <Typography variant="body1" color="text.secondary">Histórico financeiro da conta com acesso rápido ao PDF sempre que disponível.</Typography>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={24} /></Box>
      ) : invoices.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 2 }}>Nenhuma fatura emitida ainda.</Alert>
      ) : (
        <Card sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
            <Stack divider={<Divider />}>
              {invoices.map((inv) => {
                const st = STATUS_META[inv.status] ?? STATUS_META.draft;
                return (
                  <Box key={inv.id} sx={{ px: 3, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant="subtitle2">{inv.description}</Typography>
                      {inv.period_month && <Typography variant="caption" color="text.secondary" display="block">Período: {inv.period_month}</Typography>}
                      {inv.due_date && inv.status !== 'paid' && <Typography variant="caption" color="text.secondary" display="block">Vence em {new Date(inv.due_date).toLocaleDateString('pt-BR')}</Typography>}
                      {inv.paid_at && <Typography variant="caption" color="text.secondary" display="block">Pago em {new Date(inv.paid_at).toLocaleDateString('pt-BR')}</Typography>}
                    </Box>
                    <Stack alignItems="flex-end" spacing={1} sx={{ flexShrink: 0, ml: 2 }}>
                      <Typography variant="subtitle2" fontWeight={700}>{parseFloat(inv.amount_brl).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</Typography>
                      <Stack direction="row" spacing={1}>
                        <Chip label={st.label} color={st.color} size="small" />
                        {inv.pdf_url && (
                          <Button size="small" startIcon={<IconDownload size={14} />} href={inv.pdf_url} target="_blank" rel="noreferrer" variant="outlined">PDF</Button>
                        )}
                      </Stack>
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}
