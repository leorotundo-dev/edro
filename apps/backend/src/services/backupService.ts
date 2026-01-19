/**
 * Backup Service
 * 
 * Sistema de backup automático do banco de dados
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { query } from '../db';

const execAsync = promisify(exec);

// ============================================
// TIPOS
// ============================================

export interface BackupMetadata {
  id: string;
  filename: string;
  size_bytes: number;
  tables_count: number;
  rows_count: number;
  duration_ms: number;
  status: 'success' | 'failed';
  error?: string;
  created_at: Date;
}

export interface BackupConfig {
  retention_days: number;
  max_backups: number;
  backup_dir: string;
  compression: boolean;
  include_tables?: string[];
  exclude_tables?: string[];
}

// ============================================
// CONFIGURAÇÃO
// ============================================

const DEFAULT_CONFIG: BackupConfig = {
  retention_days: 30,
  max_backups: 100,
  backup_dir: process.env.BACKUP_DIR || './backups',
  compression: true,
  exclude_tables: ['rate_limits', 'job_logs'],
};

// ============================================
// BACKUP CREATION
// ============================================

export async function createBackup(config: Partial<BackupConfig> = {}): Promise<BackupMetadata> {
  const startTime = Date.now();
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  console.log('[backup] 📦 Iniciando backup do banco de dados...');

  try {
    // Criar diretório se não existe
    if (!fs.existsSync(finalConfig.backup_dir)) {
      fs.mkdirSync(finalConfig.backup_dir, { recursive: true });
    }

    // Nome do arquivo
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `backup-${timestamp}-${Date.now()}.sql${finalConfig.compression ? '.gz' : ''}`;
    const filepath = path.join(finalConfig.backup_dir, filename);

    // Executar pg_dump
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL not configured');
    }

    // Parse database URL
    const dbUrl = new URL(databaseUrl);
    const dbName = dbUrl.pathname.slice(1);
    const host = dbUrl.hostname;
    const port = dbUrl.port || '5432';
    const user = dbUrl.username;
    const password = dbUrl.password;

    // Construir comando pg_dump
    let command = `PGPASSWORD="${password}" pg_dump -h ${host} -p ${port} -U ${user} -d ${dbName} -F p`;

    // Adicionar filtros de tabelas
    if (finalConfig.exclude_tables && finalConfig.exclude_tables.length > 0) {
      finalConfig.exclude_tables.forEach(table => {
        command += ` --exclude-table=${table}`;
      });
    }

    if (finalConfig.include_tables && finalConfig.include_tables.length > 0) {
      finalConfig.include_tables.forEach(table => {
        command += ` --table=${table}`;
      });
    }

    // Adicionar compressão
    if (finalConfig.compression) {
      command += ` | gzip > "${filepath}"`;
    } else {
      command += ` > "${filepath}"`;
    }

    console.log('[backup] Executando pg_dump...');
    await execAsync(command);

    // Verificar arquivo criado
    if (!fs.existsSync(filepath)) {
      throw new Error('Backup file not created');
    }

    // Obter informações do backup
    const stats = fs.statSync(filepath);
    const sizeBytes = stats.size;

    // Contar tabelas e linhas
    const { tablesCount, rowsCount } = await getBackupStats();

    const duration = Date.now() - startTime;

    const metadata: BackupMetadata = {
      id: `backup-${Date.now()}`,
      filename,
      size_bytes: sizeBytes,
      tables_count: tablesCount,
      rows_count: rowsCount,
      duration_ms: duration,
      status: 'success',
      created_at: new Date(),
    };

    // Salvar metadata
    await saveBackupMetadata(metadata);

    console.log('[backup] ✅ Backup criado com sucesso!');
    console.log(`[backup] Arquivo: ${filename}`);
    console.log(`[backup] Tamanho: ${(sizeBytes / 1024 / 1024).toFixed(2)} MB`);
    console.log(`[backup] Duração: ${duration}ms`);

    return metadata;
  } catch (err) {
    const duration = Date.now() - startTime;
    const error = err instanceof Error ? err.message : 'Unknown error';

    console.error('[backup] ❌ Erro ao criar backup:', error);

    const metadata: BackupMetadata = {
      id: `backup-${Date.now()}`,
      filename: 'failed',
      size_bytes: 0,
      tables_count: 0,
      rows_count: 0,
      duration_ms: duration,
      status: 'failed',
      error,
      created_at: new Date(),
    };

    await saveBackupMetadata(metadata);

    throw err;
  }
}

// ============================================
// RESTORE
// ============================================

export async function restoreBackup(filename: string): Promise<void> {
  console.log(`[backup] 🔄 Restaurando backup: ${filename}`);

  const config = DEFAULT_CONFIG;
  const filepath = path.join(config.backup_dir, filename);

  if (!fs.existsSync(filepath)) {
    throw new Error(`Backup file not found: ${filename}`);
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL not configured');
  }

  // Parse database URL
  const dbUrl = new URL(databaseUrl);
  const dbName = dbUrl.pathname.slice(1);
  const host = dbUrl.hostname;
  const port = dbUrl.port || '5432';
  const user = dbUrl.username;
  const password = dbUrl.password;

  // Construir comando
  let command: string;

  if (filepath.endsWith('.gz')) {
    command = `gunzip -c "${filepath}" | PGPASSWORD="${password}" psql -h ${host} -p ${port} -U ${user} -d ${dbName}`;
  } else {
    command = `PGPASSWORD="${password}" psql -h ${host} -p ${port} -U ${user} -d ${dbName} < "${filepath}"`;
  }

  try {
    await execAsync(command);
    console.log('[backup] ✅ Backup restaurado com sucesso!');
  } catch (err) {
    console.error('[backup] ❌ Erro ao restaurar backup:', err);
    throw err;
  }
}

// ============================================
// CLEANUP
// ============================================

export async function cleanupOldBackups(retentionDays: number = 30): Promise<number> {
  console.log(`[backup] 🧹 Limpando backups antigos (> ${retentionDays} dias)...`);

  const config = DEFAULT_CONFIG;
  let deletedCount = 0;

  try {
    if (!fs.existsSync(config.backup_dir)) {
      return 0;
    }

    const files = fs.readdirSync(config.backup_dir);
    const now = Date.now();
    const maxAge = retentionDays * 24 * 60 * 60 * 1000;

    for (const file of files) {
      if (!file.startsWith('backup-')) continue;

      const filepath = path.join(config.backup_dir, file);
      const stat = fs.statSync(filepath);
      const age = now - stat.mtime.getTime();

      if (age > maxAge) {
        fs.unlinkSync(filepath);
        deletedCount++;
        console.log(`[backup] Deleted old backup: ${file}`);
      }
    }

    // Limpar metadata antigos
    await query(`
      DELETE FROM backup_metadata
      WHERE created_at < NOW() - INTERVAL '${retentionDays} days'
    `);

    console.log(`[backup] ✅ ${deletedCount} backups antigos removidos`);

    return deletedCount;
  } catch (err) {
    console.error('[backup] Erro ao limpar backups:', err);
    throw err;
  }
}

// ============================================
// LIST & INFO
// ============================================

export async function listBackups(): Promise<BackupMetadata[]> {
  const { rows } = await query<BackupMetadata>(`
    SELECT * FROM backup_metadata
    ORDER BY created_at DESC
    LIMIT 100
  `);

  return rows;
}

export async function getBackupInfo(filename: string): Promise<BackupMetadata | null> {
  const { rows } = await query<BackupMetadata>(`
    SELECT * FROM backup_metadata
    WHERE filename = $1
  `, [filename]);

  return rows[0] || null;
}

export async function getBackupStats(): Promise<{
  tablesCount: number;
  rowsCount: number;
}> {
  try {
    // Contar tabelas
    const { rows: tables } = await query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `);

    const tablesCount = parseInt(tables[0].count);

    // Contar linhas (aproximado)
    const { rows: tableNames } = await query(`
      SELECT tablename
      FROM pg_catalog.pg_tables
      WHERE schemaname = 'public'
    `);

    let totalRows = 0;

    for (const table of tableNames) {
      try {
        const { rows } = await query(`
          SELECT COUNT(*) as count FROM ${table.tablename}
        `);
        totalRows += parseInt(rows[0].count);
      } catch (err) {
        // Ignore errors for individual tables
        console.warn(`[backup] Could not count rows in ${table.tablename}`);
      }
    }

    return {
      tablesCount,
      rowsCount: totalRows,
    };
  } catch (err) {
    console.error('[backup] Error getting backup stats:', err);
    return {
      tablesCount: 0,
      rowsCount: 0,
    };
  }
}

// ============================================
// METADATA MANAGEMENT
// ============================================

async function saveBackupMetadata(metadata: BackupMetadata): Promise<void> {
  await query(`
    INSERT INTO backup_metadata (
      id, filename, size_bytes, tables_count, rows_count,
      duration_ms, status, error, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  `, [
    metadata.id,
    metadata.filename,
    metadata.size_bytes,
    metadata.tables_count,
    metadata.rows_count,
    metadata.duration_ms,
    metadata.status,
    metadata.error,
    metadata.created_at,
  ]);
}

// ============================================
// SCHEDULED BACKUPS
// ============================================

let backupScheduleInterval: NodeJS.Timeout | null = null;

export function startScheduledBackups(intervalHours: number = 24) {
  if (backupScheduleInterval) {
    console.log('[backup] Scheduled backups already running');
    return;
  }

  console.log(`[backup] 📅 Iniciando backups agendados (a cada ${intervalHours}h)`);

  // Executar backup inicial
  createBackup().catch(err => {
    console.error('[backup] Initial backup failed:', err);
  });

  // Agendar backups periódicos
  const intervalMs = intervalHours * 60 * 60 * 1000;

  backupScheduleInterval = setInterval(async () => {
    try {
      await createBackup();
      
      // Limpar backups antigos
      await cleanupOldBackups();
    } catch (err) {
      console.error('[backup] Scheduled backup failed:', err);
    }
  }, intervalMs);
}

export function stopScheduledBackups() {
  if (backupScheduleInterval) {
    clearInterval(backupScheduleInterval);
    backupScheduleInterval = null;
    console.log('[backup] Scheduled backups stopped');
  }
}

// ============================================
// VERIFICATION
// ============================================

export async function verifyBackup(filename: string): Promise<{
  valid: boolean;
  error?: string;
  size_mb: number;
}> {
  console.log(`[backup] 🔍 Verificando backup: ${filename}`);

  const config = DEFAULT_CONFIG;
  const filepath = path.join(config.backup_dir, filename);

  try {
    // Verificar se arquivo existe
    if (!fs.existsSync(filepath)) {
      return {
        valid: false,
        error: 'File not found',
        size_mb: 0,
      };
    }

    // Verificar tamanho
    const stats = fs.statSync(filepath);
    const sizeMb = stats.size / 1024 / 1024;

    if (sizeMb < 0.1) {
      return {
        valid: false,
        error: 'File too small (< 0.1 MB)',
        size_mb: sizeMb,
      };
    }

    // Verificar integridade (se comprimido)
    if (filepath.endsWith('.gz')) {
      try {
        await execAsync(`gunzip -t "${filepath}"`);
      } catch (err) {
        return {
          valid: false,
          error: 'Corrupted gzip file',
          size_mb: sizeMb,
        };
      }
    }

    return {
      valid: true,
      size_mb: sizeMb,
    };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      size_mb: 0,
    };
  }
}

// ============================================
// EXPORTAÇÃO
// ============================================

export const BackupService = {
  createBackup,
  restoreBackup,
  cleanupOldBackups,
  listBackups,
  getBackupInfo,
  getBackupStats,
  startScheduledBackups,
  stopScheduledBackups,
  verifyBackup,
};

export default BackupService;
