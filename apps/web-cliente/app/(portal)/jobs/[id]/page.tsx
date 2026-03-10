'use client';

import { use, useState } from 'react';
import useSWR from 'swr';
import { swrFetcher, apiPost } from '@/lib/api';
import clsx from 'clsx';

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

function artworkTone(status: Artwork['status']) {
  if (status === 'approved') return 'portal-pill-success';
  if (status === 'revision') return 'portal-pill-warning';
  return 'portal-pill-accent';
}

function artworkLabel(status: Artwork['status']) {
  if (status === 'approved') return 'Aprovado';
  if (status === 'revision') return 'Revisao solicitada';
  return 'Aguardando retorno';
}

function ArtworkCard({ art, onAction }: { art: Artwork; onAction: (id: string, type: 'approve' | 'revision') => void }) {
  const isImage = art.mime_type.startsWith('image/');
  const isPdf = art.mime_type === 'application/pdf';

  return (
    <div className="portal-list-card">
      {isImage ? (
        <img src={art.file_url} alt={art.title} style={{ width: '100%', height: 220, objectFit: 'cover', borderRadius: 18, marginBottom: 16 }} />
      ) : (
        <div className="portal-empty" style={{ minHeight: 220, marginBottom: 16 }}>
          <div>
            <p className="portal-card-title">{isPdf ? 'Documento PDF' : 'Midia anexada'}</p>
            <p className="portal-card-subtitle">Abra o arquivo para revisar o conteudo.</p>
          </div>
        </div>
      )}

      <div className="portal-list-row">
        <div>
          <p className="portal-card-title">{art.title}</p>
          <p className="portal-card-subtitle">Versao {art.version}</p>
          {art.revision_comment && <p className="portal-card-subtitle">Observacao: {art.revision_comment}</p>}
        </div>
        <span className={clsx('portal-pill', artworkTone(art.status))}>{artworkLabel(art.status)}</span>
      </div>

      {art.status === 'pending' && (
        <div className="portal-inline-stack" style={{ marginTop: 16 }}>
          <button onClick={() => onAction(art.id, 'approve')} className="portal-button">Aprovar</button>
          <button onClick={() => onAction(art.id, 'revision')} className="portal-button-secondary">Solicitar revisao</button>
        </div>
      )}
    </div>
  );
}

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, mutate, isLoading } = useSWR<{ job: Job; thread: ThreadMessage[] }>(`/portal/client/jobs/${id}`, swrFetcher);
  const { data: artData, mutate: mutateArt } = useSWR<{ artworks: Artwork[] }>(`/portal/client/jobs/${id}/artworks`, swrFetcher);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [action, setAction] = useState<'approve' | 'revision' | null>(null);
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
    } catch (error: any) {
      alert(error.message ?? 'Erro ao enviar');
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
    } catch (error: any) {
      alert(error.message ?? 'Erro ao enviar');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) return <div className="portal-empty"><div><p className="portal-card-title">Carregando projeto</p><p className="portal-card-subtitle">Recuperando o contexto para aprovacao.</p></div></div>;
  if (!job) return <div className="portal-empty"><div><p className="portal-card-title">Projeto nao encontrado</p><p className="portal-card-subtitle">O item solicitado nao esta disponivel.</p></div></div>;

  return (
    <div className="portal-page">
      <div>
        <span className="portal-kicker">Projeto</span>
        <h2 className="portal-page-title">{job.title}</h2>
        <p className="portal-page-subtitle">Atualizado em {new Date(job.updated_at).toLocaleDateString('pt-BR')}.</p>
      </div>

      {!job.copy_approved_at && job.status === 'review' && (
        <section className="portal-card">
          <div className="portal-section-head">
            <div>
              <h3 className="portal-section-title">Aguardando sua aprovacao</h3>
              <p className="portal-card-subtitle">Valide a copy ou devolva com orientacao objetiva para a equipe.</p>
            </div>
            <span className="portal-pill portal-pill-warning">Em revisao</span>
          </div>

          {action === null ? (
            <div className="portal-inline-stack">
              <button onClick={() => setAction('approve')} className="portal-button">Aprovar copy</button>
              <button onClick={() => setAction('revision')} className="portal-button-secondary">Solicitar revisao</button>
            </div>
          ) : (
            <div className="portal-page" style={{ gap: 16 }}>
              <textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={action === 'approve' ? 'Comentario opcional...' : 'Descreva o ajuste necessario...'}
                className="portal-textarea"
              />
              <div className="portal-inline-stack">
                <button onClick={() => handleSubmit(action)} disabled={submitting} className={action === 'approve' ? 'portal-button' : 'portal-button-secondary'}>
                  {submitting ? 'Enviando...' : action === 'approve' ? 'Confirmar aprovacao' : 'Enviar revisao'}
                </button>
                <button onClick={() => { setAction(null); setMessage(''); }} className="portal-button-ghost">Cancelar</button>
              </div>
            </div>
          )}
        </section>
      )}

      {job.copy_approved_at && (
        <section className="portal-note">
          <div className="portal-section-head" style={{ marginBottom: 0 }}>
            <div>
              <h3 className="portal-section-title">Copy aprovada</h3>
              <p className="portal-card-subtitle">Aprovada em {new Date(job.copy_approved_at).toLocaleDateString('pt-BR')}.</p>
              {job.copy_approval_comment && <p className="portal-card-subtitle">{job.copy_approval_comment}</p>}
            </div>
            <span className="portal-pill portal-pill-success">Aprovada</span>
          </div>
        </section>
      )}

      {(artData?.artworks?.length ?? 0) > 0 && (
        <section className="portal-card">
          <div className="portal-section-head">
            <div>
              <h3 className="portal-section-title">Criativos para avaliacao</h3>
              <p className="portal-card-subtitle">Revise as pecas anexadas antes de seguir o fluxo.</p>
            </div>
          </div>

          <div className="portal-media-grid">
            {artData!.artworks.map((art) => (
              <ArtworkCard key={art.id} art={art} onAction={handleArtAction} />
            ))}
          </div>

          {artAction && (
            <div className="portal-note" style={{ marginTop: 18 }}>
              <div className="portal-page" style={{ gap: 16 }}>
                <div>
                  <h3 className="portal-section-title">{artAction.type === 'approve' ? 'Confirmar aprovacao do criativo' : 'Solicitar revisao do criativo'}</h3>
                  <p className="portal-card-subtitle">Adicione um comentario se precisar orientar o ajuste.</p>
                </div>
                <textarea
                  rows={4}
                  value={artComment}
                  onChange={(e) => setArtComment(e.target.value)}
                  placeholder={artAction.type === 'approve' ? 'Comentario opcional...' : 'Descreva o ajuste necessario...'}
                  className="portal-textarea"
                />
                <div className="portal-inline-stack">
                  <button onClick={submitArtAction} disabled={artSubmitting || (artAction.type === 'revision' && !artComment)} className={artAction.type === 'approve' ? 'portal-button' : 'portal-button-secondary'}>
                    {artSubmitting ? 'Enviando...' : artAction.type === 'approve' ? 'Confirmar' : 'Enviar revisao'}
                  </button>
                  <button onClick={() => { setArtAction(null); setArtComment(''); }} className="portal-button-ghost">Cancelar</button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {thread.length > 0 && (
        <section className="portal-card">
          <div className="portal-section-head">
            <div>
              <h3 className="portal-section-title">Historico de comentarios</h3>
              <p className="portal-card-subtitle">Conversas e retornos registrados neste job.</p>
            </div>
          </div>

          <div className="portal-thread">
            {thread.map((msg) => (
              <div key={msg.id} className={clsx('portal-thread-bubble', msg.author_type === 'client' && 'portal-thread-bubble-client')}>
                <span className="portal-thread-meta">
                  {msg.author_name ?? (msg.author_type === 'client' ? 'Voce' : 'Agencia')} · {new Date(msg.created_at).toLocaleString('pt-BR')}
                </span>
                <div>{msg.message}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
