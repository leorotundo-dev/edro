'use client';

import { type SyntheticEvent } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';

type AdminSubmenuItem = {
  label: string;
  value: string;
  kind: 'internal' | 'route';
  href?: string;
};

const ADMIN_SUBMENU_ITEMS: AdminSubmenuItem[] = [
  { label: 'Feature Flags', value: 'feature-flags', kind: 'internal' },
  { label: 'Security Logs', value: 'security-logs', kind: 'internal' },
  { label: 'Jobs', value: 'jobs', kind: 'internal' },
  { label: 'Dashboard', value: 'dashboard', kind: 'internal' },
  { label: 'Health', value: 'health', kind: 'route', href: '/admin/health' },
  { label: 'Usuarios', value: 'users', kind: 'route', href: '/admin/users' },
  { label: 'AI Costs', value: 'ai-costs', kind: 'route', href: '/admin/ai-costs' },
  { label: 'Automacoes', value: 'automacoes', kind: 'route', href: '/admin/automations' },
  { label: 'Import Events', value: 'import-events', kind: 'route', href: '/admin/events/import' },
  { label: 'Recco Engine', value: 'recco-engine', kind: 'route', href: '/admin/recco-engine' },
  { label: 'Settings', value: 'settings', kind: 'route', href: '/settings' },
];

type AdminSubmenuProps = {
  value: string;
  onInternalChange?: (value: string) => void;
};

export default function AdminSubmenu({ value, onInternalChange }: AdminSubmenuProps) {
  const router = useRouter();

  const handleChange = (_: SyntheticEvent, nextValue: string) => {
    const selected = ADMIN_SUBMENU_ITEMS.find((item) => item.value === nextValue);
    if (!selected) return;

    if (selected.kind === 'internal') {
      if (onInternalChange) {
        onInternalChange(nextValue);
      } else {
        router.push('/admin/system');
      }
      return;
    }

    if (selected.href) {
      router.push(selected.href);
    }
  };

  return (
    <Box
      sx={{
        position: 'sticky',
        top: 12,
        zIndex: 20,
        mb: 3,
        bgcolor: 'background.default',
        borderRadius: 1,
      }}
    >
      <Tabs
        value={value}
        onChange={handleChange}
        variant="scrollable"
        allowScrollButtonsMobile
        scrollButtons="auto"
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        {ADMIN_SUBMENU_ITEMS.map((item) => (
          <Tab key={item.value} value={item.value} label={item.label} />
        ))}
      </Tabs>
    </Box>
  );
}
