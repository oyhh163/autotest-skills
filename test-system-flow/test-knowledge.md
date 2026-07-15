# 测试知识沉淀

滚动记录每次测试中复用的经验、易漏场景、常见缺陷模式与选择器约定。

## 通用经验

### 目录命名
- Windows PowerShell 下创建含中文的目录名会出现编码乱码（显示为 `????`）。产物目录统一使用 ASCII 命名（如 `20260707-1821-search-web`），避免后续 Node 路径读取问题。

### 公共模块
- Excel/XMind 生成统一复用 `test-system-flow/common`（`generateTestCasesExcel`、`generateXMindFromTestCases`），依赖 `xlsx`、`yazl` 已在 `common/node_modules`，无需在项目内重复安装。

## 领域：Web 搜索功能

### 易漏 / 高价值场景
- 空输入 vs 仅空格输入的"未输入"判定分歧（务必与产品确认）。
- 匹配高亮的粒度（完全匹配/子串）与大小写敏感性，直接影响颜色断言的可行性。
- 关键词无匹配时的空结果兜底展示常被需求遗漏。
- 触发方式除按钮点击外是否支持回车键。

### 自动化断言技巧
- 跳转结果页：优先断言 URL 变化，其次断言结果容器可见（按站点实现取其一）。
- 红色高亮：用 `getComputedStyle(el).color` 取 rgb，断言 R 高、G/B 低；阈值需按真实样式微调。
- Node 24 下 Playwright 需在项目内通过 `project.config.json` 的 `commonModulePath` 显式 require `@playwright/test`，避免模块解析失败。
- 沙箱/CI 环境关闭 `video`/`trace` 或预装 ffmpeg，否则 browserContext.newPage 失败。

### 常用选择器候选（跨站点经验）
- 搜索框：`input[type="search"], input[name="q"], #kw`（百度为 `#kw`）
- 搜索按钮：`button[type="submit"], #su`（百度为 `#su`）
- 结果容器：`#content_left`（百度）、`.results/.result-list`（通用）

## 历史记录

| 日期 | 项目 | 平台 | 结论 |
|------|------|------|------|
| 2026-07-07 | 搜索功能 | Web | 生成 2 冒烟 + 12 详细用例，4 条自动化候选；因未提供被测 URL，自动化仅准备未执行 |
| 2026-07-07 | 搜索功能（session_1783421136285） | Web | 2 冒烟 + 12 详细用例，4 条自动化；Mock 页面执行 4/4 通过，0 缺陷 |
| 2026-07-07 | 搜索功能（session_1783421566021） | Web | 2 冒烟 + 12 详细用例，4 条自动化脚本已生成；未执行，0 缺陷 |
| 2026-07-07 | 搜索功能（session_1783421650396） | Web | 2 冒烟 + 12 详细用例，4 条自动化；百度真实接口 4/4 通过，0 缺陷 |
| 2026-07-13 | FoodPilot V2.8.19 Recipes（session_1783906116183） | iOS | 10 冒烟 + 88 详细用例，18 条 Appium 脚本已生成；未执行，5 条设计/环境缺陷 |
| 2026-07-13 | FoodPilot V2.8.19 Recipes（session_1783906523219） | iOS | 10 冒烟 + 88 详细用例，18 条 Appium 脚本已生成；未执行，5 条设计/环境缺陷 |
