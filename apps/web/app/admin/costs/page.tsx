
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGet } from "../../../lib/api";
import type { ApiResponse } from "../../../lib/api";
import { CostsChart } from "../../../components/CostsChart";
import {
  Activity,
  DollarSign,
  RefreshCw,
  Server
} from "lucide-react";

interface CostServiceBreakdown {
  service: string;
  cost: number;
  costCents: number;
  breakdown: Record<string, number>;
  status: string;
}

interface CostOverview {
  totalCost: number;
  totalCostCents: number;
  currency: string;
  period: string;
  breakdown: CostServiceBreakdown[];
  lastUpdated: string;
}

function formatCurrency(value: number, currency: string) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency
  });
}

function humanPeriod(period: string) {
  if (period === "monthly") return "Ultimos 30 dias";
  if (period === "weekly") return "Ultimos 7 dias";
  return period;
}

export default function CostsPage() {
  const [costs, setCosts] = useState<CostOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiGet<ApiResponse<CostOverview>>("/admin/costs/real/overview");
      if (!response?.success || !response.data) {
        throw new Error("Resposta de custos invalida");
      }
      setCosts(response.data);
    } catch (err) {
      console.error("Erro ao buscar custos:", err);
      setCosts(null);
      setError(
        err instanceof Error
          ? err.message
          : "Nao foi possivel carregar os custos em tempo real"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const extraMetrics = useMemo(() => {
    if (!costs) {
      return {
        averageDaily: 0,
        projectionYear: 0
      };
    }

    return {
      averageDaily: costs.totalCost / 30,
      projectionYear: costs.totalCost * 12
    };
  }, [costs]);

  const servicesCount = costs?.breakdown.length ?? 0;
  const lastUpdated = costs
    ? new Date(costs.lastUpdated).toLocaleString("pt-BR")
    : "";
  const periodLabel = costs ? humanPeriod(costs.period) : "";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            Custos e Assinaturas
          </h1>
          <p className="text-slate-600 mt-2 max-w-2xl">
            Monitoramento em tempo real dos custos operacionais (Railway, Vercel e OpenAI).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={load}
            disabled={loading}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-70 text-white rounded-lg flex items-center gap-2 transition-colors font-medium shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            {loading ? "Atualizando..." : "Atualizar"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {loading && <p className="text-sm text-slate-500">Carregando dados de custos...</p>}

      {!loading && costs && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 rounded-xl border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <p className="text-sm font-medium text-slate-600">Custo Total ({periodLabel})</p>
              </div>
              <div className="text-5xl font-bold text-green-700 mb-4">
                {formatCurrency(costs.totalCost, costs.currency)}
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                Atualizado em
                <span className="font-semibold text-slate-900">{lastUpdated}</span>
              </div>
            </div>

            <div className="bg-white border border-blue-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-600">Servicos Monitorados</span>
                <Server className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-blue-700">{servicesCount}</div>
              <p className="text-xs text-slate-500 mt-2">Custos por provedor conectados na API</p>
            </div>

            <div className="bg-white border border-purple-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-600">Media diaria</span>
                <Activity className="w-5 h-5 text-purple-600" />
              </div>
              <div className="text-3xl font-bold text-purple-700">
                {formatCurrency(extraMetrics.averageDaily, costs.currency)}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Projecao anual: {formatCurrency(extraMetrics.projectionYear, costs.currency)}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <CostsChart data={costs.breakdown} />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <Server className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-bold text-slate-900">Detalhamento por servico</h2>
            </div>
            <div className="space-y-6">
              {costs.breakdown.map((service) => (
                <div key={service.service} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 capitalize">{service.service}</p>
                      <p className="text-xs text-slate-500">
                        {Object.keys(service.breakdown).length} itens monitorados
                      </p>
                    </div>
                    <div className="text-2xl font-bold text-slate-900">
                      {formatCurrency(service.cost, costs.currency)}
                    </div>
                  </div>
                  {Object.keys(service.breakdown).length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                      {Object.entries(service.breakdown).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between text-sm">
                          <span className="text-slate-600">{key}</span>
                          <span className="font-medium text-slate-900">
                            {formatCurrency(value, costs.currency)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 mt-4">Sem consumo registrado neste periodo.</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
