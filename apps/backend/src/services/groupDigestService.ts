/**
 * WhatsApp Group Digest Service.
 * Generates daily/weekly AI summaries from group messages and insights.
 */

import { query } from '../db';
import { generateCompletion } from './ai/claudeService';

const DIGEST_SYSTEM_PROMPT = `Você é o assistente de inteligência de uma agência de marketing digital.
Gere um RESUMO EXECUTIVO das conversas de WhatsApp com o cliente no período indicado.

O resumo deve conter:
1. Visão geral: o que aconteceu no período (2-3 frases)
2. Decisões tomadas: lista de decisões confirmadas pelo cliente
3. Pendências: ações que ficaram em aberto e precisam de follow-up
4. Sentimento geral: como está a satisfação do cliente

Retorne JSON:
{
  "summary": "texto do resumo executivo",
  "key_decisions": [{"decision": "...", "context": "...", "date": "..."}],
  "pending_actions": [{"action": "...", "owner": "cliente|agência", "deadline": "..."}]
}`;

export async function generateDigest(
  tenantId: string,
  clientId: string,
  period: 'daily' | 'weekly',
): Promise<{ id: string } | null> {
  const intervalSql = period === 'daily' ? '1 day' : '7 days';
  const now = new Date();
  const periodEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // start of today
  const periodStart = new Date(periodEnd.getTime() - (period === 'daily' ? 86400000 : 604800000));

  // Check if digest already exists for this period
  const { rows: existing } = await query(
    `SELECT id FROM whatsapp_group_digests
     WHERE client_id = $1 AND period = $2 AND period_start = $3`,
    [clientId, period, periodStart.toISOString()],
  );
  if (existing.length) return null; // already generated

  // Fetch messages for the period
  const { rows: messages } = await query(
    `SELECT m.sender_name, m.type, m.content, m.created_at
     FROM whatsapp_group_messages m
     JOIN whatsapp_groups g ON g.id = m.group_id
     WHERE m.client_id = $1
       AND m.tenant_id = $2
       AND m.created_at >= $3
       AND m.created_at < $4
       AND m.content IS NOT NULL
       AND g.notify_jarvis = true
     ORDER BY m.created_at ASC`,
    [clientId, tenantId, periodStart.toISOString(), periodEnd.toISOString()],
  );

  if (messages.length < 3) return null; // not enough to digest

  // Fetch insights for the period
  const { rows: insights } = await query(
    `SELECT insight_type, summary, sentiment, urgency
     FROM whatsapp_message_insights
     WHERE client_id = $1
       AND tenant_id = $2
       AND created_at >= $3
       AND created_at < $4
     ORDER BY created_at ASC`,
    [clientId, tenantId, periodStart.toISOString(), periodEnd.toISOString()],
  );

  // Get client name for context
  const { rows: clientRows } = await query(
    `SELECT name FROM clients WHERE id = $1 AND tenant_id = $2`,
    [clientId, tenantId],
  );
  const clientName = clientRows[0]?.name || 'Cliente';

  // Build prompt
  const msgText = messages
    .map((m: any) => `${m.sender_name}: ${(m.content || '').slice(0, 300)}`)
    .join('\n');

  const insightText = insights.length
    ? `\n\nInsights extraídos:\n${insights.map((i: any) => `- [${i.insight_type}] ${i.summary} (${i.sentiment})`).join('\n')}`
    : '';

  const periodLabel = period === 'daily' ? 'último dia' : 'última semana';

  const result = await generateCompletion({
    prompt: `Cliente: ${clientName}\nPeríodo: ${periodLabel} (${periodStart.toLocaleDateString('pt-BR')} a ${periodEnd.toLocaleDateString('pt-BR')})\n\nMensagens (${messages.length} total):\n${msgText}${insightText}`,
    systemPrompt: DIGEST_SYSTEM_PROMPT,
    temperature: 0.2,
    maxTokens: 2048,
  });

  const jsonMatch = result.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  let parsed: any;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }

  const { rows: inserted } = await query(
    `INSERT INTO whatsapp_group_digests
       (tenant_id, client_id, period, period_start, period_end, summary, key_decisions, pending_actions, message_count, insight_count)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (client_id, period, period_start) DO NOTHING
     RETURNING id`,
    [
      tenantId,
      clientId,
      period,
      periodStart.toISOString(),
      periodEnd.toISOString(),
      parsed.summary || '',
      JSON.stringify(parsed.key_decisions || []),
      JSON.stringify(parsed.pending_actions || []),
      messages.length,
      insights.length,
    ],
  );

  return inserted[0] || null;
}
