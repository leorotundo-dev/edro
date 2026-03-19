'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';

type StudioBriefing = {
  id: string;
  title: string;
  status: string;
  due_at: string | null;
  client_name: string | null;
  copy_count: string;
  payload?: Record<string, any> | null;
};

// Platform display
const PLATFORM_DISPLAY: Record<string, { emoji: string; label: string; color: string }> = {
  instagram:  { emoji: '📸', label: 'Instagram',  color: '#E1306C' },
  instagram_feed:    { emoji: '📸', label: 'Instagram',  color: '#E1306C' },
  instagram_stories: { emoji: '📖', label: 'Stories',    color: '#F77737' },
  instagram_reels:   { emoji: '🎬', label: 'Reels',      color: '#833AB4' },
  linkedin:   { emoji: '💼', label: 'LinkedIn',   color: '#0A66C2' },
  tiktok:     { emoji: '🎵', label: 'TikTok',     color: '#010101' },
  facebook:   { emoji: '📘', label: 'Facebook',   color: '#1877F2' },
  twitter:    { emoji: '🐦', label: 'Twitter/X',  color: '#1DA1F2' },
  youtube:    { emoji: '▶️', label: 'YouTube',    color: '#FF0000' },
  email:      { emoji: '📧', label: 'E-mail',     color: '#888' },
  blog:       { emoji: '📝', label: 'Blog',       color: '#888' },
};

const STATUS_STEPS: Record<string, number> = {
  briefing: 1, iclips_in: 1, alinhamento: 2,
  copy_ia: 3, producao: 3,
  revisao: 4, aprovacao: 4,
  iclips_out: 5, done: 6,
};
const TOTAL_STEPS = 6;

const STATUS_EMOJI: Record<string, string> = {
  briefing: '📋', alinhamento: '🤝', copy_ia: '🤖',
  producao: '🔨', revisao: '👀', aprovacao: '🕐',
  iclips_out: '📤', done: '✅',
};

const STATUS_LABELS: Record<string, string> = {
  briefing: 'Briefing', iclips_in: 'Entrada', alinhamento: 'Alinhamento',
  copy_ia: 'Copy IA', producao: 'Produção', revisao: 'Revisão',
  aprovacao: 'Aprovação', iclips_out: 'Saída', done: 'Concluído',
};

function isOverdue(dueAt: string | null) {
  return dueAt && new Date(dueAt) < new Date();
}

export default function StudioPage() {
  const { data, isLoading } = useSWR<{ briefings?: StudioBriefing[] }>(
    '/freelancers/portal/me/studio', swrFetcher,
  );
  const briefings = data?.briefings ?? [];

  const today = new Date(); today.setHours(0, 0, 0, 0);

  return (
    <div className="portal-page">
      <div>
        <span className="portal-kicker">Creative Studio</span>
        <h2 className="portal-page-title">✦ Produção de copy</h2>
        <p className="portal-page-subtitle">
          Seus briefings com IA, editor e envio para revisão — tudo em um lugar.
        </p>
      </div>

      {isLoading ? (
        <section className="portal-card">
          <div className="portal-empty">
            <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
            <p className="portal-card-subtitle">Carregando briefings...</p>
          </div>
        </section>
      ) : !briefings.length ? (
        <section className="portal-card">
          <div className="portal-empty">
            <div style={{ fontSize: 48, marginBottom: 12 }}>✨</div>
            <p className="portal-card-title">Nenhum briefing ativo</p>
            <p className="portal-card-subtitle">
              Quando você for atribuído a um briefing, ele aparece aqui.
            </p>
          </div>
        </section>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {briefings.map((b) => {
            const overdue = isOverdue(b.due_at);
            const copyCount = parseInt(b.copy_count ?? '0', 10);
            const isDone = b.status === 'done';
            const step = STATUS_STEPS[b.status] ?? 1;
            const pct = Math.round((step / TOTAL_STEPS) * 100);
            const platform = b.payload?.platform
              ? PLATFORM_DISPLAY[String(b.payload.platform).toLowerCase()] ?? null
              : null;
            const statusEmoji = STATUS_EMOJI[b.status] ?? '📋';
            const statusLabel = STATUS_LABELS[b.status] ?? b.status;

            // Due date urgency
            let dueColor = 'var(--portal-muted)';
            let dueEmoji = '📅';
            if (overdue) { dueColor = '#ff4444'; dueEmoji = '🔴'; }
            else if (b.due_at) {
              const diff = Math.ceil((new Date(b.due_at).getTime() - today.getTime()) / 86400000);
              if (diff <= 1) { dueColor = '#ff4444'; dueEmoji = '🚨'; }
              else if (diff <= 3) { dueColor = '#F8A800'; dueEmoji = '⚠️'; }
              else { dueColor = 'var(--portal-muted)'; dueEmoji = '📅'; }
            }

            return (
              <Link key={b.id} href={`/studio/${b.id}`} style={{ textDecoration: 'none' }}>
                <div className="portal-card" style={{ padding: 16, cursor: 'pointer', transition: 'border-color 0.15s' }}>
                  {/* Top row */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    {/* Platform badge */}
                    {platform ? (
                      <div style={{
                        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                        background: `${platform.color}20`,
                        border: `1.5px solid ${platform.color}40`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                      }}>
                        {platform.emoji}
                      </div>
                    ) : (
                      <div style={{
                        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                        background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                      }}>
                        ✍️
                      </div>
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="portal-card-title" style={{
                        marginBottom: 3,
                        textDecoration: isDone ? 'line-through' : 'none',
                        opacity: isDone ? 0.6 : 1,
                      }}>
                        {b.title}
                      </p>
                      <p className="portal-card-subtitle">{b.client_name ?? 'Cliente não informado'}</p>

                      {/* Badges */}
                      <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                          background: isDone ? 'rgba(19,222,185,0.15)' : 'rgba(255,255,255,0.08)',
                          color: isDone ? '#13DEB9' : 'var(--portal-muted)',
                        }}>
                          {statusEmoji} {statusLabel}
                        </span>
                        {platform && (
                          <span style={{
                            fontSize: 10, padding: '2px 8px', borderRadius: 6,
                            background: `${platform.color}18`, color: platform.color, fontWeight: 600,
                          }}>
                            {platform.emoji} {platform.label}
                          </span>
                        )}
                        {copyCount > 0 && (
                          <span style={{
                            fontSize: 10, padding: '2px 8px', borderRadius: 6,
                            background: 'rgba(168,85,247,0.15)', color: '#A855F7',
                          }}>
                            ✍️ {copyCount} {copyCount === 1 ? 'versão' : 'versões'}
                          </span>
                        )}
                        {copyCount === 0 && !isDone && (
                          <span style={{
                            fontSize: 10, padding: '2px 8px', borderRadius: 6,
                            background: 'rgba(248,168,0,0.12)', color: '#F8A800',
                          }}>
                            📄 Sem copy ainda
                          </span>
                        )}
                        {b.due_at && (
                          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, color: dueColor, background: `${dueColor}15` }}>
                            {dueEmoji} {overdue ? 'Venceu ' : ''}{new Date(b.due_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* CTA */}
                    <div style={{
                      flexShrink: 0, background: 'var(--portal-accent)', color: '#fff',
                      borderRadius: 10, padding: '8px 14px', fontSize: 12, fontWeight: 700,
                    }}>
                      {isDone ? 'Ver ✓' : copyCount === 0 ? '+ Copy' : 'Editar'}
                    </div>
                  </div>

                  {/* Progress bar */}
                  {!isDone && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 9, color: 'var(--portal-muted)' }}>Progresso</span>
                        <span style={{ fontSize: 9, color: 'var(--portal-muted)' }}>{pct}%</span>
                      </div>
                      <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 99, width: `${pct}%`,
                          background: pct >= 80 ? '#13DEB9' : pct >= 50 ? 'var(--portal-accent)' : '#5D87FF',
                          transition: 'width 0.5s ease',
                        }} />
                      </div>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
