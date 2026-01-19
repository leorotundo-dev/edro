'use client';

import { Card, Badge } from '@edro/ui';
import { HelpCircle } from 'lucide-react';

const faqs = [
  {
    question: 'Como atualizar meu plano?',
    answer: 'Acesse Configuracoes > Planos e selecione a opcao desejada.',
  },
  {
    question: 'Posso pausar minha assinatura?',
    answer: 'Sim. Em Configuracoes > Assinatura voce encontra a opcao de pausa.',
  },
  {
    question: 'Como funciona o SRS?',
    answer: 'O SRS ajusta intervalos de revisao conforme seu desempenho.',
  },
];

export default function SuporteFaqPage() {
  return (
    <div className="container mx-auto px-6 py-8 max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <HelpCircle className="h-7 w-7 text-primary-600" />
        <div>
          <h1 className="text-3xl font-bold text-slate-900">FAQ</h1>
          <p className="text-slate-600">Respostas para perguntas frequentes.</p>
        </div>
      </div>

      <div className="space-y-3">
        {faqs.map((item) => (
          <Card key={item.question} className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">{item.question}</h3>
              <Badge variant="gray">Ajuda</Badge>
            </div>
            <p className="text-sm text-slate-600">{item.answer}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}