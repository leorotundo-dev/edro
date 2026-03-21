'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { swrFetcher } from '@/lib/api';

type Partner = {
  id: string;
  category: string;
  name: string;
  description: string | null;
  logo_emoji: string;
  discount_text: string | null;
  link_url: string | null;
};

const CATEGORY_META: Record<string, { label: string; color: string; emoji: string; legal_note?: string }> = {
  contabilidade: { emoji: '📊', label: 'Contabilidade', color: '#13DEB9',
    legal_note: 'Mantenha seu CNPJ regular e sua empresa saudável.' },
  software:      { emoji: '💻', label: 'Software & Ferramentas', color: '#5D87FF' },
  coworking:     { emoji: '🏢', label: 'Coworking', color: '#A78BFA',
    legal_note: 'Espaços de trabalho profissional com código da agência.' },
  educacao:      { emoji: '🎓', label: 'Educação', color: '#F8A800' },
  banco:         { emoji: '🏦', label: 'Bancos & Fintech', color: '#FA896B' },
  outro:         { emoji: '🤝', label: 'Outros Parceiros', color: '#888' },
};

export default function ParceirosPage() {
  const { data, isLoading } = useSWR<{ partners: Partner[] }>('/freelancers/portal/me/partners', swrFetcher);

  const partners = data?.partners ?? [];
  const grouped = partners.reduce<Record<string, Partner[]>>((acc, p) => {
    const cat = p.category ?? 'outro';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});
  const hasPartners = partners.length > 0;

  return (
    <div className="portal-page">

      {/* Header */}
      <div>
        <span className="portal-kicker">B2B · Benefícios Empresariais</span>
        <h2 className="portal-page-title">🤝 Hub de Parceiros</h2>
        <p className="portal-page-subtitle">
          Benefícios B2B negociados pelo volume da agência. Válidos para
          sua empresa, não para você como pessoa física.
        </p>
      </div>

      {/* Legal banner */}
      <div style={{
        background: 'rgba(19,222,185,0.06)', border: '1px solid rgba(19,222,185,0.2)',
        borderRadius: 12, padding: '12px 15px',
        display: 'flex', gap: 10, alignItems: 'flex-start',
      }}>
        <span style={{ fontSize: 18, flexShrink: 0 }}>⚖️</span>
        <p style={{ margin: 0, fontSize: 12, color: '#13DEB9', lineHeight: 1.5 }}>
          Esses são benefícios <strong>B2B</strong> (empresa para empresa) — não plano de saúde, vale alimentação
          ou benefícios CLT. Reforça que somos parceiros comerciais crescendo juntos.
        </p>
      </div>

      {isLoading ? (
        <div className="portal-empty">
          <div style={{ fontSize: 40, marginBottom: 12 }}>🤝</div>
          <p className="portal-card-subtitle">Carregando parceiros…</p>
        </div>
      ) : !hasPartners ? (
        <section className="portal-card">
          <div className="portal-empty">
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔜</div>
            <p className="portal-card-title">Em breve</p>
            <p className="portal-card-subtitle">
              A agência está negociando parceiros B2B. Quando estiverem disponíveis,
              aparecerão aqui com link e desconto exclusivo.
            </p>
          </div>
        </section>
      ) : (
        Object.entries(grouped).map(([cat, catPartners]) => {
          const meta = CATEGORY_META[cat] ?? CATEGORY_META.outro;
          return (
            <section key={cat} style={{
              background: `${meta.color}06`,
              border: `1.5px solid ${meta.color}22`,
              borderRadius: 14, overflow: 'hidden',
            }}>
              {/* Category header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '13px 16px', borderBottom: `1px solid ${meta.color}18`,
              }}>
                <span style={{ fontSize: 16 }}>{meta.emoji}</span>
                <span style={{ fontWeight: 800, fontSize: 13, color: meta.color }}>{meta.label}</span>
                {meta.legal_note && (
                  <span style={{ fontSize: 10, color: 'var(--portal-muted)', marginLeft: 4 }}>
                    · {meta.legal_note}
                  </span>
                )}
              </div>

              {/* Partner cards */}
              {catPartners.map((p, i) => (
                <div key={p.id} style={{
                  padding: '14px 16px',
                  borderTop: i === 0 ? 'none' : `1px solid ${meta.color}15`,
                  display: 'flex', gap: 12, alignItems: 'flex-start',
                }}>
                  {/* Emoji logo */}
                  <div style={{
                    width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                    background: `${meta.color}15`, border: `1px solid ${meta.color}25`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22,
                  }}>
                    {p.logo_emoji}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: '0 0 3px', fontSize: 14, fontWeight: 800, color: 'var(--portal-text)' }}>
                      {p.name}
                    </p>
                    {p.description && (
                      <p style={{ margin: '0 0 6px', fontSize: 12, color: 'var(--portal-muted)', lineHeight: 1.4 }}>
                        {p.description}
                      </p>
                    )}
                    {p.discount_text && (
                      <span style={{
                        display: 'inline-block', fontSize: 11, fontWeight: 800,
                        background: `${meta.color}18`, color: meta.color,
                        border: `1px solid ${meta.color}30`,
                        borderRadius: 6, padding: '2px 9px',
                      }}>
                        {p.discount_text}
                      </span>
                    )}
                  </div>

                  {/* CTA */}
                  {p.link_url && (
                    <a
                      href={p.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        flexShrink: 0, padding: '8px 14px', borderRadius: 9,
                        background: `${meta.color}12`, border: `1.5px solid ${meta.color}30`,
                        color: meta.color, fontSize: 12, fontWeight: 800,
                        textDecoration: 'none', alignSelf: 'center',
                      }}
                    >
                      Acessar →
                    </a>
                  )}
                </div>
              ))}
            </section>
          );
        })
      )}

      <Link href="/" style={{ fontSize: 12, color: 'var(--portal-accent)', textDecoration: 'none' }}>
        ← Voltar ao Workspace
      </Link>

    </div>
  );
}
