'use client';

import { Card, Button, Badge } from '@edro/ui';
import { Clipboard, PlayCircle } from 'lucide-react';

const checklist = [
  'Responder 10 questoes iniciais',
  'Avaliar ritmo de leitura',
  'Identificar pontos fortes',
  'Mapear lacunas principais',
];

export default function OnboardingDiagnosticoPage() {
  return (
    <div className="container mx-auto px-6 py-8 max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <Clipboard className="h-7 w-7 text-primary-600" />
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Diagnostico inicial</h1>
          <p className="text-slate-600">Uma avaliacao rapida para ajustar a trilha.</p>
        </div>
      </div>

      <Card className="p-4 space-y-4">
        <h3 className="text-lg font-semibold text-slate-900">O que vamos medir</h3>
        <ul className="space-y-2 text-sm text-slate-600">
          {checklist.map((item) => (
            <li key={item}>- {item}</li>
          ))}
        </ul>
        <div className="flex items-center justify-between">
          <Badge variant="warning">Tempo estimado: 12 min</Badge>
          <Button>
            <PlayCircle className="h-4 w-4 mr-2" />
            Iniciar diagnostico
          </Button>
        </div>
      </Card>
    </div>
  );
}