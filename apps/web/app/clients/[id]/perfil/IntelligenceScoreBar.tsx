'use client';

import { apiPost } from '@/lib/api';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { IconBrain, IconRefresh } from '@tabler/icons-react';
import { useState } from 'react';

type Props = {
  score: number;
  pendingCount: number;
  missingManual: string[];
  clientId: string;
  lastRefreshed?: string | null;
  enrichmentStatus?: string | null;
  onRefreshRequested?: () => Promise<void> | void;
};

const SCORE_LEVELS = [
  { min: 0,  max: 30,  label: 'IA com informação mínima',          color: 'error.main',   colorHex: '#dc2626', bg: 'error.light' },
  { min: 30, max: 60,  label: 'IA parcialmente contextualizada',   color: 'warning.main', colorHex: '#d97706', bg: 'warning.light' },
  { min: 60, max: 85,  label: 'IA bem contextualizada',            color: 'info.dark',    colorHex: '#475569', bg: 'info.light' },
  { min: 85, max: 101, label: 'IA totalmente alinhada',            color: 'success.main', colorHex: '#16a34a', bg: 'success.light' },
];

function formatRelativeTime(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return 'há poucos minutos';
  if (diffHours < 24) return `${diffHours}h atrás`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d atrás`;
}

export default function IntelligenceScoreBar({
  score,
  pendingCount,
  missingManual,
  clientId,
  lastRefreshed,
  enrichmentStatus,
  onRefreshRequested,
}: Props) {
  const [refreshing, setRefreshing] = useState(false);
  const level =
    SCORE_LEVELS.find((item) => score >= item.min && score < item.max) || SCORE_LEVELS[0];
  const isRunning = enrichmentStatus === 'running';

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await apiPost(`/clients/${clientId}/enrich`, {});
      await onRefreshRequested?.();
    } finally {
      setRefreshing(false);
    }
  };

  const relative = formatRelativeTime(lastRefreshed);

  return (
    <Card
      variant="outlined"
      sx={{
        borderColor: level.color,
        bgcolor: level.bg,
      }}
    >
      <CardContent>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} justifyContent="space-between">
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <IconBrain size={18} color={level.colorHex} />
              <Typography variant="subtitle2" fontWeight={700} color={level.color}>
                Nivel de Inteligencia: {score}%
              </Typography>
              {isRunning ? <Chip size="small" label="Analisando..." /> : null}
            </Stack>
            <LinearProgress
              variant={isRunning ? 'indeterminate' : 'determinate'}
              value={score}
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: 'rgba(15,23,42,0.1)',
                '& .MuiLinearProgress-bar': { bgcolor: level.color },
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'block' }}>
              {level.label}
              {relative ? ` · atualizado ${relative}` : ''}
            </Typography>

            {(pendingCount > 0 || missingManual.length > 0) && (
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                {pendingCount > 0 ? (
                  <Chip
                    size="small"
                    label={`${pendingCount} sugestão${pendingCount > 1 ? 'es' : ''} pendente${pendingCount > 1 ? 's' : ''}`}
                    sx={{ bgcolor: '#E85219', color: 'white', fontWeight: 700 }}
                  />
                ) : null}
                {missingManual.length > 0 ? (
                  <Chip
                    size="small"
                    variant="outlined"
                    label={`${missingManual.length} campo${missingManual.length > 1 ? 's' : ''} manual${missingManual.length > 1 ? 'is' : ''} faltando`}
                  />
                ) : null}
              </Stack>
            )}
          </Box>
          <Button
            size="small"
            variant="outlined"
            startIcon={<IconRefresh size={14} />}
            onClick={handleRefresh}
            disabled={refreshing || isRunning}
          >
            {refreshing ? 'Atualizando...' : 'Atualizar IA'}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}

