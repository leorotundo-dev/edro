import { env } from '../../env';
import { OpenAIService } from './openaiService';
import { GeminiService } from './geminiService';

export type CopyProvider = 'openai' | 'gemini';

type GenerateParams = {
  prompt: string;
  temperature?: number;
  maxTokens?: number;
};

type ValidationResult = {
  score_geral: number;
  checklist: {
    clareza: boolean;
    alinhamento_objetivo: boolean;
    tom_de_voz: boolean;
    cta_presente: boolean;
  };
  copys: Array<{
    headline: string;
    corpo: string;
    cta: string;
  }>;
  formatted_text: string;
  melhorias?: string[];
};

type CopyPipelineResult = {
  output: string;
  model: string;
  payload: Record<string, any>;
};

const buildValidationPrompt = (params: { prompt: string; creativeOutput: string }) => [
  'Voce e um revisor tecnico de copy.',
  'Nao reescreva. Apenas valide, organize e padronize o texto recebido.',
  'Se algum item estiver confuso, mantenha o texto e marque no checklist.',
  'Retorne APENAS JSON valido com a estrutura abaixo.',
  '{',
  '  "score_geral": 0.0,',
  '  "checklist": {',
  '    "clareza": true,',
  '    "alinhamento_objetivo": true,',
  '    "tom_de_voz": true,',
  '    "cta_presente": true',
  '  },',
  '  "copys": [',
  '    { "headline": "...", "corpo": "...", "cta": "..." }',
  '  ],',
  '  "formatted_text": "texto formatado para leitura humana"',
  '}',
  '',
  'PROMPT ORIGINAL:',
  params.prompt,
  '',
  'COPYS GERADAS:',
  params.creativeOutput,
].join('\n');

const parseJsonFromText = (text: string): ValidationResult => {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as ValidationResult;
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1)) as ValidationResult;
    }
    throw new Error('Invalid Gemini JSON response');
  }
};

export async function generateCopyWithValidation(params: GenerateParams): Promise<CopyPipelineResult> {
  if (!env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY_NOT_SET');
  }
  if (!env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY_NOT_SET');
  }

  const creativeOutput = await OpenAIService.generateCompletion({
    prompt: params.prompt,
    temperature: params.temperature ?? 0.6,
    maxTokens: params.maxTokens ?? 1500,
  });

  const validationPrompt = buildValidationPrompt({
    prompt: params.prompt,
    creativeOutput,
  });

  const validationRaw = await GeminiService.generateCompletion({
    prompt: validationPrompt,
    temperature: 0.2,
    maxTokens: 1500,
  });

  const validation = parseJsonFromText(validationRaw);
  if (!validation.formatted_text || !Array.isArray(validation.copys)) {
    throw new Error('Gemini response missing formatted_text or copys');
  }

  return {
    output: validation.formatted_text,
    model: `gemini:${env.GEMINI_MODEL || 'gemini-1.5-flash'}`,
    payload: {
      creative_provider: 'openai',
      creative_model: `openai:${env.OPENAI_MODEL}`,
      creative_output: creativeOutput,
      review_provider: 'gemini',
      review_model: `gemini:${env.GEMINI_MODEL || 'gemini-1.5-flash'}`,
      review_json: validation,
      review_raw: validationRaw,
      formatted_text: validation.formatted_text,
    },
  };
}
