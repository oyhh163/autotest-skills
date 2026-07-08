---
name: test-system-flow
description: 驱动交互式QA工作流，包含需求分析、AI增强的Markdown规格说明、冒烟测试和详细测试用例生成、Excel/XMind输出、自动化用例筛选（P0场景+文案校验+跳转校验+状态校验+数据校验+异常提示）、Web/App UI自动化执行、缺陷Excel汇总，以及需求/Bug知识沉淀。当用户说"执行测试"、"生成测试用例"、"需求测试"、"测试体系"、"冒烟测试"、"P0自动化"、"UI自动化"，或要求将需求文档转化为测试用例和自动化用例时使用此技能。
---

# 测试体系流程

## 触发条件

当用户要求执行测试或生成QA体系流程时使用此技能，常见触发短语包括：

- `执行测试`
- `生成测试用例`
- `需求测试`
- `测试体系`
- `冒烟测试`
- `P0自动化`
- `UI自动化`

## 运作原则

- 交互式工作。当决策影响测试范围、目标端、自动化可行性、账号/数据依赖或环境时，主动询问用户而非猜测。
- 生成持久化产物。将生成的Markdown、Excel、XMind、自动化用例、运行报告和Bug汇总保存在明确的输出目录下。
- 保持可追溯性：需求点 -> 测试用例 -> 自动化用例 -> 执行结果 -> 缺陷汇总。
- 优先使用结构化解析和生成。对于PDF、链接、Excel、XMind和报告，使用库或项目现有工具，而非临时的文本处理。
- 未经用户确认不存储持久性记忆或规则。对于知识沉淀，先更新项目本地知识文件；创建持久性Cursor规则前需征求用户同意。
- **优先使用公共模块**。复用 `common/` 目录下的生成器和工具，避免重复安装依赖。

## 工作流概览

除非用户明确要求子集，否则按顺序执行以下阶段：

1. 接收需求来源
2. **配置并访问Figma设计图**
3. 分析需求生成AI增强的Markdown（结合Figma UI信息）
4. 生成测试用例
5. 导出Excel和XMind
6. **询问用户是否需要核查测试用例**（可选暂停点）
7. 筛选自动化候选用例
8. 准备并执行UI自动化
9. 将异常结果汇总为Excel
10. 从需求和Bug中沉淀知识

详细的产物模板请参阅 [templates.md](templates.md)。

## 公共模块（提高执行效率）

本技能提供预配置的公共模块 `common/`，**新项目复用公共依赖，不重复安装**。

### 依赖复用规则（重要）

| 依赖 | 来源 | 是否需要在新项目安装 |
|------|------|---------------------|
| `xlsx` | 公共模块 | ❌ 不需要 |
| `yazl` | 公共模块 | ❌ 不需要 |
| `@playwright/test` | 公共模块 | ❌ 不需要 |
| 项目特有依赖 | 项目自身 | ✅ 需要时才安装 |

**首次使用需初始化公共模块**（仅一次）：
```bash
cd common && npm install && npx playwright install msedge ffmpeg
```

### 新项目初始化

使用 `initProject` 创建新项目，会自动：
1. 生成 `project.config.json` 记录公共模块路径
2. 创建 `scripts/common.js` 作为公共模块引用入口
3. 生成空的 `package.json`（不包含公共依赖）

```javascript
const { initProject, generateProjectDirName } = require('./common');

const dirName = generateProjectDirName('搜索功能');
const projectDir = `test-output/${dirName}`;
initProject(projectDir, { projectName: '搜索功能', platform: 'web' });
```

### 在新项目中引用公共模块

新项目的脚本通过 `scripts/common.js` 引用公共模块：

```javascript
// 在项目脚本中（如 scripts/generate-excel.js）
const common = require('./common');  // 自动加载公共模块

// 直接使用，无需安装 xlsx
common.generateTestCasesExcel({ ... });
```

### 脚本模板

公共模块提供现成的脚本模板，复制即用：

| 模板 | 用途 | 复制到 |
|------|------|--------|
| `templates/generate-excel.template.js` | 生成测试用例Excel | `scripts/generate-excel.js` |
| `templates/generate-xmind.template.js` | 生成XMind脑图 | `scripts/generate-xmind.js` |
| `templates/generate-report.template.js` | 生成自动化报告 | `scripts/generate-report.js` |
| `templates/playwright.config.template.js` | Playwright配置 | `playwright.config.js` |
| `templates/test.spec.template.js` | 测试脚本模板 | `tests/xxx.spec.js` |

### 可复用的生成器

```javascript
// 引入公共模块（通过绝对路径或 scripts/common.js）
const common = require('./scripts/common');

// 生成测试用例Excel（无需安装xlsx）
common.generateTestCasesExcel({
  projectName: '项目名称',
  outputDir: './output',
  smokeCases: [...],
  detailedCases: [...],
  p0Candidates: [...],
  risks: [...]
});

// 生成XMind思维导图（无需安装yazl）
await common.generateXMindFromTestCases({
  projectName: '项目名称',
  outputDir: './output',
  smokeCases: [...],
  detailedCases: [...]
});

// 生成自动化测试报告（无需安装xlsx）
common.generateAutomationReport({
  projectName: '项目名称',
  outputDir: './output',
  targetUrl: 'https://example.com',
  browser: 'Edge',
  framework: 'Playwright',
  testResults: [...],
  defects: []
});

// 分析Figma设计
await common.figma.analyzeDesign({
  token: 'figma-token',
  urls: ['https://www.figma.com/...'],
  outputDir: './output'
});
```

### 仅在需要额外依赖时安装

如果新项目需要公共模块未包含的依赖（如特定的解析库），才在项目目录执行：
```bash
npm install <新依赖>
```

## 阶段1：需求接收

触发后，请用户提供需求文档：

- PDF文件路径或附件PDF
- 可访问的URL链接
- 现有的Markdown/文本文档
- 如有，提供补充的产品说明、设计链接、API文档或验收标准

如果来源是URL，在使用前验证其可访问性。如果访问失败，请用户提供导出内容或本地文件。

当需求文档未明确以下内容时，询问这些澄清问题：

- 目标端：`Web`、`App` 还是两者都有
- App平台：`Android`、`iOS` 还是两者都有
- 测试环境和账号/数据要求
- 支持的浏览器/设备/操作系统版本
- 发布范围、超出范围的内容、优先级规则
- 自动化是现在执行还是仅准备
- Figma Token（如有设计链接）

## 阶段1.5：Figma设计图配置和分析

当需求文档包含Figma链接时，执行此阶段：

### 配置Figma访问

询问用户提供Figma Personal Access Token。Token获取方式：
- 登录Figma → 点击头像 → Settings → Personal access tokens → Generate new token

创建 `figma-config.json` 保存配置：
```json
{
  "figma_token": "用户提供的token",
  "files": {
    "prototype": { "name": "原型图名称", "file_key": "从URL提取", "node_id": "从URL提取" },
    "ui": { "name": "UI图名称", "file_key": "从URL提取", "node_id": "从URL提取" }
  }
}
```

### 访问Figma API

使用Figma REST API获取设计信息：
- `GET /v1/files/:file_key` - 获取文件信息
- `GET /v1/files/:file_key/nodes?ids=:node_ids` - 获取节点详情
- `GET /v1/images/:file_key?ids=:node_ids` - 获取节点图片URL

### 分析UI设计

从Figma节点中提取：
- 页面框架和尺寸（验证适配性）
- 文本元素（验证文案正确性、发现拼写错误）
- 按钮和交互元素（生成元素定位器）
- 组件层级（理解页面结构）

生成 `figma-ui-analysis.md` 和 `figma-results.json`。

### 发现设计问题

重点检查：
- 文案拼写错误（如 "trail" vs "trial"）
- UI元素命名规范性
- 设计与需求文档的一致性
- 可用于自动化的元素标识符

将发现的设计问题添加到 `问题/风险` 工作表。

## 阶段2：需求分析Markdown（结合Figma）

解析并分析需求来源，**结合Figma UI设计信息**，生成Markdown文档。文档必须包含：

- 需求摘要
- 业务目标和用户角色
- 功能范围
- 范围内和范围外的内容
- 主要用户流程
- 功能点和验收标准
- **UI设计规格**（从Figma提取）
  - 页面尺寸和布局
  - 关键UI元素和文案
  - 交互元素列表
- 数据规则和校验规则
- 权限、状态和错误处理规则
- Web/App都适用时的跨端差异
- 依赖项和外部系统
- **设计问题**（从Figma发现的拼写错误、不一致等）
- 风险、歧义和需要向用户确认的问题
- 测试重点和建议优先级

将文件保存为输出目录下的 `requirements-analysis.md`。

如果需求存在影响预期行为的歧义，在生成最终测试用例前暂停并询问用户。

## 阶段3：测试用例生成

从 `requirements-analysis.md` 生成两组测试用例：

- 冒烟测试：高价值的基础路径，快速确认功能可用。
- 新功能详细测试：使用等价类划分、边界值、判定表、状态转换、场景流程、错误猜测、兼容性、权限、数据一致性、中断/重试、回归影响分析等方法进行广泛覆盖。

每个测试用例必须包含：

- 用例ID
- 模块
- 功能点
- 测试类型
- 优先级（`P0`、`P1`、`P2`）
- 目标端（`Web`、`App`、`Both`，或不明确时询问用户）
- 前置条件
- 测试数据
- 步骤
- 预期结果
- 需求引用
- 自动化适用性
- 备注或风险

如果无法确定目标端，在最终导出前询问用户选择。

## 阶段4：Excel和XMind导出

以两种格式导出完整的测试用例：

- Excel：一个工作簿，包含 `冒烟测试`、`详细测试`、`自动化候选`、`问题/风险` 工作表。
- XMind：按需求模块 -> 功能点 -> 测试组 -> 用例标题组织，**包含前置条件、操作步骤、预期结果作为子节点**。

**优先使用公共模块生成**：
```javascript
const common = require('../common');
common.generateTestCasesExcel({ projectName, outputDir, smokeCases, detailedCases, p0Candidates, risks });
await common.generateXMindFromTestCases({ projectName, outputDir, smokeCases, detailedCases });
```

如果公共模块未初始化，先执行 `cd common && npm install`。

## 阶段4.5：测试用例人工核验（可选）

测试用例导出完成后，**暂停流程并询问用户**：

> 测试用例已生成并保存到以下位置：
> - Excel: `{输出目录}/test-cases.xlsx`
> - XMind: `{输出目录}/test-cases.xmind`
>
> 是否需要核查和修改测试用例？
> 1. **不需要核查** - 继续执行后续流程
> 2. **需要核查** - 请打开本地文件进行修改，修改完成后告诉我

### 用户选择"不需要核查"

直接进入阶段5（自动化用例筛选）。

### 用户选择"需要核查"

1. **等待用户修改**
   - 用户可以打开本地Excel或XMind文件进行修改
   - 可以增删改测试用例、调整优先级、修改步骤和预期结果
   - 可以调整"自动化适用性"字段

2. **用户修改完成后**
   - 用户告知修改完成（如："修改完成"、"已修改"、"继续"）
   - **重新读取本地Excel文件**获取最新的测试用例数据
   - 基于修改后的用例继续执行后续流程

3. **重新读取Excel**
   ```javascript
   const xlsx = require('xlsx');
   const workbook = xlsx.readFile('{输出目录}/test-cases.xlsx');
   const smokeCases = xlsx.utils.sheet_to_json(workbook.Sheets['冒烟测试']);
   const detailedCases = xlsx.utils.sheet_to_json(workbook.Sheets['详细测试']);
   // 基于修改后的数据继续流程
   ```

4. **同步更新**
   - 如果Excel被修改，重新生成XMind以保持一致
   - 自动化用例筛选基于修改后的用例进行

### 核验要点提示

询问用户时，可提示重点核验：
- 用例是否覆盖完整
- 优先级划分是否合理
- 自动化适用性标记是否正确
- 步骤和预期结果是否清晰

## 阶段5：自动化用例筛选

### 筛选范围

符合以下任一条件的测试用例，标记为"适合自动化"：

| 类别 | 说明 |
|------|------|
| P0核心场景 | 冒烟级别的业务主流程 |
| 页面文案校验 | 验证页面显示的文案是否与Figma设计一致 |
| 页面跳转规则 | 验证按钮点击后的页面跳转是否正确 |
| 按钮状态校验 | 验证按钮的禁用/启用状态是否符合逻辑 |
| 数据提交与计算 | 验证表单提交、计算结果是否符合预期 |
| 异常输入提示 | 验证异常输入时的错误提示是否正确 |

### 各类别详细规则

#### 1. P0核心场景
- **定义**：冒烟测试中的核心业务流程
- **判定**：测试用例优先级为P0

#### 2. 页面文案校验

| 维度 | 规则 |
|------|------|
| **文案来源** | 以Figma设计稿为准 |
| **校验范围** | 全部文案（标题、按钮、标签、提示语、说明文字等） |
| **动态文案处理** | 含动态内容（用户名、时间、金额等）的文案略过自动化，标记为"人工校验" |
| **断言方式** | 页面元素文本 === Figma设计稿文案 |

#### 3. 页面跳转规则

| 维度 | 规则 |
|------|------|
| **跳转来源** | 按钮点击触发的跳转 |
| **条件跳转** | 根据需求文档中的逻辑判定不同条件下的跳转目标 |
| **验证方式** | 文档标注了具体URL → 断言URL匹配；未标注URL → 断言目标页面关键元素存在 |

#### 4. 按钮状态校验

| 维度 | 规则 |
|------|------|
| **校验内容** | 按钮的禁用（disabled）/启用状态 |
| **判定依据** | 根据需求文档中的业务逻辑规则 |
| **断言方式** | 检查按钮元素的disabled属性或CSS状态 |

#### 5. 数据提交与计算

| 维度 | 规则 |
|------|------|
| **校验内容** | 表单提交后的数据展示、计算结果 |
| **判定依据** | 根据测试用例分析的预期结果 |
| **断言方式** | 页面展示值 === 预期计算值 |

#### 6. 异常输入提示

| 维度 | 规则 |
|------|------|
| **校验内容** | 非法输入、边界值、空值等异常场景的错误提示 |
| **判定依据** | 需求文档中定义的校验规则和提示文案 |
| **断言方式** | 错误提示元素出现 + 提示文案匹配 |

### 排除条件（不适合自动化）

以下场景标记为"不适合自动化"或"需人工介入"：

| 场景 | 处理方式 |
|------|----------|
| 动态文案（用户名、时间、金额） | 人工校验 |
| 验证码（图形、短信、邮箱） | 人工校验 or 测试环境关闭 |
| 第三方依赖（支付、登录） | Mock或沙箱环境 |
| 主观判断（UI美观度、交互体验） | 人工校验 |
| 实时数据依赖 | 人工校验 |

### 自动化用例标记

在测试用例的"自动化适用性"字段中标记：

| 标记 | 含义 |
|------|------|
| **自动化** | 完全适合自动化，无阻塞 |
| **自动化+人工** | 部分可自动化，动态内容需人工补充验证 |
| **人工** | 不适合自动化 |

### 自动化用例摘要

创建自动化就绪用例摘要，包含：

- 自动化用例ID
- 来源用例ID
- 自动化类型（P0场景/文案校验/跳转校验/状态校验/数据校验/异常提示）
- 目标端
- 场景
- 前置条件和数据准备
- 自动化步骤
- 断言（含断言类型和预期值）
- 清理
- 所需环境输入
- 阻塞问题

## 阶段6：UI自动化准备和执行

对于Web自动化用例：

1. 询问用户Web URL、登录方式、测试账号、目标浏览器，以及是否允许网络/API mock。
2. **从公共模块复制配置模板**：
   ```bash
   cp common/templates/playwright.config.template.js 项目目录/playwright.config.js
   cp common/templates/test.spec.template.js 项目目录/tests/
   ```
3. 当项目无标准时优先使用Playwright。
4. **确保浏览器已安装**：`npx playwright install msedge ffmpeg`（公共模块已预装）。
5. 根据自动化类型生成对应的测试脚本：
   - **P0场景**：端到端流程验证
   - **文案校验**：遍历页面元素，断言文本与Figma一致
   - **跳转校验**：点击按钮后断言URL或目标页面元素
   - **状态校验**：检查按钮disabled属性
   - **数据校验**：提交后断言展示值
   - **异常提示**：输入异常值后断言错误提示
6. 运行自动化并收集结构化结果。

对于App自动化用例：

1. 询问用户包名或Bundle ID、平台（`Android` 或 `iOS`）、设备/模拟器信息、如需要提供应用安装路径、登录/测试账号。
2. 创建或更新专用自动化模块。
3. 当项目无标准时优先使用Appium。
4. 根据自动化类型生成对应的测试脚本（同Web）。
5. 当环境支持时通过包名/Bundle ID启动应用并运行自动化。

如果当前环境无法运行UI自动化，仍然生成自动化就绪测试，并清楚说明缺少什么。

## 阶段7：缺陷汇总Excel

**使用公共模块生成报告**：
```javascript
const common = require('../common');
common.generateAutomationReport({
  projectName, outputDir, targetUrl, browser: 'Edge', framework: 'Playwright',
  testResults: [{ caseId, caseName, priority, status, duration, details }],
  defects: [{ id, caseId, title, severity, status, description }]
});
```

对于每个与预期不符的自动化结果，在桌面创建缺陷汇总工作簿。包含：

- Bug ID
- 来源用例ID
- 自动化用例ID
- 目标端
- 模块和功能
- 严重程度建议
- 实际结果
- 预期结果
- 复现步骤
- 环境
- 截图/视频/日志路径（如有）
- 可疑原因（如有证据支持）
- 状态

在需求歧义解决前，不将不确定的行为标记为Bug；将其放入 `问题/风险` 中。

## 阶段8：知识沉淀循环

在输出目录维护本地知识文件，如 `test-knowledge.md`，包含：

- 已确认的需求澄清
- 重复出现的产品规则
- 已知的脆弱区域
- 已确认的Bug及解决方案
- 自动化阻塞点和变通方案

结束时，询问用户是否要将这些经验提升为持久性Cursor规则，还是仅保留在项目产物中。

## 飞书智能体集成（可选）

本测试体系支持与飞书智能体集成，实现从飞书对话触发测试流程。

### 集成架构

```
飞书用户 ──▶ 飞书机器人 ──▶ lark-cursor-bridge ──▶ Cursor SDK ──▶ 本技能
   ▲                              │                              │
   │                              │                              ▼
   └──────────────────────────────┴───────────── 交互卡片/Bug记录
```

### 使用方式

1. **部署桥接服务**：参见 `lark-cursor-bridge/README.md`
2. **配置飞书机器人**：创建应用、配置Webhook
3. **发送需求链接**：在飞书对话中发送需求文档URL
4. **交互选择**：通过飞书卡片完成测试过程中的选择
5. **查看结果**：Bug自动记录到多维表格

### 集成时的特殊行为

当通过飞书集成触发时，本技能会：

0. **单模块模式（可选）**：用户可在需求前加关键词，只执行到某个阶段即结束（默认不加关键词=完整流程）：
   - 「分析需求 + 内容」→ 仅需求分析（跳过全部预检，直接产出并发送 `requirements-analysis.md`）
   - 「生成用例 + 内容」→ 到生成并导出测试用例（含在线用例表 + 脑图）
   - 「生成自动化 + 内容」→ 到生成自动化脚本（不执行）
   > 单模块模式会自动裁剪预检问答（如仅分析无需问 Figma/核验/平台/自动化）。
1. **预检问答**：启动前先通过卡片依次确认：
   - 是否有 Figma 设计图（有则等待发送链接）
   - 是否需要人工核验测试用例
   - **目标平台（Web/iOS/Android）——仅在涉及自动化的阶段才询问**。需求分析、生成测试用例阶段不问平台、也不设默认端：端由 Cursor 从需求内容自行判断，判断不出则按通用方式处理。
   - 自动化执行方式（立即执行 / 仅生成脚本）
   - 若立即执行自动化，按平台继续收集阶段6所需信息：
     - **Web**：被测 URL、登录方式（含测试账号）、目标浏览器、是否允许网络/API mock
     - **iOS/Android**：包名或 Bundle ID、真机/模拟器、安装包路径（可跳过）、登录/测试账号（可跳过）
   > 平台仅服务于自动化脚本的生成与执行；分析/用例阶段无需指定端。这些阶段6的信息在飞书流程中提前问完，Cursor 执行时不再重复询问。
2. **进度通知**：单张进度卡片实时更新当前阶段与进度条
3. **交互卡片**：需要用户选择时发送可点击的选项卡片
4. **随时停止**：用户发送"停止/取消"或点击进度卡片上的停止按钮，可立即中止流程（用于需求文档填错等情况）
5. **Bug记录**：自动将发现的Bug写入配置的多维表格
6. **在线用例表**：完成后自动把本地 `test-cases.xlsx` 解析并创建为飞书在线多维表格(Bitable)，用户可点结果卡片链接直接在线查看/编辑
7. **脑图附件**：把本地 `test-cases.xmind` 作为文件附件发送到会话，用户可下载后用 XMind 打开
8. **结果汇总**：完成后发送结果卡片（含用例数、Bug概览、在线用例表按钮、脑图附件说明）

### 飞书交互格式要求（重要）

为确保飞书集成正常工作，执行过程中**必须**使用以下格式输出。飞书只显示6个阶段的进度卡片，会实时更新。

**六阶段标记**（进入阶段时输出，包含实时进度）：
```
[阶段:init] 正在初始化测试环境
[阶段:analyze] 正在分析需求文档
[阶段:testcase] 生成测试用例 3/10
[阶段:autocase] 筛选自动化用例 5/20
[阶段:execute] 执行自动化 通过 8/10
[阶段:feedback] 汇总发现的问题
```

阶段说明：
- `init` - 初始化（启动、环境准备）
- `analyze` - 分析需求（解析文档、提取功能点）
- `testcase` - 生成测试用例（生成冒烟+详细用例，导出Excel/XMind）
- `autocase` - 生成自动化用例（筛选P0、文案、跳转等自动化候选）
- `execute` - 执行自动化（运行Playwright等，显示通过数/总数）
- `feedback` - 反馈Bug（汇总问题、记录到多维表格）

**用户选择**（需要用户决策时使用）：
```
[选择:platform]
问题: 请选择目标测试平台
- Web 网页端
- iOS 移动端
- Android 移动端
```

选择类型：
- `platform` - 目标平台
- `figma` - Figma设计图
- `review` - 是否核验用例
- `automation` - 自动化执行方式（立即执行 / 仅生成脚本）
- `login` - 登录方式（Web）
- `browser` - 目标浏览器（Web）
- `mock` - 是否允许网络/API mock（Web）
- `device` - 真机/模拟器（App）

自由文本输入（无固定选项，直接以文本消息回复）：`web_url`、`account`、`app_id`、`install_path`

**完成标记**：
```
[完成] 测试流程结束
```

### 相关文件

- `lark-cursor-bridge/` - 桥接服务源码
- `lark-cursor-bridge/SKILL.md` - 桥接服务技能说明
- `lark-cursor-bridge/.env.example` - 配置模板

## 完成检查清单

完成前验证：

- Figma设计图已配置并分析（如有设计链接）。
- Figma UI分析报告已生成（`figma-ui-analysis.md`）。
- 设计问题（拼写错误、不一致等）已记录到问题/风险。
- 需求分析Markdown已生成（包含UI设计规格）。
- 冒烟测试和详细测试用例已存在。
- 测试用例包含基于Figma的UI文案验证。
- Excel和XMind输出已存在，或已产出明确的替代方案。
- **已询问用户是否需要核查测试用例**。
- **如用户修改了用例，已重新读取并基于修改后的数据继续**。
- 自动化候选用例可追溯到源用例（含自动化类型标记）。
- 已请求所需的Web/App执行输入。
- 自动化结果已收集，或执行阻塞点已记录。
- 失败的自动化预期已汇总到桌面Excel。
- 知识沉淀已更新，且未静默创建持久性记忆。
- **如通过飞书集成触发，Bug已记录到多维表格**。
