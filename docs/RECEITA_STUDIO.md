# Receita Completa — Studio AI-First UX + Pipeline Colaborativo com Loop de Qualidade

> **Para o Codex**: este documento descreve todas as melhorias a implementar no Creative Studio do Edro. Leia até o fim antes de começar. Cada seção tem contexto, arquivos exatos, estruturas de código e critério de conclusão.

---

## Contexto técnico obrigatório

- **Stack**: Next.js 15 App Router, React 19, TypeScript, MUI v7, Tabler Icons
- **Studio (frontend)**: `apps/web/app/studio/`
- **Backend IA**: `apps/backend/src/services/ai/`
- **Rotas backend**: `apps/backend/src/routes/edro.ts`
- **API calls**: `apiGet`, `apiPost`, `apiPatch` de `@/lib/api`
- **Estado multi-step**: `localStorage` + custom event `edro-studio-context-change`
- **Cores**: `#ff6600` (laranja primário), `#0f172a` (texto), `#13DEB9` (verde), `#5D87FF` (azul)
- **Deploy**: `railway up --service edro-web --detach` (frontend) / `railway up --service edro-backend --detach` (backend)
- **Commit**: sempre incluir `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`

---

## Arquitetura atual do Studio (não reverter)

### Fluxo de 6 passos
```
/studio/brief → /studio/platforms → /studio/editor → /studio/mockups → /studio/review → /studio/export
```

### Pipeline colaborativo atual (backend)
```
Gemini (análise, temp=0.3) → GPT-4 (criação, temp=0.7) → Claude (revisão, temp=0.4)
```
Arquivo principal: `apps/backend/src/services/ai/copyOrchestrator.ts`
Wrapper: `apps/backend/src/services/ai/copyService.ts` → `generateCollaborativeCopy()`

### Campos obrigatórios do Brief
`title`, `objective` (dropdown 5 opções), `tone` (dropdown 4 opções), `event`, `date`

### Campos opcionais do Brief
`message`, `notes`, `tags`, `categories`, `score`, `source`, `dueAt`

### Query params aceitos pelo `/studio`
`clientId`, `title`, `event`, `date`, `objective`, `message`, `tone`, `notes`, `source`, `productionType`, `ref`, `refId`

---

## TAREFA 10 — Studio AI-First UX

### Visão central

O Studio hoje é um **formulário que o usuário preenche**. A meta é transformá-lo em um **rascunho que a IA prepara e o usuário revisa**. O planner deixa de ser criador e passa a ser curador.

---

### 10.1 — Templates de entrada por tipo de campanha

**Problema**: o planner de primeiro acesso abre o Studio e vê um formulário vazio. Ele não sabe qual objetivo, tom ou plataforma escolher.

**Solução**: antes do formulário, mostrar uma tela de seleção de template que pré-configura tudo.

**Arquivo a modificar**: `apps/web/app/studio/brief/BriefClient.tsx`

Adicionar uma tela inicial (mostrada quando o formulário está vazio e sem `clientId` pré-preenchido) com 4 cards:

```tsx
const BRIEF_TEMPLATES = [
  {
    id: 'news_response',
    label: 'Resposta a Notícia',
    description: 'Urgente, editorial, baseado em acontecimento do dia',
    icon: <IconNews size={28} />,
    color: '#dc2626',
    defaults: {
      objective: 'Reconhecimento de Marca',
      tone: 'Profissional',
      platforms: ['Instagram Feed', 'LinkedIn Post'],
    },
  },
  {
    id: 'seasonal',
    label: 'Data Comemorativa',
    description: 'Planejada, sazonal, celebração ou efeméride',
    icon: <IconCalendarEvent size={28} />,
    color: '#ff6600',
    defaults: {
      objective: 'Engajamento',
      tone: 'Inspirador',
      platforms: ['Instagram Feed', 'Instagram Story'],
    },
  },
  {
    id: 'product_launch',
    label: 'Lançamento',
    description: 'Produto, serviço ou iniciativa nova',
    icon: <IconRocket size={28} />,
    color: '#5D87FF',
    defaults: {
      objective: 'Conversao',
      tone: 'Persuasivo',
      platforms: ['Instagram Feed', 'LinkedIn Post', 'Email'],
    },
  },
  {
    id: 'institutional',
    label: 'Institucional',
    description: 'Valores de marca, posicionamento, cultura',
    icon: <IconBuildingSkyscraper size={28} />,
    color: '#7c3aed',
    defaults: {
      objective: 'Reconhecimento de Marca',
      tone: 'Profissional',
      platforms: ['LinkedIn Post', 'Instagram Feed'],
    },
  },
];
```

Ao selecionar um template, pré-preencher os campos correspondentes e mostrar o formulário com os valores preenchidos. O usuário ajusta apenas o que for específico (título, evento, data).

**Critério**: tela de templates aparece ao abrir `/studio` sem contexto pré-preenchido. Selecionar template preenche objetivo, tom e sugere plataformas.

---

### 10.2 — Recuperação de rascunho em andamento

**Problema**: ao retornar ao Studio, o planner perde o trabalho anterior sem aviso.

**Arquivo a modificar**: `apps/web/app/studio/brief/BriefClient.tsx`

No `useEffect` inicial, antes de renderizar o formulário, verificar:

```tsx
useEffect(() => {
  const savedBriefingId = localStorage.getItem('edro_briefing_id');
  const savedTitle = localStorage.getItem('edro_briefing_title'); // adicionar ao salvar
  const savedStep = localStorage.getItem('edro_studio_step');    // adicionar ao navegar

  if (savedBriefingId && savedTitle && !searchParams.get('fresh')) {
    setDraftRecovery({
      id: savedBriefingId,
      title: savedTitle,
      step: savedStep || 'brief',
      stepLabel: STEP_LABELS[savedStep || 'brief'],
    });
  }
}, []);
```

Renderizar um banner antes do formulário quando `draftRecovery` existir:

```tsx
{draftRecovery && (
  <Card sx={{ mb: 3, borderColor: 'warning.main', borderWidth: 1, borderStyle: 'solid' }}>
    <CardContent sx={{ py: 1.5, display: 'flex', alignItems: 'center', gap: 2 }}>
      <IconFileText size={20} color="#d97706" />
      <Box sx={{ flex: 1 }}>
        <Typography variant="subtitle2" fontWeight={700}>Pauta em andamento</Typography>
        <Typography variant="caption" color="text.secondary">
          "{draftRecovery.title}" · {draftRecovery.stepLabel}
        </Typography>
      </Box>
      <Button size="small" variant="contained"
        href={`/studio/${draftRecovery.step}`}
        sx={{ bgcolor: '#ff6600', '&:hover': { bgcolor: '#e65c00' }, textTransform: 'none' }}>
        Continuar
      </Button>
      <Button size="small" variant="text" onClick={clearDraft} sx={{ color: 'text.secondary' }}>
        Começar nova
      </Button>
    </CardContent>
  </Card>
)}
```

**Critério**: ao abrir `/studio` com rascunho salvo, o banner aparece com título e passo atual. "Continuar" leva direto ao passo correto. "Começar nova" limpa o localStorage e mostra templates.

---

### 10.3 — Painel de contexto da fonte (clipping/oportunidade/calendário)

**Problema**: quando o usuário chega via `?ref=clipping&refId=X`, o Studio recebe os params mas não mostra o item original. O criativo fica sem o contexto que motivou a pauta.

**Arquivo a modificar**: `apps/web/app/studio/brief/BriefClient.tsx`

Quando `ref` e `refId` existem nos searchParams, fazer fetch do item de origem:

```tsx
// Mapa de endpoints por tipo de ref
const REF_ENDPOINTS: Record<string, (id: string, clientId: string) => string> = {
  clipping: (id, cid) => `/clients/${cid}/clipping/${id}`,
  opportunity: (id, cid) => `/clients/${cid}/opportunities/${id}`,
  calendar: (id, cid) => `/clients/${cid}/calendar/${id}`,
};

useEffect(() => {
  const ref = searchParams.get('ref');
  const refId = searchParams.get('refId');
  const clientId = searchParams.get('clientId');
  if (ref && refId && clientId && REF_ENDPOINTS[ref]) {
    apiGet(REF_ENDPOINTS[ref](refId, clientId))
      .then(setSourceContext)
      .catch(() => {}); // silencioso se não encontrar
  }
}, []);
```

Renderizar painel colapsável à direita do formulário (em telas largas, side-by-side; em mobile, accordion no topo):

```tsx
{sourceContext && (
  <Card sx={{ borderRadius: 2, bgcolor: 'rgba(255,102,0,0.02)', borderColor: 'rgba(255,102,0,0.15)' }}>
    <CardContent>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
        <IconLink size={16} color="#ff6600" />
        <Typography variant="caption" fontWeight={700} color="#ff6600" textTransform="uppercase">
          Origem desta pauta
        </Typography>
        <Chip size="small" label={sourceContext.source || ref} />
      </Stack>
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
        {sourceContext.title}
      </Typography>
      {sourceContext.score && (
        <Typography variant="caption" color="text.secondary">
          Score: {sourceContext.score}/10
        </Typography>
      )}
      {sourceContext.summary && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: '0.8rem' }}>
          {sourceContext.summary}
        </Typography>
      )}
      <Button
        size="small" variant="text"
        onClick={() => prefillFromSource(sourceContext)}
        sx={{ mt: 1, color: '#ff6600', textTransform: 'none', fontSize: '0.75rem' }}
        startIcon={<IconSparkles size={14} />}
      >
        Usar como base do briefing
      </Button>
    </CardContent>
  </Card>
)}
```

**Critério**: vindo de clipping, o painel mostra título + score + resumo do clipping. Botão "Usar como base" preenche `title`, `event` e `message` com dados do clipping.

---

### 10.4 — Tom automático do DNA do cliente

**Problema**: o dropdown de tom tem 4 opções genéricas. O cliente já tem um tom oficial no sistema (analytics → DNA de marca). O planner de primeiro acesso não sabe qual escolher.

**Arquivo a modificar**: `apps/web/app/studio/brief/BriefClient.tsx`

Quando `clientId` é selecionado, fazer fetch do perfil para pegar o tom:

```tsx
const loadClientDna = async (clientId: string) => {
  try {
    const profile = await apiGet<{ tone?: string; voice_profile?: string }>(
      `/clients/${clientId}/profile`
    );
    const detectedTone = profile?.tone || profile?.voice_profile;
    if (detectedTone) {
      setClientDnaTone(detectedTone);
      // Auto-preenche se campo estiver vazio
      if (!form.tone) {
        setForm(f => ({ ...f, tone: detectedTone }));
      }
    }
  } catch {}
};
```

Renderizar hint abaixo do dropdown de tom:

```tsx
{clientDnaTone && (
  <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
    <IconDna size={12} />
    DNA de {activeClient?.name}: <strong>{clientDnaTone}</strong>
    {form.tone !== clientDnaTone && (
      <Button size="small" onClick={() => setForm(f => ({ ...f, tone: clientDnaTone }))}
        sx={{ py: 0, px: 0.5, minWidth: 0, fontSize: '0.7rem' }}>
        Usar
      </Button>
    )}
  </Typography>
)}
```

**Critério**: ao selecionar um cliente, se ele tiver DNA de marca definido, o tom é pré-preenchido automaticamente com uma indicação visual de que veio do perfil do cliente.

---

### 10.5 — Deadline inteligente baseado no evento

**Problema**: o campo `dueAt` (prazo) fica vazio. O planner não sabe qual prazo faz sentido dado o evento.

**Arquivo a modificar**: `apps/web/app/studio/brief/BriefClient.tsx`

Quando o campo `date` muda, calcular sugestão de deadline:

```tsx
const suggestDeadline = (eventDateStr: string) => {
  const eventDate = new Date(eventDateStr);
  const today = new Date();
  const daysUntilEvent = Math.floor((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  // Regra: deadline = 3 dias antes do evento às 18h (ou amanhã se urgente)
  let suggestedDeadline: Date;
  if (daysUntilEvent <= 1) {
    suggestedDeadline = new Date(today.getTime() + 4 * 60 * 60 * 1000); // +4h (urgente)
  } else if (daysUntilEvent <= 5) {
    suggestedDeadline = new Date(today.getTime() + 24 * 60 * 60 * 1000); // amanhã
    suggestedDeadline.setHours(18, 0, 0, 0);
  } else {
    suggestedDeadline = new Date(eventDate.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 dias antes
    suggestedDeadline.setHours(18, 0, 0, 0);
  }

  return {
    value: suggestedDeadline.toISOString().slice(0, 16),
    label: daysUntilEvent <= 1 ? 'urgente — 4h para aprovação' : `${daysUntilEvent <= 5 ? 'amanhã' : '3 dias antes do evento'} às 18h`,
  };
};
```

Mostrar chip de sugestão ao lado do campo `dueAt`:

```tsx
{deadlineSuggestion && !form.dueAt && (
  <Chip
    size="small"
    icon={<IconClock size={12} />}
    label={`Sugerido: ${deadlineSuggestion.label}`}
    onClick={() => setForm(f => ({ ...f, dueAt: deadlineSuggestion.value }))}
    sx={{ cursor: 'pointer', fontSize: '0.7rem', bgcolor: 'rgba(255,102,0,0.08)', color: '#ff6600' }}
  />
)}
```

**Critério**: ao preencher o campo `date`, um chip sugere automaticamente um deadline. Clicar no chip preenche o campo `dueAt`.

---

### 10.6 — Widget do cliente em todas as etapas (sticky header)

**Problema**: o planner pode esquecer para qual cliente está criando ao longo das 6 etapas. DNA de marca e pilares ficam invisíveis durante o processo criativo.

**Arquivo a modificar**: `apps/web/app/studio/layout.tsx`

No header que já existe (linha ~120), expandir para incluir dados do cliente quando disponível:

```tsx
// Ler do localStorage
const clientData = useMemo(() => {
  try {
    const clients = JSON.parse(localStorage.getItem('edro_selected_clients') || '[]');
    return clients[0] || null;
  } catch { return null; }
}, []);

// Renderizar no header sticky
{clientData && (
  <Stack direction="row" spacing={1.5} alignItems="center"
    sx={{ px: 2, py: 0.75, bgcolor: 'rgba(255,102,0,0.04)', borderRadius: 1, border: '1px solid rgba(255,102,0,0.12)' }}>
    <Avatar sx={{ width: 24, height: 24, bgcolor: '#ff6600', fontSize: '0.7rem' }}>
      {clientData.name?.[0]}
    </Avatar>
    <Typography variant="caption" fontWeight={700}>{clientData.name}</Typography>
    {clientData.tone && (
      <Chip size="small" label={clientData.tone} sx={{ fontSize: '0.65rem', height: 18 }} />
    )}
    {clientData.pillars?.slice(0, 2).map((p: string) => (
      <Chip key={p} size="small" label={p}
        sx={{ fontSize: '0.65rem', height: 18, bgcolor: 'rgba(255,102,0,0.08)', color: '#ff6600' }} />
    ))}
    <Link href={`/clients/${clientData.id}`} target="_blank">
      <IconExternalLink size={12} color="#94a3b8" />
    </Link>
  </Stack>
)}
```

**Critério**: em todas as etapas do Studio, um mini-banner no header mostra nome do cliente, tom e até 2 pilares. Clicável para abrir o perfil em nova aba.

---

### 10.7 — Plataformas AI-First (recomendação como padrão)

**Problema**: o fluxo de plataformas tem 3 sub-passos (área → plataforma → formato). A recomendação da IA é uma opção secundária, não o padrão.

**Arquivo a modificar**: `apps/web/app/studio/platforms/PlatformClient.tsx`

Mudar a tela inicial do passo 2 para mostrar a recomendação da IA como destaque principal. A chamada a `/recommendations/enxoval` já existe — apenas reorganizar a UI:

```tsx
// Estado: 'loading' | 'ai_recommendation' | 'manual_selection'
const [viewMode, setViewMode] = useState<'loading' | 'ai_recommendation' | 'manual'>('loading');

// Ao receber recomendação, mostrar em modo AI primeiro
useEffect(() => {
  if (recommendations?.recommended_formats?.length > 0) {
    setViewMode('ai_recommendation');
    // Auto-selecionar os top 3 por score
    const top3 = recommendations.recommended_formats
      .sort((a, b) => b.recommendation_score - a.recommendation_score)
      .slice(0, 3);
    setSelectedFormats(top3.map(f => ({ ...f, source: 'ai' })));
  }
}, [recommendations]);
```

Na tela `ai_recommendation`, mostrar cards das recomendações como destaque com os `recommendation_reasons`:

```tsx
// Summary da recomendação no topo
{recommendations?.summary && (
  <Box sx={{ mb: 2, p: 1.5, bgcolor: 'rgba(255,102,0,0.04)', borderRadius: 2 }}>
    <Stack direction="row" spacing={3}>
      <Box>
        <Typography variant="caption" color="text.secondary">Custo estimado</Typography>
        <Typography variant="subtitle2" fontWeight={700}>
          R$ {recommendations.summary.total_estimated_cost?.toLocaleString('pt-BR') || '—'}
        </Typography>
      </Box>
      <Box>
        <Typography variant="caption" color="text.secondary">Prazo estimado</Typography>
        <Typography variant="subtitle2" fontWeight={700}>
          {recommendations.summary.total_estimated_days || '—'} dias úteis
        </Typography>
      </Box>
    </Stack>
  </Box>
)}

// Cards das recomendações
{recommendations.recommended_formats.map((fmt) => (
  <Card key={fmt.format_id} sx={{ mb: 1, cursor: 'pointer',
    borderColor: selectedIds.includes(fmt.format_id) ? '#ff6600' : 'divider',
    borderWidth: selectedIds.includes(fmt.format_id) ? 1.5 : 1 }}
    onClick={() => toggleFormat(fmt)}>
    <CardContent sx={{ py: 1.5 }}>
      <Stack direction="row" alignItems="center" spacing={2}>
        <Checkbox checked={selectedIds.includes(fmt.format_id)} sx={{ p: 0, color: '#ff6600' }} />
        <Box sx={{ flex: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="subtitle2" fontWeight={700}>{fmt.format_name}</Typography>
            <Chip size="small" label={fmt.platform} />
            <Chip size="small" label={`Score ${fmt.recommendation_score.toFixed(1)}`}
              sx={{ bgcolor: fmt.recommendation_score >= 8.5 ? '#dcfce7' : '#fef9c3',
                    color: fmt.recommendation_score >= 8.5 ? '#16a34a' : '#854d0e' }} />
          </Stack>
          {fmt.recommendation_reasons?.[0] && (
            <Typography variant="caption" color="text.secondary">
              {fmt.recommendation_reasons[0]}
            </Typography>
          )}
        </Box>
      </Stack>
    </CardContent>
  </Card>
))}

// Botão principal
<Button fullWidth variant="contained" size="large"
  onClick={handleUseRecommendation}
  disabled={selectedFormats.length === 0}
  sx={{ mt: 2, bgcolor: '#ff6600', '&:hover': { bgcolor: '#e65c00' } }}>
  Usar {selectedFormats.length} formato{selectedFormats.length !== 1 ? 's' : ''} selecionado{selectedFormats.length !== 1 ? 's' : ''}
</Button>
<Button fullWidth variant="text" onClick={() => setViewMode('manual')} sx={{ mt: 1, color: 'text.secondary' }}>
  Personalizar manualmente
</Button>
```

**Critério**: ao chegar no passo 2, a IA carrega e exibe as recomendações com score e razão. Os top 3 ficam pré-selecionados. Um clique avança para o passo seguinte.

---

### 10.8 — Editor: eliminar pipeline e task type da interface

**Problema**: dropdowns de "pipeline" e "task type" são jargão interno. O planner de primeiro acesso não sabe a diferença entre `collaborative` e `premium`, nem entre `social_post` e `variations`.

**Arquivo a modificar**: `apps/web/app/studio/editor/EditorClient.tsx`

Remover os dropdowns de `pipeline` e `taskType` da interface. Selecionar automaticamente:

```tsx
// Auto-seleção de pipeline baseada em contexto
const autoSelectPipeline = (dueAt: string | null, clientTier: string): string => {
  const hoursUntilDue = dueAt
    ? (new Date(dueAt).getTime() - Date.now()) / (1000 * 60 * 60)
    : 999;

  if (hoursUntilDue < 4) return 'simple';      // urgente → rápido
  if (clientTier === 'premium') return 'collaborative'; // premium → melhor
  return 'standard';                             // default
};

// Auto-seleção de task type baseada no formato
const autoSelectTaskType = (platform: string, format: string): string => {
  if (format.toLowerCase().includes('reels') || format.toLowerCase().includes('tiktok')) {
    return 'campaign_strategy'; // vídeo → estratégia de roteiro
  }
  if (platform === 'LinkedIn' || format.toLowerCase().includes('institucional')) {
    return 'institutional_copy';
  }
  if (format.toLowerCase().includes('headline') || format.toLowerCase().includes('ooh')) {
    return 'headlines';
  }
  return 'social_post'; // padrão
};
```

Mostrar apenas como informação (não como controle):

```tsx
<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
  <IconSparkles size={14} color="#94a3b8" />
  <Typography variant="caption" color="text.secondary">
    Pipeline: <strong>{PIPELINE_LABELS[selectedPipeline]}</strong>
    {selectedPipeline === 'collaborative' && ' · Gemini → GPT-4 → Claude'}
  </Typography>
  <Tooltip title="O pipeline é selecionado automaticamente baseado no prazo e tipo de cliente">
    <IconHelp size={12} color="#94a3b8" style={{ cursor: 'help' }} />
  </Tooltip>
</Stack>
```

**Critério**: dropdowns de pipeline e task type não aparecem. Um texto informativo mostra qual pipeline foi selecionado automaticamente e por quê.

---

### 10.9 — Editor: geração automática ao chegar no passo

**Problema**: o usuário chega no step 3 e precisa clicar "Gerar" para iniciar. Para o primeiro formato, a geração deveria começar automaticamente.

**Arquivo a modificar**: `apps/web/app/studio/editor/EditorClient.tsx`

No `useEffect` que roda ao montar o componente (após carregar briefing e inventário):

```tsx
useEffect(() => {
  // Gerar automaticamente se:
  // 1. Há um formato ativo selecionado
  // 2. Não há copy já gerada para esse formato
  // 3. Não está já gerando
  if (activeFormat && !hasExistingCopy(activeFormat) && !generating) {
    handleGenerate(); // função que já existe
  }
}, [activeFormat, briefingLoaded]);
```

Mostrar skeleton loading enquanto gera:

```tsx
{generating && (
  <Box sx={{ p: 3 }}>
    <Stack spacing={2}>
      <Skeleton variant="text" width="60%" height={28} />
      <Skeleton variant="rectangular" height={80} />
      <Skeleton variant="text" width="40%" height={20} />
    </Stack>
    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2 }}>
      <CircularProgress size={14} sx={{ color: '#ff6600' }} />
      <Typography variant="caption" color="text.secondary">
        {pipelineStage === 'gemini' && 'Gemini analisando briefing...'}
        {pipelineStage === 'openai' && 'GPT-4 criando variações...'}
        {pipelineStage === 'claude' && 'Claude revisando qualidade...'}
      </Typography>
    </Stack>
  </Box>
)}
```

**Critério**: ao chegar no passo 3, a copy começa a ser gerada automaticamente para o primeiro formato, com skeleton + indicação de qual IA está trabalhando.

---

### 10.10 — Editor: 3 opções em cards comparáveis com Quality Score

**Problema**: as 3 opções geradas são exibidas como lista de texto. Difícil comparar. Não há indicação de qual é melhor ou por quê.

**Arquivo a modificar**: `apps/web/app/studio/editor/EditorClient.tsx`

Substituir a lista atual por cards lado a lado (scrollable horizontal em mobile):

```tsx
<Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 1 }}>
  {copyOptions.map((option, idx) => {
    const score = qualityScores?.[idx];
    const isSelected = selectedOptionIdx === idx;

    return (
      <Card key={idx} sx={{
        minWidth: 280, flex: '0 0 280px',
        borderColor: isSelected ? '#ff6600' : 'divider',
        borderWidth: isSelected ? 2 : 1,
        cursor: 'pointer',
        transition: 'all 0.2s',
      }} onClick={() => setSelectedOptionIdx(idx)}>
        <CardContent>
          {/* Header com score */}
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary">
              Opção {idx + 1}
            </Typography>
            {score && (
              <Chip size="small"
                label={`${score.overall.toFixed(1)}/10`}
                sx={{
                  bgcolor: score.overall >= 8.5 ? '#dcfce7' : score.overall >= 7 ? '#fef9c3' : '#fee2e2',
                  color: score.overall >= 8.5 ? '#16a34a' : score.overall >= 7 ? '#854d0e' : '#dc2626',
                  fontWeight: 700, fontSize: '0.7rem',
                }} />
            )}
          </Stack>

          {/* Conteúdo da copy */}
          {option.title && (
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
              {option.title}
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary" sx={{
            fontSize: '0.8rem', display: '-webkit-box',
            WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden', mb: 1,
          }}>
            {option.body}
          </Typography>
          {option.cta && (
            <Typography variant="caption" sx={{ color: '#ff6600', fontWeight: 600 }}>
              CTA: {option.cta}
            </Typography>
          )}

          {/* Quality bars (se disponível) */}
          {score && (
            <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
              {[
                { label: 'DNA', value: score.brand_dna_match },
                { label: 'Plataforma', value: score.platform_fit },
                { label: 'CTA', value: score.cta_clarity },
              ].map(({ label, value }) => (
                <Stack key={label} direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ minWidth: 56, fontSize: '0.65rem' }}>
                    {label}
                  </Typography>
                  <LinearProgress variant="determinate" value={value * 10}
                    sx={{ flex: 1, height: 4, borderRadius: 2,
                          '& .MuiLinearProgress-bar': { bgcolor: value >= 8 ? '#13DEB9' : value >= 6.5 ? '#FFAE1F' : '#FA896B' }}} />
                  <Typography variant="caption" sx={{ fontSize: '0.65rem', minWidth: 22 }}>
                    {value.toFixed(1)}
                  </Typography>
                </Stack>
              ))}
            </Box>
          )}

          {/* Ações inline */}
          <Stack direction="row" spacing={0.5} sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap>
            {[
              { label: 'Formal', instruction: 'Reescreva com tom mais formal e corporativo' },
              { label: 'Curto', instruction: 'Reduza em 30%, mantenha o impacto' },
              { label: '+ CTA', instruction: 'Adicione um CTA mais específico e acionável' },
            ].map(({ label, instruction }) => (
              <Chip key={label} size="small" label={label}
                onClick={(e) => { e.stopPropagation(); handleAdjust(idx, instruction); }}
                sx={{ fontSize: '0.65rem', height: 20, cursor: 'pointer',
                      '&:hover': { bgcolor: 'rgba(255,102,0,0.08)' } }} />
            ))}
          </Stack>

          {/* Botão selecionar */}
          <Button fullWidth size="small" variant={isSelected ? 'contained' : 'outlined'}
            sx={{ mt: 1.5, textTransform: 'none', fontSize: '0.75rem',
                  ...(isSelected ? { bgcolor: '#ff6600', '&:hover': { bgcolor: '#e65c00' } } : {}) }}
            onClick={() => setSelectedOptionIdx(idx)}>
            {isSelected ? '✓ Selecionada' : 'Selecionar'}
          </Button>
        </CardContent>
      </Card>
    );
  })}
</Box>
```

**Critério**: as opções aparecem como cards horizontais comparáveis. Cada card tem score geral, barras das 3 dimensões principais, e chips de ajuste rápido.

---

### 10.11 — Editor: Modo Script para vídeo

**Problema**: quando o formato é Reels, TikTok ou YouTube, o editor mostra um campo de texto genérico. Vídeo tem estrutura específica (hook + corpo + CTA com durações).

**Arquivo a modificar**: `apps/web/app/studio/editor/EditorClient.tsx`

Detectar quando o formato ativo é vídeo:

```tsx
const isVideoFormat = (format: string): boolean => {
  const videoKeywords = ['reels', 'tiktok', 'youtube', 'video', 'vídeo', 'motion', 'roteiro'];
  return videoKeywords.some(k => format.toLowerCase().includes(k));
};
```

Quando é vídeo, mostrar o copy em seções com duração:

```tsx
{isVideoFormat(activeFormat) && parsedVideoScript ? (
  <Box>
    {[
      { key: 'hook', label: 'HOOK', duration: '0–3s', color: '#dc2626',
        hint: 'Primeira frase deve parar o scroll imediatamente' },
      { key: 'body', label: 'CORPO', duration: '3–25s', color: '#5D87FF',
        hint: 'Desenvolvimento da mensagem com valor claro' },
      { key: 'cta', label: 'CTA', duration: '25–30s', color: '#13DEB9',
        hint: 'Ação específica que o espectador deve tomar' },
    ].map(({ key, label, duration, color, hint }) => (
      <Box key={key} sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
          <Chip size="small" label={label}
            sx={{ bgcolor: color, color: 'white', fontWeight: 700, fontSize: '0.65rem' }} />
          <Chip size="small" label={duration}
            sx={{ bgcolor: 'action.hover', fontSize: '0.65rem' }} />
          <Typography variant="caption" color="text.secondary">{hint}</Typography>
        </Stack>
        <TextField
          fullWidth multiline
          value={parsedVideoScript[key] || ''}
          onChange={(e) => updateVideoScript(key, e.target.value)}
          sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.85rem' } }}
        />
      </Box>
    ))}
  </Box>
) : (
  // Renderização padrão de copy
  <CopyDisplay options={copyOptions} />
)}
```

**Critério**: quando o formato ativo é vídeo (Reels, TikTok, YouTube), o editor exibe 3 campos separados com rótulo, duração e hint. A IA gera nessa estrutura quando `task_type === 'campaign_strategy'`.

---

### 10.12 — Gerador de prompt de imagem (Midjourney/DALL-E)

**Problema**: sem imagem, o mockup fica vazio ou usa placeholder. O planner não sabe criar prompts para IA de imagem.

**Arquivo a modificar**: `apps/web/app/studio/mockups/page.tsx`

Quando o briefing não tem `creative_image_url`, mostrar botão no painel de mockup:

```tsx
{!creativeImageUrl && (
  <Card sx={{ mb: 2, borderStyle: 'dashed', borderColor: 'divider' }}>
    <CardContent sx={{ textAlign: 'center', py: 2 }}>
      <IconPhoto size={32} color="#94a3b8" style={{ marginBottom: 8 }} />
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Nenhuma imagem adicionada
      </Typography>
      <Button size="small" variant="outlined"
        onClick={handleGenerateImagePrompt}
        disabled={generatingPrompt}
        startIcon={generatingPrompt ? <CircularProgress size={14} /> : <IconSparkles size={14} />}
        sx={{ borderColor: '#ff6600', color: '#ff6600', textTransform: 'none', fontSize: '0.75rem' }}>
        Gerar prompt para Midjourney / DALL-E
      </Button>
    </CardContent>
  </Card>
)}

{imagePrompt && (
  <Card sx={{ mb: 2, bgcolor: 'rgba(93,135,255,0.04)' }}>
    <CardContent>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Typography variant="caption" fontWeight={700} color="#5D87FF" sx={{ mb: 1, display: 'block' }}>
          PROMPT GERADO
        </Typography>
        <IconButton size="small" onClick={() => copyToClipboard(imagePrompt)}>
          <IconCopy size={14} />
        </IconButton>
      </Stack>
      <Typography variant="body2" sx={{ fontSize: '0.8rem', fontFamily: 'monospace', lineHeight: 1.6 }}>
        {imagePrompt}
      </Typography>
    </CardContent>
  </Card>
)}
```

A função `handleGenerateImagePrompt` chama:
```tsx
const handleGenerateImagePrompt = async () => {
  setGeneratingPrompt(true);
  const res = await apiPost('/ai/image-prompt', {
    client_id: clientId,
    brief: briefingTitle,
    platform: activePlatform,
    format: activeFormat,
    event: briefingEvent,
    brand_colors: clientBrandColors, // do DNA do cliente
  });
  setImagePrompt(res.prompt);
  setGeneratingPrompt(false);
};
```

**Backend**: criar endpoint `POST /ai/image-prompt` que usa Claude para gerar prompt de imagem otimizado. Ver Tarefa 11 para padrão de chamada ao Claude.

**Critério**: no passo de mockups, se não há imagem, aparece botão. Ao clicar, gera um prompt profissional com o contexto do cliente (cores, evento, formato, proporção).

---

### 10.13 — Revisão: Sumário de qualidade gerado por IA

**Problema**: o passo de revisão não tem contexto analítico. O planner precisa avaliar sozinho se a copy está boa.

**Arquivo a modificar**: `apps/web/app/studio/review/ReviewClient.tsx`

Ao carregar o passo de revisão, fazer uma análise rápida dos mockups aprovados:

```tsx
useEffect(() => {
  if (approvedMockups.length > 0 && briefing) {
    apiPost('/ai/review-summary', {
      briefing_id: briefing.id,
      client_id: briefing.client_id,
      copies: approvedMockups.map(m => m.metadata?.copy),
    }).then(setAiReview).catch(() => {});
  }
}, [approvedMockups]);
```

Renderizar o sumário antes da lista de mockups:

```tsx
{aiReview && (
  <Card sx={{ mb: 3, bgcolor: 'rgba(19,222,185,0.04)', borderColor: 'rgba(19,222,185,0.2)' }}>
    <CardContent>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
        <IconSparkles size={16} color="#13DEB9" />
        <Typography variant="subtitle2" fontWeight={700}>Análise da IA</Typography>
        <Chip size="small" label={`${aiReview.overall_score}/10`}
          sx={{ bgcolor: '#13DEB9', color: 'white', fontWeight: 700, fontSize: '0.7rem' }} />
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {aiReview.summary}
      </Typography>
      {aiReview.warnings?.map((w: string, i: number) => (
        <Stack key={i} direction="row" spacing={0.5} alignItems="flex-start" sx={{ mb: 0.5 }}>
          <IconAlertTriangle size={14} color="#d97706" style={{ marginTop: 2, flexShrink: 0 }} />
          <Typography variant="caption" color="text.secondary">{w}</Typography>
        </Stack>
      ))}
    </CardContent>
  </Card>
)}
```

**Backend**: criar endpoint `POST /ai/review-summary` que usa Claude para analisar copies contra o DNA do cliente e retornar `{ overall_score, summary, warnings[] }`.

**Critério**: ao chegar no passo de revisão, um card analítico aparece com score geral, resumo em português e lista de pontos de atenção.

---

### 10.14 — Exportar: Email de aprovação auto-redigido

**Problema**: para enviar a pauta ao cliente, o planner precisa escrever um email do zero. O sistema tem todos os dados para escrever por ele.

**Arquivo a modificar**: `apps/web/app/studio/export/ExportClient.tsx`

Adicionar seção "Enviar para aprovação" antes do download:

```tsx
<Card sx={{ mb: 3 }}>
  <CardContent>
    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
      <IconMail size={18} color="#ff6600" />
      <Typography variant="subtitle2" fontWeight={700}>Enviar para aprovação</Typography>
    </Stack>

    {!emailDraft ? (
      <Button variant="outlined" onClick={handleGenerateEmailDraft}
        disabled={generatingEmail}
        startIcon={generatingEmail ? <CircularProgress size={14} /> : <IconSparkles size={14} />}
        sx={{ borderColor: '#ff6600', color: '#ff6600', textTransform: 'none' }}>
        Gerar email de aprovação
      </Button>
    ) : (
      <Box>
        <TextField
          fullWidth label="Assunto" value={emailDraft.subject}
          onChange={(e) => setEmailDraft(d => ({ ...d!, subject: e.target.value }))}
          sx={{ mb: 1.5 }} size="small" />
        <TextField
          fullWidth multiline rows={6} label="Corpo do email" value={emailDraft.body}
          onChange={(e) => setEmailDraft(d => ({ ...d!, body: e.target.value }))}
          sx={{ mb: 1.5 }} size="small" />
        <Stack direction="row" spacing={1}>
          <Button variant="contained"
            onClick={() => apiPost(`/edro/briefings/${briefing?.id}/send-email`, emailDraft)}
            sx={{ bgcolor: '#ff6600', '&:hover': { bgcolor: '#e65c00' }, textTransform: 'none' }}>
            Enviar email
          </Button>
          <Button variant="text" onClick={() => copyToClipboard(emailDraft.body)}
            sx={{ textTransform: 'none', color: 'text.secondary' }}>
            Copiar texto
          </Button>
        </Stack>
      </Box>
    )}
  </CardContent>
</Card>
```

**Critério**: no passo de exportar, botão gera rascunho de email com assunto, corpo com contexto da pauta e prazo. Editável antes de enviar.

---

## TAREFA 11 — Pipeline IA Colaborativo com Loop de Qualidade

### Visão central

O pipeline colaborativo atual (Gemini → GPT-4 → Claude) é uma **linha de produção linear**. O que precisamos é de uma **parceria real**, onde:
- Claude pode reprovar e devolver ao GPT-4
- GPT-4 revisa com base em crítica estruturada, não reescreve às cegas
- O resultado nunca chega ao usuário com score abaixo de 7.5
- O planner vê o raciocínio de cada IA, não só o resultado final

---

### 11.1 — Nova arquitetura do pipeline

```
[1] Gemini — Estrategista (temp=0.3)
    Input: briefing + DNA cliente + formato + restrições
    Output: JSON com approval_checklist + direção criativa

[2] GPT-4 — Criativo (temp=0.75)
    Input: briefing + JSON do Gemini
    Output: 3 variações (título + corpo + CTA + hashtags)

[3] Claude — Gate de Qualidade (temp=0.3) ← ENHANCED
    Input: variações + approval_checklist do Gemini + DNA cliente
    Output: JSON com quality_scores[] + needs_revision + revision_instructions

[2b] GPT-4 — Revisão Cirúrgica (temp=0.5) ← NEW (condicional)
    Input: melhor variação + revision_instructions do Claude
    Output: 1 variação revisada com cada problema resolvido

[3b] Claude — Aprovação Final (temp=0.3) ← NEW (condicional)
    Input: variação revisada + scores anteriores
    Output: quality_scores atualizados + approved: true/false

Loop máximo: 2 ciclos. Se após 2 ciclos ainda não aprovado → retorna com flag de aviso.
```

---

### 11.2 — Mudanças no backend

#### Arquivo: `apps/backend/src/services/ai/copyOrchestrator.ts`

**Adicionar tipos:**

```typescript
export type QualityScore = {
  variation_index: number;
  scores: {
    brand_dna_match: number;    // 0–10: alinhamento com DNA do cliente
    platform_fit: number;       // 0–10: formato, limite de chars, CTA
    cta_clarity: number;        // 0–10: ação específica e clara
    message_clarity: number;    // 0–10: uma mensagem principal sem ruído
    originality: number;        // 0–10: não genérico, não clichê
  };
  overall: number;              // média ponderada
  pass: boolean;                // overall >= 7.5 AND nenhuma dimensão < 6.0
  issues: string[];             // lista de problemas específicos
};

export type CollaborativeLoopResult = CollaborativePipelineResult & {
  quality_scores: QualityScore[];
  best_variation_index: number;
  revision_count: number;       // quantos loops aconteceram (0, 1 ou 2)
  revision_history: Array<{
    loop: number;
    issues_raised: string[];
    score_before: number;
    score_after: number;
  }>;
  approval_checklist: ChecklistItem[]; // do Gemini
};

type ChecklistItem = {
  id: string;
  rule: string;
  weight: 'critical' | 'high' | 'medium';
};
```

**Modificar `runCollaborativePipeline` para aceitar `maxLoops`:**

```typescript
export async function runCollaborativePipelineWithLoop(params: {
  analysisPrompt: string;
  creativePrompt: (analysisOutput: string) => string;
  reviewPrompt: (analysisOutput: string, creativeOutput: string) => string;
  revisionPrompt: (bestVariation: string, issues: string[]) => string; // NOVO
  finalReviewPrompt: (revisedVariation: string, previousScores: QualityScore) => string; // NOVO
  maxLoops?: number; // padrão: 2
  usageContext?: UsageContext;
}): Promise<CollaborativeLoopResult>
```

**Lógica do loop (pseudocódigo):**

```typescript
// Stage 1: Gemini analysis (existente)
const analysisOutput = await callProvider('gemini', { prompt: params.analysisPrompt, temp: 0.3 });

// Stage 2: GPT-4 creative (existente)
const creativeOutput = await callProvider('openai', { prompt: params.creativePrompt(analysisOutput), temp: 0.75 });

// Stage 3: Claude quality gate (ENHANCED — retorna JSON estruturado)
const reviewOutput = await callProvider('claude', {
  prompt: params.reviewPrompt(analysisOutput, creativeOutput),
  temp: 0.3,
});

let qualityData = parseQualityJson(reviewOutput);
let currentBest = extractBestVariation(creativeOutput, qualityData.best_variation_index);
let revisionCount = 0;
const revisionHistory = [];

// Loop de revisão (max maxLoops vezes)
while (!qualityData.scores[qualityData.best_variation_index]?.pass && revisionCount < (params.maxLoops ?? 2)) {
  const issues = qualityData.scores[qualityData.best_variation_index]?.issues ?? [];

  // Stage 2b: GPT-4 revisão cirúrgica
  const revisedOutput = await callProvider('openai', {
    prompt: params.revisionPrompt(currentBest, issues),
    temp: 0.5,
  });

  const scoreBefore = qualityData.scores[qualityData.best_variation_index]?.overall ?? 0;

  // Stage 3b: Claude aprovação final
  const finalReviewOutput = await callProvider('claude', {
    prompt: params.finalReviewPrompt(revisedOutput, qualityData.scores[qualityData.best_variation_index]),
    temp: 0.3,
  });

  const updatedScores = parseQualityJson(finalReviewOutput);
  revisionHistory.push({
    loop: revisionCount + 1,
    issues_raised: issues,
    score_before: scoreBefore,
    score_after: updatedScores.scores[0]?.overall ?? 0,
  });

  qualityData = updatedScores;
  currentBest = revisedOutput;
  revisionCount++;
}

return {
  output: currentBest,
  quality_scores: qualityData.scores,
  best_variation_index: qualityData.best_variation_index,
  revision_count: revisionCount,
  revision_history: revisionHistory,
  // ... outros campos existentes
};
```

---

#### Arquivo: `apps/backend/src/services/ai/copyService.ts`

**Modificar `generateCollaborativeCopy` para usar o novo pipeline com loop:**

**Novo `buildAnalysisPrompt` (Gemini) — adicionar `approval_checklist`:**

```typescript
const buildAnalysisPrompt = (params: GenerateCollaborativeCopyParams) => `
Você é um estrategista de comunicação sênior de uma agência de publicidade.
Analise o briefing e o perfil do cliente abaixo.
Retorne APENAS um JSON válido com esta estrutura exata:

{
  "target_audience": "descrição do público ideal",
  "ideal_tone": "tom recomendado baseado na marca e formato",
  "key_hooks": ["3 a 5 ganchos criativos relevantes e específicos"],
  "cultural_references": ["referências culturais ou de momento oportunas"],
  "mandatory_elements": ["elementos que DEVEM aparecer obrigatoriamente"],
  "restrictions": ["o que evitar, termos proibidos, armadilhas de tom"],
  "platform_best_practices": "melhores práticas para o formato/plataforma em 2 frases",
  "creative_direction": "direção criativa sugerida em 2–3 frases",
  "approval_checklist": [
    {
      "id": "tone_check",
      "rule": "descrever a regra de tom obrigatória",
      "weight": "critical"
    },
    {
      "id": "cta_required",
      "rule": "a copy deve ter um CTA específico e acionável",
      "weight": "high"
    },
    {
      "id": "pillar_alignment",
      "rule": "mencionar ao menos 1 dos pilares do cliente",
      "weight": "high"
    },
    {
      "id": "char_limit",
      "rule": "respeitar limite de caracteres do formato",
      "weight": "medium"
    }
  ]
}

BRIEFING:
${params.prompt}

${params.knowledgeBlock ? `PERFIL DO CLIENTE:\n${params.knowledgeBlock}` : ''}
${params.instructions ? `INSTRUÇÕES ADICIONAIS:\n${params.instructions}` : ''}
`;
```

**Novo `buildReviewPrompt` (Claude) — retorna JSON estruturado de scores:**

```typescript
const buildReviewPrompt = (analysisOutput: string, creativeOutput: string) => `
Você é o editor-chefe de uma agência de comunicação de alto nível.
Avalie cada variação de copy abaixo com rigor editorial.

APPROVAL CHECKLIST (extraído da análise estratégica):
${extractChecklistFromAnalysis(analysisOutput)}

Para CADA variação, retorne um JSON com esta estrutura exata:
{
  "quality_scores": [
    {
      "variation_index": 0,
      "scores": {
        "brand_dna_match": 8.5,
        "platform_fit": 9.0,
        "cta_clarity": 7.0,
        "message_clarity": 8.5,
        "originality": 8.0
      },
      "overall": 8.2,
      "pass": true,
      "issues": ["lista de problemas específicos se houver"]
    }
  ],
  "best_variation_index": 2,
  "needs_revision": false,
  "revision_instructions": null
}

Critério de aprovação (pass=true): overall >= 7.5 E nenhuma dimensão < 6.0.
Se needs_revision=true, revision_instructions deve ser uma lista de ações específicas para o GPT-4 executar.

VARIAÇÕES GERADAS:
${creativeOutput}

DIREÇÃO ESTRATÉGICA:
${analysisOutput}
`;
```

**Novo `buildRevisionPrompt` (GPT-4) — revisão cirúrgica com base na crítica:**

```typescript
const buildRevisionPrompt = (bestVariation: string, issues: string[]) => `
Você é um redator criativo revisando sua própria copy com base em feedback específico do editor.
Reescreva a copy abaixo corrigindo TODOS os problemas listados. Mantenha o que está bom.

COPY ATUAL:
${bestVariation}

PROBLEMAS A CORRIGIR (obrigatório resolver todos):
${issues.map((issue, i) => `${i + 1}. ${issue}`).join('\n')}

Retorne APENAS a copy revisada no mesmo formato (título / corpo / CTA / hashtags).
Não adicione explicações.
`;
```

**Novo `buildFinalReviewPrompt` (Claude) — aprovação da versão revisada:**

```typescript
const buildFinalReviewPrompt = (revisedVariation: string, previousScore: QualityScore) => `
Você é o editor-chefe avaliando uma copy revisada que anteriormente teve score ${previousScore.overall.toFixed(1)}/10.

Os problemas identificados anteriormente eram:
${previousScore.issues.map(i => `- ${i}`).join('\n')}

Avalie se a versão revisada resolveu os problemas. Retorne JSON:
{
  "quality_scores": [{
    "variation_index": 0,
    "scores": { "brand_dna_match": X, "platform_fit": X, "cta_clarity": X, "message_clarity": X, "originality": X },
    "overall": X,
    "pass": true/false,
    "issues": ["problemas restantes se houver"]
  }],
  "best_variation_index": 0,
  "needs_revision": false,
  "revision_instructions": null
}

COPY REVISADA:
${revisedVariation}
`;
```

---

#### Arquivo: `apps/backend/src/routes/edro.ts`

No handler do `POST /edro/briefings/:id/copy`, quando `pipeline === 'collaborative'`, trocar para o novo pipeline com loop e incluir `quality_scores` no retorno:

```typescript
if (pipeline === 'collaborative') {
  const loopResult = await generateCollaborativeCopyWithLoop({
    prompt,
    count,
    knowledgeBlock,
    reporteiHint,
    clientName,
    instructions,
    maxLoops: 2,
    usageContext: usageCtx,
  });

  result = {
    output: loopResult.output,
    model: loopResult.model,
    payload: {
      ...loopResult.payload,
      quality_scores: loopResult.quality_scores,
      revision_count: loopResult.revision_count,
      revision_history: loopResult.revision_history,
      approval_checklist: loopResult.approval_checklist,
      _pipeline: 'collaborative_loop',
    },
  };
}
```

---

### 11.3 — Modo Adversarial (3 IAs independentes + síntese)

Para campanhas estratégicas importantes, cada IA gera com perspectiva diferente antes de Claude sintetizar.

**Arquivo**: `apps/backend/src/services/ai/copyService.ts`

```typescript
export async function generateAdversarialCopy(params: {
  prompt: string;
  knowledgeBlock?: string;
  usageContext?: UsageContext;
}): Promise<AdversarialCopyResult> {

  // As 3 IAs geram em paralelo com personas diferentes
  const [geminiOutput, openaiOutput, claudeOutput] = await Promise.all([
    // Gemini: perspectiva "data-driven e tendências"
    callProvider('gemini', {
      prompt: `Você é um estrategista de comunicação orientado a dados e tendências culturais.
      Crie 1 versão de copy que seja fortemente embasada em dados, tendências atuais e contexto cultural do momento.
      Formato: título / corpo / CTA / hashtags.

      BRIEFING:
      ${params.prompt}
      ${params.knowledgeBlock || ''}`,
      temperature: 0.5,
    }),

    // GPT-4: perspectiva "bold creative e inesperado"
    callProvider('openai', {
      prompt: `Você é um diretor criativo premiado que pensa fora do óbvio.
      Crie 1 versão de copy que seja surpreendente, ousada, memorável — quebrando o padrão esperado do segmento.
      Formato: título / corpo / CTA / hashtags.

      BRIEFING:
      ${params.prompt}
      ${params.knowledgeBlock || ''}`,
      temperature: 0.85,
    }),

    // Claude: perspectiva "brand guardian — 100% alinhado ao DNA"
    callProvider('claude', {
      prompt: `Você é o guardião da marca de um cliente exigente.
      Crie 1 versão de copy que seja 100% alinhada ao DNA da marca, segura, precisa e sem riscos.
      Formato: título / corpo / CTA / hashtags.

      BRIEFING:
      ${params.prompt}
      ${params.knowledgeBlock || ''}`,
      temperature: 0.35,
    }),
  ]);

  // Claude sintetiza o melhor de cada versão
  const synthesisOutput = await callProvider('claude', {
    prompt: `Você é o editor-chefe recebendo 3 versões de copy criadas por estrategistas diferentes.
    Analise as 3 versões e crie uma SÍNTESE que combine os melhores elementos de cada uma.
    Explique brevemente (1 frase por versão) o que foi aproveitado de cada perspectiva.

    VERSÃO ESTRATEGISTA (dados e tendências):
    ${geminiOutput.text}

    VERSÃO DIRETOR CRIATIVO (bold e inesperado):
    ${openaiOutput.text}

    VERSÃO GUARDIÃO DA MARCA (alinhamento DNA):
    ${claudeOutput.text}

    Retorne JSON:
    {
      "synthesis": "copy final sintetizada (título / corpo / CTA / hashtags)",
      "contributions": {
        "gemini": "o que foi aproveitado desta perspectiva",
        "openai": "o que foi aproveitado desta perspectiva",
        "claude": "o que foi aproveitado desta perspectiva"
      }
    }`,
    temperature: 0.3,
  });

  return {
    synthesis: parseSynthesis(synthesisOutput.text),
    versions: { gemini: geminiOutput.text, openai: openaiOutput.text, claude: claudeOutput.text },
    contributions: parseSynthesis(synthesisOutput.text).contributions,
  };
}
```

**Quando usar**: pipeline `adversarial` (novo modo, adicionar ao roteamento do `edro.ts`)

---

### 11.4 — Mudanças no frontend — Quality Card + Collaborative Insights

#### Arquivo: `apps/web/app/studio/editor/EditorClient.tsx`

**Quality Card por opção** — já descrito na Tarefa 10.10. Além das barras de score, adicionar seção de contribuições das IAs:

```tsx
{copy.payload?.quality_scores?.[idx] && (
  <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
    {/* Collaborative stepper — mostrar quando houve revisão */}
    {copy.payload.revision_count > 0 && (
      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 1 }} flexWrap="wrap">
        <Chip size="small" label="Gemini" sx={{ fontSize: '0.6rem', height: 18, bgcolor: '#fef9c3' }} />
        <IconArrowRight size={10} />
        <Chip size="small" label="GPT-4" sx={{ fontSize: '0.6rem', height: 18, bgcolor: '#dbeafe' }} />
        <IconArrowRight size={10} />
        <Chip size="small" label="Claude" sx={{ fontSize: '0.6rem', height: 18, bgcolor: '#f0fdf4' }} />
        {copy.payload.revision_count > 0 && (
          <>
            <Chip size="small" icon={<IconRefresh size={10} />}
              label={`${copy.payload.revision_count}x revisão`}
              sx={{ fontSize: '0.6rem', height: 18, bgcolor: '#fef2f2' }} />
            <IconArrowRight size={10} />
            <Chip size="small" label="✓ Claude aprovou"
              sx={{ fontSize: '0.6rem', height: 18, bgcolor: '#f0fdf4', color: '#16a34a' }} />
          </>
        )}
      </Stack>
    )}

    {/* Score bars */}
    {/* ... já descrito na Tarefa 10.10 ... */}

    {/* Revision history expandível */}
    {copy.payload.revision_history?.length > 0 && (
      <Accordion sx={{ mt: 1, boxShadow: 'none', '&:before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<IconChevronDown size={14} />} sx={{ p: 0, minHeight: 0 }}>
          <Typography variant="caption" color="text.secondary">
            Ver histórico de revisão
          </Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0 }}>
          {copy.payload.revision_history.map((r: any, i: number) => (
            <Box key={i} sx={{ mb: 1 }}>
              <Typography variant="caption" fontWeight={700}>
                Loop {r.loop}: {r.score_before.toFixed(1)} → {r.score_after.toFixed(1)}
              </Typography>
              {r.issues_raised.map((issue: string, j: number) => (
                <Typography key={j} variant="caption" color="text.secondary" sx={{ display: 'block', pl: 1 }}>
                  • {issue}
                </Typography>
              ))}
            </Box>
          ))}
        </AccordionDetails>
      </Accordion>
    )}
  </Box>
)}
```

---

#### Novo componente: `apps/web/components/studio/CollaborativeInsights.tsx`

Painel expansível na sidebar do Editor que mostra o que Gemini identificou:

```tsx
'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Collapse from '@mui/material/Collapse';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import { IconBrain, IconChevronDown, IconChevronUp } from '@tabler/icons-react';

type Props = {
  analysisJson: {
    key_hooks?: string[];
    restrictions?: string[];
    creative_direction?: string;
    ideal_tone?: string;
    approval_checklist?: Array<{ id: string; rule: string; weight: string }>;
  } | null;
};

export default function CollaborativeInsights({ analysisJson }: Props) {
  const [open, setOpen] = useState(false);
  if (!analysisJson) return null;

  return (
    <Card sx={{ mb: 2, bgcolor: 'rgba(93,135,255,0.03)', borderColor: 'rgba(93,135,255,0.15)' }}>
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center"
          onClick={() => setOpen(v => !v)} sx={{ cursor: 'pointer' }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <IconBrain size={16} color="#5D87FF" />
            <Typography variant="caption" fontWeight={700} color="#5D87FF">
              Análise do Gemini
            </Typography>
          </Stack>
          <IconButton size="small">
            {open ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
          </IconButton>
        </Stack>

        <Collapse in={open}>
          <Box sx={{ mt: 1.5 }}>
            {analysisJson.creative_direction && (
              <Box sx={{ mb: 1.5 }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  DIREÇÃO CRIATIVA
                </Typography>
                <Typography variant="caption">{analysisJson.creative_direction}</Typography>
              </Box>
            )}

            {analysisJson.key_hooks && analysisJson.key_hooks.length > 0 && (
              <Box sx={{ mb: 1.5 }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  GANCHOS IDENTIFICADOS
                </Typography>
                <Stack direction="row" flexWrap="wrap" spacing={0.5} useFlexGap>
                  {analysisJson.key_hooks.map((hook, i) => (
                    <Chip key={i} size="small" label={hook}
                      sx={{ fontSize: '0.65rem', height: 20, bgcolor: 'rgba(93,135,255,0.08)' }} />
                  ))}
                </Stack>
              </Box>
            )}

            {analysisJson.restrictions && analysisJson.restrictions.length > 0 && (
              <Box>
                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  RESTRIÇÕES DA MARCA
                </Typography>
                {analysisJson.restrictions.map((r, i) => (
                  <Typography key={i} variant="caption" color="error.main" sx={{ display: 'block' }}>
                    ✕ {r}
                  </Typography>
                ))}
              </Box>
            )}
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
}
```

Renderizar na sidebar do `EditorClient` quando `copy.payload?.analysis_json` existir.

---

### 11.5 — Novo endpoint backend: `POST /ai/image-prompt`

**Arquivo**: `apps/backend/src/routes/ai.ts` (criar ou adicionar a rota existente)

```typescript
router.post('/image-prompt', tenantGuard, async (req, res) => {
  const { client_id, brief, platform, format, event, brand_colors } = req.body;

  const prompt = await callProvider('claude', {
    prompt: `Você é um diretor de arte de uma agência de publicidade.
    Crie um prompt profissional para geração de imagem com IA (Midjourney / DALL-E / Firefly).

    O prompt deve:
    - Ser em inglês (padrão para ferramentas de imagem)
    - Especificar estilo fotográfico, iluminação, composição
    - Incluir as cores da marca: ${brand_colors || 'não especificado'}
    - Ser otimizado para o formato: ${format} na plataforma ${platform}
    - Contextualizado para o evento/pauta: ${event}
    - Terminar com especificação de aspect ratio para o formato

    Contexto da empresa/cliente: ${brief}

    Retorne APENAS o prompt de imagem, sem explicações.`,
    temperature: 0.6,
  });

  res.json({ prompt: prompt.text });
});
```

---

### 11.6 — Novo endpoint backend: `POST /ai/review-summary`

```typescript
router.post('/review-summary', tenantGuard, async (req, res) => {
  const { briefing_id, client_id, copies } = req.body;

  // Buscar DNA do cliente
  const clientProfile = await db.query(
    'SELECT tone, pillars, keywords FROM clients WHERE id = $1 AND tenant_id = $2',
    [client_id, req.tenant.id]
  );

  const result = await callProvider('claude', {
    prompt: `Você é um diretor criativo revisando as peças finais antes da aprovação do cliente.
    Analise as copies abaixo considerando o DNA da marca e retorne um JSON:

    {
      "overall_score": 8.5,
      "summary": "resumo em 2 frases do estado das peças",
      "warnings": ["lista de pontos de atenção específicos, se houver"]
    }

    DNA DO CLIENTE: ${JSON.stringify(clientProfile.rows[0] || {})}

    COPIES:
    ${copies.join('\n\n---\n\n')}`,
    temperature: 0.3,
  });

  try {
    const parsed = JSON.parse(result.text);
    res.json(parsed);
  } catch {
    res.json({ overall_score: 0, summary: result.text, warnings: [] });
  }
});
```

---

## Ordem de implementação recomendada

### Fase 1 — Quick wins (impacto alto, esforço baixo)
1. **10.2** — Recuperação de rascunho
2. **10.8** — Eliminar pipeline/task type da UI
3. **10.9** — Auto-geração ao chegar no step
4. **10.4** — Tom automático do DNA do cliente
5. **10.6** — Widget do cliente em todas as etapas

### Fase 2 — UX core (impacto alto, esforço médio)
6. **10.1** — Templates de entrada por tipo de campanha
7. **10.7** — Plataformas AI-First
8. **10.10** — 3 opções em cards comparáveis
9. **10.3** — Painel de contexto da fonte
10. **10.5** — Deadline inteligente

### Fase 3 — Pipeline de qualidade (impacto alto, esforço alto)
11. **11.2** — Loop de qualidade no backend (Claude gate + GPT-4 revisão)
12. **11.4** — Quality card + Collaborative Insights no frontend
13. **11.3** — Modo adversarial

### Fase 4 — Features avançadas
14. **10.11** — Modo script para vídeo
15. **10.13** — Sumário de revisão por IA
16. **10.14** — Email de aprovação auto-redigido
17. **10.12** — Gerador de prompt de imagem
18. **11.5 + 11.6** — Novos endpoints de IA

---

## Notas finais para o Codex

- **Não quebrar pipelines existentes**: `simple`, `standard`, `premium` continuam funcionando. O loop é exclusivo do `collaborative`
- **Graceful degradation**: se o JSON de qualidade do Claude não parsear, cair para o comportamento atual (output direto sem scores)
- **Custo do loop**: cada ciclo adicional de revisão custa ~$0.03–0.08 a mais. Máximo 2 loops = custo controlado
- **Sempre testar o build**: `cd apps/web && npx next build` antes de fazer deploy
- **Não usar `any` desnecessariamente**: tipar todos os quality scores e pipeline results
- **localStorage keys existentes**: não renomear chaves já existentes para não quebrar sessões em andamento
- **Deploy frontend**: `railway up --service edro-web --detach`
- **Deploy backend**: `railway up --service edro-backend --detach`
