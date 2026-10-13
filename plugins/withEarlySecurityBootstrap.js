/* global __dirname */
const fs = require('fs');
const path = require('path');
const { createRunOncePlugin, withDangerousMod } = require('@expo/config-plugins');

const PLUGIN_NAME = 'with-early-security-bootstrap';
const PLUGIN_VERSION = '1.0.0';
const SOURCE_DIR = path.join(__dirname, 'early-security-bootstrap');
const KOTLIN_FILES = [
  'EarlySecurityBootstrap.kt',
  'EarlySecurityBootstrapModule.kt',
  'EarlySecurityBootstrapPackage.kt',
];

function resolveAndroidPackage(configMod) {
  const androidPackage = configMod.android?.package;
  if (!androidPackage) {
    throw new Error('[withEarlySecurityBootstrap] android.package is not set.');
  }
  return androidPackage;
}

function mainApplicationPath(configMod, androidPackage) {
  return path.join(
    configMod.modRequest.platformProjectRoot,
    'app',
    'src',
    'main',
    'java',
    androidPackage.replace(/\./g, path.sep),
    'MainApplication.kt'
  );
}

function rewritePackage(source, androidPackage) {
  return source.replace(/^package com\.rupyaa\.loan\.security/m, `package ${androidPackage}.security`);
}

function insertAfterSuperOnCreate(contents, line) {
  const withoutExisting = contents
    .split('\n')
    .filter((sourceLine) => !sourceLine.includes(line))
    .join('\n');
  const match = withoutExisting.match(/super\.onCreate\([^)]*\)/);
  if (!match || match.index == null) {
    throw new Error('[withEarlySecurityBootstrap] super.onCreate(...) not found in MainApplication.kt.');
  }
  const insertAt = match.index + match[0].length;
  return `${withoutExisting.slice(0, insertAt)}\n    ${line}${withoutExisting.slice(insertAt)}`;
}

function registerPackage(contents, registrationLine) {
  if (contents.includes(registrationLine)) {
    return contents;
  }
  const applyBlockRegex = /(PackageList\(this\)\.packages\.apply\s*\{[\s\S]*?)(\n\s*\})/;
  if (!applyBlockRegex.test(contents)) {
    throw new Error(
      '[withEarlySecurityBootstrap] Could not locate PackageList apply block in MainApplication.kt.'
    );
  }
  return contents.replace(
    applyBlockRegex,
    (_match, prefix, closing) => `${prefix}\n              ${registrationLine}${closing}`
  );
}

function withEarlySecuritySources(config) {
  return withDangerousMod(config, [
    'android',
    async (configMod) => {
      const androidPackage = resolveAndroidPackage(configMod);
      const targetDir = path.join(
        configMod.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'java',
        androidPackage.replace(/\./g, path.sep),
        'security'
      );
      fs.mkdirSync(targetDir, { recursive: true });
      for (const fileName of KOTLIN_FILES) {
        const sourcePath = path.join(SOURCE_DIR, fileName);
        if (!fs.existsSync(sourcePath)) {
          throw new Error(`[withEarlySecurityBootstrap] Missing bundled source: ${sourcePath}`);
        }
        const source = fs.readFileSync(sourcePath, 'utf8');
        fs.writeFileSync(path.join(targetDir, fileName), rewritePackage(source, androidPackage));
      }
      return configMod;
    },
  ]);
}

function withEarlySecurityMainApplication(config) {
  return withDangerousMod(config, [
    'android',
    async (configMod) => {
      const androidPackage = resolveAndroidPackage(configMod);
      const mainAppPath = mainApplicationPath(configMod, androidPackage);
      if (!fs.existsSync(mainAppPath)) {
        throw new Error(`[withEarlySecurityBootstrap] MainApplication.kt not found at ${mainAppPath}`);
      }
      const installLine = `${androidPackage}.security.EarlySecurityBootstrap.install(this)`;
      const registrationLine = `add(${androidPackage}.security.EarlySecurityBootstrapPackage())`;
      const original = fs.readFileSync(mainAppPath, 'utf8');
      const withInstall = insertAfterSuperOnCreate(original, installLine);
      const updated = registerPackage(withInstall, registrationLine);
      if (updated !== original) {
        fs.writeFileSync(mainAppPath, updated);
      }
      return configMod;
    },
  ]);
}

function withEarlySecurityBootstrap(config) {
  let next = config;
  next = withEarlySecuritySources(next);
  next = withEarlySecurityMainApplication(next);
  return next;
}

module.exports = createRunOncePlugin(
  withEarlySecurityBootstrap,
  PLUGIN_NAME,
  PLUGIN_VERSION
);
