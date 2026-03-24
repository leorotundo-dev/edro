import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockQuery, mockFetch } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockFetch: vi.fn(),
}));

vi.mock('../../db', () => ({
  query: (...args: any[]) => mockQuery(...args),
}));

vi.mock('../../env', () => ({
  env: {
    GOOGLE_CALENDAR_WEBHOOK_URL: 'https://example.com/webhook/google-calendar',
    GOOGLE_CLIENT_SECRET: 'calendar-secret',
  },
}));

vi.mock('../../jobs/jobQueue', () => ({
  enqueueJob: vi.fn(),
}));

vi.mock('../../repos/clientsRepo', () => ({
  ensureInternalClient: vi.fn(),
}));

vi.mock('../../repos/meetingParticipantsRepo', () => ({
  syncMeetingParticipantsFromCalendarPayload: vi.fn(),
}));

import { watchCalendar } from './googleCalendarService';

describe('googleCalendarService.watchCalendar', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
  });

  it('stops the previous channel and uses a fresh channel id on renewal', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{
          channel_id: 'old-channel-id',
          resource_id: 'old-resource-id',
          access_token: 'cached-access-token',
          refresh_token: 'refresh-token',
          token_expiry: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        }],
      })
      .mockResolvedValueOnce({
        rows: [{
          access_token: 'cached-access-token',
          refresh_token: 'refresh-token',
          token_expiry: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        }],
      })
      .mockResolvedValueOnce({ rows: [] });

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        text: async () => '',
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ resourceId: 'new-resource-id' }),
      });

    await watchCalendar('tenant-1');

    expect(mockFetch).toHaveBeenCalledTimes(2);

    const stopCall = mockFetch.mock.calls[0];
    expect(stopCall[0]).toBe('https://www.googleapis.com/calendar/v3/channels/stop');
    expect(JSON.parse(stopCall[1].body)).toEqual({
      id: 'old-channel-id',
      resourceId: 'old-resource-id',
    });

    const watchCall = mockFetch.mock.calls[1];
    expect(watchCall[0]).toBe('https://www.googleapis.com/calendar/v3/calendars/primary/events/watch');

    const watchBody = JSON.parse(watchCall[1].body);
    expect(watchBody.id).not.toBe('old-channel-id');
    expect(watchBody.address).toBe('https://example.com/webhook/google-calendar');

    const updateCall = mockQuery.mock.calls.find(([sql]) =>
      typeof sql === 'string' && sql.includes('SET channel_id = $1'),
    );

    expect(updateCall).toBeDefined();
    expect(updateCall?.[1]).toEqual([
      expect.any(String),
      'new-resource-id',
      expect.any(Date),
      'tenant-1',
    ]);
  });
});
