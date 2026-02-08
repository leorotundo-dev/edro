'use client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import {
  IconAlertTriangle,
  IconBrain,
  IconCalendar,
  IconCheck,
  IconClipboard,
  IconDatabase,
  IconFileText,
  IconRefresh,
  IconSparkles,
  IconTrendingUp,
} from '@tabler/icons-react';
import type { HealthData, SourceHealth } from './HealthMonitor';

export type IntelligenceStats = {
  library: { totalItems: number; packedText?: string };
  clipping: { totalMatches: number; topKeywords: string[] };
  social: { totalMentions: number; sentimentAvg: number };
  calendar: { next14Days: number; highRelevance: number };
  opportunities: { active: number; urgent: number; highConfidence: number };
  briefings: { recent: number; pending: number };
  copies: { recentHashes: number; usedAngles: number };
};

type ContextPanelProps = {
  loading: boolean;
  stats: IntelligenceStats | null;
  error?: string;
  onRefresh?: () => void;
  healthData?: HealthData | null;
  healthLoading?: boolean;
  onRefreshHealth?: () => void;
};

const HEALTH_KEY_MAP: Record<string, string> = {
  Library: 'library',
  Clipping: 'clipping',
  Social: 'social',
  'Eventos 14d': 'calendar',
  Oportunidades: 'opportunities',
};

function getSourceHealth(healthData: HealthData | null | undefined, statLabel: string): SourceHealth | null {
  if (!healthData?.sources) return null;
  const key = HEALTH_KEY_MAP[statLabel];
  if (!key) return null;
  return (healthData.sources as Record<string, SourceHealth>)[key] ?? null;
}

export default function ContextPanel({
  loading,
  stats,
  error,
  onRefresh,
  healthData,
  healthLoading,
  onRefreshHealth,
}: ContextPanelProps) {
  if (loading) {
    return (
      <Card variant="outlined" sx={{ height: '100%' }}>
        <CardContent>
          <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 200 }}>
            <CircularProgress size={32} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Carregando contexto...
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card variant="outlined" sx={{ height: '100%' }}>
        <CardContent>
          <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 200 }}>
            <Typography variant="body2" color="error">
              {error}
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  const statCards = [
    { icon: <IconDatabase size={20} />, label: 'Library', value: stats.library.totalItems, color: '#3b82f6' },
    { icon: <IconClipboard size={20} />, label: 'Clipping', value: stats.clipping.totalMatches, color: '#f59e0b' },
    { icon: <IconTrendingUp size={20} />, label: 'Social', value: stats.social.totalMentions, color: '#8b5cf6' },
    { icon: <IconCalendar size={20} />, label: 'Eventos 14d', value: stats.calendar.next14Days, color: '#ec4899' },
    { icon: <IconBrain size={20} />, label: 'Oportunidades', value: stats.opportunities.active, color: '#10b981' },
  ];

  // Extra health sources not in the stat grid
  const extraHealthSources: { key: string; label: string; icon: React.ReactNode }[] = [
    { key: 'antiRepetition', label: 'Anti-Repetição', icon: <IconSparkles size={16} /> },
    { key: 'briefings', label: 'Briefings', icon: <IconFileText size={16} /> },
  ];

  const sourcesArray = healthData?.sources ? Object.entries(healthData.sources) : [];
  const healthyCount = sourcesArray.filter(([, s]) => s.status === 'healthy').length;
  const warningCount = sourcesArray.filter(([, s]) => s.status === 'warning').length;
  const errorCount = sourcesArray.filter(([, s]) => s.status === 'error').length;

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        {/* Header */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Typography variant="overline" color="text.secondary">
            Contexto de Inteligência
          </Typography>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            {healthData && (
              <Chip
                size="small"
                icon={healthData.overall === 'healthy' ? <IconCheck size={14} /> : <IconAlertTriangle size={14} />}
                label={healthData.overall === 'healthy' ? 'Saudável' : healthData.overall === 'warning' ? 'Atenção' : 'Erro'}
                color={healthData.overall === 'healthy' ? 'success' : healthData.overall === 'warning' ? 'warning' : 'error'}
                sx={{ height: 24, fontSize: '0.65rem' }}
              />
            )}
            {healthLoading && <CircularProgress size={14} />}
            {onRefreshHealth && (
              <Tooltip title="Atualizar health">
                <IconButton size="small" onClick={onRefreshHealth} disabled={healthLoading}>
                  <IconRefresh size={14} />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </Stack>

        <Stack spacing={2}>
          {/* Stats Grid */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
            {statCards.map((stat) => {
              const health = getSourceHealth(healthData, stat.label);
              const hasIssue = health && health.status !== 'healthy';

              return (
                <Box
                  key={stat.label}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: hasIssue
                      ? health.status === 'error' ? 'error.main' : 'warning.main'
                      : 'divider',
                    bgcolor: hasIssue
                      ? health.status === 'error' ? 'error.lighter' : 'warning.lighter'
                      : 'grey.50',
                    position: 'relative',
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Box sx={{ color: stat.color, display: 'flex' }}>{stat.icon}</Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1 }}>
                        {stat.value}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {stat.label}
                      </Typography>
                    </Box>
                    {hasIssue && (
                      <Tooltip
                        title={health.message || (health.status === 'error' ? 'Erro nesta fonte' : 'Atenção necessária')}
                        arrow
                      >
                        <IconAlertTriangle
                          size={16}
                          color={health.status === 'error' ? '#dc2626' : '#d97706'}
                          style={{ flexShrink: 0 }}
                        />
                      </Tooltip>
                    )}
                  </Stack>
                </Box>
              );
            })}
          </Box>

          {/* Extra health sources (antiRepetition, briefings) */}
          {healthData?.sources && extraHealthSources.some((es) => {
            const s = (healthData.sources as Record<string, SourceHealth>)[es.key];
            return s && s.status !== 'healthy';
          }) && (
            <Stack spacing={0.75}>
              {extraHealthSources.map((es) => {
                const s = (healthData.sources as Record<string, SourceHealth>)[es.key];
                if (!s || s.status === 'healthy') return null;
                return (
                  <Stack key={es.key} direction="row" alignItems="center" spacing={1}
                    sx={{
                      p: 1, borderRadius: 1.5,
                      bgcolor: s.status === 'error' ? '#fef2f2' : '#fffbeb',
                      border: '1px solid',
                      borderColor: s.status === 'error' ? '#fecaca' : '#fde68a',
                    }}
                  >
                    <Box sx={{ display: 'flex', color: s.status === 'error' ? '#dc2626' : '#d97706' }}>{es.icon}</Box>
                    <Typography variant="caption" sx={{ flex: 1, fontWeight: 600, color: s.status === 'error' ? '#dc2626' : '#d97706' }}>
                      {es.label}
                    </Typography>
                    <Tooltip title={s.message} arrow>
                      <IconAlertTriangle size={14} color={s.status === 'error' ? '#dc2626' : '#d97706'} />
                    </Tooltip>
                  </Stack>
                );
              })}
            </Stack>
          )}

          {/* Keywords */}
          {stats.clipping.topKeywords.length > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Top Keywords:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {stats.clipping.topKeywords.slice(0, 6).map((kw) => (
                  <Chip key={kw} label={kw} size="small" variant="outlined" />
                ))}
              </Box>
            </Box>
          )}

          {/* Urgent Opportunities Badge */}
          {stats.opportunities.urgent > 0 && (
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: 'error.light',
                border: '1px solid',
                borderColor: 'error.main',
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'error.dark' }}>
                🚨 {stats.opportunities.urgent} oportunidade{stats.opportunities.urgent > 1 ? 's' : ''} urgente
                {stats.opportunities.urgent > 1 ? 's' : ''}
              </Typography>
            </Box>
          )}

          {/* Health summary chips */}
          {healthData && (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip size="small" label={`${healthyCount} OK`} color="success" variant="outlined" sx={{ height: 22, fontSize: '0.65rem' }} />
              {warningCount > 0 && (
                <Chip size="small" label={`${warningCount} atenção`} color="warning" variant="outlined" sx={{ height: 22, fontSize: '0.65rem' }} />
              )}
              {errorCount > 0 && (
                <Chip size="small" label={`${errorCount} erro`} color="error" variant="outlined" sx={{ height: 22, fontSize: '0.65rem' }} />
              )}
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
