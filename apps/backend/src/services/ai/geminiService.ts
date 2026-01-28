import { env } from '../../env';

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
};

const BASE_URL = env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_MODEL = env.GEMINI_MODEL || 'gemini-1.5-flash';
const RESPONSE_MIME = env.GEMINI_RESPONSE_MIME;

export async function generateCompletion(params: CompletionParams): Promise<string> {
  if (!env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY_NOT_SET');
  }

  const response = await fetch(
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
    }
  );

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

  return text;
}

export const GeminiService = {
  generateCompletion,
};
