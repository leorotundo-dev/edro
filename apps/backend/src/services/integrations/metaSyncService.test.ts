import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockSyncInstagramMetrics,
  mockRecomputeClientLearningRules,
  mockComputeClientCopyRoi,
} = vi.hoisted(() => ({
  mockSyncInstagramMetrics: vi.fn(),
  mockRecomputeClientLearningRules: vi.fn(),
  mockComputeClientCopyRoi: vi.fn(),
}));

vi.mock('./instagramSyncService', () => ({
  syncInstagramMetrics: (...args: any[]) => mockSyncInstagramMetrics(...args),
}));

vi.mock('../learningEngine', () => ({
  recomputeClientLearningRules: (...args: any[]) => mockRecomputeClientLearningRules(...args),
}));

vi.mock('../copyRoiService', () => ({
  computeClientCopyRoi: (...args: any[]) => mockComputeClientCopyRoi(...args),
}));

import { syncMetaPerformanceForClient } from './metaSyncService';

describe('metaSyncService.syncMetaPerformanceForClient', () => {
  beforeEach(() => {
    mockSyncInstagramMetrics.mockReset();
    mockRecomputeClientLearningRules.mockReset();
    mockComputeClientCopyRoi.mockReset();
    mockRecomputeClientLearningRules.mockResolvedValue(undefined);
    mockComputeClientCopyRoi.mockResolvedValue(undefined);
  });

  it('delegates to the canonical Instagram sync and keeps the legacy shape', async () => {
    mockSyncInstagramMetrics.mockResolvedValueOnce({
      synced: 2,
      skipped: 1,
      errors: [{ format_id: 'fmt-1', error: 'rate limited' }],
    });

    const result = await syncMetaPerformanceForClient('tenant-1', 'client-1');

    expect(mockSyncInstagramMetrics).toHaveBeenCalledWith('tenant-1', 'client-1');
    expect(result).toEqual({
      synced: 2,
      skipped: 1,
      errors: ['format fmt-1: rate limited'],
    });
    expect(mockRecomputeClientLearningRules).toHaveBeenCalledWith('tenant-1', 'client-1');
    expect(mockComputeClientCopyRoi).toHaveBeenCalledWith('tenant-1', 'client-1');
  });

  it('does not recompute learning rules when nothing was synced', async () => {
    mockSyncInstagramMetrics.mockResolvedValueOnce({
      synced: 0,
      skipped: 3,
      errors: [],
    });

    const result = await syncMetaPerformanceForClient('tenant-1', 'client-1');

    expect(result.synced).toBe(0);
    expect(mockRecomputeClientLearningRules).not.toHaveBeenCalled();
    expect(mockComputeClientCopyRoi).not.toHaveBeenCalled();
  });
});
