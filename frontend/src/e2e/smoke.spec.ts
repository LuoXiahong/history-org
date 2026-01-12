import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('app loads and displays login page', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await expect(page.getByText('Sign in to access your history collection')).toBeVisible();
  });

  test('login form has required fields', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByLabel('Email address')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  test('can navigate to register page from login', async ({ page }) => {
    await page.goto('/login');

    await page.click('text=Create one');

    await expect(page).toHaveURL('/register');
  });

  test('shows error with invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Email address').fill('invalid@test.com');
    await page.getByLabel('Password').fill('wrongpassword');
    await page.getByRole('button', { name: 'Sign in' }).click();

    // Should show error message (API will fail with invalid credentials)
    await expect(page.locator('div[class*="bg-red"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('redirects to login when accessing protected route unauthenticated', async ({ page }) => {
    await page.goto('/');

    // Should redirect to login since dashboard is protected
    await expect(page).toHaveURL(/\/login/);
  });
});
