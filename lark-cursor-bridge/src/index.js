/**
 * 飞书-Cursor 桥接服务主入口
 * 
 * 功能：
 * 1. 监听飞书机器人消息（接收需求链接）
 * 2. 使用 Cursor SDK 执行测试流程
 * 3. 通过飞书卡片与用户交互
 * 4. 将Bug记录到飞书多维表格
 */

// 首先加载 .env 文件（必须在其他模块之前）
require('dotenv').config();

const express = require('express');
const { config, validateConfig } = require('./config');
const eventHandler = require('./event-handler');
const cursorRunner = require('./cursor-runner');

const app = express();

// 中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 请求日志
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    activeSessions: cursorRunner.activeSessions.size,
  });
});

// 飞书事件回调
app.post('/webhook/event', async (req, res) => {
  try {
    const result = await eventHandler.handleEvent(req.body, req.headers);
    res.json(result);
  } catch (error) {
    console.error('事件处理失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// 飞书卡片回调
app.post('/webhook/card', async (req, res) => {
  try {
    // 验证 token
    const token = req.body.token;
    if (config.lark.verificationToken && token !== config.lark.verificationToken) {
      return res.status(401).json({ error: '验证失败' });
    }
    
    const result = await eventHandler.handleCardAction(req.body.action);
    res.json(result);
  } catch (error) {
    console.error('卡片回调处理失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// 手动触发测试（用于调试）
app.post('/api/test', async (req, res) => {
  const { chatId, requirementUrl } = req.body;
  
  if (!chatId || !requirementUrl) {
    return res.status(400).json({ error: '缺少 chatId 或 requirementUrl' });
  }
  
  try {
    const session = cursorRunner.createSession(chatId, requirementUrl);
    res.json({ 
      success: true, 
      sessionId: session.id,
      message: '测试会话已创建',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 查询会话状态
app.get('/api/session/:id', (req, res) => {
  const session = cursorRunner.getSession(req.params.id);
  
  if (!session) {
    return res.status(404).json({ error: '会话不存在' });
  }
  
  res.json({
    id: session.id,
    status: session.status,
    currentPhase: session.currentPhase,
    startTime: session.startTime,
    error: session.error,
  });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ error: '内部服务器错误' });
});

// 启动服务
function start() {
  console.log('='.repeat(50));
  console.log('飞书-Cursor 桥接服务');
  console.log('='.repeat(50));
  
  // 验证配置
  if (!validateConfig()) {
    console.error('\n配置验证失败，请检查环境变量');
    process.exit(1);
  }
  
  const port = config.server.port;
  
  app.listen(port, () => {
    console.log(`\n✅ 服务已启动: http://localhost:${port}`);
    console.log(`\n📌 Webhook 地址配置指南:`);
    console.log(`   事件订阅: <公网URL>/webhook/event`);
    console.log(`   卡片回调: <公网URL>/webhook/card`);
    console.log(`\n💡 使用 ngrok 或 localtunnel 暴露本地服务:`);
    console.log(`   npx localtunnel --port ${port}`);
    console.log(`   或`);
    console.log(`   ngrok http ${port}`);
    console.log('\n');
  });
}

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到 SIGTERM 信号，正在关闭服务...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('收到 SIGINT 信号，正在关闭服务...');
  process.exit(0);
});

// 启动
start();

module.exports = { app };
