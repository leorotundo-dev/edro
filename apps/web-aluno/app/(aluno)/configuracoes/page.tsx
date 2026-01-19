'use client';

import Link from 'next/link';
import { Card, Button, Badge } from '@edro/ui';
import { Settings, User, Shield, Bell, CreditCard, FileText, Wallet, Star } from 'lucide-react';

const sections = [
  {
    title: 'Conta',
    description: 'Dados pessoais, email e idioma',
    href: '/configuracoes/conta',
    badge: 'Perfil',
    icon: User,
  },
  {
    title: 'Seguranca',
    description: 'Senha, 2FA e dispositivos',
    href: '/configuracoes/seguranca',
    badge: 'Protecao',
    icon: Shield,
  },
  {
    title: 'Notificacoes',
    description: 'Canais e limites de alerta',
    href: '/configuracoes/notificacoes',
    badge: 'Alertas',
    icon: Bell,
  },
  {
    title: 'Planos',
    description: 'Comparacao de beneficios',
    href: '/configuracoes/planos',
    badge: 'Planos',
    icon: Star,
  },
  {
    title: 'Assinatura',
    description: 'Status, renovacao e pausa',
    href: '/configuracoes/assinatura',
    badge: 'Cobranca',
    icon: Wallet,
  },
  {
    title: 'Metodo de pagamento',
    description: 'Cartoes e formas salvas',
    href: '/configuracoes/metodo-pagamento',
    badge: 'Pagamento',
    icon: CreditCard,
  },
  {
    title: 'Faturamento',
    description: 'Notas e historico de cobranca',
    href: '/configuracoes/faturamento',
    badge: 'Faturas',
    icon: FileText,
  },
];

export default function ConfiguracoesPage() {
  return (
    <div className="container mx-auto px-6 py-8 max-w-6xl space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-7 w-7 text-primary-600" />
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Configuracoes</h1>
          <p className="text-slate-600">Ajustes da conta, cobranca e preferencias.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.title} className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary-50 p-2">
                  <Icon className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{section.title}</p>
                  <p className="text-xs text-slate-500">{section.description}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Badge variant="gray">{section.badge}</Badge>
                <Link href={section.href} className="inline-flex">
                  <Button size="sm" variant="outline">Abrir</Button>
                </Link>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}