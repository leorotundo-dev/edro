'use client';

import React from 'react';

interface NewsletterBeneficiosProps {
  brandName?: string;
  brandColor?: string;
  title?: string;
  headline?: string;
  name?: string;
}

export const NewsletterBeneficios: React.FC<NewsletterBeneficiosProps> = ({
  brandName = 'Empresa S.A.',
  brandColor = '#0891b2',
  title = 'Atualização de Benefícios',
  headline = '1º Semestre 2025',
  name = 'RH',
}) => {
  const beneficios = [
    { icone: '🏥', nome: 'Plano de Saúde', tag: 'ATUALIZADO', tagCor: '#f59e0b', desc: 'Ampliação da rede credenciada em SP e RJ. Novos hospitais e clínicas parceiras.' },
    { icone: '🦷', nome: 'Plano Odontológico', tag: 'NOVO', tagCor: '#22c55e', desc: 'Cobertura para implantes e ortodontia a partir de abril. Sem carência para procedimentos básicos.' },
    { icone: '🍽️', nome: 'Vale-Refeição', tag: 'ATUALIZADO', tagCor: '#f59e0b', desc: 'Reajuste de 15% no valor diário. Aceito em mais de 500 novos estabelecimentos.' },
    { icone: '🚌', nome: 'Vale-Transporte', tag: 'SEM ALTERAÇÃO', tagCor: '#6b7280', desc: 'Mantido nos mesmos termos do contrato anterior.' },
    { icone: '📚', nome: 'Auxílio Educação', tag: 'NOVO', tagCor: '#22c55e', desc: 'Reembolso de até R$ 500/mês para graduação, pós-graduação e idiomas.' },
  ];

  return (
    <div style={{
      width: 420, background: '#ffffff',
      borderRadius: 12, overflow: 'hidden',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
    }}>
      <style>{`
        @keyframes ben-in { from{opacity:0;transform:translateX(-6px)} to{opacity:1;transform:translateX(0)} }
        .ben-item { animation: ben-in 0.35s ease both; }
        .ben-item:nth-child(1){animation-delay:0.05s}
        .ben-item:nth-child(2){animation-delay:0.12s}
        .ben-item:nth-child(3){animation-delay:0.19s}
        .ben-item:nth-child(4){animation-delay:0.26s}
        .ben-item:nth-child(5){animation-delay:0.33s}
      `}</style>

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${brandColor}, #06b6d4)`, padding: '26px 28px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11 }}>{brandName} · {name}</div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10 }}>{headline}</div>
          </div>
          <div style={{ fontSize: 32 }}>💎</div>
        </div>
        <h1 style={{ color: 'white', fontSize: 20, fontWeight: 900, margin: 0 }}>{title}</h1>
        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, margin: '6px 0 0' }}>
          Conheça as atualizações do seu pacote de benefícios
        </p>
      </div>

      {/* Intro */}
      <div style={{ padding: '18px 28px 10px' }}>
        <p style={{ color: '#4b5563', fontSize: 12, lineHeight: 1.6, margin: 0 }}>
          Temos o prazer de comunicar importantes atualizações no nosso pacote de benefícios, refletindo nosso compromisso com o bem-estar de todos os colaboradores.
        </p>
      </div>

      {/* Benefits list */}
      <div style={{ padding: '8px 28px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {beneficios.map((b, i) => (
          <div key={i} className="ben-item" style={{
            display: 'flex', gap: 12, alignItems: 'flex-start',
            background: '#f9fafb', borderRadius: 10, padding: '12px 14px',
            border: '1px solid #e5e7eb',
          }}>
            <div style={{ fontSize: 24, flexShrink: 0, lineHeight: 1 }}>{b.icone}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <span style={{ color: '#111827', fontWeight: 700, fontSize: 13 }}>{b.nome}</span>
                <span style={{
                  background: `${b.tagCor}18`, border: `1px solid ${b.tagCor}44`,
                  color: b.tagCor, fontSize: 8, fontWeight: 700,
                  padding: '2px 6px', borderRadius: 3,
                }}>{b.tag}</span>
              </div>
              <p style={{ color: '#6b7280', fontSize: 11, margin: 0, lineHeight: 1.5 }}>{b.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={{ padding: '0 28px 22px' }}>
        <div style={{ background: `${brandColor}10`, borderRadius: 10, padding: '14px 18px', border: `1px solid ${brandColor}25` }}>
          <p style={{ color: '#374151', fontSize: 12, margin: '0 0 10px', lineHeight: 1.5 }}>
            Para dúvidas ou solicitações, acesse o portal do colaborador ou entre em contato com o RH pelo ramal 200.
          </p>
          <button type="button" aria-label="Acessar portal de benefícios" style={{
            background: brandColor, color: 'white', border: 'none',
            borderRadius: 8, padding: '9px 22px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}>
            Ver Meus Benefícios
          </button>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        background: '#f9fafb', borderTop: '1px solid #e5e7eb',
        padding: '12px 28px', display: 'flex', justifyContent: 'space-between',
      }}>
        <span style={{ color: '#9ca3af', fontSize: 10 }}>{brandName} · RH</span>
        <span style={{ color: '#9ca3af', fontSize: 10 }}>{new Date().toLocaleDateString('pt-BR')}</span>
      </div>
    </div>
  );
};
