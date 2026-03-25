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
      'VISUAL HOOK SYNC: a primeira linha da legenda deve complementar a imagem com contexto EMOCIONAL ou TÉCNICO imediato — NUNCA apenas descrever o que já é visível na foto/arte.',
      'HOOK OBRIGATÓRIO: as 2 primeiras linhas devem prender a atenção ANTES do "ver mais". Use pergunta provocadora, dado surpreendente ou afirmação contraintuitiva.',
      'LEI DA IMAGEM LIMPA: VETO ABSOLUTO de textos, caracteres, subtítulos ou logotipos sobrepostos dentro da imagem. Toda informação textual vai na legenda ou no design estruturado — nunca como overlay na arte.',
      'SOCIAL SEARCH METADATA: use na legenda termos de intenção de busca reais do nicho (palavras que alguém digitaria na aba Explorar) para garantir entrega orgânica a não seguidores.',
      'TOM: conversacional, dinâmico, próximo. Escreva como uma pessoa fala, não como uma empresa publica.',
      'ESTRUTURA DE LEGENDA: Hook → Desenvolvimento (2-3 parágrafos curtos com espaço entre eles) → CTA → Hashtags.',
      'HASHTAGS: 5 a 12 hashtags relevantes ao final, misturando nichos amplos e específicos.',
      'EMOJIS: use estrategicamente para quebrar texto e criar ritmo visual — 1 a 2 por parágrafo máximo.',
      'CTA: deve ser claro, direto e com baixo atrito. Prefira "Salva esse post", "Marca quem precisa ver", "Comenta aqui" em vez de "Clique no link da bio" (menor conversão).',
      'CTC (Call to Conversation): peça ao usuário uma palavra-chave no direct para receber conteúdo exclusivo ("Comenta ACESSO aqui que eu te mando o material"). Isso ativa automações de DM e sinaliza engajamento real ao algoritmo.',
      'ARTE (título/corpo): texto curto e impactante que funciona visualmente — até 8 palavras no título, sem abreviações.',
    ],
    formats: {
      reels: [
        'GANCHO DE 1.5 SEGUNDOS (neuro-interrupção): o script deve abrir descrevendo um movimento de câmera incomum (zoom in súbito, transição de objeto, POV acelerado) ou uma ação que não se encerra nos primeiros segundos — isso força o SAR a interpretar como "novidade ou ameaça" e ativa atenção involuntária.',
        'PNL DO TEXTO NA TELA: use Submodalidades de Contraste no título/texto sobreposto. Em vez de "Como fazer X", use "O que ninguém te contou sobre o erro X" ou "A verdade sobre X que destrói Y". Isso cria um Gap de Curiosidade que o cérebro busca fechar — o Efeito Zeigarnik em 1.5 segundos.',
        'RITMO DE DOPAMINA: cortes de 1.2 a 1.8 segundos no roteiro. Cada corte deve representar nova perspectiva ou ângulo. Alerte no script: cenas estáticas por mais de 2 segundos = scroll. Escreva frases curtas que mudam de direção a cada linha.',
        'ASMR VISUAL E AUDITIVO: sugira áudios com texturas (ferramentas, escrita, natureza, batidas rítmicas) quando pertinente. Sons sensoriais ativam Neurônios Espelho, fazendo o usuário "sentir" a ação — aumenta retenção em até 40%.',
        'SEO DE VÍDEO (layer invisível): o algoritmo transcreve o áudio em tempo real. As palavras-chave principais do nicho devem ser FALADAS nos primeiros 3 segundos do script para indexação imediata.',
        'LEGENDAS COMO METADADOS: as legendas dinâmicas (closed captions) são indexadas pela IA do feed. Inclua na legenda do post os mesmos termos de busca do roteiro — eles são prateleiras de conteúdo para entrega a não seguidores.',
        'CTC (Call to Conversation): prefira "Comenta [palavra-chave] aqui para eu te mandar X" ou "Dueta com sua versão" — ativam automações e geram mais alcance orgânico que CTAs genéricos.',
        'RITMO DE LINGUAGEM: frases curtas, contrações naturais ("tô", "pra", "que nem"), pausas estratégicas no script. Escreva como se fosse falar, não como texto formal.',
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
      'HOOK TRIPLO (primeiras 140 caracteres — crítico para anti-scroll): combine (1) Afirmação de Autoridade com dado concreto + (2) Tensão Estratégica com desafio do setor + (3) Promessa de Insight que será revelado. Exemplo: "73% das empresas B2B perdem leads por falta de follow-up estruturado. O problema não é o produto — é o processo. O que descobrimos depois de analisar 1.200 ciclos de venda:".',
      'DWELL TIME & WHITE SPACE: parágrafos de no máximo 3 linhas para aumentar o tempo de permanência e reduzir a fadiga cognitiva. Cada parágrafo = uma ideia completa. Quebre o texto com linha em branco entre blocos.',
      'SEO SOCIAL LINKEDIN: distribua palavras-chave técnicas do setor nos primeiros 2 parágrafos para indexação no motor de busca interno da rede. Use termos que profissionais do nicho pesquisariam.',
      'TOM: autoridade com humanidade. Profissional mas acessível — compartilhe perspectiva pessoal, não apenas dados frios. Evite jargão corporativo vazio.',
      'ESTRUTURA: Hook Triplo → contexto/tensão (1-2 parágrafos) → insight/solução (2-3 parágrafos) → conclusão acionável → CTA profissional.',
      'EMOJIS: use com parcimônia — 1 a 3 por post. Bullets (▪️) e separadores (—) são bem-vindos para estruturar.',
      'HASHTAGS: 3 a 5 hashtags profissionais e específicas ao segmento. Sem hashtags genéricas.',
      'CTC (Call to Conversation): o LinkedIn amplifica posts com alto volume de comentários relevantes. Formule o CTA como convite a um debate específico: "Qual das suas maiores barreiras ao implementar X? Conta nos comentários." Evite perguntas vagas — perguntas técnicas geram respostas de qualidade e mantêm o post circulando.',
      'CTA PROFISSIONAL: "O que você pensa sobre isso?", "Concorda?", "Qual sua experiência com isso?", "Compartilhe com sua rede".',
      'COMPRIMENTO: 150-300 palavras é o sweet spot. Muito curto = sem profundidade. Muito longo = abandono.',
      'EVITAR: auto-promoção direta, linguagem de venda agressiva, mais de 3 emojis, gírias informais, aberturas genéricas.',
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
      'GANCHO DE 1.5 SEGUNDOS (cegueira de scroll): o script deve abrir com movimento de câmera incomum (zoom in súbito, transição de objeto, POV acelerado) ou ação que não se encerra nos primeiros frames. O SAR interpreta como "novidade ou ameaça" e ativa atenção involuntária.',
      'PNL DO TEXTO NA TELA: use Submodalidades de Contraste no título sobreposto. Em vez de "Como fazer X", use "O que ninguém te contou sobre o erro X" ou "Por que X está te custando Y". Gap de Curiosidade = Efeito Zeigarnik em 1.5 segundos.',
      'RITMO DE DOPAMINA: roteiro com cortes de 1.2 a 1.8 segundos. Cada corte = nova perspectiva ou ângulo. Alerte: cena estática por mais de 2 segundos → scroll. Frases curtas, cada uma muda de direção.',
      'ASMR VISUAL E AUDITIVO: sugira áudios com textura (ferramentas, escrita, sons da natureza, batidas rítmicas) quando pertinente à marca. Sons sensoriais ativam Neurônios Espelho — o usuário "sente" a ação. Impacto: até 40% mais retenção.',
      'SEO DE VÍDEO (layer invisível): o algoritmo TikTok transcreve o áudio em tempo real. As palavras-chave do nicho devem ser FALADAS nos primeiros 3 segundos do script para indexação imediata em prateleiras de conteúdo.',
      'LEGENDAS COMO METADADOS DE BUSCA: as closed captions geradas automaticamente são lidas pela IA do feed. Repita na legenda do post os mesmos termos de busca do roteiro — garantem entrega a não seguidores.',
      'LINGUAGEM NATIVA: gírias atuais, trends de áudio, referências de meme. Seja cultural, não corporativo. TikTok rejeita conteúdo muito produzido.',
      'CTC (Call to Conversation): "Comenta [PALAVRA] aqui que eu te mando X no direct". Ativa automações de DM e sinaliza engajamento real ao algoritmo. Supera CTAs genéricos em alcance orgânico.',
      'HASHTAGS: 3 a 6 — 1 trending (#fyp, #paravocê), 2-3 de nicho específico, 1 de marca.',
      'COMPRIMENTO: scripts para 15-60 segundos ideais. Evite scripts longos — o For You Page favorece alta taxa de conclusão.',
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

  // ── OOH / OUTDOOR ──────────────────────────────────────────────────────────
  ooh: {
    label: 'OOH / Outdoor',
    directives: [
      'LEI DAS 7 PALAVRAS: máximo absoluto de 7 palavras no headline. Lido a 80km/h em 3 segundos.',
      'VERBO IMPERATIVO: comece com ação — Descubra, Venha, Experimente, Imagine. Sem introduções.',
      'ZERO SUBORDINAÇÃO: uma única ideia por peça. Sem "que", "porque", "enquanto".',
      'IMPACTO VISUAL > TEXTO: o texto existe para amplificar a imagem, não substituí-la.',
      'FONTE GIGANTE: mínimo 1/6 da altura total do outdoor. Se não lê a 100m, refaça.',
      'CTA SIMPLES: URL curta ou telefone. QR code apenas se o outdoor for em pedestres.',
      'SEM IRONIA IMPLÍCITA: lido sem contexto — a mensagem deve funcionar isolada.',
    ],
  },

  // ── DOOH ───────────────────────────────────────────────────────────────────
  dooh: {
    label: 'DOOH (Digital Out-of-Home)',
    directives: [
      'TIMING RÍGIDO: 5–8 segundos de exposição. Cada palavra conta como 1 segundo de leitura.',
      'LOOP VISUAL: a animação deve chamar atenção no estado idle, antes do texto aparecer.',
      'FRASE + LOGO: máximo 1 frase de impacto + logo. Sem copy secundário.',
      'SEM CTA DE CLIQUE: não tem "acesse", "clique" ou "arraste". Apenas "venha" ou "ligue".',
      'CONTRASTE ALTO: legível a pleno sol e à noite. Fundo escuro + texto claro ou vice-versa.',
    ],
  },

  // ── REVISTA / PRINT ────────────────────────────────────────────────────────
  revista: {
    label: 'Revista / Print',
    directives: [
      'HEADLINE SOBERANO: o headline faz 80% do trabalho. Deve funcionar sozinho sem o visual.',
      'BODY COPY: 100–150 palavras máximo. Parágrafos de 3-4 linhas. Ritmo jornalístico.',
      'TAGLINE: 1 frase final que condensa a promessa da marca. Memorável e rítmica.',
      'HIERARQUIA VISUAL: Headline → Subhead → Body → Tagline → Logo. Sem inverter.',
      'TOM: pode ser mais elaborado que digital. Leitor tem 30s de atenção plena.',
      'LAYOUT IMPORTA: deixe respiro entre elementos. Nunca encha 100% do espaço.',
    ],
  },

  // ── JORNAL ─────────────────────────────────────────────────────────────────
  jornal: {
    label: 'Jornal',
    directives: [
      'HEADLINE JORNALÍSTICO: começa com informação, não com pergunta. Dado concreto na 1ª linha.',
      'URGÊNCIA: o contexto do jornal é temporal — anchore em "hoje", "agora", "esta semana".',
      'PRETO E BRANCO: escreva pensando que a impressão pode ser monocromática.',
      'DENSIDADE DE INFO: leitor de jornal quer fatos. Inclua números, datas, nomes reais.',
      'CREDIBILIDADE: tom sóbrio. Zero superlativo vazio ("o melhor", "incrível").',
    ],
  },

  // ── RÁDIO 30s ──────────────────────────────────────────────────────────────
  radio: {
    label: 'Rádio (30s)',
    directives: [
      'CONTAGEM: 30 segundos = 75–80 palavras em ritmo normal. Escreva o script COM TIMING.',
      'FORMATO: LOCUÇÃO / SFX / JINGLE — indique cada elemento entre colchetes: [TRILHA], [SFX], [VOZ].',
      'HOOK AUDITIVO: os 3 primeiros segundos definem se o ouvinte presta atenção. Comece com som ou pergunta.',
      'SÓ ÁUDIO: nenhuma informação pode depender de visual. Tudo deve ser compreensível só pelo som.',
      'CTA REPETIDO: o número de telefone ou URL aparecem 2x (início + fim).',
      'PRONÚNCIA: evite palavras difíceis de pronunciar em velocidade de locução comercial.',
    ],
    formats: {
      '15s': ['Máximo 40 palavras. Apenas 1 mensagem. Sem desenvolvimento — vai direto ao CTA.'],
      '60s': ['Pode incluir storytelling curto. 150–160 palavras. 2-3 beats narrativos.'],
    },
  },

  // ── TV ─────────────────────────────────────────────────────────────────────
  tv: {
    label: 'TV',
    directives: [
      'FORMATO PROFISSIONAL: CENA / V.O. (voz off) / SFX / SUPER (texto na tela). Um elemento por linha.',
      'SHOW DON\'T TELL: a imagem comunica, o áudio amplifica. Nunca duplique a mesma informação.',
      'TIMING EXATO: escreva o roteiro com marcações de tempo em segundos: [0-5s] [5-12s] [12-28s] [28-30s].',
      'SUPER: texto na tela em letras maiúsculas. Máximo 4 palavras. Aparece no pico emocional.',
      'PACTO NARRATIVO: começo (problema/situação) → meio (marca entra) → fim (transformação/CTA).',
    ],
    formats: {
      '15s': ['Sem desenvolvimento. 1 cena + 1 super + logo. Impacto visual imediato.'],
      '30s': ['3-4 cenas. Narrativa completa. CTA no último terço. Logo + tagline no final.'],
    },
  },

  // ── CINEMA ─────────────────────────────────────────────────────────────────
  cinema: {
    label: 'Cinema',
    directives: [
      'NARRATIVA EMOCIONAL: cinema permite storytelling de 60–90s. Construa tensão e resolução.',
      'ABERTURA DE IMPACTO: os 10 primeiros segundos definem a atenção da sala inteira.',
      'SEM LOGO NO INÍCIO: a marca aparece apenas na resolução. Mantenha suspense sobre quem fala.',
      'SILÊNCIO É TOOL: pausas dramáticas e silêncio têm poder. Use-os intencionalmente.',
      'TAGLINE FINAL: última imagem é logo + tagline. Deve ser a cena mais forte visualmente.',
      'ÁUDIO 5.1: descreva experiência de som surround — sons que vêm de lados diferentes.',
    ],
  },

  // ── SMS ────────────────────────────────────────────────────────────────────
  sms: {
    label: 'SMS',
    directives: [
      'LIMITE DURO: 160 caracteres incluindo URL. Conte os caracteres antes de finalizar.',
      'PERSONALIZAÇÃO: comece com o nome se disponível: "João, sua oferta especial..."',
      'CTA IMEDIATO: o SMS é lido em 3 minutos ou nunca. O link deve ser o último elemento.',
      'URL CURTA: use encurtador. Nunca URLs longas em SMS.',
      'ZERO AMBIGUIDADE: quem está mandando deve estar claro nos primeiros 10 caracteres.',
      'SEM EMOJI: emojis podem não renderizar em todos os aparelhos. Texto puro.',
    ],
  },

  // ── PUSH NOTIFICATION ──────────────────────────────────────────────────────
  push: {
    label: 'Push Notification',
    directives: [
      'TÍTULO: máximo 40 caracteres. Deve funcionar como headline sozinho.',
      'BODY: máximo 100 caracteres. Complementa o título, não repete.',
      'URGÊNCIA REAL: só use "urgente" ou "agora" se for verdadeiro. Abuso derruba CTR.',
      'PERSONALIZAÇÃO: use dados de contexto — nome, última compra, localização.',
      'SEM CLICKBAIT: o conteúdo da notificação deve entregar o que o título prometeu.',
      'HORÁRIO IMPORTA: mesmo horário em diferentes fusos. Escreva para o contexto do momento.',
    ],
  },

  // ── GOOGLE ADS SEARCH ──────────────────────────────────────────────────────
  google_ads: {
    label: 'Google Ads Search (RSA)',
    directives: [
      'RSA STRUCTURE: gere 15 headlines (max 30 chars cada) + 4 descriptions (max 90 chars cada).',
      'HEADLINES: variar ângulos — benefício, urgência, social proof, feature, pergunta, comparação.',
      'KEYWORDS NO HEADLINE: inclua a keyword principal em pelo menos 3 dos 15 headlines.',
      'DESCRIPTIONS: complete o headline — elabore o benefício, adicione CTA, mencione diferencial.',
      'FORMATO DE ENTREGA: use marcadores --- HEADLINE 1: texto (Xc) --- para facilitar parsing.',
      'ZERO EXCLAMAÇÃO EM HEADLINES: Google rejeita headlines com ponto de exclamação.',
    ],
  },

  // ── META ADS ───────────────────────────────────────────────────────────────
  meta_ads: {
    label: 'Meta Ads (Facebook/Instagram)',
    directives: [
      'ESTRUTURA OBRIGATÓRIA: PRIMARY TEXT (125 chars visíveis) + HEADLINE (27 chars) + DESCRIPTION (27 chars).',
      'PRIMARY TEXT: os primeiros 125 chars são o "ver mais". Hook imediato, sem introdução.',
      'HEADLINE: o que aparece abaixo da imagem. Deve funcionar isolado como promessa ou CTA.',
      'DESCRIPTION: complemento do headline. Urgência, prova social ou feature adicional.',
      'RETARGETING: se o público já viu a marca, assuma conhecimento. Skip a apresentação.',
      'PROSPECTING: se é público frio, inclua prova social e credenciais nos primeiros 3 segundos.',
    ],
  },

  // ── THREADS ────────────────────────────────────────────────────────────────
  threads: {
    label: 'Threads',
    directives: [
      'TOM: conversacional, opinativo, com personalidade. Marca que parece pessoa real.',
      'LIMITE: 500 caracteres por post. Threads usa threads (encadeamento) para mais conteúdo.',
      'HOOK: primeira linha deve gerar reação imediata — concordância, discordância ou curiosidade.',
      'SEM HASHTAG OBRIGATÓRIA: hashtags têm pouco peso no Threads. Foque no texto.',
      'THREAD FORMAT: se o conteúdo for longo, entregue como sequência numerada: 1/ 2/ 3/',
    ],
  },

  // ── PINTEREST ──────────────────────────────────────────────────────────────
  pinterest: {
    label: 'Pinterest',
    directives: [
      'VISUAL FIRST: Pinterest é mecanismo de busca visual. A copy complementa, não lidera.',
      'TÍTULO SEO: o título do Pin é indexado. Use palavras-chave de intenção de busca reais.',
      'DESCRIÇÃO: 100–500 palavras. Pode ser detalhada — usuários do Pinterest leem descrições.',
      'CTA TRANSACIONAL: Pinterest tem alta intenção de compra. "Compre", "Faça", "Baixe".',
      'VIBE ASPIRACIONAL: conteúdo de inspiração, tutorial, lista. Tom: "Como fazer", "Ideias de".',
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
