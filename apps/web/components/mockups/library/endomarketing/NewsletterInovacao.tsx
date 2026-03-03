'use client';

import React from 'react';

interface NewsletterInovacaoProps {
  brandName?: string;
  brandColor?: string;
  title?: string;
  headline?: string;
  name?: string;
  body?: string;
  description?: string;
}

export const NewsletterInovacao: React.FC<NewsletterInovacaoProps> = ({
  brandName = 'Empresa S.A.',
  brandColor = '#f59e0b',
  title = 'Inovação em Foco',
  headline = 'Edição #12 · Março 2025',
  name = 'Lab de Inovação',
  body = 'Neste mês, nosso time de inovação lançou um novo assistente de atendimento com IA que reduziu o tempo de resposta ao cliente em 40%. Conheça a história por trás dessa conquista.',
  description = '',
}) => {
  return (
    <div style={{
      width: 420, background: '#ffffff',
      borderRadius: 12, overflow: 'hidden',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
    }}>
      <style>{`
        @keyframes ni-bulb { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.7;transform:scale(1.1)} }
        .ni-bulb { animation: ni-bulb 3s ease-in-out infinite; }
        @keyframes ni-fade { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .ni-body { animation: ni-fade 0.5s ease both 0.2s; }
      `}</style>

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, #1c1c1c 0%, #292929 100%)`, padding: '26px 28px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>{brandName} · {name}</div>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10 }}>{headline}</div>
          </div>
          <div className="ni-bulb" style={{ fontSize: 30 }}>💡</div>
        </div>
        <h1 style={{ color: brandColor, fontSize: 22, fontWeight: 900, margin: '0 0 4px' }}>{title}</h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, margin: 0 }}>Novidades do Lab de Inovação</p>
      </div>

      {/* Featured story */}
      <div className="ni-body" style={{ padding: '20px 28px 14px' }}>
        <div style={{
          background: `${brandColor}10`, border: `1px solid ${brandColor}25`,
          borderRadius: 10, padding: '16px',
          borderLeft: `4px solid ${brandColor}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <span style={{
              background: brandColor, color: '#1c1c1c',
              fontSize: 8, fontWeight: 900, padding: '2px 8px', borderRadius: 3,
              textTransform: 'uppercase',
            }}>Destaque do mês</span>
          </div>
          <h2 style={{ color: '#111827', fontSize: 15, fontWeight: 800, margin: '0 0 8px', lineHeight: 1.3 }}>
            Assistente de Atendimento com IA reduz tempo de resposta em 40%
          </h2>
          <p style={{ color: '#4b5563', fontSize: 11, lineHeight: 1.65, margin: '0 0 12px' }}>{body}</p>
          <div style={{ display: 'flex', gap: 10 }}>
            {[
              { val: '40%', label: 'Redução tempo' },
              { val: '3 meses', label: 'Desenvolvimento' },
              { val: '5 devs', label: 'Time' },
            ].map((s, i) => (
              <div key={i} style={{
                flex: 1, background: '#ffffff', borderRadius: 7, padding: '8px',
                textAlign: 'center', border: '1px solid #e5e7eb',
              }}>
                <div style={{ color: brandColor, fontSize: 14, fontWeight: 900 }}>{s.val}</div>
                <div style={{ color: '#9ca3af', fontSize: 9 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Outras notícias */}
      <div style={{ padding: '0 28px 14px' }}>
        <div style={{ color: '#6b7280', fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
          Mais do lab
        </div>
        {[
          { icone: '🚀', titulo: 'Hackathon Interno', desc: 'Inscrições abertas até 20/03. Prêmio de R$ 5.000 para o time vencedor.' },
          { icone: '📊', titulo: 'Dashboard de Dados ao Vivo', desc: 'Nova ferramenta de BI disponível para todos os gestores no portal.' },
        ].map((item, i) => (
          <div key={i} style={{
            display: 'flex', gap: 10, padding: '10px 0',
            borderBottom: i === 0 ? '1px solid #f3f4f6' : 'none',
          }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>{item.icone}</span>
            <div>
              <div style={{ color: '#111827', fontSize: 12, fontWeight: 700, marginBottom: 2 }}>{item.titulo}</div>
              <div style={{ color: '#6b7280', fontSize: 10, lineHeight: 1.4 }}>{item.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA envio de ideias */}
      <div style={{ padding: '0 28px 22px' }}>
        <div style={{
          background: 'linear-gradient(135deg, #1c1c1c, #292929)',
          borderRadius: 10, padding: '14px 16px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ fontSize: 28 }}>🗃️</div>
          <div style={{ flex: 1 }}>
            <div style={{ color: brandColor, fontSize: 12, fontWeight: 800, marginBottom: 2 }}>Submeta sua ideia</div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10 }}>Prazo: 31/03/2025 · Portal de Ideias → Inovação</div>
          </div>
          <button type="button" aria-label="Enviar ideia de inovação" style={{
            background: brandColor, color: '#1c1c1c', border: 'none',
            borderRadius: 7, padding: '8px 14px', fontSize: 11, fontWeight: 800, cursor: 'pointer', flexShrink: 0,
          }}>
            Enviar →
          </button>
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: '#f9fafb', borderTop: '1px solid #e5e7eb', padding: '12px 28px', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: '#9ca3af', fontSize: 10 }}>{brandName} · Lab de Inovação</span>
        <span style={{ color: '#9ca3af', fontSize: 10 }}>{new Date().toLocaleDateString('pt-BR')}</span>
      </div>
    </div>
  );
};
