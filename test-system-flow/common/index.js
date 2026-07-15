/**
 * 测试体系公共模块入口
 * 统一导出所有工具和生成器
 */

const excelGenerator = require('./generators/excel-generator');
const xmindGenerator = require('./generators/xmind-generator');
const initProject = require('./utils/init-project');
const figmaFetcher = require('./utils/figma-fetcher');
const assertionValidator = require('./utils/assertion-validator');
const reportParser = require('./utils/report-parser');

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
  
  // 断言校验工具
  assertionValidator: {
    analyzeSpecFile: assertionValidator.analyzeSpecFile,
    analyzeDirectory: assertionValidator.analyzeDirectory,
    generateReport: assertionValidator.generateReport,
    validateAssertions: assertionValidator.validateAssertions,
  },
  
  // 报告解析工具
  reportParser: {
    parsePlaywrightReport: reportParser.parsePlaywrightReport,
    findAndParseReport: reportParser.findAndParseReport,
    generateSummary: reportParser.generateSummary,
    convertToBugRecords: reportParser.convertToBugRecords,
  },
  
  // 版本信息
  version: '1.1.0'
};
