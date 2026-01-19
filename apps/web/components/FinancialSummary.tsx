
"use client";

import { useEffect, useState } from "react";
import { apiGet } from "../lib/api";
import type { ApiResponse } from "../lib/api";

interface CostData {
  totalCost: number;
  totalCostCents: number;
  currency: string;
  period: string;
  breakdown: Array<{
    service: string;
    cost: number;
    costCents: number;
    breakdown: Record<string, number>;
    status: string;
  }>;
  lastUpdated: string;
}

function formatCurrency(value: number, currency: string) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency
  });
}

export function FinancialSummary() {
  const [costs, setCosts] = useState<CostData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const response = await apiGet<ApiResponse<CostData>>("/admin/costs/real/overview");
        if (!response?.success || !response.data) {
          throw new Error("Resposta de custos invalida");
        }
        setCosts(response.data);
      } catch (e) {
        console.error("Erro ao buscar custos:", e);
        setCosts(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <div className="text-sm text-zinc-400">Carregando custos...</div>;
  }

  if (!costs) {
    return <div className="text-sm text-zinc-400">Erro ao carregar custos</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <span className="text-2xl">R$</span>
          Resumo Financeiro
        </h2>
      </div>

      {/* Custo Total */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
        <div className="text-sm font-medium opacity-90">Custo Total ({costs.period})</div>
        <div className="text-4xl font-bold mt-2">
          {formatCurrency(costs.totalCost, costs.currency)}
        </div>
        <div className="text-xs opacity-75 mt-2">
          Atualizado em {new Date(costs.lastUpdated).toLocaleString("pt-BR")}
        </div>
      </div>

      {/* Breakdown por servico */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {costs.breakdown.map((item) => (
          <div
            key={item.service}
            className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="text-xs text-slate-600 capitalize font-medium">{item.service}</div>
            <div className="text-lg font-bold text-blue-700 mt-2">
              {formatCurrency(item.cost, costs.currency)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
