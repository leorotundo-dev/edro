'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import { IconUser, IconSettings, IconLogout } from '@tabler/icons-react';

type UserInfo = {
  name?: string;
  email?: string;
  role?: string;
};

export default function Profile() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo>({});
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem('edro_user');
    if (!stored) return;
    try {
      setUser(JSON.parse(stored));
    } catch {
      setUser({});
    }
  }, []);

  const displayName = useMemo(() => {
    if (user?.name) return user.name;
    if (user?.email) return user.email.split('@')[0];
    return 'Edro User';
  }, [user]);

  const handleLogout = () => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem('edro_token');
    window.localStorage.removeItem('edro_user');
    window.location.href = '/login';
  };

  return (
    <>
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.5}
        sx={{ cursor: 'pointer', ml: 1 }}
        onClick={(e) => setAnchorEl(e.currentTarget as HTMLElement)}
      >
        <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
          <Typography variant="subtitle2" lineHeight={1.2}>
            {displayName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {user?.role || 'Team'}
          </Typography>
        </Box>
        <Avatar
          src="/modernize/images/profile/user-1.jpg"
          alt={displayName}
          sx={{
            width: 40,
            height: 40,
            border: '2px solid',
            borderColor: 'divider',
            transition: 'all 0.2s',
            '&:hover': { borderColor: 'primary.main' },
          }}
        />
      </Stack>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: { width: 220, borderRadius: 3, mt: 1, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' },
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle2">{displayName}</Typography>
          <Typography variant="caption" color="text.secondary">
            {user?.email || ''}
          </Typography>
        </Box>
        <Divider sx={{ my: 0.5 }} />
        <MenuItem onClick={() => { setAnchorEl(null); router.push('/settings'); }}>
          <ListItemIcon>
            <IconUser size={18} stroke={1.5} />
          </ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: '0.875rem' }}>
            Meu Perfil
          </ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { setAnchorEl(null); router.push('/settings'); }}>
          <ListItemIcon>
            <IconSettings size={18} stroke={1.5} />
          </ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: '0.875rem' }}>
            Configurações
          </ListItemText>
        </MenuItem>
        <Divider sx={{ my: 0.5 }} />
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <IconLogout size={18} stroke={1.5} />
          </ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: '0.875rem', color: 'error.main' }}>
            Sair
          </ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}
