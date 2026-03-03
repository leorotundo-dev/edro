'use client';

import React from 'react';

interface NewsletterSemanalProps {
  brandName?: string;
  brandColor?: string;
  title?: string;
  headline?: string;
  name?: string;
  body?: string;
}

export const NewsletterSemanal: React.FC<NewsletterSemanalProps> = ({
  brandName = 'Empresa S.A.',
  brandColor = '#2563eb',
  title = 'Flash Semanal',
  headline = 'Semana de 03 a 07/03/2025',
  name = 'Comunicação Interna',
  body = 'Tudo que você precisa saber desta semana — rápido e direto. Cinco notícias, cinco minutos.',
}) => {
  const noticias = [
    { num: 1, categoria: 'Pessoas', categoriaCor: '#3b82f6', texto: 'Programa de Mentoria abre inscrições: 80 vagas disponíveis para todos os colaboradores. Prazo até 10/03.' },
    { num: 2, categoria: 'Negócios', categoriaCor: '#059669', texto: 'Novo cliente estratégico fechado pela equipe Comercial: contrato de R$ 8M por 24 meses.' },
    { num: 3, categoria: 'TI', categoriaCor: '#8b5cf6', texto: 'Manutenção programada nos sistemas no sábado 08/03, das 00h às 06h. Planeje seus acessos.' },
    { num: 4, categoria: 'RH', categoriaCor: '#f59e0b', texto: 'Lembrete: entrega do formulário de atualização de dados bancários até 25/03 pelo portal.' },
    { num: 5, categoria: 'Cultura', categoriaCor: '#ec4899', texto: 'Happy Hour de Boas-Vindas aos novos colaboradores: 28/03 às 18h no Terraço. Presença confirmada?' },
  ];

  return (
    <div style={{
      width: 420, background: '#ffffff',
      borderRadius: 12, overflow: 'hidden',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
    }}>
      <style>{`
        @keyframes nsm-item { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
        .nsm-item { animation: nsm-item 0.35s ease both; }
        .nsm-item:nth-child(1){animation-delay:0.05s}
        .nsm-item:nth-child(2){animation-delay:0.12s}
        .nsm-item:nth-child(3){animation-delay:0.19s}
        .nsm-item:nth-child(4){animation-delay:0.26s}
        .nsm-item:nth-child(5){animation-delay:0.33s}
      `}</style>

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${brandColor}, #1d4ed8)`, padding: '22px 28px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11 }}>{brandName} · {name}</div>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
            borderRadius: 6, padding: '4px 10px',
          }}>
            <span style={{ color: 'white', fontSize: 9, fontWeight: 700 }}>{headline}</span>
          </div>
        </div>
        <h1 style={{ color: 'white', fontSize: 21, fontWeight: 900, margin: '0 0 4px' }}>{title}</h1>
        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, margin: 0 }}>{body}</p>
      </div>

      {/* Lista de notícias */}
      <div style={{ padding: '18px 28px', display: 'flex', flexDirection: 'column', gap: 0 }}>
        {noticias.map((n, i) => (
          <div key={i} className="nsm-item" style={{
            display: 'flex', gap: 14, alignItems: 'flex-start',
            padding: '12px 0',
            borderBottom: i < noticias.length - 1 ? '1px solid #f3f4f6' : 'none',
          }}>
            {/* Número */}
            <div style={{
              width: 28, height: 28, borderRadius: 7, flexShrink: 0,
              background: `${n.categoriaCor}12`, border: `1px solid ${n.categoriaCor}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ color: n.categoriaCor, fontSize: 12, fontWeight: 900 }}>{n.num}</span>
            </div>
            {/* Conteúdo */}
            <div style={{ flex: 1 }}>
              <span style={{
                background: `${n.categoriaCor}12`, border: `1px solid ${n.categoriaCor}25`,
                color: n.categoriaCor, fontSize: 8, fontWeight: 700,
                padding: '2px 7px', borderRadius: 10, display: 'inline-block', marginBottom: 5,
              }}>{n.categoria}</span>
              <p style={{ color: '#374151', fontSize: 12, margin: 0, lineHeight: 1.5 }}>{n.texto}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Aviso leitura rápida */}
      <div style={{ padding: '0 28px 22px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: '#f0f9ff', border: '1px solid #bae6fd',
          borderRadius: 8, padding: '10px 14px',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0891b2" strokeWidth="2" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
          <span style={{ color: '#0c4a6e', fontSize: 11 }}>
            Receba o Flash Semanal toda segunda-feira no seu e-mail corporativo.
          </span>
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: '#f9fafb', borderTop: '1px solid #e5e7eb', padding: '12px 28px', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: '#9ca3af', fontSize: 10 }}>{brandName} · Comunicação Interna</span>
        <span style={{ color: '#9ca3af', fontSize: 10 }}>{new Date().toLocaleDateString('pt-BR')}</span>
      </div>
    </div>
  );
};
