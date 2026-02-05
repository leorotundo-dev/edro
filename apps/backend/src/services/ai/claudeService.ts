import { env } from '../../env';

type CompletionParams = {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
};

type AnthropicResponse = {
  content: Array<{
    type: string;
    text?: string;
  }>;
  model: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
};

const API_VERSION = '2023-06-01';

export async function generateCompletion(params: CompletionParams): Promise<string> {
  const apiKey = env.CLAUDE_API_KEY || env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY_NOT_SET');
  }

  const response = await fetch(`${env.ANTHROPIC_BASE_URL}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': API_VERSION,
    },
    body: JSON.stringify({
      model: env.ANTHROPIC_MODEL,
      max_tokens: params.maxTokens ?? 1500,
      system: params.systemPrompt,
      messages: [
        {
          role: 'user',
          content: params.prompt,
        },
      ],
      temperature: params.temperature ?? 0.6,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Claude error: ${response.status} ${text}`);
  }

  const data = (await response.json()) as AnthropicResponse;
  const textContent = data.content.find((block) => block.type === 'text');
  const text = textContent?.text?.trim() || '';

  if (!text) {
    throw new Error('Claude returned empty response');
  }

  return text;
}

export const ClaudeService = {
  generateCompletion,
};
