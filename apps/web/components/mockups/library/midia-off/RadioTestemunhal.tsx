'use client';

import React, { useState } from 'react';

interface RadioTestemunhalProps {
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

export const RadioTestemunhal: React.FC<RadioTestemunhalProps> = ({
  name,
  username,
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
  const [playing, setPlaying] = useState(false);
  const accent = brandColor ?? '#8B5CF6';
  const brand = brandName ?? name ?? username ?? 'NutriMax';
  const titleText = headline ?? title ?? 'Testemunhal — Spot 30s';
  const testimonialText =
    body ?? caption ?? description ?? text ??
    'Eu nunca acreditei que mudaria minha vida assim tão rápido. Depois de três meses usando o produto da NutriMax, perdi 8kg e me sinto com muito mais energia para cuidar dos meus filhos. Recomendo de coração para todo mundo!';
  const avatarSrc = profileImage ?? image ?? postImage ?? thumbnail ?? '';
  const guestName = name ?? 'Maria Aparecida Santos';
  const guestTitle = 'Consumidora há 3 meses';

  const bars = [4, 7, 5, 9, 6, 8, 3, 10, 7, 5, 8, 4, 9, 6, 7, 5, 8, 3, 6, 9];

  const scriptLines = [
    { time: '0:00', label: 'TRILHA', text: 'Música emocional suave — fundo instrumental delicado' },
    { time: '0:02', label: 'DEPOENTE', text: `"${testimonialText.slice(0, 80)}..."` },
    { time: '0:18', label: 'LOCUTOR', text: `"Resultados reais de quem experimentou. ${brand} — faz a diferença na sua vida."` },
    { time: '0:26', label: 'LOCUTOR', text: `"Acesse ${brand.toLowerCase().replace(/\s/g, '')}.com.br e conheça. ${brand}."` },
    { time: '0:30', label: 'TRILHA', text: 'Encerramento suave — fade out com assinatura sonora' },
  ];

  return (
    <div
      style={{
        width: 400,
        background: '#0F172A',
        borderRadius: 16,
        overflow: 'hidden',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        userSelect: 'none',
      }}
    >
      <style>{`
        @keyframes rtestem-eq { 0%,100%{transform:scaleY(1)} 50%{transform:scaleY(0.25)} }
        .rtestem-bar { transform-origin: bottom; }
        .rtestem-bar:nth-child(odd) { animation: rtestem-eq 0.7s ease infinite; }
        .rtestem-bar:nth-child(even) { animation: rtestem-eq 0.95s ease 0.15s infinite; }
        @keyframes rtestem-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .rtestem-mic { animation: rtestem-pulse 1.8s ease infinite; }
        @keyframes rtestem-stars { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.75;transform:scale(0.95)} }
        .rtestem-stars { animation: rtestem-stars 2.5s ease-in-out infinite; }
      `}</style>

      {/* Header bar */}
      <div style={{ background: `linear-gradient(135deg, ${accent}33 0%, #1E293B 100%)`, padding: '14px 18px', borderBottom: `1px solid ${accent}33` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ background: accent, borderRadius: 4, padding: '2px 10px', fontSize: 9, fontWeight: 800, color: '#fff', letterSpacing: 1 }}>
            DEPOIMENTO
          </div>
          <div style={{ background: '#1E293B', borderRadius: 4, padding: '2px 8px', fontSize: 9, fontWeight: 600, color: '#94A3B8' }}>
            TESTEMUNHAL · 30s
          </div>
          <div style={{ background: '#1E293B', border: `1px solid ${accent}30`, borderRadius: 4, padding: '2px 8px', fontSize: 9, fontWeight: 600, color: accent }}>
            DEPOIMENTO ESPONTÂNEO
          </div>
          <div className="rtestem-mic" style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: '#EF4444' }} />
          <span style={{ color: '#EF4444', fontSize: 9, fontWeight: 700 }}>REC</span>
        </div>
        <div style={{ color: '#64748B', fontSize: 10, marginTop: 4 }}>{brand} · {titleText}</div>
      </div>

      {/* Deponent card */}
      <div style={{ padding: '16px 18px', display: 'flex', gap: 14, alignItems: 'center' }}>
        {avatarSrc ? (
          <img
            src={avatarSrc}
            alt={guestName}
            style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${accent}`, flexShrink: 0 }}
          />
        ) : (
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: `linear-gradient(135deg, ${accent} 0%, #4C1D95 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18, fontWeight: 800, color: '#fff', border: `2px solid ${accent}44` }}>
            {guestName.split(' ').slice(0, 2).map(w => w[0]).join('')}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#F1F5F9', fontSize: 14, fontWeight: 700 }}>{guestName}</div>
          <div style={{ color: accent, fontSize: 11, marginTop: 2 }}>{guestTitle}</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            <span style={{ background: '#1E293B', border: `1px solid ${accent}33`, borderRadius: 4, padding: '2px 8px', fontSize: 9, color: '#94A3B8' }}>Voz Feminina</span>
            <span style={{ background: `${accent}22`, border: `1px solid ${accent}44`, borderRadius: 4, padding: '2px 8px', fontSize: 9, color: accent, fontWeight: 700 }}>Verificado</span>
            <span style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 4, padding: '2px 8px', fontSize: 9, color: '#64748B' }}>Consumidor real</span>
          </div>
        </div>
      </div>

      {/* Quote block */}
      <div style={{ margin: '0 18px 14px', background: `${accent}10`, border: `1px solid ${accent}30`, borderRadius: 10, padding: '14px 16px', position: 'relative' }}>
        <div style={{ position: 'absolute', top: -8, left: 16, width: 20, height: 14, background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="18" height="14" viewBox="0 0 18 14" fill={accent} aria-hidden="true">
            <path d="M0 14V9.333C0 6.111 1.444 3.556 4.333 1.667L6 3.333C4.556 4.222 3.722 5.5 3.5 7.167H6V14H0zm10 0V9.333c0-3.222 1.444-5.777 4.333-7.666L16 3.333C14.556 4.222 13.722 5.5 13.5 7.167H16V14H10z" />
          </svg>
        </div>
        <p style={{ color: '#CBD5E1', fontSize: 12, lineHeight: 1.7, margin: 0, fontStyle: 'italic' }}>
          {testimonialText}
        </p>
        <div className="rtestem-stars" style={{ marginTop: 10, display: 'flex', gap: 1, alignItems: 'center' }}>
          {[1, 2, 3, 4, 5].map(i => (
            <svg key={i} width="12" height="12" viewBox="0 0 24 24" fill="#F59E0B" aria-hidden="true">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          ))}
          <span style={{ color: '#F59E0B', fontSize: 9, marginLeft: 4, fontWeight: 700 }}>5.0 · Avaliação verificada</span>
        </div>
      </div>

      {/* Antes / Depois */}
      <div style={{ margin: '0 18px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div style={{ background: '#1E293B', borderRadius: 8, padding: '10px 12px', border: '1px solid #334155' }}>
          <div style={{ color: '#64748B', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Antes</div>
          <div style={{ color: '#94A3B8', fontSize: 11, lineHeight: 1.4 }}>Cansaço constante, sem energia para o dia a dia</div>
        </div>
        <div style={{ background: `${accent}10`, borderRadius: 8, padding: '10px 12px', border: `1px solid ${accent}30` }}>
          <div style={{ color: accent, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Depois</div>
          <div style={{ color: '#CBD5E1', fontSize: 11, lineHeight: 1.4 }}>Energia, disposição e bem-estar todos os dias</div>
        </div>
      </div>

      {/* Waveform player */}
      <div style={{ padding: '0 18px 14px' }}>
        <div style={{ background: '#1E293B', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <button
              type="button"
              aria-label={playing ? 'Pausar testemunhal' : 'Reproduzir testemunhal'}
              onClick={() => setPlaying(v => !v)}
              style={{ width: 32, height: 32, borderRadius: '50%', background: accent, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
                {playing
                  ? <><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></>
                  : <polygon points="5 3 19 12 5 21 5 3" />}
              </svg>
            </button>
            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 2, height: 24 }}>
              {bars.map((h, i) => (
                <div
                  key={i}
                  className={playing ? 'rtestem-bar' : ''}
                  style={{ flex: 1, height: `${h * 2.2}px`, borderRadius: 2, background: i < 7 ? accent : '#334155', animationDelay: `${i * 0.035}s` }}
                />
              ))}
            </div>
            <span style={{ color: '#64748B', fontSize: 9, flexShrink: 0 }}>0:30</span>
          </div>
          <div style={{ height: 2, background: '#334155', borderRadius: 4 }}>
            <div style={{ width: '45%', height: '100%', background: accent, borderRadius: 4 }} />
          </div>
        </div>
      </div>

      {/* Script */}
      <div style={{ padding: '0 18px 10px', background: '#0F172A' }}>
        <div style={{ color: '#475569', fontSize: 9, fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>ROTEIRO — 30 SEGUNDOS</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {scriptLines.map((line, i) => {
            const labelColor = line.label === 'DEPOENTE' ? accent : line.label === 'LOCUTOR' ? '#38BDF8' : '#6366F1';
            return (
              <div key={i} style={{ display: 'flex', gap: 8, background: '#1E293B', borderRadius: 6, padding: '6px 10px', border: '1px solid #334155' }}>
                <span style={{ color: '#475569', fontSize: 8, fontWeight: 700, minWidth: 28, flexShrink: 0, paddingTop: 1 }}>{line.time}</span>
                <span style={{ color: labelColor, fontSize: 8, fontWeight: 800, minWidth: 56, flexShrink: 0, paddingTop: 1 }}>{line.label}:</span>
                <span style={{ color: '#94A3B8', fontSize: 9, lineHeight: 1.5 }}>{line.text}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Production notes */}
      <div style={{ margin: '0 18px', background: '#1E293B', borderRadius: 8, padding: '10px 14px', marginBottom: 14, border: '1px solid #334155' }}>
        <div style={{ color: '#475569', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Notas de Produção</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[['Tom', 'Emocional'], ['Ritmo', 'Moderado'], ['Trilha', 'Suave'], ['BG', 'Instrumental'], ['Voz', 'Natural'], ['Edição', 'Leve']].map(([k, v]) => (
            <div key={k}>
              <div style={{ color: '#475569', fontSize: 9 }}>{k}</div>
              <div style={{ color: '#94A3B8', fontSize: 10, fontWeight: 600 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '10px 18px 14px', borderTop: '1px solid #1E293B', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#475569', fontSize: 9 }}>{brand} · Campanha Testemunhal</span>
        <div style={{ background: accent, borderRadius: 4, padding: '3px 10px', fontSize: 9, fontWeight: 700, color: '#fff' }}>Aprovado</div>
      </div>
    </div>
  );
};
