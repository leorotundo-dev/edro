/**
 * Regras criativas por plataforma/formato.
 * Cada bloco define as melhores práticas editoriais e técnicas
 * que devem ser aplicadas quando um copy é gerado para aquela plataforma.
 *
 * Estas regras são injetadas diretamente no prompt de geração para
 * garantir que a IA produza conteúdo nativo de cada canal.
 */

export type PlatformRule = {
  /** Nome legível da plataforma para exibição no prompt */
  label: string;
  /** Diretrizes criativas em português para injeção direta no prompt */
  directives: string[];
  /** Regras específicas por formato dentro da plataforma */
  formats?: Record<string, string[]>;
};

const PLATFORM_RULES: Record<string, PlatformRule> = {

  // ── INSTAGRAM ──────────────────────────────────────────────────────────────
  instagram: {
    label: 'Instagram',
    directives: [
      'HOOK OBRIGATÓRIO: as 2 primeiras linhas da legenda devem prender a atenção ANTES do "ver mais" — use pergunta provocadora, dado surpreendente ou afirmação audaciosa.',
      'TOM: conversacional, dinâmico, próximo. Escreva como uma pessoa fala, não como uma empresa publica.',
      'ESTRUTURA DE LEGENDA: Hook → Desenvolvimento (2-3 parágrafos curtos) → CTA → Hashtags.',
      'HASHTAGS: 5 a 12 hashtags relevantes ao final, misturando nichos amplos e específicos.',
      'EMOJIS: use estrategicamente para quebrar texto e criar ritmo visual — 1 a 2 por parágrafo máximo.',
      'CTA: deve ser claro, direto e com baixo atrito. Prefira "Salva esse post", "Marca quem precisa ver", "Comenta aqui" em vez de "Clique no link da bio" (menor conversão).',
      'ARTE (título/corpo): texto curto e impactante que funciona visualmente — até 8 palavras no título, sem abreviações.',
    ],
    formats: {
      reels: [
        'SCRIPT PARA REELS: os primeiros 3 segundos são críticos — abra com movimento, pergunta ou revelação.',
        'RITMO: frases curtas, muita quebra de linha, linguagem falada (use contrações: "tô", "pra", "que nem").',
        'GANCHO VISUAL: descreva no Arte/Corpo o que aparece na tela — deve funcionar com ou sem áudio.',
        'DURAÇÃO: copy para Reels deve ser leve e rápido de ler — legenda máxima de 3 parágrafos curtos.',
        'TENDÊNCIAS: incorpore linguagem de meme ou referência cultural atual quando pertinente à marca.',
      ],
      carrossel: [
        'LÓGICA DE SWIPE: cada slide deve terminar com razão para avançar ao próximo (cliffhanger leve).',
        'SLIDE 1 (capa): título com promessa clara ou dado que gera curiosidade.',
        'SLIDES 2-N: conteúdo educativo, passo a passo, ou lista numerada. Um conceito por slide.',
        'ÚLTIMO SLIDE: CTA claro + proposta de valor da marca.',
        'LEGENDA: pode ser mais curta — o conteúdo está nos slides. Foque no hook inicial.',
      ],
      stories: [
        'URGÊNCIA: Stories desaparecem em 24h — crie senso de exclusividade ou temporalidade.',
        'TEXTO MÍNIMO: Stories são visuais. Escreva no máximo 2 linhas de texto por tela.',
        'INTERAÇÃO: sugira enquetes, perguntas, sliders ou quiz quando possível.',
        'CTA: use "arrasta pra cima" ou "link na bio" com verbo de ação imediata.',
      ],
      feed: [
        'EQUILÍBRIO: legenda pode ser mais longa em Feed — público para para ler.',
        'STORYTELLING: conte uma história curta (situação → conflito → resolução → CTA).',
        'VALOR CLARO: cada post de Feed deve entregar aprendizado, inspiração ou entretenimento.',
      ],
    },
  },

  // ── LINKEDIN ──────────────────────────────────────────────────────────────
  linkedin: {
    label: 'LinkedIn',
    directives: [
      'HOOK PROFISSIONAL: abra com dado de negócio, insight de mercado ou pergunta reflexiva sobre a área de atuação.',
      'TOM: autoridade + humanidade. Profissional mas acessível — evite jargão corporativo vazio.',
      'ESTRUTURA: gancho (1-2 linhas) → contexto/problema → insight/solução → CTA profissional.',
      'EMOJIS: use com parcimônia — 1 a 3 por post. Bullets (▪️) e separadores (—) são bem-vindos.',
      'HASHTAGS: 3 a 5 hashtags profissionais e específicas ao segmento. Sem hashtags genéricas.',
      'CTA PROFISSIONAL: "O que você pensa sobre isso?", "Concorda?", "Conecte-se comigo", "Compartilhe com sua rede".',
      'COMPRIMENTO: posts médios (150-300 palavras) performam bem. Evite posts muito curtos (sem profundidade) ou muito longos (perda de atenção).',
      'EVITAR: auto-promoção excessiva, linguagem de vendas direta, muitos emojis, gírias informais.',
    ],
    formats: {
      artigo: [
        'TÍTULO DO ARTIGO: objetivo, claro, com palavra-chave do segmento. Pode ser maior que post.',
        'INTRODUÇÃO: apresente o problema ou contexto em 2-3 parágrafos.',
        'SUBTÍTULOS: use H2/H3 para estruturar. Facilite a leitura escaneada.',
        'CONCLUSÃO: síntese dos insights + CTA para debate nos comentários.',
      ],
      video: [
        'ABERTURA: dado ou afirmação de impacto nos primeiros 5 segundos (muitos assistem sem áudio).',
        'LEGENDA DO POST: contextualize o vídeo em 2-3 linhas + o que o espectador vai aprender.',
      ],
    },
  },

  // ── FACEBOOK ──────────────────────────────────────────────────────────────
  facebook: {
    label: 'Facebook',
    directives: [
      'AUDIÊNCIA: público tende a ser mais amplo e diverso no Facebook — evite referências muito nichadas.',
      'TOM: caloroso, comunitário, conversacional. Facebook é sobre conexão e grupos de interesse.',
      'COMPRIMENTO: posts médios (100-250 palavras) funcionam melhor. Posts muito longos perdem engajamento.',
      'EMOJIS: uso moderado — 2 a 4 por post para criar emoção e ritmo.',
      'CTA: prefira comentários, compartilhamentos e reações. "Compartilha com alguém que precisa ver isso" funciona bem.',
      'HASHTAGS: 1 a 3 hashtags no máximo. Facebook não é uma plataforma de descoberta por hashtag.',
      'IMAGEM/ARTE: copy de arte deve ser curto e legível em tela menor (até 20% de texto na imagem).',
    ],
    formats: {
      stories: [
        'VERTICAL e visual — mesmas regras do Instagram Stories.',
        'CTA com link funciona bem em Facebook Stories (diferente do Instagram).',
      ],
      grupo: [
        'TOM COMUNITÁRIO: escreva como membro do grupo, não como marca. Gere discussão.',
        'PERGUNTA: sempre termine com pergunta para estimular comentários.',
      ],
    },
  },

  // ── TIKTOK ────────────────────────────────────────────────────────────────
  tiktok: {
    label: 'TikTok',
    directives: [
      'HOOK IMEDIATO: os primeiros 2 segundos decidem tudo — abra com ação, frase de impacto ou revelação.',
      'LINGUAGEM NATIVA: gírias atuais, trends de áudio, referências de meme. Seja cultural, não corporativo.',
      'TOM: autêntico, imperfeito, humano. TikTok rejeita conteúdo muito produzido.',
      'SCRIPT FALADO: escreva como se fosse falar — frases curtas, ritmo rápido, pausas estratégicas.',
      'GANCHO TEXTUAL: use textos na tela (captions do vídeo) para complementar o áudio — não apenas repetir.',
      'HASHTAGS: 3 a 6, misturando trending (#fyp, #paravocê) e nicho específico.',
      'CTA: "Segue pra mais", "Comenta X ou Y", "Dueta esse vídeo".',
      'COMPRIMENTO: scripts para 15-60 segundos são ideais. Evite scripts muito longos.',
    ],
  },

  // ── YOUTUBE ──────────────────────────────────────────────────────────────
  youtube: {
    label: 'YouTube',
    directives: [
      'TÍTULO SEO: inclua palavra-chave principal no título. Máximo 60 caracteres. Gere curiosidade mas evite clickbait vazio.',
      'DESCRIÇÃO: primeira linha é crucial — aparece no preview. Deve ser uma frase completa e atraente.',
      'ESTRUTURA DE DESCRIÇÃO: sumário do conteúdo (2-3 parágrafos) → links mencionados → timestamps → redes sociais → CTA de inscrição.',
      'TAGS: inclua variações da palavra-chave principal, termos relacionados e nome da marca.',
      'CTA VERBAL: "Se inscrevam no canal", "Ativem o sininho", "Deixem o like se gostaram" — use no script.',
      'THUMBNAIL TEXT: até 4 palavras impactantes para o texto da thumbnail — deve ser lido em tela pequena.',
    ],
    formats: {
      shorts: [
        'HOOK OBRIGATÓRIO: primeiros 3 segundos decidem se o usuário faz swipe. Abra com a conclusão ou com pergunta.',
        'RITMO ACELERADO: cortes rápidos, sem introdução longa. Vá direto ao ponto.',
        'LOOP VISUAL: tente criar conteúdo que incentive assistir de novo (loop natural).',
        'LEGENDA/DESCRIÇÃO: curta — apenas 1-2 linhas. Foco no call to action de inscrição.',
      ],
    },
  },

  // ── WHATSAPP ─────────────────────────────────────────────────────────────
  whatsapp: {
    label: 'WhatsApp',
    directives: [
      'PESSOALIDADE: copy para WhatsApp deve parecer mensagem de um amigo, não disparo de marketing.',
      'COMPRIMENTO: curto e direto. Máximo 3-4 parágrafos. Cada parágrafo em linha separada.',
      'EMOJIS: use para substituir pontuação e dar ritmo — mas com moderação.',
      'TOM: informal, próximo, urgente quando necessário. Pode usar "você" ou "vc".',
      'CTA CLARO: link ou ação específica ao final. "Clique aqui", "Responda essa mensagem", "Reserve agora".',
      'SEM HASHTAGS: hashtags não funcionam no WhatsApp.',
      'LISTAS: use listas simples com • ou números para apresentar múltiplos itens.',
    ],
    formats: {
      status: [
        'MUITO CURTO: máximo 2 frases. Status é visual — complementa imagem/vídeo.',
        'CTA VISUAL: incentive quem viu a responder diretamente.',
      ],
    },
  },

  // ── EMAIL ─────────────────────────────────────────────────────────────────
  email: {
    label: 'E-mail Marketing',
    directives: [
      'ASSUNTO (Subject Line): determinante para abertura. Máximo 50 caracteres. Personalize quando possível. Evite palavras spam (GRÁTIS, URGENTE em caps).',
      'PRÉ-HEADER: complementa o assunto — 90-110 caracteres que aparecem no preview do celular.',
      'PRIMEIRA FRASE: se conecte imediatamente com o assunto. Não quebre a expectativa criada.',
      'ESTRUTURA: Saudação → Contexto/Hook → Desenvolvimento → CTA principal → Assinatura.',
      'CTA: botão com texto de ação claro. Apenas 1 CTA principal por e-mail.',
      'TOM: varia por segmento — mas sempre mais formal que redes sociais.',
      'COMPRIMENTO: e-mails transacionais podem ser curtos. E-mails de conteúdo: 200-400 palavras.',
      'PERSONALIZAÇÃO: use [Nome] quando o sistema permitir. Segmente a mensagem pelo momento do cliente.',
    ],
  },

  // ── BLOG / SEO ────────────────────────────────────────────────────────────
  blog: {
    label: 'Blog / Artigo SEO',
    directives: [
      'PALAVRA-CHAVE: inclua a palavra-chave principal no título (H1), no primeiro parágrafo e nas subseções naturalmente.',
      'TÍTULO H1: claro, com a promessa do artigo. 50-60 caracteres idealmente.',
      'META DESCRIPTION: 140-160 caracteres. Resumo com palavra-chave + CTA implícito.',
      'ESTRUTURA: Introdução (problema/contexto) → Desenvolvimento (H2s temáticos) → Conclusão (síntese + CTA).',
      'LEGIBILIDADE: parágrafos curtos (3-5 linhas). Bullets e listas onde pertinente.',
      'LINKS INTERNOS: sugira conectar com outros conteúdos da marca.',
      'TOM: educativo, aprofundado, com autoridade. Mais formal que redes sociais.',
    ],
  },
};

/**
 * Retorna o bloco de regras criativas para injeção no prompt,
 * combinando as regras gerais da plataforma com as específicas do formato.
 */
export function buildPlatformRulesBlock(platform: string | null, format?: string | null): string {
  if (!platform) return '';

  const normalizedPlatform = platform.toLowerCase().trim();
  const normalizedFormat = format?.toLowerCase().trim();

  const rule = PLATFORM_RULES[normalizedPlatform];
  if (!rule) return '';

  const lines: string[] = [`Diretrizes criativas para ${rule.label}:`];

  // Regras gerais da plataforma
  for (const directive of rule.directives) {
    lines.push(`- ${directive}`);
  }

  // Regras específicas do formato (ex: Reels, Carrossel, Shorts)
  if (normalizedFormat && rule.formats) {
    const formatRule = rule.formats[normalizedFormat];
    if (formatRule?.length) {
      lines.push(`\nFormato "${normalizedFormat}" — regras adicionais:`);
      for (const directive of formatRule) {
        lines.push(`  - ${directive}`);
      }
    }
  }

  return `\n\n${lines.join('\n')}`;
}

export { PLATFORM_RULES };
