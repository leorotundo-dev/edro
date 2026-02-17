import { test, expect } from '@playwright/test';

test.describe('Auth Flow', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('redirects unauthenticated user to login', async ({ page }) => {
    await page.goto('/edro/dashboard');
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    expect(page.url()).toContain('/login');
  });

  test('shows login form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('textbox').first()).toBeVisible();
  });
});

test.describe('Authenticated session', () => {
  test('dashboard loads without redirect to login', async ({ page }) => {
    await page.goto('/edro/dashboard');
    await page.waitForTimeout(3000);
    expect(page.url()).not.toContain('/login');
  });

  test('token persists on page reload', async ({ page }) => {
    await page.goto('/edro/dashboard');
    await page.reload();
    await page.waitForTimeout(2000);
    expect(page.url()).not.toContain('/login');
  });
});
