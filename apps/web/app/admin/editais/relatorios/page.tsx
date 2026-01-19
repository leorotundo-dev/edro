'use client';

import { useEffect, useState } from 'react';
import { apiGet, type ApiResponse } from '@/lib/api';
import { BarChart3, Calendar, RefreshCcw } from 'lucide-react';

type HeatmapRow = { banca: string | null; status: string; total: number };
type PrevisaoRow = { id: string; titulo: string; banca: string | null; data_prova_prevista: string | null; status: string };
type ProbabilityRow = {
  banca: string;
  subtopico: string;
  total_questoes: number;
  prob_freq: number;
  prob_media: number | null;
  prob_final: number;
};

export default function EditaisRelatoriosPage() {
  const [heatmap, setHeatmap] = useState<HeatmapRow[]>([]);
  const [previsoes, setPrevisoes] = useState<PrevisaoRow[]>([]);
  const [probHeatmap, setProbHeatmap] = useState<ProbabilityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [probError, setProbError] = useState<string | null>(null);
  const [probSearch, setProbSearch] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      setProbError(null);
      const [heatmapRes, prevRes, probRes] = await Promise.all([
        apiGet<ApiResponse<HeatmapRow[]>>('/editais/reports/heatmap'),
        apiGet<ApiResponse<PrevisaoRow[]>>('/editais/reports/previsao-provas'),
        apiGet<ApiResponse<ProbabilityRow[]>>('/editais/reports/heatmap-probabilidade?limit=40'),
      ]);

      if (!heatmapRes.success || !heatmapRes.data) throw new Error(heatmapRes.error || 'Erro no heatmap');
      if (!prevRes.success || !prevRes.data) throw new Error(prevRes.error || 'Erro na previsão');
      if (probRes.success && probRes.data) {
        setProbHeatmap(probRes.data);
      } else {
        setProbHeatmap([]);
        setProbError(probRes.error || 'Erro no heatmap de probabilidade');
      }

      setHeatmap(heatmapRes.data);
      setPrevisoes(prevRes.data);
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar relatórios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const grouped = heatmap.reduce<Record<string, HeatmapRow[]>>((acc, row) => {
    const key = row.banca || 'N/A';
    acc[key] = acc[key] || [];
    acc[key].push(row);
    return acc;
  }, {});

  const filteredProb = probHeatmap.filter((row) => {
    const needle = probSearch.trim().toLowerCase();
    if (!needle) return true;
    return row.banca.toLowerCase().includes(needle) || row.subtopico.toLowerCase().includes(needle);
  });

  const formatPercent = (value?: number | null) => {
    if (value === null || value === undefined) return '-';
    return `${Math.round(value * 100)}%`;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Relatórios de Editais</h1>
          <p className="text-sm text-slate-600">Heatmap por banca/status e previsão de provas.</p>
        </div>
        <button
          onClick={loadData}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 hover:border-blue-300 text-sm"
        >
          <RefreshCcw className="w-4 h-4" />
          Atualizar
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Heatmap */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            <h2 className="font-semibold text-slate-900 text-sm">Heatmap Banca x Status</h2>
          </div>
          {loading ? (
            <p className="text-sm text-slate-500">Carregando...</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(grouped).map(([banca, rows]) => (
                <div key={banca} className="border border-slate-100 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-900">{banca}</span>
                    <span className="text-xs text-slate-500">
                      Total: {rows.reduce((acc, r) => acc + Number(r.total || 0), 0)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {rows.map((r) => (
                      <span
                        key={`${banca}-${r.status}`}
                        className="px-3 py-1 rounded-full text-xs border border-slate-200 bg-slate-50"
                      >
                        {r.status}: {r.total}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              {heatmap.length === 0 && <p className="text-sm text-slate-500">Sem dados.</p>}
            </div>
          )}
        </div>

        {/* Previsão de provas */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-orange-600" />
            <h2 className="font-semibold text-slate-900 text-sm">Próximas provas previstas</h2>
          </div>
          {loading ? (
            <p className="text-sm text-slate-500">Carregando...</p>
          ) : previsoes.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma prova futura cadastrada.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {previsoes.map((p) => (
                <div key={p.id} className="py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{p.titulo}</p>
                      <p className="text-xs text-slate-500">
                        {p.banca || 'N/A'} • {p.status}
                      </p>
                    </div>
                    <div className="text-xs text-orange-700 font-semibold">
                      {p.data_prova_prevista
                        ? new Date(p.data_prova_prevista).toLocaleDateString('pt-BR')
                        : 'Data não informada'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-3">
          <div>
            <h2 className="font-semibold text-slate-900 text-sm">Heatmap de Probabilidade (Banca x Subtopico)</h2>
            <p className="text-xs text-slate-500">Topicos mais provaveis com base em questoes e frequencia.</p>
          </div>
          <input
            type="text"
            value={probSearch}
            onChange={(event) => setProbSearch(event.target.value)}
            placeholder="Filtrar banca ou subtopico"
            className="w-full md:w-60 rounded-lg border border-slate-200 px-3 py-2 text-xs"
          />
        </div>

        {probError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 mb-3">
            {probError}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-slate-500">Carregando...</p>
        ) : filteredProb.length === 0 ? (
          <p className="text-sm text-slate-500">Sem dados de probabilidade.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-2 py-2 font-semibold">Banca</th>
                  <th className="px-2 py-2 font-semibold">Subtopico</th>
                  <th className="px-2 py-2 font-semibold text-right">Prob Final</th>
                  <th className="px-2 py-2 font-semibold text-right">Prob Media</th>
                  <th className="px-2 py-2 font-semibold text-right">Freq</th>
                  <th className="px-2 py-2 font-semibold text-right">Questoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProb.slice(0, 30).map((row) => (
                  <tr key={`${row.banca}-${row.subtopico}`} className="hover:bg-slate-50">
                    <td className="px-2 py-2 text-slate-700">{row.banca}</td>
                    <td className="px-2 py-2 text-slate-900">{row.subtopico}</td>
                    <td className="px-2 py-2 text-right font-semibold text-blue-700">{formatPercent(row.prob_final)}</td>
                    <td className="px-2 py-2 text-right text-slate-600">{formatPercent(row.prob_media)}</td>
                    <td className="px-2 py-2 text-right text-slate-600">{formatPercent(row.prob_freq)}</td>
                    <td className="px-2 py-2 text-right text-slate-600">{row.total_questoes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
