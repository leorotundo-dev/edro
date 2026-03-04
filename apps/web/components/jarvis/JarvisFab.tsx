'use client';

import Badge from '@mui/material/Badge';
import Fab from '@mui/material/Fab';
import Tooltip from '@mui/material/Tooltip';
import { IconBrain, IconX } from '@tabler/icons-react';
import { useJarvis } from '@/contexts/JarvisContext';

const EDRO_ORANGE = '#E85219';

export default function JarvisFab() {
  const { isOpen, toggle, unreadCount } = useJarvis();

  return (
    <Tooltip title={isOpen ? 'Fechar Jarvis' : 'Abrir Jarvis'} placement="left">
      <Badge
        badgeContent={unreadCount}
        color="error"
        sx={{
          position: 'fixed',
          bottom: 28,
          right: 28,
          zIndex: 1300,
        }}
      >
        <Fab
          onClick={toggle}
          aria-label="Jarvis"
          sx={{
            bgcolor: EDRO_ORANGE,
            color: '#fff',
            '&:hover': { bgcolor: '#c94215' },
            boxShadow: isOpen
              ? '0 0 0 3px rgba(232,82,25,0.3)'
              : '0 4px 20px rgba(232,82,25,0.4)',
            transition: 'all 0.2s ease',
          }}
        >
          {isOpen ? <IconX size={22} /> : <IconBrain size={22} />}
        </Fab>
      </Badge>
    </Tooltip>
  );
}
