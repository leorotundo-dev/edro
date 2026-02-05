/**
 * Serviço para gerar descrições de eventos do calendário usando IA
 *
 * Usa OpenAI para buscar e gerar explicações sobre datas comemorativas
 */

import { generateCompletion } from './ai/openaiService';

export interface EventDescriptionRequest {
  evento: string;
  data: string;
  tipo_evento?: string;
  tags?: string;
}

export interface EventDescriptionResult {
  evento: string;
  descricao: string;
  origem?: string;
  curiosidade?: string;
  error?: string;
}

const SYSTEM_PROMPT = `Você é um especialista em datas comemorativas e eventos culturais do Brasil e do mundo.

Sua tarefa é fornecer uma descrição concisa e informativa sobre uma data comemorativa ou evento.

REGRAS:
1. A descrição deve ter entre 50 e 150 palavras
2. Seja objetivo e informativo
3. Inclua a origem ou história da data quando relevante
4. Se for uma data brasileira, destaque o contexto nacional
5. Não invente informações - se não souber, diga que não há informações disponíveis
6. Responda SEMPRE em português brasileiro
7. Não use markdown, apenas texto simples

FORMATO DA RESPOSTA (JSON):
{
  "descricao": "Texto explicativo sobre a data...",
  "origem": "Breve histórico de como surgiu (opcional)",
  "curiosidade": "Um fato interessante (opcional)"
}`;

export async function generateEventDescription(
  request: EventDescriptionRequest
): Promise<EventDescriptionResult> {
  const { evento, data, tipo_evento, tags } = request;

  try {
    const prompt = `Explique o significado e a importância da seguinte data comemorativa:

EVENTO: ${evento}
DATA: ${data}
${tipo_evento ? `TIPO: ${tipo_evento}` : ''}
${tags ? `TAGS: ${tags}` : ''}

Forneça uma descrição informativa sobre esta data.`;

    const response = await generateCompletion({
      systemPrompt: SYSTEM_PROMPT,
      prompt,
      temperature: 0.3,
      maxTokens: 500,
    });

    // Tentar parsear JSON
    try {
      const parsed = JSON.parse(response);
      return {
        evento,
        descricao: parsed.descricao || response,
        origem: parsed.origem,
        curiosidade: parsed.curiosidade,
      };
    } catch {
      // Se não for JSON válido, retornar como descrição simples
      return {
        evento,
        descricao: response,
      };
    }
  } catch (error) {
    console.error(`Erro ao gerar descrição para ${evento}:`, error);
    return {
      evento,
      descricao: '',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

export async function generateEventDescriptionsBatch(
  events: EventDescriptionRequest[],
  options?: {
    delayMs?: number;
    onProgress?: (current: number, total: number, evento: string) => void;
  }
): Promise<EventDescriptionResult[]> {
  const results: EventDescriptionResult[] = [];
  const delayMs = options?.delayMs ?? 500; // 500ms entre requests para evitar rate limit

  for (let i = 0; i < events.length; i++) {
    const event = events[i];

    if (options?.onProgress) {
      options.onProgress(i + 1, events.length, event.evento);
    }

    const result = await generateEventDescription(event);
    results.push(result);

    // Delay entre requests
    if (i < events.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

export const CalendarDescriptionService = {
  generateEventDescription,
  generateEventDescriptionsBatch,
};
