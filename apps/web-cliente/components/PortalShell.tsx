'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import AppBar from '@mui/material/AppBar';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import {
  IconLayoutDashboard,
  IconBriefcase,
  IconCheckbox,
  IconChartBar,
  IconReceipt,
  IconLogout,
  IconMenu2,
  IconPlus,
} from '@tabler/icons-react';
import { clearToken } from '@/lib/api';

const NAV = [
  { href: '/',           label: 'Início',       icon: <IconLayoutDashboard size={18} />, match: (p: string) => p === '/' },
  { href: '/jobs',       label: 'Projetos',     icon: <IconBriefcase size={18} />,       match: (p: string) => p.startsWith('/jobs') },
  { href: '/aprovacoes', label: 'Aprovações',   icon: <IconCheckbox size={18} />,        match: (p: string) => p.startsWith('/aprovacoes') },
  { href: '/briefing',   label: 'Solicitações', icon: <IconPlus size={18} />,            match: (p: string) => p.startsWith('/briefing') },
  { href: '/relatorios', label: 'Relatórios',   icon: <IconChartBar size={18} />,        match: (p: string) => p.startsWith('/relatorios') },
  { href: '/faturas',    label: 'Faturas',      icon: <IconReceipt size={18} />,         match: (p: string) => p.startsWith('/faturas') },
];

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || 'CL';
}

export default function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [name, setName] = useState('');
  const [clientLogoUrl, setClientLogoUrl] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/session', { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) { clearToken(); window.location.href = '/login'; return null; }
        return res.json();
      })
      .then((data) => {
        if (!cancelled && data) {
          setName(data?.user?.name ?? data?.user?.client_name ?? data?.user?.email ?? 'Cliente');
          setClientLogoUrl(data?.user?.client_logo_url ?? null);
        }
      })
      .catch(() => null);
    return () => { cancelled = true; };
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
    clearToken();
    window.location.href = '/login';
  };

  const navigate = (href: string) => { setDrawerOpen(false); router.push(href); };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* AppBar */}
      <AppBar position="sticky" elevation={0}>
        <Toolbar sx={{ gap: 2, px: { xs: 2, md: 4 }, minHeight: '64px !important' }}>
          <Stack
            direction="row" alignItems="center" spacing={1}
            onClick={() => router.push('/')}
            sx={{ cursor: 'pointer', flexShrink: 0 }}
          >
            {clientLogoUrl ? (
              <Box
                component="img"
                src={clientLogoUrl}
                alt="Logo"
                sx={{ height: 32, maxWidth: 130, objectFit: 'contain' }}
                onError={(e: any) => { e.target.style.display = 'none'; }}
              />
            ) : (
              <Box
                component="img"
                src="/brand/logo-studio.png"
                alt="Edro Studio"
                sx={{ height: 24, width: 'auto', objectFit: 'contain' }}
              />
            )}
            {clientLogoUrl && (
              <Stack direction="row" alignItems="center" spacing={0.5} sx={{ borderLeft: '1px solid', borderColor: 'divider', pl: 1 }}>
                <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem', lineHeight: 1 }}>
                  by
                </Typography>
                <Box
                  component="img"
                  src="/brand/logo-studio.png"
                  alt="Edro"
                  sx={{ height: 14, width: 'auto', objectFit: 'contain', opacity: 0.45 }}
                />
              </Stack>
            )}
          </Stack>

          {!isMobile && (
            <Stack direction="row" spacing={0.5} sx={{ ml: 3 }}>
              {NAV.map((item) => {
                const active = item.match(pathname);
                return (
                  <Button
                    key={item.href}
                    onClick={() => router.push(item.href)}
                    startIcon={item.icon}
                    size="small"
                    sx={{
                      color: active ? 'primary.main' : 'text.secondary',
                      fontWeight: active ? 700 : 500,
                      px: 1.5,
                      borderRadius: 2,
                      bgcolor: active ? 'primary.light' : 'transparent',
                      '&:hover': { bgcolor: active ? 'primary.light' : 'action.hover' },
                    }}
                  >
                    {item.label}
                  </Button>
                );
              })}
            </Stack>
          )}

          <Box sx={{ flexGrow: 1 }} />

          <Stack direction="row" spacing={1} alignItems="center">
            {name && (
              <>
                <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32, fontSize: '0.75rem', fontWeight: 700 }}>
                  {getInitials(name)}
                </Avatar>
                {!isMobile && (
                  <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 160 }}>
                    {name}
                  </Typography>
                )}
              </>
            )}
            <Tooltip title="Sair">
              <IconButton size="small" onClick={handleLogout} sx={{ color: 'text.secondary' }}>
                <IconLogout size={18} />
              </IconButton>
            </Tooltip>
            {isMobile && (
              <IconButton size="small" onClick={() => setDrawerOpen(true)} sx={{ color: 'text.secondary' }}>
                <IconMenu2 size={20} />
              </IconButton>
            )}
          </Stack>
        </Toolbar>
      </AppBar>

      {/* Mobile drawer */}
      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 240, pt: 2 }}>
          <Box sx={{ px: 2, pb: 2 }}>
            {clientLogoUrl ? (
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <Box
                  component="img"
                  src={clientLogoUrl}
                  alt="Logo"
                  sx={{ height: 28, maxWidth: 110, objectFit: 'contain' }}
                  onError={(e: any) => { e.target.style.display = 'none'; }}
                />
                <Stack direction="row" alignItems="center" spacing={0.5} sx={{ borderLeft: '1px solid', borderColor: 'divider', pl: 1 }}>
                  <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.6rem' }}>by</Typography>
                  <Box
                    component="img"
                    src="/brand/logo-studio.png"
                    alt="Edro"
                    sx={{ height: 12, width: 'auto', objectFit: 'contain', opacity: 0.4 }}
                  />
                </Stack>
              </Stack>
            ) : null}
            <Typography variant="caption" color="text.secondary" display="block">Portal do Cliente</Typography>
            {name && <Typography variant="body2" fontWeight={600}>{name}</Typography>}
          </Box>
          <Divider />
          <List dense sx={{ px: 1, pt: 1 }}>
            {NAV.map((item) => {
              const active = item.match(pathname);
              return (
                <ListItemButton key={item.href} selected={active} onClick={() => navigate(item.href)} sx={{ borderRadius: 1, mb: 0.5 }}>
                  <Box sx={{ mr: 1.5, color: active ? 'primary.main' : 'text.secondary', display: 'flex' }}>{item.icon}</Box>
                  <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: active ? 700 : 400, fontSize: '0.875rem' }} />
                </ListItemButton>
              );
            })}
          </List>
          <Divider />
          <List dense sx={{ px: 1, pt: 0.5 }}>
            <ListItemButton onClick={handleLogout} sx={{ borderRadius: 1 }}>
              <Box sx={{ mr: 1.5, color: 'text.secondary', display: 'flex' }}><IconLogout size={18} /></Box>
              <ListItemText primary="Sair" primaryTypographyProps={{ fontSize: '0.875rem' }} />
            </ListItemButton>
          </List>
        </Box>
      </Drawer>

      {/* Content */}
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {children}
      </Container>
    </Box>
  );
}
