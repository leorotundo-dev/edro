import { env } from '../../env';

type CompletionParams = {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
};

export type AiCompletionResult = {
  text: string;
  usage: { input_tokens: number; output_tokens: number };
  model: string;
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

export async function generateCompletion(params: CompletionParams): Promise<AiCompletionResult> {
  const apiKey = env.CLAUDE_API_KEY || env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY_NOT_SET');
  }

  const model = env.ANTHROPIC_MODEL;

  // 30s HTTP timeout — prevents hanging indefinitely
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  let response: Response;
  try {
    response = await fetch(`${env.ANTHROPIC_BASE_URL}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': API_VERSION,
      },
      body: JSON.stringify({
        model,
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
      signal: controller.signal,
    });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new Error('Claude API timed out after 30s');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

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

  return {
    text,
    usage: {
      input_tokens: data.usage?.input_tokens || 0,
      output_tokens: data.usage?.output_tokens || 0,
    },
    model: data.model || model,
  };
}

export const ClaudeService = {
  generateCompletion,
};
