'use client';

import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';

const PALETTE = [
  '#5D87FF', // blue
  '#E85219', // orange
  '#13DEB9', // teal
  '#FFAE1F', // amber
  '#FA896B', // salmon
  '#6366F1', // indigo
  '#0A66C2', // linkedin blue
  '#E1306C', // instagram pink
];

function hashColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type UserAvatarProps = {
  name?: string | null;
  src?: string | null;
  size?: number;
  tooltip?: boolean;
  sx?: object;
};

export default function UserAvatar({ name, src, size = 28, tooltip = false, sx }: UserAvatarProps) {
  const displayName = name ?? '?';
  const bgcolor = name ? hashColor(name) : '#bdbdbd';

  const el = (
    <Avatar
      src={src ?? undefined}
      alt={displayName}
      sx={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        fontWeight: 700,
        bgcolor,
        ...sx,
      }}
    >
      {!src && initials(displayName)}
    </Avatar>
  );

  if (tooltip && name) {
    return <Tooltip title={name}>{el}</Tooltip>;
  }

  return el;
}
