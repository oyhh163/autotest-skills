# 飞书-Cursor 桥接服务

将飞书智能体与 Cursor 测试流程无缝集成，实现：
- 在飞书对话框发送需求链接，自动触发测试流程
- 测试过程中需要选择时，通过飞书卡片交互
- 自动化执行在本地机器运行
- Bug 自动记录到飞书多维表格

## 架构图

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  飞书用户   │────▶│  飞书机器人   │────▶│  本地桥接服务    │
│  (发需求链接) │◀────│  (消息+卡片)  │◀────│  (Webhook接收)   │
└─────────────┘     └──────────────┘     └────────┬────────┘
                                                   │
                                                   ▼
                                          ┌─────────────────┐
                                          │   Cursor SDK    │
                                          │  (执行测试流程)  │
                                          └────────┬────────┘
                                                   │
                    ┌──────────────────────────────┼──────────────────────────────┐
                    │                              │                              │
                    ▼                              ▼                              ▼
           ┌───────────────┐             ┌───────────────┐             ┌───────────────┐
           │  测试用例生成  │             │   UI自动化    │             │   Bug记录     │
           │ (Excel/XMind) │             │  (Playwright) │             │ (多维表格)    │
           └───────────────┘             └───────────────┘             └───────────────┘
```

## 快速开始

### 1. 创建飞书应用

1. 访问 [飞书开放平台](https://open.feishu.cn/app) 创建应用
2. 添加机器人能力
3. 配置权限：
   - `im:message` - 发送消息
   - `im:message:receive` - 接收消息
   - `bitable:app` - 多维表格操作（如需Bug记录）
4. 配置事件订阅（Webhook地址配置后再设置）

### 2. 安装依赖

```bash
cd lark-cursor-bridge
npm install
```

### 3. 配置环境变量

复制 `.env.example` 为 `.env` 并填写配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入：
- 飞书应用的 App ID 和 App Secret
- Cursor API Key
- 多维表格配置（可选）

### 4. 启动服务

```bash
npm start
```

### 5. 暴露本地服务

使用 localtunnel 或 ngrok 将本地服务暴露到公网：

```bash
# 使用 localtunnel
npm run tunnel

# 或使用 ngrok
ngrok http 3000
```

### 6. 配置飞书 Webhook

1. 获取公网 URL（如 `https://xxx.loca.lt`）
2. 在飞书开放平台配置：
   - 事件订阅 URL: `https://xxx.loca.lt/webhook/event`
   - 卡片请求 URL: `https://xxx.loca.lt/webhook/card`
3. 订阅事件：
   - `im.message.receive_v1` - 接收消息
   - `card.action.trigger` - 卡片交互

### 7. 发布应用

1. 在飞书开放平台提交审核
2. 审核通过后发布应用
3. 将机器人添加到群聊或私聊

## 使用方式

1. **发送需求链接**：在与机器人的对话中发送需求文档链接
2. **确认开始**：点击卡片上的"开始测试"按钮
3. **交互选择**：测试过程中如需选择，会收到选择卡片
4. **查看结果**：测试完成后收到Bug汇总卡片

支持的需求文档类型：
- 飞书文档 (feishu.cn / larksuite.com)
- Confluence
- Notion
- Google Docs
- 语雀

## 配置 Bug 记录表格

1. 创建一个多维表格
2. 添加以下字段：
   - 标题（文本）
   - 描述（文本）
   - 严重程度（单选：P0/P1/P2/P3）
   - 状态（单选：待处理/处理中/已解决）
   - 发现时间（日期）
   - 测试用例（文本）
   - 复现步骤（文本）
   - 预期结果（文本）
   - 实际结果（文本）
3. 获取表格的 base_token 和 table_id
4. 配置到 `.env` 文件

## API 接口

### 健康检查
```
GET /health
```

### 手动触发测试（调试用）
```
POST /api/test
Content-Type: application/json

{
  "chatId": "oc_xxxxx",
  "requirementUrl": "https://xxx.feishu.cn/docx/xxx"
}
```

### 查询会话状态
```
GET /api/session/:sessionId
```

## 目录结构

```
lark-cursor-bridge/
├── package.json
├── .env.example
├── README.md
└── src/
    ├── index.js          # 主入口，Express服务
    ├── config.js         # 配置管理
    ├── lark-client.js    # 飞书API封装
    ├── cursor-runner.js  # Cursor SDK集成
    └── event-handler.js  # 事件处理逻辑
```

## 常见问题

### Q: 收不到飞书消息？
A: 检查：
1. Webhook URL 是否正确配置
2. 事件是否已订阅
3. 应用是否已发布
4. 机器人是否在对话中

### Q: Cursor 执行失败？
A: 检查：
1. CURSOR_API_KEY 是否正确
2. 本地是否有 Cursor 环境
3. test-system-flow skill 是否存在

### Q: Bug 没有记录到表格？
A: 检查：
1. LARK_BASE_TOKEN 和 LARK_TABLE_ID 是否配置
2. 应用是否有 bitable 权限
3. 表格字段是否匹配

## 扩展开发

### 添加新的文档类型支持

在 `event-handler.js` 的 `isRequirementUrl` 函数中添加新的 URL 模式。

### 自定义 Bug 字段

修改 `lark-client.js` 中的 `createBugRecord` 函数，调整字段映射。

### 集成其他测试工具

修改 `cursor-runner.js` 中的测试提示词和结果解析逻辑。
