const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

// 测试执行结果数据
const testResults = [
  {
    caseId: 'AUTO-001',
    caseName: '点击搜索框展示推荐下拉框',
    priority: 'P0',
    status: '通过',
    duration: '3.1s',
    details: '有热搜展示'
  },
  {
    caseId: 'AUTO-002', 
    caseName: '输入关键词跳转搜索结果页',
    priority: 'P0',
    status: '通过',
    duration: '4.9s',
    details: '搜索"测试"返回15个结果'
  },
  {
    caseId: 'AUTO-003',
    caseName: '搜索结果中关键词高亮为红色',
    priority: 'P0',
    status: '通过', 
    duration: '4.5s',
    details: '找到24个高亮元素，颜色rgb(247,49,49)'
  },
  {
    caseId: 'AUTO-004',
    caseName: '按回车键触发搜索',
    priority: 'P1',
    status: '通过',
    duration: '4.0s',
    details: '回车键触发搜索成功'
  },
  {
    caseId: 'DET-009',
    caseName: '输入单个字符搜索',
    priority: 'P2',
    status: '通过',
    duration: '3.4s',
    details: '单字符搜索正常'
  },
  {
    caseId: 'DET-012',
    caseName: '输入空格搜索',
    priority: 'P2',
    status: '通过',
    duration: '2.4s',
    details: '空格输入保持首页不跳转'
  },
  {
    caseId: 'EXTRA-001',
    caseName: '中英文混合关键词搜索',
    priority: 'P1',
    status: '通过',
    duration: '3.5s',
    details: '混合搜索正常'
  }
];

// 创建工作簿
const wb = xlsx.utils.book_new();

// === Sheet 1: 测试执行汇总 ===
const summaryData = [
  ['百度搜索功能 - 自动化测试执行报告'],
  [],
  ['执行时间', new Date().toLocaleString('zh-CN')],
  ['目标URL', 'https://www.baidu.com'],
  ['浏览器', 'Microsoft Edge'],
  ['框架', 'Playwright'],
  [],
  ['执行统计'],
  ['总用例数', '7'],
  ['通过', '7'],
  ['失败', '0'],
  ['通过率', '100%'],
  ['总耗时', '27.7s']
];
const summarySheet = xlsx.utils.aoa_to_sheet(summaryData);
xlsx.utils.book_append_sheet(wb, summarySheet, '执行汇总');

// === Sheet 2: 详细结果 ===
const detailHeaders = ['用例ID', '用例名称', '优先级', '状态', '耗时', '详情'];
const detailData = [detailHeaders];
testResults.forEach(r => {
  detailData.push([r.caseId, r.caseName, r.priority, r.status, r.duration, r.details]);
});
const detailSheet = xlsx.utils.aoa_to_sheet(detailData);
xlsx.utils.book_append_sheet(wb, detailSheet, '详细结果');

// === Sheet 3: 缺陷汇总（无缺陷） ===
const defectHeaders = ['缺陷ID', '关联用例', '缺陷标题', '严重程度', '状态', '描述'];
const defectData = [defectHeaders];
defectData.push(['无', '无', '本次测试未发现缺陷', '-', '-', '所有P0自动化用例均通过']);
const defectSheet = xlsx.utils.aoa_to_sheet(defectData);
xlsx.utils.book_append_sheet(wb, defectSheet, '缺陷汇总');

// 保存文件
const timestamp = new Date().toISOString().slice(0,10).replace(/-/g,'');
const outputPath = path.join(__dirname, `automation-report-${timestamp}.xlsx`);
xlsx.writeFile(wb, outputPath);

console.log(`✅ 自动化测试报告已生成: ${outputPath}`);

// 也保存到桌面
const desktopPath = path.join(process.env.USERPROFILE, 'Desktop', `百度搜索-自动化测试报告-${timestamp}.xlsx`);
xlsx.writeFile(wb, desktopPath);
console.log(`✅ 报告已复制到桌面: ${desktopPath}`);
