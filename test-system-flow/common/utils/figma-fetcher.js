/**
 * Figma API 工具
 * 用于获取设计稿信息和分析UI元素
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const FIGMA_API_BASE = 'https://api.figma.com/v1';

/**
 * 从Figma URL中提取文件key和节点ID
 * @param {string} url - Figma URL
 * @returns {Object} { fileKey, nodeId }
 */
function parseUrl(url) {
  // 匹配格式: https://www.figma.com/design/{fileKey}/{fileName}?node-id={nodeId}
  const fileMatch = url.match(/figma\.com\/(design|file)\/([a-zA-Z0-9]+)/);
  const nodeMatch = url.match(/node-id=([^&]+)/);
  
  return {
    fileKey: fileMatch ? fileMatch[2] : null,
    nodeId: nodeMatch ? decodeURIComponent(nodeMatch[1]) : null
  };
}

/**
 * 发送Figma API请求
 * @param {string} endpoint - API端点
 * @param {string} token - Figma Personal Access Token
 * @returns {Promise<Object>} API响应
 */
function apiRequest(endpoint, token) {
  return new Promise((resolve, reject) => {
    const url = `${FIGMA_API_BASE}${endpoint}`;
    const options = {
      headers: {
        'X-Figma-Token': token
      }
    };

    https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`JSON解析失败: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

/**
 * 获取文件信息
 */
async function getFile(fileKey, token) {
  return apiRequest(`/files/${fileKey}`, token);
}

/**
 * 获取指定节点信息
 */
async function getNodes(fileKey, nodeIds, token) {
  const ids = Array.isArray(nodeIds) ? nodeIds.join(',') : nodeIds;
  return apiRequest(`/files/${fileKey}/nodes?ids=${encodeURIComponent(ids)}`, token);
}

/**
 * 获取节点图片
 */
async function getImages(fileKey, nodeIds, token, format = 'png') {
  const ids = Array.isArray(nodeIds) ? nodeIds.join(',') : nodeIds;
  return apiRequest(`/images/${fileKey}?ids=${encodeURIComponent(ids)}&format=${format}`, token);
}

/**
 * 递归提取节点中的文本和UI元素
 */
function extractElements(node, elements = { texts: [], frames: [], buttons: [] }) {
  if (!node) return elements;

  // 提取文本
  if (node.type === 'TEXT' && node.characters) {
    elements.texts.push({
      id: node.id,
      name: node.name,
      text: node.characters,
      style: node.style
    });
  }

  // 提取框架
  if (node.type === 'FRAME' || node.type === 'COMPONENT') {
    elements.frames.push({
      id: node.id,
      name: node.name,
      size: node.absoluteBoundingBox
    });
  }

  // 提取按钮（根据命名规则推断）
  if (node.name && /button|btn|按钮/i.test(node.name)) {
    elements.buttons.push({
      id: node.id,
      name: node.name,
      type: node.type
    });
  }

  // 递归处理子节点
  if (node.children) {
    node.children.forEach(child => extractElements(child, elements));
  }

  return elements;
}

/**
 * 检测文本中的拼写问题
 */
function detectTypos(texts) {
  const typoPatterns = [
    { pattern: /\btrail\b/i, suggestion: 'trial', context: '试用' },
    { pattern: /\brecieve\b/i, suggestion: 'receive', context: '接收' },
    { pattern: /\boccur\b/i, suggestion: 'occur', context: '发生' },
    { pattern: /\bseperator\b/i, suggestion: 'separator', context: '分隔符' },
  ];

  const issues = [];
  texts.forEach(t => {
    typoPatterns.forEach(p => {
      if (p.pattern.test(t.text)) {
        issues.push({
          elementId: t.id,
          elementName: t.name,
          originalText: t.text,
          issue: `可能的拼写错误: "${t.text.match(p.pattern)[0]}" 应为 "${p.suggestion}"`,
          suggestion: p.suggestion
        });
      }
    });
  });

  return issues;
}

/**
 * 分析Figma设计并生成报告
 */
async function analyzeDesign(config) {
  const { token, urls, outputDir } = config;
  
  const results = {
    files: [],
    elements: { texts: [], frames: [], buttons: [] },
    issues: []
  };

  for (const url of urls) {
    const { fileKey, nodeId } = parseUrl(url);
    if (!fileKey) {
      console.warn(`无法解析URL: ${url}`);
      continue;
    }

    try {
      let data;
      if (nodeId) {
        data = await getNodes(fileKey, nodeId, token);
        if (data.nodes) {
          Object.values(data.nodes).forEach(n => {
            if (n.document) {
              extractElements(n.document, results.elements);
            }
          });
        }
      } else {
        data = await getFile(fileKey, token);
        if (data.document) {
          extractElements(data.document, results.elements);
        }
      }
      
      results.files.push({ url, fileKey, nodeId, success: true });
    } catch (err) {
      results.files.push({ url, fileKey, nodeId, success: false, error: err.message });
    }
  }

  // 检测问题
  results.issues = detectTypos(results.elements.texts);

  // 保存结果
  if (outputDir) {
    fs.writeFileSync(
      path.join(outputDir, 'figma-results.json'),
      JSON.stringify(results, null, 2)
    );

    // 生成分析报告
    const report = generateAnalysisReport(results);
    fs.writeFileSync(
      path.join(outputDir, 'figma-ui-analysis.md'),
      report
    );
  }

  return results;
}

/**
 * 生成分析报告Markdown
 */
function generateAnalysisReport(results) {
  const lines = [
    '# Figma UI分析报告',
    '',
    `生成时间: ${new Date().toLocaleString('zh-CN')}`,
    '',
    '## 元素统计',
    '',
    `- 文本元素: ${results.elements.texts.length}`,
    `- 框架/组件: ${results.elements.frames.length}`,
    `- 按钮元素: ${results.elements.buttons.length}`,
    ''
  ];

  if (results.issues.length > 0) {
    lines.push('## 发现的问题', '');
    results.issues.forEach((issue, i) => {
      lines.push(`### 问题 ${i + 1}`);
      lines.push(`- **元素**: ${issue.elementName}`);
      lines.push(`- **原文**: ${issue.originalText}`);
      lines.push(`- **问题**: ${issue.issue}`);
      lines.push('');
    });
  } else {
    lines.push('## 发现的问题', '', '无明显问题', '');
  }

  return lines.join('\n');
}

module.exports = {
  parseUrl,
  getFile,
  getNodes,
  getImages,
  extractElements,
  detectTypos,
  analyzeDesign
};
