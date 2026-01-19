'use client';

import { useState } from 'react';
import { Card, Button } from '@edro/ui';
import { User, ArrowRight } from 'lucide-react';

export default function OnboardingPerfilPage() {
  const [name, setName] = useState('');
  const [exam, setExam] = useState('');
  const [board, setBoard] = useState('');

  return (
    <div className="container mx-auto px-6 py-8 max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <User className="h-7 w-7 text-primary-600" />
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Perfil inicial</h1>
          <p className="text-slate-600">Informe dados basicos para personalizar a jornada.</p>
        </div>
      </div>

      <Card className="p-4 space-y-4">
        <label className="text-sm text-slate-600 space-y-2">
          Nome
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome"
          />
        </label>
        <label className="text-sm text-slate-600 space-y-2">
          Cargo ou area
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={exam}
            onChange={(e) => setExam(e.target.value)}
            placeholder="Ex: Analista Judiciario"
          />
        </label>
        <label className="text-sm text-slate-600 space-y-2">
          Banca preferida
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={board}
            onChange={(e) => setBoard(e.target.value)}
            placeholder="Ex: CEBRASPE"
          />
        </label>
        <Button>
          <ArrowRight className="h-4 w-4 mr-2" />
          Avancar
        </Button>
      </Card>
    </div>
  );
}