'use client';

import { Card, Badge } from '@edro/ui';
import { RefreshCw, Calendar } from 'lucide-react';

const sessions = [
  { id: 'REV-304', topic: 'Direito Constitucional', retention: 82, date: '2025-01-14' },
  { id: 'REV-301', topic: 'Portuguese', retention: 76, date: '2025-01-12' },
  { id: 'REV-298', topic: 'Raciocinio Logico', retention: 69, date: '2025-01-09' },
];

const retentionVariant = (value: number) => {
  if (value >= 80) return 'success';
  if (value >= 70) return 'warning';
  return 'gray';
};

export default function HistoricoRevisoesPage() {
  return (
    <div className="container mx-auto px-6 py-8 max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <RefreshCw className="h-7 w-7 text-primary-600" />
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Historico de revisoes</h1>
          <p className="text-slate-600">Sessao de revisao e retencao.</p>
        </div>
      </div>

      <div className="space-y-3">
        {sessions.map((session) => (
          <Card key={session.id} className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">{session.topic}</p>
              <p className="text-xs text-slate-500">{session.id}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xs text-slate-500 flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {session.date}
              </div>
              <Badge variant={retentionVariant(session.retention)}>{session.retention}%</Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}