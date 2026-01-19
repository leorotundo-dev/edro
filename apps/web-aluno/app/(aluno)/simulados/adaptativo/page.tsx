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
}

const formatDuration = (minutes?: number) => {
  if (!minutes) return '--';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
};

export default function SimuladosAdaptativoPage() {
  const [simulados, setSimulados] = useState<Simulado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSimuladoId, setSelectedSimuladoId] = useState<string | null>(null);

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
          setError('Nao foi possivel carregar os simulados adaptativos.');
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

  const availableSimulados = useMemo(
    () => simulados.filter((simulado) => simulado.status !== 'completed'),
    [simulados]
  );

  useEffect(() => {
    if (availableSimulados.length === 0) {
      setSelectedSimuladoId(null);
      return;
    }
    const stillAvailable = availableSimulados.some((item) => item.id === selectedSimuladoId);
    if (!selectedSimuladoId || !stillAvailable) {
      setSelectedSimuladoId(availableSimulados[0].id);
    }
  }, [availableSimulados, selectedSimuladoId]);

  const selectedSimulado = useMemo(
    () => availableSimulados.find((item) => item.id === selectedSimuladoId),
    [availableSimulados, selectedSimuladoId]
  );

  const selectedIndex = useMemo(() => {
    if (!selectedSimulado) return -1;
    return availableSimulados.findIndex((item) => item.id === selectedSimulado.id);
  }, [availableSimulados, selectedSimulado]);

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

  if (availableSimulados.length === 0) {
    return (
      <div className="mx-auto max-w-md px-5 py-10">
        <Card className="p-6 text-center">
          <h3 className="text-lg font-title font-semibold text-text-main mb-2">Nenhum simulado disponivel</h3>
          <p className="text-text-muted">Assim que novos simulados forem liberados, eles aparecem aqui.</p>
          <div className="mt-4 flex justify-center">
            <Link href="/simulados">
              <Button variant="outline">Ver todos</Button>
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
            <p className="text-[11px] uppercase tracking-[0.25em] text-text-muted">Modo adaptativo</p>
            <h1 className="text-lg font-title font-semibold text-text-main">Simulado adaptativo</h1>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-light shadow-soft">
            <span className="material-symbols-outlined text-primary">bolt</span>
          </div>
        </header>

        <Card className="space-y-3 border border-secondary-lilac/40 bg-surface-light p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs text-text-muted">Escolha o simulado do dia</p>
              <h2 className="text-base font-title font-semibold text-text-main">Selecao adaptativa</h2>
            </div>
            <Badge variant="primary">Adaptativo</Badge>
          </div>
          <ProgressBar
            value={selectedIndex >= 0 ? selectedIndex + 1 : 0}
            max={availableSimulados.length}
            label="Disponiveis"
            size="sm"
            showPercentage
          />
          <p className="text-xs text-text-muted">
            O sistema ajusta a dificuldade enquanto voce responde, focando no que mais cai.
          </p>
        </Card>

        <div className="space-y-3">
          {availableSimulados.map((simulado, index) => {
            const isSelected = simulado.id === selectedSimuladoId;
            const shortLabel = String.fromCharCode(65 + (index % 26));

            return (
              <button
                key={simulado.id}
                type="button"
                onClick={() => setSelectedSimuladoId(simulado.id)}
                className={`flex w-full items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-left transition ${
                  isSelected
                    ? 'border-primary-500 bg-primary/10'
                    : 'border-secondary-lilac/40 bg-surface-light hover:border-primary/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${
                      isSelected ? 'bg-primary text-white' : 'bg-secondary-bg text-text-main'
                    }`}
                  >
                    {shortLabel}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-main">{simulado.title}</p>
                    <p className="text-xs text-text-muted">
                      {simulado.exam_board} - {simulado.total_questions} questoes - {formatDuration(simulado.duration_minutes)}
                    </p>
                  </div>
                </div>
                <span
                  className={`material-symbols-outlined text-lg ${isSelected ? 'text-primary' : 'text-secondary-lilac'}`}
                >
                  {isSelected ? 'check_circle' : 'radio_button_unchecked'}
                </span>
              </button>
            );
          })}
        </div>

        {selectedSimulado && (
          <Card className="space-y-2 border border-secondary-lilac/40 bg-surface-light p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Resumo</p>
              <Badge variant="gray">{selectedSimulado.exam_board}</Badge>
            </div>
            <h3 className="text-base font-title font-semibold text-text-main">{selectedSimulado.title}</h3>
            <p className="text-sm text-text-muted">{selectedSimulado.description}</p>
            {selectedSimulado.topics.length > 0 && (
              <p className="text-xs text-text-muted">
                Topicos: {selectedSimulado.topics.slice(0, 4).join(', ')}
              </p>
            )}
          </Card>
        )}

        <div className="flex flex-col gap-3">
          {selectedSimulado ? (
            <Link href={`/simulados/${selectedSimulado.id}`}>
              <Button className="w-full">Iniciar adaptativo</Button>
            </Link>
          ) : (
            <Button className="w-full" variant="outline" disabled>
              Selecione um simulado
            </Button>
          )}
          <Link href="/simulados">
            <Button variant="outline" className="w-full">Ver todos os simulados</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
