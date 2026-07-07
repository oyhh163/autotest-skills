/**
 * Playwright配置模板
 * 复制此文件到测试项目并根据需要修改
 */
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  // 测试目录
  testDir: './tests',
  
  // 超时设置
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  
  // 重试次数
  retries: process.env.CI ? 2 : 0,
  
  // 并行数
  workers: process.env.CI ? 1 : undefined,
  
  // 报告器配置
  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/html', open: 'never' }],
    ['json', { outputFile: 'reports/results.json' }]
  ],
  
  // 全局设置
  use: {
    // 基础URL - 根据项目修改
    baseURL: process.env.TEST_URL || 'http://localhost:3000',
    
    // 浏览器设置（可选值：chromium, firefox, webkit, msedge）
    browserName: 'chromium',
    channel: 'msedge',  // 使用Edge浏览器
    headless: false,    // 显示浏览器窗口
    
    // 截图和录像
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    
    // 视口
    viewport: { width: 1280, height: 720 },
    
    // 其他设置
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },
  
  // 输出目录
  outputDir: 'reports/test-results',
  
  // 项目配置（多浏览器测试时使用）
  // projects: [
  //   { name: 'chromium', use: { browserName: 'chromium' } },
  //   { name: 'firefox', use: { browserName: 'firefox' } },
  //   { name: 'webkit', use: { browserName: 'webkit' } },
  // ],
});
