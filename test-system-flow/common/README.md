# 测试体系公共模块

提供测试流程中可复用的工具和生成器。**新项目复用此模块的依赖，无需重复安装。**

## 核心理念

- 公共依赖（xlsx、yazl、@playwright/test）只在此模块安装一次
- 新项目通过引用此模块使用这些依赖
- 新项目仅在需要额外依赖时才安装

## 首次初始化（仅一次）

```bash
cd common
npm install
npx playwright install msedge ffmpeg
```

## 模块结构

```
common/
├── package.json           # 依赖配置
├── index.js              # 统一入口
├── generators/           # 生成器
│   ├── excel-generator.js    # Excel测试用例/报告生成
│   └── xmind-generator.js    # XMind思维导图生成
├── templates/            # 配置和脚本模板
│   ├── playwright.config.template.js
│   ├── test.spec.template.js
│   ├── generate-excel.template.js
│   ├── generate-xmind.template.js
│   └── generate-report.template.js
└── utils/               # 工具函数
    ├── init-project.js      # 项目初始化（生成复用配置）
    └── figma-fetcher.js     # Figma API工具
```

## 使用方法

### 1. 初始化新测试项目

```javascript
const { initProject, generateProjectDirName } = require('./common');

const dirName = generateProjectDirName('搜索功能');
const projectDir = path.join(outputBase, dirName);
initProject(projectDir, { projectName: '搜索功能', platform: 'web' });
```

### 2. 生成测试用例Excel

```javascript
const { generateTestCasesExcel } = require('./common');

generateTestCasesExcel({
  projectName: '搜索功能',
  outputDir: './output',
  smokeCases: [...],
  detailedCases: [...],
  p0Candidates: [...],
  risks: [...]
});
```

### 3. 生成XMind思维导图

```javascript
const { generateXMindFromTestCases } = require('./common');

await generateXMindFromTestCases({
  projectName: '搜索功能',
  outputDir: './output',
  smokeCases: [...],
  detailedCases: [...]
});
```

### 4. 生成自动化测试报告

```javascript
const { generateAutomationReport } = require('./common');

generateAutomationReport({
  projectName: '搜索功能',
  outputDir: './output',
  targetUrl: 'https://www.baidu.com',
  browser: 'Edge',
  framework: 'Playwright',
  testResults: [...],
  defects: []
});
```

### 5. 分析Figma设计

```javascript
const { figma } = require('./common');

const results = await figma.analyzeDesign({
  token: 'your-figma-token',
  urls: ['https://www.figma.com/design/xxx'],
  outputDir: './output'
});
```

## 预装依赖

| 包名 | 用途 |
|------|------|
| xlsx | Excel文件读写 |
| yazl | ZIP文件创建（XMind） |
| @playwright/test | Web自动化测试 |

## 浏览器安装

首次使用需安装浏览器驱动：

```bash
npm run install-browsers
```

等效于：

```bash
npx playwright install chromium msedge ffmpeg
```
