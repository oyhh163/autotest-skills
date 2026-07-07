const XLSX = require('xlsx');
const path = require('path');

// 读取现有Excel
const workbook = XLSX.readFile(path.join(__dirname, 'test-cases.xlsx'));

// 基于Figma UI分析的新增测试用例
const figmaTestCases = [
  // 冒烟测试新增
  {
    sheet: '冒烟测试',
    cases: [
      {
        '用例ID': 'SMK-011',
        '模块': '订阅页UI',
        '功能点': 'CTA按钮文案',
        '用例标题': '[Figma] 验证CTA按钮文案显示"Start Free Trial"（非Trail）',
        '优先级': 'P0',
        '目标端': 'iOS',
        '前置条件': '进入订阅页',
        '测试数据': '游客模式',
        '步骤': '1. 完成OB流程进入订阅页\n2. 查看主CTA按钮文案',
        '预期结果': '按钮显示"Start Free Trial"，注意Trial拼写正确',
        '需求引用': 'Figma UI设计',
        '自动化适用性': '适合',
        '备注/风险': '🔴 Figma设计稿中为"Trail"，需确认是否已修复'
      },
      {
        '用例ID': 'SMK-012',
        '模块': '订阅页UI',
        '功能点': '试用说明文案',
        '用例标题': '[Figma] 验证试用说明文案拼写正确',
        '优先级': 'P0',
        '目标端': 'iOS',
        '前置条件': '进入订阅页',
        '测试数据': '游客模式',
        '步骤': '1. 进入订阅页\n2. 查看"3-day FREE trial"文案',
        '预期结果': '显示"Start your 3-day FREE trial to continue"，trial拼写正确',
        '需求引用': 'Figma UI设计',
        '自动化适用性': '适合',
        '备注/风险': '🔴 Figma设计稿中为"trail"，需确认是否已修复'
      },
      {
        '用例ID': 'SMK-013',
        '模块': '订阅页UI',
        '功能点': '关键数据展示',
        '用例标题': '[Figma] 验证用户数据统计展示正确',
        '优先级': 'P1',
        '目标端': 'iOS',
        '前置条件': '进入订阅页',
        '测试数据': '游客模式',
        '步骤': '1. 进入订阅页\n2. 查看统计数据展示',
        '预期结果': '显示"4.7 average rating"和"1M users worldwide"',
        '需求引用': 'Figma UI设计',
        '自动化适用性': '适合',
        '备注/风险': ''
      }
    ]
  },
  // 详细测试新增
  {
    sheet: '详细测试',
    cases: [
      {
        '用例ID': 'DET-034',
        '模块': '订阅页UI',
        '功能点': 'UI文案验证',
        '测试方法': '场景流程',
        '用例标题': '[Figma] 验证"No Payment Due Now"提示显示',
        '优先级': 'P0',
        '目标端': 'iOS',
        '前置条件': '进入订阅页',
        '测试数据': '游客模式',
        '步骤': '1. 进入订阅页\n2. 查看今日无需付款提示',
        '预期结果': '页面显示"No Payment Due Now"提示',
        '需求引用': 'Figma UI设计',
        '自动化适用性': '适合',
        '备注/风险': ''
      },
      {
        '用例ID': 'DET-035',
        '模块': '订阅页UI',
        '功能点': 'UI文案验证',
        '测试方法': '场景流程',
        '用例标题': '[Figma] 验证PREMIUM标识显示',
        '优先级': 'P1',
        '目标端': 'iOS',
        '前置条件': '进入订阅页',
        '测试数据': '游客模式',
        '步骤': '1. 进入订阅页\n2. 查看会员标识',
        '预期结果': '页面显示"PREMIUM"标识',
        '需求引用': 'Figma UI设计',
        '自动化适用性': '适合',
        '备注/风险': ''
      },
      {
        '用例ID': 'DET-036',
        '模块': '订阅页UI',
        '功能点': 'UI文案验证',
        '测试方法': '场景流程',
        '用例标题': '[Figma] 验证2.6x成功率文案显示',
        '优先级': 'P1',
        '目标端': 'iOS',
        '前置条件': '进入订阅页',
        '测试数据': '游客模式',
        '步骤': '1. 进入订阅页\n2. 查看成功率说明',
        '预期结果': '显示"AICal Premium members are 2.6x more likely to achieve their goals"',
        '需求引用': 'Figma UI设计',
        '自动化适用性': '适合',
        '备注/风险': 'Figma中显示"memebers"，需确认拼写'
      },
      {
        '用例ID': 'DET-037',
        '模块': '订阅页UI',
        '功能点': 'UI文案验证',
        '测试方法': '场景流程',
        '用例标题': '[Figma] 验证Restore恢复购买按钮存在',
        '优先级': 'P0',
        '目标端': 'iOS',
        '前置条件': '进入订阅页',
        '测试数据': '游客模式',
        '步骤': '1. 进入订阅页\n2. 查找Restore按钮',
        '预期结果': '页面存在"Restore"恢复购买按钮',
        '需求引用': 'Figma UI设计, App Store审核要求',
        '自动化适用性': '适合',
        '备注/风险': 'App Store审核必须项'
      },
      {
        '用例ID': 'DET-038',
        '模块': '订阅页UI',
        '功能点': 'UI文案验证',
        '测试方法': '场景流程',
        '用例标题': '[Figma] 验证订阅开始日期说明显示',
        '优先级': 'P0',
        '目标端': 'iOS',
        '前置条件': '进入订阅页',
        '测试数据': '游客模式',
        '步骤': '1. 进入订阅页\n2. 查看Day 3提示',
        '预期结果': '显示"Your subscription starts. Cancel beforehand to avoid payment"',
        '需求引用': 'Figma UI设计',
        '自动化适用性': '适合',
        '备注/风险': '🔴 Figma中"subsciption"拼写错误，需确认'
      },
      {
        '用例ID': 'DET-039',
        '模块': '订阅页UI',
        '功能点': 'UI布局验证',
        '测试方法': '兼容性',
        '用例标题': '[Figma] 验证订阅页在iPhone标准尺寸下布局正确',
        '优先级': 'P1',
        '目标端': 'iOS',
        '前置条件': '进入订阅页',
        '测试数据': 'iPhone标准尺寸(390x844)',
        '步骤': '1. 在标准iPhone上进入订阅页\n2. 检查所有元素是否完整显示',
        '预期结果': '所有UI元素正确布局，无截断或重叠',
        '需求引用': 'Figma UI设计',
        '自动化适用性': '需截图对比',
        '备注/风险': 'Figma设计尺寸390x844'
      }
    ]
  }
];

// 新增问题/风险
const newRisks = [
  {
    'ID': 'RISK-007',
    '类型': '设计缺陷',
    '描述': '[Figma] 订阅页CTA按钮"Trail"拼写错误，应为"Trial"',
    '影响': '影响用户体验和品牌专业度',
    '需要用户提供': 'UI修复确认',
    '决策': '需修复后再上线',
    '状态': '🔴 待修复'
  },
  {
    'ID': 'RISK-008',
    '类型': '设计缺陷',
    '描述': '[Figma] 多处"trail"拼写错误，包括试用说明文案',
    '影响': '影响品牌形象',
    '需要用户提供': 'UI修复确认',
    '决策': '需修复后再上线',
    '状态': '🔴 待修复'
  },
  {
    'ID': 'RISK-009',
    '类型': '设计缺陷',
    '描述': '[Figma] "subsciption"拼写错误，应为"subscription"',
    '影响': '影响用户理解',
    '需要用户提供': '确认是否为Figma显示问题',
    '决策': '',
    '状态': '待确认'
  }
];

// 新增P0自动化候选
const newP0Candidates = [
  {
    '自动化用例ID': 'AUTO-009',
    '来源用例ID': 'SMK-011, SMK-012',
    '目标端': 'iOS',
    '场景': '[Figma] 订阅页文案拼写验证',
    '前置条件': '进入订阅页',
    '测试数据': '游客模式',
    '自动化步骤': '1. 完成OB流程进入订阅页\n2. 获取CTA按钮文案\n3. 获取试用说明文案\n4. 验证拼写',
    '断言': '1. CTA按钮包含"Trial"而非"Trail"\n2. 说明文案包含"trial"而非"trail"',
    '清理': '无',
    '所需输入': 'Bundle ID, UDID',
    '阻塞问题': '需确认实际实现是否已修复设计稿拼写错误',
    '执行状态': '待执行'
  },
  {
    '自动化用例ID': 'AUTO-010',
    '来源用例ID': 'DET-037',
    '目标端': 'iOS',
    '场景': '[Figma] Restore按钮存在验证',
    '前置条件': '进入订阅页',
    '测试数据': '游客模式',
    '自动化步骤': '1. 进入订阅页\n2. 查找Restore按钮元素',
    '断言': 'Restore按钮可见',
    '清理': '无',
    '所需输入': 'Bundle ID, UDID',
    '阻塞问题': '无',
    '执行状态': '待执行'
  }
];

// 更新各工作表
figmaTestCases.forEach(({ sheet, cases }) => {
  const ws = workbook.Sheets[sheet];
  const existingData = XLSX.utils.sheet_to_json(ws);
  const updatedData = [...existingData, ...cases];
  const newWs = XLSX.utils.json_to_sheet(updatedData);
  workbook.Sheets[sheet] = newWs;
});

// 更新问题/风险
const riskWs = workbook.Sheets['问题风险'];
const existingRisks = XLSX.utils.sheet_to_json(riskWs);
const updatedRisks = [...existingRisks, ...newRisks];
workbook.Sheets['问题风险'] = XLSX.utils.json_to_sheet(updatedRisks);

// 更新P0自动化候选
const p0Ws = workbook.Sheets['P0自动化候选'];
const existingP0 = XLSX.utils.sheet_to_json(p0Ws);
const updatedP0 = [...existingP0, ...newP0Candidates];
workbook.Sheets['P0自动化候选'] = XLSX.utils.json_to_sheet(updatedP0);

// 保存更新后的Excel
XLSX.writeFile(workbook, path.join(__dirname, 'test-cases.xlsx'));

console.log('测试用例Excel已更新（基于Figma UI分析）：');
console.log(`- 冒烟测试新增: ${figmaTestCases[0].cases.length} 条`);
console.log(`- 详细测试新增: ${figmaTestCases[1].cases.length} 条`);
console.log(`- 问题/风险新增: ${newRisks.length} 条`);
console.log(`- P0自动化候选新增: ${newP0Candidates.length} 条`);

// 输出Figma发现的设计问题汇总
console.log('\n=== Figma设计问题汇总 ===');
console.log('🔴 高优先级问题：');
console.log('1. CTA按钮 "Start Free Trail" → 应为 "Start Free Trial"');
console.log('2. 说明文案 "3-day FREE trail" → 应为 "3-day FREE trial"');
console.log('\n⚠️ 待确认问题：');
console.log('3. "subsciption" → 应为 "subscription"');
console.log('4. "memebers" → 应为 "members"');
