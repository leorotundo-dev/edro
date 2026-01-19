// Types para ReccoEngine V3

export interface CognitiveState {
  foco?: number; // 0-100
  energia?: number; // 0-100
  nec?: number; // Nível de Energia Cognitiva
  nca?: number; // Nível de Carga de Atenção
  velocidade?: number;
  tempo_por_drop?: number;
  saturacao?: boolean;
}

export interface EmotionalState {
  humor?: number; // 1-5
  humor_auto_reportado?: number; // 1-5
  ansiedade?: boolean;
  frustracao?: boolean;
  motivacao?: boolean;
  confianca?: number;
  frustracao_inferida?: boolean;
  ansiedade_inferida?: boolean;
  motivacao_inferida?: boolean;
}

export interface PedagogicalState {
  topicos_dominados: string[] | number;
  topicos_frageis: string[] | number;
  topicos_ignorados: string[] | number;
  taxa_acerto_geral: number;
  retencao_srs?: number;
  nivel_medio?: number;
  progresso_geral?: number;
}

export interface DiagnosisResult {
  cognitive: CognitiveState;
  emotional: EmotionalState;
  pedagogical: PedagogicalState;
  estado_cognitivo: 'alto' | 'medio' | 'baixo' | 'saturado';
  estado_emocional: 'motivado' | 'ansioso' | 'frustrado' | 'neutro';
  estado_pedagogico: 'avancado' | 'medio' | 'iniciante' | 'travado';
  prob_acerto: number;
  prob_retencao: number;
  prob_saturacao: number;
  tempo_otimo_estudo: number; // minutos
}

export interface Priority {
  action: string;
  score: number;
  reason: string;
  urgency: number; // 1-10
  type: 'drop' | 'questao' | 'revisao' | 'simulado';
  content_id?: string;
}

export interface TrailOfDay {
  user_id: string;
  date: Date;
  items: TrailItem[];
  total_duration_minutes: number;
  difficulty_curve: 'progressiva' | 'inversa' | 'plana';
  generated_at: Date;
}

export interface TrailItem {
  type: 'drop' | 'questao' | 'revisao_srs' | 'bloco' | 'simulado';
  content_id: string;
  order: number;
  duration_minutes: number;
  difficulty: number; // 1-5
  reason: string;
}

export interface ReccoEngineInput {
  user_id: string;
  context?: {
    time_available?: number; // minutos
    energy_level?: number;
    focus_level?: number;
    mood?: number;
    force_topics?: string[];
  };
}
