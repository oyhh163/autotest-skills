/**
 * 自动化测试报告生成脚本模板
 * 
 * 使用方式：复制到项目的 scripts/ 目录，修改测试结果数据后运行
 * 
 * 重要：此脚本通过 common.js 引用公共模块，无需安装 xlsx 依赖
 */
const path = require('path');
const common = require('./common');  // 引用公共模块

// 项目配置
const PROJECT_NAME = '项目名称';  // TODO: 修改为实际项目名
const OUTPUT_DIR = path.join(__dirname, '..');
const TARGET_URL = 'https://example.com';  // TODO: 修改为实际URL

// ============================================
// 测试结果数据 - TODO: 根据实际执行结果修改
// ============================================

const testResults = [
  {
    caseId: 'AUTO-001',
    caseName: '测试用例名称',
    priority: 'P0',
    status: '通过',  // 通过 / 失败
    duration: '3.0s',
    details: '执行详情'
  },
  // 添加更多测试结果...
];

const defects = [
  // 如果有缺陷，添加到这里
  // {
  //   id: 'BUG-001',
  //   caseId: 'AUTO-001',
  //   title: '缺陷标题',
  //   severity: '高',
  //   status: '待修复',
  //   description: '缺陷描述'
  // }
];

// ============================================
// 执行生成
// ============================================

try {
  const outputPath = common.generateAutomationReport({
    projectName: PROJECT_NAME,
    outputDir: OUTPUT_DIR,
    targetUrl: TARGET_URL,
    browser: 'Edge',
    framework: 'Playwright',
    testResults,
    defects
  });
  
  console.log(`\n📋 自动化测试报告已生成: ${outputPath}`);
} catch (error) {
  console.error('❌ 生成失败:', error.message);
  process.exit(1);
}
