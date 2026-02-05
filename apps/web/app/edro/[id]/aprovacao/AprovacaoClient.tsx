'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { apiGet, apiPatch } from '@/lib/api';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import {
  IconCheck,
  IconCheckbox,
  IconChevronRight,
  IconX,
} from '@tabler/icons-react';

type Briefing = {
  id: string;
  client_name: string | null;
  title: string;
  status: string;
  payload: Record<string, any>;
};

type Copy = {
  id: string;
  briefing_id: string;
  language: string;
  output: string;
  created_at: string;
  created_by: string | null;
};

type Stage = {
  id: string;
  stage: string;
  status: string;
};

type User = {
  id?: string;
  email?: string;
  role?: string;
  name?: string;
};

export default function AprovacaoClient({ briefingId }: { briefingId: string }) {
  const router = useRouter();
  const [user, setUser] = useState<User>({});
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [copies, setCopies] = useState<Copy[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [selectedCopy, setSelectedCopy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [comments, setComments] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiGet<{
        success: boolean;
        data: {
          briefing: Briefing;
          stages: Stage[];
          copies: Copy[];
        };
      }>(`/edro/briefings/${briefingId}`);

      if (response?.data) {
        setBriefing(response.data.briefing);
        setStages(response.data.stages);
        setCopies(response.data.copies);
        if (response.data.copies.length > 0) {
          setSelectedCopy(response.data.copies[0].id);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar dados.');
    } finally {
      setLoading(false);
    }
  }, [briefingId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem('edro_user');
    if (!stored) return;
    try {
      setUser(JSON.parse(stored));
    } catch {
      setUser({});
    }
  }, []);

  const handleApprove = async () => {
    if (!selectedCopy) {
      alert('Selecione uma copy para aprovar.');
      return;
    }

    setActionLoading(true);
    try {
      await apiPatch(`/edro/briefings/${briefingId}/stages/aprovacao`, {
        status: 'done',
        metadata: {
          approvedCopyId: selectedCopy,
          comments: comments || null,
          approvedAt: new Date().toISOString(),
        },
      });

      alert('Copy aprovada com sucesso!');
      router.push(`/edro/${briefingId}`);
    } catch (err: any) {
      alert(err?.message || 'Erro ao aprovar copy.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!comments.trim()) {
      alert('Adicione comentários sobre o motivo da rejeição.');
      return;
    }

    const confirmed = confirm('Tem certeza que deseja rejeitar? O briefing voltará para a etapa de Copy IA.');
    if (!confirmed) return;

    setActionLoading(true);
    try {
      // Move stage back to copy_ia
      await apiPatch(`/edro/briefings/${briefingId}/stages/copy_ia`, {
        status: 'in_progress',
        metadata: {
          rejectedAt: new Date().toISOString(),
          rejectionComments: comments,
        },
      });

      alert('Copy rejeitada. Briefing voltou para etapa de Copy IA.');
      router.push(`/edro/${briefingId}`);
    } catch (err: any) {
      alert(err?.message || 'Erro ao rejeitar copy.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBack = () => {
    router.push(`/edro/${briefingId}`);
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Stack alignItems="center" spacing={2}>
          <CircularProgress size={32} />
          <Typography variant="body2" color="text.secondary">Carregando...</Typography>
        </Stack>
      </Box>
    );
  }

  if (error || !briefing) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Stack alignItems="center" spacing={2}>
          <Typography variant="h2">&#x26A0;&#xFE0F;</Typography>
          <Typography variant="body2" color="text.secondary">{error || 'Briefing não encontrado.'}</Typography>
          <Button variant="contained" onClick={handleBack}>Voltar</Button>
        </Stack>
      </Box>
    );
  }

  const aprovacaoStage = stages.find((s) => s.stage === 'aprovacao');
  const isAprovacaoActive = aprovacaoStage?.status === 'in_progress';
  const canApprove = user?.role === 'gestor' || user?.role === 'admin';

  if (!isAprovacaoActive) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Stack alignItems="center" spacing={2}>
          <Typography variant="h2">&#x1F512;</Typography>
          <Typography variant="h6">Aprovação não disponível</Typography>
          <Typography variant="body2" color="text.secondary">
            A etapa de aprovação ainda não foi iniciada ou já foi concluída.
          </Typography>
          <Button variant="contained" onClick={handleBack}>Voltar para Briefing</Button>
        </Stack>
      </Box>
    );
  }

  if (!canApprove) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Stack alignItems="center" spacing={2}>
          <Typography variant="h2">&#x1F6AB;</Typography>
          <Typography variant="h6">Acesso Negado</Typography>
          <Typography variant="body2" color="text.secondary">
            Apenas usuários com perfil <strong>Gestor</strong> ou <strong>Admin</strong> podem aprovar copies.
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Seu perfil atual: <strong>{user?.role || 'Não identificado'}</strong>
          </Typography>
          <Button variant="contained" onClick={handleBack}>Voltar para Briefing</Button>
        </Stack>
      </Box>
    );
  }

  if (copies.length === 0) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Stack alignItems="center" spacing={2}>
          <Typography variant="h2">&#x1F4DD;</Typography>
          <Typography variant="h6">Nenhuma copy disponível</Typography>
          <Typography variant="body2" color="text.secondary">
            Aguarde a geração das copies pela IA antes de aprovar.
          </Typography>
          <Button variant="contained" onClick={handleBack}>Voltar</Button>
        </Stack>
      </Box>
    );
  }

  const selectedCopyData = copies.find((c) => c.id === selectedCopy);

  return (
    <AppShell
      title="Aprovação de Copy"
      topbarLeft={
        <Stack direction="row" spacing={1} alignItems="center">
          <Button size="small" onClick={handleBack} sx={{ color: 'text.secondary', textTransform: 'none' }}>
            Edro
          </Button>
          <IconChevronRight size={14} />
          <Button
            size="small"
            onClick={handleBack}
            sx={{ color: 'text.secondary', textTransform: 'none', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            {briefing.title}
          </Button>
          <IconChevronRight size={14} />
          <Typography variant="body2" fontWeight={500}>Aprovação</Typography>
        </Stack>
      }
    >
      <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
        {/* Header */}
        <Alert
          severity="warning"
          icon={<IconCheckbox size={28} />}
          sx={{ mb: 3 }}
        >
          <Typography variant="h6" sx={{ mb: 0.5 }}>
            Aprovação de Copy - {briefing.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>Cliente:</strong> {briefing.client_name || 'N/A'}
          </Typography>
          {briefing.payload?.objective && (
            <Typography variant="body2" color="text.secondary">
              <strong>Objetivo:</strong> {briefing.payload.objective}
            </Typography>
          )}
        </Alert>

        <Grid container spacing={3}>
          {/* Sidebar - Lista de Copies */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
              Copies Disponíveis ({copies.length})
            </Typography>
            <Stack spacing={1.5}>
              {copies.map((copy, index) => (
                <Card
                  key={copy.id}
                  variant="outlined"
                  sx={{
                    cursor: 'pointer',
                    borderWidth: 2,
                    borderColor: selectedCopy === copy.id ? 'primary.main' : 'divider',
                    bgcolor: selectedCopy === copy.id ? 'grey.50' : 'background.paper',
                    '&:hover': { borderColor: selectedCopy === copy.id ? 'primary.main' : 'grey.400' },
                  }}
                  onClick={() => setSelectedCopy(copy.id)}
                >
                  <CardContent>
                    <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Versão {index + 1}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(copy.created_at).toLocaleString('pt-BR')}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mt: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {copy.output.substring(0, 100)}...
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </Grid>

          {/* Main - Copy Selecionada */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Stack spacing={3}>
              {selectedCopyData && (
                <Card variant="outlined">
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                      <Typography variant="h6">
                        Versão {copies.findIndex((c) => c.id === selectedCopy) + 1}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(selectedCopyData.created_at).toLocaleString('pt-BR')}
                      </Typography>
                    </Stack>

                    <Card variant="outlined" sx={{ bgcolor: 'grey.50' }}>
                      <CardContent>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                          {selectedCopyData.output}
                        </Typography>
                      </CardContent>
                    </Card>
                  </CardContent>
                </Card>
              )}

              {/* Comentários e Ações */}
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
                    Comentários (Opcional)
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Adicione comentários sobre a aprovação ou motivos de rejeição..."
                  />

                  <Stack direction="row" spacing={1.5} justifyContent="flex-end" sx={{ mt: 3 }}>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<IconX size={16} />}
                      onClick={handleReject}
                      disabled={actionLoading}
                    >
                      Rejeitar
                    </Button>
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={
                        actionLoading
                          ? <CircularProgress size={16} color="inherit" />
                          : <IconCheck size={16} />
                      }
                      onClick={handleApprove}
                      disabled={actionLoading}
                    >
                      Aprovar Copy
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
          </Grid>
        </Grid>
      </Box>
    </AppShell>
  );
}
