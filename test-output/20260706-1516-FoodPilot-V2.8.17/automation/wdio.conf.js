exports.config = {
  runner: 'local',
  port: 4723,
  specs: ['./cases/**/*.spec.js'],
  maxInstances: 1,
  
  capabilities: [{
    platformName: 'iOS',
    'appium:deviceName': 'iPhone',
    'appium:udid': '00008120-0011698C0EFBC01E',
    'appium:bundleId': 'com.calorietrack.ten.jyw',
    'appium:automationName': 'XCUITest',
    'appium:noReset': false,
    'appium:fullReset': false,
    'appium:newCommandTimeout': 300,
    'appium:wdaLaunchTimeout': 120000,
    'appium:wdaConnectionTimeout': 120000,
  }],
  
  logLevel: 'info',
  bail: 0,
  baseUrl: '',
  waitforTimeout: 30000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,
  
  services: ['appium'],
  
  framework: 'mocha',
  reporters: [
    'spec',
    ['json', {
      outputDir: './reports',
      outputFileFormat: function(opts) {
        return `results-${opts.cid}.json`;
      }
    }]
  ],
  
  mochaOpts: {
    ui: 'bdd',
    timeout: 180000
  },
  
  screenshotPath: './screenshots',
  
  afterTest: async function(test, context, { error }) {
    if (error) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      await browser.saveScreenshot(`./screenshots/error-${timestamp}.png`);
    }
  }
};
