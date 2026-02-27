'use client';

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
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import MenuItems from './MenuItems';
import { useRole } from '@/hooks/useRole';

const SIDEBAR_WIDTH = 260;
const SIDEBAR_MINI_WIDTH = 68;

// Edro brand colors
const EDRO_BG = '#111111';
const EDRO_BG_HOVER = '#1e1e1e';
const EDRO_ORANGE = '#E85219';
const EDRO_ORANGE_MUTED = 'rgba(232, 82, 25, 0.12)';
const EDRO_BORDER = 'rgba(255,255,255,0.06)';
const EDRO_TEXT = 'rgba(255,255,255,0.85)';
const EDRO_TEXT_DIM = 'rgba(255,255,255,0.35)';

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
  const lgUp = useMediaQuery(theme.breakpoints.up('lg'));
  const { role } = useRole();

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
                          {item.badge && (
                            <Chip
                              label={item.badge}
                              size="small"
                              sx={{
                                height: 18,
                                fontSize: '0.6rem',
                                bgcolor: EDRO_ORANGE,
                                color: '#fff',
                                fontWeight: 700,
                              }}
                            />
                          )}
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

      {/* Bottom accent bar */}
      <Box
        sx={{
          borderTop: `1px solid ${EDRO_BORDER}`,
          px: 2,
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: open ? 'flex-start' : 'center',
          gap: 1,
        }}
      >
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: EDRO_ORANGE,
            flexShrink: 0,
          }}
        />
        {open && (
          <Typography sx={{ fontSize: '0.65rem', color: EDRO_TEXT_DIM, letterSpacing: '0.05em' }}>
            edro.studio
          </Typography>
        )}
      </Box>
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
