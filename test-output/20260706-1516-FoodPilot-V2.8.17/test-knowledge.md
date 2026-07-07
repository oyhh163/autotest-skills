# FoodPilot V2.8.17 测试知识沉淀

## Figma设计分析

### 配置信息
- **Figma Token**: 已配置（figd_DKHgO...）
- **UI项目**: AI CAL UI 项目
- **分析节点**: node-id=5415-2766（订阅页）

### 🔴 设计问题（需修复）

| 问题 | 位置 | 现状 | 应改为 |
|------|------|------|--------|
| 拼写错误 | CTA按钮 | "Start Free Trail" | "Start Free Trial" |
| 拼写错误 | 试用说明 | "3-day FREE trail" | "3-day FREE trial" |
| 拼写错误 | 订阅开始 | "subsciption" | "subscription" |
| 可能拼写错误 | 成功率说明 | "memebers" | "members" |

**建议**：这些拼写错误会影响用户体验和品牌专业度，建议在发布前修复。

## 已确认的需求澄清
- [2026-07-06] 用户判定逻辑：按本地时间判断是否为"当日用户"，非当日用户才触发老用户OB测试
- [2026-07-06] 默认值处理：历史无目标数据按减重用户处理，历史无性别数据或不愿透露按女性处理
- [2026-07-06] 审核态参数：AColdControlStr=0为审核态，1为实验态

## 产品规则
- 老用户OB分组：AICal_old_test参数，21=对照组（直接订阅页），22=实验组（走OB流程）
- 永久卡升级条件：仅限已购普通扫描会员（排除0元试用、周订阅、月订阅）
- 定价对应关系：
  - $39.99首购 → $79.99永久卡 (Aical_lifetime_79)
  - $29.99首购 → $59.99永久卡 (foodpilot.lifetime.59)
  - $24.99首购 → $49.99永久卡 (foodpilot.lifetime.49)
- 加载阻断进度：MealPlan@57%, Fasting@49%, Hydration@60%

## 已知脆弱区域
- [加载阻断] 进度百分比精确度可能存在误差，需确认允许范围
- [动效播放] "仅自动播放一次"的具体触发条件不明确
- [埋点验证] 需要抓包工具配合，自动化难以直接验证

## 待确认的Bug
- (自动化未执行，暂无缺陷数据)

## 自动化阻塞点
- [环境限制] Windows不支持iOS自动化，需Mac+Xcode环境
- [配置依赖] 测试需要Remote Config后台权限配置实验分组
- [账号依赖] 永久卡升级测试需要真实支付的已购会员账号
- [元素定位] 部分元素可能需要开发提供Accessibility ID

## 测试环境配置
```
App: FoodPilot V2.8.17
Bundle ID: com.calorietrack.ten.jyw
设备UDID: 00008120-0011698C0EFBC01E
平台: iOS 真机
测试模式: 游客模式
环境: 生产环境
```

## 埋点事件清单
### 老用户OB测试
- AC_Premium_return_show
  - re_source: free_trail
  - old_abt: 21/22
  - old_source: Unfinished/completed
- AC_Premium_order
  - or_source: free_trail
  - or_sku: "year"
  - or_price: "year_0"
- AC_Premium_ordersuc
  - suc_source: free_trail
  - suc_sku: "year"
  - suc_price: "year_0"

### 永久卡升级测试
- AC_Premium_show
  - main_abt/main_abt29/main_abt24: 序号
  - time_abt: 20-26
  - source: 10_mealpopup/upgrade
- AC_Premium_order
  - or_source: 10_mealpopup/upgrade
  - or_sku: "year"/"lifetime"
  - or_price: 对应价格
- AC_Premium_ordersuc
  - suc_source/suc_sku/suc_price: 同上

## 后续改进建议
1. 建立iOS自动化测试的Mac环境
2. 申请Remote Config配置权限
3. 准备沙盒测试账号用于支付流程测试
4. 与开发确认关键元素的Accessibility ID
5. 补充接口失败埋点的详细字段定义

---
*最后更新：2026-07-06*
