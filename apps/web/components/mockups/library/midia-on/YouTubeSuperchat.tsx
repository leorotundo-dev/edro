'use client';

import React, { useState } from 'react';

// ─── Types ─────────────────────────────────────────────────────────────────

type SuperChatTier = 'blue' | 'lightblue' | 'green' | 'yellow' | 'red';

interface YouTubeSuperchatProps {
  // Donation amount (numeric, in BRL)
  donationAmount?: number;
  // Sender identity aliases
  senderName?: string;
  name?: string;
  username?: string;
  // Sender avatar aliases
  senderAvatar?: string;
  profileImage?: string;
  image?: string;
  // Message aliases
  message?: string;
  body?: string;
  text?: string;
  caption?: string;
  // Channel aliases
  channelName?: string;
  brandName?: string;
  // Explicit tier override
  tier?: SuperChatTier;
  // Pin duration in seconds
  pinnedSeconds?: number;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function getTierFromAmount(amount: number): SuperChatTier {
  if (amount >= 100) return 'red';
  if (amount >= 50) return 'yellow';
  if (amount >= 20) return 'green';
  if (amount >= 5) return 'lightblue';
  return 'blue';
}

interface TierStyle {
  bg: string;
  headerBg: string;
  textColor: string;
  amountColor: string;
}

const TIER_STYLES: Record<SuperChatTier, TierStyle> = {
  blue: {
    bg: '#1565C0',
    headerBg: '#1565C0',
    textColor: '#fff',
    amountColor: '#fff',
  },
  lightblue: {
    bg: '#2979FF',
    headerBg: '#1565C0',
    textColor: '#fff',
    amountColor: '#fff',
  },
  green: {
    bg: '#00897B',
    headerBg: '#00695C',
    textColor: '#fff',
    amountColor: '#fff',
  },
  yellow: {
    bg: '#FFD600',
    headerBg: '#F9A825',
    textColor: '#212121',
    amountColor: '#212121',
  },
  red: {
    bg: '#E62117',
    headerBg: '#C0190F',
    textColor: '#fff',
    amountColor: '#fff',
  },
};

function formatBRL(amount: number): string {
  return `R$${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── SVG Icons ─────────────────────────────────────────────────────────────

const YouTubeIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

const PinIcon = ({ size = 14, color = '#fff' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
    <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
  </svg>
);

// ─── Component ─────────────────────────────────────────────────────────────

export const YouTubeSuperchat: React.FC<YouTubeSuperchatProps> = ({
  donationAmount = 10,
  senderName,
  name,
  username,
  senderAvatar,
  profileImage,
  image,
  message,
  body,
  text,
  caption,
  channelName,
  brandName,
  tier: tierProp,
  pinnedSeconds = 120,
}) => {
  const [pinned, setPinned] = useState(true);

  const resolvedAmount = donationAmount;
  const resolvedTier = tierProp ?? getTierFromAmount(resolvedAmount);
  const ts = TIER_STYLES[resolvedTier];

  const displayName = senderName || name || username || 'Usuário';
  const displayAvatar = senderAvatar || profileImage || image || '';
  const displayMessage = message || body || text || caption || '';
  const displayChannel = channelName || brandName || 'Canal';
  const textColor = ts.textColor;

  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div
      style={{
        width: 340,
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 2px 12px rgba(0,0,0,0.28)',
        fontFamily: '"Roboto", Arial, sans-serif',
        userSelect: 'none',
      }}
    >
      {/* ── Pin indicator bar ── */}
      {pinned && (
        <div
          style={{
            background: '#212121',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#aaa', fontSize: 11 }}>
            <PinIcon size={12} color="#aaa" />
            <span>Super Chat fixado · {pinnedSeconds}s</span>
          </div>
          <button
            type="button"
            aria-label="Desafixar Super Chat"
            onClick={() => setPinned(false)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#aaa',
              fontSize: 16,
              lineHeight: 1,
              padding: '0 2px',
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* ── Header: avatar + name + amount ── */}
      <div
        style={{
          background: ts.headerBg,
          padding: '10px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            overflow: 'hidden',
            flexShrink: 0,
            background: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid rgba(255,255,255,0.35)',
          }}
        >
          {displayAvatar ? (
            <img
              src={displayAvatar}
              alt={displayName}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <span style={{ fontSize: 14, fontWeight: 700, color: textColor }}>{initial}</span>
          )}
        </div>

        {/* Sender name */}
        <span
          style={{
            flex: 1,
            fontSize: 13,
            fontWeight: 700,
            color: textColor,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {displayName}
        </span>

        {/* Amount badge */}
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: ts.amountColor,
            background: 'rgba(0,0,0,0.15)',
            borderRadius: 6,
            padding: '2px 8px',
            whiteSpace: 'nowrap',
          }}
        >
          {formatBRL(resolvedAmount)}
        </span>
      </div>

      {/* ── Message body ── */}
      {displayMessage && (
        <div
          style={{
            background: ts.bg,
            padding: '8px 12px 10px',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 13,
              lineHeight: '1.5',
              color: textColor,
              wordBreak: 'break-word',
            }}
          >
            {displayMessage}
          </p>
        </div>
      )}

      {/* ── Footer: "Super Chat" label + YouTube icon ── */}
      <div
        style={{
          background: '#0F0F0F',
          padding: '6px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ color: '#FF0000' }}>
            <YouTubeIcon size={14} />
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: '0.02em' }}>
            Super Chat
          </span>
        </div>
        <span
          style={{
            fontSize: 10,
            color: '#aaa',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: 160,
          }}
        >
          {displayChannel}
        </span>
      </div>
    </div>
  );
};
