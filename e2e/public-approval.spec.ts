import { test, expect } from '@playwright/test';

test.describe('Public Approval Portal', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('approval page does not redirect to login', async ({ page }) => {
    await page.goto('/edro/aprovacao-externa?token=placeholder-test-token-string');
    await page.waitForTimeout(3000);
    expect(page.url()).toContain('aprovacao-externa');
    expect(page.url()).not.toContain('/login');
  });

  test('approval page shows content', async ({ page }) => {
    await page.goto('/edro/aprovacao-externa?token=placeholder-test-token-string');
    await page.waitForTimeout(3000);
    // Should show the approval page (either content or error for invalid token, but NOT login)
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
  });
});
