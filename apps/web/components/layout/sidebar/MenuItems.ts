import {
  IconLayoutDashboard,
  IconUsers,
  IconCalendar,
  IconPalette,
  IconShieldCheck,
  IconCurrencyDollar,
  IconUsersGroup,
  IconUserCircle,
  IconInbox,
  IconReportAnalytics,
  IconAlertSquare,
  IconCalendarStats,
  IconFileTypePdf,
  IconHeartbeat,
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
        id: 'operacoes',
        title: 'Operações',
        icon: IconLayoutDashboard,
        href: '/admin/operacoes',
      },
      {
        id: 'clients',
        title: 'Clientes',
        icon: IconUsers,
        href: '/clients',
      },
      {
        id: 'solicitacoes',
        title: 'Solicitações',
        icon: IconInbox,
        href: '/admin/solicitacoes',
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
        id: 'studio',
        title: 'Studio',
        icon: IconPalette,
        href: '/studio',
      },
      {
        id: 'minha-area',
        title: 'Minha Área',
        icon: IconUserCircle,
        href: '/minha-area',
      },
    ],
  },
  {
    subheader: 'Agência',
    requiredGroupRole: ['admin', 'manager'],
    items: [
      {
        id: 'painel-executivo',
        title: 'Painel Executivo',
        icon: IconReportAnalytics,
        href: '/admin/relatorios/painel',
      },
      {
        id: 'fila-de-acao',
        title: 'Fila de Ação',
        icon: IconAlertSquare,
        href: '/admin/relatorios/fila',
      },
      {
        id: 'diario',
        title: 'Diário',
        icon: IconCalendarStats,
        href: '/admin/diario',
      },
      {
        id: 'financeiro',
        title: 'Financeiro',
        icon: IconCurrencyDollar,
        href: '/admin/financeiro',
      },
      {
        id: 'relatorios-mensais',
        title: 'Relatórios',
        icon: IconFileTypePdf,
        href: '/admin/relatorios',
      },
      {
        id: 'equipe',
        title: 'Equipe',
        icon: IconUsersGroup,
        href: '/admin/equipe',
      },
      {
        id: 'admin-system',
        title: 'Admin',
        icon: IconHeartbeat,
        href: '/admin/controle',
        requiredRole: ['admin'],
      },
      {
        id: 'system-admin',
        title: 'System',
        icon: IconShieldCheck,
        href: '/admin/system',
        requiredRole: ['admin'],
      },
    ],
  },
];

export default MenuItems;
