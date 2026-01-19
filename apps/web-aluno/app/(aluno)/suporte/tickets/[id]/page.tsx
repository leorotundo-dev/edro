'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, Button, Badge } from '@edro/ui';
import { MessageSquare, ArrowLeft, Send } from 'lucide-react';

const messages = [
  { id: 'msg-1', author: 'Aluno', text: 'Tenho problema para enviar um drop.', time: 'Hoje 08:44' },
  { id: 'msg-2', author: 'Suporte', text: 'Vamos analisar. Pode enviar o print?', time: 'Hoje 09:01' },
];

export default function SuporteTicketDetailPage() {
  const params = useParams();
  const ticketId = params?.id as string;

  return (
    <div className="container mx-auto px-6 py-8 max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-7 w-7 text-primary-600" />
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Ticket {ticketId}</h1>
            <p className="text-slate-600">Atualizacao e historico da conversa.</p>
          </div>
        </div>
        <Link href="/suporte/tickets" className="inline-flex">
          <Button size="sm" variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </Link>
      </div>

      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-900">Status</p>
          <Badge variant="warning">Em analise</Badge>
        </div>
        <div className="space-y-3">
          {messages.map((msg) => (
            <div key={msg.id} className="rounded-lg border border-slate-100 px-3 py-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">{msg.author}</p>
                <span className="text-xs text-slate-400">{msg.time}</span>
              </div>
              <p className="text-sm text-slate-600">{msg.text}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <input
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Escreva sua mensagem"
          />
          <Button size="sm">
            <Send className="h-4 w-4 mr-2" />
            Enviar
          </Button>
        </div>
      </Card>
    </div>
  );
}