/* global __dirname */
const fs = require('fs');
const path = require('path');
const { createRunOncePlugin, withDangerousMod } = require('@expo/config-plugins');

const PLUGIN_NAME = 'with-api-http-cache-security';
const PLUGIN_VERSION = '1.0.0';
const SOURCE_FILE = path.join(__dirname, 'api-http-cache-security', 'ApiHttpCacheSecurity.kt');

function resolveAndroidPackage(configMod) {
  const androidPackage = configMod.android?.package;
  if (!androidPackage) {
    throw new Error('[withApiHttpCacheSecurity] android.package is not set.');
  }
  return androidPackage;
}

function insertAfterSuperOnCreate(contents, line) {
  const withoutExisting = contents
    .split('\n')
    .filter((sourceLine) => !sourceLine.includes(line))
    .join('\n');
  const match = withoutExisting.match(/super\.onCreate\([^)]*\)/);
  if (!match || match.index == null) {
    throw new Error('[withApiHttpCacheSecurity] super.onCreate(...) not found in MainApplication.kt.');
  }
  const insertAt = match.index + match[0].length;
  return `${withoutExisting.slice(0, insertAt)}\n    ${line}${withoutExisting.slice(insertAt)}`;
}

function withApiHttpCacheSources(config) {
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
      if (!fs.existsSync(SOURCE_FILE)) {
        throw new Error(`[withApiHttpCacheSecurity] Missing bundled source: ${SOURCE_FILE}`);
      }
      const source = fs.readFileSync(SOURCE_FILE, 'utf8');
      const rewritten = source.replace(
        /^package com\.rupyaa\.loan\.security/m,
        `package ${androidPackage}.security`
      );
      fs.writeFileSync(path.join(targetDir, 'ApiHttpCacheSecurity.kt'), rewritten);
      return configMod;
    },
  ]);
}

function withApiHttpCacheMainApplication(config) {
  return withDangerousMod(config, [
    'android',
    async (configMod) => {
      const androidPackage = resolveAndroidPackage(configMod);
      const mainAppPath = path.join(
        configMod.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'java',
        androidPackage.replace(/\./g, path.sep),
        'MainApplication.kt'
      );
      if (!fs.existsSync(mainAppPath)) {
        throw new Error(`[withApiHttpCacheSecurity] MainApplication.kt not found at ${mainAppPath}`);
      }
      const installLine = `${androidPackage}.security.ApiHttpCacheSecurity.install(this)`;
      const original = fs.readFileSync(mainAppPath, 'utf8');
      const updated = insertAfterSuperOnCreate(original, installLine);
      if (updated !== original) {
        fs.writeFileSync(mainAppPath, updated);
      }
      return configMod;
    },
  ]);
}

function withApiHttpCacheSecurity(config) {
  let next = config;
  next = withApiHttpCacheSources(next);
  next = withApiHttpCacheMainApplication(next);
  return next;
}

module.exports = createRunOncePlugin(withApiHttpCacheSecurity, PLUGIN_NAME, PLUGIN_VERSION);
