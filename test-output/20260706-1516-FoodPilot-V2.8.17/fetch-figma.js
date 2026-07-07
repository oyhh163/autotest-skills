/**
 * Figma API 访问工具
 * 用于获取UI设计信息以增强测试用例
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const config = require('./figma-config.json');
const FIGMA_TOKEN = config.figma_token;

// Figma API 请求
function figmaRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.figma.com',
      path: endpoint,
      method: 'GET',
      headers: {
        'X-Figma-Token': FIGMA_TOKEN
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// 获取文件信息
async function getFileInfo(fileKey) {
  console.log(`\n获取文件信息: ${fileKey}`);
  const data = await figmaRequest(`/v1/files/${fileKey}`);
  return data;
}

// 获取特定节点信息
async function getNodeInfo(fileKey, nodeId) {
  console.log(`获取节点信息: ${fileKey}, node: ${nodeId}`);
  const nodeIds = nodeId.replace('-', ':');
  const data = await figmaRequest(`/v1/files/${fileKey}/nodes?ids=${nodeIds}`);
  return data;
}

// 获取节点图片URL
async function getNodeImages(fileKey, nodeIds, scale = 2) {
  console.log(`获取节点图片: ${fileKey}`);
  const ids = nodeIds.map(id => id.replace('-', ':')).join(',');
  const data = await figmaRequest(`/v1/images/${fileKey}?ids=${ids}&scale=${scale}&format=png`);
  return data;
}

// 递归提取节点信息
function extractNodeInfo(node, depth = 0, results = []) {
  if (!node) return results;
  
  const indent = '  '.repeat(depth);
  const info = {
    id: node.id,
    name: node.name,
    type: node.type,
    depth: depth
  };
  
  // 提取文本内容
  if (node.type === 'TEXT' && node.characters) {
    info.text = node.characters;
  }
  
  // 提取尺寸
  if (node.absoluteBoundingBox) {
    info.width = node.absoluteBoundingBox.width;
    info.height = node.absoluteBoundingBox.height;
  }
  
  results.push(info);
  
  // 递归处理子节点
  if (node.children) {
    for (const child of node.children) {
      extractNodeInfo(child, depth + 1, results);
    }
  }
  
  return results;
}

// 生成UI分析报告
function generateUIReport(nodeInfos, fileName) {
  let report = `# ${fileName} UI分析报告\n\n`;
  
  // 按深度分组
  const frames = nodeInfos.filter(n => n.type === 'FRAME' && n.depth <= 2);
  const texts = nodeInfos.filter(n => n.type === 'TEXT' && n.text);
  const buttons = nodeInfos.filter(n => 
    n.name.toLowerCase().includes('button') || 
    n.name.toLowerCase().includes('btn') ||
    n.name.toLowerCase().includes('cta')
  );
  
  report += `## 页面框架 (${frames.length}个)\n`;
  frames.forEach(f => {
    report += `- **${f.name}** (${f.width ? Math.round(f.width) : '?'}x${f.height ? Math.round(f.height) : '?'})\n`;
  });
  
  report += `\n## 文本元素 (${texts.length}个)\n`;
  texts.slice(0, 50).forEach(t => {
    const text = t.text.length > 100 ? t.text.substring(0, 100) + '...' : t.text;
    report += `- ${text.replace(/\n/g, ' ')}\n`;
  });
  
  report += `\n## 按钮/交互元素 (${buttons.length}个)\n`;
  buttons.forEach(b => {
    report += `- **${b.name}**\n`;
  });
  
  return report;
}

// 主函数
async function main() {
  console.log('=== Figma UI 分析工具 ===\n');
  console.log('Token:', FIGMA_TOKEN.substring(0, 10) + '...');
  
  const results = {
    prototype: null,
    ui: null,
    analysis: []
  };
  
  try {
    // 1. 获取原型图信息
    console.log('\n--- 获取原型图 ---');
    const protoFile = await getFileInfo(config.files.prototype.file_key);
    results.prototype = {
      name: protoFile.name,
      lastModified: protoFile.lastModified,
      version: protoFile.version
    };
    console.log(`文件名: ${protoFile.name}`);
    console.log(`最后修改: ${protoFile.lastModified}`);
    
    // 获取原型图特定节点
    const protoNode = await getNodeInfo(
      config.files.prototype.file_key, 
      config.files.prototype.node_id
    );
    
    if (protoNode.nodes) {
      const nodeKey = config.files.prototype.node_id.replace('-', ':');
      const node = protoNode.nodes[nodeKey];
      if (node && node.document) {
        const nodeInfos = extractNodeInfo(node.document);
        results.analysis.push({
          source: 'prototype',
          nodeCount: nodeInfos.length,
          frames: nodeInfos.filter(n => n.type === 'FRAME').length,
          texts: nodeInfos.filter(n => n.type === 'TEXT').length
        });
        
        // 生成报告
        const report = generateUIReport(nodeInfos, '原型图');
        fs.writeFileSync(
          path.join(__dirname, 'figma-prototype-analysis.md'), 
          report
        );
        console.log('原型图分析报告已保存');
      }
    }
    
    // 2. 获取UI图信息
    console.log('\n--- 获取UI图 ---');
    const uiFile = await getFileInfo(config.files.ui.file_key);
    results.ui = {
      name: uiFile.name,
      lastModified: uiFile.lastModified,
      version: uiFile.version
    };
    console.log(`文件名: ${uiFile.name}`);
    console.log(`最后修改: ${uiFile.lastModified}`);
    
    // 获取UI图特定节点
    const uiNode = await getNodeInfo(
      config.files.ui.file_key,
      config.files.ui.node_id
    );
    
    if (uiNode.nodes) {
      const nodeKey = config.files.ui.node_id.replace('-', ':');
      const node = uiNode.nodes[nodeKey];
      if (node && node.document) {
        const nodeInfos = extractNodeInfo(node.document);
        results.analysis.push({
          source: 'ui',
          nodeCount: nodeInfos.length,
          frames: nodeInfos.filter(n => n.type === 'FRAME').length,
          texts: nodeInfos.filter(n => n.type === 'TEXT').length
        });
        
        // 生成报告
        const report = generateUIReport(nodeInfos, 'UI设计图');
        fs.writeFileSync(
          path.join(__dirname, 'figma-ui-analysis.md'),
          report
        );
        console.log('UI设计图分析报告已保存');
      }
    }
    
    // 3. 尝试获取节点图片
    console.log('\n--- 获取设计图片 ---');
    try {
      const protoImages = await getNodeImages(
        config.files.prototype.file_key,
        [config.files.prototype.node_id]
      );
      if (protoImages.images) {
        results.prototypeImageUrl = Object.values(protoImages.images)[0];
        console.log('原型图图片URL:', results.prototypeImageUrl ? '已获取' : '无');
      }
    } catch (e) {
      console.log('获取原型图图片失败:', e.message);
    }
    
    try {
      const uiImages = await getNodeImages(
        config.files.ui.file_key,
        [config.files.ui.node_id]
      );
      if (uiImages.images) {
        results.uiImageUrl = Object.values(uiImages.images)[0];
        console.log('UI图图片URL:', results.uiImageUrl ? '已获取' : '无');
      }
    } catch (e) {
      console.log('获取UI图图片失败:', e.message);
    }
    
    // 保存结果摘要
    fs.writeFileSync(
      path.join(__dirname, 'figma-results.json'),
      JSON.stringify(results, null, 2)
    );
    
    console.log('\n=== 分析完成 ===');
    console.log(JSON.stringify(results, null, 2));
    
  } catch (error) {
    console.error('错误:', error.message);
    if (error.message.includes('403')) {
      console.error('Token可能无效或无权限访问该文件');
    }
    process.exit(1);
  }
}

main();
