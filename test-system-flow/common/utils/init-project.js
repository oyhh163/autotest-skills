/**
 * 测试项目初始化工具
 * 用于快速初始化新的测试项目目录
 * 
 * 重要：项目复用公共模块的依赖，不重复安装 xlsx/yazl/@playwright/test
 */
const fs = require('fs');
const path = require('path');

// 公共模块的绝对路径
const COMMON_MODULE_PATH = path.resolve(__dirname, '..');

/**
 * 初始化测试项目目录结构
 * @param {string} projectDir - 项目目录路径
 * @param {Object} options - 配置选项
 */
function initProject(projectDir, options = {}) {
  const {
    projectName = '测试项目',
    platform = 'web',  // web, ios, android
    includePlaywright = true,
    commonModulePath = COMMON_MODULE_PATH  // 允许自定义公共模块路径
  } = options;

  // 创建目录结构
  const dirs = [
    '',
    'tests',
    'reports',
    'reports/screenshots',
    'reports/html',
    'scripts'  // 存放生成脚本
  ];

  dirs.forEach(dir => {
    const fullPath = path.join(projectDir, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  });

  // 创建项目配置文件（包含公共模块路径）
  const projectConfig = {
    projectName,
    platform,
    commonModulePath: commonModulePath.replace(/\\/g, '/'),  // 统一使用正斜杠
    createdAt: new Date().toISOString()
  };
  
  fs.writeFileSync(
    path.join(projectDir, 'project.config.json'),
    JSON.stringify(projectConfig, null, 2)
  );

  // 创建package.json - 注意：不包含公共模块已有的依赖
  const packageJson = {
    name: projectName.toLowerCase().replace(/\s+/g, '-'),
    version: '1.0.0',
    description: `${projectName} 测试项目`,
    private: true,
    scripts: {
      test: 'npx playwright test',
      'test:headed': 'npx playwright test --headed',
      'test:debug': 'npx playwright test --debug',
      report: 'npx playwright show-report reports/html',
      'generate:excel': 'node scripts/generate-excel.js',
      'generate:xmind': 'node scripts/generate-xmind.js',
      'generate:report': 'node scripts/generate-report.js'
    },
    // 公共依赖说明 - 这些依赖由公共模块提供，无需安装
    _sharedDependencies: {
      _note: '以下依赖由公共模块提供，无需在此项目安装',
      xlsx: '由公共模块提供',
      yazl: '由公共模块提供',
      '@playwright/test': '由公共模块提供'
    },
    // 仅包含项目特有的额外依赖（如果有）
    dependencies: {}
  };

  fs.writeFileSync(
    path.join(projectDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );

  // 创建公共模块引用的辅助文件
  const commonHelper = `/**
 * 公共模块引用辅助
 * 自动加载公共模块，无需重复安装依赖
 */
const path = require('path');
const config = require('../project.config.json');

// 公共模块路径
const COMMON_PATH = config.commonModulePath;

// 导出公共模块
let common;
try {
  common = require(COMMON_PATH);
} catch (e) {
  console.error('❌ 无法加载公共模块，请确保公共模块已初始化');
  console.error('   路径:', COMMON_PATH);
  console.error('   执行: cd ' + COMMON_PATH + ' && npm install');
  process.exit(1);
}

module.exports = common;
module.exports.COMMON_PATH = COMMON_PATH;

// 便捷导出常用函数
module.exports.generateTestCasesExcel = common.generateTestCasesExcel;
module.exports.generateAutomationReport = common.generateAutomationReport;
module.exports.generateXMindFromTestCases = common.generateXMindFromTestCases;
`;

  fs.writeFileSync(path.join(projectDir, 'scripts', 'common.js'), commonHelper);

  // 创建README
  const readme = `# ${projectName}

## 目录结构

\`\`\`
├── scripts/            # 生成脚本（引用公共模块）
│   └── common.js       # 公共模块引用
├── tests/              # 测试脚本
├── reports/            # 测试报告
│   ├── html/          # HTML报告
│   └── screenshots/   # 截图
├── project.config.json # 项目配置（含公共模块路径）
├── test-cases.xlsx    # 测试用例Excel
├── test-cases.xmind   # 测试用例脑图
└── test-knowledge.md  # 知识沉淀
\`\`\`

## 依赖说明

本项目复用公共模块的依赖，**无需安装** xlsx、yazl、@playwright/test。

公共模块路径: \`${commonModulePath.replace(/\\/g, '/')}\`

如需添加项目特有的依赖：
\`\`\`bash
npm install <新依赖>
\`\`\`

## 运行测试

\`\`\`bash
# 运行测试（无需 npm install）
npm test

# 有界面运行
npm run test:headed

# 查看报告
npm run report
\`\`\`

## 生成时间

${new Date().toLocaleString('zh-CN')}
`;

  fs.writeFileSync(path.join(projectDir, 'README.md'), readme);

  // 复制配置模板
  const commonDir = path.join(__dirname, '..');
  
  if (includePlaywright && platform === 'web') {
    const configTemplate = path.join(commonDir, 'templates', 'playwright.config.template.js');
    if (fs.existsSync(configTemplate)) {
      fs.copyFileSync(
        configTemplate,
        path.join(projectDir, 'playwright.config.js')
      );
    }
  }

  // 创建知识库模板
  const knowledgeMd = `# ${projectName} - 测试知识库

## 测试配置
- **目标端**: ${platform === 'web' ? 'Web' : platform.toUpperCase()}
- **浏览器**: ${platform === 'web' ? 'Edge (Chromium)' : 'N/A'}
- **自动化框架**: ${platform === 'web' ? 'Playwright' : 'Appium'}
- **URL**: 待配置

## 已确认的需求
- （待补充）

## 待确认问题
| ID | 问题 | 状态 |
|----|------|------|
| - | - | - |

## 自动化阻塞点
- （待补充）

---
*最后更新：${new Date().toLocaleString('zh-CN')}*
`;

  fs.writeFileSync(path.join(projectDir, 'test-knowledge.md'), knowledgeMd);

  console.log(`✅ 测试项目已初始化: ${projectDir}`);
  return projectDir;
}

/**
 * 生成项目目录名称
 * @param {string} projectName - 项目名称
 * @returns {string} 目录名称（带时间戳）
 */
function generateProjectDirName(projectName) {
  const timestamp = new Date().toISOString()
    .slice(0, 16)
    .replace(/[-:T]/g, '')
    .slice(0, 13);  // YYYYMMDD-HHMM
  const safeName = projectName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5-_]/g, '-');
  return `${timestamp}-${safeName}`;
}

module.exports = {
  initProject,
  generateProjectDirName
};

// 命令行支持
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length > 0) {
    const projectName = args[0];
    const outputBase = args[1] || process.cwd();
    const dirName = generateProjectDirName(projectName);
    const projectDir = path.join(outputBase, dirName);
    initProject(projectDir, { projectName });
  } else {
    console.log('用法: node init-project.js <项目名称> [输出目录]');
  }
}
