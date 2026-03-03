'use client';

import React from 'react';

interface ManualSegurancaProps {
  brandName?: string;
  brandColor?: string;
  name?: string;
  title?: string;
  headline?: string;
  body?: string;
  image?: string;
}

export const ManualSeguranca: React.FC<ManualSegurancaProps> = ({
  brandName = 'Empresa S.A.',
  brandColor = '#eab308',
  name = 'CIPA · Segurança do Trabalho',
  title = 'Manual de Segurança do Trabalho',
  headline = 'NR-6 · Equipamentos de Proteção Individual',
  body = 'O uso correto dos EPIs é obrigatório em todas as áreas de risco. A empresa fornece os equipamentos gratuitamente e o colaborador é responsável pela guarda e uso adequado.',
  image = '',
}) => {
  const epis = [
    { icone: '⛑️', nome: 'Capacete', nr: 'NR-6 CA 12345' },
    { icone: '🥽', nome: 'Óculos', nr: 'NR-6 CA 23456' },
    { icone: '🧤', nome: 'Luvas', nr: 'NR-6 CA 34567' },
    { icone: '👢', nome: 'Bota', nr: 'NR-10 CA 45678' },
  ];

  const emergencia = [
    { num: '1', acao: 'Acione o alarme de emergência ou ligue 193' },
    { num: '2', acao: 'Evacue a área pelo caminho mais seguro' },
    { num: '3', acao: 'Dirija-se ao ponto de encontro no estacionamento' },
    { num: '4', acao: 'Aguarde o brigadista e não retorne sem autorização' },
  ];

  return (
    <div style={{
      width: 300, minHeight: 424,
      background: '#ffffff',
      borderRadius: 8, overflow: 'hidden',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
      display: 'flex', flexDirection: 'column',
      border: '1px solid #e5e7eb',
    }}>
      <style>{`
        @keyframes ms-emerge { from{opacity:0;transform:scale(0.9)} to{opacity:1;transform:scale(1)} }
        .ms-epi { animation: ms-emerge 0.3s ease both; }
        .ms-epi:nth-child(1){animation-delay:0.05s}
        .ms-epi:nth-child(2){animation-delay:0.12s}
        .ms-epi:nth-child(3){animation-delay:0.19s}
        .ms-epi:nth-child(4){animation-delay:0.26s}
        @keyframes ms-warn { 0%,100%{opacity:1} 50%{opacity:0.7} }
        .ms-warn { animation: ms-warn 2s ease-in-out infinite; }
      `}</style>

      {/* Header amarelo/preto estilo NR */}
      <div style={{
        background: 'repeating-linear-gradient(45deg, #1a1700 0px, #1a1700 14px, #eab308 14px, #eab308 28px)',
        height: 10,
      }} />
      <div style={{
        background: `linear-gradient(135deg, #1a1700 0%, #292400 100%)`,
        padding: '18px 22px 14px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(234,179,8,0.08)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 8,
            background: `${brandColor}22`,
            border: `2px solid ${brandColor}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {image ? (
              <img src={image} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 6 }} />
            ) : (
              <span className="ms-warn" style={{ fontSize: 20 }}>⛑️</span>
            )}
          </div>
          <div>
            <h1 style={{ color: '#fde047', fontSize: 13, fontWeight: 900, margin: '0 0 2px', lineHeight: 1.2 }}>{title}</h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, margin: 0 }}>{brandName} · {name}</p>
          </div>
        </div>
      </div>
      <div style={{ background: brandColor, padding: '4px 20px' }}>
        <span style={{ color: '#1a1700', fontSize: 9, fontWeight: 800, letterSpacing: 0.8 }}>{headline}</span>
      </div>

      {/* Texto intro */}
      <div style={{ padding: '12px 20px 8px' }}>
        <p style={{ color: '#374151', fontSize: 10, lineHeight: 1.6, margin: 0 }}>{body}</p>
      </div>

      {/* EPIs */}
      <div style={{ padding: '0 20px 10px' }}>
        <div style={{ color: '#6b7280', fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
          EPIs obrigatórios
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {epis.map((epi, i) => (
            <div key={i} className="ms-epi" style={{
              background: '#fefce8', borderRadius: 7,
              border: `1px solid ${brandColor}40`,
              padding: '8px 10px', display: 'flex', gap: 8, alignItems: 'center',
            }}>
              <span style={{ fontSize: 20 }}>{epi.icone}</span>
              <div>
                <div style={{ color: '#1a1700', fontSize: 10, fontWeight: 700 }}>{epi.nome}</div>
                <div style={{ color: '#78716c', fontSize: 8 }}>{epi.nr}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Procedimento de emergência */}
      <div style={{ flex: 1, padding: '0 20px 12px' }}>
        <div style={{
          background: '#fff1f2', border: '1px solid #fecdd3',
          borderRadius: 8, padding: '10px 12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span style={{ color: '#dc2626', fontSize: 10, fontWeight: 800 }}>Procedimento de Emergência</span>
          </div>
          {emergencia.map((e, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: i < 3 ? 5 : 0 }}>
              <div style={{
                width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                background: '#dc2626', color: 'white',
                fontSize: 8, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{e.num}</div>
              <span style={{ color: '#7f1d1d', fontSize: 10, lineHeight: 1.4 }}>{e.acao}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Rodapé */}
      <div style={{
        background: '#1a1700', padding: '8px 20px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9 }}>CIPA · 2025 · Uso Obrigatório</span>
        <span style={{ background: brandColor, color: '#1a1700', fontSize: 8, fontWeight: 800, padding: '2px 8px', borderRadius: 3 }}>A4</span>
      </div>
    </div>
  );
};
