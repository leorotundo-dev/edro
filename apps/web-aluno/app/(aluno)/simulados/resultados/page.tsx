'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Card } from '@edro/ui';
import { ProgressBar } from '@/components/ProgressBar';
import { getCurrentUser } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

interface Simulado {
  id: string;
  title: string;
  description: string;
  exam_board: string;
  total_questions: number;
  duration_minutes: number;
  difficulty: number;
  topics: string[];
  status: 'not_started' | 'in_progress' | 'completed';
  lastAttempt?: {
    resultId?: string;
    date: string;
    score: number;
    correctAnswers: number;
    timeSpent: number;
  };
}

const formatMinutes = (minutes?: number) => {
  if (!minutes) return '--';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
};

export default function SimuladosResultadosPage() {
  const [simulados, setSimulados] = useState<Simulado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadSimulados = async () => {
      try {
        setLoading(true);
        setError(null);
        const user = getCurrentUser();
        const userId = user?.id || user?.sub;
        if (!userId) {
          throw new Error('Usuario nao autenticado');
        }
        const token = typeof window !== 'undefined'
          ? localStorage.getItem('token') || localStorage.getItem('edro_token')
          : null;
        const res = await fetch(`${API_URL}/api/users/${userId}/simulados`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        const payload = await res.json();
        if (!res.ok || !payload.success) {
          throw new Error(payload?.error || 'Erro ao carregar simulados');
        }
        if (active) {
          setSimulados(payload.data || []);
        }
      } catch (err) {
        if (active) {
          setError('Nao foi possivel carregar os resultados.');
          setSimulados([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadSimulados();
    return () => {
      active = false;
    };
  }, []);

  const completedSimulados = useMemo(
    () => simulados.filter((simulado) => simulado.status === 'completed' && simulado.lastAttempt),
    [simulados]
  );

  const averageScore = useMemo(() => {
    if (completedSimulados.length === 0) return 0;
    const total = completedSimulados.reduce((sum, simulado) => sum + (simulado.lastAttempt?.score || 0), 0);
    return total / completedSimulados.length;
  }, [completedSimulados]);

  const bestScore = useMemo(() => {
    if (completedSimulados.length === 0) return 0;
    return Math.max(...completedSimulados.map((simulado) => simulado.lastAttempt?.score || 0));
  }, [completedSimulados]);

  const totalTime = useMemo(
    () => completedSimulados.reduce((sum, simulado) => sum + (simulado.lastAttempt?.timeSpent || 0), 0),
    [completedSimulados]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-6 py-8 max-w-5xl">
        <Card className="p-6 text-center">
          <h2 className="text-xl font-title font-semibold text-text-main mb-2">Erro</h2>
          <p className="text-text-muted">{error}</p>
        </Card>
      </div>
    );
  }

  if (completedSimulados.length === 0) {
    return (
      <div className="mx-auto max-w-md px-5 py-10">
        <Card className="p-6 text-center">
          <h3 className="text-lg font-title font-semibold text-text-main mb-2">Nenhum resultado ainda</h3>
          <p className="text-text-muted">Finalize um simulado para ver seu desempenho.</p>
          <div className="mt-4 flex justify-center">
            <Link href="/simulados">
              <Button>Ver simulados</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary-bg/60">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-5 pb-10 pt-6">
        <header className="flex items-center justify-between">
          <Link href="/simulados" className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-light shadow-soft">
            <span className="material-symbols-outlined text-text-muted">arrow_back</span>
          </Link>
          <div className="text-center">
            <p className="text-[11px] uppercase tracking-[0.25em] text-text-muted">Resultados</p>
            <h1 className="text-lg font-title font-semibold text-text-main">Resumo dos simulados</h1>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-light shadow-soft">
            <span className="material-symbols-outlined text-primary">bar_chart</span>
          </div>
        </header>

        <Card className="space-y-3 border border-secondary-lilac/40 bg-surface-light p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs text-text-muted">Desempenho geral</p>
              <h2 className="text-base font-title font-semibold text-text-main">Nota e progresso</h2>
            </div>
            <Badge variant="primary">{completedSimulados.length} concluidos</Badge>
          </div>
          <ProgressBar value={averageScore} max={100} label="Media geral" size="sm" showPercentage />
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-secondary-lilac/40 bg-secondary-bg p-3">
              <p className="text-xs text-text-muted">Tempo total</p>
              <p className="text-lg font-title font-semibold text-text-main">{formatMinutes(totalTime)}</p>
            </div>
            <div className="rounded-xl border border-secondary-lilac/40 bg-secondary-bg p-3">
              <p className="text-xs text-text-muted">Melhor resultado</p>
              <p className="text-lg font-title font-semibold text-text-main">{bestScore ? `${bestScore.toFixed(0)}%` : '--'}</p>
            </div>
          </div>
          <div className="rounded-xl border border-secondary-lilac/40 bg-secondary-bg p-3">
            <p className="text-xs text-text-muted">Nota geral</p>
            <p className="text-xl font-title font-semibold text-text-main">
              {averageScore ? (averageScore / 10).toFixed(1) : '--'}
            </p>
            <p className="text-[11px] text-text-muted">Escala 0-10</p>
          </div>
        </Card>

        <div className="space-y-3">
          {completedSimulados.map((simulado) => {
            const attempt = simulado.lastAttempt;
            return (
              <Card key={simulado.id} className="space-y-3 border border-secondary-lilac/40 bg-surface-light p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Simulado</p>
                    <h3 className="text-base font-title font-semibold text-text-main">{simulado.title}</h3>
                    <p className="text-xs text-text-muted">{simulado.exam_board}</p>
                  </div>
                  <Badge variant="success">Concluido</Badge>
                </div>
                <ProgressBar
                  value={attempt?.score || 0}
                  max={100}
                  label="Desempenho"
                  size="sm"
                  showPercentage
                />
                <div className="flex flex-wrap gap-3 text-xs text-text-muted">
                  <span>{attempt?.correctAnswers ?? 0}/{simulado.total_questions} acertos</span>
                  <span>{formatMinutes(attempt?.timeSpent)}</span>
                  <span>{attempt ? new Date(attempt.date).toLocaleDateString('pt-BR') : '--'}</span>
                </div>
                <Link href={`/simulados/${simulado.id}`}>
                  <Button variant="outline" className="w-full">Ver detalhes</Button>
                </Link>
              </Card>
            );
          })}
        </div>

        <div className="flex flex-col gap-3">
          <Link href="/historico/erros">
            <Button className="w-full">Revisar erros</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline" className="w-full">Voltar ao inicio</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
