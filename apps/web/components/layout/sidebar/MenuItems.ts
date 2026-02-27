import {
  IconHome,
  IconClipboardList,
  IconUsers,
  IconCalendar,
  IconLayoutKanban,
  IconPalette,
  IconShieldCheck,
  IconScissors,
  IconTarget,
  IconBroadcast,
  IconChartPie,
  IconTrendingUp,
  IconFolderOpen,
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
        title: 'Clientes',
        icon: IconUsers,
        href: '/clients',
      },
      {
        id: 'calendar',
        title: 'Calendário',
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
    subheader: 'Inteligência',
    items: [
      {
        id: 'clipping',
        title: 'Clipping',
        icon: IconScissors,
        href: '/clipping',
      },
      {
        id: 'radar',
        title: 'Radar',
        icon: IconTarget,
        href: '/radar',
      },
      {
        id: 'social-listening',
        title: 'Social Listening',
        icon: IconBroadcast,
        href: '/social-listening',
      },
    ],
  },
  {
    subheader: 'Análise',
    items: [
      {
        id: 'insights',
        title: 'Insights',
        icon: IconChartPie,
        href: '/insights',
      },
      {
        id: 'performance',
        title: 'Performance',
        icon: IconTrendingUp,
        href: '/performance',
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
        id: 'library',
        title: 'Biblioteca',
        icon: IconFolderOpen,
        href: '/library',
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
