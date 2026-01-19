export type UserPlan = 'FREE' | 'PRO' | 'TURBO';

export interface Plan {
  id: UserPlan;
  name: string;
  description: string;
  priceCents: number;
}

export const PLANS: Plan[] = [
  {
    id: 'FREE',
    name: 'Free',
    description: 'Plano gratuito com funções básicas do Edro.',
    priceCents: 0
  },
  {
    id: 'PRO',
    name: 'Pro',
    description: 'Mais recursos de memorização e questões.',
    priceCents: 4900
  },
  {
    id: 'TURBO',
    name: 'Turbo',
    description: 'Tudo no máximo + IA em tudo.',
    priceCents: 9900
  }
];
