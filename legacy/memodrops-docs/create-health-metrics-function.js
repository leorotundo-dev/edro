require('dotenv').config();
const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL;

async function createHealthMetricsFunction() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('✅ Conectado ao banco');

    // 1. Criar tabela de métricas de saúde se não existir
    console.log('\n📊 Criando tabela db_health_metrics...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS db_health_metrics (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP DEFAULT NOW(),
        connections_active INTEGER,
        connections_idle INTEGER,
        connections_total INTEGER,
        database_size_mb DECIMAL(10,2),
        cache_hit_ratio DECIMAL(5,2),
        transactions_per_second DECIMAL(10,2),
        slow_queries_count INTEGER,
        locks_count INTEGER,
        deadlocks_count INTEGER,
        table_bloat_ratio DECIMAL(5,2),
        index_hit_ratio DECIMAL(5,2),
        checkpoint_write_time DECIMAL(10,2),
        buffer_alloc_per_second DECIMAL(10,2)
      );
    `);
    console.log('✅ Tabela db_health_metrics criada');

    // 2. Criar índice na timestamp
    console.log('\n📑 Criando índices...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_db_health_metrics_timestamp 
      ON db_health_metrics(timestamp DESC);
    `);
    console.log('✅ Índice criado');

    // 3. Criar função record_db_health_metrics
    console.log('\n🔧 Criando função record_db_health_metrics...');
    await client.query(`
      CREATE OR REPLACE FUNCTION record_db_health_metrics()
      RETURNS TABLE(
        connections_active INTEGER,
        connections_idle INTEGER,
        connections_total INTEGER,
        database_size_mb DECIMAL(10,2),
        cache_hit_ratio DECIMAL(5,2)
      ) AS $$
      DECLARE
        v_connections_active INTEGER;
        v_connections_idle INTEGER;
        v_connections_total INTEGER;
        v_database_size_mb DECIMAL(10,2);
        v_cache_hit_ratio DECIMAL(5,2);
      BEGIN
        -- Contar conexões ativas
        SELECT COUNT(*) INTO v_connections_active
        FROM pg_stat_activity
        WHERE state = 'active' AND pid != pg_backend_pid();
        
        -- Contar conexões idle
        SELECT COUNT(*) INTO v_connections_idle
        FROM pg_stat_activity
        WHERE state = 'idle' AND pid != pg_backend_pid();
        
        -- Total de conexões
        SELECT COUNT(*) INTO v_connections_total
        FROM pg_stat_activity
        WHERE pid != pg_backend_pid();
        
        -- Tamanho do banco em MB
        SELECT ROUND(pg_database_size(current_database()) / 1024.0 / 1024.0, 2)
        INTO v_database_size_mb;
        
        -- Cache hit ratio
        SELECT ROUND(
          (SUM(blks_hit) / NULLIF(SUM(blks_hit + blks_read), 0) * 100)::numeric, 
          2
        )
        INTO v_cache_hit_ratio
        FROM pg_stat_database
        WHERE datname = current_database();
        
        -- Inserir métricas na tabela
        INSERT INTO db_health_metrics (
          connections_active,
          connections_idle,
          connections_total,
          database_size_mb,
          cache_hit_ratio
        ) VALUES (
          v_connections_active,
          v_connections_idle,
          v_connections_total,
          v_database_size_mb,
          v_cache_hit_ratio
        );
        
        -- Retornar os valores
        RETURN QUERY SELECT 
          v_connections_active,
          v_connections_idle,
          v_connections_total,
          v_database_size_mb,
          v_cache_hit_ratio;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('✅ Função record_db_health_metrics criada');

    // 4. Criar função de limpeza automática (manter apenas 7 dias)
    console.log('\n🧹 Criando função de limpeza automática...');
    await client.query(`
      CREATE OR REPLACE FUNCTION cleanup_old_health_metrics()
      RETURNS INTEGER AS $$
      DECLARE
        deleted_count INTEGER;
      BEGIN
        DELETE FROM db_health_metrics
        WHERE timestamp < NOW() - INTERVAL '7 days';
        
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RETURN deleted_count;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('✅ Função cleanup_old_health_metrics criada');

    // 5. Criar função de diagnóstico de performance
    console.log('\n🔍 Criando função de diagnóstico...');
    await client.query(`
      CREATE OR REPLACE FUNCTION get_db_performance_report()
      RETURNS TABLE(
        metric_name TEXT,
        metric_value TEXT,
        status TEXT
      ) AS $$
      BEGIN
        RETURN QUERY
        WITH metrics AS (
          SELECT 
            'Conexões Ativas' as name,
            COUNT(*)::TEXT as value,
            CASE 
              WHEN COUNT(*) > 80 THEN '⚠️  Alta'
              WHEN COUNT(*) > 50 THEN '⚡ Média'
              ELSE '✅ Normal'
            END as status
          FROM pg_stat_activity
          WHERE state = 'active' AND pid != pg_backend_pid()
          
          UNION ALL
          
          SELECT 
            'Tamanho do Banco (MB)' as name,
            ROUND(pg_database_size(current_database()) / 1024.0 / 1024.0, 2)::TEXT as value,
            CASE 
              WHEN pg_database_size(current_database()) > 10737418240 THEN '⚠️  >10GB'
              WHEN pg_database_size(current_database()) > 1073741824 THEN '⚡ >1GB'
              ELSE '✅ OK'
            END as status
          
          UNION ALL
          
          SELECT 
            'Cache Hit Ratio (%)' as name,
            ROUND((SUM(blks_hit) / NULLIF(SUM(blks_hit + blks_read), 0) * 100)::numeric, 2)::TEXT as value,
            CASE 
              WHEN (SUM(blks_hit) / NULLIF(SUM(blks_hit + blks_read), 0) * 100) < 90 THEN '⚠️  Baixo'
              WHEN (SUM(blks_hit) / NULLIF(SUM(blks_hit + blks_read), 0) * 100) < 95 THEN '⚡ Médio'
              ELSE '✅ Ótimo'
            END as status
          FROM pg_stat_database
          WHERE datname = current_database()
          
          UNION ALL
          
          SELECT 
            'Tabelas Totais' as name,
            COUNT(*)::TEXT as value,
            '📊 Info' as status
          FROM pg_tables
          WHERE schemaname = 'public'
          
          UNION ALL
          
          SELECT 
            'Índices Totais' as name,
            COUNT(*)::TEXT as value,
            '📊 Info' as status
          FROM pg_indexes
          WHERE schemaname = 'public'
        )
        SELECT name, value, status FROM metrics;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('✅ Função get_db_performance_report criada');

    // 6. Testar as funções
    console.log('\n🧪 Testando funções...');
    
    console.log('\n📊 Coletando métricas de saúde...');
    const healthResult = await client.query('SELECT * FROM record_db_health_metrics()');
    console.log('Métricas:', healthResult.rows[0]);

    console.log('\n📈 Relatório de Performance:');
    const perfResult = await client.query('SELECT * FROM get_db_performance_report()');
    perfResult.rows.forEach(row => {
      console.log(`  ${row.status} ${row.metric_name}: ${row.metric_value}`);
    });

    // 7. Verificar histórico
    console.log('\n📜 Últimas 5 métricas coletadas:');
    const historyResult = await client.query(`
      SELECT 
        timestamp,
        connections_active,
        connections_total,
        database_size_mb,
        cache_hit_ratio
      FROM db_health_metrics
      ORDER BY timestamp DESC
      LIMIT 5
    `);
    historyResult.rows.forEach(row => {
      console.log(`  ${row.timestamp}: ${row.connections_active} ativas, ${row.database_size_mb}MB, ${row.cache_hit_ratio}% cache`);
    });

    console.log('\n🎉 Todas as funções criadas com sucesso!');
    console.log('\n📝 Funções disponíveis:');
    console.log('  - record_db_health_metrics() : Coleta e registra métricas');
    console.log('  - cleanup_old_health_metrics() : Limpa métricas antigas');
    console.log('  - get_db_performance_report() : Relatório de performance');

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createHealthMetricsFunction();