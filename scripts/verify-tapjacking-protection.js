#!/usr/bin/env node
/**
 * Verifies tapjacking protection is present in MainActivity.kt after prebuild.
 * Run after: npm run prebuild-android
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MAIN_ACTIVITY = path.join(
  ROOT,
  'android',
  'app',
  'src',
  'main',
  'java',
  'com',
  'rupyaa',
  'loan',
  'MainActivity.kt'
);

const REQUIRED_SNIPPETS = [
  'filterTouchesWhenObscured = true',
  'setHideOverlayWindows(true)',
  'dispatchTouchEvent(event: MotionEvent)',
  'FLAG_WINDOW_IS_OBSCURED',
  'FLAG_WINDOW_IS_PARTIALLY_OBSCURED',
];

function fail(message) {
  console.error(`[verify:tapjacking-protection] ${message}`);
  process.exit(1);
}

if (!fs.existsSync(MAIN_ACTIVITY)) {
  fail(
    `MainActivity.kt not found at ${MAIN_ACTIVITY}. Run npm run prebuild-android first.`
  );
}

const contents = fs.readFileSync(MAIN_ACTIVITY, 'utf8');
const missing = REQUIRED_SNIPPETS.filter((snippet) => !contents.includes(snippet));

if (missing.length > 0) {
  fail(`Missing tapjacking protection snippets:\n- ${missing.join('\n- ')}`);
}

console.log('[verify:tapjacking-protection] OK — MainActivity includes overlay touch filtering.');
