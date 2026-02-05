'use client';

import { useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Sidebar from './layout/sidebar/Sidebar';
import Header from './layout/header/Header';

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
};

export default function AppShell({
  title,
  meta,
  action,
  topbarExtra,
  topbarLeft,
  topbarRight,
  children,
}: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
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
          overflow: 'hidden',
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
            p: { xs: 2, sm: 3 },
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
