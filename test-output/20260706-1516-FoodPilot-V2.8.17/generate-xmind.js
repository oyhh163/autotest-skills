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
  const topic = {
    id: uuid(),
    class: 'topic',
    title: title
  };
  if (children.length > 0) {
    topic.children = { attached: children };
  }
  return topic;
}

// 创建带详情的测试用例节点
function createTestCaseTopic(caseData) {
  const caseId = caseData['用例ID'] || caseData['Case ID'] || '';
  const title = caseData['用例标题'] || caseData['Case Title'] || '';
  const priority = caseData['优先级'] || caseData['Priority'] || '';
  const platform = caseData['目标端'] || caseData['Platform'] || '';
  const precondition = caseData['前置条件'] || caseData['Preconditions'] || '';
  const testData = caseData['测试数据'] || caseData['Test Data'] || '';
  const steps = caseData['步骤'] || caseData['Steps'] || '';
  const expected = caseData['预期结果'] || caseData['Expected Result'] || '';
  const requirement = caseData['需求引用'] || caseData['Requirement Reference'] || '';
  const notes = caseData['备注/风险'] || caseData['Notes/Risks'] || '';
  
  const children = [];
  
  // 基本信息
  if (priority) children.push(createTopic(`优先级: ${priority}`));
  if (platform) children.push(createTopic(`目标端: ${platform}`));
  
  // 前置条件
  if (precondition) {
    children.push(createTopic('前置条件', 
      precondition.split('\n').filter(s => s.trim()).map(s => createTopic(s.trim()))
    ));
  }
  
  // 测试数据
  if (testData) {
    children.push(createTopic(`测试数据: ${testData}`));
  }
  
  // 操作步骤
  if (steps) {
    children.push(createTopic('操作步骤', 
      steps.split('\n').filter(s => s.trim()).map(s => createTopic(s.trim()))
    ));
  }
  
  // 预期结果
  if (expected) {
    children.push(createTopic('预期结果', 
      expected.split('\n').filter(s => s.trim()).map(s => createTopic(s.trim()))
    ));
  }
  
  // 需求引用
  if (requirement) {
    children.push(createTopic(`需求引用: ${requirement}`));
  }
  
  // 备注/风险
  if (notes) {
    children.push(createTopic(`备注: ${notes}`));
  }
  
  return createTopic(`[${caseId}] ${title} (${priority})`, children);
}

// 读取Excel数据
const workbook = XLSX.readFile(path.join(__dirname, 'test-cases.xlsx'));

// 获取冒烟测试数据
const smokeSheet = workbook.Sheets['冒烟测试'];
const smokeData = XLSX.utils.sheet_to_json(smokeSheet);

// 获取详细测试数据
const detailSheet = workbook.Sheets['详细测试'];
const detailData = XLSX.utils.sheet_to_json(detailSheet);

// 获取P0自动化候选数据
const p0Sheet = workbook.Sheets['P0自动化候选'];
const p0Data = XLSX.utils.sheet_to_json(p0Sheet);

// 获取问题风险数据
const riskSheet = workbook.Sheets['问题风险'];
const riskData = XLSX.utils.sheet_to_json(riskSheet);

// 按模块分组测试用例
function groupByModule(data) {
  const groups = {};
  data.forEach(item => {
    const module = item['模块'] || item['Module'] || '其他';
    if (!groups[module]) {
      groups[module] = [];
    }
    groups[module].push(item);
  });
  return groups;
}

// 按功能点分组
function groupByFeature(data) {
  const groups = {};
  data.forEach(item => {
    const feature = item['功能点'] || item['Feature Point'] || '其他';
    if (!groups[feature]) {
      groups[feature] = [];
    }
    groups[feature].push(item);
  });
  return groups;
}

// 构建冒烟测试节点
function buildSmokeTestNodes(data) {
  const moduleGroups = groupByModule(data);
  const moduleNodes = [];
  
  for (const [module, items] of Object.entries(moduleGroups)) {
    const featureGroups = groupByFeature(items);
    const featureNodes = [];
    
    for (const [feature, cases] of Object.entries(featureGroups)) {
      const caseNodes = cases.map(c => createTestCaseTopic(c));
      featureNodes.push(createTopic(feature, caseNodes));
    }
    
    moduleNodes.push(createTopic(module, featureNodes));
  }
  
  return moduleNodes;
}

// 构建详细测试节点
function buildDetailTestNodes(data) {
  const moduleGroups = groupByModule(data);
  const moduleNodes = [];
  
  for (const [module, items] of Object.entries(moduleGroups)) {
    const featureGroups = groupByFeature(items);
    const featureNodes = [];
    
    for (const [feature, cases] of Object.entries(featureGroups)) {
      const caseNodes = cases.map(c => createTestCaseTopic(c));
      featureNodes.push(createTopic(feature, caseNodes));
    }
    
    moduleNodes.push(createTopic(module, featureNodes));
  }
  
  return moduleNodes;
}

// 构建P0自动化候选节点
function buildP0Nodes(data) {
  return data.map(item => {
    const autoId = item['自动化用例ID'] || '';
    const sourceId = item['来源用例ID'] || '';
    const scenario = item['场景'] || '';
    const platform = item['目标端'] || '';
    const precondition = item['前置条件'] || '';
    const testData = item['测试数据'] || '';
    const steps = item['自动化步骤'] || '';
    const assertion = item['断言'] || '';
    const cleanup = item['清理'] || '';
    const blocking = item['阻塞问题'] || '';
    const status = item['执行状态'] || '';
    
    const children = [];
    if (sourceId) children.push(createTopic(`来源用例: ${sourceId}`));
    if (platform) children.push(createTopic(`目标端: ${platform}`));
    if (precondition) {
      children.push(createTopic('前置条件', 
        precondition.split('\n').filter(s => s.trim()).map(s => createTopic(s.trim()))
      ));
    }
    if (testData) children.push(createTopic(`测试数据: ${testData}`));
    if (steps) {
      children.push(createTopic('自动化步骤', 
        steps.split('\n').filter(s => s.trim()).map(s => createTopic(s.trim()))
      ));
    }
    if (assertion) {
      children.push(createTopic('断言', 
        assertion.split('\n').filter(s => s.trim()).map(s => createTopic(s.trim()))
      ));
    }
    if (cleanup) children.push(createTopic(`清理: ${cleanup}`));
    if (blocking) children.push(createTopic(`阻塞问题: ${blocking}`));
    if (status) children.push(createTopic(`执行状态: ${status}`));
    
    return createTopic(`[${autoId}] ${scenario}`, children);
  });
}

// 构建问题风险节点
function buildRiskNodes(data) {
  return data.map(item => {
    const id = item['ID'] || '';
    const type = item['类型'] || '';
    const desc = item['描述'] || '';
    const impact = item['影响'] || '';
    const needed = item['需要用户提供'] || '';
    const decision = item['决策'] || '';
    const status = item['状态'] || '';
    
    const children = [];
    if (type) children.push(createTopic(`类型: ${type}`));
    if (desc) children.push(createTopic(`描述: ${desc}`));
    if (impact) children.push(createTopic(`影响: ${impact}`));
    if (needed) children.push(createTopic(`需要用户提供: ${needed}`));
    if (decision) children.push(createTopic(`决策: ${decision}`));
    if (status) children.push(createTopic(`状态: ${status}`));
    
    return createTopic(`[${id}] ${desc.substring(0, 30)}...`, children);
  });
}

// 构建完整思维导图
const rootTopic = createTopic('FoodPilot V2.8.17 测试用例', [
  // 需求摘要
  createTopic('需求摘要', [
    createTopic('版本：V2.8.17'),
    createTopic('老用户OB测试'),
    createTopic('永久卡升级测试'),
    createTopic('评分弹窗删除'),
    createTopic('审核态挽留'),
    createTopic('埋点细化'),
    createTopic('US关键词更新'),
    createTopic('Figma UI设计分析')
  ]),
  
  // 冒烟测试
  createTopic(`冒烟测试 (${smokeData.length}条)`, buildSmokeTestNodes(smokeData)),
  
  // 详细测试
  createTopic(`详细测试 (${detailData.length}条)`, buildDetailTestNodes(detailData)),
  
  // P0自动化候选
  createTopic(`P0自动化候选 (${p0Data.length}条)`, [
    createTopic('Web', [createTopic('(无Web端测试)')]),
    createTopic('App (iOS)', buildP0Nodes(p0Data))
  ]),
  
  // 问题和风险
  createTopic(`问题和风险 (${riskData.length}条)`, buildRiskNodes(riskData))
]);

// XMind内容JSON
const content = [{
  id: uuid(),
  class: 'sheet',
  title: 'FoodPilot V2.8.17 测试用例',
  rootTopic: rootTopic
}];

// 元数据
const metadata = {
  creator: {
    name: 'Test System Flow',
    version: '1.0.0'
  }
};

// 清单文件
const manifest = {
  'file-entries': {
    'content.json': {},
    'metadata.json': {}
  }
};

// 创建XMind文件
const outputPath = path.join(__dirname, 'test-cases.xmind');
const zipfile = new yazl.ZipFile();

// 添加文件到ZIP
zipfile.addBuffer(Buffer.from(JSON.stringify(content, null, 2)), 'content.json');
zipfile.addBuffer(Buffer.from(JSON.stringify(metadata, null, 2)), 'metadata.json');
zipfile.addBuffer(Buffer.from(JSON.stringify(manifest, null, 2)), 'manifest.json');

// 写入文件
zipfile.outputStream.pipe(fs.createWriteStream(outputPath)).on('close', function() {
  const stats = fs.statSync(outputPath);
  console.log('✅ XMind文件已生成:', outputPath);
  console.log('   文件大小:', (stats.size / 1024).toFixed(2), 'KB');
  console.log('\n📁 文件结构（包含详细步骤和预期结果）:');
  console.log('├── 需求摘要 (8项)');
  console.log(`├── 冒烟测试 (${smokeData.length}条)`);
  console.log('│   └── 每条用例包含: 前置条件/测试数据/操作步骤/预期结果/需求引用');
  console.log(`├── 详细测试 (${detailData.length}条)`);
  console.log('│   └── 每条用例包含: 前置条件/测试数据/操作步骤/预期结果/需求引用');
  console.log(`├── P0自动化候选 (${p0Data.length}条)`);
  console.log('│   └── 每条用例包含: 前置条件/自动化步骤/断言/清理/阻塞问题');
  console.log(`└── 问题和风险 (${riskData.length}条)`);
  console.log('    └── 每条包含: 类型/描述/影响/状态');
  console.log('\n💡 提示: 使用XMind软件打开此文件查看完整层级');
});

zipfile.end();
