'use client';

import React from 'react';

interface TemplateProps {
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

export const Template: React.FC<TemplateProps> = ({
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
  const resolvedTitle = title ?? headline ?? 'Template Educacional';
  const resolvedSubtitle = description ?? caption ?? 'Subtítulo ou disciplina';
  const resolvedAuthor = name ?? username ?? 'Prof. Nome Sobrenome';
  const resolvedPublisher = brandName ?? 'Instituição';
  const resolvedBody =
    body ?? text ??
    'Este espaço é reservado para o conteúdo principal do material didático. Substitua este texto pelo corpo do seu documento, aula, apostila ou guia.';
  const accent = brandColor;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '560px',
        minHeight: '460px',
        background: '#ffffff',
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(0,0,0,0.09)',
        fontFamily: 'system-ui, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid #e5e7eb',
      }}
    >
      {/* CABEÇALHO zone */}
      <div
        style={{
          background: accent,
          padding: '0',
          flexShrink: 0,
        }}
      >
        {/* Zone label */}
        <div
          style={{
            background: 'rgba(0,0,0,0.15)',
            padding: '3px 16px',
            fontSize: '8px',
            fontWeight: 700,
            letterSpacing: '2px',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.6)',
          }}
        >
          Zona: Cabeçalho
        </div>

        <div
          style={{
            padding: '16px 24px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#ffffff', lineHeight: 1.2 }}>
              {resolvedTitle}
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.75)' }}>
              {resolvedSubtitle}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)', marginBottom: '2px' }}>Responsável</div>
            <div style={{ fontSize: '12px', color: '#ffffff', fontWeight: 700 }}>{resolvedAuthor}</div>
          </div>
        </div>
      </div>

      {/* CORPO zone */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Zone label */}
        <div
          style={{
            background: `${accent}10`,
            borderBottom: `1px dashed ${accent}30`,
            padding: '3px 16px',
            fontSize: '8px',
            fontWeight: 700,
            letterSpacing: '2px',
            textTransform: 'uppercase',
            color: `${accent}80`,
          }}
        >
          Zona: Corpo
        </div>

        <div style={{ flex: 1, padding: '20px 24px', display: 'flex', gap: '20px' }}>
          {/* Main content area */}
          <div style={{ flex: 2 }}>
            <div
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: accent,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                marginBottom: '8px',
              }}
            >
              Conteúdo Principal
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: '#374151', lineHeight: 1.75 }}>
              {resolvedBody}
            </p>

            {/* Placeholder content blocks */}
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {['Tópico 1', 'Tópico 2', 'Tópico 3'].map((t, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    background: '#f9fafb',
                    borderRadius: '6px',
                    borderLeft: `3px solid ${accent}`,
                  }}
                >
                  <div
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: accent,
                      color: '#fff',
                      fontSize: '9px',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </div>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>{t} — insira seu conteúdo aqui</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar area */}
          <div style={{ flex: 1, borderLeft: `1px dashed ${accent}25`, paddingLeft: '16px' }}>
            <div
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: '#9ca3af',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                marginBottom: '10px',
              }}
            >
              Barra lateral
            </div>
            <div
              style={{
                background: `${accent}08`,
                border: `1px solid ${accent}20`,
                borderRadius: '8px',
                padding: '12px',
                fontSize: '11px',
                color: '#6b7280',
                lineHeight: 1.6,
                minHeight: '80px',
              }}
            >
              Notas, recursos ou destaques adicionais podem ser inseridos aqui.
            </div>
          </div>
        </div>
      </div>

      {/* RODAPÉ zone */}
      <div style={{ flexShrink: 0 }}>
        {/* Zone label */}
        <div
          style={{
            background: `${accent}10`,
            borderTop: `1px dashed ${accent}30`,
            padding: '3px 16px',
            fontSize: '8px',
            fontWeight: 700,
            letterSpacing: '2px',
            textTransform: 'uppercase',
            color: `${accent}80`,
          }}
        >
          Zona: Rodapé
        </div>

        <div
          style={{
            padding: '10px 24px',
            borderTop: '1px solid #f3f4f6',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '10px', color: '#9ca3af', letterSpacing: '1px', textTransform: 'uppercase' }}>
            {resolvedPublisher}
          </span>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: accent }} />
            <span style={{ fontSize: '10px', color: '#9ca3af' }}>Página 1 de N</span>
          </div>
          <span style={{ fontSize: '10px', color: '#9ca3af' }}>Educacional</span>
        </div>
      </div>
    </div>
  );
};
