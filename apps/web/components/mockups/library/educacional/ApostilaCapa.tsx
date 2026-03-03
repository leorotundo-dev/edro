'use client';

import React from 'react';

interface ApostilaCapaProps {
  title?: string;
  headline?: string;
  name?: string;
  username?: string;
  brandName?: string;
  body?: string;
  caption?: string;
  description?: string;
  text?: string;
  brandColor?: string;
}

export const ApostilaCapa: React.FC<ApostilaCapaProps> = ({
  title,
  headline,
  name,
  username,
  brandName,
  body,
  caption,
  description,
  text,
  brandColor = '#2563eb',
}) => {
  const courseName = brandName ?? name ?? username ?? 'Instituto Educacional';
  const moduleTitle = title ?? headline ?? 'Fundamentos de Matemática';
  const moduleSubtitle = body ?? caption ?? description ?? text ?? 'Módulo 3 — Álgebra e Funções';

  const darkColor = brandColor;
  const lightColor = `${brandColor}22`;

  return (
    <div style={{ position: 'relative', width: '300px', height: '424px', backgroundColor: '#fff', boxShadow: '0 8px 32px rgba(0,0,0,0.18)', borderRadius: '6px', overflow: 'hidden', fontFamily: "'Segoe UI', system-ui, sans-serif", display: 'flex', flexDirection: 'row' }}>

      {/* Spine strip */}
      <div style={{ width: '18px', minWidth: '18px', backgroundColor: darkColor, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.5)' }} />
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.5)' }} />
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.5)' }} />
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* Top color band */}
        <div style={{ backgroundColor: darkColor, padding: '20px 18px 14px', position: 'relative' }}>
          {/* Decorative circles */}
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.1)' }} />
          <div style={{ position: 'absolute', top: '10px', right: '10px', width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.12)' }} />

          {/* Institution logo area */}
          <div style={{ backgroundColor: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '4px', padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
              <path d="M6 12v5c3 3 9 3 12 0v-5"/>
            </svg>
            <span style={{ color: 'white', fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{courseName}</span>
          </div>

          {/* Module badge */}
          <div style={{ display: 'inline-block', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '20px', padding: '3px 10px', fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>
            Módulo 03
          </div>
        </div>

        {/* White diagonal cut-out visual */}
        <div style={{ height: '32px', background: `linear-gradient(to bottom right, ${darkColor} 50%, #f8fafc 50%)` }} />

        {/* Body */}
        <div style={{ flex: 1, backgroundColor: '#f8fafc', padding: '12px 18px 0', display: 'flex', flexDirection: 'column' }}>
          <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#1e293b', lineHeight: '1.25', margin: '0 0 8px', letterSpacing: '-0.02em' }}>{moduleTitle}</h1>
          <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 14px', lineHeight: '1.5' }}>{moduleSubtitle}</p>

          {/* Topics list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', flex: 1 }}>
            {['Equações do 1º grau', 'Equações do 2º grau', 'Funções lineares', 'Sistemas de equações'].map((topic, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: lightColor, border: `1.5px solid ${darkColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '9px', fontWeight: 700, color: darkColor }}>{i + 1}</span>
                </div>
                <span style={{ fontSize: '11px', color: '#475569' }}>{topic}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', padding: '10px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            {[1, 2, 3, 4, 5].map(s => (
              <div key={s} style={{ width: '16px', height: '4px', borderRadius: '2px', backgroundColor: s <= 3 ? darkColor : '#e2e8f0' }} />
            ))}
          </div>
          <span style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>2024 · Apostila</span>
        </div>

      </div>
    </div>
  );
};
