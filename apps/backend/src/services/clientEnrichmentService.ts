import { query } from '../db';
import { generateWithProvider } from './ai/copyOrchestrator';
import type { ProfileSuggestions } from '../types/clientProfile';

export type EnrichmentSection =
  | 'identity'
  | 'voice'
  | 'strategy'
  | 'competitors'
  | 'calendar';

export type EnrichmentTrigger = 'created' | 'profile_update' | 'scheduled' | 'manual';

export type EnrichmentParams = {
  client_id: string;
  tenant_id: string;
  sections?: EnrichmentSection[];
  trigger: EnrichmentTrigger;
};

type ClientRow = {
  id: string;
  name: string;
  segment_primary?: string | null;
  country?: string | null;
  uf?: string | null;
  city?: string | null;
  profile?: Record<string, any> | null;
  profile_suggestions?: ProfileSuggestions | null;
  sections_refreshed_at?: Record<string, string> | null;
};

const ALL_SECTIONS: EnrichmentSection[] = [
  'identity',
  'voice',
  'strategy',
  'competitors',
  'calendar',
];

const SECTION_FIELDS: Record<EnrichmentSection, string[]> = {
  identity: ['description', 'audience', 'brand_promise', 'differentiators', 'website'],
  voice: ['tone_description', 'personality_traits', 'formality_level', 'emoji_usage'],
  strategy: ['pillars', 'keywords', 'negative_keywords', 'content_mix'],
  competitors: ['competitors'],
  calendar: ['strategic_dates'],
};

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function toArray(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  return String(value)
    .split(/[,;\n]/)
    .map((v) => v.trim())
    .filter(Boolean);
}

function stripKnownField(profile: Record<string, any>, field: string) {
  const next = { ...profile };
  const kb = { ...(profile?.knowledge_base || {}) };
  if (Object.prototype.hasOwnProperty.call(kb, field)) {
    delete kb[field];
    next.knowledge_base = kb;
  } else {
    delete next[field];
  }
  return next;
}

export function applyFieldToProfile(profile: Record<string, any>, field: string, value: any) {
  const next = { ...(profile || {}) };
  const knowledgeBaseFields = new Set([
    'description',
    'website',
    'audience',
    'brand_promise',
    'differentiators',
    'must_mentions',
    'approved_terms',
    'forbidden_claims',
    'hashtags',
    'notes',
  ]);

  if (value === undefined) return next;
  if (value === null || value === '') return stripKnownField(next, field);

  if (knowledgeBaseFields.has(field)) {
    const kb = { ...(next.knowledge_base || {}) };
    kb[field] = value;
    next.knowledge_base = kb;
    return next;
  }

  next[field] = value;
  return next;
}

function countFilledInSection(profile: Record<string, any>, section: EnrichmentSection) {
  const fields = SECTION_FIELDS[section];
  let filled = 0;
  for (const field of fields) {
    const value = field in (profile.knowledge_base || {}) ? profile.knowledge_base?.[field] : profile[field];
    if (Array.isArray(value)) {
      if (value.length > 0) filled += 1;
      continue;
    }
    if (value && typeof value === 'object') {
      if (Object.keys(value).length > 0) filled += 1;
      continue;
    }
    if (String(value || '').trim()) filled += 1;
  }
  return { filled, max: fields.length };
}

export function calculateIntelligenceScore(params: {
  profile: Record<string, any>;
  suggestions?: ProfileSuggestions | null;
}) {
  const profile = params.profile || {};
  const suggestions = params.suggestions || {};
  let totalFilled = 0;
  let totalMax = 0;

  for (const section of ALL_SECTIONS) {
    const sectionCounts = countFilledInSection(profile, section);
    totalFilled += sectionCounts.filled;
    totalMax += sectionCounts.max;
    const suggestionFields = suggestions[section]?.fields || {};
    const pendingCount = Object.values(suggestionFields).filter(
      (field) => field?.status !== 'confirmed'
    ).length;
    totalFilled += pendingCount * 0.5;
    totalMax += pendingCount * 0.5;
  }

  if (!totalMax) return 0;
  return Math.max(0, Math.min(100, Math.round((totalFilled / totalMax) * 100)));
}

function buildPrompt(section: EnrichmentSection, client: ClientRow) {
  const profile = client.profile || {};
  const knowledge = profile.knowledge_base || {};
  const scope = SECTION_FIELDS[section].join(', ');

  return `
Você é um analista de dados de cliente para marketing.
Retorne JSON puro (sem markdown) com esta estrutura:
{
  "fields": {
    "campo": {
      "value": "...",
      "confidence": 0.0,
      "source": "analysis",
      "reasoning": "..."
    }
  }
}

Cliente:
- Nome: ${client.name}
- Segmento: ${client.segment_primary || ''}
- Local: ${[client.city, client.uf, client.country].filter(Boolean).join(', ')}

Conhecimento existente:
${JSON.stringify(
  {
    keywords: profile.keywords || [],
    pillars: profile.pillars || [],
    negative_keywords: profile.negative_keywords || [],
    tone_profile: profile.tone_profile || '',
    knowledge_base: knowledge,
  },
  null,
  2
)}

Gere somente os campos deste escopo: ${scope}.
Se um campo já estiver bem preenchido, você pode omitir.
Evite inventar dados factuais não confirmaveis.
`;
}

function normalizeSuggestionFields(section: EnrichmentSection, payload: any) {
  const allowed = new Set(SECTION_FIELDS[section]);
  const fields = payload?.fields && typeof payload.fields === 'object' ? payload.fields : {};
  const normalized: Record<string, any> = {};
  for (const [field, raw] of Object.entries(fields)) {
    if (!allowed.has(field)) continue;
    const entry = raw as any;
    let value = entry?.value;
    if (field === 'keywords' || field === 'pillars' || field === 'negative_keywords') {
      value = toArray(value);
    }
    normalized[field] = {
      value,
      confidence: Math.max(0, Math.min(1, Number(entry?.confidence ?? 0.55))),
      source: String(entry?.source || 'analysis'),
      reasoning: String(entry?.reasoning || '').slice(0, 500),
      status: 'pending',
    };
  }
  return normalized;
}

function fallbackSuggestion(section: EnrichmentSection, client: ClientRow) {
  const profile = client.profile || {};
  const knowledge = profile.knowledge_base || {};
  const fields: Record<string, any> = {};

  if (section === 'voice' && !profile.tone_description) {
    fields.tone_description = {
      value: profile.tone_profile
        ? `Tom ${profile.tone_profile} com linguagem clara e objetiva.`
        : `Tom profissional, direto e sem jargão desnecessário.`,
      confidence: 0.42,
      source: 'fallback',
      reasoning: 'Sugerido a partir do tom base e segmento.',
      status: 'pending',
    };
  }

  if (section === 'strategy') {
    if (!Array.isArray(profile.pillars) || !profile.pillars.length) {
      fields.pillars = {
        value: [client.segment_primary || 'institucional', 'autoridade', 'resultado'],
        confidence: 0.35,
        source: 'fallback',
        reasoning: 'Pilares basicos para iniciar aprendizado.',
        status: 'pending',
      };
    }
    if (!Array.isArray(profile.keywords) || !profile.keywords.length) {
      fields.keywords = {
        value: [client.name, client.segment_primary].filter(Boolean),
        confidence: 0.35,
        source: 'fallback',
        reasoning: 'Keywords iniciais com base no cliente.',
        status: 'pending',
      };
    }
  }

  if (section === 'identity') {
    if (!knowledge.description) {
      fields.description = {
        value: `${client.name} atua no segmento ${client.segment_primary || 'principal'} no Brasil.`,
        confidence: 0.33,
        source: 'fallback',
        reasoning: 'Resumo inicial do cliente para orientar IA.',
        status: 'pending',
      };
    }
  }

  return { fields };
}

async function fetchClient(tenantId: string, clientId: string): Promise<ClientRow | null> {
  const { rows } = await query<ClientRow>(
    `
    SELECT id, name, segment_primary, country, uf, city,
           profile, profile_suggestions, sections_refreshed_at
    FROM clients
    WHERE id=$1 AND tenant_id=$2
    LIMIT 1
    `,
    [clientId, tenantId]
  );
  return rows[0] ?? null;
}

async function updateClientSuggestions(params: {
  tenantId: string;
  clientId: string;
  suggestions: ProfileSuggestions;
  sectionsRefreshedAt: Record<string, string>;
  profile: Record<string, any>;
  enrichmentStatus: 'running' | 'done' | 'failed';
}) {
  const intelligenceScore = calculateIntelligenceScore({
    profile: params.profile,
    suggestions: params.suggestions,
  });
  await query(
    `
    UPDATE clients
    SET profile_suggestions=$1::jsonb,
        sections_refreshed_at=$2::jsonb,
        enrichment_status=$3,
        intelligence_refreshed_at=NOW(),
        intelligence_score=$4,
        updated_at=NOW()
    WHERE id=$5 AND tenant_id=$6
    `,
    [
      JSON.stringify(params.suggestions || {}),
      JSON.stringify(params.sectionsRefreshedAt || {}),
      params.enrichmentStatus,
      intelligenceScore,
      params.clientId,
      params.tenantId,
    ]
  );
}

export async function enrichClientProfile(params: EnrichmentParams): Promise<void> {
  const sections = (params.sections && params.sections.length
    ? params.sections
    : ALL_SECTIONS) as EnrichmentSection[];

  await query(
    `UPDATE clients SET enrichment_status='running', updated_at=NOW()
     WHERE id=$1 AND tenant_id=$2`,
    [params.client_id, params.tenant_id]
  );

  const client = await fetchClient(params.tenant_id, params.client_id);
  if (!client) {
    throw new Error('client_not_found');
  }

  const suggestions: ProfileSuggestions = {
    ...(client.profile_suggestions || {}),
  };
  const refreshedAt = {
    ...(client.sections_refreshed_at || {}),
  };
  const profile = { ...(client.profile || {}) };

  try {
    for (const section of sections) {
      let parsed: any = null;
      try {
        const result = await generateWithProvider('gemini', {
          prompt: buildPrompt(section, client),
          temperature: 0.2,
          maxTokens: 900,
        });
        parsed = safeJsonParse(result.output || '');
      } catch {
        parsed = null;
      }

      const normalized = normalizeSuggestionFields(
        section,
        parsed && typeof parsed === 'object' ? parsed : fallbackSuggestion(section, client)
      );

      suggestions[section] = {
        suggested_at: new Date().toISOString(),
        status: 'pending',
        fields: {
          ...(suggestions[section]?.fields || {}),
          ...normalized,
        },
      };
      refreshedAt[section] = new Date().toISOString();
    }

    await updateClientSuggestions({
      tenantId: params.tenant_id,
      clientId: params.client_id,
      suggestions,
      sectionsRefreshedAt: refreshedAt,
      profile,
      enrichmentStatus: 'done',
    });
  } catch (error) {
    await query(
      `UPDATE clients
       SET enrichment_status='failed', updated_at=NOW()
       WHERE id=$1 AND tenant_id=$2`,
      [params.client_id, params.tenant_id]
    );
    throw error;
  }
}

