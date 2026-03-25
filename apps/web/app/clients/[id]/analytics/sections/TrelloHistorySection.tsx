'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

type BoardInsights = {
  board: { id: string; name: string };
  by_format: { format: string; count: number; median_cycle_hours: number | null; avg_revision: number }[];
  weekly_throughput: { week: string; count: number }[];
  throughput: { cards_per_week_avg: number | null };
};

type Props = { clientId: string };

export default function TrelloHistorySection({ clientId }: Props) {
  const [insights, setInsights] = useState<BoardInsights | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const boardsRes = await apiGet<{ boards: { id: string }[] }>(`/trello/project-boards?client_id=${clientId}`);
      const boardId = boardsRes.boards?.[0]?.id;
      if (!boardId) { setLoading(false); return; }
      const res = await apiGet<{ insights: BoardInsights }>(`/trello/project-boards/${boardId}/insights`);
      setInsights(res.insights);
    } catch {
      setInsights(null);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Box sx={{ py: 2, display: 'flex', justifyContent: 'center' }}><CircularProgress size={24} /></Box>;
  if (!insights) return null;

  const weeks = insights.weekly_throughput.slice(-12).reverse();
  const maxCount = Math.max(...weeks.map((w) => w.count), 1);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="subtitle1" fontWeight={700}>Histórico de Produção — {insights.board.name}</Typography>
        <Typography variant="body2" color="text.secondary">
          Média de {insights.throughput.cards_per_week_avg?.toFixed(1) ?? '—'} entregas/semana
        </Typography>
      </Box>

      {/* Weekly bar chart */}
      {weeks.length > 0 && (
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 1, display: 'block' }}>
            Entregas por semana (últimas 12)
          </Typography>
          <Stack direction="row" alignItems="flex-end" spacing={0.5} sx={{ height: 64 }}>
            {weeks.map((w) => (
              <Tooltip key={w.week} title={`Semana ${w.week}: ${w.count} cards`}>
                <Box
                  sx={{
                    flex: 1, bgcolor: 'primary.main', borderRadius: '3px 3px 0 0', opacity: 0.8,
                    height: `${Math.max(4, (w.count / maxCount) * 64)}px`,
                    transition: 'height 0.3s', cursor: 'default',
                    '&:hover': { opacity: 1 },
                  }}
                />
              </Tooltip>
            ))}
          </Stack>
        </Box>
      )}

      {/* By format */}
      {insights.by_format.length > 0 && (
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 1, display: 'block' }}>
            Mix por tipo de job
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={1}>
            {insights.by_format.slice(0, 10).map((f) => (
              <Tooltip
                key={f.format}
                title={f.median_cycle_hours
                  ? `Cycle time: ${f.median_cycle_hours < 24 ? `${Math.round(f.median_cycle_hours)}h` : `${(f.median_cycle_hours / 24).toFixed(1)}d`} | Revisões: ${f.avg_revision.toFixed(1)}`
                  : `${f.count} entregas`}
              >
                <Chip
                  label={`${f.format} · ${f.count}`}
                  size="small"
                  variant="outlined"
                  sx={{ cursor: 'default' }}
                />
              </Tooltip>
            ))}
          </Stack>
        </Box>
      )}
    </Stack>
  );
}
