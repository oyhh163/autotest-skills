/**
 * FoodPilot V2.8.17 - 老用户OB流程自动化测试
 * 测试用例：AUTO-001, AUTO-002, AUTO-003, AUTO-004
 */

describe('老用户OB流程测试', () => {
  
  // 页面元素定位器
  const selectors = {
    // 欢迎页
    welcomeTitle: '~Welcome back',
    weightLossText: '~weight loss plan',
    healthierText: '~eat healthier',
    continueButton: '~Continue',
    
    // 目标选择页
    changeHowILook: '~I want to change how I look',
    feelBetter: '~I want to feel better about myself',
    improveHealth: '~I want to improve my health',
    
    // 子选项
    lookBetterInClothes: '~Looking better in my clothes',
    changingBodyMeasurements: '~Changing my body measurements',
    moreAttractive: '~Being more attractive',
    satisfiedWithLook: '~Being more satisfied with how I look',
    
    // 阻断页选择器
    mealPlanOption: '~Meal Plan',
    fastingOption: '~Fasting',
    hydrationOption: '~Hydration',
    
    // 订阅页
    subscriptionPage: '~3 days free',
    freeTrialText: '~free trial',
    
    // 评分弹窗（不应出现）
    ratingPopup: '~Rate us',
    
    // 通用
    closeButton: '~Close',
    skipButton: '~Skip'
  };

  beforeEach(async () => {
    // 确保App处于初始状态
    await browser.terminateApp('com.calorietrack.ten.jyw');
    await browser.pause(1000);
  });

  /**
   * AUTO-001: 验证实验组22进入OB流程
   * 前置条件：非当日用户，AICal_old_test=22
   */
  it('AUTO-001: 实验组22应进入OB流程', async () => {
    // 启动App
    await browser.activateApp('com.calorietrack.ten.jyw');
    await browser.pause(3000);
    
    // 验证欢迎页出现
    const welcomeTitle = await $(selectors.welcomeTitle);
    await welcomeTitle.waitForDisplayed({ timeout: 15000 });
    
    expect(await welcomeTitle.isDisplayed()).toBe(true);
    console.log('✓ AUTO-001: 成功进入OB流程，欢迎页已展示');
  });

  /**
   * AUTO-002: 完整OB流程到订阅页
   */
  it('AUTO-002: 完整OB流程应到达订阅页', async () => {
    await browser.activateApp('com.calorietrack.ten.jyw');
    await browser.pause(3000);
    
    // 页面1-2：欢迎页和功能介绍页
    for (let i = 0; i < 2; i++) {
      const continueBtn = await $(selectors.continueButton);
      if (await continueBtn.isDisplayed()) {
        await continueBtn.click();
        await browser.pause(1500);
      }
    }
    
    // 页面3：目标选择
    const goalOption = await $(selectors.changeHowILook);
    if (await goalOption.isDisplayed()) {
      await goalOption.click();
      await browser.pause(1500);
    }
    
    // 页面4：子选项
    const subOption = await $(selectors.lookBetterInClothes);
    if (await subOption.isDisplayed()) {
      await subOption.click();
      await browser.pause(1500);
    }
    
    // 页面5-8：继续点击Continue
    for (let i = 0; i < 4; i++) {
      const continueBtn = await $(selectors.continueButton);
      if (await continueBtn.isDisplayed()) {
        await continueBtn.click();
        await browser.pause(1500);
      }
      
      // 页面6-7可能需要选择选项
      const options = await $$('//XCUIElementTypeButton[contains(@name, "Lack")]');
      if (options.length > 0 && await options[0].isDisplayed()) {
        await options[0].click();
        await browser.pause(1000);
      }
    }
    
    // 页面9：处理加载阻断
    const blockingOptions = [selectors.mealPlanOption, selectors.fastingOption, selectors.hydrationOption];
    for (const option of blockingOptions) {
      const elem = await $(option);
      if (await elem.isDisplayed()) {
        await elem.click();
        await browser.pause(2000);
      }
    }
    
    // 等待加载完成
    await browser.pause(5000);
    
    // 页面10：成功故事页
    const continueBtn = await $(selectors.continueButton);
    if (await continueBtn.isDisplayed()) {
      await continueBtn.click();
      await browser.pause(2000);
    }
    
    // 验证到达订阅页
    const subscriptionPage = await $(selectors.subscriptionPage);
    await subscriptionPage.waitForDisplayed({ timeout: 15000 });
    
    expect(await subscriptionPage.isDisplayed()).toBe(true);
    console.log('✓ AUTO-002: 完整OB流程完成，成功到达订阅页');
  });

  /**
   * AUTO-003: 欢迎页减重文案验证
   * 前置条件：无历史目标数据
   */
  it('AUTO-003: 无历史数据时应显示减重文案', async () => {
    await browser.activateApp('com.calorietrack.ten.jyw');
    await browser.pause(3000);
    
    // 验证减重相关文案
    const weightLossText = await $(selectors.weightLossText);
    
    let isWeightLossDisplayed = false;
    try {
      await weightLossText.waitForDisplayed({ timeout: 10000 });
      isWeightLossDisplayed = await weightLossText.isDisplayed();
    } catch (e) {
      // 尝试获取页面文本进行验证
      const pageSource = await browser.getPageSource();
      isWeightLossDisplayed = pageSource.includes('weight loss') || 
                              pageSource.includes('Weight loss') ||
                              pageSource.includes('weight-loss');
    }
    
    expect(isWeightLossDisplayed).toBe(true);
    console.log('✓ AUTO-003: 欢迎页正确显示减重文案');
  });

  /**
   * AUTO-004: OB流程无评分弹窗验证
   */
  it('AUTO-004: OB流程中不应出现评分弹窗', async () => {
    await browser.activateApp('com.calorietrack.ten.jyw');
    await browser.pause(3000);
    
    let ratingPopupFound = false;
    
    // 遍历OB流程，检查每个页面
    for (let step = 0; step < 11; step++) {
      // 检查评分弹窗
      const ratingPopup = await $(selectors.ratingPopup);
      if (await ratingPopup.isDisplayed().catch(() => false)) {
        ratingPopupFound = true;
        console.log(`✗ 在步骤 ${step + 1} 发现评分弹窗`);
        break;
      }
      
      // 继续下一步
      const continueBtn = await $(selectors.continueButton);
      if (await continueBtn.isDisplayed().catch(() => false)) {
        await continueBtn.click();
        await browser.pause(1500);
      } else {
        // 尝试点击第一个选项
        const options = await $$('//XCUIElementTypeButton');
        if (options.length > 0) {
          await options[0].click();
          await browser.pause(1500);
        }
      }
    }
    
    expect(ratingPopupFound).toBe(false);
    console.log('✓ AUTO-004: OB流程中未出现评分弹窗');
  });
});
