// =====================================================
// Script de Teste do Motor de Recomendação
// =====================================================

import { EnxovalRecommendationService } from './EnxovalRecommendationService';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Testa o motor de recomendação com briefings reais
 */
async function testRecommendationEngine() {
  console.log('🧪 TESTE DO MOTOR DE RECOMENDAÇÃO DE ENXOVAL');
  console.log('='.repeat(60));
  console.log();
  
  // Inicializar serviço
  const service = new EnxovalRecommendationService();
  
  // Mostrar estatísticas do catálogo
  console.log('📊 Estatísticas do Catálogo:');
  const stats = service.getCatalogStats();
  console.log(JSON.stringify(stats, null, 2));
  console.log();
  console.log('='.repeat(60));
  console.log();
  
  // ========================================
  // TESTE 1: Campanha de Performance
  // ========================================
  console.log('🧪 TESTE 1: Campanha de Performance (E-commerce)');
  console.log('='.repeat(60));
  console.log();
  
  const briefing1 = {
    text: `
Briefing: Campanha Black Friday 2026 - Loja de Eletrônicos

Objetivo: Aumentar vendas online durante a Black Friday
Público-alvo: Homens e mulheres, 25-45 anos, classes A e B
Plataformas: Instagram, Facebook, Google Ads, YouTube
Budget: R$ 150.000
Prazo: Início em 01/11/2026, lançamento em 25/11/2026
KPIs: Conversões, ROAS, CTR

Mensagem: "Black Friday Imperdível - Até 70% OFF em Eletrônicos"
Tom: Urgente, promocional, direto

Requisitos:
- Formatos altamente mensuráveis
- Foco em conversão
- Variações para testes A/B
- Reaproveitamento de assets
    `.trim()
  };
  
  try {
    const recommendation1 = await service.generateRecommendation(briefing1);
    
    // Salvar resultado
    const outputPath1 = path.join(__dirname, '../test-results/recommendation-test-1.json');
    fs.mkdirSync(path.dirname(outputPath1), { recursive: true });
    fs.writeFileSync(outputPath1, JSON.stringify(recommendation1, null, 2));
    
    console.log(`✅ Resultado salvo em: ${outputPath1}`);
    console.log();
    
    // Mostrar resumo
    printRecommendationSummary(recommendation1);
    
  } catch (error) {
    console.error('❌ Erro no Teste 1:', error);
  }
  
  console.log();
  console.log('='.repeat(60));
  console.log();
  
  // ========================================
  // TESTE 2: Campanha de Branding
  // ========================================
  console.log('🧪 TESTE 2: Campanha de Branding (Awareness)');
  console.log('='.repeat(60));
  console.log();
  
  const briefing2 = {
    text: `
Briefing: Lançamento de Nova Marca de Cosméticos Sustentáveis

Objetivo: Construir awareness e posicionamento de marca
Público-alvo: Mulheres, 20-40 anos, conscientes ambientalmente
Plataformas: Instagram, TikTok, YouTube, LinkedIn
Budget: R$ 200.000
Prazo: Início em 15/02/2026, lançamento em 15/03/2026
KPIs: Alcance, Engajamento, Reconhecimento de marca

Mensagem: "Beleza que Respeita o Planeta"
Tom: Inspirador, autêntico, educativo

Requisitos:
- Conteúdo visual impactante
- Storytelling forte
- Formatos para diferentes plataformas
- Potencial viral
    `.trim()
  };
  
  try {
    const recommendation2 = await service.generateRecommendation(briefing2);
    
    // Salvar resultado
    const outputPath2 = path.join(__dirname, '../test-results/recommendation-test-2.json');
    fs.writeFileSync(outputPath2, JSON.stringify(recommendation2, null, 2));
    
    console.log(`✅ Resultado salvo em: ${outputPath2}`);
    console.log();
    
    // Mostrar resumo
    printRecommendationSummary(recommendation2);
    
  } catch (error) {
    console.error('❌ Erro no Teste 2:', error);
  }
  
  console.log();
  console.log('='.repeat(60));
  console.log();
  
  // ========================================
  // TESTE 3: Campanha com Budget Limitado
  // ========================================
  console.log('🧪 TESTE 3: Campanha com Budget Limitado');
  console.log('='.repeat(60));
  console.log();
  
  const briefing3 = {
    text: `
Briefing: Campanha Local para Restaurante

Objetivo: Aumentar visitas ao restaurante
Público-alvo: Moradores locais, 25-55 anos
Plataformas: Instagram, Facebook, Google Ads
Budget: R$ 15.000
Prazo: Início em 01/02/2026, duração de 30 dias
KPIs: Visitas ao local, Reservas, Engajamento

Mensagem: "Sabores Autênticos no Coração da Cidade"
Tom: Acolhedor, apetitoso, local

Requisitos:
- Custo-benefício
- Formatos simples de produzir
- Rápida produção
    `.trim()
  };
  
  try {
    const recommendation3 = await service.generateRecommendation(briefing3);
    
    // Salvar resultado
    const outputPath3 = path.join(__dirname, '../test-results/recommendation-test-3.json');
    fs.writeFileSync(outputPath3, JSON.stringify(recommendation3, null, 2));
    
    console.log(`✅ Resultado salvo em: ${outputPath3}`);
    console.log();
    
    // Mostrar resumo
    printRecommendationSummary(recommendation3);
    
  } catch (error) {
    console.error('❌ Erro no Teste 3:', error);
  }
  
  console.log();
  console.log('='.repeat(60));
  console.log();
  console.log('✅ TODOS OS TESTES CONCLUÍDOS!');
  console.log();
}

/**
 * Imprime resumo da recomendação
 */
function printRecommendationSummary(recommendation: any) {
  console.log('📋 RESUMO DA RECOMENDAÇÃO:');
  console.log('━'.repeat(60));
  console.log(`ID: ${recommendation.id}`);
  console.log(`Data: ${new Date(recommendation.created_at).toLocaleString('pt-BR')}`);
  console.log();
  
  console.log('📊 SUMÁRIO:');
  console.log(`   Formatos recomendados: ${recommendation.summary.total_formats}`);
  console.log(`   Custo total: R$ ${recommendation.summary.total_estimated_cost.toLocaleString('pt-BR')}`);
  console.log(`   Horas totais: ${recommendation.summary.total_estimated_hours}h`);
  console.log(`   Prazo: ${recommendation.summary.total_estimated_days} dias`);
  console.log(`   Avg ML Score: ${recommendation.summary.avg_ml_performance_score}/100`);
  console.log(`   Avg Measurability: ${recommendation.summary.avg_measurability_score}/100`);
  console.log(`   Avg Recommendation: ${recommendation.summary.avg_recommendation_score}/100`);
  console.log();
  
  console.log('🎯 COBERTURA:');
  console.log(`   Plataformas: ${recommendation.summary.coverage.platforms.join(', ')}`);
  console.log(`   Tipos de produção: ${recommendation.summary.coverage.production_types.join(', ')}`);
  console.log(`   Estágios de funil: ${recommendation.summary.coverage.funnel_stages.join(', ')}`);
  console.log();
  
  if (recommendation.warnings.length > 0) {
    console.log('⚠️  WARNINGS:');
    recommendation.warnings.forEach((w: string) => console.log(`   ${w}`));
    console.log();
  }
  
  if (recommendation.suggestions.length > 0) {
    console.log('💡 SUGGESTIONS:');
    recommendation.suggestions.forEach((s: string) => console.log(`   ${s}`));
    console.log();
  }
  
  console.log('🎁 TOP 5 FORMATOS:');
  recommendation.recommended_formats.slice(0, 5).forEach((format: any, index: number) => {
    console.log(`   ${index + 1}. ${format.format_name} (${format.platform})`);
    console.log(`      Score: ${format.recommendation_score}/100 | Priority: ${format.priority}`);
    console.log(`      Qty: ${format.quantity} | Cost: R$ ${format.estimated_cost_total.toLocaleString('pt-BR')}`);
    console.log(`      Reasons: ${format.recommendation_reasons[0]}`);
    console.log();
  });
  
  console.log('⏱️  PERFORMANCE:');
  recommendation.processing_log.forEach((log: any) => {
    console.log(`   ${log.phase}: ${log.duration_ms}ms`);
  });
  console.log();
}

// Executar testes
testRecommendationEngine().catch(console.error);
