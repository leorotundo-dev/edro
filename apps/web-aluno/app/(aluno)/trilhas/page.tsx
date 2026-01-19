'use client';

import Link from 'next/link';
import { Card, Badge, Button } from '@edro/ui';
import { Map } from 'lucide-react';

const trilhas = [
  { id: 'trilha-1', title: 'Trilha Constitucional', progress: 45, status: 'em progresso' },
  { id: 'trilha-2', title: 'Trilha Administrativo', progress: 70, status: 'em progresso' },
  { id: 'trilha-3', title: 'Trilha Portugues', progress: 100, status: 'concluida' },
];

const statusVariant = (status: string) => {
  if (status === 'concluida') return 'success';
  if (status === 'em progresso') return 'warning';
  return 'gray';
};

export default function TrilhasPage() {
  return (
    <div className="container mx-auto px-6 py-8 max-w-6xl space-y-6">
      <div className="flex items-center gap-3">
        <Map className="h-7 w-7 text-primary-600" />
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Trilhas</h1>
          <p className="text-slate-600">Sequencias personalizadas de estudo.</p>
        </div>
      </div>

      <div className="space-y-3">
        {trilhas.map((trilha) => (
          <Card key={trilha.id} className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">{trilha.title}</p>
              <p className="text-xs text-slate-500">Progresso {trilha.progress}%</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={statusVariant(trilha.status)}>{trilha.status}</Badge>
              <Link href={`/trilhas/${trilha.id}`} className="inline-flex">
                <Button size="sm" variant="outline">Abrir</Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}