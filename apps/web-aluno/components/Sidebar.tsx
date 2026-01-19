"use client";

import Link from 'next/link';
import { forwardRef, type ComponentType } from 'react';
import {
  Sidebar as SidebarPrimitive,
  type LinkComponentProps,
  type NavSection
} from '@edro/ui';
import {
  Home,
  Calendar,
  HelpCircle,
  FileText,
  BookOpen,
  Map,
  History,
  Brain,
  RotateCcw,
  BarChart3,
  User,
  Settings,
  Trophy,
  Bell,
  ScrollText,
  Sparkles,
  LifeBuoy,
  Compass,
  LogOut
} from 'lucide-react';
import { useAuth } from '@/lib/hooks';

type NavItemConfig = {
  name: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
};

export const alunoNavigation: NavItemConfig[] = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Plano Diario', href: '/plano-diario', icon: Calendar },
  { name: 'Questoes', href: '/questoes', icon: HelpCircle },
  { name: 'Simulados', href: '/simulados', icon: FileText },
  { name: 'Tutor IA', href: '/tutor', icon: Sparkles },
  { name: 'Gamificacao', href: '/gamificacao', icon: Trophy },
  { name: 'Notificacoes', href: '/notificacoes', icon: Bell },
  { name: 'Perfil', href: '/perfil', icon: User }
];

const studyNavigation: NavItemConfig[] = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Plano Diario', href: '/plano-diario', icon: Calendar },
  { name: 'Trilhas', href: '/trilhas', icon: Map },
  { name: 'Biblioteca', href: '/biblioteca', icon: BookOpen },
  { name: 'Historico', href: '/historico', icon: History }
];

const practiceNavigation: NavItemConfig[] = [
  { name: 'Questoes', href: '/questoes', icon: HelpCircle },
  { name: 'Simulados', href: '/simulados', icon: FileText },
  { name: 'Revisao SRS', href: '/revisao', icon: RotateCcw },
  { name: 'Tutor IA', href: '/tutor', icon: Sparkles },
  { name: 'Mnemonicos', href: '/mnemonicos', icon: Brain }
];

const progressNavigation: NavItemConfig[] = [
  { name: 'Progresso', href: '/progresso', icon: BarChart3 },
  { name: 'Gamificacao', href: '/gamificacao', icon: Trophy },
  { name: 'Notificacoes', href: '/notificacoes', icon: Bell },
  { name: 'Editais', href: '/editais', icon: ScrollText }
];

const accountNavigation: NavItemConfig[] = [
  { name: 'Perfil', href: '/perfil', icon: User },
  { name: 'Acessibilidade', href: '/acessibilidade', icon: Settings },
  { name: 'Suporte', href: '/suporte', icon: LifeBuoy },
  { name: 'Onboarding', href: '/onboarding', icon: Compass }
];

const toNavItem = (item: NavItemConfig) => ({
  href: item.href,
  label: item.name,
  icon: item.icon
});

const sections: NavSection[] = [
  { title: 'Estudo', items: studyNavigation.map(toNavItem) },
  { title: 'Pratica', items: practiceNavigation.map(toNavItem) },
  { title: 'Progresso', items: progressNavigation.map(toNavItem) },
  { title: 'Conta', items: accountNavigation.map(toNavItem) }
];

const NextLink = forwardRef<HTMLAnchorElement, LinkComponentProps>(
  ({ href, className, children, ...props }, ref) => (
    <Link ref={ref} href={href} className={className} {...props}>
      {children}
    </Link>
  )
);
NextLink.displayName = 'AlunoSidebarLink';

interface StudentSidebarProps {
  currentPath: string;
  onNavigate?: () => void;
}

export function StudentSidebar({ currentPath, onNavigate }: StudentSidebarProps) {
  const { user, logout } = useAuth();

  const header = (
    <div className="space-y-3">
      <div className="text-sm font-semibold text-slate-900">Ola, {user?.name ?? 'Aluno'}</div>
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-100 text-lg font-bold text-primary-700">
          {user?.name?.charAt(0).toUpperCase() ?? 'A'}
        </div>
        <div className="truncate">
          <p className="text-sm font-semibold text-slate-900 truncate">{user?.name ?? 'Usuario'}</p>
          <p className="text-xs text-slate-500 truncate">{user?.email}</p>
        </div>
      </div>
    </div>
  );

  const footer = (
    <div className="space-y-2 text-sm">
      <Link
        href="/configuracoes"
        className="flex items-center gap-3 rounded-xl px-3 py-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
      >
        <Settings className="h-5 w-5" />
        Configuracoes
      </Link>
      <button
        onClick={() => {
          logout();
          onNavigate?.();
        }}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left font-semibold text-danger-600 transition hover:bg-danger-50"
      >
        <LogOut className="h-5 w-5" />
        Sair
      </button>
    </div>
  );

  return (
    <SidebarPrimitive
      sections={sections}
      currentPath={currentPath}
      LinkComponent={NextLink}
      onLinkClick={onNavigate}
      header={header}
      footer={footer}
      className="border-r border-slate-100"
    />
  );
}
