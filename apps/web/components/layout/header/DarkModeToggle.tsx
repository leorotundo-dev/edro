'use client';

import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { IconSun, IconMoon } from '@tabler/icons-react';
import { useThemeMode } from '@/contexts/ThemeContext';

export default function DarkModeToggle() {
  const { isDark, toggle } = useThemeMode();

  return (
    <Tooltip title={isDark ? 'Modo claro' : 'Modo escuro'}>
      <IconButton onClick={toggle} size="small">
        {isDark ? <IconSun size={20} stroke={1.5} /> : <IconMoon size={20} stroke={1.5} />}
      </IconButton>
    </Tooltip>
  );
}
