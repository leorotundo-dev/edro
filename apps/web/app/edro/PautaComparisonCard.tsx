'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { IconExternalLink, IconMicrophone2, IconWorld } from '@tabler/icons-react';

type Approach = {
  title?: string;
  angle?: string;
  message?: string;
  tone?: string;
  platforms?: string[];
};

export type PautaSuggestion = {
  id: string;
  client_id: string;
  client_name?: string;
  title?: string;
  source_type?: string;
  source_domain?: string;
  topic_category?: string;
  ai_score?: number;
  approach_a?: Approach | null;
  approach_b?: Approach | null;
  generated_at?: string;
};

type Props = {
  suggestion: PautaSuggestion;
  loading?: boolean;
  onApproveA: () => Promise<void> | void;
  onApproveB: () => Promise<void> | void;
  onReject: () => void;
};

function scoreChipColor(score?: number | null): { bgcolor: string; color: string; label: string } {
  if (!score) return { bgcolor: '#f1f5f9', color: '#64748b', label: '?' };
  const n = Math.round(score);
  if (n >= 80) return { bgcolor: '#dcfce7', color: '#16a34a', label: `${n}` };
  if (n >= 60) return { bgcolor: '#fef9c3', color: '#ca8a04', label: `${n}` };
  if (n >= 40) return { bgcolor: '#ffedd5', color: '#ea580c', label: `${n}` };
  return { bgcolor: '#fee2e2', color: '#dc2626', label: `${n}` };
}

function formatDate(iso?: string) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function PlatformChips({ platforms }: { platforms?: string[] }) {
  if (!platforms?.length) return null;
  return (
    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.75 }}>
      {platforms.map((p) => (
        <Chip key={p} size="small" label={p} variant="outlined" sx={{ height: 18, fontSize: '0.62rem' }} />
      ))}
    </Stack>
  );
}

function ApproachCard({
  label,
  approach,
  onApprove,
  loading,
  accentColor,
  bgColor,
}: {
  label: string;
  approach?: Approach | null;
  onApprove: () => void;
  loading: boolean;
  accentColor: string;
  bgColor: string;
}) {
  const title = approach?.title || approach?.angle || 'Sem título';
  const message = approach?.message || approach?.angle || 'Sem descrição.';
  return (
    <Card variant="outlined" sx={{ height: '100%', bgcolor: bgColor, borderColor: `${accentColor}30` }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="overline" sx={{ color: accentColor, fontWeight: 700, lineHeight: 1 }}>
            {label}
          </Typography>
          {approach?.tone && (
            <Tooltip title="Tom de voz">
              <Stack direction="row" spacing={0.4} alignItems="center">
                <IconMicrophone2 size={12} color={accentColor} />
                <Typography variant="caption" sx={{ color: accentColor, fontSize: '0.65rem' }}>
                  {approach.tone}
                </Typography>
              </Stack>
            </Tooltip>
          )}
        </Stack>

        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.75, lineHeight: 1.3 }}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ minHeight: 64, lineHeight: 1.55 }}>
          {message}
        </Typography>

        <PlatformChips platforms={approach?.platforms} />

        <Divider sx={{ my: 1.5 }} />
        <Button
          size="small"
          variant="contained"
          fullWidth
          onClick={onApprove}
          disabled={loading}
          sx={{ bgcolor: accentColor, '&:hover': { filter: 'brightness(0.88)' }, textTransform: 'none', fontWeight: 700 }}
        >
          Aprovar {label.split(' ')[1]}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function PautaComparisonCard({
  suggestion,
  loading = false,
  onApproveA,
  onApproveB,
  onReject,
}: Props) {
  const scoreStyle = scoreChipColor(suggestion.ai_score);
  const generatedAt = formatDate(suggestion.generated_at);

  return (
    <Card variant="outlined">
      <CardContent>
        {/* Header */}
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1.5} sx={{ mb: 2 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.75 }}>
              {suggestion.title || 'Sugestão de pauta'}
            </Typography>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
              {suggestion.client_name && (
                <Chip size="small" label={suggestion.client_name} sx={{ height: 20, fontSize: '0.68rem' }} />
              )}
              {suggestion.topic_category && (
                <Chip size="small" variant="outlined" label={suggestion.topic_category} sx={{ height: 20, fontSize: '0.68rem' }} />
              )}
              {suggestion.source_type && (
                <Chip size="small" variant="outlined" label={suggestion.source_type} sx={{ height: 20, fontSize: '0.68rem' }} />
              )}
              {suggestion.ai_score != null && (
                <Tooltip title="Score de relevância IA">
                  <Chip
                    size="small"
                    label={`${scoreStyle.label} pts`}
                    sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700, bgcolor: scoreStyle.bgcolor, color: scoreStyle.color }}
                  />
                </Tooltip>
              )}
            </Stack>

            <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 0.75 }}>
              {suggestion.source_domain && (
                <Stack direction="row" spacing={0.4} alignItems="center">
                  <IconWorld size={12} color="#94a3b8" />
                  <Box
                    component="a"
                    href={suggestion.source_domain.startsWith('http') ? suggestion.source_domain : `https://${suggestion.source_domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ fontSize: '0.7rem', color: '#6366f1', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {suggestion.source_domain}
                    <IconExternalLink size={10} style={{ marginLeft: 2, verticalAlign: 'middle' }} />
                  </Box>
                </Stack>
              )}
              {generatedAt && (
                <Typography variant="caption" color="text.disabled">{generatedAt}</Typography>
              )}
            </Stack>
          </Box>

          <Button size="small" variant="outlined" color="error" onClick={onReject} disabled={loading} sx={{ flexShrink: 0, alignSelf: 'flex-start' }}>
            Rejeitar
          </Button>
        </Stack>

        {/* Approach comparison */}
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, md: 6 }}>
            <ApproachCard
              label="Abordagem A"
              approach={suggestion.approach_a}
              onApprove={onApproveA}
              loading={loading}
              accentColor="#E85219"
              bgColor="rgba(232,82,25,0.03)"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <ApproachCard
              label="Abordagem B"
              approach={suggestion.approach_b}
              onApprove={onApproveB}
              loading={loading}
              accentColor="#0ea5e9"
              bgColor="rgba(14,165,233,0.03)"
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
