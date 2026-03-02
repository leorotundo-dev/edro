// =====================================================
// EnxovalRecommendationService
// =====================================================
// Orquestrador principal do motor de recomendação
// =====================================================

import { BriefingAnalyzer, ExtractedParameters } from './BriefingAnalyzer';
import { FormatFilter } from './FormatFilter';
import { FormatScorer } from './FormatScorer';
import { EnxovalGenerator, GeneratedEnxoval } from './EnxovalGenerator';
import type { ProductionFormat } from './types';
import { loadRecommendationCatalog } from './catalogAdapter';

interface BriefingInput {
  text: string;
  structured?: Partial<ExtractedParameters>;
  client_id?: string;
  tenant_id?: string | null;
}

interface EnxovalRecommendation extends GeneratedEnxoval {
  id: string;
  briefing: {
    original_text: string;
    extracted_parameters: ExtractedParameters;
  };
  warnings: string[];
  suggestions: string[];
  processing_log: {
    phase: string;
    duration_ms: number;
    details: any;
  }[];
  created_at: string;
}

export class EnxovalRecommendationService {
  private catalog: ProductionFormat[];
  private briefingAnalyzer: BriefingAnalyzer;
  
  constructor(catalog?: ProductionFormat[]) {
    this.catalog = catalog ?? loadRecommendationCatalog();
    if (!this.catalog.length) {
      console.warn('⚠️ Catálogo de produção vazio para recomendações.');
    } else {
      console.log(`✅ Catálogo carregado: ${this.catalog.length} formatos`);
    }
    this.briefingAnalyzer = new BriefingAnalyzer();
  }
  
  /**
   * Gera recomendação de enxoval completa
   */
  async generateRecommendation(input: BriefingInput): Promise<EnxovalRecommendation> {
    console.log('🚀 Iniciando geração de recomendação de enxoval...\n');
    
    const startTime = Date.now();
    const processingLog: EnxovalRecommendation['processing_log'] = [];
    
    // ========================================
    // FASE 1: Análise de Briefing
    // ========================================
    console.log('📋 FASE 1: Análise de Briefing');
    console.log('━'.repeat(50));
    
    const phase1Start = Date.now();
    const extractedParameters = await this.briefingAnalyzer.analyze(input);
    const phase1Duration = Date.now() - phase1Start;
    
    processingLog.push({
      phase: 'briefing_analysis',
      duration_ms: phase1Duration,
      details: {
        extracted_fields: Object.keys(extractedParameters).length,
        platforms: extractedParameters.channels.platforms,
        budget: extractedParameters.budget.total,
        deadline: extractedParameters.timeline.deadline
      }
    });
    
    console.log(`⏱️  Duração: ${phase1Duration}ms\n`);
    
    // ========================================
    // FASE 2: Filtragem de Formatos
    // ========================================
    console.log('🔍 FASE 2: Filtragem de Formatos');
    console.log('━'.repeat(50));
    
    const phase2Start = Date.now();
    const filter = new FormatFilter(this.catalog);
    const filterResult = filter.filter(extractedParameters);
    const phase2Duration = Date.now() - phase2Start;
    
    processingLog.push({
      phase: 'format_filtering',
      duration_ms: phase2Duration,
      details: {
        initial_count: this.catalog.length,
        final_count: filterResult.formats.length,
        filters_applied: filterResult.filter_log.length,
        filter_log: filterResult.filter_log
      }
    });
    
    console.log(`⏱️  Duração: ${phase2Duration}ms\n`);
    
    // Verificar se há formatos suficientes
    if (filterResult.formats.length === 0) {
      throw new Error('Nenhum formato elegível encontrado após filtragem. Tente relaxar os critérios.');
    }
    
    // ========================================
    // FASE 3: Scoring de Formatos
    // ========================================
    console.log('📊 FASE 3: Scoring de Formatos');
    console.log('━'.repeat(50));
    
    const phase3Start = Date.now();
    const scorer = new FormatScorer();
    const scoredFormats = scorer.score(filterResult.formats, extractedParameters);
    const phase3Duration = Date.now() - phase3Start;
    
    processingLog.push({
      phase: 'format_scoring',
      duration_ms: phase3Duration,
      details: {
        formats_scored: scoredFormats.length,
        avg_score: Math.round(
          scoredFormats.reduce((sum, f) => sum + f.recommendation_score, 0) / scoredFormats.length
        ),
        top_score: scoredFormats[0]?.recommendation_score || 0,
        lowest_score: scoredFormats[scoredFormats.length - 1]?.recommendation_score || 0
      }
    });
    
    console.log(`⏱️  Duração: ${phase3Duration}ms\n`);
    
    // ========================================
    // FASE 4: Geração de Enxoval
    // ========================================
    console.log('🎁 FASE 4: Geração de Enxoval');
    console.log('━'.repeat(50));
    
    const phase4Start = Date.now();
    const generator = new EnxovalGenerator();
    const enxoval = generator.generate(scoredFormats, extractedParameters);
    const phase4Duration = Date.now() - phase4Start;
    
    processingLog.push({
      phase: 'enxoval_generation',
      duration_ms: phase4Duration,
      details: {
        formats_selected: enxoval.recommended_formats.length,
        total_cost: enxoval.summary.total_estimated_cost,
        total_hours: enxoval.summary.total_estimated_hours,
        total_days: enxoval.summary.total_estimated_days
      }
    });
    
    console.log(`⏱️  Duração: ${phase4Duration}ms\n`);
    
    // ========================================
    // FASE 5: Warnings e Suggestions
    // ========================================
    console.log('⚠️  FASE 5: Análise e Sugestões');
    console.log('━'.repeat(50));
    
    const warnings = this.generateWarnings(enxoval, extractedParameters);
    const suggestions = this.generateSuggestions(enxoval, extractedParameters);
    
    if (warnings.length > 0) {
      console.log('⚠️  Warnings:');
      warnings.forEach(w => console.log(`   - ${w}`));
    }
    
    if (suggestions.length > 0) {
      console.log('💡 Suggestions:');
      suggestions.forEach(s => console.log(`   - ${s}`));
    }
    
    console.log();
    
    // ========================================
    // Finalização
    // ========================================
    const totalDuration = Date.now() - startTime;
    
    console.log('✅ RECOMENDAÇÃO GERADA COM SUCESSO!');
    console.log('━'.repeat(50));
    console.log(`⏱️  Tempo total: ${totalDuration}ms`);
    console.log(`📦 Formatos recomendados: ${enxoval.recommended_formats.length}`);
    console.log(`💰 Custo total estimado: R$ ${enxoval.summary.total_estimated_cost.toLocaleString()}`);
    console.log(`⏰ Horas totais estimadas: ${enxoval.summary.total_estimated_hours}h`);
    console.log(`📅 Prazo estimado: ${enxoval.summary.total_estimated_days} dias`);
    console.log();
    
    // Montar resposta final
    const recommendation: EnxovalRecommendation = {
      id: this.generateRecommendationId(),
      briefing: {
        original_text: input.text,
        extracted_parameters: extractedParameters
      },
      recommended_formats: enxoval.recommended_formats,
      summary: enxoval.summary,
      warnings,
      suggestions,
      processing_log: processingLog,
      created_at: new Date().toISOString()
    };
    
    return recommendation;
  }
  
  /**
   * Gera warnings baseado no enxoval
   */
  private generateWarnings(
    enxoval: GeneratedEnxoval,
    params: ExtractedParameters
  ): string[] {
    const warnings: string[] = [];
    
    // Warning: Budget apertado
    const budgetUsageRatio = enxoval.summary.total_estimated_cost / params.budget.total;
    if (budgetUsageRatio > 0.9) {
      warnings.push(`⚠️ Budget quase esgotado: ${Math.round(budgetUsageRatio * 100)}% utilizado`);
    } else if (budgetUsageRatio > 0.8) {
      warnings.push(`⚠️ Budget alto: ${Math.round(budgetUsageRatio * 100)}% utilizado`);
    }
    
    // Warning: Prazo apertado
    const deadline = new Date(params.timeline.deadline);
    const startDate = params.timeline.start_date 
      ? new Date(params.timeline.start_date)
      : new Date();
    
    const daysAvailable = Math.ceil(
      (deadline.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (enxoval.summary.total_estimated_days > daysAvailable) {
      warnings.push(`⚠️ Prazo insuficiente: ${enxoval.summary.total_estimated_days} dias necessários vs ${daysAvailable} dias disponíveis`);
    } else if (enxoval.summary.total_estimated_days > daysAvailable * 0.8) {
      warnings.push(`⚠️ Prazo apertado: pouca margem para revisões`);
    }
    
    // Warning: Baixa mensurabilidade
    if (params.requirements.measurability_required && enxoval.summary.avg_measurability_score < 70) {
      warnings.push(`⚠️ Mensurabilidade abaixo do esperado: média de ${enxoval.summary.avg_measurability_score}/100`);
    }
    
    // Warning: Cobertura incompleta
    const requestedPlatforms = params.channels.platforms;
    const coveredPlatforms = enxoval.summary.coverage.platforms;
    const missingPlatforms = requestedPlatforms.filter(p => !coveredPlatforms.includes(p));
    
    if (missingPlatforms.length > 0) {
      warnings.push(`⚠️ Plataformas sem cobertura: ${missingPlatforms.join(', ')}`);
    }
    
    return warnings;
  }
  
  /**
   * Gera suggestions baseado no enxoval
   */
  private generateSuggestions(
    enxoval: GeneratedEnxoval,
    params: ExtractedParameters
  ): string[] {
    const suggestions: string[] = [];
    
    // Suggestion: Formatos reutilizáveis
    const reusableCount = enxoval.recommended_formats.filter(f => 
      f.catalog_snapshot.reusability_score && f.catalog_snapshot.reusability_score >= 4
    ).length;
    
    if (reusableCount > 0) {
      suggestions.push(`💡 ${reusableCount} formatos têm alto potencial de reaproveitamento`);
    }
    
    // Suggestion: Formatos em alta
    const trendingCount = enxoval.recommended_formats.filter(f => {
      const trend = f.catalog_snapshot.market_trend?.market_trend;
      return trend === 'emerging' || trend === 'rising';
    }).length;
    
    if (trendingCount > 0) {
      suggestions.push(`💡 ${trendingCount} formatos estão em alta no mercado`);
    }
    
    // Suggestion: Budget sobrando
    const budgetUsageRatio = enxoval.summary.total_estimated_cost / params.budget.total;
    if (budgetUsageRatio < 0.7) {
      const remaining = params.budget.total - enxoval.summary.total_estimated_cost;
      suggestions.push(`💡 Budget disponível: R$ ${remaining.toLocaleString()} - considere adicionar mais formatos`);
    }
    
    // Suggestion: Prazo sobrando
    const deadline = new Date(params.timeline.deadline);
    const startDate = params.timeline.start_date 
      ? new Date(params.timeline.start_date)
      : new Date();
    
    const daysAvailable = Math.ceil(
      (deadline.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (enxoval.summary.total_estimated_days < daysAvailable * 0.6) {
      suggestions.push(`💡 Prazo confortável: ${daysAvailable - enxoval.summary.total_estimated_days} dias de margem`);
    }
    
    // Suggestion: Alta performance prevista
    if (enxoval.summary.avg_ml_performance_score >= 75) {
      suggestions.push(`💡 Alta performance prevista: média de ${enxoval.summary.avg_ml_performance_score}/100`);
    }
    
    // Suggestion: Boa mensurabilidade
    if (enxoval.summary.avg_measurability_score >= 80) {
      suggestions.push(`💡 Excelente rastreabilidade: média de ${enxoval.summary.avg_measurability_score}/100`);
    }
    
    return suggestions;
  }
  
  /**
   * Gera ID único para recomendação
   */
  private generateRecommendationId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `enxoval_${timestamp}_${random}`;
  }
  
  /**
   * Obtém estatísticas do catálogo
   */
  getCatalogStats() {
    const stats = {
      total_formats: this.catalog.length,
      by_production_type: {} as Record<string, number>,
      by_platform: {} as Record<string, number>,
      avg_ml_score: 0,
      avg_measurability_score: 0
    };
    
    // Contar por tipo
    this.catalog.forEach(format => {
      stats.by_production_type[format.production_type] = 
        (stats.by_production_type[format.production_type] || 0) + 1;
      
      stats.by_platform[format.platform] = 
        (stats.by_platform[format.platform] || 0) + 1;
    });
    
    // Calcular médias
    const mlScores = this.catalog
      .map(f => f.ml_performance_score?.overall_score || 0)
      .filter(s => s > 0);
    
    const measScores = this.catalog
      .map(f => f.measurability_score || 0)
      .filter(s => s > 0);
    
    stats.avg_ml_score = mlScores.length > 0
      ? Math.round(mlScores.reduce((a, b) => a + b, 0) / mlScores.length)
      : 0;
    
    stats.avg_measurability_score = measScores.length > 0
      ? Math.round(measScores.reduce((a, b) => a + b, 0) / measScores.length)
      : 0;
    
    return stats;
  }
}
