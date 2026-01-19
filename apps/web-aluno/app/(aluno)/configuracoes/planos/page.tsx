'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, Button, Badge } from '@edro/ui';
import { Star, Zap, Shield } from 'lucide-react';
import { getCurrentUser } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

type ApiPlan = {
  id: string;
  name: string;
  price: number;
};

type PlanMeta = {
  name: string;
  description: string;
  features: string[];
  icon: typeof Shield;
};

const fallbackPlans: ApiPlan[] = [
  { id: 'free', name: 'Free', price: 0 },
  { id: 'pro', name: 'Pro', price: 9.99 },
  { id: 'turbo', name: 'Turbo', price: 19.99 },
];

const planMeta: Record<string, PlanMeta> = {
  free: {
    name: 'Gratis',
    description: 'Comece com 1 edital gratuito.',
    features: ['1 edital gratuito', 'Trilha basica', 'SRS essencial'],
    icon: Shield,
  },
  pro: {
    name: 'Pro',
    description: 'Editais ilimitados e IA completa.',
    features: ['Editais ilimitados', 'Tutor IA', 'Simulados'],
    icon: Star,
  },
  turbo: {
    name: 'Turbo',
    description: 'Performance total para acelerar.',
    features: ['Tudo do Pro', 'IA turbo', 'Prioridade'],
    icon: Zap,
  },
};

const normalizePlan = (plan?: string | null) => {
  const normalized = String(plan || '').trim().toLowerCase();
  if (!normalized || ['free', 'gratis', 'gratuito', 'base'].includes(normalized)) return 'free';
  if (['turbo', 'elite'].includes(normalized)) return 'turbo';
  if (['pro', 'premium', 'premium_month', 'premium_year'].includes(normalized)) return 'pro';
  return 'free';
};

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function ConfiguracoesPlanosPage() {
  const [plans, setPlans] = useState<ApiPlan[]>(fallbackPlans);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadPlans = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_URL}/api/plans`);
        const payload = await res.json();
        if (!res.ok || !payload?.plans) {
          throw new Error(payload?.error || 'Erro ao carregar planos');
        }
        if (active) {
          setPlans(payload.plans);
        }
      } catch (err: any) {
        if (active) {
          setError(err?.message || 'Nao foi possivel carregar planos.');
          setPlans(fallbackPlans);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadPlans();
    return () => {
      active = false;
    };
  }, []);

  const activePlan = useMemo(() => {
    const user = getCurrentUser();
    return normalizePlan(user?.plan ?? null);
  }, []);

  return (
    <div className="container mx-auto px-6 py-8 max-w-6xl space-y-6">
      <div className="flex items-center gap-3">
        <Star className="h-7 w-7 text-primary-600" />
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Planos</h1>
          <p className="text-slate-600">Compare beneficios e faca upgrade quando quiser.</p>
        </div>
      </div>

      <Card className="p-4 border border-amber-200 bg-amber-50">
        <p className="text-sm text-amber-800">
          Primeiro edital gratuito. A partir do segundo, e necessario um plano pago.
        </p>
      </Card>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && (
        <div className="text-sm text-slate-500">Carregando planos...</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const meta = planMeta[plan.id] || {
            name: plan.name,
            description: 'Plano para seu ritmo de estudo.',
            features: [],
            icon: Shield,
          };
          const Icon = meta.icon;
          const isActive = activePlan === normalizePlan(plan.id);
          const priceLabel = plan.price <= 0 ? 'Gratis' : formatCurrency(plan.price);
          return (
            <Card key={plan.id} className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-primary-600" />
                  <h3 className="text-lg font-semibold text-slate-900">{meta.name}</h3>
                </div>
                {isActive && <Badge variant="success">Ativo</Badge>}
              </div>
              <p className="text-sm text-slate-600">{meta.description}</p>
              <p className="text-2xl font-bold text-slate-900">{priceLabel}</p>
              <ul className="space-y-2 text-sm text-slate-600">
                {meta.features.map((feature) => (
                  <li key={feature}>- {feature}</li>
                ))}
              </ul>
              <Button variant={isActive ? 'outline' : 'primary'}>
                {isActive ? 'Plano atual' : 'Escolher'}
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
