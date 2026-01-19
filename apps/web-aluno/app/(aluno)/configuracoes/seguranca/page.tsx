'use client';

import { useState } from 'react';
import { Card, Button, Badge } from '@edro/ui';
import { Shield, Key, Smartphone, Laptop } from 'lucide-react';

const initialSessions = [
  {
    id: 'device-1',
    name: 'Chrome - Windows',
    location: 'Sao Paulo',
    lastActive: 'Hoje 09:12',
  },
  {
    id: 'device-2',
    name: 'Safari - iPhone',
    location: 'Recife',
    lastActive: 'Ontem 21:40',
  },
];

export default function ConfiguracoesSegurancaPage() {
  const [twoFactor, setTwoFactor] = useState(true);
  const [sessions, setSessions] = useState(initialSessions);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const removeSession = (id: string) => {
    setSessions((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="container mx-auto px-6 py-8 max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-7 w-7 text-primary-600" />
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Seguranca</h1>
          <p className="text-slate-600">Controle de acesso e dispositivos conectados.</p>
        </div>
      </div>

      <Card className="p-4 space-y-4">
        <h3 className="text-lg font-semibold text-slate-900">Senha</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="space-y-2 text-sm text-slate-600">
            Senha atual
            <input
              type="password"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </label>
          <label className="space-y-2 text-sm text-slate-600">
            Nova senha
            <input
              type="password"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </label>
        </div>
        <Button>
          <Key className="h-4 w-4 mr-2" />
          Atualizar senha
        </Button>
      </Card>

      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Dupla autenticacao</h3>
            <p className="text-sm text-slate-600">Proteja a conta com codigo extra.</p>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={twoFactor}
              onChange={(e) => setTwoFactor(e.target.checked)}
            />
            Ativo
          </label>
        </div>
        <div className="rounded-lg border border-slate-100 px-3 py-2 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-900">Metodo atual</p>
            <p className="text-xs text-slate-500">App autenticador</p>
          </div>
          <Badge variant={twoFactor ? 'success' : 'gray'}>{twoFactor ? 'Ligado' : 'Desligado'}</Badge>
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <h3 className="text-lg font-semibold text-slate-900">Sessoes ativas</h3>
        <div className="space-y-3">
          {sessions.map((session) => {
            const Icon = session.name.toLowerCase().includes('iphone') ? Smartphone : Laptop;
            return (
              <div key={session.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-slate-500" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">{session.name}</p>
                    <p className="text-xs text-slate-500">{session.location} · {session.lastActive}</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => removeSession(session.id)}>
                  Encerrar
                </Button>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}