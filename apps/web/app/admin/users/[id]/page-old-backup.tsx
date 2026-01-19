export const dynamic = 'force-dynamic';

import { apiGet } from "../../../../lib/api";

interface UserDetail {
  id: string;
  email: string;
  name?: string;
  bio?: string;
  avatar_url?: string;
  role?: string;
  status?: string;
  plan?: string;
  created_at?: string;
  updated_at?: string;
  stats?: {
    drops?: number;
    reviews?: number;
    disciplines?: number;
  };
  metadata?: Record<string, any>;
}

async function getUserDetail(id: string): Promise<UserDetail | null> {
  try {
    const data = await apiGet(`/admin/users/${id}`);
    return data;
  } catch (e) {
    console.error("Erro ao buscar usuário:", e);
    return null;
  }
}

export default async function UserDetailPage({ params }: { params: { id: string } }) {
  const user = await getUserDetail(params.id);

  if (!user) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Usuário não encontrado</h1>
        <p className="text-sm text-zinc-400">O usuário que você está procurando não existe ou foi removido.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        {user.avatar_url && (
          <img
            src={user.avatar_url}
            alt={user.name}
            className="w-16 h-16 rounded-lg object-cover"
          />
        )}
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{user.name || user.email}</h1>
          <p className="text-sm text-zinc-400">{user.email}</p>
        </div>
      </div>

      {/* Status e Plano */}
      <div className="grid gap-4 md:grid-cols-3">
        {user.status && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
            <p className="text-xs text-zinc-500 mb-1">Status</p>
            <p className="text-sm font-medium text-zinc-300 capitalize">{user.status}</p>
          </div>
        )}
        {user.plan && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
            <p className="text-xs text-zinc-500 mb-1">Plano</p>
            <p className="text-sm font-medium text-zinc-300 capitalize">{user.plan}</p>
          </div>
        )}
        {user.role && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
            <p className="text-xs text-zinc-500 mb-1">Role</p>
            <p className="text-sm font-medium text-zinc-300 capitalize">{user.role}</p>
          </div>
        )}
      </div>

      {/* Bio */}
      {user.bio && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-6">
          <h2 className="text-lg font-semibold mb-4">Bio</h2>
          <p className="text-sm text-zinc-300">{user.bio}</p>
        </div>
      )}

      {/* Estatísticas */}
      {user.stats && (
        <div className="grid gap-4 md:grid-cols-3">
          {user.stats.drops !== undefined && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
              <p className="text-xs text-zinc-500 mb-1">Drops</p>
              <p className="text-2xl font-bold text-white">{user.stats.drops}</p>
            </div>
          )}
          {user.stats.reviews !== undefined && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
              <p className="text-xs text-zinc-500 mb-1">Reviews</p>
              <p className="text-2xl font-bold text-white">{user.stats.reviews}</p>
            </div>
          )}
          {user.stats.disciplines !== undefined && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
              <p className="text-xs text-zinc-500 mb-1">Disciplinas</p>
              <p className="text-2xl font-bold text-white">{user.stats.disciplines}</p>
            </div>
          )}
        </div>
      )}

      {/* Datas */}
      <div className="grid gap-4 md:grid-cols-2">
        {user.created_at && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
            <p className="text-xs text-zinc-500 mb-1">Criado em</p>
            <p className="text-sm font-medium text-zinc-300">
              {new Date(user.created_at).toLocaleDateString("pt-BR", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              })}
            </p>
          </div>
        )}
        {user.updated_at && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
            <p className="text-xs text-zinc-500 mb-1">Atualizado em</p>
            <p className="text-sm font-medium text-zinc-300">
              {new Date(user.updated_at).toLocaleDateString("pt-BR", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              })}
            </p>
          </div>
        )}
      </div>

      {/* Metadados */}
      {user.metadata && Object.keys(user.metadata).length > 0 && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-6">
          <h2 className="text-lg font-semibold mb-4">Metadados</h2>
          <pre className="text-xs text-zinc-400 overflow-auto max-h-64 bg-zinc-900/40 p-4 rounded">
            {JSON.stringify(user.metadata, null, 2)}
          </pre>
        </div>
      )}

      {/* ID */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
        <p className="text-xs text-zinc-500 mb-1">ID</p>
        <p className="text-xs text-zinc-400 font-mono break-all">{user.id}</p>
      </div>
    </div>
  );
}
