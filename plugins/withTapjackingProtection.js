// plugins/withTapjackingProtection.js
//
// Hardens MainActivity against Android overlay / tapjacking attacks:
// - filterTouchesWhenObscured on the decor view
// - reject obscured / partially obscured MotionEvents in dispatchTouchEvent
// - hide non-system overlay windows on API 31+ (requires HIDE_OVERLAY_WINDOWS)

const fs = require("fs");
const path = require("path");
const {
  AndroidConfig,
  createRunOncePlugin,
  withAndroidManifest,
  withDangerousMod,
} = require("@expo/config-plugins");

const PLUGIN_NAME = "with-tapjacking-protection";
const PLUGIN_VERSION = "1.0.0";
const MARKER = "tapjacking-protection";

const HIDE_OVERLAY_WINDOWS_PERMISSION = "android.permission.HIDE_OVERLAY_WINDOWS";

const ON_CREATE_BLOCK = `    // @generated begin ${MARKER} - expo prebuild (DO NOT MODIFY) sync-${PLUGIN_VERSION}
    window.decorView.filterTouchesWhenObscured = true
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      window.setHideOverlayWindows(true)
    }
    // @generated end ${MARKER}`;

const DISPATCH_TOUCH_EVENT_BLOCK = `  // @generated begin ${MARKER}-dispatch - expo prebuild (DO NOT MODIFY) sync-${PLUGIN_VERSION}
  override fun dispatchTouchEvent(event: MotionEvent): Boolean {
    val flags = event.flags
    if ((flags and MotionEvent.FLAG_WINDOW_IS_OBSCURED) != 0 ||
        (flags and MotionEvent.FLAG_WINDOW_IS_PARTIALLY_OBSCURED) != 0) {
      return false
    }
    return super.dispatchTouchEvent(event)
  }
  // @generated end ${MARKER}-dispatch`;

function withTapjackingProtectionManifest(config) {
  return withAndroidManifest(config, (cfg) => {
    AndroidConfig.Manifest.ensureToolsAvailable(cfg.modResults);
    AndroidConfig.Permissions.ensurePermission(
      cfg.modResults,
      HIDE_OVERLAY_WINDOWS_PERMISSION
    );
    return cfg;
  });
}

function withTapjackingProtectionMainActivity(config) {
  return withDangerousMod(config, [
    "android",
    async (configMod) => {
      const androidPackage = configMod.android?.package;
      if (!androidPackage) {
        throw new Error(
          "[withTapjackingProtection] android.package is not set in app config."
        );
      }

      const packagePath = androidPackage.replace(/\./g, path.sep);
      const mainActivityPath = path.join(
        configMod.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "java",
        packagePath,
        "MainActivity.kt"
      );

      if (!fs.existsSync(mainActivityPath)) {
        throw new Error(
          `[withTapjackingProtection] MainActivity not found at ${mainActivityPath}`
        );
      }

      let contents = fs.readFileSync(mainActivityPath, "utf8");

      if (!contents.includes(`import android.view.MotionEvent`)) {
        const importBlockRegex = /^import .+$/gm;
        const imports = contents.match(importBlockRegex) ?? [];
        const lastImport = imports[imports.length - 1];
        if (!lastImport) {
          throw new Error(
            "[withTapjackingProtection] Could not locate import block in MainActivity.kt."
          );
        }
        contents = contents.replace(
          lastImport,
          `${lastImport}\nimport android.view.MotionEvent`
        );
      }

      if (!contents.includes(`@generated begin ${MARKER}`)) {
        const onCreateRegex = /(super\.onCreate\([^\)]*\))/;
        if (!onCreateRegex.test(contents)) {
          throw new Error(
            "[withTapjackingProtection] Could not locate super.onCreate() in MainActivity.kt."
          );
        }
        contents = contents.replace(onCreateRegex, `$1\n${ON_CREATE_BLOCK}`);
      }

      if (!contents.includes(`@generated begin ${MARKER}-dispatch`)) {
        const invokeBackRegex = /(\n\s*\/\*\*\s*\n\s*\* Align the back button behavior)/;
        if (!invokeBackRegex.test(contents)) {
          throw new Error(
            "[withTapjackingProtection] Could not locate invokeDefaultOnBackPressed comment in MainActivity.kt."
          );
        }
        contents = contents.replace(
          invokeBackRegex,
          `\n${DISPATCH_TOUCH_EVENT_BLOCK}$1`
        );
      }

      fs.writeFileSync(mainActivityPath, contents, "utf8");
      return configMod;
    },
  ]);
}

function withTapjackingProtection(config) {
  let next = config;
  next = withTapjackingProtectionManifest(next);
  next = withTapjackingProtectionMainActivity(next);
  return next;
}

module.exports = createRunOncePlugin(
  withTapjackingProtection,
  PLUGIN_NAME,
  PLUGIN_VERSION
);
