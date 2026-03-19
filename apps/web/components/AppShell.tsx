'use client';

import { useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Sidebar from './layout/sidebar/Sidebar';
import Header from './layout/header/Header';
import { ConfirmProvider } from '@/hooks/useConfirm';
import JarvisFab from './jarvis/JarvisFab';
import JarvisDrawer from './jarvis/JarvisDrawer';

type ActionButton = {
  label: string;
  icon?: ReactNode | string;
  onClick?: () => void;
};

type AppShellProps = {
  title: string;
  meta?: string;
  action?: ActionButton;
  topbarExtra?: React.ReactNode;
  topbarLeft?: React.ReactNode;
  topbarRight?: React.ReactNode;
  children: React.ReactNode;
  /** Remove padding and allow horizontal scroll — for full-bleed layouts like kanban */
  fullBleed?: boolean;
};

export default function AppShell({
  title,
  meta,
  action,
  topbarExtra,
  topbarLeft,
  topbarRight,
  children,
  fullBleed,
}: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <ConfirmProvider>
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Sidebar
        open={sidebarOpen}
        mobileOpen={mobileSidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          overflow: fullBleed ? 'auto' : 'hidden',
        }}
      >
        <Header
          title={title}
          meta={meta}
          action={action}
          topbarExtra={topbarExtra}
          topbarLeft={topbarLeft}
          topbarRight={topbarRight}
          onMenuClick={() => setMobileSidebarOpen(true)}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />
        <Box
          sx={{
            p: fullBleed ? 0 : { xs: 2, sm: 3 },
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: fullBleed ? 0 : 3,
            animation: 'edroFadeIn 0.22s ease-out',
            '@keyframes edroFadeIn': {
              from: { opacity: 0, transform: 'translateY(6px)' },
              to:   { opacity: 1, transform: 'translateY(0)' },
            },
          }}
        >
          {children}
        </Box>
      </Box>
      <JarvisFab />
      <JarvisDrawer />
    </Box>
    </ConfirmProvider>
  );
}
