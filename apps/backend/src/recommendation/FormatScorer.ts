// =====================================================
// FormatScorer
// =====================================================
// Calcula score de recomendação para cada formato
// =====================================================

import { ExtractedParameters } from './BriefingAnalyzer';
import type { ProductionFormat } from './types';

interface ScoredFormat extends ProductionFormat {
  recommendation_score: number;
  score_breakdown: {
    ml_performance: number;
    measurability: number;
    cost_efficiency: number;
    timeline_fit: number;
    audience_fit: number;
    objective_alignment: number;
    reusability: number;
    market_trend: number;
  };
}

interface ScoringWeights {
  ml_performance: number;
  measurability: number;
  cost_efficiency: number;
  timeline_fit: number;
  audience_fit: number;
  objective_alignment: number;
  reusability: number;
  market_trend: number;
}

export class FormatScorer {
  /**
   * Calcula scores para todos os formatos
   */
  score(
    formats: ProductionFormat[],
    parameters: ExtractedParameters
  ): ScoredFormat[] {
    console.log('📊 Calculando scores de recomendação...');
    
    // Obter pesos baseado no objetivo da campanha
    const weights = this.getWeights(parameters.campaign_objective);
    
    console.log(`   Pesos aplicados (${parameters.campaign_objective}):`);
    console.log(`   - ML Performance: ${weights.ml_performance * 100}%`);
    console.log(`   - Mensurabilidade: ${weights.measurability * 100}%`);
    console.log(`   - Custo-Eficiência: ${weights.cost_efficiency * 100}%`);
    
    // Calcular score para cada formato
    const scored = formats.map(format => {
      const breakdown = this.calculateBreakdown(format, parameters, weights);
      
      // Score final é a soma ponderada
      const finalScore = 
        breakdown.ml_performance * weights.ml_performance +
        breakdown.measurability * weights.measurability +
        breakdown.cost_efficiency * weights.cost_efficiency +
        breakdown.timeline_fit * weights.timeline_fit +
        breakdown.audience_fit * weights.audience_fit +
        breakdown.objective_alignment * weights.objective_alignment +
        breakdown.reusability * weights.reusability +
        breakdown.market_trend * weights.market_trend;
      
      return {
        ...format,
        recommendation_score: Math.round(finalScore * 10) / 10, // Arredondar para 1 casa decimal
        score_breakdown: breakdown
      };
    });
    
    // Ordenar por score (maior primeiro)
    scored.sort((a, b) => b.recommendation_score - a.recommendation_score);
    
    console.log(`✅ Scores calculados para ${scored.length} formatos`);
    if (scored.length > 0) {
      console.log(`   Score mais alto: ${scored[0].format_name} (${scored[0].recommendation_score})`);
      console.log(`   Score mais baixo: ${scored[scored.length - 1].format_name} (${scored[scored.length - 1].recommendation_score})`);
    }
    
    return scored;
  }
  
  /**
   * Obtém pesos baseado no objetivo da campanha
   */
  private getWeights(objective: string): ScoringWeights {
    const weightsByObjective: Record<string, ScoringWeights> = {
      // Performance/Conversion: prioriza mensurabilidade e ML performance
      'conversion': {
        ml_performance: 0.25,
        measurability: 0.25,
        cost_efficiency: 0.15,
        timeline_fit: 0.10,
        audience_fit: 0.10,
        objective_alignment: 0.10,
        reusability: 0.03,
        market_trend: 0.02
      },
      
      // Awareness: prioriza alcance e audience fit
      'awareness': {
        ml_performance: 0.15,
        measurability: 0.10,
        cost_efficiency: 0.15,
        timeline_fit: 0.10,
        audience_fit: 0.20,
        objective_alignment: 0.15,
        reusability: 0.10,
        market_trend: 0.05
      },
      
      // Consideration: prioriza engajamento e objective alignment
      'consideration': {
        ml_performance: 0.20,
        measurability: 0.15,
        cost_efficiency: 0.15,
        timeline_fit: 0.10,
        audience_fit: 0.15,
        objective_alignment: 0.15,
        reusability: 0.07,
        market_trend: 0.03
      },
      
      // Retention: prioriza reusability e audience fit
      'retention': {
        ml_performance: 0.15,
        measurability: 0.15,
        cost_efficiency: 0.10,
        timeline_fit: 0.10,
        audience_fit: 0.20,
        objective_alignment: 0.15,
        reusability: 0.10,
        market_trend: 0.05
      }
    };
    
    return weightsByObjective[objective] || weightsByObjective['consideration'];
  }
  
  /**
   * Calcula breakdown de scores
   */
  private calculateBreakdown(
    format: ProductionFormat,
    params: ExtractedParameters,
    weights: ScoringWeights
  ): ScoredFormat['score_breakdown'] {
    return {
      ml_performance: this.scoreMLPerformance(format),
      measurability: this.scoreMeasurability(format),
      cost_efficiency: this.scoreCostEfficiency(format, params),
      timeline_fit: this.scoreTimelineFit(format, params),
      audience_fit: this.scoreAudienceFit(format, params),
      objective_alignment: this.scoreObjectiveAlignment(format, params),
      reusability: this.scoreReusability(format),
      market_trend: this.scoreMarketTrend(format)
    };
  }
  
  /**
   * Score 1: ML Performance (0-100)
   */
  private scoreMLPerformance(format: ProductionFormat): number {
    return format.ml_performance_score?.overall_score || 50;
  }
  
  /**
   * Score 2: Mensurabilidade (0-100)
   */
  private scoreMeasurability(format: ProductionFormat): number {
    return format.measurability_score || 50;
  }
  
  /**
   * Score 3: Custo-Eficiência (0-100)
   */
  private scoreCostEfficiency(
    format: ProductionFormat,
    params: ExtractedParameters
  ): number {
    const totalBudget = params.budget.total;
    
    // Calcular custo médio do formato
    const formatCost = format.production_cost?.min_brl && format.production_cost?.max_brl
      ? (format.production_cost.min_brl + format.production_cost.max_brl) / 2
      : format.production_cost?.min_brl || 1000;
    
    // Calcular custo máximo aceitável por formato (15% do budget)
    const maxCostPerFormat = totalBudget * 0.15;
    
    // Score inversamente proporcional ao custo
    // Formato mais barato = score mais alto
    const ratio = formatCost / maxCostPerFormat;
    
    if (ratio <= 0.3) return 100; // Muito barato
    if (ratio <= 0.5) return 90;
    if (ratio <= 0.7) return 80;
    if (ratio <= 0.9) return 70;
    if (ratio <= 1.0) return 60;
    return Math.max(0, 60 - (ratio - 1) * 50); // Penaliza formatos caros
  }
  
  /**
   * Score 4: Timeline Fit (0-100)
   */
  private scoreTimelineFit(
    format: ProductionFormat,
    params: ExtractedParameters
  ): number {
    const deadline = new Date(params.timeline.deadline);
    const startDate = params.timeline.start_date 
      ? new Date(params.timeline.start_date)
      : new Date();
    
    // Calcular dias disponíveis
    const daysAvailable = Math.ceil(
      (deadline.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    // Estimar horas disponíveis (assumindo 8h/dia útil, ~70% dos dias)
    const hoursAvailable = daysAvailable * 8 * 0.7;
    
    // Horas necessárias para o formato
    const formatHours = format.production_effort?.estimated_hours || 8;
    
    // Calcular ratio (quanto menor, melhor)
    const ratio = formatHours / hoursAvailable;
    
    if (ratio <= 0.1) return 100; // Muito rápido
    if (ratio <= 0.2) return 90;
    if (ratio <= 0.3) return 80;
    if (ratio <= 0.5) return 70;
    if (ratio <= 0.7) return 60;
    return Math.max(0, 60 - (ratio - 0.7) * 100); // Penaliza formatos demorados
  }
  
  /**
   * Score 5: Audience Fit (0-100)
   */
  private scoreAudienceFit(
    format: ProductionFormat,
    params: ExtractedParameters
  ): number {
    // Verificar match de segmento
    const requestedSegment = params.target_audience.segment;
    const formatSegments = format.target_audience?.segments || [];
    
    if (formatSegments.includes(requestedSegment)) {
      return 80; // Bom match
    }
    
    // Default
    return 60;
  }
  
  /**
   * Score 6: Objective Alignment (0-100)
   */
  private scoreObjectiveAlignment(
    format: ProductionFormat,
    params: ExtractedParameters
  ): number {
    const objective = params.campaign_objective;
    
    // Mapear objetivo para estágios de funil
    const objectiveToStages: Record<string, string[]> = {
      'awareness': ['awareness'],
      'consideration': ['consideration'],
      'conversion': ['conversion'],
      'retention': ['retention']
    };
    
    const targetStages = objectiveToStages[objective] || ['consideration'];
    const formatStages = format.funnel_stages || [];
    
    // Calcular match
    const matchCount = targetStages.filter(stage => 
      formatStages.includes(stage)
    ).length;
    
    if (matchCount === 0) return 40; // Nenhum match
    if (matchCount === 1) return 80; // Match parcial
    return 100; // Match completo
  }
  
  /**
   * Score 7: Reusability (0-100)
   */
  private scoreReusability(format: ProductionFormat): number {
    const reusabilityScore = format.reusability_score || 3;
    
    // Converter de escala 1-5 para 0-100
    return (reusabilityScore / 5) * 100;
  }
  
  /**
   * Score 8: Market Trend (0-100)
   */
  private scoreMarketTrend(format: ProductionFormat): number {
    const trend = format.market_trend?.market_trend;
    
    const trendScores: Record<string, number> = {
      'emerging': 100,
      'rising': 90,
      'stable': 70,
      'mature': 60,
      'declining': 40
    };
    
    return trendScores[trend || 'stable'] || 70;
  }
}
