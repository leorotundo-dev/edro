export type PlatformRule = {
  /** Chars before "ver mais" / truncation fold point */
  fold: number;
  /** Max hashtags before hurting reach */
  maxHashtags: number;
  /** Warning message shown when copy exceeds fold */
  hookWarning: string;
};

export const PLATFORM_RULES: Record<string, PlatformRule> = {
  instagram: {
    fold: 125,
    maxHashtags: 5,
    hookWarning: 'A promessa principal deve aparecer nos primeiros 125 caracteres — depois disso o Instagram esconde com "ver mais".',
  },
  linkedin: {
    fold: 210,
    maxHashtags: 3,
    hookWarning: 'O LinkedIn exibe ~210 chars antes do "ver mais". Coloque o gancho logo no início.',
  },
  facebook: {
    fold: 480,
    maxHashtags: 3,
    hookWarning: 'O Facebook trunca legendas longas. Leve o ponto principal antes dos 480 caracteres.',
  },
  tiktok: {
    fold: 100,
    maxHashtags: 5,
    hookWarning: 'O TikTok mostra ~100 chars antes de ocultar o restante da legenda.',
  },
  youtube: {
    fold: 100,
    maxHashtags: 3,
    hookWarning: 'Coloque palavras-chave e CTA nos primeiros 100 chars da descrição.',
  },
  twitter: {
    fold: 280,
    maxHashtags: 2,
    hookWarning: 'O X (Twitter) tem limite de 280 caracteres — o texto inteiro deve caber aqui.',
  },
  google: {
    fold: 30,
    maxHashtags: 0,
    hookWarning: 'Título no Google Ads: máx 30 caracteres. Se passar, a plataforma rejeita o anúncio.',
  },
};

export function matchPlatformRule(platform: string): PlatformRule | null {
  const p = platform.toLowerCase();
  for (const [key, rule] of Object.entries(PLATFORM_RULES)) {
    if (p.includes(key)) return rule;
  }
  return null;
}
