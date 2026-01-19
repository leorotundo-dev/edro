import { FastifyInstance } from 'fastify';

const PLANS = [
  { id: 'free', name: 'Free', price: 0 },
  { id: 'pro', name: 'Pro', price: 9.99 },
  { id: 'turbo', name: 'Turbo', price: 19.99 }
];

export default async function plansRoutes(app: FastifyInstance) {
  app.get('/plans', async () => {
    return { plans: PLANS };
  });
}
