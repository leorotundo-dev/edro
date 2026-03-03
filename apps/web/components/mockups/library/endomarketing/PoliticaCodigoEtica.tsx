'use client';

import React from 'react';

interface PoliticaCodigoEticaProps {
  brandName?: string;
  brandColor?: string;
  name?: string;
  title?: string;
  headline?: string;
  body?: string;
  image?: string;
}

export const PoliticaCodigoEtica: React.FC<PoliticaCodigoEticaProps> = ({
  brandName = 'Empresa S.A.',
  brandColor = '#1e40af',
  name = 'Compliance & Ética',
  title = 'Código de Ética e Conduta',
  headline = 'Nossos valores guiam cada decisão',
  body = 'Todos os colaboradores, prestadores de serviço e parceiros devem conhecer e cumprir este Código. Violações devem ser reportadas pelo canal de denúncias.',
  image = '',
}) => {
  const principios = [
    { num: '01', icone: '⚖️', titulo: 'Integridade', cor: '#3b82f6', desc: 'Agir com honestidade e transparência em todas as relações profissionais.' },
    { num: '02', icone: '🤝', titulo: 'Respeito', cor: '#8b5cf6', desc: 'Tratar colegas, clientes e parceiros com dignidade, independentemente de qualquer diferença.' },
    { num: '03', icone: '🔒', titulo: 'Confidencialidade', cor: '#06b6d4', desc: 'Proteger informações sigilosas da empresa e de clientes.' },
    { num: '04', icone: '🌐', titulo: 'Responsabilidade Social', cor: '#059669', desc: 'Considerar o impacto de nossas ações na sociedade e no meio ambiente.' },
    { num: '05', icone: '🎯', titulo: 'Comprometimento', cor: '#f59e0b', desc: 'Dedicar esforço genuíno para atingir metas com excelência e responsabilidade.' },
  ];

  return (
    <div style={{
      width: 420, background: '#ffffff',
      borderRadius: 10, overflow: 'hidden',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
      border: '1px solid #e5e7eb',
    }}>
      <style>{`
        @keyframes ce-in { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
        .ce-item { animation: ce-in 0.35s ease both; }
        .ce-item:nth-child(1){animation-delay:0.05s}
        .ce-item:nth-child(2){animation-delay:0.13s}
        .ce-item:nth-child(3){animation-delay:0.21s}
        .ce-item:nth-child(4){animation-delay:0.29s}
        .ce-item:nth-child(5){animation-delay:0.37s}
      `}</style>

      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${brandColor} 0%, #1e3a8a 100%)`,
        padding: '22px 26px 18px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -25, right: -25, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 8,
            background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {image ? (
              <img src={image} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 6 }} />
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <polyline points="9 12 11 14 15 10" />
              </svg>
            )}
          </div>
          <div>
            <h1 style={{ color: 'white', fontSize: 17, fontWeight: 900, margin: 0, lineHeight: 1.2 }}>{title}</h1>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, margin: 0 }}>{brandName} · {name}</p>
          </div>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, margin: 0, fontStyle: 'italic' }}>{headline}</p>
      </div>

      {/* Intro */}
      <div style={{ padding: '14px 24px 10px' }}>
        <p style={{ color: '#4b5563', fontSize: 11, lineHeight: 1.65, margin: 0 }}>{body}</p>
      </div>

      {/* Princípios */}
      <div style={{ padding: '0 24px 14px' }}>
        <div style={{ color: '#6b7280', fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
          5 Princípios Fundamentais
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {principios.map((p, i) => (
            <div key={i} className="ce-item" style={{
              display: 'flex', gap: 12, alignItems: 'flex-start',
              background: '#f9fafb', borderRadius: 8, padding: '10px 12px',
              border: '1px solid #e5e7eb', borderLeft: `3px solid ${p.cor}`,
            }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>{p.icone}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <span style={{ color: '#9ca3af', fontSize: 9, fontWeight: 700 }}>{p.num}</span>
                  <span style={{ color: '#111827', fontSize: 12, fontWeight: 800 }}>{p.titulo}</span>
                </div>
                <p style={{ color: '#6b7280', fontSize: 10, margin: 0, lineHeight: 1.45 }}>{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Canal de denúncias */}
      <div style={{ padding: '0 24px 20px' }}>
        <div style={{
          background: '#fef2f2', border: '1px solid #fecdd3',
          borderRadius: 8, padding: '12px 16px',
          display: 'flex', gap: 10, alignItems: 'center',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" style={{ flexShrink: 0 }}>
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.21 1.18 2 2 0 012.19 1h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.91 8.1a16 16 0 006 6l1.46-1.46a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
          </svg>
          <div>
            <div style={{ color: '#dc2626', fontSize: 11, fontWeight: 800, marginBottom: 2 }}>Canal de Denúncias (anônimo)</div>
            <div style={{ color: '#b91c1c', fontSize: 10 }}>0800 000 0000 · denuncias@empresa.com.br</div>
          </div>
        </div>
      </div>

      {/* Rodapé */}
      <div style={{
        background: '#f9fafb', borderTop: '1px solid #e5e7eb',
        padding: '10px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ color: '#9ca3af', fontSize: 9 }}>{brandName} · POL-COM-001 · 2025</span>
        <span style={{ color: '#9ca3af', fontSize: 9 }}>{new Date().toLocaleDateString('pt-BR')}</span>
      </div>
    </div>
  );
};
