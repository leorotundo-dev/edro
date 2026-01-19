/**
 * Script para aplicar o fix diretamente no banco do Railway
 * Execute: node fix-railway-direct.js
 */

const { Client } = require('pg');

// Cole a DATABASE_URL do Railway aqui:
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:tmSerwBuJUhmPmaesmLavawlXJxAZlfO@shinkansen.proxy.rlwy.net:31908/railway';

async function applyFix() {
  console.log('🚀 Conectando ao banco do Railway...');
  
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Conectado!');
    console.log('');

    // 1. Verificar migrações
    console.log('📋 Verificando migrações...');
    const migrations = await client.query('SELECT name FROM schema_migrations ORDER BY id');
    console.log(`   Migrações aplicadas: ${migrations.rows.length}`);
    migrations.rows.forEach(m => console.log(`   - ${m.name}`));
    console.log('');

    // 2. Marcar migração 0011
    console.log('📝 Marcando migração 0011...');
    await client.query(`
      INSERT INTO schema_migrations (name) 
      VALUES ('0011_jobs_system.sql') 
      ON CONFLICT DO NOTHING
    `);
    console.log('   ✅ 0011 marcada');
    console.log('');

    // 3. Criar/atualizar tabela jobs
    console.log('🔧 Criando/atualizando tabela jobs...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS jobs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255),
        type VARCHAR(100),
        status VARCHAR(50) DEFAULT 'pending',
        priority INTEGER DEFAULT 5,
        data JSONB DEFAULT '{}',
        result JSONB,
        error TEXT,
        attempts INTEGER DEFAULT 0,
        max_attempts INTEGER DEFAULT 3,
        scheduled_for TIMESTAMPTZ,
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('   ✅ Tabela jobs OK');
    console.log('');

    // 4. Adicionar coluna scheduled_for se não existir
    console.log('🔧 Adicionando coluna scheduled_for...');
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_name = 'jobs' 
          AND column_name = 'scheduled_for'
        ) THEN
          ALTER TABLE jobs ADD COLUMN scheduled_for TIMESTAMPTZ;
        END IF;
      END $$
    `);
    console.log('   ✅ Coluna scheduled_for OK');
    console.log('');

    // 5. Criar índices
    console.log('📊 Criando índices...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status)',
      'CREATE INDEX IF NOT EXISTS idx_jobs_type ON jobs(type)',
      'CREATE INDEX IF NOT EXISTS idx_jobs_priority ON jobs(priority DESC)',
      'CREATE INDEX IF NOT EXISTS idx_jobs_scheduled ON jobs(scheduled_for)',
      'CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at DESC)',
      `CREATE INDEX IF NOT EXISTS idx_jobs_queue ON jobs(status, priority DESC, created_at ASC) WHERE status = 'pending'`
    ];
    
    for (const idx of indexes) {
      await client.query(idx);
    }
    console.log('   ✅ Índices criados');
    console.log('');

    // 6. Criar job_schedule
    console.log('🔧 Criando tabela job_schedule...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS job_schedule (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL UNIQUE,
        type VARCHAR(100) NOT NULL,
        schedule VARCHAR(100) NOT NULL,
        data JSONB DEFAULT '{}',
        enabled BOOLEAN DEFAULT true,
        last_run TIMESTAMPTZ,
        next_run TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    console.log('   ✅ Tabela job_schedule OK');
    console.log('');

    // 7. Criar job_logs
    console.log('🔧 Criando tabela job_logs...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS job_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        job_id UUID,
        level VARCHAR(20) NOT NULL,
        message TEXT NOT NULL,
        data JSONB,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    console.log('   ✅ Tabela job_logs OK');
    console.log('');

    // 8. Marcar migração 0013
    console.log('📝 Marcando migração 0013...');
    await client.query(`
      INSERT INTO schema_migrations (name) 
      VALUES ('0013_fix_jobs_scheduled_for.sql') 
      ON CONFLICT DO NOTHING
    `);
    console.log('   ✅ 0013 marcada');
    console.log('');

    // Verificação final
    console.log('🔍 Verificação final...');
    const check = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'jobs' 
      AND column_name = 'scheduled_for'
    `);
    
    if (check.rows.length > 0) {
      console.log('   ✅ Coluna scheduled_for existe!');
      console.log(`   ✅ Tipo: ${check.rows[0].data_type}`);
    } else {
      console.log('   ❌ Coluna scheduled_for NÃO encontrada!');
    }

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 FIX APLICADO COM SUCESSO!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('Próximos passos:');
    console.log('1. Vá no Railway Dashboard');
    console.log('2. Clique no serviço backend');
    console.log('3. Clique em "Restart"');
    console.log('4. Verifique os logs - não deve mais ter erro de scheduled_for');
    console.log('');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error);
  } finally {
    await client.end();
  }
}

// Executar
if (DATABASE_URL === 'COLE_SUA_DATABASE_URL_AQUI') {
  console.log('❌ ERRO: Você precisa definir a DATABASE_URL!');
  console.log('');
  console.log('Opção 1: Edite este arquivo e cole a DATABASE_URL na linha 8');
  console.log('Opção 2: Execute: DATABASE_URL="sua-url-aqui" node fix-railway-direct.js');
  process.exit(1);
}

applyFix();
