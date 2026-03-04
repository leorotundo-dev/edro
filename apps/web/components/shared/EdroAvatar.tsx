'use client';

import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import type { SxProps, Theme } from '@mui/material/styles';

/**
 * Octagonal avatar following the Edro brand shape language.
 * The clip-path replicates the chamfered-corner geometry of the "edro" wordmark.
 *
 * Fallback priority:
 *  1. src  → renders image
 *  2. name → renders first letter with brand color background
 *  3. children → renders any React node (icon)
 */
const OCTAGON_CLIP = 'polygon(28% 0%, 72% 0%, 100% 28%, 100% 72%, 72% 100%, 28% 100%, 0% 72%, 0% 28%)';

// 8 distinct pastel-ish colors for deterministic hashing
const HASH_COLORS = [
  '#5D87FF', '#49BEFF', '#13DEB9', '#FFAE1F',
  '#FA896B', '#7986CB', '#4DB6AC', '#F06292',
];

function hashColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) & 0xffffffff;
  }
  return HASH_COLORS[Math.abs(hash) % HASH_COLORS.length];
}

function isLightColor(hex: string): boolean {
  const c = hex.replace('#', '');
  if (c.length < 6) return false;
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  // Relative luminance (WCAG)
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.45;
}

type EdroAvatarProps = {
  src?: string | null;
  alt?: string;
  name?: string | null;
  size?: number;
  sx?: SxProps<Theme>;
  children?: React.ReactNode;
};

export default function EdroAvatar({ src, alt, name, size = 48, sx, children }: EdroAvatarProps) {
  // Determine background color for name-based fallback
  const bg = name ? hashColor(name) : undefined;
  const textColor = bg ? (isLightColor(bg) ? '#1a1a1a' : '#ffffff') : undefined;
  const initial = name ? name.trim().charAt(0).toUpperCase() : null;
  const fontSize = Math.max(10, Math.round(size * 0.42));

  return (
    <Avatar
      src={src ?? undefined}
      alt={alt ?? name ?? undefined}
      sx={{
        width: size,
        height: size,
        borderRadius: 0,
        clipPath: OCTAGON_CLIP,
        flexShrink: 0,
        // Apply deterministic color only when no src and no explicit bgcolor in sx
        ...(!src && name ? { bgcolor: bg, color: textColor } : {}),
        ...sx,
      }}
    >
      {!src && initial ? (
        <Typography
          component="span"
          sx={{ fontSize, fontWeight: 700, lineHeight: 1, color: 'inherit', userSelect: 'none' }}
        >
          {initial}
        </Typography>
      ) : (
        children
      )}
    </Avatar>
  );
}
