/**
 * 测试产物发布模块
 *
 * 负责：
 * - 在测试产物目录中定位 test-cases.xlsx / test-cases.xmind
 * - 解析 Excel 中的测试用例
 * - 动态创建飞书多维表格(Bitable)并写入用例记录，返回可访问链接
 */

const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

/**
 * 在指定目录（含子目录）中查找目标文件，返回最近修改的一个
 * @param {string} baseDir 起始目录
 * @param {string} fileName 目标文件名（如 test-cases.xlsx）
 * @returns {string|null} 文件绝对路径
 */
function findFileRecursive(baseDir, fileName) {
  if (!baseDir || !fs.existsSync(baseDir)) return null;

  let best = null;
  let bestMtime = 0;

  const walk = (dir, depth) => {
    if (depth > 4) return; // 限制递归深度，避免误扫 node_modules 等
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full, depth + 1);
      } else if (entry.name === fileName) {
        try {
          const mtime = fs.statSync(full).mtimeMs;
          if (mtime > bestMtime) {
            bestMtime = mtime;
            best = full;
          }
        } catch {
          /* ignore */
        }
      }
    }
  };

  walk(baseDir, 0);
  return best;
}

/**
 * 定位测试产物文件（xlsx / xmind）
 * 优先在 session 输出目录查找，找不到时回退到全局输出目录
 * @param {string} sessionOutputDir
 * @param {string} globalOutputDir
 */
function findOutputFiles(sessionOutputDir, globalOutputDir) {
  const searchDirs = [sessionOutputDir, globalOutputDir].filter(Boolean);

  let xlsxPath = null;
  let xmindPath = null;

  for (const dir of searchDirs) {
    if (!xlsxPath) xlsxPath = findFileRecursive(dir, 'test-cases.xlsx');
    if (!xmindPath) xmindPath = findFileRecursive(dir, 'test-cases.xmind');
    if (xlsxPath && xmindPath) break;
  }

  return { xlsxPath, xmindPath };
}

/**
 * 在 session/全局输出目录中查找指定文件名（取最近修改的）
 * @param {string} sessionOutputDir
 * @param {string} globalOutputDir
 * @param {string} fileName
 * @returns {string|null}
 */
function findOutputFile(sessionOutputDir, globalOutputDir, fileName) {
  for (const dir of [sessionOutputDir, globalOutputDir].filter(Boolean)) {
    const found = findFileRecursive(dir, fileName);
    if (found) return found;
  }
  return null;
}

/**
 * 从 test-cases.xlsx 读取冒烟与详细用例
 * @param {string} xlsxPath
 * @returns {{smokeCases: Array, detailedCases: Array}}
 */
function readTestCasesFromXlsx(xlsxPath) {
  const wb = xlsx.readFile(xlsxPath);

  const parseSheet = (sheetName) => {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) return [];
    return xlsx.utils.sheet_to_json(sheet, { defval: '' });
  };

  return {
    smokeCases: parseSheet('冒烟测试'),
    detailedCases: parseSheet('详细测试'),
  };
}

/**
 * 将 Excel 行对象规整为统一记录字段
 * @param {Object} row Excel 行
 * @param {string} category 类别（冒烟/详细）
 */
function normalizeRecord(row, category) {
  return {
    用例ID: String(row['用例ID'] || ''),
    类别: category,
    模块: String(row['模块'] || ''),
    用例标题: String(row['用例标题'] || ''),
    前置条件: String(row['前置条件'] || ''),
    操作步骤: String(row['操作步骤'] || ''),
    预期结果: String(row['预期结果'] || ''),
    优先级: String(row['优先级'] || ''),
    类型: String(row['类型'] || (category === '冒烟' ? '冒烟' : '功能')),
    状态: '待测试',
  };
}

// 多维表格字段定义（type 1 = 多行文本）
const TABLE_FIELDS = [
  '用例ID', '类别', '模块', '用例标题', '前置条件',
  '操作步骤', '预期结果', '优先级', '类型', '状态',
].map((name) => ({ field_name: name, type: 1 }));

/**
 * 数组分块
 */
function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

/**
 * 动态创建多维表格并写入测试用例
 * @param {object} cli 飞书 SDK client
 * @param {object} opts
 * @param {string} opts.projectName 项目名（用于表格标题）
 * @param {Array} opts.smokeCases
 * @param {Array} opts.detailedCases
 * @param {string} [opts.folderToken] 目标文件夹 token（可选）
 * @returns {Promise<{url:string, appToken:string, tableId:string, total:number}|null>}
 */
async function createTestCaseBitable(cli, { projectName, smokeCases = [], detailedCases = [], folderToken }) {
  const timestamp = new Date().toLocaleString('zh-CN').replace(/[/:]/g, '-');
  const appName = `${projectName || '测试用例'} - ${timestamp}`;

  // 1. 创建多维表格应用
  const createData = { name: appName };
  if (folderToken) createData.folder_token = folderToken;

  const appResp = await cli.bitable.app.create({ data: createData });
  const app = appResp?.data?.app || appResp?.app;
  if (!app || !app.app_token) {
    throw new Error('创建多维表格失败，未返回 app_token');
  }
  const appToken = app.app_token;
  const appUrl = app.url;
  const defaultTableId = app.default_table_id;
  const appFolderToken = app.folder_token; // 多维表格所在文件夹，用于就近上传附件

  // 2. 创建"测试用例"数据表（带字段）
  const tableResp = await cli.bitable.appTable.create({
    path: { app_token: appToken },
    data: {
      table: {
        name: '测试用例',
        default_view_name: '全部用例',
        fields: TABLE_FIELDS,
      },
    },
  });
  const tableId = tableResp?.data?.table_id || tableResp?.table_id;
  if (!tableId) {
    throw new Error('创建数据表失败，未返回 table_id');
  }

  // 3. 删除默认空表（失败不影响主流程）
  if (defaultTableId) {
    try {
      await cli.bitable.appTable.delete({
        path: { app_token: appToken, table_id: defaultTableId },
      });
    } catch (e) {
      console.warn('删除默认表失败（忽略）:', e?.message || e);
    }
  }

  // 4. 组装并批量写入记录
  const records = [
    ...smokeCases.map((r) => ({ fields: normalizeRecord(r, '冒烟') })),
    ...detailedCases.map((r) => ({ fields: normalizeRecord(r, '详细') })),
  ];

  let written = 0;
  for (const batch of chunk(records, 200)) {
    if (batch.length === 0) continue;
    await cli.bitable.appTableRecord.batchCreate({
      path: { app_token: appToken, table_id: tableId },
      data: { records: batch },
    });
    written += batch.length;
  }

  // 5. 设置为租户内可编辑（失败不影响返回链接）
  try {
    await cli.drive.permissionPublic.patch({
      path: { token: appToken },
      params: { type: 'bitable' },
      data: {
        link_share_entity: 'tenant_editable',
        external_access_entity: 'closed',
      },
    });
  } catch (e) {
    console.warn('设置多维表格可见性失败（用户可能需要手动授权）:', e?.message || e);
  }

  return {
    url: appUrl,
    appToken,
    tableId,
    folderToken: appFolderToken,
    total: written,
  };
}

module.exports = {
  findOutputFiles,
  findOutputFile,
  readTestCasesFromXlsx,
  createTestCaseBitable,
};
