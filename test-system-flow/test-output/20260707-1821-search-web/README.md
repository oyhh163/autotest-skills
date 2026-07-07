# 搜索功能（Web）测试产物

生成时间：2026-07-07 18:21
平台：Web ｜ Figma：无 ｜ 自动化：仅准备（未执行）

## 目录内容

| 文件 | 说明 |
|------|------|
| `requirements-analysis.md` | 需求分析（功能点、风险、待确认问题） |
| `test-cases.xlsx` | 测试用例（冒烟 / 详细 / P0候选 / 风险 / 统计） |
| `test-cases.xmind` | 测试用例思维导图（含步骤与预期） |
| `test-cases-mindmap.md` | 思维导图的 Markdown 可读版 |
| `automation-analysis.md` | 自动化候选筛选与阻塞项 |
| `playwright.config.js` | Playwright 配置 |
| `tests/search.spec.js` | 自动化脚本（AUTO-001~004，仅准备） |
| `scripts/generate-cases.js` | 用例生成脚本（复用公共模块） |

## 用例统计

- 冒烟测试：2 条（P0）
- 详细测试：12 条
- 自动化候选：4 条（AUTO-001~004）
- 风险/待确认：6 项（R1~R6）

## 执行自动化（准备就绪后）

自动化当前为"仅准备"状态，尚未运行。执行步骤：

```powershell
# 1. 提供真实被测地址
$env:TEST_URL = "https://你的被测站点"

# 2. 安装 Playwright（若公共环境未装）
npx playwright install msedge

# 3. 校准 tests/search.spec.js 中的 selectors 为真实页面元素

# 4. 运行
npx playwright test --config=playwright.config.js
```

## 待确认（阻塞/影响断言）

- R1 空格是否算"未输入" ｜ R2 推荐内容来源 ｜ R3 高亮匹配粒度/大小写
- R4 空结果展示 ｜ R5 是否支持回车触发 ｜ R6 被测 URL 未提供（自动化未执行主因）
