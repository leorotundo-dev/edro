'use client';

import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import { IconMenu2 } from '@tabler/icons-react';
import Notifications from './Notifications';
import Profile from './Profile';

type ActionButton = {
  label: string;
  icon?: React.ReactNode | string;
  onClick?: () => void;
};

type HeaderProps = {
  title: string;
  meta?: string;
  action?: ActionButton;
  topbarExtra?: React.ReactNode;
  topbarLeft?: React.ReactNode;
  topbarRight?: React.ReactNode;
  onMenuClick: () => void;
  onToggleSidebar: () => void;
};

export default function Header({
  title,
  meta,
  action,
  topbarExtra,
  topbarLeft,
  topbarRight,
  onMenuClick,
  onToggleSidebar,
}: HeaderProps) {
  return (
    <AppBar position="sticky" elevation={0} sx={{ bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}>
      <Toolbar sx={{ minHeight: { xs: 56, sm: 64 }, px: { xs: 2, sm: 3 }, gap: 2 }}>
        {/* Menu toggle */}
        <IconButton
          onClick={onMenuClick}
          sx={{ display: { lg: 'none' }, mr: 1 }}
        >
          <IconMenu2 size={22} />
        </IconButton>
        <IconButton
          onClick={onToggleSidebar}
          sx={{ display: { xs: 'none', lg: 'flex' }, mr: 1 }}
        >
          <IconMenu2 size={22} />
        </IconButton>

        {/* Left content */}
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 2 }}>
          {topbarLeft || (
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Typography variant="h4" noWrap>
                {title}
              </Typography>
              {meta && (
                <>
                  <Divider orientation="vertical" flexItem sx={{ height: 16, alignSelf: 'center' }} />
                  <Typography variant="overline" color="text.secondary" noWrap>
                    {meta}
                  </Typography>
                </>
              )}
            </Stack>
          )}
        </Box>

        {/* Right content */}
        <Stack direction="row" alignItems="center" spacing={1}>
          {action && (
            <Button
              variant="contained"
              size="small"
              onClick={action.onClick}
              startIcon={
                action.icon && typeof action.icon !== 'string' ? action.icon : undefined
              }
            >
              {action.label}
            </Button>
          )}
          {topbarExtra}
          {topbarRight}
          <Notifications />
          <Profile />
        </Stack>
      </Toolbar>
    </AppBar>
  );
}
