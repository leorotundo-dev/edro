'use client';

import React from 'react';

interface JornalNecrologiaProps {
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

export const JornalNecrologia: React.FC<JornalNecrologiaProps> = ({
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
  brandColor = '#1a1a1a',
}) => {
  const deceasedName = headline ?? title ?? name ?? brandName ?? 'José Carlos Oliveira';
  const dates = body ?? caption ?? description ?? text ?? '15 de março de 1942 — 28 de fevereiro de 2026';
  const familyText = 'Sua esposa Maria, filhos Paulo, Ana e Carlos, netos e bisnetos comunicam com profundo pesar o falecimento de seu ente querido.';

  return (
    <div style={{ width: 300, background: '#faf9f5', fontFamily: '"Georgia", "Times New Roman", serif', border: '3px solid #111', boxShadow: '0 4px 16px rgba(0,0,0,0.18)', overflow: 'hidden' }}>
      <style>{`
        @keygroup-nec { from { opacity: 0; } to { opacity: 1; } }
        .jnec-in { animation: jnec-fadein 0.6s ease both; }
        @keyframes jnec-fadein { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      {/* Top thick black border strip */}
      <div style={{ height: 8, background: '#111' }} />

      {/* Cross / floral icon */}
      <div style={{ padding: '16px 20px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center' }} className="jnec-in">
        {/* Tasteful cross SVG */}
        <svg width="36" height="44" viewBox="0 0 36 44" fill="none">
          <rect x="14" y="0" width="8" height="44" rx="2" fill="#111"/>
          <rect x="0" y="12" width="36" height="8" rx="2" fill="#111"/>
        </svg>
      </div>

      {/* Deceased name */}
      <div style={{ padding: '6px 20px 4px', textAlign: 'center', borderTop: '1px solid #d0cfc0', borderBottom: '1px solid #d0cfc0', margin: '0 16px' }}>
        <div style={{ fontSize: 8, fontFamily: 'sans-serif', color: '#888', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>Falecimento</div>
        <h2 style={{ fontSize: 18, fontWeight: 900, color: '#111', lineHeight: 1.2, margin: '0 0 4px', letterSpacing: -0.2 }}>{deceasedName}</h2>
        <div style={{ fontSize: 10, color: '#555', fontStyle: 'italic', marginBottom: 4 }}>{dates}</div>
      </div>

      {/* Family notice */}
      <div style={{ padding: '10px 20px' }}>
        <p style={{ fontSize: 10, color: '#333', lineHeight: 1.7, textAlign: 'center', margin: '0 0 10px' }}>{familyText}</p>

        {/* Floral divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0' }}>
          <div style={{ flex: 1, height: 1, background: '#c8c2b0' }} />
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#aaa"><path d="M12 2C6 2 2 6 2 12c0 5.5 4 10 10 10s10-4.5 10-10c0-6-4-10-10-10zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8z"/><circle cx="12" cy="12" r="3" fill="#ccc"/></svg>
          <div style={{ flex: 1, height: 1, background: '#c8c2b0' }} />
        </div>

        {/* Family names */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: '#555', fontFamily: 'sans-serif', lineHeight: 1.6 }}>
            <div style={{ fontWeight: 700, marginBottom: 2 }}>A família comunica:</div>
            <div>Velório: Cemitério Municipal — Sala 3</div>
            <div>Sepultamento: {new Date().toLocaleDateString('pt-BR')} às 16h</div>
          </div>
        </div>
      </div>

      {/* Bottom black border strip */}
      <div style={{ height: 8, background: '#111' }} />
    </div>
  );
};
