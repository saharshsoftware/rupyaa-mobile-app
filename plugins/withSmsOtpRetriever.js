// plugins/withSmsOtpRetriever.js
//
// Expo config plugin that wires the Google SMS Retriever API into the
// Android build so the login OTP screen can auto-fill the code without
// requesting any SMS permissions.
//
// During `expo prebuild` this plugin:
//   1. Copies the bundled Kotlin module + package sources into
//      android/app/src/main/java/<package>/smsotp/
//   2. Registers SmsOtpRetrieverPackage() inside MainApplication.kt's
//      `getPackages()` list.
//   3. Adds the `play-services-auth-api-phone` Gradle dependency.
//
// No iOS work — Apple does not allow silent SMS reading.

const fs = require("fs");
const path = require("path");
const {
  createRunOncePlugin,
  withDangerousMod,
  withAppBuildGradle,
} = require("@expo/config-plugins");
const { mergeContents } = require("@expo/config-plugins/build/utils/generateCode");

const PLUGIN_NAME = "with-sms-otp-retriever";
const PLUGIN_VERSION = "1.0.0";

const KOTLIN_SOURCE_DIR = path.join(__dirname, "sms-otp-retriever");
const KOTLIN_FILES = ["SmsOtpRetrieverModule.kt", "SmsOtpRetrieverPackage.kt"];

// Pin the Play Services SMS Retriever SDK version. Bumping this requires a
// new prebuild + native build — keep in lockstep with other GMS deps.
const GMS_AUTH_API_PHONE = "com.google.android.gms:play-services-auth-api-phone:18.1.0";

const PACKAGE_REGISTRATION_LINE = "add(com.rupyaa.loan.smsotp.SmsOtpRetrieverPackage())";

/**
 * Copies bundled Kotlin sources into the generated Android project so
 * MainApplication.kt can reference SmsOtpRetrieverPackage.
 */
function withSmsOtpRetrieverNativeSources(config) {
  return withDangerousMod(config, [
    "android",
    async (configMod) => {
      const androidPackage = configMod.android?.package;
      if (!androidPackage) {
        throw new Error(
          "[withSmsOtpRetriever] android.package is not set in app config; cannot place native sources."
        );
      }

      const packagePath = androidPackage.replace(/\./g, path.sep);
      const targetDir = path.join(
        configMod.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "java",
        packagePath,
        "smsotp"
      );
      fs.mkdirSync(targetDir, { recursive: true });

      for (const fileName of KOTLIN_FILES) {
        const source = path.join(KOTLIN_SOURCE_DIR, fileName);
        if (!fs.existsSync(source)) {
          throw new Error(
            `[withSmsOtpRetriever] Missing bundled source: ${source}`
          );
        }
        const destination = path.join(targetDir, fileName);
        fs.copyFileSync(source, destination);
      }

      return configMod;
    },
  ]);
}

/**
 * Registers the package in MainApplication.kt by inserting an `add(...)` call
 * inside the `getPackages()` block. Idempotent — bails out if the line is
 * already present.
 */
function withSmsOtpRetrieverMainApplication(config) {
  return withDangerousMod(config, [
    "android",
    async (configMod) => {
      const androidPackage = configMod.android?.package;
      if (!androidPackage) return configMod;

      const packagePath = androidPackage.replace(/\./g, path.sep);
      const mainAppPath = path.join(
        configMod.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "java",
        packagePath,
        "MainApplication.kt"
      );

      if (!fs.existsSync(mainAppPath)) {
        // Java fallback for projects that haven't migrated to Kotlin yet.
        const mainAppJavaPath = mainAppPath.replace(/\.kt$/, ".java");
        if (!fs.existsSync(mainAppJavaPath)) {
          throw new Error(
            `[withSmsOtpRetriever] MainApplication not found at ${mainAppPath}`
          );
        }
        // This codebase ships Kotlin; bail rather than guess Java syntax.
        throw new Error(
          "[withSmsOtpRetriever] Only Kotlin MainApplication is supported."
        );
      }

      const original = fs.readFileSync(mainAppPath, "utf8");
      if (original.includes(PACKAGE_REGISTRATION_LINE)) {
        return configMod;
      }

      // Match the body of `PackageList(this).packages.apply { ... }` so we can
      // append our `add(...)` call alongside any future manual additions.
      // The default block ends with a closing brace right after the comment
      // "// add(MyReactNativePackage())".
      const applyBlockRegex = /(PackageList\(this\)\.packages\.apply\s*\{[\s\S]*?)(\n\s*\})/;
      if (!applyBlockRegex.test(original)) {
        throw new Error(
          "[withSmsOtpRetriever] Could not locate PackageList apply block in MainApplication.kt."
        );
      }

      const updated = original.replace(
        applyBlockRegex,
        (_match, prefix, closing) =>
          `${prefix}\n              ${PACKAGE_REGISTRATION_LINE}${closing}`
      );

      fs.writeFileSync(mainAppPath, updated, "utf8");
      return configMod;
    },
  ]);
}

/**
 * Adds the Play Services SMS Retriever Gradle dependency. Uses mergeContents
 * so the block is fenced and idempotent across re-runs of prebuild.
 */
function withSmsOtpRetrieverGradleDependency(config) {
  return withAppBuildGradle(config, (configMod) => {
    if (configMod.modResults.language !== "groovy") {
      throw new Error(
        "[withSmsOtpRetriever] Expected app build.gradle to be groovy."
      );
    }

    const merged = mergeContents({
      tag: "sms-otp-retriever",
      src: configMod.modResults.contents,
      newSrc: `    implementation '${GMS_AUTH_API_PHONE}'\n`,
      anchor: /dependencies\s*\{/,
      offset: 1,
      comment: "//",
    });

    configMod.modResults.contents = merged.contents;
    return configMod;
  });
}

function withSmsOtpRetriever(config) {
  let next = config;
  next = withSmsOtpRetrieverNativeSources(next);
  next = withSmsOtpRetrieverMainApplication(next);
  next = withSmsOtpRetrieverGradleDependency(next);
  return next;
}

module.exports = createRunOncePlugin(
  withSmsOtpRetriever,
  PLUGIN_NAME,
  PLUGIN_VERSION
);
