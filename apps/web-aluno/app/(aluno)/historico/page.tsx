'use client';

import Link from 'next/link';
import { Card, Button, Badge } from '@edro/ui';
import { History, BarChart, RefreshCw, AlertTriangle } from 'lucide-react';

export default function HistoricoPage() {
  return (
    <div className="container mx-auto px-6 py-8 max-w-6xl space-y-6">
      <div className="flex items-center gap-3">
        <History className="h-7 w-7 text-primary-600" />
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Historico</h1>
          <p className="text-slate-600">Resumo de simulados, revisoes e erros.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 space-y-2">
          <BarChart className="h-5 w-5 text-primary-600" />
          <p className="text-sm font-semibold text-slate-900">Simulados</p>
          <p className="text-xs text-slate-500">12 concluidos</p>
          <Link href="/historico/simulados" className="inline-flex">
            <Button size="sm" variant="outline">Ver detalhes</Button>
          </Link>
        </Card>
        <Card className="p-4 space-y-2">
          <RefreshCw className="h-5 w-5 text-primary-600" />
          <p className="text-sm font-semibold text-slate-900">Revisoes</p>
          <p className="text-xs text-slate-500">48 ciclos completos</p>
          <Link href="/historico/revisoes" className="inline-flex">
            <Button size="sm" variant="outline">Ver detalhes</Button>
          </Link>
        </Card>
        <Card className="p-4 space-y-2">
          <AlertTriangle className="h-5 w-5 text-primary-600" />
          <p className="text-sm font-semibold text-slate-900">Erros</p>
          <p className="text-xs text-slate-500">5 topicos criticos</p>
          <Link href="/historico/erros" className="inline-flex">
            <Button size="sm" variant="outline">Ver detalhes</Button>
          </Link>
        </Card>
      </div>

      <Card className="p-4 flex items-center justify-between">
        <p className="text-sm text-slate-600">Ultima atualizacao: hoje 08:40</p>
        <Badge variant="gray">Dados sincronizados</Badge>
      </Card>
    </div>
  );
}