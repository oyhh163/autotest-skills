/**
 * 测试体系公共模块入口
 * 统一导出所有工具和生成器
 */

const excelGenerator = require('./generators/excel-generator');
const xmindGenerator = require('./generators/xmind-generator');
const initProject = require('./utils/init-project');
const figmaFetcher = require('./utils/figma-fetcher');

module.exports = {
  // Excel生成器
  generateTestCasesExcel: excelGenerator.generateTestCasesExcel,
  generateAutomationReport: excelGenerator.generateAutomationReport,
  
  // XMind生成器
  generateXMind: xmindGenerator.generateXMind,
  generateXMindFromTestCases: xmindGenerator.generateFromTestCases,
  
  // 项目初始化
  initProject: initProject.initProject,
  generateProjectDirName: initProject.generateProjectDirName,
  
  // Figma工具
  figma: figmaFetcher,
  
  // 版本信息
  version: '1.0.0'
};
