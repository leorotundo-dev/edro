'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { IconBrain, IconCalendar, IconClipboard, IconDatabase, IconTrendingUp } from '@tabler/icons-react';

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
};

export default function ContextPanel({ loading, stats, error }: ContextPanelProps) {
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
    {
      icon: <IconDatabase size={20} />,
      label: 'Library',
      value: stats.library.totalItems,
      color: '#3b82f6',
    },
    {
      icon: <IconClipboard size={20} />,
      label: 'Clipping',
      value: stats.clipping.totalMatches,
      color: '#f59e0b',
    },
    {
      icon: <IconTrendingUp size={20} />,
      label: 'Social',
      value: stats.social.totalMentions,
      color: '#8b5cf6',
    },
    {
      icon: <IconCalendar size={20} />,
      label: 'Eventos 14d',
      value: stats.calendar.next14Days,
      color: '#ec4899',
    },
    {
      icon: <IconBrain size={20} />,
      label: 'Oportunidades',
      value: stats.opportunities.active,
      color: '#10b981',
    },
  ];

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
          Contexto de Inteligência
        </Typography>

        <Stack spacing={2}>
          {/* Stats Grid */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
            {statCards.map((stat) => (
              <Box
                key={stat.label}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'grey.50',
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
                </Stack>
              </Box>
            ))}
          </Box>

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
        </Stack>
      </CardContent>
    </Card>
  );
}
