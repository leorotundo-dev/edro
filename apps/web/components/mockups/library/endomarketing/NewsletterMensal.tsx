'use client';

import React from 'react';

interface NewsletterMensalProps {
  brandName?: string;
  brandColor?: string;
  title?: string;
  headline?: string;
  name?: string;
  body?: string;
}

export const NewsletterMensal: React.FC<NewsletterMensalProps> = ({
  brandName = 'Empresa S.A.',
  brandColor = '#2563eb',
  title = 'Newsletter Mensal',
  headline = 'Março 2025',
  name = 'Comunicação Interna',
  body = 'Tudo que aconteceu em março — em um só lugar. Notícias, conquistas e próximos passos do time.',
}) => {
  const noticias = [
    {
      categoria: 'Pessoas', categoriaCor: '#3b82f6',
      titulo: 'Programa de Mentoria recebe 80 inscrições em 48h',
      trecho: 'O novo programa de mentoria interna superou todas as expectativas. Os pares serão anunciados até o dia 15.',
      imagem: '',
    },
    {
      categoria: 'Negócios', categoriaCor: '#059669',
      titulo: 'Empresa conquista contrato de R$ 8M com cliente estratégico',
      trecho: 'Após seis meses de negociação, fechamos parceria com uma das maiores redes varejistas do Brasil.',
      imagem: '',
    },
    {
      categoria: 'Cultura', categoriaCor: '#8b5cf6',
      titulo: 'Pesquisa de Clima aponta NPS Interno de 72 pontos',
      trecho: 'O resultado representa crescimento de 8 pontos em relação ao semestre anterior. Obrigado a todos!',
      imagem: '',
    },
  ];

  const categoriaCores: Record<string, string> = { Pessoas: '#3b82f6', Negócios: '#059669', Cultura: '#8b5cf6' };

  return (
    <div style={{
      width: 420, background: '#ffffff',
      borderRadius: 12, overflow: 'hidden',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
    }}>
      <style>{`
        @keyframes nm-art { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .nm-art { animation: nm-art 0.4s ease both; }
        .nm-art:nth-child(1){animation-delay:0.05s}
        .nm-art:nth-child(2){animation-delay:0.15s}
        .nm-art:nth-child(3){animation-delay:0.25s}
      `}</style>

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${brandColor}, #1d4ed8)`, padding: '26px 28px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11 }}>{brandName} · {name}</div>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.15)', borderRadius: 6, padding: '5px 12px',
          }}>
            <span style={{ color: 'white', fontSize: 12, fontWeight: 700 }}>{headline}</span>
          </div>
        </div>
        <h1 style={{ color: 'white', fontSize: 22, fontWeight: 900, margin: '0 0 4px' }}>{title}</h1>
        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, margin: 0 }}>{body}</p>
      </div>

      {/* Notícias */}
      <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 0 }}>
        {noticias.map((n, i) => (
          <div key={i} className="nm-art" style={{
            padding: '16px 0',
            borderBottom: i < noticias.length - 1 ? '1px solid #e5e7eb' : 'none',
          }}>
            {/* Imagem placeholder */}
            {n.imagem ? (
              <img src={n.imagem} alt={n.titulo} style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8, marginBottom: 10 }} />
            ) : (
              <div style={{
                width: '100%', height: 80, borderRadius: 8, marginBottom: 10,
                background: `linear-gradient(135deg, ${n.categoriaCor}15, ${n.categoriaCor}30)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `1px solid ${n.categoriaCor}20`,
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={n.categoriaCor} strokeWidth="1.5" style={{ opacity: 0.5 }}>
                  <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span style={{
                background: `${n.categoriaCor}15`, border: `1px solid ${n.categoriaCor}30`,
                color: n.categoriaCor, fontSize: 9, fontWeight: 700,
                padding: '2px 8px', borderRadius: 10,
              }}>{n.categoria}</span>
            </div>
            <h2 style={{ color: '#111827', fontSize: 14, fontWeight: 800, margin: '0 0 6px', lineHeight: 1.35 }}>{n.titulo}</h2>
            <p style={{ color: '#6b7280', fontSize: 11, margin: '0 0 8px', lineHeight: 1.5 }}>{n.trecho}</p>
            <button type="button" aria-label={`Ler mais sobre ${n.titulo}`} style={{
              background: 'none', border: 'none',
              color: brandColor, fontSize: 10, fontWeight: 700,
              padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
            }}>
              Leia mais
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ background: '#f9fafb', borderTop: '1px solid #e5e7eb', padding: '12px 28px', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: '#9ca3af', fontSize: 10 }}>{brandName} · Comunicação Interna</span>
        <span style={{ color: '#9ca3af', fontSize: 10 }}>{new Date().toLocaleDateString('pt-BR')}</span>
      </div>
    </div>
  );
};
