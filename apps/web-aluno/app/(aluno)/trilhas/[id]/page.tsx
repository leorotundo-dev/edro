'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, Badge, Button } from '@edro/ui';
import { MapPin, ArrowLeft, PlayCircle } from 'lucide-react';

const modules = [
  { id: 'mod-1', title: 'Introducao', status: 'concluido' },
  { id: 'mod-2', title: 'Revisao guiada', status: 'em progresso' },
  { id: 'mod-3', title: 'Simulado final', status: 'pendente' },
];

const statusVariant = (status: string) => {
  if (status === 'concluido') return 'success';
  if (status === 'em progresso') return 'warning';
  return 'gray';
};

export default function TrilhaDetailPage() {
  const params = useParams();
  const trilhaId = params?.id as string;

  return (
    <div className="container mx-auto px-6 py-8 max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MapPin className="h-7 w-7 text-primary-600" />
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Trilha {trilhaId}</h1>
            <p className="text-slate-600">Detalhes e etapas da trilha.</p>
          </div>
        </div>
        <Link href="/trilhas" className="inline-flex">
          <Button size="sm" variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </Link>
      </div>

      <Card className="p-4 space-y-3">
        <h3 className="text-lg font-semibold text-slate-900">Etapas</h3>
        <div className="space-y-2">
          {modules.map((module) => (
            <div key={module.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
              <span className="text-sm text-slate-700">{module.title}</span>
              <Badge variant={statusVariant(module.status)}>{module.status}</Badge>
            </div>
          ))}
        </div>
        <Button>
          <PlayCircle className="h-4 w-4 mr-2" />
          Iniciar etapa atual
        </Button>
      </Card>
    </div>
  );
}