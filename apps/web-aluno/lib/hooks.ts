/**
 * React Hooks Customizados
 * 
 * Hooks reutilizáveis para o frontend do aluno
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getCurrentUser, AUTH_EVENT } from './api';
import { useState, useEffect, useRef } from 'react';

// ============================================
// AUTH HOOKS
// ============================================

export function useAuth() {
  const [user, setUser] = useState(getCurrentUser());
  const [isAuthenticated, setIsAuthenticated] = useState(!!api.getToken());

  useEffect(() => {
    setUser(getCurrentUser());
    setIsAuthenticated(!!api.getToken());
  }, []);

  useEffect(() => {
    const handleAuthEvent = (event: Event) => {
      const detail = (event as CustomEvent<{ action?: string }>).detail;
      if (!detail?.action) return;
      setUser(getCurrentUser());
      setIsAuthenticated(!!api.getToken());
    };

    if (typeof window !== 'undefined') {
      window.addEventListener(AUTH_EVENT, handleAuthEvent as EventListener);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(AUTH_EVENT, handleAuthEvent as EventListener);
      }
    };
  }, []);

  const login = async (email: string, password: string) => {
    const data = await api.login(email, password);
    setUser(data.user);
    setIsAuthenticated(true);
    return data;
  };

  const register = async (email: string, password: string, name: string) => {
    const data = await api.register(email, password, name);
    setUser(data.user);
    setIsAuthenticated(true);
    return data;
  };

  const logout = () => {
    api.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  return {
    user,
    isAuthenticated,
    login,
    register,
    logout,
  };
}

// ============================================
// TRAIL HOOKS
// ============================================

export function useTrailToday() {
  const user = getCurrentUser();
  
  return useQuery({
    queryKey: ['trail', 'today', user?.id],
    queryFn: () => api.getTrailToday(user?.id),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

export function useDiagnosis() {
  const user = getCurrentUser();
  
  return useQuery({
    queryKey: ['diagnosis', user?.id],
    queryFn: () => api.getDiagnosis(user?.id),
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
}

export function useGenerateTrail() {
  const queryClient = useQueryClient();
  const user = getCurrentUser();

  return useMutation({
    mutationFn: (params: { tempo_disponivel?: number; dias_ate_prova?: number }) =>
      api.generateTrail({ user_id: user?.id, ...params }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trail', 'today'] });
    },
  });
}

// ============================================
// SRS HOOKS
// ============================================

export function useSRSToday() {
  const user = getCurrentUser();

  return useQuery({
    queryKey: ['srs', 'today', user?.id],
    queryFn: () => api.getSRSToday(user?.id),
    enabled: !!user?.id,
  });
}

export function useReviewSRS() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { cardId: string; grade: number; timeSpent: number }) =>
      api.reviewSRS(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['srs', 'today'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useEnrollInSRS() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dropId: string) => api.enrollInSRS(dropId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['srs'] });
    },
  });
}

// ============================================
// DROP HOOKS
// ============================================

export function useDrops(filters?: { discipline?: string; difficulty?: number }) {
  return useQuery({
    queryKey: ['drops', filters],
    queryFn: () => api.getDrops(filters),
  });
}

export function useDrop(id: string) {
  return useQuery({
    queryKey: ['drop', id],
    queryFn: () => api.getDropById(id),
    enabled: !!id,
  });
}

// ============================================
// LEARNING HOOKS
// ============================================

export function useLogLearning() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      dropId: string;
      timeSpent: number;
      completed: boolean;
      understood: boolean;
    }) => api.logLearning(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trail'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useCompleteTrailItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      itemId: string;
      completed: boolean;
      timeSpent: number;
      understood?: boolean;
    }) => api.completeTrailItem(params.itemId, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trail'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

// ============================================
// TRACKING HOOKS
// ============================================

export function useSession() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const sessionRef = useRef<string | null>(null);

  const startSession = async () => {
    const data = await api.startSession();
    const id = data.session?.id || data.sessionId || null;
    setSessionId(id);
    sessionRef.current = id;
    return data;
  };

  const endSession = async () => {
    const id = sessionRef.current;
    if (id) {
      await api.endSession(id);
      setSessionId(null);
      sessionRef.current = null;
    }
  };

  useEffect(() => {
    // Iniciar sessão ao montar
    startSession();

    // Encerrar sessão ao desmontar
    return () => {
      const id = sessionRef.current;
      if (id) {
        api.endSession(id);
      }
    };
  }, []);

  return {
    sessionId,
    startSession,
    endSession,
  };
}

export function useTrackEvent() {
  return useMutation({
    mutationFn: (event: { event_type: string; event_data?: any }) =>
      api.trackEvent(event),
  });
}

export function useTrackCognitive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      session_id: string;
      foco?: number;
      energia?: number;
      velocidade?: number;
      tempo_por_drop?: number;
    }) => api.trackCognitive(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracking', 'state'] });
    },
  });
}

export function useTrackEmotional() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      session_id: string;
      humor_auto_reportado?: number;
      frustracao_inferida?: boolean;
      ansiedade_inferida?: boolean;
      motivacao_inferida?: boolean;
      contexto?: string;
    }) => api.trackEmotional(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracking', 'state'] });
    },
  });
}

export function useCurrentState() {
  return useQuery({
    queryKey: ['tracking', 'state'],
    queryFn: () => api.getCurrentState(),
    refetchInterval: 60 * 1000, // Atualiza a cada 1 minuto
  });
}

// ============================================
// STATS HOOKS
// ============================================

export function useStats() {
  const user = getCurrentUser();

  return useQuery({
    queryKey: ['stats', user?.id],
    queryFn: () => api.getStats(user?.id),
    enabled: !!user?.id,
  });
}

export function useDailyPlan() {
  const user = getCurrentUser();

  return useQuery({
    queryKey: ['dailyPlan', user?.id],
    queryFn: () => api.getDailyPlan(user?.id),
    enabled: !!user?.id,
  });
}

// ============================================
// UTILITY HOOKS
// ============================================

export function useTimer(initialSeconds: number = 0) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning) {
      interval = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRunning]);

  const start = () => setIsRunning(true);
  const pause = () => setIsRunning(false);
  const reset = () => {
    setSeconds(0);
    setIsRunning(false);
  };

  const formatTime = () => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    seconds,
    isRunning,
    start,
    pause,
    reset,
    formatTime,
  };
}

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue] as const;
}
