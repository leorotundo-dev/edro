/**
 * Jarvis Smart Reply Service.
 * Detects client questions in WhatsApp groups, builds context, generates AI reply.
 */

import { query } from '../db';
import { generateCompletion } from './ai/claudeService';
import { buildIntelligenceContext } from './intelligenceEngine';
import { sendOutboundMessage, isJarvisOnCooldown } from './groupOutboundService';

const QUESTION_PATTERN = /\?$|\bcomo (est|vai|and|fic)|\bqual\b|\bquando\b|\bonde\b|\bstatus\b|\bprazo\b|\bsituação\b|\bnovidade\b|\bprogresso\b|\batualiza\b|\bme (fala|diz|conta)\b/i;
const JARVIS_MENTION = /@jarvis|jarvis/i;
const MIN_LENGTH = 15;
const MAX_REPLY_LENGTH = 1500;

const JARVIS_REPLY_PROMPT = `Você é o Jarvis, assistente virtual da agência de marketing digital Edro Studio.
Um cliente fez uma pergunta no grupo de WhatsApp. Responda de forma:
- Concisa (máx 300 palavras)
- Profissional mas amigável
- Baseada APENAS nos dados fornecidos no contexto
- Se não tiver certeza, diga "vou verificar com a equipe e volto com uma resposta"
- NUNCA invente dados, números ou datas que não estão no contexto
- Responda em português brasileiro
- Formato: texto simples para WhatsApp (use *negrito* e _itálico_ do WhatsApp, sem markdown headers)`;

/**
 * Returns true if the message looks like a question that Jarvis should answer.
 */
export function shouldJarvisReply(content: string): boolean {
  if (!content || content.length < MIN_LENGTH) return false;
  return JARVIS_MENTION.test(content) || QUESTION_PATTERN.test(content);
}

/**
 * Handle a potential Jarvis reply. Called from webhookEvolution after message is saved.
 */
export async function handleJarvisReply(params: {
  tenantId: string;
  clientId: string;
  groupId: string;
  groupJid: string;
  senderName: string;
  content: string;
  waMessageId: string;
}): Promise<void> {
  const { tenantId, clientId, groupId, groupJid, senderName, content, waMessageId } = params;

  // Cooldown check — avoid spamming
  if (await isJarvisOnCooldown(groupId)) return;

  // Build intelligence context for this client
  let contextPrompt = '';
  try {
    const ctx = await buildIntelligenceContext({
      tenant_id: tenantId,
      client_id: clientId,
      query: content,
      maxTokens: 4000,
    });
    // Format context sections into a readable prompt
    const sections: string[] = [];
    if (ctx.client) sections.push(`Cliente: ${ctx.client.name}\nSegmento: ${ctx.client.segment || 'N/A'}`);
    if (ctx.group_intelligence?.recent_insights?.length) {
      sections.push(`Insights recentes:\n${ctx.group_intelligence.recent_insights.slice(0, 5).map((i: any) => `- [${i.type}] ${i.summary}`).join('\n')}`);
    }
    if (ctx.meeting_intelligence?.pending_actions?.length) {
      sections.push(`Ações pendentes de reunião:\n${ctx.meeting_intelligence.pending_actions.slice(0, 5).map((a: any) => `- ${a.title}: ${a.description || ''}`).join('\n')}`);
    }
    // Add briefing status if available
    const { rows: briefings } = await query(
      `SELECT b.title, b.status, b.due_at
       FROM edro_briefings b
       JOIN edro_clients ec ON ec.id = b.client_id
       WHERE ec.client_id = $1 AND ec.tenant_id = $2
         AND b.status NOT IN ('archived', 'cancelled')
       ORDER BY b.created_at DESC LIMIT 5`,
      [clientId, tenantId],
    ).catch(() => ({ rows: [] }));
    if (briefings.length) {
      sections.push(`Briefings ativos:\n${briefings.map((b: any) => `- ${b.title} (${b.status}${b.due_at ? `, entrega: ${new Date(b.due_at).toLocaleDateString('pt-BR')}` : ''})`).join('\n')}`);
    }
    contextPrompt = sections.join('\n\n');
  } catch {
    contextPrompt = '(Contexto indisponível)';
  }

  // Generate AI reply
  const result = await generateCompletion({
    prompt: `Contexto do cliente:\n${contextPrompt}\n\nPergunta de ${senderName}:\n"${content}"`,
    systemPrompt: JARVIS_REPLY_PROMPT,
    temperature: 0.3,
    maxTokens: 1024,
  });

  let replyText = result.text.trim();
  if (replyText.length > MAX_REPLY_LENGTH) {
    replyText = replyText.slice(0, MAX_REPLY_LENGTH - 3) + '...';
  }

  await sendOutboundMessage({
    tenantId,
    groupId,
    groupJid,
    clientId,
    scenario: 'jarvis_reply',
    triggerKey: `jarvis_reply:${waMessageId}`,
    messageText: replyText,
    aiTokensIn: result.usage?.input_tokens ?? 0,
    aiTokensOut: result.usage?.output_tokens ?? 0,
  });
}
