import {
  IconHome,
  IconClipboardList,
  IconUsers,
  IconCalendar,
  IconLayoutKanban,
  IconPalette,
  IconRadar2,

  IconChartLine,
  IconShare,
  IconFileText,
  IconShieldCheck,
  IconUpload,
  IconSettings,
  IconCoin,
  IconTargetArrow,
  IconBug,
  IconRobot,
} from '@tabler/icons-react';
import type { ComponentType } from 'react';

export type MenuItemType = {
  id: string;
  title: string;
  icon: ComponentType<{ size?: number; stroke?: number }>;
  href: string;
  badge?: string;
  badgeColor?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  requiredRole?: string[];
};

export type MenuGroupType = {
  subheader: string;
  items: MenuItemType[];
  requiredGroupRole?: string[];
};

const MenuItems: MenuGroupType[] = [
  {
    subheader: 'Principal',
    items: [
      {
        id: 'home',
        title: 'Home',
        icon: IconHome,
        href: '/',
      },
      {
        id: 'briefings',
        title: 'Edro Briefings',
        icon: IconClipboardList,
        href: '/edro',
        badge: 'New',
        badgeColor: 'primary',
      },
      {
        id: 'clients',
        title: 'Clients',
        icon: IconUsers,
        href: '/clients',
      },
      {
        id: 'calendar',
        title: 'Calendar',
        icon: IconCalendar,
        href: '/calendar',
      },
      {
        id: 'kanban',
        title: 'Kanban',
        icon: IconLayoutKanban,
        href: '/board',
      },
    ],
  },
  {
    subheader: 'Criativo',
    items: [
      {
        id: 'studio',
        title: 'Creative Studio',
        icon: IconPalette,
        href: '/studio',
      },
      {
        id: 'production',
        title: 'Production Catalog',
        icon: IconFileText,
        href: '/production/catalog',
      },
    ],
  },
  {
    subheader: 'Inteligência',
    items: [
      {
        id: 'radar',
        title: 'Radar',
        icon: IconRadar2,
        href: '/clipping',
      },
      {
        id: 'analytics',
        title: 'Clipping Analytics',
        icon: IconChartLine,
        href: '/clipping/dashboard',
      },
      {
        id: 'quality',
        title: 'Radar Quality',
        icon: IconTargetArrow,
        href: '/clipping/quality',
      },
      {
        id: 'social',
        title: 'Social Listening',
        icon: IconShare,
        href: '/social-listening',
      },
    ],
  },
  {
    subheader: 'Admin',
    requiredGroupRole: ['admin', 'manager'],
    items: [
      {
        id: 'admin-system',
        title: 'System Admin',
        icon: IconShieldCheck,
        href: '/admin/system',
        requiredRole: ['admin'],
      },
      {
        id: 'admin-users',
        title: 'Usuarios',
        icon: IconUsers,
        href: '/admin/users',
        requiredRole: ['admin'],
      },
      {
        id: 'admin-ai-costs',
        title: 'AI Costs',
        icon: IconCoin,
        href: '/admin/ai-costs',
        requiredRole: ['admin', 'manager'],
      },
      {
        id: 'admin-radar',
        title: 'Radar Diagnostics',
        icon: IconBug,
        href: '/clipping/diagnostics',
        requiredRole: ['admin', 'manager'],
      },
      {
        id: 'admin-automations',
        title: 'Automacoes',
        icon: IconRobot,
        href: '/admin/automations',
        requiredRole: ['admin', 'manager'],
      },
      {
        id: 'admin-import',
        title: 'Import Events',
        icon: IconUpload,
        href: '/admin/events/import',
        requiredRole: ['admin', 'manager'],
      },
      {
        id: 'settings',
        title: 'Settings',
        icon: IconSettings,
        href: '/settings',
      },
    ],
  },
];

export default MenuItems;
