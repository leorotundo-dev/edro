
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiGet } from "../../../lib/api";
import type { ApiResponse } from "../../../lib/api";
import {
  Users as UsersIcon,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Mail,
  Download
} from "lucide-react";

interface UserRow {
  id: string;
  email: string;
  name?: string | null;
  plan?: string | null;
  created_at?: string | null;
}

type UsersApiResponse = ApiResponse<UserRow[] | { items: UserRow[] }> & {
  items?: UserRow[];
  total?: number;
};

const PLAN_STYLES: Record<string, string> = {
  free: "bg-slate-100 text-slate-700",
  basic: "bg-blue-100 text-blue-700",
  premium: "bg-purple-100 text-purple-700",
  enterprise: "bg-indigo-100 text-indigo-700"
};

function extractUsers(response: UsersApiResponse): UserRow[] {
  if (Array.isArray(response?.items)) {
    return response.items;
  }
  const data = response?.data;
  if (Array.isArray(data)) {
    return data as UserRow[];
  }
  if (data && Array.isArray((data as any).items)) {
    return (data as any).items as UserRow[];
  }
  return [];
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function normalizePlanLabel(plan?: string | null) {
  if (!plan) return "Sem plano";
  const normalized = plan.trim().toLowerCase();
  return normalized ? normalized : "Sem plano";
}

export default function UsersPage() {
  const router = useRouter();
  const [items, setItems] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiGet<UsersApiResponse>("/admin/users");
      if (!response?.success) {
        throw new Error(response?.error || "Não foi possível carregar os usuários");
      }

      const rawUsers = extractUsers(response);
      const normalized = rawUsers.map((user, index) => ({
        id: String(user.id ?? user.email ?? `temp-${index}`),
        email: user.email,
        name: user.name ?? user.email?.split("@")[0] ?? "Usuário",
        plan: user.plan ?? null,
        created_at: user.created_at ?? null
      }));

      setItems(normalized);
    } catch (err) {
      console.error("Erro ao buscar usuários:", err);
      setError(err instanceof Error ? err.message : "Erro desconhecido ao carregar usuários");
      setItems([]);
    } finally {
      setLoading(false);
      setSelectedUsers(new Set());
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredItems = useMemo(() => {
    if (!searchTerm) return items;
    const term = searchTerm.toLowerCase();
    return items.filter((user) => {
      return (
        user.name?.toLowerCase().includes(term) ||
        user.email?.toLowerCase().includes(term)
      );
    });
  }, [items, searchTerm]);

  const stats = useMemo(() => {
    const now = Date.now();
    const recentThreshold = 30 * 24 * 60 * 60 * 1000;
    const recent = items.filter((user) => {
      if (!user.created_at) return false;
      const created = new Date(user.created_at).getTime();
      return !Number.isNaN(created) && now - created <= recentThreshold;
    }).length;

    const premium = items.filter((user) =>
      (user.plan ?? "").toLowerCase().includes("premium")
    ).length;

    return {
      total: items.length,
      recent,
      premium,
      selected: selectedUsers.size
    };
  }, [items, selectedUsers.size]);

  const toggleSelectAll = () => {
    if (selectedUsers.size === filteredItems.length) {
      setSelectedUsers(new Set());
      return;
    }
    setSelectedUsers(new Set(filteredItems.map((user) => user.id)));
  };

  const toggleSelectUser = (id: string) => {
    setSelectedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <UsersIcon className="w-6 h-6 text-white" />
            </div>
            Gestão de Usuários
          </h1>
          <p className="text-slate-600 mt-2">
            Acompanhe contas criadas, planos ativos e selecione usuários para ações rápidas.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center gap-2 transition-colors font-medium shadow-sm"
          >
            <Download className="w-4 h-4" />
            Exportar
          </button>
          <button
            onClick={() => router.push("/admin/users/novo")}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 transition-colors font-medium shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Novo Usuário
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-indigo-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-600">Total de Usuários</span>
            <UsersIcon className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="text-3xl font-bold text-indigo-700">{stats.total}</div>
        </div>
        <div className="bg-white border border-purple-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-600">Planos Premium</span>
            <Mail className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-3xl font-bold text-purple-700">{stats.premium}</div>
        </div>
        <div className="bg-white border border-blue-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-600">Novos (30 dias)</span>
            <UsersIcon className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-blue-700">{stats.recent}</div>
        </div>
        <div className="bg-white border border-green-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-600">Selecionados</span>
            <UsersIcon className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-3xl font-bold text-green-700">{stats.selected}</div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou e-mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={loadUsers}
            disabled={loading}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-70 text-white rounded-lg flex items-center gap-2 transition-colors font-medium shadow-sm"
          >
            {loading ? "Atualizando..." : "Atualizar"}
          </button>
        </div>
        {selectedUsers.size > 0 && (
          <div className="flex items-center gap-2 mt-4">
            <span className="text-sm font-medium text-slate-600">{selectedUsers.size} selecionados</span>
            <button className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm flex items-center gap-2 transition-colors shadow-sm">
              <Trash2 className="w-4 h-4" />
              Deletar
            </button>
            <button className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm flex items-center gap-2 transition-colors shadow-sm">
              <Mail className="w-4 h-4" />
              Enviar Email
            </button>
          </div>
        )}
      </div>

      {loading && <p className="text-sm text-slate-500">Carregando usuários...</p>}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {!loading && !error && filteredItems.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-slate-500">Nenhum usuário encontrado</p>
        </div>
      )}

      {!loading && filteredItems.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left">
                    <input
                      type="checkbox"
                      checked={filteredItems.length > 0 && selectedUsers.size === filteredItems.length}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Usuário
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    E-mail
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Plano
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Criado em
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredItems.map((user) => {
                  const isSelected = selectedUsers.has(user.id);
                  const planKey = normalizePlanLabel(user.plan).toLowerCase();
                  const badgeClass = PLAN_STYLES[planKey] ?? PLAN_STYLES.free;

                  return (
                    <tr key={user.id} className="hover:bg-blue-50 transition-colors">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectUser(user.id)}
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                            {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
                          </div>
                          <div>
                            <Link
                              href={`/admin/users/${user.id}`}
                              className="text-sm text-slate-900 hover:text-indigo-600 hover:underline font-medium"
                            >
                              {user.name || "Sem nome"}
                            </Link>
                            <div className="text-xs text-slate-500">ID: {user.id.substring(0, 8)}...</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-slate-400" />
                          <span className="text-sm text-slate-600">{user.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 text-xs rounded-full font-medium ${badgeClass}`}>
                          {normalizePlanLabel(user.plan).toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">{formatDate(user.created_at)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => router.push(`/admin/users/${user.id}`)}
                            className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Visualizar"
                          >
                            <Eye className="w-4 h-4 text-blue-600" />
                          </button>
                          <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors" title="Editar">
                            <Edit className="w-4 h-4 text-slate-600" />
                          </button>
                          <button className="p-2 hover:bg-red-50 rounded-lg transition-colors" title="Deletar">
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !error && filteredItems.length > 0 && (
        <div className="text-center text-sm text-slate-500 font-medium">
          Mostrando {filteredItems.length} de {items.length} usuários
        </div>
      )}
    </div>
  );
}
