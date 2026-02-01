'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { apiGet, apiPost } from '@/lib/api';

type Briefing = {
  id: string;
  client_name: string | null;
  title: string;
  payload: Record<string, any>;
};

type Recommendation = {
  platform: string;
  confidence: number;
  reasoning: string;
  format: string;
  contentHints?: string[];
  performanceHints?: string[];
  radarEvidence?: any[];
  measurability?: number;
};

export default function RecomendacoesClient({ briefingId }: { briefingId: string }) {
  const router = useRouter();
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const loadBriefing = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiGet<{
        success: boolean;
        data: { briefing: Briefing };
      }>(`/edro/briefings/${briefingId}`);

      if (response?.data) {
        setBriefing(response.data.briefing);
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

  const handleGenerate = async () => {
    if (!briefing) return;

    setGenerating(true);
    setError('');
    try {
      const response = await apiPost<{
        success: boolean;
        data: { recommendations: Recommendation[] };
      }>('/edro/recommendations/platforms', {
        briefingId,
        objective: briefing.payload?.objective || '',
        targetAudience: briefing.payload?.target_audience || '',
        channels: briefing.payload?.channels || [],
      });

      if (response?.data?.recommendations) {
        setRecommendations(response.data.recommendations);
      }
    } catch (err: any) {
      setError(err?.message || 'Erro ao gerar recomendações.');
    } finally {
      setGenerating(false);
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

  if (!briefing) {
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

  return (
    <AppShell
      title="Recomendações IA"
      topbarLeft={
        <nav className="flex items-center space-x-2 text-sm text-slate-400">
          <button onClick={() => router.push('/edro')} className="text-slate-500 hover:text-slate-700 transition-colors">
            Edro
          </button>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <button onClick={handleBack} className="text-slate-500 hover:text-slate-700 transition-colors truncate max-w-xs">
            {briefing.title}
          </button>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="text-slate-900 font-medium">Recomendações</span>
        </nav>
      }
    >
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <span className="material-symbols-outlined text-4xl text-purple-600">lightbulb</span>
              <div>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">Recomendações de Plataforma</h2>
                <p className="text-slate-700 text-sm mb-2">
                  <strong>Cliente:</strong> {briefing.client_name || 'N/A'}
                </p>
                <p className="text-slate-600 text-sm">
                  Use IA para analisar o briefing e recomendar as melhores plataformas e formatos para a campanha.
                </p>
              </div>
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {generating ? (
                <>
                  <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent" />
                  Gerando...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">auto_awesome</span>
                  Gerar Recomendações
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Plataformas Recomendadas ({recommendations.length})
            </h3>
            {recommendations.map((rec, index) => (
              <div key={index} className="bg-white rounded-lg border border-slate-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-3xl text-purple-600">hub</span>
                    <div>
                      <h4 className="text-lg font-semibold text-slate-900 capitalize">{rec.platform}</h4>
                      <p className="text-sm text-slate-600">Formato: {rec.format}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">Confiança:</span>
                    <div className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">
                      {Math.round(rec.confidence * 100)}%
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h5 className="text-sm font-semibold text-slate-700 mb-2">Análise:</h5>
                    <p className="text-slate-600 text-sm">{rec.reasoning}</p>
                  </div>

                  {rec.contentHints && rec.contentHints.length > 0 && (
                    <div>
                      <h5 className="text-sm font-semibold text-slate-700 mb-2">Dicas de Conteúdo:</h5>
                      <ul className="list-disc list-inside space-y-1">
                        {rec.contentHints.map((hint, i) => (
                          <li key={i} className="text-slate-600 text-sm">{hint}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {rec.performanceHints && rec.performanceHints.length > 0 && (
                    <div>
                      <h5 className="text-sm font-semibold text-slate-700 mb-2">Dicas de Performance:</h5>
                      <ul className="list-disc list-inside space-y-1">
                        {rec.performanceHints.map((hint, i) => (
                          <li key={i} className="text-slate-600 text-sm">{hint}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {rec.measurability !== undefined && (
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                      <span className="text-sm text-slate-500">Mensurabilidade:</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${rec.measurability * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-slate-700">
                        {Math.round(rec.measurability * 100)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!generating && recommendations.length === 0 && (
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">sentiment_satisfied</span>
            <p className="text-slate-500">Clique em "Gerar Recomendações" para começar.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
