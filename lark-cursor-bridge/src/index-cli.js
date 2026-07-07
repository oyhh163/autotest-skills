/**
 * 飞书-Cursor 桥接服务 - CLI模式
 * 
 * 使用 lark-cli 长连接模式监听消息，不需要配置公网URL
 */

// 首先加载 .env 文件
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { config, validateConfig } = require('./config');
const larkListener = require('./lark-listener');

console.log('='.repeat(50));
console.log('飞书-Cursor 桥接服务 (CLI模式)');
console.log('='.repeat(50));

// === 单实例保护：防止重复启动导致消息被多个实例处理 ===
const lockFile = path.join(__dirname, '..', '.service.lock');

function checkSingleInstance() {
  if (fs.existsSync(lockFile)) {
    try {
      const oldPid = parseInt(fs.readFileSync(lockFile, 'utf8').trim(), 10);
      // 检查旧进程是否还存活
      if (oldPid && isProcessAlive(oldPid)) {
        console.error(`\n❌ 服务已在运行中 (PID: ${oldPid})`);
        console.error('   如需重启，请先停止旧实例，或删除锁文件:');
        console.error(`   ${lockFile}`);
        process.exit(1);
      }
    } catch (e) {
      // 锁文件损坏，忽略
    }
  }
  // 写入当前进程PID
  fs.writeFileSync(lockFile, String(process.pid), 'utf8');
}

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0); // 信号0仅检测存活
    return true;
  } catch (e) {
    return e.code === 'EPERM'; // EPERM表示进程存在但无权限
  }
}

function releaseLock() {
  try {
    if (fs.existsSync(lockFile)) {
      fs.unlinkSync(lockFile);
    }
  } catch (e) {
    // 忽略
  }
}

checkSingleInstance();

// 验证配置（CLI模式不需要验证所有配置）
const requiredEnvs = ['LARK_APP_ID', 'LARK_APP_SECRET'];
const missing = requiredEnvs.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.error('\n缺少必要的环境变量:');
  missing.forEach(key => console.error(`  - ${key}`));
  console.error('\n请确保 lark-cli 已正确配置');
  process.exit(1);
}

console.log('\n📌 运行模式: lark-cli 长连接');
console.log('📌 不需要配置公网URL');
console.log('\n正在启动消息监听...\n');

// 启动监听器
larkListener.startListener((message) => {
  console.log(`[${new Date().toISOString()}] 收到消息:`, message.text?.substring(0, 50));
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('\n收到 SIGTERM 信号，正在关闭...');
  larkListener.stopListener();
  releaseLock();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n收到 SIGINT 信号，正在关闭...');
  larkListener.stopListener();
  releaseLock();
  process.exit(0);
});

process.on('exit', releaseLock);

console.log('💡 提示: 按 Ctrl+C 停止服务\n');
