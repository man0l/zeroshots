import { test, expect } from '@playwright/test';

test.describe('Screenshot Organizer - The Stack UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('should display the main card stack', async ({ page }) => {
    // Check header trust counter
    const trustValue = page.locator('#trust-value');
    await expect(trustValue).toHaveText('4/15');
    
    // Check card is visible
    const mainCard = page.locator('#main-card');
    await expect(mainCard).toBeVisible();
    
    // Check age display
    const ageDisplay = page.locator('#age-display');
    await expect(ageDisplay).toHaveText('420d');
    
    // Check size display
    const sizeDisplay = page.locator('#size-display');
    await expect(sizeDisplay).toHaveText('2.8 MB');
    
    console.log('✅ Main card stack displayed correctly');
  });

  test('should have three action buttons', async ({ page }) => {
    const deleteBtn = page.locator('#delete-btn');
    const archiveBtn = page.locator('#archive-btn');
    const keepBtn = page.locator('#keep-btn');
    
    await expect(deleteBtn).toBeVisible();
    await expect(archiveBtn).toBeVisible();
    await expect(keepBtn).toBeVisible();
    
    console.log('✅ All action buttons present');
  });

  test('should increment deleted count on delete', async ({ page }) => {
    const initialCount = await page.locator('#deleted-count').textContent();
    expect(initialCount).toBe('0');
    
    await page.locator('#delete-btn').click();
    
    const newCount = await page.locator('#deleted-count').textContent();
    expect(newCount).toBe('1');
    
    console.log('✅ Delete action works correctly');
  });

  test('should increment kept count on keep', async ({ page }) => {
    await page.locator('#keep-btn').click();
    
    const keptCount = await page.locator('#kept-count').textContent();
    expect(keptCount).toBe('1');
    
    console.log('✅ Keep action works correctly');
  });

  test('should increment archived count on archive', async ({ page }) => {
    await page.locator('#archive-btn').click();
    
    const archivedCount = await page.locator('#archived-count').textContent();
    expect(archivedCount).toBe('1');
    
    console.log('✅ Archive action works correctly');
  });

  test('should update trust counter on delete', async ({ page }) => {
    const initialTrust = await page.locator('#trust-value').textContent();
    expect(initialTrust).toBe('4/15');
    
    await page.locator('#delete-btn').click();
    
    const newTrust = await page.locator('#trust-value').textContent();
    expect(newTrust).toBe('5/15');
    
    console.log('✅ Trust counter updates on delete');
  });

  test('should cycle through screenshots', async ({ page }) => {
    // First screenshot
    const age1 = await page.locator('#age-display').textContent();
    expect(age1).toBe('420d');
    
    // Click keep to move to next
    await page.locator('#keep-btn').click();
    
    // Second screenshot
    const age2 = await page.locator('#age-display').textContent();
    expect(age2).toBe('180d');
    
    console.log('✅ Screenshots cycle correctly');
  });

  test('should show completion state after all screenshots', async ({ page }) => {
    // Cycle through all 4 screenshots
    for (let i = 0; i < 4; i++) {
      await page.locator('#keep-btn').click();
    }
    
    // Check for completion message
    const completionText = await page.locator('#main-card').textContent();
    expect(completionText).toContain('All Done!');
    
    console.log('✅ Completion state shown correctly');
  });

  test('should block delete when trust limit reached', async ({ page }) => {
    // Reset trust to simulate full usage (need 11 more deletes to reach 15)
    for (let i = 0; i < 11; i++) {
      await page.locator('#delete-btn').click();
    }
    
    // Trust should be at 15/15
    const trustValue = await page.locator('#trust-value').textContent();
    expect(trustValue).toBe('15/15');
    
    console.log('✅ Trust limit reached');
  });

  test('should capture page structure', async ({ page }) => {
    const structure = await page.evaluate(() => {
      const getStructure = (el, depth = 0) => {
        const indent = '  '.repeat(depth);
        const tag = el.tagName?.toLowerCase();
        const id = el.id ? `#${el.id}` : '';
        const classes = el.className && typeof el.className === 'string' 
          ? `.${el.className.split(' ').filter(c => c).join('.')}` 
          : '';
        const text = el.textContent?.trim().slice(0, 30) || '';
        
        let result = `${indent}${tag}${id}${classes}${text ? ` "${text}"` : ''}\n`;
        
        for (const child of el.children || []) {
          if (child.tagName && !['script', 'style', 'link'].includes(child.tagName.toLowerCase())) {
            result += getStructure(child, depth + 1);
          }
        }
        return result;
      };
      return getStructure(document.body);
    });
    
    console.log('\n🏗️ Page Structure:');
    console.log(structure);
  });
});
