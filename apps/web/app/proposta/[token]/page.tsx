'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { IconCheck, IconClock, IconFileText } from '@tabler/icons-react';
import { alpha } from '@mui/material/styles';

type ProposalItem = {
  description: string;
  qty: number;
  unit_price: number;
  total: number;
};

type Proposal = {
  id: string;
  title: string;
  client_name: string | null;
  items: ProposalItem[];
  subtotal_brl: string;
  discount_brl: string;
  total_brl: string;
  validity_days: number;
  notes: string | null;
  status: string;
  sent_at: string | null;
};

function brl(val: string | number | null | undefined) {
  const n = parseFloat(String(val ?? 0));
  return isNaN(n) ? 'R$ 0,00' : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

export default function PropostaPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token ?? '';

  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/api/financial/proposals/view/${token}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        const p = data.proposal;
        setProposal({
          ...p,
          items: Array.isArray(p.items) ? p.items : JSON.parse(p.items ?? '[]'),
        });
        if (p.status === 'accepted') setAccepted(true);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  const handleAccept = async () => {
    setAccepting(true);
    setError('');
    try {
      const r = await fetch(`${API_BASE}/api/financial/proposals/accept/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!r.ok) {
        const d = await r.json();
        throw new Error(d.error ?? 'Erro ao aceitar proposta');
      }
      setAccepted(true);
    } catch (e: any) {
      setError(e.message ?? 'Erro desconhecido');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (notFound || !proposal) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: '#f8f9fa' }}>
        <Card sx={{ maxWidth: 420, textAlign: 'center', p: 4 }}>
          <IconFileText size={48} color="#aaa" />
          <Typography variant="h6" mt={2}>Proposta não encontrada</Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>
            O link pode ter expirado ou a proposta não existe.
          </Typography>
        </Card>
      </Box>
    );
  }

  const items = proposal.items ?? [];
  const sentDate = proposal.sent_at ? new Date(proposal.sent_at) : null;
  const expiryDate = sentDate ? new Date(sentDate.getTime() + proposal.validity_days * 86400000) : null;
  const isExpired = expiryDate ? expiryDate < new Date() : false;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f4f6f8', py: 6, px: 2 }}>
      <Box sx={{ maxWidth: 720, mx: 'auto' }}>

        <Card
          variant="outlined"
          sx={{
            mb: 4,
            borderRadius: 4,
            borderColor: alpha('#5D87FF', 0.18),
            background: `linear-gradient(135deg, ${alpha('#5D87FF', 0.08)} 0%, ${alpha('#13DEB9', 0.04)} 52%, #fff 100%)`,
          }}
        >
          <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
            <Stack spacing={2.5}>
              <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between" spacing={2}>
                <Box>
                  <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 800, letterSpacing: 0.8 }}>
                    Invoice workspace
                  </Typography>
                  <Typography variant="h4" fontWeight={800}>Proposta Comercial</Typography>
                  {proposal.client_name && (
                    <Typography variant="body1" color="text.secondary" mt={0.5}>
                      Para: <strong>{proposal.client_name}</strong>
                    </Typography>
                  )}
                </Box>
                {accepted ? (
                  <Chip icon={<IconCheck size={14} />} label="Aceita" color="success" />
                ) : isExpired ? (
                  <Chip icon={<IconClock size={14} />} label="Expirada" color="default" />
                ) : (
                  <Chip label={proposal.status === 'sent' ? 'Aguardando aprovação' : proposal.status} color="warning" />
                )}
              </Stack>

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                {[
                  {
                    label: 'Valor total',
                    value: brl(proposal.total_brl),
                    helper: `${items.length} item(ns) na proposta`,
                    tone: '#5D87FF',
                  },
                  {
                    label: 'Validade',
                    value: expiryDate ? expiryDate.toLocaleDateString('pt-BR') : '--',
                    helper: isExpired ? 'Prazo expirado' : 'Dentro do prazo para aceite',
                    tone: isExpired ? '#E85219' : '#13DEB9',
                  },
                  {
                    label: 'Status',
                    value: accepted ? 'Aceita' : isExpired ? 'Expirada' : 'Em análise',
                    helper: proposal.sent_at ? `Enviada em ${new Date(proposal.sent_at).toLocaleDateString('pt-BR')}` : 'Aguardando primeira ação',
                    tone: accepted ? '#13DEB9' : isExpired ? '#E85219' : '#FFAE1F',
                  },
                ].map((item) => (
                  <Box
                    key={item.label}
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      borderRadius: 3,
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'background.paper',
                      p: 2,
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                      {item.label}
                    </Typography>
                    <Typography variant="h5" fontWeight={800} sx={{ color: item.tone }}>
                      {item.value}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.helper}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {/* Title card */}
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={700}>{proposal.title}</Typography>
            {expiryDate && (
              <Typography variant="caption" color="text.secondary">
                Válida até {expiryDate.toLocaleDateString('pt-BR')}
              </Typography>
            )}
          </CardContent>
        </Card>

        {/* Items table */}
        <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 700 }}>Descrição</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Qtd</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Unit.</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item, i) => (
                <TableRow key={i}>
                  <TableCell>{item.description}</TableCell>
                  <TableCell align="center">{item.qty}</TableCell>
                  <TableCell align="right">{brl(item.unit_price)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>{brl(item.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Totals */}
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between">
                <Typography color="text.secondary">Subtotal</Typography>
                <Typography>{brl(proposal.subtotal_brl)}</Typography>
              </Stack>
              {parseFloat(proposal.discount_brl) > 0 && (
                <Stack direction="row" justifyContent="space-between">
                  <Typography color="text.secondary">Desconto</Typography>
                  <Typography color="error.main">− {brl(proposal.discount_brl)}</Typography>
                </Stack>
              )}
              <Divider />
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="h6" fontWeight={700}>Total</Typography>
                <Typography variant="h6" fontWeight={700} color="primary">
                  {brl(proposal.total_brl)}
                </Typography>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {/* Notes */}
        {proposal.notes && (
          <Card variant="outlined" sx={{ mb: 3, bgcolor: 'info.50' }}>
            <CardContent>
              <Typography variant="caption" fontWeight={700} color="info.main" display="block" mb={0.5}>
                Observações
              </Typography>
              <Typography variant="body2">{proposal.notes}</Typography>
            </CardContent>
          </Card>
        )}

        {/* Accept button */}
        {!accepted && !isExpired && proposal.status !== 'accepted' && (
          <Box sx={{ textAlign: 'center' }}>
            {error && (
              <Typography color="error" variant="body2" mb={2}>{error}</Typography>
            )}
            <Button
              variant="contained"
              size="large"
              startIcon={accepting ? <CircularProgress size={18} color="inherit" /> : <IconCheck size={18} />}
              onClick={handleAccept}
              disabled={accepting}
              sx={{ px: 6, py: 1.5, borderRadius: 3, fontSize: '1rem', fontWeight: 700 }}
            >
              {accepting ? 'Confirmando...' : 'Aceitar Proposta'}
            </Button>
            <Typography variant="caption" color="text.disabled" display="block" mt={1}>
              Ao aceitar, você confirma o acordo com os termos acima.
            </Typography>
          </Box>
        )}

        {/* Accepted state */}
        {accepted && (
          <Card sx={{ textAlign: 'center', bgcolor: 'success.50', border: '1px solid', borderColor: 'success.light', p: 3 }}>
            <IconCheck size={40} color="#2e7d32" />
            <Typography variant="h6" fontWeight={700} color="success.dark" mt={1}>
              Proposta Aceita!
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={0.5}>
              Nossa equipe entrará em contato em breve para dar início ao projeto.
            </Typography>
          </Card>
        )}

      </Box>
    </Box>
  );
}
