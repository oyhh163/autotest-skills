/**
 * Playwright JSON 报告解析工具
 * 从 Playwright 的 JSON 报告中提取真实测试结果
 */

const fs = require('fs');
const path = require('path');

/**
 * 解析 Playwright JSON 报告
 * @param {string} reportPath - JSON 报告文件路径
 * @returns {Object} 解析后的测试结果
 */
function parsePlaywrightReport(reportPath) {
  if (!fs.existsSync(reportPath)) {
    return {
      success: false,
      error: `报告文件不存在: ${reportPath}`,
      results: null,
    };
  }

  try {
    const content = fs.readFileSync(reportPath, 'utf-8');
    const report = JSON.parse(content);
    
    // Playwright JSON 报告结构
    const results = {
      success: true,
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        flaky: 0,
        duration: 0,
        startTime: report.stats?.startTime || null,
        endTime: null,
      },
      suites: [],
      failedTests: [],
      allTests: [],
    };

    // 解析统计信息
    if (report.stats) {
      results.summary.total = report.stats.expected || 0;
      results.summary.passed = (report.stats.expected || 0) - (report.stats.unexpected || 0) - (report.stats.skipped || 0);
      results.summary.failed = report.stats.unexpected || 0;
      results.summary.skipped = report.stats.skipped || 0;
      results.summary.flaky = report.stats.flaky || 0;
      results.summary.duration = report.stats.duration || 0;
    }

    // 递归解析测试套件
    function parseSuite(suite, parentPath = '') {
      const suitePath = parentPath ? `${parentPath} > ${suite.title}` : suite.title;
      
      const suiteResult = {
        title: suite.title,
        path: suitePath,
        file: suite.file || null,
        tests: [],
        passed: 0,
        failed: 0,
        skipped: 0,
      };

      // 解析测试用例
      for (const spec of suite.specs || []) {
        for (const test of spec.tests || []) {
          const testResult = parseTest(spec, test, suitePath);
          suiteResult.tests.push(testResult);
          results.allTests.push(testResult);
          
          if (testResult.status === 'passed') {
            suiteResult.passed++;
          } else if (testResult.status === 'failed') {
            suiteResult.failed++;
            results.failedTests.push(testResult);
          } else if (testResult.status === 'skipped') {
            suiteResult.skipped++;
          }
        }
      }

      // 递归处理子套件
      for (const childSuite of suite.suites || []) {
        const childResult = parseSuite(childSuite, suitePath);
        suiteResult.tests.push(...childResult.tests);
        suiteResult.passed += childResult.passed;
        suiteResult.failed += childResult.failed;
        suiteResult.skipped += childResult.skipped;
      }

      return suiteResult;
    }

    // 解析单个测试
    function parseTest(spec, test, suitePath) {
      const results = test.results || [];
      const lastResult = results[results.length - 1] || {};
      
      // 判断最终状态
      let status = 'unknown';
      if (test.status === 'expected') {
        status = 'passed';
      } else if (test.status === 'unexpected') {
        status = 'failed';
      } else if (test.status === 'skipped') {
        status = 'skipped';
      } else if (test.status === 'flaky') {
        status = 'flaky';
      }

      const testResult = {
        id: spec.id || `${suitePath}::${spec.title}`,
        title: spec.title,
        fullTitle: `${suitePath} > ${spec.title}`,
        status,
        duration: lastResult.duration || 0,
        retries: results.length - 1,
        error: null,
        stdout: [],
        stderr: [],
        attachments: [],
      };

      // 提取错误信息
      if (status === 'failed' && lastResult.error) {
        testResult.error = {
          message: lastResult.error.message || '未知错误',
          stack: lastResult.error.stack || '',
          snippet: lastResult.error.snippet || null,
        };
      }

      // 提取输出
      for (const result of results) {
        if (result.stdout) {
          testResult.stdout.push(...result.stdout);
        }
        if (result.stderr) {
          testResult.stderr.push(...result.stderr);
        }
        if (result.attachments) {
          testResult.attachments.push(...result.attachments);
        }
      }

      return testResult;
    }

    // 解析所有套件
    for (const suite of report.suites || []) {
      const suiteResult = parseSuite(suite);
      results.suites.push(suiteResult);
    }

    // 重新统计（如果 stats 不准确）
    if (results.allTests.length > 0) {
      results.summary.total = results.allTests.length;
      results.summary.passed = results.allTests.filter(t => t.status === 'passed').length;
      results.summary.failed = results.allTests.filter(t => t.status === 'failed').length;
      results.summary.skipped = results.allTests.filter(t => t.status === 'skipped').length;
      results.summary.flaky = results.allTests.filter(t => t.status === 'flaky').length;
    }

    return results;
  } catch (error) {
    return {
      success: false,
      error: `解析报告失败: ${error.message}`,
      results: null,
    };
  }
}

/**
 * 从目录中查找并解析最新的 JSON 报告
 * @param {string} projectDir - 项目目录
 * @returns {Object} 解析结果
 */
function findAndParseReport(projectDir) {
  const possiblePaths = [
    path.join(projectDir, 'reports', 'results.json'),
    path.join(projectDir, 'test-results.json'),
    path.join(projectDir, 'playwright-report', 'results.json'),
  ];

  for (const reportPath of possiblePaths) {
    if (fs.existsSync(reportPath)) {
      return parsePlaywrightReport(reportPath);
    }
  }

  return {
    success: false,
    error: `未找到 JSON 报告文件，尝试的路径: ${possiblePaths.join(', ')}`,
    results: null,
  };
}

/**
 * 生成测试结果摘要（用于飞书反馈）
 * @param {Object} results - 解析后的测试结果
 * @returns {Object} 摘要信息
 */
function generateSummary(results) {
  if (!results.success) {
    return {
      status: 'error',
      message: results.error,
      passRate: 0,
      details: null,
    };
  }

  const { summary, failedTests } = results;
  const passRate = summary.total > 0 
    ? Math.round((summary.passed / summary.total) * 100) 
    : 0;

  const summaryObj = {
    status: summary.failed === 0 ? 'success' : 'failure',
    message: summary.failed === 0 
      ? `✅ 全部通过 (${summary.passed}/${summary.total})`
      : `❌ 存在失败 (通过: ${summary.passed}, 失败: ${summary.failed}, 跳过: ${summary.skipped})`,
    passRate,
    total: summary.total,
    passed: summary.passed,
    failed: summary.failed,
    skipped: summary.skipped,
    duration: formatDuration(summary.duration),
    failedTests: failedTests.map(t => ({
      title: t.title,
      fullTitle: t.fullTitle,
      error: t.error?.message || '未知错误',
    })),
  };

  return summaryObj;
}

/**
 * 格式化时长
 */
function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

/**
 * 将失败的测试转换为 Bug 记录格式
 * @param {Array} failedTests - 失败的测试列表
 * @param {Object} context - 上下文信息
 * @returns {Array} Bug 记录数组
 */
function convertToBugRecords(failedTests, context = {}) {
  return failedTests.map((test, index) => ({
    id: `BUG-${Date.now()}-${index + 1}`,
    title: `[自动化] ${test.title}`,
    source: '自动化测试',
    caseId: test.id,
    severity: 'P1',  // 自动化失败默认 P1
    status: '待处理',
    description: `测试用例: ${test.fullTitle}\n\n错误信息:\n${test.error?.message || '未知错误'}`,
    errorStack: test.error?.stack || '',
    platform: context.platform || 'Web',
    browser: context.browser || '未知',
    url: context.url || '',
    createdAt: new Date().toISOString(),
  }));
}

module.exports = {
  parsePlaywrightReport,
  findAndParseReport,
  generateSummary,
  convertToBugRecords,
};
