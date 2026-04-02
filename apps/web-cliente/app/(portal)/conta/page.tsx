'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { IconUser, IconReceipt, IconDownload, IconSettings } from '@tabler/icons-react';

type ClientMe = { id: string; name: string; status: string; email?: string; phone?: string };
type Invoice = {
  id: string; description: string; amount_brl: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  due_date: string | null; paid_at: string | null;
  period_month: string | null; pdf_url: string | null;
};

const INVOICE_STATUS: Record<string, { label: string; color: 'default' | 'info' | 'success' | 'error' | 'warning' }> = {
  paid:      { label: 'Paga', color: 'success' },
  sent:      { label: 'Enviada', color: 'info' },
  overdue:   { label: 'Vencida', color: 'error' },
  cancelled: { label: 'Cancelada', color: 'default' },
  draft:     { label: 'Rascunho', color: 'default' },
};

export default function ContaPage() {
  const [tab, setTab] = useState(0);

  const { data: meData, isLoading: meLoading } = useSWR<{ client: ClientMe }>('/portal/client/me', swrFetcher);
  const { data: invoicesData, isLoading: invoicesLoading } = useSWR<{ invoices: Invoice[] }>('/portal/client/invoices', swrFetcher);

  const client = meData?.client;
  const invoices = invoicesData?.invoices ?? [];
  const overdueCount = invoices.filter(i => i.status === 'overdue').length;

  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box sx={{ p: 1.5, bgcolor: 'secondary.light', borderRadius: 2, color: 'secondary.dark', display: 'flex' }}>
          <IconUser size={22} />
        </Box>
        <Box>
          <Typography variant="overline" color="text.secondary">Conta</Typography>
          <Typography variant="h4" sx={{ mt: 0 }}>Sua conta</Typography>
        </Box>
      </Stack>
      <Typography variant="body1" color="text.secondary">
        Dados da conta, contatos aprovadores, financeiro e preferências.
      </Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="Visão geral" />
        <Tab
          label={
            <Stack direction="row" spacing={0.5} alignItems="center">
              <IconReceipt size={14} />
              <span>Faturas</span>
              {overdueCount > 0 && (
                <Chip label={overdueCount} color="error" size="small" sx={{ height: 16, fontSize: '0.65rem' }} />
              )}
            </Stack>
          }
        />
        <Tab label={<Stack direction="row" spacing={0.5} alignItems="center"><IconSettings size={14} /><span>Configurações</span></Stack>} />
      </Tabs>

      {/* Tab 0: Overview */}
      {tab === 0 && (
        <>
          {meLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={24} /></Box>
          ) : client ? (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={{ borderRadius: 3 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Dados da conta</Typography>
                    <Stack spacing={1.5} divider={<Divider />}>
                      {[
                        { label: 'Nome', value: client.name },
                        { label: 'Status', value: <Chip label={client.status} size="small" color={client.status === 'active' ? 'success' : 'default'} /> },
                        { label: 'ID', value: <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{client.id}</Typography> },
                      ].map(({ label, value }) => (
                        <Stack key={label} direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" color="text.secondary">{label}</Typography>
                          {typeof value === 'string' ? <Typography variant="body2" fontWeight={500}>{value}</Typography> : value}
                        </Stack>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={{ borderRadius: 3, height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Resumo financeiro</Typography>
                    {invoicesLoading ? (
                      <CircularProgress size={20} />
                    ) : (
                      <Stack spacing={1.5} divider={<Divider />}>
                        {[
                          { label: 'Total de faturas', value: invoices.length },
                          { label: 'Faturas pagas', value: invoices.filter(i => i.status === 'paid').length },
                          { label: 'Pendentes', value: invoices.filter(i => i.status === 'sent').length },
                          { label: 'Vencidas', value: overdueCount, alert: overdueCount > 0 },
                        ].map(({ label, value, alert }) => (
                          <Stack key={label} direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2" color="text.secondary">{label}</Typography>
                            <Typography
                              variant="body2"
                              fontWeight={600}
                              color={alert ? 'error.main' : 'text.primary'}
                            >
                              {value}
                            </Typography>
                          </Stack>
                        ))}
                      </Stack>
                    )}
                    <Button
                      size="small"
                      variant="text"
                      onClick={() => setTab(1)}
                      sx={{ mt: 2, p: 0 }}
                    >
                      Ver faturas detalhadas
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          ) : (
            <Alert severity="error" sx={{ borderRadius: 2 }}>Não foi possível carregar os dados da conta.</Alert>
          )}
        </>
      )}

      {/* Tab 1: Faturas */}
      {tab === 1 && (
        <>
          {invoicesLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={24} /></Box>
          ) : invoices.length === 0 ? (
            <Alert severity="info" sx={{ borderRadius: 2 }}>Nenhuma fatura emitida ainda.</Alert>
          ) : (
            <Card sx={{ borderRadius: 3 }}>
              <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                <Stack divider={<Divider />}>
                  {invoices.map((inv) => {
                    const st = INVOICE_STATUS[inv.status] ?? INVOICE_STATUS.draft;
                    return (
                      <Box key={inv.id} sx={{ px: 3, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box>
                          <Typography variant="subtitle2">{inv.description}</Typography>
                          {inv.period_month && (
                            <Typography variant="caption" color="text.secondary" display="block">Período: {inv.period_month}</Typography>
                          )}
                          {inv.due_date && inv.status !== 'paid' && (
                            <Typography
                              variant="caption"
                              color={inv.status === 'overdue' ? 'error.main' : 'text.secondary'}
                              display="block"
                            >
                              Vence em {new Date(inv.due_date).toLocaleDateString('pt-BR')}
                            </Typography>
                          )}
                          {inv.paid_at && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              Pago em {new Date(inv.paid_at).toLocaleDateString('pt-BR')}
                            </Typography>
                          )}
                        </Box>
                        <Stack alignItems="flex-end" spacing={1} sx={{ flexShrink: 0, ml: 2 }}>
                          <Typography variant="subtitle2" fontWeight={700}>
                            {parseFloat(inv.amount_brl).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </Typography>
                          <Stack direction="row" spacing={1}>
                            <Chip label={st.label} color={st.color} size="small" />
                            {inv.pdf_url && (
                              <Button
                                size="small"
                                startIcon={<IconDownload size={14} />}
                                href={inv.pdf_url}
                                target="_blank"
                                rel="noreferrer"
                                variant="outlined"
                              >
                                PDF
                              </Button>
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
        </>
      )}

      {/* Tab 2: Settings */}
      {tab === 2 && (
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardContent sx={{ py: 5, textAlign: 'center' }}>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
              <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 3 }}>
                <IconSettings size={28} color="#9ca3af" />
              </Box>
            </Box>
            <Typography variant="h6" gutterBottom>Configurações da conta</Typography>
            <Typography variant="body2" color="text.secondary">
              Preferências de notificação, dados cadastrais e configurações de acesso estarão disponíveis em breve.
            </Typography>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}
