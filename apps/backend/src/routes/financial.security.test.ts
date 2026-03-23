import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import fastify, { type FastifyInstance } from 'fastify';
import jwt from '@fastify/jwt';

const { mockQuery, mockPoolQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockPoolQuery: vi.fn(),
}));

vi.mock('../db', () => ({
  query: (...args: any[]) => mockQuery(...args),
  pool: {
    query: (...args: any[]) => mockPoolQuery(...args),
  },
}));

vi.mock('../env', () => ({
  enforcePrivilegedMfa: false,
}));

vi.mock('../providers/omie/omieClient', () => ({
  omieClient: {
    ok: () => false,
  },
}));

import financialRoutes from './financial';

let app: FastifyInstance;
let adminToken: string;

beforeAll(async () => {
  app = fastify({ logger: false });
  await app.register(jwt, { secret: 'test-secret-key-long-enough' });
  await app.register(financialRoutes, { prefix: '/api' });
  await app.ready();

  adminToken = app.jwt.sign({
    sub: 'user-admin',
    email: 'admin@edro.digital',
    role: 'admin',
    tenant_id: 'tenant-1',
    mfa: true,
  });
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  mockQuery.mockReset();
  mockPoolQuery.mockReset();
});

describe('financial routes tenant scoping', () => {
  it('scopes contract lookup by tenant', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ exists: 1 }] });
    mockPoolQuery.mockResolvedValueOnce({
      rows: [{ id: 'contract-1', tenant_id: 'tenant-1', client_name: 'Cliente Teste' }],
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/financial/contracts/contract-1',
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(200);
    expect(mockPoolQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE sc.id = $1 AND sc.tenant_id = $2'),
      ['contract-1', 'tenant-1'],
    );
  });

  it('scopes proposal lookup by tenant', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ exists: 1 }] });
    mockPoolQuery.mockResolvedValueOnce({
      rows: [{ id: 'proposal-1', tenant_id: 'tenant-1', client_name: 'Cliente Teste' }],
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/financial/proposals/proposal-1',
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(200);
    expect(mockPoolQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE p.id = $1 AND p.tenant_id = $2'),
      ['proposal-1', 'tenant-1'],
    );
  });
});
