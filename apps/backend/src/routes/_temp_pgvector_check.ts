import { FastifyPluginAsync } from 'fastify';
import { query } from '../db';

const tempPgVectorCheck: FastifyPluginAsync = async (fastify) => {
  // Temporary endpoint to check and install pgvector
  fastify.get('/_temp/pgvector-check', async (request, reply) => {
    try {
      // Check if pgvector is installed
      const result = await query(`
        SELECT extname, extversion
        FROM pg_extension
        WHERE extname = 'vector'
      `);

      if (result.rows.length > 0) {
        return {
          success: true,
          installed: true,
          version: result.rows[0].extversion,
          message: '✅ pgvector is already installed',
        };
      }

      // Try to install pgvector
      try {
        await query('CREATE EXTENSION IF NOT EXISTS vector');

        // Verify installation
        const verifyResult = await query(`
          SELECT extname, extversion
          FROM pg_extension
          WHERE extname = 'vector'
        `);

        return {
          success: true,
          installed: true,
          version: verifyResult.rows[0]?.extversion,
          message: '✅ pgvector installed successfully!',
        };
      } catch (installError: any) {
        return {
          success: false,
          installed: false,
          error: installError.message,
          message: '❌ Failed to install pgvector. May need superuser privileges.',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  });
};

export default tempPgVectorCheck;
