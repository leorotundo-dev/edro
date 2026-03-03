'use client';

import React from 'react';

interface NewsletterNovosFuncionariosProps {
  brandName?: string;
  brandColor?: string;
  title?: string;
  headline?: string;
  name?: string;
  body?: string;
}

export const NewsletterNovosFuncionarios: React.FC<NewsletterNovosFuncionariosProps> = ({
  brandName = 'Empresa S.A.',
  brandColor = '#10b981',
  title = 'Novos no Time!',
  headline = 'Março 2025',
  name = 'Recursos Humanos',
  body = 'Que tal dar as boas-vindas a quem chegou esse mês? Apresente-se no corredor, no chat ou nos grupos de afinidade. O time cresce e fica ainda mais forte!',
}) => {
  const novatos = [
    { nome: 'Larissa Moura', cargo: 'Desenvolvedora Front-End', depto: 'Tecnologia', avatar: 'LM', cor: '#3b82f6', fato: 'Fã de escalada e voluntária em projetos de tecnologia social.' },
    { nome: 'Gabriel Torres', cargo: 'Analista de Marketing', depto: 'Marketing', avatar: 'GT', cor: '#8b5cf6', fato: 'Toca violão em banda de rock cover nos fins de semana.' },
    { nome: 'Beatriz Nunes', cargo: 'Gerente de Contas', depto: 'Comercial', avatar: 'BN', cor: '#f59e0b', fato: 'Viajou para 18 países e coleciona selos de passaporte.' },
    { nome: 'Thiago Carvalho', cargo: 'Analista de BI', depto: 'Dados', avatar: 'TC', cor: '#ef4444', fato: 'Maratonista amador — já completou 3 maratonas em cidades diferentes.' },
  ];

  return (
    <div style={{
      width: 420, background: '#ffffff',
      borderRadius: 12, overflow: 'hidden',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
    }}>
      <style>{`
        @keyframes nnf-card { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .nnf-card { animation: nnf-card 0.4s ease both; }
        .nnf-card:nth-child(1){animation-delay:0.05s}
        .nnf-card:nth-child(2){animation-delay:0.13s}
        .nnf-card:nth-child(3){animation-delay:0.21s}
        .nnf-card:nth-child(4){animation-delay:0.29s}
        @keyframes nnf-wave { 0%,100%{transform:rotate(0deg)} 25%{transform:rotate(20deg)} 75%{transform:rotate(-10deg)} }
        .nnf-wave { display:inline-block; animation: nnf-wave 1.2s ease 0.5s 3; }
      `}</style>

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${brandColor}, #059669)`, padding: '26px 28px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11 }}>{brandName} · {name}</div>
            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10 }}>{headline}</div>
          </div>
          <span className="nnf-wave" style={{ fontSize: 30 }}>👋</span>
        </div>
        <h1 style={{ color: 'white', fontSize: 22, fontWeight: 900, margin: '0 0 4px' }}>{title}</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, margin: 0 }}>{body}</p>
      </div>

      {/* Cards */}
      <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {novatos.map((p, i) => (
          <div key={i} className="nnf-card" style={{
            display: 'flex', gap: 14, alignItems: 'flex-start',
            background: '#f9fafb', borderRadius: 10, padding: '14px',
            border: '1px solid #e5e7eb', borderLeft: `3px solid ${p.cor}`,
          }}>
            {/* Avatar */}
            <div style={{
              width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
              background: `linear-gradient(135deg, ${p.cor}, ${p.cor}aa)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: 14, fontWeight: 800,
            }}>{p.avatar}</div>
            {/* Info */}
            <div style={{ flex: 1 }}>
              <div style={{ color: '#111827', fontSize: 13, fontWeight: 800, marginBottom: 1 }}>{p.nome}</div>
              <div style={{ color: '#374151', fontSize: 11, marginBottom: 2 }}>{p.cargo}</div>
              <span style={{
                background: `${p.cor}12`, border: `1px solid ${p.cor}30`,
                color: p.cor, fontSize: 8, fontWeight: 700,
                padding: '2px 7px', borderRadius: 10, display: 'inline-block', marginBottom: 6,
              }}>{p.depto}</span>
              <div style={{
                display: 'flex', gap: 5, alignItems: 'flex-start',
              }}>
                <span style={{ fontSize: 12, flexShrink: 0 }}>💬</span>
                <p style={{ color: '#6b7280', fontSize: 10, margin: 0, lineHeight: 1.4, fontStyle: 'italic' }}>
                  "{p.fato}"
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={{ padding: '0 28px 22px' }}>
        <div style={{
          background: `${brandColor}0d`, border: `1px solid ${brandColor}25`,
          borderRadius: 10, padding: '14px 16px', textAlign: 'center',
        }}>
          <p style={{ color: '#374151', fontSize: 11, margin: '0 0 10px', lineHeight: 1.5 }}>
            Apresente-se no canal <strong>#boas-vindas</strong> do Teams e mande uma mensagem para os novos colegas!
          </p>
          <button type="button" aria-label="Acessar canal de boas-vindas" style={{
            background: brandColor, color: 'white', border: 'none',
            borderRadius: 8, padding: '9px 22px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}>
            Dar Boas-Vindas 👋
          </button>
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: '#f9fafb', borderTop: '1px solid #e5e7eb', padding: '12px 28px', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: '#9ca3af', fontSize: 10 }}>{brandName} · RH · Integração</span>
        <span style={{ color: '#9ca3af', fontSize: 10 }}>{new Date().toLocaleDateString('pt-BR')}</span>
      </div>
    </div>
  );
};
