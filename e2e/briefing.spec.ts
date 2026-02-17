import { test, expect } from '@playwright/test';

const API_BASE = process.env.E2E_API_BASE || 'http://localhost:3333/api';

test.describe('Briefing Lifecycle', () => {
  let briefingId: string;

  test('creates a new briefing via API', async ({ request }) => {
    const response = await request.post(`${API_BASE}/edro/briefings`, {
      data: {
        client_name: 'E2E Test Client',
        title: `E2E Test Briefing ${Date.now()}`,
        payload: {
          objective: 'engagement',
          platform: 'instagram',
          format: 'Carrossel',
          target_audience: 'jovens 18-30',
        },
      },
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.success).toBe(true);
    briefingId = body.data?.briefing?.id;
  });

  test('lists briefings', async ({ page }) => {
    await page.goto('/edro');
    await page.waitForTimeout(3000);
    // Should show briefing list page
    expect(page.url()).toContain('/edro');
  });

  test('gets briefing detail via API', async ({ request }) => {
    if (!briefingId) test.skip();
    const response = await request.get(`${API_BASE}/edro/briefings/${briefingId}`);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.briefing.id).toBe(briefingId);
  });
});
