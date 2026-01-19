'use client';

import Link from 'next/link';
import { Card, Button, Badge } from '@edro/ui';
import { Compass, CheckCircle } from 'lucide-react';

const steps = [
  { id: 'perfil', title: 'Perfil', description: 'Dados basicos do aluno', href: '/onboarding/perfil', status: 'concluido' },
  { id: 'objetivos', title: 'Objetivos', description: 'Metas e prioridades', href: '/onboarding/objetivos', status: 'em progresso' },
  { id: 'tempo', title: 'Tempo', description: 'Carga horaria semanal', href: '/onboarding/tempo', status: 'pendente' },
  { id: 'diagnostico', title: 'Diagnostico', description: 'Nivel inicial e lacunas', href: '/onboarding/diagnostico', status: 'pendente' },
  { id: 'confirmacao', title: 'Confirmacao', description: 'Resumo final', href: '/onboarding/confirmacao', status: 'pendente' },
];

const statusVariant = (status: string) => {
  if (status === 'concluido') return 'success';
  if (status === 'em progresso') return 'warning';
  return 'gray';
};

export default function OnboardingPage() {
  return (
    <div className="container mx-auto px-6 py-8 max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <Compass className="h-7 w-7 text-primary-600" />
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Onboarding</h1>
          <p className="text-slate-600">Complete os passos para personalizar a trilha.</p>
        </div>
      </div>

      <Card className="p-4 border border-amber-200 bg-amber-50">
        <p className="text-sm text-amber-800">
          Primeiro edital gratuito. A partir do segundo, e necessario um plano pago.
        </p>
      </Card>

      <Card className="p-4 space-y-3">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-full bg-primary-50 text-primary-700 flex items-center justify-center text-sm font-semibold">
                {index + 1}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                <p className="text-xs text-slate-500">{step.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={statusVariant(step.status)}>{step.status}</Badge>
              <Link href={step.href} className="inline-flex">
                <Button size="sm" variant="outline">Abrir</Button>
              </Link>
            </div>
          </div>
        ))}
      </Card>

      <Card className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-primary-600" />
          <p className="text-sm text-slate-600">Continue de onde parou.</p>
        </div>
        <Link href="/onboarding/objetivos" className="inline-flex">
          <Button>Continuar</Button>
        </Link>
      </Card>
    </div>
  );
}
