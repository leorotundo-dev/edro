'use client';

import { Card, Button, Badge } from '@edro/ui';
import { FileText, Download } from 'lucide-react';

const invoices = [
  { id: 'INV-1051', date: '2025-01-10', amount: 'R$ 59', status: 'Pago' },
  { id: 'INV-1042', date: '2024-12-10', amount: 'R$ 59', status: 'Pago' },
  { id: 'INV-1033', date: '2024-11-10', amount: 'R$ 59', status: 'Pago' },
];

const statusVariant = (status: string) => {
  if (status === 'Pago') return 'success';
  if (status === 'Pendente') return 'warning';
  return 'gray';
};

export default function ConfiguracoesFaturamentoPage() {
  return (
    <div className="container mx-auto px-6 py-8 max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="h-7 w-7 text-primary-600" />
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Faturamento</h1>
          <p className="text-slate-600">Notas e comprovantes de pagamento.</p>
        </div>
      </div>

      <Card className="p-4 space-y-4">
        <h3 className="text-lg font-semibold text-slate-900">Faturas recentes</h3>
        <div className="space-y-3">
          {invoices.map((invoice) => (
            <div key={invoice.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
              <div>
                <p className="text-sm font-medium text-slate-900">{invoice.id}</p>
                <p className="text-xs text-slate-500">{invoice.date}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={statusVariant(invoice.status)}>{invoice.status}</Badge>
                <span className="text-sm font-semibold text-slate-900">{invoice.amount}</span>
                <Button size="sm" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Baixar
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}