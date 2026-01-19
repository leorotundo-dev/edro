'use client';

import { Card, Badge, Button } from '@edro/ui';
import { Folder, Star } from 'lucide-react';

const packs = [
  { id: 'COL-201', title: 'Revisao Semana 1', items: 24, focus: 'SRS' },
  { id: 'COL-188', title: 'Turbo Constitucional', items: 40, focus: 'Drops' },
  { id: 'COL-171', title: 'Simulados de Banca', items: 6, focus: 'Simulados' },
];

export default function BibliotecaColecoesPage() {
  return (
    <div className="container mx-auto px-6 py-8 max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <Folder className="h-7 w-7 text-primary-600" />
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Colecoes</h1>
          <p className="text-slate-600">Pacotes prontos para acelerar o estudo.</p>
        </div>
      </div>

      <div className="space-y-3">
        {packs.map((pack) => (
          <Card key={pack.id} className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">{pack.title}</p>
              <p className="text-xs text-slate-500">{pack.items} itens</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="primary">
                <Star className="h-3 w-3 mr-1" />
                {pack.focus}
              </Badge>
              <Button size="sm" variant="outline">Abrir</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}