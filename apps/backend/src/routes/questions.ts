/**
 * Questions Routes
 * 
 * Endpoints para gera├º├úo e gerenciamento de quest├Áes com IA
 */

import type { FastifyInstance } from 'fastify';
import { 
  generateQuestion, 
  generateQuestionBatch,
  analyzeQuestion,
  validateGeneratedQuestion,
  formatQuestionForDisplay
} from '../services/ai/questionGenerator';
import { QuestionRepository } from '../repositories/questionRepository';
import { enforceIaCallLimit } from '../middleware/planLimits';
import { registerSrsErrorReview } from '../repositories/srsRepository';
import { GamificationService } from '../services/gamificationService';
import { ensureDropForQuestion } from '../services/questions/questionDrop';
import { upsertUserStatsForTopic } from '../services/learn/userStats';
import { ProgressService } from '../services/progressService';
import { query } from '../db';

export default async function questionsRoutes(app: FastifyInstance) {

  // ============================================
  // GERA├ç├âO DE QUEST├òES
  // ============================================

  /**
   * POST /ai/questions/generate
   * Gera uma quest├úo usando IA
   */
  app.post<{
    Body: {
      topic: string;
      discipline: string;
      examBoard: 'CESPE' | 'FCC' | 'FGV' | 'VUNESP' | 'outro';
      difficulty: 1 | 2 | 3 | 4 | 5;
      context?: string;
      saveToDatabase?: boolean;
    };
  }>('/ai/questions/generate', { preHandler: enforceIaCallLimit }, async (request, reply) => {
    const { topic, discipline, examBoard, difficulty, context, saveToDatabase } = request.body;

    // Valida├º├Áes
    if (!topic || !discipline || !examBoard || !difficulty) {
      return reply.code(400).send({
        success: false,
        error: 'Campos obrigat├│rios: topic, discipline, examBoard, difficulty'
      });
    }

    if (difficulty < 1 || difficulty > 5) {
      return reply.code(400).send({
        success: false,
        error: 'Dificuldade deve estar entre 1 e 5'
      });
    }

    try {
      console.log(`[questions-api] Gerando quest├úo: ${topic}`);

      const question = await generateQuestion({
        topic,
        discipline,
        examBoard,
        difficulty,
        context
      });

      // Validar quest├úo gerada
      const validation = validateGeneratedQuestion(question);
      if (!validation.valid) {
        console.warn('[questions-api] Quest├úo gerada com problemas:', validation.errors);
      }

      // Salvar no banco se solicitado
      let questionId: string | null = null;
      if (saveToDatabase) {
        questionId = await QuestionRepository.saveGeneratedQuestion(
          question,
          discipline,
          topic,
          examBoard,
          'draft'
        );
      }

      return reply.code(200).send({
        success: true,
        data: {
          question,
          validation,
          questionId,
          formatted: formatQuestionForDisplay(question)
        }
      });

    } catch (error: any) {
      console.error('[questions-api] Erro ao gerar quest├úo:', error);
      return reply.code(500).send({
        success: false,
        error: error.message || 'Erro ao gerar quest├úo'
      });
    }
  });

  /**
   * POST /ai/questions/generate-batch
   * Gera m├║ltiplas quest├Áes em batch
   */
  app.post<{
    Body: {
      topic: string;
      discipline: string;
      examBoard: 'CESPE' | 'FCC' | 'FGV' | 'VUNESP' | 'outro';
      difficulty: 1 | 2 | 3 | 4 | 5;
      count: number;
      context?: string;
      saveToDatabase?: boolean;
    };
  }>('/ai/questions/generate-batch', { preHandler: enforceIaCallLimit }, async (request, reply) => {
    const { topic, discipline, examBoard, difficulty, count, context, saveToDatabase } = request.body;

    if (!topic || !discipline || !examBoard || !difficulty || !count) {
      return reply.code(400).send({
        success: false,
        error: 'Campos obrigat├│rios: topic, discipline, examBoard, difficulty, count'
      });
    }

    if (count < 1 || count > 10) {
      return reply.code(400).send({
        success: false,
        error: 'Count deve estar entre 1 e 10'
      });
    }

    try {
      console.log(`[questions-api] Gerando batch de ${count} quest├Áes`);

      const questions = await generateQuestionBatch(
        { topic, discipline, examBoard, difficulty, context },
        count
      );

      // Salvar no banco se solicitado
      const questionIds: string[] = [];
      if (saveToDatabase) {
        for (const question of questions) {
          const id = await QuestionRepository.saveGeneratedQuestion(
            question,
            discipline,
            topic,
            examBoard,
            'draft'
          );
          questionIds.push(id);
        }
      }

      return reply.code(200).send({
        success: true,
        data: {
          questions,
          count: questions.length,
          questionIds: saveToDatabase ? questionIds : null
        }
      });

    } catch (error: any) {
      console.error('[questions-api] Erro ao gerar batch:', error);
      return reply.code(500).send({
        success: false,
        error: error.message || 'Erro ao gerar batch de quest├Áes'
      });
    }
  });

  /**
   * POST /ai/questions/analyze
   * Analisa uma quest├úo existente
   */
  app.post<{
    Body: {
      questionText: string;
      alternatives: Array<{ letter: string; text: string; is_correct: boolean }>;
      correctAnswer: string;
      saveToQuestion?: string;
    };
  }>('/ai/questions/analyze', async (request, reply) => {
    const { questionText, alternatives, correctAnswer, saveToQuestion } = request.body;

    if (!questionText || !alternatives || !correctAnswer) {
      return reply.code(400).send({
        success: false,
        error: 'Campos obrigat├│rios: questionText, alternatives, correctAnswer'
      });
    }

    try {
      console.log(`[questions-api] Analisando quest├úo`);

      const analysis = await analyzeQuestion(questionText, alternatives, correctAnswer);

      // Salvar quality score na quest├úo se ID fornecido
      if (saveToQuestion) {
        await QuestionRepository.updateQualityScore(saveToQuestion, analysis.quality_score);
      }

      return reply.code(200).send({
        success: true,
        data: analysis
      });

    } catch (error: any) {
      console.error('[questions-api] Erro ao analisar:', error);
      return reply.code(500).send({
        success: false,
        error: error.message || 'Erro ao analisar quest├úo'
      });
    }
  });

  // ============================================
  // CRUD DE QUEST├òES
  // ============================================

  /**
   * GET /questions
   * Lista quest├Áes com filtros
   */
  app.get<{
    Querystring: {
      discipline?: string;
      topic?: string;
      examBoard?: string;
      difficulty?: string;
      cognitiveLevel?: string;
      tags?: string;
      status?: string;
      aiGenerated?: string;
      editalId?: string;
      edital_id?: string;
      limit?: string;
      offset?: string;
    };
  }>('/questions', async (request, reply) => {
    try {
      const editalId = request.query.editalId || request.query.edital_id;
      const aiGeneratedParam = request.query.aiGenerated;
      const aiGenerated = typeof aiGeneratedParam === 'string'
        ? aiGeneratedParam === 'true'
        : undefined;

      const filters = {
        discipline: request.query.discipline,
        topic: request.query.topic,
        examBoard: request.query.examBoard,
        difficulty: request.query.difficulty ? parseInt(request.query.difficulty) : undefined,
        cognitiveLevel: request.query.cognitiveLevel,
        tags: request.query.tags
          ? request.query.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
          : undefined,
        status: request.query.status,
        aiGenerated,
        editalId: editalId || undefined,
        limit: request.query.limit ? parseInt(request.query.limit) : 20,
        offset: request.query.offset ? parseInt(request.query.offset) : 0,
      };

      const questions = await QuestionRepository.listQuestions(filters);
      const total = await QuestionRepository.countQuestions({
        discipline: filters.discipline,
        status: filters.status,
        aiGenerated: filters.aiGenerated,
        editalId: filters.editalId,
      });

      return reply.code(200).send({
        success: true,
        data: {
          questions,
          total,
          limit: filters.limit,
          offset: filters.offset,
        }
      });

    } catch (error: any) {
      console.error('[questions-api] Erro ao listar:', error);
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /questions/:id
   * Busca quest├úo por ID
   */
  app.get<{
    Params: { id: string };
  }>('/questions/:id', async (request, reply) => {
    const { id } = request.params;

    try {
      const question = await QuestionRepository.findQuestionById(id);

      if (!question) {
        return reply.code(404).send({
          success: false,
          error: 'Quest├úo n├úo encontrada'
        });
      }

      // Buscar estat├¡sticas
      const statistics = await QuestionRepository.getQuestionStatistics(id);

      return reply.code(200).send({
        success: true,
        data: {
          question,
          statistics
        }
      });

    } catch (error: any) {
      console.error('[questions-api] Erro ao buscar:', error);
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /questions/:id/answer
   * Registra resposta do usu├írio
   */
  app.post<{
    Params: { id: string };
    Body: {
      userId: string;
      selectedAnswer: string;
      timeSpent: number;
    };
  }>('/questions/:id/answer', async (request, reply) => {
    const { id } = request.params;
    const { userId, selectedAnswer, timeSpent } = request.body;

    if (!userId || !selectedAnswer || !timeSpent) {
      return reply.code(400).send({
        success: false,
        error: 'Campos obrigat├│rios: userId, selectedAnswer, timeSpent'
      });
    }

    try {
      const question = await QuestionRepository.findQuestionById(id);

      if (!question) {
        return reply.code(404).send({
          success: false,
          error: 'Quest├úo n├úo encontrada'
        });
      }

      const isCorrect = selectedAnswer.toLowerCase() === question.correct_answer.toLowerCase();

      // Registrar tentativa
      await QuestionRepository.recordQuestionAttempt(id, userId, isCorrect, timeSpent);

      const topicCode = question.topic || question.subtopico || null;

      if (topicCode) {
        try {
          await upsertUserStatsForTopic({
            userId,
            topicCode,
            wasCorrect: isCorrect,
          });
        } catch (err) {
          console.warn('[questions-api] Falha ao atualizar user_stats:', (err as any)?.message);
        }
      }

      try {
        await ProgressService.updateProgressRealtime({
          userId,
          type: 'question',
          correct: isCorrect,
          timeSpent,
          subtopico: topicCode || undefined,
        });
      } catch (err) {
        console.warn('[questions-api] Falha ao atualizar progress:', (err as any)?.message);
      }

      // Reforco pos-erro: criar/atualizar card SRS atrelado a questao e agendar revisao
      if (!isCorrect) {
        try {
          await query(
            `
            INSERT INTO questoes_erro_map (
              user_id, questao_id, resposta_escolhida, tempo_gasto
            ) VALUES ($1, $2, $3, $4)
            `,
            [userId, question.id, selectedAnswer, timeSpent]
          );
        } catch (err) {
          console.warn('[questions-api] Falha ao registrar questoes_erro_map:', (err as any)?.message);
        }

        try {
          const { generateMnemonic, addToUser } = await import('../services/mnemonicService');
          const srsDropId = await ensureDropForQuestion(question);
          if (srsDropId) {
            await registerSrsErrorReview({
              userId,
              contentType: 'question',
              contentId: question.id,
              dropId: srsDropId
            });
          } else {
            console.warn('[questions-api] Sem drop valido para registrar erro SRS');
          }

          // Gerar mnemonico rapido com IA (fallback interno) e associar ao usuario
          if (question.topic) {
            const mnemonicoId = await generateMnemonic({
              subtopico: question.topic,
              conteudo: question.explanation || question.question_text || question.topic,
              tecnica: 'acronimo',
              estilo_cognitivo: 'visual',
            }).catch(() => null);

            if (mnemonicoId) {
              await addToUser(userId, mnemonicoId);
              console.log(`[questions-api] Mnemonico gerado e associado para user=${userId} question=${id}`);
            }
          }

          console.log(`[questions-api] Reforco SRS criado para user=${userId} question=${id}`);
        } catch (err) {
          console.warn('[questions-api] Falha ao registrar reforco SRS:', (err as any)?.message);
        }
      }

      try {
        await GamificationService.trackActivity({
          userId,
          action: 'question_answered',
          sourceId: question.id,
          metadata: {
            isCorrect,
            timeSpent,
            topic: question.topic,
          },
        });
      } catch (err) {
        console.warn('[questions-api] Falha ao atualizar gamificacao:', (err as any)?.message);
      }

      return reply.code(200).send({
        success: true,
        data: {
          isCorrect,
          correctAnswer: question.correct_answer,
          explanation: question.explanation
        }
      });

    } catch (error: any) {
      console.error('[questions-api] Erro ao registrar resposta:', error);
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /questions/search
   * Busca quest├Áes por conceito
   */
  app.get<{
    Querystring: {
      concept: string;
      limit?: string;
    };
  }>('/questions/search', async (request, reply) => {
    const { concept, limit } = request.query;

    if (!concept) {
      return reply.code(400).send({
        success: false,
        error: 'Par├ómetro obrigat├│rio: concept'
      });
    }

    try {
      const questions = await QuestionRepository.findQuestionsByConcept(
        concept,
        limit ? parseInt(limit) : 10
      );

      return reply.code(200).send({
        success: true,
        data: {
          questions,
          count: questions.length
        }
      });

    } catch (error: any) {
      console.error('[questions-api] Erro ao buscar por conceito:', error);
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /questions/:id/similar
   * Busca quest├Áes similares
   */
  app.get<{
    Params: { id: string };
    Querystring: { limit?: string };
  }>('/questions/:id/similar', async (request, reply) => {
    const { id } = request.params;
    const { limit } = request.query;

    try {
      const similarQuestions = await QuestionRepository.findSimilarQuestions(
        id,
        limit ? parseInt(limit) : 5
      );

      return reply.code(200).send({
        success: true,
        data: {
          questions: similarQuestions,
          count: similarQuestions.length
        }
      });

    } catch (error: any) {
      console.error('[questions-api] Erro ao buscar similares:', error);
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * PATCH /questions/:id
   * Atualiza quest├úo
   */
  app.patch<{
    Params: { id: string };
    Body: {
      status?: 'draft' | 'active' | 'archived';
      quality_score?: number;
    };
  }>('/questions/:id', async (request, reply) => {
    const { id } = request.params;
    const updates = request.body;

    try {
      if (updates.status) {
        await QuestionRepository.updateQuestionStatus(id, updates.status);
      }

      if (updates.quality_score !== undefined) {
        await QuestionRepository.updateQualityScore(id, updates.quality_score);
      }

      const question = await QuestionRepository.findQuestionById(id);

      return reply.code(200).send({
        success: true,
        data: question
      });

    } catch (error: any) {
      console.error('[questions-api] Erro ao atualizar:', error);
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * DELETE /questions/:id
   * Remove quest├úo (soft delete)
   */
  app.delete<{
    Params: { id: string };
  }>('/questions/:id', async (request, reply) => {
    const { id } = request.params;

    try {
      const deleted = await QuestionRepository.deleteQuestion(id);

      if (!deleted) {
        return reply.code(404).send({
          success: false,
          error: 'Quest├úo n├úo encontrada'
        });
      }

      return reply.code(200).send({
        success: true,
        message: 'Quest├úo arquivada com sucesso'
      });

    } catch (error: any) {
      console.error('[questions-api] Erro ao deletar:', error);
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });

  // ============================================
  // ADMIN / STATS
  // ============================================

  /**
   * GET /admin/questions/stats
   * Estat├¡sticas gerais de quest├Áes
   */
  app.get('/admin/questions/stats', async (request, reply) => {
    try {
      const [total, active, draft, aiGenerated] = await Promise.all([
        QuestionRepository.countQuestions(),
        QuestionRepository.countQuestions({ status: 'active' }),
        QuestionRepository.countQuestions({ status: 'draft' }),
        QuestionRepository.countQuestions({ aiGenerated: true }),
      ]);

      return reply.code(200).send({
        success: true,
        data: {
          total,
          active,
          draft,
          aiGenerated,
          manual: total - aiGenerated,
        }
      });

    } catch (error: any) {
      console.error('[questions-api] Erro ao buscar stats:', error);
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });
}
