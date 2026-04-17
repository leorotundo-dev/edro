/**
 * Auto-Briefing from Opportunity Worker
 *
 * Roda 1x/dia às 07:00.
 * Para cada oportunidade com confidence >= 75 sem briefing associado:
 *   1. Carrega contexto do cliente (nome, segmento, pilares, keywords)
 *   2. Gera copy via AgentWriter (hook + body + CTA)
 *   3. Roda simulador para prever performance e encontrar variante vencedora
 *   4. Cria edro_briefing com status='draft' e copy pré-preenchida
 *   5. Notifica o account manager: "Proposta pronta — 1 clique para aprovar"
 *
 * O humano acorda com propostas prontas, simuladas e rankeadas.
 */

import { query } from '../db';
import { generateAndSelectBestCopy } from '../services/ai/copyService';
import { buildClientKnowledgeBase } from '../services/clientKnowledgeBaseService';
import { enqueueDemandIntake } from '../services/demandIntakeService';
import { notifyEvent } from '../services/notificationService';

const CONFIDENCE_THRESHOLD = 75;
const MAX_PER_TICK = 5;

let lastRunDate = '';

/** Force a run right now regardless of time-gate (for admin manual triggers). */
export async function triggerAutoBriefingNow(): Promise<void> {
  lastRunDate = '';
  return runAutoBriefingFromOpportunityOnce();
}

// ── AMD mapping from opportunity source/priority ──────────────────────────────

function inferAmd(opportunity: any): string {
  const desc = (opportunity.description ?? '').toLowerCase();
  const action = (opportunity.suggested_action ?? '').toLowerCase();
  const combined = desc + ' ' + action;

  if (combined.includes('proposta') || combined.includes('venda') || combined.includes('contrat')) return 'pedir_proposta';
  if (combined.includes('clique') || combined.includes('site') || combined.includes('link') || combined.includes('acesse')) return 'clicar';
  if (combined.includes('compart') || combined.includes('viral') || combined.includes('espallh')) return 'compartilhar';
  if (combined.includes('resposta') || combined.includes('coment') || combined.includes('conversa')) return 'responder';
  return 'salvar'; // default: AMD mais comum para awareness/educação
}

function inferTriggers(opportunity: any): string[] {
  const combined = [
    opportunity.title ?? '',
    opportunity.description ?? '',
    opportunity.suggested_action ?? '',
  ].join(' ').toLowerCase();

  const triggers: string[] = [];
  if (combined.includes('tendên') || combined.includes('trend') || combined.includes('urgente') || combined.includes('agora')) triggers.push('urgência');
  if (combined.includes('dado') || combined.includes('estudo') || combined.includes('pesquisa') || combined.includes('%')) triggers.push('especificidade');
  if (combined.includes('cliente') || combined.includes('case') || combined.includes('result')) triggers.push('prova_social');
  if (combined.includes('exclusiv') || combined.includes('único') || combined.includes('primeiro')) triggers.push('exclusividade');
  if (combined.includes('por que') || combined.includes('como') || combined.includes('segredo') || combined.includes('descubra')) triggers.push('curiosidade');
  if (combined.includes('expert') || combined.includes('especialist') || combined.includes('referência')) triggers.push('autoridade');

  return triggers.length > 0 ? triggers.slice(0, 3) : ['especificidade', 'autoridade'];
}

// ── Load client context ───────────────────────────────────────────────────────

async function loadClientContext(clientId: string, tenantId: string) {
  const res = await query<any>(
    `SELECT c.id, c.name, c.segment, c.profile,
            array_agg(DISTINCT ck.keyword) FILTER (WHERE ck.keyword IS NOT NULL) as keywords
     FROM clients c
     LEFT JOIN client_keywords ck ON ck.client_id = c.id AND ck.is_active = true
     WHERE c.id = $1 AND c.tenant_id = $2
     GROUP BY c.id, c.name, c.segment, c.profile`,
    [clientId, tenantId],
  );
  return res.rows[0] ?? null;
}

// ── Load account manager for tenant ──────────────────────────────────────────

async function loadAccountManager(tenantId: string) {
  const res = await query<any>(
    `SELECT u.id, u.email, u.name
     FROM users u
     WHERE u.tenant_id = $1 AND u.role IN ('admin', 'account_manager')
     ORDER BY u.created_at ASC
     LIMIT 1`,
    [tenantId],
  );
  return res.rows[0] ?? null;
}

function splitDraftCopy(text: string) {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return { hook_text: '', content_text: '', cta_text: '' };
  }

  if (lines.length === 1) {
    return { hook_text: lines[0], content_text: '', cta_text: '' };
  }

  const hook_text = lines[0];
  const cta_text = lines.length >= 3 ? lines[lines.length - 1] : '';
  const content_text = lines.slice(1, cta_text ? -1 : undefined).join('\n\n');

  return { hook_text, content_text, cta_text };
}

// ── Main ──────────────────────────────────────────────────────────────────────

export async function runAutoBriefingFromOpportunityOnce(): Promise<void> {
  // Self-throttle: 1x/dia às 07:00 BRT (10:00 UTC)
  const now = new Date();
  const dateKey = now.toISOString().slice(0, 10);
  const hour = now.getUTCHours();
  if (hour < 10 || hour > 11) return;
  if (lastRunDate === dateKey) return;

  lastRunDate = dateKey;
  console.log('[autoBriefing] Starting daily run...');

  // Opportunities with confidence >= threshold, sem briefing ainda, nos últimos 3 dias
  const oppsRes = await query<any>(
    `SELECT o.id, o.tenant_id, o.client_id::text as client_id, o.title,
            o.description, o.suggested_action, o.source, o.priority,
            o.confidence, o.payload
     FROM ai_opportunities o
     WHERE o.status = 'new'
       AND o.confidence >= $1
       AND o.created_at >= NOW() - INTERVAL '3 days'
       AND NOT EXISTS (
         SELECT 1 FROM edro_briefings b
         WHERE b.source_opportunity_id = o.id
       )
     ORDER BY o.confidence DESC, o.created_at DESC
     LIMIT $2`,
    [CONFIDENCE_THRESHOLD, MAX_PER_TICK],
  );

  if (!oppsRes.rows.length) {
    console.log('[autoBriefing] No eligible opportunities today.');
    return;
  }

  let created = 0;

  for (const opp of oppsRes.rows) {
    try {
      const client = await loadClientContext(opp.client_id, opp.tenant_id);
      if (!client) continue;

      const amd = inferAmd(opp);
      const triggers = inferTriggers(opp);
      const opportunityPrompt = [
        `Crie a melhor copy possível para aproveitar esta oportunidade detectada automaticamente.`,
        `Título da oportunidade: ${opp.title}`,
        `Descrição: ${opp.description ?? 'não informada'}`,
        `Ação sugerida: ${opp.suggested_action ?? 'não informada'}`,
        `Cliente: ${client.name}`,
        `Segmento: ${client.segment ?? 'não informado'}`,
        client.keywords?.length ? `Palavras-chave do cliente: ${client.keywords.slice(0, 12).join(', ')}` : '',
      ].filter(Boolean).join('\n');
      const canonicalKnowledge = await buildClientKnowledgeBase({
        tenantId: opp.tenant_id,
        clientId: opp.client_id,
        question: [opp.title, opp.description, opp.suggested_action].filter(Boolean).join(' '),
        daysBack: 60,
        limitDocuments: 4,
        intent: 'copy',
        platform: 'instagram',
        objective: typeof opp.suggested_action === 'string' ? opp.suggested_action : null,
      }).catch(() => null);
      const smartResult = await generateAndSelectBestCopy({
        prompt: opportunityPrompt,
        tenantId: opp.tenant_id,
        clientId: opp.client_id,
        platform: 'instagram',
        amd,
        triggers,
        knowledgeBlock: [canonicalKnowledge?.knowledge_base_block || '', opp.description ?? ''].filter(Boolean).join('\n\n') || undefined,
      });

      const copyText = smartResult.output;
      const draft = splitDraftCopy(copyText);
      const simulationId = smartResult.simulation_id;

      // 3. Create briefing
      const briefingTitle = `[Auto] ${opp.title}`;
      const briefingPayload = {
        auto_generated: true,
        opportunity_id: opp.id,
        opportunity_source: opp.source,
        opportunity_confidence: opp.confidence,
        draft_copy: {
          hook_text: draft.hook_text,
          content_text: draft.content_text,
          cta_text: draft.cta_text,
          amd,
          triggers,
        },
        simulation_result_id: simulationId,
        smart_copy_meta: smartResult.payload ?? null,
        platform: 'instagram',
      };

      const briefingRes = await query<{ id: string }>(
        `INSERT INTO edro_briefings
           (client_id, main_client_id, title, status, source, source_opportunity_id, payload, created_by)
         VALUES (
           (SELECT id FROM edro_clients WHERE name ILIKE $1 LIMIT 1),
           $2,
           $3, 'draft', 'auto_opportunity', $4, $5, 'system'
         )
         RETURNING id`,
        [
          client.name,
          opp.client_id,
          briefingTitle,
          opp.id,
          JSON.stringify(briefingPayload),
        ],
      );

      const briefingId = briefingRes.rows[0]?.id;

      await enqueueDemandIntake({
        tenantId: opp.tenant_id,
        clientId: opp.client_id,
        source: {
          type: 'ai_opportunity',
          id: opp.id,
          occurredAt: new Date().toISOString(),
          refs: {
            briefing_id: briefingId ?? null,
            source: opp.source ?? null,
            confidence: opp.confidence ?? null,
          },
        },
        summary: {
          title: opp.title ?? '[Auto] oportunidade sem título',
          description: opp.description ?? null,
          objective: opp.suggested_action ?? null,
          platform: 'instagram',
          priorityHint: opp.priority ?? null,
        },
        payload: {
          suggested_action: opp.suggested_action ?? null,
          confidence: opp.confidence ?? null,
          briefing_id: briefingId ?? null,
        },
      }).catch(() => {});

      // 4. Create copy version
      if (briefingId) {
        await query(
          `INSERT INTO edro_copy_versions (briefing_id, language, model, output, created_by)
           VALUES ($1, 'pt', $2, $3, 'system')`,
          [briefingId, smartResult.model || 'smart_copy_pipeline', copyText],
        );
      }

      // 5. Mark opportunity as actioned
      await query(
        `UPDATE ai_opportunities SET status = 'actioned', actioned_at = NOW(), actioned_by = 'system' WHERE id = $1`,
        [opp.id],
      );

      // 6. Notify account manager
      const accountManager = await loadAccountManager(opp.tenant_id);
      if (accountManager && briefingId) {
        await notifyEvent({
          event: 'auto_briefing_created',
          tenantId: opp.tenant_id,
          userId: accountManager.id,
          title: `Proposta pronta: ${opp.title}`,
          body: `Confiança ${opp.confidence}% — copy gerada e simulada. 1 clique para aprovar.`,
          link: `/studio/brief?id=${briefingId}`,
          recipientEmail: accountManager.email,
          payload: { briefing_id: briefingId, opportunity_id: opp.id, simulation_id: simulationId },
        });
      }

      created++;
      console.log(`[autoBriefing] Created briefing ${briefingId} for opportunity "${opp.title}" (client=${opp.client_id}, confidence=${opp.confidence})`);
    } catch (err: any) {
      console.error(`[autoBriefing] Error processing opportunity ${opp.id}:`, err?.message);
    }
  }

  console.log(`[autoBriefing] Done: ${created} briefings created.`);
}
