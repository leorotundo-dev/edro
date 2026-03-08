import OpenAI from 'openai';
import { env } from '../../env';
import type { AiCompletionResult } from './claudeService';

type CompletionParams = {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
};

const client = new OpenAI({
  apiKey: env.OPENAI_API_KEY || '',
  baseURL: env.OPENAI_BASE_URL,
  timeout: 90000, // 90s HTTP timeout — analysis pipelines send large prompts
});

export async function generateCompletion(params: CompletionParams): Promise<AiCompletionResult> {
  if (!env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY_NOT_SET');
  }

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
  if (params.systemPrompt) {
    messages.push({ role: 'system', content: params.systemPrompt });
  }
  messages.push({ role: 'user', content: params.prompt });

  const model = env.OPENAI_MODEL;

  const response = await client.chat.completions.create({
    model,
    messages,
    temperature: params.temperature ?? 0.6,
    max_tokens: params.maxTokens ?? 1500,
  });

  return {
    text: response.choices[0]?.message?.content?.trim() || '',
    usage: {
      input_tokens: response.usage?.prompt_tokens || 0,
      output_tokens: response.usage?.completion_tokens || 0,
    },
    model: response.model || model,
  };
}

// ── Tool Use Support ───────────────────────────────────────────

export type OpenAIToolsParams = {
  messages: Array<{ role: string; content: string | null; tool_calls?: any[]; tool_call_id?: string; name?: string }>;
  systemPrompt?: string;
  tools?: any[];
  temperature?: number;
  maxTokens?: number;
};

export type OpenAIToolsResult = {
  message: { role: string; content: string | null; tool_calls?: any[] };
  finish_reason: string;
  usage: { input_tokens: number; output_tokens: number };
  model: string;
};

export async function generateWithTools(params: OpenAIToolsParams): Promise<OpenAIToolsResult> {
  if (!env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY_NOT_SET');

  const model = env.OPENAI_MODEL;
  const messages: any[] = [];
  if (params.systemPrompt) {
    messages.push({ role: 'system', content: params.systemPrompt });
  }
  messages.push(...params.messages);

  const createParams: any = {
    model,
    messages,
    temperature: params.temperature ?? 0.7,
    max_tokens: params.maxTokens ?? 4096,
  };
  if (params.tools?.length) createParams.tools = params.tools;

  const response = await client.chat.completions.create(createParams);
  const choice = response.choices[0];

  return {
    message: {
      role: choice.message.role,
      content: choice.message.content,
      tool_calls: choice.message.tool_calls as any,
    },
    finish_reason: choice.finish_reason || 'stop',
    usage: {
      input_tokens: response.usage?.prompt_tokens || 0,
      output_tokens: response.usage?.completion_tokens || 0,
    },
    model: response.model || model,
  };
}

export const OpenAIService = {
  generateCompletion,
  generateWithTools,
};

// ── Text-to-Speech ────────────────────────────────────────────────────────────

export type TtsVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

/**
 * Converts text to speech using OpenAI TTS.
 * Returns the audio as a base64-encoded MP3 string.
 * tts-1: fast (~1s), tts-1-hd: higher quality (~3s).
 */
export async function generateSpeech(params: {
  text:    string;
  voice?:  TtsVoice;
  model?:  'tts-1' | 'tts-1-hd';
  speed?:  number; // 0.25–4.0, default 1.0
}): Promise<{ audioBase64: string; durationEstimateMs: number }> {
  const text  = params.text.trim().slice(0, 4096); // OpenAI TTS limit
  const voice = params.voice ?? 'nova';
  const model = params.model ?? 'tts-1';
  const speed = params.speed ?? 1.0;

  const response = await client.audio.speech.create({
    model,
    voice,
    input: text,
    response_format: 'mp3',
    speed,
  });

  const buffer       = Buffer.from(await response.arrayBuffer());
  const audioBase64  = buffer.toString('base64');

  // Rough duration estimate: ~150 words/min at speed 1.0
  const wordCount          = text.split(/\s+/).length;
  const durationEstimateMs = Math.round((wordCount / 150) * 60000 / speed);

  return { audioBase64, durationEstimateMs };
}
