import { test as setup, expect } from '@playwright/test';

const TEST_EMAIL = process.env.E2E_TEST_EMAIL || 'test@edro.digital';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');

  // Step 1: enter email
  const emailInput = page.getByRole('textbox').first();
  await emailInput.fill(TEST_EMAIL);

  // Submit email
  const submitBtn = page.getByRole('button').first();
  await submitBtn.click();

  // Step 2: wait for code input and enter test code
  await page.waitForTimeout(1000);
  const codeInput = page.getByRole('textbox').last();
  await codeInput.fill(process.env.TEST_AUTH_CODE || '123456');

  // Submit code
  const verifyBtn = page.getByRole('button').last();
  await verifyBtn.click();

  // Wait for redirect away from login
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15_000 });
  expect(page.url()).not.toContain('/login');

  // Save authenticated storage state
  await page.context().storageState({ path: './e2e/.auth/user.json' });
});
