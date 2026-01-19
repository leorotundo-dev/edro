/**
 * Tipos TypeScript para o Frontend do Aluno
 */

// ============================================
// USER & AUTH
// ============================================

export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
  plan?: 'free' | 'premium' | 'enterprise';
}

export interface AuthResponse {
  token: string;
  user: User;
}

// ============================================
// TRAIL & RECCO ENGINE
// ============================================

export interface TrailItem {
  type: 'drop' | 'questao' | 'revisao_srs' | 'bloco' | 'simulado';
  content_id: string;
  order: number;
  duration_minutes: number;
  difficulty: number; // 1-5
  reason: string;
  completed?: boolean;
  score?: number;
}

export interface Trail {
  user_id: string;
  date: string;
  items: TrailItem[];
  total_duration_minutes: number;
  difficulty_curve: 'progressiva' | 'inversa' | 'plana';
  generated_at: string;
}

export interface Diagnosis {
  cognitive: CognitiveState;
  emotional: EmotionalState;
  pedagogical: PedagogicalState;
  estado_cognitivo: 'alto' | 'medio' | 'baixo' | 'saturado';
  estado_emocional: 'motivado' | 'ansioso' | 'frustrado' | 'neutro';
  estado_pedagogico: 'avancado' | 'medio' | 'iniciante' | 'travado';
  prob_acerto: number;
  prob_retencao: number;
  prob_saturacao: number;
  tempo_otimo_estudo: number;
}

export interface CognitiveState {
  foco: number;
  energia: number;
  nec: number;
  nca: number;
  velocidade?: number;
  saturacao: boolean;
}

export interface EmotionalState {
  humor?: number;
  frustracao: boolean;
  ansiedade: boolean;
  motivacao: boolean;
}

export interface PedagogicalState {
  topicos_dominados: string[];
  topicos_frageis: string[];
  topicos_ignorados: string[];
  taxa_acerto_geral: number;
  retencao_srs: number;
}

// ============================================
// DROP
// ============================================

export interface Drop {
  id: string;
  discipline_id: string;
  title: string;
  content: string;
  difficulty: number; // 1-5
  drop_type: DropType;
  status?: string;
  topic_code?: string;
  blueprint_id?: number;
  drop_text: DropContent;
  origin?: string;
  origin_meta?: Record<string, any>;
  origin_user_id?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
}

export type DropType =
  | 'fundamento'
  | 'regra'
  | 'excecao'
  | 'pattern-banca'
  | 'mini-questao'
  | 'comparativo'
  | 'revisao'
  | 'aprofundamento';

export interface DropContent {
  text: string;
  examples?: string[];
  hints?: string[];
  references?: string[];
  explanation?: string;
}

// ============================================
// SRS (REPETIÇÃO ESPAÇADA)
// ============================================

export interface SRSCard {
  id: string;
  user_id: string;
  drop_id: string;
  interval: number; // dias
  repetition: number;
  easiness_factor: number;
  next_review: string;
  last_reviewed?: string;
  status: 'new' | 'learning' | 'review' | 'relearning';
  drop?: Drop | null;
}

export interface SRSReview {
  id: string;
  card_id: string;
  user_id: string;
  grade: number; // 1-5
  time_spent: number;
  reviewed_at: string;
}

// ============================================
// STATS & PROGRESS
// ============================================

export interface Stats {
  total_drops_studied: number;
  total_time_spent: number; // minutos
  current_streak: number; // dias consecutivos
  total_srs_cards: number;
  srs_cards_due: number;
  average_accuracy: number; // 0-100
  topics_mastered: number;
  topics_weak: number;
  level: number;
  xp: number;
}

export interface DailyProgress {
  date: string;
  items_completed: number;
  items_total: number;
  time_spent: number;
  accuracy: number;
}

// ============================================
// SESSION
// ============================================

export interface Session {
  id: string;
  user_id: string;
  started_at: string;
  ended_at?: string;
  duration_minutes?: number;
  items_completed: number;
  drops_studied: number;
  srs_reviewed: number;
}

// ============================================
// API RESPONSES
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

// ============================================
// UI HELPERS
// ============================================

export type DifficultyLevel = 1 | 2 | 3 | 4 | 5;

export const DifficultyLabels: Record<DifficultyLevel, string> = {
  1: 'Muito Fácil',
  2: 'Fácil',
  3: 'Médio',
  4: 'Difícil',
  5: 'Muito Difícil',
};

export const DifficultyColors: Record<DifficultyLevel, string> = {
  1: 'text-green-600 bg-green-50',
  2: 'text-blue-600 bg-blue-50',
  3: 'text-yellow-600 bg-yellow-50',
  4: 'text-orange-600 bg-orange-50',
  5: 'text-red-600 bg-red-50',
};

export type ItemType = TrailItem['type'];

export const ItemTypeLabels: Record<ItemType, string> = {
  drop: 'Drop',
  questao: 'Questão',
  revisao_srs: 'Revisão SRS',
  bloco: 'Bloco',
  simulado: 'Simulado',
};

export const ItemTypeIcons: Record<ItemType, string> = {
  drop: '📖',
  questao: '❓',
  revisao_srs: '🔄',
  bloco: '📚',
  simulado: '🎯',
};

// ============================================
// UTILITY TYPES
// ============================================

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
