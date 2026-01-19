"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiGet, apiPatch } from "../../../lib/api";
import { Brain, Plus, Search, Filter, Edit, Trash2, Eye, BookOpen, Target } from "lucide-react";

interface Drop {
  id: string | number;
  discipline_id?: string | number;
  topic_code?: string;
  title?: string;
  difficulty?: number;
  status?: string;
  origin?: string | null;
}

export default function DropsPage() {
  const router = useRouter();
  const [drops, setDrops] = useState<Drop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [originFilter, setOriginFilter] = useState<string>("all");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await apiGet("/admin/drops");
        setDrops(data?.drops ?? data?.items ?? data ?? []);
      } catch (e) {
        console.error("Erro ao buscar drops:", e);
        setError("Erro ao carregar drops");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredDrops = drops.filter((drop) => {
    const matchesSearch =
      !searchTerm ||
      drop.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      drop.topic_code?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDifficulty =
      difficultyFilter === "all" || drop.difficulty?.toString() === difficultyFilter;
    const matchesStatus =
      statusFilter === "all" || (drop.status || "published") === statusFilter;
    const matchesOrigin =
      originFilter === "all" || (drop.origin || "system") === originFilter;
    return matchesSearch && matchesDifficulty && matchesStatus && matchesOrigin;
  });

  const stats = {
    total: drops.length,
    easy: drops.filter((d) => d.difficulty && d.difficulty <= 2).length,
    medium: drops.filter((d) => d.difficulty && d.difficulty === 3).length,
    hard: drops.filter((d) => d.difficulty && d.difficulty >= 4).length,
  };

  async function handleStatusChange(dropId: string | number, status: string) {
    try {
      setError(null);
      const data = await apiPatch(`/admin/drops/${dropId}/status`, { status });
      const updated = data?.data ?? data;
      if (updated) {
        setDrops((prev) =>
          prev.map((drop) => (drop.id === dropId ? { ...drop, ...updated } : drop))
        );
      }
    } catch (e) {
      console.error("Erro ao atualizar status:", e);
      setError("Erro ao atualizar status do drop");
    }
  }

  return (
    <div className="section-gap">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            Gestao de Drops
          </h1>
          <p className="page-subtitle">Gerenciar conteudo de aprendizado do sistema</p>
        </div>
        <button onClick={() => router.push('/admin/drops/novo')} className="btn-primary">
          <Plus className="w-4 h-4" />
          Novo Drop
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-600">Total de Drops</span>
            <BookOpen className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-blue-700">{stats.total}</div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-600">Facil (1-2)</span>
            <Target className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-3xl font-bold text-green-700">{stats.easy}</div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-600">Medio (3)</span>
            <Target className="w-5 h-5 text-yellow-600" />
          </div>
          <div className="text-3xl font-bold text-yellow-700">{stats.medium}</div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-600">Dificil (4-5)</span>
            <Target className="w-5 h-5 text-red-600" />
          </div>
          <div className="text-3xl font-bold text-red-700">{stats.hard}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-card">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 relative min-w-[240px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar drops por titulo ou topico..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-slate-400" />
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todas Dificuldades</option>
              <option value="1">Nivel 1</option>
              <option value="2">Nivel 2</option>
              <option value="3">Nivel 3</option>
              <option value="4">Nivel 4</option>
              <option value="5">Nivel 5</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todos Status</option>
              <option value="draft">Draft</option>
              <option value="published">Publicado</option>
              <option value="archived">Arquivado</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={originFilter}
              onChange={(e) => setOriginFilter(e.target.value)}
              className="px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todas Origens</option>
              <option value="manual">Manual</option>
              <option value="system">System</option>
              <option value="tutor">Tutor</option>
            </select>
          </div>
        </div>
      </div>

      {loading && <p className="text-sm text-slate-500">Carregando...</p>}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {!loading && drops.length === 0 && !error && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-slate-500">Nenhum drop encontrado</p>
        </div>
      )}

      {!loading && filteredDrops.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Titulo</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Disciplina</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Topico</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Dificuldade</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Origem</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredDrops.map((drop) => (
                  <tr key={drop.id} className="hover:bg-blue-50 transition-colors">
                    <td className="px-6 py-4 text-xs text-slate-500 font-mono">
                      {String(drop.id).substring(0, 8)}...
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/drops/${drop.id}`}
                        className="text-sm text-slate-900 hover:text-blue-600 hover:underline font-medium"
                      >
                        {drop.title || "Sem titulo"}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {drop.discipline_id || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {drop.topic_code || "-"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div
                              key={i}
                              className={`w-2.5 h-2.5 rounded-full ${
                                i < (drop.difficulty || 0)
                                  ? drop.difficulty && drop.difficulty >= 4
                                    ? "bg-red-500"
                                    : drop.difficulty === 3
                                    ? "bg-yellow-500"
                                    : "bg-green-500"
                                  : "bg-slate-300"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-slate-500 font-medium">
                          {drop.difficulty || "?"}/5
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                        {drop.status || "published"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {drop.origin || "system"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {drop.status === "draft" && (
                          <button
                            onClick={() => handleStatusChange(drop.id, "published")}
                            className="px-3 py-1.5 text-xs font-semibold text-green-700 bg-green-50 rounded-lg hover:bg-green-100"
                            title="Publicar"
                          >
                            Publicar
                          </button>
                        )}
                        {drop.status === "published" && (
                          <button
                            onClick={() => handleStatusChange(drop.id, "archived")}
                            className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
                            title="Arquivar"
                          >
                            Arquivar
                          </button>
                        )}
                        <button
                          onClick={() => router.push(`/admin/drops/${drop.id}`)}
                          className="p-2 hover:bg-blue-50 rounded-xl transition-colors"
                          title="Visualizar"
                        >
                          <Eye className="w-4 h-4 text-blue-600" />
                        </button>
                        <button
                          className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4 text-slate-600" />
                        </button>
                        <button
                          className="p-2 hover:bg-red-50 rounded-xl transition-colors"
                          title="Deletar"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
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

      {!loading && filteredDrops.length > 0 && (
        <div className="text-center text-sm text-slate-500 font-medium">
          Mostrando {filteredDrops.length} de {drops.length} drops
        </div>
      )}
    </div>
  );
}
