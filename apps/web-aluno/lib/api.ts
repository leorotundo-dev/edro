/**
 * Cliente da API do Edro
 * 
 * Gerencia todas as chamadas HTTP para o backend
 * Agora usando API Client unificado do @edro/shared
 */

import { createApiClient, ApiClient as BaseApiClient } from '@edro/shared';

// Base deve ser o host raiz (sem /api). As rotas abaixo já incluem /api/...
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

export const AUTH_EVENT = 'edro:auth';

type AuthEventDetail = {
  action: 'logout' | 'unauthorized';
};

const getStoredToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token') || localStorage.getItem('edro_token');
};

const clearStoredAuth = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
  localStorage.removeItem('edro_token');
  localStorage.removeItem('user');
};

const emitAuthEvent = (action: AuthEventDetail['action']) => {
  if (typeof window === 'undefined') return;
  const event: CustomEvent<AuthEventDetail> = new CustomEvent(AUTH_EVENT, {
    detail: { action }
  });
  window.dispatchEvent(event);
};

// Cliente base do shared
const baseClient = createApiClient({
  baseURL: API_URL,
  getToken: getStoredToken,
  onUnauthorized: () => {
    clearStoredAuth();
    emitAuthEvent('unauthorized');
  }
});

// ============================================
// EXTENDED API CLIENT (com métodos específicos)
// ============================================

class ApiClient {
  private client: BaseApiClient;

  constructor() {
    this.client = baseClient;
  }

  // Token management (usando localStorage diretamente)
  getToken(): string | null {
    return getStoredToken();
  }

  setToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
      localStorage.setItem('edro_token', token);
    }
  }

  clearToken(): void {
    clearStoredAuth();
  }

  // ============================================
  // AUTENTICAÇÃO
  // ============================================

  async login(email: string, password: string) {
    const data = await this.client.post('/api/auth/login', { email, password });
    if (data.token) {
      this.setToken(data.token);
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
    }
    return data;
  }

  async register(email: string, password: string, name: string) {
    const data = await this.client.post('/api/auth/register', { email, password, name });
    if (data.token) {
      this.setToken(data.token);
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
    }
    return data;
  }

  async me() {
    return this.client.get('/api/auth/me');
  }

  logout() {
    this.clearToken();
    emitAuthEvent('logout');
  }

  // ============================================
  // RECCO ENGINE
  // ============================================

  async getTrailToday(userId: string) {
    return this.client.get(`/api/recco/trail/daily/${userId}`);
  }

  async getDiagnosis(userId: string) {
    return this.client.get(`/api/recco/diagnosis/${userId}`);
  }

  async generateTrail(params: {
    user_id: string;
    tempo_disponivel?: number;
    dias_ate_prova?: number;
  }) {
    return this.client.post('/api/recco/trail/generate', params);
  }

  // ============================================
  // DROPS
  // ============================================

  async getDrops(filters?: { discipline?: string; difficulty?: number }) {
    return this.client.get('/api/drops', { params: filters });
  }

  async getDropById(id: string) {
    return this.client.get(`/api/admin/drops/${id}`);
  }

  // ============================================
  // EDITAIS
  // ============================================

  async listEditais(params?: {
    search?: string;
    banca?: string;
    status?: string;
    limit?: number;
    page?: number;
  }) {
    return this.client.get('/api/editais', { params });
  }

  async listEditaisInteresses(params?: { user_id?: string }) {
    return this.client.get('/api/editais/interesses', { params });
  }

  async addEditalInteresse(editalId: string, payload?: { cargo_interesse?: string }) {
    return this.client.post(`/api/editais/${editalId}/interesse`, payload ?? {});
  }

  async removeEditalInteresse(editalId: string) {
    return this.client.delete(`/api/editais/${editalId}/interesse`);
  }

  async updateEditalInteresse(editalId: string, payload: { cargo_interesse?: string | null; notificacoes_ativas?: boolean }) {
    return this.client.patch(`/api/editais/${editalId}/interesse`, payload);
  }

  async getAutoFormacoes(editalId: string, params?: { refresh?: boolean }) {
    return this.client.get(`/api/editais/${editalId}/auto-formacoes`, { params });
  }

  async getEditalLatestJob(editalId: string, params?: { type?: string }) {
    return this.client.get(`/api/editais/${editalId}/jobs/latest`, { params });
  }

  async getEditalMacroPlan(editalId: string, params?: { user_id?: string; start_date?: string }) {
    return this.client.get(`/api/editais/${editalId}/macro-plan`, { params });
  }

  async getEditalMateriasProgress(editalId: string, params?: { user_id?: string }) {
    return this.client.get(`/api/editais/${editalId}/materias-progress`, { params });
  }

  async listUserDrops(params?: {
    edital_id?: string;
    origin?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    return this.client.get('/api/drops', { params });
  }

  async listQuestions(params?: {
    discipline?: string;
    topic?: string;
    examBoard?: string;
    difficulty?: number;
    cognitiveLevel?: string;
    tags?: string[];
    status?: string;
    aiGenerated?: boolean;
    editalId?: string;
    limit?: number;
    offset?: number;
  }) {
    return this.client.get('/api/questions', { params });
  }

  async getJobStatus(jobId: string) {
    return this.client.get(`/api/jobs/${jobId}`);
  }

  async createStudyRequest(payload: {
    topic: string;
    level?: string;
    user_id?: string;
    source_ids?: string[];
  }) {
    return this.client.post('/api/study-requests', payload);
  }

  async createSource(payload: {
    type?: string;
    title?: string;
    url?: string;
    text?: string;
    edital_id?: string;
    metadata?: Record<string, any>;
  }) {
    return this.client.post('/api/sources', payload);
  }

  async createSourcePresign(payload: {
    file_name?: string;
    content_type?: string;
    size_bytes?: number;
    title?: string;
    edital_id?: string;
    type?: string;
  }) {
    return this.client.post('/api/sources/presign', payload);
  }

  async completeSource(sourceId: string) {
    return this.client.post('/api/sources/complete', { source_id: sourceId });
  }

  async getSource(sourceId: string) {
    return this.client.get(`/api/sources/${sourceId}`);
  }

  // ============================================
  // SRS (REPETIÇÃO ESPAÇADA)
  // ============================================

  async getSRSToday(userId: string) {
    return this.client.get('/api/srs/today', { params: { userId } });
  }

  async reviewSRS(params: {
    cardId: string;
    grade: number; // 1-5
    timeSpent: number;
  }) {
    return this.client.post('/api/srs/review', params);
  }

  async enrollInSRS(dropId: string) {
    return this.client.post('/api/srs/enroll', { dropId });
  }

  // ============================================
  // APRENDIZAGEM
  // ============================================

  async logLearning(params: {
    dropId: string;
    timeSpent: number;
    completed: boolean;
    understood: boolean;
  }) {
    return this.client.post('/api/learn/log', params);
  }

  // ============================================
  // MNEMÔNICOS
  // ============================================

  async recommendMnemonics(topic: string) {
    const encoded = encodeURIComponent(topic);
    return this.client.get(`/api/mnemonics/recommend/${encoded}`);
  }

  // ============================================
  // TRILHA
  // ============================================

  async getTodayTrail() {
    return this.client.get('/api/trail/today');
  }

  // ============================================
  // PLANO DIARIO (V2)
  // ============================================

  async getPlanToday(params?: { date?: string }) {
    return this.client.get('/api/plan/today', { params });
  }

  async generatePlan(payload: {
    date?: string;
    tempoDisponivel?: number;
    blueprintId?: string;
    diasAteProva?: number;
    bancaPreferencial?: string;
    forceTopics?: string[];
  }) {
    return this.client.post('/api/plan/generate', payload);
  }

  async completeTrailItem(itemId: string, result: {
    completed: boolean;
    timeSpent: number;
    understood?: boolean;
  }) {
    return this.client.post('/api/trail/complete', {
      itemId,
      ...result,
    });
  }

  // ============================================
  // TRACKING
  // ============================================

  async trackEvent(event: {
    event_type: string;
    event_data?: any;
    session_id?: string;
  }) {
    return this.client.post('/api/tracking/event', event);
  }

  async trackCognitive(params: {
    session_id: string;
    foco?: number;
    energia?: number;
    velocidade?: number;
    tempo_por_drop?: number;
    hesitacao?: boolean;
    abandono_drop?: boolean;
    retorno_drop?: boolean;
  }) {
    return this.client.post('/api/tracking/cognitive', params);
  }

  async trackEmotional(params: {
    session_id: string;
    humor_auto_reportado?: number;
    frustracao_inferida?: boolean;
    ansiedade_inferida?: boolean;
    motivacao_inferida?: boolean;
    contexto?: string;
  }) {
    return this.client.post('/api/tracking/emotional', params);
  }

  async startSession() {
    return this.client.post('/api/tracking/session/start', {});
  }

  async endSession(sessionId: string) {
    return this.client.post('/api/tracking/session/end', { session_id: sessionId });
  }

  async getCurrentState() {
    return this.client.get('/api/tracking/state');
  }

  // ============================================
  // PROGRESSO
  // ============================================

  async getStats(userId: string) {
    return this.client.get(`/api/plan/stats`, { params: { userId } });
  }

  async getDailyPlan(userId: string) {
    return this.client.get(`/api/plan/daily`, { params: { userId } });
  }
}

// Singleton
export const api = new ApiClient();

// Helper para obter usuário do localStorage
export function getCurrentUser() {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

// Helper para verificar se está autenticado
export function isAuthenticated(): boolean {
  return !!getStoredToken();
}
