const fs = require('fs');
const path = require('path');
const yazl = require('yazl');
const XLSX = require('xlsx');

// 生成UUID
function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// 创建主题节点
function createTopic(title, children = []) {
  const topic = { id: uuid(), class: 'topic', title: title };
  if (children.length > 0) topic.children = { attached: children };
  return topic;
}

// 创建带详情的测试用例节点
function createTestCaseTopic(caseData) {
  const caseId = caseData['用例ID'] || '';
  const title = caseData['用例标题'] || '';
  const priority = caseData['优先级'] || '';
  const precondition = caseData['前置条件'] || '';
  const testData = caseData['测试数据'] || '';
  const steps = caseData['步骤'] || '';
  const expected = caseData['预期结果'] || '';
  
  const children = [];
  if (priority) children.push(createTopic(`优先级: ${priority}`));
  if (precondition) children.push(createTopic('前置条件', precondition.split('\n').filter(s => s.trim()).map(s => createTopic(s.trim()))));
  if (testData) children.push(createTopic(`测试数据: ${testData}`));
  if (steps) children.push(createTopic('操作步骤', steps.split('\n').filter(s => s.trim()).map(s => createTopic(s.trim()))));
  if (expected) children.push(createTopic('预期结果', expected.split('\n').filter(s => s.trim()).map(s => createTopic(s.trim()))));
  
  return createTopic(`[${caseId}] ${title} (${priority})`, children);
}

// 读取Excel数据
const workbook = XLSX.readFile(path.join(__dirname, 'test-cases.xlsx'));
const smokeData = XLSX.utils.sheet_to_json(workbook.Sheets['冒烟测试']);
const detailData = XLSX.utils.sheet_to_json(workbook.Sheets['详细测试']);
const p0Data = XLSX.utils.sheet_to_json(workbook.Sheets['P0自动化候选']);
const riskData = XLSX.utils.sheet_to_json(workbook.Sheets['问题风险']);

// 按模块分组
function groupByModule(data) {
  const groups = {};
  data.forEach(item => {
    const module = item['模块'] || '其他';
    if (!groups[module]) groups[module] = [];
    groups[module].push(item);
  });
  return groups;
}

// 构建节点
function buildTestNodes(data) {
  const moduleGroups = groupByModule(data);
  return Object.entries(moduleGroups).map(([module, items]) => 
    createTopic(module, items.map(c => createTestCaseTopic(c)))
  );
}

// 构建XMind数据
const rootTopic = createTopic('搜索功能测试用例', [
  createTopic('需求摘要', [
    createTopic('功能：搜索功能'),
    createTopic('目标端：Web'),
    createTopic('REQ-001: 搜索输入'),
    createTopic('REQ-002: 推荐搜索下拉框'),
    createTopic('REQ-003: 结果页跳转'),
    createTopic('REQ-004: 关键词高亮（红色）')
  ]),
  createTopic(`冒烟测试 (${smokeData.length}条)`, buildTestNodes(smokeData)),
  createTopic(`详细测试 (${detailData.length}条)`, buildTestNodes(detailData)),
  createTopic(`P0自动化候选 (${p0Data.length}条)`, p0Data.map(item => 
    createTopic(`[${item['自动化用例ID']}] ${item['场景']}`, [
      createTopic(`来源: ${item['来源用例ID']}`),
      createTopic('自动化步骤', (item['自动化步骤'] || '').split('\n').filter(s => s.trim()).map(s => createTopic(s.trim()))),
      createTopic(`断言: ${item['断言']}`),
      createTopic(`状态: ${item['执行状态']}`)
    ])
  )),
  createTopic(`问题和风险 (${riskData.length}条)`, riskData.map(item =>
    createTopic(`[${item['ID']}] ${item['描述']}`, [
      createTopic(`类型: ${item['类型']}`),
      createTopic(`影响: ${item['影响']}`),
      createTopic(`状态: ${item['状态']}`)
    ])
  ))
]);

// 创建XMind文件
const content = [{ id: uuid(), class: 'sheet', title: '搜索功能测试用例', rootTopic }];
const metadata = { creator: { name: 'Test System Flow', version: '1.0.0' } };
const manifest = { 'file-entries': { 'content.json': {}, 'metadata.json': {} } };

const outputPath = path.join(__dirname, 'test-cases.xmind');
const zipfile = new yazl.ZipFile();
zipfile.addBuffer(Buffer.from(JSON.stringify(content, null, 2)), 'content.json');
zipfile.addBuffer(Buffer.from(JSON.stringify(metadata, null, 2)), 'metadata.json');
zipfile.addBuffer(Buffer.from(JSON.stringify(manifest, null, 2)), 'manifest.json');

zipfile.outputStream.pipe(fs.createWriteStream(outputPath)).on('close', function() {
  console.log('✅ XMind文件已生成:', outputPath);
  console.log(`   - 冒烟测试: ${smokeData.length}条`);
  console.log(`   - 详细测试: ${detailData.length}条`);
  console.log(`   - P0自动化: ${p0Data.length}条`);
  console.log(`   - 问题风险: ${riskData.length}条`);
});
zipfile.end();
