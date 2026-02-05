import { test, expect } from '@playwright/test';

/**
 * Home Page Tests
 * Tests the landing page, search functionality, and navigation
 */

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display hero section with search', async ({ page }) => {
    await expect(page.getByTestId('text-hero-headline')).toBeVisible();
    await expect(page.getByTestId('input-hero-search')).toBeVisible();
    await expect(page.getByTestId('button-hero-search')).toBeVisible();
  });

  test('should have working navigation links', async ({ page }) => {
    await expect(page.getByTestId('link-nav-topic-library')).toBeVisible();
    await expect(page.getByTestId('link-nav-pricing')).toBeVisible();
    await expect(page.getByTestId('link-nav-the-method')).toBeVisible();
  });

  test('should show popular topic buttons', async ({ page }) => {
    const topics = ['Photosynthesis', "Newton's Laws", 'Supply & Demand', 'The Scientific Method'];
    for (const topic of topics) {
      const testId = `button-topic-${topic.toLowerCase().replace(/\s+/g, '-')}`;
      await expect(page.getByTestId(testId)).toBeVisible();
    }
  });

  test('should trigger generation on search', async ({ page }) => {
    const searchInput = page.getByTestId('input-hero-search');
    const searchButton = page.getByTestId('button-hero-search');
    
    await searchInput.fill('Quantum Physics');
    await searchButton.click();
    
    // Should show generation progress
    await expect(page.getByTestId('generation-progress')).toBeVisible();
  });

  test('should trigger generation on popular topic click', async ({ page }) => {
    const topicButton = page.getByTestId('button-topic-photosynthesis');
    await topicButton.click();
    
    await expect(page.getByTestId('generation-progress')).toBeVisible();
  });
});
