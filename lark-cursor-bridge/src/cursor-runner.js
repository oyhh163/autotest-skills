/**
 * Cursor SDK 集成模块
 * 
 * 支持与飞书的双向交互，简化为6个阶段
 */

const { Agent } = require('@cursor/sdk');
const { config } = require('./config');
const path = require('path');
const fs = require('fs');

/**
 * 测试会话管理
 */
const activeSessions = new Map();

/**
 * 等待用户选择的 Promise 解析器
 */
const pendingChoiceResolvers = new Map();

/**
 * 6阶段定义
 */
const PHASE_KEYS = ['init', 'analyze', 'testcase', 'autocase', 'execute', 'feedback'];

/**
 * 创建测试会话
 */
function createSession(chatId, requirementUrl) {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const session = {
    id: sessionId,
    chatId,
    requirementUrl,
    status: 'pending',
    // 目标阶段：full=完整流程；analyze/testcase/autocase=单模块，跑到该阶段即结束
    targetPhase: 'full',
    // 进度跟踪
    progress: {
      currentPhase: 'init',
      phaseStatus: {
        init: 'pending',
        analyze: 'pending',
        testcase: 'pending',
        autocase: 'pending',
        execute: 'pending',
        feedback: 'pending',
      },
      phaseDetails: {},
    },
    pendingChoice: null,
    agent: null,
    agentId: null,
    startTime: Date.now(),
    results: {},
    outputDir: null,
  };
  activeSessions.set(sessionId, session);
  activeSessions.set(chatId, session);
  return session;
}

/**
 * 获取会话
 */
function getSession(sessionIdOrChatId) {
  return activeSessions.get(sessionIdOrChatId);
}

/**
 * 更新会话状态
 */
function updateSession(sessionId, updates) {
  const session = activeSessions.get(sessionId);
  if (session) {
    Object.assign(session, updates);
  }
  return session;
}

/**
 * 更新阶段进度
 */
function updatePhaseProgress(session, phaseKey, status, detail) {
  if (!session.progress) return;
  
  session.progress.currentPhase = phaseKey;
  session.progress.phaseStatus[phaseKey] = status;
  if (detail !== undefined) {
    session.progress.phaseDetails[phaseKey] = detail;
  }
  
  // 将之前的阶段标记为完成
  const currentIndex = PHASE_KEYS.indexOf(phaseKey);
  PHASE_KEYS.forEach((key, index) => {
    if (index < currentIndex && session.progress.phaseStatus[key] !== 'error') {
      session.progress.phaseStatus[key] = 'done';
    }
  });
}

/**
 * 用户主动停止流程时抛出的错误
 */
class AbortError extends Error {
  constructor(message = '用户已停止测试流程') {
    super(message);
    this.name = 'AbortError';
  }
}

/**
 * 处理用户在飞书中的选择
 */
function resolveUserChoice(chatId, choice) {
  const resolver = pendingChoiceResolvers.get(chatId);
  if (resolver) {
    resolver.resolve(choice);
    pendingChoiceResolvers.delete(chatId);
    return true;
  }
  return false;
}

/**
 * 清理会话的「等待用户选择」状态（超时/中断后必须调用，避免僵尸 waiting_choice）
 */
function clearWaitingChoice(chatId, nextStatus = 'error') {
  const session = activeSessions.get(chatId);
  if (!session) return;
  session.pendingChoice = null;
  if (['waiting_choice', 'running', 'pending'].includes(session.status)) {
    session.status = nextStatus;
  }
}

/**
 * 当前会话是否仍在真正等待用户选择（有未完成的 Promise）
 */
function hasPendingChoice(chatId) {
  return pendingChoiceResolvers.has(chatId);
}

/**
 * 等待用户选择
 */
function waitForUserChoice(chatId, timeoutMs = 300000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingChoiceResolvers.delete(chatId);
      // 超时后立刻清掉 waiting 状态，否则后续新需求会被当成选项编号
      clearWaitingChoice(chatId, 'error');
      reject(new Error('等待用户选择超时'));
    }, timeoutMs);
    
    pendingChoiceResolvers.set(chatId, {
      resolve: (choice) => {
        clearTimeout(timer);
        resolve(choice);
      },
      reject: (err) => {
        clearTimeout(timer);
        reject(err);
      },
    });
  });
}

/**
 * 停止指定会话的测试流程
 * @returns {boolean} 是否成功停止（存在可停止的活跃会话）
 */
function stopSession(chatId) {
  const session = activeSessions.get(chatId);
  if (!session) return false;
  if (session.status === 'completed' || session.status === 'cancelled') return false;
  
  session.aborted = true;
  session.status = 'cancelled';
  session.pendingChoice = null;
  
  // 如果正在等待用户选择，用中止错误结束等待
  const resolver = pendingChoiceResolvers.get(chatId);
  if (resolver) {
    resolver.reject(new AbortError());
    pendingChoiceResolvers.delete(chatId);
  }
  
  // 释放 Cursor Agent
  if (session.agent) {
    try {
      session.agent[Symbol.asyncDispose]?.();
    } catch (e) {
      console.error('停止时清理Agent失败:', e);
    }
  }
  
  return true;
}

/**
 * 执行测试流程
 */
async function runTestFlow(session, callbacks) {
  const { onProgress, onChoice, onComplete, onError } = callbacks;
  
  const outputDir = path.join(
    config.testSystem.outputPath,
    `${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${session.id}`
  );
  session.outputDir = outputDir;
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  try {
    // === 阶段1: 初始化 ===
    updatePhaseProgress(session, 'init', 'running', '启动中...');
    await onProgress(session.progress);
    
    const agent = await Agent.create({
      apiKey: config.cursor.apiKey,
      model: { id: config.cursor.model },
      local: { cwd: config.testSystem.skillPath },
    });
    
    session.agent = agent;
    session.agentId = agent.agentId;
    session.status = 'running';
    
    updatePhaseProgress(session, 'init', 'done', '已就绪');
    await onProgress(session.progress);
    
    // 构建初始提示词（带上预检答案：平台、Figma）
    const prompt = buildTestPrompt(session, outputDir);
    
    // 开始对话
    await processAgentConversation(session, prompt, callbacks);
    
  } catch (error) {
    // 用户主动停止：不作为错误处理
    if (error.name === 'AbortError' || session.aborted) {
      session.status = 'cancelled';
    } else {
      session.status = 'error';
      session.error = error.message;
      updatePhaseProgress(session, session.progress.currentPhase, 'error', error.message);
      await onError?.(error);
    }
  } finally {
    if (session.agent) {
      try {
        await session.agent[Symbol.asyncDispose]?.();
      } catch (e) {
        console.error('清理Agent失败:', e);
      }
    }
  }
  
  return {
    status: session.status,
    sessionId: session.id,
    results: session.results,
    progress: session.progress,
  };
}

/**
 * 处理Agent对话
 */
async function processAgentConversation(session, initialPrompt, callbacks) {
  const { onProgress, onChoice, onComplete, onReviewPause } = callbacks;
  let currentPrompt = initialPrompt;
  
  while (session.status === 'running') {
    // 中止检查
    if (session.aborted) throw new AbortError();
    
    const run = await session.agent.send(currentPrompt);
    let fullResponse = '';
    
    for await (const event of run.stream()) {
      // 流式处理中随时响应中止
      if (session.aborted) throw new AbortError();
      
      if (event.type === 'assistant') {
        for (const block of event.message.content) {
          if (block.type === 'text') {
            fullResponse += block.text;
            
            // 实时检测阶段变化和进度
            const phaseUpdate = detectPhaseAndProgress(fullResponse);
            if (phaseUpdate) {
              const { phase, detail } = phaseUpdate;
              if (phase !== session.progress.currentPhase || 
                  detail !== session.progress.phaseDetails[phase]) {
                updatePhaseProgress(session, phase, 'running', detail);
                await onProgress(session.progress);
              }
            }
          }
        }
      }
    }
    
    await run.wait();
    
    // 中止检查
    if (session.aborted) throw new AbortError();
    
    // 核验暂停点：生成测试用例后等待用户核验
    if (session.needReview && !session.reviewed && /\[待核验\]/.test(fullResponse)) {
      session.reviewed = true;
      // 标记测试用例阶段完成
      updatePhaseProgress(session, 'testcase', 'done', '已生成，待核验');
      await onProgress(session.progress);
      
      // 通知用户核验
      await onReviewPause?.();
      
      // 等待用户确认继续（任意回复/点击均可）
      session.status = 'waiting_choice';
      session.pendingChoice = { type: 'review_continue', question: '核验完成后回复继续', options: [] };
      await waitForUserChoice(session.chatId);
      session.status = 'running';
      session.pendingChoice = null;
      
      // 目标阶段为 testcase：核验后即结束，不再继续自动化
      const target = session.targetPhase || 'full';
      if (target === 'testcase') {
        updatePhaseProgress(session, 'testcase', 'done', '核验完成');
        session.status = 'completed';
        session.results = { outputDir: session.outputDir, response: fullResponse };
        await onProgress(session.progress);
        await onComplete?.(session.results);
        break;
      }

      // 继续后续阶段（根据目标阶段与自动化模式决定做到哪一步）
      let execHint;
      if (target === 'autocase') {
        execHint = '筛选并生成自动化脚本【不要执行】([阶段:autocase])';
      } else if (session.automation?.mode === 'prepare') {
        execHint = '仅生成自动化脚本【不要执行】([阶段:autocase])';
      } else {
        execHint = '筛选自动化用例([阶段:autocase])、执行自动化([阶段:execute])、汇总Bug([阶段:feedback])';
      }
      currentPrompt = `用户已完成测试用例核验（可能已修改本地 Excel/XMind 文件）。请重新读取最新的测试用例文件，然后继续执行：${execHint}，完成后输出 [完成]。`;
      continue;
    }
    
    // 检测是否需要用户交互
    const interaction = detectInteraction(fullResponse);
    if (interaction) {
      // 发送选择卡片
      await onChoice(interaction);
      
      // 等待用户选择
      session.status = 'waiting_choice';
      session.pendingChoice = interaction;
      
      const userChoice = await waitForUserChoice(session.chatId);
      
      session.status = 'running';
      session.pendingChoice = null;
      currentPrompt = formatUserChoice(interaction.type, userChoice);
      
      continue;
    }
    
    // 检测是否完成
    if (detectCompletion(fullResponse)) {
      // 单模块模式：以目标阶段作为完成标记；进度条视为完成
      const donePhase = (session.targetPhase && session.targetPhase !== 'full') ? session.targetPhase : 'feedback';
      PHASE_KEYS.forEach((k) => { session.progress.phaseStatus[k] = 'done'; });
      session.progress.currentPhase = donePhase;
      session.progress.phaseDetails[donePhase] = '已完成';
      session.status = 'completed';
      session.results = {
        outputDir: session.outputDir,
        response: fullResponse,
      };
      await onProgress(session.progress);
      await onComplete?.(session.results);
      break;
    }
    
    // 没有更多输出，结束循环
    break;
  }
}

/**
 * 构建测试提示词（包含预检答案）
 */
function buildTestPrompt(session, outputDir) {
  // 平台仅服务于自动化阶段；分析/用例阶段不设默认端，交由 Cursor 从需求推断
  const platform = session.platform || null;
  const figmaInfo = session.hasFigma 
    ? `有 Figma 设计图，链接: ${session.figmaUrl || '(用户将提供)'}`
    : '无 Figma 设计图';
  
  // 根据需求类型构建需求描述
  const reqType = session.requirementType || 'url';
  let requirementSection;
  if (reqType === 'image') {
    const extra = session.requirementExtraText
      ? `\n用户补充说明: ${session.requirementExtraText}`
      : '';
    requirementSection = `需求来源: 需求截图\n截图路径: ${session.requirementImagePath}${extra}\n请先用读取图片的方式打开并识别该截图（本地文件路径，可直接读取），从图中提取完整需求内容，再进行测试设计。`;
  } else if (reqType === 'text') {
    requirementSection = `需求来源: 用户直接输入的需求内容\n需求内容:\n${session.requirementUrl}`;
  } else {
    requirementSection = `需求链接: ${session.requirementUrl}`;
  }
  
  // 执行范围：单模块模式下跑到目标阶段即收尾（默认 full 走完整流程）
  const target = (session.targetPhase && session.targetPhase !== 'full') ? session.targetPhase : 'feedback';
  const isSingleModule = target !== 'feedback';
  const reviewSection = buildScopeSection(target, session);

  // 平台说明：有明确平台（自动化阶段）才注入；否则让 Cursor 自行判断端
  const platformLine = platform
    ? `目标平台: ${platform}（已确定，无需再次询问）`
    : '目标端: 未指定。请根据需求内容判断适用端(Web/iOS/Android)用于用例设计；无法判断则按通用方式处理。本阶段不涉及自动化，不要就平台向用户提问。';

  // 自动化配置：仅在已收集自动化配置（自动化相关阶段）时才注入
  const automationSection = session.automation
    ? buildAutomationSection(session, platform)
    : '';

  // 开头语：单模块模式明确"只执行到某阶段"
  const openingMap = {
    analyze: '请【只执行需求分析】这一个阶段，不要进行任何后续阶段。需求如下：',
    testcase: '请对以下需求执行到【生成并导出测试用例】为止（含需求分析），完成后停止，不要进行自动化：',
    autocase: '请对以下需求执行到【生成自动化脚本（不执行）】为止，完成后停止：',
    feedback: '请执行完整测试体系流程，对以下需求进行测试：',
  };
  const opening = openingMap[target] || openingMap.feedback;

  // 阶段格式示例：只列出到目标阶段
  const order = ['analyze', 'testcase', 'autocase', 'execute', 'feedback'];
  const phaseExamples = {
    analyze: '[阶段:analyze] 正在分析需求文档',
    testcase: '[阶段:testcase] 生成测试用例 3/10',
    autocase: '[阶段:autocase] 筛选自动化用例 5/20',
    execute: '[阶段:execute] 执行自动化 通过 8/10',
    feedback: '[阶段:feedback] 汇总Bug',
  };
  const targetIdx = order.indexOf(target);
  const exampleLines = order.slice(0, targetIdx + 1).map((k) => phaseExamples[k]).join('\n');

  // 单模块强约束
  const strictLimit = isSingleModule
    ? `\n\n【严格约束】本次只能执行到 [阶段:${target}] 为止。完成该阶段后立即输出一行 [完成] 并停止，禁止执行其之后的任何阶段（不要生成/执行你未被要求的内容）。`
    : '';

  // 核验提示仅在需要核验且目标≥用例时有意义
  const reviewFormatHint = (session.needReview && targetIdx >= 1)
    ? '\n\n需要人工核验时，生成并导出测试用例后输出：\n[待核验] 测试用例已生成，等待核验'
    : '';

  const confirmedInfo = [
    `输出目录: ${outputDir}`,
    platformLine,
    `Figma: ${figmaInfo}（已确定，无需再次询问）`,
  ]
    .concat(automationSection ? [automationSection] : [])
    .join('\n');

  return `${opening}

${requirementSection}
${confirmedInfo}

【重要】Figma、是否核验、自动化配置等均已由用户确认，请勿再向用户询问；若未指定平台，请自行从需求判断，也不要就平台提问。
${reviewSection}${strictLimit}

执行时请严格遵循以下格式输出，以便进度同步（每个标记单独占一行）：

进入新阶段时输出：
${exampleLines}${reviewFormatHint}

完成时输出：
[完成] 测试流程结束

请开始执行。`;
}

/**
 * 构建"执行范围"说明：控制流程跑到哪个阶段结束
 * - analyze  : 只做需求分析
 * - testcase : 到生成并导出测试用例
 * - autocase : 到生成自动化脚本（不执行）
 * - feedback : 完整流程（默认）
 */
function buildScopeSection(target, session) {
  if (target === 'analyze') {
    return '\n【执行范围：仅需求分析】只完成需求分析阶段：解析需求并生成 requirements-analysis.md。完成后立即输出一行 [完成]，不要生成测试用例、不要做自动化、不要执行。';
  }

  if (target === 'testcase') {
    if (session.needReview) {
      return '\n【执行范围：到生成测试用例】完成需求分析→生成测试用例→导出 Excel 和 XMind。导出后输出一行 [待核验] 并【停止】，等待用户核验（不要进行自动化）。';
    }
    return '\n【执行范围：到生成测试用例】完成需求分析→生成测试用例→导出 Excel 和 XMind 后，立即输出一行 [完成]，不要进行自动化筛选与执行。';
  }

  if (target === 'autocase') {
    if (session.needReview) {
      return '\n【执行范围：到生成自动化脚本】先完成需求分析→生成测试用例→导出后输出 [待核验] 并停止等待核验；核验通过后再筛选并生成自动化脚本（不要执行），最后输出 [完成]。';
    }
    return '\n【执行范围：到生成自动化脚本】完成需求分析→生成测试用例→导出→筛选并生成自动化脚本（不要执行）。完成后输出一行 [完成]。';
  }

  // feedback / full：保持原完整流程行为
  return session.needReview
    ? '\n【用户已选择：需要人工核验测试用例】\n请先只执行到"生成测试用例"阶段：完成需求分析、生成测试用例、导出 Excel 和 XMind 后，输出一行 [待核验] 并【立即停止】，不要继续筛选自动化和执行自动化。等待用户核验确认后会再收到继续指令。'
    : '\n【用户已选择：无需人工核验】请连续执行完整流程直到结束。';
}

/**
 * 构建自动化配置说明（对应 SKILL 阶段6，信息由飞书预检收集）
 */
function buildAutomationSection(session, platform) {
  const a = session.automation;
  if (!a) return '自动化: 未配置（如需执行请按默认准备脚本，不主动执行）';
  
  // 断言规范（必须严格遵守）
  const assertionRules = `
【断言规范 - 必须严格遵守】
生成自动化脚本时，必须按以下六类场景编写【精准断言】，禁止只用 toBeVisible()：

1. P0核心场景：必须断言业务结果（如 toHaveURL、toHaveText、元素状态）
2. 文案校验：必须用 toHaveText(预期文案) 或 toContainText，预期值来自 Figma/需求文档
3. 跳转校验：
   - 有明确URL → expect(page).toHaveURL('xxx')
   - 无明确URL → expect(目标页面元素).toBeVisible() + toHaveText(标题)
4. 按钮状态校验：必须用 toBeDisabled() 或 toBeEnabled()，不能只检查可见性
5. 数据校验：必须断言计算/展示值 === 预期值，如 toHaveText('¥100.00')
6. 异常提示校验：必须断言 错误元素.toBeVisible() + toHaveText(预期错误文案)

【禁止以下弱断言】：
- 只写 await expect(element).toBeVisible() 就结束
- 用 console.log('通过') 代替真实断言
- 断言注释掉或留空
- 断言与测试用例预期结果不对应

【严格断言 - 禁止 fallback 兜底】：
- 禁止用 if (可见) {断言A} else {断言B} 这种 fallback 逻辑绕过失败
- 每条用例只针对需求描述的【那一个预期结果】做断言；预期的元素/文案没出现就应当真实失败
- 例："空输入点击搜索展示下拉框"→ 必须断言下拉框出现，不能因为下拉框没出现就退而检查热搜项让用例通过
- 不要用 .catch(() => false)、try/catch 吞掉断言错误
- 不要为了让用例通过而放宽断言条件

【截图要求】：
- playwright.config.js 中设置 screenshot: 'on'，让每个用例（含通过）都保存截图，便于用户查看执行过程
- 关键操作步骤后可调用 page.screenshot() 手动补充截图

【断言来源】：
- 预期值必须来自：需求文档、Figma 设计稿、测试用例的"预期结果"字段
- 生成脚本前先从 test-cases.xlsx 读取每条用例的预期结果，作为断言依据

【执行次数 - 必须严格遵守】：
- 整套自动化只允许完整执行 1 次（npx playwright test / 等价命令只调用一次）
- 生成脚本时尽量写对；可用断言质量静态检查，但不要用「先跑再改」代替
- 执行一次后：解析报告 → 失败记 Bug → 进入汇总，立即收尾
- 禁止：失败后改脚本/放宽断言再跑、修绿循环直到全通
- playwright.config 中 retries 保持 0，不要为修绿开启重试
- 例外：仅命令未真正启动（配置路径错误、依赖未装导致立刻退出）时可修环境后再启动一次；业务断言失败不算例外`;

  if (a.mode === 'prepare') {
    return `自动化: 仅生成自动化脚本，【不要执行】自动化。生成脚本后即进入 Bug 汇总阶段。
${assertionRules}`;
  }
  
  const lines = ['自动化: 生成后【立即执行】UI自动化（整套只跑 1 次）。以下配置已由用户确认，勿再询问：'];
  if (platform === 'Web') {
    lines.push(`- 被测URL: ${a.webUrl || '(未提供)'}`);
    lines.push(`- 登录方式: ${a.loginMode === 'account' ? `账号密码登录，账号信息: ${a.account || '(未提供)'}` : '无需登录'}`);
    lines.push(`- 目标浏览器: ${a.browser || 'msedge'}`);
    lines.push(`- 网络/API: ${a.mock === 'mock' ? '允许 mock' : '走真实接口'}`);
    lines.push('请使用公共模块 Playwright 模板，按上述配置生成并【只运行一次】自动化脚本；失败记 Bug，禁止修绿重跑。');
  } else {
    lines.push(`- 平台: ${platform}`);
    lines.push(`- 应用标识(包名/BundleID): ${a.appId || '(未提供)'}`);
    lines.push(`- 设备类型: ${a.deviceType === 'real' ? '真机' : '模拟器'}`);
    if (a.installPath) lines.push(`- 安装包路径: ${a.installPath}`);
    if (a.account) lines.push(`- 登录账号: ${a.account}`);
    lines.push('请使用 Appium 生成并（在环境支持时）【只运行一次】自动化脚本；失败记 Bug，禁止修绿重跑；环境不支持时生成就绪脚本并说明缺少什么。');
  }
  lines.push(assertionRules);
  return lines.join('\n');
}

/**
 * 检测阶段和进度
 */
function detectPhaseAndProgress(text) {
  // 匹配格式: [阶段:key] detail
  const phaseMatch = text.match(/\[阶段:(\w+)\]\s*(.+?)(?:\n|$)/g);
  if (phaseMatch && phaseMatch.length > 0) {
    const lastMatch = phaseMatch[phaseMatch.length - 1];
    const [, phase, detail] = lastMatch.match(/\[阶段:(\w+)\]\s*(.+?)(?:\n|$)/) || [];
    if (phase && PHASE_KEYS.includes(phase)) {
      return { phase, detail: detail?.trim() };
    }
  }
  
  // 兼容旧格式关键词检测
  const keywordMap = {
    '分析需求': 'analyze',
    '需求分析': 'analyze',
    '解析需求': 'analyze',
    '生成测试用例': 'testcase',
    '测试用例': 'testcase',
    '筛选自动化': 'autocase',
    '自动化用例': 'autocase',
    '执行自动化': 'execute',
    '运行测试': 'execute',
    'Playwright': 'execute',
    'Bug汇总': 'feedback',
    '缺陷汇总': 'feedback',
    '问题汇总': 'feedback',
  };
  
  for (const [keyword, phase] of Object.entries(keywordMap)) {
    if (text.includes(keyword)) {
      // 尝试提取进度数字
      const progressMatch = text.match(/(\d+)\s*[\/]\s*(\d+)/);
      const detail = progressMatch ? `${progressMatch[1]}/${progressMatch[2]}` : undefined;
      return { phase, detail };
    }
  }
  
  return null;
}

/**
 * 检测用户交互需求
 * 
 * 仅识别显式的 [选择:type] 标记，逐行解析，过滤掉 markdown 表格分隔符、
 * 代码引用等非选项内容，避免把无关行当作选项。
 * 平台/Figma 已在预检阶段处理，这里不做模糊关键词匹配。
 */
function detectInteraction(text) {
  const lines = text.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const markerMatch = lines[i].match(/\[选择:(\w+)\]/);
    if (!markerMatch) continue;
    
    const type = markerMatch[1];
    let question = '';
    const options = [];
    let startedOptions = false;
    
    // 标记行内可能直接带问题
    const inlineQuestion = lines[i].replace(/.*\[选择:\w+\]\s*/, '').trim();
    if (inlineQuestion) question = inlineQuestion;
    
    // 向后扫描收集问题和选项
    for (let j = i + 1; j < lines.length; j++) {
      const line = lines[j].trim();
      
      // 问题行
      const qMatch = line.match(/^问题[:：]\s*(.+)/);
      if (qMatch) {
        question = qMatch[1].trim();
        continue;
      }
      
      // 选项行：以 "- " 开头
      const oMatch = line.match(/^-\s+(.+)/);
      if (oMatch) {
        const optText = oMatch[1].trim();
        // 过滤垃圾：markdown表格分隔符、纯符号、代码引用等
        const isJunk = /^[-|:\s]+$/.test(optText)   // 如 -----|-----|
          || optText.includes('`')                   // 代码引用 如 Excel: `x.xlsx`
          || optText.length > 40;                     // 过长，多半不是选项
        if (!isJunk) {
          options.push({ value: optText, text: optText });
          startedOptions = true;
        }
        continue;
      }
      
      // 已经开始收集选项后遇到非选项行 -> 结束
      if (startedOptions) break;
      // 还没开始且是空行 -> 继续找
      if (line === '') continue;
      // 还没开始且遇到普通文本，且已有问题 -> 结束（避免跨段落误抓）
      if (question && line.length > 0) break;
    }
    
    if (options.length > 0) {
      return { type, question: question || '请选择', options };
    }
  }
  
  return null;
}

/**
 * 格式化用户选择为提示词
 */
function formatUserChoice(type, choice) {
  const typeLabels = {
    platform: '目标平台',
    figma: 'Figma设计图',
    automation: '自动化执行',
    review: '用例核验',
  };
  
  return `用户选择了${typeLabels[type] || ''}：${choice}\n\n请继续执行。`;
}

/**
 * 检测流程完成
 */
function detectCompletion(text) {
  return text.includes('[完成]') || 
         text.includes('测试流程已完成') ||
         text.includes('全部完成') ||
         text.includes('执行完毕');
}

/**
 * 提取Bug（从 defects.json 和 Playwright JSON 报告）
 */
function extractBugsFromResults(results, session = {}) {
  const bugs = [];
  
  if (!results.outputDir) {
    return bugs;
  }
  
  // 1. 尝试读取 Cursor 生成的 defects.json
  const defectFile = path.join(results.outputDir, 'defects.json');
  if (fs.existsSync(defectFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(defectFile, 'utf8'));
      bugs.push(...data);
      console.log(`[Bug提取] 从 defects.json 读取到 ${data.length} 个缺陷`);
    } catch (e) {
      console.error('解析缺陷文件失败:', e);
    }
  }
  
  // 2. 解析 Playwright JSON 报告，提取失败用例作为 Bug
  const playwrightReportPaths = [
    path.join(results.outputDir, 'reports', 'results.json'),
    path.join(results.outputDir, 'test-results.json'),
    path.join(results.outputDir, 'playwright-report', 'results.json'),
  ];
  
  for (const reportPath of playwrightReportPaths) {
    if (fs.existsSync(reportPath)) {
      try {
        const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
        const failedTests = extractFailedTestsFromReport(report);
        
        if (failedTests.length > 0) {
          console.log(`[Bug提取] 从 Playwright 报告读取到 ${failedTests.length} 个失败用例`);
          
          // 转换为 Bug 格式，避免重复（按标题去重）
          const existingTitles = new Set(bugs.map(b => b.title));
          
          for (const test of failedTests) {
            const bugTitle = `[自动化失败] ${test.title}`;
            if (!existingTitles.has(bugTitle)) {
              bugs.push({
                id: `BUG-AUTO-${Date.now()}-${bugs.length + 1}`,
                title: bugTitle,
                source: '自动化测试',
                caseId: test.id || test.title,
                severity: 'P1',
                status: '待处理',
                description: formatBugDescription(test),
                platform: session.platform || 'Web',
                browser: session.automation?.browser || '未知',
                url: session.automation?.webUrl || '',
                createdAt: new Date().toISOString(),
              });
              existingTitles.add(bugTitle);
            }
          }
        }
        break; // 找到一个报告就停止
      } catch (e) {
        console.error(`解析 Playwright 报告失败 (${reportPath}):`, e.message);
      }
    }
  }
  
  console.log(`[Bug提取] 共提取 ${bugs.length} 个缺陷`);
  return bugs;
}

/**
 * 从 Playwright 报告中提取失败的测试
 */
function extractFailedTestsFromReport(report) {
  const failed = [];
  
  function traverseSuites(suites) {
    for (const suite of suites || []) {
      // 处理 specs
      for (const spec of suite.specs || []) {
        for (const test of spec.tests || []) {
          if (test.status === 'unexpected' || test.status === 'failed') {
            const lastResult = (test.results || []).slice(-1)[0] || {};
            failed.push({
              id: spec.id || spec.title,
              title: spec.title,
              fullTitle: `${suite.title} > ${spec.title}`,
              status: test.status,
              duration: lastResult.duration || 0,
              error: lastResult.error || null,
              retries: (test.results || []).length - 1,
            });
          }
        }
      }
      // 递归处理子套件
      if (suite.suites) {
        traverseSuites(suite.suites);
      }
    }
  }
  
  traverseSuites(report.suites);
  return failed;
}

/**
 * 格式化 Bug 描述
 */
function formatBugDescription(test) {
  let desc = `**测试用例**: ${test.fullTitle || test.title}\n\n`;
  
  if (test.error) {
    desc += `**错误信息**:\n\`\`\`\n${test.error.message || '未知错误'}\n\`\`\`\n\n`;
    if (test.error.stack) {
      // 只取堆栈的前几行
      const stackLines = test.error.stack.split('\n').slice(0, 5).join('\n');
      desc += `**堆栈**:\n\`\`\`\n${stackLines}\n\`\`\`\n\n`;
    }
  }
  
  if (test.retries > 0) {
    desc += `**重试次数**: ${test.retries}\n`;
  }
  
  desc += `**执行时长**: ${test.duration || 0}ms`;
  
  return desc;
}

module.exports = {
  createSession,
  getSession,
  updateSession,
  resolveUserChoice,
  waitForUserChoice,
  clearWaitingChoice,
  hasPendingChoice,
  stopSession,
  runTestFlow,
  extractBugsFromResults,
  activeSessions,
  PHASE_KEYS,
  AbortError,
};
