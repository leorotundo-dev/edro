'use client';

import React from 'react';

interface PoliticaPrivacidadeProps {
  brandName?: string;
  brandColor?: string;
  name?: string;
  title?: string;
  headline?: string;
  body?: string;
  image?: string;
}

export const PoliticaPrivacidade: React.FC<PoliticaPrivacidadeProps> = ({
  brandName = 'Empresa S.A.',
  brandColor = '#1e40af',
  name = 'Jurídico & Compliance',
  title = 'Política de Privacidade e Proteção de Dados',
  headline = 'Conforme Lei Geral de Proteção de Dados — LGPD (Lei 13.709/2018)',
  body = 'Esta política descreve como coletamos, armazenamos e tratamos dados pessoais de colaboradores e terceiros, em conformidade com a LGPD e demais normas aplicáveis.',
  image = '',
}) => {
  const categorias = [
    { tipo: 'Dados Pessoais', exemplos: 'Nome, CPF, RG, data de nascimento, endereço', retencao: '5 anos após término', cor: '#3b82f6' },
    { tipo: 'Dados Financeiros', exemplos: 'Salário, conta bancária, benefícios, IR', retencao: '10 anos (obrigação legal)', cor: '#f59e0b' },
    { tipo: 'Dados Comportamentais', exemplos: 'Acessos a sistemas, logs de uso, avaliações', retencao: '2 anos', cor: '#8b5cf6' },
    { tipo: 'Dados Sensíveis', exemplos: 'Saúde, biometria, dados sindicais', retencao: '5 anos (com consentimento)', cor: '#ef4444' },
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
        @keyframes pp-row { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
        .pp-row { animation: pp-row 0.35s ease both; }
        .pp-row:nth-child(1){animation-delay:0.05s}
        .pp-row:nth-child(2){animation-delay:0.12s}
        .pp-row:nth-child(3){animation-delay:0.19s}
        .pp-row:nth-child(4){animation-delay:0.26s}
      `}</style>

      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${brandColor} 0%, #1e3a8a 100%)`,
        padding: '20px 26px 16px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 8,
              background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {image ? (
                <img src={image} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 6 }} />
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
              )}
            </div>
            <div>
              <h1 style={{ color: 'white', fontSize: 13, fontWeight: 900, margin: 0, lineHeight: 1.2 }}>{title}</h1>
              <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, margin: 0 }}>{brandName} · {name}</p>
            </div>
          </div>
          {/* Selo LGPD */}
          <div style={{
            background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.4)',
            borderRadius: 6, padding: '5px 10px', textAlign: 'center', flexShrink: 0,
          }}>
            <div style={{ color: 'white', fontSize: 12, fontWeight: 900 }}>LGPD</div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 8 }}>Conformidade</div>
          </div>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9, margin: 0 }}>{headline}</p>
      </div>

      {/* Intro */}
      <div style={{ padding: '14px 24px 10px' }}>
        <p style={{ color: '#4b5563', fontSize: 11, lineHeight: 1.65, margin: 0 }}>{body}</p>
      </div>

      {/* Tabela de categorias */}
      <div style={{ padding: '0 24px 12px' }}>
        <div style={{ color: '#6b7280', fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
          Categorias de dados tratados
        </div>

        {/* Cabeçalho */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1.2fr 2fr 1.3fr',
          background: '#f3f4f6', borderRadius: '6px 6px 0 0',
          padding: '6px 10px', borderBottom: '1px solid #e5e7eb',
        }}>
          {['Categoria', 'Exemplos', 'Retenção'].map((h, i) => (
            <span key={i} style={{ color: '#6b7280', fontSize: 8, fontWeight: 700, textTransform: 'uppercase' }}>{h}</span>
          ))}
        </div>

        <div style={{ border: '1px solid #e5e7eb', borderTop: 'none', borderRadius: '0 0 6px 6px', overflow: 'hidden' }}>
          {categorias.map((cat, i) => (
            <div key={i} className="pp-row" style={{
              display: 'grid', gridTemplateColumns: '1.2fr 2fr 1.3fr',
              padding: '9px 10px', alignItems: 'flex-start',
              borderBottom: i < categorias.length - 1 ? '1px solid #f3f4f6' : 'none',
              background: i % 2 === 0 ? '#fff' : '#fafafa',
              borderLeft: `3px solid ${cat.cor}`,
            }}>
              <span style={{ color: cat.cor, fontSize: 10, fontWeight: 700 }}>{cat.tipo}</span>
              <span style={{ color: '#6b7280', fontSize: 9, lineHeight: 1.4 }}>{cat.exemplos}</span>
              <span style={{ color: '#374151', fontSize: 9, fontWeight: 600 }}>{cat.retencao}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Direitos */}
      <div style={{ padding: '0 24px 20px' }}>
        <div style={{
          background: '#eff6ff', border: '1px solid #bfdbfe',
          borderRadius: 8, padding: '10px 14px',
        }}>
          <div style={{ color: '#1d4ed8', fontSize: 10, fontWeight: 700, marginBottom: 6 }}>
            Seus direitos (Art. 18 LGPD)
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {['Acesso', 'Correção', 'Exclusão', 'Portabilidade', 'Revogação'].map((d, i) => (
              <span key={i} style={{
                background: `${brandColor}15`, border: `1px solid ${brandColor}30`,
                color: brandColor, fontSize: 9, fontWeight: 600,
                padding: '3px 8px', borderRadius: 20,
              }}>{d}</span>
            ))}
          </div>
          <div style={{ color: '#1e40af', fontSize: 9, marginTop: 6 }}>
            Encarregado (DPO): dpo@empresa.com.br
          </div>
        </div>
      </div>

      {/* Rodapé */}
      <div style={{
        background: '#f9fafb', borderTop: '1px solid #e5e7eb',
        padding: '10px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ color: '#9ca3af', fontSize: 9 }}>{brandName} · POL-JUR-002 · 2025</span>
        <span style={{ color: '#9ca3af', fontSize: 9 }}>{new Date().toLocaleDateString('pt-BR')}</span>
      </div>
    </div>
  );
};
