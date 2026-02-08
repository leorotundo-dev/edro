'use client';

import { useState } from 'react';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { IconCalendar, IconClipboard, IconPlus, IconTrendingUp, IconX } from '@tabler/icons-react';

export type Opportunity = {
  id: string;
  title: string;
  description: string;
  source: 'clipping' | 'social' | 'calendar';
  confidence: number;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  suggested_action?: string;
  status?: string;
  created_at: string;
};

type OpportunitiesListProps = {
  opportunities: Opportunity[];
  loading: boolean;
  error?: string;
  onCreateBriefing: (opportunityId: string) => void;
  onDismiss: (opportunityId: string) => void;
  onDetectNew?: () => void;
  detecting?: boolean;
};

const sourceIcons = {
  clipping: <IconClipboard size={16} />,
  social: <IconTrendingUp size={16} />,
  calendar: <IconCalendar size={16} />,
};

const priorityColors = {
  urgent: 'error',
  high: 'warning',
  medium: 'info',
  low: 'default',
} as const;

export default function OpportunitiesList({
  opportunities,
  loading,
  error,
  onCreateBriefing,
  onDismiss,
  onDetectNew,
  detecting,
}: OpportunitiesListProps) {
  const [filter, setFilter] = useState<'all' | 'urgent' | 'high'>('all');

  const filteredOpportunities = opportunities.filter((opp) => {
    if (filter === 'all') return true;
    return opp.priority === filter;
  });

  if (loading) {
    return (
      <Card variant="outlined" sx={{ height: '100%' }}>
        <CardContent>
          <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 200 }}>
            <CircularProgress size={32} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Carregando oportunidades...
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="overline" color="text.secondary">
            Oportunidades AI
          </Typography>
          <Badge badgeContent={opportunities.length} color="primary">
            <Chip size="small" label="Ativas" />
          </Badge>
        </Stack>

        {error && <Typography color="error" variant="body2" sx={{ mb: 2 }}>{error}</Typography>}

        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <TextField
            select
            size="small"
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            sx={{ minWidth: 120 }}
          >
            <MenuItem value="all">Todas</MenuItem>
            <MenuItem value="urgent">Urgentes</MenuItem>
            <MenuItem value="high">Alta</MenuItem>
          </TextField>

          {onDetectNew && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<IconPlus size={16} />}
              onClick={onDetectNew}
              disabled={detecting}
            >
              {detecting ? 'Detectando...' : 'Detectar Novas'}
            </Button>
          )}
        </Stack>

        <Box sx={{ flex: 1, overflowY: 'auto', pr: 1 }}>
          {filteredOpportunities.length > 0 ? (
            <Stack spacing={1.5}>
              {filteredOpportunities.map((opp) => (
                <Box
                  key={opp.id}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: opp.priority === 'urgent' ? 'error.main' : 'divider',
                    bgcolor: opp.priority === 'urgent' ? 'error.light' : 'grey.50',
                  }}
                >
                  <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1} sx={{ mb: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box sx={{ color: 'text.secondary' }}>{sourceIcons[opp.source]}</Box>
                      <Chip
                        size="small"
                        label={opp.priority}
                        color={priorityColors[opp.priority]}
                        sx={{ textTransform: 'uppercase', fontWeight: 600 }}
                      />
                      <Chip size="small" label={`${opp.confidence}%`} variant="outlined" />
                    </Stack>
                  </Stack>

                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    {opp.title}
                  </Typography>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, lineHeight: 1.5 }}>
                    {opp.description}
                  </Typography>

                  {opp.suggested_action && (
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        mb: 1.5,
                        p: 1,
                        borderRadius: 1,
                        bgcolor: 'background.paper',
                        fontStyle: 'italic',
                      }}
                    >
                      💡 {opp.suggested_action}
                    </Typography>
                  )}

                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<IconPlus size={14} />}
                      onClick={() => onCreateBriefing(opp.id)}
                      sx={{ flex: 1 }}
                    >
                      Criar Briefing
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      startIcon={<IconX size={14} />}
                      onClick={() => onDismiss(opp.id)}
                    >
                      Dismiss
                    </Button>
                  </Stack>
                </Box>
              ))}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
              Nenhuma oportunidade ativa.
              {onDetectNew && ' Clique em "Detectar Novas" para buscar.'}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
