'use client';

import { useState } from 'react';
import { Card, Button, Badge } from '@edro/ui';
import { Clock, ArrowRight } from 'lucide-react';

export default function OnboardingTempoPage() {
  const [hours, setHours] = useState(8);
  const [days, setDays] = useState<string[]>(['seg', 'ter', 'qua']);
  const [period, setPeriod] = useState('noite');

  const toggleDay = (day: string) => {
    setDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  };

  return (
    <div className="container mx-auto px-6 py-8 max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <Clock className="h-7 w-7 text-primary-600" />
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Tempo de estudo</h1>
          <p className="text-slate-600">Defina sua carga horaria semanal.</p>
        </div>
      </div>

      <Card className="p-4 space-y-4">
        <label className="text-sm text-slate-600 space-y-2">
          Horas por semana
          <input
            type="range"
            min={2}
            max={30}
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            className="w-full"
          />
        </label>
        <Badge variant="primary">{hours} horas / semana</Badge>

        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-900">Dias preferidos</p>
          <div className="grid grid-cols-4 gap-2">
            {['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'].map((day) => (
              <label key={day} className="flex items-center justify-between rounded-lg border border-slate-100 px-2 py-1 text-xs text-slate-600">
                {day}
                <input type="checkbox" checked={days.includes(day)} onChange={() => toggleDay(day)} />
              </label>
            ))}
          </div>
        </div>

        <label className="text-sm text-slate-600 space-y-2">
          Periodo favorito
          <select
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="manha">Manha</option>
            <option value="tarde">Tarde</option>
            <option value="noite">Noite</option>
          </select>
        </label>

        <Button>
          <ArrowRight className="h-4 w-4 mr-2" />
          Avancar
        </Button>
      </Card>
    </div>
  );
}