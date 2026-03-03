'use client';

import React, { useState } from 'react';

interface ClubhouseRoomProps {
  // Studio base aliases
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
  // Component-specific
  memberCount?: number;
  speakers?: Array<{ name: string; avatar?: string; isModerator?: boolean }>;
  audience?: Array<{ name: string; avatar?: string }>;
}

export const ClubhouseRoom: React.FC<ClubhouseRoomProps> = ({
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
  memberCount = 284,
  speakers = [
    { name: 'Mariana V.', isModerator: true },
    { name: 'Carlos T.', isModerator: false },
    { name: 'Julia P.', isModerator: false },
  ],
  audience = [
    { name: 'A' },
    { name: 'B' },
    { name: 'C' },
    { name: 'D' },
    { name: 'E' },
    { name: 'F' },
  ],
}) => {
  const [handRaised, setHandRaised] = useState(false);
  const [muted, setMuted] = useState(false);

  const roomName =
    headline ??
    title ??
    name ??
    brandName ??
    body ??
    caption ??
    description ??
    text ??
    'Sala do Clubhouse';

  // Gradient palettes for avatar placeholders
  const avatarGradients = [
    'linear-gradient(135deg, #F7C948 0%, #F07B39 100%)',
    'linear-gradient(135deg, #7B61FF 0%, #C05AEA 100%)',
    'linear-gradient(135deg, #3DD6F5 0%, #3B82F6 100%)',
    'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
    'linear-gradient(135deg, #43E97B 0%, #38F9D7 100%)',
    'linear-gradient(135deg, #F7C948 0%, #F07B39 100%)',
  ];

  const speakerGradients = [
    'linear-gradient(135deg, #F7C948 0%, #EA8D2F 100%)',
    'linear-gradient(135deg, #A78BFA 0%, #7C3AED 100%)',
    'linear-gradient(135deg, #34D399 0%, #059669 100%)',
  ];

  return (
    <>
      {/* Pulse animation for speaking indicator */}
      <style>{`
        @keyframes chPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(247,201,72,0.5); }
          50% { box-shadow: 0 0 0 6px rgba(247,201,72,0); }
        }
        .ch-speaking {
          animation: chPulse 1.6s ease-in-out infinite;
        }
      `}</style>

      <div
        style={{
          width: 360,
          background: '#1C1C1E',
          borderRadius: 20,
          overflow: 'hidden',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
        }}
      >
        {/* Top bar */}
        <div
          style={{
            padding: '16px 18px 12px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {/* Live pill + member count */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                background: 'rgba(247,201,72,0.15)',
                border: '1px solid rgba(247,201,72,0.35)',
                borderRadius: 20,
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: 700,
                color: '#F7C948',
                letterSpacing: 0.3,
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#F7C948',
                  flexShrink: 0,
                }}
              />
              Ao vivo
            </div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
              {memberCount.toLocaleString('pt-BR')} pessoas
            </div>
          </div>

          {/* Room name */}
          <div
            style={{
              color: '#F2F2F7',
              fontSize: 16,
              fontWeight: 700,
              lineHeight: 1.35,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {roomName}
          </div>
        </div>

        {/* Speakers section */}
        <div style={{ padding: '18px 18px 14px' }}>
          <div
            style={{
              color: 'rgba(255,255,255,0.4)',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              marginBottom: 16,
            }}
          >
            Falando agora
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap' }}>
            {speakers.slice(0, 3).map((speaker, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                {/* Avatar with speaking pulse */}
                <div
                  className="ch-speaking"
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: '50%',
                    background: speaker.avatar ? undefined : speakerGradients[i % speakerGradients.length],
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    fontWeight: 700,
                    color: '#fff',
                    border: '2.5px solid rgba(247,201,72,0.6)',
                    position: 'relative',
                    animationDelay: `${i * 0.4}s`,
                  }}
                >
                  {speaker.avatar ? (
                    <img
                      src={speaker.avatar}
                      alt={speaker.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    speaker.name[0]?.toUpperCase()
                  )}

                  {/* Moderator star badge */}
                  {speaker.isModerator && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        background: '#F7C948',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        border: '2px solid #1C1C1E',
                      }}
                    >
                      ★
                    </div>
                  )}
                </div>

                {/* Speaker name */}
                <div
                  style={{
                    color: '#F2F2F7',
                    fontSize: 12,
                    fontWeight: 600,
                    textAlign: 'center',
                    maxWidth: 80,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {speaker.name}
                </div>
                {speaker.isModerator && (
                  <div
                    style={{
                      color: '#F7C948',
                      fontSize: 10,
                      fontWeight: 500,
                      marginTop: -5,
                    }}
                  >
                    Moderador
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div
          style={{
            height: 1,
            background: 'rgba(255,255,255,0.06)',
            margin: '0 18px',
          }}
        />

        {/* Audience section */}
        <div style={{ padding: '14px 18px 16px' }}>
          <div
            style={{
              color: 'rgba(255,255,255,0.4)',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              marginBottom: 12,
            }}
          >
            Ouvindo
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {audience.slice(0, 6).map((member, i) => (
              <div
                key={i}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: member.avatar ? undefined : avatarGradients[i % avatarGradients.length],
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#fff',
                  border: '1.5px solid rgba(255,255,255,0.08)',
                }}
              >
                {member.avatar ? (
                  <img
                    src={member.avatar}
                    alt={member.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  member.name[0]?.toUpperCase()
                )}
              </div>
            ))}

            {memberCount > 6 && (
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.5)',
                  border: '1.5px solid rgba(255,255,255,0.08)',
                }}
              >
                +{memberCount - 9}
              </div>
            )}
          </div>
        </div>

        {/* Bottom action bar */}
        <div
          style={{
            background: '#2C2C2E',
            padding: '14px 22px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {/* Mute toggle */}
          <button
            type="button"
            aria-label={muted ? 'Ativar microfone' : 'Silenciar microfone'}
            onClick={() => setMuted((v) => !v)}
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: muted ? 'rgba(255,59,48,0.15)' : 'rgba(255,255,255,0.08)',
              border: muted ? '1.5px solid rgba(255,59,48,0.4)' : '1.5px solid rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              cursor: 'pointer',
              transition: 'all 0.18s ease',
            }}
          >
            {muted ? '🔕' : '🎙'}
          </button>

          {/* Raise hand toggle */}
          <button
            type="button"
            aria-label={handRaised ? 'Baixar mão' : 'Levantar mão'}
            onClick={() => setHandRaised((v) => !v)}
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: handRaised ? '#F7C948' : 'rgba(247,201,72,0.12)',
              border: handRaised ? '2px solid #F7C948' : '2px solid rgba(247,201,72,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              cursor: 'pointer',
              transition: 'all 0.18s ease',
              boxShadow: handRaised ? '0 0 16px rgba(247,201,72,0.4)' : 'none',
            }}
          >
            ✋
          </button>

          {/* Leave quietly */}
          <button
            type="button"
            aria-label="Sair da sala em silêncio"
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'rgba(255,59,48,0.12)',
              border: '1.5px solid rgba(255,59,48,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              cursor: 'pointer',
              transition: 'all 0.18s ease',
            }}
          >
            🚪
          </button>
        </div>
      </div>
    </>
  );
};
