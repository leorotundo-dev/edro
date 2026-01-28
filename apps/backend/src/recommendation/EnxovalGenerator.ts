// =====================================================
// EnxovalGenerator
// =====================================================
// Gera enxoval otimizado a partir de formatos scored
// =====================================================

import { ExtractedParameters } from './BriefingAnalyzer';
import type { ProductionFormat } from './types';

interface ScoredFormat extends ProductionFormat {
  recommendation_score: number;
  score_breakdown: Record<string, number>;
}

interface RecommendedFormat {
  format_id: string;
  format_name: string;
  platform: string;
  production_type: string;
  recommendation_score: number;
  priority: 'must_have' | 'high' | 'medium' | 'nice_to_have';
  quantity: number;
  estimated_cost_per_unit: number;
  estimated_cost_total: number;
  estimated_hours_per_unit: number;
  estimated_hours_total: number;
  estimated_delivery_date: string;
  recommendation_reasons: string[];
  score_breakdown: Record<string, number>;
  catalog_snapshot: ProductionFormat;
}

interface EnxovalSummary {
  total_formats: number;
  total_estimated_cost: number;
  total_estimated_hours: number;
  total_estimated_days: number;
  avg_ml_performance_score: number;
  avg_measurability_score: number;
  avg_recommendation_score: number;
  coverage: {
    platforms: string[];
    production_types: string[];
    funnel_stages: string[];
  };
}

export interface GeneratedEnxoval {
  recommended_formats: RecommendedFormat[];
  summary: EnxovalSummary;
}

export class EnxovalGenerator {
  /**
   * Gera enxoval otimizado
   */
  generate(
    scoredFormats: ScoredFormat[],
    parameters: ExtractedParameters
  ): GeneratedEnxoval {
    console.log('🎁 Gerando enxoval otimizado...');
    
    // Passo 1: Garantir must-have formats
    const mustHave = this.selectMustHaveFormats(scoredFormats, parameters);
    console.log(`   Must-have: ${mustHave.length} formatos`);
    
    // Passo 2: Selecionar formatos de alta prioridade
    const remaining = scoredFormats.filter(f => 
      !mustHave.find(m => m.format_name === f.format_name)
    );
    
    const highPriority = this.selectHighPriorityFormats(remaining, parameters);
    console.log(`   High priority: ${highPriority.length} formatos`);
    
    // Passo 3: Preencher com formatos médios
    const remainingAfterHigh = remaining.filter(f => 
      !highPriority.find(h => h.format_name === f.format_name)
    );
    
    const mediumPriority = this.selectMediumPriorityFormats(remainingAfterHigh, parameters);
    console.log(`   Medium priority: ${mediumPriority.length} formatos`);
    
    // Passo 4: Adicionar nice-to-have se houver budget
    const remainingAfterMedium = remainingAfterHigh.filter(f => 
      !mediumPriority.find(m => m.format_name === f.format_name)
    );
    
    const niceToHave = this.selectNiceToHaveFormats(remainingAfterMedium, parameters);
    console.log(`   Nice-to-have: ${niceToHave.length} formatos`);
    
    // Combinar todos
    const allSelected = [
      ...mustHave.map(f => ({ ...f, priority: 'must_have' as const })),
      ...highPriority.map(f => ({ ...f, priority: 'high' as const })),
      ...mediumPriority.map(f => ({ ...f, priority: 'medium' as const })),
      ...niceToHave.map(f => ({ ...f, priority: 'nice_to_have' as const }))
    ];
    
    // Passo 5: Calcular quantidades
    const withQuantities = this.calculateQuantities(allSelected, parameters);
    
    // Passo 6: Calcular estimativas
    const recommended = this.calculateEstimates(withQuantities, parameters);
    
    // Passo 7: Gerar summary
    const summary = this.generateSummary(recommended, parameters);
    
    console.log(`✅ Enxoval gerado: ${recommended.length} formatos`);
    console.log(`   Custo total estimado: R$ ${summary.total_estimated_cost.toLocaleString()}`);
    console.log(`   Horas totais estimadas: ${summary.total_estimated_hours}h`);
    console.log(`   Prazo estimado: ${summary.total_estimated_days} dias`);
    
    return {
      recommended_formats: recommended,
      summary
    };
  }
  
  /**
   * Seleciona formatos must-have
   */
  private selectMustHaveFormats(
    formats: ScoredFormat[],
    params: ExtractedParameters
  ): ScoredFormat[] {
    const mustHaveNames = params.channels.must_have_formats || [];
    
    return formats.filter(f => mustHaveNames.includes(f.format_name));
  }
  
  /**
   * Seleciona formatos de alta prioridade
   */
  private selectHighPriorityFormats(
    formats: ScoredFormat[],
    params: ExtractedParameters
  ): ScoredFormat[] {
    // Garantir cobertura de todas as plataformas solicitadas
    const platforms = params.channels.platforms;
    const selected: ScoredFormat[] = [];
    
    // Para cada plataforma, pegar os 2 melhores formatos
    platforms.forEach(platform => {
      const platformFormats = formats
        .filter(f => f.platform === platform)
        .slice(0, 2); // Top 2
      
      selected.push(...platformFormats);
    });
    
    // Remover duplicatas
    return Array.from(new Set(selected));
  }
  
  /**
   * Seleciona formatos de média prioridade
   */
  private selectMediumPriorityFormats(
    formats: ScoredFormat[],
    params: ExtractedParameters
  ): ScoredFormat[] {
    // Garantir cobertura de estágios de funil
    const objective = params.campaign_objective;
    const funnelStages = this.getFunnelStagesForObjective(objective);
    
    const selected: ScoredFormat[] = [];
    
    // Para cada estágio, pegar os 2 melhores formatos
    funnelStages.forEach(stage => {
      const stageFormats = formats
        .filter(f => f.funnel_stages?.includes(stage))
        .slice(0, 2); // Top 2
      
      selected.push(...stageFormats);
    });
    
    // Remover duplicatas
    return Array.from(new Set(selected));
  }
  
  /**
   * Seleciona formatos nice-to-have
   */
  private selectNiceToHaveFormats(
    formats: ScoredFormat[],
    params: ExtractedParameters
  ): ScoredFormat[] {
    // Verificar budget disponível
    const totalBudget = params.budget.total;
    
    // Calcular budget já usado
    // (será calculado depois, por enquanto assume 70% usado)
    const budgetUsed = totalBudget * 0.7;
    const budgetAvailable = totalBudget - budgetUsed;
    
    // Selecionar formatos que cabem no budget
    const selected: ScoredFormat[] = [];
    let currentBudget = 0;
    
    for (const format of formats) {
      const cost = format.production_cost?.min_brl || 1000;
      
      if (currentBudget + cost <= budgetAvailable) {
        selected.push(format);
        currentBudget += cost;
      }
      
      // Limite de 5 nice-to-have
      if (selected.length >= 5) break;
    }
    
    return selected;
  }
  
  /**
   * Calcula quantidades para cada formato
   */
  private calculateQuantities(
    formats: Array<ScoredFormat & { priority: string }>,
    params: ExtractedParameters
  ): Array<ScoredFormat & { priority: string; quantity: number }> {
    return formats.map(format => {
      let quantity = 1; // Default
      
      // Ajustar baseado em prioridade
      if (format.priority === 'must_have') {
        quantity = 3; // 3 variações
      } else if (format.priority === 'high') {
        quantity = 2; // 2 variações
      }
      
      // Ajustar baseado em tipo de formato
      if (format.format_name.includes('Story') || format.format_name.includes('Stories')) {
        quantity = Math.max(quantity, 5); // Mínimo 5 stories
      }
      
      if (format.format_name.includes('Feed')) {
        quantity = Math.max(quantity, 3); // Mínimo 3 feeds
      }
      
      return {
        ...format,
        quantity
      };
    });
  }
  
  /**
   * Calcula estimativas de custo, horas e datas
   */
  private calculateEstimates(
    formats: Array<ScoredFormat & { priority: string; quantity: number }>,
    params: ExtractedParameters
  ): RecommendedFormat[] {
    const startDate = params.timeline.start_date 
      ? new Date(params.timeline.start_date)
      : new Date();
    
    return formats.map((format, index) => {
      // Custo
      const costPerUnit = format.production_cost?.min_brl && format.production_cost?.max_brl
        ? (format.production_cost.min_brl + format.production_cost.max_brl) / 2
        : format.production_cost?.min_brl || 1000;
      
      const costTotal = costPerUnit * format.quantity;
      
      // Horas
      const hoursPerUnit = format.production_effort?.estimated_hours || 8;
      const hoursTotal = hoursPerUnit * format.quantity;
      
      // Data de entrega (assumindo 8h/dia, produção sequencial)
      const daysToComplete = Math.ceil(hoursTotal / 8);
      const deliveryDate = new Date(startDate);
      deliveryDate.setDate(deliveryDate.getDate() + daysToComplete + (index * 2)); // +2 dias por formato (buffer)
      
      // Razões de recomendação
      const reasons = this.generateRecommendationReasons(format, params);
      
      return {
        format_id: `${format.production_type}_${format.platform}_${format.format_name}`.replace(/\s+/g, '_').toLowerCase(),
        format_name: format.format_name,
        platform: format.platform,
        production_type: format.production_type,
        recommendation_score: format.recommendation_score,
        priority: format.priority as RecommendedFormat['priority'],
        quantity: format.quantity,
        estimated_cost_per_unit: Math.round(costPerUnit),
        estimated_cost_total: Math.round(costTotal),
        estimated_hours_per_unit: hoursPerUnit,
        estimated_hours_total: hoursTotal,
        estimated_delivery_date: deliveryDate.toISOString().split('T')[0],
        recommendation_reasons: reasons,
        score_breakdown: format.score_breakdown,
        catalog_snapshot: format
      };
    });
  }
  
  /**
   * Gera razões de recomendação
   */
  private generateRecommendationReasons(
    format: ScoredFormat,
    params: ExtractedParameters
  ): string[] {
    const reasons: string[] = [];
    
    // ML Performance
    const mlScore = format.ml_performance_score?.overall_score || 0;
    if (mlScore >= 80) {
      reasons.push(`Alta performance prevista (${mlScore}/100)`);
    } else if (mlScore >= 60) {
      reasons.push(`Boa performance prevista (${mlScore}/100)`);
    }
    
    // Mensurabilidade
    const measScore = format.measurability_score || 0;
    if (measScore >= 90) {
      reasons.push(`Altamente mensurável - ideal para ${params.campaign_objective}`);
    } else if (measScore >= 70) {
      reasons.push(`Boa rastreabilidade de métricas`);
    }
    
    // Custo-benefício
    const costScore = format.score_breakdown?.cost_efficiency || 0;
    if (costScore >= 80) {
      reasons.push(`Excelente custo-benefício dentro do budget`);
    }
    
    // Reusability
    const reuseScore = format.reusability_score || 0;
    if (reuseScore >= 4) {
      reasons.push(`Alto potencial de reaproveitamento (${reuseScore}/5)`);
    }
    
    // Market Trend
    const trend = format.market_trend?.market_trend;
    if (trend === 'emerging' || trend === 'rising') {
      reasons.push(`Formato em alta no mercado (${trend})`);
    }
    
    // Se não gerou nenhuma razão, adicionar genérica
    if (reasons.length === 0) {
      reasons.push(`Recomendado para ${params.campaign_objective}`);
    }
    
    return reasons.slice(0, 4); // Máximo 4 razões
  }
  
  /**
   * Gera summary do enxoval
   */
  private generateSummary(
    recommended: RecommendedFormat[],
    params: ExtractedParameters
  ): EnxovalSummary {
    const totalCost = recommended.reduce((sum, f) => sum + f.estimated_cost_total, 0);
    const totalHours = recommended.reduce((sum, f) => sum + f.estimated_hours_total, 0);
    const totalDays = Math.ceil(totalHours / 8);
    
    const mlScores = recommended
      .map(f => f.catalog_snapshot.ml_performance_score?.overall_score || 0)
      .filter(s => s > 0);
    
    const measScores = recommended
      .map(f => f.catalog_snapshot.measurability_score || 0)
      .filter(s => s > 0);
    
    const recScores = recommended.map(f => f.recommendation_score);
    
    const avgML = mlScores.length > 0
      ? Math.round(mlScores.reduce((a, b) => a + b, 0) / mlScores.length)
      : 0;
    
    const avgMeas = measScores.length > 0
      ? Math.round(measScores.reduce((a, b) => a + b, 0) / measScores.length)
      : 0;
    
    const avgRec = recScores.length > 0
      ? Math.round(recScores.reduce((a, b) => a + b, 0) / recScores.length)
      : 0;
    
    // Cobertura
    const platforms = Array.from(new Set(recommended.map(f => f.platform)));
    const productionTypes = Array.from(new Set(recommended.map(f => f.production_type)));
    const funnelStages = Array.from(new Set(
      recommended.flatMap(f => f.catalog_snapshot.funnel_stages || [])
    ));
    
    return {
      total_formats: recommended.length,
      total_estimated_cost: Math.round(totalCost),
      total_estimated_hours: totalHours,
      total_estimated_days: totalDays,
      avg_ml_performance_score: avgML,
      avg_measurability_score: avgMeas,
      avg_recommendation_score: avgRec,
      coverage: {
        platforms,
        production_types: productionTypes,
        funnel_stages: funnelStages
      }
    };
  }
  
  /**
   * Obtém estágios de funil para objetivo
   */
  private getFunnelStagesForObjective(objective: string): string[] {
    const mapping: Record<string, string[]> = {
      'awareness': ['awareness'],
      'consideration': ['awareness', 'consideration'],
      'conversion': ['consideration', 'conversion'],
      'retention': ['conversion', 'retention']
    };
    
    return mapping[objective] || ['consideration'];
  }
}
