'use client';

import React, { useState } from 'react';

interface FacebookMemoryProps {
  name?: string;
  username?: string;
  brandName?: string;
  headline?: string;
  title?: string;
  body?: string;
  caption?: string;
  description?: string;
  text?: string;
  image?: string;
  postImage?: string;
  thumbnail?: string;
  profileImage?: string;
  yearsAgo?: number;
  originalDate?: string;
  authorName?: string;
}

export const FacebookMemory: React.FC<FacebookMemoryProps> = ({
  name,
  username,
  brandName,
  headline,
  title,
  body,
  caption,
  description,
  text,
  image,
  postImage,
  thumbnail,
  profileImage,
  yearsAgo = 3,
  originalDate = '3 de março de 2023',
  authorName,
}) => {
  const [shared, setShared] = useState(false);
  const [hidden, setHidden] = useState(false);

  const resolvedCaption = body ?? caption ?? description ?? text ?? headline ?? 'Uma memória especial desse dia.';
  const resolvedImage = image ?? postImage ?? thumbnail ?? '';
  const resolvedAuthor = authorName ?? name ?? username ?? brandName ?? 'Você';
  const resolvedAvatarSrc = profileImage ?? '';

  if (hidden) {
    return (
      <div style={{
        width: 400,
        background: '#fff',
        borderRadius: 8,
        boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
        fontFamily: 'Helvetica Neue, Arial, sans-serif',
        padding: '24px 16px',
        textAlign: 'center',
        color: '#65676b',
        fontSize: 14,
      }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#bcc0c4" strokeWidth="1.5" style={{ marginBottom: 10 }}>
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
        <p style={{ margin: '0 0 12px' }}>Memória ocultada. Não mostraremos isso novamente.</p>
        <button
          type="button"
          aria-label="Desfazer ocultar memória"
          onClick={() => setHidden(false)}
          style={{ background: 'none', border: 'none', color: '#1877f2', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
        >
          Desfazer
        </button>
      </div>
    );
  }

  return (
    <div style={{
      width: 400,
      background: '#fff',
      borderRadius: 8,
      boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
      fontFamily: 'Helvetica Neue, Arial, sans-serif',
      overflow: 'hidden',
      color: '#050505',
    }}>
      <style>{`
        @keyframes fbmem-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.0); }
          50% { box-shadow: 0 0 18px 4px rgba(99,102,241,0.25); }
        }
        .fbmem-card { animation: fbmem-glow 3s ease-in-out infinite; }
        .fbmem-share-btn:hover { filter: brightness(0.92); }
        .fbmem-hide-btn:hover { background: #f0f2f5 !important; }
      `}</style>

      {/* Header banner */}
      <div style={{
        background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 60%, #db2777 100%)',
        padding: '16px 16px 14px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
      }}>
        {/* Clock icon */}
        <div style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.18)',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.8)', letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 2 }}>
            Nesta data
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', lineHeight: 1.1, marginBottom: 2 }}>
            {yearsAgo} {yearsAgo === 1 ? 'ano atrás' : 'anos atrás'}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>{originalDate}</div>
        </div>
      </div>

      {/* Original post author */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px 8px' }}>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: '#bcc0c4',
          overflow: 'hidden',
          flexShrink: 0,
        }}>
          {resolvedAvatarSrc ? (
            <img src={resolvedAvatarSrc} alt={resolvedAuthor} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>{resolvedAuthor.charAt(0).toUpperCase()}</span>
            </div>
          )}
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#050505' }}>{resolvedAuthor}</div>
          <div style={{ fontSize: 12, color: '#65676b' }}>{originalDate}</div>
        </div>
      </div>

      {/* Caption */}
      {resolvedCaption ? (
        <div style={{ padding: '0 16px 10px', fontSize: 15, color: '#050505', lineHeight: 1.4 }}>
          {resolvedCaption}
        </div>
      ) : null}

      {/* Memory image */}
      {resolvedImage ? (
        <div style={{ width: '100%', maxHeight: 280, overflow: 'hidden' }}>
          <img
            src={resolvedImage}
            alt="Memória"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>
      ) : (
        <div style={{
          margin: '0 16px 12px',
          height: 160,
          borderRadius: 8,
          background: 'linear-gradient(135deg, #ede9fe 0%, #fce7f3 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.5">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </div>
      )}

      {/* Reaction bar */}
      <div style={{ padding: '10px 16px 4px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {['#1877f2', '#f5533d', '#f5a623'].map((color, i) => (
            <div key={i} style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: color,
              border: '2px solid #fff',
              marginLeft: i > 0 ? -6 : 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
            }}>
              {i === 0 && <span>👍</span>}
              {i === 1 && <span>❤️</span>}
              {i === 2 && <span>😮</span>}
            </div>
          ))}
        </div>
        <span style={{ fontSize: 13, color: '#65676b' }}>47 pessoas curtiram</span>
      </div>

      {/* Action buttons */}
      <div style={{ padding: '8px 16px 14px', display: 'flex', gap: 8 }}>
        <button
          type="button"
          aria-label="Compartilhar memória"
          className="fbmem-share-btn"
          onClick={() => setShared(true)}
          style={{
            flex: 1,
            padding: '9px 0',
            border: 'none',
            borderRadius: 6,
            background: shared ? '#e7f3ff' : '#1877f2',
            color: shared ? '#1877f2' : '#fff',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            transition: 'background 0.15s',
          }}
        >
          {shared ? (
            <>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1877f2" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
              Compartilhado!
            </>
          ) : (
            <>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
              Compartilhar memória
            </>
          )}
        </button>
        <button
          type="button"
          aria-label="Não mostrar esta memória"
          className="fbmem-hide-btn"
          onClick={() => setHidden(true)}
          style={{
            flex: 1,
            padding: '9px 0',
            border: '1px solid #e4e6eb',
            borderRadius: 6,
            background: '#fff',
            color: '#050505',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
        >
          Não mostrar
        </button>
      </div>
    </div>
  );
};
