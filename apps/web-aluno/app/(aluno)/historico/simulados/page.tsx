'use client';

import { Card, Badge, Button } from '@edro/ui';
import { BarChart, Calendar } from 'lucide-react';

const items = [
  { id: 'SIM-201', title: 'Simulado CEBRASPE', score: 78, date: '2025-01-12' },
  { id: 'SIM-198', title: 'Simulado FCC', score: 84, date: '2025-01-05' },
  { id: 'SIM-190', title: 'Simulado FGV', score: 72, date: '2024-12-28' },
];

const scoreVariant = (score: number) => {
  if (score >= 85) return 'success';
  if (score >= 70) return 'warning';
  return 'gray';
};

export default function HistoricoSimuladosPage() {
  return (
    <div className="container mx-auto px-6 py-8 max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <BarChart className="h-7 w-7 text-primary-600" />
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Historico de simulados</h1>
          <p className="text-slate-600">Resultados e desempenho recente.</p>
        </div>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <Card key={item.id} className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">{item.title}</p>
              <p className="text-xs text-slate-500">{item.id}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xs text-slate-500 flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {item.date}
              </div>
              <Badge variant={scoreVariant(item.score)}>{item.score}%</Badge>
              <Button size="sm" variant="outline">Detalhes</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}