import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
}));

vi.mock('../db', () => ({
  query: (...args: any[]) => mockQuery(...args),
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
