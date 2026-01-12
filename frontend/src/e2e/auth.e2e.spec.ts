import { test, expect } from '@playwright/test';

test.describe('Auth Flow with Cookies', () => {
  test.beforeEach(async ({ context }) => {
    // Clear all cookies before each test
    await context.clearCookies();
  });

  test('should set httpOnly cookie on successful login', async ({ page, context }) => {
    // Create test user first (this would normally be done via API or test setup)
    // For now, we'll test with a user that should exist in test environment
    await page.goto('/login');

    // Fill login form
    await page.getByLabel('Email address').fill('test@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Sign in' }).click();

    // Wait for redirect to dashboard/home
    await page.waitForURL('/', { timeout: 5000 });

    // Check that cookie was set
    const cookies = await context.cookies();
    const accessTokenCookie = cookies.find((c) => c.name === 'access_token');

    expect(accessTokenCookie).toBeDefined();
    expect(accessTokenCookie?.httpOnly).toBe(true);
    expect(accessTokenCookie?.sameSite).toBe('Strict');
  });

  test('should maintain session via cookie after page reload', async ({
    page,
    context,
  }) => {
    // Login first
    await page.goto('/login');
    await page.getByLabel('Email address').fill('test@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Sign in' }).click();

    // Wait for login to complete
    await page.waitForURL('/', { timeout: 5000 });

    // Verify cookie exists
    const cookiesBeforeReload = await context.cookies();
    expect(cookiesBeforeReload.find((c) => c.name === 'access_token')).toBeDefined();

    // Reload page
    await page.reload();

    // Should still be authenticated (cookie persists)
    await expect(page).toHaveURL('/');
    // Should not redirect to login
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('should clear cookie on logout', async ({ page, context }) => {
    // Login first
    await page.goto('/login');
    await page.getByLabel('Email address').fill('test@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await page.waitForURL('/', { timeout: 5000 });

    // Verify cookie exists
    let cookies = await context.cookies();
    expect(cookies.find((c) => c.name === 'access_token')).toBeDefined();

    // Logout (assuming there's a logout button/link)
    // This depends on your UI implementation
    const logoutButton = page.getByRole('button', { name: /logout/i }).or(
      page.getByRole('link', { name: /logout/i }),
    );
    
    if (await logoutButton.count() > 0) {
      await logoutButton.click();
    } else {
      // If no logout button, navigate to logout endpoint directly
      await page.goto('/api/v1/auth/logout', { waitUntil: 'networkidle' });
    }

    // Wait a bit for logout to complete
    await page.waitForTimeout(500);

    // Cookie should be cleared
    cookies = await context.cookies();
    const accessTokenCookie = cookies.find((c) => c.name === 'access_token');
    expect(accessTokenCookie).toBeUndefined();

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should not have cookie when not authenticated', async ({ page, context }) => {
    await page.goto('/login');

    // Should not have access_token cookie
    const cookies = await context.cookies();
    const accessTokenCookie = cookies.find((c) => c.name === 'access_token');
    expect(accessTokenCookie).toBeUndefined();
  });

  test('should redirect to login when accessing protected route without cookie', async ({
    page,
  }) => {
    await page.goto('/');

    // Should redirect to login since no cookie
    await expect(page).toHaveURL(/\/login/);
  });

  test('should authenticate user after successful registration', async ({
    page,
    context,
  }) => {
    await page.goto('/register');

    // Fill registration form
    const timestamp = Date.now();
    const testEmail = `test${timestamp}@example.com`;
    
    await page.getByLabel(/email/i).fill(testEmail);
    await page.getByLabel(/password/i).fill('SecurePass123');
    await page.getByLabel(/name/i).fill('Test User');
    await page.getByRole('button', { name: /create account/i }).click();

    // Wait for redirect after registration
    await page.waitForURL('/', { timeout: 5000 });

    // Check that cookie was set
    const cookies = await context.cookies();
    const accessTokenCookie = cookies.find((c) => c.name === 'access_token');

    expect(accessTokenCookie).toBeDefined();
    expect(accessTokenCookie?.httpOnly).toBe(true);
  });
});
