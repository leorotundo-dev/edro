// =====================================================
// BriefingAnalyzer
// =====================================================
// Analisa briefing usando LLM e extrai parâmetros estruturados
// =====================================================

import { generateCopy } from '../services/ai/copyService';
import { knowledgeBaseProvider } from '../providers/base';
import type { ClientKnowledge } from '../providers/contracts';
import { buildClientKnowledgeBlock } from '../ai/knowledgePrompt';

interface BriefingInput {
  text: string;
  structured?: Partial<ExtractedParameters>;
  client_id?: string;
  tenant_id?: string | null;
}

export interface ExtractedParameters {
  // Objetivo e Tipo
  campaign_objective: 'awareness' | 'consideration' | 'conversion' | 'retention';
  campaign_type: string;

  // Público-Alvo
  target_audience: {
    age_range?: string;
    gender?: string;
    location?: string;
    interests?: string[];
    segment: 'B2C' | 'B2B' | 'D2C' | 'Internal';
    persona_description?: string;
  };

  // Canais
  channels: {
    platforms: string[];
    production_types: string[];
    must_have_formats?: string[];
    exclude_formats?: string[];
  };

  // Budget
  budget: {
    total: number;
    currency: string;
    allocation?: Record<string, number>;
    flexibility: 'strict' | 'flexible' | 'very_flexible';
  };

  // Timeline
  timeline: {
    deadline: string;
    start_date?: string;
    urgency: 'low' | 'medium' | 'high' | 'critical';
  };

  // Requisitos
  requirements: {
    measurability_required: boolean;
    min_measurability_score?: number;
    reusability_preferred: boolean;
    brand_guidelines?: string;
    tone_of_voice?: string;
    key_messages?: string[];
    call_to_action?: string;
  };

  // Contexto Adicional
  context?: {
    industry?: string;
    competitors?: string[];
    previous_campaigns?: string;
    success_metrics?: string[];
  };
}

const PLATFORM_MAP: Record<string, string> = {
  ig: 'Instagram',
  insta: 'Instagram',
  instagram: 'Instagram',
  fb: 'Facebook',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  'tik tok': 'TikTok',
  youtube: 'YouTube',
  yt: 'YouTube',
  linkedin: 'LinkedIn',
  twitter: 'Twitter/X',
  'twitter/x': 'Twitter/X',
  x: 'Twitter/X',
  pinterest: 'Pinterest',
  snapchat: 'Snapchat',
  whatsapp: 'WhatsApp Business',
  'whatsapp business': 'WhatsApp Business',
  telegram: 'Telegram Ads',
  'telegram ads': 'Telegram Ads',
  reddit: 'Reddit Ads',
  'reddit ads': 'Reddit Ads',
  twitch: 'Twitch',
  spotify: 'Spotify Ads',
  'spotify ads': 'Spotify Ads',
  'google ads': 'Google Display',
  'google display': 'Google Display',
  google: 'Google Display',
  'meta ads': 'Meta Audience Network',
  'meta audience': 'Meta Audience Network',
  'meta audience network': 'Meta Audience Network',
  'facebook ads': 'Facebook',
  'instagram ads': 'Instagram',
  radio: 'Rádio',
  'rádio': 'Rádio',
  tv: 'TV',
  cinema: 'Cinema',
  jornal: 'Jornal',
  revista: 'Revista',
  impresso: 'Impresso',
  outdoor: 'OOH',
  ooh: 'OOH',
  pdv: 'Ponto de Venda',
  'ponto de venda': 'Ponto de Venda',
  'midia em movimento': 'Mídia em Movimento',
  'mídia em movimento': 'Mídia em Movimento',
  'midia aerea': 'Mídia Aérea',
  'mídia aerea': 'Mídia Aérea',
  'midia aquatica': 'Mídia Aquática',
  'mídia aquatica': 'Mídia Aquática',
};

const PRODUCTION_TYPE_MAP: Record<string, string> = {
  'midia on': 'midia-on',
  'mídia on': 'midia-on',
  'midia-on': 'midia-on',
  'mídia-on': 'midia-on',
  'digital': 'midia-on',
  'midia off': 'midia-off',
  'mídia off': 'midia-off',
  'midia-off': 'midia-off',
  'mídia-off': 'midia-off',
  'eventos': 'eventos-ativacoes',
  'eventos e ativacoes': 'eventos-ativacoes',
  'eventos e ativações': 'eventos-ativacoes',
  'eventos-ativacoes': 'eventos-ativacoes',
  'ativacao': 'eventos-ativacoes',
  'ativação': 'eventos-ativacoes',
  'endomarketing': 'endomarketing',
  'apresentacoes': 'apresentacoes',
  'apresentações': 'apresentacoes',
  'branding': 'branding',
  'e-commerce': 'e-commerce',
  'ecommerce': 'e-commerce',
  'conteudo editorial': 'conteudo-editorial',
  'conteúdo editorial': 'conteudo-editorial',
  'educacional': 'educacional',
  'streaming': 'streaming-podcast',
  'podcast': 'streaming-podcast',
  'streaming-podcast': 'streaming-podcast',
};

export class BriefingAnalyzer {
  constructor() {
    // usa copyService
  }

  /**
   * Analisa briefing e extrai parâmetros estruturados
   */
  async analyze(input: BriefingInput): Promise<ExtractedParameters> {
    console.log('🔍 Analisando briefing com LLM...');

    const partialStructured = input.structured || {};
    const text = String(input.text || '').trim();
    if (!text) {
      return this.createFallbackParameters(partialStructured);
    }

    const clientKnowledge = await this.loadClientKnowledge(input);
    const knowledgeBlock = buildClientKnowledgeBlock(clientKnowledge);

    const promptParts = [this.getSystemPrompt()];
    if (knowledgeBlock) {
      promptParts.push(
        `CONTEXTO DO CLIENTE:\n${knowledgeBlock}\n\nUse estas informacoes para interpretar o briefing, completar campos e ajustar tom de voz e requisitos.`
      );
    }
    promptParts.push(this.buildPrompt(text, partialStructured));

    const prompt = promptParts.join('\n\n');

    try {
      const completion = await generateCopy({
        prompt,
        taskType: 'briefing_analysis',
        tier: 'fast',
        maxTokens: 2000,
      });

      const extracted = this.parseJson(completion.output);
      const validated = this.validateAndNormalize(extracted, partialStructured);

      console.log('✅ Briefing analisado com sucesso');
      console.log(`   - Objetivo: ${validated.campaign_objective}`);
      console.log(`   - Tipo: ${validated.campaign_type}`);
      console.log(`   - Plataformas: ${validated.channels.platforms.join(', ')}`);
      console.log(`   - Budget: ${validated.budget.currency} ${validated.budget.total.toLocaleString()}`);
      console.log(`   - Prazo: ${validated.timeline.deadline}`);

      return validated;
    } catch (error) {
      console.error('❌ Erro ao analisar briefing:', error);
      return this.createFallbackParameters(partialStructured);
    }
  }

  private parseJson(raw: string): ExtractedParameters {
    const trimmed = String(raw || '')
      .trim()
      .replace(/```json/gi, '```')
      .replace(/```/g, '');
    try {
      return JSON.parse(trimmed) as ExtractedParameters;
    } catch {
      const start = trimmed.indexOf('{');
      const end = trimmed.lastIndexOf('}');
      if (start >= 0 && end > start) {
        return JSON.parse(trimmed.slice(start, end + 1)) as ExtractedParameters;
      }
      throw new Error('Invalid JSON from LLM');
    }
  }

  /**
   * Constrói prompt para LLM
   */
  private buildPrompt(text: string, partial: Partial<ExtractedParameters>): string {
    let prompt = `Analise o seguinte briefing de campanha e extraia os parametros estruturados. Retorne APENAS JSON valido, sem markdown.\n\n`;
    prompt += `BRIEFING:\n${text}\n\n`;

    if (Object.keys(partial).length > 0) {
      prompt += `INFORMACOES JA FORNECIDAS:\n${JSON.stringify(partial, null, 2)}\n\n`;
      prompt += `Use essas informacoes como base e complete o que estiver faltando.\n\n`;
    }

    prompt += `Retorne um JSON seguindo EXATAMENTE esta estrutura (todos os campos sao obrigatorios):\n`;
    prompt += JSON.stringify(this.getExampleStructure(), null, 2);

    return prompt;
  }

  private async loadClientKnowledge(input: BriefingInput): Promise<ClientKnowledge | null> {
    const clientId = input.client_id;
    if (!clientId) return null;
    try {
      return await knowledgeBaseProvider.getClientKnowledge({
        client_id: clientId,
        tenant_id: input.tenant_id ?? null,
      });
    } catch (error) {
      console.warn('⚠️ Falha ao carregar base do cliente para briefing:', error);
      return null;
    }
  }

  /**
   * System prompt para LLM
   */
  private getSystemPrompt(): string {
    return `Voce e um especialista em marketing e producao criativa. Sua tarefa e analisar briefings e extrair parametros estruturados.

REGRAS:
1. Retorne apenas JSON valido.
2. Use o contexto do cliente (quando fornecido) para ajustar tom de voz e escolhas.
3. Se algo nao estiver explicito, faca inferencias inteligentes.
4. Budget: se nao especificado, use um valor medio (ex: R$ 50.000).
5. Prazo: se nao especificado, use 30 dias a partir de hoje.
6. Plataformas: identifique todas mencionadas ou implicitas.
7. production_types: mapeie (midia-on, midia-off, eventos-ativacoes, endomarketing, apresentacoes, branding, e-commerce, conteudo-editorial, educacional, streaming-podcast).
8. Segmento: B2C, B2B, D2C ou Internal.
9. campaign_objective: awareness, consideration, conversion ou retention.
10. Seja conservador nas estimativas.
11. Retorne TODOS os campos obrigatorios.`;
  }

  /**
   * Estrutura de exemplo para o LLM
   */
  private getExampleStructure() {
    return {
      campaign_objective: 'conversion',
      campaign_type: 'product_launch',
      target_audience: {
        age_range: '18-35',
        gender: 'all',
        location: 'Brasil',
        interests: ['tecnologia', 'lifestyle'],
        segment: 'B2C',
        persona_description: 'Jovens urbanos interessados em tecnologia',
      },
      channels: {
        platforms: ['Instagram', 'Facebook', 'TikTok'],
        production_types: ['midia-on'],
        must_have_formats: [],
        exclude_formats: [],
      },
      budget: {
        total: 50000,
        currency: 'BRL',
        allocation: {
          'midia-on': 0.8,
          'midia-off': 0.2,
        },
        flexibility: 'flexible',
      },
      timeline: {
        deadline: '2026-03-01',
        start_date: '2026-02-01',
        urgency: 'medium',
      },
      requirements: {
        measurability_required: true,
        min_measurability_score: 70,
        reusability_preferred: true,
        brand_guidelines: '',
        tone_of_voice: 'casual e amigavel',
        key_messages: ['inovacao', 'qualidade'],
        call_to_action: 'Compre agora',
      },
      context: {
        industry: 'tecnologia',
        competitors: [],
        previous_campaigns: '',
        success_metrics: ['conversoes', 'engajamento'],
      },
    };
  }

  /**
   * Valida e normaliza parametros extraidos
   */
  private validateAndNormalize(
    extracted: ExtractedParameters,
    partial: Partial<ExtractedParameters>
  ): ExtractedParameters {
    const merged = this.deepMerge(extracted, partial);

    const validObjectives = ['awareness', 'consideration', 'conversion', 'retention'];
    if (!validObjectives.includes(merged.campaign_objective)) {
      merged.campaign_objective = 'consideration';
    }

    const validSegments = ['B2C', 'B2B', 'D2C', 'Internal'];
    if (!merged.target_audience.segment || !validSegments.includes(merged.target_audience.segment)) {
      merged.target_audience.segment = 'B2C';
    }

    merged.channels.platforms = (merged.channels.platforms || [])
      .map((p: string) => this.normalizePlatformName(p))
      .filter(Boolean);

    const normalizedTypes = (merged.channels.production_types || [])
      .map((t: string) => this.normalizeProductionType(t))
      .filter(Boolean);

    merged.channels.production_types = normalizedTypes.length
      ? normalizedTypes
      : this.inferProductionTypes(merged.channels.platforms);

    if (!merged.budget.total || merged.budget.total <= 0) {
      merged.budget.total = 50000;
    }

    if (!merged.budget.currency) {
      merged.budget.currency = 'BRL';
    }

    if (!merged.timeline.deadline) {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 30);
      merged.timeline.deadline = deadline.toISOString().split('T')[0];
    }

    merged.channels.must_have_formats = merged.channels.must_have_formats || [];
    merged.channels.exclude_formats = merged.channels.exclude_formats || [];
    merged.target_audience.interests = merged.target_audience.interests || [];

    return merged;
  }

  /**
   * Normaliza nome de plataforma
   */
  private normalizePlatformName(platform: string): string {
    const normalized = platform.toLowerCase().trim();
    return PLATFORM_MAP[normalized] || platform;
  }

  private normalizeProductionType(value: string): string {
    const normalized = String(value || '').toLowerCase().trim();
    return PRODUCTION_TYPE_MAP[normalized] || value;
  }

  /**
   * Infere production_types baseado em plataformas
   */
  private inferProductionTypes(platforms: string[]): string[] {
    const types = new Set<string>();

    const digitalPlatforms = [
      'Instagram',
      'Facebook',
      'TikTok',
      'YouTube',
      'LinkedIn',
      'Twitter/X',
      'Google Display',
      'Meta Audience Network',
      'Pinterest',
      'Snapchat',
      'WhatsApp Business',
      'Telegram Ads',
      'Reddit Ads',
      'Twitch',
      'Spotify Ads',
      'Email Marketing',
    ];

    const offlinePlatforms = [
      'OOH',
      'TV',
      'Rádio',
      'Cinema',
      'Impresso',
      'Jornal',
      'Revista',
      'Ponto de Venda',
      'Mídia em Movimento',
      'Mídia Aérea',
      'Mídia Aquática',
    ];

    platforms.forEach((platform) => {
      if (digitalPlatforms.includes(platform)) {
        types.add('midia-on');
      }
      if (offlinePlatforms.includes(platform)) {
        types.add('midia-off');
      }
    });

    if (types.size === 0) {
      types.add('midia-on');
    }

    return Array.from(types);
  }

  /**
   * Cria parametros fallback em caso de erro
   */
  private createFallbackParameters(partial: Partial<ExtractedParameters>): ExtractedParameters {
    const today = new Date();
    const deadline = new Date(today);
    deadline.setDate(deadline.getDate() + 30);

    const defaults: ExtractedParameters = {
      campaign_objective: 'consideration',
      campaign_type: 'general_campaign',
      target_audience: {
        segment: 'B2C',
        interests: [],
      },
      channels: {
        platforms: ['Instagram', 'Facebook'],
        production_types: ['midia-on'],
        must_have_formats: [],
        exclude_formats: [],
      },
      budget: {
        total: 50000,
        currency: 'BRL',
        flexibility: 'flexible',
      },
      timeline: {
        deadline: deadline.toISOString().split('T')[0],
        urgency: 'medium',
      },
      requirements: {
        measurability_required: false,
        reusability_preferred: false,
      },
    };

    return this.deepMerge(defaults, partial);
  }

  /**
   * Deep merge de objetos
   */
  private deepMerge(target: any, source: any): any {
    const output = { ...target };

    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach((key) => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }

    return output;
  }

  /**
   * Verifica se e objeto
   */
  private isObject(item: any): boolean {
    return item && typeof item === 'object' && !Array.isArray(item);
  }
}
