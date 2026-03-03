'use client';

import React, { useState } from 'react';

interface FacebookEventProps {
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
  eventDate?: string;
  eventTime?: string;
  location?: string;
  interestedCount?: number;
  goingCount?: number;
}

type RsvpState = 'Vou' | 'Talvez' | 'Não vou' | null;

export const FacebookEvent: React.FC<FacebookEventProps> = ({
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
  eventDate = 'Sábado, 28 de março de 2026',
  eventTime = '19h00 – 23h00',
  location = 'Centro de Eventos, São Paulo',
  interestedCount = 1432,
  goingCount = 387,
}) => {
  const [rsvp, setRsvp] = useState<RsvpState>(null);
  const [goingLocal, setGoingLocal] = useState(goingCount);

  const resolvedTitle = headline ?? title ?? name ?? brandName ?? 'Nome do Evento';
  const resolvedDescription = body ?? caption ?? description ?? text ?? '';
  const resolvedImage = image ?? postImage ?? thumbnail ?? profileImage ?? '';
  const organizer = username ?? brandName ?? name ?? 'Organizador';

  const handleRsvp = (option: RsvpState) => {
    if (rsvp === 'Vou' && option !== 'Vou') setGoingLocal((n) => Math.max(0, n - 1));
    if (rsvp !== 'Vou' && option === 'Vou') setGoingLocal((n) => n + 1);
    setRsvp((prev) => (prev === option ? null : option));
  };

  const rsvpOptions: RsvpState[] = ['Vou', 'Talvez', 'Não vou'];

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
        @keyframes fb-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .fb-event-cover-placeholder {
          animation: fb-pulse 2s ease-in-out infinite;
        }
        .fb-rsvp-btn:hover {
          filter: brightness(0.95);
        }
      `}</style>

      {/* Cover photo */}
      <div style={{ position: 'relative', width: '100%', height: 200, background: '#e4e6eb' }}>
        {resolvedImage ? (
          <img
            src={resolvedImage}
            alt={resolvedTitle}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div
            className="fb-event-cover-placeholder"
            style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, #1877f2 0%, #42a4ff 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
        )}
        {/* Event badge */}
        <div style={{
          position: 'absolute',
          top: 12,
          left: 12,
          background: 'rgba(0,0,0,0.6)',
          color: '#fff',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 0.5,
          padding: '3px 8px',
          borderRadius: 4,
          textTransform: 'uppercase',
        }}>
          Evento
        </div>
      </div>

      <div style={{ padding: '16px 16px 12px' }}>
        {/* Event name */}
        <h2 style={{ margin: '0 0 12px', fontSize: 20, fontWeight: 700, lineHeight: 1.2, color: '#050505' }}>
          {resolvedTitle}
        </h2>

        {/* Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          {/* Date & time */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1877f2" strokeWidth="2" style={{ flexShrink: 0, marginTop: 2 }}>
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#050505' }}>{eventDate}</div>
              <div style={{ fontSize: 13, color: '#65676b' }}>{eventTime}</div>
            </div>
          </div>

          {/* Location */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1877f2" strokeWidth="2" style={{ flexShrink: 0, marginTop: 2 }}>
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <div style={{ fontSize: 14, color: '#050505' }}>{location}</div>
          </div>

          {/* Organizer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#65676b" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <div style={{ fontSize: 13, color: '#65676b' }}>
              <span style={{ color: '#050505', fontWeight: 500 }}>{goingLocal.toLocaleString('pt-BR')}</span> vão · <span style={{ color: '#050505', fontWeight: 500 }}>{interestedCount.toLocaleString('pt-BR')}</span> interessados
            </div>
          </div>
        </div>

        {/* Description */}
        {resolvedDescription ? (
          <p style={{ fontSize: 14, color: '#050505', lineHeight: 1.4, margin: '0 0 14px' }}>
            {resolvedDescription}
          </p>
        ) : null}

        {/* Organizer label */}
        <div style={{ fontSize: 12, color: '#65676b', marginBottom: 12 }}>
          Organizado por <span style={{ fontWeight: 600, color: '#050505' }}>{organizer}</span>
        </div>

        {/* RSVP buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          {rsvpOptions.map((option) => {
            const isActive = rsvp === option;
            const isPrimary = option === 'Vou';
            return (
              <button
                key={option}
                type="button"
                aria-label={`Confirmar presença: ${option}`}
                className="fb-rsvp-btn"
                onClick={() => handleRsvp(option)}
                style={{
                  flex: isPrimary ? 2 : 1,
                  padding: '8px 6px',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: isActive
                    ? (isPrimary ? '#1877f2' : '#e4e6eb')
                    : (isPrimary ? '#e7f3ff' : '#e4e6eb'),
                  color: isActive
                    ? (isPrimary ? '#fff' : '#050505')
                    : (isPrimary ? '#1877f2' : '#050505'),
                  transition: 'background 0.15s',
                }}
              >
                {isActive && option === 'Vou' ? '✓ Vou' : option}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
