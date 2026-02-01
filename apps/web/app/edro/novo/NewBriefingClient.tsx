'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { apiPost } from '@/lib/api';

type BriefingFormData = {
  client_name: string;
  title: string;
  objective: string;
  target_audience: string;
  channels: string;
  due_at: string;
  traffic_owner: string;
  additional_notes: string;
};

export default function NewBriefingClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<BriefingFormData>({
    client_name: '',
    title: '',
    objective: '',
    target_audience: '',
    channels: '',
    due_at: '',
    traffic_owner: '',
    additional_notes: '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        client_name: formData.client_name,
        title: formData.title,
        payload: {
          objective: formData.objective,
          target_audience: formData.target_audience,
          channels: formData.channels,
          additional_notes: formData.additional_notes,
        },
        due_at: formData.due_at || undefined,
        traffic_owner: formData.traffic_owner || undefined,
        notify_traffic: Boolean(formData.traffic_owner),
      };

      const response = await apiPost<{ success: boolean; data: { briefing: { id: string } } }>(
        '/edro/briefings',
        payload
      );

      if (response?.data?.briefing?.id) {
        router.push(`/edro/${response.data.briefing.id}`);
      } else {
        setError('Briefing criado mas ID não retornado.');
      }
    } catch (err: any) {
      setError(err?.message || 'Erro ao criar briefing.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/edro');
  };

  return (
    <AppShell
      title="Novo Briefing"
      topbarLeft={
        <nav className="flex items-center space-x-2 text-sm text-slate-400">
          <button
            onClick={handleCancel}
            className="text-slate-500 hover:text-slate-700 transition-colors"
          >
            Edro
          </button>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="text-slate-900 font-medium">Novo Briefing</span>
        </nav>
      }
    >
      <div className="p-6 max-w-4xl mx-auto">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Informações Básicas</h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="client_name" className="block text-sm font-medium text-slate-700 mb-1">
                  Cliente <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="client_name"
                  name="client_name"
                  value={formData.client_name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  placeholder="Nome do cliente"
                />
              </div>

              <div>
                <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1">
                  Título do Briefing <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  minLength={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  placeholder="Ex: Campanha Dia das Mães 2026"
                />
              </div>

              <div>
                <label htmlFor="traffic_owner" className="block text-sm font-medium text-slate-700 mb-1">
                  Responsável de Tráfego
                </label>
                <input
                  type="email"
                  id="traffic_owner"
                  name="traffic_owner"
                  value={formData.traffic_owner}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  placeholder="email@edro.digital"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Receberá notificações sobre o briefing
                </p>
              </div>

              <div>
                <label htmlFor="due_at" className="block text-sm font-medium text-slate-700 mb-1">
                  Prazo de Entrega
                </label>
                <input
                  type="date"
                  id="due_at"
                  name="due_at"
                  value={formData.due_at}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Detalhes da Campanha</h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="objective" className="block text-sm font-medium text-slate-700 mb-1">
                  Objetivo <span className="text-red-500">*</span>
                </label>
                <select
                  id="objective"
                  name="objective"
                  value={formData.objective}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                >
                  <option value="">Selecione o objetivo</option>
                  <option value="awareness">Awareness / Reconhecimento de Marca</option>
                  <option value="engagement">Engajamento</option>
                  <option value="conversao">Conversão / Vendas</option>
                  <option value="leads">Geração de Leads</option>
                  <option value="branding">Branding / Institucional</option>
                  <option value="lancamento">Lançamento de Produto</option>
                </select>
              </div>

              <div>
                <label htmlFor="target_audience" className="block text-sm font-medium text-slate-700 mb-1">
                  Público-Alvo <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="target_audience"
                  name="target_audience"
                  value={formData.target_audience}
                  onChange={handleChange}
                  required
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  placeholder="Ex: Mulheres, 25-45 anos, classes A/B, interessadas em decoração..."
                />
              </div>

              <div>
                <label htmlFor="channels" className="block text-sm font-medium text-slate-700 mb-1">
                  Canais <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="channels"
                  name="channels"
                  value={formData.channels}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  placeholder="Ex: Instagram, Facebook, LinkedIn"
                />
              </div>

              <div>
                <label htmlFor="additional_notes" className="block text-sm font-medium text-slate-700 mb-1">
                  Observações Adicionais
                </label>
                <textarea
                  id="additional_notes"
                  name="additional_notes"
                  value={formData.additional_notes}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  placeholder="Informações adicionais, referências, restrições..."
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading && (
                <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent" />
              )}
              {loading ? 'Criando...' : 'Criar Briefing'}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
