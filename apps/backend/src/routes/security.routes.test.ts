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

import securityRoutes from './security';

let app: FastifyInstance;
let adminToken: string;
let staffToken: string;

beforeAll(async () => {
  app = fastify({ logger: false });
  await app.register(jwt, { secret: 'test-secret-key-long-enough' });
  await app.register(securityRoutes, { prefix: '/api' });
  await app.ready();

  adminToken = app.jwt.sign({
    sub: 'user-admin',
    email: 'admin@edro.digital',
    role: 'admin',
    tenant_id: 'tenant-1',
    mfa: true,
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
  mockPoolQuery.mockReset();
});

describe('GET /api/security/dashboard', () => {
  it('denies users without portfolio permission', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ exists: 1 }] });

    const res = await app.inject({
      method: 'GET',
      url: '/api/security/dashboard',
      headers: { authorization: `Bearer ${staffToken}` },
    });

    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body)).toEqual({ error: 'Sem permissao.', perm: 'portfolio:read' });
    expect(mockPoolQuery).not.toHaveBeenCalled();
  });

  it('scopes the access timeline aggregation to the authenticated tenant', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ exists: 1 }] });
    mockPoolQuery
      .mockResolvedValueOnce({
        rows: [{ total: 2, high_risk: 1, blocked: 0, last_7d: 2 }],
      })
      .mockResolvedValueOnce({
        rows: [{ total: 4, suspicious: 1, reads: 3, updates: 1, deletes: 0 }],
      })
      .mockResolvedValueOnce({
        rows: [{ day: '2026-03-21', total_accesses: 4 }],
      });

    const res = await app.inject({
      method: 'GET',
      url: '/api/security/dashboard',
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.access_timeline).toEqual([{ day: '2026-03-21', total_accesses: 4 }]);

    expect(mockPoolQuery).toHaveBeenCalledTimes(3);
    expect(mockPoolQuery).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('FROM catalog_snapshot_access_log'),
      ['tenant-1'],
    );
    expect(mockPoolQuery.mock.calls[2]?.[0]).toContain('WHERE tenant_id=$1');
  });
});
