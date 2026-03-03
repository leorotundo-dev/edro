'use client';

import React from 'react';

interface TVTestemunhalProps {
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

export const TVTestemunhal: React.FC<TVTestemunhalProps> = ({
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
  profileImage,
  brandColor = '#8B5CF6',
}) => {
  const brand = brandName ?? name ?? 'Marca';
  const headlineText = headline ?? title ?? 'Mudou minha vida. Não imagino sem.';
  const bodyText = body ?? caption ?? description ?? text ?? 'Depoimento real de cliente satisfeito, falando diretamente para a câmera sobre a experiência com o produto.';
  const img = image ?? postImage ?? thumbnail;
  const personImg = profileImage;
  const accent = brandColor ?? '#8B5CF6';

  const stats = [
    { before: '60 dias', label: 'para ver resultado', after: '7 dias', highlight: true },
    { before: 'R$ 800', label: 'gastava antes', after: 'R$ 149', highlight: false },
    { before: '3 estrelas', label: 'satisfação média', after: '5 estrelas', highlight: true },
  ];

  return (
    <div style={{ width: 420, fontFamily: 'system-ui, sans-serif', background: '#0d0a14', borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
      <style>{`
        @keyframes test-quote { 0%,100%{transform:scale(1);opacity:0.6} 50%{transform:scale(1.1);opacity:1} }
        .test-quote { animation: test-quote 3s ease-in-out infinite; }
        @keyframes test-star { 0%,100%{opacity:0.4} 50%{opacity:1} }
        .test-star { animation: test-star 1s ease-in-out infinite; }
        .test-star2 { animation: test-star 1s ease-in-out infinite 0.2s; }
        .test-star3 { animation: test-star 1s ease-in-out infinite 0.4s; }
        .test-star4 { animation: test-star 1s ease-in-out infinite 0.6s; }
        .test-star5 { animation: test-star 1s ease-in-out infinite 0.8s; }
        @keyframes test-badge { 0%,100%{box-shadow:0 0 0 2px ${accent}40} 50%{box-shadow:0 0 0 6px ${accent}20} }
        .test-badge { animation: test-badge 2s ease-in-out infinite; }
      `}</style>

      {/* Header */}
      <div style={{ background: '#140e24', borderBottom: `3px solid ${accent}`, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ background: accent, borderRadius: 6, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 12 }}>TESTEMUNHAL</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#ccc', fontSize: 12 }}>Comercial Testemunhal</div>
          <div style={{ color: '#888', fontSize: 10 }}>Pessoa à câmera • Depoimento real</div>
        </div>
        <div style={{ background: '#1e1230', border: `1px solid ${accent}`, borderRadius: 20, padding: '3px 10px' }}>
          <span style={{ color: accent, fontWeight: 700, fontSize: 11 }}>30s</span>
        </div>
      </div>

      {/* Person-to-camera visual */}
      <div style={{ background: '#0a0814', padding: '14px 16px 10px' }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          {/* Person visual */}
          <div style={{ flexShrink: 0, position: 'relative' }}>
            {personImg
              ? <img src={personImg} alt="depoimento" style={{ width: 80, height: 90, objectFit: 'cover', borderRadius: 10, border: `2px solid ${accent}60` }} />
              : <div style={{ width: 80, height: 90, background: `${accent}15`, borderRadius: 10, border: `2px solid ${accent}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${accent}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill={accent}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  </div>
                  <span style={{ color: `${accent}80`, fontSize: 8 }}>Cliente</span>
                </div>
            }
            {/* "Cliente Real" badge */}
            <div className="test-badge" style={{ position: 'absolute', bottom: -8, left: '50%', transform: 'translateX(-50%)', background: '#10B981', borderRadius: 4, padding: '2px 6px', whiteSpace: 'nowrap' }}>
              <span style={{ color: '#fff', fontSize: 7, fontWeight: 700 }}>CLIENTE REAL</span>
            </div>
          </div>

          {/* Person info + speech bubble */}
          <div style={{ flex: 1 }}>
            <div style={{ background: '#1e1830', border: `1px solid ${accent}40`, borderRadius: 10, borderBottomLeftRadius: 2, padding: '10px 12px', position: 'relative', marginBottom: 8 }}>
              {/* Quote marks */}
              <div className="test-quote" style={{ position: 'absolute', top: -10, left: 12, color: accent, fontSize: 28, lineHeight: 1, fontFamily: 'Georgia, serif' }}>"</div>
              <p style={{ color: '#e0e0e0', fontSize: 12, lineHeight: 1.6, margin: '8px 0 0', fontStyle: 'italic' }}>{headlineText}</p>
              <div style={{ color: accent, fontSize: 28, lineHeight: 0.5, textAlign: 'right', fontFamily: 'Georgia, serif', marginTop: 4 }}>"</div>
            </div>
            {/* Stars */}
            <div style={{ display: 'flex', gap: 3, marginBottom: 4 }}>
              {['test-star', 'test-star2', 'test-star3', 'test-star4', 'test-star5'].map((cls, i) => (
                <svg key={i} className={cls} width="14" height="14" viewBox="0 0 24 24" fill={accent}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              ))}
              <span style={{ color: '#888', fontSize: 9, marginLeft: 4, lineHeight: '14px' }}>5/5 — Usuário verificado</span>
            </div>
            <div style={{ color: '#666', fontSize: 10 }}>Maria S., 34 anos • São Paulo, SP</div>
          </div>
        </div>
      </div>

      {/* Storyboard */}
      <div style={{ padding: '0 16px 10px', background: '#0a0814' }}>
        <div style={{ color: '#666', fontSize: 9, fontWeight: 600, letterSpacing: 1, marginBottom: 6 }}>STORYBOARD</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { n: '01', label: 'Problema', sub: '0–8s', bg: '#160820' },
            { n: '02', label: 'Depoimento', sub: '8–24s', bg: '#140e24', active: true },
            { n: '03', label: 'CTA Marca', sub: '24–30s', bg: '#101820' },
          ].map((f, i) => (
            <div key={i} style={{ flex: 1, background: '#111', border: `1px solid ${f.active ? accent + '60' : '#1e1e1e'}`, borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ height: 50, background: f.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {f.active
                  ? <svg width="18" height="18" viewBox="0 0 24 24" fill={accent}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                }
              </div>
              <div style={{ padding: '3px 5px', background: '#090810' }}>
                <span style={{ color: f.active ? accent : '#777', fontSize: 8, fontWeight: 700, display: 'block' }}>#{f.n}</span>
                <span style={{ color: '#aaa', fontSize: 8, display: 'block' }}>{f.label}</span>
                <span style={{ color: '#444', fontSize: 8 }}>{f.sub}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Before/after stats */}
      <div style={{ padding: '0 16px 10px', background: '#0a0814' }}>
        <div style={{ color: '#666', fontSize: 9, fontWeight: 600, letterSpacing: 1, marginBottom: 6 }}>DADOS DO RESULTADO</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {stats.map((s, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 1fr', gap: 4, alignItems: 'center' }}>
              <div style={{ background: '#1e1830', borderRadius: 5, padding: '4px 8px', textAlign: 'center' }}>
                <span style={{ color: '#888', fontSize: 10, textDecoration: 'line-through' }}>{s.before}</span>
              </div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ color: '#555', fontSize: 8 }}>{s.label}</span>
              </div>
              <div style={{ background: s.highlight ? `${accent}20` : '#111', border: `1px solid ${s.highlight ? accent + '50' : '#222'}`, borderRadius: 5, padding: '4px 8px', textAlign: 'center' }}>
                <span style={{ color: s.highlight ? accent : '#ccc', fontSize: 11, fontWeight: 700 }}>{s.after}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Script */}
      <div style={{ padding: '0 16px 12px', background: '#0a0814' }}>
        <div style={{ background: '#111', border: `1px solid ${accent}20`, borderLeft: `3px solid ${accent}`, borderRadius: 6, padding: '10px 12px' }}>
          {img && <img src={img} alt="produto" style={{ width: '100%', height: 60, objectFit: 'cover', borderRadius: 4, marginBottom: 8, opacity: 0.8 }} />}
          <p style={{ color: '#888', fontSize: 11, lineHeight: 1.5, margin: 0 }}>{bodyText}</p>
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: '#080610', borderTop: `1px solid ${accent}20`, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#555', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1 }}>Veiculação</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {[{ label: 'globo', color: '#f97316' }, { label: 'SBT', color: '#3b82f6' }, { label: 'REC', color: '#ef4444' }, { label: 'BAND', color: '#a855f7' }].map((ch, i) => (
            <div key={i} style={{ width: 28, height: 28, borderRadius: '50%', background: '#111', border: `1.5px solid ${ch.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 6, fontWeight: 800, color: ch.color }}>{ch.label}</span>
            </div>
          ))}
        </div>
        <span style={{ color: '#555', fontSize: 9 }}>{brand}</span>
      </div>
    </div>
  );
};
