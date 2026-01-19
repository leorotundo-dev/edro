export const dynamic = 'force-dynamic';

import { apiGet } from "../../../../lib/api";

interface RAGBlockDetail {
  id: string;
  title?: string;
  content?: string;
  type?: string;
  status?: string;
  disciplina?: string;
  topicCode?: string;
  sourceUrl?: string;
  created_at?: string;
  updated_at?: string;
  metadata?: Record<string, any>;
}

async function getRAGDetail(id: string): Promise<RAGBlockDetail | null> {
  try {
    const data = await apiGet(`/admin/rag/blocks/${id}`);
    return data;
  } catch (e) {
    console.error("Erro ao buscar RAG block:", e);
    return null;
  }
}

export default async function RAGDetailPage({ params }: { params: { id: string } }) {
  const rag = await getRAGDetail(params.id);

  if (!rag) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">RAG block não encontrado</h1>
        <p className="text-sm text-zinc-400">O RAG block que você está procurando não existe ou foi removido.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">{rag.title}</h1>
      </div>

      {/* Informações Básicas */}
      <div className="grid gap-4 md:grid-cols-3">
        {rag.type && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
            <p className="text-xs text-zinc-500 mb-1">Tipo</p>
            <p className="text-sm font-medium text-zinc-300">{rag.type}</p>
          </div>
        )}
        {rag.status && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
            <p className="text-xs text-zinc-500 mb-1">Status</p>
            <p className="text-sm font-medium text-zinc-300 capitalize">{rag.status}</p>
          </div>
        )}
        {rag.disciplina && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
            <p className="text-xs text-zinc-500 mb-1">Disciplina</p>
            <p className="text-sm font-medium text-zinc-300">{rag.disciplina}</p>
          </div>
        )}
      </div>

      {/* Tópico e Fonte */}
      <div className="grid gap-4 md:grid-cols-2">
        {rag.topicCode && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
            <p className="text-xs text-zinc-500 mb-1">Tópico</p>
            <p className="text-sm font-medium text-zinc-300">{rag.topicCode}</p>
          </div>
        )}
        {rag.sourceUrl && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
            <p className="text-xs text-zinc-500 mb-1">Fonte</p>
            <a
              href={rag.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-400 hover:text-blue-300 hover:underline break-all"
            >
              {rag.sourceUrl}
            </a>
          </div>
        )}
      </div>

      {/* Conteúdo */}
      {rag.content && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-6">
          <h2 className="text-lg font-semibold mb-4">Conteúdo</h2>
          <div className="text-sm text-zinc-300 whitespace-pre-wrap break-words max-h-96 overflow-auto">
            {rag.content}
          </div>
        </div>
      )}

      {/* Datas */}
      <div className="grid gap-4 md:grid-cols-2">
        {rag.created_at && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
            <p className="text-xs text-zinc-500 mb-1">Criado em</p>
            <p className="text-sm font-medium text-zinc-300">
              {new Date(rag.created_at).toLocaleDateString("pt-BR", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              })}
            </p>
          </div>
        )}
        {rag.updated_at && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
            <p className="text-xs text-zinc-500 mb-1">Atualizado em</p>
            <p className="text-sm font-medium text-zinc-300">
              {new Date(rag.updated_at).toLocaleDateString("pt-BR", {
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
      {rag.metadata && Object.keys(rag.metadata).length > 0 && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-6">
          <h2 className="text-lg font-semibold mb-4">Metadados</h2>
          <pre className="text-xs text-zinc-400 overflow-auto max-h-64 bg-zinc-900/40 p-4 rounded">
            {JSON.stringify(rag.metadata, null, 2)}
          </pre>
        </div>
      )}

      {/* ID */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
        <p className="text-xs text-zinc-500 mb-1">ID</p>
        <p className="text-xs text-zinc-400 font-mono break-all">{rag.id}</p>
      </div>
    </div>
  );
}
