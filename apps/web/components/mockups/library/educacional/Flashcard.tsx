'use client';

import React, { useState } from 'react';

interface FlashcardProps {
  title?: string;
  headline?: string;
  name?: string;
  username?: string;
  brandName?: string;
  body?: string;
  caption?: string;
  description?: string;
  text?: string;
  brandColor?: string;
}

export const Flashcard: React.FC<FlashcardProps> = ({
  title,
  headline,
  name,
  username,
  brandName,
  body,
  caption,
  description,
  text,
  brandColor = '#5D87FF',
}) => {
  const [flipped, setFlipped] = useState(false);

  const resolvedTerm = title ?? headline ?? 'Repetição Espaçada';
  const resolvedConcept = description ?? caption ?? 'Técnica de memorização de longo prazo';
  const resolvedDefinition =
    body ?? text ??
    'Método de revisão que espaça o estudo ao longo do tempo em intervalos crescentes, aproveitando o "efeito de espaçamento" para consolidar a memória de longo prazo.';
  const resolvedExample = name ?? username ?? 'Ex.: rever um conteúdo em 1, 3, 7 e 21 dias após o aprendizado inicial.';
  const resolvedPublisher = brandName ?? 'EduFlash';
  const accent = brandColor;

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', width: '320px' }}>
      {/* Card counter */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
          padding: '0 4px',
        }}
      >
        <span style={{ fontSize: '11px', color: '#9ca3af', letterSpacing: '1px', textTransform: 'uppercase' }}>
          {resolvedPublisher}
        </span>
        <span
          style={{
            fontSize: '11px',
            color: accent,
            fontWeight: 700,
            background: `${accent}15`,
            padding: '2px 8px',
            borderRadius: '99px',
          }}
        >
          {flipped ? 'Verso' : 'Frente'}
        </span>
      </div>

      {/* Card */}
      <div
        style={{
          width: '320px',
          height: '200px',
          position: 'relative',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          border: `2px solid ${flipped ? accent : '#e5e7eb'}`,
          transition: 'border-color 0.3s',
        }}
      >
        {/* Front face */}
        {!flipped && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
              gap: '10px',
            }}
          >
            {/* Icon */}
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: `${accent}18`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z" />
                <path d="M12 8v4l3 3" />
              </svg>
            </div>
            <div
              style={{
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '2px',
                textTransform: 'uppercase',
                color: '#9ca3af',
              }}
            >
              {resolvedConcept}
            </div>
            <div
              style={{
                fontSize: '22px',
                fontWeight: 800,
                color: '#111827',
                textAlign: 'center',
                lineHeight: 1.2,
              }}
            >
              {resolvedTerm}
            </div>
            <div style={{ fontSize: '11px', color: '#d1d5db' }}>Clique em "Virar" para ver a definição</div>
          </div>
        )}

        {/* Back face */}
        {flipped && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(135deg, ${accent}08 0%, ${accent}18 100%)`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              padding: '20px 24px',
              gap: '10px',
            }}
          >
            <div
              style={{
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '2px',
                textTransform: 'uppercase',
                color: accent,
              }}
            >
              Definição
            </div>
            <p
              style={{
                margin: 0,
                fontSize: '13px',
                color: '#1f2937',
                lineHeight: 1.6,
              }}
            >
              {resolvedDefinition}
            </p>
            <div
              style={{
                borderTop: `1px solid ${accent}30`,
                paddingTop: '8px',
                fontSize: '11px',
                color: '#6b7280',
                fontStyle: 'italic',
              }}
            >
              {resolvedExample}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '12px',
          marginTop: '14px',
        }}
      >
        <button
          type="button"
          aria-label={flipped ? 'Ver frente do cartão' : 'Ver verso do cartão'}
          onClick={() => setFlipped(f => !f)}
          style={{
            background: accent,
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            padding: '9px 24px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          {flipped ? 'Ver Frente' : 'Virar'}
        </button>
        {flipped && (
          <>
            <button
              type="button"
              aria-label="Marcar como não lembro"
              style={{
                background: '#fee2e2',
                color: '#dc2626',
                border: 'none',
                borderRadius: '8px',
                padding: '9px 14px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'system-ui, sans-serif',
              }}
            >
              Não lembro
            </button>
            <button
              type="button"
              aria-label="Marcar como lembro"
              style={{
                background: '#dcfce7',
                color: '#16a34a',
                border: 'none',
                borderRadius: '8px',
                padding: '9px 14px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'system-ui, sans-serif',
              }}
            >
              Lembro!
            </button>
          </>
        )}
      </div>
    </div>
  );
};
