/**
 * Script de Teste do ReccoEngine V3
 * 
 * Executa testes básicos para validar a implementação
 */

import { ReccoEngine } from './src/services/reccoEngine';
import { query } from './src/db';

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 TESTE DO RECCOENGINE V3');
  console.log('='.repeat(60) + '\n');

  try {
    // ============================================
    // TESTE 1: Verificar Conexão com Banco
    // ============================================
    console.log('📊 TESTE 1: Conexão com Banco');
    console.log('-'.repeat(60));

    try {
      const result = await query('SELECT NOW() as now');
      console.log('✅ Banco conectado:', result.rows[0].now);
    } catch (error: any) {
      console.error('❌ Erro ao conectar no banco:', error.message);
      console.log('\n⚠️  Verifique seu .env e DATABASE_URL');
      process.exit(1);
    }

    // ============================================
    // TESTE 2: Verificar se Tabelas Existem
    // ============================================
    console.log('\n📋 TESTE 2: Verificar Tabelas do ReccoEngine');
    console.log('-'.repeat(60));

    const tables = [
      'recco_inputs',
      'recco_states',
      'recco_prioridades',
      'recco_selecao',
      'recco_sequencia',
      'recco_reforco',
      'recco_feedback',
      'recco_versions',
      'recco_predictions',
      'recco_cognitive_flags',
      'recco_emotional_flags'
    ];

    for (const table of tables) {
      try {
        const result = await query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          )
        `, [table]);

        if (result.rows[0].exists) {
          console.log(`✅ ${table}`);
        } else {
          console.log(`❌ ${table} - NÃO ENCONTRADA`);
          console.log(`\n⚠️  Execute: npm run db:migrate\n`);
          process.exit(1);
        }
      } catch (error: any) {
        console.error(`❌ Erro ao verificar ${table}:`, error.message);
        process.exit(1);
      }
    }

    // ============================================
    // TESTE 3: Buscar/Criar Usuário de Teste
    // ============================================
    console.log('\n👤 TESTE 3: Buscar Usuário de Teste');
    console.log('-'.repeat(60));

    let testUserId: string;

    try {
      // Tentar buscar usuário existente
      const userResult = await query('SELECT id FROM users LIMIT 1');
      
      if (userResult.rows.length > 0) {
        testUserId = userResult.rows[0].id;
        console.log(`✅ Usuário encontrado: ${testUserId}`);
      } else {
        // Criar usuário de teste
        console.log('⏳ Criando usuário de teste...');
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash('teste123', 10);
        
        const newUserResult = await query(`
          INSERT INTO users (email, password_hash, name)
          VALUES ($1, $2, $3)
          RETURNING id
        `, ['teste@edro.digital', hashedPassword, 'Usuário Teste']);
        
        testUserId = newUserResult.rows[0].id;
        console.log(`✅ Usuário criado: ${testUserId}`);
      }
    } catch (error: any) {
      console.error('❌ Erro ao buscar/criar usuário:', error.message);
      process.exit(1);
    }

    // ============================================
    // TESTE 4: Diagnóstico
    // ============================================
    console.log('\n🔬 TESTE 4: Executar Diagnóstico');
    console.log('-'.repeat(60));

    try {
      const diagnosis = await ReccoEngine.diagnoseUser(testUserId);
      
      console.log('✅ Diagnóstico executado com sucesso!');
      console.log('\nResultados:');
      console.log(`  Estado Cognitivo: ${diagnosis.estado_cognitivo}`);
      console.log(`  Estado Emocional: ${diagnosis.estado_emocional}`);
      console.log(`  Estado Pedagógico: ${diagnosis.estado_pedagogico}`);
      console.log(`  Prob. Acerto: ${(diagnosis.prob_acerto * 100).toFixed(1)}%`);
      console.log(`  Prob. Retenção: ${(diagnosis.prob_retencao * 100).toFixed(1)}%`);
      console.log(`  Prob. Saturação: ${(diagnosis.prob_saturacao * 100).toFixed(1)}%`);
      console.log(`  Tempo Ótimo: ${diagnosis.tempo_otimo_estudo} min`);
    } catch (error: any) {
      console.error('❌ Erro ao executar diagnóstico:', error.message);
      console.error(error.stack);
      process.exit(1);
    }

    // ============================================
    // TESTE 5: Gerar Trilha Diária
    // ============================================
    console.log('\n🎯 TESTE 5: Gerar Trilha Diária');
    console.log('-'.repeat(60));

    try {
      console.log('⏳ Gerando trilha do dia...');
      
      const trail = await ReccoEngine.generateDailyTrail(testUserId);
      
      console.log('✅ Trilha gerada com sucesso!');
      console.log(`\n  ${trail.items.length} itens para estudar`);
      console.log(`  Duração total: ${trail.total_duration_minutes} min`);
      console.log(`  Curva de dificuldade: ${trail.difficulty_curve}`);
      
      if (trail.items.length > 0) {
        console.log('\n  Primeiros 3 itens:');
        trail.items.slice(0, 3).forEach((item, i) => {
          console.log(`    ${i + 1}. ${item.type} (${item.duration_minutes} min, dif: ${item.difficulty})`);
        });
      }
    } catch (error: any) {
      console.error('❌ Erro ao gerar trilha:', error.message);
      console.error(error.stack);
      process.exit(1);
    }

    // ============================================
    // TESTE 6: Motor Completo
    // ============================================
    console.log('\n⚙️  TESTE 6: Motor Completo');
    console.log('-'.repeat(60));

    try {
      console.log('⏳ Executando motor completo...');
      
      const startTime = Date.now();
      const result = await ReccoEngine.run({
        userId: testUserId,
        tempoDisponivel: 45
      });
      const endTime = Date.now();
      
      console.log('✅ Motor executado com sucesso!');
      console.log(`\n  Tempo de processamento: ${endTime - startTime}ms`);
      console.log(`  Itens gerados: ${result.trail.items.length}`);
      console.log(`  Duração total: ${result.trail.total_duration_minutes} min`);
      console.log(`  Estado cognitivo: ${result.diagnosis.estado_cognitivo}`);
      console.log(`  Estado emocional: ${result.diagnosis.estado_emocional}`);
    } catch (error: any) {
      console.error('❌ Erro ao executar motor:', error.message);
      console.error(error.stack);
      process.exit(1);
    }

    // ============================================
    // SUCESSO!
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('🎉 TODOS OS TESTES PASSARAM!');
    console.log('='.repeat(60));
    console.log('\n✅ ReccoEngine V3 está funcionando perfeitamente!\n');
    
    process.exit(0);

  } catch (error: any) {
    console.error('\n❌ ERRO GERAL:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Executar testes
main();
