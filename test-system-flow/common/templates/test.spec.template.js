/**
 * Playwright 测试脚本模板
 * 包含六类断言示例，生成时必须按类型填充具体断言
 * 
 * 断言类型说明：
 * 1. P0核心场景 - 端到端流程验证
 * 2. 文案校验 - 页面文案与设计稿一致
 * 3. 跳转校验 - 按钮点击后URL或目标元素正确
 * 4. 状态校验 - 按钮禁用/启用状态正确
 * 5. 数据校验 - 提交后展示值与预期一致
 * 6. 异常提示 - 错误提示正确出现和文案匹配
 */
const { test, expect } = require('@playwright/test');

// ==============================
// 【必填】页面元素选择器
// ==============================
const selectors = {
  // 根据实际页面填充，优先使用 data-testid > id > 稳定class
  // 示例：
  // submitBtn: '[data-testid="submit-btn"]',
  // usernameInput: '#username',
  // errorMessage: '.error-tip, .ant-form-item-explain-error',
};

// ==============================
// 【必填】预期值（来自需求/Figma）
// ==============================
const expected = {
  // 文案预期值（来自 Figma 设计稿）
  // pageTitle: '用户登录',
  // submitBtnText: '提交',
  // errorEmptyUsername: '请输入用户名',
  
  // 跳转预期值
  // successUrl: '/dashboard',
  // successPageElement: '[data-testid="dashboard-header"]',
  
  // 计算/数据预期值
  // totalPrice: '¥100.00',
};

// ==============================
// 测试套件
// ==============================
test.describe('自动化测试', () => {
  
  test.beforeEach(async ({ page }) => {
    // 【必填】设置基础URL（从配置读取或硬编码）
    await page.goto(process.env.BASE_URL || '/');
    await page.waitForLoadState('networkidle');
  });

  // ============================================================
  // 类型1: P0 核心场景 - 端到端流程验证
  // ============================================================
  test('【P0】AUTO-001: 核心业务流程', async ({ page }) => {
    // 步骤1: 执行前置操作
    // await page.locator(selectors.xxx).click();
    
    // 步骤2: 执行核心操作
    // await page.locator(selectors.xxx).fill('xxx');
    // await page.locator(selectors.submitBtn).click();
    
    // 【必须】断言：流程结果正确
    // await expect(page).toHaveURL(/.*success/);
    // await expect(page.locator(selectors.successMessage)).toBeVisible();
    // await expect(page.locator(selectors.successMessage)).toHaveText('操作成功');
    
    throw new Error('【生成时必须替换】P0场景断言未实现');
  });

  // ============================================================
  // 类型2: 文案校验 - 页面文案与 Figma 设计稿一致
  // ============================================================
  test('【文案】AUTO-002: 页面静态文案校验', async ({ page }) => {
    // 【必须】断言：文案完全匹配 Figma
    // await expect(page.locator('h1')).toHaveText(expected.pageTitle);
    // await expect(page.locator(selectors.submitBtn)).toHaveText(expected.submitBtnText);
    // await expect(page.locator('.description')).toContainText('预期描述文字');
    
    // 多个文案批量校验示例
    // const textChecks = [
    //   { selector: 'h1', expected: '页面标题' },
    //   { selector: '.subtitle', expected: '副标题文案' },
    //   { selector: '[data-testid="footer"]', expected: '版权所有' },
    // ];
    // for (const check of textChecks) {
    //   await expect(page.locator(check.selector)).toHaveText(check.expected);
    // }
    
    throw new Error('【生成时必须替换】文案断言未实现');
  });

  // ============================================================
  // 类型3: 跳转校验 - 按钮点击后验证跳转目标
  // ============================================================
  test('【跳转】AUTO-003: 按钮点击跳转校验', async ({ page }) => {
    // 执行点击
    // await page.locator(selectors.navButton).click();
    
    // 【必须】断言方式1：验证 URL（文档标注了具体URL时）
    // await expect(page).toHaveURL(expected.successUrl);
    // 或使用正则匹配
    // await expect(page).toHaveURL(/.*\/dashboard$/);
    
    // 【必须】断言方式2：验证目标页面元素（文档未标注URL时）
    // await expect(page.locator(expected.successPageElement)).toBeVisible();
    // await expect(page.locator('h1')).toHaveText('目标页面标题');
    
    throw new Error('【生成时必须替换】跳转断言未实现');
  });

  // ============================================================
  // 类型4: 状态校验 - 按钮禁用/启用状态
  // ============================================================
  test('【状态】AUTO-004: 按钮状态校验', async ({ page }) => {
    // 场景：初始状态按钮禁用
    // 【必须】断言：检查 disabled 属性
    // await expect(page.locator(selectors.submitBtn)).toBeDisabled();
    
    // 执行操作使按钮启用
    // await page.locator(selectors.usernameInput).fill('test');
    // await page.locator(selectors.passwordInput).fill('123456');
    
    // 【必须】断言：按钮变为启用
    // await expect(page.locator(selectors.submitBtn)).toBeEnabled();
    
    // 也可以检查 CSS 类或样式
    // await expect(page.locator(selectors.submitBtn)).not.toHaveClass(/disabled/);
    // await expect(page.locator(selectors.submitBtn)).toHaveCSS('opacity', '1');
    
    throw new Error('【生成时必须替换】状态断言未实现');
  });

  // ============================================================
  // 类型5: 数据校验 - 提交后展示值与预期一致
  // ============================================================
  test('【数据】AUTO-005: 数据提交与计算校验', async ({ page }) => {
    // 填写表单数据
    // await page.locator(selectors.quantityInput).fill('2');
    // await page.locator(selectors.priceInput).fill('50');
    // await page.locator(selectors.calculateBtn).click();
    
    // 【必须】断言：计算结果正确
    // await expect(page.locator(selectors.totalDisplay)).toHaveText(expected.totalPrice);
    
    // 提交后验证数据展示
    // await page.locator(selectors.submitBtn).click();
    // await expect(page.locator(selectors.confirmAmount)).toHaveText('¥100.00');
    
    // 数值比较（转换后断言）
    // const displayedValue = await page.locator(selectors.totalDisplay).textContent();
    // const numericValue = parseFloat(displayedValue.replace(/[^\d.]/g, ''));
    // expect(numericValue).toBe(100);
    
    throw new Error('【生成时必须替换】数据断言未实现');
  });

  // ============================================================
  // 类型6: 异常提示校验 - 错误提示正确出现
  // ============================================================
  test('【异常】AUTO-006: 异常输入错误提示校验', async ({ page }) => {
    // 场景1: 空值提交
    // await page.locator(selectors.submitBtn).click();
    // 【必须】断言：错误提示出现 + 文案匹配
    // await expect(page.locator(selectors.errorMessage)).toBeVisible();
    // await expect(page.locator(selectors.errorMessage)).toHaveText(expected.errorEmptyUsername);
    
    // 场景2: 非法格式输入
    // await page.locator(selectors.emailInput).fill('invalid-email');
    // await page.locator(selectors.submitBtn).click();
    // await expect(page.locator(selectors.errorMessage)).toContainText('邮箱格式不正确');
    
    // 场景3: 边界值
    // await page.locator(selectors.ageInput).fill('-1');
    // await page.locator(selectors.submitBtn).click();
    // await expect(page.locator(selectors.errorMessage)).toHaveText('年龄必须大于0');
    
    throw new Error('【生成时必须替换】异常断言未实现');
  });

});

// ==============================
// 辅助函数
// ==============================

/**
 * 等待元素可见并点击
 */
async function waitAndClick(page, selector, timeout = 10000) {
  const element = page.locator(selector);
  await element.waitFor({ state: 'visible', timeout });
  await element.click();
}

/**
 * 安全填充输入框（先清空）
 */
async function safeFill(page, selector, text) {
  const element = page.locator(selector);
  await element.waitFor({ state: 'visible' });
  await element.clear();
  await element.fill(text);
}

/**
 * 截图并保存
 */
async function takeScreenshot(page, name) {
  await page.screenshot({ 
    path: `reports/screenshots/${name}-${Date.now()}.png`,
    fullPage: true 
  });
}

/**
 * 批量文案校验（用于文案类断言）
 * @param {Page} page 
 * @param {Array<{selector: string, expected: string}>} checks 
 */
async function verifyTexts(page, checks) {
  const results = [];
  for (const check of checks) {
    try {
      await expect(page.locator(check.selector)).toHaveText(check.expected);
      results.push({ ...check, passed: true });
    } catch (e) {
      const actual = await page.locator(check.selector).textContent().catch(() => '[元素不存在]');
      results.push({ ...check, passed: false, actual, error: e.message });
    }
  }
  return results;
}

/**
 * 验证跳转（支持URL或元素方式）
 */
async function verifyNavigation(page, { expectedUrl, expectedElement }) {
  if (expectedUrl) {
    await expect(page).toHaveURL(expectedUrl);
  }
  if (expectedElement) {
    await expect(page.locator(expectedElement)).toBeVisible();
  }
}
