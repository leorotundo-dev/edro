import { FastifyInstance } from 'fastify';
import { MnemonicService } from '../services/mnemonicService';
import { enforceIaCallLimit } from '../middleware/planLimits';

/**
 * Mnemonic Routes
 * 
 * Endpoints:
 * - POST /api/mnemonics                    - Criar mnemônico
 * - POST /api/mnemonics/generate           - Gerar com IA
 * - GET  /api/mnemonics                    - Listar todos
 * - GET  /api/mnemonics/:id                - Buscar por ID
 * - GET  /api/mnemonics/topic/:topic       - Por tópico
 * - POST /api/mnemonics/:id/add            - Adicionar ao usuário
 * - GET  /api/mnemonics/user/library       - Biblioteca do usuário
 * - GET  /api/mnemonics/user/favorites     - Favoritos do usuário
 * - POST /api/mnemonics/:id/favorite       - Toggle favorito
 * - POST /api/mnemonics/:id/feedback       - Dar feedback
 * - DELETE /api/mnemonics/:id/remove       - Remover do usuário
 * - POST /api/mnemonics/:id/track          - Tracking de uso
 * - GET  /api/mnemonics/:id/effectiveness  - Efetividade
 * - GET  /api/mnemonics/recommend/:topic   - Recomendações
 * - GET  /api/mnemonics/user/stats         - Estatísticas
 */
export async function mnemonicsRoutes(app: FastifyInstance) {
  
  // ============================================
  // POST /api/mnemonics
  // Criar mnemônico
  // ============================================
  app.post('/mnemonics', async (req, reply) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: 'Usuário não autenticado'
        });
      }

      const body = req.body as any;

      if (!body.tecnica || !body.texto_principal) {
        return reply.status(400).send({
          success: false,
          error: 'tecnica e texto_principal são obrigatórios'
        });
      }

      console.log(`[mnemonics] Criando mnemônico`);

      const mnemonicoId = await MnemonicService.createMnemonico({
        tecnica: body.tecnica,
        texto_principal: body.texto_principal,
        explicacao: body.explicacao,
        versoes_alternativas: body.versoes_alternativas,
        subtopico: body.subtopico,
        disciplina_id: body.disciplina_id,
        banca: body.banca,
        nivel_dificuldade: body.nivel_dificuldade,
        estilo_cognitivo: body.estilo_cognitivo,
        emocao_ativada: body.emocao_ativada,
        criado_por: 'Usuario',
      });

      // Adicionar ao usuário automaticamente
      await MnemonicService.addToUser(userId, mnemonicoId);

      return {
        success: true,
        data: { id: mnemonicoId },
        message: 'Mnemônico criado com sucesso'
      };
    } catch (err) {
      console.error('[mnemonics] Erro:', err);
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao criar mnemônico'
      });
    }
  });

  // ============================================
  // POST /api/mnemonics/generate
  // Gerar mnemônico com IA
  // ============================================
  app.post('/mnemonics/generate', { preHandler: enforceIaCallLimit }, async (req, reply) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: 'Usuário não autenticado'
        });
      }

      const body = req.body as any;

      if (!body.subtopico || !body.conteudo) {
        return reply.status(400).send({
          success: false,
          error: 'subtopico e conteudo são obrigatórios'
        });
      }

      console.log(`[mnemonics] Gerando mnemônico com IA`);

      const mnemonicoId = await MnemonicService.generateMnemonic({
        subtopico: body.subtopico,
        conteudo: body.conteudo,
        tecnica: body.tecnica,
        estilo_cognitivo: body.estilo_cognitivo,
        disciplina_id: body.disciplina_id,
        banca: body.banca,
        humor: body.humor,
        energia: body.energia,
        variacoes: body.variacoes,
      });

      // Adicionar ao usuário automaticamente
      await MnemonicService.addToUser(userId, mnemonicoId);

      return {
        success: true,
        data: { id: mnemonicoId },
        message: 'Mnemônico gerado com sucesso'
      };
    } catch (err) {
      console.error('[mnemonics] Erro:', err);
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao gerar mnemônico'
      });
    }
  });

  // ============================================
  // GET /api/mnemonics
  // Listar todos os mnemônicos
  // ============================================
  app.get('/mnemonics', async (req, reply) => {
    try {
      const query = req.query as any;

      console.log(`[mnemonics] Listando mnemônicos`);

      const mnemonicos = await MnemonicService.getMnemonicos({
        disciplina_id: query.disciplina_id,
        subtopico: query.subtopico,
        banca: query.banca,
        tecnica: query.tecnica,
        limit: query.limit ? parseInt(query.limit) : undefined,
      });

      return {
        success: true,
        data: mnemonicos,
        total: mnemonicos.length
      };
    } catch (err) {
      console.error('[mnemonics] Erro:', err);
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao listar mnemônicos'
      });
    }
  });

  // ============================================
  // GET /api/mnemonics/:id
  // Buscar mnemônico por ID
  // ============================================
  app.get('/mnemonics/:id', async (req, reply) => {
    try {
      const { id } = req.params as { id: string };

      console.log(`[mnemonics] Buscando mnemônico ${id}`);

      const mnemonico = await MnemonicService.getMnemonico(id);

      if (!mnemonico) {
        return reply.status(404).send({
          success: false,
          error: 'Mnemônico não encontrado'
        });
      }

      return {
        success: true,
        data: mnemonico
      };
    } catch (err) {
      console.error('[mnemonics] Erro:', err);
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao buscar mnemônico'
      });
    }
  });

  // ============================================
  // GET /api/mnemonics/topic/:topic
  // Mnemônicos por tópico
  // ============================================
  app.get('/mnemonics/topic/:topic', async (req, reply) => {
    try {
      const { topic } = req.params as { topic: string };

      console.log(`[mnemonics] Buscando mnemônicos do tópico ${topic}`);

      const mnemonicos = await MnemonicService.getMnemonicosByTopic(topic);

      return {
        success: true,
        data: mnemonicos,
        total: mnemonicos.length
      };
    } catch (err) {
      console.error('[mnemonics] Erro:', err);
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao buscar mnemônicos'
      });
    }
  });

  // ============================================
  // POST /api/mnemonics/:id/add
  // Adicionar mnemônico ao usuário
  // ============================================
  app.post('/mnemonics/:id/add', async (req, reply) => {
    try {
      const userId = (req.user as any)?.id;
      const { id } = req.params as { id: string };

      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: 'Usuário não autenticado'
        });
      }

      console.log(`[mnemonics] Adicionando mnemônico ${id} ao usuário ${userId}`);

      await MnemonicService.addToUser(userId, id);

      return {
        success: true,
        message: 'Mnemônico adicionado à sua biblioteca'
      };
    } catch (err) {
      console.error('[mnemonics] Erro:', err);
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao adicionar mnemônico'
      });
    }
  });

  // ============================================
  // GET /api/mnemonics/user/library
  // Biblioteca do usuário
  // ============================================
  app.get('/mnemonics/user/library', async (req, reply) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: 'Usuário não autenticado'
        });
      }

      console.log(`[mnemonics] Buscando biblioteca de ${userId}`);

      const mnemonicos = await MnemonicService.getUserMnemonics(userId);

      return {
        success: true,
        data: mnemonicos,
        total: mnemonicos.length
      };
    } catch (err) {
      console.error('[mnemonics] Erro:', err);
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao buscar biblioteca'
      });
    }
  });

  // ============================================
  // GET /api/mnemonics/user/favorites
  // Favoritos do usuário
  // ============================================
  app.get('/mnemonics/user/favorites', async (req, reply) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: 'Usuário não autenticado'
        });
      }

      console.log(`[mnemonics] Buscando favoritos de ${userId}`);

      const favorites = await MnemonicService.getUserFavorites(userId);

      return {
        success: true,
        data: favorites,
        total: favorites.length
      };
    } catch (err) {
      console.error('[mnemonics] Erro:', err);
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao buscar favoritos'
      });
    }
  });

  // ============================================
  // POST /api/mnemonics/:id/favorite
  // Toggle favorito
  // ============================================
  app.post('/mnemonics/:id/favorite', async (req, reply) => {
    try {
      const userId = (req.user as any)?.id;
      const { id } = req.params as { id: string };

      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: 'Usuário não autenticado'
        });
      }

      console.log(`[mnemonics] Toggle favorito ${id} para ${userId}`);

      await MnemonicService.toggleFavorite(userId, id);

      return {
        success: true,
        message: 'Favorito atualizado'
      };
    } catch (err) {
      console.error('[mnemonics] Erro:', err);
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao atualizar favorito'
      });
    }
  });

  // ============================================
  // POST /api/mnemonics/:id/feedback
  // Dar feedback
  // ============================================
  app.post('/mnemonics/:id/feedback', async (req, reply) => {
    try {
      const userId = (req.user as any)?.id;
      const { id } = req.params as { id: string };
      const body = req.body as { funcionaBem: boolean; motivo?: string };

      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: 'Usuário não autenticado'
        });
      }

      console.log(`[mnemonics] Feedback ${id}: ${body.funcionaBem}`);

      await MnemonicService.setFeedback(userId, id, body.funcionaBem, body.motivo);

      return {
        success: true,
        message: 'Feedback registrado'
      };
    } catch (err) {
      console.error('[mnemonics] Erro:', err);
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao registrar feedback'
      });
    }
  });

  // ============================================
  // DELETE /api/mnemonics/:id/remove
  // Remover do usuário
  // ============================================
  app.delete('/mnemonics/:id/remove', async (req, reply) => {
    try {
      const userId = (req.user as any)?.id;
      const { id } = req.params as { id: string };

      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: 'Usuário não autenticado'
        });
      }

      console.log(`[mnemonics] Removendo ${id} de ${userId}`);

      await MnemonicService.removeFromUser(userId, id);

      return {
        success: true,
        message: 'Mnemônico removido da sua biblioteca'
      };
    } catch (err) {
      console.error('[mnemonics] Erro:', err);
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao remover mnemônico'
      });
    }
  });

  // ============================================
  // POST /api/mnemonics/:id/track
  // Tracking de uso
  // ============================================
  app.post('/mnemonics/:id/track', async (req, reply) => {
    try {
      const userId = (req.user as any)?.id;
      const { id } = req.params as { id: string };
      const body = req.body as any;

      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: 'Usuário não autenticado'
        });
      }

      console.log(`[mnemonics] Tracking uso de ${id}`);

      await MnemonicService.trackUsage({
        userId,
        mnemonicoId: id,
        ajudou_lembrar: body.ajudou_lembrar,
        tempo_para_lembrar: body.tempo_para_lembrar,
        contexto: body.contexto,
      });

      return {
        success: true,
        message: 'Uso registrado'
      };
    } catch (err) {
      console.error('[mnemonics] Erro:', err);
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao registrar uso'
      });
    }
  });

  // ============================================
  // GET /api/mnemonics/:id/effectiveness
  // Efetividade do mnemônico
  // ============================================
  app.get('/mnemonics/:id/effectiveness', async (req, reply) => {
    try {
      const { id } = req.params as { id: string };

      console.log(`[mnemonics] Buscando efetividade de ${id}`);

      const effectiveness = await MnemonicService.getEffectiveness(id);

      return {
        success: true,
        data: effectiveness
      };
    } catch (err) {
      console.error('[mnemonics] Erro:', err);
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao buscar efetividade'
      });
    }
  });

  // ============================================
  // GET /api/mnemonics/recommend/:topic
  // Recomendações de mnemônicos
  // ============================================
  app.get('/mnemonics/recommend/:topic', async (req, reply) => {
    try {
      const userId = (req.user as any)?.id;
      const { topic } = req.params as { topic: string };
      const query = req.query as any;

      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: 'Usuário não autenticado'
        });
      }

      console.log(`[mnemonics] Recomendando mnemônicos de ${topic}`);

      const recommendations = await MnemonicService.recommendMnemonics({
        userId,
        subtopico: topic,
        estilo_cognitivo: query.estilo_cognitivo,
        limit: query.limit ? parseInt(query.limit) : 5,
      });

      return {
        success: true,
        data: recommendations,
        total: recommendations.length
      };
    } catch (err) {
      console.error('[mnemonics] Erro:', err);
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao recomendar mnemônicos'
      });
    }
  });

  // ============================================
  // GET /api/mnemonics/user/stats
  // Estatísticas do usuário
  // ============================================
  app.get('/mnemonics/user/stats', async (req, reply) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: 'Usuário não autenticado'
        });
      }

      console.log(`[mnemonics] Buscando stats de ${userId}`);

      const stats = await MnemonicService.getUserStats(userId);

      return {
        success: true,
        data: stats
      };
    } catch (err) {
      console.error('[mnemonics] Erro:', err);
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao buscar estatísticas'
      });
    }
  });
}

export default mnemonicsRoutes;
