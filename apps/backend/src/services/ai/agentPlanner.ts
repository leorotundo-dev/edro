import * as ClaudeService from './claudeService';

export interface GeneratedCampaignStrategy {
  phases: Array<{ id: string; name: string; order: number; objective: string }>;
  audiences: Array<{
    id: string;
    persona_id?: string;
    persona_name: string;
    momento_consciencia: string;
  }>;
  behavior_intents: Array<{
    id: string;
    phase_id: string;
    audience_id: string;
    amd: string;
    momento: string;
    triggers: string[];
    target_behavior: string;
  }>;
  concepts: Array<{
    name: string;
    insight: string;
    triggers: string[];
    example_copy: string;
    hero_piece: string;
  }>;
}

interface BehaviorClusterSummary {
  cluster_type: string;
  cluster_label: string;
  preferred_format: string | null;
  preferred_amd: string | null;
  preferred_triggers: string[];
  avg_save_rate: number;
  avg_click_rate: number;
  confidence_score: number;
}

interface LearningRuleSummary {
  rule_name: string;
  effective_pattern: string;
  uplift_metric: string;
  uplift_value: number;
  confidence_score: number;
  segment_definition: Record<string, any>;
}

interface PlannerInput {
  campaignName: string;
  campaignObjective: string;
  clientSegment: string;
  personas: Array<{
    id?: string;
    name?: string;
    momento?: string;
    momento_consciencia?: string;
    [key: string]: unknown;
  }>;
  behaviorClusters?: BehaviorClusterSummary[];
  learningRules?: LearningRuleSummary[];
  clientIntelBlock?: string; // meeting + WhatsApp intelligence summary
}

function parseJsonFromText(text: string): GeneratedCampaignStrategy {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as GeneratedCampaignStrategy;
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1)) as GeneratedCampaignStrategy;
    }
    throw new Error('AgentPlanner: resposta JSON inválida');
  }
}

export async function generateCampaignStrategy(
  input: PlannerInput
): Promise<GeneratedCampaignStrategy> {
  const { campaignName, campaignObjective, clientSegment, personas, behaviorClusters, learningRules, clientIntelBlock } = input;

  const clustersBlock = behaviorClusters?.length
    ? `\nPERFIS COMPORTAMENTAIS REAIS DA AUDIÊNCIA (dados históricos de performance):\n${
        behaviorClusters
          .map((c) =>
            `  - ${c.cluster_label} (${c.cluster_type}): formato preferido "${c.preferred_format ?? 'variado'}", AMD mais eficaz "${c.preferred_amd ?? '—'}", gatilhos "${c.preferred_triggers.join(', ')}", save_rate ${(c.avg_save_rate * 100).toFixed(2)}%, click_rate ${(c.avg_click_rate * 100).toFixed(2)}% [confiança ${Math.round(c.confidence_score * 100)}%]`
          )
          .join('\n')
      }\nINSTRUCAO: Use esses perfis reais para informar os AMDs e gatilhos dos behavior_intents. Priorize formatos e gatilhos que já provaram funcionar para esta audiência.`
    : '';

  const rulesBlock = learningRules?.length
    ? `\nREGRAS DE APRENDIZADO (padrões validados por dados históricos desta audiência):\n${
        learningRules
          .slice(0, 8)
          .map((r) =>
            `  - ${r.effective_pattern} [uplift +${r.uplift_value.toFixed(1)}% em ${r.uplift_metric}, confiança ${Math.round(r.confidence_score * 100)}%]`
          )
          .join('\n')
      }\nINSTRUCAO: Priorize os AMDs e gatilhos com uplift comprovado ao definir behavior_intents. Não ignore estas evidências.`
    : '';

  const personasSummary = personas.length
    ? personas
        .map((p, i) => {
          const nome = p.name || `Persona ${i + 1}`;
          const momento = p.momento_consciencia || p.momento || 'problema';
          const id = p.id || `p${i + 1}`;
          return `  - id: "${id}", nome: "${nome}", momento_consciencia: "${momento}"`;
        })
        .join('\n')
    : '  - id: "p1", nome: "Público principal", momento_consciencia: "problema"';

  const intelBlock = clientIntelBlock
    ? `\n\nINTELIGÊNCIA ATUAL DO CLIENTE (reuniões + WhatsApp):\n${clientIntelBlock}\nINSTRUCAO: Use esta inteligência para calibrar os objetivos de cada fase, os gatilhos dos behavior_intents e os territórios criativos. Este é o estado real da conta hoje — ações pendentes e sinais do cliente devem informar as prioridades estratégicas.`
    : '';

  const prompt = `Você é o Planejador Estratégico Comportamental da Edro Digital.
Seu papel é gerar planos de campanha baseados em mudança de comportamento — não em formatos de conteúdo.

CAMPANHA: ${campaignName}
OBJETIVO: ${campaignObjective || 'Não informado — use contexto do segmento'}
SEGMENTO DO CLIENTE: ${clientSegment || 'Não informado'}
PERSONAS DISPONÍVEIS:
${personasSummary}${clustersBlock}${rulesBlock}${intelBlock}

Gere um plano estratégico comportamental completo. Retorne APENAS JSON válido, sem markdown, sem texto adicional.

Estrutura obrigatória:
{
  "phases": [
    { "id": "historia", "name": "História", "order": 1, "objective": "Objetivo específico desta fase para este cliente" },
    { "id": "prova", "name": "Prova", "order": 2, "objective": "Objetivo específico desta fase para este cliente" },
    { "id": "convite", "name": "Convite", "order": 3, "objective": "Objetivo específico desta fase para este cliente" }
  ],
  "audiences": [
    { "id": "a1", "persona_id": "id_da_persona", "persona_name": "Nome da persona", "momento_consciencia": "problema|solucao|decisao" }
  ],
  "behavior_intents": [
    {
      "id": "bi1",
      "phase_id": "historia",
      "audience_id": "a1",
      "amd": "salvar",
      "momento": "problema",
      "triggers": ["curiosidade", "especificidade"],
      "target_behavior": "Descrição concreta do comportamento esperado"
    }
  ],
  "concepts": [
    {
      "name": "Nome do Território Criativo",
      "insight": "Insight humano profundo que sustenta este território",
      "triggers": ["autoridade", "identidade"],
      "example_copy": "Exemplo de linha criativa para este território",
      "hero_piece": "Formato e canal da peça hero (ex: LinkedIn Carrossel)"
    }
  ]
}

Regras:
- Exatamente 3 fases: historia, prova, convite (nessa ordem)
- 1 audience por persona fornecida
- 1 behavior_intent por fase × por audience (total = 3 × N personas)
- AMD válidos: salvar, compartilhar, clicar, responder, marcar_alguem, pedir_proposta
- Momentos válidos: problema, solucao, decisao
- Gatilhos sugeridos: curiosidade, prova_social, especificidade, autoridade, identidade, perda, reciprocidade, urgencia
- Exatamente 3 concepts (territórios criativos)
- Objectives das fases devem ser específicos ao negócio/objetivo desta campanha
- Todos os campos obrigatórios devem estar preenchidos`;

  const result = await ClaudeService.generateCompletion({
    prompt,
    temperature: 0.5,
    maxTokens: 3000,
  });

  return parseJsonFromText(result.text);
}
