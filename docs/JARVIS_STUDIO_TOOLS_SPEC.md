# Jarvis Studio Tools — Spec de Implementação

> Documento gerado em 2026-04-15  
> Objetivo: cobrir os gaps de cobertura do Jarvis sobre o Studio  
> Modelo de trabalho: Claude (planejamento + spec) + Codex (implementação)

---

## Cobertura atual

**115 tools existentes** — ~45% do Studio coberto.

### Bem coberto
- Briefings (criar, editar, aprovar, gerar copy)
- Pipeline de posts (aprovação, publicação, agendamento)
- Campanhas e estratégia comportamental
- Clipping e monitoramento
- Operações e jobs
- Biblioteca de conhecimento
- WhatsApp + Email

### Gaps mapeados

| Área | O que falta |
|---|---|
| **DA / Arte** | Criar/editar direção de arte, gerenciar referências visuais |
| **Imagens** | Gerar/iterar imagens diretamente pelo Jarvis |
| **Receitas / Templates** | Criar template, aplicar template num briefing |
| **Multi-plataforma** | Agendar para múltiplas plataformas de uma vez |
| **Variantes** | Gerar múltiplas versões, comparar lado a lado, aprovar em lote |
| **Export + Share** | Baixar/exportar assets, criar links de compartilhamento |

---

## Plano de batches

| Batch | Tools | Status |
|---|---|---|
| **B1 — DA + Imagens** | `get_art_direction`, `generate_art_direction`, `generate_image`, `iterate_image`, `approve_image` | ✅ Spec pronta |
| **B2 — Templates/Receitas** | `list_recipes`, `get_recipe`, `create_recipe`, `apply_recipe`, `delete_recipe` | ✅ Spec pronta |
| **B3 — Multi-plataforma** | `list_platform_connections`, `get_platform_recommendations`, `schedule_to_platforms` | ✅ Spec pronta |
| **B4 — Variantes** | `generate_copy_variants`, `compare_variants`, `bulk_approve_drafts`, `clone_briefing` | ✅ Spec pronta |
| **B5 — Export + Share** | `export_post_assets`, `create_share_link`, `list_scheduled_posts`, `cancel_scheduled_post` | ✅ Spec pronta |

---

---

# B1 — DA + Imagens

### Arquivos a modificar
- `apps/backend/src/services/ai/toolDefinitions.ts` — adicionar as 5 definições
- `apps/backend/src/services/ai/toolExecutor.ts` — adicionar handlers + registrar no `OPS_TOOL_MAP`

### Serviços existentes utilizados
- `apps/backend/src/services/ai/artDirectorOrchestrator.ts` — `orchestrateArtDirection()`
- `apps/backend/src/services/ai/falAiService.ts` — `generateImageWithFal()`
- Tabela `job_creative_drafts` — persistência de drafts

---

### Tool 1 — `get_art_direction`

**Definição** (adicionar em `toolDefinitions.ts`):
```json
{
  "name": "get_art_direction",
  "description": "Recupera a direção de arte atual de um job ou briefing: estratégia visual, layout proposto (eyebrow, headline, CTA) e prompt de imagem positivo/negativo.",
  "parameters": {
    "job_id": { "type": "string", "description": "ID do job de operações." },
    "briefing_id": { "type": "string", "description": "ID do briefing (alternativa ao job_id)." }
  },
  "required": [],
  "category": "read"
}
```

**Handler** (em `toolExecutor.ts`):
```typescript
async function opsGetArtDirection(args: any, ctx: OperationsToolContext): Promise<ToolResult> {
  const jobId = contextualString(args.job_id);
  const briefingId = contextualString(args.briefing_id);

  if (!jobId && !briefingId) {
    return { success: false, error: 'Informe job_id ou briefing_id.' };
  }

  const { rows } = await query(
    `SELECT id, job_id, briefing_id, image_prompt, negative_prompt, layout_json,
            visual_strategy_json, model_used, fal_image_url, status, created_at
     FROM job_creative_drafts
     WHERE tenant_id = $1
       AND ($2::text IS NULL OR job_id::text = $2)
       AND ($3::text IS NULL OR briefing_id::text = $3)
       AND type = 'image'
     ORDER BY created_at DESC
     LIMIT 5`,
    [ctx.tenantId, jobId || null, briefingId || null]
  );

  if (!rows.length) {
    return {
      success: true,
      data: { message: 'Nenhuma direção de arte gerada ainda para este job/briefing.', drafts: [] }
    };
  }

  return {
    success: true,
    data: {
      drafts: rows.map(r => ({
        id: r.id,
        status: r.status,
        image_url: r.fal_image_url,
        image_prompt: r.image_prompt,
        negative_prompt: r.negative_prompt,
        layout: r.layout_json,
        visual_strategy: r.visual_strategy_json,
        model: r.model_used,
        created_at: r.created_at,
      }))
    },
    metadata: { row_count: rows.length }
  };
}
```

---

### Tool 2 — `generate_art_direction`

**Definição**:
```json
{
  "name": "generate_art_direction",
  "description": "Executa o orquestrador de direção de arte: a partir do copy e contexto do briefing, gera estratégia visual, layout (eyebrow/headline/CTA) e prompt de imagem pronto para geração.",
  "parameters": {
    "briefing_id": { "type": "string", "description": "ID do briefing." },
    "job_id": { "type": "string", "description": "ID do job (opcional, para gravar o resultado)." },
    "copy": { "type": "string", "description": "Texto do copy aprovado para basear a direção de arte." },
    "platform": { "type": "string", "description": "Plataforma alvo (instagram, linkedin, facebook, etc)." },
    "format": { "type": "string", "description": "Formato (reels, carrossel, feed, stories)." }
  },
  "required": ["copy"],
  "category": "action"
}
```

**Handler**:
```typescript
async function opsGenerateArtDirection(args: any, ctx: OperationsToolContext): Promise<ToolResult> {
  const copy = String(args.copy || '').trim();
  const briefingId = contextualString(args.briefing_id);
  const jobId = contextualString(args.job_id);
  const platform = contextualString(args.platform) || 'instagram';
  const format = contextualString(args.format) || 'feed';

  if (!copy) return { success: false, error: 'O campo copy é obrigatório.' };

  let brandTokens = null;
  const clientId = contextualString((ctx as any).edroClientId) || contextualString((ctx as any).clientId);
  if (clientId) {
    const { rows: brandRows } = await query(
      `SELECT brand_tokens FROM edro_clients WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
      [clientId, ctx.tenantId]
    );
    brandTokens = brandRows[0]?.brand_tokens || null;
  }

  const { orchestrateArtDirection } = await import('./artDirectorOrchestrator');
  const result = await orchestrateArtDirection({
    copy, platform, format,
    tenantId: ctx.tenantId,
    clientId: clientId || null,
    brandTokens,
  });

  if (jobId || briefingId) {
    await query(
      `INSERT INTO job_creative_drafts
         (tenant_id, job_id, briefing_id, type, image_prompt, negative_prompt,
          layout_json, visual_strategy_json, status, created_at)
       VALUES ($1, $2, $3, 'image', $4, $5, $6, $7, 'draft', NOW())`,
      [
        ctx.tenantId, jobId || null, briefingId || null,
        result.imgPrompt.positive, result.imgPrompt.negative || null,
        JSON.stringify(result.layout), JSON.stringify(result.visualStrategy || null),
      ]
    );
  }

  return {
    success: true,
    data: {
      layout: result.layout,
      image_prompt: result.imgPrompt.positive,
      negative_prompt: result.imgPrompt.negative,
      visual_strategy: result.visualStrategy,
      message: 'Direção de arte gerada. Use generate_image com o image_prompt para renderizar.',
    }
  };
}
```

---

### Tool 3 — `generate_image`

**Definição**:
```json
{
  "name": "generate_image",
  "description": "Gera uma imagem usando Fal.ai a partir de um prompt. Use o image_prompt retornado por generate_art_direction ou escreva um prompt direto.",
  "parameters": {
    "prompt": { "type": "string", "description": "Prompt positivo para geração da imagem." },
    "negative_prompt": { "type": "string", "description": "Elementos a evitar na imagem." },
    "job_id": { "type": "string", "description": "ID do job para salvar o resultado." },
    "briefing_id": { "type": "string", "description": "ID do briefing para salvar o resultado." },
    "aspect_ratio": { "type": "string", "description": "Proporção: 1:1, 9:16, 4:5, 16:9. Padrão: 1:1." },
    "model": { "type": "string", "description": "Modelo Fal.ai: flux-pro (padrão), flux-realism, recraft-v3, ideogram-v2." },
    "confirmed": { "type": "boolean", "description": "true quando o usuário confirmar a geração (consome créditos)." }
  },
  "required": ["prompt"],
  "category": "action"
}
```

**Handler**:
```typescript
async function opsGenerateImage(args: any, ctx: OperationsToolContext): Promise<ToolResult> {
  const prompt = String(args.prompt || '').trim();
  if (!prompt) return { success: false, error: 'O campo prompt é obrigatório.' };

  const jobId = contextualString(args.job_id);
  const briefingId = contextualString(args.briefing_id);
  const aspectRatio = contextualString(args.aspect_ratio) || '1:1';
  const model = (contextualString(args.model) || 'flux-pro') as any;
  const negativePrompt = contextualString(args.negative_prompt) || undefined;

  if (ctx.explicitConfirmation !== true) {
    return buildConfirmationRequiredResult('Confirmação pendente para gerar imagem.', {
      preview_prompt: prompt.slice(0, 200),
      aspect_ratio: aspectRatio,
      model,
      tool_name: 'generate_image',
      tool_args: { prompt, negative_prompt: negativePrompt, job_id: jobId, briefing_id: briefingId, aspect_ratio: aspectRatio, model },
      confirmation_prompt: `Confirmo a geração de imagem (${model}, ${aspectRatio}).`,
    });
  }

  const { generateImageWithFal } = await import('./falAiService');
  const result = await generateImageWithFal({ prompt, negativePrompt, aspectRatio, model, numImages: 1 });

  let draftId: string | null = null;
  if (jobId || briefingId) {
    const { rows } = await query(
      `INSERT INTO job_creative_drafts
         (tenant_id, job_id, briefing_id, type, image_prompt, negative_prompt,
          fal_image_url, model_used, status, created_at)
       VALUES ($1, $2, $3, 'image', $4, $5, $6, $7, 'pending_approval', NOW())
       RETURNING id`,
      [ctx.tenantId, jobId || null, briefingId || null, prompt, negativePrompt || null, result.imageUrl, model]
    );
    draftId = rows[0]?.id || null;
  }

  return {
    success: true,
    data: {
      image_url: result.imageUrl,
      draft_id: draftId,
      model_used: model,
      aspect_ratio: aspectRatio,
      message: 'Imagem gerada. Use approve_image para aprovar ou iterate_image para refinar.',
    }
  };
}
```

---

### Tool 4 — `iterate_image`

**Definição**:
```json
{
  "name": "iterate_image",
  "description": "Refina uma imagem já gerada aplicando novas instruções ao prompt original. Gera uma nova versão sem descartar o draft anterior.",
  "parameters": {
    "draft_id": { "type": "string", "description": "ID do draft de imagem a refinar." },
    "instructions": { "type": "string", "description": "O que mudar: ex 'mais contraste', 'remover texto', 'fundo mais escuro'." },
    "confirmed": { "type": "boolean", "description": "true para confirmar a geração." }
  },
  "required": ["draft_id", "instructions"],
  "category": "action"
}
```

**Handler**:
```typescript
async function opsIterateImage(args: any, ctx: OperationsToolContext): Promise<ToolResult> {
  const draftId = String(args.draft_id || '').trim();
  const instructions = String(args.instructions || '').trim();
  if (!draftId || !instructions) return { success: false, error: 'draft_id e instructions são obrigatórios.' };

  const { rows } = await query(
    `SELECT id, job_id, briefing_id, image_prompt, negative_prompt, model_used
     FROM job_creative_drafts WHERE id::text = $1 AND tenant_id = $2 LIMIT 1`,
    [draftId, ctx.tenantId]
  );
  if (!rows.length) return { success: false, error: 'Draft não encontrado.' };
  const draft = rows[0];

  if (ctx.explicitConfirmation !== true) {
    return buildConfirmationRequiredResult('Confirmação pendente para refinar imagem.', {
      draft_id: draftId, instructions,
      original_prompt: draft.image_prompt?.slice(0, 200),
      tool_name: 'iterate_image',
      tool_args: { draft_id: draftId, instructions },
      confirmation_prompt: `Confirmo a geração de variação com: "${instructions}".`,
    });
  }

  const newPrompt = `${draft.image_prompt}. ${instructions}`;
  const { generateImageWithFal } = await import('./falAiService');
  const result = await generateImageWithFal({
    prompt: newPrompt,
    negativePrompt: draft.negative_prompt || undefined,
    model: draft.model_used || 'flux-pro',
    numImages: 1,
  });

  const { rows: inserted } = await query(
    `INSERT INTO job_creative_drafts
       (tenant_id, job_id, briefing_id, type, image_prompt, negative_prompt,
        fal_image_url, model_used, status, parent_draft_id, created_at)
     VALUES ($1, $2, $3, 'image', $4, $5, $6, $7, 'pending_approval', $8, NOW())
     RETURNING id`,
    [ctx.tenantId, draft.job_id, draft.briefing_id, newPrompt, draft.negative_prompt || null,
     result.imageUrl, draft.model_used || 'flux-pro', draftId]
  );

  return {
    success: true,
    data: {
      image_url: result.imageUrl,
      new_draft_id: inserted[0]?.id,
      parent_draft_id: draftId,
      message: 'Nova variação gerada. Use approve_image para aprovar.',
    }
  };
}
```

---

### Tool 5 — `approve_image`

**Definição**:
```json
{
  "name": "approve_image",
  "description": "Aprova um draft de imagem gerado, marcando-o como aprovado e avançando o status do job para o próximo passo do pipeline.",
  "parameters": {
    "draft_id": { "type": "string", "description": "ID do draft de imagem a aprovar." },
    "notes": { "type": "string", "description": "Observações opcionais sobre a aprovação." }
  },
  "required": ["draft_id"],
  "category": "action"
}
```

**Handler**:
```typescript
async function opsApproveImage(args: any, ctx: OperationsToolContext): Promise<ToolResult> {
  const draftId = String(args.draft_id || '').trim();
  if (!draftId) return { success: false, error: 'draft_id é obrigatório.' };

  const { rows } = await query(
    `UPDATE job_creative_drafts
     SET status = 'approved', approved_at = NOW(), approved_by = $3
     WHERE id::text = $1 AND tenant_id = $2
     RETURNING id, job_id, briefing_id, fal_image_url`,
    [draftId, ctx.tenantId, ctx.userId || null]
  );
  if (!rows.length) return { success: false, error: 'Draft não encontrado ou sem permissão.' };
  const draft = rows[0];

  if (draft.job_id) {
    await query(
      `UPDATE ops_jobs SET status = 'review', updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND status IN ('in_progress', 'draft')`,
      [draft.job_id, ctx.tenantId]
    );
  }

  return {
    success: true,
    data: {
      draft_id: draft.id,
      image_url: draft.fal_image_url,
      job_id: draft.job_id,
      briefing_id: draft.briefing_id,
      message: 'Imagem aprovada com sucesso.',
    }
  };
}
```

### Registro no `OPS_TOOL_MAP`
```typescript
get_art_direction:      opsGetArtDirection,
generate_art_direction: opsGenerateArtDirection,
generate_image:         opsGenerateImage,
iterate_image:          opsIterateImage,
approve_image:          opsApproveImage,
```

### Migration necessária
Criar `apps/backend/src/db/migrations/0335_job_creative_drafts_parent.sql`:
```sql
ALTER TABLE job_creative_drafts
  ADD COLUMN IF NOT EXISTS parent_draft_id UUID REFERENCES job_creative_drafts(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID;
```

---

---

# B2 — Templates / Receitas

### Contexto
- Tabela `creative_recipes` já existe (migration 0225) com CRUD completo em `routes/studioRecipes.ts`
- Tabela `edro_briefing_templates` já existe (migration 0122) com rotas em `routes/edro.ts`
- O que falta: expor ambas como Jarvis tools, incluindo a ação `apply_recipe` que cria um briefing pré-preenchido a partir de um template

### Arquivos a modificar
- `apps/backend/src/services/ai/toolDefinitions.ts`
- `apps/backend/src/services/ai/toolExecutor.ts`

---

### Tool 1 — `list_recipes`

**Definição**:
```json
{
  "name": "list_recipes",
  "description": "Lista receitas criativas salvas (configurações reutilizáveis de pipeline: plataforma, formato, gatilho, modelo). Inclui receitas globais e do cliente.",
  "parameters": {
    "client_id": { "type": "string", "description": "Filtrar por cliente específico. Se omitido, retorna receitas globais + do cliente em contexto." },
    "platform": { "type": "string", "description": "Filtrar por plataforma (instagram, linkedin, etc)." },
    "objective": { "type": "string", "description": "Filtrar por objetivo (awareness, conversion, engagement)." },
    "limit": { "type": "number", "description": "Máximo de resultados. Padrão: 20." }
  },
  "required": [],
  "category": "read"
}
```

**Handler**:
```typescript
async function opsListRecipes(args: any, ctx: OperationsToolContext): Promise<ToolResult> {
  const clientId = contextualString(args.client_id);
  const platform = contextualString(args.platform);
  const objective = contextualString(args.objective);
  const limit = Math.min(Number(args.limit) || 20, 50);

  const { rows } = await query(
    `SELECT id, name, client_id, objective, platform, format, pipeline_type,
            trigger_id, provider, model, tone_notes, use_count, last_used_at, created_at
     FROM creative_recipes
     WHERE tenant_id = $1
       AND (client_id IS NULL OR client_id::text = $2 OR $2 IS NULL)
       AND ($3::text IS NULL OR platform = $3)
       AND ($4::text IS NULL OR objective = $4)
     ORDER BY use_count DESC, last_used_at DESC NULLS LAST, created_at DESC
     LIMIT $5`,
    [ctx.tenantId, clientId || null, platform || null, objective || null, limit]
  );

  return {
    success: true,
    data: { recipes: rows },
    metadata: { row_count: rows.length }
  };
}
```

---

### Tool 2 — `get_recipe`

**Definição**:
```json
{
  "name": "get_recipe",
  "description": "Retorna detalhes completos de uma receita criativa pelo ID.",
  "parameters": {
    "recipe_id": { "type": "string", "description": "UUID da receita." }
  },
  "required": ["recipe_id"],
  "category": "read"
}
```

**Handler**:
```typescript
async function opsGetRecipe(args: any, ctx: OperationsToolContext): Promise<ToolResult> {
  const recipeId = String(args.recipe_id || '').trim();
  if (!recipeId) return { success: false, error: 'recipe_id é obrigatório.' };

  const { rows } = await query(
    `SELECT * FROM creative_recipes WHERE id::text = $1 AND tenant_id = $2 LIMIT 1`,
    [recipeId, ctx.tenantId]
  );
  if (!rows.length) return { success: false, error: 'Receita não encontrada.' };

  return { success: true, data: rows[0] };
}
```

---

### Tool 3 — `create_recipe`

**Definição**:
```json
{
  "name": "create_recipe",
  "description": "Salva uma nova receita criativa reutilizável com configurações de pipeline (plataforma, formato, gatilho, modelo, notas de tom).",
  "parameters": {
    "name": { "type": "string", "description": "Nome descritivo da receita." },
    "client_id": { "type": "string", "description": "UUID do cliente. Se omitido, a receita é global para o tenant." },
    "objective": { "type": "string", "description": "awareness | conversion | engagement | retention." },
    "platform": { "type": "string", "description": "instagram | linkedin | facebook | tiktok." },
    "format": { "type": "string", "description": "Feed | Reels | Carrossel | Stories." },
    "pipeline_type": { "type": "string", "description": "standard | premium | adversarial. Padrão: standard." },
    "trigger_id": { "type": "string", "description": "Gatilho persuasivo: G01 (escassez) G02 (autoridade) G03 (prova social) G04 (reciprocidade) G05 (curiosidade) G06 (medo) G07 (identidade)." },
    "provider": { "type": "string", "description": "Provedor de imagem: fal | gemini | leonardo." },
    "model": { "type": "string", "description": "Modelo específico do provedor." },
    "tone_notes": { "type": "string", "description": "Instruções de tom e voz para esta receita." }
  },
  "required": ["name"],
  "category": "write"
}
```

**Handler**:
```typescript
async function opsCreateRecipe(args: any, ctx: OperationsToolContext): Promise<ToolResult> {
  const name = String(args.name || '').trim();
  if (!name) return { success: false, error: 'O campo name é obrigatório.' };

  const { rows } = await query(
    `INSERT INTO creative_recipes
       (tenant_id, client_id, name, objective, platform, format, pipeline_type,
        trigger_id, provider, model, tone_notes, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
     RETURNING id, name`,
    [
      ctx.tenantId,
      contextualString(args.client_id) || null,
      name,
      contextualString(args.objective) || null,
      contextualString(args.platform) || null,
      contextualString(args.format) || null,
      contextualString(args.pipeline_type) || 'standard',
      contextualString(args.trigger_id) || null,
      contextualString(args.provider) || null,
      contextualString(args.model) || null,
      contextualString(args.tone_notes) || null,
    ]
  );

  return {
    success: true,
    data: { recipe_id: rows[0].id, name: rows[0].name, message: 'Receita criada com sucesso.' }
  };
}
```

---

### Tool 4 — `apply_recipe`

**Definição**:
```json
{
  "name": "apply_recipe",
  "description": "Aplica uma receita ou template criativo para criar um novo briefing pré-configurado. O briefing herda plataforma, formato, objetivo e notas de tom da receita.",
  "parameters": {
    "recipe_id": { "type": "string", "description": "UUID da receita criativa (creative_recipes)." },
    "template_id": { "type": "string", "description": "ID do briefing template (edro_briefing_templates) — alternativa ao recipe_id." },
    "client_id": { "type": "string", "description": "ID do cliente para o novo briefing." },
    "title": { "type": "string", "description": "Título do novo briefing. Se omitido, usa o nome da receita." },
    "additional_notes": { "type": "string", "description": "Notas adicionais a incluir no briefing." }
  },
  "required": [],
  "category": "write"
}
```

**Handler**:
```typescript
async function opsApplyRecipe(args: any, ctx: OperationsToolContext): Promise<ToolResult> {
  const recipeId = contextualString(args.recipe_id);
  const templateId = contextualString(args.template_id);
  const clientId = contextualString(args.client_id);
  const additionalNotes = contextualString(args.additional_notes);

  if (!recipeId && !templateId) {
    return { success: false, error: 'Informe recipe_id ou template_id.' };
  }

  let recipeData: Record<string, any> = {};

  if (recipeId) {
    const { rows } = await query(
      `SELECT * FROM creative_recipes WHERE id::text = $1 AND tenant_id = $2 LIMIT 1`,
      [recipeId, ctx.tenantId]
    );
    if (!rows.length) return { success: false, error: 'Receita não encontrada.' };
    recipeData = rows[0];

    // Incrementar use_count
    await query(
      `UPDATE creative_recipes SET use_count = use_count + 1, last_used_at = NOW() WHERE id = $1`,
      [rows[0].id]
    );
  } else if (templateId) {
    const { rows } = await query(
      `SELECT * FROM edro_briefing_templates
       WHERE id = $1 AND (tenant_id = $2 OR is_system = true) LIMIT 1`,
      [templateId, ctx.tenantId]
    );
    if (!rows.length) return { success: false, error: 'Template não encontrado.' };
    recipeData = {
      name: rows[0].name,
      objective: rows[0].objective,
      tone_notes: rows[0].additional_notes,
      platform: rows[0].channels?.[0] || null,
    };
  }

  const title = contextualString(args.title) || recipeData.name || 'Novo Briefing';
  const notes = [recipeData.tone_notes, additionalNotes].filter(Boolean).join('\n\n');

  // Criar briefing pré-preenchido
  const { rows: briefingRows } = await query(
    `INSERT INTO edro_briefings
       (tenant_id, client_id, title, objective, platform, format, pipeline_type,
        trigger_id, additional_notes, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'draft', NOW(), NOW())
     RETURNING id, title`,
    [
      ctx.tenantId,
      clientId || recipeData.client_id || null,
      title,
      recipeData.objective || null,
      recipeData.platform || null,
      recipeData.format || null,
      recipeData.pipeline_type || 'standard',
      recipeData.trigger_id || null,
      notes || null,
    ]
  );

  const briefing = briefingRows[0];
  const studioUrl = `/studio/brief?briefing_id=${briefing.id}`;

  return {
    success: true,
    data: {
      briefing_id: briefing.id,
      title: briefing.title,
      studio_url: studioUrl,
      message: `Briefing criado a partir da receita "${recipeData.name}". Acesse o Studio para completar.`,
    }
  };
}
```

---

### Tool 5 — `delete_recipe`

**Definição**:
```json
{
  "name": "delete_recipe",
  "description": "Remove uma receita criativa salva. Não afeta briefings já criados a partir dela.",
  "parameters": {
    "recipe_id": { "type": "string", "description": "UUID da receita a remover." }
  },
  "required": ["recipe_id"],
  "category": "write"
}
```

**Handler**:
```typescript
async function opsDeleteRecipe(args: any, ctx: OperationsToolContext): Promise<ToolResult> {
  const recipeId = String(args.recipe_id || '').trim();
  if (!recipeId) return { success: false, error: 'recipe_id é obrigatório.' };

  const { rowCount } = await query(
    `DELETE FROM creative_recipes WHERE id::text = $1 AND tenant_id = $2`,
    [recipeId, ctx.tenantId]
  );

  if (!rowCount) return { success: false, error: 'Receita não encontrada ou sem permissão.' };

  return { success: true, data: { message: 'Receita removida com sucesso.' } };
}
```

### Registro no `OPS_TOOL_MAP`
```typescript
list_recipes:  opsListRecipes,
get_recipe:    opsGetRecipe,
create_recipe: opsCreateRecipe,
apply_recipe:  opsApplyRecipe,
delete_recipe: opsDeleteRecipe,
```

### Migrations necessárias
Verificar se `edro_briefings` tem as colunas `pipeline_type` e `trigger_id`. Se não existirem, criar:
```sql
-- apps/backend/src/db/migrations/0336_briefings_recipe_fields.sql
ALTER TABLE edro_briefings
  ADD COLUMN IF NOT EXISTS pipeline_type TEXT DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS trigger_id TEXT;
```

---

---

# B3 — Multi-plataforma

### Contexto
- APIs de publicação já existem: `linkedinService.ts`, `metaSyncService.ts`, `instagramSyncService.ts`, `tiktokService.ts`
- Tools `schedule_post_publication` e `publish_studio_post` já existem para publicação individual
- Tabelas `connectors`, `edro_publish_schedule`, `scheduled_posts` já existem
- O que falta: listar conexões, recomendar horários/plataformas, e agendar para múltiplas plataformas em uma única chamada

### Arquivos a modificar
- `apps/backend/src/services/ai/toolDefinitions.ts`
- `apps/backend/src/services/ai/toolExecutor.ts`

---

### Tool 1 — `list_platform_connections`

**Definição**:
```json
{
  "name": "list_platform_connections",
  "description": "Lista as plataformas conectadas de um cliente (Instagram, LinkedIn, Facebook, TikTok) e o status de cada conexão.",
  "parameters": {
    "client_id": { "type": "string", "description": "ID do cliente. Se omitido, usa o cliente em contexto." }
  },
  "required": [],
  "category": "read"
}
```

**Handler**:
```typescript
async function opsListPlatformConnections(args: any, ctx: OperationsToolContext): Promise<ToolResult> {
  const clientId = contextualString(args.client_id) || contextualString((ctx as any).clientId);
  if (!clientId) return { success: false, error: 'Informe client_id ou acesse via contexto de cliente.' };

  const { rows } = await query(
    `SELECT provider, payload, created_at, updated_at, posts_synced_at
     FROM connectors
     WHERE tenant_id = $1 AND client_id = $2
     ORDER BY provider`,
    [ctx.tenantId, clientId]
  );

  const connections = rows.map(r => {
    const payload = typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload;
    return {
      provider: r.provider,
      connected: true,
      instagram_business_id: payload.instagram_business_id || null,
      page_id: payload.page_id || null,
      person_id: payload.person_id || null,
      organization_id: payload.organization_id || null,
      open_id: payload.open_id || null,
      last_sync: r.posts_synced_at,
      connected_at: r.created_at,
    };
  });

  const allProviders = ['meta', 'linkedin', 'tiktok', 'google'];
  const connectedProviders = connections.map(c => c.provider);
  const disconnected = allProviders
    .filter(p => !connectedProviders.includes(p))
    .map(p => ({ provider: p, connected: false }));

  return {
    success: true,
    data: {
      client_id: clientId,
      connections: [...connections, ...disconnected],
      summary: `${connections.length} de ${allProviders.length} plataformas conectadas.`,
    },
    metadata: { row_count: connections.length }
  };
}
```

---

### Tool 2 — `get_platform_recommendations`

**Definição**:
```json
{
  "name": "get_platform_recommendations",
  "description": "Recomenda as melhores plataformas e horários para publicar um conteúdo com base no perfil do cliente, histórico de performance e formato do conteúdo.",
  "parameters": {
    "client_id": { "type": "string", "description": "ID do cliente." },
    "format": { "type": "string", "description": "Formato do conteúdo: feed, reels, carrossel, stories." },
    "objective": { "type": "string", "description": "Objetivo: awareness, conversion, engagement." }
  },
  "required": [],
  "category": "read"
}
```

**Handler**:
```typescript
async function opsGetPlatformRecommendations(args: any, ctx: OperationsToolContext): Promise<ToolResult> {
  const clientId = contextualString(args.client_id) || contextualString((ctx as any).clientId);
  const format = contextualString(args.format) || 'feed';
  const objective = contextualString(args.objective) || 'engagement';

  // Buscar plataformas conectadas
  const { rows: connectors } = await query(
    `SELECT provider FROM connectors WHERE tenant_id = $1 AND client_id = $2`,
    [ctx.tenantId, clientId || '']
  );
  const connected = connectors.map(r => r.provider);

  // Buscar métricas de performance recentes por plataforma
  const { rows: metrics } = await query(
    `SELECT platform, AVG(engagement_rate) as avg_engagement, COUNT(*) as post_count
     FROM campaign_format_metrics
     WHERE tenant_id = $1
       AND ($2::text IS NULL OR client_id::text = $2)
       AND recorded_at > NOW() - INTERVAL '90 days'
     GROUP BY platform
     ORDER BY avg_engagement DESC`,
    [ctx.tenantId, clientId || null]
  );

  // Mapeamento de formato → plataformas recomendadas
  const formatMap: Record<string, string[]> = {
    reels: ['meta', 'tiktok'],
    carrossel: ['meta', 'linkedin'],
    stories: ['meta'],
    feed: ['meta', 'linkedin'],
  };
  const recommended = (formatMap[format] || ['meta', 'linkedin'])
    .filter(p => connected.includes(p));

  // Horários recomendados por plataforma (baseado em benchmarks)
  const bestTimes: Record<string, string> = {
    meta: '18:00 - 21:00 BRT (terça a quinta)',
    linkedin: '08:00 - 10:00 BRT (terça e quarta)',
    tiktok: '19:00 - 23:00 BRT (qualquer dia)',
    google: '09:00 - 12:00 BRT (dias úteis)',
  };

  const recommendations = recommended.map(provider => ({
    provider,
    best_time: bestTimes[provider] || '10:00 BRT',
    avg_engagement: metrics.find(m => m.platform === provider)?.avg_engagement || null,
    post_count_90d: metrics.find(m => m.platform === provider)?.post_count || 0,
  }));

  return {
    success: true,
    data: {
      format,
      objective,
      recommended_platforms: recommendations,
      connected_platforms: connected,
      tip: recommendations.length
        ? `Melhor plataforma para ${format}: ${recommendations[0].provider} (${recommendations[0].best_time}).`
        : 'Nenhuma plataforma compatível conectada para este formato.',
    }
  };
}
```

---

### Tool 3 — `schedule_to_platforms`

**Definição**:
```json
{
  "name": "schedule_to_platforms",
  "description": "Agenda a publicação de um briefing/copy em múltiplas plataformas de uma só vez, com datas e horários configuráveis por plataforma.",
  "parameters": {
    "briefing_id": { "type": "string", "description": "ID do briefing a publicar." },
    "copy_id": { "type": "string", "description": "ID do copy/versão aprovada." },
    "platforms": { "type": "array", "description": "Lista de plataformas: ['meta', 'linkedin', 'tiktok'].", "items": { "type": "string" } },
    "scheduled_for": { "type": "string", "description": "Data/hora ISO 8601 para publicação. Se omitido, usa próximo dia útil às 10h BRT." },
    "confirmed": { "type": "boolean", "description": "true para confirmar o agendamento." }
  },
  "required": ["briefing_id"],
  "category": "action"
}
```

**Handler**:
```typescript
async function opsScheduleToPlatforms(args: any, ctx: OperationsToolContext): Promise<ToolResult> {
  const briefingId = String(args.briefing_id || '').trim();
  if (!briefingId) return { success: false, error: 'briefing_id é obrigatório.' };

  const copyId = contextualString(args.copy_id);
  const platforms: string[] = Array.isArray(args.platforms) && args.platforms.length
    ? args.platforms
    : ['meta'];

  // Calcular data padrão se não informada (próximo dia útil às 10h BRT)
  const scheduledFor = contextualString(args.scheduled_for) || computeDefaultScheduledForIso();

  if (ctx.explicitConfirmation !== true) {
    return buildConfirmationRequiredResult('Confirmação pendente para agendar publicação.', {
      briefing_id: briefingId,
      platforms,
      scheduled_for: scheduledFor,
      tool_name: 'schedule_to_platforms',
      tool_args: { briefing_id: briefingId, copy_id: copyId, platforms, scheduled_for: scheduledFor },
      confirmation_prompt: `Confirmo o agendamento em ${platforms.join(', ')} para ${scheduledFor}.`,
    });
  }

  // Buscar copy_id se não informado (última versão aprovada)
  let resolvedCopyId = copyId;
  if (!resolvedCopyId) {
    const { rows: copyRows } = await query(
      `SELECT id FROM edro_copy_versions
       WHERE briefing_id::text = $1
       ORDER BY created_at DESC LIMIT 1`,
      [briefingId]
    );
    resolvedCopyId = copyRows[0]?.id || null;
  }

  // Mapear provider → channel
  const channelMap: Record<string, string> = {
    meta: 'instagram', linkedin: 'linkedin', tiktok: 'tiktok', google: 'google',
  };

  const results: Array<{ platform: string; schedule_id: string | null; error?: string }> = [];

  for (const platform of platforms) {
    const channel = channelMap[platform] || platform;
    try {
      const { rows } = await query(
        `INSERT INTO edro_publish_schedule
           (briefing_id, copy_id, channel, scheduled_for, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'scheduled', NOW(), NOW())
         RETURNING id`,
        [briefingId, resolvedCopyId || null, channel, scheduledFor]
      );
      results.push({ platform, schedule_id: rows[0]?.id || null });
    } catch (err: any) {
      results.push({ platform, schedule_id: null, error: err.message });
    }
  }

  const successful = results.filter(r => !r.error);
  const failed = results.filter(r => r.error);

  return {
    success: successful.length > 0,
    data: {
      scheduled: successful,
      failed,
      scheduled_for: scheduledFor,
      message: `Agendado em ${successful.length} plataforma(s).${failed.length ? ` Falhou em: ${failed.map(f => f.platform).join(', ')}.` : ''}`,
    }
  };
}

// Helper — se não existir ainda no arquivo, adicionar junto ao handler:
function computeDefaultScheduledForIso(): string {
  const now = new Date();
  // Próximo dia útil às 10h BRT (UTC-3)
  const next = new Date(now);
  next.setUTCHours(13, 0, 0, 0); // 10h BRT = 13h UTC
  if (next <= now) next.setDate(next.getDate() + 1);
  while (next.getDay() === 0 || next.getDay() === 6) next.setDate(next.getDate() + 1);
  return next.toISOString();
}
```

### Registro no `OPS_TOOL_MAP`
```typescript
list_platform_connections:    opsListPlatformConnections,
get_platform_recommendations: opsGetPlatformRecommendations,
schedule_to_platforms:        opsScheduleToPlatforms,
```

> **Nota:** `computeDefaultScheduledForIso` já pode existir em `toolExecutor.ts` com outro nome. Verificar antes de adicionar e reutilizar se existir.

---

---

# B4 — Variantes

### Contexto
- `generate_copy_for_briefing` já existe e aceita parâmetro `count` (gera até 5 variantes de uma vez)
- `approve_creative_draft` e `regenerate_creative_draft` já existem
- O que falta: ferramenta dedicada para gerar variantes em massa, comparar versões, aprovar múltiplos drafts em lote, e clonar briefings

### Arquivos a modificar
- `apps/backend/src/services/ai/toolDefinitions.ts`
- `apps/backend/src/services/ai/toolExecutor.ts`

---

### Tool 1 — `generate_copy_variants`

**Definição**:
```json
{
  "name": "generate_copy_variants",
  "description": "Gera múltiplas variações de copy para um briefing com apelos diferentes (dor, lógica, prova social). Útil para A/B test ou escolha criativa.",
  "parameters": {
    "briefing_id": { "type": "string", "description": "ID do briefing." },
    "count": { "type": "number", "description": "Número de variantes a gerar: 2 a 5. Padrão: 3." },
    "appeals": { "type": "array", "description": "Apelos a usar: ['dor', 'logica', 'prova_social', 'curiosidade', 'autoridade']. Se omitido, usa os 3 principais.", "items": { "type": "string" } },
    "instructions": { "type": "string", "description": "Instruções adicionais de geração." }
  },
  "required": ["briefing_id"],
  "category": "action"
}
```

**Handler**:
```typescript
async function opsGenerateCopyVariants(args: any, ctx: OperationsToolContext): Promise<ToolResult> {
  const briefingId = String(args.briefing_id || '').trim();
  if (!briefingId) return { success: false, error: 'briefing_id é obrigatório.' };

  const count = Math.min(Math.max(Number(args.count) || 3, 2), 5);
  const appeals: string[] = Array.isArray(args.appeals) && args.appeals.length
    ? args.appeals.slice(0, count)
    : ['dor', 'logica', 'prova_social'].slice(0, count);
  const instructions = contextualString(args.instructions);

  // Reutilizar toolGenerateCopy internamente com instruções por apelo
  const results: Array<{ appeal: string; copy_id: string; preview: string }> = [];

  for (const appeal of appeals) {
    const appealInstruction = [
      instructions,
      `Apelo principal: ${appeal}. Escreva a copy com foco em ${appeal === 'dor' ? 'o problema e urgência' : appeal === 'logica' ? 'dados, benefícios concretos e racional' : appeal === 'prova_social' ? 'depoimentos, números e validação social' : appeal === 'curiosidade' ? 'mistério e intriga para gerar clique' : 'credenciais e expertise'}.`
    ].filter(Boolean).join(' ');

    try {
      // Chamar o serviço de geração diretamente
      const toolCtx = { ...ctx, clientId: (ctx as any).edroClientId || (ctx as any).clientId };
      // Buscar briefing para contexto
      const { rows: bRows } = await query(
        `SELECT b.*, ec.id as edro_client_id FROM edro_briefings b
         LEFT JOIN edro_clients ec ON ec.client_id = b.client_id AND ec.tenant_id = b.tenant_id
         WHERE b.id::text = $1 AND b.tenant_id = $2 LIMIT 1`,
        [briefingId, ctx.tenantId]
      );
      if (!bRows.length) return { success: false, error: 'Briefing não encontrado.' };

      const { generateCopy } = await import('../../repositories/edroBriefingRepository');
      const copyResult = await generateCopy({
        briefingId,
        tenantId: ctx.tenantId,
        instructions: appealInstruction,
        language: 'pt',
      });

      results.push({
        appeal,
        copy_id: copyResult.id,
        preview: copyResult.output?.slice(0, 300) || '',
      });
    } catch (err: any) {
      results.push({ appeal, copy_id: '', preview: `Erro: ${err.message}` });
    }
  }

  return {
    success: true,
    data: {
      briefing_id: briefingId,
      variants: results,
      count: results.length,
      message: `${results.length} variante(s) gerada(s). Use compare_variants para comparar ou approve_creative_draft para aprovar.`,
    }
  };
}
```

> **Nota para o Codex:** Se `generateCopy` não existir como função exportada em `edroBriefingRepository`, usar o padrão já existente de `toolGenerateCopy` (linhas 816-861 de `toolExecutor.ts`) — chamar a função interna diretamente passando os parâmetros adaptados.

---

### Tool 2 — `compare_variants`

**Definição**:
```json
{
  "name": "compare_variants",
  "description": "Compara múltiplas versões de copy de um briefing lado a lado, mostrando texto completo, apelo, Fogg score e data de geração de cada uma.",
  "parameters": {
    "briefing_id": { "type": "string", "description": "ID do briefing." },
    "copy_ids": { "type": "array", "description": "IDs específicos de versões a comparar. Se omitido, usa as 3 mais recentes.", "items": { "type": "string" } }
  },
  "required": ["briefing_id"],
  "category": "read"
}
```

**Handler**:
```typescript
async function opsCompareVariants(args: any, ctx: OperationsToolContext): Promise<ToolResult> {
  const briefingId = String(args.briefing_id || '').trim();
  if (!briefingId) return { success: false, error: 'briefing_id é obrigatório.' };

  const copyIds: string[] = Array.isArray(args.copy_ids) ? args.copy_ids : [];

  let q: string;
  let params: any[];

  if (copyIds.length) {
    q = `SELECT id, output, payload, model, created_at
         FROM edro_copy_versions
         WHERE briefing_id::text = $1 AND tenant_id = $2
           AND id = ANY($3::uuid[])
         ORDER BY created_at DESC`;
    params = [briefingId, ctx.tenantId, copyIds];
  } else {
    q = `SELECT id, output, payload, model, created_at
         FROM edro_copy_versions
         WHERE briefing_id::text = $1 AND tenant_id = $2
         ORDER BY created_at DESC LIMIT 3`;
    params = [briefingId, ctx.tenantId];
  }

  const { rows } = await query(q, params);
  if (!rows.length) return { success: false, error: 'Nenhuma versão de copy encontrada.' };

  const variants = rows.map((r, idx) => {
    const payload = typeof r.payload === 'string' ? JSON.parse(r.payload || '{}') : (r.payload || {});
    return {
      index: idx + 1,
      copy_id: r.id,
      appeal: payload.appeal || null,
      fogg_score: payload.fogg_score || null,
      model: r.model,
      created_at: r.created_at,
      text: r.output || '',
      preview: (r.output || '').slice(0, 400),
    };
  });

  return {
    success: true,
    data: {
      briefing_id: briefingId,
      variants,
      count: variants.length,
      tip: 'Use approve_creative_draft com o copy_id desejado para aprovar, ou bulk_approve_drafts para aprovar múltiplos.',
    },
    metadata: { row_count: variants.length }
  };
}
```

---

### Tool 3 — `bulk_approve_drafts`

**Definição**:
```json
{
  "name": "bulk_approve_drafts",
  "description": "Aprova múltiplos drafts criativos (copy ou imagem) de uma vez. Útil para fechar um conjunto de aprovações sem confirmar um por um.",
  "parameters": {
    "draft_ids": { "type": "array", "description": "Lista de IDs de drafts a aprovar.", "items": { "type": "string" } },
    "confirmed": { "type": "boolean", "description": "true para confirmar a aprovação em lote." }
  },
  "required": ["draft_ids"],
  "category": "action"
}
```

**Handler**:
```typescript
async function opsBulkApproveDrafts(args: any, ctx: OperationsToolContext): Promise<ToolResult> {
  const draftIds: string[] = Array.isArray(args.draft_ids) ? args.draft_ids : [];
  if (!draftIds.length) return { success: false, error: 'Informe ao menos um draft_id.' };
  if (draftIds.length > 20) return { success: false, error: 'Máximo de 20 drafts por operação.' };

  if (ctx.explicitConfirmation !== true) {
    return buildConfirmationRequiredResult('Confirmação pendente para aprovação em lote.', {
      draft_count: draftIds.length,
      draft_ids: draftIds,
      tool_name: 'bulk_approve_drafts',
      tool_args: { draft_ids: draftIds },
      confirmation_prompt: `Confirmo a aprovação de ${draftIds.length} draft(s).`,
    });
  }

  const { rows } = await query(
    `UPDATE job_creative_drafts
     SET status = 'approved', approval_status = 'approved',
         draft_approved_at = NOW(), draft_approved_by = $3
     WHERE id = ANY($1::uuid[]) AND tenant_id = $2
     RETURNING id, job_id, draft_type`,
    [draftIds, ctx.tenantId, ctx.userId || null]
  );

  const approved = rows.map(r => ({ draft_id: r.id, job_id: r.job_id, type: r.draft_type }));
  const notFound = draftIds.filter(id => !rows.find(r => r.id === id));

  return {
    success: true,
    data: {
      approved,
      not_found: notFound,
      message: `${approved.length} draft(s) aprovado(s).${notFound.length ? ` ${notFound.length} não encontrado(s).` : ''}`,
    }
  };
}
```

---

### Tool 4 — `clone_briefing`

**Definição**:
```json
{
  "name": "clone_briefing",
  "description": "Duplica um briefing existente criando um novo em status draft com os mesmos campos. Útil para reutilizar briefings de sucesso com pequenas variações.",
  "parameters": {
    "briefing_id": { "type": "string", "description": "ID do briefing a clonar." },
    "new_title": { "type": "string", "description": "Título do briefing clonado. Se omitido, usa 'Cópia de [título original]'." },
    "client_id": { "type": "string", "description": "ID de cliente diferente para o clone. Se omitido, mantém o mesmo." }
  },
  "required": ["briefing_id"],
  "category": "write"
}
```

**Handler**:
```typescript
async function opsCloneBriefing(args: any, ctx: OperationsToolContext): Promise<ToolResult> {
  const briefingId = String(args.briefing_id || '').trim();
  if (!briefingId) return { success: false, error: 'briefing_id é obrigatório.' };

  const { rows: original } = await query(
    `SELECT * FROM edro_briefings WHERE id::text = $1 AND tenant_id = $2 LIMIT 1`,
    [briefingId, ctx.tenantId]
  );
  if (!original.length) return { success: false, error: 'Briefing não encontrado.' };

  const src = original[0];
  const newTitle = contextualString(args.new_title) || `Cópia de ${src.title}`;
  const newClientId = contextualString(args.client_id) || src.client_id;

  const { rows: cloned } = await query(
    `INSERT INTO edro_briefings
       (tenant_id, client_id, title, objective, target_audience, channels,
        platform, format, pipeline_type, trigger_id, additional_notes,
        behavior_intent_id, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'draft', NOW(), NOW())
     RETURNING id, title`,
    [
      ctx.tenantId, newClientId, newTitle,
      src.objective, src.target_audience, src.channels,
      src.platform, src.format, src.pipeline_type || 'standard',
      src.trigger_id, src.additional_notes, src.behavior_intent_id,
    ]
  );

  return {
    success: true,
    data: {
      original_briefing_id: briefingId,
      new_briefing_id: cloned[0].id,
      title: cloned[0].title,
      studio_url: `/studio/brief?briefing_id=${cloned[0].id}`,
      message: `Briefing clonado com sucesso: "${cloned[0].title}".`,
    }
  };
}
```

### Registro no `OPS_TOOL_MAP`
```typescript
generate_copy_variants: opsGenerateCopyVariants,
compare_variants:       opsCompareVariants,
bulk_approve_drafts:    opsBulkApproveDrafts,
clone_briefing:         opsCloneBriefing,
```

---

---

# B5 — Export + Share

### Contexto
- `generate_approval_link` já existe (gera token + URL de aprovação externa)
- `job_creative_drafts` tem rota GET em `routes/jobs.ts`
- Canvas já exporta PNG/JPG via html-to-image no front
- O que falta: listar posts agendados, cancelar agendamento, exportar assets em lote, criar link de share genérico

### Arquivos a modificar
- `apps/backend/src/services/ai/toolDefinitions.ts`
- `apps/backend/src/services/ai/toolExecutor.ts`

---

### Tool 1 — `list_scheduled_posts`

**Definição**:
```json
{
  "name": "list_scheduled_posts",
  "description": "Lista posts agendados para publicação, com status, plataforma e data/hora de publicação.",
  "parameters": {
    "client_id": { "type": "string", "description": "Filtrar por cliente." },
    "status": { "type": "string", "description": "scheduled | published | failed | cancelled. Padrão: scheduled." },
    "days_ahead": { "type": "number", "description": "Quantos dias à frente incluir. Padrão: 14." }
  },
  "required": [],
  "category": "read"
}
```

**Handler**:
```typescript
async function opsListScheduledPosts(args: any, ctx: OperationsToolContext): Promise<ToolResult> {
  const clientId = contextualString(args.client_id) || contextualString((ctx as any).clientId);
  const status = contextualString(args.status) || 'scheduled';
  const daysAhead = Math.min(Number(args.days_ahead) || 14, 60);

  const { rows } = await query(
    `SELECT s.id, s.briefing_id, s.channel, s.scheduled_for, s.status,
            s.published_at, s.error_message, s.created_at,
            b.title as briefing_title, b.client_id
     FROM edro_publish_schedule s
     LEFT JOIN edro_briefings b ON b.id = s.briefing_id
     WHERE s.tenant_id = $1
       AND s.status = $2
       AND s.scheduled_for <= NOW() + ($3 || ' days')::INTERVAL
       AND ($4::text IS NULL OR b.client_id::text = $4)
     ORDER BY s.scheduled_for ASC
     LIMIT 30`,
    [ctx.tenantId, status, daysAhead, clientId || null]
  );

  return {
    success: true,
    data: {
      posts: rows.map(r => ({
        schedule_id: r.id,
        briefing_id: r.briefing_id,
        briefing_title: r.briefing_title,
        client_id: r.client_id,
        channel: r.channel,
        scheduled_for: r.scheduled_for,
        status: r.status,
        published_at: r.published_at,
        error: r.error_message,
      })),
      count: rows.length,
    },
    metadata: { row_count: rows.length }
  };
}
```

---

### Tool 2 — `cancel_scheduled_post`

**Definição**:
```json
{
  "name": "cancel_scheduled_post",
  "description": "Cancela um ou mais posts agendados. Só funciona para posts com status 'scheduled' (ainda não publicados).",
  "parameters": {
    "schedule_ids": { "type": "array", "description": "Lista de IDs de agendamentos a cancelar.", "items": { "type": "string" } },
    "confirmed": { "type": "boolean", "description": "true para confirmar o cancelamento." }
  },
  "required": ["schedule_ids"],
  "category": "action"
}
```

**Handler**:
```typescript
async function opsCancelScheduledPost(args: any, ctx: OperationsToolContext): Promise<ToolResult> {
  const scheduleIds: string[] = Array.isArray(args.schedule_ids) ? args.schedule_ids : [];
  if (!scheduleIds.length) return { success: false, error: 'Informe ao menos um schedule_id.' };

  if (ctx.explicitConfirmation !== true) {
    return buildConfirmationRequiredResult('Confirmação pendente para cancelar agendamento(s).', {
      count: scheduleIds.length,
      schedule_ids: scheduleIds,
      tool_name: 'cancel_scheduled_post',
      tool_args: { schedule_ids: scheduleIds },
      confirmation_prompt: `Confirmo o cancelamento de ${scheduleIds.length} agendamento(s).`,
    });
  }

  const { rows } = await query(
    `UPDATE edro_publish_schedule
     SET status = 'cancelled', updated_at = NOW()
     WHERE id = ANY($1::uuid[]) AND tenant_id = $2 AND status = 'scheduled'
     RETURNING id, channel, scheduled_for`,
    [scheduleIds, ctx.tenantId]
  );

  const cancelled = rows.map(r => ({ schedule_id: r.id, channel: r.channel, was_scheduled_for: r.scheduled_for }));
  const notCancelled = scheduleIds.filter(id => !rows.find(r => r.id === id));

  return {
    success: true,
    data: {
      cancelled,
      not_cancelled: notCancelled,
      message: `${cancelled.length} agendamento(s) cancelado(s).${notCancelled.length ? ` ${notCancelled.length} não encontrado(s) ou já publicado(s).` : ''}`,
    }
  };
}
```

---

### Tool 3 — `export_post_assets`

**Definição**:
```json
{
  "name": "export_post_assets",
  "description": "Retorna os URLs de download dos assets finalizados (copy + imagem) de um job ou briefing, prontos para baixar ou compartilhar.",
  "parameters": {
    "job_id": { "type": "string", "description": "ID do job." },
    "briefing_id": { "type": "string", "description": "ID do briefing (alternativa ao job_id)." },
    "status_filter": { "type": "string", "description": "Filtrar por status: approved, pending_approval, all. Padrão: approved." }
  },
  "required": [],
  "category": "read"
}
```

**Handler**:
```typescript
async function opsExportPostAssets(args: any, ctx: OperationsToolContext): Promise<ToolResult> {
  const jobId = contextualString(args.job_id);
  const briefingId = contextualString(args.briefing_id);
  const statusFilter = contextualString(args.status_filter) || 'approved';

  if (!jobId && !briefingId) return { success: false, error: 'Informe job_id ou briefing_id.' };

  const statusCondition = statusFilter === 'all'
    ? ''
    : `AND (status = '${statusFilter}' OR approval_status = '${statusFilter}')`;

  const { rows: drafts } = await query(
    `SELECT id, draft_type, type, status, approval_status,
            hook_text, content_text, cta_text,
            fal_image_url, image_url, image_urls,
            model_used, created_at, draft_approved_at
     FROM job_creative_drafts
     WHERE tenant_id = $1
       AND ($2::text IS NULL OR job_id::text = $2)
       AND ($3::text IS NULL OR briefing_id::text = $3)
       ${statusCondition}
     ORDER BY created_at DESC`,
    [ctx.tenantId, jobId || null, briefingId || null]
  );

  // Buscar copy versions também
  const { rows: copyVersions } = await query(
    `SELECT id, output, model, created_at
     FROM edro_copy_versions
     WHERE tenant_id = $1
       AND ($2::text IS NULL OR briefing_id::text = $2)
     ORDER BY created_at DESC LIMIT 5`,
    [ctx.tenantId, briefingId || null]
  );

  const assets = drafts.map(d => ({
    draft_id: d.id,
    type: d.draft_type || d.type || 'unknown',
    status: d.approval_status || d.status,
    approved_at: d.draft_approved_at,
    // Copy
    copy_text: [d.hook_text, d.content_text, d.cta_text].filter(Boolean).join('\n\n') || null,
    // Imagem
    image_url: d.fal_image_url || d.image_url || (d.image_urls?.[0]) || null,
    all_image_urls: d.image_urls || (d.fal_image_url ? [d.fal_image_url] : []),
    model: d.model_used,
    created_at: d.created_at,
  }));

  return {
    success: true,
    data: {
      job_id: jobId,
      briefing_id: briefingId,
      assets,
      copy_versions: copyVersions.map(v => ({
        copy_id: v.id,
        preview: (v.output || '').slice(0, 500),
        model: v.model,
        created_at: v.created_at,
      })),
      total_assets: assets.length,
      message: assets.length
        ? `${assets.length} asset(s) encontrado(s). Copie os image_url para download.`
        : 'Nenhum asset encontrado com o filtro informado.',
    },
    metadata: { row_count: assets.length }
  };
}
```

---

### Tool 4 — `create_share_link`

**Definição**:
```json
{
  "name": "create_share_link",
  "description": "Cria um link de aprovação externa para o cliente revisar e aprovar um briefing/conteúdo sem precisar de login. O link expira automaticamente.",
  "parameters": {
    "briefing_id": { "type": "string", "description": "ID do briefing a compartilhar." },
    "client_name": { "type": "string", "description": "Nome do cliente para personalizar a página de aprovação." },
    "expires_in_days": { "type": "number", "description": "Dias até o link expirar: 1 a 30. Padrão: 7." }
  },
  "required": ["briefing_id"],
  "category": "write"
}
```

**Handler**:
```typescript
async function opsCreateShareLink(args: any, ctx: OperationsToolContext): Promise<ToolResult> {
  const briefingId = String(args.briefing_id || '').trim();
  if (!briefingId) return { success: false, error: 'briefing_id é obrigatório.' };

  const clientName = contextualString(args.client_name);
  const expiresInDays = Math.min(Math.max(Number(args.expires_in_days) || 7, 1), 30);

  // Reutilizar a lógica de generate_approval_link que já existe
  const crypto = await import('crypto');
  const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomBytes(8).toString('hex');
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

  await query(
    `INSERT INTO edro_approval_tokens (briefing_id, token, client_name, expires_at, created_at)
     VALUES ($1::uuid, $2, $3, $4, NOW())`,
    [briefingId, token, clientName || null, expiresAt.toISOString()]
  );

  const webUrl = process.env.WEB_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://app.edro.digital';
  const approvalUrl = `${webUrl}/edro/aprovacao-externa?token=${token}`;

  return {
    success: true,
    data: {
      briefing_id: briefingId,
      approval_url: approvalUrl,
      token,
      expires_at: expiresAt.toISOString(),
      expires_in_days: expiresInDays,
      client_name: clientName || null,
      message: `Link de aprovação gerado. Válido por ${expiresInDays} dia(s). Envie via WhatsApp ou Email usando as tools correspondentes.`,
    }
  };
}
```

### Registro no `OPS_TOOL_MAP`
```typescript
list_scheduled_posts:  opsListScheduledPosts,
cancel_scheduled_post: opsCancelScheduledPost,
export_post_assets:    opsExportPostAssets,
create_share_link:     opsCreateShareLink,
```

> **Nota:** `create_share_link` é análoga à `generate_approval_link` já existente. O Codex deve verificar se é melhor reutilizar a função interna existente em vez de duplicar a lógica de token.

---

---

## Resumo de todas as migrations necessárias

| Migration | Arquivo | O que faz |
|---|---|---|
| `0335_job_creative_drafts_parent.sql` | B1 | Adiciona `parent_draft_id`, `approved_at`, `approved_by` em `job_creative_drafts` |
| `0336_briefings_recipe_fields.sql` | B2 | Adiciona `pipeline_type`, `trigger_id` em `edro_briefings` (se não existirem) |

## Resumo de todas as tools por batch

| Batch | Tool | category |
|---|---|---|
| B1 | `get_art_direction` | read |
| B1 | `generate_art_direction` | action |
| B1 | `generate_image` | action |
| B1 | `iterate_image` | action |
| B1 | `approve_image` | action |
| B2 | `list_recipes` | read |
| B2 | `get_recipe` | read |
| B2 | `create_recipe` | write |
| B2 | `apply_recipe` | write |
| B2 | `delete_recipe` | write |
| B3 | `list_platform_connections` | read |
| B3 | `get_platform_recommendations` | read |
| B3 | `schedule_to_platforms` | action |
| B4 | `generate_copy_variants` | action |
| B4 | `compare_variants` | read |
| B4 | `bulk_approve_drafts` | action |
| B4 | `clone_briefing` | write |
| B5 | `list_scheduled_posts` | read |
| B5 | `cancel_scheduled_post` | action |
| B5 | `export_post_assets` | read |
| B5 | `create_share_link` | write |

**Total: 21 novas tools**
