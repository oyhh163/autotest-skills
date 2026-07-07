# 搜索功能测试

## 测试范围
- 搜索输入框
- 推荐搜索下拉框
- 搜索结果页跳转
- 关键词高亮（红色）

## 文件结构
```
├── requirements-analysis.md   # 需求分析文档
├── test-cases.xlsx            # 测试用例Excel
├── test-cases.xmind           # 测试用例XMind
├── playwright.config.js       # Playwright配置
├── tests/
│   └── search.spec.js         # 自动化测试用例
└── reports/                   # 测试报告目录
```

## 测试用例统计
- 冒烟测试：3条
- 详细测试：16条
- P0自动化候选：4条
- 问题/风险：6条

## 运行自动化测试

### 1. 设置测试URL
```bash
# Windows PowerShell
$env:TEST_URL="https://your-website.com"

# 或修改 playwright.config.js 中的 baseURL
```

### 2. 安装浏览器
```bash
npx playwright install msedge
```

### 3. 运行测试
```bash
# 运行所有测试
npx playwright test

# 运行指定测试文件
npx playwright test tests/search.spec.js

# 显示浏览器运行
npx playwright test --headed

# 生成报告
npx playwright show-report
```

## 元素选择器说明

测试脚本中的选择器需要根据实际页面调整：

```javascript
const selectors = {
  searchInput: 'input[type="search"]',      // 搜索输入框
  searchButton: 'button[type="submit"]',    // 搜索按钮
  recommendDropdown: '.recommend-dropdown', // 推荐下拉框
  recommendItem: '.recommend-item',         // 推荐项
  searchResults: '.search-results',         // 搜索结果
  highlightedKeyword: '.highlight'          // 高亮关键词
};
```

## 待确认问题
1. 推荐搜索数据来源（热门/历史/预设）
2. 搜索结果为空时的展示
3. 关键词高亮是否区分大小写
4. 搜索框字符限制
5. 推荐下拉框触发方式
6. **Web URL（必须提供）**
