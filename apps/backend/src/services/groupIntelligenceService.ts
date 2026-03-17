/**
 * WhatsApp Group Intelligence Service.
 * Analyzes group messages with Claude to extract actionable insights
 * (feedback, requests, approvals, complaints, preferences, deadlines).
 */

import { query } from '../db';
import { generateWithProvider } from './ai/copyOrchestrator';
import { persistWhatsAppInsightMemory } from './whatsappClientMemoryService';

const SYSTEM_PROMPT = `Você é um analista de comunicação de agência de marketing digital.
Analise as mensagens de WhatsApp abaixo trocadas entre a equipe da agência e o cliente.

Para CADA mensagem que contenha informação relevante, extraia um insight.
Ignore mensagens triviais (saudações, emojis soltos, "ok", "bom dia").

Tipos de insight:
- feedback: opinião sobre trabalho entregue (positivo ou negativo)
- approval: aprovação explícita de copy, arte, campanha
- request: pedido de novo conteúdo, alteração ou tarefa
- preference: preferência de estilo, tom, formato, horário
- deadline: menção a prazo, data limite, urgência temporal
- complaint: reclamação sobre atraso, qualidade, processo
- praise: elogio ao trabalho da agência

Retorne APENAS um JSON array. Se nenhuma mensagem tiver insight relevante, retorne [].
Formato:
[
  {
    "message_index": 0,
    "insight_type": "feedback",
    "summary": "Cliente aprovou o carrossel mas pediu ajuste na cor de fundo",
    "sentiment": "positive",
    "urgency": "normal",
    "confidence": "high",
    "entities": { "topics": ["carrossel", "cor de fundo"], "deliverables": ["ajuste visual"] }
  }
]

Campos:
- message_index: índice da mensagem no array (0-based)
- insight_type: um dos tipos acima
- summary: frase concisa em português descrevendo o insight (escreva como regra permanente se for preference/complaint)
- sentiment: positive | negative | neutral
- urgency: urgent | normal | low
- confidence: grau de certeza da sua interpretação
  - "high": declaração explícita e inequívoca ("precisa ter X", "aprovamos Y", "sempre fazer Z")
  - "medium": bastante claro mas pode ter contexto implícito que você não tem
  - "low": ambíguo, irônico, incompleto, curto demais, ou sem contexto suficiente para ter certeza
- entities: { people?: string[], dates?: string[], topics?: string[], deliverables?: string[] }`;

type MessageRow = {
  id: string;
  wa_message_id: string;
  sender_name: string;
  type: string;
  content: string;
  created_at: string;
};

const CONFIDENCE_SCORE: Record<string, number> = { high: 0.92, medium: 0.72, low: 0.50 };

type InsightResult = {
  message_index: number;
  insight_type: string;
  summary: string;
  sentiment: string;
  urgency: string;
  confidence?: string;
  entities: Record<string, any>;
};

/**
 * Analyze a batch of messages with Claude and return structured insights.
 */
export async function analyzeMessages(
  messages: MessageRow[],
): Promise<InsightResult[]> {
  if (!messages.length) return [];

  const formatted = messages.map((m, i) =>
    `[${i}] ${m.sender_name} (${m.type}): ${(m.content || '').slice(0, 500)}`
  ).join('\n');

  const result = await generateWithProvider('gemini', {
    prompt: `Mensagens do grupo WhatsApp:\n\n${formatted}`,
    systemPrompt: SYSTEM_PROMPT,
    temperature: 0.1,
    maxTokens: 2048,
  });

  const jsonMatch = result.output.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  try {
    const parsed = JSON.parse(jsonMatch[0]) as InsightResult[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Process unanalyzed messages for a specific client.
 * Fetches messages with insight_extracted=false, groups by group_id for context,
 * runs Claude analysis, and persists insights.
 */
export async function extractInsightsFromBatch(
  tenantId: string,
  clientId: string,
  batchSize = 20,
): Promise<number> {
  // Fetch unprocessed messages for this client
  const { rows: messages } = await query<MessageRow & { group_id: string }>(
    `SELECT m.id, m.wa_message_id, m.sender_name, m.type, m.content, m.created_at, m.group_id
     FROM whatsapp_group_messages m
     JOIN whatsapp_groups g ON g.id = m.group_id
     WHERE m.client_id = $1
       AND m.tenant_id = $2
       AND m.insight_extracted = false
       AND m.content IS NOT NULL
       AND m.content != ''
       AND g.notify_jarvis = true
     ORDER BY m.created_at ASC
     LIMIT $3`,
    [clientId, tenantId, batchSize],
  );

  if (!messages.length) return 0;

  // Group messages by group_id to maintain conversational context
  const byGroup = new Map<string, typeof messages>();
  for (const msg of messages) {
    const arr = byGroup.get(msg.group_id) || [];
    arr.push(msg);
    byGroup.set(msg.group_id, arr);
  }

  let totalInsights = 0;

  for (const [, groupMessages] of byGroup) {
    try {
      const insights = await analyzeMessages(groupMessages);

      for (const insight of insights) {
        const msg = groupMessages[insight.message_index];
        if (!msg) continue;

        const confidenceScore = CONFIDENCE_SCORE[insight.confidence ?? 'medium'] ?? 0.72;

        const { rows: insertedInsightRows } = await query<{ id: string; created_at: string }>(
          `INSERT INTO whatsapp_message_insights
             (tenant_id, client_id, message_id, insight_type, summary, sentiment, urgency, entities, confidence, confirmation_status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
           ON CONFLICT DO NOTHING
           RETURNING id, created_at`,
          [
            tenantId,
            clientId,
            msg.id,
            insight.insight_type,
            insight.summary,
            insight.sentiment || 'neutral',
            insight.urgency || 'normal',
            JSON.stringify(insight.entities || {}),
            confidenceScore,
          ],
        );
        const insertedInsight = insertedInsightRows[0];
        if (insertedInsight) {
          await persistWhatsAppInsightMemory({
            tenantId,
            clientId,
            insightId: insertedInsight.id,
            messageId: msg.id,
            messageExternalId: msg.wa_message_id,
            senderName: msg.sender_name,
            messageContent: msg.content,
            insightType: insight.insight_type,
            summary: insight.summary,
            sentiment: insight.sentiment || 'neutral',
            urgency: insight.urgency || 'normal',
            entities: insight.entities || {},
            actioned: false,
            createdAt: insertedInsight.created_at ? new Date(insertedInsight.created_at) : new Date(msg.created_at),
          }).catch((err: any) => {
            console.error(`[groupIntelligence] persistWhatsAppInsightMemory failed: ${err.message}`);
          });
        }
        totalInsights++;
      }

      // Mark all messages in this group batch as extracted
      const ids = groupMessages.map((m) => m.id);
      await query(
        `UPDATE whatsapp_group_messages
         SET insight_extracted = true
         WHERE id = ANY($1::uuid[])`,
        [ids],
      );
    } catch (err: any) {
      console.error(`[groupIntelligence] analyzeMessages failed for group: ${err.message}`);
      // Don't mark as extracted — will retry on next tick
    }
  }

  return totalInsights;
}
