'use client';

import React from 'react';

interface RadioConcursoProps {
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

export const RadioConcurso: React.FC<RadioConcursoProps> = ({
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
  const brand = brandName ?? name ?? 'Rádio Promoções FM';
  const headlineText = headline ?? title ?? 'Concurso Cultural — Ganhe R$ 10.000!';
  const bodyText = body ?? caption ?? description ?? text ?? 'Participe do maior concurso do rádio! Responda à pergunta da semana, compartilhe com a hashtag e concorra ao prêmio máximo de R$ 10.000 em dinheiro!';
  const accent = brandColor ?? '#10B981';

  const waveBars = [5, 7, 4, 9, 6, 11, 8, 5, 10, 7, 9, 6, 12, 8, 5, 9, 7, 5, 8, 6, 4, 7, 9, 5, 6];

  const steps = [
    { num: '01', title: 'Ouça a pergunta', desc: 'Toda semana uma nova pergunta é lançada durante o programa das 10h' },
    { num: '02', title: 'Responda nas redes', desc: 'Publique sua resposta com #ConcursoFM e marque @RadioPromocoesFM' },
    { num: '03', title: 'Aguarde o sorteio', desc: 'O vencedor é anunciado toda sexta-feira às 12h ao vivo' },
  ];

  return (
    <div style={{ width: 440, fontFamily: "'Inter', system-ui, sans-serif", background: '#1a1a2e', borderRadius: 14, overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,0.6)', border: '1px solid #2a2a4a' }}>
      <style>{`
        @keyframes con-wave { 0%,100%{transform:scaleY(0.25)} 50%{transform:scaleY(1)} }
        .con-bar-a { animation: con-wave 0.55s ease-in-out infinite; }
        .con-bar-b { animation: con-wave 0.7s ease-in-out infinite 0.12s; }
        .con-bar-c { animation: con-wave 0.48s ease-in-out infinite 0.24s; }
        .con-bar-d { animation: con-wave 0.8s ease-in-out infinite 0.06s; }
        @keyframes con-prize { 0%,100%{transform:scale(1);text-shadow:0 0 10px rgba(16,185,129,0.4)} 50%{transform:scale(1.05);text-shadow:0 0 24px rgba(16,185,129,0.8)} }
        .con-prize { animation: con-prize 2s ease-in-out infinite; display:inline-block; }
        @keyframes con-badge { 0%,100%{box-shadow:0 0 8px rgba(16,185,129,0.4)} 50%{box-shadow:0 0 22px rgba(16,185,129,0.8)} }
        .con-badge { animation: con-badge 1.5s ease-in-out infinite; }
      `}</style>

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, #0d1f14 0%, #0d0d1f 100%)`, borderBottom: `3px solid ${accent}`, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className="con-badge" style={{ background: accent, borderRadius: 6, padding: '5px 12px' }}>
          <span style={{ color: '#fff', fontWeight: 900, fontSize: 13, letterSpacing: 1 }}>CONCURSO</span>
        </div>
        <div style={{ background: '#0d1f14', border: `1px solid ${accent}40`, borderRadius: 4, padding: '3px 8px' }}>
          <span style={{ color: accent, fontWeight: 700, fontSize: 10 }}>PROMOÇÃO ATIVA</span>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#aaa', fontSize: 10, fontWeight: 600 }}>98.7 FM</div>
        </div>
        <div style={{ background: '#111', border: `2px solid ${accent}`, borderRadius: 20, padding: '4px 12px', marginLeft: 8 }}>
          <span style={{ color: accent, fontWeight: 800, fontSize: 12 }}>60s</span>
        </div>
      </div>

      {/* Prize hero */}
      <div style={{ background: `linear-gradient(180deg, #0d1f14 0%, #0d0d1f 100%)`, padding: '20px 18px 16px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: `radial-gradient(ellipse at 50% 0%, ${accent}18 0%, transparent 70%)` }} />
        <div style={{ position: 'relative' }}>
          <div style={{ color: '#666', fontSize: 9, fontWeight: 700, letterSpacing: 3, marginBottom: 6 }}>PRÊMIO MÁXIMO</div>
          <span className="con-prize" style={{ color: accent, fontSize: 32, fontWeight: 900, letterSpacing: -1 }}>R$ 10.000</span>
          <div style={{ color: '#888', fontSize: 10, marginTop: 4, marginBottom: 12 }}>em dinheiro — entregue ao vivo</div>
          <div style={{ color: '#fff', fontSize: 16, fontWeight: 800, lineHeight: 1.3 }}>{headlineText}</div>
        </div>
      </div>

      {/* Waveform */}
      <div style={{ background: '#0d0d1f', padding: '8px 18px 6px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 30 }}>
          {waveBars.map((h, i) => {
            const clsArr = ['con-bar-a', 'con-bar-b', 'con-bar-c', 'con-bar-d'];
            const cls = clsArr[i % 4];
            const active = i < 17;
            return (
              <div key={i} className={active ? cls : ''}
                style={{ flex: 1, height: h * 2.2, background: active ? accent : '#1e1e3a', borderRadius: 2, transformOrigin: 'bottom', opacity: active ? 1 : 0.3 }} />
            );
          })}
        </div>
      </div>

      {/* How to participate */}
      <div style={{ padding: '12px 18px 10px', background: '#1a1a2e' }}>
        <div style={{ color: '#555', fontSize: 9, fontWeight: 700, letterSpacing: 2, marginBottom: 10 }}>COMO PARTICIPAR</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {steps.map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ background: accent, borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color: '#fff', fontWeight: 900, fontSize: 12 }}>{s.num}</span>
              </div>
              <div>
                <div style={{ color: '#fff', fontSize: 11, fontWeight: 700, marginBottom: 2 }}>{s.title}</div>
                <div style={{ color: '#777', fontSize: 10, lineHeight: 1.4 }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Script */}
      <div style={{ padding: '0 18px 10px', background: '#1a1a2e' }}>
        <div style={{ background: '#0d0d1f', borderLeft: `3px solid ${accent}`, borderRadius: 6, padding: '12px 14px' }}>
          <div style={{ color: accent, fontSize: 9, fontWeight: 700, marginBottom: 6 }}>LOCUTOR:</div>
          <p style={{ color: '#ccc', fontSize: 10, lineHeight: 1.7, margin: '0 0 8px 0', fontStyle: 'italic' }}>"{bodyText}"</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <div style={{ background: `${accent}20`, border: `1px solid ${accent}40`, borderRadius: 4, padding: '3px 8px' }}>
              <span style={{ color: accent, fontSize: 9, fontWeight: 700 }}>#ConcursoFM</span>
            </div>
            <div style={{ background: `${accent}20`, border: `1px solid ${accent}40`, borderRadius: 4, padding: '3px 8px' }}>
              <span style={{ color: accent, fontSize: 9, fontWeight: 700 }}>@{brand.replace(/\s/g, '')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Countdown decoration */}
      <div style={{ padding: '0 18px 10px', background: '#1a1a2e' }}>
        <div style={{ background: '#0d0d1f', border: `1px solid ${accent}25`, borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ color: '#555', fontSize: 9, fontWeight: 700 }}>ENCERRA EM</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[{ v: '03', l: 'DIAS' }, { v: '14', l: 'HORAS' }, { v: '22', l: 'MIN' }].map((t, i) => (
              <div key={i} style={{ background: `${accent}15`, border: `1px solid ${accent}30`, borderRadius: 6, padding: '5px 8px', textAlign: 'center' }}>
                <div style={{ color: accent, fontSize: 14, fontWeight: 900 }}>{t.v}</div>
                <div style={{ color: '#555', fontSize: 7, fontWeight: 700 }}>{t.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Specs */}
      <div style={{ padding: '0 18px 12px', background: '#1a1a2e' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
          {[
            { label: 'Formato', value: 'Concurso Cultural' },
            { label: 'Duração', value: '60 segundos' },
            { label: 'Prêmio', value: 'R$ 10.000' },
          ].map((d, i) => (
            <div key={i} style={{ background: '#0d0d1f', border: '1px solid #2a2a4a', borderRadius: 6, padding: '7px 10px', textAlign: 'center' }}>
              <div style={{ color: '#555', fontSize: 8, marginBottom: 2 }}>{d.label}</div>
              <div style={{ color: '#ddd', fontSize: 9, fontWeight: 700 }}>{d.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: '#0d0d1f', borderTop: '1px solid #2a2a4a', padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2">
          <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/>
          <circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1"/>
        </svg>
        <span style={{ color: '#555', fontSize: 9 }}>{brand} — Regulamento disponível no site</span>
        <div style={{ flex: 1 }} />
        <span style={{ color: accent, fontSize: 9, fontWeight: 700 }}>98.7 FM</span>
      </div>
    </div>
  );
};
