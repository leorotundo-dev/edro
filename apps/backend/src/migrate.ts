import { pool } from './db/db';
import * as fs from 'fs';
import * as path from 'path';

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      run_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function getAppliedMigrations(): Promise<Set<string>> {
  const result = await pool.query<{ name: string }>(
    'SELECT name FROM schema_migrations ORDER BY id ASC'
  );
  return new Set(result.rows.map((r) => r.name));
}

export async function runMigrations() {
  try {
    console.log('🔄 Executando migrações do banco de dados...');
    console.log(`📂 __dirname: ${__dirname}`);
    
    await ensureMigrationsTable();

    const migrationsDir = path.join(__dirname, 'db/migrations');
    console.log(`📂 Procurando migrações em: ${migrationsDir}`);
    
    if (!fs.existsSync(migrationsDir)) {
      console.log('⚠️  Pasta de migrações não encontrada!');
      console.log(`📂 Tentando caminhos alternativos...`);
      
      // Tentar outros caminhos possíveis
      const alternativePaths = [
        path.join(process.cwd(), 'src/db/migrations'),
        path.join(process.cwd(), 'apps/backend/src/db/migrations'),
        path.join(__dirname, '../db/migrations'),
        path.join(__dirname, '../../db/migrations')
      ];
      
      let found = false;
      for (const altPath of alternativePaths) {
        console.log(`   Tentando: ${altPath}`);
        if (fs.existsSync(altPath)) {
          console.log(`   ✅ Encontrado!`);
          // Usar este caminho
          return await executeMigrationsFromPath(altPath);
        }
      }
      
      console.log('❌ Nenhuma pasta de migrações encontrada!');
      return;
    }
    
    return await executeMigrationsFromPath(migrationsDir);
  } catch (error: any) {
    console.error('❌ Erro ao executar migrações:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  }
}

async function executeMigrationsFromPath(migrationsDir: string) {
    console.log(`📁 Lendo arquivos de: ${migrationsDir}`);
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    console.log(`📄 Arquivos encontrados: ${files.length}`);
    files.forEach(f => console.log(`   - ${f}`));

    const applied = await getAppliedMigrations();
    console.log(`✅ Migrações já aplicadas: ${applied.size}`);
    let newMigrations = 0;
    const failedMigrations: string[] = [];

    for (const file of files) {
      if (applied.has(file)) {
        continue;
      }

      const fullPath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(fullPath, 'utf-8');

      console.log(`🔄 Executando migração ${file}...`);
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (name) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        console.log(`✅ Migração ${file} aplicada com sucesso!`);
        newMigrations++;
      } catch (err: any) {
        await client.query('ROLLBACK').catch(() => {});
        console.error(`⚠️  Migração ${file} falhou (continuando com as próximas):`, err.message);
        failedMigrations.push(file);
      } finally {
        client.release();
      }
    }

    if (failedMigrations.length > 0) {
      console.error(`⚠️  ${failedMigrations.length} migração(ões) falharam: ${failedMigrations.join(', ')}`);
    }
    if (newMigrations > 0) {
      console.log(`✅ ${newMigrations} nova(s) migração(ões) aplicada(s) com sucesso!`);
    } else if (failedMigrations.length === 0) {
      console.log('✅ Todas as migrações já estão aplicadas!');
    }
}
