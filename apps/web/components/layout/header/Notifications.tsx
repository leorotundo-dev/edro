'use client';

import { useState } from 'react';
import IconButton from '@mui/material/IconButton';
import Badge from '@mui/material/Badge';
import Popover from '@mui/material/Popover';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import { IconBell, IconMessage2, IconCalendarEvent, IconClipboardCheck } from '@tabler/icons-react';

const mockNotifications = [
  {
    id: 1,
    icon: IconMessage2,
    color: '#ff6600',
    bgColor: '#fff1e6',
    title: 'Novo comentário no briefing',
    subtitle: 'há 5 minutos',
  },
  {
    id: 2,
    icon: IconCalendarEvent,
    color: '#FFAE1F',
    bgColor: '#FEF5E5',
    title: 'Evento amanhã: Reunião cliente',
    subtitle: 'há 1 hora',
  },
  {
    id: 3,
    icon: IconClipboardCheck,
    color: '#13DEB9',
    bgColor: '#E6FFFA',
    title: 'Briefing aprovado',
    subtitle: 'há 2 horas',
  },
];

export default function Notifications() {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  return (
    <>
      <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ position: 'relative' }}>
        <Badge
          variant="dot"
          color="primary"
          overlap="circular"
          sx={{ '& .MuiBadge-badge': { top: 4, right: 4, width: 8, height: 8, borderRadius: '50%', border: '2px solid white' } }}
        >
          <IconBell size={22} stroke={1.5} />
        </Badge>
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: { width: 340, borderRadius: 3, mt: 1, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' },
          },
        }}
      >
        <Box sx={{ p: 2.5, pb: 1.5 }}>
          <Typography variant="h6">Notificações</Typography>
          <Typography variant="body2" color="text.secondary">
            {mockNotifications.length} novas
          </Typography>
        </Box>
        <Divider />
        <Stack sx={{ maxHeight: 300, overflowY: 'auto' }}>
          {mockNotifications.map((n) => {
            const NIcon = n.icon;
            return (
              <Box
                key={n.id}
                sx={{
                  px: 2.5,
                  py: 1.5,
                  display: 'flex',
                  gap: 1.5,
                  alignItems: 'flex-start',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <Avatar
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: n.bgColor,
                    color: n.color,
                    borderRadius: 2,
                  }}
                >
                  <NIcon size={20} />
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle2" noWrap>
                    {n.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {n.subtitle}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Stack>
        <Divider />
        <Box sx={{ p: 1.5, textAlign: 'center' }}>
          <Button size="small" color="primary">
            Ver todas
          </Button>
        </Box>
      </Popover>
    </>
  );
}
