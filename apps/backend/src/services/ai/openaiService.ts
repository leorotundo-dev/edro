/**
 * OpenAI Service
 * 
 * Serviços de IA usando OpenAI API
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import OpenAI from 'openai';
import { Readable } from 'stream';
import { MonitoringService } from '../../middleware/monitoring';
import { openaiEmbeddingCircuit, openaiCompletionCircuit } from './circuitBreaker';
import { FallbackStrategies, FallbackContext } from './fallbackStrategies';

// ============================================
// CONFIGURAÇÃO
// ============================================

const openaiTimeoutMs = Number(process.env.OPENAI_TIMEOUT_MS || 60000);
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
  timeout: Number.isFinite(openaiTimeoutMs) ? openaiTimeoutMs : 60000,
});

const GPT_MODEL = process.env.OPENAI_MODEL || 'gpt-4-turbo-preview';
const EMBEDDING_MODEL = 'text-embedding-3-small';
const TTS_MODEL = process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts';
const STT_MODEL = process.env.OPENAI_STT_MODEL || 'whisper-1';

// ============================================
// EMBEDDINGS
// ============================================

export async function generateEmbedding(text: string): Promise<number[]> {
  console.log('[openai] Gerando embedding');

  const context: FallbackContext = {
    operation: 'generateEmbedding',
    params: { text },
    attemptNumber: 1,
  };

  return await openaiEmbeddingCircuit.execute(
    async () => {
      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: text,
      });

      MonitoringService.trackIaUsage({
        model: EMBEDDING_MODEL,
        type: 'embedding',
        promptTokens: response.usage?.prompt_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      });

      const embedding = response.data[0].embedding;
      
      // Salvar no cache para futuro fallback
      await FallbackStrategies.saveFallbackCache('generateEmbedding', { text }, embedding, 24);
      
      return embedding;
    },
    async () => {
      // Fallback: tentar cache ou degraded
      const fallback = await FallbackStrategies.cascadeFallback<number[]>(context);
      console.log(`[openai] Usando fallback (${fallback.source}) para embedding`);
      return fallback.data;
    }
  );
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  console.log(`[openai] Gerando ${texts.length} embeddings`);

  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: texts,
    });

    MonitoringService.trackIaUsage({
      model: EMBEDDING_MODEL,
      type: 'embedding',
      promptTokens: response.usage?.prompt_tokens || 0,
      totalTokens: response.usage?.total_tokens || 0,
    });

    return response.data.map(d => d.embedding);
  } catch (err) {
    console.error('[openai] Erro ao gerar embeddings:', err);
    throw err;
  }
}

// ============================================
// GERAÇÃO DE TEXTO
// ============================================

export async function generateCompletion(params: {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  console.log('[openai] Gerando completion');

  const context: FallbackContext = {
    operation: 'generateCompletion',
    params: {
      prompt: params.prompt,
      systemPrompt: params.systemPrompt,
      temperature: params.temperature ?? 0.7,
      maxTokens: params.maxTokens ?? 2000,
    },
    attemptNumber: 1,
  };

  return await openaiCompletionCircuit.execute(
    async () => {
      const messages: any[] = [];

      if (params.systemPrompt) {
        messages.push({
          role: 'system',
          content: params.systemPrompt,
        });
      }

      messages.push({
        role: 'user',
        content: params.prompt,
      });

      const response = await openai.chat.completions.create({
        model: GPT_MODEL,
        messages,
        temperature: params.temperature || 0.7,
        max_tokens: params.maxTokens || 2000,
      });

      MonitoringService.trackIaUsage({
        model: GPT_MODEL,
        type: 'completion',
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      });

      const content = response.choices[0].message.content || '';
      await FallbackStrategies.saveFallbackCache('generateCompletion', context.params, content, 24);
      return content;
    },
    async () => {
      const fallback = await FallbackStrategies.cascadeFallback<string>(context);
      console.log(`[openai] Usando fallback (${fallback.source}) para completion`);
      return fallback.data;
    }
  );
}

export async function generateJSON(params: {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
}): Promise<any> {
  console.log('[openai] Gerando JSON');

  const context: FallbackContext = {
    operation: 'generateJSON',
    params: {
      prompt: params.prompt,
      systemPrompt: params.systemPrompt,
      temperature: params.temperature ?? 0.3,
    },
    attemptNumber: 1,
  };

  return await openaiCompletionCircuit.execute(
    async () => {
      const messages: any[] = [];

      if (params.systemPrompt) {
        messages.push({
          role: 'system',
          content: params.systemPrompt,
        });
      }

      messages.push({
        role: 'user',
        content: params.prompt,
      });

      const response = await openai.chat.completions.create({
        model: GPT_MODEL,
        messages,
        temperature: params.temperature || 0.3,
        response_format: { type: 'json_object' },
      });

      MonitoringService.trackIaUsage({
        model: GPT_MODEL,
        type: 'completion',
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      });

      const content = response.choices[0].message.content || '{}';
      const parsed = JSON.parse(content);
      await FallbackStrategies.saveFallbackCache('generateJSON', context.params, parsed, 24);
      return parsed;
    },
    async () => {
      const fallback = await FallbackStrategies.cascadeFallback<any>(context);
      console.log(`[openai] Usando fallback (${fallback.source}) para JSON`);
      if (typeof fallback.data === 'string') {
        try {
          return JSON.parse(fallback.data);
        } catch {
          return {};
        }
      }
      return fallback.data ?? {};
    }
  );
}

// ============================================
// CASOS DE USO ESPECÍFICOS
// ============================================

/**
 * Gera mnemônico
 */
export async function generateMnemonic(params: {
  subtopico: string;
  conteudo: string;
  tecnica: string;
  estilo?: string;
  banca?: string;
  humor?: number;
  energia?: number;
  variacoes?: number;
}): Promise<{
  texto: string;
  explicacao: string;
  variacoes: string[];
}> {
  console.log(`[openai] Gerando mnemônico: ${params.tecnica}`);

  const systemPrompt = `Você é um especialista em técnicas mnemônicas para concursos públicos.
Sua tarefa é criar mnemônicos eficazes que ajudem os alunos a memorizar conteúdo complexo.`;

  const prompt = `Crie um mnemônico usando a técnica "${params.tecnica}" para o seguinte conteúdo:

Subtópico: ${params.subtopico}
Conteúdo: ${params.conteudo}
${params.estilo ? `Estilo preferido: ${params.estilo}` : ''}
${params.banca ? `Banca foco: ${params.banca}` : ''}
${typeof params.humor === 'number' ? `Humor: ${params.humor}` : ''}
${typeof params.energia === 'number' ? `Energia: ${params.energia}` : ''}
${typeof params.variacoes === 'number' ? `Variacoes desejadas: ${params.variacoes}` : ''}

Retorne um JSON com:
{
  "texto": "o mnemônico em si",
  "explicacao": "explicação de como usar o mnemônico",
  "variacoes": ["variante 1", "variante 2"]
}`;

  const result = await generateJSON({ prompt, systemPrompt, temperature: 0.8 });

  return {
    texto: result.texto || '',
    explicacao: result.explicacao || '',
    variacoes: Array.isArray(result.variacoes) ? result.variacoes : [],
  };
}

/**
 * Simplificação estruturada (1-3-1, contraste, analogia, história, mapa mental)
 */
export async function generateSimplification(params: {
  texto: string;
  metodo: '1-3-1' | 'contraste' | 'analogia' | 'historia' | 'mapa_mental';
  banca?: string;
  nivel?: 'N1' | 'N2' | 'N3' | 'N4' | 'N5';
  estilo?: string;
}): Promise<string> {
  const systemPrompt = [
    'Você é um tutor que simplifica conteúdo para concursos.',
    'Respeite o método solicitado e seja conciso.',
    params.banca ? `Banca foco: ${params.banca}.` : '',
    params.nivel ? `Nível: ${params.nivel}.` : '',
    params.estilo ? `Estilo cognitivo: ${params.estilo}.` : '',
  ].filter(Boolean).join(' ');

  const instructions: Record<string, string> = {
    '1-3-1': 'Use o formato 1-3-1: (1) frase simples; (3) três bullets curtos; (1) conclusão curta.',
    'contraste': 'Explique por contraste: o que é vs o que não é, diferenças-chave em bullets.',
    'analogia': 'Crie uma analogia concreta e explique rapidamente a ligação com o conceito.',
    'historia': 'Conte uma micro-história de 3-4 frases que ilustre o conceito.',
    'mapa_mental': 'Liste nós principais e sub-nós em bullets hierárquicos curtos (sem ASCII art).'
  };

  const userPrompt = [
    `Método: ${params.metodo}`,
    instructions[params.metodo],
    `Texto base: """${params.texto}"""`,
  ].join('\n');

  return generateCompletion({
    prompt: userPrompt,
    systemPrompt,
    temperature: 0.4,
    maxTokens: 400,
  });
}

// ============================================
// ÁUDIO (TTS / STT)
// ============================================

export async function textToSpeech(params: {
  texto: string;
  voz?: string;
  velocidade?: number;
  formato?: 'mp3' | 'wav';
}): Promise<{ base64: string; mime: string }> {
  if (!process.env.OPENAI_API_KEY) {
    const buffer = Buffer.from(`AUDIO_STUB:${params.texto}`);
    return { base64: buffer.toString('base64'), mime: 'audio/wav' };
  }

  try {
    const response = await (openai as any).audio.speech.create({
      model: 'gpt-4o-mini-tts',
      voice: params.voz || 'alloy',
      input: params.texto,
      speed: params.velocidade || 1,
    });

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    MonitoringService.trackIaUsage({
      model: 'gpt-4o-mini-tts',
      type: 'completion',
      promptTokens: 0,
      totalTokens: 0,
    });

    return { base64: buffer.toString('base64'), mime: 'audio/mpeg' };
  } catch (err) {
    console.error('[openai] Erro no TTS, usando stub:', (err as any)?.message);
    const buffer = Buffer.from(`AUDIO_STUB:${params.texto}`);
    return { base64: buffer.toString('base64'), mime: 'audio/wav' };
  }
}

export async function speechToText(params: {
  audioBase64: string;
  idioma?: string;
}): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    return '[stub] transcrição não processada localmente';
  }

  try {
    const audioBuffer = Buffer.from(params.audioBase64, 'base64');
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stt-'));
    const tmpFile = path.join(tmpDir, 'audio.wav');
    fs.writeFileSync(tmpFile, audioBuffer);

    const fileStream = fs.createReadStream(tmpFile);
    const response = await (openai as any).audio.transcriptions.create({
      file: fileStream as any,
      model: 'whisper-1',
      language: params.idioma,
    });

    fs.rmSync(tmpDir, { recursive: true, force: true });

    MonitoringService.trackIaUsage({
      model: 'whisper-1',
      type: 'completion',
      promptTokens: 0,
      totalTokens: 0,
    });

    return response.text || '';
  } catch (err) {
    console.error('[openai] Erro no STT, usando stub:', (err as any)?.message);
    return '[stub] transcrição não processada localmente';
  }
}

/**
 * Analisa questão
 */
export async function analyzeQuestion(params: {
  statement: string;
  options: string[];
  correctAnswer: string;
}): Promise<{
  difficulty: number;
  topics: string[];
  explanation: string;
  bancaStyle?: string;
}> {
  console.log('[openai] Analisando questão');

  const systemPrompt = `Você é um especialista em questões de concursos públicos.
Analise questões e identifique dificuldade, tópicos e características da banca.`;

  const prompt = `Analise a seguinte questão:

Enunciado: ${params.statement}

Alternativas:
${params.options.map((o, i) => `${String.fromCharCode(97 + i)}) ${o}`).join('\n')}

Resposta correta: ${params.correctAnswer}

Retorne um JSON com:
{
  "difficulty": 1-5 (1=muito fácil, 5=muito difícil),
  "topics": ["tópico1", "tópico2"],
  "explanation": "explicação detalhada da resposta",
  "bancaStyle": "características do estilo da banca"
}`;

  return await generateJSON({ prompt, systemPrompt });
}

/**
 * Extrai cargos do edital
 */
export async function extractCargoStructure(params: {
  editalText: string;
  concurso: string;
}): Promise<{
  cargos: Array<{
    nome: string;
    vagas?: number;
    vagas_ac?: number;
    vagas_pcd?: number;
    salario?: number;
    requisitos?: string;
    carga_horaria?: string;
    descricao?: string;
  }>;
}> {
  console.log(`[openai] Extraindo cargos: ${params.concurso}`);

  const systemPrompt = `Voce e um especialista em analise de editais de concursos publicos.
Extraia apenas os cargos e seus dados diretamente do texto.

Regras:
- Nao invente itens. Use apenas o que estiver no texto.
- Foque em quadros de vagas, tabela de cargos e secoes com distribuicao de vagas.
- Se houver vagas por categoria (AC, PCD), capture separadamente.
- Se houver salario/remuneracao/vencimento, capture.
- Se houver requisitos ou carga horaria, capture.
- Se nao houver cargos claros, retorne lista vazia.`;

  const prompt = `Extraia os cargos do seguinte edital do concurso "${params.concurso}":

${params.editalText}

Retorne um JSON com:
{
  "cargos": [
    {
      "nome": "Nome do Cargo",
      "vagas": 10,
      "vagas_ac": 8,
      "vagas_pcd": 2,
      "salario": 1766.73,
      "requisitos": "Texto de requisitos",
      "carga_horaria": "40h",
      "descricao": "Lotacao/area/observacoes se houver"
    }
  ]
}`;

  return await generateJSON({ prompt, systemPrompt });
}

/**
 * Extrai matriz de provas (disciplinas, quantidade de questoes e peso)
 */
export async function extractExamMatrixStructure(params: {
  editalText: string;
  concurso: string;
}): Promise<{
  linhas: Array<{
    disciplina: string;
    numero_questoes?: number;
    peso?: number;
    total?: number;
  }>;
}> {
  console.log(`[openai] Extraindo matriz de provas: ${params.concurso}`);

  const systemPrompt = `Voce e um especialista em analise de editais de concursos publicos.
Extraia apenas a tabela de provas/matriz de disciplinas com quantidade de questoes e peso.

Regras:
- Nao invente linhas. Use apenas o que estiver no texto.
- Foque em tabelas com colunas: Disciplina/Conteudo, Quantidade de questoes/itens, Peso/Pontuacao/Valor.
- Ignore linhas de total geral, notas explicativas e trechos administrativos.
- Se nao houver tabela clara, retorne lista vazia.`;

  const prompt = `Extraia a matriz de provas do edital do concurso "${params.concurso}":

${params.editalText}

Retorne um JSON com:
{
  "linhas": [
    {
      "disciplina": "Lingua Portuguesa",
      "numero_questoes": 10,
      "peso": 2.5,
      "total": 25
    }
  ]
}`;

  return await generateJSON({ prompt, systemPrompt });
}

/**
 * Sumariza texto para RAG
 */
export async function summarizeForRAG(params: {
  rawText: string;
  topicCode: string;
  maxLength?: number;
}): Promise<string> {
  console.log(`[openai] Sumarizando para RAG: ${params.topicCode}`);

  const systemPrompt = `Você é um especialista em resumir conteúdo educacional.
Crie resumos concisos focados no essencial para estudo.`;

  const prompt = `Resuma o seguinte conteúdo sobre "${params.topicCode}":

${params.rawText}

Regras:
- Máximo ${params.maxLength || 500} palavras
- Foque nos conceitos principais
- Use linguagem clara e direta
- Mantenha definições importantes
- Remova informações redundantes`;

  return await generateCompletion({ prompt, systemPrompt, temperature: 0.3 });
}

/**
 * Extrai estrutura de blueprint
 */
export async function extractBlueprintStructure(params: {
  editalText: string;
  concurso: string;
}): Promise<{
  disciplinas: Array<{
    nome: string;
    peso?: number;
    numero_questoes?: number;
    topicos: Array<{
      nome: string;
      subtopicos: string[];
    }>;
  }>;
}> {
  console.log(`[openai] Extraindo blueprint: ${params.concurso}`);

  const systemPrompt = `Voce e um especialista em analise de editais de concursos publicos.
Extraia a estrutura hierarquica apenas das disciplinas e conteudos cobrados na prova.

Regras:
- Preserve a ordem do edital.
- Nao invente itens. Use apenas o que estiver no texto.
- Foque no trecho de "Conteudo Programatico", "Programa de Prova", "Programa de Prova Objetiva", "Materias", "Disciplinas" ou "Conhecimentos".
- Quando houver "Quadro de Provas", "Estrutura da Prova" ou "Distribuicao de Questoes", capture peso e numero de questoes por disciplina.
- Ignore secoes administrativas: inscricao, taxas, vagas, cadastro reserva, requisitos, atribuicoes, cronograma, recursos, resultados, homologacao, PCD/necessidades especiais.
- Quando houver listas numeradas/alfabeticas, mantenha os itens como topicos/subtopicos.
- Se houver "Conhecimentos Gerais/Especificos", trate como topicos dentro da disciplina correspondente.
- Se houver mais de 3 niveis, consolide os niveis inferiores em "subtopicos".
- Se nao houver conteudo programatico, retorne disciplinas vazias.`;

  const prompt = `Extraia a estrutura do seguinte edital do concurso "${params.concurso}":

${params.editalText}

Retorne um JSON com:
{
  "disciplinas": [
    {
      "nome": "Nome da Disciplina",
      "peso": 1,
      "numero_questoes": 10,
      "topicos": [
        {
          "nome": "Nome do T¢pico",
          "subtopicos": ["Subt¢pico 1", "Subt¢pico 2"]
        }
      ]
    }
  ]
}`;

  return await generateJSON({ prompt, systemPrompt });
}

/**
 * Gera Drop (conteúdo educacional)
 */
export async function generateDrop(params: {
  topico: string;
  subtopico: string;
  banca?: string;
  dificuldade?: number;
}): Promise<{
  title: string;
  content: string;
  examples: string[];
  tips: string[];
}> {
  console.log(`[openai] Gerando Drop: ${params.subtopico}`);

  const systemPrompt = `Você é um professor especialista em concursos públicos.
Crie conteúdo educacional claro, objetivo e focado em aprovação.`;

  const prompt = `Crie um Drop (conteúdo de estudo) sobre:

Tópico: ${params.topico}
Subtópico: ${params.subtopico}
${params.banca ? `Banca: ${params.banca}` : ''}
${params.dificuldade ? `Dificuldade: ${params.dificuldade}/5` : ''}

Retorne um JSON com:
{
  "title": "Título atrativo",
  "content": "Conteúdo completo (200-300 palavras)",
  "examples": ["Exemplo 1", "Exemplo 2"],
  "tips": ["Dica 1", "Dica 2"]
}`;

  return await generateJSON({ prompt, systemPrompt, temperature: 0.7 });
}

/**
 * Gera questão
 */
export async function generateQuestion(params: {
  topico: string;
  subtopico: string;
  banca?: string;
  dificuldade?: number;
}): Promise<{
  statement: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}> {
  console.log(`[openai] Gerando questão: ${params.subtopico}`);

  const systemPrompt = `Você é um elaborador de questões para concursos públicos.
Crie questões realistas no estilo das principais bancas.`;

  const prompt = `Crie uma questão sobre:

Tópico: ${params.topico}
Subtópico: ${params.subtopico}
${params.banca ? `Estilo: ${params.banca}` : ''}
Dificuldade: ${params.dificuldade || 3}/5

Retorne um JSON com:
{
  "statement": "Enunciado da questão",
  "options": ["Alternativa A", "Alternativa B", "Alternativa C", "Alternativa D", "Alternativa E"],
  "correctAnswer": "a, b, c, d ou e",
  "explanation": "Explicação detalhada"
}`;

  return await generateJSON({ prompt, systemPrompt, temperature: 0.8 });
}

/**
 * Simplifica conteudo
 */
export async function generateSimplification(params: {
  texto: string;
  metodo: '1-3-1' | 'contraste' | 'analogia' | 'historia' | 'mapa_mental';
  banca?: string;
  nivel?: string;
  estilo?: string;
}): Promise<string> {
  console.log(`[openai] Simplificando conteudo: ${params.metodo}`);

  const systemPrompt = `Voce e um tutor que simplifica conteudo para estudo.
Use linguagem direta, com exemplos e frases curtas quando possivel.`;

  const prompt = `Simplifique o texto abaixo usando o metodo "${params.metodo}":

Texto:
${params.texto}

Contexto:
- Banca: ${params.banca || 'nao informada'}
- Nivel: ${params.nivel || 'padrao'}
- Estilo: ${params.estilo || 'padrao'}

Regras:
- Fale em portugues simples
- Mantem os conceitos essenciais
- Evite jargoes desnecessarios
`;

  return await generateCompletion({ prompt, systemPrompt, temperature: 0.4, maxTokens: 800 });
}

// ============================================
// BATCH OPERATIONS
// ============================================

export async function generateBatchEmbeddings(
  texts: string[],
  batchSize: number = 100
): Promise<number[][]> {
  console.log(`[openai] Gerando embeddings em batch (${texts.length} textos)`);

  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const embeddings = await generateEmbeddings(batch);
    results.push(...embeddings);

    console.log(`[openai] Progresso: ${i + batch.length}/${texts.length}`);
  }

  return results;
}

// ============================================
// HELPERS
// ============================================

export function estimateTokens(text: string): number {
  // Estimativa aproximada: 1 token ≈ 4 caracteres
  return Math.ceil(text.length / 4);
}

export function estimateCost(tokens: number, type: 'completion' | 'embedding'): number {
  // Preços aproximados (ajustar conforme OpenAI)
  const prices = {
    completion: 0.01 / 1000, // $0.01 por 1K tokens
    embedding: 0.0001 / 1000, // $0.0001 por 1K tokens
  };

  return tokens * prices[type];
}

// ============================================
// TTS / STT
// ============================================

export async function textToSpeech(params: {
  texto: string;
  voz?: string;
  velocidade?: number;
  formato?: 'mp3' | 'wav' | 'opus' | 'flac' | 'pcm';
}): Promise<{ base64: string; mime: string }> {
  console.log('[openai] Gerando TTS');

  const responseFormat = params.formato || 'mp3';
  const response = await openai.audio.speech.create({
    model: TTS_MODEL,
    voice: params.voz || 'alloy',
    input: params.texto,
    response_format: responseFormat,
    speed: params.velocidade || 1,
  });

  const buffer = Buffer.from(await response.arrayBuffer());
  const mimeMap: Record<string, string> = {
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    opus: 'audio/ogg',
    flac: 'audio/flac',
    pcm: 'audio/pcm',
  };

  return {
    base64: buffer.toString('base64'),
    mime: mimeMap[responseFormat] || 'audio/mpeg',
  };
}

export async function speechToText(params: {
  audioBase64: string;
  idioma?: string;
}): Promise<string> {
  console.log('[openai] Transcrevendo audio');

  const tmpPath = path.join(os.tmpdir(), `edro-stt-${Date.now()}.webm`);
  const buffer = Buffer.from(params.audioBase64, 'base64');
  fs.writeFileSync(tmpPath, buffer);

  try {
    const response = await openai.audio.transcriptions.create({
      model: STT_MODEL,
      file: fs.createReadStream(tmpPath),
      language: params.idioma,
    });

    return response.text || '';
  } finally {
    try {
      fs.unlinkSync(tmpPath);
    } catch {
      // ignore
    }
  }
}

// ============================================
// EXPORTAÇÃO
// ============================================

export const OpenAIService = {
  generateEmbedding,
  generateEmbeddings,
  generateCompletion,
  generateJSON,
  generateMnemonic,
  generateSimplification,
  textToSpeech,
  speechToText,
  analyzeQuestion,
  summarizeForRAG,
  extractBlueprintStructure,
  extractCargoStructure,
  extractExamMatrixStructure,
  generateDrop,
  generateQuestion,
  generateSimplification,
  generateBatchEmbeddings,
  estimateTokens,
  estimateCost,
  textToSpeech,
  speechToText,
};

export default OpenAIService;





