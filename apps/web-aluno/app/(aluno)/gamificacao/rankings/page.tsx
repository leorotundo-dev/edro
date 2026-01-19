'use client';

import { Card, Badge, Button } from '@edro/ui';
import { Trophy, Users } from 'lucide-react';

const ranking = [
  { id: 'u1', name: 'Ana', xp: 1280 },
  { id: 'u2', name: 'Carlos', xp: 1190 },
  { id: 'u3', name: 'Beatriz', xp: 1125 },
];

const clanRanking = [
  { id: 'c1', name: 'Feras da Prova', xp: 5420 },
  { id: 'c2', name: 'Equipe Turbo', xp: 4980 },
  { id: 'c3', name: 'Time SRS', xp: 4300 },
];

export default function GamificacaoRankingsPage() {
  return (
    <div className="container mx-auto px-6 py-8 max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <Trophy className="h-7 w-7 text-primary-600" />
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Rankings</h1>
          <p className="text-slate-600">Melhores colocacoes do periodo.</p>
        </div>
      </div>

      <Card className="p-4 space-y-3">
        <h3 className="text-lg font-semibold text-slate-900">Ranking geral</h3>
        {ranking.map((entry, index) => (
          <div key={entry.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
            <span className="text-sm text-slate-700">#{index + 1} {entry.name}</span>
            <Badge variant="primary">{entry.xp} XP</Badge>
          </div>
        ))}
      </Card>

      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-slate-900">Ranking de clans</h3>
        </div>
        {clanRanking.map((entry, index) => (
          <div key={entry.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
            <span className="text-sm text-slate-700">#{index + 1} {entry.name}</span>
            <Badge variant="gray">{entry.xp} XP</Badge>
          </div>
        ))}
        <Button size="sm" variant="outline">Ver ranking completo</Button>
      </Card>
    </div>
  );
}