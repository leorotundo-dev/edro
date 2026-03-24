import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
}));

vi.mock('../db', () => ({
  query: (...args: any[]) => mockQuery(...args),
}));

vi.mock('../env', () => ({
  env: {
    DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/edro_test',
    JWT_SECRET: 'test-jwt-secret',
    META_VERIFY_TOKEN: 'test-meta-verify-token',
    META_APP_SECRET: 'test-meta-app-secret',
    WHATSAPP_WEBHOOK_SECRET: 'test-whatsapp-webhook-secret',
  },
}));

import { resolveTenantFromPage } from './webhookInstagram';

describe('webhookInstagram.resolveTenantFromPage', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('resolves the tenant from the Meta connector payload page_id', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          tenant_id: 'tenant-1',
          client_id: 'client-1',
        },
      ],
    });

    const result = await resolveTenantFromPage('page-123');

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("c.provider = 'meta'"),
      ['page-123'],
    );
    expect(result).toEqual({
      tenantId: 'tenant-1',
      clientId: 'client-1',
    });
  });
});
