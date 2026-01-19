'use client';

import Link from 'next/link';
import { Card, Button, Badge } from '@edro/ui';
import { HelpCircle, MessageSquare, Mail } from 'lucide-react';

export default function SuportePage() {
  return (
    <div className="container mx-auto px-6 py-8 max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <HelpCircle className="h-7 w-7 text-primary-600" />
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Suporte</h1>
          <p className="text-slate-600">Ajuda rapida e abertura de chamados.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary-600" />
            <h3 className="text-lg font-semibold text-slate-900">FAQ</h3>
          </div>
          <p className="text-sm text-slate-600">Respostas para as duvidas mais comuns.</p>
          <Link href="/suporte/faq" className="inline-flex">
            <Button size="sm" variant="outline">Ver FAQ</Button>
          </Link>
        </Card>

        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary-600" />
            <h3 className="text-lg font-semibold text-slate-900">Tickets</h3>
          </div>
          <p className="text-sm text-slate-600">Acompanhe solicitacoes e respostas.</p>
          <Link href="/suporte/tickets" className="inline-flex">
            <Button size="sm" variant="outline">Abrir tickets</Button>
          </Link>
        </Card>
      </div>

      <Card className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Mail className="h-5 w-5 text-primary-600" />
          <div>
            <p className="text-sm font-semibold text-slate-900">Contato direto</p>
            <p className="text-xs text-slate-500">suporte@edro.digital</p>
          </div>
        </div>
        <Badge variant="gray">Resposta em ate 24h</Badge>
      </Card>
    </div>
  );
}