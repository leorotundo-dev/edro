'use client';

import Link from 'next/link';
import { Card, Button, Badge } from '@edro/ui';
import { CheckCircle, Rocket } from 'lucide-react';

export default function OnboardingConfirmacaoPage() {
  return (
    <div className="container mx-auto px-6 py-8 max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <CheckCircle className="h-7 w-7 text-primary-600" />
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Confirmacao</h1>
          <p className="text-slate-600">Resumo do seu setup inicial.</p>
        </div>
      </div>

      <Card className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-lg border border-slate-100 px-3 py-2">
            <p className="text-xs text-slate-500">Objetivo</p>
            <p className="text-sm font-semibold text-slate-900">Aprovacao rapida</p>
          </div>
          <div className="rounded-lg border border-slate-100 px-3 py-2">
            <p className="text-xs text-slate-500">Carga semanal</p>
            <p className="text-sm font-semibold text-slate-900">8 horas</p>
          </div>
          <div className="rounded-lg border border-slate-100 px-3 py-2">
            <p className="text-xs text-slate-500">Banca alvo</p>
            <p className="text-sm font-semibold text-slate-900">CEBRASPE</p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <Badge variant="success">Pronto para iniciar</Badge>
          <Link href="/dashboard" className="inline-flex">
            <Button>
              <Rocket className="h-4 w-4 mr-2" />
              Ir para dashboard
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}