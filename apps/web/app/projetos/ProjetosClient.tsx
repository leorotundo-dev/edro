'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import AppShell from '@/components/AppShell';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { IconBrandTrello, IconLayoutKanban, IconSettings } from '@tabler/icons-react';

type ProjectBoard = {
  id: string;
  name: string;
  description?: string | null;
  client_id?: string | null;
  trello_board_id?: string | null;
  last_synced_at?: string | null;
  card_count: number;
};

const BOARD_COLORS = ['#0052cc', '#0079bf', '#61bd4f', '#ff9f1a', '#eb5a46', '#c377e0'];

function boardColor(index: number) {
  return BOARD_COLORS[index % BOARD_COLORS.length];
}

export default function ProjetosClient() {
  const [boards, setBoards] = useState<ProjectBoard[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await apiGet('/trello/project-boards');
      setBoards(data.boards ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <AppShell title="Projetos">
      <Box sx={{ p: { xs: 2, md: 4 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <IconLayoutKanban size={26} />
            <Typography variant="h5" fontWeight={700}>Projetos</Typography>
          </Stack>
          <Button
            size="small"
            variant="outlined"
            startIcon={<IconSettings size={16} />}
            href="/admin/trello"
          >
            Configurar Trello
          </Button>
        </Stack>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && boards.length === 0 && (
          <Box sx={{ textAlign: 'center', mt: 8 }}>
            <IconBrandTrello size={48} color="#aaa" />
            <Typography variant="h6" color="text.secondary" mt={2}>
              Nenhum board importado ainda
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Conecte o Trello e importe seus boards para visualizá-los aqui.
            </Typography>
            <Button variant="contained" href="/admin/trello">
              Conectar Trello
            </Button>
          </Box>
        )}

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' },
            gap: 2,
          }}
        >
          {boards.map((board, i) => (
            <Card key={board.id} sx={{ borderRadius: 2, overflow: 'hidden' }}>
              <CardActionArea href={`/projetos/${board.id}`}>
                {/* Color header */}
                <Box sx={{ height: 80, bgcolor: boardColor(i), display: 'flex', alignItems: 'flex-start', p: 1.5 }}>
                  <Typography variant="subtitle1" fontWeight={700} color="#fff" sx={{ lineHeight: 1.3 }}>
                    {board.name}
                  </Typography>
                </Box>
                <CardContent sx={{ pt: 1.5 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip label={`${board.card_count} cards`} size="small" />
                    {board.trello_board_id && (
                      <Chip
                        label="Trello"
                        size="small"
                        icon={<IconBrandTrello size={12} />}
                        variant="outlined"
                        sx={{ fontSize: 11, height: 20 }}
                      />
                    )}
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      </Box>
    </AppShell>
  );
}
