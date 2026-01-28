// =====================================================
// Exemplo de Uso do Motor de Recomendação
// =====================================================

import { EnxovalRecommendationService } from './EnxovalRecommendationService';

/**
 * Exemplo simples de uso do motor
 */
async function exampleUsage() {
  console.log('🎯 EXEMPLO DE USO DO MOTOR DE RECOMENDAÇÃO\n');
  
  // 1. Inicializar o serviço
  console.log('1️⃣ Inicializando serviço...');
  const service = new EnxovalRecommendationService();
  console.log('✅ Serviço inicializado!\n');
  
  // 2. Preparar briefing
  console.log('2️⃣ Preparando briefing...');
  const briefing = {
    text: `
Briefing: Campanha de Lançamento de Produto

Produto: Novo smartphone premium
Objetivo: Gerar awareness e pré-vendas
Público-alvo: Jovens adultos, 20-35 anos, tech-savvy
Plataformas: Instagram, TikTok, YouTube
Budget: R$ 80.000
Prazo: Lançamento em 15/03/2026
KPIs: Alcance, Engajamento, Pré-vendas

Mensagem: "O Futuro nas Suas Mãos"
Tom: Moderno, inovador, aspiracional

Requisitos:
- Conteúdo visual impactante
- Formatos para diferentes plataformas
- Foco em engajamento
    `.trim()
  };
  console.log('✅ Briefing preparado!\n');
  
  // 3. Gerar recomendação
  console.log('3️⃣ Gerando recomendação...\n');
  console.log('='.repeat(60));
  
  try {
    const recommendation = await service.generateRecommendation(briefing);
    
    console.log('='.repeat(60));
    console.log('\n✅ RECOMENDAÇÃO GERADA COM SUCESSO!\n');
    
    // 4. Exibir resultados
    console.log('4️⃣ Resultados:\n');
    
    console.log('📊 RESUMO:');
    console.log(`   • Formatos recomendados: ${recommendation.summary.total_formats}`);
    console.log(`   • Custo total estimado: R$ ${recommendation.summary.total_estimated_cost.toLocaleString('pt-BR')}`);
    console.log(`   • Horas totais: ${recommendation.summary.total_estimated_hours}h`);
    console.log(`   • Prazo estimado: ${recommendation.summary.total_estimated_days} dias`);
    console.log(`   • Score médio: ${recommendation.summary.avg_recommendation_score}/100`);
    console.log();
    
    console.log('🎯 COBERTURA:');
    console.log(`   • Plataformas: ${recommendation.summary.coverage.platforms.join(', ')}`);
    console.log(`   • Tipos: ${recommendation.summary.coverage.production_types.join(', ')}`);
    console.log();
    
    if (recommendation.warnings.length > 0) {
      console.log('⚠️  AVISOS:');
      recommendation.warnings.forEach(w => console.log(`   ${w}`));
      console.log();
    }
    
    if (recommendation.suggestions.length > 0) {
      console.log('💡 SUGESTÕES:');
      recommendation.suggestions.forEach(s => console.log(`   ${s}`));
      console.log();
    }
    
    console.log('🏆 TOP 10 FORMATOS RECOMENDADOS:\n');
    recommendation.recommended_formats.slice(0, 10).forEach((format: any, index: number) => {
      console.log(`${index + 1}. ${format.format_name} (${format.platform})`);
      console.log(`   Score: ${format.recommendation_score}/100 | Prioridade: ${format.priority}`);
      console.log(`   Quantidade: ${format.quantity} | Custo: R$ ${format.estimated_cost_total.toLocaleString('pt-BR')}`);
      console.log(`   Entrega: ${format.estimated_delivery_date}`);
      console.log(`   Razão: ${format.recommendation_reasons[0]}`);
      console.log();
    });
    
    console.log('⏱️  PERFORMANCE:');
    const totalTime = recommendation.processing_log.reduce((sum: number, log: any) => sum + log.duration_ms, 0);
    console.log(`   • Tempo total: ${totalTime}ms`);
    recommendation.processing_log.forEach((log: any) => {
      console.log(`   • ${log.phase}: ${log.duration_ms}ms`);
    });
    console.log();
    
    console.log('✅ EXEMPLO CONCLUÍDO COM SUCESSO!');
    
  } catch (error: any) {
    console.error('\n❌ ERRO:', error.message);
    console.error(error);
  }
}

// Executar exemplo
exampleUsage().catch(console.error);
