'use client';
import React, { useState } from 'react';

interface TikTokProfileProps {
  profileImage?: string;
  image?: string;
  thumbnail?: string;
  username?: string;
  name?: string;
  brandName?: string;
  bio?: string;
  body?: string;
  caption?: string;
  description?: string;
  headline?: string;
  following?: string | number;
  followers?: string | number;
  likes?: string | number;
  gridVideos?: string[];
  isVerified?: boolean;
}

const TikTokLogo = () => (
  <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
    <path d="M34 4h-6v26a6 6 0 1 1-8.485-5.515V18.3A14 14 0 1 0 34 30V16.8A20.2 20.2 0 0 0 46 18v-6a14.2 14.2 0 0 1-12-8z" fill="white" />
    <path d="M34 4h-6v26a6 6 0 1 1-8.485-5.515V18.3A14 14 0 1 0 34 30V16.8A20.2 20.2 0 0 0 46 18v-6a14.2 14.2 0 0 1-12-8z" fill="#69C9D0" opacity="0.6" />
    <path d="M30 0h-6v26a6 6 0 1 1-8.485-5.515V14.3A14 14 0 1 0 30 26V12.8A20.2 20.2 0 0 0 42 14V8a14.2 14.2 0 0 1-12-8z" fill="white" />
    <path d="M30 0h-6v26a6 6 0 1 1-8.485-5.515V14.3A14 14 0 1 0 30 26V12.8A20.2 20.2 0 0 0 42 14V8a14.2 14.2 0 0 1-12-8z" fill="#EE1D52" opacity="0.6" />
  </svg>
);

const VerifiedBadge = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="#20D5EC">
    <path d="M9 12l2 2 4-4M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" stroke="#20D5EC" strokeWidth="0" />
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="#20D5EC" />
    <path d="M8.5 12.5l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

const PlayIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="white" opacity="0.85">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

export const TikTokProfile: React.FC<TikTokProfileProps> = ({
  profileImage,
  image,
  thumbnail,
  username,
  name,
  brandName,
  bio,
  body,
  caption,
  description,
  headline,
  following = '234',
  followers = '12,4mil',
  likes = '89,2mil',
  gridVideos = ['', '', '', '', '', ''],
  isVerified = false,
}) => {
  const [followed, setFollowed] = useState(false);

  const displayAvatar = profileImage || image || thumbnail || '';
  const displayUsername = username || name || brandName || '@usuario';
  const displayName = name || brandName || username || 'Nome do Criador';
  const displayBio = bio || body || caption || description || headline || 'Criador de conteúdo 🎵';

  const handle = displayUsername.startsWith('@') ? displayUsername : `@${displayUsername}`;

  const formatStat = (val: string | number) =>
    typeof val === 'number' ? val.toLocaleString('pt-BR') : val;

  return (
    <div style={{
      width: 360,
      background: '#fff',
      borderRadius: 16,
      overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
      boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
      flexShrink: 0,
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px 8px',
        borderBottom: '1px solid #F1F1F2',
      }}>
        <button type="button" aria-label="Voltar" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 0, color: '#161823' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <TikTokLogo />
        <button type="button" aria-label="Mais opções" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 0, color: '#161823' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
          </svg>
        </button>
      </div>

      {/* Profile info */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 20px 16px' }}>
        {/* Avatar */}
        <div style={{
          width: 88, height: 88, borderRadius: '50%',
          overflow: 'hidden', background: '#F1F1F2',
          flexShrink: 0, marginBottom: 12,
          border: '3px solid #F1F1F2',
          boxShadow: '0 0 0 3px #fff, 0 0 0 5px #EE1D52',
        }}>
          {displayAvatar
            ? <img src={displayAvatar} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : (
              <div style={{
                width: '100%', height: '100%',
                background: 'linear-gradient(135deg, #EE1D52 0%, #69C9D0 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 32, color: 'white', fontWeight: 700,
              }}>
                {displayName.charAt(0).toUpperCase()}
              </div>
            )
          }
        </div>

        {/* Username + verified */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#161823', letterSpacing: '-0.02em' }}>
            {handle}
          </span>
          {isVerified && <VerifiedBadge />}
        </div>

        {/* Display name */}
        <p style={{ fontSize: 14, color: '#161823', marginBottom: 14, opacity: 0.7 }}>{displayName}</p>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 28, marginBottom: 16 }}>
          {[
            { label: 'Seguindo', value: formatStat(following) },
            { label: 'Seguidores', value: formatStat(followers) },
            { label: 'Curtidas', value: formatStat(likes) },
          ].map(stat => (
            <div key={stat.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#161823', lineHeight: 1.2 }}>{stat.value}</div>
              <div style={{ fontSize: 12, color: '#848484', marginTop: 2 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Bio */}
        <p style={{
          fontSize: 14, color: '#161823', textAlign: 'center', lineHeight: 1.5,
          marginBottom: 16, maxWidth: 280,
        }}>
          {displayBio}
        </p>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 280 }}>
          <button
            type="button"
            aria-label={followed ? 'Seguindo' : 'Seguir'}
            onClick={() => setFollowed(f => !f)}
            style={{
              flex: 1, height: 38,
              background: followed ? '#fff' : 'linear-gradient(135deg, #EE1D52 0%, #FF3B5C 100%)',
              border: followed ? '1.5px solid #E0E0E0' : 'none',
              borderRadius: 4,
              color: followed ? '#161823' : '#fff',
              fontSize: 15, fontWeight: 700, cursor: 'pointer',
              letterSpacing: '-0.01em',
            }}
          >
            {followed ? 'Seguindo' : 'Seguir'}
          </button>
          <button type="button" aria-label="Enviar mensagem" style={{
            width: 38, height: 38,
            background: '#fff', border: '1.5px solid #E0E0E0',
            borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#161823', flexShrink: 0,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Video grid tabs */}
      <div style={{ borderBottom: '1px solid #F1F1F2', display: 'flex' }}>
        {['Vídeos', 'Curtidos', 'Favoritos'].map((tab, i) => (
          <button key={tab} type="button" aria-label={tab} style={{
            flex: 1, height: 44,
            background: 'none', border: 'none', cursor: 'pointer',
            borderBottom: i === 0 ? '2px solid #161823' : '2px solid transparent',
            color: i === 0 ? '#161823' : '#848484',
            fontSize: 13, fontWeight: i === 0 ? 700 : 400,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 4,
          }}>
            {i === 0 && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="8" height="8" rx="1" /><rect x="14" y="2" width="8" height="8" rx="1" /><rect x="2" y="14" width="8" height="8" rx="1" /><rect x="14" y="14" width="8" height="8" rx="1" /></svg>
            )}
            {i === 1 && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
            )}
            {i === 2 && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
            )}
            {tab}
          </button>
        ))}
      </div>

      {/* Video grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, padding: 2 }}>
        {gridVideos.slice(0, 6).map((video, i) => (
          <div key={i} style={{
            position: 'relative',
            paddingTop: '177%', /* 9:16 */
            background: video ? '#000' : `hsl(${i * 40}, 30%, 85%)`,
            overflow: 'hidden',
            borderRadius: 2,
          }}>
            {video
              ? <img src={video} alt={`Vídeo ${i + 1}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
              : (
                <div style={{
                  position: 'absolute', inset: 0,
                  background: `linear-gradient(160deg, hsl(${i * 40 + 330}, 60%, 35%) 0%, hsl(${i * 40 + 350}, 50%, 20%) 100%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <PlayIcon />
                </div>
              )
            }
            {/* View count overlay */}
            <div style={{
              position: 'absolute', bottom: 4, left: 4,
              display: 'flex', alignItems: 'center', gap: 3,
              color: 'white', fontSize: 11, fontWeight: 600,
              textShadow: '0 1px 3px rgba(0,0,0,0.7)',
            }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              {Math.floor(Math.random() * 900 + 100)}k
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
