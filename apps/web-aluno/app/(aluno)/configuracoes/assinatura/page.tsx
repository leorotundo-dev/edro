'use client';

import { Card, Button, Badge } from '@edro/ui';
import { Wallet, Calendar, PauseCircle, XCircle } from 'lucide-react';

const subscription = {
  plan: 'Pro',
  status: 'Ativa',
  renewAt: '2025-02-10',
  nextCharge: 'R$ 59',
};

export default function ConfiguracoesAssinaturaPage() {
  return (
    <div className="container mx-auto px-6 py-8 max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <Wallet className="h-7 w-7 text-primary-600" />
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Assinatura</h1>
          <p className="text-slate-600">Acompanhe status e renovacao do plano.</p>
        </div>
      </div>

      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Plano atual</p>
            <p className="text-xl font-semibold text-slate-900">{subscription.plan}</p>
          </div>
          <Badge variant="success">{subscription.status}</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Calendar className="h-4 w-4" />
            Renovacao em {subscription.renewAt}
          </div>
          <div className="text-sm text-slate-600">
            Proxima cobranca: <span className="font-semibold text-slate-900">{subscription.nextCharge}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline">
            <PauseCircle className="h-4 w-4 mr-2" />
            Pausar
          </Button>
          <Button variant="outline">
            <XCircle className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <h3 className="text-lg font-semibold text-slate-900">Historico recente</h3>
        <div className="space-y-2 text-sm text-slate-600">
          <div className="flex items-center justify-between">
            <span>Upgrade para Pro</span>
            <span>2024-12-02</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Renovacao mensal</span>
            <span>2025-01-10</span>
          </div>
        </div>
      </Card>
    </div>
  );
}