const { Client } = require('pg');

const sql = `
-- Adicionar colunas faltantes na tabela jobs
ALTER TABLE jobs 
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_attempts INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS data JSONB,
  ADD COLUMN IF NOT EXISTS result JSONB,
  ADD COLUMN IF NOT EXISTS error TEXT,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Criar índices úteis
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_priority ON jobs(priority);
CREATE INDEX IF NOT EXISTS idx_jobs_next_run ON jobs(next_run);
`;

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('🔗 Conectando ao banco...');
    await client.connect();
    
    console.log('🔧 Adicionando colunas faltantes na tabela jobs...');
    await client.query(sql);
    
    console.log('✅ Colunas adicionadas com sucesso!');
    
    console.log('\n📊 Verificando estrutura da tabela jobs:');
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'jobs' 
      ORDER BY ordinal_position
    `);
    
    columns.rows.forEach(col => {
      console.log(`  ✓ ${col.column_name} (${col.data_type})`);
    });
    
    console.log('\n🎉 TUDO CERTO! Agora reinicie o backend no Railway.');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

run();
