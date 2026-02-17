import { test, expect } from '@playwright/test';

const API_BASE = process.env.E2E_API_BASE || 'http://localhost:3333/api';

test.describe('Copy Feedback', () => {
  test('scores a copy via API', async ({ request }) => {
    // Create briefing first
    const briefRes = await request.post(`${API_BASE}/edro/briefings`, {
      data: {
        client_name: 'Feedback Test Client',
        title: `Feedback Test ${Date.now()}`,
        payload: { objective: 'awareness', platform: 'instagram', format: 'Feed' },
      },
    });
    const briefBody = await briefRes.json();
    if (!briefBody.success) test.skip();
    const briefingId = briefBody.data?.briefing?.id;

    // Create a copy version
    const copyRes = await request.post(`${API_BASE}/edro/briefings/${briefingId}/copy`, {
      data: {
        language: 'pt',
        output: 'Test copy content for feedback scoring.',
      },
    });
    const copyBody = await copyRes.json();
    if (!copyBody.success) test.skip();
    const copyId = copyBody.data?.copy?.id || copyBody.data?.id;

    if (!copyId) test.skip();

    // Score it
    const feedbackRes = await request.patch(`${API_BASE}/edro/copies/${copyId}/feedback`, {
      data: { score: 4, feedback: 'Good copy!', status: 'approved' },
    });
    expect(feedbackRes.ok()).toBeTruthy();
    const fbBody = await feedbackRes.json();
    expect(fbBody.success).toBe(true);
    expect(fbBody.data.score).toBe(4);
  });
});
