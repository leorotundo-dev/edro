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
  timeout: 30000, // 30s HTTP timeout — prevents hanging indefinitely
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
