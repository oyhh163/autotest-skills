# FoodPilot V2.8.17 UI自动化

## 范围
- 来源用例：AUTO-001 ~ AUTO-008
- 目标端：iOS App
- 框架：Appium + WebDriverIO

## 所需输入
- Bundle ID：`com.calorietrack.ten.jyw`
- UDID：`00008120-0011698C0EFBC01E`
- 平台：iOS 真机
- 测试账号：游客模式
- 环境：生产环境

## 环境要求
1. Node.js 18+
2. Appium 2.x
3. Xcode 15+（Mac设备）
4. iOS真机已信任开发者证书

## 安装依赖
```bash
npm install
```

## 启动Appium服务
```bash
# 安装Appium（如未安装）
npm install -g appium
appium driver install xcuitest

# 启动Appium服务
appium --port 4723
```

## 运行测试
```bash
# 运行所有测试
npm test

# 运行单个测试
npm test -- --spec cases/ob-flow.spec.js
```

## 测试用例清单

| ID | 场景 | 文件 |
|----|------|------|
| AUTO-001 | 实验组22进入OB验证 | ob-flow.spec.js |
| AUTO-002 | 完整OB流程到订阅页 | ob-flow.spec.js |
| AUTO-003 | 欢迎页减重文案验证 | ob-flow.spec.js |
| AUTO-004 | OB流程无评分弹窗 | ob-flow.spec.js |
| AUTO-005 | 审核态挽留隐藏 | review-mode.spec.js |
| AUTO-006 | 目标选择-外表改变 | goal-selection.spec.js |
| AUTO-007 | 目标选择-自我感觉 | goal-selection.spec.js |
| AUTO-008 | 目标选择-健康改善 | goal-selection.spec.js |

## 已知阻塞点
1. **Remote Config配置**：需要后台权限配置AICal_old_test=22
2. **用户判定逻辑**：游客模式是否能被判定为"非当日用户"待确认
3. **元素标识符**：部分元素的accessibility ID需要开发提供

## 注意事项
- 测试前请确保App已安装在真机上
- 首次运行需要在真机上信任自动化证书
- 测试过程中不要操作真机屏幕
