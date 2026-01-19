"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiGet, apiPost } from "../../../lib/api";
import { Leaf, Plus, Search, Filter, Edit, Trash2, Eye, Play, Pause, CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react";

interface HarvestItem {
  id: string | number;
  source?: string;
  url?: string;
  status?: string;
  title?: string;
  description?: string;
  progress?: number;
  created_at?: string;
  updated_at?: string;
  content_type?: string;
  edital_id?: string | null;
}

export default function HarvestPage() {
  const router = useRouter();
  const [items, setItems] = useState<HarvestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [running, setRunning] = useState(false);

  const normalizeStatus = (status?: string) => (status === "error" ? "failed" : status);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiGet("/admin/harvest/items");
      setItems(data?.items ?? data ?? []);
    } catch (e) {
      console.error("Erro ao buscar harvest items:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const runAll = async () => {
    setRunning(true);
    try {
      const response = await apiPost("/harvest/run-all", { async: true });
      const queued = response?.data?.queued;
      if (response?.success || queued) {
        alert("Coleta iniciada em background. Atualize em alguns minutos.");
      } else {
        alert("Nao foi possivel iniciar a coleta.");
      }
    } catch (err) {
      console.error("Erro ao iniciar coleta:", err);
      alert("Erro ao iniciar a coleta.");
    } finally {
      setRunning(false);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = !searchTerm ||
      item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.source?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.url?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || normalizeStatus(item.status) === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: items.length,
    pending: items.filter(i => normalizeStatus(i.status) === "pending").length,
    processing: items.filter(i => normalizeStatus(i.status) === "processing").length,
    completed: items.filter(i => normalizeStatus(i.status) === "completed").length,
    failed: items.filter(i => normalizeStatus(i.status) === "failed").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Leaf className="w-7 h-7 text-green-400" />
            Gestão de Harvest
          </h1>
          <p className="text-slate-600 mt-2">
            Gerenciar coleta e processamento de conteúdo externo
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => load()}
            className="px-6 py-3 bg-slate-50 hover:bg-slate-100 text-slate-900 rounded-xl flex items-center gap-2 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </button>
          <button
            onClick={runAll}
            disabled={running}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-600/70 text-white rounded-xl flex items-center gap-2 transition-colors"
          >
            {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {running ? "Iniciando..." : "Iniciar Coleta"}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600">Total</span>
            <Leaf className="w-5 h-5 text-green-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
        </div>
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600">Pendentes</span>
            <Clock className="w-5 h-5 text-yellow-400" />
          </div>
          <div className="text-2xl font-bold text-yellow-400">{stats.pending}</div>
        </div>
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600">Processando</span>
            <RefreshCw className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-blue-400">{stats.processing}</div>
        </div>
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600">Completos</span>
            <CheckCircle className="w-5 h-5 text-green-400" />
          </div>
          <div className="text-2xl font-bold text-green-400">{stats.completed}</div>
        </div>
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600">Falhas</span>
            <XCircle className="w-5 h-5 text-red-400" />
          </div>
          <div className="text-2xl font-bold text-red-400">{stats.failed}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-600" />
            <input
              type="text"
              placeholder="Buscar por título, fonte ou URL..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-600" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-6 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">Todos os Status</option>
              <option value="pending">Pendentes</option>
              <option value="processing">Processando</option>
              <option value="completed">Completos</option>
              <option value="failed">Falhas</option>
            </select>
          </div>
        </div>
      </div>

      {loading && <p className="text-sm text-slate-600">Carregando...</p>}

      {!loading && items.length === 0 && (
        <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-6 text-center">
          <p className="text-sm text-slate-600">Nenhum harvest item encontrado</p>
        </div>
      )}

      {!loading && filteredItems.length > 0 && (
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-600 uppercase">Título</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-600 uppercase">Fonte</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-600 uppercase">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-600 uppercase">Progresso</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-600 uppercase">Atualizado</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-slate-600 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredItems.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/harvest/${item.id}`}
                        className="text-sm text-slate-900 hover:text-green-400 hover:underline font-medium"
                      >
                        {item.title || "Sem título"}
                      </Link>
                      {item.description && (
                        <div className="text-xs text-slate-9000 mt-1 line-clamp-1">{item.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600">{item.source || "-"}</span>
                      {item.url && (
                        <div className="text-xs text-zinc-600 mt-1 truncate max-w-xs">{item.url}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full flex items-center gap-1 w-fit ${
                        normalizeStatus(item.status) === "completed" ? "bg-green-500/20 text-green-400" :
                        normalizeStatus(item.status) === "processing" ? "bg-blue-500/20 text-blue-400" :
                        normalizeStatus(item.status) === "pending" ? "bg-yellow-500/20 text-yellow-400" :
                        normalizeStatus(item.status) === "failed" ? "bg-red-500/20 text-red-400" :
                        "bg-slate-100 text-slate-600"
                      }`}>
                        {normalizeStatus(item.status) === "completed" && <CheckCircle className="w-3 h-3" />}
                        {normalizeStatus(item.status) === "processing" && <RefreshCw className="w-3 h-3 animate-spin" />}
                        {normalizeStatus(item.status) === "pending" && <Clock className="w-3 h-3" />}
                        {normalizeStatus(item.status) === "failed" && <XCircle className="w-3 h-3" />}
                        {normalizeStatus(item.status) || "N/A"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {item.progress !== undefined ? (
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-slate-100 rounded-full h-2">
                            <div
                              className="bg-green-500 h-2 rounded-full transition-all"
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-600">{item.progress}%</span>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-9000">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-9000">
                      {(item.updated_at || item.created_at)
                        ? new Date(item.updated_at || item.created_at || "").toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit"
                          })
                        : "-"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => router.push(`/admin/harvest/${item.id}`)}
                          className="p-1.5 hover:bg-slate-50 rounded transition-colors"
                          title="Visualizar"
                        >
                          <Eye className="w-4 h-4 text-blue-400" />
                        </button>
                        {normalizeStatus(item.status) === "failed" && (
                          <button
                            className="p-1.5 hover:bg-slate-50 rounded transition-colors"
                            title="Reprocessar"
                          >
                            <RefreshCw className="w-4 h-4 text-green-400" />
                          </button>
                        )}
                        <button
                          className="p-1.5 hover:bg-slate-50 rounded transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4 text-slate-600" />
                        </button>
                        <button
                          className="p-1.5 hover:bg-slate-50 rounded transition-colors"
                          title="Deletar"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
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
          Mostrando {filteredItems.length} de {items.length} itens
        </div>
      )}
    </div>
  );
}
