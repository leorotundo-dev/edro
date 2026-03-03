'use client';

import React from 'react';

interface TVCorporativaCampanhaProps {
  brandName?: string;
  title?: string;
  headline?: string;
  description?: string;
  brandColor?: string;
  name?: string;
}

export const TVCorporativaCampanha: React.FC<TVCorporativaCampanhaProps> = ({
  brandName = 'Empresa S.A.',
  title = 'Campanha Supera 2025',
  headline = 'Bora Bater a Meta!',
  description = 'Vendas do 1º Trimestre',
  brandColor = '#f97316',
  name = '',
}) => {
  const pct = 73;
  const diasRestantes = 18;
  const top = [
    { pos: 1, nome: 'Fernanda Lima', val: 'R$ 320k', avatar: 'FL', color: '#fbbf24' },
    { pos: 2, nome: 'Rafael Costa', val: 'R$ 287k', avatar: 'RC', color: '#94a3b8' },
    { pos: 3, nome: 'Beatriz Alves', val: 'R$ 251k', avatar: 'BA', color: '#cd7c2f' },
  ];

  return (
    <div style={{
      width: 560, height: 315,
      background: 'linear-gradient(140deg, #0c0c0c 0%, #1a0f00 60%, #0c0c0c 100%)',
      borderRadius: 12, overflow: 'hidden',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      display: 'flex', flexDirection: 'column',
    }}>
      <style>{`
        @keyframes camp-fire { 0%,100%{transform:scaleY(1)} 50%{transform:scaleY(1.08)} }
        @keyframes camp-glow { 0%,100%{opacity:0.5} 50%{opacity:1} }
        @keyframes camp-bar { from{width:0} to{width:${pct}%} }
        .camp-bar { animation: camp-bar 1.4s cubic-bezier(.4,0,.2,1) both 0.3s; }
        .camp-flame { animation: camp-fire 0.8s ease-in-out infinite; }
        .camp-glow { animation: camp-glow 2s ease-in-out infinite; }
      `}</style>

      <div style={{ height: 4, background: `linear-gradient(90deg, #ef4444, ${brandColor}, #fbbf24)` }} />

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 20px 8px', borderBottom: '1px solid rgba(249,115,22,0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="camp-flame" style={{ fontSize: 26 }}>🔥</div>
          <div>
            <div style={{ color: '#fb923c', fontWeight: 800, fontSize: 15 }}>{title}</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>{brandName} · {description}</div>
          </div>
        </div>
        <div style={{
          background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)',
          borderRadius: 20, padding: '4px 12px',
        }}>
          <span style={{ color: '#fca5a5', fontSize: 11, fontWeight: 700 }}>{diasRestantes} dias restantes</span>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', gap: 16, padding: '12px 20px' }}>
        {/* Left: thermometer + pct */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10, width: 220 }}>
          <div style={{ color: 'white', fontSize: 12, fontWeight: 600 }}>{headline}</div>

          {/* Progress bar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9 }}>Progresso da meta</span>
              <span style={{ color: '#fb923c', fontSize: 11, fontWeight: 800 }}>{pct}%</span>
            </div>
            <div style={{ height: 16, background: 'rgba(255,255,255,0.08)', borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
              <div className="camp-bar" style={{
                height: '100%', borderRadius: 8,
                background: `linear-gradient(90deg, #ef4444, ${brandColor}, #fbbf24)`,
                position: 'absolute', top: 0, left: 0,
              }} />
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 8, color: 'white', fontWeight: 700, zIndex: 1 }}>{pct}% atingido</span>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 8 }}>R$ 0</span>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 8 }}>Meta: R$ 1,5M</span>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 10 }}>
            {[
              { label: 'Realizado', val: 'R$ 1,09M', color: '#22c55e' },
              { label: 'Falta', val: 'R$ 405k', color: '#ef4444' },
            ].map((s, i) => (
              <div key={i} style={{
                flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: 6, padding: '6px 8px',
                borderTop: `2px solid ${s.color}`,
              }}>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 8 }}>{s.label}</div>
                <div style={{ color: s.color, fontSize: 13, fontWeight: 800 }}>{s.val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: ranking */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 2 }}>
            Top Vendedores
          </div>
          {top.map((p, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '7px 10px',
              border: p.pos === 1 ? '1px solid rgba(251,191,36,0.3)' : '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{ color: p.color, fontWeight: 800, fontSize: 14, width: 16 }}>{p.pos}º</div>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', background: `${p.color}33`,
                border: `1px solid ${p.color}66`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, color: p.color, flexShrink: 0,
              }}>{p.avatar}</div>
              <div style={{ flex: 1, color: 'white', fontSize: 12 }}>{p.nome}</div>
              <div style={{ color: p.color, fontSize: 12, fontWeight: 700 }}>{p.val}</div>
            </div>
          ))}
          <div style={{ textAlign: 'center', padding: '4px 0' }}>
            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 9 }}>🏆 Prêmio: Viagem + Bônus de R$ 5.000</span>
          </div>
        </div>
      </div>

      <div style={{
        padding: '4px 20px 8px', borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', justifyContent: 'space-between',
      }}>
        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 9 }}>Atualizado em tempo real</span>
        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 9 }}>{new Date().toLocaleDateString('pt-BR')}</span>
      </div>
    </div>
  );
};
