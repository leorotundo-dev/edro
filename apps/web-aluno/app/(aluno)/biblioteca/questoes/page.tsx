'use client';

import { Card, Badge, Button } from '@edro/ui';
import { CheckSquare, Filter } from 'lucide-react';

const collections = [
  { id: 'QST-110', title: 'Banco FCC - Administrativo', items: 120, difficulty: 'medio' },
  { id: 'QST-101', title: 'CEBRASPE - Constitucional', items: 80, difficulty: 'alto' },
  { id: 'QST-095', title: 'FGV - Portugues', items: 60, difficulty: 'medio' },
];

export default function BibliotecaQuestoesPage() {
  return (
    <div className="container mx-auto px-6 py-8 max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <CheckSquare className="h-7 w-7 text-primary-600" />
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Colecoes de questoes</h1>
          <p className="text-slate-600">Listas prontas para treino intensivo.</p>
        </div>
      </div>

      <div className="space-y-3">
        {collections.map((item) => (
          <Card key={item.id} className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">{item.title}</p>
              <p className="text-xs text-slate-500">{item.items} questoes</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="gray">
                <Filter className="h-3 w-3 mr-1" />
                {item.difficulty}
              </Badge>
              <Button size="sm" variant="outline">Abrir</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}