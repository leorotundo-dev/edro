'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { IconExternalLink, IconFileText, IconSparkles } from '@tabler/icons-react';

export type Briefing = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  due_at?: string;
};

export type Copy = {
  id: string;
  output: string;
  model?: string;
  provider?: string;
  created_at: string;
  briefing_id?: string;
};

type OutputsListProps = {
  briefings: Briefing[];
  copies: Copy[];
  loading: boolean;
  error?: string;
  onViewBriefing?: (briefingId: string) => void;
  onViewCopy?: (copyId: string) => void;
};

const statusColors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  draft: 'default',
  approved: 'success',
  review: 'warning',
  done: 'info',
  cancelled: 'error',
};

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function OutputsList({
  briefings,
  copies,
  loading,
  error,
  onViewBriefing,
  onViewCopy,
}: OutputsListProps) {
  const [activeTab, setActiveTab] = useState<'briefings' | 'copies'>('briefings');

  if (loading) {
    return (
      <Card variant="outlined" sx={{ height: '100%' }}>
        <CardContent>
          <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 200 }}>
            <CircularProgress size={32} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Carregando outputs...
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
            Outputs Gerados
          </Typography>
          <Chip size="small" label={activeTab === 'briefings' ? `${briefings.length}` : `${copies.length}`} />
        </Stack>

        {error && <Typography color="error" variant="body2" sx={{ mb: 2 }}>{error}</Typography>}

        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{ mb: 2, minHeight: 36, '& .MuiTab-root': { minHeight: 36, py: 0.5 } }}
        >
          <Tab value="briefings" label="Briefings" icon={<IconFileText size={14} />} iconPosition="start" />
          <Tab value="copies" label="Copies" icon={<IconSparkles size={14} />} iconPosition="start" />
        </Tabs>

        <Box sx={{ flex: 1, overflowY: 'auto', pr: 1 }}>
          {activeTab === 'briefings' && (
            <>
              {briefings.length > 0 ? (
                <Stack spacing={1}>
                  {briefings.map((briefing) => (
                    <Box
                      key={briefing.id}
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'grey.50',
                        '&:hover': { bgcolor: 'grey.100', cursor: 'pointer' },
                      }}
                      onClick={() => onViewBriefing?.(briefing.id)}
                    >
                      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="subtitle2" noWrap>
                            {briefing.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(briefing.created_at)}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <Chip
                            size="small"
                            label={briefing.status}
                            color={statusColors[briefing.status] || 'default'}
                          />
                          {onViewBriefing && (
                            <Tooltip title="Abrir briefing">
                              <IconButton size="small">
                                <IconExternalLink size={14} />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Stack>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                  Nenhum briefing criado ainda.
                </Typography>
              )}
            </>
          )}

          {activeTab === 'copies' && (
            <>
              {copies.length > 0 ? (
                <Stack spacing={1}>
                  {copies.map((copy) => (
                    <Box
                      key={copy.id}
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'grey.50',
                        '&:hover': { bgcolor: 'grey.100', cursor: 'pointer' },
                      }}
                      onClick={() => onViewCopy?.(copy.id)}
                    >
                      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1} sx={{ mb: 1 }}>
                        <Chip size="small" label={copy.provider || copy.model || 'AI'} variant="outlined" />
                        <Typography variant="caption" color="text.disabled">
                          {formatDate(copy.created_at)}
                        </Typography>
                      </Stack>
                      <Typography
                        variant="body2"
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          lineHeight: 1.4,
                        }}
                      >
                        {copy.output}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                  Nenhuma copy gerada ainda.
                </Typography>
              )}
            </>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
