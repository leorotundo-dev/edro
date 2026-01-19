'use client';

import { Card, Badge, Button } from '@edro/ui';
import { BookOpen, Tag } from 'lucide-react';

const drops = [
  { id: 'DRP-201', title: 'Direito Constitucional', level: 'N2', tags: ['direito', 'basico'] },
  { id: 'DRP-180', title: 'Portuguese - Crase', level: 'N3', tags: ['lingua', 'revisao'] },
  { id: 'DRP-162', title: 'Raciocinio Logico', level: 'N1', tags: ['logica', 'fundamentos'] },
];

export default function BibliotecaDropsPage() {
  return (
    <div className="container mx-auto px-6 py-8 max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <BookOpen className="h-7 w-7 text-primary-600" />
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Drops</h1>
          <p className="text-slate-600">Resumo rapido para revisao.</p>
        </div>
      </div>

      <div className="space-y-3">
        {drops.map((drop) => (
          <Card key={drop.id} className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">{drop.title}</p>
              <p className="text-xs text-slate-500">{drop.id}</p>
              <div className="flex gap-2 mt-2">
                {drop.tags.map((tag) => (
                  <Badge key={tag} variant="gray">
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="primary">{drop.level}</Badge>
              <Button size="sm" variant="outline">Abrir</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}