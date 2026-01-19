'use client';

import { Card, Badge } from '@edro/ui';
import { AlertTriangle, TrendingDown } from 'lucide-react';

const errors = [
  { id: 'ERR-01', topic: 'Direito Administrativo', rate: 32 },
  { id: 'ERR-02', topic: 'Financas Publicas', rate: 28 },
  { id: 'ERR-03', topic: 'Portuguese', rate: 24 },
];

const rateVariant = (rate: number) => {
  if (rate >= 30) return 'warning';
  if (rate >= 20) return 'gray';
  return 'success';
};

export default function HistoricoErrosPage() {
  return (
    <div className="container mx-auto px-6 py-8 max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-7 w-7 text-primary-600" />
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Historico de erros</h1>
          <p className="text-slate-600">Topicos que precisam de reforco.</p>
        </div>
      </div>

      <div className="space-y-3">
        {errors.map((item) => (
          <Card key={item.id} className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">{item.topic}</p>
              <p className="text-xs text-slate-500">{item.id}</p>
            </div>
            <div className="flex items-center gap-3">
              <TrendingDown className="h-4 w-4 text-slate-400" />
              <Badge variant={rateVariant(item.rate)}>{item.rate}% erros</Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}