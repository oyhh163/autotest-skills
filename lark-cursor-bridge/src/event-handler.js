/**
 * 飞书事件处理模块
 * 
 * 处理：
 * - 消息事件（接收需求链接）
 * - 卡片回调（用户选择）
 */

const crypto = require('crypto');
const { config } = require('./config');
const larkClient = require('./lark-client');
const cursorRunner = require('./cursor-runner');

/**
 * 验证飞书请求签名
 */
function verifySignature(timestamp, nonce, body, signature) {
  if (!config.lark.encryptKey) {
    return true; // 未配置加密key，跳过验证
  }
  
  const content = timestamp + nonce + config.lark.encryptKey + JSON.stringify(body);
  const hash = crypto.createHash('sha256').update(content).digest('hex');
  return hash === signature;
}

/**
 * 解密事件数据
 */
function decryptEventData(encrypt) {
  if (!config.lark.encryptKey) {
    return null;
  }
  
  const key = crypto.createHash('sha256').update(config.lark.encryptKey).digest();
  const encryptBuffer = Buffer.from(encrypt, 'base64');
  const iv = encryptBuffer.slice(0, 16);
  const encryptedData = encryptBuffer.slice(16);
  
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedData);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  
  return JSON.parse(decrypted.toString('utf8'));
}

/**
 * 处理 URL 验证请求
 */
function handleUrlVerification(body) {
  return { challenge: body.challenge };
}

/**
 * 处理消息事件
 */
async function handleMessageEvent(event) {
  const message = event.message;
  const chatId = message.chat_id;
  const content = JSON.parse(message.content || '{}');
  const text = content.text || '';
  
  console.log(`收到消息: ${text} (chat: ${chatId})`);
  
  // 检查是否是需求链接
  const urlPattern = /(https?:\/\/[^\s]+)/g;
  const urls = text.match(urlPattern);
  
  if (urls && urls.length > 0) {
    const requirementUrl = urls[0];
    
    // 检查是否是飞书文档链接（需求文档）
    if (isRequirementUrl(requirementUrl)) {
      await handleRequirementUrl(chatId, requirementUrl);
    } else {
      await larkClient.sendTextMessage(
        chatId,
        '请发送有效的需求文档链接（飞书文档、Confluence等）'
      );
    }
  } else if (text.includes('测试') || text.includes('开始')) {
    await larkClient.sendTextMessage(
      chatId,
      '请发送需求文档的链接，我会自动开始测试流程。\n\n支持的链接类型：\n- 飞书文档\n- Confluence\n- 其他在线文档'
    );
  }
}

/**
 * 检查是否是有效的需求文档链接
 */
function isRequirementUrl(url) {
  const validPatterns = [
    /feishu\.cn/,
    /larksuite\.com/,
    /confluence/,
    /notion\.so/,
    /docs\.google\.com/,
    /yuque\.com/,
  ];
  
  return validPatterns.some(pattern => pattern.test(url));
}

/**
 * 处理需求文档链接
 */
async function handleRequirementUrl(chatId, requirementUrl) {
  // 发送确认消息
  await larkClient.sendInteractiveCard(
    chatId,
    '📋 收到需求文档',
    `已收到需求链接:\n${requirementUrl}\n\n是否开始执行测试流程？`,
    [
      { value: 'start', text: '✅ 开始测试' },
      { value: 'cancel', text: '❌ 取消' },
    ],
    'start_test'
  );
}

/**
 * 处理卡片回调
 */
async function handleCardAction(action) {
  const { value, open_chat_id: chatId } = action;
  const { key, value: selectedValue } = value || {};
  
  console.log(`卡片回调: key=${key}, value=${selectedValue}, chat=${chatId}`);
  
  switch (key) {
    case 'start_test':
      await handleStartTestAction(chatId, selectedValue);
      break;
      
    case 'user_choice':
      await handleUserChoiceAction(chatId, selectedValue);
      break;
      
    case 'review_choice':
      await handleReviewChoiceAction(chatId, selectedValue);
      break;
      
    default:
      console.log(`未知的回调类型: ${key}`);
  }
  
  return { toast: { type: 'success', content: '已处理' } };
}

/**
 * 处理开始测试动作
 */
async function handleStartTestAction(chatId, value) {
  if (value === 'cancel') {
    await larkClient.sendTextMessage(chatId, '已取消测试流程');
    return;
  }
  
  // 获取之前的会话（如果有）
  let session = cursorRunner.getSession(chatId);
  
  if (!session) {
    // 如果没有会话，可能是需要重新获取URL
    await larkClient.sendTextMessage(chatId, '请重新发送需求文档链接');
    return;
  }
  
  // 开始测试流程
  await larkClient.sendProgressCard(chatId, '初始化', 'running', '正在启动测试流程...');
  
  try {
    const result = await cursorRunner.runTestFlow(
      session,
      // 进度回调
      async (phase, status, details) => {
        await larkClient.sendProgressCard(chatId, phase, status, details);
      },
      // 选择回调
      async (question, options) => {
        await larkClient.sendInteractiveCard(
          chatId,
          '🤔 需要您的选择',
          question,
          options.map(opt => ({ value: opt.value, text: opt.text })),
          'user_choice'
        );
      }
    );
    
    if (result.status === 'completed') {
      // 测试完成，提取并记录Bug
      const bugs = cursorRunner.extractBugsFromResults(result.results);
      
      if (bugs.length > 0) {
        // 写入多维表格
        await larkClient.createBugRecords(bugs);
      }
      
      // 发送汇总卡片
      const baseUrl = config.bugTable.baseToken 
        ? `https://feishu.cn/base/${config.bugTable.baseToken}`
        : null;
      await larkClient.sendBugSummaryCard(chatId, bugs, baseUrl);
    }
    
  } catch (error) {
    console.error('测试流程执行失败:', error);
    await larkClient.sendTextMessage(chatId, `❌ 测试流程执行失败: ${error.message}`);
  }
}

/**
 * 处理用户选择动作
 */
async function handleUserChoiceAction(chatId, value) {
  const session = cursorRunner.getSession(chatId);
  
  if (!session || session.status !== 'waiting_choice') {
    await larkClient.sendTextMessage(chatId, '会话已过期，请重新发送需求链接');
    return;
  }
  
  await larkClient.sendTextMessage(chatId, `已收到您的选择: ${value}`);
  
  try {
    const result = await cursorRunner.continueTestFlow(
      session,
      value,
      async (phase, status, details) => {
        await larkClient.sendProgressCard(chatId, phase, status, details);
      }
    );
    
    if (result.status === 'waiting_choice') {
      // 还需要更多选择
      await larkClient.sendInteractiveCard(
        chatId,
        '🤔 需要您的选择',
        result.choice.question,
        result.choice.options.map(opt => ({ value: opt.value, text: opt.text })),
        'user_choice'
      );
    } else if (result.status === 'completed') {
      // 测试完成
      const bugs = cursorRunner.extractBugsFromResults(result);
      
      if (bugs.length > 0) {
        await larkClient.createBugRecords(bugs);
      }
      
      const baseUrl = config.bugTable.baseToken 
        ? `https://feishu.cn/base/${config.bugTable.baseToken}`
        : null;
      await larkClient.sendBugSummaryCard(chatId, bugs, baseUrl);
    }
    
  } catch (error) {
    console.error('继续测试流程失败:', error);
    await larkClient.sendTextMessage(chatId, `❌ 继续执行失败: ${error.message}`);
  }
}

/**
 * 处理测试用例核验选择
 */
async function handleReviewChoiceAction(chatId, value) {
  const session = cursorRunner.getSession(chatId);
  
  if (!session) {
    await larkClient.sendTextMessage(chatId, '会话已过期，请重新发送需求链接');
    return;
  }
  
  if (value === 'skip_review') {
    // 跳过核验，继续执行
    await larkClient.sendTextMessage(chatId, '已跳过核验，继续执行自动化流程...');
    // 继续执行...
  } else if (value === 'need_review') {
    // 等待用户核验
    await larkClient.sendTextMessage(
      chatId,
      '请打开测试用例文件进行核验修改，完成后点击"继续执行"按钮'
    );
    
    await larkClient.sendInteractiveCard(
      chatId,
      '📝 测试用例核验',
      '请修改完成后点击继续',
      [
        { value: 'continue', text: '✅ 继续执行' },
        { value: 'cancel', text: '❌ 取消测试' },
      ],
      'review_complete'
    );
  }
}

/**
 * 主事件处理入口
 */
async function handleEvent(body, headers) {
  // 验证签名
  const timestamp = headers['x-lark-request-timestamp'];
  const nonce = headers['x-lark-request-nonce'];
  const signature = headers['x-lark-signature'];
  
  if (signature && !verifySignature(timestamp, nonce, body, signature)) {
    throw new Error('签名验证失败');
  }
  
  // 处理加密数据
  let eventData = body;
  if (body.encrypt) {
    eventData = decryptEventData(body.encrypt);
  }
  
  // URL 验证
  if (eventData.type === 'url_verification') {
    return handleUrlVerification(eventData);
  }
  
  // 事件回调
  const schema = eventData.schema;
  const header = eventData.header;
  const event = eventData.event;
  
  if (!header || !event) {
    console.log('无效的事件数据');
    return { code: 0 };
  }
  
  const eventType = header.event_type;
  
  switch (eventType) {
    case 'im.message.receive_v1':
      await handleMessageEvent(event);
      break;
      
    case 'card.action.trigger':
      return await handleCardAction(event.action);
      
    default:
      console.log(`未处理的事件类型: ${eventType}`);
  }
  
  return { code: 0 };
}

module.exports = {
  handleEvent,
  handleCardAction,
  verifySignature,
};
