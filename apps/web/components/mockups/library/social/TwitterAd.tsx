import React, { useState } from 'react';

interface TwitterAdProps {
  brandName?: string;
  name?: string;
  username?: string;
  handle?: string;
  brandLogo?: string;
  profileImage?: string;
  adText?: string;
  text?: string;
  body?: string;
  caption?: string;
  description?: string;
  adImage?: string;
  image?: string;
  postImage?: string;
  headline?: string;
  ctaText?: string;
  likes?: number | string;
  replies?: number | string;
  reposts?: number | string;
}

function formatCount(n: string | number): string {
  if (typeof n === 'string') return n;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const XLogo = ({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const TWHeart = ({ filled = false }: { filled?: boolean }) => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill={filled ? '#F91880' : 'none'} stroke={filled ? '#F91880' : '#71767B'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const TWReply = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#71767B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const TWRepost = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#71767B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </svg>
);

const TWBookmark = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#71767B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);

const TWShare = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#71767B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);

export const TwitterAd: React.FC<TwitterAdProps> = ({
  brandName,
  name,
  username,
  handle,
  brandLogo,
  profileImage,
  adText,
  text,
  body,
  caption,
  description,
  adImage,
  image,
  postImage,
  headline,
  ctaText = 'Saiba mais',
  likes = 284,
  replies = 42,
  reposts = 97,
}) => {
  const [liked, setLiked] = useState(false);
  const displayName = name || brandName || 'Marca';
  const displayHandle = handle || username || '@marca';
  const normalizedHandle = displayHandle.startsWith('@') ? displayHandle : `@${displayHandle}`;
  const displayLogo = brandLogo || profileImage || '';
  const displayImage = adImage || image || postImage || '';
  const displayText = adText || text || body || caption || description || '';
  const likesCount = typeof likes === 'number' ? likes + (liked ? 1 : 0) : likes;

  return (
    <div style={{ width: 600, maxWidth: '100%', background: '#000', fontFamily: '"TwitterChirp", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: '#E7E9EA', borderBottom: '1px solid #2F3336' }}>
      <div style={{ display: 'flex', gap: 12, padding: '12px 16px' }}>

        {/* Avatar */}
        <div style={{ flexShrink: 0 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', background: '#2F3336' }}>
            {displayLogo ? (
              <img src={displayLogo} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1D9BF0 0%, #1a8cd8 100%)' }} />
            )}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', minWidth: 0, flex: 1 }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: '#E7E9EA' }}>{displayName}</span>
              {/* Verified badge */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#1D9BF0">
                <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91C1.13 9.33.25 10.57.25 12s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.66 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.33-2.19c1.4.46 2.91.2 3.92-.81s1.26-2.52.8-3.91C21.38 14.67 22.25 13.43 22.25 12zm-13.1 5.71l-3.76-3.77 1.06-1.06 2.7 2.7 5.51-5.51 1.06 1.06-6.57 6.58z" />
              </svg>
              <span style={{ fontSize: 15, color: '#71767B' }}>{normalizedHandle}</span>
              <span style={{ color: '#71767B', fontSize: 15 }}>·</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <XLogo size={12} color="#71767B" />
                <span style={{ fontSize: 13, color: '#71767B' }}>Promovido</span>
              </div>
            </div>
            <button type="button" aria-label="Mais opções" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#71767B', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
            </button>
          </div>

          {/* Text */}
          {displayText ? (
            <p style={{ fontSize: 15, lineHeight: '20px', color: '#E7E9EA', margin: '0 0 12px' }}>{displayText}</p>
          ) : null}

          {/* Image with CTA card */}
          {displayImage ? (
            <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid #2F3336', marginBottom: 12 }}>
              <img src={displayImage} alt="Anúncio" style={{ width: '100%', maxHeight: 320, objectFit: 'cover', display: 'block' }} />
              <div style={{ background: '#16181C', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontSize: 13, color: '#71767B', margin: '0 0 2px' }}>{normalizedHandle.replace('@', '')}</p>
                  {headline && <p style={{ fontSize: 15, fontWeight: 700, color: '#E7E9EA', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{headline}</p>}
                </div>
                <button type="button" style={{ background: '#E7E9EA', border: 'none', borderRadius: 20, padding: '6px 14px', fontSize: 14, fontWeight: 700, color: '#000', cursor: 'pointer', flexShrink: 0, marginLeft: 12 }}>
                  {ctaText}
                </button>
              </div>
            </div>
          ) : headline ? (
            <div style={{ borderRadius: 16, border: '1px solid #2F3336', padding: '12px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#E7E9EA', margin: 0, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{headline}</p>
              <button type="button" style={{ background: '#E7E9EA', border: 'none', borderRadius: 20, padding: '6px 14px', fontSize: 14, fontWeight: 700, color: '#000', cursor: 'pointer', flexShrink: 0, marginLeft: 12 }}>
                {ctaText}
              </button>
            </div>
          ) : null}

          {/* Action bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
            <button type="button" aria-label="Responder" style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: '#71767B', padding: 0 }}>
              <TWReply />
              <span style={{ fontSize: 13 }}>{formatCount(replies)}</span>
            </button>
            <button type="button" aria-label="Repostar" style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: '#71767B', padding: 0 }}>
              <TWRepost />
              <span style={{ fontSize: 13 }}>{formatCount(reposts)}</span>
            </button>
            <button type="button" aria-label="Curtir" onClick={() => setLiked(p => !p)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: liked ? '#F91880' : '#71767B', padding: 0 }}>
              <TWHeart filled={liked} />
              <span style={{ fontSize: 13 }}>{formatCount(likesCount)}</span>
            </button>
            <button type="button" aria-label="Favoritar" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#71767B' }}>
              <TWBookmark />
            </button>
            <button type="button" aria-label="Compartilhar" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#71767B' }}>
              <TWShare />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
