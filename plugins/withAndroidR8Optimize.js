/* global __dirname */
const fs = require('fs');
const path = require('path');
const {
  createRunOncePlugin,
  withAppBuildGradle,
  withProjectBuildGradle,
  withDangerousMod,
  withGradleProperties,
} = require('@expo/config-plugins');

const PLUGIN_NAME = 'with-android-r8-optimize';
const PLUGIN_VERSION = '2.2.0';

// AGP 8.13.0 shades R8 8.13.6. That version throws
// StringIndexOutOfBoundsException (index 0) from isRClassDescriptor when a
// class name ends in '$'. Razorpay Checkout ships many of those. Fixed in
// R8 8.13.9 (1ce625e770). 8.13.25 is the latest 8.13 patch and stays on the
// AGP 8.13 line. Must be on the buildscript classpath before AGP so it wins
// over the shaded copy.
const R8_VERSION = '8.13.25';
const R8_CLASSPATH = `classpath('com.android.tools:r8:${R8_VERSION}')`;
const R8_PIN_BEGIN = '@generated begin r8-version-pin';
const R8_PIN_END = '@generated end r8-version-pin';

const SECTION_TAG = 'rupyaa-android-r8-extra';
const SECTION_BEGIN = `# @generated begin ${SECTION_TAG}`;
const SECTION_END = `# @generated end ${SECTION_TAG}`;
const R8_RESOURCE_SHRINKING_KEY = 'android.r8.optimizedResourceShrinking';

const R8_PIN_REGEX =
  /^[ \t]*\/\/ @generated begin r8-version-pin\n[\s\S]*?^[ \t]*\/\/ @generated end r8-version-pin\n?/m;

const AGP_CLASSPATH_REGEX =
  /^([ \t]*)classpath\((['"])com\.android\.tools\.build:gradle\2\)/m;

const r8PinBlock = (indent) =>
  `${indent}// ${R8_PIN_BEGIN}\n${indent}${R8_CLASSPATH}\n${indent}// ${R8_PIN_END}`;

function upsertGeneratedSection(contents, body) {
  const block = `${SECTION_BEGIN}\n${body.trim()}\n${SECTION_END}`;
  const pattern = new RegExp(`${SECTION_BEGIN}[\\s\\S]*?${SECTION_END}`);
  if (pattern.test(contents)) {
    return contents.replace(pattern, block);
  }
  return `${contents.trimEnd()}\n\n${block}\n`;
}

const withPinnedR8 = (config) => {
  return withProjectBuildGradle(config, (configMod) => {
    if (configMod.modResults.language !== 'groovy') {
      throw new Error(
        `[${PLUGIN_NAME}] Expected android/build.gradle to use Groovy`
      );
    }

    let contents = configMod.modResults.contents;

    if (R8_PIN_REGEX.test(contents)) {
      const indent =
        contents.match(/^[ \t]*(?=\/\/ @generated begin r8-version-pin)/m)?.[0] ??
        '        ';
      contents = contents.replace(R8_PIN_REGEX, `${r8PinBlock(indent)}\n`);
    } else {
      const agp = contents.match(AGP_CLASSPATH_REGEX);
      if (!agp) {
        throw new Error(
          `[${PLUGIN_NAME}] Could not find the Android Gradle Plugin classpath to pin R8 ${R8_VERSION}`
        );
      }
      contents = contents.replace(
        AGP_CLASSPATH_REGEX,
        `${r8PinBlock(agp[1])}\n${agp[0]}`
      );
    }

    configMod.modResults.contents = contents;
    return configMod;
  });
};

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
  next = withPinnedR8(next);
  next = withOptimizedProguardFile(next);
  next = withOptimizedResourceShrinking(next);
  next = withExtraProguardRules(next);
  return next;
}

module.exports = createRunOncePlugin(withAndroidR8Optimize, PLUGIN_NAME, PLUGIN_VERSION);