import React, { useState } from 'react';

interface InstagramFeedMockupProps {
  username?: string;
  profileImage?: string;
  postImage?: string;
  slides?: string[];
  isCarousel?: boolean;
  /** @deprecated use arteHeadline + arteBody */
  arteText?: string;
  arteHeadline?: string;
  arteBody?: string;
  arteBgColor?: string;
  likes?: number;
  caption?: string;
  comments?: Array<{ username: string; text: string }>;
  location?: string;
  dateLabel?: string;
  likedBy?: string;
  postAspectRatio?: string;
}

const INSTAGRAM_FOLD = 125;

function renderParts(text: string, faded = false) {
  const parts = text.split(/((?:#|@)[\w\u00C0-\u017F]+)/g);
  return parts.map((part, i) =>
    part.startsWith('#') || part.startsWith('@') ? (
      <span key={i} style={{ color: faded ? 'rgba(0,55,107,0.30)' : '#00376B' }}>{part}</span>
    ) : (
      <span key={i} style={faded ? { color: 'rgba(38,38,38,0.30)' } : undefined}>{part}</span>
    )
  );
}

function renderCaption(username: string, text: string) {
  if (!text) return null;
  const before = text.length > INSTAGRAM_FOLD ? text.slice(0, INSTAGRAM_FOLD) : text;
  const after  = text.length > INSTAGRAM_FOLD ? text.slice(INSTAGRAM_FOLD) : '';
  return (
    <div className="break-words" style={{ fontSize: 14, lineHeight: '18px', color: '#262626' }}>
      <span style={{ fontWeight: 600, marginRight: 4 }}>{username}</span>
      {renderParts(before)}
      {after && (
        <>
          <span style={{
            display: 'inline-block', fontSize: 9, verticalAlign: 'middle',
            background: 'rgba(255,120,0,0.12)', color: 'rgba(200,80,0,0.75)',
            borderRadius: 3, padding: '0 3px', margin: '0 3px', fontWeight: 700,
          }}>dobra</span>
          {renderParts(after, true)}
        </>
      )}
    </div>
  );
}

export const InstagramFeedMockup: React.FC<InstagramFeedMockupProps> = ({
  username = 'youraccount',
  profileImage = '',
  postImage = '',
  slides,
  isCarousel = false,
  arteText,
  arteHeadline,
  arteBody,
  arteBgColor,
  likes = 3452,
  caption = 'Enhance your Instagram with our UI Mockup Download for your instagram creativity. @instagram #templates #bold #fun #aesthetic #newpost',
  comments = [],
  location,
  dateLabel = 'HÁ 2 HORAS',
  postAspectRatio = '4/5',
}) => {
  // Resolve headline/body from new props or legacy arteText
  const resolvedHeadline = arteHeadline || (arteText ? arteText.split('\n\n')[0] : undefined);
  const resolvedBody = arteBody || (arteText ? arteText.split('\n\n').slice(1).join('\n\n') : undefined);
  const [currentSlide, setCurrentSlide] = useState(0);

  const allSlides = isCarousel && slides && slides.length > 0 ? slides : [postImage];
  const totalSlides = allSlides.length;
  const currentImage = allSlides[currentSlide] || postImage;

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  };
  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  };

  const likesLabel =
    typeof likes === 'number' ? likes.toLocaleString('pt-BR') : String(likes);
  const commentsCount = comments.length || 48;

  return (
    <div
      className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm"
      style={{ width: 375, fontFamily: '"SF Pro Text", Inter, sans-serif', color: '#262626' }}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-3 py-3">
        <div className="flex items-center gap-3">
          {/* Avatar com anel de story */}
          <div className="rounded-full p-[2px] flex-shrink-0"
               style={{ background: arteBgColor
                 ? `linear-gradient(45deg, ${arteBgColor}, ${arteBgColor}bb)`
                 : 'linear-gradient(45deg, #f9ce34, #ee2a7b, #6228d7)' }}>
            <div className="rounded-full border-2 border-white overflow-hidden" style={{ width: 36, height: 36 }}>
              {profileImage ? (
                <img src={profileImage} alt={username} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full" style={{ background: arteBgColor || '#e2e8f0' }} />
              )}
            </div>
          </div>

          {/* Username + location */}
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span style={{ fontWeight: 600, fontSize: 14, lineHeight: '18px' }}>{username}</span>
              {/* Verified badge — oficial do Instagram */}
              <svg aria-label="Verificado" width="14" height="14" viewBox="0 0 24 24" fill="#3897F0">
                <path d="M12.001.504a11.5 11.5 0 1 0 11.5 11.5 11.513 11.513 0 0 0-11.5-11.5Zm5.706 9.21-6.5 6.495a1 1 0 0 1-1.414-.001l-3.5-3.503a1 1 0 1 1 1.414-1.414l2.794 2.796L16.293 8.3a1 1 0 0 1 1.414 1.415Z" />
              </svg>
            </div>
            {location ? (
              <span style={{ fontSize: 11, color: '#8e8e8e', lineHeight: '14px' }}>{location}</span>
            ) : null}
          </div>
        </div>

        {/* Three dots */}
        <button type="button" aria-label="Mais opções" style={{ padding: 4 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="#262626">
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="6"  cy="12" r="1.5" />
            <circle cx="18" cy="12" r="1.5" />
          </svg>
        </button>
      </div>

      {/* ── Post Image ── */}
      <div className="w-full relative" style={{ aspectRatio: postAspectRatio, background: '#efefef' }}>
        {currentImage && (!currentImage.startsWith('data:') || currentImage.startsWith('data:image/png') || currentImage.startsWith('data:image/jpeg') || currentImage.startsWith('data:image/webp')) ? (
          <img src={currentImage} alt="Post" className="w-full h-full object-cover" />
        ) : resolvedHeadline ? (
          <div
            className="w-full h-full relative flex flex-col items-center justify-center overflow-hidden"
            style={{ background: `linear-gradient(145deg, #0f172a 0%, ${arteBgColor || '#d35400'}55 100%)` }}
          >
            {/* Accent bar */}
            <div style={{
              width: 48, height: 3, borderRadius: 2,
              background: arteBgColor || '#d35400',
              marginBottom: 14, opacity: 0.9,
            }} />
            {/* Headline */}
            <p
              className="text-white text-center font-bold leading-tight tracking-tight"
              style={{
                fontSize: 22, padding: '0 28px',
                textShadow: '0 2px 8px rgba(0,0,0,0.45)',
              }}
            >
              {resolvedHeadline}
            </p>
            {/* Body */}
            {resolvedBody ? (
              <p
                className="text-center mt-3"
                style={{
                  fontSize: 13, padding: '0 28px',
                  color: 'rgba(255,255,255,0.72)',
                  lineHeight: 1.5,
                }}
              >
                {resolvedBody}
              </p>
            ) : null}
            {/* Subtle corner accent */}
            <div style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 56, height: 56,
              background: arteBgColor || '#d35400',
              opacity: 0.15,
              borderTopLeftRadius: '100%',
            }} />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#c0c0c0" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159" />
              <path d="M15.75 13.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909" />
              <circle cx="8.5" cy="8.5" r="1" />
            </svg>
          </div>
        )}

        {/* Carousel navigation arrows */}
        {isCarousel && totalSlides > 1 && (
          <>
            {currentSlide > 0 && (
              <button
                onClick={handlePrev}
                style={{
                  position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'rgba(255,255,255,0.85)', borderRadius: '50%',
                  width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: 'none', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#262626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
            )}
            {currentSlide < totalSlides - 1 && (
              <button
                onClick={handleNext}
                style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'rgba(255,255,255,0.85)', borderRadius: '50%',
                  width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: 'none', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#262626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            )}
          </>
        )}

        {/* Carousel counter — só aparece em carrossel */}
        {isCarousel && totalSlides > 1 && (
          <div style={{
            position: 'absolute', top: 12, right: 12,
            background: 'rgba(18,18,18,0.70)', borderRadius: 100,
            padding: '3px 8px',
          }}>
            <span style={{ color: '#F9F9F9', fontSize: 12 }}>{currentSlide + 1}/{totalSlides}</span>
          </div>
        )}
      </div>

      {/* ── Action Bar ── */}
      <div className="flex items-center justify-between px-3 pt-3 pb-1">
        <div className="flex items-center gap-4">
          {/* Heart — official Instagram filled heart path */}
          <button>
            <svg aria-label="Curtir" width="26" height="26" viewBox="0 0 24 24" fill="#ED4956">
              <path d="M16.792 3.904A4.989 4.989 0 0 1 21.5 9.122c0 3.072-2.652 4.959-5.197 7.222-2.512 2.243-3.865 3.469-4.303 3.752-.477-.309-2.143-1.823-4.303-3.752C5.141 14.072 2.5 12.167 2.5 9.122a4.989 4.989 0 0 1 4.708-5.218 4.21 4.21 0 0 1 3.675 1.941c.84 1.175.98 1.763 1.12 1.763s.278-.588 1.11-1.766a4.17 4.17 0 0 1 3.679-1.938Z" />
            </svg>
          </button>
          {/* Comment — official Instagram bubble */}
          <button>
            <svg aria-label="Comentar" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#262626" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.656 17.008a9.993 9.993 0 1 0-3.59 3.615L22 22Z" />
            </svg>
          </button>
          {/* Share */}
          <button>
            <svg aria-label="Compartilhar" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#262626" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        {/* Bookmark */}
        <button>
          <svg aria-label="Salvar" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#262626" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
          </svg>
        </button>
      </div>

      {/* ── Carousel dots — só aparecem em carrossel ── */}
      {isCarousel && totalSlides > 1 && (
        <div className="flex justify-center items-center gap-1.5 py-1.5">
          {allSlides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              style={{
                width: 6, height: 6, borderRadius: '50%', border: 'none', padding: 0, cursor: 'pointer',
                background: idx === currentSlide ? '#3897F0' : 'rgba(0,0,0,0.15)',
                transition: 'background 0.2s',
              }}
            />
          ))}
        </div>
      )}

      {/* ── Likes ── */}
      <div className="px-3 pb-1">
        <p style={{ fontSize: 14, fontWeight: 600, lineHeight: '18px' }}>{likesLabel} curtidas</p>
      </div>

      {/* ── Caption ── */}
      <div className="px-3 pb-1">
        {renderCaption(username, caption || '')}
        {(caption || '').length > 125 && (
          <span style={{ fontSize: 14, color: 'rgba(0,0,0,0.40)', cursor: 'pointer' }}>
            {' '}... mais
          </span>
        )}
      </div>

      {/* ── View comments ── */}
      <div className="px-3 pb-1">
        <p style={{ fontSize: 14, color: 'rgba(0,0,0,0.40)' }}>
          Ver todos os {commentsCount} comentários
        </p>
      </div>

      {/* ── Date ── */}
      <div className="px-3 pb-4">
        <p style={{ fontSize: 10, color: 'rgba(0,0,0,0.40)', textTransform: 'uppercase', letterSpacing: '0.05px' }}>
          {dateLabel}
        </p>
      </div>
    </div>
  );
};
