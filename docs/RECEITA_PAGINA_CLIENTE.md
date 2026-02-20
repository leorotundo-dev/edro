# Receita Completa — Redesign da Página de Cliente (Edro Studio)

> **Para o Codex**: este documento descreve todas as mudanças a implementar na área de cliente do painel Edro Studio. Leia até o fim antes de começar. Cada seção tem contexto, arquivos exatos, código de referência e critério de conclusão.

---

## Contexto técnico obrigatório

- **Stack**: Next.js 15 App Router, React 19, TypeScript, MUI v7, Tabler Icons
- **Diretório raiz do frontend**: `apps/web/`
- **Páginas do cliente**: `apps/web/app/clients/[id]/`
- **Params são Promise no Next.js 15**: sempre `const { id } = await params` em server components
- **Grid MUI v7**: usar `<Grid size={{ xs: 12, md: 6 }}>` (não `xs={12}` diretamente)
- **API calls**: `apiGet`, `apiPost`, `apiDelete`, `apiPatch` de `@/lib/api`
- **Cores da marca**: `#ff6600` (laranja primário), `#0f172a` (texto escuro), `#13DEB9` (verde), `#FA896B` (salmon), `#5D87FF` (azul), `#FFAE1F` (amarelo), `#7c3aed` (roxo)
- **Deploy**: `railway up --service edro-web --detach` na raiz do projeto
- **Commit**: sempre incluir `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`

---

## Estado atual das tabs (já implementado — não reverter)

```ts
// apps/web/app/clients/[id]/ClientLayoutClient.tsx
const CLIENT_TABS = [
  { label: 'Overview', path: '' },
  { label: 'Calendar', path: '/calendar' },
  { label: 'Planning', path: '/planning' },
  { label: 'Creative', path: '/creative' },        // ← será removida
  { label: 'Inteligência', path: '/inteligencia' },
  { label: 'Métricas', path: '/metricas' },
];
```

---

## TAREFA 1 — Flatten Inteligência (remover wrapper "Radar")

### Problema
`/inteligencia` tem 2 sub-tabs: "Radar" e "Insights". O "Radar" tem seus próprios sub-tabs (Clipping | Social Listening | Perplexity AI) — criando 3 níveis de navegação.

### O que fazer
Modificar `apps/web/app/clients/[id]/inteligencia/page.tsx` para ter **4 sub-tabs planos** ao invés de 2:

```
Clipping | Social Listening | Perplexity AI | Insights
```

### Arquivo a modificar
`apps/web/app/clients/[id]/inteligencia/page.tsx`

### Como o ClientClippingClient funciona hoje
O `ClientClippingClient` (`apps/web/app/clients/[id]/clipping/ClientClippingClient.tsx`) já renderiza internamente suas 3 sub-tabs (Clipping, Social Listening, Perplexity AI). Para o flatten, precisa passar o sub-tab ativo via prop ou extrair os componentes internos.

**Opção mais simples**: verificar se `ClientClippingClient` aceita uma prop `initialTab` ou `defaultTab`. Se não aceitar, adicionar essa prop ao componente para controlar qual sub-tab está ativa.

### Código alvo para inteligencia/page.tsx

```tsx
'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { IconClipboard, IconTrendingUp, IconSearch, IconBulb } from '@tabler/icons-react';
import ClientInsightsClient from '../insights/ClientInsightsClient';

// Importar os sub-componentes do clipping individualmente
// (ver seção abaixo sobre como extrair)

const SUB_TABS = [
  { label: 'Clipping', icon: <IconClipboard size={16} /> },
  { label: 'Social Listening', icon: <IconTrendingUp size={16} /> },
  { label: 'Perplexity AI', icon: <IconSearch size={16} /> },
  { label: 'Insights', icon: <IconBulb size={16} /> },
];

export default function InteligenciaPage() {
  const params = useParams();
  const clientId = params.id as string;
  const [tab, setTab] = useState(0);

  return (
    <Box>
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider', '& .MuiTab-root': { minHeight: 44 } }}
      >
        {SUB_TABS.map((t, i) => (
          <Tab key={i} label={t.label} icon={t.icon} iconPosition="start" sx={{ fontSize: '0.85rem' }} />
        ))}
      </Tabs>
      {tab === 0 && <ClippingOnlyView clientId={clientId} />}
      {tab === 1 && <SocialListeningView clientId={clientId} />}
      {tab === 2 && <PerplexityView clientId={clientId} />}
      {tab === 3 && <ClientInsightsClient clientId={clientId} />}
    </Box>
  );
}
```

### Como extrair os sub-componentes do ClientClippingClient
Abrir `apps/web/app/clients/[id]/clipping/ClientClippingClient.tsx`. Ele controla internamente qual sub-tab está ativa via URL params (`?tab=`). A forma mais limpa:

1. Adicionar prop opcional `forceTab?: 'clipping' | 'social' | 'perplexity'` ao `ClientClippingClient`
2. Quando `forceTab` for passado, usar esse valor como tab ativo ao invés de ler da URL
3. Na `inteligencia/page.tsx`, passar `forceTab` conforme o sub-tab selecionado

Alternativamente (mais simples): passar `ClientClippingClient` com `initialTab={0}`, `initialTab={1}`, `initialTab={2}` correspondendo aos sub-tabs internos.

### Critério de conclusão
- Navegar para `/clients/[id]/inteligencia` mostra 4 sub-tabs na mesma linha
- Cada sub-tab renderiza o conteúdo correto
- Sem 3º nível de navegação

---

## TAREFA 2 — Reorganizar Métricas (eliminar wrapper "Analytics", agrupar 9 → 4)

### Problema
`/metricas` tem sub-tabs: Performance | Relatórios | Analytics. O "Analytics" tem 9 sub-sub-tabs. 3 níveis de navegação.

### O que fazer
Modificar `apps/web/app/clients/[id]/metricas/page.tsx` para ter **6 sub-tabs planos**:

```
Performance | Relatórios | Operacional | Valor | Marca | Estratégia
```

### Mapeamento dos 9 tabs de Analytics para as 4 novas páginas

| Sub-tab novo | Conteúdo (de analytics/page.tsx) | Justificativa |
|---|---|---|
| **Operacional** | Health Score (tab 0) + Gargalos (tab 1) | Ambos sobre saúde operacional do fluxo |
| **Valor** | Proof of Value (tab 2) + ROI Retainer (tab 7) + Benchmark (tab 4) | Todos sobre demonstrar/calcular valor |
| **Marca** | Tom de Voz (tab 3) + Content Gap (tab 5) | DNA de marca e lacunas de conteúdo |
| **Estratégia** | Estrategista (tab 6) + Cal. Preditivo (tab 8) | Ferramentas de planejamento futuro |

### Arquivos a criar/modificar

**1. Extrair o conteúdo de `analytics/page.tsx` em componentes reutilizáveis**

O arquivo atual `apps/web/app/clients/[id]/analytics/page.tsx` é um componente monolítico de ~900 linhas com 9 seções condicionais (`{tab === 0 && ...}`). Precisa extrair cada seção como componente independente.

Criar `apps/web/app/clients/[id]/analytics/sections/`:
- `HealthScoreSection.tsx` — conteúdo do tab 0 (Health Score)
- `GargalosSection.tsx` — conteúdo do tab 1 (Gargalos)
- `ProofOfValueSection.tsx` — conteúdo do tab 2 (PoV)
- `BrandVoiceSection.tsx` — conteúdo do tab 3 (Tom de Voz)
- `BenchmarkSection.tsx` — conteúdo do tab 4 (Benchmark)
- `ContentGapSection.tsx` — conteúdo do tab 5 (Content Gap)
- `EstrategistaSection.tsx` — conteúdo do tab 6 (Estrategista)
- `RoiRetainerSection.tsx` — conteúdo do tab 7 (ROI Retainer)
- `PredictiveCalendarSection.tsx` — conteúdo do tab 8 (Cal. Preditivo)

Cada seção recebe `clientId: string` como prop e gerencia seu próprio estado de loading/data.

**Padrão de cada section component:**
```tsx
'use client';

import { useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
// ... outros imports MUI e Tabler

type Props = { clientId: string };

export default function HealthScoreSection({ clientId }: Props) {
  const [data, setData] = useState<HealthScore | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiGet<HealthScore>(`/clients/${clientId}/health-score`);
      setData(res);
    } catch (e) { /* ... */ }
    finally { setLoading(false); }
  };

  // JSX do conteúdo (idêntico ao que estava no tab 0 de analytics/page.tsx)
  return ( /* ... */ );
}
```

**2. Criar as 4 páginas agregadas**

Criar `apps/web/app/clients/[id]/metricas/`:
- `OperacionalPage.tsx` — renderiza `<HealthScoreSection>` + `<GargalosSection>`
- `ValorPage.tsx` — renderiza `<ProofOfValueSection>` + `<RoiRetainerSection>` + `<BenchmarkSection>`
- `MarcaPage.tsx` — renderiza `<BrandVoiceSection>` + `<ContentGapSection>`
- `EstrategiaPage.tsx` — renderiza `<EstrategistaSection>` + `<PredictiveCalendarSection>`

Cada página separada por `<Divider sx={{ my: 4 }} />` entre seções.

**3. Modificar `metricas/page.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import {
  IconChartBar, IconFileAnalytics, IconHeartbeat,
  IconTrophy, IconDna, IconRocket
} from '@tabler/icons-react';
import ClientPerformanceClient from '../performance/ClientPerformanceClient';
import ClientReportsPage from '../reports/page';
import OperacionalPage from './OperacionalPage';
import ValorPage from './ValorPage';
import MarcaPage from './MarcaPage';
import EstrategiaPage from './EstrategiaPage';

const SUB_TABS = [
  { label: 'Performance', icon: <IconChartBar size={16} /> },
  { label: 'Relatórios', icon: <IconFileAnalytics size={16} /> },
  { label: 'Operacional', icon: <IconHeartbeat size={16} /> },
  { label: 'Valor', icon: <IconTrophy size={16} /> },
  { label: 'Marca', icon: <IconDna size={16} /> },
  { label: 'Estratégia', icon: <IconRocket size={16} /> },
];

export default function MetricasPage() {
  const params = useParams();
  const clientId = params.id as string;
  const [tab, setTab] = useState(0);

  return (
    <Box>
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider', '& .MuiTab-root': { minHeight: 44 } }}
      >
        {SUB_TABS.map((t, i) => (
          <Tab key={i} label={t.label} icon={t.icon} iconPosition="start" sx={{ fontSize: '0.85rem' }} />
        ))}
      </Tabs>
      {tab === 0 && <ClientPerformanceClient clientId={clientId} />}
      {tab === 1 && <ClientReportsPage />}
      {tab === 2 && <OperacionalPage clientId={clientId} />}
      {tab === 3 && <ValorPage clientId={clientId} />}
      {tab === 4 && <MarcaPage clientId={clientId} />}
      {tab === 5 && <EstrategiaPage clientId={clientId} />}
    </Box>
  );
}
```

### Critério de conclusão
- `/metricas` tem 6 sub-tabs planos sem 3º nível
- Cada sub-tab renderiza o conteúdo correto com todos os botões e estados funcionando
- O `analytics/page.tsx` original pode ser mantido (para acesso direto pela URL) mas precisa importar dos novos section components

---

## TAREFA 3 — Botão "Criar Pauta" no header + Remover tab Creative

### Problema
A tab Creative apenas faz `redirect('/studio?clientId=X')`. É um redirect disfarçado de tab. Além disso, não há como criar uma pauta rapidamente a partir de qualquer página.

### O que fazer

**3a. Remover Creative das tabs**

Em `apps/web/app/clients/[id]/ClientLayoutClient.tsx`:
```ts
const CLIENT_TABS = [
  { label: 'Overview', path: '' },
  { label: 'Calendar', path: '/calendar' },
  { label: 'Planning', path: '/planning' },
  // REMOVER: { label: 'Creative', path: '/creative' },
  { label: 'Inteligência', path: '/inteligencia' },
  { label: 'Métricas', path: '/metricas' },
];
```

**3b. Adicionar botão "Criar Pauta" no header do cliente**

No mesmo `ClientLayoutClient.tsx`, na Stack de botões superiores (linha ~268, ao lado de "Analisar com IA" e "Editar cliente"), adicionar:

```tsx
<Button
  variant="contained"
  startIcon={<IconPlus size={16} />}
  component={Link}
  href={`/studio?clientId=${clientId}`}
  sx={{
    textTransform: 'none',
    bgcolor: '#ff6600',
    color: 'white',
    '&:hover': { bgcolor: '#e65c00' },
  }}
>
  Criar Pauta
</Button>
```

Importar `IconPlus` de `@tabler/icons-react`.

**3c. Adicionar botão "Criar Pauta" inline nos itens de clipping**

Em `apps/web/app/clients/[id]/clipping/ClientClippingClient.tsx`, em cada item do feed de clipping, adicionar um botão que abre Studio pré-preenchido:

```tsx
<Button
  size="small"
  variant="outlined"
  startIcon={<IconPlus size={14} />}
  href={`/studio?clientId=${clientId}&title=${encodeURIComponent(item.title)}&source=clipping&sourceId=${item.id}`}
  component="a"
  sx={{ fontSize: '0.7rem', py: 0.25, px: 1 }}
>
  Criar Pauta
</Button>
```

Fazer o mesmo em `OverviewClient.tsx` nos items de clipping (linha ~966), oportunidades (linha ~1135) e menções sociais.

### Critério de conclusão
- Tab "Creative" não aparece mais na barra
- Botão "Criar Pauta" aparece no header laranja do cliente
- Cada item de clipping e oportunidade tem botão "Criar Pauta" inline

---

## TAREFA 4 — Overview → "Mission Control"

### Problema
O `OverviewClient.tsx` (1710 linhas) faz 15+ chamadas de API e exibe widgets estáticos. É uma dashboard passiva. Precisa se tornar ativa — mostrando o que precisa de atenção **agora**.

### O que fazer

**4a. Adicionar bloco de alertas críticos no topo**

Logo após o `healthScore` banner (linha ~764 do OverviewClient.tsx), antes da Section 1, adicionar um novo bloco:

```tsx
{/* ALERTAS CRÍTICOS */}
{(planningAlerts.length > 0 || opportunitiesUrgentCount > 0) && (
  <Card sx={{ borderColor: 'error.main', borderWidth: 1.5, borderStyle: 'solid', borderRadius: 2 }}>
    <CardContent sx={{ py: 1.5, px: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
        <IconAlertTriangle size={18} color="#dc2626" />
        <Typography variant="subtitle2" fontWeight={700} color="error.main">
          Atenção necessária:
        </Typography>
        {planningAlerts.map((alert) => (
          <Chip key={alert.key} size="small" label={`${alert.label}: ${alert.message}`}
            sx={{ bgcolor: alert.status === 'error' ? '#fef2f2' : '#fffbeb',
                  color: alert.status === 'error' ? '#dc2626' : '#d97706', fontWeight: 600 }} />
        ))}
        {opportunitiesUrgentCount > 0 && (
          <Chip size="small" label={`${opportunitiesUrgentCount} oportunidade(s) urgente(s)`}
            sx={{ bgcolor: '#fef2f2', color: '#dc2626', fontWeight: 600 }} />
        )}
      </Stack>
    </CardContent>
  </Card>
)}
```

**4b. Adicionar bloco "Recomendação do Dia" + Pipeline**

Logo depois dos alertas, adicionar um card de 2 colunas:

Coluna esquerda — "Recomendação do Dia" (usa dados que já existem: oportunidade urgente, evento próximo, clipping de alta relevância):

```tsx
<Card sx={{ borderRadius: 2, bgcolor: 'rgba(255,102,0,0.03)', borderColor: 'rgba(255,102,0,0.2)' }}>
  <CardContent>
    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
      <IconSparkles size={18} color="#ff6600" />
      <Typography variant="subtitle2" fontWeight={700}>Recomendação do Dia</Typography>
    </Stack>
    {/* Lógica: mostrar a oportunidade urgente OU evento mais próximo OU clipping de maior score */}
    {topOpportunities[0] && (
      <>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {topOpportunities[0].description || topOpportunities[0].title}
        </Typography>
        <Button size="small" variant="contained"
          href={`/studio?clientId=${clientId}&title=${encodeURIComponent(topOpportunities[0].title)}`}
          component="a"
          sx={{ bgcolor: '#ff6600', '&:hover': { bgcolor: '#e65c00' } }}>
          Criar Pauta
        </Button>
      </>
    )}
  </CardContent>
</Card>
```

Coluna direita — Pipeline visual (briefings agrupados por stage):

```tsx
// Dados: usar briefings já carregados (state: briefings)
// Agrupar por b.status e mostrar contagem

const pipelineStages = [
  { key: 'briefing', label: 'Briefing', color: '#5D87FF' },
  { key: 'copy_ia', label: 'Copy IA', color: '#94a3b8' },
  { key: 'aprovacao', label: 'Aprovação', color: '#FFAE1F' },
  { key: 'producao', label: 'Produção', color: '#FA896B' },
  { key: 'revisao', label: 'Revisão', color: '#ff6600' },
  { key: 'done', label: 'Entregue', color: '#13DEB9' },
];

// Para cada stage, contar briefings com aquele status e mostrar como chips com contagem
```

**4c. Atualizar links internos do OverviewClient**

O `OverviewClient.tsx` tem vários links hardcoded para rotas antigas que saíram das tabs. Atualizar:

| Link antigo | Link novo |
|---|---|
| `/clients/${clientId}/clipping` | `/clients/${clientId}/inteligencia` |
| `/clients/${clientId}/clipping?tab=social` | `/clients/${clientId}/inteligencia?sub=social` |
| `/clients/${clientId}/insights` | `/clients/${clientId}/inteligencia?sub=insights` |
| `/clients/${clientId}/performance` | `/clients/${clientId}/metricas` |
| `/clients/${clientId}/library` | `/clients/${clientId}/planning` (Library está embutida no Planning) |
| `/clients/${clientId}/analytics` | `/clients/${clientId}/metricas?sub=operacional` |

Linhas a procurar: 950, 953, 1062, 1065, 1208, 768 (health score banner).

### Critério de conclusão
- Overview mostra alertas críticos no topo quando existem
- "Recomendação do Dia" mostra a oportunidade mais urgente com botão Criar Pauta
- Pipeline mostra contagem de briefings por etapa
- Todos os links internos apontam para as novas rotas

---

## TAREFA 5 — Inteligência: Botão "Criar Pauta" no Feed de Clipping

### O que fazer

**Em `apps/web/app/clients/[id]/clipping/ClientClippingClient.tsx`:**

1. Localizar onde cada `ClippingItem` é renderizado no feed
2. Adicionar ao lado do título/score:
```tsx
<Button
  size="small"
  variant="outlined"
  component="a"
  href={`/studio?clientId=${clientId}&title=${encodeURIComponent(item.title)}&ref=clipping&refId=${item.id}`}
  sx={{ fontSize: '0.7rem', py: 0.5, px: 1.5, borderColor: '#ff6600', color: '#ff6600',
        '&:hover': { bgcolor: 'rgba(255,102,0,0.05)' } }}
>
  Criar Pauta
</Button>
```

**Em `apps/web/app/clients/[id]/clipping/ClientClippingClient.tsx` — itens de Social Listening:**

Mesmo padrão para cada menção social que aparecer no feed.

---

## TAREFA 6 — Aba "Perfil" (substitui o Creative removido, consolida dados de identidade)

### Problema
Dados de identidade do cliente estão espalhados:
- `OverviewClient.tsx` Section 5 ("Perfil do Cliente") — dados cadastrais estáticos
- `analytics/page.tsx` tab 3 ("Tom de Voz") — DNA de marca extraído por IA
- Não existe uma aba dedicada a "quem é esse cliente"

### O que fazer

**6a. Criar nova aba "Perfil" nas tabs**

Em `ClientLayoutClient.tsx`:
```ts
const CLIENT_TABS = [
  { label: 'Overview', path: '' },
  { label: 'Calendar', path: '/calendar' },
  { label: 'Planning', path: '/planning' },
  { label: 'Perfil', path: '/perfil' },           // ← NOVA (substitui Creative)
  { label: 'Inteligência', path: '/inteligencia' },
  { label: 'Métricas', path: '/metricas' },
];
```

**6b. Criar `apps/web/app/clients/[id]/perfil/page.tsx`**

Esta página consolida em sub-tabs:
- **Identidade** — dados do cliente (extrair Section 5 do OverviewClient: perfil, redes sociais, pilares, keywords, diretrizes)
- **DNA de Marca** — Tom de Voz da IA (extrair de `analytics/page.tsx` tab 3, criar `BrandVoiceSection`)
- **Conteúdo** — Pilares de conteúdo + Content Gap (extrair tab 5 de analytics)
- **Conectores** — Setup & integrações (extrair Section 6 "Ações & Setup" do OverviewClient)

```tsx
'use client';
import { useState } from 'react';
import { useParams } from 'next/navigation';
// imports MUI...

const SUB_TABS = [
  { label: 'Identidade' },
  { label: 'DNA de Marca' },
  { label: 'Conteúdo' },
  { label: 'Conectores' },
];

export default function PerfilPage() {
  const params = useParams();
  const clientId = params.id as string;
  const [tab, setTab] = useState(0);

  return (
    <Box>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        {SUB_TABS.map((t, i) => <Tab key={i} label={t.label} />)}
      </Tabs>
      {tab === 0 && <IdentidadeSection clientId={clientId} />}
      {tab === 1 && <BrandVoiceSection clientId={clientId} />}
      {tab === 2 && <ContentSection clientId={clientId} />}
      {tab === 3 && <ConectoresSection clientId={clientId} />}
    </Box>
  );
}
```

**Onde buscar o conteúdo de cada sub-tab:**
- `IdentidadeSection`: copiar Section 5 do `OverviewClient.tsx` (linhas 1310–1560)
- `BrandVoiceSection`: copiar tab 3 de `analytics/page.tsx` (linhas 500–598)
- `ContentSection`: copiar tab 5 de `analytics/page.tsx` (linhas 652–708) + dados de pilares/keywords do cliente
- `ConectoresSection`: copiar Section 6 "Setup & Integrações" do `OverviewClient.tsx` (linhas 1632–1661)

Cada sub-seção extraída vira um componente em `apps/web/app/clients/[id]/perfil/sections/`.

### Critério de conclusão
- Tab "Perfil" aparece na barra (no lugar de "Creative")
- Sub-tab "Identidade" mostra todos os dados do cliente (desc, pilares, keywords, redes, diretrizes)
- Sub-tab "DNA de Marca" extrai e mostra Tom de Voz via IA
- Sub-tab "Conteúdo" mostra gaps detectados via IA
- Sub-tab "Conectores" mostra status das integrações e link para configurar

---

## TAREFA 7 — Métricas: Insights Proativos (auto-carregamento)

### Problema
Todos os 9 tabs de Analytics são "on-demand" — o usuário precisa clicar um botão para gerar. Dados como Health Score deveriam carregar automaticamente quando o tab é aberto.

### O que fazer

Em cada `Section` criada na Tarefa 2 (HealthScoreSection, GargalosSection, etc.), adicionar `useEffect` para auto-carregar ao montar:

```tsx
// Em HealthScoreSection.tsx
useEffect(() => {
  load(); // carrega automaticamente ao montar o componente
}, [clientId]);
```

Para seções que fazem chamadas custosas com IA (Estrategista, Content Gap, Proof of Value), manter o botão manual, mas mostrar dados cacheados se existirem (verificar se o backend retorna dados de chamadas anteriores).

Para Health Score e Gargalos, sempre auto-carregar (são chamadas leves ao banco de dados).

### Critério de conclusão
- Ao abrir `Métricas > Operacional`, o Health Score carrega automaticamente (sem precisar clicar)
- Ao abrir `Métricas > Operacional`, os Gargalos carregam automaticamente
- Seções com IA pesada (Estrategista, Content Gap) mantêm botão manual

---

## TAREFA 8 — Atualizar links obsoletos

### Problema
`OverviewClient.tsx` tem links para rotas antigas que saíram das tabs. Também a página de erro de Planning pode linkar para rotas incorretas.

### Buscar e substituir em `apps/web/app/clients/[id]/OverviewClient.tsx`:

```
href={`/clients/${clientId}/clipping`}
→ href={`/clients/${clientId}/inteligencia`}

href={`/clients/${clientId}/clipping?tab=social`}
→ href={`/clients/${clientId}/inteligencia`} (tab=1 via state, não dá pra passar por URL facilmente)

href={`/clients/${clientId}/insights`}
→ href={`/clients/${clientId}/inteligencia`}

href={`/clients/${clientId}/performance`}
→ href={`/clients/${clientId}/metricas`}

href={`/clients/${clientId}/library`}
→ href={`/clients/${clientId}/planning`}

href={`/clients/${clientId}/analytics`}
→ href={`/clients/${clientId}/metricas`}
```

Também verificar se o Health Score banner (linha ~768) linka para analytics — atualizar para `/metricas`.

---

## TAREFA 9 — Remover duplicação no Overview

### Problema
O Overview carrega dados de clipping, social, library, briefings, copies em paralelo com outras páginas. Isso resulta em muitas chamadas redundantes. Não precisamos remover essas chamadas (o Overview é um dashboard de resumo), mas podemos:

1. Limitar ainda mais os dados exibidos no Overview (máximo 3 itens por seção, não 5)
2. Remover a Section 5 "Perfil do Cliente" do Overview — esses dados agora vivem na aba Perfil
3. Simplificar a Section 6 "Ações & Setup" para apenas o card de "Ações Rápidas" (os conectores agora vivem na aba Perfil)

### O que fazer em `OverviewClient.tsx`:

- Remover Section 5 "Perfil do Cliente" completamente (linhas 1310–1560)
- Simplificar Section 6: manter apenas o card "Ações Rápidas" e "Próximas Datas" — remover "Setup & Integrações" (que agora está no Perfil)
- Reduzir `slice(0, 5)` para `slice(0, 3)` nos clipping items, briefings, copies

### Critério de conclusão
- Overview mais enxuto e rápido
- Dados de perfil não duplicados entre Overview e aba Perfil

---

## Ordem de implementação recomendada

1. **Tarefa 1** — Flatten Inteligência (menor risco, não cria novas páginas)
2. **Tarefa 3** — Remover Creative + Adicionar "Criar Pauta" no header (simples)
3. **Tarefa 2** — Reorganizar Métricas (mais complexo, precisa extrair sections)
4. **Tarefa 6** — Criar aba Perfil (reutiliza código existente)
5. **Tarefa 4** — Overview Mission Control (acrescenta blocos ao existente)
6. **Tarefa 7** — Auto-loading nas Métricas
7. **Tarefa 5** — Botão Criar Pauta no feed de clipping
8. **Tarefa 8** — Atualizar links
9. **Tarefa 9** — Remover duplicação no Overview (fazer por último, maior risco de quebrar)

---

## Padrões de código para manter consistência

### Componente de página padrão (server component)
```tsx
import ClientXyzClient from './ClientXyzClient';

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;
  return <ClientXyzClient clientId={id} />;
}
```

### Componente de página "use client" com sub-tabs
```tsx
'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';

export default function SomePage() {
  const params = useParams();
  const clientId = params.id as string;
  const [tab, setTab] = useState(0);

  return (
    <Box>
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider', '& .MuiTab-root': { minHeight: 44 } }}
      >
        <Tab label="Tab 1" />
        <Tab label="Tab 2" />
      </Tabs>
      {tab === 0 && <Content1 clientId={clientId} />}
      {tab === 1 && <Content2 clientId={clientId} />}
    </Box>
  );
}
```

### Section component com auto-load
```tsx
'use client';

import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import { IconRefresh } from '@tabler/icons-react';

type Props = { clientId: string };

export default function SomeSection({ clientId }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiGet<any>(`/clients/${clientId}/some-endpoint`);
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [clientId]);

  if (loading && !data) return <CircularProgress size={28} />;

  return (
    <Box>
      <Button size="small" onClick={load} disabled={loading}
        startIcon={loading ? <CircularProgress size={14} /> : <IconRefresh size={14} />}>
        Atualizar
      </Button>
      {/* conteúdo */}
    </Box>
  );
}
```

---

## Notas finais para o Codex

- **Não quebrar rotas existentes**: os arquivos `clipping/page.tsx`, `insights/page.tsx`, `performance/page.tsx`, `analytics/page.tsx`, `reports/page.tsx` devem continuar funcionando (acesso direto pela URL)
- **Sempre testar o build**: `cd apps/web && npx next build` antes de fazer deploy
- **Deploy**: na raiz do projeto, executar `railway up --service edro-web --detach`
- **TypeScript strict**: não usar `any` desnecessariamente; tipar todos os props
- **Não inventar endpoints**: todos os endpoints de API já existem no backend — reutilizar os existentes
- **Não criar CSS global**: usar apenas `sx` prop do MUI
- **Ícones**: usar exclusivamente `@tabler/icons-react`
