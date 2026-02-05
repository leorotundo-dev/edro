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
} from '@tabler/icons-react';
import type { ComponentType } from 'react';

export type MenuItemType = {
  id: string;
  title: string;
  icon: ComponentType<{ size?: number; stroke?: number }>;
  href: string;
  badge?: string;
  badgeColor?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
};

export type MenuGroupType = {
  subheader: string;
  items: MenuItemType[];
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
        id: 'social',
        title: 'Social Listening',
        icon: IconShare,
        href: '/social-listening',
      },
    ],
  },
  {
    subheader: 'Admin',
    items: [
      {
        id: 'admin-system',
        title: 'System Admin',
        icon: IconShieldCheck,
        href: '/admin/system',
      },
      {
        id: 'admin-import',
        title: 'Import Events',
        icon: IconUpload,
        href: '/admin/events/import',
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
