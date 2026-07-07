/**
 * XMind思维导图生成脚本模板
 * 
 * 使用方式：复制到项目的 scripts/ 目录，修改测试数据后运行
 * 
 * 重要：此脚本通过 common.js 引用公共模块，无需安装 yazl 依赖
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
    priority: 'P1'
  },
  // 添加更多详细测试用例...
];

// ============================================
// 执行生成
// ============================================

async function main() {
  try {
    const outputPath = await common.generateXMindFromTestCases({
      projectName: PROJECT_NAME,
      outputDir: OUTPUT_DIR,
      smokeCases,
      detailedCases
    });
    
    console.log(`\n🧠 XMind思维导图已生成: ${outputPath}`);
  } catch (error) {
    console.error('❌ 生成失败:', error.message);
    process.exit(1);
  }
}

main();
