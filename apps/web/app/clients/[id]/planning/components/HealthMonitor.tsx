'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import {
  IconAlertCircle,
  IconBrain,
  IconCalendar,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconClipboard,
  IconDatabase,
  IconFileText,
  IconRefresh,
  IconSparkles,
  IconTrendingUp,
  IconX,
} from '@tabler/icons-react';

export type HealthStatus = 'healthy' | 'warning' | 'error';

export type SourceHealth = {
  status: HealthStatus;
  data: any;
  message: string;
  lastCheck: string;
};

export type HealthData = {
  overall: HealthStatus;
  sources: {
    library: SourceHealth;
    clipping: SourceHealth;
    social: SourceHealth;
    calendar: SourceHealth;
    opportunities: SourceHealth;
    antiRepetition: SourceHealth;
    briefings: SourceHealth;
  };
};

type HealthMonitorProps = {
  clientId: string;
  healthData: HealthData | null;
  loading: boolean;
  onRefresh: () => void;
};

const sourceIcons = {
  library: <IconDatabase size={20} />,
  clipping: <IconClipboard size={20} />,
  social: <IconTrendingUp size={20} />,
  calendar: <IconCalendar size={20} />,
  opportunities: <IconBrain size={20} />,
  antiRepetition: <IconSparkles size={20} />,
  briefings: <IconFileText size={20} />,
};

const sourceLabels = {
  library: 'Library',
  clipping: 'Clipping',
  social: 'Social Listening',
  calendar: 'Calendário',
  opportunities: 'Oportunidades',
  antiRepetition: 'Anti-Repetição',
  briefings: 'Briefings',
};

const statusColors = {
  healthy: 'success',
  warning: 'warning',
  error: 'error',
} as const;

const statusIcons = {
  healthy: <IconCheck size={16} />,
  warning: <IconAlertCircle size={16} />,
  error: <IconX size={16} />,
};

export default function HealthMonitor({ clientId, healthData, loading, onRefresh }: HealthMonitorProps) {
  const [expanded, setExpanded] = useState(false);

  if (loading) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={2}>
            <CircularProgress size={20} />
            <Typography variant="body2" color="text.secondary">
              Verificando saúde dos inputs...
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  if (!healthData) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">
              Health Monitor
            </Typography>
            <Button size="small" startIcon={<IconRefresh size={16} />} onClick={onRefresh}>
              Verificar
            </Button>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  const sourcesArray = Object.entries(healthData.sources);
  const errorCount = sourcesArray.filter(([, s]) => s.status === 'error').length;
  const warningCount = sourcesArray.filter(([, s]) => s.status === 'warning').length;
  const healthyCount = sourcesArray.filter(([, s]) => s.status === 'healthy').length;

  return (
    <Card
      variant="outlined"
      sx={{
        borderColor:
          healthData.overall === 'error'
            ? 'error.main'
            : healthData.overall === 'warning'
              ? 'warning.main'
              : 'success.main',
      }}
    >
      <CardContent>
        {/* Header */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Chip
              icon={statusIcons[healthData.overall]}
              label={healthData.overall === 'healthy' ? 'Saudável' : healthData.overall === 'warning' ? 'Atenção' : 'Erro'}
              color={statusColors[healthData.overall]}
              size="small"
            />
            <Typography variant="caption" color="text.secondary">
              Health Monitor
            </Typography>
          </Stack>
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="Atualizar">
              <IconButton size="small" onClick={onRefresh}>
                <IconRefresh size={16} />
              </IconButton>
            </Tooltip>
            <IconButton size="small" onClick={() => setExpanded(!expanded)}>
              {expanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
            </IconButton>
          </Stack>
        </Stack>

        {/* Summary Stats */}
        <Stack direction="row" spacing={2} sx={{ mb: expanded ? 2 : 0 }}>
          <Chip
            size="small"
            label={`${healthyCount} OK`}
            color="success"
            variant="outlined"
          />
          {warningCount > 0 && (
            <Chip
              size="small"
              label={`${warningCount} ⚠️`}
              color="warning"
              variant="outlined"
            />
          )}
          {errorCount > 0 && (
            <Chip
              size="small"
              label={`${errorCount} ❌`}
              color="error"
              variant="outlined"
            />
          )}
        </Stack>

        {/* Detailed View */}
        <Collapse in={expanded}>
          <Stack spacing={1} sx={{ mt: 2 }}>
            {sourcesArray.map(([key, source]) => (
              <Box
                key={key}
                sx={{
                  p: 1.5,
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor:
                    source.status === 'error'
                      ? 'error.main'
                      : source.status === 'warning'
                        ? 'warning.main'
                        : 'success.light',
                  bgcolor:
                    source.status === 'error'
                      ? 'error.light'
                      : source.status === 'warning'
                        ? 'warning.light'
                        : 'success.light',
                }}
              >
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Box sx={{ color: 'text.primary' }}>
                      {sourceIcons[key as keyof typeof sourceIcons]}
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
                        {sourceLabels[key as keyof typeof sourceLabels]}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {source.message}
                      </Typography>
                    </Box>
                  </Stack>
                  <Chip
                    size="small"
                    icon={statusIcons[source.status]}
                    label={source.status}
                    color={statusColors[source.status]}
                  />
                </Stack>

                {/* Additional Data */}
                {source.data && (
                  <Box sx={{ mt: 1, pl: 3 }}>
                    <Stack direction="row" spacing={2}>
                      {Object.entries(source.data).map(([dataKey, dataValue]) => {
                        if (dataKey === 'last_published' || dataKey === 'last_update' || dataKey === 'last_created' || dataKey === 'last_generated') {
                          return null; // Skip date fields
                        }
                        return (
                          <Typography key={dataKey} variant="caption" color="text.disabled">
                            {dataKey}: {String(dataValue)}
                          </Typography>
                        );
                      })}
                    </Stack>
                  </Box>
                )}
              </Box>
            ))}
          </Stack>

          <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 2, textAlign: 'center' }}>
            Última verificação: {new Date(healthData.sources.library.lastCheck).toLocaleTimeString('pt-BR')}
          </Typography>
        </Collapse>
      </CardContent>
    </Card>
  );
}
