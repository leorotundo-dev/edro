/**
 * Rotas para monitoramento de Circuit Breakers
 * 
 * Permite admins ver status e resetar circuit breakers
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getAllCircuitBreakers } from '../services/ai/circuitBreaker';
import { query } from '../db';
import { requireAdmin } from '../middleware/adminGuard';

export default async function circuitBreakersRoutes(app: FastifyInstance) {
  // Rotas restritas a administradores
  app.addHook('preHandler', requireAdmin);
  
  // ============================================
  // GET /api/circuit-breakers
  // Lista todos os circuit breakers e seus status
  // ============================================
  
  app.get('/circuit-breakers', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const breakers = getAllCircuitBreakers();
      const stats = Array.from(breakers.entries()).map(([name, breaker]) => ({
        name,
        ...breaker.getStats(),
        available: breaker.isAvailable(),
      }));

      return reply.send({
        success: true,
        data: stats,
        summary: {
          total: stats.length,
          open: stats.filter(s => s.state === 'OPEN').length,
          closed: stats.filter(s => s.state === 'CLOSED').length,
          halfOpen: stats.filter(s => s.state === 'HALF_OPEN').length,
        },
      });
    } catch (error) {
      console.error('Erro ao listar circuit breakers:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro ao listar circuit breakers',
      });
    }
  });

  // ============================================
  // GET /api/circuit-breakers/:name
  // Detalhes de um circuit breaker específico
  // ============================================
  
  app.get('/circuit-breakers/:name', async (
    request: FastifyRequest<{ Params: { name: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const { name } = request.params;
      const breakers = getAllCircuitBreakers();
      const breaker = breakers.get(name);

      if (!breaker) {
        return reply.status(404).send({
          success: false,
          error: `Circuit breaker "${name}" não encontrado`,
        });
      }

      return reply.send({
        success: true,
        data: {
          name,
          ...breaker.getStats(),
          available: breaker.isAvailable(),
        },
      });
    } catch (error) {
      console.error('Erro ao buscar circuit breaker:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro ao buscar circuit breaker',
      });
    }
  });

  // ============================================
  // POST /api/circuit-breakers/:name/reset
  // Reseta um circuit breaker (admin only)
  // ============================================
  
  app.post('/circuit-breakers/:name/reset', async (
    request: FastifyRequest<{ Params: { name: string } }>,
    reply: FastifyReply
  ) => {
    try {
      // TODO: Adicionar autenticação admin aqui
      // const isAdmin = request.user?.role === 'admin';
      // if (!isAdmin) return reply.status(403).send({ error: 'Forbidden' });

      const { name } = request.params;
      const breakers = getAllCircuitBreakers();
      const breaker = breakers.get(name);

      if (!breaker) {
        return reply.status(404).send({
          success: false,
          error: `Circuit breaker "${name}" não encontrado`,
        });
      }

      breaker.reset();

      return reply.send({
        success: true,
        message: `Circuit breaker "${name}" resetado com sucesso`,
        data: breaker.getStats(),
      });
    } catch (error) {
      console.error('Erro ao resetar circuit breaker:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro ao resetar circuit breaker',
      });
    }
  });

  // ============================================
  // GET /api/circuit-breakers/stats/cache
  // Estatísticas do cache de IA
  // ============================================
  
  app.get('/circuit-breakers/stats/cache', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { rows: stats } = await query<{
        cache_type: string;
        total_entries: number;
        total_hits: number;
        avg_hits: number;
        max_hits: number;
        active_entries: number;
        expired_entries: number;
        oldest_entry: Date;
        newest_entry: Date;
      }>(`SELECT * FROM ai_cache_stats ORDER BY total_hits DESC`);

      const { rows: totals } = await query<{
        total_entries: number;
        total_hits: number;
        active_entries: number;
      }>(`
        SELECT 
          COUNT(*) as total_entries,
          SUM(hit_count) as total_hits,
          COUNT(*) FILTER (WHERE expires_at IS NULL OR expires_at > NOW()) as active_entries
        FROM ai_cache
      `);

      return reply.send({
        success: true,
        data: {
          byType: stats,
          totals: totals[0] || { total_entries: 0, total_hits: 0, active_entries: 0 },
        },
      });
    } catch (error) {
      console.error('Erro ao buscar stats de cache:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro ao buscar estatísticas de cache',
      });
    }
  });

  // ============================================
  // POST /api/circuit-breakers/cache/cleanup
  // Limpa cache expirado (admin only)
  // ============================================
  
  app.post('/circuit-breakers/cache/cleanup', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // TODO: Adicionar autenticação admin aqui

      await query(`SELECT cleanup_expired_ai_cache()`);

      const { rows } = await query<{ count: number }>(`
        SELECT COUNT(*) as count FROM ai_cache
        WHERE expires_at IS NOT NULL AND expires_at < NOW()
      `);

      return reply.send({
        success: true,
        message: 'Cache expirado limpo com sucesso',
        itemsRemoved: rows[0]?.count || 0,
      });
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro ao limpar cache',
      });
    }
  });

  // ============================================
  // GET /api/circuit-breakers/health
  // Health check dos circuit breakers
  // ============================================
  
  app.get('/circuit-breakers/health', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const breakers = getAllCircuitBreakers();
      const allStats = Array.from(breakers.entries()).map(([name, breaker]) => ({
        name,
        state: breaker.getStats().state,
        available: breaker.isAvailable(),
      }));

      const allAvailable = allStats.every(s => s.available);
      const anyOpen = allStats.some(s => s.state === 'OPEN');

      return reply.send({
        success: true,
        healthy: allAvailable,
        status: anyOpen ? 'degraded' : 'healthy',
        breakers: allStats,
      });
    } catch (error) {
      console.error('Erro ao verificar health:', error);
      return reply.status(500).send({
        success: false,
        healthy: false,
        status: 'error',
      });
    }
  });
}
