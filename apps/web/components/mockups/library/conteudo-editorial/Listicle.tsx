'use client';

import React from 'react';

interface ListicleProps {
  headline?: string;
  title?: string;
  name?: string;
  body?: string;
  text?: string;
  description?: string;
  caption?: string;
  username?: string;
  brandName?: string;
  image?: string;
  postImage?: string;
  thumbnail?: string;
  profileImage?: string;
  brandColor?: string;
}

export const Listicle: React.FC<ListicleProps> = ({
  headline,
  title,
  name,
  body,
  text,
  description,
  caption,
  username,
  brandName,
  image,
  postImage,
  thumbnail,
  profileImage,
  brandColor = '#f97316',
}) => {
  const resolvedTitle = headline || title || '10 Dicas de Produtividade para Profissionais de Marketing';
  const resolvedAuthor = name || username || brandName || 'Redação Edro';
  const resolvedIntro =
    body || text || description || caption ||
    'Separamos as estratégias mais eficazes para aumentar sua produtividade e entregar mais resultados em menos tempo.';
  const resolvedAvatar = profileImage || null;
  const accent = brandColor || '#f97316';

  const items = [
    { num: 1, icon: '⏰', title: 'Use blocos de tempo fixos', tip: 'Agrupe tarefas similares para evitar troca de contexto.' },
    { num: 2, icon: '📋', title: 'Planeje na véspera', tip: 'Reserve 10 min antes de sair para organizar o dia seguinte.' },
    { num: 3, icon: '🎯', title: 'Defina 3 prioridades diárias', tip: 'Mais do que 3 prioridades significa nenhuma prioridade.' },
    { num: 4, icon: '🔕', title: 'Elimine notificações', tip: 'Desative alertas durante blocos de foco profundo.' },
    { num: 5, icon: '🤖', title: 'Automatize o repetitivo', tip: 'Use ferramentas para liberar horas de trabalho manual.' },
    { num: 6, icon: '📊', title: 'Meça o que importa', tip: 'Só melhora o que você acompanha de forma consistente.' },
    { num: 7, icon: '🧠', title: 'Faça pausas estratégicas', tip: 'A técnica Pomodoro melhora foco e reduz fadiga mental.' },
  ];

  return (
    <div
      style={{
        width: '400px',
        background: '#ffffff',
        borderRadius: '14px',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
        border: '1px solid #e5e7eb',
      }}
    >
      <style>{`
        @keyframes lst-fade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .lst-card { animation: lst-fade 0.4s ease; }
        .lst-item:nth-child(even) { background: #fafafa; }
        .lst-item:hover { background: #fff8f5 !important; }
        .lst-item { transition: background 0.15s; }
      `}</style>

      <div className="lst-card">
        {/* Header with image strip */}
        <div
          style={{
            background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`,
            padding: '20px 22px 16px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Background pattern */}
          <div
            style={{
              position: 'absolute',
              right: '-20px',
              top: '-20px',
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              right: '20px',
              bottom: '-30px',
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.06)',
            }}
          />

          <div style={{ position: 'relative' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(255,255,255,0.2)',
                padding: '3px 10px',
                borderRadius: '12px',
                marginBottom: '8px',
              }}
            >
              <span style={{ fontSize: '14px' }}>📝</span>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Listicle · 10 Dicas
              </span>
            </div>
            <h2
              style={{
                fontSize: '16px',
                fontWeight: 800,
                color: '#fff',
                margin: '0 0 6px',
                lineHeight: 1.3,
                letterSpacing: '-0.01em',
              }}
            >
              {resolvedTitle}
            </h2>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', margin: 0, lineHeight: 1.5 }}>
              {resolvedIntro}
            </p>
          </div>
        </div>

        {/* Share count bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px 22px',
            borderBottom: '1px solid #f3f4f6',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#6b7280' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <span style={{ fontWeight: 700, color: '#ef4444' }}>2.4k</span> curtidas
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#6b7280' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            <span style={{ fontWeight: 700, color: accent }}>847</span> compartilhamentos
          </div>
          <div style={{ marginLeft: 'auto', fontSize: '11px', color: '#9ca3af' }}>5 min de leitura</div>
        </div>

        {/* List items */}
        <div>
          {items.map((item) => (
            <div
              key={item.num}
              className="lst-item"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '11px 22px',
                borderBottom: '1px solid #f3f4f6',
              }}
            >
              {/* Number badge */}
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  background: item.num <= 3 ? accent : '#f3f4f6',
                  color: item.num <= 3 ? '#fff' : '#6b7280',
                  fontSize: '12px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {item.num}
              </div>

              {/* Icon */}
              <span style={{ fontSize: '17px', flexShrink: 0, marginTop: '3px' }}>{item.icon}</span>

              {/* Text */}
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827', marginBottom: '2px' }}>
                  {item.title}
                </div>
                <div style={{ fontSize: '11.5px', color: '#6b7280', lineHeight: 1.45 }}>
                  {item.tip}
                </div>
              </div>
            </div>
          ))}

          {/* "Ver mais" row */}
          <div
            style={{
              padding: '10px 22px',
              textAlign: 'center',
              fontSize: '12px',
              color: accent,
              fontWeight: 700,
              cursor: 'pointer',
              background: `${accent}08`,
            }}
          >
            + 3 dicas restantes — clique para ler o artigo completo
          </div>
        </div>

        {/* Author footer */}
        <div
          style={{
            padding: '10px 22px 14px',
            borderTop: '1px solid #f3f4f6',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <div
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              background: resolvedAvatar
                ? `url(${resolvedAvatar}) center/cover no-repeat`
                : `linear-gradient(135deg, ${accent} 0%, ${accent}88 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {!resolvedAvatar && resolvedAuthor.charAt(0)}
          </div>
          <div>
            <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#111827' }}>{resolvedAuthor}</div>
            <div style={{ fontSize: '10px', color: '#9ca3af' }}>Publicado em 3 de março de 2026</div>
          </div>
          <button
            type="button"
            aria-label="Compartilhar este artigo"
            style={{
              marginLeft: 'auto',
              background: accent,
              color: '#fff',
              border: 'none',
              borderRadius: '7px',
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            Compartilhar
          </button>
        </div>
      </div>
    </div>
  );
};
