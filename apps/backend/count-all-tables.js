// Contar TODAS as tabelas do banco
const fs = require('fs');
const path = require('path');

// Ler .env
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  });
}

const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function countTables() {
  console.log('📊 Contando todas as tabelas do banco...\n');
  
  // Buscar TODAS as tabelas
  const result = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name
  `);
  
  console.log(`✅ TOTAL DE TABELAS: ${result.rows.length}\n`);
  console.log('📋 LISTA COMPLETA DE TABELAS:\n');
  
  // Agrupar por prefixo
  const groups = {};
  
  result.rows.forEach(row => {
    const tableName = row.table_name;
    const prefix = tableName.split('_')[0];
    
    if (!groups[prefix]) {
      groups[prefix] = [];
    }
    groups[prefix].push(tableName);
  });
  
  // Mostrar agrupado
  Object.keys(groups).sort().forEach(prefix => {
    console.log(`\n🔹 ${prefix.toUpperCase()}_ (${groups[prefix].length} tabelas):`);
    groups[prefix].forEach(table => {
      console.log(`   - ${table}`);
    });
  });
  
  console.log('\n\n📊 RESUMO POR CATEGORIA:\n');
  
  // Categorias específicas que criamos
  const categories = {
    'tracking': ['tracking_events', 'tracking_cognitive', 'tracking_emotional', 'tracking_behavioral', 'tracking_sessions'],
    'cognitive/emotional': ['cognitive_states', 'emotional_states'],
    'recco': ['recco_inputs', 'recco_states', 'recco_prioridades', 'recco_selecao', 'recco_sequencia', 'recco_reforco', 'recco_feedback', 'recco_versions', 'recco_predictions', 'recco_cognitive_flags', 'recco_emotional_flags'],
    'questoes': ['questoes', 'questoes_tags', 'questoes_estatisticas', 'questoes_versions', 'questoes_erro_map', 'questoes_similares'],
    'simulados': ['simulados', 'simulados_questoes', 'simulados_execucao', 'simulados_resultados', 'simulados_mapas', 'simulados_recomendacoes'],
    'srs': ['srs_cards', 'srs_reviews', 'srs_card_content_map', 'srs_user_intervals'],
    'progress': ['progress_diario', 'progress_semanal', 'progress_mensal', 'mastery_subtopicos', 'progress_evolucao'],
    'mnemonicos': ['mnemonicos', 'mnemonicos_usuario', 'mnemonicos_versions', 'mnemonicos_srs_map', 'mnemonicos_tracking', 'mnemonicos_disciplina', 'mnemonicos_banca'],
    'ops/logs': ['logs_api', 'logs_worker', 'logs_ia', 'ops_health', 'ops_workers', 'ops_filas', 'ops_anomalias', 'ops_alertas', 'ops_metrics', 'ops_dashboard_cache', 'ops_auditoria', 'ops_ia_models'],
    'jobs': ['job_logs', 'job_schedule']
  };
  
  const allTableNames = result.rows.map(r => r.table_name);
  
  for (const [category, expectedTables] of Object.entries(categories)) {
    const existing = expectedTables.filter(t => allTableNames.includes(t));
    const missing = expectedTables.filter(t => !allTableNames.includes(t));
    
    const percentage = Math.round((existing.length / expectedTables.length) * 100);
    
    console.log(`${category.toUpperCase()}:`);
    console.log(`  ✅ ${existing.length}/${expectedTables.length} tabelas (${percentage}%)`);
    
    if (missing.length > 0) {
      console.log(`  ❌ Faltando: ${missing.join(', ')}`);
    }
    console.log('');
  }
  
  await pool.end();
}

countTables().catch(err => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});
