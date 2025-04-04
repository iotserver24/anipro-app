/**
 * Version Update Script
 * 
 * This script updates the app version in both appConfig.ts and app.json.
 * Usage: node scripts/update-version.js <version> <versionCode>
 * Example: node scripts/update-version.js 1.0.1 2
 */

const fs = require('fs');
const path = require('path');

// Get command line arguments
const newVersion = process.argv[2];
const newVersionCode = parseInt(process.argv[3], 10);

if (!newVersion || isNaN(newVersionCode)) {
  console.error('Usage: node scripts/update-version.js <version> <versionCode>');
  console.error('Example: node scripts/update-version.js 1.0.1 2');
  process.exit(1);
}

// Update appConfig.ts
const appConfigPath = path.join(__dirname, '..', 'constants', 'appConfig.ts');
let appConfigContent = fs.readFileSync(appConfigPath, 'utf8');

// Replace version and version code
appConfigContent = appConfigContent.replace(
  /VERSION: ['"](.+)['"]/,
  `VERSION: '${newVersion}'`
);
appConfigContent = appConfigContent.replace(
  /VERSION_CODE: (\d+)/,
  `VERSION_CODE: ${newVersionCode}`
);

fs.writeFileSync(appConfigPath, appConfigContent);
console.log(`✅ Updated constants/appConfig.ts with version ${newVersion} and version code ${newVersionCode}`);

// Update app.json
const appJsonPath = path.join(__dirname, '..', 'app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

// Update version in app.json
appJson.expo.version = newVersion;
appJson.expo.android.versionCode = newVersionCode;

fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
console.log(`✅ Updated app.json with version ${newVersion} and version code ${newVersionCode}`);

console.log('🚀 Version update complete!'); 