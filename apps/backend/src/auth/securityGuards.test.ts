import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import fastify, { type FastifyInstance } from 'fastify';
import jwt from '@fastify/jwt';

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
}));

const mfaRolloutState = vi.hoisted(() => ({
  enforced: true,
}));

vi.mock('../db', () => ({
  query: (...args: any[]) => mockQuery(...args),
}));

vi.mock('../audit/securityLog', () => ({
  securityLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../env', () => ({
  get enforcePrivilegedMfa() {
    return mfaRolloutState.enforced;
  },
}));

import { authGuard } from './rbac';
import { tenantGuard } from './tenantGuard';
import { requireClientPerm } from './clientPerms';

let app: FastifyInstance;
let adminNoMfaToken: string;
let adminWithMfaToken: string;
let viewerToken: string;
let staffToken: string;

beforeAll(async () => {
  app = fastify({ logger: false });
  await app.register(jwt, { secret: 'test-secret-key-long-enough' });

  app.get('/protected', { preHandler: authGuard }, async () => ({ ok: true }));
  app.get('/tenant-only', { preHandler: [authGuard, tenantGuard()] }, async () => ({ ok: true }));
  app.get(
    '/clients/:clientId/test',
    { preHandler: [authGuard, tenantGuard(), requireClientPerm('read')] },
    async () => ({ ok: true }),
  );

  await app.ready();

  adminNoMfaToken = app.jwt.sign({
    sub: 'user-admin',
    email: 'admin@edro.digital',
    role: 'admin',
    tenant_id: 'tenant-1',
    mfa: false,
  });

  adminWithMfaToken = app.jwt.sign({
    sub: 'user-admin',
    email: 'admin@edro.digital',
    role: 'admin',
    tenant_id: 'tenant-1',
    mfa: true,
  });

  viewerToken = app.jwt.sign({
    sub: 'user-viewer',
    email: 'viewer@edro.digital',
    role: 'viewer',
    tenant_id: 'tenant-1',
  });

  staffToken = app.jwt.sign({
    sub: 'user-staff',
    email: 'staff@edro.digital',
    role: 'staff',
    tenant_id: 'tenant-1',
  });
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  mockQuery.mockReset();
  mfaRolloutState.enforced = true;
});

describe('authGuard', () => {
  it('blocks privileged users without MFA', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { authorization: `Bearer ${adminNoMfaToken}` },
    });

    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body)).toEqual({ error: 'mfa_required' });
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('allows non-privileged users without MFA', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { authorization: `Bearer ${viewerToken}` },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ ok: true });
  });

  it('allows privileged users without MFA when rollout enforcement is disabled', async () => {
    mfaRolloutState.enforced = false;

    const res = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { authorization: `Bearer ${adminNoMfaToken}` },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ ok: true });
  });
});

describe('tenantGuard', () => {
  it('blocks users that are not members of the tenant', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await app.inject({
      method: 'GET',
      url: '/tenant-only',
      headers: { authorization: `Bearer ${adminWithMfaToken}` },
    });

    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body)).toEqual({ error: 'not_member' });
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('FROM tenant_users'),
      ['tenant-1', 'user-admin'],
    );
  });

  it('allows tenant members through the guard chain', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ exists: 1 }] });

    const res = await app.inject({
      method: 'GET',
      url: '/tenant-only',
      headers: { authorization: `Bearer ${adminWithMfaToken}` },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ ok: true });
  });
});

describe('requireClientPerm', () => {
  it('blocks lateral access when the client is scoped and the user lacks permission', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ exists: 1 }] })
      .mockResolvedValueOnce({ rows: [{ total: 1 }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await app.inject({
      method: 'GET',
      url: '/clients/client-42/test',
      headers: { authorization: `Bearer ${staffToken}` },
    });

    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body)).toEqual({
      error: 'client_forbidden',
      perm: 'read',
      client_id: 'client-42',
    });
  });

  it('allows access when the tenant has no scoped client permissions for that client', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ exists: 1 }] })
      .mockResolvedValueOnce({ rows: [{ total: 0 }] });

    const res = await app.inject({
      method: 'GET',
      url: '/clients/client-42/test',
      headers: { authorization: `Bearer ${staffToken}` },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ ok: true });
  });
});
