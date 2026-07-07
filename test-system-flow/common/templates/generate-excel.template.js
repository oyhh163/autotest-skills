/**
 * 测试用例Excel生成脚本模板
 * 
 * 使用方式：复制到项目的 scripts/ 目录，修改测试数据后运行
 * 
 * 重要：此脚本通过 common.js 引用公共模块，无需安装 xlsx 依赖
 */
const path = require('path');
const common = require('./common');  // 引用公共模块

// 项目配置
const PROJECT_NAME = '项目名称';  // TODO: 修改为实际项目名
const OUTPUT_DIR = path.join(__dirname, '..');

// ============================================
// 测试用例数据 - TODO: 根据实际需求修改
// ============================================

const smokeCases = [
  {
    id: 'SMK-001',
    module: '模块名',
    title: '冒烟测试用例标题',
    precondition: '前置条件',
    steps: '操作步骤',
    expected: '预期结果',
    priority: 'P0'
  },
  // 添加更多冒烟测试用例...
];

const detailedCases = [
  {
    id: 'DET-001',
    module: '模块名',
    title: '详细测试用例标题',
    precondition: '前置条件',
    steps: '操作步骤',
    expected: '预期结果',
    priority: 'P1',
    type: '功能'
  },
  // 添加更多详细测试用例...
];

const p0Candidates = [
  {
    id: 'AUTO-001',
    title: 'P0自动化用例标题',
    priority: 'P0',
    feasibility: '高',
    effort: '0.5h',
    note: ''
  },
  // 添加更多P0候选...
];

const risks = [
  {
    id: 'RISK-001',
    type: '风险',
    description: '风险描述',
    impact: '中',
    status: '待确认',
    owner: '-'
  },
  // 添加更多风险...
];

// ============================================
// 执行生成
// ============================================

try {
  const outputPath = common.generateTestCasesExcel({
    projectName: PROJECT_NAME,
    outputDir: OUTPUT_DIR,
    smokeCases,
    detailedCases,
    p0Candidates,
    risks
  });
  
  console.log(`\n📊 测试用例Excel已生成: ${outputPath}`);
} catch (error) {
  console.error('❌ 生成失败:', error.message);
  process.exit(1);
}
