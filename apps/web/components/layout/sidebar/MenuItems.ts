import {
  IconHome,
  IconClipboardList,
  IconUsers,
  IconCalendar,
  IconLayoutKanban,
  IconPalette,
  IconShieldCheck,
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
    ],
  },
];

export default MenuItems;
