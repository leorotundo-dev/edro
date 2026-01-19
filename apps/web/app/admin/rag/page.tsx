"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiGet } from "../../../lib/api";
import { Database, Plus, Search, Filter, Edit, Trash2, Eye, RefreshCw, Sparkles } from "lucide-react";

interface RagBlock {
  id: string | number;
  disciplina?: string;
  topicCode?: string;
  sourceUrl?: string;
  title?: string;
  content?: string;
  type?: string;
  status?: string;
  createdAt?: string;
  created_at?: string;
  updated_at?: string;
}

export default function RagPage() {
  const router = useRouter();
  const [items, setItems] = useState<RagBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiGet("/admin/rag/blocks");
      setItems(data?.items ?? data ?? []);
    } catch (e) {
      console.error("Erro ao buscar RAG blocks:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredItems = items.filter((b) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      b.title?.toLowerCase().includes(term) ||
      b.disciplina?.toLowerCase().includes(term) ||
      b.content?.toLowerCase().includes(term);
    const matchesStatus = statusFilter === "all" || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: items.length,
    active: items.filter((b) => b.status === "active").length,
    pending: items.filter((b) => b.status === "pending").length,
    processed: items.filter((b) => b.status === "processed").length
  };

  const statusBadge = (status?: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700";
      case "pending":
        return "bg-yellow-100 text-yellow-700";
      case "processed":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  return (
    <div className="section-gap">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 text-white rounded-lg flex items-center justify-center">
              <Database className="w-6 h-6" />
            </div>
            RAG Blocks
          </h1>
          <p className="page-subtitle">Blocos de conhecimento para retrieval augmented generation</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => load()} className="btn-secondary">
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </button>
          <button className="btn-primary">
            <Plus className="w-4 h-4" />
            Novo RAG Block
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[ 
          { label: "Total de Blocks", value: stats.total, icon: Database },
          { label: "Ativos", value: stats.active, icon: Sparkles },
          { label: "Pendentes", value: stats.pending, icon: RefreshCw },
          { label: "Processados", value: stats.processed, icon: Sparkles }
        ].map((card) => (
          <div key={card.label} className="stat-card">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <card.icon className="w-4 h-4 text-slate-500" />
              <span>{card.label}</span>
            </div>
            <div className="text-2xl font-semibold text-slate-900 mt-2">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="filter-card">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar blocks por titulo, disciplina ou conteudo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos os Status</option>
              <option value="active">Ativos</option>
              <option value="pending">Pendentes</option>
              <option value="processed">Processados</option>
            </select>
          </div>
        </div>
      </div>

      {loading && <div className="stat-card text-sm text-slate-600">Carregando...</div>}

      {!loading && items.length === 0 && (
        <div className="stat-card text-center text-sm text-slate-600">Nenhum RAG block encontrado</div>
      )}

      {!loading && filteredItems.length > 0 && (
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Titulo</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Criado em</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredItems.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-xs text-slate-500 font-mono">
                      {typeof b.id === "string" ? b.id.substring(0, 8) : b.id}...
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/rag/${b.id}`}
                        className="text-sm text-slate-900 hover:text-blue-600 hover:underline font-medium"
                      >
                        {b.title || b.disciplina || "Sem titulo"}
                      </Link>
                      {b.disciplina && (
                        <div className="text-xs text-slate-500 mt-1">{b.disciplina}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs bg-slate-100 text-slate-700 rounded-full">
                        {b.type || b.topicCode || "RAG"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusBadge(b.status)}`}>
                        {b.status || "N/A"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {b.created_at || b.createdAt
                        ? new Date(b.created_at || b.createdAt || "").toLocaleDateString("pt-BR")
                        : "-"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => router.push(`/admin/rag/${b.id}`)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Visualizar"
                        >
                          <Eye className="w-4 h-4 inline" />
                        </button>
                        <button className="text-slate-600 hover:text-slate-900" title="Editar">
                          <Edit className="w-4 h-4 inline" />
                        </button>
                        <button className="text-slate-600 hover:text-slate-900" title="Reprocessar">
                          <RefreshCw className="w-4 h-4 inline" />
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
          Mostrando {filteredItems.length} de {items.length} RAG blocks
        </div>
      )}
    </div>
  );
}
