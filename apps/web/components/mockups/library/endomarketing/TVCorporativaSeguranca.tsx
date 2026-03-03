'use client';

import React from 'react';

interface TVCorporativaSegurancaProps {
  brandName?: string;
  title?: string;
  headline?: string;
  brandColor?: string;
  name?: string;
}

export const TVCorporativaSeguranca: React.FC<TVCorporativaSegurancaProps> = ({
  brandName = 'Empresa S.A.',
  title = 'Painel de Segurança',
  headline = 'Compromisso com Vida',
  brandColor = '#eab308',
  name = '',
}) => {
  const dicas = [
    { icon: '🦺', texto: 'Use o EPI correto para cada atividade' },
    { icon: '⚠️', texto: 'Relate condições inseguras imediatamente' },
    { icon: '🔒', texto: 'Bloqueie máquinas antes de realizar manutenção' },
  ];

  return (
    <div style={{
      width: 560, height: 315,
      background: 'linear-gradient(150deg, #111004 0%, #1f1c00 60%, #111004 100%)',
      borderRadius: 12, overflow: 'hidden',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      display: 'flex', flexDirection: 'column',
      position: 'relative',
    }}>
      <style>{`
        @keyframes seg-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.7;transform:scale(1.05)} }
        @keyframes seg-counter { from{opacity:0;transform:scale(0.5)} to{opacity:1;transform:scale(1)} }
        @keyframes seg-row { from{opacity:0;transform:translateX(-10px)} to{opacity:1;transform:translateX(0)} }
        .seg-counter { animation: seg-counter 0.8s cubic-bezier(.34,1.56,.64,1) both 0.2s; }
        .seg-pulse { animation: seg-pulse 2s ease-in-out infinite; }
        .seg-row { animation: seg-row 0.4s ease both; }
        .seg-row:nth-child(1){animation-delay:0.2s}
        .seg-row:nth-child(2){animation-delay:0.35s}
        .seg-row:nth-child(3){animation-delay:0.5s}
      `}</style>

      {/* Warning stripes top */}
      <div style={{ height: 8, background: 'repeating-linear-gradient(90deg, #eab308 0px, #eab308 20px, #1a1800 20px, #1a1800 40px)' }} />

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 20px 7px', borderBottom: '1px solid rgba(234,179,8,0.2)',
        background: 'rgba(234,179,8,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="seg-pulse" style={{ fontSize: 26 }}>⛑️</div>
          <div>
            <div style={{ color: '#fde047', fontWeight: 800, fontSize: 15 }}>{title}</div>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10 }}>{brandName} · {headline}</div>
          </div>
        </div>
        <div style={{
          background: 'rgba(234,179,8,0.15)', border: '1px solid rgba(234,179,8,0.4)',
          borderRadius: 6, padding: '4px 12px',
        }}>
          <div style={{ color: '#fbbf24', fontSize: 8, fontWeight: 600, textAlign: 'center' }}>BOLETIM DIÁRIO</div>
          <div style={{ color: '#fde047', fontSize: 10, fontWeight: 700, textAlign: 'center' }}>{new Date().toLocaleDateString('pt-BR')}</div>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', gap: 16, padding: '12px 20px' }}>

        {/* Big counter */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 4, minWidth: 160,
          background: 'rgba(234,179,8,0.08)', borderRadius: 12, padding: '14px 20px',
          border: '2px solid rgba(234,179,8,0.25)',
        }}>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase' }}>
            Dias sem acidentes
          </div>
          <div className="seg-counter" style={{ color: '#fde047', fontSize: 72, fontWeight: 900, lineHeight: 1 }}>
            47
          </div>
          <div style={{ color: 'rgba(234,179,8,0.6)', fontSize: 9 }}>Recorde anterior: 38 dias</div>
          <div style={{
            background: '#22c55e22', border: '1px solid #22c55e55',
            borderRadius: 20, padding: '2px 10px', marginTop: 4,
          }}>
            <span style={{ color: '#4ade80', fontSize: 9, fontWeight: 700 }}>Novo recorde! 🏆</span>
          </div>
        </div>

        {/* Right panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Tips */}
          <div>
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 8, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>
              Dicas de Segurança
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {dicas.map((d, i) => (
                <div key={i} className="seg-row" style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'rgba(255,255,255,0.04)', borderRadius: 7, padding: '7px 10px',
                  border: '1px solid rgba(234,179,8,0.12)',
                }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{d.icon}</span>
                  <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 10, lineHeight: 1.3 }}>{d.texto}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Emergency contact */}
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 8, padding: '8px 12px',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{ fontSize: 20, flexShrink: 0 }}>🚨</div>
            <div>
              <div style={{ color: '#fca5a5', fontSize: 9, fontWeight: 700, letterSpacing: 1 }}>EMERGÊNCIA · CIPA</div>
              <div style={{ color: 'white', fontSize: 16, fontWeight: 900 }}>(11) 9999-0000</div>
            </div>
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 8 }}>Ambulatório</div>
              <div style={{ color: '#fca5a5', fontSize: 11, fontWeight: 700 }}>Ramal 119</div>
            </div>
          </div>
        </div>
      </div>

      {/* Warning stripes bottom */}
      <div style={{ height: 6, background: 'repeating-linear-gradient(90deg, #eab308 0px, #eab308 20px, #1a1800 20px, #1a1800 40px)' }} />
    </div>
  );
};
