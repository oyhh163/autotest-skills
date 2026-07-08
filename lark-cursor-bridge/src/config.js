/**
 * 配置管理
 * 
 * 环境变量配置：
 * - LARK_APP_ID: 飞书应用 App ID
 * - LARK_APP_SECRET: 飞书应用 App Secret
 * - LARK_VERIFICATION_TOKEN: 飞书事件订阅验证 Token
 * - LARK_ENCRYPT_KEY: 飞书事件加密 Key（可选）
 * - CURSOR_API_KEY: Cursor API Key
 * - LARK_BASE_TOKEN: Bug记录的多维表格 Token
 * - LARK_TABLE_ID: Bug记录的数据表 ID
 * - PORT: 服务监听端口（默认3000）
 */

const config = {
  // 飞书配置
  lark: {
    appId: process.env.LARK_APP_ID,
    appSecret: process.env.LARK_APP_SECRET,
    verificationToken: process.env.LARK_VERIFICATION_TOKEN,
    encryptKey: process.env.LARK_ENCRYPT_KEY || '',
    // 租户域名，用于拼接云文档/文件的可访问链接
    tenantDomain: process.env.LARK_TENANT_DOMAIN || 'novabeyond.feishu.cn',
  },
  
  // Cursor SDK 配置
  cursor: {
    apiKey: process.env.CURSOR_API_KEY,
    model: process.env.CURSOR_MODEL || 'composer-2.5',
  },
  
  // Bug记录多维表格配置
  bugTable: {
    baseToken: process.env.LARK_BASE_TOKEN,
    tableId: process.env.LARK_TABLE_ID,
  },
  
  // 动态创建在线用例表的配置
  bitable: {
    // 可选：指定创建到的云空间文件夹 token（不填则创建到应用默认位置）
    folderToken: process.env.LARK_BITABLE_FOLDER_TOKEN || '',
  },
  
  // 服务配置
  server: {
    port: parseInt(process.env.PORT) || 3000,
  },
  
  // 测试系统配置
  testSystem: {
    skillPath: process.env.TEST_SKILL_PATH || 'c:\\Users\\oywor\\.agents\\skills\\test-system-flow',
    outputPath: process.env.TEST_OUTPUT_PATH || 'c:\\Users\\oywor\\.agents\\skills\\test-output',
  },
};

function validateConfig() {
  const required = [
    ['LARK_APP_ID', config.lark.appId],
    ['LARK_APP_SECRET', config.lark.appSecret],
    ['CURSOR_API_KEY', config.cursor.apiKey],
  ];
  
  const missing = required.filter(([name, value]) => !value);
  
  if (missing.length > 0) {
    console.error('缺少必要的环境变量:');
    missing.forEach(([name]) => console.error(`  - ${name}`));
    console.error('\n请在 .env 文件中配置或设置环境变量');
    return false;
  }
  
  return true;
}

module.exports = { config, validateConfig };
