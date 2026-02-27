/**
 * Dark Funnel Parser
 *
 * Heuristic regex-based channel detection for dark social signals.
 * No AI needed for v1 — patterns cover the most common phrases in pt-BR + en.
 */

export interface ParsedDarkSignal {
  parsed_channel: string | null;
  confidence_score: number | null;
  journey_stage: 'first_touch_dark' | 'middle_touch_dark' | 'last_touch_dark' | null;
}

// ── Channel patterns ──────────────────────────────────────────────────────────

const CHANNEL_PATTERNS: Array<{
  channel: string;
  patterns: RegExp[];
  confidence: number;
}> = [
  {
    channel: 'whatsapp',
    patterns: [
      /whatsapp/i,
      /whats\s?app/i,
      /zap\b/i,
      /grupo\s+de\s+(zap|whats)/i,
      /mandaram\s+no\s+(zap|whats)/i,
      /me\s+mandaram/i,
      /recebi\s+no\s+whats/i,
      /vi\s+num\s+grupo/i,
      /algu[eé]m\s+me\s+mandou/i,
    ],
    confidence: 0.9,
  },
  {
    channel: 'slack',
    patterns: [
      /slack/i,
      /canal\s+do\s+slack/i,
      /no\s+slack/i,
      /slack\s+da\s+(empresa|time|equipe)/i,
    ],
    confidence: 0.95,
  },
  {
    channel: 'teams',
    patterns: [
      /teams/i,
      /microsoft\s+teams/i,
      /ms\s+teams/i,
    ],
    confidence: 0.95,
  },
  {
    channel: 'email_forward',
    patterns: [
      /email\s+encaminhado/i,
      /e-?mail\s+encaminhado/i,
      /algu[eé]m\s+me\s+encaminhou/i,
      /recebi\s+(por|via)\s+e-?mail/i,
      /forward(ed)?\s+email/i,
      /encaminhou\s+(o\s+)?e-?mail/i,
    ],
    confidence: 0.85,
  },
  {
    channel: 'linkedin',
    patterns: [
      /linkedin/i,
      /linked\s?in/i,
      /post\s+(do\s+)?linkedin/i,
      /vi\s+no\s+linkedin/i,
      /feed\s+do\s+linkedin/i,
    ],
    confidence: 0.95,
  },
  {
    channel: 'instagram',
    patterns: [
      /instagram/i,
      /insta\b/i,
      /stories?\b/i,
      /reels?\b/i,
      /ig\b/i,
      /vi\s+no\s+insta/i,
    ],
    confidence: 0.9,
  },
  {
    channel: 'direct',
    patterns: [
      /indica[cç][aã]o/i,
      /indicou/i,
      /me\s+indicaram/i,
      /boca\s+a\s+boca/i,
      /me\s+falaram\s+(de\s+voc[eê]s?|da\s+empresa)/i,
      /amigo\s+(me\s+)?indicou/i,
      /colega\s+de\s+trabalho/i,
      /parceiro\s+indicou/i,
      /word\s+of\s+mouth/i,
      /referral/i,
    ],
    confidence: 0.75,
  },
  {
    channel: 'unknown_group',
    patterns: [
      /grupo\b/i,
      /comunidade/i,
      /forum\b/i,
      /f[oó]rum\b/i,
      /telegram/i,
      /discord/i,
    ],
    confidence: 0.7,
  },
];

// ── Journey stage patterns ────────────────────────────────────────────────────

function inferJourneyStage(
  raw: string
): 'first_touch_dark' | 'middle_touch_dark' | 'last_touch_dark' | null {
  const text = raw.toLowerCase();

  // Last-touch signals — about to buy / already decided
  const lastTouchPatterns = [
    /antes\s+de\s+(fechar|contratar|comprar|assinar)/,
    /fui\s+pesquisar\s+antes/,
    /j[aá]\s+ia\s+fechar/,
    /decid(i|indo|iu)\s+(contratar|comprar)/,
    /quero\s+contratar/,
    /foi\s+o\s+que\s+me\s+convenceu/,
  ];
  for (const p of lastTouchPatterns) {
    if (p.test(text)) return 'last_touch_dark';
  }

  // First-touch signals — discovery
  const firstTouchPatterns = [
    /primeira\s+vez\s+que\s+ouvi/,
    /nunca\s+tinha\s+ouvido/,
    /descobri/,
    /fiquei\s+sabendo/,
    /first\s+time/,
    /just\s+heard/,
  ];
  for (const p of firstTouchPatterns) {
    if (p.test(text)) return 'first_touch_dark';
  }

  // Default: middle touch (consideration)
  return 'middle_touch_dark';
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Parses a raw dark-funnel text to extract channel, confidence, and journey stage.
 */
export function parseDarkFunnelSignal(rawText: string): ParsedDarkSignal {
  if (!rawText?.trim()) {
    return { parsed_channel: null, confidence_score: null, journey_stage: null };
  }

  let bestChannel: string | null = null;
  let bestConfidence = 0;

  for (const entry of CHANNEL_PATTERNS) {
    for (const pattern of entry.patterns) {
      if (pattern.test(rawText)) {
        if (entry.confidence > bestConfidence) {
          bestChannel = entry.channel;
          bestConfidence = entry.confidence;
        }
        break; // First match per entry is enough
      }
    }
  }

  const journey_stage = inferJourneyStage(rawText);

  return {
    parsed_channel: bestChannel ?? 'other',
    confidence_score: bestChannel ? bestConfidence : 0.3,
    journey_stage,
  };
}
