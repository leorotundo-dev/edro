import { env } from '../../env';
import type { AiCompletionResult } from './claudeService';
import { estimateTokens } from './aiUsageLogger';

type CompletionParams = {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
};

const BASE_URL = env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_MODEL = env.GEMINI_MODEL || 'gemini-1.5-flash';
const RESPONSE_MIME = env.GEMINI_RESPONSE_MIME;

export async function generateCompletion(params: CompletionParams): Promise<AiCompletionResult> {
  if (!env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY_NOT_SET');
  }

  // 90s HTTP timeout — analysis pipelines send large prompts
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000);

  let response: Response;
  try {
    response = await fetch(
      `${BASE_URL}/models/${DEFAULT_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: params.prompt }],
            },
          ],
          system_instruction: params.systemPrompt
            ? { parts: [{ text: params.systemPrompt }] }
            : undefined,
          generationConfig: {
            temperature: params.temperature ?? 0.6,
            maxOutputTokens: params.maxTokens ?? 1500,
            ...(RESPONSE_MIME ? { responseMimeType: RESPONSE_MIME } : {}),
          },
        }),
        signal: controller.signal,
      }
    );
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new Error('Gemini API timed out after 90s');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini error: ${response.status} ${text}`);
  }

  const data = (await response.json()) as GeminiResponse;
  const parts = data.candidates?.[0]?.content?.parts || [];
  const text = parts.map((part) => part.text || '').join('').trim();

  if (!text) {
    throw new Error('Gemini returned empty response');
  }

  const inputTokens = data.usageMetadata?.promptTokenCount || estimateTokens(params.prompt + (params.systemPrompt || ''));
  const outputTokens = data.usageMetadata?.candidatesTokenCount || estimateTokens(text);

  return {
    text,
    usage: {
      input_tokens: inputTokens,
      output_tokens: outputTokens,
    },
    model: DEFAULT_MODEL,
  };
}

// ── Tool Use Support ───────────────────────────────────────────

export type GeminiToolsParams = {
  messages: Array<{ role: string; parts: any[] }>;
  systemPrompt?: string;
  tools?: any[];
  temperature?: number;
  maxTokens?: number;
};

export type GeminiToolsResult = {
  parts: Array<{ text?: string; functionCall?: { name: string; args: any } }>;
  usage: { input_tokens: number; output_tokens: number };
  model: string;
};

export async function generateWithTools(params: GeminiToolsParams): Promise<GeminiToolsResult> {
  if (!env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY_NOT_SET');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  const body: any = {
    contents: params.messages,
    generationConfig: {
      temperature: params.temperature ?? 0.7,
      maxOutputTokens: params.maxTokens ?? 4096,
    },
  };
  if (params.systemPrompt) {
    body.system_instruction = { parts: [{ text: params.systemPrompt }] };
  }
  if (params.tools?.length) body.tools = params.tools;

  let response: Response;
  try {
    response = await fetch(
      `${BASE_URL}/models/${DEFAULT_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      },
    );
  } catch (err: any) {
    if (err?.name === 'AbortError') throw new Error('Gemini API timed out after 60s');
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini error: ${response.status} ${text}`);
  }

  const data = await response.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  const inputTokens = data.usageMetadata?.promptTokenCount || 0;
  const outputTokens = data.usageMetadata?.candidatesTokenCount || 0;

  return {
    parts,
    usage: { input_tokens: inputTokens, output_tokens: outputTokens },
    model: DEFAULT_MODEL,
  };
}

export const GeminiService = {
  generateCompletion,
  generateWithTools,
};
