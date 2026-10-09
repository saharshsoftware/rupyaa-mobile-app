const fs = require('fs');
const path = require('path');
const {
  AndroidConfig,
  createRunOncePlugin,
  withAndroidManifest,
  withDangerousMod,
} = require('@expo/config-plugins');

const PLUGIN_NAME = 'with-tapjacking-protection';
const PLUGIN_VERSION = '1.0.0';
const HIDE_OVERLAY_PERMISSION = 'android.permission.HIDE_OVERLAY_WINDOWS';

const DISPATCH_TOUCH_EVENT = `
  override fun dispatchTouchEvent(ev: android.view.MotionEvent): Boolean {
    val obscured = (ev.flags and android.view.MotionEvent.FLAG_WINDOW_IS_OBSCURED) != 0
    val partiallyObscured = (ev.flags and android.view.MotionEvent.FLAG_WINDOW_IS_PARTIALLY_OBSCURED) != 0
    if (obscured || partiallyObscured) {
      return false
    }
    return super.dispatchTouchEvent(ev)
  }
`;

const HIDE_OVERLAY_CALL = `if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
      window.setHideOverlayWindows(true)
    }`;

function withHideOverlayPermission(config) {
  return withAndroidManifest(config, (configMod) => {
    AndroidConfig.Permissions.ensurePermissions(configMod.modResults, [HIDE_OVERLAY_PERMISSION]);
    return configMod;
  });
}

function insertAfterSuperOnCreate(contents, line) {
  if (contents.includes('setHideOverlayWindows')) {
    return contents;
  }
  const match = contents.match(/super\.onCreate\([^)]*\)/);
  if (!match || match.index == null) {
    throw new Error('[withTapjackingProtection] super.onCreate(...) not found in MainActivity.kt.');
  }
  const insertAt = match.index + match[0].length;
  return `${contents.slice(0, insertAt)}\n    ${line}${contents.slice(insertAt)}`;
}

function insertDispatchTouchEvent(contents) {
  if (contents.includes('dispatchTouchEvent')) {
    return contents;
  }
  const lastBrace = contents.lastIndexOf('}');
  if (lastBrace < 0) {
    throw new Error('[withTapjackingProtection] Could not find class closing brace in MainActivity.kt.');
  }
  return `${contents.slice(0, lastBrace)}${DISPATCH_TOUCH_EVENT}\n${contents.slice(lastBrace)}`;
}

function withTapjackingMainActivity(config) {
  return withDangerousMod(config, [
    'android',
    async (configMod) => {
      const androidPackage = configMod.android?.package;
      if (!androidPackage) {
        throw new Error('[withTapjackingProtection] android.package is not set.');
      }
      const mainActivityPath = path.join(
        configMod.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'java',
        androidPackage.replace(/\./g, path.sep),
        'MainActivity.kt'
      );
      if (!fs.existsSync(mainActivityPath)) {
        throw new Error(`[withTapjackingProtection] MainActivity.kt not found at ${mainActivityPath}`);
      }
      const original = fs.readFileSync(mainActivityPath, 'utf8');
      const withHide = insertAfterSuperOnCreate(original, HIDE_OVERLAY_CALL);
      const updated = insertDispatchTouchEvent(withHide);
      if (updated !== original) {
        fs.writeFileSync(mainActivityPath, updated);
      }
      return configMod;
    },
  ]);
}

function withTapjackingProtection(config) {
  let next = config;
  next = withHideOverlayPermission(next);
  next = withTapjackingMainActivity(next);
  return next;
}

module.exports = createRunOncePlugin(withTapjackingProtection, PLUGIN_NAME, PLUGIN_VERSION);
