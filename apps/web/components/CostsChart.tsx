"use client";

interface CostData {
  service: string;
  cost: number | string | null | undefined;
  breakdown: Record<string, number | string | null | undefined>;
}

const toNumber = (value: CostData["cost"]) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const fmt = (value: CostData["cost"]) => toNumber(value).toFixed(2);

export function CostsChart({ data }: { data: CostData[] }) {
  const total = data.reduce((sum, item) => sum + toNumber(item.cost), 0);
  const colors = {
    railway: "#0B84F3",
    vercel: "#000000",
    openai: "#10A37F"
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-900">Análise por Serviço</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data.map(item => (
          <div
            key={item.service}
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold capitalize text-slate-900">
                {item.service}
              </h3>
              <div
                className="w-4 h-4 rounded-full shadow-sm"
                style={{
                  backgroundColor:
                    colors[item.service as keyof typeof colors] || "#64748B"
                }}
              />
            </div>
            <div className="text-3xl font-bold text-blue-700">
              R$ {fmt(item.cost)}
            </div>
            <div className="text-xs text-slate-500 mt-2 font-medium">
              {total > 0 ? ((toNumber(item.cost) / total) * 100).toFixed(1) : "0.0"}% do total
            </div>
          </div>
        ))}
      </div>

      {/* Breakdown detalhado */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-6">Detalhamento Completo</h3>
        <div className="space-y-6">
          {data.map(item => (
            <div key={item.service} className="pb-6 border-b border-slate-200 last:border-b-0 last:pb-0">
              <div className="text-sm font-bold text-slate-900 mb-3 capitalize flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor:
                      colors[item.service as keyof typeof colors] || "#64748B"
                  }}
                />
                {item.service}
              </div>
              <div className="space-y-2 ml-5">
                {Object.entries(item.breakdown).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex justify-between text-sm"
                  >
                    <span className="capitalize text-slate-600">{key}</span>
                    <span className="font-semibold text-slate-900">R$ {fmt(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
