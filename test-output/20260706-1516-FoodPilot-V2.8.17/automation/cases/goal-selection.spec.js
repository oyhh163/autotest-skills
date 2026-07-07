/**
 * FoodPilot V2.8.17 - 目标选择流程自动化测试
 * 测试用例：AUTO-006, AUTO-007, AUTO-008
 */

describe('目标选择流程测试', () => {
  
  const selectors = {
    // 目标选择页（页面3）
    changeHowILook: '~I want to change how I look',
    feelBetter: '~I want to feel better about myself',
    improveHealth: '~I want to improve my health',
    
    // 外表改变子选项（页面4）
    lookBetterInClothes: '~Looking better in my clothes',
    changingBodyMeasurements: '~Changing my body measurements',
    moreAttractive: '~Being more attractive',
    satisfiedWithLook: '~Being more satisfied with how I look',
    
    // 自我感觉子选项（页面4）
    moreEnergy: '~Having more energy',
    feelingBetterInClothes: '~Feeling better in my clothes',
    moreConfidence: '~Having more confidence',
    physicallyComfortable: '~Physically feeling more comfortable',
    
    // 健康改善子选项（页面4）
    goodGeneralHealth: '~Having good general health',
    managingHealthConditions: '~Managing my existing health conditions',
    preventHealthConditions: '~Prevent health conditions',
    boostImmunity: '~Boost immunity',
    
    // 通用
    continueButton: '~Continue',
    welcomeTitle: '~Welcome back'
  };

  // 导航到目标选择页
  async function navigateToGoalPage() {
    await browser.activateApp('com.calorietrack.ten.jyw');
    await browser.pause(3000);
    
    // 等待欢迎页
    const welcomeTitle = await $(selectors.welcomeTitle);
    await welcomeTitle.waitForDisplayed({ timeout: 15000 });
    
    // 点击Continue两次到达页面3
    for (let i = 0; i < 2; i++) {
      const continueBtn = await $(selectors.continueButton);
      if (await continueBtn.isDisplayed()) {
        await continueBtn.click();
        await browser.pause(1500);
      }
    }
  }

  beforeEach(async () => {
    await browser.terminateApp('com.calorietrack.ten.jyw');
    await browser.pause(1000);
  });

  /**
   * AUTO-006: 目标选择 - 外表改变选项验证
   */
  it('AUTO-006: 选择"外表改变"后应展示对应子选项', async () => {
    await navigateToGoalPage();
    
    // 选择"I want to change how I look"
    const changeHowILook = await $(selectors.changeHowILook);
    await changeHowILook.waitForDisplayed({ timeout: 10000 });
    await changeHowILook.click();
    await browser.pause(2000);
    
    // 验证4个子选项
    const expectedOptions = [
      selectors.lookBetterInClothes,
      selectors.changingBodyMeasurements,
      selectors.moreAttractive,
      selectors.satisfiedWithLook
    ];
    
    let allOptionsFound = true;
    const foundOptions = [];
    
    for (const option of expectedOptions) {
      const elem = await $(option);
      const isDisplayed = await elem.isDisplayed().catch(() => false);
      foundOptions.push({ option, isDisplayed });
      if (!isDisplayed) {
        allOptionsFound = false;
      }
    }
    
    console.log('子选项验证结果:', foundOptions);
    expect(allOptionsFound).toBe(true);
    console.log('✓ AUTO-006: 外表改变的4个子选项全部展示正确');
  });

  /**
   * AUTO-007: 目标选择 - 自我感觉选项验证
   */
  it('AUTO-007: 选择"自我感觉"后应展示对应子选项', async () => {
    await navigateToGoalPage();
    
    // 选择"I want to feel better about myself"
    const feelBetter = await $(selectors.feelBetter);
    await feelBetter.waitForDisplayed({ timeout: 10000 });
    await feelBetter.click();
    await browser.pause(2000);
    
    // 验证4个子选项
    const expectedOptions = [
      selectors.moreEnergy,
      selectors.feelingBetterInClothes,
      selectors.moreConfidence,
      selectors.physicallyComfortable
    ];
    
    let allOptionsFound = true;
    const foundOptions = [];
    
    for (const option of expectedOptions) {
      const elem = await $(option);
      const isDisplayed = await elem.isDisplayed().catch(() => false);
      foundOptions.push({ option, isDisplayed });
      if (!isDisplayed) {
        allOptionsFound = false;
      }
    }
    
    console.log('子选项验证结果:', foundOptions);
    expect(allOptionsFound).toBe(true);
    console.log('✓ AUTO-007: 自我感觉的4个子选项全部展示正确');
  });

  /**
   * AUTO-008: 目标选择 - 健康改善选项验证
   */
  it('AUTO-008: 选择"健康改善"后应展示对应子选项', async () => {
    await navigateToGoalPage();
    
    // 选择"I want to improve my health"
    const improveHealth = await $(selectors.improveHealth);
    await improveHealth.waitForDisplayed({ timeout: 10000 });
    await improveHealth.click();
    await browser.pause(2000);
    
    // 验证4个子选项
    const expectedOptions = [
      selectors.goodGeneralHealth,
      selectors.managingHealthConditions,
      selectors.preventHealthConditions,
      selectors.boostImmunity
    ];
    
    let allOptionsFound = true;
    const foundOptions = [];
    
    for (const option of expectedOptions) {
      const elem = await $(option);
      const isDisplayed = await elem.isDisplayed().catch(() => false);
      foundOptions.push({ option, isDisplayed });
      if (!isDisplayed) {
        allOptionsFound = false;
      }
    }
    
    console.log('子选项验证结果:', foundOptions);
    expect(allOptionsFound).toBe(true);
    console.log('✓ AUTO-008: 健康改善的4个子选项全部展示正确');
  });
});
