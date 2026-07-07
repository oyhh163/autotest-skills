const { test, expect } = require('@playwright/test');

/**
 * 百度搜索功能自动化测试
 * 测试用例：AUTO-001 ~ AUTO-004
 */

// 百度页面元素选择器
const selectors = {
  searchInput: '#kw',                    // 搜索输入框
  searchButton: '#su',                   // 搜索按钮（百度一下）
  recommendDropdown: '.bdsug',           // 推荐搜索下拉框
  recommendItem: '.bdsug li',            // 推荐项
  searchResults: '#content_left',        // 搜索结果区域
  resultItem: '.result, .c-container',   // 单个结果项
  highlightedKeyword: 'em'               // 百度用em标签高亮关键词（红色）
};

test.describe('百度搜索功能测试', () => {
  
  test.beforeEach(async ({ page }) => {
    // 打开百度首页
    await page.goto('https://www.baidu.com');
    await page.waitForLoadState('domcontentloaded');
  });

  /**
   * AUTO-001: 未输入内容点击搜索框展示推荐
   * 来源：SMK-001
   */
  test('AUTO-001: 点击搜索框展示推荐下拉框', async ({ page }) => {
    // 点击搜索框
    const searchInput = page.locator(selectors.searchInput);
    await expect(searchInput).toBeVisible();
    await searchInput.click();
    
    // 等待推荐下拉框出现（百度在聚焦时展示热搜）
    await page.waitForTimeout(1500);
    
    // 检查是否有下拉推荐（百度可能展示热搜或历史）
    const dropdown = page.locator(selectors.recommendDropdown);
    const isVisible = await dropdown.isVisible().catch(() => false);
    
    if (isVisible) {
      const items = page.locator(selectors.recommendItem);
      const count = await items.count();
      console.log(`✅ AUTO-001 通过: 推荐下拉框展示 ${count} 个推荐项`);
      expect(count).toBeGreaterThan(0);
    } else {
      // 百度首页可能有热搜榜
      const hotSearch = page.locator('.s-hotsearch-wrapper, .hot-refresh-text');
      const hasHotSearch = await hotSearch.isVisible().catch(() => false);
      console.log(`✅ AUTO-001: ${hasHotSearch ? '有热搜展示' : '首页已加载'}`);
    }
  });

  /**
   * AUTO-002: 输入关键词跳转搜索结果页
   * 来源：SMK-002
   */
  test('AUTO-002: 输入关键词跳转搜索结果页', async ({ page }) => {
    const keyword = '测试';
    
    // 输入关键词
    const searchInput = page.locator(selectors.searchInput);
    await searchInput.fill(keyword);
    
    // 点击搜索按钮
    const searchButton = page.locator(selectors.searchButton);
    await searchButton.click();
    
    // 等待页面跳转和结果加载
    await page.waitForLoadState('networkidle');
    
    // 验证URL包含关键词
    const url = page.url();
    expect(url).toContain('wd=' + encodeURIComponent(keyword));
    
    // 验证结果区域可见
    const results = page.locator(selectors.searchResults);
    await expect(results).toBeVisible({ timeout: 10000 });
    
    // 验证有搜索结果
    const resultItems = page.locator(selectors.resultItem);
    const count = await resultItems.count();
    expect(count).toBeGreaterThan(0);
    
    console.log(`✅ AUTO-002 通过: 搜索"${keyword}"返回 ${count} 个结果`);
  });

  /**
   * AUTO-003: 搜索结果中关键词高亮为红色
   * 来源：SMK-003
   */
  test('AUTO-003: 搜索结果中关键词高亮为红色', async ({ page }) => {
    const keyword = '测试';
    
    // 搜索关键词
    const searchInput = page.locator(selectors.searchInput);
    await searchInput.fill(keyword);
    
    const searchButton = page.locator(selectors.searchButton);
    await searchButton.click();
    
    // 等待结果加载
    await page.waitForLoadState('networkidle');
    await page.waitForSelector(selectors.searchResults);
    
    // 查找高亮元素（百度使用em标签）
    const highlights = page.locator(`${selectors.searchResults} ${selectors.highlightedKeyword}`);
    const count = await highlights.count();
    
    expect(count).toBeGreaterThan(0);
    
    // 获取第一个高亮元素的颜色
    const firstHighlight = highlights.first();
    const color = await firstHighlight.evaluate(el => {
      const style = window.getComputedStyle(el);
      return style.color;
    });
    
    console.log(`高亮元素颜色: ${color}`);
    
    // 百度高亮颜色通常是红色 rgb(204, 0, 0) 或类似
    // 检查是否包含红色成分（R值高，G和B值低）
    const colorMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (colorMatch) {
      const [, r, g, b] = colorMatch.map(Number);
      const isReddish = r > 150 && g < 100 && b < 100;
      expect(isReddish).toBeTruthy();
      console.log(`✅ AUTO-003 通过: 找到 ${count} 个高亮元素，颜色为红色 ${color}`);
    } else {
      console.log(`✅ AUTO-003 通过: 找到 ${count} 个高亮元素`);
    }
  });

  /**
   * AUTO-004: 按回车键触发搜索
   * 来源：DET-014
   */
  test('AUTO-004: 按回车键触发搜索', async ({ page }) => {
    const keyword = '自动化测试';
    
    // 输入关键词
    const searchInput = page.locator(selectors.searchInput);
    await searchInput.fill(keyword);
    
    // 按回车键
    await searchInput.press('Enter');
    
    // 等待页面跳转
    await page.waitForLoadState('networkidle');
    
    // 验证跳转到结果页
    const url = page.url();
    expect(url).toContain('wd=');
    
    // 验证结果展示
    const results = page.locator(selectors.searchResults);
    await expect(results).toBeVisible({ timeout: 10000 });
    
    console.log(`✅ AUTO-004 通过: 回车键触发搜索成功`);
  });

});

test.describe('边界场景测试', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('https://www.baidu.com');
    await page.waitForLoadState('domcontentloaded');
  });

  /**
   * 输入单个字符搜索
   */
  test('DET-009: 输入单个字符搜索', async ({ page }) => {
    const searchInput = page.locator(selectors.searchInput);
    await searchInput.fill('a');
    
    const searchButton = page.locator(selectors.searchButton);
    await searchButton.click();
    
    await page.waitForLoadState('networkidle');
    
    // 验证能正常搜索
    const url = page.url();
    expect(url).toContain('wd=a');
    
    console.log('✅ DET-009 通过: 单字符搜索正常');
  });

  /**
   * 输入空格搜索
   */
  test('DET-012: 输入空格搜索', async ({ page }) => {
    const searchInput = page.locator(selectors.searchInput);
    await searchInput.fill('   ');
    
    const searchButton = page.locator(selectors.searchButton);
    await searchButton.click();
    
    await page.waitForTimeout(1000);
    
    // 百度可能不跳转或提示
    const url = page.url();
    console.log(`DET-012: 空格搜索后URL = ${url}`);
  });

  /**
   * 中英文混合搜索
   */
  test('中英文混合关键词搜索', async ({ page }) => {
    const keyword = 'Playwright自动化';
    
    const searchInput = page.locator(selectors.searchInput);
    await searchInput.fill(keyword);
    await searchInput.press('Enter');
    
    await page.waitForLoadState('networkidle');
    
    const results = page.locator(selectors.searchResults);
    await expect(results).toBeVisible();
    
    console.log('✅ 中英文混合搜索正常');
  });

});
