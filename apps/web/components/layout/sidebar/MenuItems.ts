import {
  IconHome,
  IconClipboardList,
  IconUsers,
  IconCalendar,
  IconLayoutKanban,
  IconPalette,
  IconShieldCheck,
  IconCurrencyDollar,
  IconUsersGroup,
  IconReceipt2,
  IconPhoto,
  IconRobot,
  IconBrandWhatsapp,
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
        id: 'jarvis',
        title: 'Jarvis Propostas',
        icon: IconRobot,
        href: '/edro/jarvis',
      },
      {
        id: 'clients',
        title: 'Clientes',
        icon: IconUsers,
        href: '/clients',
      },
      {
        id: 'whatsapp',
        title: 'WhatsApp',
        icon: IconBrandWhatsapp,
        href: '/whatsapp',
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
    subheader: 'Criativo',
    items: [
      {
        id: 'studio',
        title: 'Creative Studio',
        icon: IconPalette,
        href: '/studio',
      },
      {
        id: 'biblioteca',
        title: 'Biblioteca de Peças',
        icon: IconPhoto,
        href: '/studio/biblioteca',
      },
    ],
  },
  {
    subheader: 'Financeiro',
    requiredGroupRole: ['admin', 'manager'],
    items: [
      {
        id: 'financeiro',
        title: 'Financeiro',
        icon: IconCurrencyDollar,
        href: '/financeiro',
      },
      {
        id: 'equipe',
        title: 'Equipe',
        icon: IconUsersGroup,
        href: '/admin/equipe',
      },
      {
        id: 'pagamentos',
        title: 'Pagamentos',
        icon: IconReceipt2,
        href: '/admin/pagamentos',
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
