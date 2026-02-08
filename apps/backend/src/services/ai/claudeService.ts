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

  // 90s HTTP timeout — analysis pipelines send large prompts
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000);

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
      throw new Error('Claude API timed out after 90s');
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

// ── Tool Use Support ───────────────────────────────────────────

export type ClaudeMessage = {
  role: 'user' | 'assistant';
  content: string | Array<{ type: string; [key: string]: any }>;
};

export type ClaudeToolsParams = {
  messages: ClaudeMessage[];
  systemPrompt?: string;
  tools?: any[];
  temperature?: number;
  maxTokens?: number;
};

export type ClaudeToolsResult = {
  content: Array<{ type: string; text?: string; id?: string; name?: string; input?: any }>;
  stop_reason: string;
  usage: { input_tokens: number; output_tokens: number };
  model: string;
};

export async function generateWithTools(params: ClaudeToolsParams): Promise<ClaudeToolsResult> {
  const apiKey = env.CLAUDE_API_KEY || env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY_NOT_SET');

  const model = env.ANTHROPIC_MODEL;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  const body: any = {
    model,
    max_tokens: params.maxTokens ?? 4096,
    messages: params.messages,
    temperature: params.temperature ?? 0.7,
  };
  if (params.systemPrompt) body.system = params.systemPrompt;
  if (params.tools?.length) body.tools = params.tools;

  let response: Response;
  try {
    response = await fetch(`${env.ANTHROPIC_BASE_URL}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': API_VERSION,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err: any) {
    if (err?.name === 'AbortError') throw new Error('Claude API timed out after 60s');
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Claude error: ${response.status} ${text}`);
  }

  const data = await response.json();
  return {
    content: data.content || [],
    stop_reason: data.stop_reason || 'end_turn',
    usage: {
      input_tokens: data.usage?.input_tokens || 0,
      output_tokens: data.usage?.output_tokens || 0,
    },
    model: data.model || model,
  };
}

export const ClaudeService = {
  generateCompletion,
  generateWithTools,
};
