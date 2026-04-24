'use client';

import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { IconMessageCircle, IconSparkles, IconUsers } from '@tabler/icons-react';
import { apiGet } from '@/lib/api';

export type JobClientContextSignal = {
  id: string;
  source: 'whatsapp' | 'meeting' | 'meeting_chat' | 'memory';
  source_id: string;
  source_label: string;
  title: string;
  author_name?: string | null;
  occurred_at?: string | null;
  snippet: string;
  relevance_reason: string;
  match_type: 'direct' | 'probable';
  confidence: number;
  tags: string[];
};

export type JobClientContext = {
  confidence: 'high' | 'medium' | 'low' | 'none';
  summary: string | null;
  searched_sources: string[];
  signals: JobClientContextSignal[];
};

function formatClientContextDate(value?: string | null) {
  if (!value) return 'sem data';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'sem data';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function contextConfidenceLabel(confidence: JobClientContext['confidence']) {
  if (confidence === 'high') return 'alta confiança';
  if (confidence === 'medium') return 'confiança média';
  if (confidence === 'low') return 'baixa confiança';
  return 'sem evidência direta';
}

function contextConfidenceColor(confidence: JobClientContext['confidence']): 'success' | 'warning' | 'default' {
  if (confidence === 'high') return 'success';
  if (confidence === 'medium') return 'warning';
  return 'default';
}

function formatSources(sources: string[] | undefined) {
  if (!sources?.length) return 'WhatsApp, reuniões e memória do cliente';
  return sources
    .map((source) => {
      if (source === 'whatsapp') return 'WhatsApp';
      if (source === 'meeting') return 'reuniões';
      if (source === 'meeting_chat') return 'chat de reuniões';
      if (source === 'memory') return 'memória do cliente';
      return source;
    })
    .join(', ');
}

export default function JobClientContextPanel({ jobId, compact = false }: { jobId: string; compact?: boolean }) {
  const [context, setContext] = useState<JobClientContext | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    setLoading(true);
    setContext(null);

    apiGet<{ success?: boolean; data?: JobClientContext }>(`/jobs/${jobId}/client-context?limit=${compact ? 5 : 8}`)
      .then((res) => {
        if (!cancelled) setContext(res?.data ?? null);
      })
      .catch(() => {
        if (!cancelled) setContext(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [compact, jobId]);

  const signals = context?.signals ?? [];
  const visibleSignals = signals.slice(0, compact ? 3 : 6);
  const confidence = context?.confidence ?? 'none';

  return (
    <Box sx={(theme) => ({
      p: compact ? 1.25 : 1.75,
      borderRadius: compact ? 2 : 3,
      border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
      bgcolor: alpha(theme.palette.primary.main, 0.035),
    })}>
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1} sx={{ mb: 1 }}>
        <Stack direction="row" spacing={0.9} alignItems="flex-start">
          <Box sx={(theme) => ({
            width: compact ? 26 : 40,
            height: compact ? 26 : 40,
            borderRadius: compact ? '50%' : 2,
            bgcolor: alpha(theme.palette.primary.main, 0.12),
            color: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          })}>
            <IconSparkles size={compact ? 15 : 20} />
          </Box>
          <Box>
            <Typography variant="caption" fontWeight={900} sx={{ color: 'primary.main', textTransform: 'uppercase', fontSize: compact ? '0.62rem' : '0.68rem', letterSpacing: 0.5 }}>
              Jarvis Recall do cliente
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: compact ? '0.7rem' : '0.76rem', lineHeight: 1.35 }}>
              Histórico de WhatsApp, reuniões e memória relacionados a este job
            </Typography>
          </Box>
        </Stack>
        <Chip
          size="small"
          color={contextConfidenceColor(confidence)}
          variant={confidence === 'none' ? 'outlined' : 'filled'}
          label={loading ? 'buscando recall' : contextConfidenceLabel(confidence)}
          sx={{ height: compact ? 22 : 24, fontSize: compact ? '0.62rem' : '0.68rem', fontWeight: 800, flexShrink: 0 }}
        />
      </Stack>

      {loading ? (
        <Stack spacing={0.75}>
          <Skeleton variant="text" width="88%" height={18} />
          <Skeleton variant="rounded" height={compact ? 44 : 58} />
        </Stack>
      ) : signals.length === 0 ? (
        <Stack spacing={0.45}>
          <Typography variant="body2" fontWeight={800} sx={{ fontSize: compact ? '0.76rem' : '0.86rem' }}>
            Nenhuma fala específica encontrada sobre este job
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: compact ? '0.7rem' : '0.76rem', lineHeight: 1.45 }}>
            Jarvis procurou em {formatSources(context?.searched_sources)} e ainda não encontrou evidência ligada a esta demanda. Quando aparecer uma mensagem ou reunião relacionada, ela entra aqui com fonte, data e motivo da relação.
          </Typography>
        </Stack>
      ) : (
        <Stack spacing={1}>
          {context?.summary ? (
            <Typography variant="caption" sx={{ fontSize: compact ? '0.72rem' : '0.8rem', lineHeight: 1.45, color: 'text.primary', display: 'block' }}>
              {context.summary}
            </Typography>
          ) : null}
          <Stack spacing={0.75}>
            {visibleSignals.map((signal) => {
              const isMeeting = signal.source === 'meeting' || signal.source === 'meeting_chat';
              return (
                <Box key={signal.id} sx={(theme) => ({
                  p: compact ? 1 : 1.15,
                  borderRadius: compact ? 1.5 : 2,
                  bgcolor: alpha(theme.palette.background.paper, 0.86),
                  border: `1px solid ${alpha(theme.palette.divider, 0.65)}`,
                })}>
                  <Stack direction="row" spacing={0.8} alignItems="flex-start">
                    <Box sx={(theme) => ({
                      mt: 0.15,
                      color: isMeeting ? theme.palette.info.main : theme.palette.success.main,
                      flexShrink: 0,
                    })}>
                      {isMeeting ? <IconUsers size={14} /> : <IconMessageCircle size={14} />}
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Stack direction="row" alignItems="center" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: 0.35 }}>
                        <Typography variant="caption" fontWeight={900} sx={{ fontSize: compact ? '0.66rem' : '0.7rem', color: isMeeting ? 'info.main' : 'success.main' }}>
                          {signal.source_label}
                        </Typography>
                        <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.64rem' }}>
                          {formatClientContextDate(signal.occurred_at)}
                        </Typography>
                        {signal.match_type === 'direct' ? (
                          <Chip size="small" label="ligado ao job" color="success" variant="outlined" sx={{ height: 18, fontSize: '0.56rem', fontWeight: 800 }} />
                        ) : (
                          <Chip size="small" label="provável relação" variant="outlined" sx={{ height: 18, fontSize: '0.56rem', fontWeight: 800 }} />
                        )}
                      </Stack>
                      <Typography variant="caption" color="text.secondary" sx={{
                        display: 'block',
                        fontSize: compact ? '0.7rem' : '0.76rem',
                        lineHeight: 1.45,
                        whiteSpace: 'pre-line',
                      }}>
                        {signal.snippet}
                      </Typography>
                      <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.35, fontSize: '0.62rem' }}>
                        {signal.author_name ? `${signal.author_name} · ` : ''}{signal.relevance_reason}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              );
            })}
          </Stack>
          {signals.length > visibleSignals.length ? (
            <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.64rem' }}>
              +{signals.length - visibleSignals.length} evidência{signals.length - visibleSignals.length === 1 ? '' : 's'} adicional{signals.length - visibleSignals.length === 1 ? '' : 'is'} no contexto deste job.
            </Typography>
          ) : null}
        </Stack>
      )}
    </Box>
  );
}
