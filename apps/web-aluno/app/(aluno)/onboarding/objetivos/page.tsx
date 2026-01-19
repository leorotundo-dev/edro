'use client';

import { useState } from 'react';
import { Card, Button, Badge } from '@edro/ui';
import { Target, ArrowRight } from 'lucide-react';

const goalOptions = [
  { id: 'aprovacao', label: 'Aprovacao rapida' },
  { id: 'constancia', label: 'Consistencia diaria' },
  { id: 'velocidade', label: 'Velocidade em questoes' },
  { id: 'memoria', label: 'Memoria de longo prazo' },
];

export default function OnboardingObjetivosPage() {
  const [selected, setSelected] = useState<string[]>(['aprovacao']);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="container mx-auto px-6 py-8 max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <Target className="h-7 w-7 text-primary-600" />
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Objetivos</h1>
          <p className="text-slate-600">Escolha suas prioridades de estudo.</p>
        </div>
      </div>

      <Card className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {goalOptions.map((goal) => (
            <label key={goal.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm text-slate-700">
              <span>{goal.label}</span>
              <input
                type="checkbox"
                checked={selected.includes(goal.id)}
                onChange={() => toggle(goal.id)}
              />
            </label>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <Badge variant="gray">{selected.length} selecionados</Badge>
          <Button>
            <ArrowRight className="h-4 w-4 mr-2" />
            Avancar
          </Button>
        </div>
      </Card>
    </div>
  );
}