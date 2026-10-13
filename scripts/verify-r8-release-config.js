/* global __dirname */
/**
 * Checks the generated Android project for release obfuscation and the
 * native security hooks. Run after `npx expo prebuild -p android`.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const androidDir = path.join(root, 'android');

const checks = [
  {
    file: path.join(androidDir, 'gradle.properties'),
    includes: 'android.r8.optimizedResourceShrinking=true',
    label: 'optimized resource shrinking',
  },
  {
    file: path.join(androidDir, 'app', 'build.gradle'),
    includes: 'proguard-android-optimize.txt',
    label: 'optimize ProGuard file',
  },
  {
    file: path.join(androidDir, 'app', 'proguard-rules.pro'),
    includes: 'com.freeraspreactnative',
    label: 'freeRASP keep rules',
  },
  {
    file: path.join(androidDir, 'app', 'proguard-rules.pro'),
    includes: 'com.sslpublickeypinning',
    label: 'SSL pinning keep rules',
  },
];

function readAndroidFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return fs.readFileSync(filePath, 'utf8');
}

function findGeneratedFile(suffix) {
  const javaRoot = path.join(androidDir, 'app', 'src', 'main', 'java');
  if (!fs.existsSync(javaRoot)) {
    return null;
  }
  const stack = [javaRoot];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
        continue;
      }
      if (entry.name === suffix) {
        return entryPath;
      }
    }
  }
  return null;
}

function main() {
  if (!fs.existsSync(androidDir)) {
    console.error('android/ is missing. Run: npx expo prebuild -p android');
    process.exit(1);
  }
  const failures = [];
  for (const check of checks) {
    const contents = readAndroidFile(check.file);
    if (contents == null || !contents.includes(check.includes)) {
      failures.push(`${check.label} (${path.relative(root, check.file)})`);
    }
  }
  const mainApplicationPath = findGeneratedFile('MainApplication.kt');
  const mainApplication = mainApplicationPath ? readAndroidFile(mainApplicationPath) : null;
  if (!mainApplication || !mainApplication.includes('EarlySecurityBootstrap.install')) {
    failures.push('EarlySecurityBootstrap.install in MainApplication.kt');
  }
  if (!mainApplication || !mainApplication.includes('ApiHttpCacheSecurity.install')) {
    failures.push('ApiHttpCacheSecurity.install in MainApplication.kt');
  }
  const mainActivityPath = findGeneratedFile('MainActivity.kt');
  const mainActivity = mainActivityPath ? readAndroidFile(mainActivityPath) : null;
  if (!mainActivity || !mainActivity.includes('dispatchTouchEvent')) {
    failures.push('dispatchTouchEvent override in MainActivity.kt');
  }
  const manifestPath = path.join(androidDir, 'app', 'src', 'main', 'AndroidManifest.xml');
  const manifest = readAndroidFile(manifestPath);
  if (!manifest || !manifest.includes('android.permission.HIDE_OVERLAY_WINDOWS')) {
    failures.push('HIDE_OVERLAY_WINDOWS in AndroidManifest.xml');
  }
  if (failures.length > 0) {
    console.error('Release security config is incomplete:');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }
  console.log('Release security config looks complete.');
}

main();
