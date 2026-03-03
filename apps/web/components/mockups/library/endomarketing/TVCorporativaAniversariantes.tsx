'use client';

import React from 'react';

interface TVCorporativaAniversariantesProps {
  brandName?: string;
  title?: string;
  headline?: string;
  brandColor?: string;
  name?: string;
}

export const TVCorporativaAniversariantes: React.FC<TVCorporativaAniversariantesProps> = ({
  brandName = 'Empresa S.A.',
  title = 'Aniversariantes do Mês',
  headline = 'Março 2025',
  brandColor = '#f59e0b',
  name = '',
}) => {
  const celebrants = [
    { name: 'Ana Carvalho', dept: 'Marketing', day: '03' },
    { name: 'Bruno Silva', dept: 'TI', day: '11' },
    { name: 'Camila Rocha', dept: 'RH', day: '17' },
    { name: 'Diego Nunes', dept: 'Vendas', day: '24' },
    { name: 'Elena Santos', dept: 'Financeiro', day: '29' },
  ];

  const initials = (n: string) => n.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
  const avatarColors = ['#f59e0b', '#3b82f6', '#8b5cf6', '#22c55e', '#ec4899'];

  return (
    <div style={{
      width: 560, height: 315,
      background: 'linear-gradient(135deg, #1a0a00 0%, #2d1200 50%, #1a0a00 100%)',
      borderRadius: 12, overflow: 'hidden',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      position: 'relative', display: 'flex', flexDirection: 'column',
    }}>
      <style>{`
        @keyframes bday-float {
          0%,100% { transform: translateY(0) rotate(-5deg); }
          50% { transform: translateY(-8px) rotate(5deg); }
        }
        @keyframes bday-fade-in {
          from { opacity: 0; transform: translateX(-12px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .bday-icon { animation: bday-float 3s ease-in-out infinite; }
        .bday-person { animation: bday-fade-in 0.4s ease both; }
        .bday-person:nth-child(1){animation-delay:0.1s}
        .bday-person:nth-child(2){animation-delay:0.2s}
        .bday-person:nth-child(3){animation-delay:0.3s}
        .bday-person:nth-child(4){animation-delay:0.4s}
        .bday-person:nth-child(5){animation-delay:0.5s}
      `}</style>

      {/* Confetti dots */}
      {[...Array(14)].map((_, i) => (
        <div key={i} style={{
          position: 'absolute',
          width: 6, height: 6, borderRadius: '50%',
          background: ['#f59e0b','#3b82f6','#ec4899','#22c55e','#8b5cf6'][i % 5],
          top: `${(i * 37) % 90}%`,
          left: `${(i * 53 + 10) % 95}%`,
          opacity: 0.3,
        }} />
      ))}

      {/* Top accent */}
      <div style={{ height: 4, background: `linear-gradient(90deg, #f59e0b, #fbbf24, #f59e0b)` }} />

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 20px 8px', borderBottom: '1px solid rgba(245,158,11,0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="bday-icon" style={{ fontSize: 28 }}>🎂</div>
          <div>
            <div style={{ color: '#fbbf24', fontWeight: 800, fontSize: 16 }}>{title}</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>{brandName}</div>
          </div>
        </div>
        <div style={{
          background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.4)',
          borderRadius: 20, padding: '4px 12px',
        }}>
          <span style={{ color: '#fbbf24', fontSize: 11, fontWeight: 700 }}>{headline}</span>
        </div>
      </div>

      {/* Sub-header */}
      <div style={{ padding: '8px 20px 4px' }}>
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase' }}>
          Parabéns aos nossos colaboradores!
        </div>
      </div>

      {/* Celebrants list */}
      <div style={{ flex: 1, padding: '4px 20px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {celebrants.map((person, i) => (
          <div key={i} className="bday-person" style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '7px 12px',
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            {/* Day badge */}
            <div style={{
              width: 34, height: 34, borderRadius: 8,
              background: `rgba(245,158,11,0.15)`, border: `1px solid rgba(245,158,11,0.3)`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ color: '#fbbf24', fontSize: 14, fontWeight: 800, lineHeight: 1 }}>{person.day}</div>
              <div style={{ color: 'rgba(245,158,11,0.6)', fontSize: 7 }}>MAR</div>
            </div>
            {/* Avatar */}
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: avatarColors[i],
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 11, color: 'white',
              flexShrink: 0,
            }}>
              {initials(person.name)}
            </div>
            {/* Info */}
            <div style={{ flex: 1 }}>
              <div style={{ color: 'white', fontWeight: 600, fontSize: 13 }}>{person.name}</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>{person.dept}</div>
            </div>
            {/* Cake emoji */}
            <div style={{ fontSize: 16 }}>🎉</div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        padding: '6px 20px', borderTop: '1px solid rgba(245,158,11,0.15)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9 }}>
          {celebrants.length} aniversariantes este mês
        </div>
        <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9 }}>
          {new Date().toLocaleDateString('pt-BR')}
        </div>
      </div>
    </div>
  );
};
