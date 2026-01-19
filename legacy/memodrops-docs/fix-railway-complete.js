require('dotenv').config();
const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL não encontrada no .env');
  process.exit(1);
}

async function applyFix() {
  const client = new Client({ connectionString });

  try {
    console.log('🚀 Conectando ao banco do Railway...');
    await client.connect();
    console.log('✅ Conectado!');

    // 1. Verificar migrações
    console.log('\n📋 Verificando migrações...');
    const migrations = await client.query(
      'SELECT migration_name FROM schema_migrations ORDER BY applied_at'
    );
    console.log(`Migrações aplicadas: ${migrations.rows.length}`);
    migrations.rows.forEach(row => console.log(`- ${row.migration_name}`));

    // 2. Marcar 0011 se não estiver marcada
    const has0011 = migrations.rows.some(r => r.migration_name === '0011_jobs_system.sql');
    if (!has0011) {
      console.log('\n📝 Marcando migração 0011...');
      await client.query(
        "INSERT INTO schema_migrations (migration_name) VALUES ('0011_jobs_system.sql')"
      );
      console.log('✅ 0011 marcada');
    }

    // 3. Verificar estrutura atual da tabela jobs
    console.log('\n🔍 Verificando estrutura da tabela jobs...');
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'jobs'
      );
    `);

    if (!tableExists.rows[0].exists) {
      console.log('📝 Criando tabela jobs completa...');
      await client.query(`
        CREATE TABLE jobs (
          id SERIAL PRIMARY KEY,
          type VARCHAR(50) NOT NULL,
          status VARCHAR(20) DEFAULT 'pending',
          payload JSONB,
          result JSONB,
          error TEXT,
          attempts INTEGER DEFAULT 0,
          max_attempts INTEGER DEFAULT 3,
          scheduled_for TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          started_at TIMESTAMP,
          completed_at TIMESTAMP
        );
      `);
      console.log('✅ Tabela jobs criada');
    } else {
      // Verificar colunas existentes
      const columns = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'jobs'
        ORDER BY ordinal_position;
      `);
      
      console.log('Colunas existentes:');
      columns.rows.forEach(col => console.log(`  - ${col.column_name} (${col.data_type})`));

      const columnNames = columns.rows.map(c => c.column_name);

      // Adicionar colunas faltantes uma por uma
      const requiredColumns = [
        { name: 'type', sql: "ALTER TABLE jobs ADD COLUMN type VARCHAR(50) NOT NULL DEFAULT 'unknown';" },
        { name: 'status', sql: "ALTER TABLE jobs ADD COLUMN status VARCHAR(20) DEFAULT 'pending';" },
        { name: 'payload', sql: "ALTER TABLE jobs ADD COLUMN payload JSONB;" },
        { name: 'result', sql: "ALTER TABLE jobs ADD COLUMN result JSONB;" },
        { name: 'error', sql: "ALTER TABLE jobs ADD COLUMN error TEXT;" },
        { name: 'attempts', sql: "ALTER TABLE jobs ADD COLUMN attempts INTEGER DEFAULT 0;" },
        { name: 'max_attempts', sql: "ALTER TABLE jobs ADD COLUMN max_attempts INTEGER DEFAULT 3;" },
        { name: 'scheduled_for', sql: "ALTER TABLE jobs ADD COLUMN scheduled_for TIMESTAMP;" },
        { name: 'created_at', sql: "ALTER TABLE jobs ADD COLUMN created_at TIMESTAMP DEFAULT NOW();" },
        { name: 'updated_at', sql: "ALTER TABLE jobs ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();" },
        { name: 'started_at', sql: "ALTER TABLE jobs ADD COLUMN started_at TIMESTAMP;" },
        { name: 'completed_at', sql: "ALTER TABLE jobs ADD COLUMN completed_at TIMESTAMP;" }
      ];

      for (const col of requiredColumns) {
        if (!columnNames.includes(col.name)) {
          console.log(`\n🔧 Adicionando coluna ${col.name}...`);
          try {
            await client.query(col.sql);
            console.log(`✅ Coluna ${col.name} adicionada`);
          } catch (err) {
            console.log(`⚠️  Erro ao adicionar ${col.name}: ${err.message}`);
          }
        }
      }
    }

    // 4. Criar índices
    console.log('\n📊 Criando índices...');
    
    const indexes = [
      { name: 'idx_jobs_type', sql: 'CREATE INDEX IF NOT EXISTS idx_jobs_type ON jobs(type);' },
      { name: 'idx_jobs_status', sql: 'CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);' },
      { name: 'idx_jobs_scheduled', sql: 'CREATE INDEX IF NOT EXISTS idx_jobs_scheduled ON jobs(scheduled_for) WHERE scheduled_for IS NOT NULL;' },
      { name: 'idx_jobs_created', sql: 'CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at);' }
    ];

    for (const idx of indexes) {
      try {
        await client.query(idx.sql);
        console.log(`✅ ${idx.name} OK`);
      } catch (err) {
        console.log(`⚠️  ${idx.name} erro: ${err.message}`);
      }
    }

    // 5. Verificar função update_updated_at
    console.log('\n🔧 Verificando função update_updated_at...');
    const functionExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM pg_proc 
        WHERE proname = 'update_updated_at'
      );
    `);

    if (!functionExists.rows[0].exists) {
      console.log('📝 Criando função update_updated_at...');
      await client.query(`
        CREATE OR REPLACE FUNCTION update_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);
      console.log('✅ Função criada');
    } else {
      console.log('✅ Função já existe');
    }

    // 6. Criar trigger
    console.log('\n🔧 Criando trigger...');
    await client.query('DROP TRIGGER IF EXISTS jobs_updated_at ON jobs;');
    await client.query(`
      CREATE TRIGGER jobs_updated_at
      BEFORE UPDATE ON jobs
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at();
    `);
    console.log('✅ Trigger OK');

    // 7. Verificar estrutura final
    console.log('\n✅ ESTRUTURA FINAL DA TABELA JOBS:');
    const finalColumns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'jobs'
      ORDER BY ordinal_position;
    `);
    
    finalColumns.rows.forEach(col => {
      const nullable = col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL';
      const defaultVal = col.column_default ? `DEFAULT ${col.column_default}` : '';
      console.log(`  - ${col.column_name}: ${col.data_type} ${nullable} ${defaultVal}`);
    });

    console.log('\n🎉 FIX APLICADO COM SUCESSO!');
    console.log('\n📝 Próximos passos:');
    console.log('   1. railway restart');
    console.log('   2. Verificar logs: railway logs');

  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyFix();