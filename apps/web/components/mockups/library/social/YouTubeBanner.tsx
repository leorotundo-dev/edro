'use client';

import React, { useState } from 'react';

interface YouTubeBannerProps {
  // Banner / background
  bannerImage?: string;
  image?: string;
  // Avatar / channel image
  channelImage?: string;
  profileImage?: string;
  thumbnail?: string;
  // Channel name
  channelName?: string;
  name?: string;
  username?: string;
  brandName?: string;
  // Subscriber count
  subscriberCount?: string | number;
  subscribers?: string;
  // Description
  channelDescription?: string;
  description?: string;
  body?: string;
  caption?: string;
  // Extras
  isVerified?: boolean;
  headline?: string;
}

function formatSubs(s: string | number | undefined): string {
  if (!s) return '0 inscritos';
  if (typeof s === 'string') return s;
  if (s >= 1_000_000) return `${(s / 1_000_000).toFixed(1)}M de inscritos`;
  if (s >= 1_000) return `${(s / 1_000).toFixed(1)}mil inscritos`;
  return `${s} inscritos`;
}

const YouTubeLogoSVG = () => (
  <svg width="90" height="20" viewBox="0 0 90 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M27.9727 3.12324C27.6435 1.89289 26.6768 0.926191 25.4464 0.596986C23.2288 0 14.3991 0 14.3991 0C14.3991 0 5.56941 0 3.35177 0.596986C2.12142 0.926191 1.15473 1.89289 0.825523 3.12324C0.228516 5.34091 0.228516 10 0.228516 10C0.228516 10 0.228516 14.6591 0.825523 16.8768C1.15473 18.1071 2.12142 19.0738 3.35177 19.403C5.56941 20 14.3991 20 14.3991 20C14.3991 20 23.2288 20 25.4464 19.403C26.6768 19.0738 27.6435 18.1071 27.9727 16.8768C28.5697 14.6591 28.5697 10 28.5697 10C28.5697 10 28.5697 5.34091 27.9727 3.12324Z"
      fill="#FF0000"
    />
    <path d="M11.5957 14.2857L18.9175 10L11.5957 5.71429V14.2857Z" fill="white" />
    <path
      d="M34.6024 17.9662L31.3983 6.46875H33.6895L35.3714 13.4538H35.455L37.2916 6.46875H39.5412L36.3371 17.9662V23.2273H34.6024V17.9662Z"
      fill="#282828"
    />
    <path
      d="M40.2222 22.5C39.7012 22.1733 39.3267 21.6733 39.0989 21C38.8711 20.3267 38.7572 19.4091 38.7572 18.2472V16.0341C38.7572 14.8636 38.8839 13.9375 39.1373 13.2557C39.3906 12.5739 39.7905 12.0739 40.337 11.7557C40.8835 11.4375 41.6104 11.2784 42.5177 11.2784C43.4164 11.2784 44.1262 11.4375 44.6471 11.7557C45.1679 12.0739 45.5508 12.5739 45.7957 13.2557C46.0406 13.9375 46.163 14.8636 46.163 16.0341V18.2472C46.163 19.4091 46.0449 20.3267 45.8086 21C45.5722 21.6733 45.1935 22.1733 44.6726 22.5C44.1517 22.8267 43.4291 22.9901 42.505 22.9901C41.5553 22.9901 40.7432 22.8267 40.2222 22.5ZM43.641 21.2301C43.8177 20.929 43.9061 20.4503 43.9061 19.794V14.4659C43.9061 13.8267 43.8177 13.3565 43.641 13.0554C43.4644 12.7543 43.1913 12.6037 42.8218 12.6037C42.4607 12.6037 42.1961 12.7543 42.0281 13.0554C41.8599 13.3565 41.7758 13.8267 41.7758 14.4659V19.794C41.7758 20.4503 41.8599 20.929 42.0281 21.2301C42.1961 21.5312 42.4564 21.6818 42.8091 21.6818C43.1786 21.6818 43.4644 21.5312 43.641 21.2301Z"
      fill="#282828"
    />
    <path
      d="M53.3877 22.7898H51.7431L51.5579 21.6392H51.5077C50.9783 22.5369 50.2218 22.9858 49.2381 22.9858C48.5629 22.9858 48.0632 22.7727 47.739 22.3466C47.4147 21.9205 47.2526 21.2599 47.2526 20.3651V11.4801H49.5017V20.1974C49.5017 20.625 49.5648 20.9347 49.691 21.1264C49.8171 21.3182 50.009 21.4141 50.2665 21.4141C50.4933 21.4141 50.7126 21.3395 50.9241 21.1903C51.1357 21.0412 51.2871 20.8537 51.3786 20.6278V11.4801H53.6277V22.7898H53.3877Z"
      fill="#282828"
    />
    <path
      d="M63.0252 9.27273H60.776V22.7898H58.527V9.27273H56.2778V7.27273H63.0252V9.27273Z"
      fill="#282828"
    />
    <path
      d="M68.0832 22.7898H66.4386L66.2534 21.6392H66.2032C65.6738 22.5369 64.9173 22.9858 63.9336 22.9858C63.2584 22.9858 62.7587 22.7727 62.4345 22.3466C62.1103 21.9205 61.9482 21.2599 61.9482 20.3651V11.4801H64.1972V20.1974C64.1972 20.625 64.2603 20.9347 64.3865 21.1264C64.5127 21.3182 64.7046 21.4141 64.962 21.4141C65.1888 21.4141 65.4081 21.3395 65.6196 21.1903C65.8312 21.0412 65.9826 20.8537 66.0741 20.6278V11.4801H68.3232V22.7898H68.0832Z"
      fill="#282828"
    />
    <path
      d="M76.1128 13.4077C75.9447 12.7429 75.6542 12.2557 75.2412 11.946C74.8283 11.6364 74.2861 11.4815 73.6151 11.4815C73.0983 11.4815 72.6179 11.6236 72.1741 11.9077C71.7302 12.1918 71.393 12.5611 71.1622 13.0156H71.1454V6.81818H68.9799V22.7898H70.8915L71.1037 21.8494H71.1538C71.3593 22.1974 71.6708 22.4815 72.0879 22.7017C72.505 22.9219 72.9616 23.0327 73.458 23.0327C74.3609 23.0327 75.0193 22.6278 75.4339 21.8182C75.8484 21.0085 76.0557 19.7557 76.0557 18.0597V16.4474C76.0599 15.0824 76.0767 14.0724 75.1128 13.4077H76.1128ZM73.8303 17.9901C73.8303 18.8295 73.7879 19.4986 73.7031 19.9972C73.6183 20.4959 73.4833 20.8565 73.2981 21.0795C73.1129 21.3026 72.8723 21.4141 72.5763 21.4141C72.3537 21.4141 72.1484 21.358 71.9601 21.2457C71.7718 21.1335 71.6244 20.9673 71.5184 20.747V13.9886C71.6074 13.7116 71.7547 13.4872 71.9601 13.3153C72.1654 13.1435 72.3833 13.0575 72.6137 13.0575C72.9013 13.0575 73.1268 13.1733 73.2897 13.4048C73.4527 13.6364 73.5617 14.0071 73.6165 14.517C73.6714 15.027 73.6983 15.7259 73.6983 16.6136L73.8303 17.9901Z"
      fill="#282828"
    />
    <path
      d="M82.8894 14.7685C82.7552 14.0966 82.5324 13.5966 82.221 13.2685C81.9096 12.9403 81.4795 12.7763 80.9306 12.7763C80.5018 12.7763 80.1027 12.9034 79.733 13.1577C79.3634 13.4119 79.0814 13.7457 78.887 14.1591H78.8703V6.81818H76.7048V22.7898H78.8703V21.3153H78.887C79.0814 21.7287 79.3592 22.0582 79.7204 22.3040C80.0816 22.5497 80.4891 22.6726 80.9432 22.6726C81.7861 22.6726 82.4107 22.2898 82.8172 21.5241C83.2236 20.7585 83.4269 19.6278 83.4269 18.1321V17.2898C83.4269 16.1321 83.3145 15.2301 82.8894 14.7685ZM81.1924 17.9815C81.1924 18.8381 81.1479 19.5 81.059 19.9673C80.9701 20.4347 80.8287 20.767 80.635 20.9645C80.4413 21.162 80.2049 21.2607 79.9258 21.2607C79.707 21.2607 79.5048 21.206 79.3194 21.0966C79.134 20.9872 78.9893 20.8196 78.8853 20.5938V14.7216C78.9766 14.4744 79.1192 14.277 79.3131 14.1293C79.507 13.9815 79.7154 13.9077 79.9384 13.9077C80.2174 13.9077 80.4455 14.0071 80.6223 14.206C80.799 14.4048 80.9315 14.7301 81.0197 15.1818C81.1079 15.6335 81.1519 16.2557 81.1519 17.049L81.1924 17.9815Z"
      fill="#282828"
    />
  </svg>
);

const VerifiedBadge = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="#AAAAAA">
    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
  </svg>
);

export const YouTubeBanner: React.FC<YouTubeBannerProps> = ({
  bannerImage,
  image,
  channelImage,
  profileImage,
  thumbnail,
  channelName,
  name,
  username,
  brandName,
  subscriberCount,
  subscribers,
  channelDescription,
  description,
  body,
  caption,
  isVerified = false,
  headline,
}) => {
  const [subscribed, setSubscribed] = useState(false);

  const displayBanner = bannerImage || image || '';
  const displayAvatar = channelImage || profileImage || thumbnail || '';
  const displayName = channelName || name || brandName || username || 'Nome do Canal';
  const displaySubs = subscribers || formatSubs(subscriberCount);
  const displayDesc = channelDescription || description || body || caption || headline || '';

  return (
    <div
      style={{
        width: 940,
        maxWidth: '100%',
        background: '#fff',
        fontFamily: '"Roboto", Arial, sans-serif',
        userSelect: 'none',
      }}
    >
      {/* Banner image area — 940×155 desktop crop */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: 155,
          background: displayBanner
            ? undefined
            : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 45%, #0f3460 100%)',
          overflow: 'hidden',
        }}
      >
        {displayBanner && (
          <img
            src={displayBanner}
            alt="Banner do canal"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        )}

        {/* YouTube logo — top right */}
        <div style={{ position: 'absolute', top: 12, right: 14 }}>
          <YouTubeLogoSVG />
        </div>
      </div>

      {/* Channel info row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '12px 24px 16px',
          borderBottom: '1px solid #E5E5E5',
        }}
      >
        {/* Avatar — 80px circle with white border, sits slightly above dividing line */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            overflow: 'hidden',
            border: '3px solid #fff',
            background: '#FF0000',
            flexShrink: 0,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            marginTop: -20,
          }}
        >
          {displayAvatar ? (
            <img
              src={displayAvatar}
              alt={displayName}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #FF0000 0%, #cc0000 100%)',
              }}
            >
              <svg width="36" height="36" viewBox="0 0 24 24" fill="white">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
          )}
        </div>

        {/* Name + subs + description */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <h1
              style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 700,
                color: '#0F0F0F',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {displayName}
            </h1>
            {isVerified && <VerifiedBadge />}
          </div>
          <p style={{ margin: '0 0 2px', fontSize: 13, color: '#606060' }}>{displaySubs}</p>
          {displayDesc && (
            <p
              style={{
                margin: 0,
                fontSize: 12,
                color: '#606060',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: 480,
              }}
            >
              {displayDesc}
            </p>
          )}
        </div>

        {/* Subscribe button */}
        <button
          type="button"
          onClick={() => setSubscribed((p) => !p)}
          style={{
            flexShrink: 0,
            background: subscribed ? '#F2F2F2' : '#FF0000',
            color: subscribed ? '#0F0F0F' : '#fff',
            border: 'none',
            borderRadius: 20,
            padding: '10px 20px',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            letterSpacing: '0.01em',
            transition: 'background 0.15s, color 0.15s',
            fontFamily: 'inherit',
          }}
        >
          {subscribed ? 'Inscrito' : 'Inscrever-se'}
        </button>
      </div>
    </div>
  );
};
