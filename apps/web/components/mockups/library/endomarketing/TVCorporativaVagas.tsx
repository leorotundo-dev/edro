'use client';

import React from 'react';

interface TVCorporativaVagasProps {
  brandName?: string;
  title?: string;
  headline?: string;
  brandColor?: string;
  name?: string;
}

export const TVCorporativaVagas: React.FC<TVCorporativaVagasProps> = ({
  brandName = 'Empresa S.A.',
  title = 'Vagas Internas',
  headline = 'Candidate-se Agora',
  brandColor = '#06b6d4',
  name = '',
}) => {
  const vagas = [
    { cargo: 'Gerente de Projetos', depto: 'Tecnologia', local: 'São Paulo – SP', tipo: 'CLT', nivel: 'Sênior', novo: true },
    { cargo: 'Analista de RH', depto: 'Recursos Humanos', local: 'Remoto', tipo: 'CLT', nivel: 'Pleno', novo: false },
    { cargo: 'Coordenador de Vendas', depto: 'Comercial', local: 'Rio de Janeiro – RJ', tipo: 'CLT', nivel: 'Pleno', novo: true },
    { cargo: 'Designer UX/UI', depto: 'Marketing', local: 'Híbrido – SP', tipo: 'PJ/CLT', nivel: 'Sênior', novo: false },
  ];

  const nivelColor: Record<string, string> = { Sênior: '#f59e0b', Pleno: '#3b82f6', Júnior: '#22c55e' };

  return (
    <div style={{
      width: 560, height: 315,
      background: 'linear-gradient(150deg, #030d10 0%, #071820 100%)',
      borderRadius: 12, overflow: 'hidden',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      display: 'flex', flexDirection: 'column',
    }}>
      <style>{`
        @keyframes vaga-in { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
        .vaga-card { animation: vaga-in 0.4s ease both; }
        .vaga-card:nth-child(1){animation-delay:0.05s}
        .vaga-card:nth-child(2){animation-delay:0.15s}
        .vaga-card:nth-child(3){animation-delay:0.25s}
        .vaga-card:nth-child(4){animation-delay:0.35s}
        @keyframes novo-blink { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .novo-badge { animation: novo-blink 1.5s ease-in-out infinite; }
      `}</style>

      <div style={{ height: 4, background: `linear-gradient(90deg, ${brandColor}, #6366f1, #8b5cf6)` }} />

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '9px 20px 7px', borderBottom: '1px solid rgba(6,182,212,0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: `${brandColor}22`, border: `1px solid ${brandColor}44`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={brandColor} strokeWidth="2">
              <rect x="2" y="7" width="20" height="14" rx="2" />
              <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
            </svg>
          </div>
          <div>
            <div style={{ color: '#67e8f9', fontWeight: 800, fontSize: 15 }}>{title}</div>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10 }}>{brandName} · {headline}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{
            background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.4)',
            borderRadius: 20, padding: '3px 10px',
          }}>
            <span style={{ color: '#67e8f9', fontSize: 10, fontWeight: 700 }}>4 vagas abertas</span>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 16px' }}>
        {vagas.map((v, i) => (
          <div key={i} className="vaga-card" style={{
            display: 'grid', gridTemplateColumns: '1fr auto',
            gap: 12, alignItems: 'center',
            background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '9px 14px',
            border: '1px solid rgba(255,255,255,0.07)',
            borderLeft: `3px solid ${brandColor}`,
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {v.novo && (
                  <span className="novo-badge" style={{
                    background: 'rgba(34,197,94,0.2)', border: '1px solid rgba(34,197,94,0.5)',
                    color: '#4ade80', fontSize: 7, fontWeight: 800,
                    padding: '1px 5px', borderRadius: 3,
                  }}>NOVO</span>
                )}
                <span style={{ color: 'white', fontSize: 13, fontWeight: 700 }}>{v.cargo}</span>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  </svg>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9 }}>{v.depto}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
                  </svg>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9 }}>{v.local}</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
              <div style={{ display: 'flex', gap: 5 }}>
                <span style={{
                  background: `${nivelColor[v.nivel] || brandColor}22`,
                  border: `1px solid ${nivelColor[v.nivel] || brandColor}55`,
                  color: nivelColor[v.nivel] || brandColor,
                  fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                }}>{v.nivel}</span>
                <span style={{
                  background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)',
                  fontSize: 8, fontWeight: 600, padding: '2px 6px', borderRadius: 4,
                }}>{v.tipo}</span>
              </div>
              <div style={{
                background: `${brandColor}22`, border: `1px solid ${brandColor}55`,
                borderRadius: 5, padding: '3px 10px', cursor: 'pointer',
              }}>
                <span style={{ color: brandColor, fontSize: 9, fontWeight: 700 }}>Ver vaga</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{
        padding: '4px 20px 8px', borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 9 }}>Portal de Carreira · RH</span>
        <span style={{ color: brandColor, fontSize: 9, fontWeight: 600 }}>Indique um colega e ganhe bônus! →</span>
      </div>
    </div>
  );
};
