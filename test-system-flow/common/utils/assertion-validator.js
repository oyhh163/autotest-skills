/**
 * 自动化脚本断言校验工具
 * 检查生成的 spec 文件是否包含有效的业务断言
 */

const fs = require('fs');
const path = require('path');

// 弱断言模式（仅检查存在/可见性，不验证业务逻辑）
const WEAK_ASSERTION_PATTERNS = [
  /await\s+expect\([^)]+\)\.toBeVisible\(\s*\)/g,
  /await\s+expect\([^)]+\)\.toBeTruthy\(\s*\)/g,
  /await\s+expect\([^)]+\)\.toBeDefined\(\s*\)/g,
  /await\s+expect\([^)]+\)\.toBeAttached\(\s*\)/g,
];

// 强断言模式（验证具体业务逻辑）
const STRONG_ASSERTION_PATTERNS = [
  /\.toHaveText\([^)]+\)/g,           // 文案断言
  /\.toContainText\([^)]+\)/g,        // 包含文案
  /\.toHaveURL\([^)]+\)/g,            // URL断言
  /\.toBeDisabled\(\)/g,              // 禁用状态
  /\.toBeEnabled\(\)/g,               // 启用状态
  /\.toHaveValue\([^)]+\)/g,          // 输入值断言
  /\.toHaveAttribute\([^)]+\)/g,      // 属性断言
  /\.toHaveClass\([^)]+\)/g,          // CSS类断言
  /\.toHaveCSS\([^)]+\)/g,            // 样式断言
  /\.toHaveCount\([^)]+\)/g,          // 数量断言
  /expect\([^)]+\)\.toBe\([^)]+\)/g,  // 精确相等
  /expect\([^)]+\)\.toEqual\([^)]+\)/g, // 对象相等
  /expect\([^)]+\)\.toMatch\([^)]+\)/g, // 正则匹配
];

// 无效断言模式
const INVALID_PATTERNS = [
  /throw new Error\('【生成时必须替换】/g,  // 模板占位符未替换
  /\/\/\s*await\s+expect/g,                 // 注释掉的断言
  /console\.log\(['"]✅/g,                  // 用 console.log 代替断言
];

/**
 * 分析单个测试文件的断言质量
 * @param {string} filePath - spec 文件路径
 * @returns {Object} 分析结果
 */
function analyzeSpecFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const fileName = path.basename(filePath);
  
  // 提取所有 test() 块
  const testBlocks = content.match(/test\(['"](.*?)['"],\s*async[^}]+\}\s*\)/gs) || [];
  
  const result = {
    file: fileName,
    path: filePath,
    totalTests: testBlocks.length,
    weakAssertions: 0,
    strongAssertions: 0,
    invalidAssertions: 0,
    issues: [],
    testDetails: [],
  };
  
  // 统计全文的断言
  for (const pattern of WEAK_ASSERTION_PATTERNS) {
    const matches = content.match(pattern) || [];
    result.weakAssertions += matches.length;
  }
  
  for (const pattern of STRONG_ASSERTION_PATTERNS) {
    const matches = content.match(pattern) || [];
    result.strongAssertions += matches.length;
  }
  
  for (const pattern of INVALID_PATTERNS) {
    const matches = content.match(pattern) || [];
    result.invalidAssertions += matches.length;
  }
  
  // 分析每个测试用例
  for (const block of testBlocks) {
    const titleMatch = block.match(/test\(['"](.*?)['"]/);
    const title = titleMatch ? titleMatch[1] : '未知测试';
    
    let blockWeak = 0;
    let blockStrong = 0;
    let blockInvalid = 0;
    
    for (const pattern of WEAK_ASSERTION_PATTERNS) {
      blockWeak += (block.match(pattern) || []).length;
    }
    for (const pattern of STRONG_ASSERTION_PATTERNS) {
      blockStrong += (block.match(pattern) || []).length;
    }
    for (const pattern of INVALID_PATTERNS) {
      blockInvalid += (block.match(pattern) || []).length;
    }
    
    const testInfo = {
      title,
      weakAssertions: blockWeak,
      strongAssertions: blockStrong,
      invalidAssertions: blockInvalid,
      quality: 'unknown',
    };
    
    // 判定质量
    if (blockInvalid > 0) {
      testInfo.quality = 'invalid';
      result.issues.push(`[${title}] 存在无效断言（模板占位符未替换或断言被注释）`);
    } else if (blockStrong === 0 && blockWeak > 0) {
      testInfo.quality = 'weak';
      result.issues.push(`[${title}] 只有弱断言(toBeVisible等)，缺少业务逻辑验证`);
    } else if (blockStrong === 0 && blockWeak === 0) {
      testInfo.quality = 'none';
      result.issues.push(`[${title}] 没有任何断言`);
    } else if (blockStrong > 0) {
      testInfo.quality = 'strong';
    }
    
    result.testDetails.push(testInfo);
  }
  
  // 计算整体质量评分 (0-100)
  const totalAssertions = result.weakAssertions + result.strongAssertions;
  if (totalAssertions === 0) {
    result.qualityScore = 0;
  } else {
    const strongRatio = result.strongAssertions / totalAssertions;
    const invalidPenalty = result.invalidAssertions * 20;
    result.qualityScore = Math.max(0, Math.round(strongRatio * 100 - invalidPenalty));
  }
  
  return result;
}

/**
 * 分析目录下所有 spec 文件
 * @param {string} dir - 目录路径
 * @returns {Object} 汇总结果
 */
function analyzeDirectory(dir) {
  const results = {
    directory: dir,
    files: [],
    summary: {
      totalFiles: 0,
      totalTests: 0,
      totalWeakAssertions: 0,
      totalStrongAssertions: 0,
      totalInvalidAssertions: 0,
      averageQualityScore: 0,
      passedFiles: 0,
      failedFiles: 0,
    },
    allIssues: [],
  };
  
  // 递归查找 spec 文件
  function findSpecFiles(directory) {
    const files = [];
    if (!fs.existsSync(directory)) return files;
    
    const entries = fs.readdirSync(directory, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory() && entry.name !== 'node_modules') {
        files.push(...findSpecFiles(fullPath));
      } else if (entry.isFile() && entry.name.endsWith('.spec.js')) {
        files.push(fullPath);
      }
    }
    return files;
  }
  
  const specFiles = findSpecFiles(dir);
  
  for (const file of specFiles) {
    const analysis = analyzeSpecFile(file);
    results.files.push(analysis);
    
    results.summary.totalFiles++;
    results.summary.totalTests += analysis.totalTests;
    results.summary.totalWeakAssertions += analysis.weakAssertions;
    results.summary.totalStrongAssertions += analysis.strongAssertions;
    results.summary.totalInvalidAssertions += analysis.invalidAssertions;
    
    if (analysis.qualityScore >= 60) {
      results.summary.passedFiles++;
    } else {
      results.summary.failedFiles++;
    }
    
    results.allIssues.push(...analysis.issues.map(issue => `${analysis.file}: ${issue}`));
  }
  
  if (results.summary.totalFiles > 0) {
    results.summary.averageQualityScore = Math.round(
      results.files.reduce((sum, f) => sum + f.qualityScore, 0) / results.summary.totalFiles
    );
  }
  
  return results;
}

/**
 * 生成断言质量报告
 * @param {Object} analysis - 分析结果
 * @returns {string} Markdown 格式报告
 */
function generateReport(analysis) {
  const { summary, files, allIssues } = analysis;
  
  let report = `# 自动化脚本断言质量报告

## 汇总

| 指标 | 值 |
|------|-----|
| 分析文件数 | ${summary.totalFiles} |
| 测试用例总数 | ${summary.totalTests} |
| 强断言数量 | ${summary.strongAssertions} |
| 弱断言数量 | ${summary.totalWeakAssertions} |
| 无效断言数量 | ${summary.totalInvalidAssertions} |
| 平均质量评分 | ${summary.averageQualityScore}/100 |
| 通过文件数 | ${summary.passedFiles} |
| 不通过文件数 | ${summary.failedFiles} |

## 质量评判标准

- **强断言**：toHaveText, toHaveURL, toBeDisabled, toBeEnabled, toHaveValue 等（验证业务逻辑）
- **弱断言**：toBeVisible, toBeTruthy, toBeDefined 等（仅检查存在性）
- **无效断言**：模板占位符未替换、断言被注释、用 console.log 代替

**质量评分 = (强断言数 / 总断言数) × 100 - 无效断言惩罚**

评分 ≥ 60 分为通过。

`;

  if (allIssues.length > 0) {
    report += `## 发现的问题

${allIssues.map(issue => `- ${issue}`).join('\n')}

`;
  }

  if (files.length > 0) {
    report += `## 文件详情

`;
    for (const file of files) {
      const statusIcon = file.qualityScore >= 60 ? '✅' : '❌';
      report += `### ${statusIcon} ${file.file} (评分: ${file.qualityScore})

| 测试用例 | 强断言 | 弱断言 | 无效 | 质量 |
|----------|--------|--------|------|------|
`;
      for (const test of file.testDetails) {
        const qualityIcon = {
          strong: '✅ 合格',
          weak: '⚠️ 弱',
          invalid: '❌ 无效',
          none: '❌ 无断言',
          unknown: '❓ 未知',
        }[test.quality];
        report += `| ${test.title} | ${test.strongAssertions} | ${test.weakAssertions} | ${test.invalidAssertions} | ${qualityIcon} |\n`;
      }
      report += '\n';
    }
  }

  return report;
}

/**
 * 验证目录下的 spec 文件是否满足质量要求
 * @param {string} dir - 目录路径
 * @param {number} minScore - 最低质量评分（默认60）
 * @returns {{passed: boolean, analysis: Object, report: string}}
 */
function validateAssertions(dir, minScore = 60) {
  const analysis = analyzeDirectory(dir);
  const report = generateReport(analysis);
  const passed = analysis.summary.averageQualityScore >= minScore && analysis.summary.failedFiles === 0;
  
  return {
    passed,
    analysis,
    report,
  };
}

module.exports = {
  analyzeSpecFile,
  analyzeDirectory,
  generateReport,
  validateAssertions,
};
