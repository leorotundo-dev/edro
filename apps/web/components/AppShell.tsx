'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import SpeedDial from '@mui/material/SpeedDial';
import SpeedDialAction from '@mui/material/SpeedDialAction';
import SpeedDialIcon from '@mui/material/SpeedDialIcon';
import Sidebar from './layout/sidebar/Sidebar';
import Header from './layout/header/Header';
import { ConfirmProvider } from '@/hooks/useConfirm';
import { IconFileText, IconUsers, IconPlus } from '@tabler/icons-react';

const SPEED_DIAL_ACTIONS = [
  { icon: <IconFileText size={18} />, name: 'Novo Brief', href: '/edro/novo' },
  { icon: <IconUsers size={18} />, name: 'Novo Cliente', href: '/clients/novo' },
];

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
  const router = useRouter();
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
      <SpeedDial
        ariaLabel="Criar novo"
        icon={<SpeedDialIcon openIcon={<IconPlus size={20} />} />}
        sx={{
          position: 'fixed',
          bottom: 28,
          right: 28,
          '& .MuiSpeedDial-fab': {
            bgcolor: 'primary.main',
            '&:hover': { bgcolor: 'primary.dark' },
          },
        }}
      >
        {SPEED_DIAL_ACTIONS.map((action) => (
          <SpeedDialAction
            key={action.name}
            icon={action.icon}
            tooltipTitle={action.name}
            tooltipOpen
            onClick={() => router.push(action.href)}
          />
        ))}
      </SpeedDial>
    </Box>
    </ConfirmProvider>
  );
}
