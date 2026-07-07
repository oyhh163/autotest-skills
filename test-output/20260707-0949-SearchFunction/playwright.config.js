const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/html' }],
    ['json', { outputFile: 'reports/results.json' }]
  ],
  use: {
    // 基础URL - 百度
    baseURL: 'https://www.baidu.com',
    
    // 浏览器设置
    browserName: 'chromium', // Edge使用chromium内核
    channel: 'msedge', // 使用Edge浏览器
    headless: false, // 显示浏览器窗口
    
    // 截图和录像
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    
    // 视口
    viewport: { width: 1280, height: 720 },
  },
  
  outputDir: 'reports/test-results',
});
