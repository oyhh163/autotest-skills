/**
 * XMind思维导图生成器
 * 公共模块 - 使用yazl手动构建XMind文件结构
 */
const yazl = require('yazl');
const fs = require('fs');
const path = require('path');

/**
 * 生成XMind文件
 * @param {Object} config - 配置对象
 * @param {string} config.projectName - 项目名称
 * @param {string} config.outputDir - 输出目录
 * @param {Object} config.structure - 思维导图结构
 * @returns {Promise<string>} 生成的文件路径
 */
async function generateXMind(config) {
  const { projectName, outputDir, structure } = config;

  // 构建content.json
  const contentJson = buildContentJson(projectName, structure);

  // 创建manifest.json
  const manifestJson = {
    "file-entries": {
      "content.json": {},
      "metadata.json": {}
    }
  };

  // 创建metadata.json
  const metadataJson = {
    "creator": {
      "name": "Test System Flow",
      "version": "1.0.0"
    }
  };

  // 创建ZIP文件
  const zipFile = new yazl.ZipFile();
  
  zipFile.addBuffer(
    Buffer.from(JSON.stringify(contentJson, null, 2), 'utf8'),
    'content.json'
  );
  zipFile.addBuffer(
    Buffer.from(JSON.stringify(manifestJson, null, 2), 'utf8'),
    'manifest.json'
  );
  zipFile.addBuffer(
    Buffer.from(JSON.stringify(metadataJson, null, 2), 'utf8'),
    'metadata.json'
  );

  zipFile.end();

  // 写入文件
  const outputPath = path.join(outputDir, 'test-cases.xmind');
  
  return new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream(outputPath);
    zipFile.outputStream.pipe(writeStream);
    writeStream.on('close', () => {
      console.log(`✅ XMind思维导图已生成: ${outputPath}`);
      resolve(outputPath);
    });
    writeStream.on('error', reject);
  });
}

/**
 * 构建XMind的content.json结构
 */
function buildContentJson(title, structure) {
  let topicIdCounter = 1;
  
  function generateId() {
    return `topic-${topicIdCounter++}`;
  }

  function buildTopic(node) {
    const topic = {
      id: generateId(),
      title: node.title || node.name || '未命名'
    };

    if (node.children && node.children.length > 0) {
      topic.children = {
        attached: node.children.map(child => buildTopic(child))
      };
    }

    // 支持详细信息作为子节点
    if (node.details) {
      if (!topic.children) {
        topic.children = { attached: [] };
      }
      node.details.forEach(detail => {
        topic.children.attached.push({
          id: generateId(),
          title: detail
        });
      });
    }

    return topic;
  }

  const rootTopic = {
    id: 'root',
    title: title,
    children: {
      attached: structure.children ? structure.children.map(child => buildTopic(child)) : []
    }
  };

  return [{
    id: 'sheet-1',
    title: 'Sheet 1',
    rootTopic: rootTopic
  }];
}

/**
 * 从测试用例数据生成XMind结构
 * @param {Object} config - 配置对象
 * @param {string} config.projectName - 项目名称
 * @param {string} config.outputDir - 输出目录
 * @param {Array} config.smokeCases - 冒烟测试用例
 * @param {Array} config.detailedCases - 详细测试用例
 */
async function generateFromTestCases(config) {
  const { projectName, outputDir, smokeCases = [], detailedCases = [] } = config;

  // 按模块分组
  const groupByModule = (cases) => {
    const groups = {};
    cases.forEach(c => {
      const module = c.module || '其他';
      if (!groups[module]) groups[module] = [];
      groups[module].push(c);
    });
    return groups;
  };

  // 构建用例节点（包含详细步骤）
  const buildCaseNode = (c) => {
    const details = [];
    if (c.precondition) details.push(`前置条件: ${c.precondition}`);
    if (c.steps) details.push(`操作步骤: ${c.steps}`);
    if (c.expected) details.push(`预期结果: ${c.expected}`);
    
    return {
      title: `[${c.priority || 'P2'}] ${c.id}: ${c.title}`,
      details: details.length > 0 ? details : undefined
    };
  };

  // 构建模块节点
  const buildModuleNodes = (cases, prefix) => {
    const groups = groupByModule(cases);
    return Object.entries(groups).map(([module, moduleCases]) => ({
      title: module,
      children: moduleCases.map(c => buildCaseNode(c))
    }));
  };

  const structure = {
    children: [
      {
        title: '冒烟测试',
        children: buildModuleNodes(smokeCases, 'SMK')
      },
      {
        title: '详细测试',
        children: buildModuleNodes(detailedCases, 'DET')
      }
    ]
  };

  return generateXMind({ projectName, outputDir, structure });
}

module.exports = {
  generateXMind,
  generateFromTestCases
};

// 命令行支持
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    console.log(`
XMind思维导图生成器

用法: node xmind-generator.js --config <config.json>

配置文件格式:
{
  "projectName": "项目名称",
  "outputDir": "./output",
  "smokeCases": [...],
  "detailedCases": [...]
}
    `);
  }
}
