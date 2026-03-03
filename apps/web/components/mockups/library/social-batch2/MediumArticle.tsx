import React from 'react';

interface MediumArticleProps {
  articleImage?: string;
  image?: string;
  postImage?: string;
  title?: string;
  headline?: string;
  name?: string;
  subtitle?: string;
  description?: string;
  text?: string;
  body?: string;
  caption?: string;
  authorName?: string;
  username?: string;
  authorImage?: string;
  profileImage?: string;
  readTime?: string;
  date?: string;
}

export const MediumArticle: React.FC<MediumArticleProps> = ({
  articleImage,
  image,
  postImage,
  title,
  headline,
  name,
  subtitle,
  description,
  text,
  body,
  caption,
  authorName,
  username,
  authorImage,
  profileImage,
  readTime = '5 min de leitura',
  date = '27 jan',
}) => {
  const displayImage = articleImage || image || postImage || '';
  const displayTitle = title || headline || name || 'Título do Artigo';
  const displaySubtitle = subtitle || description || text || body || caption || 'Subtítulo ou resumo do artigo';
  const displayAuthor = authorName || username || 'Nome do Autor';
  const displayAuthorImage = authorImage || profileImage || '';

  return (
    <div style={{ width: '100%', maxWidth: 700, background: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #E5E5E5', overflow: 'hidden', cursor: 'pointer', fontFamily: 'Georgia, serif', color: '#242424' }}>
      {displayImage && (
        <div style={{ width: '100%', height: 280, background: '#E5E5E5', overflow: 'hidden' }}>
          <img src={displayImage} alt={displayTitle} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </div>
      )}
      <div style={{ padding: 24 }}>
        <h2 style={{ fontSize: 26, fontWeight: 700, color: '#242424', margin: '0 0 8px', lineHeight: 1.3, fontFamily: 'Georgia, serif' }}>{displayTitle}</h2>
        <p style={{ fontSize: 16, color: '#6B6B6B', margin: '0 0 16px', lineHeight: 1.6, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>{displaySubtitle}</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#E5E5E5', overflow: 'hidden', flexShrink: 0 }}>
              {displayAuthorImage && <img src={displayAuthorImage} alt={displayAuthor} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
            </div>
            <div>
              <p style={{ fontWeight: 600, fontSize: 14, color: '#242424', margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>{displayAuthor}</p>
              <p style={{ fontSize: 12, color: '#6B6B6B', margin: '2px 0 0', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>{date}</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#6B6B6B', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B6B6B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <span style={{ fontSize: 12 }}>{readTime}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
