'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import MenuItems from './MenuItems';
import { useRole } from '@/hooks/useRole';
import { useOpsCriticalCount } from '@/hooks/useOpsCriticalCount';
import { useJarvis } from '@/contexts/JarvisContext';
import Badge from '@mui/material/Badge';
import { IconBrain } from '@tabler/icons-react';

const SIDEBAR_WIDTH = 260;
const SIDEBAR_MINI_WIDTH = 68;

// Edro brand colors (static)
const EDRO_ORANGE = '#E85219';
const EDRO_ORANGE_MUTED = 'rgba(232, 82, 25, 0.12)';

type SidebarProps = {
  open: boolean;
  mobileOpen: boolean;
  onToggle: () => void;
  onMobileClose: () => void;
};

function getActive(pathname: string, href: string) {
  if (href === '/') return pathname === href;
  return pathname.startsWith(href);
}

export default function Sidebar({ open, mobileOpen, onToggle, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const EDRO_BG = isDark ? '#111111' : '#ffffff';
  const EDRO_BG_HOVER = isDark ? '#1e1e1e' : theme.palette.grey[100];
  const EDRO_BORDER = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';
  const EDRO_TEXT = isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.87)';
  const EDRO_TEXT_DIM = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.40)';
  const lgUp = useMediaQuery(theme.breakpoints.up('lg'));
  const { role } = useRole();
  const opsCritical = useOpsCriticalCount();
  const { openPalette, toggle: toggleJarvis, unreadCount: jarvisUnread, isOpen: jarvisOpen, isPaletteOpen } = useJarvis();

  const [user, setUser] = useState<{ name?: string; email?: string; role?: string; avatar_url?: string | null }>({});
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem('edro_user');
    if (!stored) return;
    try { setUser(JSON.parse(stored)); } catch { /* ignore */ }
  }, []);
  const displayName = useMemo(() => {
    if (user?.name) return user.name;
    if (user?.email) return user.email.split('@')[0];
    return 'Edro User';
  }, [user]);
  const initials = displayName.slice(0, 2).toUpperCase();

  const sidebarContent = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        bgcolor: EDRO_BG,
      }}
    >
      {/* Logo */}
      <Box
        sx={{
          px: open ? 3 : 1.5,
          py: 2.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: open ? 'flex-start' : 'center',
          borderBottom: `1px solid ${EDRO_BORDER}`,
          minHeight: 72,
        }}
      >
        {open ? (
          <Box
            component="img"
            src="/brand/logo-studio.png"
            alt="edro.studio"
            sx={{ height: 28, width: 'auto', objectFit: 'contain' }}
          />
        ) : (
          <Box
            component="img"
            src="/brand/icon-orange.png"
            alt="edro"
            sx={{ width: 32, height: 32, objectFit: 'contain' }}
          />
        )}
      </Box>

      {/* Navigation */}
      <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', px: 1.5, py: 1.5 }}>
        {MenuItems.map((group) => {
          const visibleItems = group.items.filter(
            (item) => !item.requiredRole || item.requiredRole.includes(role)
          );
          if (group.requiredGroupRole && !group.requiredGroupRole.includes(role)) return null;
          if (visibleItems.length === 0) return null;

          return (
            <Box key={group.subheader} sx={{ mb: 2 }}>
              {open && (
                <Typography
                  variant="overline"
                  sx={{
                    px: 1,
                    py: 0.5,
                    display: 'block',
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    color: EDRO_TEXT_DIM,
                    letterSpacing: '0.12em',
                  }}
                >
                  {group.subheader}
                </Typography>
              )}
              <List disablePadding>
                {visibleItems.map((item) => {
                  const active = getActive(pathname, item.href);
                  const Icon = item.icon;

                  return (
                    <ListItemButton
                      key={item.id}
                      component={Link}
                      href={item.href}
                      selected={active}
                      onClick={() => !lgUp && onMobileClose()}
                      sx={{
                        minHeight: 42,
                        borderRadius: '6px',
                        mb: 0.25,
                        px: open ? 1.5 : 'auto',
                        justifyContent: open ? 'initial' : 'center',
                        color: active ? '#fff' : EDRO_TEXT,
                        bgcolor: active ? EDRO_ORANGE_MUTED : 'transparent',
                        borderLeft: active ? `3px solid ${EDRO_ORANGE}` : '3px solid transparent',
                        '&:hover': {
                          bgcolor: active ? EDRO_ORANGE_MUTED : EDRO_BG_HOVER,
                        },
                        '&.Mui-selected': {
                          bgcolor: EDRO_ORANGE_MUTED,
                          '&:hover': { bgcolor: EDRO_ORANGE_MUTED },
                        },
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          minWidth: open ? 34 : 'auto',
                          justifyContent: 'center',
                          color: active ? EDRO_ORANGE : EDRO_TEXT_DIM,
                        }}
                      >
                        <Icon size={19} stroke={active ? 2 : 1.5} />
                      </ListItemIcon>
                      {open && (
                        <>
                          <ListItemText
                            primary={item.title}
                            primaryTypographyProps={{
                              fontSize: '0.84rem',
                              fontWeight: active ? 600 : 400,
                              color: active ? '#fff' : EDRO_TEXT,
                              noWrap: true,
                            }}
                          />
                          {item.id === 'operacoes' && opsCritical > 0 ? (
                            <Chip
                              label={opsCritical}
                              size="small"
                              sx={{ height: 18, fontSize: '0.6rem', bgcolor: '#dc2626', color: '#fff', fontWeight: 700 }}
                            />
                          ) : item.badge && item.id !== 'operacoes' ? (
                            <Chip
                              label={item.badge}
                              size="small"
                              sx={{ height: 18, fontSize: '0.6rem', bgcolor: EDRO_ORANGE, color: '#fff', fontWeight: 700 }}
                            />
                          ) : null}
                        </>
                      )}
                    </ListItemButton>
                  );
                })}
              </List>
            </Box>
          );
        })}
      </Box>

      {/* Jarvis button — opens command palette */}
      <Tooltip title={open ? '' : 'Jarvis (Ctrl+J)'} placement="right">
        <Box
          onClick={openPalette}
          sx={{
            mx: 1.5,
            mb: 1,
            px: open ? 1.5 : 0,
            py: 1,
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: open ? 'flex-start' : 'center',
            gap: 1.25,
            cursor: 'pointer',
            bgcolor: (jarvisOpen || isPaletteOpen) ? 'rgba(232,82,25,0.14)' : 'rgba(232,82,25,0.07)',
            border: `1px solid ${(jarvisOpen || isPaletteOpen) ? 'rgba(232,82,25,0.4)' : 'rgba(232,82,25,0.18)'}`,
            transition: 'all 150ms ease',
            '&:hover': { bgcolor: 'rgba(232,82,25,0.16)', borderColor: 'rgba(232,82,25,0.4)' },
          }}
        >
          <Badge
            badgeContent={jarvisUnread}
            color="error"
            sx={{ '& .MuiBadge-badge': { fontSize: '0.55rem', minWidth: 14, height: 14, top: 2, right: 2 } }}
          >
            <Box sx={{ color: EDRO_ORANGE, display: 'flex', alignItems: 'center' }}>
              <IconBrain size={18} stroke={(jarvisOpen || isPaletteOpen) ? 2 : 1.5} />
            </Box>
          </Badge>
          {open && (
            <>
              <Typography
                sx={{
                  fontSize: '0.84rem',
                  fontWeight: (jarvisOpen || isPaletteOpen) ? 700 : 500,
                  color: (jarvisOpen || isPaletteOpen) ? '#fff' : EDRO_ORANGE,
                  flex: 1,
                  lineHeight: 1,
                }}
              >
                Jarvis
              </Typography>
              <Box
                component="kbd"
                sx={{
                  fontSize: '0.55rem',
                  color: 'rgba(255,255,255,0.3)',
                  fontFamily: 'monospace',
                  letterSpacing: 0,
                }}
              >
                ⌃J
              </Box>
            </>
          )}
          {open && jarvisUnread > 0 && (
            <Chip
              label={jarvisUnread}
              size="small"
              sx={{ height: 18, fontSize: '0.6rem', bgcolor: '#dc2626', color: '#fff', fontWeight: 700 }}
            />
          )}
        </Box>
      </Tooltip>

      {/* User footer */}
      <Tooltip title={open ? '' : `${displayName} · ${user?.role || role || 'Team'}`} placement="right">
        <Box
          sx={{
            borderTop: `1px solid ${EDRO_BORDER}`,
            px: open ? 2 : 1,
            py: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: open ? 'flex-start' : 'center',
            gap: 1.5,
            cursor: 'default',
            transition: 'background-color 0.15s ease',
            '&:hover': { bgcolor: EDRO_BG_HOVER },
          }}
        >
          <Avatar
            src={user?.avatar_url ?? undefined}
            sx={{
              width: 32,
              height: 32,
              bgcolor: EDRO_ORANGE,
              fontSize: '0.7rem',
              fontWeight: 700,
              flexShrink: 0,
              border: `1.5px solid rgba(255,255,255,0.12)`,
            }}
          >
            {!user?.avatar_url ? initials : null}
          </Avatar>
          {open && (
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                sx={{
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: EDRO_TEXT,
                  lineHeight: 1.2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {displayName}
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.65rem',
                  color: EDRO_TEXT_DIM,
                  lineHeight: 1.3,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {user?.role || role || 'Team'}
              </Typography>
            </Box>
          )}
        </Box>
      </Tooltip>
    </Box>
  );

  const drawerSx = {
    '& .MuiDrawer-paper': {
      bgcolor: EDRO_BG,
      borderRight: `1px solid ${EDRO_BORDER}`,
      boxSizing: 'border-box' as const,
      overflowX: 'hidden',
    },
  };

  if (lgUp) {
    return (
      <Drawer
        variant="permanent"
        open={open}
        sx={{
          width: open ? SIDEBAR_WIDTH : SIDEBAR_MINI_WIDTH,
          flexShrink: 0,
          transition: 'width 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)',
          '& .MuiDrawer-paper': {
            ...drawerSx['& .MuiDrawer-paper'],
            width: open ? SIDEBAR_WIDTH : SIDEBAR_MINI_WIDTH,
            transition: 'width 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)',
          },
        }}
      >
        {sidebarContent}
      </Drawer>
    );
  }

  return (
    <Drawer
      variant="temporary"
      open={mobileOpen}
      onClose={onMobileClose}
      sx={{
        '& .MuiDrawer-paper': {
          ...drawerSx['& .MuiDrawer-paper'],
          width: SIDEBAR_WIDTH,
        },
      }}
      ModalProps={{ keepMounted: true }}
    >
      {sidebarContent}
    </Drawer>
  );
}
