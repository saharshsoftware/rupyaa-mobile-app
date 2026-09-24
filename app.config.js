const PLAY_POLICY_BANNED_ANDROID_PERMISSIONS = [
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
  'android.permission.RECORD_AUDIO',
  'android.permission.WRITE_CONTACTS',
  'android.permission.READ_CONTACTS',
  // Play policy: do not declare freeRASP screen-capture detection permissions.
  'android.permission.DETECT_SCREEN_CAPTURE',
  'android.permission.DETECT_SCREEN_RECORDING',

  // Play policy: required for freeRASP to work
  "android.permission.USE_BIOMETRIC",
  "android.permission.USE_FINGERPRINT",
  "com.google.android.providers.gsf.permission.READ_GSERVICES",
];

export default ({ config }) => {
    const appEnv = process.env.EXPO_PUBLIC_APP_ENV ?? process.env.APP_ENV ?? 'development';
    const isDevelopment = appEnv === 'development';
    const isProduction = appEnv === 'production';
    const disableCrashlytics = process.env.DISABLE_CRASHLYTICS === "true";
    const buildPlatform = process.env.APP_PLATFORM ?? process.env.EAS_BUILD_PLATFORM;
    const isIos = buildPlatform === 'ios';
    
    const latestVersion = isDevelopment
      ? config.extra.versionDev
      : isIos
        ? config.extra.versionProdIos
        : config.extra.versionProd;

    return {
      ...config,
      version: latestVersion, // Dynamically set version from app.json
      // iOS Info.plist (privacy strings, UIBackgroundModes, URL schemes, etc.) lives in
      // app.json only — avoid duplicating ios.infoPlist here so TestFlight and local
      // builds stay aligned.
      ios: {
        ...config.ios,
       
        entitlements: {
          ...(config.ios?.entitlements ?? {}),
          'aps-environment': isProduction ? 'production' : 'development',
        },
      },
      android: {
        ...config.android,
        permissions: [
          ...(config.android?.permissions || []),
        ],
        // Block these at manifest-merge level so dependency manifests cannot
        // re-introduce them in cloud EAS production builds.
        blockedPermissions: Array.from(
          new Set([
            ...(config.android?.blockedPermissions || []),
            ...PLAY_POLICY_BANNED_ANDROID_PERMISSIONS,
          ])
        ),
        // Custom scheme is required when intentFilters is set — it overrides Expo's default
        // scheme filter from app.json `scheme: "rupyaa"`.
        intentFilters: [
          {
            action: 'VIEW',
            data: [{ scheme: 'rupyaa' }],
            category: ['BROWSABLE', 'DEFAULT'],
          },
        ],
      },
      plugins: [
        ...(config.plugins || []),
        // Android app size: R8 minification + resource shrinking (reduces APK/AAB size)
        // iOS: useFrameworks 'static' is required so Firebase Swift pods can import
        // their ObjC/C dependencies (GoogleUtilities, GoogleDataTransport, nanopb).
        // Without it, `pod install` fails with "cannot be integrated as static libraries".
        // This is the official React Native Firebase recommended fix and is safe to use
        // alongside other pods in this project.
        [
          "expo-build-properties",
          {
            android: {
              // Required by freeRASP; also set in freerasp plugin config for prebuild.
              minSdkVersion: 24,
              enableMinifyInReleaseBuilds: true,
              enableShrinkResourcesInReleaseBuilds: false,
              enableBundleCompression: true,
              useLegacyPackaging: true,
              // R8 optimisation: flatten every class into the root package and let R8
              // widen access modifiers. This turns on Play Console's "Repackage classes"
              // optimisation and improves the obfuscation/optimisation scores.
              extraProguardRules: [
                "-allowaccessmodification",
                "-repackageclasses ''",
              ].join("\n"),
            },
            ios: {
              useFrameworks: "static",
              buildReactNativeFromSource: true,
            },
          },
        ],
        // "./plugins/withRNFirebasePodFix",
        // ✅ Google Sign-In plugin
        [
          "@react-native-google-signin/google-signin",
        ],
        [
          "react-native-fbsdk-next",
          {
            appID: "1554116568996226",
            clientToken: "0d4eaa217f70d04edd4792cdb7873055",
            displayName: "Rupyaa",
            scheme: "fb1554116568996226",
            advertiserIDCollectionEnabled: false,
            autoLogAppEventsEnabled: true,
            isAutoInitEnabled: true,
            // Must match app.json ios.infoPlist.NSUserTrackingUsageDescription (FB SDK plugin writes this key).
            iosUserTrackingPermission:
              "We use this identifier to show you personalised offers and to measure the effectiveness of our ads.",
          },
        ],
        "@react-native-firebase/app",
        "@react-native-firebase/messaging",
        "@react-native-firebase/crashlytics",
        ["./plugins/withMobileGator", { market: "india", allowBackup: false, enableDesugaring: true }],
        "./plugins/withCashfreeSubscription",
        ["@config-plugins/react-native-adjust", { "targetAndroid12": true }],
        "./plugins/withAdjustMetaReferrer",
        // iOS: patches the Podfile so RNFB pods compile correctly under use_frameworks! :linkage => :static.
        // Sets $RNFirebaseAsStaticFramework = true (RNFB conditional compilation flag) and
        // CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES = YES (suppresses Xcode 16 header errors).
        // Must run after expo-build-properties so the Podfile already has use_frameworks! when patched.
        "./plugins/withRNFirebasePodFix",
        // Adds the in-repo SMS Retriever native module so the login OTP screen
        // can auto-fill the code on Android without any SMS permissions. No
        // iOS work; safe to keep before the permission-strip plugin below.
        "./plugins/withSmsOtpRetriever",
        "./plugins/withRemoveRestrictedPermissions", // MUST be last — strips Play Loans policy–banned permissions
      ],
      extra: {
        ...config.extra,
        isDevelopment,
        version: latestVersion, // Set version dynamically in extra
        otaUpdateNumber: isDevelopment
          ? config.extra?.otaUpdateNumberDev
          : config.extra?.otaUpdateNumberProd,
        environment: isDevelopment ? 'development' : 'production',
        disableCrashlytics: disableCrashlytics,
      },
      assetBundlePatterns: ['**/*'],
    };
  };
  
