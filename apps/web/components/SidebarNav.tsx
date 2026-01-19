'use client';

import Link from "next/link";
import { Button, Card } from "@heroui/react";
import clsx from "clsx";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Droplet,
  BookOpen,
  Database,
  Download,
  Globe,
  FileText,
  HelpCircle,
  ClipboardList,
  Sparkles,
  BarChart3,
  Users,
  DollarSign
} from "lucide-react";

interface SidebarSection {
  title: string;
  items: Array<{
    href: string;
    label: string;
    icon: LucideIcon;
  }>;
}

const sections: SidebarSection[] = [
  {
    title: "Principal",
    items: [{ href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard }]
  },
  {
    title: "Conteúdo",
    items: [
      { href: "/admin/drops", label: "Drops", icon: Droplet },
      { href: "/admin/blueprints", label: "Blueprints", icon: BookOpen },
      { href: "/admin/rag", label: "RAG Blocks", icon: Database },
      { href: "/admin/harvest", label: "Harvest", icon: Download },
      { href: "/admin/scrapers", label: "Scrapers", icon: Globe }
    ]
  },
  {
    title: "Avaliação",
    items: [
      { href: "/admin/editais", label: "Editais", icon: FileText },
      { href: "/admin/questoes", label: "Questões", icon: HelpCircle },
      { href: "/admin/simulados", label: "Simulados", icon: ClipboardList }
    ]
  },
  {
    title: "Sistema",
    items: [
      { href: "/admin/recco-engine", label: "Recco Engine", icon: Sparkles },
      { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/admin/users", label: "Usuários", icon: Users }
    ]
  },
  {
    title: "Financeiro",
    items: [
      { href: "/admin/payments", label: "Pagamentos", icon: DollarSign },
      { href: "/admin/costs", label: "Custos", icon: DollarSign }
    ]
  }
];

interface SidebarNavProps {
  currentPath: string;
  onNavigate?: () => void;
}

export function SidebarNav({ currentPath, onNavigate }: SidebarNavProps) {
  return (
    <div className="flex h-full flex-col rounded-r-xl border-r border-slate-100 bg-white px-3 py-4 shadow-[4px_0_18px_rgba(15,23,42,0.08)]">
      <div className="flex-1 space-y-5 overflow-y-auto pr-1">
        {sections.map((section) => (
          <div key={section.title} className="space-y-2">
            <p className="px-3 text-[0.55rem] font-semibold uppercase tracking-[0.28em] text-slate-400">
              {section.title}
            </p>
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive =
                  currentPath === item.href || currentPath.startsWith(`${item.href}/`);
                const Icon = item.icon;

                return (
                  <Button
                    key={item.href}
                    as={Link}
                    href={item.href}
                    size="sm"
                    variant={isActive ? "solid" : "light"}
                    color={isActive ? "primary" : "default"}
                    radius="full"
                    startContent={
                      <Icon
                        className={clsx(
                          "h-4 w-4",
                          isActive ? "text-white" : "text-default-400"
                        )}
                      />
                    }
                    className={clsx(
                      "h-8 w-full justify-start gap-2.5 text-[13px] font-semibold transition-all duration-200",
                      isActive
                        ? "bg-gradient-to-r from-primary-500 to-primary-400 text-white shadow-md shadow-primary-200/60"
                        : "text-default-600 hover:text-default-900"
                    )}
                    onPress={() => onNavigate?.()}
                  >
                    {item.label}
                  </Button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <Card className="mt-4 border-none bg-gradient-to-r from-primary-50 to-indigo-50 p-3 shadow-none">
        <div>
          <p className="text-[11px] font-semibold text-primary-700">Edro v1.0</p>
          <p className="text-[10px] text-primary-500">Painel Administrativo</p>
        </div>
      </Card>
    </div>
  );
}
