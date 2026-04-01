/**
 * Briefing Auto-Pipeline — Jarvis em Ação
 *
 * Disparado automaticamente quando um cliente submete um briefing pelo portal.
 * Roda em background (fire-and-forget) e faz:
 *
 *  1. Carrega perfil do cliente + learning rules + histórico de jobs
 *  2. Gera conceito criativo + draft de copy via Claude
 *  3. Cria card no Trello (se integração configurada)
 *  4. Envia alerta WhatsApp via Twilio
 *  5. Persiste tudo em portal_briefing_requests.auto_pipeline_output
 */

import { pool } from '../db';
import { generateCompletion } from './ai/claudeService';
import { loadLearningRules } from './learningEngine';
import { getTrelloCredentials } from './trelloSyncService';
import { sendWhatsAppText, isWhatsAppConfigured } from './whatsappService';
import { sendDirectMessage as evolutionSendDirect } from './integrations/evolutionApiService';
import { sendEmail, isEmailConfigured } from './emailService';

// ── Types ──────────────────────────────────────────────────────────────────────

interface PipelineInput {
  briefingId: string;
  clientId: string;
  tenantId: string;
  formData: {
    objective?: string;
    type?: string;
    platform?: string;
    deadline?: string;
    budget_range?: string;
    notes?: string;
  };
  aiEnriched?: {
    suggested_title?: string;
    urgency?: string;
    estimated_complexity?: string;
    key_deliverables?: string[];
    internal_notes?: string;
  } | null;
}

interface PipelineOutput {
  concept: { angles: string[]; strategy: string };
  draft_copy: { hook: string; body: string; cta: string };
  pre_call_brief: string;
  learning_highlights: string[];
  risk_flags: string[];
  trello_card_id?: string;
  trello_card_url?: string;
  whatsapp_sent: boolean;
  pipeline_ran_at: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

async function loadClientProfile(clientId: string, tenantId: string) {
  const res = await pool.query(
    `SELECT c.name, c.segment,
            c.profile->>'tone_of_voice' AS tone,
            c.profile->>'main_product'  AS main_product,
            c.profile->>'target_audience' AS target_audience
     FROM clients c
     WHERE c.id = $1 AND c.tenant_id = $2`,
    [clientId, tenantId],
  ).catch(() => ({ rows: [] as any[] }));
  return res.rows[0] ?? { name: 'Cliente', segment: null, tone: null, main_product: null, target_audience: null };
}

async function loadRecentJobs(clientId: string, tenantId: string, limit = 3) {
  const res = await pool.query(
    `SELECT title, status, platform,
            copy_approved_at IS NOT NULL AS had_approved_copy,
            created_at
     FROM edro_briefings
     WHERE main_client_id = $1 AND tenant_id = $2
       AND status NOT IN ('cancelled', 'draft')
     ORDER BY created_at DESC
     LIMIT $3`,
    [clientId, tenantId, limit],
  ).catch(() => ({ rows: [] as any[] }));
  return res.rows;
}

async function findTrelloInboxList(tenantId: string): Promise<string | null> {
  // Priority 1: tenant_settings key 'trello_jobs_list_id'
  const settingRes = await pool.query(
    `SELECT value FROM tenant_settings WHERE tenant_id = $1 AND key = 'trello_jobs_list_id' LIMIT 1`,
    [tenantId],
  ).catch(() => ({ rows: [] as any[] }));
  if (settingRes.rows[0]?.value) return settingRes.rows[0].value as string;

  // Priority 2: first list (position 0) of first active board
  const listRes = await pool.query(
    `SELECT pl.trello_list_id
     FROM project_lists pl
     JOIN project_boards pb ON pb.id = pl.board_id
     WHERE pb.tenant_id = $1 AND pl.trello_list_id IS NOT NULL
       AND pl.is_archived = false
     ORDER BY pb.created_at ASC, pl.position ASC
     LIMIT 1`,
    [tenantId],
  ).catch(() => ({ rows: [] as any[] }));
  return listRes.rows[0]?.trello_list_id ?? null;
}

function urgencyLabel(u?: string) {
  const map: Record<string, string> = { low: 'Baixa', medium: 'Média', high: 'Alta', urgent: 'URGENTE 🔴' };
  return u ? (map[u] ?? u) : 'Não definida';
}

function complexityLabel(c?: string) {
  const map: Record<string, string> = { small: 'Pequeno', medium: 'Médio', large: 'Grande' };
  return c ? (map[c] ?? c) : 'Não definida';
}

// ── Main pipeline ──────────────────────────────────────────────────────────────

export async function runBriefingAutoPipeline(input: PipelineInput): Promise<void> {
  const { briefingId, clientId, tenantId, formData, aiEnriched } = input;

  try {
    // ── 1. Load context ────────────────────────────────────────────────────────
    const [client, rules, recentJobs] = await Promise.all([
      loadClientProfile(clientId, tenantId),
      loadLearningRules(tenantId, clientId).catch(() => [] as any[]),
      loadRecentJobs(clientId, tenantId),
    ]);

    const rulesBlock = rules.length
      ? rules.slice(0, 8).map(r => `• ${r.rule_name}: ${r.effective_pattern} (confiança ${Math.round((r.confidence_score ?? 0) * 100)}%)`).join('\n')
      : 'Nenhuma regra aprendida ainda.';

    const historyBlock = recentJobs.length
      ? recentJobs.map(j => `• ${j.title ?? 'Job'} | ${j.platform ?? '?'} | Status: ${j.status}${j.had_approved_copy ? ' ✓ copy aprovada' : ''}`).join('\n')
      : 'Nenhum job anterior.';

    const clientBlock = [
      client.name && `Cliente: ${client.name}`,
      client.segment && `Segmento: ${client.segment}`,
      client.tone && `Tom de voz: ${client.tone}`,
      client.target_audience && `Público-alvo: ${client.target_audience}`,
      client.main_product && `Produto principal: ${client.main_product}`,
    ].filter(Boolean).join('\n');

    // ── 2. Generate concept + copy + pre-call brief via Claude (best-effort) ────
    const output: PipelineOutput = {
      concept:             { angles: [], strategy: '' },
      draft_copy:          { hook: '', body: '', cta: '' },
      pre_call_brief:      '',
      learning_highlights: [],
      risk_flags:          [],
      whatsapp_sent:       false,
      pipeline_ran_at:     new Date().toISOString(),
    };

    try {
      const prompt = `Você é o Jarvis, agente de inteligência criativa da Edro Studio.

Um cliente acabou de submeter um briefing de job. Sua função é:
1. Gerar 3 ângulos criativos para este job
2. Criar um rascunho de copy (hook + corpo + CTA)
3. Redigir um "Pre-Call Brief" para a equipe — contexto completo para a reunião de alinhamento

---

## Dados do Briefing
Tipo: ${formData.type ?? '—'}
Plataforma: ${formData.platform ?? '—'}
Objetivo: ${formData.objective}
Prazo: ${formData.deadline ?? '—'}
Orçamento: ${formData.budget_range ?? '—'}
Observações: ${formData.notes ?? '—'}

## Análise de IA (enriquecimento)
Título sugerido: ${aiEnriched?.suggested_title ?? '—'}
Urgência: ${urgencyLabel(aiEnriched?.urgency)}
Complexidade: ${complexityLabel(aiEnriched?.estimated_complexity)}
Entregas: ${aiEnriched?.key_deliverables?.join(', ') ?? '—'}

## Perfil do Cliente
${clientBlock || 'Sem perfil detalhado ainda.'}

## Regras de Aprendizado (Do's & Don'ts)
${rulesBlock}

## Histórico de Jobs Recentes
${historyBlock}

---

Responda em JSON com esta estrutura exata:
{
  "concept": {
    "angles": ["ângulo 1", "ângulo 2", "ângulo 3"],
    "strategy": "estratégia geral em 1-2 frases"
  },
  "draft_copy": {
    "hook": "primeira linha que prende atenção",
    "body": "desenvolvimento do copy (2-4 frases)",
    "cta": "chamada para ação"
  },
  "pre_call_brief": "documento de pauta para o call de alinhamento (máx 400 palavras): contexto do cliente, o que Jarvis entendeu, perguntas-chave a fazer, riscos detectados, sugestão de abordagem criativa, do's e don'ts baseados no histórico",
  "learning_highlights": ["insight 1 do histórico", "insight 2"],
  "risk_flags": ["risco 1 se houver", "risco 2 se houver"]
}`;

      const aiResult = await generateCompletion({ prompt, temperature: 0.7, maxTokens: 1500 });
      const jsonMatch = aiResult.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as Partial<PipelineOutput>;
        output.concept             = parsed.concept             ?? output.concept;
        output.draft_copy          = parsed.draft_copy          ?? output.draft_copy;
        output.pre_call_brief      = parsed.pre_call_brief      ?? '';
        output.learning_highlights = parsed.learning_highlights ?? [];
        output.risk_flags          = parsed.risk_flags          ?? [];
      }
    } catch (aiErr) {
      console.warn('[briefingPipeline] AI step skipped (will continue with Trello+WA):', (aiErr as any)?.message?.slice(0, 120));
    }

    // ── 3. Create Trello card ──────────────────────────────────────────────────
    const trelloCreds = await getTrelloCredentials(tenantId).catch(() => null);
    if (trelloCreds) {
      const listId = await findTrelloInboxList(tenantId);
      if (listId) {
        const cardName = `${aiEnriched?.suggested_title ?? formData.type ?? 'Novo Job'} — ${client.name}`;
        const urgencyEmoji = { urgent: '🔴', high: '🟠', medium: '🟡', low: '🟢' }[aiEnriched?.urgency ?? ''] ?? '⚪';
        const cardDesc = [
          `${urgencyEmoji} **Urgência:** ${urgencyLabel(aiEnriched?.urgency)} | **Porte:** ${complexityLabel(aiEnriched?.estimated_complexity)}`,
          '',
          `**Objetivo do cliente:**\n${formData.objective}`,
          '',
          aiEnriched?.key_deliverables?.length
            ? `**Entregas esperadas:**\n${aiEnriched.key_deliverables.map(d => `• ${d}`).join('\n')}`
            : '',
          '',
          `**Plataforma:** ${formData.platform ?? '—'} | **Prazo:** ${formData.deadline ?? '—'}`,
          '',
          `---`,
          `**🤖 Jarvis — Conceito Criativo**`,
          output.concept.angles.map((a, i) => `${i + 1}. ${a}`).join('\n'),
          '',
          `**Estratégia:** ${output.concept.strategy}`,
          '',
          `**Draft de Copy:**`,
          `Hook: ${output.draft_copy.hook}`,
          `Body: ${output.draft_copy.body}`,
          `CTA: ${output.draft_copy.cta}`,
          '',
          output.risk_flags.length ? `**⚠️ Riscos:** ${output.risk_flags.join(' | ')}` : '',
          '',
          `**ID:** ${briefingId}`,
        ].filter(Boolean).join('\n');

        const dueDate = formData.deadline ? new Date(formData.deadline).toISOString() : undefined;
        const params = new URLSearchParams({
          key:     trelloCreds.apiKey,
          token:   trelloCreds.apiToken,
          idList:  listId,
          name:    cardName,
          desc:    cardDesc,
          ...(dueDate ? { due: dueDate } : {}),
        });

        const trelloRes = await fetch(`https://api.trello.com/1/cards?${params}`, {
          method: 'POST',
          signal: AbortSignal.timeout(10_000),
        }).catch(() => null);

        if (trelloRes?.ok) {
          const card = await trelloRes.json() as { id: string; shortUrl: string };
          output.trello_card_id  = card.id;
          output.trello_card_url = card.shortUrl;
        } else {
          console.warn(`[briefingPipeline] Trello card creation failed: ${trelloRes?.status}`);
        }
      }
    }

    // ── 4. WhatsApp alert (Meta Cloud API → fallback Evolution API) ──────────
    const agencyPhones = (process.env.WHATSAPP_AGENCY_PHONES ?? '').split(',').map(s => s.trim()).filter(Boolean);
    if (agencyPhones.length) {
      const deadline = formData.deadline
        ? new Date(formData.deadline + 'T00:00').toLocaleDateString('pt-BR')
        : '—';
      const deliverables = aiEnriched?.key_deliverables?.slice(0, 3).join(', ') ?? '—';
      const risksLine = output.risk_flags.length ? `\n⚠️ Riscos: ${output.risk_flags.join(', ')}` : '';
      const trelloLine = output.trello_card_url ? `\n🗂 Trello: ${output.trello_card_url}` : '';
      const copyPreview = output.draft_copy.hook
        ? `\n\n✍️ Draft Jarvis:\n"${output.draft_copy.hook}"`
        : '';
      const adminUrl = process.env.PORTAL_BASE_URL
        ? `${process.env.PORTAL_BASE_URL.replace('cliente.', '').replace('/portal', '')}/admin/solicitacoes`
        : '';

      const wamsg = [
        `🚨 *NOVO JOB — ${client.name}*`,
        '',
        `📌 *${aiEnriched?.suggested_title ?? formData.type ?? 'Job'}*`,
        `📱 Plataforma: ${formData.platform ?? '—'}`,
        `⏰ Prazo: ${deadline}`,
        `📊 Urgência: ${urgencyLabel(aiEnriched?.urgency)} | Porte: ${complexityLabel(aiEnriched?.estimated_complexity)}`,
        '',
        `📝 Objetivo:\n${formData.objective?.slice(0, 200)}${formData.objective?.length > 200 ? '…' : ''}`,
        deliverables !== '—' ? `\n📦 Entregas: ${deliverables}` : '',
        risksLine,
        copyPreview,
        trelloLine,
        adminUrl ? `\n👉 Revisar: ${adminUrl}` : '',
      ].filter(s => s !== '').join('\n');

      let allSent = true;
      for (const phone of agencyPhones) {
        let sent = false;
        // Try Meta Cloud API first
        if (isWhatsAppConfigured()) {
          const result = await sendWhatsAppText(phone, wamsg, { tenantId, event: 'briefing_alert' }).catch(() => ({ ok: false as const }));
          sent = result.ok;
        }
        // Fallback: Evolution API (real WhatsApp session connected via QR)
        if (!sent && process.env.EVOLUTION_API_KEY) {
          await evolutionSendDirect(tenantId, phone, wamsg).catch(() => {});
          sent = true; // best-effort
        }
        if (!sent) allSent = false;
      }
      output.whatsapp_sent = allSent;
    }

    // ── 5. Persist output ──────────────────────────────────────────────────────
    await pool.query(
      `UPDATE portal_briefing_requests
          SET auto_pipeline_output = $1,
              trello_card_id       = $2,
              pipeline_ran_at      = now()
        WHERE id = $3`,
      [output, output.trello_card_id ?? null, briefingId],
    ).catch(err => console.warn('[briefingPipeline] Failed to persist output:', err));

  } catch (err) {
    console.error('[briefingAutoPipeline] Pipeline error for briefing', briefingId, err);
  }
}

// ── Exported helpers (reused when admin accepts a briefing) ──────────────────

export interface BriefingCardParams {
  briefingId: string;
  tenantId: string;
  clientName: string;
  formData: PipelineInput['formData'];
  aiEnriched?: PipelineInput['aiEnriched'];
  label?: string; // e.g. "✅ ACEITO" prefix for accepted cards
}

export async function createBriefingTrelloCard(p: BriefingCardParams): Promise<{ cardId: string; cardUrl: string } | null> {
  const trelloCreds = await getTrelloCredentials(p.tenantId).catch(() => null);
  if (!trelloCreds) return null;
  const listId = await findTrelloInboxList(p.tenantId);
  if (!listId) return null;

  const prefix = p.label ? `${p.label} ` : '';
  const cardName = `${prefix}${p.aiEnriched?.suggested_title ?? p.formData.type ?? 'Novo Job'} — ${p.clientName}`;
  const urgencyEmoji = ({ urgent: '🔴', high: '🟠', medium: '🟡', low: '🟢' } as Record<string, string>)[p.aiEnriched?.urgency ?? ''] ?? '⚪';
  const cardDesc = [
    `${urgencyEmoji} Urgência: ${urgencyLabel(p.aiEnriched?.urgency)} | Porte: ${complexityLabel(p.aiEnriched?.estimated_complexity)}`,
    '',
    `**Objetivo do cliente:**\n${p.formData.objective}`,
    '',
    p.aiEnriched?.key_deliverables?.length
      ? `**Entregas esperadas:**\n${p.aiEnriched.key_deliverables.map((d: string) => `• ${d}`).join('\n')}`
      : '',
    '',
    `**Plataforma:** ${p.formData.platform ?? '—'} | **Prazo:** ${p.formData.deadline ?? '—'}`,
    '',
    p.formData.notes ? `**Observações:** ${p.formData.notes}` : '',
    '',
    `**ID:** ${p.briefingId}`,
  ].filter(Boolean).join('\n');

  const dueDate = p.formData.deadline ? new Date(p.formData.deadline).toISOString() : undefined;
  const qs = new URLSearchParams({
    key: trelloCreds.apiKey, token: trelloCreds.apiToken,
    idList: listId, name: cardName, desc: cardDesc,
    ...(dueDate ? { due: dueDate } : {}),
  });
  const res = await fetch(`https://api.trello.com/1/cards?${qs}`, {
    method: 'POST', signal: AbortSignal.timeout(10_000),
  }).catch(() => null);
  if (!res?.ok) {
    console.warn(`[briefingTrello] Card creation failed: ${res?.status}`);
    return null;
  }
  const card = await res.json() as { id: string; shortUrl: string };
  return { cardId: card.id, cardUrl: card.shortUrl };
}

export async function sendBriefingAcceptedWhatsApp(p: {
  tenantId: string;
  clientName: string;
  formData: PipelineInput['formData'];
  aiEnriched?: PipelineInput['aiEnriched'];
  trelloUrl?: string;
}): Promise<void> {
  const agencyPhones = (process.env.WHATSAPP_AGENCY_PHONES ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!agencyPhones.length) return;
  const hasMetaApi = isWhatsAppConfigured();
  const hasEvolution = Boolean(process.env.EVOLUTION_API_KEY);
  if (!hasMetaApi && !hasEvolution) return;

  const deadline = p.formData.deadline
    ? new Date(p.formData.deadline + 'T00:00').toLocaleDateString('pt-BR')
    : '—';
  const trelloLine = p.trelloUrl ? `\n🗂 Trello: ${p.trelloUrl}` : '';
  const adminUrl = process.env.PORTAL_BASE_URL
    ? `${process.env.PORTAL_BASE_URL.replace('cliente.', '').replace('/portal', '')}/admin/solicitacoes`
    : '';

  const msg = [
    `✅ *JOB ACEITO — ${p.clientName}*`,
    '',
    `📌 *${p.aiEnriched?.suggested_title ?? p.formData.type ?? 'Job'}*`,
    `📱 Plataforma: ${p.formData.platform ?? '—'}`,
    `⏰ Prazo: ${deadline}`,
    `📊 Urgência: ${urgencyLabel(p.aiEnriched?.urgency)} | Porte: ${complexityLabel(p.aiEnriched?.estimated_complexity)}`,
    '',
    `📝 Objetivo:\n${(p.formData.objective ?? '').slice(0, 200)}`,
    trelloLine,
    adminUrl ? `\n👉 Ver fila: ${adminUrl}` : '',
  ].filter((s) => s !== '').join('\n');

  for (const phone of agencyPhones) {
    let sent = false;
    if (hasMetaApi) {
      const result = await sendWhatsAppText(phone, msg, { tenantId: p.tenantId, event: 'briefing_accepted' }).catch(() => ({ ok: false as const }));
      sent = result.ok;
    }
    if (!sent && hasEvolution) {
      await evolutionSendDirect(p.tenantId, phone, msg).catch(() => {});
    }
  }
}
