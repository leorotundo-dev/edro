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
import Stack from '@mui/material/Stack';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import MenuItems from './MenuItems';

const SIDEBAR_WIDTH = 270;
const SIDEBAR_MINI_WIDTH = 70;

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

  const sidebarContent = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Logo */}
      <Box sx={{ px: 3, py: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          component="img"
          src="/modernize/images/logos/logoIcon.svg"
          alt="Edro"
          sx={{ width: 32, height: 32, flexShrink: 0 }}
        />
        {open && (
          <Stack spacing={-0.5}>
            <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1rem', lineHeight: 1.2 }}>
              edro
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.625rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              studio
            </Typography>
          </Stack>
        )}
      </Box>

      {/* Navigation */}
      <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', px: 2, py: 1 }}>
        {MenuItems.map((group) => (
          <Box key={group.subheader} sx={{ mb: 1.5 }}>
            {open && (
              <Typography
                variant="overline"
                sx={{
                  px: 1.5,
                  py: 0.5,
                  display: 'block',
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  color: 'text.disabled',
                  letterSpacing: '0.1em',
                }}
              >
                {group.subheader}
              </Typography>
            )}
            <List disablePadding>
              {group.items.map((item) => {
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
                      minHeight: 44,
                      px: open ? 1.5 : 'auto',
                      justifyContent: open ? 'initial' : 'center',
                      ...(active && {
                        borderLeft: '3px solid',
                        borderColor: 'primary.main',
                      }),
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: open ? 36 : 'auto',
                        justifyContent: 'center',
                        color: active ? 'primary.main' : 'text.secondary',
                      }}
                    >
                      <Icon size={20} stroke={1.5} />
                    </ListItemIcon>
                    {open && (
                      <>
                        <ListItemText
                          primary={item.title}
                          primaryTypographyProps={{
                            fontSize: '0.875rem',
                            fontWeight: active ? 600 : 400,
                            noWrap: true,
                          }}
                        />
                        {item.badge && (
                          <Chip
                            label={item.badge}
                            size="small"
                            color={item.badgeColor || 'primary'}
                            sx={{ height: 20, fontSize: '0.625rem' }}
                          />
                        )}
                      </>
                    )}
                  </ListItemButton>
                );
              })}
            </List>
          </Box>
        ))}
      </Box>
    </Box>
  );

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
            width: open ? SIDEBAR_WIDTH : SIDEBAR_MINI_WIDTH,
            boxSizing: 'border-box',
            borderRight: '1px solid',
            borderColor: 'divider',
            transition: 'width 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)',
            overflowX: 'hidden',
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
          width: SIDEBAR_WIDTH,
          boxSizing: 'border-box',
        },
      }}
      ModalProps={{ keepMounted: true }}
    >
      {sidebarContent}
    </Drawer>
  );
}
