/**
 * 使用 lark-cli 长连接模式监听消息
 * 
 * 这种方式不需要配置公网URL，直接通过 lark-cli 监听事件
 * 支持消息监听和卡片回调
 */

const { spawn } = require('child_process');
const readline = require('readline');
const larkClient = require('./lark-client');
const cursorRunner = require('./cursor-runner');

let messageListenerProcess = null;
let cardListenerProcess = null;

/**
 * 启动消息监听器
 */
function startMessageListener(onMessage) {
  console.log('正在启动飞书消息监听器...');
  
  messageListenerProcess = spawn('lark-cli', [
    'event', 'consume', 'im.message.receive_v1',
    '--as', 'bot'
  ], {
    shell: true,
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  const rl = readline.createInterface({
    input: messageListenerProcess.stdout,
    crlfDelay: Infinity
  });
  
  rl.on('line', async (line) => {
    try {
      if (!line.trim().startsWith('{')) return;
      const event = JSON.parse(line);
      await handleMessage(event, onMessage);
    } catch (error) {
      if (line.includes('ready')) {
        console.log('✅ 消息监听器已就绪');
      }
    }
  });
  
  messageListenerProcess.stderr.on('data', (data) => {
    const text = data.toString();
    if (text.includes('ready')) {
      console.log('✅ 消息监听器已就绪');
    } else if (text.includes('error') || text.includes('Error')) {
      console.error('消息监听器错误:', text);
    }
  });
  
  messageListenerProcess.on('close', (code) => {
    console.log(`消息监听器退出，代码: ${code}`);
    if (code !== 0) {
      console.log('5秒后重新启动消息监听...');
      setTimeout(() => startMessageListener(onMessage), 5000);
    }
  });
  
  return messageListenerProcess;
}

// 卡片回调是否可用（未订阅时禁用，避免无限重启）
let cardListenerDisabled = false;

/**
 * 启动卡片回调监听器
 */
function startCardListener() {
  if (cardListenerDisabled) {
    console.log('⚠️ 卡片回调事件未订阅，已禁用按钮点击回调（用户可回复编号选择）');
    return null;
  }
  
  console.log('正在启动卡片回调监听器...');
  
  cardListenerProcess = spawn('lark-cli', [
    'event', 'consume', 'card.action.trigger',
    '--as', 'bot'
  ], {
    shell: true,
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  const rl = readline.createInterface({
    input: cardListenerProcess.stdout,
    crlfDelay: Infinity
  });
  
  rl.on('line', async (line) => {
    try {
      if (!line.trim().startsWith('{')) return;
      const event = JSON.parse(line);
      await handleCardAction(event);
    } catch (error) {
      if (line.includes('ready')) {
        console.log('✅ 卡片回调监听器已就绪');
      }
    }
  });
  
  cardListenerProcess.stderr.on('data', (data) => {
    const text = data.toString();
    if (text.includes('ready')) {
      console.log('✅ 卡片回调监听器已就绪');
    } else if (text.includes('not subscribed') || text.includes('failed_precondition')) {
      // 事件未订阅，禁用卡片监听避免无限重启
      cardListenerDisabled = true;
      console.warn('⚠️ card.action.trigger 未在开放平台订阅，已禁用卡片点击回调');
      console.warn('   → 用户可通过回复选项编号完成选择');
    } else if (text.includes('error') || text.includes('Error')) {
      console.error('卡片监听器错误:', text);
    }
  });
  
  cardListenerProcess.on('close', (code) => {
    console.log(`卡片监听器退出，代码: ${code}`);
    // 仅在非订阅错误且未禁用时重启
    if (code !== 0 && !cardListenerDisabled) {
      console.log('5秒后重新启动卡片监听...');
      setTimeout(() => startCardListener(), 5000);
    }
  });
  
  return cardListenerProcess;
}

/**
 * 启动所有监听器
 */
function startListener(onMessage) {
  startMessageListener(onMessage);
  startCardListener();
}

/**
 * 处理卡片回调（用户点击选项）
 */
async function handleCardAction(event) {
  try {
    // lark-cli 输出的卡片事件为扁平结构：
    // { type, chat_id, action_tag, action_value: "<JSON字符串>", ... }
    const evt = event.event || event;
    
    // 解析按钮的 value（action_value 是 JSON 字符串）
    let value = {};
    const rawValue = evt.action_value || evt.action?.value;
    if (rawValue) {
      if (typeof rawValue === 'string') {
        try { value = JSON.parse(rawValue); } catch { value = { raw: rawValue }; }
      } else {
        value = rawValue;
      }
    }
    
    // chatId：优先顶层 chat_id
    const chatId = evt.chat_id
      || value.chat_id
      || evt.context?.open_chat_id
      || evt.open_chat_id;
    
    console.log(`🔘 卡片回调解析: chatId=${chatId}, value=`, value);
    
    if (!chatId) {
      console.warn('⚠️ 无法从卡片回调中获取 chatId，跳过处理');
      return;
    }
    
    // 停止按钮
    if (value.action === 'stop') {
      const stopped = cursorRunner.stopSession(chatId);
      larkClient.clearProgressCardId(chatId);
      await larkClient.sendTextMessage(
        chatId,
        stopped 
          ? '🛑 已停止当前测试流程。\n如需重新开始，请发送正确的需求文档链接。'
          : '当前没有正在执行的测试流程。'
      );
      return;
    }
    
    // 获取选择的值
    const selectedValue = value.selected || value.value || value.text;
    
    if (!selectedValue) {
      console.warn('⚠️ 卡片回调中没有可用的选择值');
      return;
    }
    
    // 将选择传递给 cursor-runner
    const resolved = cursorRunner.resolveUserChoice(chatId, selectedValue);
    
    if (resolved) {
      console.log(`✅ 用户选择已传递: ${selectedValue}`);
      await larkClient.sendTextMessage(chatId, `✅ 已收到选择：${selectedValue}`);
    } else {
      console.log(`⚠️ 未找到等待选择的会话: ${chatId}`);
    }
    
  } catch (error) {
    console.error('处理卡片回调失败:', error);
  }
}

/**
 * 处理收到的消息
 */
async function handleMessage(event, onMessage) {
  try {
    const message = event.message || event;
    const chatId = message.chat_id;
    const messageType = message.message_type;
    const messageId = message.message_id;
    
    // 解析消息内容
    let content;
    try {
      content = JSON.parse(message.content || '{}');
    } catch {
      content = { text: message.content };
    }
    
    // 图片消息：下载并作为需求截图分析
    if (messageType === 'image') {
      const imageKey = content.image_key;
      console.log(`收到图片消息: image_key=${imageKey} (chat: ${chatId})`);
      if (imageKey && messageId) {
        await handleRequirementImage(chatId, messageId, imageKey);
      }
      return;
    }
    
    // 富文本消息：尽量提取纯文本
    let text = '';
    if (messageType === 'text') {
      text = (content.text || '').trim();
    } else if (messageType === 'post') {
      text = extractPostText(content).trim();
    } else {
      // 其他类型暂不处理
      return;
    }
    
    console.log(`收到消息: ${text} (chat: ${chatId})`);
    
    // 调用回调
    if (onMessage) {
      await onMessage({
        chatId,
        text,
        messageType,
        rawEvent: event
      });
    }
    
    // 最高优先级：停止命令
    if (isStopCommand(text)) {
      const stopped = cursorRunner.stopSession(chatId);
      larkClient.clearProgressCardId(chatId);
      if (stopped) {
        await larkClient.sendTextMessage(
          chatId,
          '🛑 已停止当前测试流程。\n如需重新开始，请发送正确的需求文档链接。'
        );
      } else {
        await larkClient.sendTextMessage(chatId, '当前没有正在执行的测试流程。');
      }
      return;
    }
    
    // 优先处理：当前会话正在等待用户输入
    const session = cursorRunner.getSession(chatId);
    if (session && session.status === 'waiting_choice' && session.pendingChoice) {
      const pending = session.pendingChoice;
      
      // 特殊：等待自由文本输入（如 Figma 链接）
      if (pending.type === 'figma_url' || (pending.options || []).length === 0) {
        cursorRunner.resolveUserChoice(chatId, text);
        return;
      }
      
      const options = pending.options;
      const num = parseInt(text, 10);
      let chosen = null;
      
      if (!isNaN(num) && num >= 1 && num <= options.length) {
        chosen = options[num - 1].value;
      } else {
        // 尝试文本匹配
        const matched = options.find(o => 
          o.text === text || o.value === text || o.text.includes(text)
        );
        if (matched) chosen = matched.value;
      }
      
      if (chosen) {
        const resolved = cursorRunner.resolveUserChoice(chatId, chosen);
        if (resolved) {
          await larkClient.sendTextMessage(chatId, `✅ 已收到选择：${chosen}`);
          return;
        }
      } else {
        await larkClient.sendTextMessage(
          chatId,
          `请回复有效的选项编号（1-${options.length}）`
        );
        return;
      }
    }
    
    // 空消息忽略
    if (!text) return;
    
    // 命令词：显示帮助
    if (isHelpCommand(text)) {
      await larkClient.sendTextMessage(
        chatId,
        '👋 你好！我是测试助手。\n\n你可以通过以下任意方式开始测试：\n\n1️⃣ 发送需求文档链接（飞书文档/Confluence/Notion等）\n2️⃣ 直接粘贴需求内容文字\n3️⃣ 发送需求截图（我会分析图片内容）\n\n随时发送"停止"可中止流程。'
      );
      return;
    }
    
    // 检查是否包含需求链接
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    const urls = text.match(urlPattern);
    
    if (urls && urls.length > 0 && isRequirementUrl(urls[0])) {
      await handleRequirement(chatId, { type: 'url', content: urls[0] });
      return;
    }
    
    // 否则：只要是有实质内容的文本，就当作需求内容启动流程
    if (isLikelyRequirement(text)) {
      await handleRequirement(chatId, { type: 'text', content: text });
      return;
    }
    
    // 兜底：内容太短，给出提示
    await larkClient.sendTextMessage(
      chatId,
      '请发送需求文档链接、需求内容文字或需求截图开始测试。\n发送"帮助"查看使用方式。'
    );
    
  } catch (error) {
    console.error('处理消息失败:', error);
  }
}

/**
 * 提取富文本(post)消息中的纯文本
 */
function extractPostText(content) {
  try {
    const post = content.post || content;
    let result = '';
    // post 结构: { zh_cn: { title, content: [[{tag,text}...]] } }
    for (const lang of Object.keys(post)) {
      const block = post[lang];
      if (block.title) result += block.title + '\n';
      const rows = block.content || [];
      for (const row of rows) {
        for (const seg of row) {
          if (seg.text) result += seg.text;
          if (seg.tag === 'a' && seg.href) result += seg.href;
        }
        result += '\n';
      }
    }
    return result;
  } catch {
    return '';
  }
}

/**
 * 是否为帮助/问候类命令
 */
function isHelpCommand(text) {
  const t = text.trim().toLowerCase();
  const cmds = ['帮助', 'help', '你好', 'hi', 'hello', '开始', '执行测试', '测试', '开始测试'];
  return cmds.includes(t);
}

/**
 * 判断文本是否像一段需求内容（而非闲聊）
 * 规则：有一定长度，或包含多行/编号/需求关键词
 */
function isLikelyRequirement(text) {
  if (text.length >= 15) return true;
  if (/\n/.test(text)) return true;
  const kw = ['功能', '需求', '页面', '按钮', '登录', '搜索', '点击', '输入', '展示', '跳转', '流程'];
  return kw.some(k => text.includes(k));
}

/**
 * 检查是否是停止命令
 */
function isStopCommand(text) {
  const t = (text || '').trim().toLowerCase();
  const stopWords = ['停止', '取消', '结束', '终止', '中止', 'stop', 'cancel', 'abort'];
  return stopWords.some(w => t === w || t === `/${w}`);
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
 * 通用的"提问并等待选择"辅助函数
 * 会设置会话状态（供编号回复兜底），发送交互卡片，等待用户选择
 */
async function askChoice(session, { type, title, question, options }) {
  const chatId = session.chatId;
  
  // 设置等待状态，供编号回复兜底使用
  session.status = 'waiting_choice';
  session.pendingChoice = { type, question, options };
  
  await larkClient.sendInteractiveCard(chatId, title, question, options, 'user_choice');
  
  const choice = await cursorRunner.waitForUserChoice(chatId);
  
  session.pendingChoice = null;
  session.status = 'running';
  
  return choice;
}

/**
 * 通用的"提问并等待自由文本输入"辅助函数
 * 用于收集 URL、账号、包名等无法用固定选项表达的信息
 * allowSkip 为 true 时，用户回复"跳过/无/skip"会返回空串
 */
async function askText(session, { type, title, question, allowSkip = true }) {
  const chatId = session.chatId;
  const tip = allowSkip ? '\n（如不适用，可回复"跳过"）' : '';
  await larkClient.sendTextMessage(chatId, `${title}\n${question}${tip}`);
  
  session.status = 'waiting_choice';
  session.pendingChoice = { type, question, options: [] };
  const answer = (await cursorRunner.waitForUserChoice(chatId)) || '';
  session.pendingChoice = null;
  session.status = 'running';
  
  const t = answer.trim().toLowerCase();
  if (allowSkip && ['跳过', '无', '没有', 'skip', 'none', '不需要'].includes(t)) {
    return '';
  }
  return answer.trim();
}

/**
 * 预检问答：在启动 Cursor 之前，先确定平台、Figma 等关键信息
 * 这样交互卡片会在流程最开始出现，选项固定且干净
 */
async function runPreflight(session) {
  const chatId = session.chatId;
  
  // Q1: 目标平台（固定3个选项）
  const platform = await askChoice(session, {
    type: 'platform',
    title: '📱 选择目标平台',
    question: '请选择本次测试的目标平台',
    options: [
      { value: 'Web', text: 'Web 网页端' },
      { value: 'iOS', text: 'iOS 移动端' },
      { value: 'Android', text: 'Android 移动端' },
    ],
  });
  session.platform = platform;
  await larkClient.sendTextMessage(chatId, `✅ 目标平台：${platform}`);
  
  // Q2: 是否有 Figma 设计图
  const figma = await askChoice(session, {
    type: 'figma',
    title: '🎨 Figma 设计图',
    question: '是否提供 Figma 设计图用于文案校验？',
    options: [
      { value: '有', text: '有设计图' },
      { value: '无', text: '无设计图' },
    ],
  });
  session.hasFigma = (figma === '有');
  
  if (session.hasFigma) {
    await larkClient.sendTextMessage(chatId, '📎 请在下一条消息中发送 Figma 链接');
    // 等待用户发送 figma 链接（复用选择等待机制，任意文本都会被当作链接）
    session.status = 'waiting_choice';
    session.pendingChoice = { type: 'figma_url', question: '请发送Figma链接', options: [] };
    const figmaUrl = await cursorRunner.waitForUserChoice(chatId);
    session.figmaUrl = figmaUrl;
    session.pendingChoice = null;
    session.status = 'running';
    await larkClient.sendTextMessage(chatId, `✅ 已记录 Figma 链接`);
  }
  
  // Q3: 是否需要人工核验测试用例（决定流程是否在生成用例后暂停）
  const review = await askChoice(session, {
    type: 'review',
    title: '📝 测试用例核验',
    question: '生成测试用例后，是否需要人工核验（可修改后再继续自动化）？',
    options: [
      { value: '需要', text: '需要核验' },
      { value: '不需要', text: '不需要，直接继续' },
    ],
  });
  session.needReview = (review === '需要');
  await larkClient.sendTextMessage(
    chatId,
    session.needReview
      ? '✅ 将在生成测试用例后暂停，等待你核验'
      : '✅ 将连续执行完整流程'
  );
  
  // Q4: 自动化执行前置问答（对应 SKILL 阶段6）
  await runAutomationPreflight(session);
}

/**
 * 自动化前置问答（对应 SKILL 阶段6：UI自动化准备和执行）
 * 先确认是否现在执行自动化；如执行，按平台收集所需信息
 */
async function runAutomationPreflight(session) {
  const chatId = session.chatId;
  const automation = {};
  
  // 是否现在执行自动化
  const mode = await askChoice(session, {
    type: 'automation',
    title: '🤖 自动化执行方式',
    question: '生成用例后是否立即执行 UI 自动化？',
    options: [
      { value: 'execute', text: '立即执行自动化' },
      { value: 'prepare', text: '仅生成自动化脚本（不执行）' },
    ],
  });
  automation.mode = mode;
  
  if (mode === 'prepare') {
    session.automation = automation;
    await larkClient.sendTextMessage(chatId, '✅ 将仅生成自动化脚本，不执行');
    return;
  }
  
  if (session.platform === 'Web') {
    // Web URL
    automation.webUrl = await askText(session, {
      type: 'web_url',
      title: '🌐 被测网址',
      question: '请发送本次自动化的 Web URL（如 https://example.com）',
      allowSkip: false,
    });
    
    // 登录方式
    const login = await askChoice(session, {
      type: 'login',
      title: '🔑 登录方式',
      question: '被测页面是否需要登录？',
      options: [
        { value: 'none', text: '无需登录' },
        { value: 'account', text: '账号密码登录' },
      ],
    });
    automation.loginMode = login;
    if (login === 'account') {
      automation.account = await askText(session, {
        type: 'account',
        title: '👤 测试账号',
        question: '请发送测试账号信息（格式：账号 / 密码）',
        allowSkip: false,
      });
    }
    
    // 目标浏览器
    automation.browser = await askChoice(session, {
      type: 'browser',
      title: '🧭 目标浏览器',
      question: '请选择运行自动化的浏览器',
      options: [
        { value: 'msedge', text: 'Edge' },
        { value: 'chromium', text: 'Chromium' },
        { value: 'firefox', text: 'Firefox' },
        { value: 'webkit', text: 'WebKit (Safari内核)' },
      ],
    });
    
    // 网络 / API mock
    const mock = await askChoice(session, {
      type: 'mock',
      title: '🔌 网络 / API',
      question: '是否允许对网络请求 / API 进行 mock？',
      options: [
        { value: 'real', text: '走真实接口' },
        { value: 'mock', text: '允许 mock' },
      ],
    });
    automation.mock = mock;
    
  } else {
    // iOS / Android
    automation.appId = await askText(session, {
      type: 'app_id',
      title: '📦 应用标识',
      question: session.platform === 'iOS'
        ? '请发送应用的 Bundle ID（如 com.example.app）'
        : '请发送应用的包名（如 com.example.app）',
      allowSkip: false,
    });
    
    automation.deviceType = await askChoice(session, {
      type: 'device',
      title: '📱 设备类型',
      question: '使用真机还是模拟器执行？',
      options: [
        { value: 'simulator', text: '模拟器 / 仿真器' },
        { value: 'real', text: '真机' },
      ],
    });
    
    automation.installPath = await askText(session, {
      type: 'install_path',
      title: '💾 安装包路径',
      question: session.platform === 'iOS'
        ? '如需安装应用，请发送 .app/.ipa 路径（可跳过）'
        : '如需安装应用，请发送 .apk 路径（可跳过）',
      allowSkip: true,
    });
    
    automation.account = await askText(session, {
      type: 'account',
      title: '👤 登录/测试账号',
      question: '如需登录，请发送测试账号信息（可跳过）',
      allowSkip: true,
    });
  }
  
  session.automation = automation;
  await larkClient.sendTextMessage(chatId, '✅ 自动化配置已记录，开始执行流程');
}

/**
 * 统一处理需求输入（链接 / 文本 / 图片）
 * @param {string} chatId
 * @param {{type:'url'|'text'|'image', content:string, imagePath?:string}} requirement
 */
async function handleRequirement(chatId, requirement) {
  try {
    // 已有进行中的会话时，避免重复启动
    const existing = cursorRunner.getSession(chatId);
    if (existing && ['running', 'waiting_choice'].includes(existing.status)) {
      await larkClient.sendTextMessage(
        chatId,
        '⚠️ 已有正在进行的测试流程。如需重新开始，请先发送"停止"。'
      );
      return;
    }
    
    // 创建测试会话
    const session = cursorRunner.createSession(chatId, requirement.content);
    session.requirementType = requirement.type;
    session.requirementImagePath = requirement.imagePath || null;
    
    // 确认消息
    const typeLabel = {
      url: '需求文档链接',
      text: '需求内容',
      image: '需求截图',
    }[requirement.type] || '需求';
    
    const preview = requirement.type === 'text'
      ? `\n${requirement.content.slice(0, 100)}${requirement.content.length > 100 ? '...' : ''}`
      : (requirement.type === 'url' ? `\n${requirement.content}` : '');
    
    await larkClient.sendTextMessage(
      chatId,
      `📋 收到${typeLabel}${preview}\n\n请先确认几个信息，然后开始测试 👇`
    );
    
    // 异步执行：先预检问答，再启动测试流程
    (async () => {
      try {
        await runPreflight(session);
        await runTestFlowWithCallbacks(session);
      } catch (error) {
        if (error.name === 'AbortError' || session.status === 'cancelled') {
          console.log('流程已被用户停止');
          return;
        }
        console.error('测试流程执行失败:', error);
        await larkClient.sendTextMessage(chatId, `❌ 流程中断: ${error.message}`);
      }
    })();
    
  } catch (error) {
    console.error('处理需求失败:', error);
    await larkClient.sendTextMessage(chatId, `❌ 处理失败: ${error.message}`);
  }
}

/**
 * 处理需求截图：下载图片并作为需求启动流程
 */
async function handleRequirementImage(chatId, messageId, imageKey) {
  try {
    await larkClient.sendTextMessage(chatId, '🖼️ 正在下载并分析需求截图...');
    
    const imagePath = await larkClient.downloadMessageImage(messageId, imageKey);
    if (!imagePath) {
      await larkClient.sendTextMessage(chatId, '❌ 图片下载失败，请重试或改用文字/链接。');
      return;
    }
    
    await handleRequirement(chatId, {
      type: 'image',
      content: `需求截图: ${imagePath}`,
      imagePath,
    });
    
  } catch (error) {
    console.error('处理需求截图失败:', error);
    await larkClient.sendTextMessage(chatId, `❌ 处理截图失败: ${error.message}`);
  }
}

/**
 * 执行测试流程并处理所有回调
 */
async function runTestFlowWithCallbacks(session) {
  const chatId = session.chatId;
  const { config } = require('./config');
  
  // 清除旧的进度卡片ID
  larkClient.clearProgressCardId(chatId);
  
  try {
    const result = await cursorRunner.runTestFlow(session, {
      // 进度回调 - 更新进度卡片
      onProgress: async (progress) => {
        console.log(`[进度] ${progress.currentPhase}:`, progress.phaseDetails[progress.currentPhase] || '');
        
        // 计算标题颜色
        const hasError = Object.values(progress.phaseStatus).includes('error');
        const allDone = Object.values(progress.phaseStatus).every(s => s === 'done');
        const headerColor = hasError ? 'red' : (allDone ? 'green' : 'blue');
        
        await larkClient.sendOrUpdateProgressCard(chatId, {
          ...progress,
          headerColor,
          title: allDone ? '🎉 测试流程完成' : '📊 测试流程进度',
        });
      },
      
      // 选择回调 - 发送交互卡片
      onChoice: async (interaction) => {
        console.log(`[选择] 类型=${interaction.type}, 问题=${interaction.question}`);
        
        const titleMap = {
          platform: '📱 选择目标平台',
          figma: '🎨 Figma 设计图',
          automation: '🤖 自动化测试',
          review: '📝 测试用例核验',
        };
        
        const title = titleMap[interaction.type] || '🤔 需要您的选择';
        
        await larkClient.sendInteractiveCard(
          chatId,
          title,
          interaction.question,
          interaction.options,
          'user_choice'
        );
      },
      
      // 核验暂停回调
      onReviewPause: async () => {
        console.log('[核验] 等待用户核验测试用例');
        await larkClient.sendInteractiveCard(
          chatId,
          '📝 请核验测试用例',
          '测试用例已生成并导出（Excel / XMind）。\n请打开本地文件核验，如需修改可直接编辑文件。\n\n核验完成后点击下方按钮或回复"继续"，将开始自动化。',
          [{ value: '继续', text: '✅ 核验完成，继续自动化' }],
          'user_choice'
        );
      },
      
      // 完成回调
      onComplete: async (results) => {
        console.log('[完成] 测试流程结束');
        
        // 提取并记录Bug
        const bugs = cursorRunner.extractBugsFromResults(results || {});
        
        if (bugs.length > 0) {
          await larkClient.createBugRecords(bugs);
        }
        
        // 发送Bug汇总卡片
        const baseUrl = config.bugTable.baseToken 
          ? `https://novabeyond.feishu.cn/base/${config.bugTable.baseToken}`
          : null;
        await larkClient.sendBugSummaryCard(chatId, bugs, baseUrl);
        
        // 发送产物链接
        if (results?.outputDir) {
          await larkClient.sendTextMessage(
            chatId,
            `📁 **测试产物已生成**\n\n路径: ${results.outputDir}\n\n包含:\n• 测试用例 Excel\n• 测试脑图 XMind\n• 自动化报告（如有执行）`
          );
        }
      },
      
      // 错误回调
      onError: async (error) => {
        console.error('[错误]', error);
        await larkClient.sendTextMessage(chatId, `❌ 测试流程执行失败:\n${error.message}`);
      },
    });
    
    if (result.status === 'error') {
      await larkClient.sendTextMessage(chatId, `❌ 测试流程异常:\n${result.error || '未知错误'}`);
    }
    
  } catch (error) {
    console.error('测试流程异常:', error);
    await larkClient.sendTextMessage(chatId, `❌ 测试流程异常:\n${error.message}`);
  }
}

/**
 * 停止所有监听器
 */
function stopListener() {
  if (messageListenerProcess) {
    messageListenerProcess.kill();
    messageListenerProcess = null;
    console.log('消息监听器已停止');
  }
  if (cardListenerProcess) {
    cardListenerProcess.kill();
    cardListenerProcess = null;
    console.log('卡片监听器已停止');
  }
}

module.exports = {
  startListener,
  startMessageListener,
  startCardListener,
  stopListener,
  handleMessage,
  handleCardAction,
};
