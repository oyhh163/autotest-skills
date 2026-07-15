const path = require('path');
const { initProject } = require('../common');

const outDir = process.argv[2];
if (!outDir) {
  console.error('Usage: node init-session.js <outputDir>');
  process.exit(1);
}

initProject(outDir, {
  projectName: 'FoodPilot V2.8.19 Recipes',
  platform: 'ios',
  includePlaywright: false,
});
