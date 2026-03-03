'use client';

import React from 'react';

interface RadioPodcastProps {
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

export const RadioPodcast: React.FC<RadioPodcastProps> = ({
  name,
  brandName,
  headline,
  title,
  body,
  caption,
  description,
  text,
  brandColor = '#10B981',
}) => {
  const brand = brandName ?? name ?? 'NordVPN';
  const podcastName = headline ?? title ?? 'Café com Tecnologia';
  const bodyText = body ?? caption ?? description ?? text ?? 'Esta semana no Café com Tecnologia, discutimos como proteger sua privacidade online em 2026. E por falar em privacidade — vou te contar sobre um produto que uso todo dia.';
  const accent = brandColor ?? '#10B981';

  const waveBars = [3, 5, 8, 6, 10, 7, 5, 9, 11, 8, 6, 10, 7, 9, 6, 8, 5, 9, 7, 4, 6, 8, 5, 7, 4];

  const paragraphs = [
    { label: 'CONTEXTO', text: bodyText },
    { label: 'TRANSIÇÃO', text: `Falando em segurança digital, hoje o episódio é patrocinado por ${brand}. Eu uso pessoalmente e recomendo sem hesitar.` },
    { label: 'OFERTA', text: `Acesse ${brand.toLowerCase().replace(/\s/g, '')}.com e use o código CAFE para ganhar 20% de desconto no plano anual. Oferta exclusiva para ouvintes do podcast.` },
  ];

  return (
    <div style={{ width: 440, fontFamily: "'Inter', system-ui, sans-serif", background: '#111827', borderRadius: 14, overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,0.7)', border: '1px solid #1f2937' }}>
      <style>{`
        @keyframes pod-wave { 0%,100%{transform:scaleY(0.25)} 50%{transform:scaleY(1)} }
        .pod-bar-a { animation: pod-wave 0.6s ease-in-out infinite; }
        .pod-bar-b { animation: pod-wave 0.75s ease-in-out infinite 0.12s; }
        .pod-bar-c { animation: pod-wave 0.5s ease-in-out infinite 0.22s; }
        .pod-bar-d { animation: pod-wave 0.88s ease-in-out infinite 0.07s; }
        @keyframes pod-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.7;transform:scale(0.97)} }
        .pod-pulse { animation: pod-pulse 2s ease-in-out infinite; }
      `}</style>

      {/* Header */}
      <div style={{ background: '#0d1117', borderBottom: `3px solid ${accent}`, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ background: accent, borderRadius: 6, padding: '5px 12px' }}>
          <span style={{ color: '#fff', fontWeight: 900, fontSize: 12, letterSpacing: 1 }}>PODCAST AD</span>
        </div>
        <div style={{ background: '#1f2937', border: `1px solid ${accent}40`, borderRadius: 4, padding: '3px 8px' }}>
          <span style={{ color: accent, fontWeight: 700, fontSize: 10 }}>HOST READ</span>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ color: '#6b7280', fontSize: 10, fontWeight: 600 }}>Mid-Roll</div>
        <div style={{ background: '#0d1117', border: `2px solid ${accent}`, borderRadius: 20, padding: '4px 12px', marginLeft: 8 }}>
          <span style={{ color: accent, fontWeight: 800, fontSize: 12 }}>60s</span>
        </div>
      </div>

      {/* Podcast identity */}
      <div style={{ background: '#0d1117', padding: '16px 18px', borderBottom: '1px solid #1f2937', display: 'flex', gap: 14, alignItems: 'center' }}>
        <div className="pod-pulse" style={{ width: 64, height: 64, borderRadius: 10, background: `linear-gradient(135deg, ${accent}40 0%, #1f2937 100%)`, border: `2px solid ${accent}50`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="1.5">
            <circle cx="12" cy="11" r="3"/><path d="M6.343 17.657A8 8 0 1 1 17.657 6.343 8 8 0 0 1 6.343 17.657z"/><path d="M12 14v7"/><path d="M9 18h6"/>
          </svg>
        </div>
        <div>
          <div style={{ color: '#6b7280', fontSize: 9, fontWeight: 600, letterSpacing: 2, marginBottom: 3 }}>INSERÇÃO PUBLICITÁRIA</div>
          <div style={{ color: '#f9fafb', fontSize: 15, fontWeight: 800 }}>{podcastName}</div>
          <div style={{ color: accent, fontSize: 10, fontWeight: 600, marginTop: 2 }}>Ep. 42 · 54 minutos</div>
          <div style={{ color: '#4b5563', fontSize: 9, marginTop: 1 }}>Patrocinado por {brand}</div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ background: `${accent}15`, border: `1px solid ${accent}30`, borderRadius: 6, padding: '6px 10px', textAlign: 'center' }}>
          <div style={{ color: '#6b7280', fontSize: 8 }}>Posição</div>
          <div style={{ color: accent, fontSize: 11, fontWeight: 800 }}>~28min</div>
        </div>
      </div>

      {/* Waveform */}
      <div style={{ background: '#0d1117', padding: '8px 18px 6px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 28 }}>
          {waveBars.map((h, i) => {
            const clsArr = ['pod-bar-a', 'pod-bar-b', 'pod-bar-c', 'pod-bar-d'];
            const cls = clsArr[i % 4];
            const active = i < 18;
            return (
              <div key={i} className={active ? cls : ''}
                style={{ flex: 1, height: h * 2, background: active ? accent : '#1f2937', borderRadius: 2, transformOrigin: 'bottom', opacity: active ? 1 : 0.3 }} />
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ color: '#4b5563', fontSize: 9 }}>28:00</span>
          <span style={{ color: accent, fontSize: 9, fontWeight: 700 }}>● HOST READ — 60s</span>
          <span style={{ color: '#4b5563', fontSize: 9 }}>29:00</span>
        </div>
      </div>

      {/* Natural language script paragraphs */}
      <div style={{ padding: '10px 18px 8px', background: '#111827' }}>
        <div style={{ color: '#4b5563', fontSize: 9, fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>SCRIPT — HOST READ NATURAL</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {paragraphs.map((p, i) => (
            <div key={i} style={{ background: '#0d1117', border: `1px solid ${i === 2 ? accent + '40' : '#1f2937'}`, borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <div style={{ width: 3, height: 14, background: i === 2 ? accent : '#374151', borderRadius: 2 }} />
                <span style={{ color: i === 2 ? accent : '#6b7280', fontSize: 8, fontWeight: 700, letterSpacing: 1 }}>{p.label}</span>
              </div>
              <p style={{ color: '#d1d5db', fontSize: 10, lineHeight: 1.7, margin: 0, fontStyle: 'italic' }}>"{p.text}"</p>
            </div>
          ))}
        </div>
      </div>

      {/* Promo code */}
      <div style={{ padding: '0 18px 10px', background: '#111827' }}>
        <div style={{ background: `${accent}10`, border: `2px solid ${accent}50`, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ color: '#6b7280', fontSize: 8, marginBottom: 3 }}>CÓDIGO EXCLUSIVO</div>
            <div style={{ color: accent, fontSize: 20, fontWeight: 900, letterSpacing: 3 }}>{brand.toUpperCase().split(' ')[0]}</div>
            <div style={{ color: '#6b7280', fontSize: 9, marginTop: 2 }}>20% off no plano anual</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#6b7280', fontSize: 8, marginBottom: 3 }}>ACESSE</div>
            <div style={{ color: '#d1d5db', fontSize: 10, fontWeight: 700 }}>{brand.toLowerCase().replace(/\s/g, '')}.com</div>
            <div style={{ color: '#4b5563', fontSize: 8, marginTop: 2 }}>Oferta por tempo limitado</div>
          </div>
        </div>
      </div>

      {/* Specs */}
      <div style={{ padding: '0 18px 12px', background: '#111827' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
          {[
            { label: 'Formato', value: 'Host Read' },
            { label: 'Duração', value: '60 segundos' },
            { label: 'Posição', value: 'Mid-Roll' },
          ].map((d, i) => (
            <div key={i} style={{ background: '#0d1117', border: '1px solid #1f2937', borderRadius: 6, padding: '7px 10px', textAlign: 'center' }}>
              <div style={{ color: '#4b5563', fontSize: 8, marginBottom: 2 }}>{d.label}</div>
              <div style={{ color: '#d1d5db', fontSize: 9, fontWeight: 700 }}>{d.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: '#0d1117', borderTop: '1px solid #1f2937', padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2">
          <circle cx="12" cy="11" r="3"/><path d="M6.343 17.657A8 8 0 1 1 17.657 6.343 8 8 0 0 1 6.343 17.657z"/>
        </svg>
        <span style={{ color: '#4b5563', fontSize: 9 }}>{podcastName} · Patrocínio de {brand}</span>
        <div style={{ flex: 1 }} />
        <span style={{ color: accent, fontSize: 9, fontWeight: 700 }}>Ep. 42</span>
      </div>
    </div>
  );
};
