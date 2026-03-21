'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { swrFetcher } from '@/lib/api';

type PortfolioItem = {
  id: string;
  title: string;
  job_size: string | null;
  job_category: string | null;
  fee_brl: string | null;
  approved_at: string | null;
  delivered_link: string | null;
  summary: string | null;
  client_name: string | null;
};

type Portfolio = {
  portfolio: PortfolioItem[];
  stats: { total_approved: number; big_jobs: number; total_earned: number };
};

const CATEGORY_META: Record<string, { emoji: string; color: string }> = {
  design:     { emoji: '🎨', color: '#A78BFA' },
  video:      { emoji: '🎬', color: '#FA896B' },
  copy:       { emoji: '✍️', color: '#5D87FF' },
  management: { emoji: '📋', color: '#13DEB9' },
};

const SIZE_COLOR: Record<string, { color: string; bg: string; border: string }> = {
  PP: { color: '#888',    bg: 'rgba(128,128,128,0.1)',  border: 'rgba(128,128,128,0.2)' },
  P:  { color: '#13DEB9', bg: 'rgba(19,222,185,0.1)',   border: 'rgba(19,222,185,0.25)' },
  M:  { color: '#5D87FF', bg: 'rgba(93,135,255,0.1)',   border: 'rgba(93,135,255,0.25)' },
  G:  { color: '#F8A800', bg: 'rgba(248,168,0,0.1)',    border: 'rgba(248,168,0,0.25)' },
  GG: { color: '#FA896B', bg: 'rgba(250,137,107,0.1)', border: 'rgba(250,137,107,0.25)' },
};

function fmtDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
}

export default function PortfolioPage() {
  const { data, isLoading } = useSWR<Portfolio>('/freelancers/portal/me/portfolio', swrFetcher);

  const portfolio = data?.portfolio ?? [];
  const stats = data?.stats;
  const hasItems = portfolio.length > 0;

  return (
    <div className="portal-page">

      {/* Header */}
      <div>
        <span className="portal-kicker">Portfólio · Hall da Fama</span>
        <h2 className="portal-page-title">🏆 Meus Grandes Projetos</h2>
        <p className="portal-page-subtitle">
          Escopos G e GG entregues e aprovados pela agência. Sua vitrine de excelência.
        </p>
      </div>

      {/* Stats bar */}
      {stats && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{
            flex: '1 1 100px',
            background: 'rgba(248,168,0,0.08)', border: '1px solid rgba(248,168,0,0.2)',
            borderRadius: 12, padding: '14px 16px', textAlign: 'center',
          }}>
            <p style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#F8A800', lineHeight: 1 }}>
              {stats.big_jobs}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--portal-muted)' }}>
              Grandes projetos
            </p>
          </div>
          <div style={{
            flex: '1 1 100px',
            background: 'rgba(19,222,185,0.08)', border: '1px solid rgba(19,222,185,0.2)',
            borderRadius: 12, padding: '14px 16px', textAlign: 'center',
          }}>
            <p style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#13DEB9', lineHeight: 1 }}>
              {stats.total_approved}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--portal-muted)' }}>
              Total aprovados
            </p>
          </div>
          <div style={{
            flex: '1 1 140px',
            background: 'rgba(93,135,255,0.08)', border: '1px solid rgba(93,135,255,0.2)',
            borderRadius: 12, padding: '14px 16px', textAlign: 'center',
          }}>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#5D87FF', lineHeight: 1 }}>
              R$ {stats.total_earned.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--portal-muted)' }}>
              Faturamento total
            </p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="portal-empty">
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏆</div>
          <p className="portal-card-subtitle">Carregando portfólio…</p>
        </div>
      ) : !hasItems ? (
        <section className="portal-card">
          <div className="portal-empty">
            <div style={{ fontSize: 56, marginBottom: 16 }}>🎯</div>
            <p className="portal-card-title">Hall da Fama vazio</p>
            <p className="portal-card-subtitle">
              Complete escopos G ou GG e eles aparecerão aqui como sua vitrine de excelência.
              Projetos grandes são o destaque do seu portfólio profissional.
            </p>
            <Link href="/jobs" style={{
              display: 'inline-block', marginTop: 16,
              padding: '10px 20px', borderRadius: 10,
              background: 'rgba(248,168,0,0.1)', border: '1.5px solid rgba(248,168,0,0.3)',
              color: '#F8A800', fontSize: 13, fontWeight: 800, textDecoration: 'none',
            }}>
              Ver Escopos Disponíveis
            </Link>
          </div>
        </section>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {portfolio.map(item => {
            const sz    = SIZE_COLOR[item.job_size ?? ''] ?? SIZE_COLOR.M;
            const catM  = CATEGORY_META[item.job_category ?? ''];
            const isGG  = item.job_size === 'GG';

            return (
              <div key={item.id} style={{
                background: isGG
                  ? 'linear-gradient(135deg, rgba(250,137,107,0.08) 0%, rgba(248,168,0,0.05) 100%)'
                  : 'var(--portal-card)',
                border: isGG ? '1.5px solid rgba(250,137,107,0.3)' : '1.5px solid var(--portal-border)',
                borderRadius: 14, padding: '16px',
                position: 'relative',
              }}>
                {/* GG badge */}
                {isGG && (
                  <div style={{
                    position: 'absolute', top: 12, right: 12,
                    fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 6,
                    background: 'rgba(250,137,107,0.2)', color: '#FA896B',
                    border: '1px solid rgba(250,137,107,0.4)', letterSpacing: '0.05em',
                  }}>
                    DESTAQUE
                  </div>
                )}

                {/* Title row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                  {catM && (
                    <span style={{
                      fontSize: 22, width: 36, height: 36, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: `${catM.color}12`, borderRadius: 8,
                    }}>{catM.emoji}</span>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      margin: '0 0 5px', fontSize: 14, fontWeight: 800, color: 'var(--portal-text)',
                      paddingRight: isGG ? 70 : 0,
                    }}>
                      {item.title}
                    </p>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      {item.job_size && (
                        <span style={{
                          fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 5,
                          background: sz.bg, color: sz.color, border: `1px solid ${sz.border}`,
                          letterSpacing: '0.04em',
                        }}>{item.job_size}</span>
                      )}
                      {item.job_category && catM && (
                        <span style={{ fontSize: 11, color: catM.color }}>
                          {item.job_category.charAt(0).toUpperCase() + item.job_category.slice(1)}
                        </span>
                      )}
                      {item.client_name && (
                        <span style={{ fontSize: 11, color: 'var(--portal-muted)' }}>
                          · {item.client_name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Summary */}
                {item.summary && (
                  <p style={{
                    margin: '0 0 10px', fontSize: 12, color: 'var(--portal-muted)',
                    lineHeight: 1.5,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {item.summary}
                  </p>
                )}

                {/* Footer row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  {item.fee_brl && parseFloat(item.fee_brl) > 0 && (
                    <span style={{
                      fontSize: 13, fontWeight: 800, color: '#13DEB9',
                      background: 'rgba(19,222,185,0.08)', borderRadius: 7, padding: '3px 10px',
                    }}>
                      R$ {parseFloat(item.fee_brl).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  )}
                  {item.approved_at && (
                    <span style={{ fontSize: 11, color: 'var(--portal-muted)' }}>
                      Aprovado em {fmtDate(item.approved_at)}
                    </span>
                  )}
                  {item.delivered_link && (
                    <a
                      href={item.delivered_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        marginLeft: 'auto', fontSize: 11, fontWeight: 700,
                        color: '#5D87FF', textDecoration: 'none',
                        background: 'rgba(93,135,255,0.08)', borderRadius: 6,
                        padding: '4px 10px', border: '1px solid rgba(93,135,255,0.2)',
                      }}
                    >
                      Ver entrega →
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {hasItems && (
        <p style={{ fontSize: 11, color: 'var(--portal-muted)', textAlign: 'center' }}>
          Exibindo apenas escopos G e GG aprovados. Seu portfólio de grandes projetos.
        </p>
      )}

      <Link href="/" style={{ fontSize: 12, color: 'var(--portal-accent)', textDecoration: 'none' }}>
        ← Voltar ao Workspace
      </Link>

    </div>
  );
}
