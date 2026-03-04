'use client';
import React, { useState } from 'react';

interface BehanceProjectProps {
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

export const BehanceProject: React.FC<BehanceProjectProps> = ({
  headline, title, name, username,
  body, caption, description, text,
  image, postImage, thumbnail, profileImage,
  brandColor = '#1769ff',
  brandName,
}) => {
  const [appreciated, setAppreciated] = useState(false);
  const [saved, setSaved] = useState(false);
  const [appreciationCount, setAppreciationCount] = useState(1284);

  const displayTitle = headline ?? title ?? name ?? brandName ?? 'Identidade Visual — Studio Flux';
  const displayCreator = username ?? 'Ana Rodrigues';
  const displayDesc = description ?? body ?? caption ?? text ?? 'Um projeto de branding completo para um estúdio criativo, explorando tipografia experimental e paletas de cores vibrantes.';
  const displayImage = image ?? postImage ?? thumbnail ?? '';
  const displayAvatar = profileImage ?? '';
  const accentColor = brandColor ?? '#1769ff';

  const tools = ['Figma', 'Illustrator', 'After Effects', 'Photoshop'];
  const galleryColors = ['#e63946', '#457b9d', '#2a9d8f', '#e9c46a', '#f4a261'];

  const handleAppreciate = () => {
    setAppreciated(p => {
      setAppreciationCount(c => p ? c - 1 : c + 1);
      return !p;
    });
  };

  return (
    <div style={{
      width: 380,
      background: '#fff',
      borderRadius: 12,
      overflow: 'hidden',
      fontFamily: '"Helvetica Neue", Arial, sans-serif',
      boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
      flexShrink: 0,
    }}>
      {/* Cover image */}
      <div style={{
        width: '100%', aspectRatio: '16/9',
        background: displayImage ? 'transparent' : `linear-gradient(135deg, ${accentColor} 0%, #0a4fbf 100%)`,
        overflow: 'hidden', position: 'relative',
      }}>
        {displayImage
          ? <img src={displayImage} alt={displayTitle} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : (
            <div style={{
              width: '100%', height: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8,
            }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 16l5-5 4 4 3-3 4 4"/></svg>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>Imagem do projeto</span>
            </div>
          )
        }
        {/* Behance watermark */}
        <div style={{
          position: 'absolute', top: 10, right: 10,
          background: 'rgba(0,0,0,0.5)', borderRadius: 4,
          padding: '3px 8px', fontSize: 11, fontWeight: 800, color: '#fff', letterSpacing: 0.5,
        }}>Bē</div>
      </div>

      {/* Title & description */}
      <div style={{ padding: '16px 18px 12px' }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#1a1a1a', lineHeight: 1.3, marginBottom: 6 }}>{displayTitle}</div>
        <div style={{ fontSize: 13, color: '#666', lineHeight: 1.5, marginBottom: 12 }}>{displayDesc}</div>

        {/* Tools used */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {tools.map(t => (
            <span key={t} style={{
              background: '#f0f4ff', color: accentColor,
              borderRadius: 4, padding: '3px 8px',
              fontSize: 11, fontWeight: 600,
            }}>{t}</span>
          ))}
        </div>

        {/* Gallery strip */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
          {galleryColors.map((c, i) => (
            <div key={i} style={{
              flex: 1, height: 40, borderRadius: 4,
              background: displayImage ? `${c}44` : c,
              overflow: 'hidden',
            }}>
              {displayImage && (
                <img src={displayImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Author + actions */}
      <div style={{
        padding: '10px 18px 14px',
        borderTop: '1px solid #f0f0f0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {/* Creator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: accentColor, overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            {displayAvatar
              ? <img src={displayAvatar} alt={displayCreator} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>{displayCreator.charAt(0)}</span>
            }
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#222' }}>{displayCreator}</div>
            <div style={{ fontSize: 10, color: '#999' }}>Publicado há 2 dias</div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Appreciate */}
          <button
            type="button"
            aria-label={appreciated ? 'Remover apreciação' : 'Apreciar projeto'}
            onClick={handleAppreciate}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: appreciated ? '#fff0f6' : '#f5f5f5',
              border: appreciated ? `1px solid ${accentColor}` : '1px solid #eee',
              borderRadius: 20, padding: '5px 12px',
              cursor: 'pointer', color: appreciated ? accentColor : '#555',
              fontSize: 12, fontWeight: 600,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill={appreciated ? accentColor : 'none'} stroke={appreciated ? accentColor : '#666'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
              <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
            </svg>
            {appreciationCount.toLocaleString('pt-BR')}
          </button>

          {/* Save */}
          <button
            type="button"
            aria-label={saved ? 'Remover dos salvos' : 'Salvar projeto'}
            onClick={() => setSaved(p => !p)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: saved ? '#fff8e1' : '#f5f5f5',
              border: saved ? '1px solid #f4a261' : '1px solid #eee',
              borderRadius: 20, padding: '5px 12px',
              cursor: 'pointer', color: saved ? '#f4a261' : '#555',
              fontSize: 12, fontWeight: 600,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill={saved ? '#f4a261' : 'none'} stroke={saved ? '#f4a261' : '#666'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
            Salvar
          </button>

          {/* Views */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#999', fontSize: 12 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            9,2k
          </div>
        </div>
      </div>
    </div>
  );
};
