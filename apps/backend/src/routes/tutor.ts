/**
 * Tutor IA Routes
 *
 * Entrega respostas contextualizadas considerando estado cognitivo/emocional,
 * banca, SRS e trilha recente.
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { OpenAIService } from '../services/ai/openaiService';
import { enforceIaCallLimit } from '../middleware/planLimits';
import { getSrsSummary } from '../repositories/srsRepository';
import { ReccoRepository } from '../repositories/reccoRepository';
import { RagServiceExpanded } from '../services/ragServiceExpanded';
import { MonitoringService } from '../middleware/monitoring';
import { createDrop } from '../repositories/dropRepository';
import { QuestionRepository } from '../repositories/questionRepository';

interface TutorSessionBody {
  user_id?: string;
  message: string;
  context?: string;
  cognitive?: {
    foco?: number;
    energia?: number;
    saturacao?: boolean;
  };
  emotional?: {
    ansiedade?: boolean;
    frustracao?: boolean;
    humor?: number;
  };
  srs_backlog?: number;
  banca?: string;
  mode?: 'calmo' | 'turbo' | 'padrao';
  use_rag?: boolean;
  rag_limit?: number;
  discipline?: string;
  topic?: string;
  topic_code?: string;
  subtopic?: string;
  learning_style?: string;
  response_format?: 'curta' | 'longa' | 'analogia' | 'historia' | 'mapa_mental';
  include_recent_errors?: boolean;
  errors_limit?: number;
  create_drop?: {
    enabled?: boolean;
    discipline_id?: string;
    title?: string;
    difficulty?: number;
    topic_code?: string;
    drop_type?: string;
    drop_text?: string;
    blueprint_id?: number;
    metadata?: Record<string, any>;
  };
}

export default async function tutorRoutes(app: FastifyInstance) {
  /**
   * POST /tutor/session
   * Gera resposta do tutor adaptada ao estado atual do aluno
   */
  const devBypass =
    process.env.DEV_BYPASS_AUTH === 'true';

  app.post<{ Body: TutorSessionBody }>('/tutor/session', {
    preHandler: devBypass ? [] : enforceIaCallLimit,
  }, async (request, reply) => {
    const {
      user_id,
      message,
      context,
      cognitive,
      emotional,
      srs_backlog,
      banca,
      mode,
      use_rag,
      rag_limit,
      discipline,
      topic,
      topic_code,
      subtopic,
      learning_style,
      response_format,
      include_recent_errors,
      errors_limit,
      create_drop,
    } = request.body;

    if (!message) {
      return reply.code(400).send({ success: false, error: 'message ├® obrigat├│rio' });
    }

    if (create_drop && (create_drop.enabled ?? true) && !create_drop.discipline_id) {
      return reply.code(400).send({
        success: false,
        error: 'create_drop.discipline_id e obrigatorio quando create_drop.enabled',
      });
    }

    const resolvedTopic = subtopic || topic_code || topic;

    // Contexto automatico (best-effort)
    let srsSummary: any = null;
    let reccoState: any = null;
    let ragResults: any[] = [];
    let recentErrors: any[] = [];

    try {
      if (user_id) {
        srsSummary = await getSrsSummary(user_id);
        reccoState = await ReccoRepository.getLatestState(user_id);
        if (include_recent_errors !== false) {
          try {
            recentErrors = await QuestionRepository.getRecentErrors(
              user_id,
              errors_limit || 3
            );
          } catch (err) {
            console.warn('[tutor-api] Falha ao buscar erros recentes:', (err as any)?.message);
          }
        }
      }
    } catch (err) {
      console.warn('[tutor-api] Falha ao carregar contexto do usu├írio:', (err as any)?.message);
    }

    if (use_rag) {
      try {
        ragResults = await RagServiceExpanded.semanticSearch({
          query: message,
          disciplina: discipline,
          topicCode: resolvedTopic,
          banca,
          limit: rag_limit || 3,
        });
      } catch (err) {
        console.warn('[tutor-api] Falha na busca RAG:', (err as any)?.message);
      }
    }

    const formatInstructionMap: Record<string, string> = {
      curta: 'Responda curto: 4-6 linhas, objetivo.',
      longa: 'Responda longo: passos claros, exemplos e resumo final.',
      analogia: 'Use uma analogia concreta e explique a ligacao com o conceito.',
      historia: 'Use uma micro-historia (3-4 frases) para fixar o conceito.',
      mapa_mental: 'Use formato de mapa mental com bullets e sub-bullets curtos.',
    };
    const formatInstruction = response_format
      ? formatInstructionMap[response_format] || ''
      : '';

    const systemPrompt = `
Voc├¬ ├® o Tutor IA do Edro. Responda de forma objetiva e gentil.
Adapte tom e profundidade ao estado do aluno.
Regras:
- Se ansiedade/frustra├º├úo: tom calmo, resumir e encorajar.
- Se foco/energia baixos: respostas curtas, passos pequenos.
- Se modo turbo: v├í direto, mais denso.
- Considere banca: ${banca || 'n├úo informada'} (mencione padr├Áes se relevante).
- Se backlog SRS alto: incentive revisar antes de avan├ºar.
 - Se houver estilo cognitivo, adapte a forma da resposta.
 - Se houver response_format, siga a estrutura pedida.
 - Se houver contexto RAG, cite trechos sucintos.
${formatInstruction ? `Formato: ${formatInstruction}` : ''}
`;

    const userContextParts = [
      context ? `Contexto: ${context}` : '',
      cognitive ? `Estado cognitivo: foco=${cognitive.foco ?? '-'}, energia=${cognitive.energia ?? '-'}, saturacao=${cognitive.saturacao ? 'sim' : 'n├úo'}` : '',
      emotional ? `Estado emocional: ansiedade=${emotional.ansiedade ? 'sim' : 'n├úo'}, frustra├º├úo=${emotional.frustracao ? 'sim' : 'n├úo'}, humor=${emotional.humor ?? '-'}` : '',
      typeof srs_backlog === 'number' ? `Backlog SRS: ${srs_backlog}` : '',
      srsSummary ? `SRS: due=${srsSummary.due}, overdue=${srsSummary.overdue}, retention=${srsSummary.retention_rate}` : '',
      reccoState ? `Estado pedag├│gico: ${reccoState.estado_pedagogico || '-'}; cognitivo=${reccoState.estado_cognitivo || '-'}; emocional=${reccoState.estado_emocional || '-'}` : '',
      banca ? `Banca alvo: ${banca}` : '',
      mode ? `Modo: ${mode}` : '',
      discipline ? `Disciplina: ${discipline}` : '',
      resolvedTopic ? `Topico: ${resolvedTopic}` : '',
      learning_style ? `Estilo cognitivo: ${learning_style}` : '',
      response_format ? `Formato resposta: ${response_format}` : '',
      recentErrors.length
        ? `Erros recentes: ${recentErrors.map((err: any) => `${err.question_text} (correta=${err.correct_answer}, marcou=${err.resposta_escolhida})`).join(' | ')}`
        : '',
    ].filter(Boolean).join('\n');

    const ragContext = ragResults && ragResults.length
      ? `\nFontes RAG:\n${ragResults.slice(0, 3).map((r: any, idx: number) =>
          `${idx + 1}. ${r.summary || r.content || ''}`.trim()
        ).join('\n')}`
      : '';

    const prompt = `${userContextParts}\n\nPergunta do aluno:\n${message}${ragContext}`;

    try {
      const started = Date.now();
      const answer = await OpenAIService.generateCompletion({
        prompt,
        systemPrompt,
        temperature: mode === 'turbo' ? 0.7 : 0.4,
        maxTokens: 800,
      });
      const latency = Date.now() - started;

      MonitoringService.trackTutorCall({
        latencyMs: latency,
        model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
        ragUsed: Boolean(ragResults.length),
      });

      let createdDrop: any = null;
      if (create_drop && (create_drop.enabled ?? true)) {
        const dropTitle = create_drop.title || resolvedTopic || 'Drop do tutor';
        createdDrop = await createDrop({
          discipline_id: create_drop.discipline_id as string,
          title: dropTitle,
          content: answer,
          difficulty: create_drop.difficulty ?? 1,
          topic_code: create_drop.topic_code ?? resolvedTopic ?? null,
          drop_type: create_drop.drop_type ?? null,
          drop_text: create_drop.drop_text ?? null,
          blueprint_id: create_drop.blueprint_id ?? null,
          status: 'draft',
          origin: 'tutor',
          origin_user_id: user_id ?? null,
          origin_meta: {
            source_message: message,
            response_format: response_format || null,
            learning_style: learning_style || null,
            recent_errors: recentErrors,
            metadata: create_drop.metadata ?? null,
          },
        });
      }

      return reply.code(200).send({
        success: true,
        data: {
          answer,
          user_id,
          used_context: {
            srsSummary,
            reccoState,
            ragUsed: Boolean(ragResults.length),
            ragCount: ragResults.length,
            recentErrors,
          },
          drop: createdDrop,
        },
      });
    } catch (error: any) {
      console.error('[tutor-api] Erro ao gerar resposta:', error);
      return reply.code(500).send({
        success: false,
        error: error.message || 'Erro ao gerar resposta do tutor',
      });
    }
  });

  /**
   * POST /tutor/to-drop
   * Cria um drop em status draft a partir da resposta do tutor.
   */
  app.post('/tutor/to-drop', async (request, reply) => {
    const anyReq: any = request;
    try {
      await anyReq.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Nao autorizado.' });
    }

    const user = anyReq.user as { sub?: string };
    const userId = user?.sub;

    const bodySchema = z.object({
      discipline_id: z.string().uuid(),
      title: z.string().min(3),
      content: z.string().min(10),
      difficulty: z.number().int().min(1).max(5).optional(),
      topic_code: z.string().optional(),
      drop_type: z.string().optional(),
      drop_text: z.string().optional(),
      blueprint_id: z.number().int().optional(),
      source_message: z.string().optional(),
      metadata: z.record(z.any()).optional(),
    });

    const body = bodySchema.parse(request.body);

    const drop = await createDrop({
      discipline_id: body.discipline_id,
      title: body.title,
      content: body.content,
      difficulty: body.difficulty ?? 1,
      topic_code: body.topic_code ?? null,
      drop_type: body.drop_type ?? null,
      drop_text: body.drop_text ?? null,
      blueprint_id: body.blueprint_id ?? null,
      status: 'draft',
      origin: 'tutor',
      origin_user_id: userId ?? null,
      origin_meta: {
        source_message: body.source_message ?? null,
        metadata: body.metadata ?? null,
      },
    });

    return reply.status(201).send({ success: true, data: drop });
  });
}
