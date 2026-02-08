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

  // 30s HTTP timeout — prevents hanging indefinitely
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

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
      throw new Error('Gemini API timed out after 30s');
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

export const GeminiService = {
  generateCompletion,
};
