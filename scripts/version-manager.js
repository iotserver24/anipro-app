#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get the root directory of the project
const rootDir = path.resolve(__dirname, '..');

// Configuration files that contain version information
const configFiles = {
  packageJson: path.join(rootDir, 'package.json'),
  appJson: path.join(rootDir, 'app.json'),
  gradleBuild: path.join(rootDir, 'android', 'app', 'build.gradle')
};

/**
 * Read current version information from all configuration files
 */
function checkVersions() {
  console.log('🔍 Checking current version numbers across files...\n');
  
  // Read package.json
  const packageJson = JSON.parse(fs.readFileSync(configFiles.packageJson, 'utf8'));
  console.log('📦 package.json:');
  console.log(`   Version: ${packageJson.version}\n`);
  
  // Read app.json
  const appJson = JSON.parse(fs.readFileSync(configFiles.appJson, 'utf8'));
  console.log('📱 app.json:');
  console.log(`   Version: ${appJson.expo.version}`);
  console.log(`   Android versionCode: ${appJson.expo.android.versionCode}\n`);
  
  // Check build.gradle only if it exists (might not exist before prebuild)
  let gradleVersionName = 'Not available (run prebuild first)';
  let gradleVersionCode = 'Not available (run prebuild first)';
  
  if (fs.existsSync(configFiles.gradleBuild)) {
    const gradleBuild = fs.readFileSync(configFiles.gradleBuild, 'utf8');
    const versionNameMatch = gradleBuild.match(/versionName\s+["']([^"']+)["']/);
    const versionCodeMatch = gradleBuild.match(/versionCode\s+(\d+)/);
    
    gradleVersionName = versionNameMatch ? versionNameMatch[1] : 'Not found';
    gradleVersionCode = versionCodeMatch ? versionCodeMatch[1] : 'Not found';
  }
  
  console.log('🤖 android/app/build.gradle:');
  console.log(`   versionName: ${gradleVersionName}`);
  console.log(`   versionCode: ${gradleVersionCode}\n`);
  
  // Check for inconsistencies
  const versions = {
    packageVersion: packageJson.version,
    appVersion: appJson.expo.version,
    gradleVersionName: gradleVersionName !== 'Not available (run prebuild first)' && gradleVersionName !== 'Not found' ? gradleVersionName : null,
    appVersionCode: appJson.expo.android.versionCode,
    gradleVersionCode: gradleVersionCode !== 'Not available (run prebuild first)' && gradleVersionCode !== 'Not found' ? parseInt(gradleVersionCode) : null
  };
  
  let inconsistencies = [];
  
  if (versions.packageVersion !== versions.appVersion) {
    inconsistencies.push('Version string is inconsistent between package.json and app.json');
  }
  
  if (versions.gradleVersionName && versions.appVersion !== versions.gradleVersionName) {
    inconsistencies.push('Version string is inconsistent between app.json and build.gradle');
  }
  
  if (versions.gradleVersionCode && versions.appVersionCode !== versions.gradleVersionCode) {
    inconsistencies.push('Android versionCode is inconsistent between app.json and build.gradle');
  }
  
  if (inconsistencies.length > 0) {
    console.log('⚠️ INCONSISTENCIES DETECTED:');
    inconsistencies.forEach(issue => console.log(`   - ${issue}`));
    console.log('\nRun this script with update parameters to fix inconsistencies.');
  } else {
    console.log('✅ All version numbers are consistent across available files!');
  }
  
  return versions;
}

/**
 * Update version information in all configuration files
 * @param {string} newVersion - The new semantic version (e.g., "3.0.0")
 * @param {number} newVersionCode - The new Android version code (e.g., 3)
 */
function updateVersions(newVersion, newVersionCode) {
  console.log(`🔄 Updating version to ${newVersion} (code: ${newVersionCode})...\n`);
  
  // Update package.json
  const packageJson = JSON.parse(fs.readFileSync(configFiles.packageJson, 'utf8'));
  packageJson.version = newVersion;
  fs.writeFileSync(configFiles.packageJson, JSON.stringify(packageJson, null, 2) + '\n');
  console.log('✅ Updated package.json');
  
  // Update app.json
  const appJson = JSON.parse(fs.readFileSync(configFiles.appJson, 'utf8'));
  appJson.expo.version = newVersion;
  appJson.expo.android.versionCode = newVersionCode;
  fs.writeFileSync(configFiles.appJson, JSON.stringify(appJson, null, 2) + '\n');
  console.log('✅ Updated app.json');
  
  // Update build.gradle if it exists
  if (fs.existsSync(configFiles.gradleBuild)) {
    let gradleBuild = fs.readFileSync(configFiles.gradleBuild, 'utf8');
    gradleBuild = gradleBuild.replace(
      /versionCode\s+\d+/,
      `versionCode ${newVersionCode}`
    );
    gradleBuild = gradleBuild.replace(
      /versionName\s+["'][^"']+["']/,
      `versionName "${newVersion}"`
    );
    fs.writeFileSync(configFiles.gradleBuild, gradleBuild);
    console.log('✅ Updated android/app/build.gradle');
  } else {
    console.log('⚠️ android/app/build.gradle not found. Run expo prebuild after updating version.');
  }
  
  console.log('\n🎉 Version update complete!');
}

/**
 * Increment version based on semantic versioning rules
 * @param {string} currentVersion - The current version (e.g., "3.0.0")
 * @param {string} type - The type of increment: 'major', 'minor', or 'patch'
 * @returns {string} The new version
 */
function incrementVersion(currentVersion, type) {
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  
  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
    default:
      return `${major}.${minor}.${patch + 1}`;
  }
}

/**
 * Run expo prebuild after updating versions
 */
function runPrebuild(clean = false) {
  console.log('\n🔄 Running expo prebuild...');
  try {
    const command = clean 
      ? 'npx expo prebuild --clean' 
      : 'npx expo prebuild';
    
    console.log(`Executing: ${command}`);
    execSync(command, { stdio: 'inherit', cwd: rootDir });
    console.log('✅ Prebuild completed successfully!');
  } catch (error) {
    console.error('❌ Prebuild failed:', error.message);
    process.exit(1);
  }
}

// Main execution
function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!command || command === 'check') {
    checkVersions();
    return;
  }
  
  if (command === 'update') {
    const newVersion = args[1];
    const newVersionCode = parseInt(args[2]);
    
    if (!newVersion || !newVersionCode) {
      console.error('Error: Both version and versionCode must be provided.');
      console.log('Usage: node version-manager.js update 3.0.0 3');
      return;
    }
    
    updateVersions(newVersion, newVersionCode);
    
    // Check if we should run prebuild after updating
    if (args.includes('--prebuild')) {
      runPrebuild(args.includes('--clean'));
    }
    
    return;
  }
  
  if (['major', 'minor', 'patch'].includes(command)) {
    const versions = checkVersions();
    const currentVersion = versions.appVersion;
    const currentVersionCode = versions.appVersionCode || 0;
    
    const newVersion = incrementVersion(currentVersion, command);
    const newVersionCode = currentVersionCode + 1;
    
    console.log(`\nWould you like to increment from ${currentVersion} (${currentVersionCode}) to ${newVersion} (${newVersionCode})? (y/n)`);
    // Since we can't get user input in this script execution, we'll just update automatically
    console.log('Auto-confirming update...');
    
    updateVersions(newVersion, newVersionCode);
    
    // Check if we should run prebuild after updating
    if (args.includes('--prebuild')) {
      runPrebuild(args.includes('--clean'));
    }
    
    return;
  }

  if (command === 'prebuild') {
    // First check and possibly update versions to ensure consistency
    const versions = checkVersions();
    
    // Run prebuild with the clean flag if specified
    runPrebuild(args.includes('--clean'));
    return;
  }
  
  console.log('Unknown command. Available commands:');
  console.log('  check                    - Check current versions across files');
  console.log('  update <version> <code>  - Update to specific version and code');
  console.log('  update <version> <code> --prebuild [--clean] - Update and run prebuild');
  console.log('  major [--prebuild] [--clean] - Increment major version (X.0.0)');
  console.log('  minor [--prebuild] [--clean] - Increment minor version (x.X.0)');
  console.log('  patch [--prebuild] [--clean] - Increment patch version (x.x.X)');
  console.log('  prebuild [--clean]      - Run expo prebuild after checking versions');
}

main(); 