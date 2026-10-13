# Expo SDK 57 upgrade — verification record

Verified on 2026-10-08. This upgrade is implemented but is **not release-verified**: native builds and the complete device journey remain blocked.

## Versions and compatibility changes

- Expo 54.0.36 → 57.0.27 (npm `latest`; SDK 58 is on `next`).
- React Native 0.81.5 → 0.86.3; React/React DOM 19.1.0 → 19.2.3.
- Expo modules, Reanimated 4.5.1, Worklets 0.10.1, Gesture Handler, Screens, Safe Area, SVG, WebView, Lottie, React types, Babel, TypeScript 6.0.3, and Expo ESLint aligned with the SDK compatibility map.
- Adjust config plugin upgraded to 14.0.2 for its Expo >=56 peer requirement.
- Navigation theme, focus hooks, tab height hook, and custom tab context now come from Expo Router; removed separate React Navigation packages. Updated the removed Router type to ImperativeRouter.
- Replaced removed StyleSheet.absoluteFillObject with absoluteFill and removed unsupported status bar properties. No intended layout or business-flow changes.
- Metro sets EXPO_PUBLIC_USE_RN_FETCH=1 for every bundle to preserve React Native's transport used by native SSL pinning. Expo's default fetch changed in SDK 56. Physical-device positive and negative pinning tests remain required.
- Network logger upgraded to 3.0.0, which owns its XHR interceptor instead of importing removed React Native private paths.
- API encryption explicitly imports Buffer rather than relying on an undeclared global fallback.
- Fixed existing invalid module-level KYC useCallback and conditional hooks in two dev toolbars. JSX escaping retains the same displayed text; Node script globals are recognized by lint.
- Three newly enabled React Compiler lint rules remain visible as warnings (refs, set-state-in-effect, immutability), avoiding broad unrelated component rewrites. Rules-of-hooks remains an error.
- Applied non-breaking npm audit fixes. No forced major-version audit changes.
- Firebase's six packages remain aligned at 23.8.6; no unsupported claim of native SDK 57 compatibility is made before compiling and testing them.

Release references: https://expo.dev/changelog/sdk-57 and https://expo.dev/changelog/sdk-56.
SDK 57 requires iOS 16.4 or newer and Xcode 26.4 or newer. The local Xcode is 27.0. Older iOS support cannot be preserved with this SDK.

## Checks performed

| Check | Result |
| --- | --- |
| Baseline TypeScript | Passed |
| Baseline lint | 18 errors, 164 warnings |
| Final `npm run typecheck` | Passed |
| Final `npm run lint` | Passed with 0 errors, 324 warnings, including newly enabled compiler diagnostics |
| `npm run verify:sdk-upgrade` | 31 checks passed |
| Production Android + iOS `expo export` | Both passed; Hermes bundles and 153 assets generated under `/tmp/rupyaa-sdk57-export-final` |
| Native dependency graph (`npm ls --depth=0`) | Passed |
| Expo Doctor | 19/20 passed; obsolete app.json field remains pending permission |
| Android prebuild | Passed |
| `npm run android -- --no-bundler` | Failed during private S3 dependency resolution: `Access key cannot be null` |
| `npm run prebuild-ios -- --no-install` | Failed: `GoogleService-Info.plist is empty` |
| Dependency audit after safe fixes | 44 advisories: 11 moderate, 33 high; no critical advisories remaining |
| `git diff --check` | Passed |

The standalone regression command uses the actual TypeScript functions with fake storage, native, and network boundaries. It checks language/onboarding/phone/permission/session gates, cold-start links, session expiry during config fetch, backend-stage-to-wizard mapping, back navigation, auth headers, HTTP errors/401 handling, timeout handling, multipart upload preservation, encrypted request/response handling, AES-GCM interoperability with Node crypto, and tamper rejection. It does not send requests or create financial records.

The exported bundles no longer contain the Expo fetch initialization assertion after opting into React Native fetch. This checks bundling, not certificate enforcement on a device.

## Remaining blockers and release checks

1. `app.json` still includes `newArchEnabled: true`, rejected by the SDK 57 schema because the New Architecture is mandatory. Remove that single property after explicit approval: AGENTS.md says “Do not change app.json or app.config.js unless explicitly asked.” Permission was requested; these files were left unchanged.
2. Supply the valid Firebase `GoogleService-Info.plist` for this app. The tracked file has zero bytes. Repeat iOS prebuild and `npm run ios`; then run a signed release build with the existing npm scripts. Do not substitute placeholder Firebase credentials to claim a successful build.
3. Supply MobileGator's private repository credentials through the configured environment (`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`, or the MOBILEGATOR equivalents). Then rerun the Android script. Native compilation did not progress far enough to prove Firebase, Cashfree, freeRASP, custom SMS, or collect-data compatibility.
4. Before release, choose new native app versions/runtime identities. Current OTA policy is `appVersion`, and the configured app versions were not changed. An SDK 57 update must not target SDK 54 binaries with the same runtime version. Build new development and release binaries; do not ship this migration as an OTA-only change.
5. On Android and iOS devices with staging access, verify fresh install, language/onboarding, OTP/resend/autofill, session restore/logout/expiry, permission deny/retry, cold/warm deep links, tabs/back navigation, and every backend-authoritative loan stage. Exercise eligibility/offer rejection, bank linking/manual upload, DigiLocker, face KYC, eNACH, e-sign, disbursal, and repayment callbacks.
6. Verify Firebase installation IDs, analytics, push permission/token delivery and taps, and Crashlytics; also SSL valid/invalid pins, offline/timeouts, camera/WebView handoffs, device security, and foreground/background resume. No complete interactive journey or live integration was verified in this run.
7. Review the remaining dependency advisories with upstream maintainers. Automated force fixes recommend incompatible major versions/downgrades and were not applied.

The journey/API guides named by AGENTS.md are absent from this checkout. The implementation was reviewed directly. Startup/tab authentication gates, backend stage authority, freeRASP initialization/dev guard, API response semantics, permissions, schemes, and associated domains were preserved.
