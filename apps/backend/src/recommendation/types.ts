// =====================================================
// Tipos TypeScript para o Catálogo de Produção
// =====================================================

export interface ProductionFormat {
  production_type: string;
  platform: string;
  format_name: string;
  
  // Especificações técnicas
  dimensions?: {
    width: number;
    height: number;
    unit: string;
    aspect_ratio?: string;
  };
  
  file_format?: {
    image_formats?: string[];
    video_formats?: string[];
    max_file_size?: string;
    video_duration?: string;
  };
  
  // Custos
  production_cost?: {
    min_brl?: number;
    max_brl?: number;
    currency?: string;
  };
  
  // Esforço de produção
  production_effort?: {
    estimated_hours?: number;
    complexity_level?: string;
  };
  
  // ML Performance Score
  ml_performance_score?: {
    overall_score: number;
    ctr_score?: number;
    engagement_score?: number;
    conversion_score?: number;
    reach_score?: number;
  };
  
  // Mensurabilidade
  measurability_score?: number;
  trackable_metrics?: string[];
  
  // Reusabilidade
  reusability_score?: number;
  reusable_elements?: string[];
  
  // Market Trend
  market_trend?: {
    market_trend: string;
    trend_score?: number;
  };
  
  // Targeting
  target_audience?: {
    age_groups?: string[];
    segments?: string[];
  };
  
  // Funil
  funnel_stages?: string[];
  
  // Objetivos
  best_for_objectives?: string[];
  
  // Descrição
  description?: string;
  
  // Outros campos opcionais
  [key: string]: any;
}
