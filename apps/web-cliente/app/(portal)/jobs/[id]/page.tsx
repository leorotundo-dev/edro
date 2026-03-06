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

type Artwork = {
  id: string;
  title: string;
  file_url: string;
  mime_type: string;
  version: number;
  status: 'pending' | 'approved' | 'revision';
  approved_at: string | null;
  revision_comment: string | null;
  created_at: string;
};

function ArtworkCard({ art, onAction }: { art: Artwork; onAction: (id: string, type: 'approve' | 'revision') => void }) {
  const isImage = art.mime_type.startsWith('image/');
  const isPdf   = art.mime_type === 'application/pdf';

  const statusColor = art.status === 'approved'
    ? 'bg-green-50 border-green-200 text-green-700'
    : art.status === 'revision'
    ? 'bg-orange-50 border-orange-200 text-orange-700'
    : 'bg-yellow-50 border-yellow-200 text-yellow-700';

  const statusLabel = art.status === 'approved' ? '✓ Aprovado' : art.status === 'revision' ? 'Revisão solicitada' : 'Aguardando aprovação';

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
      {isImage ? (
        <img src={art.file_url} alt={art.title} className="w-full h-40 object-cover" />
      ) : (
        <div className="h-40 flex items-center justify-center bg-slate-100">
          <span className="text-3xl">{isPdf ? '📄' : '🎬'}</span>
        </div>
      )}
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-slate-800 truncate">{art.title}</p>
          <span className="text-xs text-slate-400">v{art.version}</span>
        </div>
        <span className={`inline-block text-xs px-2 py-0.5 rounded-full border ${statusColor}`}>{statusLabel}</span>
        {art.revision_comment && (
          <p className="text-xs text-orange-600 italic">"{art.revision_comment}"</p>
        )}
        {art.status === 'pending' && (
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => onAction(art.id, 'approve')}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-lg py-1.5 text-xs font-medium"
            >
              Aprovar
            </button>
            <button
              onClick={() => onAction(art.id, 'revision')}
              className="flex-1 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg py-1.5 text-xs font-medium"
            >
              Revisão
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, mutate, isLoading } = useSWR<{ job: Job; thread: ThreadMessage[] }>(
    `/portal/client/jobs/${id}`,
    swrFetcher,
  );
  const { data: artData, mutate: mutateArt } = useSWR<{ artworks: Artwork[] }>(
    `/portal/client/jobs/${id}/artworks`,
    swrFetcher,
  );
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [action, setAction] = useState<'approve' | 'revision' | null>(null);

  // Artwork action state
  const [artAction, setArtAction] = useState<{ id: string; type: 'approve' | 'revision' } | null>(null);
  const [artComment, setArtComment] = useState('');
  const [artSubmitting, setArtSubmitting] = useState(false);

  const handleArtAction = (artId: string, type: 'approve' | 'revision') => {
    setArtAction({ id: artId, type });
    setArtComment('');
  };

  const submitArtAction = async () => {
    if (!artAction) return;
    if (artAction.type === 'revision' && !artComment) return;
    setArtSubmitting(true);
    try {
      await apiPost(`/portal/client/artworks/${artAction.id}/${artAction.type}`, { comment: artComment || undefined });
      setArtAction(null);
      setArtComment('');
      mutateArt();
    } catch (e: any) {
      alert(e.message ?? 'Erro ao enviar');
    } finally {
      setArtSubmitting(false);
    }
  };

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

      {/* Artworks */}
      {(artData?.artworks?.length ?? 0) > 0 && (
        <div>
          <h2 className="font-semibold text-slate-700 text-sm mb-3">Criativos para aprovação</h2>
          <div className="grid grid-cols-2 gap-3">
            {artData!.artworks.map((art) => (
              <ArtworkCard key={art.id} art={art} onAction={handleArtAction} />
            ))}
          </div>

          {artAction && (
            <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <p className="text-sm font-medium text-slate-700">
                {artAction.type === 'approve' ? 'Confirmar aprovação' : 'Solicitar revisão'}
              </p>
              <textarea
                rows={3}
                value={artComment}
                onChange={(e) => setArtComment(e.target.value)}
                placeholder={artAction.type === 'approve' ? 'Comentário opcional...' : 'Descreva o ajuste necessário...'}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={submitArtAction}
                  disabled={artSubmitting || (artAction.type === 'revision' && !artComment)}
                  className={`flex-1 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50 ${
                    artAction.type === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-500 hover:bg-orange-600'
                  }`}
                >
                  {artSubmitting ? 'Enviando...' : artAction.type === 'approve' ? 'Confirmar' : 'Enviar revisão'}
                </button>
                <button
                  onClick={() => { setArtAction(null); setArtComment(''); }}
                  className="px-4 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
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
