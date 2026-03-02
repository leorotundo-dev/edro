'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import {
  IconBrandInstagram,
  IconBrandLinkedin,
  IconBrandFacebook,
  IconBrandTiktok,
  IconBrandYoutube,
  IconBrandX,
  IconBrandWhatsapp,
  IconMail,
  IconNews,
  IconTrendingUp,
  IconGlobe,
} from '@tabler/icons-react';

type PlatformConfig = {
  icon: React.ElementType;
  color: string;
  bg: string;
  label: string;
};

const PLATFORM_MAP: Record<string, PlatformConfig> = {
  instagram: { icon: IconBrandInstagram, color: '#E1306C', bg: '#fce4ec', label: 'Instagram' },
  linkedin:  { icon: IconBrandLinkedin,  color: '#0A66C2', bg: '#dbeafe', label: 'LinkedIn' },
  facebook:  { icon: IconBrandFacebook,  color: '#1877F2', bg: '#dbeafe', label: 'Facebook' },
  tiktok:    { icon: IconBrandTiktok,    color: '#010101', bg: '#f5f5f5', label: 'TikTok' },
  youtube:   { icon: IconBrandYoutube,   color: '#FF0000', bg: '#fee2e2', label: 'YouTube' },
  twitter:   { icon: IconBrandX,         color: '#14171A', bg: '#f1f5f9', label: 'Twitter/X' },
  x:         { icon: IconBrandX,         color: '#14171A', bg: '#f1f5f9', label: 'Twitter/X' },
  whatsapp:  { icon: IconBrandWhatsapp,  color: '#25D366', bg: '#dcfce7', label: 'WhatsApp' },
  email:     { icon: IconMail,           color: '#6366F1', bg: '#ede9fe', label: 'E-mail' },
  news:      { icon: IconNews,           color: '#64748b', bg: '#f1f5f9', label: 'Notícias' },
  trend:     { icon: IconTrendingUp,     color: '#E85219', bg: '#fdeee8', label: 'Tendência' },
};

function normalizePlatform(platform: string): string {
  return platform.toLowerCase().split(/[\s_/-]/)[0];
}

type PlatformIconProps = {
  platform: string;
  size?: number;
  variant?: 'icon' | 'chip';
  tooltip?: boolean;
};

export default function PlatformIcon({
  platform,
  size = 16,
  variant = 'icon',
  tooltip = false,
}: PlatformIconProps) {
  const key = normalizePlatform(platform);
  const config = PLATFORM_MAP[key] ?? {
    icon: IconGlobe,
    color: '#64748b',
    bg: '#f1f5f9',
    label: platform,
  };

  const Icon = config.icon;

  const iconEl =
    variant === 'chip' ? (
      <Box
        component="span"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          px: 0.75,
          py: 0.25,
          borderRadius: '6px',
          bgcolor: config.bg,
          color: config.color,
          fontSize: 11,
          fontWeight: 600,
          lineHeight: 1,
          whiteSpace: 'nowrap',
        }}
      >
        <Icon size={size} color={config.color} />
        <Typography
          component="span"
          sx={{ fontSize: 11, fontWeight: 600, color: config.color, lineHeight: 1 }}
        >
          {config.label}
        </Typography>
      </Box>
    ) : (
      <Icon size={size} color={config.color} />
    );

  if (tooltip) {
    return <Tooltip title={config.label}>{iconEl as React.ReactElement}</Tooltip>;
  }

  return iconEl as React.ReactElement;
}
