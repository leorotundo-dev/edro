"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiGet } from "../../../lib/api";
import { FileText, Plus, Search, Filter, Edit, Trash2, Eye, Download, Upload } from "lucide-react";

interface Blueprint {
  id: string | number;
  name?: string;
  disciplina?: string;
  topicCode?: string;
  created_at?: string;
  updated_at?: string;
}

export default function BlueprintsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Blueprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [disciplineFilter, setDisciplineFilter] = useState<string>("all");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await apiGet("/admin/debug/blueprints");
        setItems(data?.items ?? data ?? []);
      } catch (e) {
        console.error("Erro ao buscar blueprints:", e);
        setError("Erro ao carregar blueprints");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredItems = items.filter((bp) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      bp.name?.toLowerCase().includes(term) ||
      bp.disciplina?.toLowerCase().includes(term) ||
      bp.topicCode?.toLowerCase().includes(term);
    const matchesDiscipline = disciplineFilter === "all" || bp.disciplina === disciplineFilter;
    return matchesSearch && matchesDiscipline;
  });

  const disciplines = Array.from(new Set(items.map((bp) => bp.disciplina).filter(Boolean)));

  return (
    <div className="section-gap">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 text-white rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            Gestao de Blueprints
          </h1>
          <p className="page-subtitle">Modelos de provas e estruturas de aprendizado</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-secondary">
            <Upload className="w-4 h-4" />
            Importar
          </button>
          <button onClick={() => router.push("/admin/blueprints/novo")} className="btn-primary">
            <Plus className="w-4 h-4" />
            Novo Blueprint
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Total de Blueprints", value: items.length, icon: FileText },
          { label: "Disciplinas", value: disciplines.length, icon: FileText },
          { label: "Resultados filtrados", value: filteredItems.length, icon: Filter }
        ].map((item) => (
          <div key={item.label} className="stat-card">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <item.icon className="w-4 h-4 text-slate-500" />
              <span>{item.label}</span>
            </div>
            <div className="text-2xl font-semibold text-slate-900 mt-2">{item.value}</div>
          </div>
        ))}
      </div>

      <div className="filter-card">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar blueprints por nome, disciplina ou topico..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-slate-400" />
            <select
              value={disciplineFilter}
              onChange={(e) => setDisciplineFilter(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todas as Disciplinas</option>
              {disciplines.map((disc) => (
                <option key={disc} value={disc}>
                  {disc}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading && <div className="stat-card text-sm text-slate-600">Carregando...</div>}

      {error && (
        <div className="stat-card border-red-200 bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      {!loading && items.length === 0 && !error && (
        <div className="stat-card text-center text-sm text-slate-600">Nenhum blueprint encontrado</div>
      )}

      {!loading && filteredItems.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Disciplina
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Topico
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Criado em
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Acoes
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredItems.map((bp) => (
                  <tr key={bp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-xs text-slate-500 font-mono">
                      {typeof bp.id === "string" ? bp.id.substring(0, 8) : bp.id}...
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/blueprints/${bp.id}`}
                        className="text-sm text-slate-900 hover:text-blue-600 hover:underline font-medium"
                      >
                        {bp.name || "Sem nome"}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{bp.disciplina || "-"}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{bp.topicCode || "-"}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {bp.created_at ? new Date(bp.created_at).toLocaleDateString("pt-BR") : "-"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => router.push(`/admin/blueprints/${bp.id}`)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Visualizar"
                        >
                          <Eye className="w-4 h-4 inline" />
                        </button>
                        <button className="text-slate-600 hover:text-slate-900" title="Editar">
                          <Edit className="w-4 h-4 inline" />
                        </button>
                        <button className="text-slate-600 hover:text-slate-900" title="Exportar">
                          <Download className="w-4 h-4 inline" />
                        </button>
                        <button className="text-red-600 hover:text-red-800" title="Deletar">
                          <Trash2 className="w-4 h-4 inline" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && filteredItems.length > 0 && (
        <div className="text-center text-sm text-slate-600">
          Mostrando {filteredItems.length} de {items.length} blueprints
        </div>
      )}
    </div>
  );
}
