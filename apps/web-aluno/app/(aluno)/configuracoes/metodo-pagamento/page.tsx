'use client';

import { Card, Button, Badge } from '@edro/ui';
import { CreditCard, PlusCircle } from 'lucide-react';

const methods = [
  { id: 'card-1', brand: 'Visa', last4: '4242', exp: '10/27', isDefault: true },
  { id: 'card-2', brand: 'Mastercard', last4: '1122', exp: '08/26', isDefault: false },
];

export default function ConfiguracoesMetodoPagamentoPage() {
  return (
    <div className="container mx-auto px-6 py-8 max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <CreditCard className="h-7 w-7 text-primary-600" />
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Metodo de pagamento</h1>
          <p className="text-slate-600">Cartoes salvos e preferencia padrao.</p>
        </div>
      </div>

      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Cartoes</h3>
          <Button size="sm">
            <PlusCircle className="h-4 w-4 mr-2" />
            Adicionar
          </Button>
        </div>
        <div className="space-y-3">
          {methods.map((method) => (
            <div key={method.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
              <div>
                <p className="text-sm font-medium text-slate-900">{method.brand} •••• {method.last4}</p>
                <p className="text-xs text-slate-500">Valido ate {method.exp}</p>
              </div>
              {method.isDefault ? (
                <Badge variant="success">Padrao</Badge>
              ) : (
                <Button size="sm" variant="outline">Definir</Button>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}