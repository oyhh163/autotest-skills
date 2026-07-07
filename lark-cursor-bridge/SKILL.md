---
name: lark-cursor-bridge
version: 1.0.0
description: "飞书-Cursor测试流程桥接服务：在飞书对话框发送需求链接，自动触发Cursor执行测试流程，通过交互卡片与用户交互，将Bug记录到多维表格。当用户需要集成飞书智能体与测试流程、实现需求到测试的自动化闭环时使用。"
---

# 飞书-Cursor 桥接服务

将飞书智能体与 Cursor 测试流程无缝集成。

## 何时使用

- 用户想在飞书中发送需求链接自动触发测试
- 用户需要测试过程中通过飞书交互选择
- 用户想将测试发现的Bug自动记录到飞书多维表格
- 用户需要在本地机器执行自动化测试

## 核心功能

1. **消息监听**：监听飞书群聊/私聊中的需求链接
2. **交互卡片**：测试过程中需要选择时，发送卡片供用户点选
3. **Cursor集成**：使用Cursor SDK执行test-system-flow测试流程
4. **Bug记录**：自动将发现的Bug写入飞书多维表格

## 架构

```
飞书用户 ──▶ 飞书机器人 ──▶ 本地桥接服务 ──▶ Cursor SDK
   ▲              │                              │
   │              │                              ▼
   └──────────────┴─────────────────────── 测试结果/Bug记录
```

## 快速启动

### 1. 配置环境变量

```bash
cd lark-cursor-bridge
cp .env.example .env
# 编辑 .env 填入配置
```

### 2. 安装依赖并启动

```bash
npm install
npm start
```

### 3. 暴露本地服务

```bash
npm run tunnel  # 使用 localtunnel
# 或
ngrok http 3000  # 使用 ngrok
```

### 4. 配置飞书Webhook

将公网URL配置到飞书应用的事件订阅中。

## 配置项

| 环境变量 | 必需 | 说明 |
|---------|------|------|
| LARK_APP_ID | ✅ | 飞书应用ID |
| LARK_APP_SECRET | ✅ | 飞书应用密钥 |
| CURSOR_API_KEY | ✅ | Cursor API密钥 |
| LARK_VERIFICATION_TOKEN | ⚪ | 事件验证Token |
| LARK_BASE_TOKEN | ⚪ | Bug表格Token |
| LARK_TABLE_ID | ⚪ | Bug表格数据表ID |

## 工作流程

1. 用户在飞书发送需求文档链接
2. 机器人发送确认卡片
3. 用户点击"开始测试"
4. Cursor执行测试流程
5. 需要选择时发送交互卡片
6. 用户点选后继续执行
7. 完成后发送Bug汇总
8. Bug写入多维表格

## 依赖

- `@cursor/sdk` - Cursor SDK
- `@larksuite/node-sdk` - 飞书SDK
- `express` - HTTP服务
- `localtunnel` - 内网穿透（开发用）

## 相关Skill

- `test-system-flow` - 测试流程执行
- `lark-im` - 飞书消息操作
- `lark-base` - 飞书多维表格操作
