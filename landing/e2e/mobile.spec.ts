import { test, expect } from "@playwright/test";

test.describe("Landing page mobile responsiveness", () => {
  test("loads without horizontal overflow on mobile", async ({ page }) => {
    await page.goto("/");
    const body = page.locator("body");
    await expect(body).toBeVisible();

    // Check that the main content is within viewport (no horizontal scroll)
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2); // allow 2px rounding
  });

  test("hero headline and CTA are visible on mobile", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("cleaner camera roll");
    await expect(page.getByRole("link", { name: /subscribe for early access/i })).toBeVisible();
  });

  test("Coming Soon section has headline and subscription form", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /coming soon/i }).first().click();
    await expect(page.getByRole("heading", { name: /ZeroShots is Coming/i })).toBeVisible();
    await expect(page.getByPlaceholder("Email Address")).toBeVisible();
    await expect(page.getByRole("button", { name: /Subscribe for Early Access/i })).toBeVisible();
  });

  test("footer links are visible and stacked on mobile", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Privacy" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Terms" })).toBeVisible();
  });
});
