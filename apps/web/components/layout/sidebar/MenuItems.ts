import {
  IconHome,
  IconLayoutDashboard,
  IconClipboardList,
  IconUsers,
  IconCalendar,
  IconPalette,
  IconShieldCheck,
  IconCurrencyDollar,
  IconUsersGroup,
  IconReceipt2,
  IconPhoto,
  IconRobot,
  IconBrain,
  IconBrandWhatsapp,
  IconMicrophone,
  IconSparkles,
  IconChartBar,
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
        id: 'operacoes',
        title: 'Central de Operações',
        icon: IconLayoutDashboard,
        href: '/admin/operacoes',
        badge: 'Beta',
        badgeColor: 'warning',
      },
      {
        id: 'intelligence',
        title: 'Inteligência IA',
        icon: IconChartBar,
        href: '/admin/intelligence',
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
        id: 'jarvis-chat',
        title: 'Jarvis Chat',
        icon: IconBrain,
        href: '/jarvis',
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
        id: 'reunioes',
        title: 'Reuniões',
        icon: IconMicrophone,
        href: '/admin/reunioes',
      },
      {
        id: 'calendar',
        title: 'Calendário',
        icon: IconCalendar,
        href: '/calendar',
      },
    ],
  },
  {
    subheader: 'Criativo',
    items: [
      {
        id: 'canvas',
        title: 'Canvas',
        icon: IconSparkles,
        href: '/studio/canvas',
        badge: 'New',
        badgeColor: 'warning',
      },
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
