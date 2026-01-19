/**
 * Generate Questions Batch Job
 * 
 * Job para gerar questões em batch de forma assíncrona
 */

import { generateQuestionBatch } from '../services/ai/questionGenerator';
import { QuestionRepository } from '../repositories/questionRepository';

interface BatchGenerationParams {
  topic: string;
  discipline: string;
  examBoard: 'CESPE' | 'FCC' | 'FGV' | 'VUNESP' | 'outro';
  difficulty: 1 | 2 | 3 | 4 | 5;
  count: number;
  context?: string;
}

/**
 * Gera um batch de questões e salva no banco
 */
export async function runQuestionGenerationBatch(params: BatchGenerationParams): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('🤖 JOB: Geração de Questões em Batch');
  console.log('='.repeat(60));
  console.log(`Tópico: ${params.topic}`);
  console.log(`Disciplina: ${params.discipline}`);
  console.log(`Banca: ${params.examBoard}`);
  console.log(`Dificuldade: ${params.difficulty}/5`);
  console.log(`Quantidade: ${params.count}`);
  console.log('='.repeat(60) + '\n');

  const startTime = Date.now();
  let successCount = 0;
  let errorCount = 0;

  try {
    // Gerar questões
    console.log('📝 Gerando questões...');
    const questions = await generateQuestionBatch(
      {
        topic: params.topic,
        discipline: params.discipline,
        examBoard: params.examBoard,
        difficulty: params.difficulty,
        context: params.context,
      },
      params.count
    );

    console.log(`✅ ${questions.length}/${params.count} questões geradas\n`);

    // Salvar no banco
    console.log('💾 Salvando questões no banco...');
    for (let i = 0; i < questions.length; i++) {
      try {
        const question = questions[i];
        const id = await QuestionRepository.saveGeneratedQuestion(
          question,
          params.discipline,
          params.topic,
          params.examBoard,
          'draft' // Status inicial: draft
        );

        console.log(`  ✅ Questão ${i + 1}/${questions.length} salva: ${id}`);
        successCount++;
      } catch (error: any) {
        console.error(`  ❌ Erro ao salvar questão ${i + 1}:`, error.message);
        errorCount++;
      }
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log('\n' + '='.repeat(60));
    console.log('✅ JOB CONCLUÍDO');
    console.log('='.repeat(60));
    console.log(`Sucesso: ${successCount}/${params.count}`);
    console.log(`Erros: ${errorCount}`);
    console.log(`Tempo: ${duration}s`);
    console.log('='.repeat(60) + '\n');

  } catch (error: any) {
    console.error('\n❌ ERRO NO JOB:', error.message);
    console.error(error.stack);
    throw error;
  }
}

/**
 * Gera questões para múltiplos tópicos
 */
export async function runMultiTopicGeneration(
  topics: string[],
  discipline: string,
  examBoard: 'CESPE' | 'FCC' | 'FGV' | 'VUNESP' | 'outro',
  questionsPerTopic: number = 5
): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('🤖 JOB: Geração Multi-Tópico');
  console.log('='.repeat(60));
  console.log(`Disciplina: ${discipline}`);
  console.log(`Banca: ${examBoard}`);
  console.log(`Tópicos: ${topics.length}`);
  console.log(`Questões por tópico: ${questionsPerTopic}`);
  console.log('='.repeat(60) + '\n');

  for (let i = 0; i < topics.length; i++) {
    const topic = topics[i];
    
    console.log(`\n[${i + 1}/${topics.length}] Processando: ${topic}`);
    console.log('-'.repeat(60));

    try {
      await runQuestionGenerationBatch({
        topic,
        discipline,
        examBoard,
        difficulty: 3, // Dificuldade média por padrão
        count: questionsPerTopic,
      });
    } catch (error: any) {
      console.error(`❌ Erro no tópico "${topic}":`, error.message);
      // Continuar com próximo tópico
    }

    // Delay entre tópicos para evitar rate limit
    if (i < topics.length - 1) {
      console.log('\n⏳ Aguardando 5 segundos...\n');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ JOB MULTI-TÓPICO CONCLUÍDO');
  console.log('='.repeat(60) + '\n');
}

// ============================================
// EXECUÇÃO DIRETA (para testes)
// ============================================

if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 4) {
    console.log('Uso: ts-node generate-questions-batch.ts <topic> <discipline> <examBoard> <difficulty> [count]');
    console.log('Exemplo: ts-node generate-questions-batch.ts "Regência Verbal" "Português" "CESPE" 3 10');
    process.exit(1);
  }

  const [topic, discipline, examBoard, difficulty, count] = args;

  runQuestionGenerationBatch({
    topic,
    discipline,
    examBoard: examBoard as any,
    difficulty: parseInt(difficulty) as any,
    count: count ? parseInt(count) : 5,
  })
    .then(() => {
      console.log('✅ Job finalizado com sucesso');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Job falhou:', error);
      process.exit(1);
    });
}
