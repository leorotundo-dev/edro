'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  buildMockupKeyCandidates,
  findBestMockupKey,
  mockupRegistry,
  normalizeMockupKey,
  resolveMockupComponent,
} from '@/components/mockups/mockupRegistry';
import { buildCatalogKey, mockupCatalogMap } from '@/components/mockups/mockupCatalogMap';
import { InstagramFeedMockup } from '@/components/mockups/instagram/InstagramFeedMockup';
import { InstagramStoryMockup } from '@/components/mockups/instagram/InstagramStoryMockup';
import { InstagramProfileMockup } from '@/components/mockups/instagram/InstagramProfileMockup';
import { InstagramGridMockup } from '@/components/mockups/instagram/InstagramGridMockup';

type CarouselSlide = {
  title?: string;
  body?: string;
};

type CopyOption = {
  title?: string;
  body?: string;
  cta?: string;
  raw?: string;
  slides?: CarouselSlide[];
};

type LiveMockupPreviewProps = {
  platform?: string | null;
  format?: string | null;
  productionType?: string | null;
  copy?: string | null;
  option?: CopyOption | null;
  legenda?: string | null;
  maxChars?: Record<string, number> | null;
  brandName?: string | null;
  brandColor?: string;
  arteImageUrl?: string | null;
  align?: 'left' | 'center';
  className?: string;
  showHeader?: boolean;
};

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim();

const removeAccents = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const normalizeCatalogToken = (value: string) =>
  removeAccents(normalizeWhitespace(value || '')).toLowerCase();

const normalizeProductionType = (value?: string | null) =>
  removeAccents(normalizeWhitespace(value || ''))
    .toLowerCase()
    .replace(/_/g, '-')
    .replace(/\s+/g, '-');

const stripMarkdown = (value: string) =>
  value
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/^\s*#{1,6}\s*/gm, '')
    .trim();

const cleanCopy = (value: string) => {
  if (!value) return '';
  const withoutMarkdown = stripMarkdown(value).replace(/\r/g, '');
  const withoutLabels = withoutMarkdown.replace(
    /(^|\n)\s*(t[ií]tulo|headline|chamada|assunto|corpo|mensagem|texto|cta|chamada\s+para\s+a[cç][aã]o)\s*[:\-–—]\s*/gim,
    '$1'
  );
  return withoutLabels.replace(/[*_`~]+/g, '').trim();
};

const extractCopyFields = (raw: string) => {
  const cleaned = cleanCopy(raw || '');
  const lines = cleaned
    .split('\n')
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean);
  const fields: Record<string, string> = {};
  const labelMatchers: Array<{ key: string; regex: RegExp }> = [
    { key: 'headline', regex: /^(?:t[ií]tulo|headline|chamada|assunto)\s*[:\-]\s*/i },
    { key: 'body', regex: /^(?:corpo|mensagem|texto)\s*[:\-]\s*/i },
    { key: 'cta', regex: /^(?:cta|chamada\s+para\s+a[cç][aã]o|acao)\s*[:\-]\s*/i },
  ];
  let currentKey = '';

  lines.forEach((line) => {
    const matcher = labelMatchers.find(({ regex }) => regex.test(line));
    if (matcher) {
      currentKey = matcher.key;
      const value = line.replace(matcher.regex, '').trim();
      if (value) {
        fields[currentKey] = fields[currentKey]
          ? `${fields[currentKey]} ${value}`
          : value;
      }
      return;
    }
    if (currentKey) {
      fields[currentKey] = fields[currentKey]
        ? `${fields[currentKey]} ${line}`
        : line;
      return;
    }
    if (!fields.headline) {
      fields.headline = line;
    } else if (!fields.body) {
      fields.body = line;
    } else {
      fields.body = `${fields.body} ${line}`.trim();
    }
  });

  return {
    headline: fields.headline || '',
    body: fields.body || '',
    cta: fields.cta || '',
    fullText: cleaned,
  };
};

const clampText = (value: string, max?: number | null) => {
  const normalized = normalizeWhitespace(value || '');
  if (!max || max <= 0) return normalized;
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1)}…`;
};

/**
 * Cleans text for the arte overlay — removes lines that are only hashtags
 * and strips trailing hashtag blocks from mixed lines.
 * Keeps clean body copy free of # symbols in the image area.
 */
const HASHTAG_LINE_RE = /^(#[\w\u00C0-\u017F]+\s*)+$/;
const cleanArteText = (text: string) =>
  (text || '')
    .split('\n')
    .filter((line) => !HASHTAG_LINE_RE.test(line.trim()))
    .map((line) => line.replace(/\s+(#[\w\u00C0-\u017F]+\s*)+$/, '').trim())
    .filter(Boolean)
    .join('\n')
    .trim();

const wrapText = (text: string, maxChars = 24, maxLines = 5) => {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines: string[] = [];
  let current = '';
  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  });
  if (current) lines.push(current);
  return lines.slice(0, maxLines);
};

const createSvgDataUri = (text: string, width: number, height: number, accent = '#ff5c00') => {
  const safeText = text || 'Preview';
  const parts = safeText.split('\n').filter(Boolean);
  const headline = parts[0] || '';
  const body = parts.slice(1).join(' ');

  const titleSize = Math.round(width / 13);
  const bodySize = Math.round(width / 22);
  const titleLineH = Math.round(titleSize * 1.35);
  const bodyLineH = Math.round(bodySize * 1.45);

  const titleLines = wrapText(headline, 20, 3);
  const bodyLines = body ? wrapText(body, 28, 3) : [];

  const gap = body ? Math.round(height * 0.025) : 0;
  const totalH = titleLines.length * titleLineH + gap + bodyLines.length * bodyLineH;
  const startY = Math.round(height / 2 - totalH / 2 + titleLineH * 0.7);

  const titleNodes = titleLines
    .map((line, i) => `<tspan x="50%" dy="${i === 0 ? 0 : titleLineH}" text-anchor="middle">${line}</tspan>`)
    .join('');

  const bodyStartY = startY + titleLines.length * titleLineH + gap;
  const bodyNodes = bodyLines
    .map((line, i) => `<tspan x="50%" dy="${i === 0 ? 0 : bodyLineH}" text-anchor="middle">${line}</tspan>`)
    .join('');

  // accent bar above title
  const barW = Math.round(width * 0.18);
  const barH = Math.max(3, Math.round(height * 0.007));
  const barX = Math.round((width - barW) / 2);
  const barY = Math.round(startY - titleLineH * 0.85);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0f172a"/>
        <stop offset="100%" stop-color="${accent}44"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#bg)"/>
    <rect x="${barX}" y="${barY}" width="${barW}" height="${barH}" fill="${accent}" rx="${Math.round(barH / 2)}"/>
    <text y="${startY}" font-family="Inter,-apple-system,sans-serif" font-size="${titleSize}" font-weight="700" fill="#ffffff" letter-spacing="-0.5">${titleNodes}</text>
    ${body ? `<text y="${bodyStartY}" font-family="Inter,-apple-system,sans-serif" font-size="${bodySize}" font-weight="400" fill="rgba(255,255,255,0.72)">${bodyNodes}</text>` : ''}
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const resolveFormatRatio = (format: string, platform?: string | null) => {
  const text = normalizeWhitespace(format || '').toLowerCase();
  const match = text.match(/(\d+(?:\.\d+)?)\s*[x:]\s*(\d+(?:\.\d+)?)/);
  if (match) {
    const w = parseFloat(match[1]);
    const h = parseFloat(match[2]);
    if (w > 0 && h > 0) return w / h;
  }
  if (text.includes('9:16') || text.includes('story') || text.includes('reels')) return 9 / 16;
  if (text.includes('4:5')) return 4 / 5;
  if (text.includes('16:9')) return 16 / 9;
  if (text.includes('1:1') || text.includes('feed') || text.includes('post')) return 1;
  if (text.includes('outdoor') || text.includes('ooh') || text.includes('busdoor')) return 3;
  if ((platform || '').toLowerCase().includes('ooh')) return 3;
  return null;
};

const resolveFrameSize = (format: string, platform?: string | null) => {
  const ratio = resolveFormatRatio(format, platform) ?? 4 / 3;
  let width = 420;
  if (ratio >= 2.8) width = 900;
  else if (ratio >= 2.4) width = 780;
  else if (ratio >= 2.0) width = 700;
  else if (ratio >= 1.6) width = 600;
  else if (ratio >= 1.2) width = 520;
  else if (ratio <= 0.8) width = 340;
  const height = Math.max(220, Math.round(width / ratio));
  return { width, height, ratio };
};

const resolveLimit = (maxChars: Record<string, number> | null | undefined, keys: string[]) => {
  if (!maxChars) return null;
  for (const key of keys) {
    const value = maxChars[key];
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      return value;
    }
  }
  return null;
};

const buildComponentName = (productionType?: string | null, platform?: string | null, format?: string | null) => {
  if (!platform || !format) return null;
  const directKey = buildCatalogKey(productionType || '', platform, format);
  if (mockupCatalogMap[directKey]) return mockupCatalogMap[directKey];
  const normalizedKey = normalizeCatalogToken(
    buildCatalogKey(normalizeProductionType(productionType), platform, format)
  );
  const entry = Object.entries(mockupCatalogMap).find(
    ([key]) => normalizeCatalogToken(key) === normalizedKey
  );
  return entry?.[1] || null;
};

export default function LiveMockupPreview({
  platform,
  format,
  productionType,
  copy,
  option,
  legenda,
  maxChars,
  brandName,
  brandColor,
  arteImageUrl,
  align = 'center',
  className,
  showHeader = true,
}: LiveMockupPreviewProps) {
  const mergedCopy = useMemo(() => {
    const optionText = option
      ? [option.title, option.body, option.cta].map((value) => String(value || '').trim()).filter(Boolean).join('\n')
      : '';
    return optionText || copy || '';
  }, [option, copy]);

  const fields = useMemo(() => extractCopyFields(mergedCopy), [mergedCopy]);
  const headlineLimit = useMemo(() => resolveLimit(maxChars, ['headline', 'title', 'titulo']), [maxChars]);
  const bodyLimit = useMemo(
    () => resolveLimit(maxChars, ['body', 'caption', 'text', 'texto', 'mensagem', 'description']),
    [maxChars]
  );
  const ctaLimit = useMemo(
    () => resolveLimit(maxChars, ['cta', 'call_to_action', 'calltoaction', 'botao']),
    [maxChars]
  );

  const rawHeadline = fields.headline || fields.body || fields.fullText;
  const rawBody = fields.body || fields.fullText;
  const rawCta = fields.cta || '';

  const displayHeadline = clampText(rawHeadline, headlineLimit ?? 80);
  const displayBody = clampText(rawBody, bodyLimit ?? 220);
  const displayCta = clampText(rawCta, ctaLimit ?? 40);

  // Arte overlay — use option fields directly when available so hashtags (stored
  // in option.hashtags) never leak into the image area.
  const arteOverlayHeadline = option?.title
    ? clampText(option.title, headlineLimit ?? 80)
    : clampText(cleanArteText(rawHeadline), headlineLimit ?? 80);
  const arteOverlayBody = option?.body
    ? clampText(cleanArteText(option.body), bodyLimit ?? 220)
    : clampText(cleanArteText(rawBody), bodyLimit ?? 220);

  const captionText = displayBody || displayHeadline || mergedCopy;
  // Use the full social media caption (legenda) when available; fall back to arte copy
  const resolvedLegenda = legenda?.trim() || '';
  const feedCaption = resolvedLegenda ||
    [displayHeadline, displayBody, displayCta ? `CTA: ${displayCta}` : '']
      .map((value) => String(value || '').trim())
      .filter(Boolean)
      .join(' ');

  const displayName = (brandName || platform || 'edro').trim() || 'edro';
  const accentColor = brandColor || '#ff5c00';
  const avatar = createSvgDataUri(displayName, 400, 400, accentColor);
  const squareImage = createSvgDataUri(
    [arteOverlayHeadline, arteOverlayBody, displayCta].filter(Boolean).join('\n'),
    1080,
    1080,
    accentColor
  );
  const wideImage = createSvgDataUri(arteOverlayHeadline || displayName, 1280, 720, accentColor);
  const tallImage = createSvgDataUri(arteOverlayHeadline || displayName, 1080, 1920, accentColor);

  const formatLower = normalizeWhitespace(format || '').toLowerCase();
  const platformLower = normalizeWhitespace(platform || '').toLowerCase();
  const isInstagram = platformLower.includes('instagram');
  const isCarouselFormat = formatLower.includes('carrossel') || formatLower.includes('carousel') || formatLower.includes('caroussel');

  // Gera imagens SVG para cada slide quando é carrossel
  const slideImages = useMemo(() => {
    const rawSlides = option?.slides;
    if (isCarouselFormat && rawSlides && rawSlides.length > 0) {
      return rawSlides.map((slide) =>
        createSvgDataUri([slide.title, slide.body].filter(Boolean).join('\n'), 1080, 1080)
      );
    }
    return [squareImage];
  }, [isCarouselFormat, option?.slides, squareImage]);
  const isReelsLike = /reels|shorts/.test(formatLower);
  const isStoryLike = /story|9:16|vertical/.test(formatLower) && !isReelsLike;
  const isProfileLike = formatLower.includes('profile');
  const isGridLike = formatLower.includes('grid');
  const isFeedLike =
    isInstagram &&
    !isStoryLike &&
    !isReelsLike &&
    !isProfileLike &&
    (formatLower.includes('feed') ||
      formatLower.includes('post') ||
      formatLower.includes('igtv') ||
      formatLower.includes('explore') ||
      formatLower.includes('shopping') ||
      formatLower.includes('collection') ||
      formatLower.includes('branded') ||
      formatLower.includes('video') ||
      formatLower.includes('carousel') ||
      isCarouselFormat ||
      /1:1|4:5/.test(formatLower));

  const componentName = useMemo(
    () => buildComponentName(productionType, platform, format),
    [productionType, platform, format]
  );

  const isFeedMockup = componentName === 'InstagramFeedMockup';
  const isStoryMockup = componentName === 'InstagramStoryMockup';
  const isProfileMockup = componentName === 'InstagramProfileMockup';
  const isGridMockup = componentName === 'InstagramGridMockup';
  const isFeedFrame = isFeedLike || isFeedMockup;
  const usesPhoneFrame =
    isInstagram &&
    (isFeedLike || isStoryLike || isReelsLike || isProfileLike || isGridLike || isFeedMockup || isStoryMockup || isProfileMockup || isGridMockup);

  const frame = useMemo(() => {
    const base = resolveFrameSize(format || '', platform);
    if (!usesPhoneFrame) return base;
    const ratio = isFeedFrame ? 375 / 820 : 375 / 667;
    const width = Math.min(base.width, 380);
    const height = Math.round(width / ratio);
    return { width, height, ratio };
  }, [format, platform, usesPhoneFrame, isFeedFrame]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    if (!containerRef.current || typeof ResizeObserver === 'undefined') return;
    const node = containerRef.current;
    const observer = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        const width = entry.contentRect?.width || 0;
        if (width) setContainerWidth(width);
      });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const baseWidth = usesPhoneFrame
    ? 390
    : frame.ratio >= 2.4
      ? 960
      : frame.ratio >= 1.6
        ? 720
        : frame.ratio >= 1.2
          ? 560
          : frame.ratio <= 0.8
            ? 360
            : 420;
  const effectiveWidth = containerWidth || frame.width;
  const scale = Math.min(1, effectiveWidth / baseWidth);
  const phoneZoom = usesPhoneFrame ? Math.min(0.94, scale) : scale;

  const { registryComponent, registryKey } = useMemo(() => {
    if (componentName) {
      const key = normalizeMockupKey(componentName);
      const resolved = mockupRegistry[key];
      if (resolved) return { registryComponent: resolved, registryKey: key };
    }
    const candidates = buildMockupKeyCandidates({
      platform: platform || '',
      format: format || '',
      platformLabel: platform || '',
    });
    for (const key of candidates) {
      if (mockupRegistry[key]) {
        return { registryComponent: mockupRegistry[key], registryKey: key };
      }
    }
    const bestKey = findBestMockupKey({
      productionType: productionType || '',
      platform: platform || '',
      format: format || '',
    });
    if (bestKey && mockupRegistry[bestKey]) {
      return { registryComponent: mockupRegistry[bestKey], registryKey: bestKey };
    }
    return { registryComponent: null, registryKey: '' };
  }, [componentName, platform, format, productionType]);

  const instagramComments = useMemo(
    () => [
      {
        username: 'cliente_real',
        text: clampText(displayBody || displayHeadline || captionText, 64),
      },
      {
        username: 'edro_team',
        text: 'Vamos nessa 🚀',
      },
    ],
    [displayBody, displayHeadline, captionText]
  );

  const tiktokComments = useMemo(
    () => [
      {
        username: 'user1',
        text: clampText(displayBody || displayHeadline || captionText, 56),
        likes: '234',
        timeAgo: '2h',
      },
      {
        username: 'user2',
        text: clampText(displayHeadline || captionText, 42),
        likes: '89',
        timeAgo: '5h',
      },
      {
        username: 'user3',
        text: 'Curti demais!',
        likes: '156',
        timeAgo: '1d',
      },
    ],
    [displayBody, displayHeadline, captionText]
  );

  const useCommentList = registryKey.includes('tiktokcomment');

  const baseProps = useMemo(
    () => ({
      username: displayName,
      profileImage: avatar,
      avatar,
      logo: avatar,
      brandLogo: avatar,
      channelImage: avatar,
      channelName: displayName,
      postText: captionText,
      caption: captionText,
      description: captionText,
      title: displayHeadline,
      headline: displayHeadline,
      subheadline: displayBody,
      subtitle: displayBody,
      cta: displayCta,
      timeAgo: '2h',
      likes: 1280,
      comments: useCommentList ? tiktokComments : 48,
      shares: 92,
      views: '5.1k views',
      postImage: squareImage,
      image: squareImage,
      thumbnail: wideImage,
      coverImage: wideImage,
      bannerImage: wideImage,
      storyImage: tallImage,
      reelImage: tallImage,
      videoThumbnail: wideImage,
      adImage: wideImage,
    }),
    [
      displayName,
      avatar,
      captionText,
      displayHeadline,
      displayBody,
      displayCta,
      squareImage,
      wideImage,
      tallImage,
      useCommentList,
      tiktokComments,
    ]
  );

  const counters = [
    headlineLimit
      ? { label: 'Headline', count: rawHeadline.length, limit: headlineLimit }
      : null,
    bodyLimit ? { label: 'Texto', count: rawBody.length, limit: bodyLimit } : null,
    ctaLimit ? { label: 'CTA', count: rawCta.length, limit: ctaLimit } : null,
  ].filter(Boolean) as Array<{ label: string; count: number; limit: number }>;

  const renderFallback = () => (
    <div className="w-full h-full rounded-[20px] border border-slate-200 bg-white/80 px-6 py-5 flex flex-col justify-center items-center text-center gap-3">
      <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400">
        {(platform || 'Plataforma').trim()} · {(format || 'Formato').trim()}
      </div>
      <div className="text-lg font-semibold text-slate-900 leading-snug">
        {displayHeadline || 'Seu texto aparece aqui'}
      </div>
      {displayBody ? <div className="text-sm text-slate-600 leading-relaxed">{displayBody}</div> : null}
      {displayCta ? (
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{displayCta}</div>
      ) : null}
    </div>
  );

  const renderResolved = () => {
    if (isProfileLike || componentName === 'InstagramProfileMockup') {
      return (
        <InstagramProfileMockup
          username={displayName}
          profileImage={avatar}
          bio={displayBody || captionText}
          website="edro.studio"
          posts={12}
          followers={1520}
          following={320}
          stories={[
            { title: 'Campanha', image: squareImage },
            { title: 'Bastidores', image: squareImage },
          ]}
          gridImages={Array.from({ length: 9 }).map((_, idx) =>
            createSvgDataUri(`${displayHeadline || displayName} ${idx + 1}`, 400, 400, accentColor)
          )}
        />
      );
    }
    if (isStoryLike || componentName === 'InstagramStoryMockup') {
      return (
        <InstagramStoryMockup
          username={displayName}
          profileImage={avatar}
          storyImage={tallImage}
          timeAgo="2h"
        />
      );
    }
    if (isGridLike || componentName === 'InstagramGridMockup') {
      return (
        <InstagramGridMockup
          username={displayName}
          gridImages={Array.from({ length: 9 }).map((_, idx) =>
            createSvgDataUri(`${displayHeadline || displayName} ${idx + 1}`, 400, 400, accentColor)
          )}
        />
      );
    }
    if (isFeedLike || componentName === 'InstagramFeedMockup') {
      const feedPostImage = arteImageUrl || slideImages[0];
      const feedSlides = arteImageUrl ? [arteImageUrl] : slideImages;
      return (
        <InstagramFeedMockup
          username={displayName}
          profileImage={avatar}
          postImage={feedPostImage}
          slides={feedSlides}
          isCarousel={!arteImageUrl && isCarouselFormat && slideImages.length > 1}
          arteHeadline={arteImageUrl ? undefined : arteOverlayHeadline}
          arteBody={arteImageUrl ? undefined : arteOverlayBody}
          arteBgColor={accentColor}
          likes={1280}
          caption={feedCaption || captionText}
          comments={instagramComments}
          postAspectRatio={(() => {
            const r = resolveFormatRatio(format || '', platform);
            if (!r || Math.abs(r - 4 / 5) < 0.01) return '4/5';
            if (Math.abs(r - 1) < 0.01) return '1/1';
            if (Math.abs(r - 16 / 9) < 0.01) return '16/9';
            return `${r}`;
          })()}
        />
      );
    }

    if (registryComponent) {
      const DynamicComponent = registryComponent;
      return <DynamicComponent {...baseProps} />;
    }

    return renderFallback();
  };

  return (
    <div className={className}>
      {showHeader ? (
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.28em] text-slate-400 font-semibold">
          <span>Mockup ao vivo</span>
          {platform || format ? <span>{[platform, format].filter(Boolean).join(' · ')}</span> : null}
        </div>
      ) : null}
      <div
        ref={containerRef}
        className={`flex items-center overflow-hidden ${align === 'left' ? 'justify-start' : 'justify-center'} ${showHeader ? 'mt-3' : 'mt-2'}`}
        style={{ width: '100%' }}
      >
        <div
          className={`pointer-events-none flex items-center w-full ${align === 'left' ? 'justify-start' : 'justify-center'}`}
          style={{ transform: `scale(${phoneZoom})`, transformOrigin: align === 'left' ? 'top left' : 'top center' }}
        >
          {renderResolved()}
        </div>
      </div>



    </div>
  );
}
