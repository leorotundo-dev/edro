import { FastifyInstance } from 'fastify';
import { BackupService } from '../services/backupService';
import { requireRoles } from '../middleware/rbac';

const requireOps = requireRoles(['ops']);

/**
 * Backup Routes
 * 
 * Endpoints para gerenciar backups do banco de dados
 */
export async function backupRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireOps);
  
  // ============================================
  // CREATE BACKUP
  // ============================================
  
  app.post('/admin/backups', async (req, reply) => {
    try {
      const body = req.body as {
        retention_days?: number;
        compression?: boolean;
        exclude_tables?: string[];
      };

      console.log('[backup] Creating manual backup...');

      const metadata = await BackupService.createBackup({
        retention_days: body.retention_days,
        compression: body.compression,
        exclude_tables: body.exclude_tables,
      });

      return {
        success: true,
        data: metadata,
        message: 'Backup created successfully',
      };
    } catch (err) {
      console.error('[backup] Error creating backup:', err);
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create backup',
      });
    }
  });

  // ============================================
  // LIST BACKUPS
  // ============================================
  
  app.get('/admin/backups', async (req, reply) => {
    try {
      const backups = await BackupService.listBackups();

      return {
        success: true,
        data: backups,
        total: backups.length,
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to list backups',
      });
    }
  });

  // ============================================
  // GET BACKUP INFO
  // ============================================
  
  app.get('/admin/backups/:filename', async (req, reply) => {
    try {
      const { filename } = req.params as { filename: string };

      const info = await BackupService.getBackupInfo(filename);

      if (!info) {
        return reply.status(404).send({
          success: false,
          error: 'Backup not found',
        });
      }

      return {
        success: true,
        data: info,
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to get backup info',
      });
    }
  });

  // ============================================
  // VERIFY BACKUP
  // ============================================
  
  app.post('/admin/backups/:filename/verify', async (req, reply) => {
    try {
      const { filename } = req.params as { filename: string };

      const verification = await BackupService.verifyBackup(filename);

      return {
        success: verification.valid,
        data: verification,
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to verify backup',
      });
    }
  });

  // ============================================
  // RESTORE BACKUP
  // ============================================
  
  app.post('/admin/backups/:filename/restore', async (req, reply) => {
    try {
      const { filename } = req.params as { filename: string };

      console.log(`[backup] Restoring backup: ${filename}`);
      console.warn('[backup] ⚠️  This will OVERWRITE the current database!');

      await BackupService.restoreBackup(filename);

      return {
        success: true,
        message: 'Backup restored successfully',
      };
    } catch (err) {
      console.error('[backup] Error restoring backup:', err);
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to restore backup',
      });
    }
  });

  // ============================================
  // CLEANUP OLD BACKUPS
  // ============================================
  
  app.post('/admin/backups/cleanup', async (req, reply) => {
    try {
      const body = req.body as { retention_days?: number };
      const retentionDays = body.retention_days || 30;

      const deletedCount = await BackupService.cleanupOldBackups(retentionDays);

      return {
        success: true,
        data: {
          deleted_count: deletedCount,
          retention_days: retentionDays,
        },
        message: `${deletedCount} old backups removed`,
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to cleanup backups',
      });
    }
  });

  // ============================================
  // BACKUP STATS
  // ============================================
  
  app.get('/admin/backups/stats', async (req, reply) => {
    try {
      const stats = await BackupService.getBackupStats();

      return {
        success: true,
        data: stats,
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to get backup stats',
      });
    }
  });

  // ============================================
  // SCHEDULED BACKUPS CONTROL
  // ============================================
  
  app.post('/admin/backups/schedule/start', async (req, reply) => {
    try {
      const body = req.body as { interval_hours?: number };
      const intervalHours = body.interval_hours || 24;

      BackupService.startScheduledBackups(intervalHours);

      return {
        success: true,
        message: `Scheduled backups started (every ${intervalHours}h)`,
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to start scheduled backups',
      });
    }
  });

  app.post('/admin/backups/schedule/stop', async (req, reply) => {
    try {
      BackupService.stopScheduledBackups();

      return {
        success: true,
        message: 'Scheduled backups stopped',
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to stop scheduled backups',
      });
    }
  });
}

export default backupRoutes;
