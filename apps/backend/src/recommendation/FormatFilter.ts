// =====================================================
// FormatFilter
// =====================================================
// Filtra formatos do catálogo baseado em parâmetros extraídos
// =====================================================

import { ExtractedParameters } from './BriefingAnalyzer';
import type { ProductionFormat } from './types';

interface FilterResult {
  formats: ProductionFormat[];
  filter_log: Array<{
    filter_name: string;
    before_count: number;
    after_count: number;
    removed_count: number;
  }>;
}

export class FormatFilter {
  private catalog: ProductionFormat[];
  private filterLog: FilterResult['filter_log'] = [];
  
  constructor(catalog: ProductionFormat[]) {
    this.catalog = catalog;
  }
  
  /**
   * Aplica todos os filtros sequencialmente
   */
  filter(parameters: ExtractedParameters): FilterResult {
    console.log('🔍 Aplicando filtros ao catálogo...');
    console.log(`   Formatos iniciais: ${this.catalog.length}`);
    
    this.filterLog = [];
    let formats = [...this.catalog];
    
    // Filtro 1: Tipo de Produção
    formats = this.applyFilter(
      'Tipo de Produção',
      formats,
      (f) => this.filterByProductionType(f, parameters)
    );
    
    // Filtro 2: Plataformas
    formats = this.applyFilter(
      'Plataformas',
      formats,
      (f) => this.filterByPlatforms(f, parameters)
    );
    
    // Filtro 3: Segmento (B2C/B2B)
    formats = this.applyFilter(
      'Segmento',
      formats,
      (f) => this.filterBySegment(f, parameters)
    );
    
    // Filtro 4: Estágio de Funil
    formats = this.applyFilter(
      'Estágio de Funil',
      formats,
      (f) => this.filterByFunnelStage(f, parameters)
    );
    
    // Filtro 5: Budget
    formats = this.applyFilter(
      'Budget',
      formats,
      (f) => this.filterByBudget(f, parameters)
    );
    
    // Filtro 6: Timeline/Prazo
    formats = this.applyFilter(
      'Timeline',
      formats,
      (f) => this.filterByTimeline(f, parameters)
    );
    
    // Filtro 7: Mensurabilidade Mínima
    formats = this.applyFilter(
      'Mensurabilidade',
      formats,
      (f) => this.filterByMeasurability(f, parameters)
    );
    
    // Filtro 8: ML Performance Mínimo
    formats = this.applyFilter(
      'ML Performance',
      formats,
      (f) => this.filterByMLPerformance(f, parameters)
    );
    
    // Filtro 9: Must-have Formats
    formats = this.applyFilter(
      'Must-have Formats',
      formats,
      (f) => this.filterByMustHave(f, parameters)
    );
    
    // Filtro 10: Exclude Formats
    formats = this.applyFilter(
      'Exclude Formats',
      formats,
      (f) => this.filterByExclude(f, parameters)
    );
    
    console.log(`✅ Filtros aplicados: ${formats.length} formatos elegíveis`);
    
    return {
      formats,
      filter_log: this.filterLog
    };
  }
  
  /**
   * Aplica um filtro e registra resultado
   */
  private applyFilter(
    name: string,
    formats: ProductionFormat[],
    filterFn: (format: ProductionFormat) => boolean
  ): ProductionFormat[] {
    const before = formats.length;
    const filtered = formats.filter(filterFn);
    const after = filtered.length;
    const removed = before - after;
    
    this.filterLog.push({
      filter_name: name,
      before_count: before,
      after_count: after,
      removed_count: removed
    });
    
    console.log(`   ${name}: ${before} → ${after} (-${removed})`);
    
    return filtered;
  }
  
  /**
   * Filtro 1: Tipo de Produção
   */
  private filterByProductionType(
    format: ProductionFormat,
    params: ExtractedParameters
  ): boolean {
    const requestedTypes = params.channels.production_types;
    
    // Se não especificou tipos, aceita todos
    if (!requestedTypes || requestedTypes.length === 0) {
      return true;
    }
    
    return requestedTypes.includes(format.production_type);
  }
  
  /**
   * Filtro 2: Plataformas
   */
  private filterByPlatforms(
    format: ProductionFormat,
    params: ExtractedParameters
  ): boolean {
    const requestedPlatforms = params.channels.platforms;
    
    // Se não especificou plataformas, aceita todos
    if (!requestedPlatforms || requestedPlatforms.length === 0) {
      return true;
    }
    
    // Verifica se formato pertence a alguma plataforma solicitada
    return requestedPlatforms.includes(format.platform);
  }
  
  /**
   * Filtro 3: Segmento (B2C/B2B/D2C/Internal)
   */
  private filterBySegment(
    format: ProductionFormat,
    params: ExtractedParameters
  ): boolean {
    const requestedSegment = params.target_audience.segment;
    
    // Verifica se formato é adequado para o segmento
    if (format.target_audience?.segments) {
      return format.target_audience.segments.includes(requestedSegment);
    }
    
    // Se formato não especifica segmento, aceita
    return true;
  }
  
  /**
   * Filtro 4: Estágio de Funil
   */
  private filterByFunnelStage(
    format: ProductionFormat,
    params: ExtractedParameters
  ): boolean {
    const objective = params.campaign_objective;
    
    // Mapear objetivo para estágios de funil
    const objectiveToStages: Record<string, string[]> = {
      'awareness': ['awareness'],
      'consideration': ['awareness', 'consideration'],
      'conversion': ['consideration', 'conversion'],
      'retention': ['conversion', 'retention']
    };
    
    const acceptedStages = objectiveToStages[objective] || ['consideration'];
    
    // Verifica se formato suporta algum estágio aceito
    if (format.funnel_stages && format.funnel_stages.length > 0) {
      return format.funnel_stages.some(stage => acceptedStages.includes(stage));
    }
    
    // Se formato não especifica funil, aceita
    return true;
  }
  
  /**
   * Filtro 5: Budget
   */
  private filterByBudget(
    format: ProductionFormat,
    params: ExtractedParameters
  ): boolean {
    const totalBudget = params.budget.total;
    const flexibility = params.budget.flexibility || 'flexible';
    
    // Calcular custo médio do formato
    const formatCost = format.production_cost?.min_brl && format.production_cost?.max_brl
      ? (format.production_cost.min_brl + format.production_cost.max_brl) / 2
      : format.production_cost?.min_brl || 0;
    
    // Definir limite baseado em flexibilidade
    let maxCostPerFormat = totalBudget * 0.15; // 15% do budget por formato (padrão)
    
    if (flexibility === 'strict') {
      maxCostPerFormat = totalBudget * 0.10; // 10% (mais restritivo)
    } else if (flexibility === 'very_flexible') {
      maxCostPerFormat = totalBudget * 0.25; // 25% (mais flexível)
    }
    
    return formatCost <= maxCostPerFormat;
  }
  
  /**
   * Filtro 6: Timeline/Prazo
   */
  private filterByTimeline(
    format: ProductionFormat,
    params: ExtractedParameters
  ): boolean {
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
    
    // Verificar se formato cabe no prazo
    const formatHours = format.production_effort?.estimated_hours || 0;
    
    // Adicionar margem de segurança de 20%
    const requiredHours = formatHours * 1.2;
    
    return requiredHours <= hoursAvailable;
  }
  
  /**
   * Filtro 7: Mensurabilidade Mínima
   */
  private filterByMeasurability(
    format: ProductionFormat,
    params: ExtractedParameters
  ): boolean {
    // Se campanha requer mensurabilidade
    if (params.requirements.measurability_required) {
      const minScore = params.requirements.min_measurability_score || 70;
      const formatScore = format.measurability_score || 0;
      
      return formatScore >= minScore;
    }
    
    // Se não requer, aceita todos
    return true;
  }
  
  /**
   * Filtro 8: ML Performance Mínimo
   */
  private filterByMLPerformance(
    format: ProductionFormat,
    params: ExtractedParameters
  ): boolean {
    // Definir score mínimo baseado em objetivo
    const minScores: Record<string, number> = {
      'awareness': 30,
      'consideration': 40,
      'conversion': 50,
      'retention': 40
    };
    
    const minScore = minScores[params.campaign_objective] || 40;
    const formatScore = format.ml_performance_score?.overall_score || 0;
    
    return formatScore >= minScore;
  }
  
  /**
   * Filtro 9: Must-have Formats
   */
  private filterByMustHave(
    format: ProductionFormat,
    params: ExtractedParameters
  ): boolean {
    const mustHave = params.channels.must_have_formats || [];
    
    // Se não há must-have, aceita todos
    if (mustHave.length === 0) {
      return true;
    }
    
    // Se formato está na lista must-have, sempre aceita
    // Se não está, também aceita (será priorizado depois)
    return true;
  }
  
  /**
   * Filtro 10: Exclude Formats
   */
  private filterByExclude(
    format: ProductionFormat,
    params: ExtractedParameters
  ): boolean {
    const exclude = params.channels.exclude_formats || [];
    
    // Rejeita se formato está na lista de exclusão
    return !exclude.includes(format.format_name);
  }
  
  /**
   * Obtém log de filtros aplicados
   */
  getFilterLog(): FilterResult['filter_log'] {
    return this.filterLog;
  }
}
