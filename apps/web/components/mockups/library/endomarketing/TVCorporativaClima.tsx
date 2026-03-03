'use client';

import React from 'react';

interface TVCorporativaClimaProps {
  brandName?: string;
  title?: string;
  headline?: string;
  brandColor?: string;
  name?: string;
}

export const TVCorporativaClima: React.FC<TVCorporativaClimaProps> = ({
  brandName = 'Empresa S.A.',
  title = 'São Paulo, SP',
  headline = 'Condição atual',
  brandColor = '#0ea5e9',
  name = '',
}) => {
  const previsao = [
    { dia: 'Seg', icon: '☀️', max: 31, min: 22 },
    { dia: 'Ter', icon: '⛅', max: 28, min: 20 },
    { dia: 'Qua', icon: '🌧️', max: 24, min: 18 },
    { dia: 'Qui', icon: '⛈️', max: 22, min: 17 },
    { dia: 'Sex', icon: '🌤️', max: 27, min: 19 },
  ];

  return (
    <div style={{
      width: 560, height: 315,
      background: 'linear-gradient(160deg, #0c1a2e 0%, #0f3460 50%, #0c1a2e 100%)',
      borderRadius: 12, overflow: 'hidden',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      display: 'flex', flexDirection: 'column',
      position: 'relative',
    }}>
      <style>{`
        @keyframes clima-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes clima-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes clima-rain { 0%{transform:translateY(-10px);opacity:0} 100%{transform:translateY(20px);opacity:0.6} }
        .sol-icon { animation: clima-float 3s ease-in-out infinite; }
        .rain-drop { animation: clima-rain 1.2s linear infinite; }
        .rain-drop:nth-child(2){animation-delay:0.4s}
        .rain-drop:nth-child(3){animation-delay:0.8s}
      `}</style>

      {/* Background radial glow */}
      <div style={{
        position: 'absolute', width: 300, height: 300, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(14,165,233,0.15) 0%, transparent 70%)',
        top: -80, left: -60, pointerEvents: 'none',
      }} />

      <div style={{ height: 4, background: `linear-gradient(90deg, #0ea5e9, #38bdf8, #7dd3fc)` }} />

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 20px 6px', borderBottom: '1px solid rgba(14,165,233,0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
          </svg>
          <span style={{ color: '#38bdf8', fontWeight: 700, fontSize: 14 }}>{title}</span>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>· {headline}</span>
        </div>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
        </span>
      </div>

      {/* Main weather */}
      <div style={{ display: 'flex', flex: 1, padding: '10px 20px', gap: 20 }}>

        {/* Big temp block */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6, minWidth: 180 }}>
          <div className="sol-icon" style={{ fontSize: 56, lineHeight: 1 }}>☀️</div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <span style={{ color: 'white', fontSize: 64, fontWeight: 900, lineHeight: 1 }}>29</span>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 24, fontWeight: 400, marginTop: 8 }}>°C</span>
          </div>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 500 }}>Ensolarado</span>
          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10 }}>Sensação térmica: 32°C</span>
        </div>

        {/* Stats + forecast */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'center' }}>
          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
            {[
              { label: 'Umidade', val: '68%', icon: '💧' },
              { label: 'Vento', val: '14 km/h', icon: '💨' },
              { label: 'UV', val: 'Alto (7)', icon: '🌞' },
              { label: 'Visibilidade', val: '10 km', icon: '👁️' },
            ].map((s, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.06)', borderRadius: 7, padding: '6px 10px',
                display: 'flex', alignItems: 'center', gap: 7,
              }}>
                <span style={{ fontSize: 14 }}>{s.icon}</span>
                <div>
                  <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 8 }}>{s.label}</div>
                  <div style={{ color: 'white', fontSize: 12, fontWeight: 700 }}>{s.val}</div>
                </div>
              </div>
            ))}
          </div>

          {/* 5-day forecast */}
          <div style={{
            display: 'flex', gap: 5,
            background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '7px 10px',
          }}>
            {previsao.map((d, i) => (
              <div key={i} style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                borderRight: i < 4 ? '1px solid rgba(255,255,255,0.08)' : 'none', paddingRight: i < 4 ? 5 : 0,
              }}>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 8, fontWeight: 600 }}>{d.dia}</span>
                <span style={{ fontSize: 16 }}>{d.icon}</span>
                <span style={{ color: 'white', fontSize: 10, fontWeight: 700 }}>{d.max}°</span>
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9 }}>{d.min}°</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{
        padding: '4px 20px 8px', borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', justifyContent: 'space-between',
      }}>
        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 9 }}>{brandName}</span>
        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 9 }}>Fonte: OpenWeather · Atualizado agora</span>
      </div>
    </div>
  );
};
