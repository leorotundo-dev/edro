/**
 * Security Routes
 * Security management endpoints
 */

import { FastifyInstance } from 'fastify';
import SecurityService from '../services/securityService';
import { requireAdmin } from '../middleware/adminGuard';

export async function securityRoutes(app: FastifyInstance) {
  
  // ============================================
  // SECURITY AUDIT
  // ============================================
  
  app.get('/admin/security/audit', { preHandler: requireAdmin }, async (req, reply) => {
    try {
      const audit = await SecurityService.runSecurityAudit();

      return {
        success: true,
        data: audit,
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Security audit failed',
      });
    }
  });

  // ============================================
  // CSRF TOKEN
  // ============================================
  
  app.get('/security/csrf-token', async (req, reply) => {
    try {
      const user = req.user as any;
      
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: 'Unauthorized',
        });
      }

      const token = SecurityService.generateCsrfToken(user.id);

      return {
        success: true,
        data: {
          token,
          expires: Date.now() + 3600000, // 1 hour
        },
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to generate CSRF token',
      });
    }
  });

  // ============================================
  // PASSWORD STRENGTH CHECK
  // ============================================
  
  app.post('/security/check-password', async (req, reply) => {
    try {
      const body = req.body as { password: string };

      if (!body.password) {
        return reply.status(400).send({
          success: false,
          error: 'Password is required',
        });
      }

      const result = SecurityService.validatePasswordStrength(body.password);

      return {
        success: true,
        data: result,
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Password check failed',
      });
    }
  });

  // ============================================
  // IP MANAGEMENT
  // ============================================
  
  app.post('/admin/security/blacklist', { preHandler: requireAdmin }, async (req, reply) => {
    try {
      const body = req.body as { ip: string };

      if (!body.ip) {
        return reply.status(400).send({
          success: false,
          error: 'IP address is required',
        });
      }

      SecurityService.addToBlacklist(body.ip);

      return {
        success: true,
        message: `IP ${body.ip} added to blacklist`,
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to add to blacklist',
      });
    }
  });

  app.post('/admin/security/whitelist', { preHandler: requireAdmin }, async (req, reply) => {
    try {
      const body = req.body as { ip: string };

      if (!body.ip) {
        return reply.status(400).send({
          success: false,
          error: 'IP address is required',
        });
      }

      SecurityService.addToWhitelist(body.ip);

      return {
        success: true,
        message: `IP ${body.ip} added to whitelist`,
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to add to whitelist',
      });
    }
  });

  // ============================================
  // SECRETS ROTATION
  // ============================================
  
  app.post('/admin/security/rotate-secret', { preHandler: requireAdmin }, async (req, reply) => {
    try {
      const body = req.body as { secretName: string };

      if (!body.secretName) {
        return reply.status(400).send({
          success: false,
          error: 'Secret name is required',
        });
      }

      const newSecret = SecurityService.rotateSecret('current-secret');

      return {
        success: true,
        message: `Secret ${body.secretName} rotated successfully`,
        data: {
          newSecret: newSecret.substring(0, 8) + '...',
        },
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Secret rotation failed',
      });
    }
  });

  // ============================================
  // SECURITY HEADERS TEST
  // ============================================
  
  app.get('/admin/security/headers', { preHandler: requireAdmin }, async (req, reply) => {
    const headers = {
      'strict-transport-security': reply.getHeader('Strict-Transport-Security'),
      'x-frame-options': reply.getHeader('X-Frame-Options'),
      'x-content-type-options': reply.getHeader('X-Content-Type-Options'),
      'x-xss-protection': reply.getHeader('X-XSS-Protection'),
      'content-security-policy': reply.getHeader('Content-Security-Policy'),
      'referrer-policy': reply.getHeader('Referrer-Policy'),
      'permissions-policy': reply.getHeader('Permissions-Policy'),
    };

    return {
      success: true,
      data: headers,
    };
  });
}

export default securityRoutes;
