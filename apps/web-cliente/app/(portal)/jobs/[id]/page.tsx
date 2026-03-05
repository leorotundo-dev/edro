'use client';

import { useState } from 'react';
import { use } from 'react';
import useSWR from 'swr';
import { swrFetcher, apiPost } from '@/lib/api';

type Job = {
  id: string;
  title: string;
  status: string;
  copy_approved_at: string | null;
  copy_approval_comment: string | null;
  updated_at: string;
};

type ThreadMessage = {
  id: string;
  author_type: 'agency' | 'client';
  author_name: string | null;
  message: string;
  created_at: string;
};

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, mutate, isLoading } = useSWR<{ job: Job; thread: ThreadMessage[] }>(
    `/portal/client/jobs/${id}`,
    swrFetcher,
  );
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [action, setAction] = useState<'approve' | 'revision' | null>(null);

  const job = data?.job;
  const thread = data?.thread ?? [];

  const handleSubmit = async (type: 'approve' | 'revision') => {
    if (!message && type === 'revision') return;
    setSubmitting(true);
    try {
      await apiPost(`/portal/client/jobs/${id}/${type}`, { comment: message });
      setMessage('');
      setAction(null);
      mutate();
    } catch (e: any) {
      alert(e.message ?? 'Erro ao enviar');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) return <p className="text-slate-400 text-sm">Carregando...</p>;
  if (!job) return <p className="text-slate-400 text-sm">Projeto não encontrado.</p>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">{job.title}</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Atualizado em {new Date(job.updated_at).toLocaleDateString('pt-BR')}
        </p>
      </div>

      {/* Status + approval */}
      {!job.copy_approved_at && job.status === 'review' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <p className="text-sm font-medium text-yellow-800 mb-3">
            Este projeto está aguardando sua aprovação de copy.
          </p>

          {action === null && (
            <div className="flex gap-2">
              <button
                onClick={() => setAction('approve')}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-lg py-2 text-sm font-medium transition-colors"
              >
                Aprovar ✓
              </button>
              <button
                onClick={() => setAction('revision')}
                className="flex-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg py-2 text-sm font-medium transition-colors"
              >
                Solicitar revisão
              </button>
            </div>
          )}

          {action !== null && (
            <div className="space-y-3">
              <textarea
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={action === 'approve' ? 'Comentário opcional...' : 'Descreva o que precisa ser ajustado...'}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleSubmit(action)}
                  disabled={submitting}
                  className={`flex-1 text-white rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                    action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-500 hover:bg-orange-600'
                  }`}
                >
                  {submitting ? 'Enviando...' : action === 'approve' ? 'Confirmar aprovação' : 'Enviar revisão'}
                </button>
                <button
                  onClick={() => { setAction(null); setMessage(''); }}
                  className="px-4 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {job.copy_approved_at && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-sm text-green-700 font-medium">
            ✓ Copy aprovada em {new Date(job.copy_approved_at).toLocaleDateString('pt-BR')}
          </p>
          {job.copy_approval_comment && (
            <p className="text-xs text-green-600 mt-1">{job.copy_approval_comment}</p>
          )}
        </div>
      )}

      {/* Thread */}
      {thread.length > 0 && (
        <div>
          <h2 className="font-semibold text-slate-700 text-sm mb-3">Histórico de comentários</h2>
          <div className="space-y-3">
            {thread.map((msg) => (
              <div
                key={msg.id}
                className={`rounded-xl p-3 text-sm ${
                  msg.author_type === 'client'
                    ? 'bg-blue-50 border border-blue-100 ml-4'
                    : 'bg-white border border-slate-200 mr-4'
                }`}
              >
                <p className="text-xs font-medium text-slate-500 mb-1">
                  {msg.author_name ?? (msg.author_type === 'client' ? 'Você' : 'Agência')} ·{' '}
                  {new Date(msg.created_at).toLocaleString('pt-BR')}
                </p>
                <p className="text-slate-700">{msg.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
