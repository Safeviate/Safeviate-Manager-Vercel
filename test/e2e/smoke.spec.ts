import { expect, test } from '@playwright/test';

test('app boots and shows the login entry point', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Safeviate|Next/i);
});

test('login page is reachable', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByText('Safeviate Manager')).toBeVisible();
  await expect(page.getByLabel('Email Address')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
});

test('protected pages redirect unauthenticated users to login', async ({ page }) => {
  await page.goto('/users');
  await page.waitForURL(/\/login/, { timeout: 15000 });
});

test('unauthenticated api responses use safe defaults', async ({ request }) => {
  const meResponse = await request.get('/api/me');
  const mePayload = await meResponse.json();
  expect(meResponse.ok()).toBeTruthy();
  expect(mePayload.profile).toBeNull();

  const tenantConfigResponse = await request.get('/api/tenant-config');
  const tenantConfigPayload = await tenantConfigResponse.json();
  expect(tenantConfigResponse.ok()).toBeTruthy();
  expect(tenantConfigPayload.config).toBeNull();

  const rolesResponse = await request.get('/api/roles');
  const rolesPayload = await rolesResponse.json();
  expect(rolesResponse.ok()).toBeTruthy();
  expect(rolesPayload.roles).toEqual([]);

  const summaryResponse = await request.get('/api/dashboard-summary');
  const summaryPayload = await summaryResponse.json();
  expect(summaryResponse.ok()).toBeTruthy();
  expect(summaryPayload.bookings).toEqual([]);
  expect(summaryPayload.aircrafts).toEqual([]);
});
