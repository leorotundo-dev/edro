import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

async function migrate() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('🔄 Aplicando schema do Stage 3...');
    
    const schema = readFileSync(join(__dirname, 'schema.stage3.sql'), 'utf-8');
    
    await pool.query(schema);
    
    console.log('✅ Schema do Stage 3 aplicado com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao aplicar schema:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
