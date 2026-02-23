import crypto from 'crypto';
import { FastifyInstance } from 'fastify';
import { authGuard } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';
import { encryptJSON } from '../security/secrets';
import { query } from '../db';
import { env } from '../env';

type OAuthSession = {
  pages: Array<{
    id: string;
    name: string;
    picture: string | null;
    access_token: string;
    instagram_business_id: string | null;
  }>;
  longLivedToken: string;
  clientId: string;
  tenantId: string;
  expiresAt: number;
};

// In-memory session store with 10-minute TTL.
// Sufficient for agency use — very few concurrent OAuth flows.
const sessions = new Map<string, OAuthSession>();
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of sessions) {
    if (v.expiresAt < now) sessions.delete(k);
  }
}, 60_000);

const GRAPH_VERSION = env.META_GRAPH_VERSION || 'v19.0';

export default async function metaOAuthRoutes(app: FastifyInstance) {

  // ── 1. Iniciar OAuth ────────────────────────────────────────────────────────
  // Chamado pelo popup window: GET /api/auth/meta/start?clientId=X
  // Redireciona para o Facebook OAuth dialog.
  app.get('/auth/meta/start', { preHandler: [authGuard, tenantGuard()] }, async (request: any, reply) => {
    if (!env.META_APP_ID) {
      return reply.status(503).send('META_APP_ID não configurado. Configure nas variáveis de ambiente.');
    }

    const { clientId } = request.query as { clientId?: string };
    const state = crypto.randomUUID();
    const redirectUri = env.META_REDIRECT_URI || `${env.PUBLIC_API_URL || ''}/api/auth/meta/callback`;

    // Store state → session mapping (will be populated on callback)
    sessions.set(state, {
      pages: [],
      longLivedToken: '',
      clientId: clientId || '',
      tenantId: (request.user as any).tenant_id,
      expiresAt: Date.now() + 10 * 60_000,
    });

    const scope = [
      'pages_show_list',
      'pages_read_engagement',
      'instagram_basic',
      'instagram_manage_insights',
    ].join(',');

    const fbUrl =
      `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth` +
      `?client_id=${env.META_APP_ID}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${state}` +
      `&scope=${scope}` +
      `&response_type=code`;

    return reply.redirect(fbUrl);
  });

  // ── 2. Callback do Facebook ─────────────────────────────────────────────────
  // Sem authGuard — é uma requisição de redirect do Facebook.
  // Troca code por tokens, busca páginas e redireciona o popup para o seletor de página.
  app.get('/auth/meta/callback', async (request: any, reply) => {
    const { code, state, error: fbError } = request.query as {
      code?: string;
      state?: string;
      error?: string;
    };

    const webUrl = env.WEB_URL || 'http://localhost:3000';

    if (fbError || !code || !state) {
      const msg = encodeURIComponent(fbError || 'cancelled');
      return reply.redirect(`${webUrl}/auth/meta/select?error=${msg}`);
    }

    const session = sessions.get(state);
    if (!session || session.expiresAt < Date.now()) {
      return reply.redirect(`${webUrl}/auth/meta/select?error=state_expired`);
    }

    const redirectUri = env.META_REDIRECT_URI || `${env.PUBLIC_API_URL || ''}/api/auth/meta/callback`;

    try {
      // a) Troca code → short-lived user token
      const tokenUrl =
        `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token` +
        `?client_id=${env.META_APP_ID}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&client_secret=${env.META_APP_SECRET}` +
        `&code=${code}`;

      const tokenRes: any = await fetch(tokenUrl).then((r) => r.json());
      if (tokenRes.error) throw new Error(tokenRes.error.message || 'token_exchange_failed');

      // b) Troca short-lived → long-lived user token (60 dias)
      const llUrl =
        `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token` +
        `?grant_type=fb_exchange_token` +
        `&client_id=${env.META_APP_ID}` +
        `&client_secret=${env.META_APP_SECRET}` +
        `&fb_exchange_token=${tokenRes.access_token}`;

      const llRes: any = await fetch(llUrl).then((r) => r.json());
      const longLivedToken: string = llRes.access_token || tokenRes.access_token;

      // c) Listar páginas gerenciadas pelo usuário + conta Instagram vinculada
      const pagesUrl =
        `https://graph.facebook.com/${GRAPH_VERSION}/me/accounts` +
        `?fields=id,name,picture,instagram_business_account` +
        `&access_token=${longLivedToken}`;

      const pagesRes: any = await fetch(pagesUrl).then((r) => r.json());
      const pages = (pagesRes.data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        picture: p.picture?.data?.url || null,
        access_token: p.access_token as string, // page access token (não expira)
        instagram_business_id: (p.instagram_business_account?.id as string) || null,
      }));

      // d) Armazenar com nova key (não expor state no redirect)
      const sessionId = crypto.randomUUID();
      sessions.delete(state);
      sessions.set(sessionId, {
        pages,
        longLivedToken,
        clientId: session.clientId,
        tenantId: session.tenantId,
        expiresAt: Date.now() + 10 * 60_000,
      });

      return reply.redirect(`${webUrl}/auth/meta/select?session=${sessionId}`);
    } catch (err: any) {
      const msg = encodeURIComponent(err?.message || 'token_exchange_failed');
      return reply.redirect(`${webUrl}/auth/meta/select?error=${msg}`);
    }
  });

  // ── 3. Dados da sessão (chamado pelo popup frontend) ────────────────────────
  // GET /api/auth/meta/session/:id
  app.get('/auth/meta/session/:id', { preHandler: [authGuard] }, async (request: any, reply) => {
    const { id } = request.params as { id: string };
    const session = sessions.get(id);
    if (!session || session.expiresAt < Date.now()) {
      return reply.status(404).send({ error: 'session_expired' });
    }
    return reply.send({ pages: session.pages, clientId: session.clientId });
  });

  // ── 4. Salvar página selecionada ────────────────────────────────────────────
  // POST /api/auth/meta/complete
  // Body: { sessionId, pageId }
  app.post('/auth/meta/complete', { preHandler: [authGuard, tenantGuard()] }, async (request: any, reply) => {
    const { sessionId, pageId } = (request.body || {}) as { sessionId?: string; pageId?: string };
    if (!sessionId || !pageId) return reply.status(400).send({ error: 'sessionId and pageId required' });

    const session = sessions.get(sessionId);
    if (!session || session.expiresAt < Date.now()) {
      return reply.status(400).send({ error: 'session_expired' });
    }

    const page = session.pages.find((p) => p.id === pageId);
    if (!page) return reply.status(400).send({ error: 'page_not_found' });

    const tenantId = (request.user as any).tenant_id as string;
    const clientId = session.clientId;

    if (!clientId) return reply.status(400).send({ error: 'clientId missing from session' });

    // Criptografar o page_access_token (não expira enquanto relação user-page existir)
    const enc = await encryptJSON({ access_token: page.access_token });

    await query(
      `INSERT INTO connectors (tenant_id, client_id, provider, payload, secrets_enc, secrets_meta)
       VALUES ($1,$2,'meta',$3::jsonb,$4,$5::jsonb)
       ON CONFLICT (tenant_id, client_id, provider)
       DO UPDATE SET
         payload = EXCLUDED.payload,
         secrets_enc = EXCLUDED.secrets_enc,
         secrets_meta = EXCLUDED.secrets_meta,
         updated_at = now()`,
      [
        tenantId,
        clientId,
        JSON.stringify({
          page_id: page.id,
          page_name: page.name,
          instagram_business_id: page.instagram_business_id,
        }),
        enc.enc,
        JSON.stringify(enc.meta),
      ]
    );

    sessions.delete(sessionId);

    console.log(`[metaOAuth] Saved meta connector for client=${clientId} page="${page.name}"`);
    return reply.send({ ok: true, page_name: page.name });
  });
}
