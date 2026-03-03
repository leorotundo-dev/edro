'use client';

import React from 'react';

interface NewsletterEventosProps {
  brandName?: string;
  brandColor?: string;
  title?: string;
  headline?: string;
  name?: string;
  body?: string;
}

export const NewsletterEventos: React.FC<NewsletterEventosProps> = ({
  brandName = 'Empresa S.A.',
  brandColor = '#7c3aed',
  title = 'Agenda de Eventos',
  headline = 'Março 2025',
  name = 'Comunicação Interna',
  body = 'Confira os próximos eventos corporativos e reserve sua vaga! Participe, conecte-se com o time e aproveite cada oportunidade de aprendizado e integração.',
}) => {
  const eventos = [
    {
      dia: '12', mes: 'MAR', hora: '14h00',
      titulo: 'Town Hall Trimestral',
      local: 'Auditório Principal · São Paulo',
      formato: 'Presencial',
      formatoCor: '#3b82f6',
      desc: 'Resultados Q1, metas Q2 e reconhecimento de colaboradores destaque.',
    },
    {
      dia: '19', mes: 'MAR', hora: '09h00',
      titulo: 'Workshop: Comunicação Não-Violenta',
      local: 'Sala de Treinamento B · Online',
      formato: 'Híbrido',
      formatoCor: '#059669',
      desc: 'Facilitado pela consultora Dra. Ana Braga. Vagas limitadas a 30 participantes.',
    },
    {
      dia: '28', mes: 'MAR', hora: '18h00',
      titulo: 'Happy Hour de Boas-Vindas',
      local: 'Terraço da empresa · SP',
      formato: 'Presencial',
      formatoCor: '#3b82f6',
      desc: 'Integração com os novos colaboradores que chegaram neste trimestre.',
    },
  ];

  return (
    <div style={{
      width: 420, background: '#ffffff',
      borderRadius: 12, overflow: 'hidden',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
    }}>
      <style>{`
        @keyframes ne-card { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .ne-card { animation: ne-card 0.4s ease both; }
        .ne-card:nth-child(1){animation-delay:0.05s}
        .ne-card:nth-child(2){animation-delay:0.15s}
        .ne-card:nth-child(3){animation-delay:0.25s}
      `}</style>

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${brandColor}, #6d28d9)`, padding: '26px 28px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11 }}>{brandName} · {name}</div>
            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10 }}>{headline}</div>
          </div>
          <div style={{ fontSize: 30 }}>📅</div>
        </div>
        <h1 style={{ color: 'white', fontSize: 20, fontWeight: 900, margin: '0 0 4px' }}>{title}</h1>
        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, margin: 0 }}>{body}</p>
      </div>

      {/* Eventos */}
      <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {eventos.map((ev, i) => (
          <div key={i} className="ne-card" style={{
            display: 'flex', gap: 14,
            background: '#f9fafb', borderRadius: 10, padding: '14px 14px',
            border: '1px solid #e5e7eb',
          }}>
            {/* Data */}
            <div style={{
              width: 44, height: 44, borderRadius: 8, flexShrink: 0,
              background: `${brandColor}15`, border: `1px solid ${brandColor}30`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ color: brandColor, fontSize: 16, fontWeight: 900, lineHeight: 1 }}>{ev.dia}</div>
              <div style={{ color: brandColor, fontSize: 8, fontWeight: 700, letterSpacing: 0.5 }}>{ev.mes}</div>
            </div>
            {/* Conteúdo */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                <span style={{ color: '#111827', fontSize: 13, fontWeight: 800 }}>{ev.titulo}</span>
                <span style={{
                  background: `${ev.formatoCor}15`, border: `1px solid ${ev.formatoCor}30`,
                  color: ev.formatoCor, fontSize: 8, fontWeight: 700,
                  padding: '2px 7px', borderRadius: 10, flexShrink: 0,
                }}>{ev.formato}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 5 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
                <span style={{ color: '#9ca3af', fontSize: 9 }}>{ev.hora}</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
                </svg>
                <span style={{ color: '#9ca3af', fontSize: 9 }}>{ev.local}</span>
              </div>
              <p style={{ color: '#6b7280', fontSize: 10, margin: 0, lineHeight: 1.4 }}>{ev.desc}</p>
              <button type="button" aria-label={`Confirmar presença em ${ev.titulo}`} style={{
                background: 'none', border: `1px solid ${brandColor}40`,
                color: brandColor, fontSize: 9, fontWeight: 700,
                padding: '4px 12px', borderRadius: 6, cursor: 'pointer', marginTop: 8,
              }}>
                Confirmar presença →
              </button>
            </div>
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
