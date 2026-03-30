'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

type Job = {
  id: string;
  title: string;
  status: string;
  due_at: string | null;
  client_name: string | null;
  source: string;
  job_size: string | null;
};

type DaRef = {
  id: string;
  title: string;
  source_url: string;
  image_url: string | null;
  platform: string | null;
  style_tags: string[];
  mood_words: string[];
  visual_intent: string | null;
  confidence_score: number;
  trust_score: number;
};

type DaConcept = {
  slug: string;
  title: string;
  category: string;
  definition: string;
  trust_score: number;
};

type DaTrend = {
  tag: string;
  platform: string | null;
  momentum: number;
  trend_score: number;
};

type DaContext = {
  success: boolean;
  job: { id: string; title: string; client_name: string | null; client_id: string };
  lora: { active: boolean; trigger_word?: string; version?: string };
  references: DaRef[];
  concepts: DaConcept[];
  trends: DaTrend[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function momentumArrow(m: number) {
  if (m > 0.5) return '↑↑';
  if (m > 0) return '↑';
  if (m < -0.5) return '↓↓';
  if (m < 0) return '↓';
  return '→';
}

function scoreBar(v: number, color = '#5D87FF') {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
      <div style={{ flex: 1, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.06)' }}>
        <div style={{ width: `${Math.min(100, v * 100)}%`, height: '100%', borderRadius: 3, background: color }} />
      </div>
      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' }}>
        {Math.round(v * 100)}%
      </span>
    </div>
  );
}

// ── DA Context Panel ──────────────────────────────────────────────────────────

function DaContextPanel({ jobId }: { jobId: string }) {
  const { data, isLoading } = useSWR<DaContext>(
    `/freelancers/portal/me/jobs/${jobId}/da-context`,
    swrFetcher,
  );

  if (isLoading) {
    return (
      <div style={{ padding: '20px 0', textAlign: 'center' }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
        <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Carregando contexto...</p>
      </div>
    );
  }

  if (!data?.success) {
    return (
      <p style={{ margin: '16px 0', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
        Contexto indisponível.
      </p>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* LoRA status */}
      <div style={{
        padding: '12px 14px', borderRadius: 10,
        background: data.lora.active ? 'rgba(19,222,185,0.07)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${data.lora.active ? 'rgba(19,222,185,0.25)' : 'rgba(255,255,255,0.08)'}`,
      }}>
        <p style={{ margin: '0 0 3px', fontSize: 11, fontWeight: 800,
          color: data.lora.active ? '#13DEB9' : 'rgba(255,255,255,0.4)' }}>
          {data.lora.active ? `✓ LoRA v${data.lora.version} ativo` : '○ Sem LoRA — estilo genérico'}
        </p>
        {data.lora.active && (
          <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
            Trigger: <code style={{ color: '#13DEB9' }}>{data.lora.trigger_word}</code>
            {' '}· Todas as imagens geradas usarão o modelo treinado para este cliente.
          </p>
        )}
        {!data.lora.active && (
          <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
            O cliente ainda não tem LoRA treinado. Solicite ao admin para elevar a consistência visual.
          </p>
        )}
      </div>

      {/* Top references */}
      {data.references.length > 0 && (
        <div>
          <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)',
            textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Referências de estilo
          </p>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {data.references.map((ref) => (
              <a
                key={ref.id}
                href={ref.source_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: 'none', flexShrink: 0 }}
              >
                <div style={{
                  width: 90, borderRadius: 8, overflow: 'hidden',
                  border: '1.5px solid rgba(255,255,255,0.08)',
                  transition: 'border-color 0.15s',
                }}>
                  {ref.image_url ? (
                    <img src={ref.image_url} alt={ref.title}
                      style={{ width: 90, height: 90, objectFit: 'cover', display: 'block' }} />
                  ) : (
                    <div style={{ width: 90, height: 90, background: 'rgba(255,255,255,0.04)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 22 }}>🖼</span>
                    </div>
                  )}
                  <div style={{ padding: '5px 6px', background: 'rgba(0,0,0,0.4)' }}>
                    <p style={{ margin: 0, fontSize: 9, color: 'rgba(255,255,255,0.5)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ref.platform ?? 'web'}
                    </p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Concepts */}
      {data.concepts.length > 0 && (
        <div>
          <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)',
            textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Conceitos ativos
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.concepts.map((c) => (
              <div key={c.slug} style={{
                padding: '10px 12px', borderRadius: 8,
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#fff' }}>{c.title}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{c.category}</p>
                  </div>
                </div>
                <p style={{ margin: '4px 0 6px', fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                  {c.definition.slice(0, 120)}{c.definition.length > 120 ? '...' : ''}
                </p>
                {scoreBar(c.trust_score)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trends */}
      {data.trends.length > 0 && (
        <div>
          <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)',
            textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Tendências de estilo
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {data.trends.map((t) => (
              <div key={`${t.tag}-${t.platform}`} style={{
                padding: '4px 10px', borderRadius: 20,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#fff' }}>{t.tag}</span>
                <span style={{
                  marginLeft: 6, fontSize: 10,
                  color: t.momentum > 0 ? '#13DEB9' : t.momentum < 0 ? '#FA896B' : 'rgba(255,255,255,0.3)',
                }}>
                  {momentumArrow(t.momentum)}
                </span>
                {t.platform && (
                  <span style={{ marginLeft: 5, fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>
                    {t.platform}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {data.references.length === 0 && data.concepts.length === 0 && data.trends.length === 0 && (
        <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '8px 0' }}>
          Nenhum contexto de arte carregado para este cliente ainda.
        </p>
      )}
    </div>
  );
}

// ── Job Card ──────────────────────────────────────────────────────────────────

function JobArtCard({ job }: { job: Job }) {
  const [open, setOpen] = useState(false);

  const isOverdue = job.due_at && new Date(job.due_at) < new Date();

  return (
    <div style={{
      background: 'var(--portal-card)', border: `1px solid ${open ? 'rgba(93,135,255,0.4)' : 'var(--portal-border)'}`,
      borderRadius: 14, overflow: 'hidden', transition: 'border-color 0.2s',
    }}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          padding: '14px 16px', textAlign: 'left',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)' }}>
              {job.client_name ?? '—'}
            </span>
            {job.job_size && (
              <span style={{
                fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 5,
                background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)',
              }}>
                {job.job_size}
              </span>
            )}
          </div>
          <p style={{
            margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--portal-text)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {job.title}
          </p>
          {job.due_at && (
            <p style={{ margin: '3px 0 0', fontSize: 11, color: isOverdue ? '#FA896B' : 'rgba(255,255,255,0.3)' }}>
              {isOverdue ? '🔴 ' : ''}Entrega: {new Date(job.due_at).toLocaleDateString('pt-BR')}
            </p>
          )}
        </div>
        <div style={{
          flexShrink: 0, fontSize: 16, color: open ? '#5D87FF' : 'rgba(255,255,255,0.3)',
          transition: 'transform 0.2s',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
        }}>
          ▾
        </div>
      </button>

      {/* Expanded context */}
      {open && (
        <div style={{
          padding: '0 16px 16px',
          borderTop: '1px solid var(--portal-border)',
          paddingTop: 16,
        }}>
          <DaContextPanel jobId={job.id} />
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ArtePage() {
  const { data, isLoading } = useSWR<{ jobs?: Job[] }>(
    '/freelancers/portal/me/jobs',
    swrFetcher,
  );

  // Only show ops jobs (which have the owner_id binding to DA)
  const daJobs = (data?.jobs ?? []).filter((j) => j.source === 'ops_job');

  return (
    <div className="portal-page">
      {/* Header */}
      <div>
        <span className="portal-kicker">Motor de DA</span>
        <h2 className="portal-page-title">◈ Contexto de Arte</h2>
        <p className="portal-page-subtitle">
          Referências, conceitos e tendências carregados para cada job. Use para guiar a geração de imagens.
        </p>
      </div>

      {isLoading ? (
        <section className="portal-card">
          <div className="portal-empty">
            <div style={{ fontSize: 36, marginBottom: 10 }}>⏳</div>
            <p className="portal-card-subtitle">Carregando jobs...</p>
          </div>
        </section>
      ) : daJobs.length === 0 ? (
        <section className="portal-card">
          <div className="portal-empty">
            <div style={{ fontSize: 36, marginBottom: 10 }}>🌱</div>
            <p className="portal-card-subtitle">Nenhum job de DA ativo no momento.</p>
            <p style={{ fontSize: 11, color: 'var(--portal-muted)', marginTop: 4, textAlign: 'center', maxWidth: 240 }}>
              Os jobs aparecem aqui quando você está designado como responsável por uma entrega de arte.
            </p>
          </div>
        </section>
      ) : (
        <>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: 0 }}>
            {daJobs.length} job{daJobs.length !== 1 ? 's' : ''} ativo{daJobs.length !== 1 ? 's' : ''} —
            clique para ver o contexto de arte carregado para cada cliente.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {daJobs.map((job) => (
              <JobArtCard key={job.id} job={job} />
            ))}
          </div>
        </>
      )}

      {/* Info footer */}
      <div style={{
        padding: '14px 16px', borderRadius: 12,
        background: 'rgba(93,135,255,0.04)', border: '1px solid rgba(93,135,255,0.15)',
      }}>
        <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.35)', lineHeight: 1.7 }}>
          <strong style={{ color: 'rgba(255,255,255,0.5)' }}>Motor de DA:</strong>{' '}
          O contexto é gerado automaticamente pela IA a partir do histórico de aprovações do cliente,
          referências de estilo coletadas da web e tendências da plataforma. Quanto mais aprovações
          registradas, mais preciso o contexto.
        </p>
      </div>
    </div>
  );
}
