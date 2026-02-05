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

export const OpenAIService = {
  generateCompletion,
};
