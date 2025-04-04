const fs = require('fs');
const path = require('path');

// Read app.json
const appJsonPath = path.join(__dirname, '..', 'app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

// Get version info
const version = appJson.expo.version;
const versionCode = appJson.expo.android.versionCode;

// Print version info
console.log('\x1b[36m%s\x1b[0m', '📱 AniSurge Version Info:');
console.log('\x1b[33m%s\x1b[0m', `Version: ${version}`);
console.log('\x1b[33m%s\x1b[0m', `Version Code: ${versionCode}`); 