import { test, expect } from '@playwright/test';

test.describe('Edro Dashboard', () => {
  test('loads dashboard with metrics', async ({ page }) => {
    await page.goto('/edro/dashboard');
    await page.waitForSelector('text=Total Briefings', { timeout: 15_000 });
    await expect(page.getByText('Total Briefings')).toBeVisible();
    await expect(page.getByText('Em Andamento')).toBeVisible();
    await expect(page.getByText('Copies Geradas')).toBeVisible();
  });

  test('funnel section renders', async ({ page }) => {
    await page.goto('/edro/dashboard');
    await page.waitForSelector('text=Funil por Etapa', { timeout: 15_000 });
    await expect(page.getByText('Funil por Etapa')).toBeVisible();
  });

  test('bottleneck section renders', async ({ page }) => {
    await page.goto('/edro/dashboard');
    await page.waitForSelector('text=Gargalos Atuais', { timeout: 15_000 });
    await expect(page.getByText('Gargalos Atuais')).toBeVisible();
  });
});
