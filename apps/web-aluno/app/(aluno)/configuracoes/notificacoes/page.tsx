'use client';

import { useState } from 'react';
import { Card, Button, Badge } from '@edro/ui';
import { Bell, Clock, Check } from 'lucide-react';

const initialChannels = [
  { id: 'push', label: 'Push', enabled: true },
  { id: 'email', label: 'Email', enabled: true },
  { id: 'inapp', label: 'In-app', enabled: true },
];

export default function ConfiguracoesNotificacoesPage() {
  const [channels, setChannels] = useState(initialChannels);
  const [quietStart, setQuietStart] = useState('22:00');
  const [quietEnd, setQuietEnd] = useState('07:00');
  const [maxPerDay, setMaxPerDay] = useState(6);

  const toggleChannel = (id: string) => {
    setChannels((prev) =>
      prev.map((channel) =>
        channel.id === id ? { ...channel, enabled: !channel.enabled } : channel
      )
    );
  };

  return (
    <div className="container mx-auto px-6 py-8 max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <Bell className="h-7 w-7 text-primary-600" />
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Notificacoes</h1>
          <p className="text-slate-600">Controle de alertas e limites diarios.</p>
        </div>
      </div>

      <Card className="p-4 space-y-4">
        <h3 className="text-lg font-semibold text-slate-900">Canais</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {channels.map((channel) => (
            <div key={channel.id} className="rounded-lg border border-slate-100 px-3 py-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-900">{channel.label}</p>
                <input
                  type="checkbox"
                  checked={channel.enabled}
                  onChange={() => toggleChannel(channel.id)}
                />
              </div>
              <Badge variant={channel.enabled ? 'success' : 'gray'}>
                {channel.enabled ? 'Ativo' : 'Pausado'}
              </Badge>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-slate-900">Quiet hours</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <label className="text-sm text-slate-600 space-y-2">
            Inicio
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={quietStart}
              onChange={(e) => setQuietStart(e.target.value)}
            />
          </label>
          <label className="text-sm text-slate-600 space-y-2">
            Fim
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={quietEnd}
              onChange={(e) => setQuietEnd(e.target.value)}
            />
          </label>
        </div>
        <label className="text-sm text-slate-600 space-y-2">
          Maximo por dia
          <input
            type="number"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={maxPerDay}
            onChange={(e) => setMaxPerDay(Number(e.target.value))}
          />
        </label>
        <Button>
          <Check className="h-4 w-4 mr-2" />
          Salvar ajustes
        </Button>
      </Card>
    </div>
  );
}