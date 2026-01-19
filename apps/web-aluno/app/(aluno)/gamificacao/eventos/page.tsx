'use client';

import { Card, Badge, Button } from '@edro/ui';
import { Calendar, Rocket } from 'lucide-react';

const events = [
  { id: 'e1', title: 'Semana Turbo', status: 'ativo', endsAt: '2025-01-20' },
  { id: 'e2', title: 'Desafio Bancas', status: 'inscrito', endsAt: '2025-01-28' },
  { id: 'e3', title: 'Sprint 7 dias', status: 'aberto', endsAt: '2025-02-02' },
];

const statusVariant = (status: string) => {
  if (status === 'inscrito') return 'success';
  if (status === 'ativo') return 'warning';
  return 'gray';
};

export default function GamificacaoEventosPage() {
  return (
    <div className="container mx-auto px-6 py-8 max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <Calendar className="h-7 w-7 text-primary-600" />
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Eventos</h1>
          <p className="text-slate-600">Participe de desafios por tempo limitado.</p>
        </div>
      </div>

      <div className="space-y-3">
        {events.map((event) => (
          <Card key={event.id} className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">{event.title}</p>
              <p className="text-xs text-slate-500">Termina em {event.endsAt}</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={statusVariant(event.status)}>{event.status}</Badge>
              <Button size="sm" variant="outline">
                <Rocket className="h-4 w-4 mr-2" />
                Participar
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}