import { query } from '../db';
import { generateCompletion } from './ai/claudeService';

export async function syncRejectionPatternsToProfile(clientId: string, tenantId: string): Promise<void> {
  const { rows } = await query<{ reason: string }>(
    `SELECT rejection_reason as reason
     FROM preference_feedback
     WHERE tenant_id=$1 AND client_id=$2
       AND feedback_type='copy' AND action='rejected'
       AND rejection_reason IS NOT NULL AND LENGTH(rejection_reason) > 10
     ORDER BY created_at DESC LIMIT 30`,
    [tenantId, clientId]
  );

  if (rows.length < 3) return;

  const reasonsText = rows.map((r, i) => `${i + 1}. ${r.reason}`).join('\n');

  const result = await generateCompletion({
    prompt: `Analise estes ${rows.length} motivos de rejeicao de copy e extraia padroes recorrentes:\n\n${reasonsText}\n\nRetorne JSON: {"patterns": ["padrao1", "padrao2", "padrao3"]} — maximo 5, em portugues, cada padrao em 1 frase curta e objetiva.`,
    systemPrompt: 'Voce analisa feedbacks de copy. Retorne apenas JSON valido.',
    temperature: 0.2,
    maxTokens: 300,
  });

  let patterns: string[] = [];
  try {
    const match = result.text.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      patterns = Array.isArray(parsed.patterns) ? parsed.patterns.slice(0, 5) : [];
    }
  } catch {
    return;
  }

  if (!patterns.length) return;

  const { rows: clientRows } = await query<{ profile: Record<string, any> | null }>(
    `SELECT profile FROM clients WHERE tenant_id=$1 AND id=$2 LIMIT 1`,
    [tenantId, clientId]
  );
  if (!clientRows.length) return;

  const nextProfile = {
    ...(clientRows[0]?.profile || {}),
    rejection_patterns: patterns,
    rejection_patterns_updated_at: new Date().toISOString(),
  };

  await query(
    `UPDATE clients SET profile=$1::jsonb, updated_at=NOW() WHERE tenant_id=$2 AND id=$3`,
    [JSON.stringify(nextProfile), tenantId, clientId]
  );
}
