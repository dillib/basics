import { test, expect } from '@playwright/test';

/**
 * Authentication Flow Tests
 * Tests login modal, form interactions, and auth state
 */

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should open login modal on sign in click', async ({ page }) => {
    await page.getByTestId('button-login').click();
    
    await expect(page.getByTestId('tab-login')).toBeVisible();
    await expect(page.getByTestId('input-login-email')).toBeVisible();
    await expect(page.getByTestId('input-login-password')).toBeVisible();
  });

  test('should switch between login and signup tabs', async ({ page }) => {
    await page.getByTestId('button-login').click();
    
    // Switch to signup
    await page.getByTestId('tab-signup').click();
    await expect(page.getByTestId('input-signup-name')).toBeVisible();
    await expect(page.getByTestId('button-submit-signup')).toBeVisible();
    
    // Switch back to login
    await page.getByTestId('tab-login').click();
    await expect(page.getByTestId('button-submit-login')).toBeVisible();
  });

  test('should validate form inputs', async ({ page }) => {
    await page.getByTestId('button-login').click();
    
    // Try empty submit
    await page.getByTestId('button-submit-login').click();
    
    // HTML5 validation check
    const emailInput = page.getByTestId('input-login-email');
    await expect(emailInput).toHaveAttribute('required', '');
  });

  test('should show social login options', async ({ page }) => {
    await page.getByTestId('button-login').click();
    
    await expect(page.getByTestId('button-google-login')).toBeVisible();
    await expect(page.getByTestId('button-github-login')).toBeVisible();
    await expect(page.getByTestId('button-apple-login')).toBeVisible();
  });
});
