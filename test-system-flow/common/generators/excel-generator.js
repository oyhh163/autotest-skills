/**
 * 测试用例Excel生成器
 * 公共模块 - 可被各测试项目复用
 */
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

/**
 * 生成测试用例Excel
 * @param {Object} config - 配置对象
 * @param {string} config.projectName - 项目名称
 * @param {string} config.outputDir - 输出目录
 * @param {Array} config.smokeCases - 冒烟测试用例
 * @param {Array} config.detailedCases - 详细测试用例
 * @param {Array} config.p0Candidates - P0自动化候选
 * @param {Array} config.risks - 风险/问题列表
 * @returns {string} 生成的文件路径
 */
function generateTestCasesExcel(config) {
  const {
    projectName,
    outputDir,
    smokeCases = [],
    detailedCases = [],
    p0Candidates = [],
    risks = []
  } = config;

  const wb = xlsx.utils.book_new();
  const timestamp = new Date().toLocaleString('zh-CN');

  // Sheet 1: 冒烟测试
  const smokeHeaders = ['用例ID', '模块', '用例标题', '前置条件', '操作步骤', '预期结果', '优先级'];
  const smokeData = [smokeHeaders, ...smokeCases.map(c => [
    c.id, c.module, c.title, c.precondition, c.steps, c.expected, c.priority
  ])];
  const smokeSheet = xlsx.utils.aoa_to_sheet(smokeData);
  xlsx.utils.book_append_sheet(wb, smokeSheet, '冒烟测试');

  // Sheet 2: 详细测试
  const detailHeaders = ['用例ID', '模块', '用例标题', '前置条件', '操作步骤', '预期结果', '优先级', '类型'];
  const detailData = [detailHeaders, ...detailedCases.map(c => [
    c.id, c.module, c.title, c.precondition, c.steps, c.expected, c.priority, c.type || '功能'
  ])];
  const detailSheet = xlsx.utils.aoa_to_sheet(detailData);
  xlsx.utils.book_append_sheet(wb, detailSheet, '详细测试');

  // Sheet 3: P0自动化候选
  const p0Headers = ['用例ID', '用例标题', '优先级', '自动化可行性', '预估工时', '备注'];
  const p0Data = [p0Headers, ...p0Candidates.map(c => [
    c.id, c.title, c.priority, c.feasibility || '高', c.effort || '0.5h', c.note || ''
  ])];
  const p0Sheet = xlsx.utils.aoa_to_sheet(p0Data);
  xlsx.utils.book_append_sheet(wb, p0Sheet, 'P0自动化候选');

  // Sheet 4: 风险/问题
  const riskHeaders = ['ID', '类型', '描述', '影响', '状态', '负责人'];
  const riskData = [riskHeaders, ...risks.map(r => [
    r.id, r.type || '风险', r.description, r.impact || '中', r.status || '待确认', r.owner || '-'
  ])];
  const riskSheet = xlsx.utils.aoa_to_sheet(riskData);
  xlsx.utils.book_append_sheet(wb, riskSheet, '问题风险');

  // Sheet 5: 统计信息
  const statsData = [
    ['测试用例统计'],
    [],
    ['项目名称', projectName],
    ['生成时间', timestamp],
    [],
    ['类别', '数量'],
    ['冒烟测试', smokeCases.length],
    ['详细测试', detailedCases.length],
    ['P0自动化候选', p0Candidates.length],
    ['问题/风险', risks.length],
    ['总计', smokeCases.length + detailedCases.length]
  ];
  const statsSheet = xlsx.utils.aoa_to_sheet(statsData);
  xlsx.utils.book_append_sheet(wb, statsSheet, '统计信息');

  // 保存文件
  const outputPath = path.join(outputDir, 'test-cases.xlsx');
  xlsx.writeFile(wb, outputPath);

  console.log(`✅ Excel测试用例已生成: ${outputPath}`);
  return outputPath;
}

/**
 * 生成自动化测试报告Excel
 * @param {Object} config - 配置对象
 */
function generateAutomationReport(config) {
  const {
    projectName,
    outputDir,
    targetUrl,
    browser,
    framework,
    testResults = [],
    defects = []
  } = config;

  const wb = xlsx.utils.book_new();
  const timestamp = new Date().toLocaleString('zh-CN');

  // 计算统计
  const passed = testResults.filter(r => r.status === '通过').length;
  const failed = testResults.filter(r => r.status === '失败').length;
  const total = testResults.length;
  const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) + '%' : '0%';
  const totalDuration = testResults.reduce((sum, r) => {
    const d = parseFloat(r.duration) || 0;
    return sum + d;
  }, 0).toFixed(1) + 's';

  // Sheet 1: 执行汇总
  const summaryData = [
    [`${projectName} - 自动化测试执行报告`],
    [],
    ['执行时间', timestamp],
    ['目标URL', targetUrl],
    ['浏览器', browser],
    ['框架', framework],
    [],
    ['执行统计'],
    ['总用例数', total],
    ['通过', passed],
    ['失败', failed],
    ['通过率', passRate],
    ['总耗时', totalDuration]
  ];
  const summarySheet = xlsx.utils.aoa_to_sheet(summaryData);
  xlsx.utils.book_append_sheet(wb, summarySheet, '执行汇总');

  // Sheet 2: 详细结果
  const detailHeaders = ['用例ID', '用例名称', '优先级', '状态', '耗时', '详情'];
  const detailData = [detailHeaders, ...testResults.map(r => [
    r.caseId, r.caseName, r.priority, r.status, r.duration, r.details
  ])];
  const detailSheet = xlsx.utils.aoa_to_sheet(detailData);
  xlsx.utils.book_append_sheet(wb, detailSheet, '详细结果');

  // Sheet 3: 缺陷汇总
  const defectHeaders = ['缺陷ID', '关联用例', '缺陷标题', '严重程度', '状态', '描述'];
  const defectData = [defectHeaders];
  if (defects.length > 0) {
    defects.forEach(d => {
      defectData.push([d.id, d.caseId, d.title, d.severity, d.status, d.description]);
    });
  } else {
    defectData.push(['无', '无', '本次测试未发现缺陷', '-', '-', '所有测试用例均通过']);
  }
  const defectSheet = xlsx.utils.aoa_to_sheet(defectData);
  xlsx.utils.book_append_sheet(wb, defectSheet, '缺陷汇总');

  // 保存文件
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const outputPath = path.join(outputDir, `automation-report-${dateStr}.xlsx`);
  xlsx.writeFile(wb, outputPath);

  console.log(`✅ 自动化测试报告已生成: ${outputPath}`);
  return outputPath;
}

module.exports = {
  generateTestCasesExcel,
  generateAutomationReport
};

// 命令行支持
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    console.log(`
测试用例Excel生成器

用法: node excel-generator.js --config <config.json>

配置文件格式:
{
  "projectName": "项目名称",
  "outputDir": "./output",
  "smokeCases": [...],
  "detailedCases": [...],
  "p0Candidates": [...],
  "risks": [...]
}
    `);
  }
}
