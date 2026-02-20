import { test, expect } from '@playwright/test'
import {
  seedPlayerInRoom,
  clearGameState,
  TEST_PLAYER_NAME,
} from './helpers'

test.describe('Lemonade Stand Game - E2E Tests', () => {
  // =========================================================================
  // Home Page (unauthenticated)
  // =========================================================================

  test.describe('Home Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/')
      await clearGameState(page)
      await page.reload()
    })

    test('should show join form with name and room code fields', async ({ page }) => {
      await expect(page.locator('#player-name')).toBeVisible()
      await expect(page.locator('#room-code')).toBeVisible()
      await expect(page.getByRole('button', { name: /join game/i })).toBeVisible()
    })

    test('should show facilitator sign-in link', async ({ page }) => {
      await expect(page.getByText(/sign in to create a room/i)).toBeVisible()
    })

    test('should show game branding', async ({ page }) => {
      await expect(page.getByText(/lemonade stand/i).first()).toBeVisible()
    })
  })

  // =========================================================================
  // Player Join Flow
  // =========================================================================

  test.describe('Player Join Flow', () => {
    test('should reject empty form submission', async ({ page }) => {
      await page.goto('/')
      await clearGameState(page)
      await page.reload()

      const joinButton = page.getByRole('button', { name: /join game/i })
      await expect(joinButton).toBeDisabled()
    })

    test('should show dashboard after seeding player state', async ({ page }) => {
      await seedPlayerInRoom(page)
      await page.goto('/')

      // Dashboard should show the player name
      await expect(page.getByText(new RegExp(TEST_PLAYER_NAME, 'i')).first()).toBeVisible({ timeout: 5000 })
      // Should show budget
      await expect(page.getByText(/budget/i).first()).toBeVisible()
    })
  })

  // =========================================================================
  // Play Page - Decision Making
  // =========================================================================

  test.describe('Play Page', () => {
    test.beforeEach(async ({ page }) => {
      await seedPlayerInRoom(page)
    })

    test('should show scenario narrative and decision sliders', async ({ page }) => {
      await page.goto('/play')
      await page.waitForLoadState('networkidle')

      // Level badge
      await expect(page.getByText(/level 1/i).first()).toBeVisible({ timeout: 5000 })

      // Decision sliders (3 sliders: price, quality, marketing)
      const sliders = page.getByRole('slider')
      await expect(sliders).toHaveCount(3)

      // "Open for Business" submit button
      await expect(page.getByRole('button', { name: /open for business/i })).toBeVisible()
    })

    test('should show budget card with $500 starting budget', async ({ page }) => {
      await page.goto('/play')
      await page.waitForLoadState('networkidle')

      await expect(page.getByText(/\$500/i).first()).toBeVisible({ timeout: 5000 })
    })

    test('should run simulation and show results', async ({ page }) => {
      await page.goto('/play')
      await page.waitForLoadState('networkidle')

      // Click "Open for Business"
      const submitButton = page.getByRole('button', { name: /open for business/i })
      await expect(submitButton).toBeVisible({ timeout: 5000 })
      await submitButton.click()

      // Should show simulation loading then results
      await expect(page.getByText(/level 1 complete/i)).toBeVisible({ timeout: 10000 })

      // Should show result metrics
      await expect(page.getByText(/cups sold/i).first()).toBeVisible()
      await expect(page.getByText(/revenue/i).first()).toBeVisible()
      await expect(page.getByText(/net profit/i).first()).toBeVisible()

      // Should have "Continue to Results" button
      await expect(page.getByRole('button', { name: /continue to results/i })).toBeVisible()
    })
  })

  // =========================================================================
  // Results Page
  // =========================================================================

  test.describe('Results Page', () => {
    test('should show detailed results after completing a level', async ({ page }) => {
      await seedPlayerInRoom(page)
      await page.goto('/play')
      await page.waitForLoadState('networkidle')

      // Run simulation
      const submitButton = page.getByRole('button', { name: /open for business/i })
      await expect(submitButton).toBeVisible({ timeout: 5000 })
      await submitButton.click()

      // Wait for simulation to complete
      await expect(page.getByText(/level 1 complete/i)).toBeVisible({ timeout: 10000 })

      // Navigate to results
      await page.getByRole('button', { name: /continue to results/i }).click()

      // Results page should show decision quality indicators
      await expect(page.getByText(/decision quality/i)).toBeVisible({ timeout: 5000 })
      await expect(page.getByText('Budget Change', { exact: true })).toBeVisible()

      // Should show optimal range info
      await expect(page.getByText(/optimal/i).first()).toBeVisible()

      // Should have "Next Level" button
      await expect(page.getByRole('button', { name: /next level/i })).toBeVisible()
    })
  })

  // =========================================================================
  // Navigation
  // =========================================================================

  test.describe('Navigation', () => {
    test.beforeEach(async ({ page }) => {
      await seedPlayerInRoom(page)
    })

    test('should load home page', async ({ page }) => {
      const response = await page.goto('/')
      expect(response?.status()).toBeLessThan(400)
    })

    test('should navigate to levels page', async ({ page }) => {
      await page.goto('/levels')
      await page.waitForLoadState('networkidle')

      await expect(page.getByText(/level/i).first()).toBeVisible({ timeout: 5000 })
    })

    test('should navigate to leaderboard page', async ({ page }) => {
      await page.goto('/leaderboard')
      await page.waitForLoadState('networkidle')

      await expect(page.getByText(/leaderboard/i).first()).toBeVisible({ timeout: 5000 })
    })

    test('should navigate to how-to-play page', async ({ page }) => {
      await page.goto('/how-to-play')
      await page.waitForLoadState('networkidle')

      const content = page.locator('#root')
      await expect(content).toBeVisible()
    })
  })

  // =========================================================================
  // Leaderboard
  // =========================================================================

  test.describe('Leaderboard', () => {
    test('should show player on leaderboard after joining', async ({ page }) => {
      await seedPlayerInRoom(page)
      await page.goto('/leaderboard')
      await page.waitForLoadState('networkidle')

      // Player name should appear on leaderboard
      await expect(page.getByText(new RegExp(TEST_PLAYER_NAME, 'i')).first()).toBeVisible({ timeout: 5000 })
    })
  })

  // =========================================================================
  // Responsive Design
  // =========================================================================

  test.describe('Responsive Design', () => {
    test('should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/')
      await expect(page.locator('#root')).toBeVisible()
    })

    test('should work on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 })
      await page.goto('/')
      await expect(page.locator('#root')).toBeVisible()
    })

    test('should work on desktop viewport', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 })
      await page.goto('/')
      await expect(page.locator('#root')).toBeVisible()
    })
  })

  // =========================================================================
  // Error Handling
  // =========================================================================

  test.describe('Error Handling', () => {
    test('should handle 404 pages gracefully', async ({ page }) => {
      await page.goto('/nonexistent-page')
      await expect(page.locator('#root')).toBeVisible()
    })

    test('should not have critical console errors on load', async ({ page }) => {
      const errors: string[] = []
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text())
        }
      })

      await page.goto('/')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)

      const criticalErrors = errors.filter(e =>
        !e.includes('favicon') &&
        !e.includes('404') &&
        !e.includes('Failed to load resource') &&
        !e.includes('validateDOMNesting') &&
        !e.includes('Warning:') &&
        !e.includes('DevTools') &&
        !e.includes('Supabase') &&
        !e.includes('net::')
      )

      expect(criticalErrors).toHaveLength(0)
    })
  })
})
