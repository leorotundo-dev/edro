import { FastifyInstance } from 'fastify';
import { HarvestService } from '../services/harvestService';
import { enforcePdfLimitIfAuthenticated } from '../middleware/planLimits';

/**
 * Harvest Routes
 * 
 * Endpoints para gerenciar coleta de conteúdo
 */
export async function harvestRoutes(app: FastifyInstance) {
  
  // ============================================
  // SOURCES
  // ============================================

  // List sources
  app.get('/harvest/sources', async (req, reply) => {
    try {
      const query = req.query as any;
      const enabledFilter =
        typeof query.enabled === 'string' ? query.enabled === 'true' : undefined;

      const sources = await HarvestService.getSources({
        enabled: enabledFilter,
        type: typeof query.type === 'string' ? query.type : undefined,
      });

      return {
        success: true,
        data: sources,
        total: sources.length,
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao listar fontes',
      });
    }
  });

  // Get source by ID
  app.get('/harvest/sources/:id', async (req, reply) => {
    try {
      const { id } = req.params as { id: string };

      const source = await HarvestService.getSourceById(id);

      if (!source) {
        return reply.status(404).send({
          success: false,
          error: 'Fonte não encontrada',
        });
      }

      return {
        success: true,
        data: source,
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao buscar fonte',
      });
    }
  });

  // Create source
  app.post('/harvest/sources', async (req, reply) => {
    try {
      const body = req.body as any;

      const sourceId = await HarvestService.addSource({
        name: body.name,
        base_url: body.base_url,
        type: body.type,
        enabled: body.enabled,
        priority: body.priority,
        config: body.config,
      });

      return {
        success: true,
        data: { id: sourceId },
        message: 'Fonte criada com sucesso',
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao criar fonte',
      });
    }
  });

  // Update source
  app.put('/harvest/sources/:id', async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const body = req.body as any;

      await HarvestService.updateSource(id, {
        name: body.name,
        base_url: body.base_url,
        enabled: typeof body.enabled === 'boolean' ? body.enabled : undefined,
        priority: typeof body.priority === 'number' ? body.priority : undefined,
        type: typeof body.type === 'string' ? body.type : undefined,
        config: body.config,
      });

      return {
        success: true,
        message: 'Fonte atualizada com sucesso',
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao atualizar fonte',
      });
    }
  });

  // Delete source
  app.delete('/harvest/sources/:id', async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const ok = await HarvestService.deleteSource(id);
      if (!ok) {
        return reply.status(404).send({
          success: false,
          error: 'Fonte nao encontrada',
        });
      }
      return {
        success: true,
        message: 'Fonte deletada com sucesso',
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao deletar fonte',
      });
    }
  });

  // Clear harvested content for source (keeps the source)
  app.post('/harvest/sources/:id/clear', async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const cleared = await HarvestService.clearHarvestedBySource(id);
      return {
        success: true,
        data: { cleared },
        message: `Conteudo limpo (${cleared})`,
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao limpar conteudo',
      });
    }
  });

  // ============================================
  // HARVEST OPERATIONS
  // ============================================

  // Harvest from specific source
  app.post('/harvest/run/:sourceId', { preHandler: enforcePdfLimitIfAuthenticated }, async (req, reply) => {
    try {
      const { sourceId } = req.params as { sourceId: string };
      const body = (req.body ?? {}) as any;
      const limit = body.limit || 10;
      const asyncMode = body.async === true;
      const autoImport = body.autoImport !== false;
      const forceRefresh = body.forceRefresh === true;

      if (asyncMode) {
        void HarvestService.harvestFromSource(sourceId, limit, undefined, { autoImport, forceRefresh })
          .catch((err) => {
            app.log.error({ err, sourceId }, '[harvest] Falha ao executar coleta em background');
          });
        return reply.status(202).send({
          success: true,
          data: { queued: true, sourceId, limit },
          message: 'Coleta iniciada em background',
        });
      }

      const result = await HarvestService.harvestFromSource(sourceId, limit, undefined, { autoImport, forceRefresh });

      return {
        success: result.success,
        data: result,
        message: `Coletados ${result.harvested_count} itens`,
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao coletar',
      });
    }
  });

  // Harvest from all sources
  app.post('/harvest/run-all', { preHandler: enforcePdfLimitIfAuthenticated }, async (req, reply) => {
    try {
      const body = (req.body ?? {}) as any;
      const limit = body.limit || 10;
      const asyncMode = body.async === true;
      const autoImport = body.autoImport !== false;
      const forceRefresh = body.forceRefresh === true;

      if (asyncMode) {
        void HarvestService.harvestAll(limit, { autoImport, forceRefresh })
          .catch((err) => {
            app.log.error({ err }, '[harvest] Falha ao executar coleta geral em background');
          });
        return reply.status(202).send({
          success: true,
          data: { queued: true, limit },
          message: 'Coleta geral iniciada em background',
        });
      }

      const result = await HarvestService.harvestAll(limit, { autoImport, forceRefresh });

      return {
        success: true,
        data: result,
        message: `Coletados ${result.total_harvested} itens de ${result.total_sources} fontes`,
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao coletar',
      });
    }
  });

  // ============================================
  // HARVESTED CONTENT
  // ============================================

  // List harvested content
  app.get('/harvest/content', async (req, reply) => {
    try {
      const query = req.query as any;
      const includeRaw =
        query.includeRaw === 'true' ||
        query.includeRaw === true ||
        query.includeRaw === '1';

      const content = await HarvestService.getHarvestedContent({
        sourceId: query.sourceId,
        contentType: query.contentType,
        status: query.status,
        limit: query.limit ? parseInt(query.limit) : 50,
        includeRaw,
      });

      return {
        success: true,
        data: content,
        total: content.length,
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao listar conteúdo',
      });
    }
  });

  // Get harvested content by ID
  app.get('/harvest/content/:id', async (req, reply) => {
    try {
      const { id } = req.params as { id: string };

      const content = await HarvestService.getHarvestedById(id);

      if (!content) {
        return reply.status(404).send({
          success: false,
          error: 'Conteúdo não encontrado',
        });
      }

      return {
        success: true,
        data: content,
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao buscar conteúdo',
      });
    }
  });

  // Import harvested content as edital
  app.post('/harvest/content/:id/import', async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const result = await HarvestService.importHarvestedToEdital(id);
      return {
        success: true,
        data: result,
        message: 'Conteúdo promovido para edital',
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao importar para edital',
      });
    }
  });
}

export default harvestRoutes;
