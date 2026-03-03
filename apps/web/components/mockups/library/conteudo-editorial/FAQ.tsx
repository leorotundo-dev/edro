'use client';

import React, { useState } from 'react';

interface FAQProps {
  headline?: string;
  title?: string;
  name?: string;
  body?: string;
  text?: string;
  description?: string;
  caption?: string;
  username?: string;
  brandName?: string;
  brandColor?: string;
}

export const FAQ: React.FC<FAQProps> = ({
  headline,
  title,
  name,
  body,
  text,
  description,
  caption,
  brandName,
  brandColor = '#2563eb',
}) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const resolvedTitle = headline || title || name || 'Perguntas Frequentes';
  const resolvedSubtitle =
    body || text || description || caption ||
    'Encontre respostas para as dúvidas mais comuns sobre nossos produtos e serviços.';
  const resolvedBrand = brandName || 'Nossa Empresa';
  const accent = brandColor || '#2563eb';

  const faqs = [
    {
      q: `Como funciona o processo de contratação da ${resolvedBrand}?`,
      a: 'Nosso processo é 100% digital e leva apenas 3 minutos. Escolha o plano ideal, preencha seus dados e pronto — acesso imediato ao painel completo sem burocracia.',
    },
    {
      q: 'Existe período de teste gratuito disponível?',
      a: 'Sim! Oferecemos 14 dias de teste gratuito com acesso a todas as funcionalidades do plano Pro. Não é necessário cartão de crédito para começar.',
    },
    {
      q: 'Posso cancelar minha assinatura a qualquer momento?',
      a: 'Absolutamente. Você pode cancelar quando quiser, diretamente pelo painel, sem taxas de cancelamento ou burocracia. Sem fidelidade mínima.',
    },
    {
      q: 'Quais formas de pagamento são aceitas?',
      a: 'Aceitamos cartão de crédito (Visa, Mastercard, Amex), PIX, boleto bancário e transferência bancária para planos anuais corporativos.',
    },
    {
      q: 'O suporte técnico está incluído em todos os planos?',
      a: 'Sim. Todos os planos incluem suporte via chat e e-mail em horário comercial. O plano Pro adiciona suporte prioritário 24/7 e gerente de conta dedicado.',
    },
  ];

  return (
    <div
      style={{
        width: '420px',
        background: '#ffffff',
        borderRadius: '14px',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
        border: '1px solid #e5e7eb',
      }}
    >
      <style>{`
        @keyframes faq-fade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .faq-card { animation: faq-fade 0.35s ease; }
        .faq-row:hover { background: #f9fafb !important; }
        .faq-row { transition: background 0.15s; }
        .faq-chevron { transition: transform 0.22s ease; }
        .faq-body { overflow: hidden; transition: max-height 0.28s ease, opacity 0.22s ease; }
      `}</style>

      <div className="faq-card">
        {/* Header */}
        <div
          style={{
            background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`,
            padding: '20px 22px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.01em' }}>
              {resolvedTitle}
            </h2>
          </div>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.78)', margin: 0, lineHeight: 1.5 }}>
            {resolvedSubtitle}
          </p>
        </div>

        {/* Accordion items */}
        <div style={{ padding: '8px 0 4px' }}>
          {faqs.map((faq, i) => {
            const isOpen = openIndex === i;
            return (
              <div key={i} style={{ borderBottom: i < faqs.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                <button
                  type="button"
                  aria-label={`${isOpen ? 'Fechar' : 'Abrir'} pergunta: ${faq.q}`}
                  aria-expanded={isOpen ? 'true' : 'false'}
                  className="faq-row"
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  style={{
                    width: '100%',
                    background: isOpen ? '#f8faff' : 'transparent',
                    border: 'none',
                    padding: '14px 22px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                    <div
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        background: isOpen ? accent : '#f3f4f6',
                        color: isOpen ? '#fff' : '#9ca3af',
                        fontSize: '11px',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'background 0.2s, color 0.2s',
                      }}
                    >
                      {i + 1}
                    </div>
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: isOpen ? 700 : 500,
                        color: isOpen ? '#111827' : '#374151',
                        lineHeight: 1.4,
                        transition: 'font-weight 0.15s, color 0.15s',
                      }}
                    >
                      {faq.q}
                    </span>
                  </div>
                  <svg
                    className="faq-chevron"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={isOpen ? accent : '#9ca3af'}
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {/* Answer */}
                <div
                  className="faq-body"
                  style={{
                    maxHeight: isOpen ? '200px' : '0px',
                    opacity: isOpen ? 1 : 0,
                  }}
                >
                  <div
                    style={{
                      padding: '0 22px 14px 54px',
                      fontSize: '12.5px',
                      color: '#4b5563',
                      lineHeight: 1.65,
                    }}
                  >
                    {faq.a}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 22px 16px',
            borderTop: '1px solid #f3f4f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: '11.5px', color: '#6b7280' }}>
            Não encontrou sua resposta?
          </span>
          <button
            type="button"
            aria-label="Entrar em contato com o suporte"
            style={{
              background: accent,
              color: '#fff',
              border: 'none',
              borderRadius: '7px',
              padding: '7px 14px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Falar com Suporte
          </button>
        </div>
      </div>
    </div>
  );
};
