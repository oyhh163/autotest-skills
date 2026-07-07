# FoodPilot V2.8.17 P0自动化用例摘要

## 执行环境要求

**重要提示**：iOS UI自动化需要以下环境才能执行：

| 要求 | 说明 |
|------|------|
| 操作系统 | macOS（不支持Windows） |
| 开发工具 | Xcode 15+ |
| 运行时 | Node.js 18+ |
| 自动化框架 | Appium 2.x + XCUITest Driver |
| 设备 | iOS真机（UDID: 00008120-0011698C0EFBC01E） |
| App | FoodPilot (Bundle ID: com.calorietrack.ten.jyw) |

**当前环境**：Windows 10 - ❌ 无法执行iOS自动化

## 自动化用例清单

### AUTO-001: 实验组22进入OB验证
- **来源用例**: SMK-002, DET-001
- **目标端**: iOS
- **前置条件**: 
  - 非当日用户
  - AICal_old_test=22
- **自动化步骤**:
  1. 启动App
  2. 等待页面加载（3秒）
  3. 验证欢迎页标题出现
- **断言**: 欢迎页"Welcome back"文案可见
- **状态**: ⏳ 待执行（需Mac环境）

---

### AUTO-002: 完整OB流程到订阅页
- **来源用例**: SMK-003
- **目标端**: iOS
- **前置条件**: AICal_old_test=22
- **自动化步骤**:
  1. 启动App进入OB
  2. 页面1-2：点击Continue
  3. 页面3：选择第一个目标选项
  4. 页面4：选择第一个子选项
  5. 页面5-8：点击Continue/选择选项
  6. 页面9：完成三个阻断（MealPlan/Fasting/Hydration）
  7. 页面10：点击Continue
  8. 验证订阅页展示
- **断言**: 订阅页"3 days free"文案可见
- **预计耗时**: 60-90秒
- **状态**: ⏳ 待执行（需Mac环境）

---

### AUTO-003: 欢迎页减重文案验证
- **来源用例**: SMK-004, DET-006
- **目标端**: iOS
- **前置条件**: 
  - AICal_old_test=22
  - 无历史目标数据（游客模式）
- **自动化步骤**:
  1. 启动App
  2. 等待欢迎页加载
  3. 获取页面文案
- **断言**: 标题包含"weight loss plan"
- **状态**: ⏳ 待执行（需Mac环境）

---

### AUTO-004: OB流程无评分弹窗
- **来源用例**: SMK-008
- **目标端**: iOS
- **前置条件**: AICal_old_test=22
- **自动化步骤**:
  1. 完整走完OB流程（11个页面）
  2. 每个页面检查是否出现评分弹窗元素
- **断言**: 整个流程中"Rate us"弹窗不出现
- **状态**: ⏳ 待执行（需Mac环境）

---

### AUTO-005: 审核态挽留隐藏
- **来源用例**: SMK-009, DET-026
- **目标端**: iOS
- **前置条件**: AColdControlStr=0
- **自动化步骤**:
  1. 配置审核态参数
  2. 进入订阅页
  3. 点击关闭按钮
  4. 检查挽留弹窗
- **断言**: 挽留弹窗"Are you sure"/"Don't miss out"不出现
- **阻塞问题**: 需要后台配置Remote Config
- **状态**: ⏳ 待执行（需Mac环境 + Remote Config权限）

---

### AUTO-006: 目标选择-外表改变
- **来源用例**: DET-007
- **目标端**: iOS
- **前置条件**: 进入OB流程页面3
- **自动化步骤**:
  1. 导航到目标选择页
  2. 选择"I want to change how I look"
  3. 进入页面4
  4. 验证4个子选项
- **断言**: 展示以下选项：
  - Looking better in my clothes
  - Changing my body measurements
  - Being more attractive
  - Being more satisfied with how I look
- **状态**: ⏳ 待执行（需Mac环境）

---

### AUTO-007: 目标选择-自我感觉
- **来源用例**: DET-008
- **目标端**: iOS
- **前置条件**: 进入OB流程页面3
- **自动化步骤**:
  1. 导航到目标选择页
  2. 选择"I want to feel better about myself"
  3. 进入页面4
  4. 验证4个子选项
- **断言**: 展示以下选项：
  - Having more energy
  - Feeling better in my clothes
  - Having more confidence
  - Physically feeling more comfortable
- **状态**: ⏳ 待执行（需Mac环境）

---

### AUTO-008: 目标选择-健康改善
- **来源用例**: DET-009
- **目标端**: iOS
- **前置条件**: 进入OB流程页面3
- **自动化步骤**:
  1. 导航到目标选择页
  2. 选择"I want to improve my health"
  3. 进入页面4
  4. 验证4个子选项
- **断言**: 展示以下选项：
  - Having good general health
  - Managing my existing health conditions
  - Prevent health conditions
  - Boost immunity
- **状态**: ⏳ 待执行（需Mac环境）

---

## 执行阻塞点汇总

| 阻塞点 | 影响用例 | 解决方案 |
|--------|----------|----------|
| Windows环境不支持iOS自动化 | 全部 | 需在Mac设备上执行 |
| Remote Config配置权限 | AUTO-001~005 | 需后台权限配置AICal_old_test |
| 游客模式用户判定逻辑 | AUTO-001~004 | 需开发确认 |
| 元素Accessibility ID | 全部 | 部分元素可能需要调整定位器 |

## 后续步骤

1. **迁移到Mac环境**：将`automation`目录复制到Mac设备
2. **安装依赖**：`npm install`
3. **启动Appium**：`appium --port 4723`
4. **配置Remote Config**：设置AICal_old_test=22
5. **连接真机**：确保UDID正确，App已安装
6. **执行测试**：`npm test`

## 文件清单

```
automation/
├── README.md              # 自动化模块说明
├── package.json           # 依赖配置
├── wdio.conf.js           # WebDriverIO配置
├── cases/
│   ├── ob-flow.spec.js    # OB流程测试 (AUTO-001~004)
│   ├── goal-selection.spec.js  # 目标选择测试 (AUTO-006~008)
│   └── review-mode.spec.js     # 审核态测试 (AUTO-005)
├── fixtures/              # 测试数据
├── reports/               # 测试报告输出
└── screenshots/           # 错误截图
```
