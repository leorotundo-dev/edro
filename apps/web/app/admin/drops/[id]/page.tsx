"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiGet, apiPatch } from "../../../../lib/api";

interface DropDetail {
  id: string;
  title: string;
  content?: string;
  discipline_id?: string;
  topic_code?: string;
  difficulty?: number;
  status?: string;
  origin?: string | null;
  origin_user_id?: string | null;
  origin_meta?: Record<string, any> | null;
  approved_by?: string | null;
  approved_at?: string | null;
  drop_text?: Record<string, any> | null;
  created_at?: string;
  updated_at?: string;
}

export default function DropDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dropId = params.id as string;

  const [drop, setDrop] = useState<DropDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await apiGet(`/admin/drops/${dropId}`);
        setDrop(data?.data ?? data);
      } catch (e) {
        console.error("Erro ao buscar drop:", e);
        setError("Erro ao carregar detalhes do drop");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [dropId]);

  async function handleStatusChange(status: string) {
    if (!drop) return;
    try {
      setError(null);
      const data = await apiPatch(`/admin/drops/${drop.id}/status`, { status });
      const updated = data?.data ?? data;
      if (updated) setDrop(updated);
    } catch (e) {
      console.error("Erro ao atualizar status:", e);
      setError("Erro ao atualizar status do drop");
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <button onClick={() => router.back()} className="text-sm text-blue-400 hover:text-blue-300">
          Voltar
        </button>
        <p className="text-sm text-zinc-400">Carregando...</p>
      </div>
    );
  }

  if (error || !drop) {
    return (
      <div className="space-y-4">
        <button onClick={() => router.back()} className="text-sm text-blue-400 hover:text-blue-300">
          Voltar
        </button>
        <div className="rounded-lg border border-red-900 bg-red-950/40 p-4">
          <p className="text-sm text-red-400">{error || "Drop nao encontrado"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={() => router.back()}
          className="text-sm text-blue-400 hover:text-blue-300 mb-4"
        >
          Voltar
        </button>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold text-white">{drop.title}</h1>
          <span className="inline-flex items-center rounded-full bg-zinc-800 px-2 py-1 text-xs font-semibold text-zinc-200">
            {drop.status || "published"}
          </span>
        </div>
        <p className="text-sm text-zinc-400">ID: {drop.id}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {drop.status === "draft" && (
          <button
            onClick={() => handleStatusChange("published")}
            className="px-3 py-1.5 text-xs font-semibold text-green-200 bg-green-900/40 rounded-lg"
          >
            Publicar
          </button>
        )}
        {drop.status === "published" && (
          <button
            onClick={() => handleStatusChange("archived")}
            className="px-3 py-1.5 text-xs font-semibold text-zinc-300 bg-zinc-800 rounded-lg"
          >
            Arquivar
          </button>
        )}
        {drop.status === "archived" && (
          <button
            onClick={() => handleStatusChange("published")}
            className="px-3 py-1.5 text-xs font-semibold text-blue-200 bg-blue-900/40 rounded-lg"
          >
            Reativar
          </button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {drop.difficulty && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
            <p className="text-xs text-zinc-500 mb-1">Dificuldade</p>
            <p className="text-2xl font-bold text-white">{drop.difficulty}</p>
          </div>
        )}
        {drop.discipline_id && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
            <p className="text-xs text-zinc-500 mb-1">Disciplina</p>
            <p className="text-sm font-medium text-zinc-300 truncate">{drop.discipline_id}</p>
          </div>
        )}
        {drop.topic_code && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
            <p className="text-xs text-zinc-500 mb-1">Topico</p>
            <p className="text-sm font-medium text-zinc-300 truncate">{drop.topic_code}</p>
          </div>
        )}
        {drop.origin && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
            <p className="text-xs text-zinc-500 mb-1">Origem</p>
            <p className="text-sm font-medium text-zinc-300 truncate">{drop.origin}</p>
          </div>
        )}
      </div>

      {(drop.approved_by || drop.approved_at) && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
          <p className="text-xs text-zinc-500 mb-1">Aprovacao</p>
          <p className="text-sm text-zinc-300">
            {drop.approved_by ? `Aprovado por ${drop.approved_by}` : ""}
            {drop.approved_at ? ` em ${new Date(drop.approved_at).toLocaleDateString('pt-BR')}` : ""}
          </p>
        </div>
      )}

      {drop.content && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-6">
          <h2 className="text-lg font-semibold mb-4">Conteudo</h2>
          <div className="prose prose-invert max-w-none text-zinc-300">{drop.content}</div>
        </div>
      )}

      {drop.drop_text && Object.keys(drop.drop_text).length > 0 && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-6">
          <h2 className="text-lg font-semibold mb-4">Drop Text</h2>
          <pre className="text-xs text-zinc-400 overflow-auto max-h-64 bg-zinc-900/40 p-4 rounded">
            {JSON.stringify(drop.drop_text, null, 2)}
          </pre>
        </div>
      )}

      {drop.origin_meta && Object.keys(drop.origin_meta).length > 0 && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-6">
          <h2 className="text-lg font-semibold mb-4">Metadados de Origem</h2>
          <pre className="text-xs text-zinc-400 overflow-auto max-h-64 bg-zinc-900/40 p-4 rounded">
            {JSON.stringify(drop.origin_meta, null, 2)}
          </pre>
        </div>
      )}

      {drop.created_at && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
          <p className="text-xs text-zinc-500 mb-1">Criado em</p>
          <p className="text-xs text-zinc-400 font-mono">
            {new Date(drop.created_at).toLocaleString('pt-BR')}
          </p>
        </div>
      )}
    </div>
  );
}
