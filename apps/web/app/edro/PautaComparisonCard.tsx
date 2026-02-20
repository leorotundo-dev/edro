'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

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

function formatApproach(approach?: Approach | null) {
  if (!approach) return null;
  return {
    title: approach.title || approach.angle || 'Abordagem',
    message: approach.message || approach.angle || '',
    tone: approach.tone || '',
    platforms: Array.isArray(approach.platforms) ? approach.platforms : [],
  };
}

export default function PautaComparisonCard({
  suggestion,
  loading = false,
  onApproveA,
  onApproveB,
  onReject,
}: Props) {
  const a = formatApproach(suggestion.approach_a);
  const b = formatApproach(suggestion.approach_b);

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1.5} sx={{ mb: 1.5 }}>
          <Box>
            <Typography variant="subtitle1" fontWeight={700}>
              {suggestion.title || 'Sugestao de pauta'}
            </Typography>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 0.75 }}>
              {suggestion.client_name ? <Chip size="small" label={suggestion.client_name} /> : null}
              {suggestion.source_type ? <Chip size="small" variant="outlined" label={suggestion.source_type} /> : null}
              {suggestion.topic_category ? <Chip size="small" variant="outlined" label={suggestion.topic_category} /> : null}
              {suggestion.ai_score != null ? (
                <Chip size="small" label={`Score ${Math.round(Number(suggestion.ai_score))}`} />
              ) : null}
            </Stack>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Button size="small" variant="outlined" color="error" onClick={onReject} disabled={loading}>
              Rejeitar
            </Button>
          </Stack>
        </Stack>

        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card variant="outlined" sx={{ height: '100%', bgcolor: 'rgba(93,135,255,0.03)' }}>
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  Abordagem A
                </Typography>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.75 }}>
                  {a?.title || 'Sem conteudo'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ minHeight: 58 }}>
                  {a?.message || 'Sem descricao.'}
                </Typography>
                {a?.tone ? (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                    Tom: {a.tone}
                  </Typography>
                ) : null}
                {a?.platforms?.length ? (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Plataformas: {a.platforms.join(', ')}
                  </Typography>
                ) : null}
                <Divider sx={{ my: 1.25 }} />
                <Button
                  size="small"
                  variant="contained"
                  fullWidth
                  onClick={onApproveA}
                  disabled={loading}
                  sx={{ bgcolor: '#ff6600', '&:hover': { bgcolor: '#e65c00' } }}
                >
                  Aprovar A
                </Button>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card variant="outlined" sx={{ height: '100%', bgcolor: 'rgba(19,222,185,0.03)' }}>
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  Abordagem B
                </Typography>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.75 }}>
                  {b?.title || 'Sem conteudo'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ minHeight: 58 }}>
                  {b?.message || 'Sem descricao.'}
                </Typography>
                {b?.tone ? (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                    Tom: {b.tone}
                  </Typography>
                ) : null}
                {b?.platforms?.length ? (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Plataformas: {b.platforms.join(', ')}
                  </Typography>
                ) : null}
                <Divider sx={{ my: 1.25 }} />
                <Button
                  size="small"
                  variant="contained"
                  fullWidth
                  onClick={onApproveB}
                  disabled={loading}
                  sx={{ bgcolor: '#0ea5e9', '&:hover': { bgcolor: '#0284c7' } }}
                >
                  Aprovar B
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}

