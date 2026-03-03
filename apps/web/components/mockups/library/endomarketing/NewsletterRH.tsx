'use client';

import React from 'react';

interface NewsletterRHProps {
  brandName?: string;
  brandColor?: string;
  title?: string;
  headline?: string;
  name?: string;
  body?: string;
  profileImage?: string;
}

export const NewsletterRH: React.FC<NewsletterRHProps> = ({
  brandName = 'Empresa S.A.',
  brandColor = '#7c3aed',
  title = 'Boletim de RH',
  headline = 'Março 2025',
  name = 'Recursos Humanos',
  body = 'O time de RH está aqui para apoiar cada colaborador. Veja as principais novidades deste mês: vagas, treinamentos e lembretes importantes.',
  profileImage = '',
}) => {
  const secoes = [
    {
      icone: '💼',
      titulo: 'Vagas Internas',
      cor: '#3b82f6',
      items: [
        'Analista de Dados Pleno — Tecnologia · Híbrido',
        'Coordenador de Logística — Operações · SP',
        'Desenvolvedor Back-End Sênior — TI · Remoto',
      ],
    },
    {
      icone: '📚',
      titulo: 'Treinamentos',
      cor: '#059669',
      items: [
        'NR-35 Trabalho em Altura — 10/03 08h · Obrigatório',
        'Excel Avançado — 12/03 14h · 8 vagas restantes',
        'Gestão do Tempo — 20/03 10h · Online',
      ],
    },
    {
      icone: '📌',
      titulo: 'Lembretes',
      cor: '#f59e0b',
      items: [
        'Ponto eletrônico: prazo de revisão até 25/03',
        'Atualização de dados bancários via portal até 31/03',
        'Pesquisa de clima: participe até 15/03',
      ],
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
        @keyframes rh-sec { from{opacity:0;transform:translateX(-6px)} to{opacity:1;transform:translateX(0)} }
        .rh-sec { animation: rh-sec 0.4s ease both; }
        .rh-sec:nth-child(1){animation-delay:0.05s}
        .rh-sec:nth-child(2){animation-delay:0.15s}
        .rh-sec:nth-child(3){animation-delay:0.25s}
      `}</style>

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${brandColor}, #6d28d9)`, padding: '24px 28px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          {/* RH team photo area */}
          <div style={{
            width: 52, height: 52, borderRadius: 12,
            background: 'rgba(255,255,255,0.2)',
            border: '2px solid rgba(255,255,255,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', flexShrink: 0,
          }}>
            {profileImage ? (
              <img src={profileImage} alt="Equipe RH" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            )}
          </div>
          <div>
            <h1 style={{ color: 'white', fontSize: 19, fontWeight: 900, margin: 0 }}>{title}</h1>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, margin: 0 }}>{brandName} · {name} · {headline}</p>
          </div>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, margin: 0, lineHeight: 1.5 }}>{body}</p>
      </div>

      {/* Seções */}
      <div style={{ padding: '18px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {secoes.map((s, si) => (
          <div key={si} className="rh-sec">
            {/* Cabeçalho da seção */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                background: `${s.cor}15`, border: `1px solid ${s.cor}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14,
              }}>{s.icone}</div>
              <span style={{ color: '#111827', fontSize: 13, fontWeight: 800 }}>{s.titulo}</span>
              <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
            </div>
            {/* Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, paddingLeft: 8 }}>
              {s.items.map((item, ii) => (
                <div key={ii} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: s.cor, flexShrink: 0, marginTop: 4,
                  }} />
                  <span style={{ color: '#374151', fontSize: 11, lineHeight: 1.4 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={{ padding: '0 28px 22px' }}>
        <div style={{
          background: `${brandColor}0d`, border: `1px solid ${brandColor}25`,
          borderRadius: 10, padding: '12px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
        }}>
          <span style={{ color: '#374151', fontSize: 11 }}>Dúvidas? Fale com o RH:</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ color: brandColor, fontSize: 11, fontWeight: 700 }}>rh@empresa.com.br</span>
            <span style={{ color: '#9ca3af', fontSize: 11 }}>·</span>
            <span style={{ color: brandColor, fontSize: 11, fontWeight: 700 }}>Ramal 200</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: '#f9fafb', borderTop: '1px solid #e5e7eb', padding: '12px 28px', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: '#9ca3af', fontSize: 10 }}>{brandName} · Recursos Humanos</span>
        <span style={{ color: '#9ca3af', fontSize: 10 }}>{new Date().toLocaleDateString('pt-BR')}</span>
      </div>
    </div>
  );
};
