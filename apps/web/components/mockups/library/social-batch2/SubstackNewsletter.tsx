import React from 'react';

interface SubstackNewsletterProps {
  postImage?: string;
  image?: string;
  thumbnail?: string;
  title?: string;
  headline?: string;
  name?: string;
  excerpt?: string;
  description?: string;
  text?: string;
  body?: string;
  caption?: string;
  authorName?: string;
  username?: string;
  date?: string;
}

export const SubstackNewsletter: React.FC<SubstackNewsletterProps> = ({
  postImage,
  image,
  thumbnail,
  title,
  headline,
  name,
  excerpt,
  description,
  text,
  body,
  caption,
  authorName,
  username,
  date = '27 jan. 2026',
}) => {
  const displayImage = postImage || image || thumbnail || '';
  const displayTitle = title || headline || name || 'Título da Newsletter';
  const displayExcerpt = excerpt || description || text || body || caption || 'Introdução ou resumo do conteúdo da newsletter';
  const displayAuthor = authorName || username || 'Nome do Autor';

  return (
    <div style={{ width: '100%', maxWidth: 600, background: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #E5E5E5', overflow: 'hidden', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', color: '#0F0F0F' }}>
      {displayImage && (
        <div style={{ width: '100%', height: 240, background: '#E5E5E5', overflow: 'hidden' }}>
          <img src={displayImage} alt={displayTitle} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </div>
      )}
      <div style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF6719" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
          </svg>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#FF6719', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Newsletter</span>
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0F0F0F', margin: '0 0 12px', lineHeight: 1.3 }}>{displayTitle}</h2>
        <p style={{ fontSize: 15, color: '#6B6B6B', margin: '0 0 16px', lineHeight: 1.6 }}>{displayExcerpt}</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, borderTop: '1px solid #E5E5E5' }}>
          <div>
            <p style={{ fontWeight: 600, fontSize: 13, color: '#0F0F0F', margin: 0 }}>{displayAuthor}</p>
            <p style={{ fontSize: 11, color: '#9B9B9B', margin: '2px 0 0' }}>{date}</p>
          </div>
          <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#FF6719', fontWeight: 600, padding: 0 }}>
            Ler mais
          </button>
        </div>
      </div>
    </div>
  );
};
