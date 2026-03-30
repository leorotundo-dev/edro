/**
 * segmentVisualMap.ts
 *
 * Maps client business segments (segment_primary) to:
 *   - Targeted creative search queries for da_reference discovery
 *   - Primary visual discipline (stored as da_references.segment)
 *   - Visual intent most likely for this segment
 *
 * Used by artDirectionReferenceWorker to generate segment-specific
 * queries instead of generic "advertising design" searches.
 * Refs arrive already tagged with the correct creative discipline
 * so gallery chips (Branding / Publicidade / Fotografia...) match.
 */

export type SegmentVisualProfile = {
  /** Creative discipline to tag the ref with (da_references.segment) */
  creativeCategory: string;
  /** 4 targeted search queries — mix of discipline + platform + quality signals */
  queries: string[];
  /** Default visual_intent for this segment (used as tie-breaker in ranking) */
  defaultVisualIntent: string;
};

const YEAR = new Date().getFullYear();

export const SEGMENT_VISUAL_MAP: Record<string, SegmentVisualProfile> = {
  'Alimentação': {
    creativeCategory: 'Packaging',
    queries: [
      `food brand packaging design award winning ${YEAR}`,
      `restaurant brand identity instagram visual direction`,
      `food photography product campaign editorial ${YEAR}`,
      `beverage packaging branding cannes lions behance featured`,
    ],
    defaultVisualIntent: 'social_proof_human',
  },
  'Moda & Beleza': {
    creativeCategory: 'Photography',
    queries: [
      `fashion brand editorial photography campaign ${YEAR}`,
      `beauty brand identity luxury visual direction`,
      `fashion instagram campaign art direction award`,
      `cosmetics packaging brand identity behance featured`,
    ],
    defaultVisualIntent: 'editorial_premium',
  },
  'Tecnologia': {
    creativeCategory: 'Branding',
    queries: [
      `tech startup brand identity design ${YEAR}`,
      `fintech saas brand visual system behance featured`,
      `technology company rebrand award winning ${YEAR}`,
      `digital product brand campaign instagram design`,
    ],
    defaultVisualIntent: 'performance_conversion',
  },
  'Financeiro': {
    creativeCategory: 'Branding',
    queries: [
      `financial services brand identity authority design ${YEAR}`,
      `bank fintech rebrand award winning behance`,
      `investment brand corporate identity visual system`,
      `financial brand instagram campaign authority structured`,
    ],
    defaultVisualIntent: 'authority_structured',
  },
  'Saúde': {
    creativeCategory: 'Branding',
    queries: [
      `healthcare brand identity design ${YEAR} award`,
      `wellness brand visual system clean design behance`,
      `medical clinic brand identity photography campaign`,
      `health brand instagram campaign human social proof`,
    ],
    defaultVisualIntent: 'social_proof_human',
  },
  'Educação': {
    creativeCategory: 'Graphic Design',
    queries: [
      `education brand identity illustration design ${YEAR}`,
      `edtech startup brand visual system behance featured`,
      `learning platform brand campaign instagram design`,
      `school university rebrand award winning ${YEAR}`,
    ],
    defaultVisualIntent: 'culture_driven_expressive',
  },
  'Imobiliário': {
    creativeCategory: 'Photography',
    queries: [
      `real estate brand identity premium photography ${YEAR}`,
      `luxury property brand visual direction award`,
      `architecture photography brand campaign behance`,
      `real estate instagram campaign premium editorial`,
    ],
    defaultVisualIntent: 'editorial_premium',
  },
  'Varejo': {
    creativeCategory: 'Advertising',
    queries: [
      `retail brand advertising campaign award winning ${YEAR}`,
      `store brand identity packaging design behance featured`,
      `retail instagram campaign performance conversion design`,
      `consumer brand advertising cannes lions ${YEAR}`,
    ],
    defaultVisualIntent: 'performance_conversion',
  },
  'Jurídico': {
    creativeCategory: 'Branding',
    queries: [
      `law firm brand identity corporate design ${YEAR}`,
      `legal services brand authority structured visual`,
      `professional services rebrand award winning behance`,
      `law brand instagram campaign authority design`,
    ],
    defaultVisualIntent: 'authority_structured',
  },
  'Indústria': {
    creativeCategory: 'Branding',
    queries: [
      `industrial brand identity B2B design award ${YEAR}`,
      `manufacturing company rebrand visual system behance`,
      `corporate industrial brand photography campaign`,
      `B2B brand instagram authority structured ${YEAR}`,
    ],
    defaultVisualIntent: 'authority_structured',
  },
  'Turismo': {
    creativeCategory: 'Photography',
    queries: [
      `travel brand identity photography campaign ${YEAR}`,
      `hospitality hotel brand visual direction award`,
      `destination brand instagram campaign editorial premium`,
      `tourism brand identity design behance featured`,
    ],
    defaultVisualIntent: 'editorial_premium',
  },
  'Serviços': {
    creativeCategory: 'Branding',
    queries: [
      `service brand identity professional design ${YEAR}`,
      `consultancy brand visual system award behance`,
      `professional services brand instagram campaign`,
      `service company rebrand authority design ${YEAR}`,
    ],
    defaultVisualIntent: 'authority_structured',
  },
  'Logística': {
    creativeCategory: 'Branding',
    queries: [
      `logistics brand identity corporate design ${YEAR}`,
      `supply chain company rebrand visual system behance`,
      `logistics brand instagram campaign B2B authority`,
      `transport logistics brand award winning ${YEAR}`,
    ],
    defaultVisualIntent: 'authority_structured',
  },
  'Transporte': {
    creativeCategory: 'Advertising',
    queries: [
      `mobility transport brand campaign award ${YEAR}`,
      `automotive brand advertising design cannes behance`,
      `transport brand identity visual direction ${YEAR}`,
      `mobility brand instagram campaign performance design`,
    ],
    defaultVisualIntent: 'performance_conversion',
  },
  'Terceiro Setor': {
    creativeCategory: 'Advertising',
    queries: [
      `NGO nonprofit brand campaign award winning ${YEAR}`,
      `social cause advertising design cannes lions`,
      `nonprofit brand identity design behance featured`,
      `social impact brand instagram campaign culture driven`,
    ],
    defaultVisualIntent: 'culture_driven_expressive',
  },
};

/** Fallback for unknown or null segment_primary */
export const DEFAULT_VISUAL_PROFILE: SegmentVisualProfile = {
  creativeCategory: 'Branding',
  queries: [
    `brand identity design award winning ${YEAR}`,
    `advertising campaign art direction behance featured`,
    `brand instagram campaign visual direction ${YEAR}`,
    `brand design cannes lions ${YEAR}`,
  ],
  defaultVisualIntent: 'authority_structured',
};

export function getVisualProfile(segmentPrimary: string | null | undefined): SegmentVisualProfile {
  if (!segmentPrimary) return DEFAULT_VISUAL_PROFILE;
  return SEGMENT_VISUAL_MAP[segmentPrimary] ?? DEFAULT_VISUAL_PROFILE;
}
