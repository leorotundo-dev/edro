'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { apiGet, apiPost } from '@/lib/api';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import {
  IconChevronRight,
  IconPlugConnected,
  IconBulb,
  IconSparkles,
} from '@tabler/icons-react';

type Briefing = {
  id: string;
  client_name: string | null;
  title: string;
  payload: Record<string, any>;
};

type Recommendation = {
  platform: string;
  confidence: number;
  reasoning: string;
  format: string;
  contentHints?: string[];
  performanceHints?: string[];
  radarEvidence?: any[];
  measurability?: number;
};

export default function RecomendacoesClient({ briefingId }: { briefingId: string }) {
  const router = useRouter();
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const loadBriefing = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiGet<{
        success: boolean;
        data: { briefing: Briefing };
      }>(`/edro/briefings/${briefingId}`);

      if (response?.data) {
        setBriefing(response.data.briefing);
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

  const handleGenerate = async () => {
    if (!briefing) return;

    setGenerating(true);
    setError('');
    try {
      const response = await apiPost<{
        success: boolean;
        data: { recommendations: Recommendation[] };
      }>('/edro/recommendations/platforms', {
        briefingId,
        objective: briefing.payload?.objective || '',
        targetAudience: briefing.payload?.target_audience || '',
        channels: briefing.payload?.channels || [],
      });

      if (response?.data?.recommendations) {
        setRecommendations(response.data.recommendations);
      }
    } catch (err: any) {
      setError(err?.message || 'Erro ao gerar recomendações.');
    } finally {
      setGenerating(false);
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

  if (!briefing) {
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

  return (
    <AppShell
      title="Recomendações IA"
      topbarLeft={
        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            size="small"
            onClick={() => router.push('/edro')}
            sx={{ color: 'text.secondary', textTransform: 'none' }}
          >
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
          <Typography variant="body2" fontWeight={500}>Recomendações</Typography>
        </Stack>
      }
    >
      <Box sx={{ p: 3, maxWidth: 1100, mx: 'auto' }}>
        {/* Header */}
        <Card
          variant="outlined"
          sx={{ mb: 3, bgcolor: 'secondary.50', borderColor: 'secondary.200' }}
        >
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Stack direction="row" spacing={2} alignItems="flex-start">
                <IconBulb size={36} color="#7c3aed" />
                <Box>
                  <Typography variant="h6" sx={{ mb: 0.5 }}>Recomendações de Plataforma</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    <strong>Cliente:</strong> {briefing.client_name || 'N/A'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Use IA para analisar o briefing e recomendar as melhores plataformas e formatos para a campanha.
                  </Typography>
                </Box>
              </Stack>
              <Button
                variant="contained"
                color="secondary"
                onClick={handleGenerate}
                disabled={generating}
                startIcon={
                  generating
                    ? <CircularProgress size={16} color="inherit" />
                    : <IconSparkles size={16} />
                }
              >
                {generating ? 'Gerando...' : 'Gerar Recomendações'}
              </Button>
            </Stack>
          </CardContent>
        </Card>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <Stack spacing={2}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Plataformas Recomendadas ({recommendations.length})
            </Typography>
            {recommendations.map((rec, index) => (
              <Card key={index} variant="outlined">
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <IconPlugConnected size={28} color="#7c3aed" />
                      <Box>
                        <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>{rec.platform}</Typography>
                        <Typography variant="body2" color="text.secondary">Formato: {rec.format}</Typography>
                      </Box>
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2" color="text.secondary">Confiança:</Typography>
                      <Chip
                        size="small"
                        color="secondary"
                        label={`${Math.round(rec.confidence * 100)}%`}
                      />
                    </Stack>
                  </Stack>

                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>Análise:</Typography>
                      <Typography variant="body2" color="text.secondary">{rec.reasoning}</Typography>
                    </Box>

                    {rec.contentHints && rec.contentHints.length > 0 && (
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Dicas de Conteúdo:
                        </Typography>
                        <Box component="ul" sx={{ pl: 2, m: 0 }}>
                          {rec.contentHints.map((hint, i) => (
                            <Typography key={i} component="li" variant="body2" color="text.secondary">
                              {hint}
                            </Typography>
                          ))}
                        </Box>
                      </Box>
                    )}

                    {rec.performanceHints && rec.performanceHints.length > 0 && (
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Dicas de Performance:
                        </Typography>
                        <Box component="ul" sx={{ pl: 2, m: 0 }}>
                          {rec.performanceHints.map((hint, i) => (
                            <Typography key={i} component="li" variant="body2" color="text.secondary">
                              {hint}
                            </Typography>
                          ))}
                        </Box>
                      </Box>
                    )}

                    {rec.measurability !== undefined && (
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        sx={{ pt: 1.5, borderTop: 1, borderColor: 'divider' }}
                      >
                        <Typography variant="body2" color="text.secondary">Mensurabilidade:</Typography>
                        <Box sx={{ flex: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={rec.measurability * 100}
                            color="success"
                            sx={{ height: 8, borderRadius: 4 }}
                          />
                        </Box>
                        <Typography variant="subtitle2" color="text.secondary">
                          {Math.round(rec.measurability * 100)}%
                        </Typography>
                      </Stack>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}

        {!generating && recommendations.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <IconBulb size={64} color="#d1d5db" />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Clique em "Gerar Recomendações" para começar.
            </Typography>
          </Box>
        )}
      </Box>
    </AppShell>
  );
}
