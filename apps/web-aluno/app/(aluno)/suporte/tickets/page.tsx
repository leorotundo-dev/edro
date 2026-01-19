'use client';

import Link from 'next/link';
import { Card, Button, Badge } from '@edro/ui';
import { MessageSquare, PlusCircle } from 'lucide-react';

const tickets = [
  { id: 'TCK-102', title: 'Erro ao gerar drop', status: 'Aberto', updatedAt: 'Hoje 09:12' },
  { id: 'TCK-097', title: 'Divergencia na cobranca', status: 'Em analise', updatedAt: 'Ontem 17:05' },
  { id: 'TCK-090', title: 'Sugestao de melhoria', status: 'Resolvido', updatedAt: '2024-12-20' },
];

const statusVariant = (status: string) => {
  if (status === 'Resolvido') return 'success';
  if (status === 'Em analise') return 'warning';
  return 'gray';
};

export default function SuporteTicketsPage() {
  return (
    <div className="container mx-auto px-6 py-8 max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-7 w-7 text-primary-600" />
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Tickets</h1>
            <p className="text-slate-600">Acompanhe seus chamados.</p>
          </div>
        </div>
        <Button size="sm">
          <PlusCircle className="h-4 w-4 mr-2" />
          Novo ticket
        </Button>
      </div>

      <div className="space-y-3">
        {tickets.map((ticket) => (
          <Card key={ticket.id} className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">{ticket.title}</p>
              <p className="text-xs text-slate-500">{ticket.id} · {ticket.updatedAt}</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={statusVariant(ticket.status)}>{ticket.status}</Badge>
              <Link href={`/suporte/tickets/${ticket.id}`} className="inline-flex">
                <Button size="sm" variant="outline">Detalhes</Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}