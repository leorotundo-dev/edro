'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR, { mutate as globalMutate } from 'swr';
import { swrFetcher, apiPost } from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

type JobSize = 'P' | 'M' | 'G' | 'GG';

type Job = {
  id: string;
  title: string;
  status: string;
  due_at: string | null;
  client_name: string | null;
  source: 'briefing' | 'ops_job' | 'trello_card';
  board_name?: string | null;
  list_name?: string | null;
  due_complete?: boolean;
  pending_acceptance?: boolean;
  fee_brl?: string | null;
  job_size?: JobSize | null;
  delivered_link?: string | null;
  adjustment_feedback?: string | null;
  approved_at?: string | null;
  delivered_at?: string | null;
};

type PoolJob = {
  id: string;
  title: string;
  due_at: string | null;
  fee_brl: string | null;
  job_size: JobSize | null;
  summary: string | null;
  client_name: string | null;
  size_label: string | null;
  size_description: string | null;
};

// ── T-shirt config ────────────────────────────────────────────────────────────

const SIZE_CONFIG: Record<JobSize, { color: string; bg: string; border: string }> = {
  P:  { color: '#13DEB9', bg: 'rgba(19,222,185,0.10)',  border: 'rgba(19,222,185,0.25)' },
  M:  { color: '#5D87FF', bg: 'rgba(93,135,255,0.10)',  border: 'rgba(93,135,255,0.25)' },
  G:  { color: '#F8A800', bg: 'rgba(248,168,0,0.10)',   border: 'rgba(248,168,0,0.25)' },
  GG: { color: '#FA896B', bg: 'rgba(250,137,107,0.10)', border: 'rgba(250,137,107,0.25)' },
};

function SizeBadge({ size }: { size: JobSize | null | undefined }) {
  if (!size) return null;
  const s = SIZE_CONFIG[size];
  return (
    <span style={{
      fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 6,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      letterSpacing: '0.04em', flexShrink: 0,
    }}>
      {size}
    </span>
  );
}

function FeeBadge({ fee }: { fee: string | null | undefined }) {
  if (!fee) return null;
  const v = parseFloat(fee);
  if (isNaN(v) || v === 0) return null;
  return (
    <span style={{
      fontSize: 11, fontWeight: 800, color: '#13DEB9',
      background: 'rgba(19,222,185,0.08)', borderRadius: 6,
      padding: '2px 8px', flexShrink: 0,
    }}>
      R$ {v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseDay(dateStr: string): Date {
  return new Date(dateStr.slice(0, 10) + 'T00:00:00');
}

function slaLabel(due_at: string | null): { label: string; color: string } | null {
  if (!due_at) return null;
  const due = parseDay(due_at);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((due.getTime() - today.getTime()) / 86400000);
  if (diff < 0)  return { label: `+${Math.abs(diff)}d atrasado`, color: '#ff4444' };
  if (diff === 0) return { label: 'Hoje', color: '#F8A800' };
  if (diff === 1) return { label: 'Amanhã', color: '#F8A800' };
  return { label: `${diff}d`, color: '#5D87FF' };
}

// ── Delivery form ─────────────────────────────────────────────────────────────

function DeliveryForm({ jobId, onDelivered }: { jobId: string; onDelivered: () => void }) {
  const [link, setLink] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (!link.trim()) { setError('Informe o link de entrega'); return; }
    setLoading(true);
    setError('');
    try {
      await apiPost(`/freelancers/portal/me/jobs/${jobId}/deliver`, {
        delivered_link: link.trim(),
        delivery_notes: notes.trim() || undefined,
      });
      onDelivered();
    } catch (e: any) {
      setError(e.message ?? 'Erro ao entregar escopo');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      padding: '14px 16px 16px',
      borderTop: '1px solid rgba(19,222,185,0.15)',
      background: 'rgba(19,222,185,0.04)',
    }}>
      <p style={{ fontSize: 12, color: '#13DEB9', fontWeight: 700, margin: '0 0 10px' }}>
        Entregar Escopo
      </p>
      <input
        type="url"
        placeholder="Link de entrega (Figma, Drive, Notion...)"
        value={link}
        onChange={e => setLink(e.target.value)}
        style={{
          width: '100%', boxSizing: 'border-box',
          background: 'var(--portal-bg)', border: '1px solid var(--portal-border)',
          borderRadius: 8, padding: '8px 12px', color: 'var(--portal-text)',
          fontSize: 13, outline: 'none', marginBottom: 8,
        }}
      />
      <textarea
        placeholder="Anotações para a agência (opcional)..."
        value={notes}
        onChange={e => setNotes(e.target.value)}
        rows={2}
        style={{
          width: '100%', boxSizing: 'border-box',
          background: 'var(--portal-bg)', border: '1px solid var(--portal-border)',
          borderRadius: 8, padding: '8px 12px', color: 'var(--portal-text)',
          fontSize: 13, outline: 'none', resize: 'vertical', marginBottom: 8,
        }}
      />
      {error && <p style={{ fontSize: 12, color: '#ff4444', margin: '0 0 8px' }}>{error}</p>}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={submit}
          disabled={loading || !link.trim()}
          style={{
            padding: '8px 20px', borderRadius: 9,
            background: link.trim() ? 'rgba(19,222,185,0.15)' : 'rgba(255,255,255,0.05)',
            border: `1.5px solid ${link.trim() ? 'rgba(19,222,185,0.4)' : 'rgba(255,255,255,0.1)'}`,
            color: link.trim() ? '#13DEB9' : 'var(--portal-muted)',
            fontWeight: 800, fontSize: 13, cursor: link.trim() ? 'pointer' : 'not-allowed',
          }}
        >
          {loading ? '...' : 'Confirmar Entrega'}
        </button>
      </div>
    </div>
  );
}

// ── Job card ──────────────────────────────────────────────────────────────────

function JobCard({ job, onMutate }: { job: Job; onMutate: () => void }) {
  const [showDelivery, setShowDelivery] = useState(false);
  const sla = slaLabel(job.due_at);
  const isUrgent = sla && (sla.color === '#ff4444' || sla.color === '#F8A800');

  const isInProgress = ['allocated', 'in_progress'].includes(job.status);
  const isInReview   = job.status === 'in_review';
  const isAdjustment = job.status === 'adjustment';
  const isApproved   = job.status === 'approved';

  function handleDelivered() {
    setShowDelivery(false);
    globalMutate('/freelancers/portal/me/jobs');
  }

  return (
    <div style={{ borderBottom: '1px solid var(--portal-border)' }}>
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '13px 16px',
        background: isUrgent ? 'rgba(255,68,68,0.03)' : 'transparent',
      }}>
        {/* Status dot */}
        <div style={{
          width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 5,
          background: isApproved ? '#13DEB9' : isInReview ? '#5D87FF' : isAdjustment ? '#F8A800' : isUrgent ? '#ff4444' : 'rgba(255,255,255,0.15)',
        }} />

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: 14, fontWeight: 600, margin: '0 0 5px',
            color: 'var(--portal-text)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {job.title}
          </p>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
            {job.job_size && <SizeBadge size={job.job_size} />}
            {job.fee_brl && <FeeBadge fee={job.fee_brl} />}
            {sla && (
              <span style={{
                fontSize: 11, fontWeight: 700, color: sla.color,
                background: `${sla.color}18`, padding: '1px 7px', borderRadius: 6,
              }}>
                SLA: {sla.label}
              </span>
            )}
            {job.client_name && (
              <span style={{ fontSize: 11, color: 'var(--portal-muted)' }}>{job.client_name}</span>
            )}
          </div>

          {/* Adjustment feedback */}
          {isAdjustment && job.adjustment_feedback && (
            <div style={{
              marginTop: 8, padding: '8px 10px', borderRadius: 8,
              background: 'rgba(248,168,0,0.08)', border: '1px solid rgba(248,168,0,0.2)',
              fontSize: 12, color: '#F8A800',
            }}>
              Retorno da agência: {job.adjustment_feedback}
            </div>
          )}

          {/* Approved: show credit confirmation */}
          {isApproved && job.fee_brl && (
            <div style={{
              marginTop: 8, padding: '6px 10px', borderRadius: 8,
              background: 'rgba(19,222,185,0.08)', border: '1px solid rgba(19,222,185,0.2)',
              fontSize: 12, color: '#13DEB9', fontWeight: 700,
            }}>
              Honorário creditado: R$ {parseFloat(job.fee_brl).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          )}

          {/* In review: delivery link confirmation */}
          {isInReview && job.delivered_link && (
            <div style={{ marginTop: 6 }}>
              <a href={job.delivered_link} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 12, color: '#5D87FF', textDecoration: 'underline' }}>
                Ver entrega enviada
              </a>
              <span style={{ fontSize: 12, color: 'var(--portal-muted)', marginLeft: 8 }}>
                · Aguardando validação
              </span>
            </div>
          )}
        </div>

        {/* CTA button */}
        <div style={{ flexShrink: 0 }}>
          {isInProgress && (
            <button
              type="button"
              onClick={() => setShowDelivery(v => !v)}
              style={{
                padding: '7px 14px', borderRadius: 9,
                background: showDelivery ? 'rgba(19,222,185,0.2)' : 'rgba(19,222,185,0.08)',
                border: '1.5px solid rgba(19,222,185,0.35)',
                color: '#13DEB9', fontSize: 12, fontWeight: 800, cursor: 'pointer',
              }}
            >
              {showDelivery ? '✕' : '⬆ Entregar'}
            </button>
          )}
          {isAdjustment && (
            <button
              type="button"
              onClick={() => setShowDelivery(v => !v)}
              style={{
                padding: '7px 14px', borderRadius: 9,
                background: showDelivery ? 'rgba(248,168,0,0.2)' : 'rgba(248,168,0,0.08)',
                border: '1.5px solid rgba(248,168,0,0.35)',
                color: '#F8A800', fontSize: 12, fontWeight: 800, cursor: 'pointer',
              }}
            >
              {showDelivery ? '✕' : '⬆ Reenviar'}
            </button>
          )}
          {isInReview && (
            <span style={{
              fontSize: 11, color: '#5D87FF', fontWeight: 700,
              background: 'rgba(93,135,255,0.1)', padding: '5px 10px', borderRadius: 8,
            }}>
              🔍 Validando
            </span>
          )}
          {isApproved && (
            <span style={{ fontSize: 18 }}>✅</span>
          )}
          {!isInProgress && !isAdjustment && !isInReview && !isApproved && (
            <Link href={`/jobs/${job.id}?source=${job.source}`}
              style={{ color: 'var(--portal-muted)', fontSize: 16, textDecoration: 'none' }}>
              ›
            </Link>
          )}
        </div>
      </div>

      {/* Delivery form */}
      {showDelivery && (
        <DeliveryForm jobId={job.id} onDelivered={() => { handleDelivered(); setShowDelivery(false); }} />
      )}
    </div>
  );
}

// ── Kanban column ─────────────────────────────────────────────────────────────

function KanbanColumn({
  emoji, title, color, bg, border, jobs, emptyText, onMutate,
}: {
  emoji: string; title: string; color: string; bg: string; border: string;
  jobs: Job[]; emptyText?: string; onMutate: () => void;
}) {
  const [open, setOpen] = useState(true);
  if (jobs.length === 0 && !emptyText) return null;

  return (
    <section style={{ background: bg, border: `1.5px solid ${border}`, borderRadius: 14, overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px', background: 'transparent', border: 'none', cursor: 'pointer',
          borderBottom: open && jobs.length > 0 ? `1px solid ${border}` : 'none',
        }}
      >
        <span style={{ fontSize: 15 }}>{emoji}</span>
        <span style={{ fontWeight: 800, fontSize: 14, color }}>{title}</span>
        <span style={{
          fontSize: 12, fontWeight: 700, padding: '2px 9px', borderRadius: 99,
          background: `${color}22`, color,
        }}>
          {jobs.length}
        </span>
        <span style={{ marginLeft: 'auto', color: 'var(--portal-muted)', fontSize: 11 }}>
          {open ? '▲' : '▼'}
        </span>
      </button>

      {open && (
        jobs.length === 0 ? (
          <div style={{ padding: '14px 16px', fontSize: 12, color: 'var(--portal-muted)' }}>
            {emptyText}
          </div>
        ) : (
          jobs.map(job => <JobCard key={job.id} job={job} onMutate={onMutate} />)
        )
      )}
    </section>
  );
}

// ── Pool / Mercado de Escopos ──────────────────────────────────────────────────

function PoolSection({ onAccepted }: { onAccepted: () => void }) {
  const { data, isLoading, mutate } = useSWR<{ pool: PoolJob[] }>('/freelancers/portal/me/pool', swrFetcher);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(true);

  const pool = (data?.pool ?? []).filter(j => !done.has(j.id));
  if (isLoading || pool.length === 0) return null;

  async function accept(jobId: string) {
    setAccepting(jobId);
    try {
      await apiPost(`/freelancers/portal/me/pool/${jobId}/accept`, {});
      setDone(prev => new Set([...prev, jobId]));
      mutate();
      onAccepted();
      globalMutate('/freelancers/portal/me/earnings/current-month');
    } catch (e: any) {
      alert(e.message ?? 'Erro ao aceitar escopo');
    } finally {
      setAccepting(null);
    }
  }

  return (
    <section style={{
      background: 'rgba(139,92,246,0.05)', border: '2px solid rgba(139,92,246,0.25)',
      borderRadius: 14, overflow: 'hidden',
    }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px', background: 'transparent', border: 'none', cursor: 'pointer',
          borderBottom: open ? '1px solid rgba(139,92,246,0.2)' : 'none',
        }}
      >
        <span style={{ fontSize: 15 }}>🛒</span>
        <span style={{ fontWeight: 800, fontSize: 14, color: '#A78BFA' }}>Mercado de Escopos</span>
        <span style={{
          fontSize: 12, fontWeight: 700, padding: '2px 9px', borderRadius: 99,
          background: 'rgba(139,92,246,0.15)', color: '#A78BFA',
        }}>
          {pool.length}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
          {open ? '▲' : '▼'}
        </span>
      </button>

      {open && (
        <div>
          <div style={{ padding: '8px 16px 4px', fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
            Você vê o que, quanto e quando — antes de confirmar.
          </div>
          {pool.map(j => {
            const sla = slaLabel(j.due_at);
            return (
              <div key={j.id} style={{
                borderTop: '1px solid rgba(139,92,246,0.15)',
                padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: '0 0 6px',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {j.title}
                  </p>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    {j.job_size && <SizeBadge size={j.job_size} />}
                    {j.fee_brl && <FeeBadge fee={j.fee_brl} />}
                    {sla && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: sla.color, background: `${sla.color}18`, padding: '1px 7px', borderRadius: 6 }}>
                        SLA: {sla.label}
                      </span>
                    )}
                  </div>
                  {j.size_description && (
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: '5px 0 0' }}>
                      {j.size_description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => accept(j.id)}
                  disabled={accepting === j.id}
                  style={{
                    flexShrink: 0, padding: '8px 16px', borderRadius: 10,
                    background: accepting === j.id ? 'rgba(139,92,246,0.3)' : 'rgba(139,92,246,0.2)',
                    border: '1.5px solid rgba(139,92,246,0.4)',
                    color: '#A78BFA', fontSize: 12, fontWeight: 800, cursor: 'pointer',
                  }}
                >
                  {accepting === j.id ? '...' : '✓ Aceitar'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ── Earnings bar ──────────────────────────────────────────────────────────────

function EarningsBar() {
  const { data } = useSWR<{ completed_count: number; total_brl: string }>(
    '/freelancers/portal/me/earnings/current-month', swrFetcher,
  );
  if (!data || parseFloat(data.total_brl) === 0) return null;

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(19,222,185,0.12) 0%, rgba(93,135,255,0.08) 100%)',
      border: '1.5px solid rgba(19,222,185,0.25)',
      borderRadius: 12, padding: '12px 18px',
      display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: 22 }}>💰</span>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#13DEB9', lineHeight: 1 }}>
          R$ {parseFloat(data.total_brl).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>
          Este mês · {data.completed_count} escopo{data.completed_count !== 1 ? 's' : ''} aprovado{data.completed_count !== 1 ? 's' : ''}
        </div>
      </div>
      <div style={{ marginLeft: 'auto', fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'right' }}>
        Honorários a faturar via NF-e
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function JobsPage() {
  const { data, isLoading, mutate } = useSWR<{ jobs?: Job[] }>('/freelancers/portal/me/jobs', swrFetcher);

  const jobs = data?.jobs ?? [];

  // Split into Kanban columns by status
  const colEmExecucao  = jobs.filter(j => ['allocated', 'in_progress'].includes(j.status));
  const colHomologacao = jobs.filter(j => j.status === 'in_review');
  const colAjuste      = jobs.filter(j => j.status === 'adjustment');
  const colAprovado    = jobs.filter(j => j.status === 'approved');

  // Legacy jobs (briefings, trello cards, other statuses) shown separately
  const colOutros      = jobs.filter(j =>
    j.source !== 'ops_job' ||
    !['allocated', 'in_progress', 'in_review', 'adjustment', 'approved'].includes(j.status)
  );

  const urgentCount = colEmExecucao.filter(j => {
    const sla = slaLabel(j.due_at);
    return sla && sla.color === '#ff4444';
  }).length;

  if (isLoading) {
    return (
      <div className="portal-page">
        <div className="portal-empty">
          <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
          <p className="portal-card-subtitle">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-page">

      {/* Header */}
      <div>
        <span className="portal-kicker">B2B · Kanban</span>
        <h2 className="portal-page-title">
          {urgentCount > 0 ? '🚨' : '⚙️'} Escopos
        </h2>
        <p className="portal-page-subtitle">
          {colEmExecucao.length} em execução
          {colHomologacao.length > 0 && ` · ${colHomologacao.length} em homologação`}
          {colAjuste.length > 0 && ` · ${colAjuste.length} em ajuste`}
          {colAprovado.length > 0 && ` · ${colAprovado.length} aprovado${colAprovado.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {/* Earnings bar */}
      <EarningsBar />

      {/* Mercado de Escopos — pool self-select */}
      <PoolSection onAccepted={() => mutate()} />

      {/* Em Execução */}
      <KanbanColumn
        emoji="⚙️" title="Em Execução" color="#13DEB9"
        bg="var(--portal-card)" border="var(--portal-border)"
        jobs={colEmExecucao}
        emptyText="Nenhum escopo em execução. Aceite escopos do Mercado acima."
        onMutate={mutate}
      />

      {/* Em Homologação */}
      <KanbanColumn
        emoji="🔍" title="Em Homologação" color="#5D87FF"
        bg="rgba(93,135,255,0.04)" border="rgba(93,135,255,0.2)"
        jobs={colHomologacao}
        onMutate={mutate}
      />

      {/* Ajuste de Escopo */}
      <KanbanColumn
        emoji="🔄" title="Ajuste de Escopo" color="#F8A800"
        bg="rgba(248,168,0,0.04)" border="rgba(248,168,0,0.2)"
        jobs={colAjuste}
        onMutate={mutate}
      />

      {/* Entregável Aprovado */}
      <KanbanColumn
        emoji="✅" title="Entregável Aprovado" color="#13DEB9"
        bg="rgba(19,222,185,0.04)" border="rgba(19,222,185,0.15)"
        jobs={colAprovado}
        onMutate={mutate}
      />

      {/* Legacy (briefings, trello cards) — kept for backwards compat */}
      {colOutros.length > 0 && (
        <KanbanColumn
          emoji="📋" title="Outras demandas" color="var(--portal-muted)"
          bg="var(--portal-card)" border="var(--portal-border)"
          jobs={colOutros}
          onMutate={mutate}
        />
      )}

      {/* Empty state */}
      {jobs.length === 0 && (
        <section className="portal-card">
          <div className="portal-empty">
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎯</div>
            <p className="portal-card-title">Kanban vazio</p>
            <p className="portal-card-subtitle">Aceite escopos do Mercado acima ou aguarde ser alocado.</p>
          </div>
        </section>
      )}

    </div>
  );
}
