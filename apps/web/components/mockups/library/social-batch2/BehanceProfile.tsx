'use client';
import React, { useState } from 'react';

interface BehanceProfileProps {
  headline?: string;
  title?: string;
  name?: string;
  username?: string;
  body?: string;
  caption?: string;
  description?: string;
  text?: string;
  image?: string;
  postImage?: string;
  thumbnail?: string;
  profileImage?: string;
  brandColor?: string;
  brandName?: string;
}

export const BehanceProfile: React.FC<BehanceProfileProps> = ({
  headline, title, name, username,
  body, caption, description, text,
  image, postImage, thumbnail, profileImage,
  brandColor = '#0057ff',
  brandName,
}) => {
  const [following, setFollowing] = useState(false);
  const [appreciated, setAppreciated] = useState<number | null>(null);

  const displayName = name ?? username ?? brandName ?? headline ?? 'Ana Rodrigues';
  const displayRole = title ?? description ?? body ?? caption ?? text ?? 'Designer de Produto & Ilustradora';
  const displayAvatar = profileImage ?? image ?? postImage ?? thumbnail ?? '';
  const accentColor = brandColor ?? '#0057ff';

  const specialties = ['UI/UX', 'Branding', 'Ilustração', 'Motion', 'Web Design', '3D'];
  const projects = [
    { title: 'Identidade Visual', views: '12,4k', appreciations: 843, color: '#1a1a2e' },
    { title: 'App de Finanças', views: '8,7k', appreciations: 612, color: '#16213e' },
    { title: 'Poster Series', views: '21k', appreciations: '1,2k', color: '#0f3460' },
    { title: 'Dashboard UI', views: '5,3k', appreciations: 389, color: '#533483' },
    { title: 'Brand Redesign', views: '9,1k', appreciations: 721, color: '#e94560' },
    { title: 'Type Specimen', views: '3,8k', appreciations: 274, color: '#2d6a4f' },
  ];

  return (
    <div style={{
      width: 360,
      background: '#fff',
      borderRadius: 16,
      overflow: 'hidden',
      fontFamily: '"Helvetica Neue", Arial, sans-serif',
      boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
      flexShrink: 0,
    }}>
      {/* Cover banner */}
      <div style={{
        height: 100,
        background: `linear-gradient(135deg, ${accentColor} 0%, #00b4d8 100%)`,
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute', bottom: -36, left: 20,
          width: 72, height: 72, borderRadius: '50%',
          border: '3px solid #fff',
          background: displayAvatar ? 'transparent' : accentColor,
          overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}>
          {displayAvatar
            ? <img src={displayAvatar} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ color: '#fff', fontWeight: 700, fontSize: 26 }}>{displayName.charAt(0)}</span>
          }
        </div>
        <div style={{
          position: 'absolute', top: 12, right: 14,
          background: 'rgba(255,255,255,0.2)',
          borderRadius: 6, padding: '4px 10px',
          fontSize: 11, color: '#fff', fontWeight: 700, letterSpacing: 1,
        }}>Bē</div>
      </div>

      {/* Profile info */}
      <div style={{ padding: '44px 20px 16px', borderBottom: '1px solid #f0f0f0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#1a1a1a' }}>{displayName}</div>
            <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{displayRole}</div>
            <div style={{ fontSize: 11, color: '#999', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              São Paulo, Brasil
            </div>
          </div>
          <button
            type="button"
            aria-label={following ? 'Deixar de seguir' : 'Seguir designer'}
            onClick={() => setFollowing(p => !p)}
            style={{
              background: following ? '#f0f0f0' : accentColor,
              color: following ? '#333' : '#fff',
              border: 'none', borderRadius: 8,
              padding: '8px 18px', fontSize: 13, fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {following ? 'Seguindo' : 'Seguir'}
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 24, marginTop: 14 }}>
          {[['2,4k', 'Seguidores'], ['189', 'Seguindo'], ['48,3k', 'Visualizações']].map(([val, label]) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a' }}>{val}</div>
              <div style={{ fontSize: 10, color: '#999', marginTop: 1 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Specialties */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
          {specialties.map(s => (
            <span key={s} style={{
              background: '#f5f5f5', borderRadius: 20,
              padding: '3px 10px', fontSize: 11, color: '#444', fontWeight: 500,
            }}>{s}</span>
          ))}
        </div>
      </div>

      {/* Projects grid label */}
      <div style={{ padding: '14px 16px 0' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#999', letterSpacing: 1, marginBottom: 10, textTransform: 'uppercase' }}>
          Projetos em destaque
        </div>
      </div>

      {/* Projects grid */}
      <div style={{ padding: '0 16px 14px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
          {projects.map((p, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Ver projeto ${p.title}`}
              onClick={() => setAppreciated(i)}
              style={{
                borderRadius: 8, overflow: 'hidden', cursor: 'pointer',
                background: p.color, aspectRatio: '4/3', position: 'relative',
                border: appreciated === i ? `2px solid ${accentColor}` : '2px solid transparent',
                padding: 0,
              }}
            >
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', padding: 6,
              }}>
                <div style={{ fontSize: 8, fontWeight: 600, color: 'rgba(255,255,255,0.9)', textAlign: 'center', lineHeight: 1.2 }}>{p.title}</div>
                <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>♥ {p.appreciations}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{
        padding: '10px 16px 14px',
        borderTop: '1px solid #f0f0f0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 11, color: '#999' }}>
          behance.net/{displayName.toLowerCase().replace(/\s/g, '')}
        </span>
        <button type="button" aria-label="Compartilhar perfil" style={{
          background: 'none', border: `1px solid ${accentColor}`,
          borderRadius: 6, padding: '5px 12px',
          fontSize: 11, color: accentColor, fontWeight: 600, cursor: 'pointer',
        }}>Compartilhar</button>
      </div>
    </div>
  );
};
