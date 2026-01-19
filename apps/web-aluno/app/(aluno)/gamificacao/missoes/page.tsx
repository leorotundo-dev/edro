'use client';

import { Card, Badge, Button } from '@edro/ui';
import { Flag, CheckCircle } from 'lucide-react';

const missions = [
  { id: 'm1', title: 'Revisar 20 drops', progress: '12/20', status: 'em progresso' },
  { id: 'm2', title: 'Completar 1 simulado', progress: '1/1', status: 'concluido' },
  { id: 'm3', title: 'Responder 50 questoes', progress: '20/50', status: 'em progresso' },
];

const statusVariant = (status: string) => {
  if (status === 'concluido') return 'success';
  if (status === 'em progresso') return 'warning';
  return 'gray';
};

export default function GamificacaoMissoesPage() {
  return (
    <div className="container mx-auto px-6 py-8 max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <Flag className="h-7 w-7 text-primary-600" />
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Missoes</h1>
          <p className="text-slate-600">Tarefas diarias e semanais.</p>
        </div>
      </div>

      <div className="space-y-3">
        {missions.map((mission) => (
          <Card key={mission.id} className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">{mission.title}</p>
              <p className="text-xs text-slate-500">{mission.progress}</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={statusVariant(mission.status)}>{mission.status}</Badge>
              {mission.status === 'concluido' && (
                <CheckCircle className="h-4 w-4 text-green-600" />
              )}
            </div>
          </Card>
        ))}
      </div>
      <Button size="sm" variant="outline">Ver historico</Button>
    </div>
  );
}