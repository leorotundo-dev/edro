// Types para ReccoEngine V3

export interface CognitiveState {
  foco?: number; // 0-100
  energia?: number; // 0-100
  velocidade?: number; // wpm
  nec?: number; // Nível de Energia Cognitiva
  nca?: number; // Nível de Carga de Atenção
  timestamp: Date;
}

export interface EmotionalState {
  humor_auto_reportado?: number; // 1-5
  frustracao_inferida?: boolean;
  ansiedade_inferida?: boolean;
  motivacao_inferida?: boolean;
  timestamp: Date;
}

export interface PerformanceData {
  acertos: number;
  erros: number;
  taxa_acerto: number;
  tempo_medio_questao: number;
  dificuldade_percebida: number;
}

export interface ReccoInputs {
  user_id: string;
  cognitive: CognitiveState | null;
  emotional: EmotionalState | null;
  performance: PerformanceData;
  srs_pending: number;
  srs_overdue: number;
  tempo_ate_prova: number; // dias
  banca: string;
}

export interface DiagnosedState {
  estado_cognitivo: 'alto' | 'medio' | 'baixo' | 'saturado';
  estado_emocional: 'motivado' | 'ansioso' | 'frustrado' | 'neutro';
  estado_pedagogico: 'avancado' | 'medio' | 'iniciante' | 'travado';
  prob_acerto: number;
  prob_retencao: number;
  prob_saturacao: number;
  tempo_otimo_estudo: number; // minutos
  conteudo_ideal: string;
}

export interface Priority {
  action: string;
  score: number;
  reason: string;
  urgency: number;
  tipo: 'drop' | 'questao' | 'revisao' | 'simulado' | 'bloco';
  content_id?: string;
}

export interface SelectedContent {
  drops: Array<{ id: string; score: number; reason: string }>;
  blocos: Array<{ id: string; score: number; reason: string }>;
  questoes: Array<{ id: string; score: number; reason: string }>;
  revisoes_srs: Array<{ card_id: string; score: number; reason: string }>;
}

export interface SequencedTrail {
  items: Array<{
    type: 'drop' | 'questao' | 'revisao' | 'bloco';
    id: string;
    order: number;
    reason: string;
    estimated_minutes: number;
  }>;
  total_time_minutes: number;
  curva_dificuldade: string;
  curva_cognitiva: string;
  curva_emocional: string;
}

export interface Reinforcement {
  drops_reforco: string[];
  mnemonicos: string[];
  questoes_fixacao: string[];
  ajustes_srs: Record<string, any>;
  motivo: string;
}
