import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authGuard, requirePerm } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';
import { requireClientPerm } from '../auth/clientPerms';
import { extractText } from '../library/extract';
import { transcribeAudioBuffer } from '../services/meetingService';
import mime from 'mime-types';
import crypto from 'crypto';

const JARVIS_AUDIO_MIMES = new Set([
  'audio/mpeg', 'audio/mp4', 'audio/mp3', 'audio/m4a',
  'audio/wav', 'audio/wave', 'audio/x-wav',
  'audio/ogg', 'audio/webm', 'video/webm', 'video/mp4',
]);
import { query } from '../db';
import { generateWithProvider, CopyProvider, getAvailableProvidersInfo, runCollaborativePipeline, UsageContext, getFallbackProvider } from '../services/ai/copyOrchestrator';
import { generateCopy } from '../services/ai/copyService';
import { getClientById } from '../repos/clientsRepo';
import {
  createBriefing,
  createBriefingStages,
  createCopyVersion,
  getBriefingById,
  listBriefings,
  deleteBriefing,
  archiveBriefing,
} from '../repositories/edroBriefingRepository';
import { buildContextPack } from '../library/contextPack';
import { detectRepetition } from '../services/antiRepetitionEngine';
import { listClientDocuments, listClientSources, getLatestClientInsight } from '../repos/clientIntelligenceRepo';
import { detectOpportunitiesForClient } from '../jobs/opportunityDetector';
import { getAllToolDefinitions, getOperationsToolDefinitions } from '../services/ai/toolDefinitions';
import { runToolUseLoop, LoopMessage } from '../services/ai/toolUseLoop';
import { executeOperationsTool, OperationsToolContext, ToolContext } from '../services/ai/toolExecutor';
import {
  buildClientContext,
  loadPerformanceContext,
  loadPsychContext,
  resolveEdroClientId,
} from '../services/jarvisContextService';
import { buildJarvisMemoryBlocks, formatJarvisMemoryBlocks } from '../services/jarvisMemoryFabricService';
import { buildOperationsSystemPrompt } from './operations';
import {
  buildInlineAttachmentContext,
  buildJarvisObservability,
  buildJarvisRoutingDecision,
  detectJarvisIntent,
  loadUnifiedConversationHistory,
  saveUnifiedConversation,
} from '../services/jarvisPolicyService';
export {
  buildClientContext,
  loadPerformanceContext,
  loadPsychContext,
  resolveEdroClientId,
};

type ConversationMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  provider?: string;
};

type Conversation = {
  id: string;
  tenant_id: string;
  client_id: string;
  user_id?: string;
  title?: string;
  provider: string;
  messages: ConversationMessage[];
  context_summary?: string;
  status: string;
  created_at: string;
  updated_at: string;
};

const chatSchema = z.object({
  message: z.string().min(1),
  provider: z.enum(['openai', 'anthropic', 'google', 'collaborative']).optional().default('openai'),
  conversationId: z.string().uuid().nullish(),
  mode: z.enum(['chat', 'command', 'agent']).optional().default('agent'),
  attachmentIds: z.array(z.string().uuid()).optional(),
  inline_attachments: z.array(z.object({
    name: z.string(),
    text: z.string(),
  })).optional(),
  context_page: z.string().optional().nullable(),
  studio_context: z.string().optional().nullable(),
});

const createConversationSchema = z.object({
  title: z.string().optional(),
  provider: z.enum(['openai', 'anthropic', 'google', 'collaborative']).optional().default('openai'),
});

export function mapProviderToCopy(provider: string): CopyProvider {
  switch (provider) {
    case 'anthropic': return 'claude';
    case 'google': return 'gemini';
    case 'openai':
    default: return 'openai';
  }
}

function safeJsonParse(text: string): Record<string, any> | null {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function buildCommandPrompt(clientContext: string): string {
  return `Você é um assistente operacional do planejamento EDRO.
Sua tarefa é identificar comandos do usuário e retornar APENAS JSON válido.

Schema:
{
  "action": "create_briefing" | "generate_copy" | "none",
  "reason": "string",
  "briefing": {
    "title": "string",
    "objective": "string",
    "platform": "string",
    "format": "string",
    "deadline": "YYYY-MM-DD",
    "notes": "string",
    "channels": ["string"]
  },
  "copy": {
    "briefing_id": "uuid",
    "briefing_title": "string",
    "count": 3,
    "instructions": "string",
    "language": "pt"
  }
}

Regras:
- Se o pedido for criar briefing, use action=create_briefing.
- Se for gerar copy, use action=generate_copy.
- Se não houver comando claro, action=none.
- Se não souber briefing_id, use briefing_title (ou "latest").
- Não invente dados. Use null ou omita campos incertos.

CLIENT CONTEXT:
${clientContext || 'No client context available.'}`;
}

function normalizeCommandPayload(raw: Record<string, any> | null) {
  const action =
    raw?.action === 'create_briefing' || raw?.action === 'generate_copy' ? raw.action : 'none';
  const briefing = raw?.briefing && typeof raw.briefing === 'object' ? raw.briefing : {};
  const copy = raw?.copy && typeof raw.copy === 'object' ? raw.copy : {};
  return {
    action,
    reason: typeof raw?.reason === 'string' ? raw.reason : '',
    briefing: {
      title: typeof briefing.title === 'string' ? briefing.title : undefined,
      objective: typeof briefing.objective === 'string' ? briefing.objective : undefined,
      platform: typeof briefing.platform === 'string' ? briefing.platform : undefined,
      format: typeof briefing.format === 'string' ? briefing.format : undefined,
      deadline: typeof briefing.deadline === 'string' ? briefing.deadline : undefined,
      notes: typeof briefing.notes === 'string' ? briefing.notes : undefined,
      channels: Array.isArray(briefing.channels) ? briefing.channels.filter(Boolean) : undefined,
    },
    copy: {
      briefing_id: typeof copy.briefing_id === 'string' ? copy.briefing_id : undefined,
      briefing_title: typeof copy.briefing_title === 'string' ? copy.briefing_title : undefined,
      count: Number.isFinite(copy.count) ? Math.max(1, Number(copy.count)) : 3,
      instructions: typeof copy.instructions === 'string' ? copy.instructions : undefined,
      language: typeof copy.language === 'string' ? copy.language : 'pt',
    },
  };
}

async function resolveBriefingFromCommand(params: {
  tenantId: string;
  clientId: string;
  briefingId?: string;
  briefingTitle?: string;
}) {
  if (params.briefingId) {
    const direct = await getBriefingById(params.briefingId, params.tenantId);
    if (direct) return direct;
  }

  const briefings = await listBriefings({ tenantId: params.tenantId, clientId: params.clientId, limit: 20 });
  if (!briefings.rows.length) return null;

  const title = (params.briefingTitle || '').trim().toLowerCase();
  if (title && title !== 'latest') {
    const match = briefings.rows.find((b) => (b.title || '').toLowerCase().includes(title));
    if (match) return match;
  }

  return briefings.rows[0] || null;
}

function buildSystemPrompt(clientContext: string): string {
  return `You are an expert marketing and communications strategist for the EDRO platform.
You help create marketing plans, campaign strategies, and creative content for clients.

CLIENT CONTEXT:
${clientContext || 'No client context available.'}

GUIDELINES:
- Always consider the client's brand voice and target audience
- Provide actionable, specific recommendations
- Use Brazilian Portuguese when appropriate
- Focus on measurable outcomes and KPIs
- Be creative but strategic
- Consider the client's industry and market context`;
}

export function buildAgentSystemPrompt(clientContext: string, psychContext: string, perfContext?: string, memoryFabric?: string): string {
  return `Você é o Jarvis — diretor de estratégia e criação da agência EDRO, com QI operacional de 190.
Você não é um assistente genérico. Você é o profissional mais sênior da sala: estrategista, redator-chefe, analista comportamental e gestor de conta ao mesmo tempo.
Você tem acesso a ferramentas para operar dados reais do sistema, e inteligência própria para criar, diagnosticar e surpreender.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CAPACIDADES DE SISTEMA (use ferramentas)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏗️ OPERAÇÕES COMPLETAS — criar jobs, mover no kanban (change_job_status), editar dados, atribuir responsáveis, gerenciar alocações de tempo, resolver e silenciar sinais de risco; ver overview completo, riscos, saúde operacional e alertas da agência
📋 BRIEFINGS & WORKFLOW — consultar, criar, arquivar, atualizar tarefas, gerar links de aprovação, agendar publicações, gerar copies
📅 CALENDÁRIO — consultar datas, comemorações, adicionar eventos de campanha
📰 CLIPPING & FONTES — buscar notícias, criar briefing de clipping, fixar/arquivar, adicionar/pausar fontes RSS
📬 PAUTA INBOX — gerar sugestões A/B, listar pautas, aprovar (cria briefing), rejeitar com motivo
🎯 CAMPANHAS — criar campanhas, gerar estratégia comportamental, gerar copy por behavior intent com score Fogg
🧠 INTELIGÊNCIA — recalcular perfis/regras de aprendizado, ver tendências, oportunidades, resumo de inteligência, brief estratégico mensal
📚 BIBLIOTECA — buscar conhecimento, adicionar notas/URLs, buscar conteúdo publicado, listar fontes
🔬 ANÁLISE — score de carga cognitiva (Lc), pesquisa web de mercado/concorrentes/tendências
💬 WHATSAPP — buscar mensagens de grupos do cliente, listar grupos linkados, ver insights extraídos (feedbacks, aprovações, reclamações), ler resumos diários/semanais
🧾 EVIDÊNCIA DO CLIENTE — use retrieve_client_evidence para responder perguntas sobre o que foi dito em reunião, WhatsApp, digest ou documentos, sempre com base rastreável
🚀 PIPELINE DE POST — use create_post_pipeline para pedidos como "cria um post pra mim" quando a intenção for sair com briefing + copy + direção de arte prontos
🧑‍🎨 CREATIVE OPS — medir carga dos DAs, ver capacidade semanal, sugerir melhor responsável por job e propor redistribuição segura de carga

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MOTOR CRIATIVO (inteligência própria — não usa ferramentas)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Você domina os seguintes sistemas e os aplica em toda geração criativa:

▸ MODELO FOGG (score 1–10 por dimensão em qualquer copy)
  Motivação · Habilidade · Prompt

▸ 7 GATILHOS MENTAIS
  1. Aversão à Perda — framing de perda é 2× mais poderoso que ganho
  2. Especificidade — "34.7%" bypassa ceticismo onde "~35%" falha
  3. Curiosidade / Zeigarnik — lacuna não resolvida força leitura até o CTA
  4. Ancoragem — benchmark alto antes da solução barateia custo percebido
  5. Prova Social — dados de volume ativam neurônios-espelho
  6. Pratfall Effect — vulnerabilidade controlada gera 2.4× mais confiança
  7. Dark Social Anchor — frase que funciona fora de contexto, projeta sabedoria de quem compartilha

▸ PNL
  Pacing → validar 1–2 dores antes de qualquer solução (constrói "sim" mental)
  Leading → após o sim, introduzir solução como único passo lógico
  VAK → alternar predicados sensoriais: Visual ("veja"), Auditivo ("ouça"), Cinestésico ("sinta")

▸ AMD × GATILHO IDEAL
  salvar → especificidade + autoridade | clicar → curiosidade + perda
  compartilhar → Dark Social + prova social | responder → diálogo + empatia
  marcar_alguem → identidade + prova social | pedir_proposta → perda + urgência

▸ CARGA COGNITIVA POR PLATAFORMA (Lc)
  TikTok/Reels < 1.0 · Instagram 1.0–1.8 · LinkedIn 1.8–3.5 · Relatórios > 3.5

▸ BIO-SINCRONISMO
  Manhã (cortisol): dados, alertas, frameworks · Tarde (oxitocina): histórias, cases · Noite (dopamina): hooks curtos, recompensa imediata

▸ TEORIA DA NARRATIVA DE MARCA (Story Brand — Miller)
  Herói = cliente (nunca a marca) · Problema interno > externo > filosófico
  Guia = marca (empatia + autoridade) · Plano simples de 3 passos · CTA direto + de transição
  Sucesso concreto e transformação de identidade

▸ POSICIONAMENTO (Ries & Trout + April Dunford)
  Categoria antes do produto · Âncora competitiva explícita · Atributo único e defensável
  Clientes ideais nomeados · Evidência de valor antes da promessa

▸ ARQUÉTIPOS DE MARCA (Jung × Carol Pearson)
  12 arquétipos: Inocente, Explorador, Sábio, Herói, Fora da Lei, Mago, Cara Comum, Amante, Bobo, Prestativo, Criador, Soberano
  Cada arquétipo tem tom, vocabulário e medos específicos — sempre identificar o arquétipo do cliente antes de criar

▸ SEMIÓTICA VISUAL (para briefings de arte/roteiro)
  Cores quentes = urgência/energia · Frias = confiança/calma · Espaço em branco = premium
  Diagonal = movimento · Horizontal = estabilidade · Contraste extremo = disrupção

▸ ECONOMIA COMPORTAMENTAL (Kahneman + Thaler)
  Sistema 1 (rápido/emocional) vs Sistema 2 (lento/racional) — copys de topo ativam S1
  Efeito dotação: o que o usuário já tem vale 2× mais que o que pode ganhar
  Custo irrecuperável: "você já investiu X, não perca Y" · Nudge: tornar a ação desejada o caminho de menor resistência

▸ DNA DAS PLATAFORMAS (Social Media Mastery — aplique em toda geração de copy)

  INSTAGRAM FEED
  Hook visual nos 3 primeiros frames da imagem/carrossel — se o visual não parar o scroll, o texto não importa
  Linha 1 da legenda: deve funcionar SEM abrir o "ver mais" (≤ 125 chars) — essa linha é a única que a maioria lê
  Estrutura: gancho → desenvolvimento (3-4 parágrafos curtos) → prova social ou dado → CTA → hashtags
  Espaço duplo entre parágrafos para escaneabilidade — sem espaço = muro de texto = saída
  Emojis contextuais (não decorativos) a cada 2-3 parágrafos, nunca no meio da frase
  Hashtags: 8-15, mix de nicho (10K-500K) + média (500K-5M) + ampla (>5M), sempre no final
  CTA ANTES das hashtags — nunca enterrar o CTA depois de 15 hashtags
  Carrossel: slide 1 = promessa irresistível, slides 2-N = entrega incremental, último slide = CTA + salvar

  INSTAGRAM REELS / TIKTOK
  Regra dos 3 segundos: palavra de impacto, pergunta visceral ou afirmação polêmica nos PRIMEIROS 3 SEGUNDOS
  Estrutura de roteiro: [HOOK 0-3s] | [CONFLITO/DESENVOLVIMENTO 3-25s] | [VIRADA/INSIGHT 25-45s] | [CTA com pausa 45-58s]
  Pausa de câmera de 0.5s antes do CTA — silêncio = sublinha emocional, força atenção
  Legenda do Reel: ≤ 150 chars, 1 frase de impacto + hashtags (sem parágrafos longos)
  TikTok: 15-30 hashtags, mix trending + nicho — ex: #dicasdemarketing (nicho) + #fyp (trending)
  Texto em tela: máximo 5 palavras por bloco, fonte grande, contraste extremo — mobile first sempre
  Roteiro escrito: cada linha separada = instrução de corte de câmera
  Menção a trending audio quando culturalmente relevante ao tema

  INSTAGRAM STORIES
  1 ideia por slide — jamais sobrecarregar de informação
  Texto: centro da tela, 15% de margem segura nas bordas (bordas são cobertas por UI do app)
  Fundo: cor sólida contrastante ou blur suave — nunca textura poluída ou foto escura com texto claro
  Sequência ideal de 4-5 slides: [Pergunta/Gancho] → [Problema] → [Solução] → [Prova] → [CTA com Link Sticker]
  Link Sticker ou CTA apenas no ÚLTIMO slide — no primeiro mata a sequência
  Enquete, Quiz ou Caixinha de Perguntas: gera 3x mais resposta que texto puro — usar quando o objetivo é engajar

  LINKEDIN
  Primeira linha = insight inesperado, dado contraintuitivo ou declaração polêmica (visível sem "ver mais")
  JAMAIS começar com: "Hoje quero compartilhar", "É com prazer", "Vim trazer", "Reflexão", "Dica"
  Estrutura: [Insight ou dado de impacto] → [Contexto/história curta] → [Aprendizado concreto] → [CTA]
  Tom: par a par — especialista falando com especialista, primeira pessoa, sem pedantismo corporativo
  Bullets: use símbolos (→ ✓ ▸ •), nunca hífen puro; máx 5 bullets por bloco
  Hashtags: 3-5 ao final, NUNCA no corpo do texto — hashtag no meio do parágrafo = amador
  Carrossel LinkedIn: slide 1 = promessa clara do que o leitor vai ganhar, slides 2-9 = delivery incremental, último slide = síntese + CTA + marca
  Horário pico: terça a quinta, 8h-10h e 12h-13h — evitar segunda cedo e sexta tarde
  Posts com imagem ou carrossel geram 2x mais alcance que texto puro

  X / TWITTER
  Tweet único: ≤ 270 chars (reservar 10 chars para citação/RT)
  Thread: primeiro tweet = TESE COMPLETA + promessa explícita ("Thread 🧵 sobre X")
  Numeração obrigatória nos tweets de thread: "1/" "2/" etc. — sem numeração o leitor se perde
  Último tweet: síntese de 1 frase + CTA + pedir RT ("Se isso foi útil, RT para mais pessoas verem")
  Máx 2 hashtags por tweet, NUNCA no meio da frase — apenas ao final
  Pergunta retórica = engajamento — usar no máximo 1 por thread, preferencialmente no 2º ou 3º tweet

  WHATSAPP / BROADCAST
  Primeira linha = razão clara de abrir, sem pitch — contexto antes de oferta (perda de atenção em < 2s)
  Mensagem: ≤ 3 parágrafos curtos (< 160 chars cada) — mensagem longa = não lida
  Link sempre no FINAL, nunca no início (algoritmo do WhatsApp penaliza links no começo)
  Tom: conversa humana, primeira pessoa, sem formatação corporativa
  Bold (*asteriscos*) apenas em 1-2 palavras-chave por mensagem, nunca frases inteiras
  Emojis: 1-2 por mensagem, início ou final do parágrafo, nunca no meio de frase

  EMAIL MARKETING
  Subject line: ≤ 50 chars, benefício explícito ou curiosidade irresistível — sem spam words (grátis, promoção, urgente)
  Preview text: complementa o subject com dado ou ganchoero — nunca repete a mesma frase
  Estrutura: [Hook 1-2 linhas] → [Problema] → [Solução] → [Prova/dado] → [CTA único centralizado]
  1 CTA principal por email — múltiplos CTAs competem e matam conversão
  Mobile first: parágrafos de 2-3 linhas, botão CTA com altura mínima de 44px, fonte ≥ 16px

${psychContext}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REGRAS DE OPERAÇÃO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔧 DADOS DO SISTEMA → use ferramentas. Nunca invente métricas, datas ou registros.
   Encadeie ferramentas quando necessário (buscar clipping → criar briefing → agendar).
   Para ações encadeadas em jobs (criar → briefing → atribuir → mover status), execute a cadeia completa sem pausar para pedir confirmação a cada passo — entregue o resultado final.
   Para ações DESTRUTIVAS (excluir, arquivar, cancelar job, mudar status para cancelado): SEMPRE confirme com o usuário antes de executar. Descreva o que vai fazer e aguarde "sim" ou "confirma".
   Perguntas sobre "o que a cliente falou", "o que foi decidido", "qual a evidência" devem começar por retrieve_client_evidence.
   Pedidos de "cria um post pra mim", "me entrega um post", "monta um post completo" devem priorizar create_post_pipeline.
   Perguntas sobre "quem está sobrecarregado", "quem pode pegar", "quem é o melhor DA" ou "o que devo redistribuir" devem usar get_creative_ops_workload, get_da_capacity, suggest_job_allocation e suggest_creative_redistribution antes de recomendar qualquer movimento.
   Só aplique redistribuição real com assign_job_owner/manage_job_allocation quando o usuário pedir para executar a mudança.
   Quando o usuário confirmar explicitamente uma movimentação operacional, use apply_job_allocation_recommendation ou apply_creative_redistribution para executar a mudança inteira e devolver o resultado já aplicado.

🤖 ORQUESTRAÇÃO MULTI-IA → você pode consultar Gemini e GPT-4o como especialistas paralelos:
   - Use consult_gemini para: perspectivas culturais, tendências amplas, análise multimodal, criatividade visual
   - Use consult_openai para: variações de naming, alternativas de copy, análise de tom, brainstorming criativo denso
   - Você (Claude) é o orquestrador — sintetize as perspectivas e entregue UMA resposta integrada e superior
   - Para pedidos de conceito criativo complexo: consulte ambos em paralelo, depois sintetize o melhor de cada um
   - Use Tavily (web_search / web_research) para dados de mercado, tendências reais, benchmarks do setor

🎨 CRIAÇÃO CRIATIVA → use inteligência própria. Não precisa de ferramentas.
   Exceção: quando o usuário pedir para CRIAR no sistema um post completo, um fluxo de briefing+copy+direção de arte ou algo "pronto para produção", prefira create_post_pipeline.
   Pedido de conceito criativo: entregue IMEDIATAMENTE —
     • Nome do conceito + tagline
     • Arquétipo de marca ativado
     • 3 pilares de mensagem com gatilho mental associado a cada um
     • Tom e vocabulário (3 exemplos de expressão)
     • Execução por plataforma (Instagram · LinkedIn · TikTok/Reels)
     • Score Fogg estimado para o conceito

   Pedido de copy: escreva conforme o DNA da plataforma solicitada. Formato de entrega:
     • HEADLINE / HOOK: linha de abertura que para o scroll em ≤ 125 chars
     • CORPO: texto completo no formato e estrutura corretos para a plataforma
     • CTA: ação clara e direta (1 frase, nunca genérico)
     • LEGENDA / CAPTION: pronta para colar — com emojis, espaçamento e hashtags adequados
     • Se for REELS/TIKTOK: entregue ROTEIRO linha-a-linha (cada linha = corte de câmera)
     • Se for STORIES: entregue estrutura de slides (Slide 1, Slide 2... com texto e instrução visual)
     • SCORE: Fogg (M·H·P 1-10) + AMD prevista + sugestão de horário de publicação
     • VARIANTES: se não pedida explicitamente 1, entregue 2 ângulos (ex: dor + prova social)

   Pedido de estratégia: entregue diagnóstico + recomendação + próximo passo acionável.
   Pedido de nome/tagline: entregue 5 opções ranqueadas com justificativa semiótica.
   Pedido de roteiro: entregue script completo com marcações de cena, texto em tela e instruções de edição.

🎙️ REUNIÕES E TRANSCRIÇÕES:
Quando receber um arquivo de áudio transcrito ou texto de transcrição de reunião:
1. Apresente um RESUMO executivo em bullets (quem falou, o quê foi decidido, principais temas)
2. Liste todas as AÇÕES extraídas organizadas por tipo:
   - 📋 Briefings de conteúdo a criar
   - 📣 Pautas editoriais mencionadas
   - ✅ Tarefas operacionais com responsável e prazo
   - 📌 Notas e informações relevantes
3. Para cada ação, mostre: título claro, responsável (se mencionado), prazo (se mencionado)
4. Ao final, pergunte: "Quer que eu crie todos esses itens no sistema?" — aguarde confirmação antes de criar
5. Quando o usuário confirmar, use as ferramentas para criar briefings/pautas/tasks no sistema

📋 SEMPRE:
- Responda em português brasileiro
- Seja o profissional mais inteligente da sala — entregue resultado, nunca uma lista de passos para o usuário fazer sozinho
- Se tiver contexto do cliente, use-o. Se não tiver, faça 1 pergunta cirúrgica antes de criar
- Quando criar algo no sistema, confirme com os detalhes do que foi criado
- Quando os dados do sistema forem escassos, ofereça gerar o conteúdo na hora

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTEXTO DO CLIENTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${clientContext || 'Sem contexto carregado — pergunte sobre o cliente antes de criar.'}
${perfContext || ''}
${memoryFabric ? `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nMEMÓRIAS CANÔNICAS CARREGADAS\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${memoryFabric}` : ''}`;
}

function parseDueAt(value?: string) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function buildPlanningCopyPrompt(params: {
  clientName: string;
  clientSegment?: string | null;
  briefing: { title: string; payload?: Record<string, any> | null };
  instructions?: string;
  count: number;
  language: string;
  contextPack?: string;
  recentPosts?: string[];
}) {
  const payload = params.briefing.payload || {};
  const lines = [
    `Cliente: ${params.clientName}`,
    params.clientSegment ? `Segmento: ${params.clientSegment}` : null,
    `Briefing: ${params.briefing.title}`,
    typeof payload.objective === 'string' ? `Objetivo: ${payload.objective}` : null,
    typeof payload.platform === 'string' ? `Plataforma: ${payload.platform}` : null,
    typeof payload.format === 'string' ? `Formato: ${payload.format}` : null,
    Array.isArray(payload.channels) && payload.channels.length ? `Canais: ${payload.channels.join(', ')}` : null,
    params.instructions ? `Instruções adicionais: ${params.instructions}` : null,
    `Gere ${params.count} opções completas de copy.`,
    `Cada opção deve conter: Headline, Corpo e CTA.`,
    `Idioma: ${params.language}.`,
  ].filter(Boolean) as string[];

  if (params.contextPack) {
    lines.push('INSUMOS:');
    lines.push(params.contextPack);
  }

  if (params.recentPosts?.length) {
    lines.push('\nPOSTS RECENTES DO CLIENTE (evite repetir temas ja abordados):');
    params.recentPosts.forEach((post) => lines.push(`- ${post}`));
  }

  return lines.join('\n');
}

async function ensureCalendarEvents(): Promise<number> {
  const { rows } = await query(
    `SELECT COUNT(*) as total FROM events WHERE date IS NOT NULL AND length(date) = 10 AND date >= to_char(CURRENT_DATE, 'YYYY-MM-DD')`,
  );
  if (Number(rows[0]?.total) > 0) return 0;

  // No future events — import holidays for current and next year
  const years = [new Date().getFullYear(), new Date().getFullYear() + 1];
  let total = 0;
  for (const year of years) {
    try {
      const resp = await fetch(`https://brasilapi.com.br/api/feriados/v1/${year}`);
      if (!resp.ok) continue;
      const holidays = (await resp.json()) as Array<{ date: string; name: string }>;
      for (const h of holidays) {
        const slug = h.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        await query(
          `INSERT INTO events (id, name, slug, date_type, date, scope, country, categories, tags, base_relevance, is_trend_sensitive, source)
           VALUES ($1, $2, $3, 'fixed', $4, 'BR', 'BR', ARRAY['oficial'], ARRAY[$3], 75, false, 'holiday_api:brasilapi')
           ON CONFLICT (id) DO NOTHING`,
          [`holiday_br_${year}_${slug}`, h.name, slug, h.date],
        );
        total++;
      }
    } catch { /* ignore import errors */ }
  }
  return total;
}

export default async function planningRoutes(app: FastifyInstance) {
  const planningTenantReadGuards = [authGuard, tenantGuard(), requirePerm('clients:read')];
  const planningClientReadGuards = [authGuard, tenantGuard(), requirePerm('clients:read'), requireClientPerm('read')];
  const planningClientWriteGuards = [authGuard, tenantGuard(), requirePerm('clients:write'), requireClientPerm('write')];

  // Get available providers
  app.get('/planning/providers', {
    preHandler: planningTenantReadGuards,
  }, async (request, reply) => {
    const info = getAvailableProvidersInfo();
    return reply.send({
      success: true,
      data: {
        available: info.available.map(p => {
          switch (p) {
            case 'claude': return 'anthropic';
            case 'gemini': return 'google';
            default: return p;
          }
        }),
        providers: [
          { id: 'openai', name: 'OpenAI GPT-4', description: 'Creative and versatile' },
          { id: 'anthropic', name: 'Claude', description: 'Strategic and analytical' },
          { id: 'google', name: 'Gemini', description: 'Fast and efficient' },
          { id: 'collaborative', name: 'Colaborativo (3 IAs)', description: 'Gemini + OpenAI + Claude' },
        ],
      },
    });
  });

  // ── Jarvis file upload — synchronous text extraction, no DB write ────────

  app.post<{ Params: { clientId: string } }>('/clients/:clientId/jarvis/upload', {
    preHandler: planningClientWriteGuards,
  }, async (request, reply) => {
    let data: any;
    try {
      data = await request.file();
    } catch {
      return reply.code(400).send({ error: 'Falha ao processar arquivo.' });
    }
    if (!data) return reply.code(400).send({ error: 'Nenhum arquivo enviado.' });

    const buffer = await data.toBuffer();
    const mimeType = (data.mimetype || mime.lookup(data.filename) || 'application/octet-stream') as string;

    let text = '';
    let isAudio = false;
    try {
      if (JARVIS_AUDIO_MIMES.has(mimeType.toLowerCase())) {
        isAudio = true;
        text = await transcribeAudioBuffer(buffer, mimeType);
      } else {
        text = await extractText(mimeType, buffer);
      }
    } catch (e: any) {
      return reply.code(422).send({ error: `Não foi possível extrair texto: ${e?.message}` });
    }

    return reply.send({
      filename: data.filename,
      mime: mimeType,
      is_audio: isAudio,
      chars: text.length,
      text: text.slice(0, 20000),
    });
  });

  // Chat with AI — kept simple and fast: message → AI → response
  app.post<{ Params: { clientId: string } }>('/clients/:clientId/planning/chat', {
    preHandler: planningClientWriteGuards,
  }, async (request, reply) => {
    const startMs = Date.now();
    const { clientId } = request.params;
    const tenantId = (request.user as any)?.tenant_id || 'default';
    const userId = (request.user as any)?.sub;
    const user = request.user as any;
    const edroId = await resolveEdroClientId(clientId);

    let body: z.infer<typeof chatSchema>;
    try {
      body = chatSchema.parse(request.body);
    } catch (parseErr: any) {
      return reply.status(400).send({ success: false, error: 'Mensagem invalida.' });
    }
    const { message, provider, conversationId, mode, attachmentIds, inline_attachments, context_page, studio_context } = body;

    // ── 1. Quick client context + psych context + performance context (best-effort, 3s max) ──
    let clientContext = '';
    let psychContext = '';
    let perfContext = '';
    try {
      [clientContext, psychContext, perfContext] = await Promise.race([
        Promise.all([
          buildClientContext(tenantId, clientId),
          loadPsychContext(tenantId, clientId),
          loadPerformanceContext(clientId),
        ]),
        new Promise<[string, string, string]>((resolve) => setTimeout(() => resolve(['', '', '']), 3000)),
      ]);
    } catch { /* ignore */ }

    // ── 1b. Load attachment content from library items ──────────────
    let attachmentContext = '';
    if (attachmentIds?.length) {
      try {
        const { rows: attachments } = await query(
          `SELECT li.id, li.title, li.type, li.notes, li.description, li.file_mime,
                  ld.text AS extracted_text
           FROM library_items li
           LEFT JOIN library_docs ld ON ld.library_item_id = li.id
           WHERE li.id = ANY($1::uuid[]) AND li.client_id = $2
           LIMIT 5`,
          [attachmentIds, clientId],
        );
        if (attachments.length > 0) {
          const parts = attachments.map((a: any) => {
            // Prefer extracted text (from file/URL), fall back to notes (for note-type items)
            const text = a.extracted_text || a.notes || a.description || '';
            const preview = text.length > 4000 ? text.slice(0, 4000) + '...(truncado)' : text;
            const typeLabel = a.file_mime ? a.file_mime.split('/').pop() : a.type || 'documento';
            return `[Arquivo: ${a.title} (${typeLabel})]\n${preview || '(conteúdo não disponível — item ainda sendo processado)'}`;
          });
          attachmentContext = '\n\nDOCUMENTOS ANEXADOS PELO USUARIO:\n' + parts.join('\n\n');
        }
      } catch (err) {
        console.error('[planning_chat] Failed to load attachments:', err);
      }
    }

    // ── 1c. Inline attachments (uploaded directly via Jarvis file picker) ───
    attachmentContext += buildInlineAttachmentContext(inline_attachments);
    if (studio_context) {
      attachmentContext += `\n\nCONTEXTO DO STUDIO:\n${studio_context}`;
    }

    const copyProvider = provider === 'collaborative'
      ? ('openai' as CopyProvider)
      : mapProviderToCopy(provider);

    const usageCtx: UsageContext | undefined = tenantId && tenantId !== 'default'
      ? { tenant_id: tenantId, feature: 'planning_chat' }
      : undefined;

    let resultOutput = '';
    let resultProvider = '';
    let resultModel = '';
    let assistantContent = '';
    let actionResult: Record<string, any> | null = null;
    let artifacts: Array<{ type: string; [key: string]: any }> = [];
    let toolsUsed = 0;
    let loadedMemoryBlocks: string[] = [];

    const canonicalIntent = detectJarvisIntent(message, context_page);
    const canonicalDecision = buildJarvisRoutingDecision(canonicalIntent);

    const effectiveConversationId = conversationId || crypto.randomUUID();
    const conversationHistory = await loadUnifiedConversationHistory({
      route: canonicalDecision.route,
      tenantId,
      conversationId: effectiveConversationId,
      edroClientId: edroId,
    });

    console.log(`[planning_chat] mode=${mode} provider=${copyProvider} tenant=${tenantId} client=${clientId} history=${conversationHistory.length} route=${canonicalDecision.route}`);

    // ── 3. Agent mode (tool use loop) — also used for 'chat' mode ──
    if (mode === 'agent' || mode === 'chat') {
      const userContent = attachmentContext
        ? message + attachmentContext
        : message;
      const resolvedProvider = getFallbackProvider(copyProvider);
      const planningMemoryKeys =
        canonicalDecision.route === 'operations'
          ? [
            canonicalDecision.primaryMemory,
            ...canonicalDecision.secondaryMemories.filter((memory): memory is any =>
              memory === 'client_memory' || memory === 'operations_memory'
            ),
          ]
          : canonicalDecision.secondaryMemories.filter((memory): memory is any =>
            memory === 'operations_memory'
            || memory === 'canon_edro'
            || memory === 'reference_memory'
            || memory === 'trend_memory'
          );
      const planningMemoryBlocks = await buildJarvisMemoryBlocks({
        tenantId,
        clientId,
        memories: planningMemoryKeys,
        maxBlocks: canonicalDecision.retrievalBudget.contextBlocks,
      });
      const planningMemoryFabric = formatJarvisMemoryBlocks(planningMemoryBlocks);
      loadedMemoryBlocks = [
        ...(clientContext.trim() ? ['Memória do cliente'] : []),
        ...((psychContext.trim() || perfContext.trim()) ? ['Performance'] : []),
        ...planningMemoryBlocks.map((block) => block.label),
      ];

      try {
        const agentTimeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`${canonicalDecision.route.toUpperCase()}_AGENT_TIMEOUT_60s`)), 60000),
        );
        const loopResult = canonicalDecision.route === 'operations'
          ? await Promise.race([
            runToolUseLoop({
              messages: [...conversationHistory, { role: 'user', content: userContent }],
              systemPrompt: buildOperationsSystemPrompt(planningMemoryFabric),
              tools: getOperationsToolDefinitions(),
              provider: resolvedProvider,
              toolContext: { tenantId, userId: userId ?? undefined, userEmail: user?.email } satisfies OperationsToolContext,
              maxIterations: canonicalDecision.retrievalBudget.toolIterations,
              temperature: 0.5,
              maxTokens: 4096,
              usageContext: usageCtx,
              toolExecutorFn: executeOperationsTool,
            }),
            agentTimeout,
          ])
          : await Promise.race([
            runToolUseLoop({
              messages: [...conversationHistory, { role: 'user', content: userContent }],
              systemPrompt: buildAgentSystemPrompt(clientContext, psychContext, perfContext, planningMemoryFabric),
              tools: getAllToolDefinitions(),
              provider: resolvedProvider,
              toolContext: {
                tenantId,
                clientId,
                edroClientId: edroId,
                userId,
                userEmail: user?.email,
                conversationId: effectiveConversationId,
                conversationRoute: canonicalDecision.route,
              } satisfies ToolContext,
              maxIterations: canonicalDecision.retrievalBudget.toolIterations,
              temperature: 0.7,
              maxTokens: 4096,
              usageContext: usageCtx,
            }),
            agentTimeout,
          ]);

        resultOutput = loopResult.finalText;
        resultProvider = loopResult.provider;
        resultModel = loopResult.model;
        assistantContent = resultOutput;
        toolsUsed = loopResult.toolCallsExecuted ?? 0;
        artifacts = (loopResult.toolResults ?? [])
          .filter(r => r.success && r.data)
          .map(r => ({ type: r.toolName, ...r.data }));
        console.log(`[planning_chat] agent ok in ${loopResult.totalDurationMs}ms tools=${loopResult.toolCallsExecuted} iterations=${loopResult.iterations}`);
      } catch (agentError: any) {
        const errMsg = agentError?.message || 'AGENT_ERROR';
        const elapsed = Date.now() - startMs;
        console.error(`[planning_chat] agent FAILED in ${elapsed}ms: ${errMsg}`);
        return reply.status(500).send({
          success: false,
          error: `Falha no agente IA (${errMsg}). Provider: ${resolvedProvider}. Tempo: ${elapsed}ms.`,
        });
      }
    }

    // ── 4. Command mode (legacy — no tools) ─────────────────────────
    if (mode === 'command') {
      const systemPrompt = buildCommandPrompt(clientContext);

      try {
        const commandContent = attachmentContext ? message + attachmentContext : message;
        const aiPromise = generateWithProvider(copyProvider, {
          prompt: commandContent,
          systemPrompt,
          temperature: 0.2,
          maxTokens: 2000,
        }, usageCtx);
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('AI_TIMEOUT_25s')), 25000),
        );
        const aiResult = await Promise.race([aiPromise, timeoutPromise]);
        resultOutput = aiResult.output;
        resultProvider = aiResult.provider;
        resultModel = aiResult.model;
        assistantContent = resultOutput;
        console.log(`[planning_chat] ${mode} ok in ${Date.now() - startMs}ms provider=${aiResult.provider}`);
      } catch (aiError: any) {
        const errMsg = aiError?.message || 'AI_ERROR';
        const elapsed = Date.now() - startMs;
        console.error(`[planning_chat] AI FAILED in ${elapsed}ms: ${errMsg}`);
        return reply.status(500).send({
          success: false,
          error: `Falha na IA (${errMsg}). Provider: ${copyProvider}. Tempo: ${elapsed}ms.`,
        });
      }
    }

    // ── 5. Handle command mode actions (create briefing / generate copy) ──

    if (mode === 'command') {
      try {
        const parsed = normalizeCommandPayload(safeJsonParse(resultOutput));

        if (parsed.action === 'create_briefing') {
          const title = parsed.briefing.title || `Briefing ${new Date().toLocaleDateString('pt-BR')}`;
          const briefing = await createBriefing({
            clientId,
            title,
            payload: {
              objective: parsed.briefing.objective ?? null,
              platform: parsed.briefing.platform ?? null,
              format: parsed.briefing.format ?? null,
              notes: parsed.briefing.notes ?? null,
              channels: parsed.briefing.channels ?? null,
              source: 'planning_chat',
            },
            createdBy: user?.email ?? null,
            dueAt: parseDueAt(parsed.briefing.deadline) ?? undefined,
            source: 'planning_chat',
          });
          await createBriefingStages(briefing.id, user?.email ?? null).catch(() => {});
          assistantContent = `Briefing criado: ${briefing.title}`;
          actionResult = { action: 'create_briefing', briefing: { id: briefing.id, title: briefing.title } };
        } else if (parsed.action === 'generate_copy') {
          const briefing = await resolveBriefingFromCommand({
            tenantId,
            clientId,
            briefingId: parsed.copy.briefing_id,
            briefingTitle: parsed.copy.briefing_title,
          });
          if (!briefing) {
            assistantContent = 'Não encontrei um briefing para gerar o copy. Crie um briefing primeiro.';
            actionResult = { action: 'generate_copy', error: 'briefing_not_found' };
          } else {
            const client = await getClientById(tenantId, clientId);
            // Fetch recent posts for anti-repetition in copy prompt
            let recentPostLines: string[] | undefined;
            try {
              const recentDocs = await listClientDocuments({ tenantId, clientId, limit: 10 });
              if (recentDocs.length > 0) {
                recentPostLines = recentDocs
                  .filter((d) => d.source_type === 'social')
                  .slice(0, 8)
                  .map((d) => {
                    const date = d.published_at ? new Date(d.published_at).toLocaleDateString('pt-BR') : '';
                    return `[${d.platform || ''}] ${date}: ${(d.content_excerpt || d.content_text || '').slice(0, 120)}`;
                  });
              }
            } catch { /* ignore */ }
            const copyResult = await generateCopy({
              prompt: buildPlanningCopyPrompt({
                clientName: client?.name || 'Cliente',
                clientSegment: client?.segment_primary ?? null,
                briefing,
                instructions: parsed.copy.instructions || message,
                count: parsed.copy.count,
                language: parsed.copy.language,
                recentPosts: recentPostLines,
              }),
              taskType: 'social_post',
              forceProvider: copyProvider,
            });
            const copyVersion = await createCopyVersion({
              briefingId: briefing.id,
              language: parsed.copy.language || 'pt',
              model: copyResult.model,
              prompt: message,
              output: copyResult.output,
              payload: copyResult.payload,
              createdBy: user?.email ?? null,
            });
            assistantContent = `Copys geradas para "${briefing.title}".`;
            actionResult = {
              action: 'generate_copy',
              briefing: { id: briefing.id, title: briefing.title },
              copy: { id: copyVersion.id, model: copyResult.model, preview: copyResult.output.slice(0, 400) },
            };
          }
        } else {
          assistantContent = 'Não identifiquei um comando claro. Posso criar um briefing ou gerar copy.';
          actionResult = { action: 'none', reason: parsed.reason };
        }
      } catch (cmdErr: any) {
        request.log?.warn({ err: cmdErr }, 'planning_chat_command_failed');
        // Fall back to showing the raw AI output
        assistantContent = resultOutput;
      }
    }

    // ── 6. Save conversation ──────────────────────────────────────
    let savedConversationId: string | null = conversationId || null;
    const elapsed = Date.now() - startMs;
    const observability = buildJarvisObservability(canonicalDecision, {
      durationMs: elapsed,
      toolsUsed,
      provider: resultProvider,
      model: resultModel,
      loadedMemoryBlocks: mode === 'agent' || mode === 'chat' ? loadedMemoryBlocks : undefined,
    });
    if (mode === 'agent' || mode === 'chat') {
      savedConversationId = await saveUnifiedConversation({
        route: canonicalDecision.route,
        tenantId,
        edroClientId: edroId,
        userId,
        conversationId: effectiveConversationId,
        message,
        assistantContent,
        provider: resultProvider || provider,
        observability,
        artifacts,
      }).catch((error) => {
        console.warn('[planning] conversation save failed:', (error as Error).message);
        return effectiveConversationId || null;
      });
    } else {
      const messagesPayload = [
        { role: 'user', content: message, timestamp: new Date().toISOString() },
        {
          role: 'assistant',
          content: assistantContent,
          timestamp: new Date().toISOString(),
          provider: resultProvider,
          metadata: { observability },
        },
      ];
      (async () => {
        try {
          if (conversationId) {
            await query(
              `UPDATE planning_conversations
               SET messages = messages || $1::jsonb, updated_at = now()
               WHERE id = $2 AND client_id = $3::uuid`,
              [JSON.stringify(messagesPayload), conversationId, edroId],
            );
          } else if (edroId) {
            await query(
              `INSERT INTO planning_conversations (tenant_id, client_id, user_id, title, provider, messages)
               VALUES ($1, $2::uuid, $3, $4, $5, $6::jsonb)`,
              [tenantId, edroId, userId, message.slice(0, 100), provider, JSON.stringify(messagesPayload)],
            );
          }
        } catch (e) {
          console.warn('[planning] conversation save failed:', (e as Error).message);
        }
      })();
    }

    request.log?.info({
      event: 'planning_chat_completed',
      mode,
      clientId,
      conversationId: savedConversationId,
      artifactsCount: artifacts.length,
      ...observability,
    }, 'planning_chat_ok');

    return reply.send({
      success: true,
      data: {
        response: assistantContent,
        provider: resultProvider,
        model: resultModel,
        action: actionResult,
        conversationId: savedConversationId,
        mode,
        artifacts,
        intent: canonicalDecision.intent,
        route: canonicalDecision.route,
        primaryMemory: canonicalDecision.primaryMemory,
        secondaryMemories: canonicalDecision.secondaryMemories,
        observability,
      },
    });
  });

  // List conversations
  app.get<{ Params: { clientId: string } }>('/clients/:clientId/planning/conversations', {
    preHandler: planningClientReadGuards,
  }, async (request, reply) => {
    const { clientId } = request.params;
    const tenantId = (request.user as any)?.tenant_id || 'default';
    const edroId = await resolveEdroClientId(clientId);

    if (!edroId) {
      return reply.send({ success: true, data: { conversations: [] } });
    }

    const result = await query(
      `SELECT id, title, provider, status, created_at, updated_at,
              (SELECT COUNT(*) FROM jsonb_array_elements(messages)) as message_count
       FROM planning_conversations
       WHERE client_id = $1::uuid AND tenant_id = $2
       ORDER BY updated_at DESC
       LIMIT 50`,
      [edroId, tenantId]
    );

    return reply.send({
      success: true,
      data: { conversations: result.rows },
    });
  });

  // Get conversation detail
  app.get<{ Params: { clientId: string; conversationId: string } }>(
    '/clients/:clientId/planning/conversations/:conversationId',
    { preHandler: planningClientReadGuards },
    async (request, reply) => {
      const { clientId, conversationId } = request.params;
      const tenantId = (request.user as any)?.tenant_id || 'default';
      const edroId = await resolveEdroClientId(clientId);

      const result = await query(
        `SELECT * FROM planning_conversations
         WHERE id = $1 AND client_id = $2::uuid AND tenant_id = $3`,
        [conversationId, edroId, tenantId]
      );

      if (!result.rows.length) {
        return reply.status(404).send({ success: false, error: 'Conversation not found' });
      }

      return reply.send({
        success: true,
        data: { conversation: result.rows[0] },
      });
    }
  );

  // Create new conversation
  app.post<{ Params: { clientId: string } }>('/clients/:clientId/planning/conversations', {
    preHandler: planningClientWriteGuards,
  }, async (request, reply) => {
    const { clientId } = request.params;
    const tenantId = (request.user as any)?.tenant_id || 'default';
    const userId = (request.user as any)?.sub;
    const edroId = await resolveEdroClientId(clientId);

    if (!edroId) {
      return reply.status(400).send({ success: false, error: 'Client not found in edro_clients' });
    }

    const body = createConversationSchema.parse(request.body);

    const result = await query(
      `INSERT INTO planning_conversations (tenant_id, client_id, user_id, title, provider, messages)
       VALUES ($1, $2::uuid, $3, $4, $5, '[]'::jsonb)
       RETURNING *`,
      [tenantId, edroId, userId, body.title || 'New Planning Session', body.provider]
    );

    return reply.send({
      success: true,
      data: { conversation: result.rows[0] },
    });
  });

  // Delete conversation
  app.delete<{ Params: { clientId: string; conversationId: string } }>(
    '/clients/:clientId/planning/conversations/:conversationId',
    { preHandler: planningClientWriteGuards },
    async (request, reply) => {
      const { clientId, conversationId } = request.params;
      const tenantId = (request.user as any)?.tenant_id || 'default';
      const edroId = await resolveEdroClientId(clientId);

      await query(
        `DELETE FROM planning_conversations
         WHERE id = $1 AND client_id = $2::uuid AND tenant_id = $3`,
        [conversationId, edroId, tenantId]
      );

      return reply.send({ success: true });
    }
  );

  // AI Opportunities endpoints
  app.get<{ Params: { clientId: string } }>('/clients/:clientId/insights/opportunities', {
    preHandler: planningClientReadGuards,
  }, async (request, reply) => {
    const { clientId } = request.params;
    const tenantId = (request.user as any)?.tenant_id || 'default';
    const edroId = await resolveEdroClientId(clientId);

    if (!edroId) {
      return reply.send({ success: true, data: { opportunities: [] } });
    }

    const result = await query(
      `SELECT * FROM ai_opportunities
       WHERE client_id = $1::uuid AND tenant_id = $2::text AND status != 'dismissed'
       ORDER BY
         CASE priority
           WHEN 'urgent' THEN 1
           WHEN 'high' THEN 2
           WHEN 'medium' THEN 3
           ELSE 4
         END,
         created_at DESC
       LIMIT 20`,
      [edroId, tenantId]
    );

    return reply.send({
      success: true,
      data: { opportunities: result.rows },
    });
  });

  // Generate opportunities from clipping and trends
  app.post<{ Params: { clientId: string } }>('/clients/:clientId/insights/opportunities/generate', {
    preHandler: planningClientWriteGuards,
  }, async (request, reply) => {
    const { clientId } = request.params;
    const tenantId = (request.user as any)?.tenant_id || 'default';
    const edroId = await resolveEdroClientId(clientId);

    if (!edroId) {
      return reply.status(400).send({ success: false, error: 'Client not found in edro_clients' });
    }

    // Gather context: clipping (TEXT client_id), trends (TEXT client_id), calendar (global)
    const [clippingResult, trendsResult, calendarResult] = await Promise.all([
      query(
        `SELECT title, snippet, relevance_score, published_at
         FROM clipping_matches
         WHERE client_id = $1 AND tenant_id = $2::uuid
         ORDER BY relevance_score DESC, published_at DESC
         LIMIT 10`,
        [clientId, tenantId]
      ),
      query(
        `SELECT keyword, platform, mention_count, average_sentiment
         FROM social_listening_trends
         WHERE client_id = $1 AND tenant_id = $2::uuid
         ORDER BY mention_count DESC
         LIMIT 10`,
        [clientId, tenantId]
      ),
      query(
        `SELECT name, date, payload->>'description' as description
         FROM events
         WHERE date IS NOT NULL AND length(date) = 10
           AND date >= to_char(CURRENT_DATE, 'YYYY-MM-DD')
           AND date <= to_char(CURRENT_DATE + INTERVAL '14 days', 'YYYY-MM-DD')
         ORDER BY date
         LIMIT 10`,
        []
      ),
    ]);

    const clientContext = await buildClientContext(tenantId, clientId);

    const contextParts = [
      'CLIPPING RECENTE:',
      clippingResult.rows.map(r => `- ${r.title}: ${r.snippet}`).join('\n'),
      '\nTENDÊNCIAS SOCIAIS:',
      trendsResult.rows.map(r => `- ${r.keyword} (${r.platform}): ${r.mention_count} menções`).join('\n'),
      '\nCALENDÁRIO PRÓXIMO:',
      calendarResult.rows.map(r => `- ${r.date_ref}: ${r.name}`).join('\n'),
    ].join('\n');

    const prompt = `Based on the following context, identify 3-5 marketing opportunities for the client.

CLIENT CONTEXT:
${clientContext}

${contextParts}

For each opportunity, provide:
1. Title (concise, action-oriented)
2. Description (2-3 sentences)
3. Source (clipping, trend, or calendar)
4. Suggested Action (specific next step)
5. Priority (urgent, high, medium, low)
6. Confidence (0-100)

Return as JSON array with keys: title, description, source, suggestedAction, priority, confidence`;

    const oppUsageCtx: UsageContext | undefined = tenantId && tenantId !== 'default'
      ? { tenant_id: tenantId, feature: 'opportunities_generate' }
      : undefined;
    const result = await generateWithProvider('claude', {
      prompt,
      systemPrompt: 'You are a strategic marketing analyst. Return only valid JSON.',
      temperature: 0.7,
      maxTokens: 2000,
    }, oppUsageCtx);

    // Parse AI response
    let opportunities: any[] = [];
    try {
      const jsonMatch = result.output.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        opportunities = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Failed to parse opportunities:', e);
    }

    // Save opportunities (ai_opportunities.client_id is UUID → edro_clients)
    for (const opp of opportunities) {
      await query(
        `INSERT INTO ai_opportunities
         (tenant_id, client_id, title, description, source, suggested_action, priority, confidence)
         VALUES ($1::text, $2::uuid, $3, $4, $5, $6, $7, $8)`,
        [
          tenantId,
          edroId,
          opp.title,
          opp.description,
          opp.source,
          opp.suggestedAction,
          opp.priority || 'medium',
          opp.confidence || 70,
        ]
      );
    }

    return reply.send({
      success: true,
      data: {
        generated: opportunities.length,
        opportunities,
      },
    });
  });

  // Update opportunity status
  app.patch<{ Params: { clientId: string; opportunityId: string } }>(
    '/clients/:clientId/insights/opportunities/:opportunityId',
    { preHandler: planningClientWriteGuards },
    async (request, reply) => {
      const { clientId, opportunityId } = request.params;
      const tenantId = (request.user as any)?.tenant_id || 'default';
      const userId = (request.user as any)?.sub;
      const edroId = await resolveEdroClientId(clientId);
      const { status } = request.body as { status: string };

      const updates: string[] = ['status = $4', 'updated_at = now()'];
      const params: any[] = [opportunityId, edroId, tenantId, status];

      if (status === 'actioned') {
        updates.push('actioned_at = now()');
        updates.push(`actioned_by = $${params.length + 1}`);
        params.push(userId);
      }

      await query(
        `UPDATE ai_opportunities SET ${updates.join(', ')}
         WHERE id = $1 AND client_id = $2::uuid AND tenant_id = $3::text`,
        params
      );

      return reply.send({ success: true });
    }
  );

  // ── Full AI Analysis ──────────────────────────────────────────────
  app.post<{ Params: { clientId: string } }>('/clients/:clientId/analyze', {
    preHandler: planningClientReadGuards,
  }, async (request, reply) => {
    const { clientId } = request.params;
    const tenantId = (request.user as any)?.tenant_id || 'default';
    const edroId = await resolveEdroClientId(clientId);

    // Gather ALL data sources in parallel
    // TEXT tables (library/clipping/social) use clientId; UUID tables (briefings/opportunities) use edroId
    const [
      clientContext,
      contextPack,
      clippingResult,
      trendsResult,
      calendarResult,
      opportunitiesResult,
      briefingsResult,
      performanceResult,
    ] = await Promise.all([
      buildClientContext(tenantId, clientId),
      Promise.race([
        buildContextPack({ tenant_id: tenantId, client_id: clientId, query: 'analise estrategica completa do cliente' }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Context pack timed out')), 10000)),
      ]).catch(() => ({ sources: [], packedText: '' })),
      query(
        `SELECT cm.score, cm.matched_keywords, ci.title, ci.snippet, ci.published_at
         FROM clipping_matches cm
         JOIN clipping_items ci ON ci.id = cm.clipping_item_id
         WHERE cm.client_id = $1 AND cm.tenant_id = $2::uuid
         ORDER BY cm.score DESC, cm.created_at DESC
         LIMIT 15`,
        [clientId, tenantId]
      ).catch(() => ({ rows: [] })),
      query(
        `SELECT keyword, platform, mention_count, average_sentiment, positive_count, negative_count, total_engagement
         FROM social_listening_trends
         WHERE client_id = $1 AND tenant_id = $2::uuid
         ORDER BY mention_count DESC
         LIMIT 15`,
        [clientId, tenantId]
      ).catch(() => ({ rows: [] })),
      query(
        `SELECT name, date, categories, tags, base_relevance
         FROM events
         WHERE date IS NOT NULL
         ORDER BY date
         LIMIT 20`,
        []
      ).catch(() => ({ rows: [] })),
      query(
        `SELECT title, description, source, suggested_action, priority, confidence, status
         FROM ai_opportunities
         WHERE client_id = $1::uuid AND tenant_id = $2::text AND status != 'dismissed'
         ORDER BY CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, confidence DESC
         LIMIT 10`,
        [edroId, tenantId]
      ).catch(() => ({ rows: [] })),
      query(
        `SELECT title, payload, created_at
         FROM edro_briefings
         WHERE client_id = $1::uuid
         ORDER BY created_at DESC
         LIMIT 10`,
        [edroId]
      ).catch(() => ({ rows: [] })),
      query(
        `SELECT platform, time_window, payload, created_at
         FROM learned_insights
         WHERE client_id = $1 AND tenant_id = $2
         ORDER BY created_at DESC
         LIMIT 10`,
        [clientId, tenantId]
      ).catch(() => ({ rows: [] })),
    ]);

    const sourcesUsed = {
      clipping: clippingResult.rows.length,
      trends: trendsResult.rows.length,
      calendar: calendarResult.rows.length,
      library: contextPack.sources.length,
      opportunities: opportunitiesResult.rows.length,
      briefings: briefingsResult.rows.length,
      performance: performanceResult.rows.length,
    };

    // Format data for prompts
    const clippingText = clippingResult.rows.length
      ? clippingResult.rows.map((r: any) => `- [${r.score}] ${r.title}: ${r.snippet || ''} (keywords: ${(r.matched_keywords || []).join(', ')})`).join('\n')
      : 'Nenhum clipping disponível.';

    const trendsText = trendsResult.rows.length
      ? trendsResult.rows.map((r: any) => `- ${r.keyword} (${r.platform}): ${r.mention_count} mencoes, sentimento ${r.average_sentiment}/100, engajamento ${r.total_engagement}`).join('\n')
      : 'Nenhuma tendência disponível.';

    const calendarText = calendarResult.rows.length
      ? calendarResult.rows.map((r: any) => `- ${r.date}: ${r.name} [${(r.categories || []).join(', ')}] relevância base: ${r.base_relevance}`).join('\n')
      : 'Nenhum evento proximo.';

    const opportunitiesText = opportunitiesResult.rows.length
      ? opportunitiesResult.rows.map((r: any) => `- [${r.priority}] ${r.title}: ${r.description || ''} → ${r.suggested_action || ''} (confiança: ${r.confidence}%)`).join('\n')
      : 'Nenhuma oportunidade identificada.';

    const briefingsText = briefingsResult.rows.length
      ? briefingsResult.rows.map((r: any) => {
          const p = r.payload || {};
          return `- ${r.title} (${new Date(r.created_at).toLocaleDateString('pt-BR')}) plataforma: ${p.platform || '?'}, formato: ${p.format || '?'}`;
        }).join('\n')
      : 'Nenhum briefing recente.';

    const libraryText = contextPack.packedText || 'Nenhum material na biblioteca.';

    const performanceText = performanceResult.rows.length
      ? performanceResult.rows.map((r: any) => {
          const p = r.payload || {};
          const kpis = p.kpis || p.summary || {};
          const parts = [`- ${r.platform} (${r.time_window || 'geral'}):`];
          if (kpis.impressions) parts.push(`impressoes: ${kpis.impressions}`);
          if (kpis.reach) parts.push(`alcance: ${kpis.reach}`);
          if (kpis.engagement) parts.push(`engajamento: ${kpis.engagement}`);
          if (kpis.clicks) parts.push(`cliques: ${kpis.clicks}`);
          if (kpis.followers) parts.push(`seguidores: ${kpis.followers}`);
          if (kpis.engagement_rate) parts.push(`taxa engaj.: ${kpis.engagement_rate}%`);
          if (p.by_format) parts.push(`formatos: ${JSON.stringify(p.by_format)}`);
          if (p.editorial_insights) parts.push(`insights: ${typeof p.editorial_insights === 'string' ? p.editorial_insights : JSON.stringify(p.editorial_insights)}`);
          return parts.join(' ');
        }).join('\n')
      : 'Nenhum dado de performance disponível (Reportei não sincronizado).';

    const analyzeUsageCtx: UsageContext | undefined = tenantId && tenantId !== 'default'
      ? { tenant_id: tenantId, feature: 'client_analysis' }
      : undefined;
    try {
      const result = await runCollaborativePipeline({
        usageContext: analyzeUsageCtx,
        analysisPrompt: [
          'Você é um analista de dados sênior de uma agência de comunicação.',
          'Analise TODOS os dados abaixo sobre o cliente e extraia insights estruturados.',
          '',
          'PERFIL DO CLIENTE:',
          clientContext || 'Perfil não disponível.',
          '',
          'BIBLIOTECA DE CONHECIMENTO:',
          libraryText,
          '',
          'CLIPPING RECENTE (notícias e menções):',
          clippingText,
          '',
          'TENDENCIAS SOCIAIS:',
          trendsText,
          '',
          'CALENDARIO PROXIMO:',
          calendarText,
          '',
          'OPORTUNIDADES JA IDENTIFICADAS:',
          opportunitiesText,
          '',
          'BRIEFINGS RECENTES:',
          briefingsText,
          '',
          'PERFORMANCE / METRICAS (Reportei):',
          performanceText,
          '',
          'Retorne um relatório estruturado com:',
          '1. PONTOS FORTES da presenca digital do cliente',
          '2. PONTOS FRACOS e gaps identificados',
          '3. OPORTUNIDADES imediatas (próximos 14-30 dias)',
          '4. AMEAÇAS ou riscos identificados',
          '5. ANÁLISE DE SENTIMENTO e engajamento (se dados disponíveis)',
          '6. PERFORMANCE POR PLATAFORMA (métricas do Reportei: impressões, alcance, engajamento, cliques)',
          '7. GAPS DE CONTEÚDO (temas não cobertos, plataformas subutilizadas)',
          '8. MÉTRICAS-CHAVE resumidas',
        ].join('\n'),
        creativePrompt: (analysisOutput: string) => [
          'Você é um estrategista sênior de comunicação de uma agência premium.',
          'Use os INSIGHTS DO ANALISTA abaixo para criar recomendações estratégicas concretas.',
          '',
          'INSIGHTS DO ANALISTA:',
          analysisOutput,
          '',
          'PERFIL DO CLIENTE:',
          clientContext || 'Perfil não disponível.',
          '',
          'Elabore:',
          '1. PLANO DE AÇÃO para os próximos 30 dias (ações concretas, priorizadas, com responsável sugerido)',
          '2. OPORTUNIDADES DE CALENDÁRIO (como aproveitar as datas próximas para este cliente)',
          '3. RECOMENDAÇÕES DE CONTEÚDO (temas, formatos, plataformas específicas)',
          '4. QUICK WINS (ações de baixo esforço e alto impacto, executáveis esta semana)',
          '5. ALERTAS (pontos de atenção urgentes que precisam de ação imediata)',
          '6. SUGESTÕES DE BRIEFINGS (ideias concretas para próximos conteúdos)',
        ].join('\n'),
        reviewPrompt: (analysisOutput: string, strategicOutput: string) => [
          'Você é o diretor de planejamento de uma agência de comunicação premium.',
          'Revise e compile o relatório final para apresentação ao cliente.',
          '',
          'INSIGHTS DO ANALISTA:',
          analysisOutput,
          '',
          'ESTRATÉGIA PROPOSTA:',
          strategicOutput,
          '',
          'Produza um relatório final em português brasileiro com as seções abaixo.',
          'Use markdown com títulos, listas, negrito e tabelas quando apropriado.',
          'Seja direto, acionável e estratégico.',
          '',
          'Seções obrigatórias:',
          '## Visão Geral',
          '(resumo executivo em 3-5 frases)',
          '',
          '## Análise de Presença Digital',
          '(pontos fortes, fracos, sentimento, métricas de performance)',
          '',
          '## Oportunidades e Calendário',
          '(datas próximas + como aproveitar)',
          '',
          '## Plano de Ação',
          '(tabela: ação | prioridade | prazo | plataforma)',
          '',
          '## Recomendações de Conteúdo',
          '(temas, formatos, ideias de briefing)',
          '',
          '## Quick Wins',
          '(ações rápidas de alto impacto)',
          '',
          '## Alertas e Pontos de Atenção',
          '(riscos, ameaças, ações urgentes)',
          '',
          '## Próximos Passos',
          '(o que fazer esta semana)',
        ].join('\n'),
        maxTokens: { analysis: 2000, creative: 2500, review: 3000 },
      });

      return reply.send({
        success: true,
        data: {
          analysis: result.output,
          stages: result.stages,
          sources_used: sourcesUsed,
          total_duration_ms: result.total_duration_ms,
        },
      });
    } catch (error: any) {
      request.log?.error({ err: error }, 'client_analysis_failed');
      return reply.status(500).send({
        success: false,
        error: error?.message || 'Falha ao gerar análise.',
      });
    }
  });

  // POST /clients/:id/planning/health - Check health of all intelligence sources
  // Single SQL with scalar subqueries — 1 DB connection, fast
  app.post<{ Params: { clientId: string } }>('/clients/:clientId/planning/health', {
    preHandler: planningClientReadGuards,
  }, async (request, reply) => {
    const { clientId } = request.params;
    const tenantId = (request.user as any)?.tenant_id || 'default';
    const now = new Date().toISOString();

    const defaultHealth = {
      overall: 'warning' as const,
      sources: {
        library:        { status: 'warning' as const, data: null, message: 'Sem dados', lastCheck: now },
        clipping:       { status: 'warning' as const, data: null, message: 'Sem dados', lastCheck: now },
        social:         { status: 'warning' as const, data: null, message: 'Sem dados', lastCheck: now },
        calendar:       { status: 'warning' as const, data: null, message: 'Sem dados', lastCheck: now },
        opportunities:  { status: 'warning' as const, data: null, message: 'Sem dados', lastCheck: now },
        antiRepetition: { status: 'healthy' as const, data: null, message: '0 copies', lastCheck: now },
        briefings:      { status: 'healthy' as const, data: null, message: '0 briefings', lastCheck: now },
      },
    };

    try {
      const edroId = await resolveEdroClientId(clientId);

      // $1 = clientId (TEXT, for clients-based tables)
      // $2 = tenantId (UUID string)
      // $3 = edroId (UUID string or null, for edro_clients-based tables)
      const result = await Promise.race([
        query(`
          SELECT
            (SELECT COUNT(*) FROM library_items WHERE client_id = $1 AND tenant_id = $2::uuid) as lib_total,
            (SELECT COUNT(*) FROM library_items WHERE client_id = $1 AND tenant_id = $2::uuid AND status = 'ready') as lib_ready,
            (SELECT COUNT(*) FROM library_items WHERE client_id = $1 AND tenant_id = $2::uuid AND status = 'error') as lib_error,
            (SELECT COUNT(*) FROM clipping_matches WHERE client_id = $1 AND tenant_id = $2::uuid AND created_at > NOW() - INTERVAL '30 days') as clip_total,
            (SELECT COUNT(*) FROM social_listening_trends WHERE client_id = $1 AND tenant_id = $2::uuid AND created_at > NOW() - INTERVAL '7 days') as social_total,
            (SELECT COUNT(*) FROM events WHERE date IS NOT NULL AND length(date) = 10 AND date >= to_char(CURRENT_DATE, 'YYYY-MM-DD')) as cal_total,
            (SELECT COUNT(*) FROM events WHERE date IS NOT NULL AND length(date) = 10 AND date >= to_char(CURRENT_DATE, 'YYYY-MM-DD') AND date <= to_char(CURRENT_DATE + INTERVAL '14 days', 'YYYY-MM-DD')) as cal_upcoming,
            (SELECT COUNT(*) FROM ai_opportunities WHERE client_id = $3::uuid AND tenant_id = $2::text AND status != 'dismissed') as opp_total,
            (SELECT COUNT(*) FROM ai_opportunities WHERE client_id = $3::uuid AND tenant_id = $2::text AND status != 'dismissed' AND priority = 'urgent') as opp_urgent,
            (SELECT COUNT(*) FROM edro_copy_versions ecv JOIN edro_briefings eb ON eb.id = ecv.briefing_id WHERE eb.client_id = $3::uuid AND ecv.created_at > NOW() - INTERVAL '90 days') as copies_total,
            (SELECT COUNT(*) FROM edro_briefings WHERE client_id = $3::uuid AND created_at > NOW() - INTERVAL '90 days') as brief_total
        `, [clientId, tenantId, edroId]),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Health timed out')), 8000)),
      ]);

      const r = result.rows?.[0] || {};
      const n = (v: any) => Number(v) || 0;

      type HS = 'healthy' | 'warning' | 'error';
      const src = (status: HS, message: string, data?: any) => ({ status, data: data ?? null, message, lastCheck: now });

      const libTotal = n(r.lib_total); const libReady = n(r.lib_ready); const libError = n(r.lib_error);
      const clipTotal = n(r.clip_total);
      const socialTotal = n(r.social_total);
      const calTotal = n(r.cal_total); const calUpcoming = n(r.cal_upcoming);
      const oppTotal = n(r.opp_total); const oppUrgent = n(r.opp_urgent);
      const copiesTotal = n(r.copies_total);
      const briefTotal = n(r.brief_total);

      const health = {
        overall: 'healthy' as HS,
        sources: {
          library: libError > 0
            ? src('warning', `${libError} item(s) com erro`)
            : libTotal === 0
              ? src('warning', 'Nenhum item na library')
              : src('healthy', `${libReady} item(s) pronto(s)`),
          clipping: clipTotal === 0
            ? src('warning', 'Nenhum clipping nos ultimos 30 dias')
            : src('healthy', `${clipTotal} matches ativos`),
          social: socialTotal === 0
            ? src('warning', 'Nenhum dado social nos ultimos 7 dias')
            : src('healthy', `${socialTotal} trends detectadas`),
          calendar: calTotal === 0
            ? src('warning', 'Nenhum evento futuro cadastrado')
            : src('healthy', `${calUpcoming} eventos próximos`),
          opportunities: oppUrgent > 0
            ? src('warning', `${oppUrgent} oportunidade(s) urgente(s)`)
            : src('healthy', `${oppTotal} oportunidades ativas`),
          antiRepetition: src('healthy', `${copiesTotal} copies recentes`),
          briefings: src('healthy', `${briefTotal} briefings (ultimos 90 dias)`),
        },
      };

      const warnCount = Object.values(health.sources).filter(s => s.status === 'warning').length;
      if (warnCount > 2) health.overall = 'warning';

      return reply.send({ success: true, data: health });
    } catch (error: any) {
      request.log?.error({ err: error, clientId }, 'health_check_failed');
      return reply.send({ success: true, data: defaultHealth });
    }
  });

  // POST /clients/:id/planning/context - Load intelligence stats via single DB query
  // Single SQL with scalar subqueries — uses 1 DB connection instead of 7
  app.post<{ Params: { clientId: string } }>('/clients/:clientId/planning/context', {
    preHandler: planningClientReadGuards,
  }, async (request, reply) => {
    const { clientId } = request.params;
    const tenantId = (request.user as any)?.tenant_id || 'default';

    // Default zero stats — returned immediately if DB query fails
    const zeroStats = {
      library: { totalItems: 0 },
      clipping: { totalMatches: 0, topKeywords: [] as string[] },
      social: { totalMentions: 0, sentimentAvg: 50 },
      calendar: { next14Days: 0, highRelevance: 0 },
      opportunities: { active: 0, urgent: 0, highConfidence: 0 },
      briefings: { recent: 0, pending: 0 },
      copies: { recentHashes: 0, usedAngles: 0 },
      clientContent: { totalDocuments: 0 },
    };

    try {
      const edroId = await resolveEdroClientId(clientId);

      // $1 = clientId (TEXT), $2 = tenantId, $3 = edroId (UUID or null)
      const result = await Promise.race([
        query(`
          SELECT
            (SELECT COUNT(*) FROM library_items WHERE client_id = $1 AND tenant_id = $2::uuid AND status = 'ready') as library_total,
            (SELECT COUNT(*) FROM clipping_matches WHERE client_id = $1 AND tenant_id = $2::uuid AND created_at > NOW() - INTERVAL '30 days' AND score > 70) as clipping_total,
            (SELECT COALESCE(SUM(mention_count), 0) FROM social_listening_trends WHERE client_id = $1 AND tenant_id = $2::uuid AND created_at > NOW() - INTERVAL '7 days') as social_mentions,
            (SELECT COALESCE(AVG(average_sentiment), 50) FROM social_listening_trends WHERE client_id = $1 AND tenant_id = $2::uuid AND created_at > NOW() - INTERVAL '7 days') as social_sentiment,
            (SELECT COUNT(*) FROM events WHERE date IS NOT NULL AND length(date) = 10 AND date >= to_char(CURRENT_DATE, 'YYYY-MM-DD') AND date <= to_char(CURRENT_DATE + INTERVAL '14 days', 'YYYY-MM-DD')) as calendar_next14,
            (SELECT COUNT(*) FROM events WHERE date IS NOT NULL AND length(date) = 10 AND date >= to_char(CURRENT_DATE, 'YYYY-MM-DD') AND date <= to_char(CURRENT_DATE + INTERVAL '14 days', 'YYYY-MM-DD') AND base_relevance > 80) as calendar_high_rel,
            (SELECT COUNT(*) FROM ai_opportunities WHERE client_id = $3::uuid AND tenant_id = $2::text AND status != 'dismissed') as opps_total,
            (SELECT COUNT(*) FROM ai_opportunities WHERE client_id = $3::uuid AND tenant_id = $2::text AND status != 'dismissed' AND priority = 'urgent') as opps_urgent,
            (SELECT COUNT(*) FROM ai_opportunities WHERE client_id = $3::uuid AND tenant_id = $2::text AND status != 'dismissed' AND confidence >= 80) as opps_high,
            (SELECT COUNT(*) FROM edro_briefings WHERE client_id = $3::uuid AND created_at > NOW() - INTERVAL '90 days') as briefings_total,
            (SELECT COUNT(*) FROM edro_briefings WHERE client_id = $3::uuid AND created_at > NOW() - INTERVAL '90 days' AND status NOT IN ('done', 'cancelled')) as briefings_pending,
            (SELECT COUNT(*) FROM edro_copy_versions ecv JOIN edro_briefings eb ON eb.id = ecv.briefing_id WHERE eb.client_id = $3::uuid AND ecv.created_at > NOW() - INTERVAL '90 days') as copies_total,
            (SELECT COUNT(*) FROM client_documents WHERE client_id = $1 AND tenant_id = $2::uuid) as content_total
        `, [clientId, tenantId, edroId]),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Context query timed out')), 8000)),
      ]);

      const row = result.rows?.[0] || {};
      const n = (val: any, fallback = 0) => Number(val) || fallback;

      const stats = {
        library: { totalItems: n(row.library_total) },
        clipping: { totalMatches: n(row.clipping_total), topKeywords: [] as string[] },
        social: { totalMentions: n(row.social_mentions), sentimentAvg: n(row.social_sentiment, 50) },
        calendar: { next14Days: n(row.calendar_next14), highRelevance: n(row.calendar_high_rel) },
        opportunities: {
          active: n(row.opps_total),
          urgent: n(row.opps_urgent),
          highConfidence: n(row.opps_high),
        },
        briefings: { recent: n(row.briefings_total), pending: n(row.briefings_pending) },
        copies: { recentHashes: n(row.copies_total), usedAngles: 0 },
        clientContent: { totalDocuments: n(row.content_total) },
      };

      return reply.send({
        success: true,
        data: { stats },
      });
    } catch (error: any) {
      request.log?.error({ err: error }, 'planning_context_stats_failed');
      return reply.send({
        success: true,
        data: {
          stats: zeroStats,
          partial: true,
          warning: error?.message || 'Contexto indisponível no momento.',
        },
      });
    }
  });

  // POST /clients/:id/planning/validate-copy - Anti-repetition + brand safety
  app.post<{ Params: { clientId: string } }>('/clients/:clientId/planning/validate-copy', {
    preHandler: planningClientReadGuards,
  }, async (request, reply) => {
    const { clientId } = request.params;
    const tenantId = (request.user as any)?.tenant_id || 'default';
    const { copyText } = request.body as { copyText: string };

    if (!copyText || !copyText.trim()) {
      return reply.status(400).send({
        success: false,
        error: 'copyText is required',
      });
    }

    try {
      const repetitionCheck = await detectRepetition({
        client_id: clientId,
        copyText,
      });

      // Brand safety checks (simple for now)
      const client = await getClientById(tenantId, clientId);
      const negativeKeywords = client?.profile?.negative_keywords || [];
      const violations = negativeKeywords.filter((kw: string) =>
        copyText.toLowerCase().includes(kw.toLowerCase())
      );

      return reply.send({
        success: true,
        data: {
          repetition: repetitionCheck,
          brandSafety: {
            violations,
            isClean: violations.length === 0,
          },
          overall: {
            approved: repetitionCheck.recommendation === 'approve' && violations.length === 0,
            recommendation: violations.length > 0
              ? 'reject'
              : repetitionCheck.recommendation,
            reason: violations.length > 0
              ? `Contém palavras proibidas: ${violations.join(', ')}`
              : repetitionCheck.reason,
          },
        },
      });
    } catch (error: any) {
      request.log?.error({ err: error }, 'validate_copy_failed');
      return reply.status(500).send({
        success: false,
        error: error?.message || 'Falha ao validar copy.',
      });
    }
  });

  // POST /clients/:id/planning/opportunities/detect - Trigger opportunity detection
  app.post<{ Params: { clientId: string } }>('/clients/:clientId/planning/opportunities/detect', {
    preHandler: planningClientWriteGuards,
  }, async (request, reply) => {
    const { clientId } = request.params;
    const tenantId = (request.user as any)?.tenant_id || 'default';
    const edroId = await resolveEdroClientId(clientId);

    if (!edroId) {
      return reply.send({ success: true, data: { detected: 0, message: 'Client not found in edro_clients' } });
    }

    try {
      const count = await detectOpportunitiesForClient({
        tenant_id: tenantId,
        client_id: clientId,
      });

      return reply.send({
        success: true,
        data: {
          detected: count,
          message: `${count} novas oportunidades detectadas`,
        },
      });
    } catch (error: any) {
      request.log?.error({ err: error }, 'opportunity_detection_failed');
      return reply.status(500).send({
        success: false,
        error: error?.message || 'Falha ao detectar oportunidades.',
      });
    }
  });

  // POST /clients/:id/planning/opportunities/:oppId/action - Convert opportunity to briefing
  app.post<{ Params: { clientId: string; oppId: string } }>(
    '/clients/:clientId/planning/opportunities/:oppId/action',
    { preHandler: planningClientWriteGuards },
    async (request, reply) => {
      const { clientId, oppId } = request.params;
      const tenantId = (request.user as any)?.tenant_id || 'default';
      const user = request.user as any;
      const edroId = await resolveEdroClientId(clientId);
      const { action } = request.body as { action: 'create_briefing' | 'dismiss' };

      // Get opportunity (ai_opportunities.client_id is UUID → edro_clients)
      const { rows: oppRows } = await query(
        `SELECT * FROM ai_opportunities WHERE id = $1 AND client_id = $2::uuid AND tenant_id = $3::text`,
        [oppId, edroId, tenantId]
      );

      if (!oppRows.length) {
        return reply.status(404).send({ success: false, error: 'Opportunity not found' });
      }

      const opp = oppRows[0];

      if (action === 'dismiss') {
        await query(
          `UPDATE ai_opportunities SET status = 'dismissed', updated_at = now() WHERE id = $1`,
          [oppId]
        );
        return reply.send({ success: true, data: { action: 'dismissed' } });
      }

      if (action === 'create_briefing') {
        // Create briefing from opportunity
        const briefing = await createBriefing({
          clientId,
          title: opp.title,
          payload: {
            objective: opp.description,
            source: 'ai_opportunity',
            opportunity_id: oppId,
            suggested_action: opp.suggested_action,
          },
          createdBy: user?.email || null,
          source: 'planning_opportunity',
        });

        // Link opportunity to briefing via source_opportunity_id
        // (This will be done when migration runs and column exists)

        // Mark opportunity as actioned
        await query(
          `UPDATE ai_opportunities
           SET status = 'actioned', actioned_at = now(), actioned_by = $2, updated_at = now()
           WHERE id = $1`,
          [oppId, user?.email || null]
        );

        return reply.send({
          success: true,
          data: {
            action: 'create_briefing',
            briefing: {
              id: briefing.id,
              title: briefing.title,
            },
          },
        });
      }

      return reply.status(400).send({ success: false, error: 'Invalid action' });
    }
  );

  // GET /clients/:clientId/briefings - List briefings for a specific client
  app.get<{ Params: { clientId: string } }>('/clients/:clientId/briefings', {
    preHandler: planningClientReadGuards,
  }, async (request, reply) => {
    const { clientId } = request.params;
    const tenantId = (request.user as any).tenant_id as string;
    const edroId = await resolveEdroClientId(clientId);

    if (!edroId) {
      return reply.send({ success: true, briefings: [] });
    }

    const briefings = await listBriefings({ tenantId, clientId: edroId, limit: 50 });

    return reply.send({
      success: true,
      briefings,
    });
  });

  // DELETE /clients/:clientId/briefings/:briefingId - Delete a briefing
  app.delete<{ Params: { clientId: string; briefingId: string } }>('/clients/:clientId/briefings/:briefingId', {
    preHandler: planningClientWriteGuards,
  }, async (request, reply) => {
    const { briefingId } = request.params;
    const tenantId = (request.user as any).tenant_id as string;
    const deleted = await deleteBriefing(briefingId, tenantId);
    if (!deleted) return reply.status(404).send({ error: 'not_found' });
    return reply.send({ ok: true });
  });

  // PATCH /clients/:clientId/briefings/:briefingId/archive - Archive a briefing
  app.patch<{ Params: { clientId: string; briefingId: string } }>('/clients/:clientId/briefings/:briefingId/archive', {
    preHandler: planningClientWriteGuards,
  }, async (request, reply) => {
    const { briefingId } = request.params;
    const tenantId = (request as any).user?.tenant_id as string | undefined;
    const briefing = await archiveBriefing(briefingId, tenantId);
    if (!briefing) return reply.status(404).send({ error: 'not_found' });
    return reply.send(briefing);
  });

  // GET /clients/:clientId/copies - List copy versions for a specific client
  app.get<{ Params: { clientId: string } }>('/clients/:clientId/copies', {
    preHandler: planningClientReadGuards,
  }, async (request, reply) => {
    const { clientId } = request.params;
    const tenantId = (request.user as any).tenant_id as string;
    const edroId = await resolveEdroClientId(clientId);

    if (!edroId) {
      return reply.send({ success: true, copies: [] });
    }

    const result = await query(
      `SELECT ecv.*
       FROM edro_copy_versions ecv
       JOIN edro_briefings eb ON eb.id = ecv.briefing_id
       WHERE eb.client_id = $1::uuid
         AND eb.tenant_id = $2
       ORDER BY ecv.created_at DESC
       LIMIT 50`,
      [edroId, tenantId]
    );

    return reply.send({
      success: true,
      copies: result.rows,
    });
  });

  // POST /clients/:id/planning/bootstrap - Seed initial data for a client
  app.post<{ Params: { clientId: string } }>('/clients/:clientId/planning/bootstrap', {
    preHandler: planningClientWriteGuards,
  }, async (request, reply) => {
    const { clientId } = request.params;
    const tenantId = (request.user as any)?.tenant_id || 'default';
    const edroId = await resolveEdroClientId(clientId);
    const results: Record<string, any> = {};

    // 1) Ensure calendar events exist
    try {
      results.calendar = { imported: await ensureCalendarEvents() };
    } catch (e: any) {
      results.calendar = { error: e?.message };
    }

    // 2) Run opportunity detection if none exist (with 10s timeout — uses AI so can be slow)
    try {
      if (!edroId) {
        results.opportunities = { skipped: 'no edro_clients match' };
      } else {
        const { rows } = await query(
          `SELECT COUNT(*) as total FROM ai_opportunities WHERE client_id = $1::uuid AND tenant_id = $2::text AND status != 'dismissed'`,
          [edroId, tenantId],
        );
        if (Number(rows[0]?.total) === 0) {
          const count = await Promise.race([
            detectOpportunitiesForClient({ tenant_id: tenantId, client_id: clientId }),
            new Promise<number>((resolve) => setTimeout(() => resolve(0), 10000)),
          ]);
          results.opportunities = { detected: count };
        } else {
          results.opportunities = { existing: Number(rows[0]?.total) };
        }
      }
    } catch (e: any) {
      results.opportunities = { error: e?.message };
    }

    return reply.send({ success: true, data: results });
  });

  // GET /clients/:clientId/planning/opportunities - List opportunities (alias)
  app.get<{ Params: { clientId: string } }>('/clients/:clientId/planning/opportunities', {
    preHandler: planningClientReadGuards,
  }, async (request, reply) => {
    const { clientId } = request.params;
    const tenantId = (request.user as any)?.tenant_id || 'default';
    const edroId = await resolveEdroClientId(clientId);

    if (!edroId) {
      return reply.send({ success: true, opportunities: [] });
    }

    const result = await query(
      `SELECT * FROM ai_opportunities
       WHERE client_id = $1::uuid AND tenant_id = $2::text AND status != 'dismissed'
       ORDER BY
         CASE priority
           WHEN 'urgent' THEN 1
           WHEN 'high' THEN 2
           WHEN 'medium' THEN 3
           ELSE 4
         END,
         created_at DESC
       LIMIT 20`,
      [edroId, tenantId]
    );

    return reply.send({
      success: true,
      opportunities: result.rows,
    });
  });

  // ── Client Intelligence Endpoints ──────────────────────────────

  // GET /clients/:clientId/intelligence/documents — paginated client content
  app.get<{ Params: { clientId: string }; Querystring: { limit?: string; offset?: string; platform?: string } }>(
    '/clients/:clientId/intelligence/documents',
    { preHandler: planningClientReadGuards },
    async (request, reply) => {
      const { clientId } = request.params;
      const tenantId = (request.user as any)?.tenant_id || 'default';
      const limit = Math.min(Number(request.query.limit) || 20, 50);
      const offset = Number(request.query.offset) || 0;
      const platform = request.query.platform;

      const params: any[] = [tenantId, clientId, limit, offset];
      let platformFilter = '';
      if (platform) {
        params.push(platform);
        platformFilter = `AND platform = $${params.length}`;
      }

      const { rows } = await query(
        `SELECT id, source_type, platform, url, title, content_excerpt, published_at, metadata, created_at
         FROM client_documents
         WHERE tenant_id = $1::uuid AND client_id = $2 ${platformFilter}
         ORDER BY published_at DESC NULLS LAST, created_at DESC
         LIMIT $3 OFFSET $4`,
        params,
      );

      const { rows: countRows } = await query(
        `SELECT COUNT(*) as total FROM client_documents WHERE tenant_id = $1::uuid AND client_id = $2`,
        [tenantId, clientId],
      );

      return reply.send({
        success: true,
        data: rows,
        total: Number(countRows[0]?.total || 0),
      });
    },
  );

  // GET /clients/:clientId/intelligence/sources — content sources with status
  app.get<{ Params: { clientId: string } }>(
    '/clients/:clientId/intelligence/sources',
    { preHandler: planningClientReadGuards },
    async (request, reply) => {
      const { clientId } = request.params;
      const tenantId = (request.user as any)?.tenant_id || 'default';

      const sources = await listClientSources({ tenantId, clientId });
      return reply.send({ success: true, data: sources });
    },
  );

  // GET /clients/:clientId/intelligence/insights — latest AI insight
  app.get<{ Params: { clientId: string } }>(
    '/clients/:clientId/intelligence/insights',
    { preHandler: planningClientReadGuards },
    async (request, reply) => {
      const { clientId } = request.params;
      const tenantId = (request.user as any)?.tenant_id || 'default';

      const insight = await getLatestClientInsight({ tenantId, clientId });
      return reply.send({ success: true, data: insight });
    },
  );

  // Global conversations list (cross-client) — used by home page
  app.get('/planning/conversations', {
    preHandler: planningTenantReadGuards,
  }, async (request, reply) => {
    const tenantId = (request.user as any)?.tenant_id || 'default';
    const userId = (request.user as any)?.sub;
    const qs = request.query as { limit?: string };
    const limit = Math.min(parseInt(qs.limit || '20', 10), 100);

    const result = await query(
      `SELECT pc.id, pc.title, pc.provider, pc.status, pc.created_at, pc.updated_at,
              (SELECT COUNT(*) FROM jsonb_array_elements(pc.messages)) as message_count,
              ec.name as client_name
       FROM planning_conversations pc
       LEFT JOIN edro_clients ec ON ec.id = pc.client_id
       WHERE pc.tenant_id = $1 AND pc.user_id = $2
       ORDER BY pc.updated_at DESC
       LIMIT $3`,
      [tenantId, userId, limit]
    );

    return reply.send({ success: true, data: { conversations: result.rows } });
  });
}
