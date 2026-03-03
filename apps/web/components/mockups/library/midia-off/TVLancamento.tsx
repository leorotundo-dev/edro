'use client';

import React from 'react';

interface TVLancamentoProps {
  name?: string;
  username?: string;
  brandName?: string;
  headline?: string;
  title?: string;
  body?: string;
  caption?: string;
  description?: string;
  text?: string;
  image?: string;
  postImage?: string;
  thumbnail?: string;
  profileImage?: string;
  brandColor?: string;
}

export const TVLancamento: React.FC<TVLancamentoProps> = ({
  name,
  brandName,
  headline,
  title,
  body,
  caption,
  description,
  text,
  image,
  postImage,
  thumbnail,
  brandColor = '#DC2626',
}) => {
  const brand = brandName ?? name ?? 'Marca';
  const headlineText = headline ?? title ?? 'O futuro chegou. Apresentamos o novo.';
  const bodyText = body ?? caption ?? description ?? text ?? 'Uma revolução que muda tudo. Prepare-se para o lançamento mais esperado do ano.';
  const img = image ?? postImage ?? thumbnail;
  const accent = brandColor ?? '#DC2626';

  return (
    <div style={{ width: 420, fontFamily: 'system-ui, sans-serif', background: '#0f0f0f', borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
      <style>{`
        @keyframes lanc-reveal { 0%{width:0%} 100%{width:100%} }
        .lanc-reveal { animation: lanc-reveal 2s ease-out infinite alternate; }
        @keyframes lanc-count { 0%{transform:scale(1)} 50%{transform:scale(1.15)} 100%{transform:scale(1)} }
        .lanc-count { animation: lanc-count 1s ease-in-out infinite; }
        @keyframes lanc-glow { 0%,100%{text-shadow:0 0 8px ${accent}80} 50%{text-shadow:0 0 24px ${accent}} }
        .lanc-glow { animation: lanc-glow 2s ease-in-out infinite; }
      `}</style>

      {/* Header */}
      <div style={{ background: '#1a0a0a', borderBottom: `3px solid ${accent}`, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ background: accent, borderRadius: 6, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 12 }}>LANÇAMENTO</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#ccc', fontSize: 12 }}>TV Spot — Lançamento de Produto</div>
          <div style={{ color: '#666', fontSize: 10 }}>Reveal concept • Geração de expectativa</div>
        </div>
        <div style={{ background: '#2a0a0a', border: `1px solid ${accent}`, borderRadius: 20, padding: '3px 10px' }}>
          <span style={{ color: accent, fontWeight: 700, fontSize: 11 }}>30s</span>
        </div>
      </div>

      {/* Countdown / reveal hero */}
      <div style={{ background: '#0a0000', padding: 16, position: 'relative', overflow: 'hidden' }}>
        {/* Background glow */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 200, height: 200, background: `radial-gradient(circle, ${accent}20 0%, transparent 70%)`, pointerEvents: 'none' }} />

        <div style={{ position: 'relative', display: 'flex', gap: 10, alignItems: 'stretch' }}>
          {/* Countdown boxes */}
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            {[
              { val: '03', label: 'dias' },
              { val: '14', label: 'horas' },
              { val: '27', label: 'min' },
            ].map((c, i) => (
              <div key={i} className="lanc-count" style={{ background: '#1a0000', border: `1px solid ${accent}50`, borderRadius: 8, padding: '8px 10px', textAlign: 'center', animationDelay: `${i * 0.2}s` }}>
                <div style={{ color: accent, fontSize: 22, fontWeight: 900, lineHeight: 1 }}>{c.val}</div>
                <div style={{ color: '#666', fontSize: 8 }}>{c.label}</div>
              </div>
            ))}
          </div>

          {/* Product teaser */}
          <div style={{ flex: 1, background: '#150000', border: `1px solid ${accent}30`, borderRadius: 8, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 80 }}>
            {img
              ? <img src={img} alt="produto" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(4px) brightness(0.5)' }} />
              : <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 28, marginBottom: 4 }}>🚀</div>
                  <span style={{ color: `${accent}80`, fontSize: 10, fontWeight: 600 }}>Em breve</span>
                </div>
            }
          </div>
        </div>

        {/* Reveal bar */}
        <div style={{ height: 3, background: '#1a1a1a', borderRadius: 2, marginTop: 12, position: 'relative', overflow: 'hidden' }}>
          <div className="lanc-reveal" style={{ height: '100%', background: `linear-gradient(90deg, ${accent}, #ff8888)`, borderRadius: 2 }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ color: '#555', fontSize: 8 }}>Revelação em andamento...</span>
          <span style={{ color: accent, fontSize: 8, fontWeight: 700 }}>EM BREVE</span>
        </div>
      </div>

      {/* Storyboard */}
      <div style={{ padding: '10px 16px', background: '#141414' }}>
        <div style={{ color: '#666', fontSize: 9, fontWeight: 600, letterSpacing: 1, marginBottom: 6 }}>STORYBOARD</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { n: '01', label: 'Mistério', sub: '0–8s', bg: '#0a0000' },
            { n: '02', label: 'Teaser', sub: '8–18s', bg: '#150000' },
            { n: '03', label: 'Reveal', sub: '18–26s', bg: '#200000' },
            { n: '04', label: 'Chamada', sub: '26–30s', bg: '#1a0808' },
          ].map((f, i) => (
            <div key={i} style={{ flex: 1, background: '#1e1e1e', border: `1px solid ${i === 2 ? accent : '#333'}`, borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ height: 44, background: f.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {i === 2
                  ? <span style={{ fontSize: 18 }}>✨</span>
                  : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                }
              </div>
              <div style={{ padding: '3px 5px', background: '#111' }}>
                <span style={{ color: i === 2 ? accent : '#888', fontSize: 8, fontWeight: 700, display: 'block' }}>#{f.n} {f.label}</span>
                <span style={{ color: '#555', fontSize: 8 }}>{f.sub}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Script */}
      <div style={{ padding: '0 16px 12px', background: '#141414' }}>
        <div style={{ background: '#1e1e1e', border: '1px solid #2a2a2a', borderLeft: `3px solid ${accent}`, borderRadius: 6, padding: '10px 12px' }}>
          <p className="lanc-glow" style={{ color: '#e0e0e0', fontSize: 13, lineHeight: 1.5, margin: 0, fontWeight: 700 }}>"{headlineText}"</p>
          <p style={{ color: '#888', fontSize: 11, lineHeight: 1.5, marginTop: 6, marginBottom: 0 }}>{bodyText}</p>
        </div>
      </div>

      {/* Production details */}
      <div style={{ padding: '0 16px 14px', background: '#141414' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { icon: '👥', label: 'Público-alvo', value: 'Early adopters' },
            { icon: '🎭', label: 'Tom', value: 'Épico / Misterioso' },
            { icon: '📢', label: 'CTA', value: 'Pré-cadastro / Fila' },
            { icon: '🎬', label: 'Formato', value: '30s • Reveal spot' },
          ].map((d, i) => (
            <div key={i} style={{ background: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: 6, padding: '7px 10px' }}>
              <span style={{ fontSize: 13 }}>{d.icon}</span>
              <div style={{ color: '#666', fontSize: 9, marginTop: 2 }}>{d.label}</div>
              <div style={{ color: '#ddd', fontSize: 10, fontWeight: 600 }}>{d.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: '#111', borderTop: '1px solid #222', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#555', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1 }}>Veiculação</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {[{ label: 'globo', color: '#f97316' }, { label: 'SBT', color: '#3b82f6' }, { label: 'REC', color: '#ef4444' }, { label: 'BAND', color: '#a855f7' }].map((ch, i) => (
            <div key={i} style={{ width: 28, height: 28, borderRadius: '50%', background: '#1e1e1e', border: `1.5px solid ${ch.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 6, fontWeight: 800, color: ch.color }}>{ch.label}</span>
            </div>
          ))}
        </div>
        <span style={{ color: '#555', fontSize: 9 }}>{brand}</span>
      </div>
    </div>
  );
};
