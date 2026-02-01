'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { apiGet, apiPatch } from '@/lib/api';

type Briefing = {
  id: string;
  client_name: string | null;
  title: string;
  status: string;
  payload: Record<string, any>;
};

type Copy = {
  id: string;
  briefing_id: string;
  language: string;
  output: string;
  created_at: string;
  created_by: string | null;
};

type Stage = {
  id: string;
  stage: string;
  status: string;
};

export default function AprovacaoClient({ briefingId }: { briefingId: string }) {
  const router = useRouter();
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [copies, setCopies] = useState<Copy[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [selectedCopy, setSelectedCopy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [comments, setComments] = useState('');

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
          setSelectedCopy(response.data.copies[0].id);
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

  const handleApprove = async () => {
    if (!selectedCopy) {
      alert('Selecione uma copy para aprovar.');
      return;
    }

    setActionLoading(true);
    try {
      await apiPatch(`/edro/briefings/${briefingId}/stages/aprovacao`, {
        status: 'done',
        metadata: {
          approvedCopyId: selectedCopy,
          comments: comments || null,
          approvedAt: new Date().toISOString(),
        },
      });

      alert('Copy aprovada com sucesso!');
      router.push(`/edro/${briefingId}`);
    } catch (err: any) {
      alert(err?.message || 'Erro ao aprovar copy.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!comments.trim()) {
      alert('Adicione comentários sobre o motivo da rejeição.');
      return;
    }

    const confirmed = confirm('Tem certeza que deseja rejeitar? O briefing voltará para a etapa de Copy IA.');
    if (!confirmed) return;

    setActionLoading(true);
    try {
      // Move stage back to copy_ia
      await apiPatch(`/edro/briefings/${briefingId}/stages/copy_ia`, {
        status: 'in_progress',
        metadata: {
          rejectedAt: new Date().toISOString(),
          rejectionComments: comments,
        },
      });

      alert('Copy rejeitada. Briefing voltou para etapa de Copy IA.');
      router.push(`/edro/${briefingId}`);
    } catch (err: any) {
      alert(err?.message || 'Erro ao rejeitar copy.');
    } finally {
      setActionLoading(false);
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

  const aprovacaoStage = stages.find((s) => s.stage === 'aprovacao');
  const isAprovacaoActive = aprovacaoStage?.status === 'in_progress';

  if (!isAprovacaoActive) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h3 className="text-xl font-semibold text-slate-900 mb-2">Aprovação não disponível</h3>
          <p className="text-slate-600 mb-4">
            A etapa de aprovação ainda não foi iniciada ou já foi concluída.
          </p>
          <button onClick={handleBack} className="px-6 py-2 bg-slate-900 text-white rounded-lg">
            Voltar para Briefing
          </button>
        </div>
      </div>
    );
  }

  if (copies.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-xl font-semibold text-slate-900 mb-2">Nenhuma copy disponível</h3>
          <p className="text-slate-600 mb-4">
            Aguarde a geração das copies pela IA antes de aprovar.
          </p>
          <button onClick={handleBack} className="px-6 py-2 bg-slate-900 text-white rounded-lg">
            Voltar
          </button>
        </div>
      </div>
    );
  }

  const selectedCopyData = copies.find((c) => c.id === selectedCopy);

  return (
    <AppShell
      title="Aprovação de Copy"
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
          <span className="text-slate-900 font-medium">Aprovação</span>
        </nav>
      }
    >
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 mb-6">
          <div className="flex items-start gap-4">
            <span className="material-symbols-outlined text-4xl text-orange-600">
              check_circle
            </span>
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-2">
                Aprovação de Copy - {briefing.title}
              </h2>
              <p className="text-slate-700 mb-1">
                <strong>Cliente:</strong> {briefing.client_name || 'N/A'}
              </p>
              {briefing.payload?.objective && (
                <p className="text-slate-700">
                  <strong>Objetivo:</strong> {briefing.payload.objective}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Sidebar - Lista de Copies */}
          <div className="col-span-1 space-y-3">
            <h3 className="font-semibold text-slate-900 mb-3">
              Copies Disponíveis ({copies.length})
            </h3>
            {copies.map((copy, index) => (
              <button
                key={copy.id}
                onClick={() => setSelectedCopy(copy.id)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  selectedCopy === copy.id
                    ? 'border-slate-900 bg-slate-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="font-medium text-slate-900 mb-1">Versão {index + 1}</div>
                <div className="text-xs text-slate-500">
                  {new Date(copy.created_at).toLocaleString('pt-BR')}
                </div>
                <div className="mt-2 text-sm text-slate-600 line-clamp-3">
                  {copy.output.substring(0, 100)}...
                </div>
              </button>
            ))}
          </div>

          {/* Main - Copy Selecionada */}
          <div className="col-span-2 space-y-6">
            {selectedCopyData && (
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Versão {copies.findIndex((c) => c.id === selectedCopy) + 1}
                  </h3>
                  <div className="text-sm text-slate-500">
                    {new Date(selectedCopyData.created_at).toLocaleString('pt-BR')}
                  </div>
                </div>

                <div className="prose max-w-none">
                  <div className="text-slate-900 whitespace-pre-wrap bg-slate-50 p-4 rounded-lg border border-slate-200">
                    {selectedCopyData.output}
                  </div>
                </div>
              </div>
            )}

            {/* Comentários e Ações */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-3">Comentários (Opcional)</h3>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                placeholder="Adicione comentários sobre a aprovação ou motivos de rejeição..."
              />

              <div className="mt-6 flex gap-3 justify-end">
                <button
                  onClick={handleReject}
                  disabled={actionLoading}
                  className="px-6 py-3 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <span className="material-symbols-outlined">close</span>
                  Rejeitar
                </button>
                <button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {actionLoading ? (
                    <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent" />
                  ) : (
                    <span className="material-symbols-outlined">check</span>
                  )}
                  Aprovar Copy
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
