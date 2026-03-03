'use client';

import React, { useState } from 'react';

interface InstagramBroadcastProps {
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
  memberCount?: string | number;
  pollQuestion?: string;
  option1?: string;
  option2?: string;
  pollVotes1?: number;
  pollVotes2?: number;
}

const IG_GRADIENT = 'linear-gradient(45deg, #405DE6, #833AB4, #C13584, #E1306C, #FD1D1D)';

function formatCount(n: string | number): string {
  if (typeof n === 'string') return n;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}mil`;
  return String(n);
}

export const InstagramBroadcast: React.FC<InstagramBroadcastProps> = ({
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
  memberCount = 12400,
  pollQuestion,
  option1 = 'Sim, com certeza!',
  option2 = 'Ainda tenho dúvidas',
  pollVotes1 = 68,
  pollVotes2 = 32,
}) => {
  const [voted, setVoted] = useState<null | 1 | 2>(null);
  const [joined, setJoined] = useState(false);

  const channelName = name ?? brandName ?? username ?? 'Canal Oficial';
  const resolvedUsername = username ?? name ?? brandName ?? 'canaloficial';
  const normalizedUser = resolvedUsername.startsWith('@') ? resolvedUsername : `@${resolvedUsername}`;
  const avatarSrc = profileImage ?? image ?? thumbnail ?? '';
  const postImg = postImage ?? image ?? thumbnail ?? '';
  const message1 = body ?? caption ?? text ?? 'Bem-vindos ao nosso canal de transmissão! Aqui você vai receber novidades em primeira mão. 🎉';
  const message2 = description ?? headline ?? title ?? 'Fique ligado para os próximos lançamentos e conteúdos exclusivos que preparamos para vocês!';
  const pollQ = pollQuestion ?? 'Você está animado com as novidades?';

  const memberLabel = formatCount(memberCount);

  const totalVotes = pollVotes1 + pollVotes2;
  const pct1 = totalVotes > 0 ? Math.round((pollVotes1 / totalVotes) * 100) : 50;
  const pct2 = 100 - pct1;

  const initials = channelName
    .split(' ')
    .slice(0, 2)
    .map((w: string) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div
      style={{
        width: 320,
        background: '#1C1C1E',
        borderRadius: 16,
        overflow: 'hidden',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
        color: '#fff',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        flexShrink: 0,
      }}
    >
      {/* ── Top bar ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '12px 14px',
          borderBottom: '1px solid #2C2C2E',
          gap: 10,
        }}
      >
        {/* Back arrow */}
        <button
          type="button"
          aria-label="Voltar"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            color: '#0A84FF',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <svg width="10" height="18" viewBox="0 0 10 18" fill="none">
            <path d="M9 1L1 9L9 17" stroke="#0A84FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Channel avatar with lightning bolt badge */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              overflow: 'hidden',
              background: 'linear-gradient(135deg, #833AB4, #E1306C)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              fontWeight: 700,
              color: '#fff',
            }}
          >
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt={channelName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              initials
            )}
          </div>
          {/* Lightning bolt badge */}
          <div
            style={{
              position: 'absolute',
              bottom: -2,
              right: -2,
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: '#0A84FF',
              border: '2px solid #1C1C1E',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 8,
            }}
          >
            ⚡
          </div>
        </div>

        {/* Channel name + member count */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {channelName}
          </div>
          <div style={{ fontSize: 11, color: '#8E8E93' }}>
            {memberLabel} membros
          </div>
        </div>

        {/* More options */}
        <button
          type="button"
          aria-label="Mais opções"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            color: '#8E8E93',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="5" cy="12" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="19" cy="12" r="1.5" />
          </svg>
        </button>
      </div>

      {/* ── "Canal de transmissão" label ── */}
      <div
        style={{
          textAlign: 'center',
          fontSize: 12,
          color: '#8E8E93',
          padding: '8px 0 4px',
          letterSpacing: '0.02em',
        }}
      >
        Canal de transmissão
      </div>

      {/* ── Channel info card ── */}
      <div
        style={{
          margin: '8px 14px 12px',
          background: '#2C2C2E',
          borderRadius: 12,
          padding: '14px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        {/* Large avatar */}
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: '50%',
            overflow: 'hidden',
            background: 'linear-gradient(135deg, #833AB4, #E1306C)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            fontWeight: 700,
            color: '#fff',
            flexShrink: 0,
          }}
        >
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt={channelName}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            initials
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{channelName}</div>
          <div style={{ fontSize: 12, color: '#8E8E93', marginBottom: 6 }}>
            {normalizedUser} &bull; canal oficial
          </div>
          <div style={{ fontSize: 12, color: '#8E8E93' }}>{memberLabel} membros</div>
        </div>

        <button
          type="button"
          aria-label="Entrar no canal"
          onClick={() => setJoined((j) => !j)}
          style={{
            background: joined ? 'transparent' : '#0A84FF',
            border: joined ? '1.5px solid #3A3A3C' : 'none',
            borderRadius: 8,
            color: joined ? '#8E8E93' : '#fff',
            fontSize: 13,
            fontWeight: 600,
            padding: '7px 14px',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          {joined ? 'Entrou' : 'Entrar'}
        </button>
      </div>

      {/* ── Messages area ── */}
      <div
        style={{
          padding: '4px 14px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {/* Timestamp */}
        <div style={{ textAlign: 'center', fontSize: 11, color: '#636366', marginBottom: 2 }}>
          Hoje às 10:32
        </div>

        {/* Message 1 — text bubble */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div
            style={{
              alignSelf: 'flex-start',
              background: '#2C2C2E',
              borderRadius: '4px 16px 16px 16px',
              padding: '10px 14px',
              maxWidth: '88%',
              fontSize: 14,
              lineHeight: '1.45',
              color: '#fff',
            }}
          >
            {message1}
          </div>
          <div style={{ fontSize: 11, color: '#636366', paddingLeft: 4 }}>10:32</div>
        </div>

        {/* Message 2 — text bubble */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div
            style={{
              alignSelf: 'flex-start',
              background: '#2C2C2E',
              borderRadius: '4px 16px 16px 16px',
              padding: '10px 14px',
              maxWidth: '88%',
              fontSize: 14,
              lineHeight: '1.45',
              color: '#fff',
            }}
          >
            {message2}
          </div>
          <div style={{ fontSize: 11, color: '#636366', paddingLeft: 4 }}>10:34</div>
        </div>

        {/* Optional image bubble */}
        {postImg && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div
              style={{
                alignSelf: 'flex-start',
                borderRadius: '4px 16px 16px 16px',
                overflow: 'hidden',
                maxWidth: '75%',
              }}
            >
              <img
                src={postImg}
                alt="Imagem do canal"
                style={{ display: 'block', width: '100%', maxHeight: 160, objectFit: 'cover' }}
              />
            </div>
            <div style={{ fontSize: 11, color: '#636366', paddingLeft: 4 }}>10:35</div>
          </div>
        )}

        {/* Poll message bubble */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div
            style={{
              alignSelf: 'flex-start',
              background: '#2C2C2E',
              borderRadius: '4px 16px 16px 16px',
              padding: '12px 14px',
              width: '88%',
              fontSize: 14,
            }}
          >
            {/* Poll header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 10,
                color: '#8E8E93',
                fontSize: 12,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" />
              </svg>
              Enquete
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 12, lineHeight: '1.35' }}>
              {pollQ}
            </div>

            {/* Option 1 */}
            <button
              type="button"
              aria-label={`Votar: ${option1}`}
              onClick={() => !voted && setVoted(1)}
              style={{
                display: 'block',
                width: '100%',
                marginBottom: 8,
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: voted ? 'default' : 'pointer',
                textAlign: 'left',
              }}
            >
              <div
                style={{
                  borderRadius: 8,
                  overflow: 'hidden',
                  border: `1.5px solid ${voted === 1 ? '#0A84FF' : '#3A3A3C'}`,
                  position: 'relative',
                }}
              >
                {voted && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      height: '100%',
                      width: `${pct1}%`,
                      background: voted === 1 ? 'rgba(10,132,255,0.25)' : 'rgba(255,255,255,0.08)',
                      transition: 'width 0.4s ease',
                    }}
                  />
                )}
                <div
                  style={{
                    position: 'relative',
                    padding: '9px 12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: 13,
                    color: voted === 1 ? '#0A84FF' : '#fff',
                    fontWeight: voted === 1 ? 700 : 400,
                  }}
                >
                  <span>{option1}</span>
                  {voted && <span style={{ fontSize: 12, color: '#8E8E93' }}>{pct1}%</span>}
                </div>
              </div>
            </button>

            {/* Option 2 */}
            <button
              type="button"
              aria-label={`Votar: ${option2}`}
              onClick={() => !voted && setVoted(2)}
              style={{
                display: 'block',
                width: '100%',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: voted ? 'default' : 'pointer',
                textAlign: 'left',
              }}
            >
              <div
                style={{
                  borderRadius: 8,
                  overflow: 'hidden',
                  border: `1.5px solid ${voted === 2 ? '#0A84FF' : '#3A3A3C'}`,
                  position: 'relative',
                }}
              >
                {voted && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      height: '100%',
                      width: `${pct2}%`,
                      background: voted === 2 ? 'rgba(10,132,255,0.25)' : 'rgba(255,255,255,0.08)',
                      transition: 'width 0.4s ease',
                    }}
                  />
                )}
                <div
                  style={{
                    position: 'relative',
                    padding: '9px 12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: 13,
                    color: voted === 2 ? '#0A84FF' : '#fff',
                    fontWeight: voted === 2 ? 700 : 400,
                  }}
                >
                  <span>{option2}</span>
                  {voted && <span style={{ fontSize: 12, color: '#8E8E93' }}>{pct2}%</span>}
                </div>
              </div>
            </button>

            {voted && (
              <div style={{ fontSize: 11, color: '#636366', marginTop: 8, textAlign: 'right' }}>
                {totalVotes.toLocaleString('pt-BR')} votos
              </div>
            )}
          </div>
          <div style={{ fontSize: 11, color: '#636366', paddingLeft: 4 }}>10:40</div>
        </div>
      </div>

      {/* ── Bottom CTA button ── */}
      <div style={{ padding: '10px 14px 18px' }}>
        <button
          type="button"
          aria-label="Entrar no canal de transmissão"
          onClick={() => setJoined(true)}
          style={{
            display: 'block',
            width: '100%',
            padding: '13px 0',
            background: IG_GRADIENT,
            border: 'none',
            borderRadius: 10,
            color: '#fff',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            textAlign: 'center',
            letterSpacing: '0.01em',
          }}
        >
          {joined ? 'Você entrou no canal ✓' : 'Entrar no canal'}
        </button>
      </div>
    </div>
  );
};
