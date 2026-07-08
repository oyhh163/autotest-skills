/**
 * 飞书客户端封装
 * 
 * 提供：
 * - 消息发送
 * - 交互卡片发送（支持更新）
 * - 多维表格操作
 */

const lark = require('@larksuiteoapi/node-sdk');
const { config } = require('./config');
const fs = require('fs');
const path = require('path');

let client = null;

// 存储每个会话的进度卡片消息ID，用于更新而非重复发送
const progressCardIds = new Map();

// 存储每个会话最近一张“选择卡片”的上下文，用于点击后回填选中态
// chatId -> { messageId, title, content, options, callbackKey }
const choiceCards = new Map();

function initLarkClient() {
  if (!client) {
    client = new lark.Client({
      appId: config.lark.appId,
      appSecret: config.lark.appSecret,
      disableTokenCache: false,
    });
  }
  return client;
}

/**
 * 获取或设置进度卡片消息ID
 */
function getProgressCardId(chatId) {
  return progressCardIds.get(chatId);
}

function setProgressCardId(chatId, messageId) {
  progressCardIds.set(chatId, messageId);
}

function clearProgressCardId(chatId) {
  progressCardIds.delete(chatId);
}

/**
 * 下载消息中的图片，保存到本地，返回文件路径
 * @param {string} messageId - 消息ID
 * @param {string} imageKey - 图片key（image_key）
 * @returns {Promise<string|null>} 本地文件路径
 */
async function downloadMessageImage(messageId, imageKey) {
  const cli = initLarkClient();
  
  // 输出目录
  const outDir = path.join(config.testSystem.outputPath, 'requirement-images');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  const filePath = path.join(outDir, `${imageKey}.png`);
  
  try {
    const resp = await cli.im.messageResource.get({
      path: { message_id: messageId, file_key: imageKey },
      params: { type: 'image' },
    });
    
    // SDK 文件响应提供 writeFile 方法
    if (resp && typeof resp.writeFile === 'function') {
      await resp.writeFile(filePath);
      return filePath;
    }
    
    // 兜底：尝试从可读流写入
    if (resp && typeof resp.getReadableStream === 'function') {
      await new Promise((resolve, reject) => {
        const ws = fs.createWriteStream(filePath);
        resp.getReadableStream().pipe(ws);
        ws.on('finish', resolve);
        ws.on('error', reject);
      });
      return filePath;
    }
    
    console.error('图片响应格式未知，无法保存');
    return null;
  } catch (error) {
    console.error('下载图片失败:', error?.message || error);
    return null;
  }
}

/**
 * 发送文本消息
 */
async function sendTextMessage(chatId, text) {
  const cli = initLarkClient();
  return await cli.im.message.create({
    data: {
      receive_id: chatId,
      msg_type: 'text',
      content: JSON.stringify({ text }),
    },
    params: {
      receive_id_type: 'chat_id',
    },
  });
}

/**
 * 发送交互卡片（用于用户选择）
 * 
 * @param {string} chatId - 会话ID
 * @param {string} title - 卡片标题
 * @param {string} content - 卡片内容
 * @param {Array} options - 选项数组 [{value, text}]
 * @param {string} callbackKey - 回调标识
 */
/**
 * 构建“选择卡片”对象
 * @param {string|null} selectedValue 已选中的选项 value；为 null 表示初始未选择状态
 *
 * 初始状态：所有按钮统一样式（不预置默认高亮）；
 * 已选择状态：仅被点击的选项高亮(primary)并加勾，其余置灰(default)且移除回调值，
 *            底部提示替换为“✅ 已选择：xxx”。
 */
function buildChoiceCard(title, content, options, callbackKey, chatId, selectedValue = null) {
  const hasSelection = selectedValue != null;

  const elements = [
    {
      tag: 'div',
      text: { tag: 'lark_md', content: content || '请选择：' },
    },
    { tag: 'hr' },
  ];

  (options || []).forEach((opt) => {
    const isSelected = hasSelection && opt.value === selectedValue;
    const btn = {
      tag: 'button',
      text: {
        tag: 'plain_text',
        content: isSelected ? `✔ ${opt.text}` : opt.text,
      },
      type: isSelected ? 'primary' : 'default',
    };
    // 未选择状态：挂载回调值可点击；已选择后不再挂载，避免重复触发
    if (!hasSelection) {
      btn.value = {
        key: callbackKey || 'user_choice',
        selected: opt.value,
        chat_id: chatId,
      };
    }
    elements.push({ tag: 'action', actions: [btn] });
  });

  if (hasSelection) {
    const selText = ((options || []).find((o) => o.value === selectedValue) || {}).text || selectedValue;
    elements.push({
      tag: 'note',
      elements: [{ tag: 'plain_text', content: `✅ 已选择：${selText}` }],
    });
  } else {
    elements.push({
      tag: 'note',
      elements: [{ tag: 'plain_text', content: '💡 点击按钮选择，或直接回复选项编号（如 1）' }],
    });
  }

  return {
    config: { wide_screen_mode: true, update_multi: true },
    header: {
      title: { tag: 'plain_text', content: title || '需要您的选择' },
      template: hasSelection ? 'green' : 'orange',
    },
    elements,
  };
}

async function sendInteractiveCard(chatId, title, content, options, callbackKey) {
  const cli = initLarkClient();

  const card = buildChoiceCard(title, content, options, callbackKey, chatId, null);

  try {
    const result = await cli.im.message.create({
      data: {
        receive_id: chatId,
        msg_type: 'interactive',
        content: JSON.stringify(card),
      },
      params: {
        receive_id_type: 'chat_id',
      },
    });
    const messageId = result?.data?.message_id;
    if (messageId) {
      choiceCards.set(chatId, { messageId, title, content, options, callbackKey });
    }
    return result;
  } catch (error) {
    console.error('发送交互卡片失败:', error?.message || error);
    // 降级为文本消息
    const optionsList = options.map((opt, i) => `${i + 1}. ${opt.text}`).join('\n');
    await sendTextMessage(chatId, `【${title}】\n${content}\n\n${optionsList}\n\n请回复选项编号进行选择。`);
  }
}

/**
 * 用户完成选择后，将对应的选择卡片更新为“已选中”状态（保留在所点选项上）
 * @returns {Promise<boolean>} 是否成功更新
 */
async function markChoiceCardSelected(chatId, selectedValue) {
  const ctx = choiceCards.get(chatId);
  if (!ctx || !ctx.messageId) return false;
  try {
    const card = buildChoiceCard(ctx.title, ctx.content, ctx.options, ctx.callbackKey, chatId, selectedValue);
    await updateCard(ctx.messageId, card);
    choiceCards.delete(chatId);
    return true;
  } catch (error) {
    console.error('更新选择卡片失败:', error?.message || error);
    return false;
  }
}

/**
 * 简化的6阶段流程
 * 1. 初始化
 * 2. 分析需求
 * 3. 生成测试用例（实时进度）
 * 4. 生成自动化用例（实时进度）
 * 5. 执行自动化（总数/通过数）
 * 6. 反馈Bug
 */
const PHASES = [
  { key: 'init', name: '初始化', icon: '🚀' },
  { key: 'analyze', name: '分析需求', icon: '📖' },
  { key: 'testcase', name: '生成测试用例', icon: '📝' },
  { key: 'autocase', name: '生成自动化用例', icon: '🤖' },
  { key: 'execute', name: '执行自动化', icon: '▶️' },
  { key: 'feedback', name: '反馈Bug', icon: '🐛' },
];

/**
 * 生成文本进度条
 * @param {number} current - 当前完成数
 * @param {number} total - 总数
 * @param {number} length - 进度条长度（字符数）
 */
function buildProgressBar(current, total, length = 12) {
  const ratio = total > 0 ? Math.min(current / total, 1) : 0;
  const filled = Math.round(ratio * length);
  const empty = length - filled;
  const percent = Math.round(ratio * 100);
  return `${'▓'.repeat(filled)}${'░'.repeat(empty)} ${percent}%`;
}

/**
 * 构建进度卡片内容（单张卡片：当前阶段 + 进度条）
 */
function buildProgressCard(progressData, chatId) {
  const {
    currentPhase,  // 当前阶段 key
    phaseStatus,   // 各阶段状态
    phaseDetails,  // 各阶段详情
    title,
    headerColor,
  } = progressData;
  
  // 找到当前阶段信息
  const phaseIndex = PHASES.findIndex(p => p.key === currentPhase);
  const currentPhaseInfo = PHASES[phaseIndex] || PHASES[0];
  const status = phaseStatus[currentPhase] || 'running';
  const detail = phaseDetails[currentPhase] || '';
  
  // 阶段进度条（第几阶段 / 总阶段）
  const allDone = Object.values(phaseStatus).every(s => s === 'done');
  const doneCount = allDone ? PHASES.length : phaseIndex + (status === 'done' ? 1 : 0);
  const stageBar = buildProgressBar(doneCount, PHASES.length);
  
  // 状态图标
  let statusIcon = '🔄';
  if (status === 'done') statusIcon = '✅';
  else if (status === 'error') statusIcon = '❌';
  else if (allDone) statusIcon = '🎉';
  
  // 卡片正文
  let content = `**当前阶段**\n${statusIcon} ${currentPhaseInfo.icon} ${currentPhaseInfo.name}（第 ${phaseIndex + 1}/${PHASES.length} 步）`;
  content += `\n\n**总进度**\n${stageBar}`;
  if (detail) {
    content += `\n\n**详情**\n${detail}`;
  }
  
  const elements = [
    {
      tag: 'div',
      text: {
        tag: 'lark_md',
        content,
      },
    },
  ];
  
  // 未完成时提供停止按钮
  if (!allDone && status !== 'error') {
    elements.push({
      tag: 'action',
      actions: [
        {
          tag: 'button',
          text: { tag: 'plain_text', content: '🛑 停止流程' },
          type: 'danger',
          value: { action: 'stop', chat_id: chatId },
        },
      ],
    });
  }
  
  elements.push({
    tag: 'note',
    elements: [
      {
        tag: 'plain_text',
        content: `更新: ${new Date().toLocaleString('zh-CN')}｜发送"停止"可随时中止`,
      },
    ],
  });
  
  return {
    config: {
      wide_screen_mode: true,
      update_multi: true,
    },
    header: {
      title: {
        tag: 'plain_text',
        content: title || '📊 测试进度',
      },
      template: headerColor || 'blue',
    },
    elements,
  };
}

/**
 * 从 SDK 响应中提取 message_id（兼容不同返回结构）
 */
function extractMessageId(result) {
  return result?.data?.message_id 
    || result?.message_id 
    || result?.data?.data?.message_id 
    || null;
}

// 每个会话的更新串行锁，防止并发导致重复建卡刷屏
const progressUpdateLocks = new Map();

/**
 * 发送或更新进度卡片（只维护一张卡片，串行执行防止竞态）
 */
async function sendOrUpdateProgressCard(chatId, progressData) {
  // 将本次更新链接到该会话的上一次更新之后，保证串行
  const prev = progressUpdateLocks.get(chatId) || Promise.resolve();
  const task = prev
    .catch(() => {})
    .then(() => doSendOrUpdateProgressCard(chatId, progressData));
  progressUpdateLocks.set(chatId, task);
  return task;
}

async function doSendOrUpdateProgressCard(chatId, progressData) {
  const cli = initLarkClient();
  const card = buildProgressCard(progressData, chatId);
  const existingMessageId = getProgressCardId(chatId);
  
  try {
    if (existingMessageId) {
      // 更新现有卡片
      await cli.im.message.patch({
        path: { message_id: existingMessageId },
        data: { content: JSON.stringify(card) },
      });
      return { message_id: existingMessageId, updated: true };
    } else {
      // 发送新卡片
      const result = await cli.im.message.create({
        data: {
          receive_id: chatId,
          msg_type: 'interactive',
          content: JSON.stringify(card),
        },
        params: { receive_id_type: 'chat_id' },
      });
      
      const messageId = extractMessageId(result);
      if (messageId) {
        setProgressCardId(chatId, messageId);
      }
      return { message_id: messageId, created: true };
    }
  } catch (error) {
    console.error('发送/更新进度卡片失败:', error?.message || error);
    // 更新失败（如消息过期），清除ID下次重新建卡
    if (existingMessageId) {
      clearProgressCardId(chatId);
    }
  }
}

/**
 * 旧版兼容 - 发送进度卡片（不推荐使用，保留兼容）
 */
async function sendProgressCard(chatId, phase, status, details) {
  // 转换为新格式
  const phaseKey = {
    '初始化': 'init',
    '分析需求': 'analyze', '需求分析': 'analyze',
    '生成测试用例': 'testcase', '测试用例生成': 'testcase',
    '生成自动化用例': 'autocase', '自动化筛选': 'autocase',
    '执行自动化': 'execute', 'UI自动化': 'execute',
    '反馈Bug': 'feedback', '缺陷汇总': 'feedback',
    '完成': 'feedback',
  }[phase] || 'init';
  
  const phaseStatus = {};
  const phaseDetails = {};
  
  // 设置已完成的阶段
  const phaseOrder = ['init', 'analyze', 'testcase', 'autocase', 'execute', 'feedback'];
  const currentIndex = phaseOrder.indexOf(phaseKey);
  
  phaseOrder.forEach((key, index) => {
    if (index < currentIndex) {
      phaseStatus[key] = 'done';
    } else if (index === currentIndex) {
      phaseStatus[key] = status === 'success' ? 'done' : (status === 'error' ? 'error' : 'running');
      if (details) phaseDetails[key] = details;
    } else {
      phaseStatus[key] = 'pending';
    }
  });
  
  const headerColor = status === 'success' ? 'green' : (status === 'error' ? 'red' : 'blue');
  
  return sendOrUpdateProgressCard(chatId, {
    currentPhase: phaseKey,
    phaseStatus,
    phaseDetails,
    headerColor,
  });
}

/**
 * 更新卡片消息
 */
async function updateCard(messageId, card) {
  const cli = initLarkClient();
  
  return await cli.im.message.patch({
    path: {
      message_id: messageId,
    },
    data: {
      content: JSON.stringify(card),
    },
  });
}

/**
 * 在多维表格中创建Bug记录
 */
async function createBugRecord(bugData) {
  const cli = initLarkClient();
  
  if (!config.bugTable.baseToken || !config.bugTable.tableId) {
    console.warn('Bug记录表格未配置，跳过记录');
    return null;
  }
  
  return await cli.bitable.appTableRecord.create({
    path: {
      app_token: config.bugTable.baseToken,
      table_id: config.bugTable.tableId,
    },
    data: {
      fields: {
        '标题': bugData.title,
        '描述': bugData.description,
        '严重程度': bugData.severity || 'P2',
        '状态': '待处理',
        '发现时间': new Date().toISOString(),
        '测试用例': bugData.testCase || '',
        '复现步骤': bugData.steps || '',
        '预期结果': bugData.expected || '',
        '实际结果': bugData.actual || '',
      },
    },
  });
}

/**
 * 批量创建Bug记录
 */
async function createBugRecords(bugs) {
  const results = [];
  for (const bug of bugs) {
    try {
      const result = await createBugRecord(bug);
      results.push({ success: true, bug, result });
    } catch (error) {
      results.push({ success: false, bug, error: error.message });
    }
  }
  return results;
}

/**
 * 上传本地文件并作为文件消息发送到会话（用于 xmind 等附件）
 * @param {string} chatId
 * @param {string} filePath 本地文件绝对路径
 * @param {string} [displayName] 展示文件名（默认取文件名）
 * @returns {Promise<boolean>} 是否成功
 */
async function sendFileMessage(chatId, filePath, displayName) {
  const cli = initLarkClient();

  if (!filePath || !fs.existsSync(filePath)) {
    console.warn('待发送文件不存在:', filePath);
    return false;
  }

  const fileName = displayName || path.basename(filePath);

  try {
    // 1. 上传文件，获取 file_key
    const uploadResp = await cli.im.file.create({
      data: {
        file_type: 'stream',
        file_name: fileName,
        file: fs.createReadStream(filePath),
      },
    });

    const fileKey = uploadResp?.data?.file_key || uploadResp?.file_key;
    if (!fileKey) {
      console.error('文件上传未返回 file_key');
      return false;
    }

    // 2. 作为文件消息发送
    await cli.im.message.create({
      data: {
        receive_id: chatId,
        msg_type: 'file',
        content: JSON.stringify({ file_key: fileKey }),
      },
      params: { receive_id_type: 'chat_id' },
    });

    return true;
  } catch (error) {
    console.error('发送文件消息失败:', error?.message || error);
    return false;
  }
}

/**
 * 上传文件到云空间指定文件夹，返回可访问链接
 * @param {string} filePath 本地文件绝对路径
 * @param {string} folderToken 目标文件夹 token
 * @returns {Promise<string|null>} 文件可访问 URL
 */
// 应用身份没有个人空间根目录，上传附件需要一个文件夹 token；此处按需创建并缓存
let uploadFolderToken = null;

async function ensureUploadFolder(cli) {
  if (uploadFolderToken) return uploadFolderToken;
  try {
    const r = await cli.drive.file.createFolder({
      data: { name: 'QA测试产物', folder_token: '' },
    });
    uploadFolderToken = r?.data?.token || r?.token || null;
  } catch (e) {
    console.error('创建云空间文件夹失败:', e?.message || e);
    uploadFolderToken = null;
  }
  return uploadFolderToken;
}

async function uploadFileToDrive(filePath, folderToken) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  const cli = initLarkClient();

  try {
    // 优先用传入的文件夹；没有则按需创建一个应用可写的文件夹
    let parent = folderToken || (await ensureUploadFolder(cli));
    if (!parent) return null;

    const stat = fs.statSync(filePath);
    const resp = await cli.drive.file.uploadAll({
      data: {
        file_name: path.basename(filePath),
        parent_type: 'explorer',
        parent_node: parent,
        size: stat.size,
        file: fs.createReadStream(filePath),
      },
    });

    const fileToken = resp?.data?.file_token || resp?.file_token;
    if (!fileToken) return null;

    // 设为租户内可读，保证卡片里的链接可直接打开（失败不影响返回链接）
    try {
      await cli.drive.permissionPublic.patch({
        path: { token: fileToken },
        params: { type: 'file' },
        data: {
          link_share_entity: 'tenant_readable',
          external_access_entity: 'closed',
        },
      });
    } catch (e) {
      console.warn('设置文件可见性失败（可能需手动授权）:', e?.message || e);
    }

    return `https://${config.lark.tenantDomain}/file/${fileToken}`;
  } catch (error) {
    console.error('上传文件到云空间失败:', error?.message || error);
    return null;
  }
}

/**
 * 发送测试结果汇总卡片（在线用例表链接 + 脑图下载 + Bug 汇总）
 * @param {string} chatId
 * @param {object} data
 * @param {string} [data.bitableUrl] 在线多维表格链接
 * @param {number} [data.caseCount] 用例数量
 * @param {Array} [data.bugs] Bug 列表
 * @param {string} [data.bugBaseUrl] Bug 多维表格链接
 * @param {string} [data.outputDir] 本地产物目录
 * @param {string} [data.xmindUrl] 脑图云空间下载链接（放到卡片按钮）
 * @param {boolean} [data.xmindAsFile] 是否已改为单独文件消息发送（无云链接时的兜底）
 */
async function sendResultCard(chatId, data = {}) {
  const cli = initLarkClient();
  const { bitableUrl, caseCount, bugs = [], bugBaseUrl, outputDir, xmindUrl, xmindAsFile } = data;

  const bugCount = bugs.length;
  const bugList = bugs.length > 0
    ? bugs.map((b, i) => `${i + 1}. **${b.title}** (${b.severity || 'P2'})`).join('\n')
    : '✅ 未发现问题';

  let content = '**测试流程已完成** 🎉\n\n';
  if (typeof caseCount === 'number') {
    content += `📝 测试用例：${caseCount} 条\n`;
  }
  content += `🐛 发现问题：${bugCount} 个\n\n**问题概览**\n${bugList}`;

  const elements = [
    { tag: 'div', text: { tag: 'lark_md', content } },
    { tag: 'hr' },
  ];

  // 链接按钮区
  const linkButtons = [];
  if (bitableUrl) {
    linkButtons.push({
      tag: 'button',
      text: { tag: 'plain_text', content: '📊 在线查看用例表' },
      type: 'primary',
      url: bitableUrl,
    });
  }
  if (xmindUrl) {
    linkButtons.push({
      tag: 'button',
      text: { tag: 'plain_text', content: '🧠 下载脑图(.xmind)' },
      type: 'default',
      url: xmindUrl,
    });
  }
  if (bugBaseUrl) {
    linkButtons.push({
      tag: 'button',
      text: { tag: 'plain_text', content: '🐛 查看Bug表格' },
      type: 'default',
      url: bugBaseUrl,
    });
  }
  if (linkButtons.length > 0) {
    elements.push({ tag: 'action', actions: linkButtons });
  }

  const notes = [];
  if (xmindAsFile) notes.push('🧠 脑图(.xmind)已作为文件单独发送，可下载后用 XMind 打开');
  if (outputDir) notes.push(`📁 本地产物目录：${outputDir}`);
  if (notes.length > 0) {
    elements.push({
      tag: 'note',
      elements: notes.map((n) => ({ tag: 'plain_text', content: n })),
    });
  }

  const card = {
    config: { wide_screen_mode: true },
    header: {
      title: { tag: 'plain_text', content: bugCount > 0 ? `🐛 完成，发现 ${bugCount} 个问题` : '✅ 测试完成' },
      template: bugCount > 0 ? 'orange' : 'green',
    },
    elements,
  };

  return await cli.im.message.create({
    data: {
      receive_id: chatId,
      msg_type: 'interactive',
      content: JSON.stringify(card),
    },
    params: { receive_id_type: 'chat_id' },
  });
}

/**
 * 发送Bug汇总卡片
 */
async function sendBugSummaryCard(chatId, bugs, baseUrl) {
  const cli = initLarkClient();
  
  const bugList = bugs.map((bug, i) => 
    `${i + 1}. **${bug.title}** (${bug.severity || 'P2'})`
  ).join('\n');
  
  const card = {
    config: {
      wide_screen_mode: true,
    },
    header: {
      title: {
        tag: 'plain_text',
        content: `🐛 发现 ${bugs.length} 个问题`,
      },
      template: bugs.length > 0 ? 'red' : 'green',
    },
    elements: [
      {
        tag: 'div',
        text: {
          tag: 'lark_md',
          content: bugs.length > 0 ? bugList : '✅ 未发现问题',
        },
      },
    ],
  };
  
  if (baseUrl) {
    card.elements.push({
      tag: 'action',
      actions: [
        {
          tag: 'button',
          text: {
            tag: 'plain_text',
            content: '查看Bug表格',
          },
          type: 'default',
          url: baseUrl,
        },
      ],
    });
  }
  
  return await cli.im.message.create({
    data: {
      receive_id: chatId,
      msg_type: 'interactive',
      content: JSON.stringify(card),
    },
    params: {
      receive_id_type: 'chat_id',
    },
  });
}

module.exports = {
  initLarkClient,
  downloadMessageImage,
  sendTextMessage,
  sendInteractiveCard,
  markChoiceCardSelected,
  sendProgressCard,
  sendOrUpdateProgressCard,
  updateCard,
  createBugRecord,
  createBugRecords,
  sendBugSummaryCard,
  sendFileMessage,
  uploadFileToDrive,
  sendResultCard,
  // 进度卡片管理
  getProgressCardId,
  setProgressCardId,
  clearProgressCardId,
  // 常量
  PHASES,
};
