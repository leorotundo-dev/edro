'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { apiGet, apiPatch, apiPost } from '@/lib/api';

type Briefing = {
  id: string;
  client_name: string | null;
  title: string;
  status: string;
  payload: Record<string, any>;
  created_at: string;
  due_at: string | null;
  traffic_owner: string | null;
};

type Stage = {
  id: string;
  briefing_id: string;
  stage: string;
  status: 'pending' | 'in_progress' | 'done';
  updated_at: string;
  updated_by: string | null;
};

type Copy = {
  id: string;
  briefing_id: string;
  language: string;
  output: string;
  created_at: string;
  created_by: string | null;
};

type Task = {
  id: string;
  briefing_id: string;
  type: string;
  assigned_to: string;
  status: string;
  created_at: string;
};

const WORKFLOW_STAGES = [
  { key: 'briefing', label: 'Briefing', icon: 'description', color: 'blue' },
  { key: 'iclips_in', label: 'iClips Entrada', icon: 'input', color: 'purple' },
  { key: 'alinhamento', label: 'Alinhamento', icon: 'groups', color: 'yellow' },
  { key: 'copy_ia', label: 'Copy IA', icon: 'psychology', color: 'cyan' },
  { key: 'aprovacao', label: 'Aprovação', icon: 'check_circle', color: 'orange' },
  { key: 'producao', label: 'Produção', icon: 'palette', color: 'pink' },
  { key: 'revisao', label: 'Revisão', icon: 'rate_review', color: 'indigo' },
  { key: 'iclips_out', label: 'iClips Saída', icon: 'output', color: 'purple' },
];

const STAGE_COLORS: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-700 border-blue-300',
  purple: 'bg-purple-100 text-purple-700 border-purple-300',
  yellow: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  cyan: 'bg-cyan-100 text-cyan-700 border-cyan-300',
  orange: 'bg-orange-100 text-orange-700 border-orange-300',
  pink: 'bg-pink-100 text-pink-700 border-pink-300',
  indigo: 'bg-indigo-100 text-indigo-700 border-indigo-300',
};

export default function BriefingDetailClient({ briefingId }: { briefingId: string }) {
  const router = useRouter();
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [copies, setCopies] = useState<Copy[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadBriefing = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiGet<{
        success: boolean;
        data: {
          briefing: Briefing;
          stages: Stage[];
          copies: Copy[];
          tasks: Task[];
        };
      }>(`/edro/briefings/${briefingId}`);

      if (response?.data) {
        setBriefing(response.data.briefing);
        setStages(response.data.stages);
        setCopies(response.data.copies);
        setTasks(response.data.tasks);
      }
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar briefing.');
    } finally {
      setLoading(false);
    }
  }, [briefingId]);

  useEffect(() => {
    loadBriefing();
  }, [loadBriefing]);

  const handleStageAction = async (stageKey: string, action: 'start' | 'complete') => {
    setActionLoading(stageKey);
    try {
      const status = action === 'start' ? 'in_progress' : 'done';
      await apiPatch(`/edro/briefings/${briefingId}/stages/${stageKey}`, { status });
      await loadBriefing();
    } catch (err: any) {
      alert(err?.message || 'Erro ao atualizar etapa.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleGenerateCopy = async () => {
    setActionLoading('copy_ia');
    try {
      await apiPost(`/edro/briefings/${briefingId}/copy`, {
        language: 'pt',
        count: 10,
      });
      await loadBriefing();
    } catch (err: any) {
      alert(err?.message || 'Erro ao gerar copies.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleGenerateCreative = async (copyId: string) => {
    const confirmed = confirm('Deseja gerar um criativo visual para esta copy? (Requer API Ad Creative configurada)');
    if (!confirmed) return;

    setActionLoading('creative');
    try {
      const result = await apiPost<{
        success: boolean;
        data: { image_url: string; format: string };
      }>(`/edro/briefings/${briefingId}/generate-creative`, {
        copy_version_id: copyId,
        format: 'instagram-feed',
        style: 'modern',
      });

      if (result?.data?.image_url) {
        alert('Criativo gerado com sucesso! URL: ' + result.data.image_url);
        window.open(result.data.image_url, '_blank');
      }
      await loadBriefing();
    } catch (err: any) {
      alert(err?.message || 'Erro ao gerar criativo visual.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBack = () => {
    router.push('/edro');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
          <div className="mt-4 text-slate-600">Carregando briefing...</div>
        </div>
      </div>
    );
  }

  if (error || !briefing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-semibold text-slate-900 mb-2">Erro</h3>
          <p className="text-slate-600 mb-4">{error || 'Briefing não encontrado.'}</p>
          <button
            onClick={handleBack}
            className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  const getStageStatus = (stageKey: string): Stage | undefined => {
    return stages.find((s) => s.stage === stageKey);
  };

  return (
    <AppShell
      title={briefing.title}
      topbarLeft={
        <nav className="flex items-center space-x-2 text-sm text-slate-400">
          <button
            onClick={handleBack}
            className="text-slate-500 hover:text-slate-700 transition-colors"
          >
            Edro
          </button>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="text-slate-900 font-medium truncate max-w-md">{briefing.title}</span>
        </nav>
      }
    >
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">{briefing.title}</h1>
              <div className="flex items-center gap-4 text-sm text-slate-600">
                {briefing.client_name && (
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">business</span>
                    {briefing.client_name}
                  </div>
                )}
                {briefing.traffic_owner && (
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">person</span>
                    {briefing.traffic_owner}
                  </div>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-500">Status Atual</div>
              <div className="text-lg font-semibold text-slate-900 capitalize">
                {briefing.status.replace('_', ' ')}
              </div>
            </div>
          </div>

          {briefing.payload && (
            <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-2 gap-4 text-sm">
              {briefing.payload.objective && (
                <div>
                  <div className="text-slate-500">Objetivo</div>
                  <div className="text-slate-900 font-medium">{briefing.payload.objective}</div>
                </div>
              )}
              {briefing.payload.target_audience && (
                <div>
                  <div className="text-slate-500">Público-Alvo</div>
                  <div className="text-slate-900">{briefing.payload.target_audience}</div>
                </div>
              )}
              {briefing.payload.channels && (
                <div>
                  <div className="text-slate-500">Canais</div>
                  <div className="text-slate-900">{briefing.payload.channels}</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {WORKFLOW_STAGES.map((workflowStage) => {
            const stageData = getStageStatus(workflowStage.key);
            const status = stageData?.status || 'pending';
            const colorClass = STAGE_COLORS[workflowStage.color] || STAGE_COLORS.blue;

            const isPending = status === 'pending';
            const isInProgress = status === 'in_progress';
            const isDone = status === 'done';

            return (
              <div
                key={workflowStage.key}
                className={`rounded-lg border-2 p-4 transition-all ${
                  isDone
                    ? 'bg-green-50 border-green-300'
                    : isInProgress
                      ? `${colorClass} border-2`
                      : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={`material-symbols-outlined text-2xl ${
                      isDone ? 'text-green-600' : isInProgress ? '' : 'text-slate-400'
                    }`}
                  >
                    {isDone ? 'check_circle' : workflowStage.icon}
                  </span>
                  <div>
                    <div className="font-semibold text-sm">{workflowStage.label}</div>
                    <div className="text-xs text-slate-500 capitalize">{status}</div>
                  </div>
                </div>

                {isPending && (
                  <button
                    onClick={() => handleStageAction(workflowStage.key, 'start')}
                    disabled={actionLoading === workflowStage.key}
                    className="w-full px-3 py-2 text-sm bg-slate-900 text-white rounded hover:bg-slate-800 transition-colors disabled:opacity-50"
                  >
                    {actionLoading === workflowStage.key ? 'Iniciando...' : 'Iniciar'}
                  </button>
                )}

                {isInProgress && (
                  <div className="space-y-2">
                    {workflowStage.key === 'copy_ia' && copies.length === 0 && (
                      <button
                        onClick={handleGenerateCopy}
                        disabled={actionLoading === 'copy_ia'}
                        className="w-full px-3 py-2 text-sm bg-cyan-600 text-white rounded hover:bg-cyan-700 transition-colors disabled:opacity-50"
                      >
                        {actionLoading === 'copy_ia' ? 'Gerando...' : 'Gerar Copies'}
                      </button>
                    )}
                    {workflowStage.key === 'aprovacao' && copies.length > 0 && (
                      <button
                        type="button"
                        onClick={() => router.push(`/edro/${briefingId}/aprovacao`)}
                        className="w-full px-3 py-2 text-sm bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
                      >
                        Aprovar Copies
                      </button>
                    )}
                    {workflowStage.key === 'producao' && (
                      <button
                        type="button"
                        onClick={() => router.push(`/edro/${briefingId}/producao`)}
                        className="w-full px-3 py-2 text-sm bg-pink-600 text-white rounded hover:bg-pink-700 transition-colors"
                      >
                        Atribuir Designer
                      </button>
                    )}
                    <button
                      onClick={() => handleStageAction(workflowStage.key, 'complete')}
                      disabled={actionLoading === workflowStage.key}
                      className="w-full px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      {actionLoading === workflowStage.key ? 'Concluindo...' : 'Concluir'}
                    </button>
                  </div>
                )}

                {isDone && stageData?.updated_at && (
                  <div className="text-xs text-slate-500">
                    {new Date(stageData.updated_at).toLocaleString('pt-BR')}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Copies Section */}
        {copies.length > 0 && (
          <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Copies Geradas ({copies.length})
            </h2>
            <div className="space-y-4">
              {copies.map((copy, index) => (
                <div key={copy.id} className="p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-slate-900">Versão {index + 1}</div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleGenerateCreative(copy.id)}
                        disabled={actionLoading === 'creative'}
                        className="px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">image</span>
                        {actionLoading === 'creative' ? 'Gerando...' : 'Gerar Criativo'}
                      </button>
                      <div className="text-xs text-slate-500">
                        {new Date(copy.created_at).toLocaleString('pt-BR')}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-slate-700 whitespace-pre-wrap">{copy.output}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tasks Section */}
        {tasks.length > 0 && (
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Tarefas ({tasks.length})
            </h2>
            <div className="space-y-3">
              {tasks.map((task) => (
                <div key={task.id} className="p-4 bg-slate-50 rounded-lg flex items-center justify-between">
                  <div>
                    <div className="font-medium text-slate-900 capitalize">{task.type}</div>
                    <div className="text-sm text-slate-600">Atribuído: {task.assigned_to}</div>
                  </div>
                  <div className="px-3 py-1 bg-slate-200 text-slate-700 rounded-full text-xs font-medium capitalize">
                    {task.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
