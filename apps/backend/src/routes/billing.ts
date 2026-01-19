import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import Stripe from 'stripe';
import { CreditsService } from '../services/creditsService';
import { query } from '../db';

const stripeKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_API_KEY;
const stripe = stripeKey ? new Stripe(stripeKey, { apiVersion: '2023-10-16' }) : null;

const CREDIT_PACKAGES = [
  {
    id: 'credits_100',
    name: '100 creditos',
    credits: 100,
    price_cents: 900,
    price_id: process.env.STRIPE_CREDIT_100_PRICE_ID || null,
  },
  {
    id: 'credits_500',
    name: '500 creditos',
    credits: 500,
    price_cents: 2900,
    price_id: process.env.STRIPE_CREDIT_500_PRICE_ID || null,
  },
  {
    id: 'credits_2000',
    name: '2000 creditos',
    credits: 2000,
    price_cents: 8900,
    price_id: process.env.STRIPE_CREDIT_2000_PRICE_ID || null,
  },
];

function resolveUserId(request: FastifyRequest) {
  const anyReq: any = request;
  return anyReq.user?.id || anyReq.user?.sub || null;
}

async function hasLedgerEntry(userId: string, sessionId: string) {
  const { rows } = await query<{ id: string }>(
    `
      SELECT id
      FROM user_credit_ledger
      WHERE user_id = $1
        AND metadata->>'stripe_session_id' = $2
      LIMIT 1
    `,
    [userId, sessionId]
  );
  return rows.length > 0;
}

export default async function billingRoutes(app: FastifyInstance) {
  app.get('/billing/packages', async (_request, reply) => {
    return reply.send({
      success: true,
      data: CREDIT_PACKAGES.map((pkg) => ({
        id: pkg.id,
        name: pkg.name,
        credits: pkg.credits,
        price_cents: pkg.price_cents,
        currency: 'BRL',
      })),
    });
  });

  app.post(
    '/billing/checkout',
    async (
      request: FastifyRequest<{ Body: { package_id?: string } }>,
      reply: FastifyReply
    ) => {
      const userId = resolveUserId(request);
      if (!userId) {
        return reply.status(401).send({ success: false, error: 'Usuario nao autenticado' });
      }
      if (!stripe) {
        return reply.status(400).send({ success: false, error: 'Stripe nao configurado' });
      }
      const packageId = String(request.body?.package_id || '').trim();
      const pkg = CREDIT_PACKAGES.find((item) => item.id === packageId);
      if (!pkg) {
        return reply.status(400).send({ success: false, error: 'Pacote invalido' });
      }
      if (!pkg.price_id) {
        return reply.status(400).send({ success: false, error: 'Price ID nao configurado' });
      }

      const successUrl =
        process.env.STRIPE_SUCCESS_URL ||
        'http://localhost:3000/billing/success?session_id={CHECKOUT_SESSION_ID}';
      const cancelUrl =
        process.env.STRIPE_CANCEL_URL ||
        'http://localhost:3000/billing/canceled';

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        client_reference_id: userId,
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          package_id: pkg.id,
          credits: String(pkg.credits),
          user_id: userId,
        },
        line_items: [
          {
            price: pkg.price_id,
            quantity: 1,
          },
        ],
      });

      return reply.send({
        success: true,
        data: {
          session_id: session.id,
          url: session.url,
        },
      });
    }
  );

  app.get(
    '/billing/checkout/verify',
    async (
      request: FastifyRequest<{ Querystring: { session_id?: string } }>,
      reply: FastifyReply
    ) => {
      const userId = resolveUserId(request);
      if (!userId) {
        return reply.status(401).send({ success: false, error: 'Usuario nao autenticado' });
      }
      if (!stripe) {
        return reply.status(400).send({ success: false, error: 'Stripe nao configurado' });
      }
      const sessionId = String(request.query?.session_id || '').trim();
      if (!sessionId) {
        return reply.status(400).send({ success: false, error: 'session_id obrigatorio' });
      }

      if (await hasLedgerEntry(userId, sessionId)) {
        return reply.send({ success: true, data: { credited: true } });
      }

      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status !== 'paid') {
        return reply.status(400).send({ success: false, error: 'Pagamento pendente' });
      }

      const sessionUserId = session.client_reference_id || session.metadata?.user_id;
      if (sessionUserId !== userId) {
        return reply.status(403).send({ success: false, error: 'Sessao nao pertence ao usuario' });
      }

      const creditsRaw = session.metadata?.credits || '';
      const credits = Number.parseInt(String(creditsRaw), 10);
      if (!Number.isFinite(credits) || credits <= 0) {
        return reply.status(400).send({ success: false, error: 'Creditos invalidos' });
      }

      await CreditsService.addCredits({
        userId,
        amount: credits,
        reason: 'stripe_checkout',
        metadata: {
          stripe_session_id: sessionId,
          package_id: session.metadata?.package_id || null,
        },
      });

      return reply.send({ success: true, data: { credited: true, credits } });
    }
  );
}
