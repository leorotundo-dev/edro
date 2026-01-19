'use client';

import { Card, Badge, Button } from '@edro/ui';
import { Users, PlusCircle } from 'lucide-react';

const clans = [
  { id: 'c1', name: 'Feras da Prova', members: 24, focus: 'Jurisdicao' },
  { id: 'c2', name: 'Time SRS', members: 18, focus: 'Revisao diaria' },
  { id: 'c3', name: 'Turbo Night', members: 32, focus: 'Simulados' },
];

export default function GamificacaoClansPage() {
  return (
    <div className="container mx-auto px-6 py-8 max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-7 w-7 text-primary-600" />
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Clans</h1>
            <p className="text-slate-600">Encontre grupos com objetivos parecidos.</p>
          </div>
        </div>
        <Button size="sm">
          <PlusCircle className="h-4 w-4 mr-2" />
          Criar clan
        </Button>
      </div>

      <div className="space-y-3">
        {clans.map((clan) => (
          <Card key={clan.id} className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">{clan.name}</p>
              <p className="text-xs text-slate-500">{clan.members} membros</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="gray">{clan.focus}</Badge>
              <Button size="sm" variant="outline">Entrar</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}