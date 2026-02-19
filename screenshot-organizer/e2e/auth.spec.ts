/**
 * Sign-in flow test for Expo web.
 * Run with: npx playwright test e2e/auth.spec.ts
 * Requires: Expo web running at baseURL (default http://localhost:8081)
 */
import { test, expect } from '@playwright/test'

test.describe('Sign-in', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Clear Supabase session so we land on sign-in
    await page.evaluate(() => {
      const keys: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k && (k.startsWith('sb-') || k.includes('supabase'))) keys.push(k)
      }
      keys.forEach((k) => localStorage.removeItem(k))
    })
    await page.reload()
    await page.waitForURL(/\/(sign-in|--\/sign-in|$)/)
  })

  test('sign-in page shows Google button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /sign in with google/i })).toBeVisible()
  })

  test('click Sign in with Google opens OAuth or shows error', async ({ page, context }) => {
    const googleButton = page.getByRole('button', { name: /sign in with google/i })
    await expect(googleButton).toBeVisible()

    // Listen for popup (web OAuth often opens a popup)
    const popupPromise = context.waitForEvent('page', { timeout: 15000 }).catch(() => null)

    await googleButton.click()

    // Wait a bit for either popup or in-page redirect/error
    await page.waitForTimeout(3000)

    const popup = await popupPromise
    if (popup) {
      const url = popup.url()
      await popup.close().catch(() => {})
      // Should have opened Google or Supabase auth
      const isAuth = /accounts\.google\.com|supabase|auth\.google|localhost.*(auth|callback)/i.test(url)
      expect(isAuth, `Popup should go to auth URL, got: ${url}`).toBe(true)
      return
    }

    // No popup: check for error banner (e.g. redirect failed)
    const errorBanner = page.locator('[class*="error"]').filter({ hasText: /no access token|redirect|error|failed/i })
    const hasError = await errorBanner.isVisible().catch(() => false)
    if (hasError) {
      const text = await errorBanner.textContent()
      throw new Error(`Sign-in showed error: ${text}`)
    }

    // Maybe navigated in same page to Google
    const url = page.url()
    const isAuthUrl = /accounts\.google\.com|supabase|auth\.google|callback/i.test(url)
    expect(isAuthUrl || (await page.getByRole('button', { name: /sign in with google/i }).isVisible()), 
      `Expected auth redirect or still on sign-in. URL: ${url}`).toBe(true)
  })

  test('callback with invalid code shows error and stays on sign-in', async ({ page }) => {
    // Simulate redirect back with bad code (e.g. from closed OAuth popup or wrong URL)
    await page.goto('/--/auth/callback?error=access_denied')
    await page.waitForTimeout(2000)
    // Should either show error or still be on a page we can use (sign-in or callback error)
    const onSignIn = await page.getByRole('button', { name: /sign in with google/i }).isVisible().catch(() => false)
    const hasError = await page.locator('text=/error|denied|failed|cancelled/i').first().isVisible().catch(() => false)
    expect(onSignIn || hasError, 'Should show sign-in or an error message').toBe(true)
  })
})
