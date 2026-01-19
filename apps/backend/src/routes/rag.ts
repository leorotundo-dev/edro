import { FastifyInstance } from 'fastify';
import { RagServiceExpanded } from '../services/ragServiceExpanded';

/**
 * RAG Routes
 * 
 * Endpoints para sistema RAG (Retrieval-Augmented Generation)
 */
export async function ragRoutes(app: FastifyInstance) {
  
  // ============================================
  // RAG BLOCKS
  // ============================================

  // Create RAG block
  app.post('/rag/blocks', async (req, reply) => {
    try {
      const body = req.body as any;

      const blockId = await RagServiceExpanded.createRagBlock({
        disciplina: body.disciplina,
        topicCode: body.topicCode,
        banca: body.banca,
        sourceUrl: body.sourceUrl,
        summary: body.summary,
        fullContent: body.fullContent,
        metadata: body.metadata,
      });

      return {
        success: true,
        data: { id: blockId },
        message: 'Bloco RAG criado com sucesso',
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao criar bloco',
      });
    }
  });

  // List RAG blocks
  app.get('/rag/blocks', async (req, reply) => {
    try {
      const query = req.query as any;

      const blocks = await RagServiceExpanded.getRagBlocks({
        disciplina: query.disciplina,
        topicCode: query.topicCode,
        banca: query.banca,
        limit: query.limit ? parseInt(query.limit) : 50,
      });

      return {
        success: true,
        data: blocks,
        total: blocks.length,
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao listar blocos',
      });
    }
  });

  // Get RAG block by ID
  app.get('/rag/blocks/:id', async (req, reply) => {
    try {
      const { id } = req.params as { id: string };

      const block = await RagServiceExpanded.getRagBlockById(id);

      if (!block) {
        return reply.status(404).send({
          success: false,
          error: 'Bloco não encontrado',
        });
      }

      return {
        success: true,
        data: block,
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao buscar bloco',
      });
    }
  });

  // Update RAG block
  app.put('/rag/blocks/:id', async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const body = req.body as any;

      await RagServiceExpanded.updateRagBlock(id, body);

      return {
        success: true,
        message: 'Bloco atualizado com sucesso',
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao atualizar bloco',
      });
    }
  });

  // Delete RAG block
  app.delete('/rag/blocks/:id', async (req, reply) => {
    try {
      const { id } = req.params as { id: string };

      await RagServiceExpanded.deleteRagBlock(id);

      return {
        success: true,
        message: 'Bloco deletado com sucesso',
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao deletar bloco',
      });
    }
  });

  // ============================================
  // SEMANTIC SEARCH
  // ============================================

  // Semantic search
  app.post('/rag/search', async (req, reply) => {
    try {
      const body = req.body as any;

      if (!body.query) {
        return reply.status(400).send({
          success: false,
          error: 'Query é obrigatória',
        });
      }

      const results = await RagServiceExpanded.semanticSearch({
        query: body.query,
        disciplina: body.disciplina,
        topicCode: body.topicCode,
        banca: body.banca,
        limit: body.limit || 10,
      });

      return {
        success: true,
        data: results,
        total: results.length,
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro na busca',
      });
    }
  });

  // ============================================
  // EMBEDDINGS
  // ============================================

  // Generate embedding for block
  app.post('/rag/blocks/:id/embedding', async (req, reply) => {
    try {
      const { id } = req.params as { id: string };

      const block = await RagServiceExpanded.getRagBlockById(id);
      if (!block) {
        return reply.status(404).send({
          success: false,
          error: 'Bloco não encontrado',
        });
      }

      await RagServiceExpanded.generateEmbedding(id, block.summary);

      return {
        success: true,
        message: 'Embedding gerado com sucesso',
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao gerar embedding',
      });
    }
  });

  // Regenerate all embeddings
  app.post('/rag/embeddings/regenerate-all', async (req, reply) => {
    try {
      // Start async process
      RagServiceExpanded.regenerateAllEmbeddings()
        .then(result => {
          console.log('[rag] Regeneração completa:', result);
        })
        .catch(err => {
          console.error('[rag] Erro na regeneração:', err);
        });

      return {
        success: true,
        message: 'Regeneração de embeddings iniciada (processo assíncrono)',
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao iniciar regeneração',
      });
    }
  });

  // ============================================
  // SUMMARIZATION
  // ============================================

  // Summarize content
  app.post('/rag/summarize', async (req, reply) => {
    try {
      const body = req.body as any;

      if (!body.content || !body.topicCode) {
        return reply.status(400).send({
          success: false,
          error: 'content e topicCode são obrigatórios',
        });
      }

      const summary = await RagServiceExpanded.summarizeContent({
        fullContent: body.content,
        topicCode: body.topicCode,
        banca: body.banca,
      });

      return {
        success: true,
        data: { summary },
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao sumarizar',
      });
    }
  });

  // ============================================
  // STATISTICS
  // ============================================

  // Get RAG stats
  app.get('/rag/stats', async (req, reply) => {
    try {
      const stats = await RagServiceExpanded.getRagStats();

      return {
        success: true,
        data: stats,
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao buscar estatísticas',
      });
    }
  });
}

export default ragRoutes;
