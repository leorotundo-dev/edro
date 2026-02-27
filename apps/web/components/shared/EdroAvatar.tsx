'use client';

import Avatar from '@mui/material/Avatar';
import type { SxProps, Theme } from '@mui/material/styles';

/**
 * Octagonal avatar following the Edro brand shape language.
 * The clip-path replicates the chamfered-corner geometry of the "edro" wordmark.
 */
const OCTAGON_CLIP = 'polygon(28% 0%, 72% 0%, 100% 28%, 100% 72%, 72% 100%, 28% 100%, 0% 72%, 0% 28%)';

type EdroAvatarProps = {
  src?: string | null;
  alt?: string;
  size?: number;
  sx?: SxProps<Theme>;
  children?: React.ReactNode;
};

export default function EdroAvatar({ src, alt, size = 48, sx, children }: EdroAvatarProps) {
  return (
    <Avatar
      src={src ?? undefined}
      alt={alt}
      sx={{
        width: size,
        height: size,
        borderRadius: 0,
        clipPath: OCTAGON_CLIP,
        flexShrink: 0,
        ...sx,
      }}
    >
      {children}
    </Avatar>
  );
}
