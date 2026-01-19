"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { apiGet } from "../../../../lib/api";

interface HarvestDetail {
  id: string;
  title?: string;
  source?: string;
  url?: string;
  status?: string;
  progress?: number;
  content_type?: string;
  created_at?: string;
  updated_at?: string;
  metadata?: Record<string, any>;
}

const normalizeStatus = (status?: string) => (status === "error" ? "failed" : status);

export default function HarvestDetailPage() {
  const params = useParams();
  const harvestId = useMemo(() => {
    const raw = params?.id;
    if (typeof raw === "string") return raw;
    if (Array.isArray(raw) && raw[0]) return raw[0];
    return "";
  }, [params]);

  const [harvest, setHarvest] = useState<HarvestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!harvestId) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiGet(`/admin/harvest/items/${harvestId}`);
        setHarvest(data);
      } catch (err) {
        console.error("Erro ao buscar harvest:", err);
        setError("Nao foi possivel carregar o item.");
        setHarvest(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [harvestId]);

  if (loading) {
    return <p className="text-sm text-zinc-400">Carregando...</p>;
  }

  if (!harvest) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Harvest nao encontrado</h1>
        <p className="text-sm text-zinc-400">{error ?? "O item nao existe ou foi removido."}</p>
      </div>
    );
  }

  const status = normalizeStatus(harvest.status);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">{harvest.title || "Sem titulo"}</h1>
        <p className="text-sm text-zinc-400">{harvest.source || "Fonte nao identificada"}</p>
        {harvest.url && (
          <a
            href={harvest.url}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-blue-400 hover:underline break-all"
          >
            {harvest.url}
          </a>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {status && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
            <p className="text-xs text-zinc-500 mb-1">Status</p>
            <p className="text-lg font-bold text-white capitalize">{status}</p>
          </div>
        )}
        {harvest.progress !== undefined && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
            <p className="text-xs text-zinc-500 mb-1">Progresso</p>
            <div className="w-full bg-zinc-700/40 rounded-full h-2 mt-2">
              <div
                className="bg-blue-500 h-2 rounded-full"
                style={{ width: `${harvest.progress}%` }}
              />
            </div>
            <p className="text-sm font-bold text-white mt-2">{harvest.progress}%</p>
          </div>
        )}
        {harvest.content_type && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
            <p className="text-xs text-zinc-500 mb-1">Tipo</p>
            <p className="text-2xl font-bold text-white">{harvest.content_type}</p>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {harvest.created_at && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
            <p className="text-xs text-zinc-500 mb-1">Criado em</p>
            <p className="text-sm font-medium text-zinc-300">
              {new Date(harvest.created_at).toLocaleDateString("pt-BR", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              })}
            </p>
          </div>
        )}
        {(harvest.updated_at || harvest.created_at) && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
            <p className="text-xs text-zinc-500 mb-1">Atualizado em</p>
            <p className="text-sm font-medium text-zinc-300">
              {new Date(harvest.updated_at || harvest.created_at || "").toLocaleDateString("pt-BR", {
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

      {harvest.metadata && Object.keys(harvest.metadata).length > 0 && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-6">
          <h2 className="text-lg font-semibold mb-4">Metadados</h2>
          <pre className="text-xs text-zinc-400 overflow-auto max-h-64 bg-zinc-900/40 p-4 rounded">
            {JSON.stringify(harvest.metadata, null, 2)}
          </pre>
        </div>
      )}

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
        <p className="text-xs text-zinc-500 mb-1">ID</p>
        <p className="text-xs text-zinc-400 font-mono break-all">{harvest.id}</p>
      </div>
    </div>
  );
}
