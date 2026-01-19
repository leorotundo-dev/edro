'use client';

import { useState } from 'react';
import { Card, Button, Badge } from '@edro/ui';
import { User, Mail, Globe, Check } from 'lucide-react';

export default function ConfiguracoesContaPage() {
  const [name, setName] = useState('Aluno Edro');
  const [email, setEmail] = useState('aluno@edro.digital');
  const [timezone, setTimezone] = useState('America/Sao_Paulo');
  const [language, setLanguage] = useState('pt-BR');
  const [focusMode, setFocusMode] = useState(true);
  const [dailySummary, setDailySummary] = useState(false);

  return (
    <div className="container mx-auto px-6 py-8 max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <User className="h-7 w-7 text-primary-600" />
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Conta</h1>
          <p className="text-slate-600">Atualize seus dados pessoais e idioma.</p>
        </div>
      </div>

      <Card className="p-4 space-y-4">
        <h3 className="text-lg font-semibold text-slate-900">Dados basicos</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="space-y-2 text-sm text-slate-600">
            Nome completo
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </label>
          <label className="space-y-2 text-sm text-slate-600">
            Email principal
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </label>
          <label className="space-y-2 text-sm text-slate-600">
            Fuso horario
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <select
                className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              >
                <option value="America/Sao_Paulo">America/Sao_Paulo</option>
                <option value="America/Manaus">America/Manaus</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
          </label>
          <label className="space-y-2 text-sm text-slate-600">
            Idioma
            <select
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="pt-BR">pt-BR</option>
              <option value="en-US">en-US</option>
              <option value="es-ES">es-ES</option>
            </select>
          </label>
        </div>
        <div className="flex items-center justify-between">
          <Badge variant="gray">Ultima atualizacao ha 2 dias</Badge>
          <Button>
            <Check className="h-4 w-4 mr-2" />
            Salvar
          </Button>
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <h3 className="text-lg font-semibold text-slate-900">Preferencias</h3>
        <div className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
          <div>
            <p className="text-sm font-medium text-slate-900">Modo foco</p>
            <p className="text-xs text-slate-500">Oculta distracoes durante o estudo.</p>
          </div>
          <input
            type="checkbox"
            checked={focusMode}
            onChange={(e) => setFocusMode(e.target.checked)}
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
          <div>
            <p className="text-sm font-medium text-slate-900">Resumo diario</p>
            <p className="text-xs text-slate-500">Receba um resumo do desempenho.</p>
          </div>
          <input
            type="checkbox"
            checked={dailySummary}
            onChange={(e) => setDailySummary(e.target.checked)}
          />
        </div>
      </Card>
    </div>
  );
}