'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPost, type ApiResponse } from '@/lib/api';
import { RefreshCcw, UploadCloud, Loader2 } from 'lucide-react';

type HarvestContent = {
  id: string;
  url: string;
  title: string;
  source_name?: string;
  content_type: string;
  created_at: string;
  status: string;
};

export default function HarvestImportPage() {
  const [items, setItems] = useState<HarvestContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      setMessage(null);
      const res = await apiGet<ApiResponse<HarvestContent[]>>('/harvest/content?contentType=edital&limit=50');
      if (!res.success || !res.data) throw new Error(res.error || 'Erro ao carregar coletas');
      setItems(res.data);
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar coletas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleImport = async (id: string) => {
    setImportingId(id);
    setError(null);
    setMessage(null);
    try {
      const res = await apiPost<ApiResponse<{ editalId: string }>>(`/harvest/content/${id}/import`, {});
      if (!res.success || !res.data?.editalId) throw new Error(res.error || 'Erro ao importar');
      setMessage(`Edital criado: ${res.data.editalId}`);
    } catch (err: any) {
      setError(err?.message || 'Falha ao importar');
    } finally {
      setImportingId(null);
      load();
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Importar coletas para Editais</h1>
          <p className="text-sm text-slate-600">Itens coletados (contentType=edital) prontos para promover a edital.</p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm hover:border-blue-300"
        >
          <RefreshCcw className="w-4 h-4" />
          Atualizar
        </button>
      </div>

      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {message && <div className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700">{message}</div>}

      {loading ? (
        <div className="flex items-center gap-2 text-slate-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          Carregando...
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhum item coletado disponível.</p>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="min-w-full">
            <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-600 uppercase">
              <tr>
                <th className="px-4 py-3">Título</th>
                <th className="px-4 py-3">Fonte</th>
                <th className="px-4 py-3">URL</th>
                <th className="px-4 py-3">Criado</th>
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{item.title || 'Sem título'}</div>
                    <div className="text-xs text-slate-500">{item.id}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{item.source_name || 'N/A'}</td>
                  <td className="px-4 py-3 text-xs text-blue-600 truncate max-w-xs">
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {item.url}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {item.created_at ? new Date(item.created_at).toLocaleString('pt-BR') : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleImport(item.id)}
                      disabled={importingId === item.id}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-xs hover:bg-blue-700 disabled:opacity-50"
                    >
                      {importingId === item.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Importando...
                        </>
                      ) : (
                        <>
                          <UploadCloud className="w-4 h-4" />
                          Promover a edital
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
