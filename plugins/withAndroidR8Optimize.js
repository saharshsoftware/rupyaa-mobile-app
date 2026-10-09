/* global __dirname */
const fs = require('fs');
const path = require('path');
const {
  createRunOncePlugin,
  withAppBuildGradle,
  withDangerousMod,
  withGradleProperties,
} = require('@expo/config-plugins');

const PLUGIN_NAME = 'with-android-r8-optimize';
const PLUGIN_VERSION = '1.0.0';
const SECTION_TAG = 'rupyaa-android-r8-extra';
const SECTION_BEGIN = `# @generated begin ${SECTION_TAG}`;
const SECTION_END = `# @generated end ${SECTION_TAG}`;
const R8_RESOURCE_SHRINKING_KEY = 'android.r8.optimizedResourceShrinking';

function upsertGeneratedSection(contents, body) {
  const block = `${SECTION_BEGIN}\n${body.trim()}\n${SECTION_END}`;
  const pattern = new RegExp(`${SECTION_BEGIN}[\\s\\S]*?${SECTION_END}`);
  if (pattern.test(contents)) {
    return contents.replace(pattern, block);
  }
  return `${contents.trimEnd()}\n\n${block}\n`;
}

function withOptimizedProguardFile(config) {
  return withAppBuildGradle(config, (configMod) => {
    if (configMod.modResults.language !== 'groovy') {
      throw new Error('[withAndroidR8Optimize] Expected app build.gradle to be groovy.');
    }
    configMod.modResults.contents = configMod.modResults.contents.replace(
      /proguard-android\.txt/g,
      'proguard-android-optimize.txt'
    );
    return configMod;
  });
}

function withOptimizedResourceShrinking(config) {
  return withGradleProperties(config, (configMod) => {
    const existing = configMod.modResults.find(
      (item) => item.type === 'property' && item.key === R8_RESOURCE_SHRINKING_KEY
    );
    if (existing && existing.type === 'property') {
      existing.value = 'true';
      return configMod;
    }
    configMod.modResults.push({
      type: 'property',
      key: R8_RESOURCE_SHRINKING_KEY,
      value: 'true',
    });
    return configMod;
  });
}

function withExtraProguardRules(config) {
  return withDangerousMod(config, [
    'android',
    async (configMod) => {
      const androidPackage = configMod.android?.package;
      if (!androidPackage) {
        throw new Error('[withAndroidR8Optimize] android.package is not set.');
      }
      const rulesPath = path.join(
        configMod.modRequest.platformProjectRoot,
        'app',
        'proguard-rules.pro'
      );
      if (!fs.existsSync(rulesPath)) {
        throw new Error(`[withAndroidR8Optimize] Missing ${rulesPath}. Run prebuild first.`);
      }
      const extraRulesPath = path.join(__dirname, 'android-r8-extra.pro');
      const extraRules = fs.readFileSync(extraRulesPath, 'utf8');
      const packageKeep = `-keep class ${androidPackage}.security.** { *; }`;
      const original = fs.readFileSync(rulesPath, 'utf8');
      const updated = upsertGeneratedSection(original, `${extraRules.trim()}\n${packageKeep}`);
      if (updated !== original) {
        fs.writeFileSync(rulesPath, updated);
      }
      return configMod;
    },
  ]);
}

function withAndroidR8Optimize(config) {
  let next = config;
  next = withOptimizedProguardFile(next);
  next = withOptimizedResourceShrinking(next);
  next = withExtraProguardRules(next);
  return next;
}

module.exports = createRunOncePlugin(withAndroidR8Optimize, PLUGIN_NAME, PLUGIN_VERSION);
