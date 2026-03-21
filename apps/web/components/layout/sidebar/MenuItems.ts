import {
  IconHome,
  IconLayoutDashboard,
  IconLayoutKanban,
  IconUsers,
  IconCalendar,
  IconPalette,
  IconShieldCheck,
  IconCurrencyDollar,
  IconUsersGroup,
  IconReceipt2,
  IconPhoto,
  IconBrandWhatsapp,
  IconSparkles,
  IconAddressBook,
  IconCheckbox,
  IconShoppingBag,
  IconHeartHandshake,
  IconStarFilled,
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
  requiredRole?: string[];
};

export type MenuGroupType = {
  subheader: string;
  items: MenuItemType[];
  requiredGroupRole?: string[];
};

const MenuItems: MenuGroupType[] = [
  {
    subheader: 'Operações',
    items: [
      {
        id: 'home',
        title: 'Home',
        icon: IconHome,
        href: '/',
      },
      {
        id: 'operacoes',
        title: 'Jobs',
        icon: IconLayoutDashboard,
        href: '/admin/operacoes',
      },
      {
        id: 'homologacao',
        title: 'Homologação',
        icon: IconCheckbox,
        href: '/admin/operacoes/homologacao',
        requiredRole: ['admin', 'manager'],
      },
      {
        id: 'pool',
        title: 'Mercado de Escopos',
        icon: IconShoppingBag,
        href: '/admin/operacoes/pool',
        requiredRole: ['admin', 'manager'],
      },
      {
        id: 'projetos',
        title: 'Projetos',
        icon: IconLayoutKanban,
        href: '/projetos',
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
    subheader: 'Clientes',
    items: [
      {
        id: 'clients',
        title: 'Clientes',
        icon: IconUsers,
        href: '/clients',
      },
      {
        id: 'comunicacoes',
        title: 'Comunicações',
        icon: IconBrandWhatsapp,
        href: '/comunicacoes',
      },
      {
        id: 'pessoas',
        title: 'Pessoas',
        icon: IconAddressBook,
        href: '/admin/pessoas',
      },
    ],
  },
  {
    subheader: 'Criativo',
    items: [
      {
        id: 'studio',
        title: 'Studio',
        icon: IconPalette,
        href: '/studio',
      },
      {
        id: 'canvas',
        title: 'Canvas',
        icon: IconSparkles,
        href: '/studio/canvas',
        badge: 'New',
        badgeColor: 'warning',
      },
      {
        id: 'biblioteca',
        title: 'Biblioteca',
        icon: IconPhoto,
        href: '/studio/biblioteca',
      },
    ],
  },
  {
    subheader: 'Agência',
    requiredGroupRole: ['admin', 'manager'],
    items: [
      {
        id: 'financeiro',
        title: 'Financeiro',
        icon: IconCurrencyDollar,
        href: '/financeiro',
      },
      {
        id: 'pagamentos',
        title: 'Pagamentos',
        icon: IconReceipt2,
        href: '/admin/pagamentos',
      },
      {
        id: 'equipe',
        title: 'Equipe',
        icon: IconUsersGroup,
        href: '/admin/equipe',
      },
      {
        id: 'parceiros',
        title: 'Parceiros',
        icon: IconHeartHandshake,
        href: '/admin/parceiros',
        requiredRole: ['admin', 'manager'],
      },
      {
        id: 'briefing-ratings',
        title: 'Avaliações',
        icon: IconStarFilled,
        href: '/admin/analytics/briefing-ratings',
        requiredRole: ['admin', 'manager'],
      },
      {
        id: 'configuracoes',
        title: 'Configurações',
        icon: IconSettings,
        href: '/admin/configuracoes',
        requiredRole: ['admin'],
      },
      {
        id: 'admin-system',
        title: 'Admin',
        icon: IconShieldCheck,
        href: '/admin/system',
        requiredRole: ['admin'],
      },
    ],
  },
];

export default MenuItems;
