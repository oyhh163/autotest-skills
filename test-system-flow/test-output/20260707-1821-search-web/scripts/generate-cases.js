/**
 * 生成"搜索功能(Web)"测试用例的 Excel 与 XMind
 * 复用公共模块 test-system-flow/common
 */
const path = require('path');
const common = require('../../../common');

const projectName = '搜索功能（Web）';
const outputDir = path.resolve(__dirname, '..');

// 冒烟测试用例（核心主流程）
const smokeCases = [
  {
    id: 'SMK-001', module: '搜索-推荐', title: '空输入点击搜索展示推荐下拉框',
    precondition: '已打开网页，搜索框为空',
    steps: '1. 不在搜索框输入任何内容\n2. 点击搜索按钮',
    expected: '展示推荐搜索结果下拉框',
    priority: 'P0'
  },
  {
    id: 'SMK-002', module: '搜索-结果', title: '输入关键词点击搜索跳转结果页',
    precondition: '已打开网页',
    steps: '1. 在搜索框输入关键词（如"手机"）\n2. 点击搜索按钮',
    expected: '跳转到搜索结果页，展示与关键词相关的结果',
    priority: 'P0'
  }
];

// 详细测试用例
const detailedCases = [
  {
    id: 'DET-001', module: '搜索-输入', title: '搜索框正常输入文本', type: '功能',
    precondition: '已打开网页',
    steps: '1. 点击搜索框\n2. 输入文本"测试关键词"',
    expected: '搜索框正确显示输入的文本"测试关键词"',
    priority: 'P1'
  },
  {
    id: 'DET-002', module: '搜索-推荐', title: '空输入点击搜索展示推荐下拉框', type: '功能',
    precondition: '已打开网页，搜索框为空',
    steps: '1. 保持搜索框为空\n2. 点击搜索按钮',
    expected: '页面展示推荐搜索结果下拉框，且下拉框可见',
    priority: 'P0'
  },
  {
    id: 'DET-003', module: '搜索-推荐', title: '推荐下拉框展示推荐搜索项', type: '功能',
    precondition: '空输入点击搜索后下拉框已展示',
    steps: '1. 查看推荐下拉框内容',
    expected: '下拉框内展示至少一条推荐搜索项（内容来源见风险R2）',
    priority: 'P2'
  },
  {
    id: 'DET-004', module: '搜索-结果', title: '输入关键词点击搜索跳转结果页', type: '功能',
    precondition: '已打开网页',
    steps: '1. 输入关键词"手机"\n2. 点击搜索按钮',
    expected: '页面跳转到搜索结果页（URL/页面元素发生对应变化）',
    priority: 'P0'
  },
  {
    id: 'DET-005', module: '搜索-结果', title: '结果页内容与搜索关键词相关', type: '功能',
    precondition: '已完成关键词搜索并进入结果页',
    steps: '1. 查看结果列表文案',
    expected: '结果项文案与搜索关键词相关',
    priority: 'P1'
  },
  {
    id: 'DET-006', module: '搜索-高亮', title: '结果中匹配文案红色高亮', type: 'UI/文案',
    precondition: '已完成关键词搜索并进入结果页',
    steps: '1. 查看结果文案中与关键词匹配的部分',
    expected: '与搜索关键词匹配的文案以红色展示',
    priority: 'P1'
  },
  {
    id: 'DET-007', module: '搜索-推荐', title: '仅输入空格点击搜索', type: '边界',
    precondition: '已打开网页',
    steps: '1. 在搜索框仅输入若干空格\n2. 点击搜索按钮',
    expected: '按"未输入"处理，展示推荐下拉框（判定规则见风险R1，需人工确认）',
    priority: 'P2'
  },
  {
    id: 'DET-008', module: '搜索-高亮', title: '大小写与子串匹配的高亮校验', type: 'UI/文案',
    precondition: '已完成关键词搜索并进入结果页',
    steps: '1. 使用不同大小写/部分子串关键词搜索\n2. 观察高亮范围',
    expected: '匹配片段正确标红（匹配粒度与大小写规则见风险R3，需人工确认）',
    priority: 'P2'
  },
  {
    id: 'DET-009', module: '搜索-结果', title: '关键词无匹配结果的展示', type: '异常',
    precondition: '已打开网页',
    steps: '1. 输入几乎不可能匹配的关键词（如随机字符串）\n2. 点击搜索',
    expected: '结果页有明确的空结果展示（需求未定义，见风险R4，需人工确认）',
    priority: 'P2'
  },
  {
    id: 'DET-010', module: '搜索-触发', title: '回车键触发搜索', type: '功能',
    precondition: '已打开网页，已输入关键词',
    steps: '1. 输入关键词\n2. 按回车键',
    expected: '与点击搜索按钮行为一致，跳转结果页（是否支持见风险R5，需人工确认）',
    priority: 'P2'
  },
  {
    id: 'DET-011', module: '搜索-输入', title: '超长关键词输入搜索', type: '边界',
    precondition: '已打开网页',
    steps: '1. 输入超长字符串（如200字符）\n2. 点击搜索',
    expected: '不崩溃，能正常跳转结果页或给出合理提示',
    priority: 'P2'
  },
  {
    id: 'DET-012', module: '搜索-输入', title: '特殊字符关键词搜索', type: '边界',
    precondition: '已打开网页',
    steps: '1. 输入含特殊字符的关键词（如 <>&%）\n2. 点击搜索',
    expected: '正确转义处理，不出现脚本注入或页面异常',
    priority: 'P2'
  }
];

// P0/自动化候选（详见 automation-analysis）
const p0Candidates = [
  { id: 'DET-002', title: '空输入点击搜索展示推荐下拉框', priority: 'P0', feasibility: '高', effort: '0.5h', note: '核心主流程，元素可见性断言' },
  { id: 'DET-004', title: '输入关键词点击搜索跳转结果页', priority: 'P0', feasibility: '高', effort: '0.5h', note: '核心主流程，跳转断言' },
  { id: 'DET-001', title: '搜索框正常输入文本', priority: 'P1', feasibility: '高', effort: '0.3h', note: '输入回显断言' },
  { id: 'DET-006', title: '结果中匹配文案红色高亮', priority: 'P1', feasibility: '中', effort: '0.8h', note: '需定位高亮元素颜色，依赖实现' }
];

// 风险/问题
const risks = [
  { id: 'R1', type: '歧义', description: '"未输入内容"是否包含仅输入空格', impact: '高', status: '待确认', owner: '产品' },
  { id: 'R2', type: '歧义', description: '推荐下拉框内容来源与规则（热门/历史/固定）', impact: '中', status: '待确认', owner: '产品' },
  { id: 'R3', type: '歧义', description: '高亮匹配粒度（完全/子串）与大小写敏感性', impact: '中', status: '待确认', owner: '产品' },
  { id: 'R4', type: '缺失', description: '搜索结果为空时的展示未定义', impact: '中', status: '待确认', owner: '产品' },
  { id: 'R5', type: '歧义', description: '是否支持回车键触发搜索', impact: '低', status: '待确认', owner: '产品' },
  { id: 'R6', type: '环境', description: '实际被测 Web 站点 URL 未提供', impact: '高', status: '待确认', owner: '测试' }
];

(async () => {
  const xlsxPath = common.generateTestCasesExcel({
    projectName, outputDir, smokeCases, detailedCases, p0Candidates, risks
  });
  const xmindPath = await common.generateXMindFromTestCases({
    projectName, outputDir, smokeCases, detailedCases
  });
  console.log('DONE', xlsxPath, xmindPath);
})();
