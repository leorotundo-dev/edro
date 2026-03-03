'use client';

import React from 'react';

interface RadioSpot60sProps {
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

export const RadioSpot60s: React.FC<RadioSpot60sProps> = ({
  name,
  brandName,
  headline,
  title,
  body,
  caption,
  description,
  text,
  brandColor = '#0EA5E9',
}) => {
  const brand = brandName ?? name ?? 'Construtora Horizonte';
  const headlineText = headline ?? title ?? 'Seu apartamento dos sonhos está esperando por você.';
  const bodyText = body ?? caption ?? description ?? text ?? 'Na Construtora Horizonte, cada detalhe é pensado para a sua família. Plantas modernas, áreas de lazer completas e localização privilegiada. Agende sua visita hoje mesmo e garanta as condições especiais de lançamento.';
  const accent = brandColor ?? '#0EA5E9';

  const waveBars = [3, 6, 4, 9, 7, 11, 8, 5, 10, 8, 13, 7, 9, 6, 11, 8, 5, 10, 7, 4, 9, 6, 11, 7, 5, 8, 10, 6, 9, 7];

  const script = [
    { time: '0:00', label: 'SFX', text: 'Ambiente urbano suave — sons da cidade ao amanhecer' },
    { time: '0:03', label: 'TRILHA', text: 'Melodia ascendente, inspiradora, tom emocional e acolhedor' },
    { time: '0:07', label: 'LOCUTOR', text: `"Você já imaginou acordar todo dia sabendo que chegou onde queria? ${headlineText}"` },
    { time: '0:15', label: 'LOCUTOR', text: `"${brand} apresenta uma nova forma de viver. Apartamentos de 2 e 3 dormitórios com suíte, varanda gourmet e home office."` },
    { time: '0:28', label: 'TRILHA', text: 'Sobe levemente a melodia — reforça sensação de conquista' },
    { time: '0:30', label: 'LOCUTOR', text: `"${bodyText}"` },
    { time: '0:48', label: 'LOCUTOR', text: `"Ligue agora: 0800 123 4567 ou acesse ${brand.toLowerCase().replace(/\s/g, '')}.com.br. ${brand} — construindo o seu futuro."` },
    { time: '0:58', label: 'JINGLE', text: `Assinatura sonora — logomarca de ${brand}` },
    { time: '1:00', label: 'TRILHA', text: 'Encerramento suave — fade out' },
  ];

  const specs = [
    { label: 'Formato', value: 'Spot 60s' },
    { label: 'Locução', value: 'Voz Masculina' },
    { label: 'Tom', value: 'Emocional' },
    { label: 'Trilha', value: 'Orquestral Leve' },
    { label: 'SFX', value: '1 abertura' },
    { label: 'Jingle', value: 'Assinatura final' },
  ];

  return (
    <div style={{ width: 440, fontFamily: "'Inter', system-ui, sans-serif", background: '#0f1923', borderRadius: 14, overflow: 'hidden', boxShadow: '0 16px 48px rgba(0,0,0,0.7)', border: `1px solid ${accent}22` }}>
      <style>{`
        @keyframes s60-wave { 0%,100%{transform:scaleY(0.2)} 50%{transform:scaleY(1)} }
        .s60-bar-a { animation: s60-wave 0.52s ease-in-out infinite; }
        .s60-bar-b { animation: s60-wave 0.68s ease-in-out infinite 0.11s; }
        .s60-bar-c { animation: s60-wave 0.44s ease-in-out infinite 0.22s; }
        .s60-bar-d { animation: s60-wave 0.76s ease-in-out infinite 0.06s; }
        @keyframes s60-onair { 0%,100%{opacity:1} 50%{opacity:0.2} }
        .s60-onair { animation: s60-onair 1s ease-in-out infinite; }
        @keyframes s60-glow { 0%,100%{box-shadow:0 0 6px rgba(14,165,233,0.4)} 50%{box-shadow:0 0 18px rgba(14,165,233,0.8)} }
        .s60-badge { animation: s60-glow 2.4s ease-in-out infinite; }
        @keyframes s60-progress { 0%{width:0%} 100%{width:78%} }
        .s60-prog { animation: s60-progress 8s linear infinite; }
      `}</style>

      {/* Header */}
      <div style={{ background: '#060e16', borderBottom: `3px solid ${accent}`, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className="s60-badge" style={{ background: accent, borderRadius: 6, padding: '5px 14px' }}>
          <span style={{ color: '#fff', fontWeight: 900, fontSize: 12, letterSpacing: 1 }}>SPOT 60s</span>
        </div>
        <div style={{ background: '#0f1923', border: `1px solid ${accent}40`, borderRadius: 4, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
          <div className="s60-onair" style={{ width: 7, height: 7, borderRadius: '50%', background: '#EF4444' }} />
          <span style={{ color: '#EF4444', fontWeight: 800, fontSize: 9 }}>AO VIVO</span>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ color: '#4b6a80', fontSize: 10, fontWeight: 600 }}>98.7 FM</div>
        <div style={{ background: '#060e16', border: `2px solid ${accent}`, borderRadius: 20, padding: '4px 14px', marginLeft: 8 }}>
          <span style={{ color: accent, fontWeight: 900, fontSize: 12 }}>1:00</span>
        </div>
      </div>

      {/* Hero */}
      <div style={{ background: `linear-gradient(180deg, #0a1622 0%, #0f1923 100%)`, padding: '18px 18px 14px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: `radial-gradient(ellipse at 50% 0%, ${accent}12 0%, transparent 70%)` }} />
        <div style={{ position: 'relative' }}>
          <div style={{ color: '#2a5570', fontSize: 9, fontWeight: 700, letterSpacing: 3, marginBottom: 6, textTransform: 'uppercase' }}>Comercial de Rádio — Spot Completo</div>
          <div style={{ color: '#e2eef5', fontSize: 17, fontWeight: 900, lineHeight: 1.35, marginBottom: 6 }}>{headlineText}</div>
          <div style={{ color: accent, fontSize: 11, fontWeight: 600 }}>{brand}</div>
        </div>
      </div>

      {/* Playhead */}
      <div style={{ background: '#060e16', padding: '8px 18px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span style={{ color: accent, fontSize: 9, fontWeight: 700, minWidth: 28 }}>0:47</span>
          <div style={{ flex: 1, height: 3, background: '#1a2d3a', borderRadius: 4, overflow: 'hidden' }}>
            <div className="s60-prog" style={{ height: '100%', background: `linear-gradient(90deg, ${accent}99, ${accent})`, borderRadius: 4 }} />
          </div>
          <span style={{ color: '#2a5570', fontSize: 9, fontWeight: 600, minWidth: 28, textAlign: 'right' }}>1:00</span>
        </div>
        {/* Waveform */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 30 }}>
          {waveBars.map((h, i) => {
            const clsArr = ['s60-bar-a', 's60-bar-b', 's60-bar-c', 's60-bar-d'];
            const cls = clsArr[i % 4];
            const past = i < 22;
            return (
              <div
                key={i}
                className={past ? cls : ''}
                style={{ flex: 1, height: h * 2, background: past ? accent : '#1a2d3a', borderRadius: 2, transformOrigin: 'bottom', opacity: past ? 1 : 0.25 }}
              />
            );
          })}
        </div>
      </div>

      {/* Script */}
      <div style={{ padding: '10px 18px 8px', background: '#0f1923' }}>
        <div style={{ color: '#2a5570', fontSize: 9, fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>ROTEIRO — SPOT 60 SEGUNDOS</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {script.map((line, i) => {
            const labelColor = line.label === 'LOCUTOR' ? accent : line.label === 'SFX' ? '#10B981' : line.label === 'JINGLE' ? '#EC4899' : '#6366F1';
            return (
              <div key={i} style={{ display: 'flex', gap: 8, background: '#060e16', borderRadius: 6, padding: '7px 10px', border: `1px solid ${accent}12` }}>
                <span style={{ color: '#2a5570', fontSize: 8, fontWeight: 700, minWidth: 30, flexShrink: 0, paddingTop: 1 }}>{line.time}</span>
                <span style={{ color: labelColor, fontSize: 8, fontWeight: 800, minWidth: 50, flexShrink: 0, paddingTop: 1 }}>{line.label}:</span>
                <span style={{ color: '#8dafc4', fontSize: 9, lineHeight: 1.5 }}>{line.text}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Body copy preview */}
      <div style={{ padding: '4px 18px 10px', background: '#0f1923' }}>
        <div style={{ background: '#060e16', borderLeft: `3px solid ${accent}`, borderRadius: 6, padding: '10px 14px' }}>
          <div style={{ color: '#2a5570', fontSize: 8, fontWeight: 700, letterSpacing: 1, marginBottom: 5 }}>COPY PRINCIPAL</div>
          <p style={{ color: '#8dafc4', fontSize: 10, lineHeight: 1.7, margin: 0, fontStyle: 'italic' }}>"{bodyText}"</p>
        </div>
      </div>

      {/* Production specs */}
      <div style={{ padding: '0 18px 12px', background: '#0f1923' }}>
        <div style={{ color: '#2a5570', fontSize: 9, fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>FICHA TÉCNICA</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
          {specs.map((d, i) => (
            <div key={i} style={{ background: '#060e16', border: `1px solid ${accent}18`, borderRadius: 6, padding: '7px 10px', textAlign: 'center' }}>
              <div style={{ color: '#2a5570', fontSize: 8, marginBottom: 2 }}>{d.label}</div>
              <div style={{ color: '#c8dde8', fontSize: 9, fontWeight: 700 }}>{d.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA block */}
      <div style={{ padding: '0 18px 12px', background: '#0f1923' }}>
        <div style={{ background: `${accent}12`, border: `1px solid ${accent}35`, borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ color: '#2a5570', fontSize: 8, marginBottom: 3 }}>CALL TO ACTION</div>
            <div style={{ color: '#c8dde8', fontSize: 11, fontWeight: 700 }}>0800 123 4567</div>
            <div style={{ color: accent, fontSize: 9, marginTop: 1 }}>{brand.toLowerCase().replace(/\s/g, '')}.com.br</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#2a5570', fontSize: 8, marginBottom: 3 }}>INSERÇÃO</div>
            <div style={{ color: '#c8dde8', fontSize: 10, fontWeight: 700 }}>Prime Time</div>
            <div style={{ color: '#2a5570', fontSize: 8, marginTop: 1 }}>7h–9h / 17h–19h</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: '#060e16', borderTop: `1px solid ${accent}18`, padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2">
          <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/>
          <circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1"/>
        </svg>
        <span style={{ color: '#2a5570', fontSize: 9 }}>{brand} — Spot Completo 60s</span>
        <div style={{ flex: 1 }} />
        <span style={{ color: accent, fontSize: 9, fontWeight: 700 }}>98.7 FM</span>
      </div>
    </div>
  );
};
