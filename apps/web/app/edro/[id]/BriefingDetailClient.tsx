'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import { WORKFLOW_STAGES_UI, STAGE_COLORS } from '@edro/shared/workflow';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import {
  IconBuilding,
  IconCheck,
  IconChevronRight,
  IconPhoto,
  IconUser,
} from '@tabler/icons-react';

type Briefing = {
  id: string;
  client_name: string | null;
  title: string;
  status: string;
  payload: Record<string, any>;
  created_at: string;
  due_at: string | null;
  traffic_owner: string | null;
};

type Stage = {
  id: string;
  briefing_id: string;
  stage: string;
  status: 'pending' | 'in_progress' | 'done';
  updated_at: string;
  updated_by: string | null;
};

type Copy = {
  id: string;
  briefing_id: string;
  language: string;
  output: string;
  created_at: string;
  created_by: string | null;
};

type Task = {
  id: string;
  briefing_id: string;
  type: string;
  assigned_to: string;
  status: string;
  created_at: string;
};

export default function BriefingDetailClient({ briefingId }: { briefingId: string }) {
  const router = useRouter();
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [copies, setCopies] = useState<Copy[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadBriefing = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiGet<{
        success: boolean;
        data: {
          briefing: Briefing;
          stages: Stage[];
          copies: Copy[];
          tasks: Task[];
        };
      }>(`/edro/briefings/${briefingId}`);

      if (response?.data) {
        setBriefing(response.data.briefing);
        setStages(response.data.stages);
        setCopies(response.data.copies);
        setTasks(response.data.tasks);
      }
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar briefing.');
    } finally {
      setLoading(false);
    }
  }, [briefingId]);

  useEffect(() => {
    loadBriefing();
  }, [loadBriefing]);

  const handleStageAction = async (stageKey: string, action: 'start' | 'complete') => {
    setActionLoading(stageKey);
    try {
      const status = action === 'start' ? 'in_progress' : 'done';
      await apiPatch(`/edro/briefings/${briefingId}/stages/${stageKey}`, { status });
      await loadBriefing();
    } catch (err: any) {
      alert(err?.message || 'Erro ao atualizar etapa.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleGenerateCopy = async () => {
    setActionLoading('copy_ia');
    try {
      await apiPost(`/edro/briefings/${briefingId}/copy`, {
        language: 'pt',
        count: 10,
      });
      await loadBriefing();
    } catch (err: any) {
      alert(err?.message || 'Erro ao gerar copies.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleGenerateCreative = async (copyId: string) => {
    const confirmed = confirm('Deseja gerar um criativo visual para esta copy? (Requer API Ad Creative configurada)');
    if (!confirmed) return;

    setActionLoading('creative');
    try {
      const result = await apiPost<{
        success: boolean;
        data: { image_url: string; format: string };
      }>(`/edro/briefings/${briefingId}/generate-creative`, {
        copy_version_id: copyId,
        format: 'instagram-feed',
        style: 'modern',
      });

      if (result?.data?.image_url) {
        alert('Criativo gerado com sucesso! URL: ' + result.data.image_url);
        window.open(result.data.image_url, '_blank');
      }
      await loadBriefing();
    } catch (err: any) {
      alert(err?.message || 'Erro ao gerar criativo visual.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBack = () => {
    router.push('/edro');
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Stack alignItems="center" spacing={2}>
          <CircularProgress size={32} />
          <Typography variant="body2" color="text.secondary">Carregando briefing...</Typography>
        </Stack>
      </Box>
    );
  }

  if (error || !briefing) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Stack alignItems="center" spacing={2}>
          <Typography variant="h2">&#x26A0;&#xFE0F;</Typography>
          <Typography variant="h6">Erro</Typography>
          <Typography variant="body2" color="text.secondary">{error || 'Briefing não encontrado.'}</Typography>
          <Button variant="contained" onClick={handleBack}>Voltar</Button>
        </Stack>
      </Box>
    );
  }

  const getStageStatus = (stageKey: string): Stage | undefined => {
    return stages.find((s) => s.stage === stageKey);
  };

  return (
    <AppShell
      title={briefing.title}
      topbarLeft={
        <Stack direction="row" spacing={1} alignItems="center">
          <Button size="small" onClick={handleBack} sx={{ color: 'text.secondary', textTransform: 'none' }}>
            Edro
          </Button>
          <IconChevronRight size={14} />
          <Typography variant="body2" fontWeight={500} noWrap sx={{ maxWidth: 400 }}>
            {briefing.title}
          </Typography>
        </Stack>
      }
    >
      <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
        {/* Header */}
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box>
                <Typography variant="h4" sx={{ mb: 1 }}>{briefing.title}</Typography>
                <Stack direction="row" spacing={2} alignItems="center">
                  {briefing.client_name && (
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <IconBuilding size={16} />
                      <Typography variant="body2" color="text.secondary">{briefing.client_name}</Typography>
                    </Stack>
                  )}
                  {briefing.traffic_owner && (
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <IconUser size={16} />
                      <Typography variant="body2" color="text.secondary">{briefing.traffic_owner}</Typography>
                    </Stack>
                  )}
                </Stack>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="body2" color="text.secondary">Status Atual</Typography>
                <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>
                  {briefing.status.replace('_', ' ')}
                </Typography>
              </Box>
            </Stack>

            {briefing.payload && (
              <Grid container spacing={2} sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                {briefing.payload.objective && (
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="body2" color="text.secondary">Objetivo</Typography>
                    <Typography variant="body2" fontWeight={500}>{briefing.payload.objective}</Typography>
                  </Grid>
                )}
                {briefing.payload.target_audience && (
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="body2" color="text.secondary">Público-Alvo</Typography>
                    <Typography variant="body2">{briefing.payload.target_audience}</Typography>
                  </Grid>
                )}
                {briefing.payload.channels && (
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="body2" color="text.secondary">Canais</Typography>
                    <Typography variant="body2">{briefing.payload.channels}</Typography>
                  </Grid>
                )}
              </Grid>
            )}
          </CardContent>
        </Card>

        {/* Kanban Board */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {WORKFLOW_STAGES_UI.map((workflowStage) => {
            const stageData = getStageStatus(workflowStage.key);
            const status = stageData?.status || 'pending';

            const isPending = status === 'pending';
            const isInProgress = status === 'in_progress';
            const isDone = status === 'done';

            return (
              <Grid key={workflowStage.key} size={{ xs: 12, sm: 6, md: 3 }}>
                <Card
                  variant="outlined"
                  sx={{
                    p: 2,
                    height: '100%',
                    borderWidth: 2,
                    borderColor: isDone
                      ? 'success.light'
                      : isInProgress
                        ? 'primary.light'
                        : 'divider',
                    bgcolor: isDone
                      ? 'success.50'
                      : isInProgress
                        ? 'primary.50'
                        : 'background.paper',
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                    {isDone ? (
                      <IconCheck size={24} color="green" />
                    ) : (
                      <Typography variant="h6" sx={{ color: isInProgress ? 'primary.main' : 'text.disabled' }}>
                        {workflowStage.icon}
                      </Typography>
                    )}
                    <Box>
                      <Typography variant="subtitle2">{workflowStage.label}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                        {status}
                      </Typography>
                    </Box>
                  </Stack>

                  {isPending && (
                    <Button
                      fullWidth
                      variant="contained"
                      size="small"
                      onClick={() => handleStageAction(workflowStage.key, 'start')}
                      disabled={actionLoading === workflowStage.key}
                    >
                      {actionLoading === workflowStage.key ? 'Iniciando...' : 'Iniciar'}
                    </Button>
                  )}

                  {isInProgress && (
                    <Stack spacing={1}>
                      {workflowStage.key === 'copy_ia' && copies.length === 0 && (
                        <Button
                          fullWidth
                          variant="contained"
                          size="small"
                          color="info"
                          onClick={handleGenerateCopy}
                          disabled={actionLoading === 'copy_ia'}
                        >
                          {actionLoading === 'copy_ia' ? 'Gerando...' : 'Gerar Copies'}
                        </Button>
                      )}
                      {workflowStage.key === 'aprovacao' && copies.length > 0 && (
                        <Button
                          fullWidth
                          variant="contained"
                          size="small"
                          color="warning"
                          onClick={() => router.push(`/edro/${briefingId}/aprovacao`)}
                        >
                          Aprovar Copies
                        </Button>
                      )}
                      {workflowStage.key === 'producao' && (
                        <Button
                          fullWidth
                          variant="contained"
                          size="small"
                          sx={{ bgcolor: 'secondary.main', '&:hover': { bgcolor: 'secondary.dark' } }}
                          onClick={() => router.push(`/edro/${briefingId}/producao`)}
                        >
                          Atribuir Designer
                        </Button>
                      )}
                      <Button
                        fullWidth
                        variant="contained"
                        size="small"
                        color="success"
                        onClick={() => handleStageAction(workflowStage.key, 'complete')}
                        disabled={actionLoading === workflowStage.key}
                      >
                        {actionLoading === workflowStage.key ? 'Concluindo...' : 'Concluir'}
                      </Button>
                    </Stack>
                  )}

                  {isDone && stageData?.updated_at && (
                    <Typography variant="caption" color="text.secondary">
                      {new Date(stageData.updated_at).toLocaleString('pt-BR')}
                    </Typography>
                  )}
                </Card>
              </Grid>
            );
          })}
        </Grid>

        {/* Copies Section */}
        {copies.length > 0 && (
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Copies Geradas ({copies.length})
              </Typography>
              <Stack spacing={2}>
                {copies.map((copy, index) => (
                  <Card key={copy.id} variant="outlined" sx={{ bgcolor: 'grey.50' }}>
                    <CardContent>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                        <Typography variant="subtitle2">Versão {index + 1}</Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Button
                            size="small"
                            variant="contained"
                            color="secondary"
                            startIcon={<IconPhoto size={14} />}
                            onClick={() => handleGenerateCreative(copy.id)}
                            disabled={actionLoading === 'creative'}
                          >
                            {actionLoading === 'creative' ? 'Gerando...' : 'Gerar Criativo'}
                          </Button>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(copy.created_at).toLocaleString('pt-BR')}
                          </Typography>
                        </Stack>
                      </Stack>
                      <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                        {copy.output}
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* Tasks Section */}
        {tasks.length > 0 && (
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Tarefas ({tasks.length})
              </Typography>
              <Stack spacing={1.5}>
                {tasks.map((task) => (
                  <Card key={task.id} variant="outlined" sx={{ bgcolor: 'grey.50' }}>
                    <CardContent>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="subtitle2" sx={{ textTransform: 'capitalize' }}>
                            {task.type}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Atribuído: {task.assigned_to}
                          </Typography>
                        </Box>
                        <Chip size="small" label={task.status} sx={{ textTransform: 'capitalize' }} />
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </CardContent>
          </Card>
        )}
      </Box>
    </AppShell>
  );
}
