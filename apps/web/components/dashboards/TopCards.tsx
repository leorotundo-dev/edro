'use client';

import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card';
import {
  IconClipboardList,
  IconChecks,
  IconChartBar,
  IconSparkles,
  IconUsers,
  IconCalendar,
} from '@tabler/icons-react';
import type { ComponentType } from 'react';

type TopCardItem = {
  title: string;
  value: string | number;
  icon: ComponentType<{ size?: number }>;
  color: string;
  bgColor: string;
};

const DEFAULT_CARDS: TopCardItem[] = [
  { title: 'Briefings', value: '—', icon: IconClipboardList, color: '#ff6600', bgColor: '#fff1e6' },
  { title: 'Concluídos', value: '—', icon: IconChecks, color: '#13DEB9', bgColor: '#E6FFFA' },
  { title: 'Aprovação', value: '—', icon: IconChartBar, color: '#FFAE1F', bgColor: '#FEF5E5' },
  { title: 'Copies IA', value: '—', icon: IconSparkles, color: '#ff8a4d', bgColor: '#fff1e6' },
  { title: 'Clientes', value: '—', icon: IconUsers, color: '#64748b', bgColor: '#f1f5f9' },
  { title: 'Eventos', value: '—', icon: IconCalendar, color: '#ff6600', bgColor: '#fff1e6' },
];

type TopCardsProps = {
  stats?: {
    briefings?: number;
    completed?: number;
    approvalRate?: number | string;
    copies?: number;
    clients?: number;
    events?: number;
  };
};

export default function TopCards({ stats }: TopCardsProps) {
  const cards = DEFAULT_CARDS.map((card, i) => {
    const values = [
      stats?.briefings,
      stats?.completed,
      stats?.approvalRate != null ? `${stats.approvalRate}%` : undefined,
      stats?.copies,
      stats?.clients,
      stats?.events,
    ];
    return { ...card, value: values[i] ?? card.value };
  });

  return (
    <Grid container spacing={2}>
      {cards.map((card) => {
        const CardIcon = card.icon;
        return (
          <Grid size={{ xs: 6, sm: 4, lg: 2 }} key={card.title}>
            <Card
              sx={{
                p: 2.5,
                textAlign: 'center',
                transition: 'all 0.3s',
                cursor: 'pointer',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                },
              }}
            >
              <Stack alignItems="center" spacing={1.5}>
                <Avatar
                  sx={{
                    width: 48,
                    height: 48,
                    bgcolor: card.bgColor,
                    color: card.color,
                    borderRadius: 3,
                  }}
                >
                  <CardIcon size={24} />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight={700}>
                    {card.value}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {card.title}
                  </Typography>
                </Box>
              </Stack>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
}
