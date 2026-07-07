const XLSX = require('xlsx');
const path = require('path');
const os = require('os');

// 缺陷模板数据（自动化未执行，提供模板供后续使用）
const defectTemplate = [
  {
    'Bug ID': 'BUG-001',
    '来源用例ID': 'SMK-001',
    '自动化用例ID': 'AUTO-001',
    '目标端': 'iOS',
    '模块': '老用户OB',
    '功能': '用户分组',
    '严重程度': '待定',
    '标题': '[模板] 描述缺陷的简短标题',
    '实际结果': '实际观察到的行为',
    '预期结果': '需求文档定义的预期行为',
    '复现步骤': '1. 步骤1\n2. 步骤2\n3. 步骤3',
    '环境': 'iOS 17 / iPhone 14 Pro / 生产环境',
    '证据路径': 'screenshots/error-xxx.png',
    '可疑原因': '待分析',
    '状态': '待提交',
    '需求歧义': '否'
  }
];

// 执行状态汇总
const executionSummary = [
  {
    '自动化用例ID': 'AUTO-001',
    '用例名称': '实验组22进入OB验证',
    '执行状态': '未执行',
    '阻塞原因': 'Windows环境不支持iOS自动化',
    '预计结果': '-',
    '实际结果': '-',
    '备注': '需迁移至Mac环境执行'
  },
  {
    '自动化用例ID': 'AUTO-002',
    '用例名称': '完整OB流程到订阅页',
    '执行状态': '未执行',
    '阻塞原因': 'Windows环境不支持iOS自动化',
    '预计结果': '-',
    '实际结果': '-',
    '备注': '需迁移至Mac环境执行'
  },
  {
    '自动化用例ID': 'AUTO-003',
    '用例名称': '欢迎页减重文案验证',
    '执行状态': '未执行',
    '阻塞原因': 'Windows环境不支持iOS自动化',
    '预计结果': '-',
    '实际结果': '-',
    '备注': '需迁移至Mac环境执行'
  },
  {
    '自动化用例ID': 'AUTO-004',
    '用例名称': 'OB流程无评分弹窗',
    '执行状态': '未执行',
    '阻塞原因': 'Windows环境不支持iOS自动化',
    '预计结果': '-',
    '实际结果': '-',
    '备注': '需迁移至Mac环境执行'
  },
  {
    '自动化用例ID': 'AUTO-005',
    '用例名称': '审核态挽留隐藏',
    '执行状态': '未执行',
    '阻塞原因': 'Windows + Remote Config权限',
    '预计结果': '-',
    '实际结果': '-',
    '备注': '需Mac环境 + 后台配置权限'
  },
  {
    '自动化用例ID': 'AUTO-006',
    '用例名称': '目标选择-外表改变',
    '执行状态': '未执行',
    '阻塞原因': 'Windows环境不支持iOS自动化',
    '预计结果': '-',
    '实际结果': '-',
    '备注': '需迁移至Mac环境执行'
  },
  {
    '自动化用例ID': 'AUTO-007',
    '用例名称': '目标选择-自我感觉',
    '执行状态': '未执行',
    '阻塞原因': 'Windows环境不支持iOS自动化',
    '预计结果': '-',
    '实际结果': '-',
    '备注': '需迁移至Mac环境执行'
  },
  {
    '自动化用例ID': 'AUTO-008',
    '用例名称': '目标选择-健康改善',
    '执行状态': '未执行',
    '阻塞原因': 'Windows环境不支持iOS自动化',
    '预计结果': '-',
    '实际结果': '-',
    '备注': '需迁移至Mac环境执行'
  }
];

// 创建工作簿
const wb = XLSX.utils.book_new();

// 添加执行状态汇总工作表
const wsSummary = XLSX.utils.json_to_sheet(executionSummary);
XLSX.utils.book_append_sheet(wb, wsSummary, '执行状态汇总');

// 添加缺陷模板工作表
const wsDefects = XLSX.utils.json_to_sheet(defectTemplate);
XLSX.utils.book_append_sheet(wb, wsDefects, '缺陷记录模板');

// 设置列宽
const setColumnWidths = (ws, widths) => {
  ws['!cols'] = widths.map(w => ({ wch: w }));
};

setColumnWidths(wsSummary, [15, 25, 10, 35, 12, 12, 30]);
setColumnWidths(wsDefects, [10, 12, 15, 8, 12, 12, 10, 40, 30, 30, 40, 30, 25, 20, 10, 10]);

// 获取桌面路径
const desktopPath = path.join(os.homedir(), 'Desktop');
const timestamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '').slice(0, 12);
const outputPath = path.join(desktopPath, `automation-defects-${timestamp}.xlsx`);

// 写入文件
XLSX.writeFile(wb, outputPath);

console.log(`缺陷汇总Excel已生成到桌面: ${outputPath}`);
console.log(`- 执行状态汇总: ${executionSummary.length} 条`);
console.log(`- 缺陷记录模板: ${defectTemplate.length} 条`);
console.log('\n注意: 自动化用例因环境限制未执行，当前仅提供模板和执行状态汇总。');
