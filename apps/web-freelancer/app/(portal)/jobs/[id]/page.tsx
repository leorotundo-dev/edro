'use client';

import { use, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { swrFetcher, apiPost, apiPatch, getApiBaseUrl } from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

type OpsJob = {
  id: string;
  title: string;
  status: string;
  deadline_at: string | null;
  notes: string | null;
  priority_band: string | null;
  estimated_minutes: number | null;
  client_name: string | null;
  job_type_name: string | null;
  source: 'ops_job';
};

type Briefing = {
  id: string;
  title: string;
  status: string;
  due_at: string | null;
  payload: Record<string, any> | null;
  client_name: string | null;
  copy_approved_at: string | null;
  copy_approval_comment: string | null;
  source: 'briefing';
};

type ChecklistItem = {
  trello_id?: string;
  text: string;
  checked: boolean;
};

type Checklist = {
  id: string;
  name: string;
  items: ChecklistItem[];
  trello_checklist_id?: string;
};

type CardComment = {
  body: string;
  author_name: string;
  author_avatar?: string;
  commented_at: string;
};

type BoardList = { id: string; name: string };

type TrelloCard = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  due_complete: boolean;
  labels: { color: string; name: string }[];
  cover_color: string | null;
  trello_url: string | null;
  board_id: string;
  board_name: string;
  list_name: string;
  client_name: string | null;
  checklists: Checklist[];
  comments: CardComment[];
  board_lists: BoardList[];
  source: 'trello_card';
};

type JobDetail = OpsJob | Briefing | TrelloCard;

type Profile = {
  id: string;
  display_name: string;
  active_timers?: { briefing_id: string; briefing_title?: string; started_at: string }[];
};

// ── Constants ─────────────────────────────────────────────────────────────────

const OPS_STATUS_LABELS: Record<string, string> = {
  intake: 'Entrada', planned: 'Planejado', ready: 'Pronto para iniciar',
  allocated: 'Alocado', in_progress: 'Em produção', in_review: 'Em revisão',
  awaiting_approval: 'Aguardando aprovação', approved: 'Aprovado',
  blocked: 'Bloqueado', published: 'Publicado', done: 'Concluído',
};

const BRIEFING_STATUS_LABELS: Record<string, string> = {
  briefing: 'Briefing', copy_ia: 'Copy IA', alinhamento: 'Alinhamento',
  producao: 'Produção', aprovacao_interna: 'Aprovação Interna',
  ajustes: 'Ajustes', aprovacao_cliente: 'Aprovação Cliente', concluido: 'Concluído',
  // Legacy
  iclips_in: 'iClips entrada', iclips_out: 'iClips saída',
  aprovacao: 'Aprovação', revisao: 'Revisão', entrega: 'Entrega', done: 'Concluído',
};

const PRIORITY_LABELS: Record<string, string> = {
  p0: 'Crítico', p1: 'Alto', p2: 'Normal', p3: 'Baixo',
};

const TRELLO_LABEL_COLORS: Record<string, string> = {
  green: '#61bd4f', yellow: '#f2d600', orange: '#ff9f1a', red: '#eb5a46',
  purple: '#c377e0', blue: '#0079bf', sky: '#00c2e0', lime: '#51e898',
  pink: '#ff78cb', black: '#344563',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function useElapsed(startedAt: string | null) {
  const [secs, setSecs] = useState(
    startedAt ? Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000) : 0,
  );
  useEffect(() => {
    if (!startedAt) return;
    const timer = setInterval(() => setSecs((v) => v + 1), 1000);
    return () => clearInterval(timer);
  }, [startedAt]);
  if (!startedAt) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

// ── Trello Card View ──────────────────────────────────────────────────────────

function TrelloCardView({ card, onUpdated }: { card: TrelloCard; onUpdated: () => void }) {
  const [dueComplete, setDueComplete] = useState(card.due_complete);
  const [movingTo, setMovingTo] = useState('');
  const [moving, setMoving] = useState(false);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [checklists, setChecklists] = useState<Checklist[]>(card.checklists ?? []);
  const [togglingItem, setTogglingItem] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 3000);
  };

  const toggleDueComplete = async () => {
    const next = !dueComplete;
    setDueComplete(next);
    try {
      await apiPatch(`/freelancers/portal/me/trello-cards/${card.id}`, { due_complete: next });
      showFeedback(next ? 'Prazo marcado como cumprido!' : 'Prazo desmarcado.');
      onUpdated();
    } catch {
      setDueComplete(!next);
      showFeedback('Erro ao atualizar.');
    }
  };

  const moveToList = async () => {
    if (!movingTo) return;
    setMoving(true);
    try {
      await apiPatch(`/freelancers/portal/me/trello-cards/${card.id}`, { move_to_list_id: movingTo });
      showFeedback('Card movido!');
      onUpdated();
    } catch {
      showFeedback('Erro ao mover card.');
    } finally {
      setMoving(false);
    }
  };

  const toggleCheckItem = async (checklistIdx: number, itemIdx: number) => {
    const cl = checklists[checklistIdx];
    const item = cl.items[itemIdx];
    const key = `${checklistIdx}-${itemIdx}`;
    setTogglingItem(key);
    const nextChecked = !item.checked;

    // Optimistic update
    const updated = checklists.map((c, ci) =>
      ci !== checklistIdx ? c : {
        ...c,
        items: c.items.map((it, ii) =>
          ii !== itemIdx ? it : { ...it, checked: nextChecked },
        ),
      },
    );
    setChecklists(updated);

    try {
      const itemId = item.trello_id ?? String(itemIdx);
      await apiPatch(`/freelancers/portal/me/trello-cards/${card.id}/checklist-items/${itemId}`, {
        checked: nextChecked,
      });
    } catch {
      setChecklists(checklists); // revert
      showFeedback('Erro ao atualizar item.');
    } finally {
      setTogglingItem(null);
    }
  };

  const sendComment = async () => {
    if (!comment.trim()) return;
    setSending(true);
    try {
      await apiPatch(`/freelancers/portal/me/trello-cards/${card.id}`, { comment: comment.trim() });
      setComment('');
      showFeedback('Comentário enviado!');
      onUpdated();
    } catch {
      showFeedback('Erro ao enviar comentário.');
    } finally {
      setSending(false);
    }
  };

  const totalItems = checklists.reduce((s, cl) => s + cl.items.length, 0);
  const doneItems = checklists.reduce((s, cl) => s + cl.items.filter(i => i.checked).length, 0);
  const progress = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

  const dueDateObj = card.due_date ? new Date(card.due_date) : null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const isOverdue = dueDateObj && dueDateObj < today && !dueComplete;
  const isDueToday = dueDateObj && dueDateObj.toDateString() === today.toDateString();

  return (
    <div className="portal-page">
      {/* Feedback toast */}
      {feedback && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#13DEB9', color: '#000', padding: '10px 20px', borderRadius: 12,
          fontWeight: 700, fontSize: 13, zIndex: 999, boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}>
          {feedback}
        </div>
      )}

      {/* Header */}
      <div>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: 'var(--portal-muted)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            ◈ {card.board_name}
          </span>
          <span style={{ fontSize: 11, color: 'var(--portal-muted)' }}>›</span>
          <span style={{
            fontSize: 11, color: 'var(--portal-accent)', fontWeight: 700,
            background: 'rgba(232,82,25,0.12)', borderRadius: 6, padding: '2px 8px',
          }}>
            {card.list_name}
          </span>
          {card.client_name && (
            <>
              <span style={{ fontSize: 11, color: 'var(--portal-muted)' }}>·</span>
              <span style={{ fontSize: 11, color: 'var(--portal-muted)' }}>{card.client_name}</span>
            </>
          )}
        </div>

        <h2 className="portal-page-title" style={{ marginBottom: 8 }}>{card.title}</h2>

        {/* Labels */}
        {card.labels?.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {card.labels.map((label, i) => (
              <span key={i} style={{
                background: TRELLO_LABEL_COLORS[label.color] ?? '#666',
                color: label.color === 'yellow' || label.color === 'lime' ? '#000' : '#fff',
                fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 6,
                letterSpacing: '0.04em',
              }}>
                {label.name || label.color}
              </span>
            ))}
          </div>
        )}

        {/* Due date */}
        {dueDateObj && (
          <button
            onClick={toggleDueComplete}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: dueComplete
                ? 'rgba(19,222,185,0.15)'
                : isOverdue
                ? 'rgba(255,68,68,0.15)'
                : isDueToday
                ? 'rgba(248,168,0,0.15)'
                : 'rgba(255,255,255,0.06)',
              border: `1.5px solid ${dueComplete ? 'rgba(19,222,185,0.4)' : isOverdue ? 'rgba(255,68,68,0.4)' : isDueToday ? 'rgba(248,168,0,0.4)' : 'var(--portal-border)'}`,
              borderRadius: 10, padding: '8px 14px', cursor: 'pointer',
              color: dueComplete ? '#13DEB9' : isOverdue ? '#ff4444' : isDueToday ? '#F8A800' : 'var(--portal-text)',
              fontSize: 13, fontWeight: 700,
            }}
          >
            <span>{dueComplete ? '✅' : isOverdue ? '🔴' : isDueToday ? '🚨' : '📅'}</span>
            <span>
              {dueComplete
                ? 'Prazo cumprido'
                : isOverdue
                ? `Atrasado — ${dueDateObj.toLocaleDateString('pt-BR')}`
                : isDueToday
                ? `Vence hoje — ${dueDateObj.toLocaleDateString('pt-BR')}`
                : `Entrega: ${dueDateObj.toLocaleDateString('pt-BR')}`}
            </span>
            <span style={{ fontSize: 11, opacity: 0.7 }}>{dueComplete ? '(clique para desmarcar)' : '(clique para marcar cumprido)'}</span>
          </button>
        )}
      </div>

      {/* Description */}
      {card.description && (
        <section className="portal-card">
          <h3 className="portal-section-title" style={{ marginBottom: 10 }}>Descrição</h3>
          <p style={{ fontSize: 14, color: 'var(--portal-text)', lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>
            {card.description}
          </p>
        </section>
      )}

      {/* Checklists */}
      {checklists.length > 0 && (
        <section className="portal-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 className="portal-section-title">Checklists</h3>
            {totalItems > 0 && (
              <span style={{ fontSize: 12, fontWeight: 700, color: progress === 100 ? '#13DEB9' : 'var(--portal-muted)' }}>
                {doneItems}/{totalItems} ({progress}%)
              </span>
            )}
          </div>

          {/* Progress bar */}
          {totalItems > 0 && (
            <div style={{
              height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, marginBottom: 18, overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${progress}%`,
                background: progress === 100 ? '#13DEB9' : 'var(--portal-accent)',
                borderRadius: 3,
                transition: 'width 0.3s ease',
              }} />
            </div>
          )}

          {checklists.map((cl, ci) => (
            <div key={cl.id} style={{ marginBottom: ci < checklists.length - 1 ? 20 : 0 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--portal-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                {cl.name}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {cl.items.map((item, ii) => {
                  const key = `${ci}-${ii}`;
                  const toggling = togglingItem === key;
                  return (
                    <button
                      key={ii}
                      onClick={() => toggleCheckItem(ci, ii)}
                      disabled={toggling}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        background: item.checked ? 'rgba(19,222,185,0.06)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${item.checked ? 'rgba(19,222,185,0.2)' : 'var(--portal-border)'}`,
                        borderRadius: 10, padding: '10px 14px',
                        cursor: toggling ? 'wait' : 'pointer',
                        textAlign: 'left', width: '100%',
                        opacity: toggling ? 0.6 : 1,
                        transition: 'all 0.15s',
                      }}
                    >
                      {/* Checkbox visual */}
                      <div style={{
                        width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                        border: `2px solid ${item.checked ? '#13DEB9' : 'rgba(255,255,255,0.25)'}`,
                        background: item.checked ? '#13DEB9' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s',
                      }}>
                        {item.checked && (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6l3 3 5-5" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <span style={{
                        fontSize: 13, color: item.checked ? 'var(--portal-muted)' : 'var(--portal-text)',
                        textDecoration: item.checked ? 'line-through' : 'none',
                        flex: 1, lineHeight: 1.4,
                      }}>
                        {item.text}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Move card */}
      {card.board_lists.length > 1 && (
        <section className="portal-card">
          <h3 className="portal-section-title" style={{ marginBottom: 12 }}>Mover para coluna</h3>
          <p style={{ fontSize: 12, color: 'var(--portal-muted)', marginBottom: 14 }}>
            Atualiza o card no Trello e aqui ao mesmo tempo.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <select
              value={movingTo}
              onChange={(e) => setMovingTo(e.target.value)}
              style={{
                flex: 1, minWidth: 160,
                background: 'rgba(255,255,255,0.06)',
                border: '1.5px solid var(--portal-border)',
                borderRadius: 10, padding: '10px 14px',
                color: 'var(--portal-text)', fontSize: 13,
              }}
            >
              <option value="">— Selecione uma coluna —</option>
              {card.board_lists
                .filter(l => l.name !== card.list_name)
                .map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
            </select>
            <button
              onClick={moveToList}
              disabled={!movingTo || moving}
              style={{
                background: movingTo ? 'var(--portal-accent)' : 'rgba(255,255,255,0.06)',
                color: movingTo ? '#fff' : 'var(--portal-muted)',
                border: 'none', borderRadius: 10, padding: '10px 18px',
                fontWeight: 700, fontSize: 13, cursor: movingTo ? 'pointer' : 'default',
                transition: 'all 0.15s',
              }}
            >
              {moving ? 'Movendo...' : 'Mover'}
            </button>
          </div>
        </section>
      )}

      {/* Comment */}
      <section className="portal-card">
        <h3 className="portal-section-title" style={{ marginBottom: 12 }}>Adicionar comentário</h3>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Escreva uma atualização para o time..."
          rows={3}
          className="portal-textarea"
          style={{ marginBottom: 10 }}
        />
        <button
          onClick={sendComment}
          disabled={!comment.trim() || sending}
          className="portal-button"
          style={{ opacity: !comment.trim() ? 0.5 : 1 }}
        >
          {sending ? 'Enviando...' : 'Enviar comentário'}
        </button>
      </section>

      {/* Comments history */}
      {card.comments?.length > 0 && (
        <section className="portal-card">
          <h3 className="portal-section-title" style={{ marginBottom: 14 }}>Histórico</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {card.comments.map((c, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--portal-border)',
                borderRadius: 10, padding: '12px 14px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--portal-accent)' }}>{c.author_name}</span>
                  <span style={{ fontSize: 10, color: 'var(--portal-muted)' }}>
                    {new Date(c.commented_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--portal-text)', margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                  {c.body}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* External link */}
      {card.trello_url && (
        <a
          href={card.trello_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            fontSize: 12, color: 'var(--portal-muted)', textDecoration: 'none',
            border: '1px solid var(--portal-border)', borderRadius: 8, padding: '8px 14px',
            alignSelf: 'flex-start',
          }}
        >
          ↗ Abrir no Trello
        </a>
      )}
    </div>
  );
}

// ── Ops job timer ─────────────────────────────────────────────────────────────

const TIMER_KEY = (jobId: string) => `ops_timer_${jobId}`;

function OpsTimerSection({ jobId }: { jobId: string }) {
  const [startedAt, setStartedAt] = useState<string | null>(() =>
    typeof window !== 'undefined' ? localStorage.getItem(TIMER_KEY(jobId)) : null,
  );
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState('');
  const [showStop, setShowStop] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const elapsed = useElapsed(startedAt);

  const handleStart = () => {
    const now = new Date().toISOString();
    localStorage.setItem(TIMER_KEY(jobId), now);
    setStartedAt(now);
  };

  const handleStop = async () => {
    if (!startedAt) return;
    setLoading(true);
    setError('');
    const minutes = Math.max(1, Math.round((Date.now() - new Date(startedAt).getTime()) / 60000));
    try {
      const base = getApiBaseUrl();
      const token = localStorage.getItem('fl_token') ?? '';
      const res = await fetch(`${base}/api/jobs/${jobId}/time-entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ minutes, notes: description.trim() || null }),
      });
      if (!res.ok) throw new Error(await res.text());
      localStorage.removeItem(TIMER_KEY(jobId));
      setStartedAt(null); setShowStop(false); setDescription('');
      setSaved(true); setTimeout(() => setSaved(false), 4000);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar tempo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="portal-card">
      <div className="portal-section-head">
        <div>
          <h3 className="portal-section-title">Registro de tempo</h3>
          <p className="portal-card-subtitle">Inicie o cronômetro ao começar e pare quando concluir.</p>
        </div>
        {startedAt && <span className="portal-pill portal-pill-success">Em execução</span>}
      </div>
      {saved && <div className="portal-alert portal-alert-success" style={{ marginBottom: 16 }}>Tempo registrado com sucesso.</div>}
      {error && <div className="portal-alert portal-alert-error" style={{ marginBottom: 16 }}>{error}</div>}
      {startedAt ? (
        <div className="portal-page" style={{ gap: 16 }}>
          <div className="portal-stat-card">
            <div className="portal-stat-label">Tempo em execução</div>
            <div className="portal-stat-value">{elapsed}</div>
          </div>
          {!showStop ? (
            <button onClick={() => setShowStop(true)} className="portal-button-danger">Parar timer</button>
          ) : (
            <div className="portal-page" style={{ gap: 16 }}>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="O que foi executado? (opcional)" rows={2} className="portal-textarea" />
              <div className="portal-inline-stack">
                <button onClick={() => setShowStop(false)} className="portal-button-ghost">Cancelar</button>
                <button onClick={handleStop} disabled={loading} className="portal-button-danger">{loading ? 'Salvando...' : 'Confirmar parada'}</button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="portal-page" style={{ gap: 16 }}>
          <div className="portal-note">Nenhum timer ativo. Inicie ao começar a execução.</div>
          <button onClick={handleStart} className="portal-button">Iniciar timer</button>
        </div>
      )}
    </section>
  );
}

// ── Briefing timer ────────────────────────────────────────────────────────────

function BriefingTimerSection({ briefingId, profile, onRefresh }: { briefingId: string; profile: Profile; onRefresh: () => void }) {
  const activeTimer = profile.active_timers?.find((t) => t.briefing_id === briefingId) ?? null;
  const elapsed = useElapsed(activeTimer?.started_at ?? null);
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState('');
  const [showStop, setShowStop] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    try { await apiPost('/freelancers/timer/start', { freelancer_id: profile.id, briefing_id: briefingId }); onRefresh(); }
    finally { setLoading(false); }
  };
  const handleStop = async () => {
    setLoading(true);
    try {
      await apiPost('/freelancers/timer/stop', { freelancer_id: profile.id, briefing_id: briefingId, description: description.trim() || null });
      setShowStop(false); setDescription(''); onRefresh();
    } finally { setLoading(false); }
  };

  return (
    <section className="portal-card">
      <div className="portal-section-head">
        <div>
          <h3 className="portal-section-title">Registro de tempo</h3>
          <p className="portal-card-subtitle">Inicie o cronômetro ao começar e pare quando concluir.</p>
        </div>
        {activeTimer && <span className="portal-pill portal-pill-success">Em execução</span>}
      </div>
      {activeTimer ? (
        <div className="portal-page" style={{ gap: 16 }}>
          <div className="portal-stat-card">
            <div className="portal-stat-label">Tempo em execução</div>
            <div className="portal-stat-value">{elapsed}</div>
          </div>
          {!showStop ? (
            <button onClick={() => setShowStop(true)} className="portal-button-danger">Parar timer</button>
          ) : (
            <div className="portal-page" style={{ gap: 16 }}>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="O que foi executado? (opcional)" rows={2} className="portal-textarea" />
              <div className="portal-inline-stack">
                <button onClick={() => setShowStop(false)} className="portal-button-ghost">Cancelar</button>
                <button onClick={handleStop} disabled={loading} className="portal-button-danger">{loading ? 'Salvando...' : 'Confirmar parada'}</button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="portal-page" style={{ gap: 16 }}>
          <div className="portal-note">Nenhum timer ativo. Inicie ao começar a execução.</div>
          <button onClick={handleStart} disabled={loading} className="portal-button">{loading ? 'Iniciando...' : 'Iniciar timer'}</button>
        </div>
      )}
    </section>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const sourceParam = searchParams.get('source');

  const swrKey = `/freelancers/portal/me/jobs/${id}${sourceParam ? `?source=${sourceParam}` : ''}`;
  const { data: jobData, isLoading: jobLoading, mutate: mutateJob } = useSWR<{ job: JobDetail }>(swrKey, swrFetcher);
  const { data: profile, mutate: mutateProfile } = useSWR<Profile>('/freelancers/portal/me', swrFetcher);

  const job = jobData?.job;

  if (jobLoading || !profile) {
    return (
      <div className="portal-empty">
        <div>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
          <p className="portal-card-title">Carregando...</p>
          <p className="portal-card-subtitle">Sincronizando informações</p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="portal-page">
        <div className="portal-alert portal-alert-error">Job não encontrado ou não atribuído a você.</div>
        <button className="portal-button-ghost" onClick={() => router.push('/jobs')}>← Voltar para Jobs</button>
      </div>
    );
  }

  // ── Trello card path ───────────────────────────────────────────────────────
  if (job.source === 'trello_card') {
    return (
      <div className="portal-page">
        <button className="portal-button-ghost" style={{ alignSelf: 'flex-start', marginBottom: 4 }} onClick={() => router.push('/jobs')}>
          ← Voltar
        </button>
        <TrelloCardView card={job as TrelloCard} onUpdated={() => mutateJob()} />
        <button className="portal-button-ghost" style={{ alignSelf: 'flex-start' }} onClick={() => router.push('/jobs')}>
          ← Voltar para Jobs
        </button>
      </div>
    );
  }

  // ── Briefing / ops job path ────────────────────────────────────────────────
  const isOps = job.source === 'ops_job';
  const opsJob = isOps ? (job as OpsJob) : null;
  const briefing = !isOps ? (job as Briefing) : null;

  const deadline = isOps ? opsJob!.deadline_at : briefing!.due_at;
  const statusLabel = isOps ? (OPS_STATUS_LABELS[job.status] ?? job.status) : (BRIEFING_STATUS_LABELS[job.status] ?? job.status);
  const isOverdue = deadline && new Date(deadline) < new Date() && !['done', 'published'].includes(job.status);

  return (
    <div className="portal-page">
      {/* Header */}
      <div className="portal-page-header">
        <div>
          <span className="portal-kicker">
            {isOps ? 'Operação' : 'Briefing'} · {job.client_name ?? 'Cliente não informado'}
          </span>
          <h2 className="portal-page-title">{job.title}</h2>
          <p className="portal-page-subtitle">
            {deadline ? `Entrega: ${new Date(deadline).toLocaleDateString('pt-BR', { dateStyle: 'medium' })}` : 'Sem prazo definido'}
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
          <span className={`portal-pill ${
            job.status === 'in_progress' || job.status === 'producao' ? 'portal-pill-accent'
            : job.status === 'awaiting_approval' || job.status === 'aprovacao' ? 'portal-pill-warning'
            : job.status === 'done' ? 'portal-pill-success'
            : job.status === 'blocked' ? 'portal-pill-error'
            : 'portal-pill-neutral'
          }`}>
            {statusLabel}
          </span>
          {isOverdue && <span className="portal-pill portal-pill-error">Atrasado</span>}
        </div>
      </div>

      {/* Context */}
      <section className="portal-card">
        <h3 className="portal-section-title" style={{ marginBottom: 16 }}>Contexto</h3>
        <div className="portal-profile-grid">
          <div className="portal-profile-field">
            <span className="portal-profile-label">Cliente</span>
            <span className="portal-profile-value">{job.client_name ?? '—'}</span>
          </div>
          {isOps && opsJob && (
            <>
              {opsJob.job_type_name && (
                <div className="portal-profile-field">
                  <span className="portal-profile-label">Tipo</span>
                  <span className="portal-profile-value">{opsJob.job_type_name}</span>
                </div>
              )}
              {opsJob.priority_band && (
                <div className="portal-profile-field">
                  <span className="portal-profile-label">Prioridade</span>
                  <span className="portal-profile-value">{PRIORITY_LABELS[opsJob.priority_band] ?? opsJob.priority_band.toUpperCase()}</span>
                </div>
              )}
              {opsJob.estimated_minutes != null && opsJob.estimated_minutes > 0 && (
                <div className="portal-profile-field">
                  <span className="portal-profile-label">Estimado</span>
                  <span className="portal-profile-value">
                    {opsJob.estimated_minutes >= 60
                      ? `${Math.floor(opsJob.estimated_minutes / 60)}h${opsJob.estimated_minutes % 60 > 0 ? ` ${opsJob.estimated_minutes % 60}min` : ''}`
                      : `${opsJob.estimated_minutes}min`}
                  </span>
                </div>
              )}
            </>
          )}
          {!isOps && briefing?.copy_approved_at && (
            <div className="portal-profile-field">
              <span className="portal-profile-label">Copy aprovada em</span>
              <span className="portal-profile-value">{new Date(briefing.copy_approved_at).toLocaleDateString('pt-BR')}</span>
            </div>
          )}
        </div>
        {isOps && opsJob?.notes && (
          <div style={{ marginTop: 16 }}>
            <span className="portal-profile-label" style={{ display: 'block', marginBottom: 6 }}>Observações</span>
            <p className="portal-card-subtitle" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{opsJob.notes}</p>
          </div>
        )}
        {!isOps && briefing?.payload && typeof briefing.payload === 'object' && (
          <div style={{ marginTop: 16 }}>
            {Object.entries(briefing.payload).filter(([, v]) => v && String(v).length > 0).slice(0, 12).map(([key, value]) => (
              <div key={key} style={{ marginBottom: 12 }}>
                <span className="portal-profile-label" style={{ display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {key.replace(/_/g, ' ')}
                </span>
                <p className="portal-card-subtitle" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{String(value)}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Timer */}
      {isOps ? (
        <OpsTimerSection jobId={job.id} />
      ) : (
        <BriefingTimerSection briefingId={job.id} profile={profile} onRefresh={() => mutateProfile()} />
      )}

      {/* Marcar Concluído — only for briefings in producao or ajustes */}
      {!isOps && briefing && ['producao', 'ajustes'].includes(briefing.status) && (
        <CompleteJobSection
          briefingId={briefing.id}
          status={briefing.status}
          onDone={() => mutateJob()}
        />
      )}

      <button className="portal-button-ghost" style={{ alignSelf: 'flex-start' }} onClick={() => router.push('/jobs')}>
        ← Voltar
      </button>
    </div>
  );
}

// ── Complete job section ───────────────────────────────────────────────────────

function CompleteJobSection({ briefingId, status, onDone }: { briefingId: string; status: string; onDone: () => void }) {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleComplete = async () => {
    setLoading(true);
    setError(null);
    try {
      await apiPost(`/freelancers/portal/me/jobs/${briefingId}/complete`, {
        notes: notes.trim() || null,
        source: 'briefing',
      });
      setSuccess(true);
      setTimeout(() => onDone(), 1500);
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao marcar como concluído.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <section className="portal-card">
        <div className="portal-alert portal-alert-success">
          ✅ Job enviado para Aprovação Interna! Os gestores serão notificados.
        </div>
      </section>
    );
  }

  return (
    <section className="portal-card">
      <div className="portal-section-head">
        <div>
          <h3 className="portal-section-title">
            {status === 'ajustes' ? 'Ajustes Concluídos' : 'Marcar como Concluído'}
          </h3>
          <p className="portal-card-subtitle">
            {status === 'ajustes'
              ? 'Informe os gestores que os ajustes foram feitos.'
              : 'Anexe os layouts e marque o job como pronto para revisão interna.'}
          </p>
        </div>
      </div>

      <div className="portal-page" style={{ gap: 16 }}>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={
            status === 'ajustes'
              ? 'Descreva os ajustes realizados... (opcional)'
              : 'Observações para a equipe, links de entrega, etc. (opcional)'
          }
          rows={3}
          className="portal-textarea"
        />

        {error && <div className="portal-alert portal-alert-error">{error}</div>}

        <button
          onClick={handleComplete}
          disabled={loading}
          className="portal-button"
          style={{ alignSelf: 'flex-start' }}
        >
          {loading
            ? 'Enviando...'
            : status === 'ajustes'
            ? 'Confirmar ajustes concluídos'
            : 'Marcar como pronto'}
        </button>
      </div>
    </section>
  );
}
