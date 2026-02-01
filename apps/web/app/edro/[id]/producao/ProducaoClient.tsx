'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { apiGet, apiPost } from '@/lib/api';

type Briefing = {
  id: string;
  client_name: string | null;
  title: string;
  status: string;
  payload: Record<string, any>;
};

type Copy = {
  id: string;
  output: string;
  created_at: string;
};

type Stage = {
  id: string;
  stage: string;
  status: string;
};

export default function ProducaoClient({ briefingId }: { briefingId: string }) {
  const router = useRouter();
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [copies, setCopies] = useState<Copy[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    assigned_to: '',
    message: '',
    copy_version_id: '',
    notify_whatsapp: true,
    notify_email: true,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiGet<{
        success: boolean;
        data: {
          briefing: Briefing;
          stages: Stage[];
          copies: Copy[];
        };
      }>(`/edro/briefings/${briefingId}`);

      if (response?.data) {
        setBriefing(response.data.briefing);
        setStages(response.data.stages);
        setCopies(response.data.copies);
        if (response.data.copies.length > 0) {
          setFormData((prev) => ({
            ...prev,
            copy_version_id: response.data.copies[0].id,
          }));
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar dados.');
    } finally {
      setLoading(false);
    }
  }, [briefingId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.assigned_to.trim()) {
      alert('Preencha o email do designer.');
      return;
    }

    setSubmitting(true);
    try {
      const channels = [];
      if (formData.notify_whatsapp) channels.push('whatsapp');
      if (formData.notify_email) channels.push('email');

      await apiPost(`/edro/briefings/${briefingId}/assign-da`, {
        assigned_to: formData.assigned_to,
        channels,
        message: formData.message || undefined,
        copy_version_id: formData.copy_version_id || undefined,
      });

      alert('Designer atribuído com sucesso! Notificações enviadas.');
      router.push(`/edro/${briefingId}`);
    } catch (err: any) {
      alert(err?.message || 'Erro ao atribuir designer.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    router.push(`/edro/${briefingId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
          <div className="mt-4 text-slate-600">Carregando...</div>
        </div>
      </div>
    );
  }

  if (error || !briefing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <p className="text-slate-600 mb-4">{error || 'Briefing não encontrado.'}</p>
          <button onClick={handleBack} className="px-6 py-2 bg-slate-900 text-white rounded-lg">
            Voltar
          </button>
        </div>
      </div>
    );
  }

  const producaoStage = stages.find((s) => s.stage === 'producao');
  const canAssign = producaoStage?.status === 'pending' || producaoStage?.status === 'in_progress';

  if (!canAssign) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h3 className="text-xl font-semibold text-slate-900 mb-2">Produção não disponível</h3>
          <p className="text-slate-600 mb-4">
            A etapa de produção ainda não foi liberada ou já foi concluída.
          </p>
          <button onClick={handleBack} className="px-6 py-2 bg-slate-900 text-white rounded-lg">
            Voltar para Briefing
          </button>
        </div>
      </div>
    );
  }

  return (
    <AppShell
      title="Atribuir Designer"
      topbarLeft={
        <nav className="flex items-center space-x-2 text-sm text-slate-400">
          <button onClick={handleBack} className="text-slate-500 hover:text-slate-700 transition-colors">
            Edro
          </button>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <button onClick={handleBack} className="text-slate-500 hover:text-slate-700 transition-colors truncate max-w-xs">
            {briefing.title}
          </button>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="text-slate-900 font-medium">Atribuir Designer</span>
        </nav>
      }
    >
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-pink-50 border border-pink-200 rounded-lg p-6 mb-6">
          <div className="flex items-start gap-4">
            <span className="material-symbols-outlined text-4xl text-pink-600">palette</span>
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-2">
                Atribuir Produção - {briefing.title}
              </h2>
              <p className="text-slate-700 mb-1">
                <strong>Cliente:</strong> {briefing.client_name || 'N/A'}
              </p>
              <p className="text-slate-700 text-sm">
                Atribua um designer artístico (DA) para criar os assets visuais desta campanha.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações do Designer */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Designer Artístico</h3>

            <div className="space-y-4">
              <div>
                <label htmlFor="assigned_to" className="block text-sm font-medium text-slate-700 mb-1">
                  Email do Designer <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="assigned_to"
                  name="assigned_to"
                  value={formData.assigned_to}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  placeholder="designer@edro.digital"
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-slate-700 mb-1">
                  Mensagem (Opcional)
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  placeholder="Instruções especiais, referências, ou observações para o designer..."
                />
              </div>
            </div>
          </div>

          {/* Copy Aprovada */}
          {copies.length > 0 && (
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Copy Aprovada</h3>

              <div className="space-y-4">
                <div>
                  <label htmlFor="copy_version_id" className="block text-sm font-medium text-slate-700 mb-1">
                    Selecionar Copy
                  </label>
                  <select
                    id="copy_version_id"
                    name="copy_version_id"
                    value={formData.copy_version_id}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  >
                    {copies.map((copy, index) => (
                      <option key={copy.id} value={copy.id}>
                        Versão {index + 1} - {new Date(copy.created_at).toLocaleString('pt-BR')}
                      </option>
                    ))}
                  </select>
                </div>

                {formData.copy_version_id && (
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="text-sm text-slate-700 whitespace-pre-wrap">
                      {copies.find((c) => c.id === formData.copy_version_id)?.output || ''}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Canais de Notificação */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Canais de Notificação</h3>

            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="notify_email"
                  checked={formData.notify_email}
                  onChange={handleChange}
                  className="w-5 h-5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-slate-600">email</span>
                  <span className="text-slate-900">Enviar notificação por Email</span>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="notify_whatsapp"
                  checked={formData.notify_whatsapp}
                  onChange={handleChange}
                  className="w-5 h-5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-slate-600">chat</span>
                  <span className="text-slate-900">Enviar notificação por WhatsApp</span>
                </div>
              </label>
            </div>
          </div>

          {/* Ações */}
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={handleBack}
              disabled={submitting}
              className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent" />
                  Atribuindo...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">send</span>
                  Atribuir Designer
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
