import OpenAI from 'openai';
import { env } from '../../env';

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

export async function generateCompletion(params: CompletionParams): Promise<string> {
  if (!env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY_NOT_SET');
  }

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
  if (params.systemPrompt) {
    messages.push({ role: 'system', content: params.systemPrompt });
  }
  messages.push({ role: 'user', content: params.prompt });

  const response = await client.chat.completions.create({
    model: env.OPENAI_MODEL,
    messages,
    temperature: params.temperature ?? 0.6,
    max_tokens: params.maxTokens ?? 1500,
  });

  return response.choices[0]?.message?.content?.trim() || '';
}

export const OpenAIService = {
  generateCompletion,
};
