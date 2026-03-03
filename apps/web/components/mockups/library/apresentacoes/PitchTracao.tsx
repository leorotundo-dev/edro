'use client';

import React from 'react';

interface PitchTracaoProps {
  name?: string;
  brandName?: string;
  headline?: string;
  title?: string;
  body?: string;
  caption?: string;
  description?: string;
  text?: string;
  brandColor?: string;
  themeColor?: string;
}

export const PitchTracao: React.FC<PitchTracaoProps> = ({
  name,
  brandName,
  headline,
  title,
  body,
  caption,
  description,
  text,
  brandColor,
  themeColor,
}) => {
  const accent = themeColor ?? brandColor ?? '#0EA5E9';
  const slideTitle = headline ?? title ?? 'Tração';
  const companyName = brandName ?? name ?? 'Startup';
  const subText = body ?? caption ?? description ?? text ?? 'Crescimento consistente mês a mês com retenção excepcional';

  const metrics = [
    { label: 'MRR', value: 'R$480k', delta: '+34%', color: accent, bg: `${accent}12` },
    { label: 'Usuários Ativos', value: '12.400', delta: '+28%', color: '#8b5cf6', bg: '#8b5cf612' },
    { label: 'Crescimento MoM', value: '28%', delta: '+6pp', color: '#22c55e', bg: '#22c55e12' },
    { label: 'NPS', value: '72', delta: '+8pts', color: '#f59e0b', bg: '#f59e0b12' },
  ];

  const chartBars = [38, 47, 52, 61, 68, 74, 82, 91, 100];
  const months = ['Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez', 'Jan', 'Fev', 'Mar'];

  return (
    <div style={{
      position: 'relative', width: '560px', height: '315px',
      borderRadius: '10px', overflow: 'hidden',
      background: '#ffffff',
      boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    }}>
      <style>{`
        @keyframes pitch-trac-bar {
          from { transform: scaleY(0); }
          to { transform: scaleY(1); }
        }
      `}</style>

      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(90deg, ${accent}, ${accent}44, transparent)` }} />
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: `linear-gradient(180deg, ${accent}, transparent)` }} />

      <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', padding: '20px 26px 16px 30px' }}>

        {/* Header */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '3px' }}>
            {companyName}
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', margin: '0 0 3px 0', letterSpacing: '-0.02em' }}>
            {slideTitle}
          </h2>
          <p style={{ fontSize: '10px', color: '#64748b', margin: 0 }}>{subText}</p>
        </div>

        {/* Metric cards */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
          {metrics.map((m, i) => (
            <div key={i} style={{
              flex: 1, borderRadius: '10px', padding: '10px 10px 8px',
              background: m.bg, border: `1px solid ${m.color}33`,
            }}>
              <div style={{ fontSize: '9px', color: '#64748b', marginBottom: '4px', fontWeight: 600 }}>{m.label}</div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', lineHeight: 1, marginBottom: '4px' }}>{m.value}</div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '2px',
                background: '#dcfce7', borderRadius: '20px', padding: '1px 6px',
              }}>
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="18 15 12 9 6 15" />
                </svg>
                <span style={{ fontSize: '9px', fontWeight: 700, color: '#16a34a' }}>{m.delta}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Growth chart */}
        <div style={{
          flex: 1, background: '#f8fafc', borderRadius: '10px',
          border: '1px solid #e2e8f0', padding: '10px 14px 6px',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>
            MRR — Últimos 9 meses (R$ mil)
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: '6px' }}>
            {chartBars.map((h, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                <div style={{
                  width: '100%',
                  height: `${h * 0.52}px`,
                  borderRadius: '3px 3px 0 0',
                  background: i === chartBars.length - 1 ? accent : `${accent}55`,
                  transformOrigin: 'bottom',
                  animation: `pitch-trac-bar 0.6s ease-out ${i * 0.05}s both`,
                }} />
                <span style={{ fontSize: '8px', color: '#94a3b8' }}>{months[i]}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '10px', color: '#94a3b8' }}>
          <span>Dados auditados · Q1 2026</span>
          <span>07 / 15</span>
        </div>
      </div>
    </div>
  );
};
