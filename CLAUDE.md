# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commit messages

When generating commit messages:

- Keep it short and clear.
- Use simple English.
- Output only the commit message.
- Describe the user-facing or code behavior change, not the files touched.
- Use a specific scope such as `auth`, `loan`, `api`, `onboarding`, `language`, `payment`, `profile`, `storage`, or `navigation`.
- Do not use vague messages like `update code`, `fix bug`, `changes`, or `minor fixes`.
- Use present tense, imperative style: `add`, `fix`, `handle`, `update`, `remove`.
- Keep the message under 72 characters when possible.
- Use this format:

```txt
type(scope): message
```

Allowed types:

```txt
feat, fix, refactor, chore, docs, style, test, perf, build, ci
```

Examples:

```txt
fix(auth): handle otp retry issue
feat(loan): add emi offer card
refactor(api): clean loan response
chore(env): update config
style(payment): improve emi card spacing
feat(language): add onboarding language gate
fix(storage): persist selected language flag
```

## Commands

```bash
npx expo start --clear        # dev server (alias: npm run dev)
npm run android               # expo run:android (native build, local device/emulator)
npm run ios                   # expo run:ios
npm run lint                  # expo lint (eslint-config-expo)
npm run typecheck             # tsc --noEmit
```

There is no test suite configured in this repo (no jest/vitest, no `test` script) — don't assume one exists.

### Native builds (EAS)

`eas.json` profiles: `development`, `preview`, `testflight` (extends preview, store distribution), `production`, plus `local`/`simulator` for on-machine builds without the EAS cloud.

```bash
npm run build-dev-android / build-prod-android / build-preview-android
npm run build-dev-ios / build-prod-ios / build-preview-ios / build-testflight-ios
npm run build-local-android        # local gradle build, no EAS cloud
npm run prebuild-android / prebuild-ios   # regenerate native projects (--clean)
```

### OTA updates (expo-updates)

```bash
npm run ota-development   # .env.preview, channel "development"
npm run ota-preview        # .env.preview, channel "preview"
npm run ota-production     # .env.production, channel "production"
```

Each OTA script runs `scripts/verify-ota-env.js` (fails fast if env file doesn't match the expected `EXPO_PUBLIC_APP_ENV`), then `updateversion.js`, then `eas update`. Don't run `eas update` directly — use these scripts so the version bump and env check happen first.

### Deep link testing (Android)

```bash
npm run deeplink:android        # custom scheme rupyaa://emi-calculator
npm run deeplink:android:https  # universal link https://rupyaa.com//emi-calculator
```

---

## Architecture

Expo SDK 54 + Expo Router (file-based routing) + TypeScript (strict), React 19 / React Native 0.81. State: Zustand stores (some persisted). Data fetching: TanStack React Query wrapping a custom `apiClient`. Forms: react-hook-form + zod.

Path alias `@/` maps to the repo root (`@/src/...`).

### Folder Structure

```
app/                    # Expo Router screens (file-based routing)
src/hooks/              # cross-cutting React hooks (app-startup, navigation service, deep links, push)
src/
  components/           # Reusable UI components, barrel-exported via index.ts
  config/               # Static config, feature flags, endpoint maps, flow/stage definitions
  data/                 # Mock data, fixtures
  services/<domain>/    # Business logic, API calls, one folder per domain (auth, loans, security, navigation, ...)
  store/                # Zustand stores
  theme/                # Colors, spacing, typography tokens — use these, not magic numbers/hex
  types/                # Shared TypeScript types, re-exported via types/index.ts
  utils/                # Pure, stateless helpers
```

### Placement Rules

- **Services**: Business logic, async operations, external integrations → `src/services/<domain>/`
- **Utils**: Pure, stateless helpers with no side effects → `src/utils/`
- **Hooks**: Reusable React logic → `src/hooks/`
- **Components**: UI only → `src/components/` with barrel export via `index.ts`

Each multi-file folder typically has an `index.ts` barrel; prefer importing from the barrel (`@/src/components`, `@/src/services/navigation`) over deep-importing a specific file when a barrel exists, except inside low-level modules where the barrel would create a Metro require cycle.

Require-cycle rules:

- Do not import `@/src/utils` from API, logging, storage, navigation, startup, or store internals. Import the specific utility file instead, e.g. `@/src/utils/devLogger`.
- Do not import `@/src/services/logging` from `src/utils` or API internals. Import the specific logging leaf file instead.
- Do not import `@/src/services/navigation` from API internals. Use a specific navigation module, or a lazy `import()` when navigation depends back on that API path.
- When Metro shows `Require cycle: A -> B -> ... -> A`, break the cycle by changing internal barrel imports to leaf imports before adding new code.

### Startup & routing gate

`app/index.tsx` is the only entry point with no UI of its own: it hydrates `useAuthStore`, calls `resolveInitialNavigation()` (`src/services/navigation/routeResolver.ts`), and replaces the route. That resolver walks a strict gate in order — onboarding seen → phone verified → app-config fetched (if session exists) → permissions granted → backend flow stage — before ever reaching `(tabs)/home`. `GATE_ROUTES` (onboarding/auth/permissions) intentionally swallow cold-start deep links; deep links are only honored once a user is past those gates. `app/(tabs)/_layout.tsx` re-runs an equivalent auth check on its own (tabs can stay mounted across reloads/deep links) — **this is intentional, not a duplicate**.

Deep link host/path mapping lives in `src/utils/route-map.ts` (`KNOWN_HTTPS_HOSTS`, `extractDeepLinkPath`, `mapNativeRoute`) and is consumed both by `routeResolver.ts` (cold start) and `src/hooks/useDeepLinkHandler.ts` (warm start), plus `app/+native-intent.tsx`.

### Loan journey wizard

The core product flow lives behind `app/loan-journey.tsx`, which renders `LoanWizard`. It is a single multi-phase wizard, not separate routed screens per step:

- `src/config/flowSteps.ts` — single source of truth for phases (`register → offer → kyc → disbursal`) and each phase's substeps/component ids. Reordering the journey means editing this file only.
- `src/store/useFlowStore.ts` (Zustand, persisted via `src/store/flowPersistence.ts`) — holds `phaseIndex`/`substepIndex`, `userStage` (backend-authoritative), passed-phase/substep trackers, and navigation actions (`next`, `prev`, `goTo`, `syncFromUserStage`).
- `src/config/userStages.ts` — backend `UserStagesInBackend` enum, which is the source of truth for where a user actually is; the wizard's local phase/substep position is synced from it, not the other way around.
- `src/services/navigation/stepNavigation.ts` / `flowRoutes.ts` — translate a flow position into navigation actions and resolve which route a given backend stage should land on.

`docs/LOAN_JOURNEY_FLOW.md` documents every step's API calls and side effects in detail (it was written for a Next.js web port) — check it before changing step ordering, validation, or per-step API behavior instead of re-deriving it from the components.

### API layer

`src/services/api/apiClient.ts` wraps `fetch` and always returns `ApiResponse<T>` (`{ success, data?, error? }`) — never throws for HTTP-level failures, only for unexpected errors. It auto-attaches auth headers (`buildRequestHeaders`), supports an internal mock mode (`apiConfig.useMockApi`, see `mockApi.ts`), encrypts request bodies and auto-detects/decrypts encrypted responses when `getEnableEncryption()` is on (`src/utils/crypto.ts`), and triggers `handleUnauthorizedResponse` on 401.

Per-domain hooks (`src/services/<domain>/use*.ts`) call `apiClient` and expose React Query hooks; endpoints are centralized in `src/config/api.ts` (`API_ENDPOINTS`). Follow `docs/API_INTEGRATION_GUIDE.md`'s 3-step pattern (endpoint → types → React Query hook) when adding new API integrations.

The API base URL is **not** purely env-driven: in release builds `src/config/envConfig.ts` resolves it from the `expo-updates` channel (`production`/`preview`/anything else falls back to staging), and only uses `EXPO_PUBLIC_API_URL` in `__DEV__`. Don't assume changing `.env` alone changes the deployed app's API target.

### External app config (remote feature flags)

`GET /external/config` is fetched at startup (`src/hooks/useExternalAppConfig.ts`, before the permissions gate) and cached in `useAppConfigStore`. It toggles which third-party provider is active per concern (face KYC, e-sign, bank verification, BSA flow, etc. — provider toggle objects), plus booleans like `googleAuth`/`byPassSmsPermission`, and SDK config (Hyperverge workflow id, Cashfree environment, Credeau device-sync settings). Read these through `src/config/resolvedAppConfig.ts` resolvers (which fall back to static config), not directly off the store, in step components.

### Device security (freeRASP / Talsec)

`freerasp-react-native` is initialized once at the root layout (`app/_layout.tsx`'s `FreeRaspInitializer`). On native release builds it is always on; on native `__DEV__` builds it is gated by `appConfig.enableFreeRaspInDev` because Fast Refresh can re-fire the effect before the native module's "already started" guard is set, crashing with "Array already consumed". `src/services/security/freeRaspActions.ts` maps each Talsec callback to a `SecurityThreatId` (`src/types/deviceSecurity.ts`) and routes it through `src/services/security/deviceSecurityService.ts`:

- Most threats (dev mode, debugger, VPN, emulator, etc.) call `recordJourneyBlockingThreat`, which adds to `useDeviceSecurityStore.blockingThreats[]`. This only blocks entry into the loan journey (`tryOpenLoanJourney`/`useLoanJourneyGuard`, used in `(tabs)/home.tsx`, `products/[productId].tsx`, `loan-journey.tsx`) — the rest of the app keeps working.
- Root/jailbreak (`privilegedAccess`) is treated as more severe: it both records a blocking threat *and* calls `handlePrivilegedAccessDetected`, which shows a non-cancelable alert and force-exits the app (`BackHandler.exitApp`).
- `resetDeviceSecuritySession()` exists only for `dev-panel.tsx` manual testing.

### State (Zustand stores, `src/store/`)

Notable ones beyond the flow store: `useAuthStore` (session/auth status, gates routing), `useAppConfigStore` (remote feature flags, see above), `deviceSecurityStore` (security threats, see above), `useCurrentOfferStore`, `useUserDetailsStore`, `updateStore` (in-app update modal state, mounted globally in `_layout.tsx` as `<UpdateModal />`).

---

## Coding Rules

### DRY Principles

- Business logic belongs in `src/services/` or `src/utils/`, not in components.
- If logic is used in 2+ places, extract it.
- No inline business logic in components — components orchestrate, services do the work:

```typescript
// BAD: Logic in component
const handleSubmit = async () => {
  const [a, b, c] = await Promise.all([getA(), getB(), getC()]);
  if (!a) router.replace('/x');
  else if (!b) router.replace('/y');
};

// GOOD: Logic in service, component orchestrates
const route = await resolveInitialRoute();
router.replace(route);
```

- All config in `src/config/`.
- Shared strings, routes, enums in config or types — never inline.
- Define interfaces in `src/types/`, re-export from `src/types/index.ts`.
- Use `type` for unions, `interface` for object shapes.

### React Native & Component Patterns

- Use functional components only.
- Order within a file: imports → component → styles → export.
- Colocate `StyleSheet.create` with the component.
- Extract reusable logic into custom hooks; components should focus on rendering:

```typescript
// BAD: Logic inline in component
const [data, setData] = useState();
useEffect(() => { fetchData().then(setData); }, []);

// GOOD: Logic in hook
const { data } = useFetchData();
```

- Use strict TypeScript — avoid `any`. Define props interfaces for all components.
- Export shared types from `src/types/`.
- **Low-end Android first**: avoid unnecessary re-renders, use `FlatList`/`SectionList` with stable `keyExtractor`, avoid inline functions in `renderItem` where it matters.
- **Async safety**: guard against setState-after-unmount, dedupe/disable-while-pending for anything triggered by a button (repeated taps), prefer cancellation (`AbortController`/flags) for in-flight requests when a screen unmounts.
- **JSX shape**: use early returns for loading/error/empty instead of nested ternaries or chained `&&` in JSX; compute booleans/derived values above the `return`, not inline. Avoid non-trivial `map`, ternary, or conditional logic directly inside JSX; extract small render methods/components when it improves readability.
- **Layout/grid math** (for any fixed-column row of cards): don't mix `space-between` + margins + `flex: 1`. Pick container `paddingHorizontal` + one `gap` + computed `itemWidth = floor((containerWidth - 2*padding - (n-1)*gap) / n)`. Don't size off `useWindowDimensions()`/screen width for anything inside a padded parent — measure via `onLayout` or accept `contentWidth` as a prop instead.

### Styling

- Use `colors`, `spacing`, `typography` from `@/src/theme` — no hardcoded hex/magic numbers.
- Prefer `StyleSheet.create` over inline styles for performance.
- Avoid inline styles for anything beyond a one-off.

### Storage Conventions

- All storage keys MUST be defined in `STORAGE_KEYS` in `src/constants/data.ts` — **never use raw string literals**:

```typescript
// BAD
AsyncStorage.getItem('hasSeenOnboarding');

// GOOD
AsyncStorage.getItem(STORAGE_KEYS.hasSeenOnboarding);
```

- Prefer `storageService` from `@/src/services/storage` over calling `AsyncStorage` directly for app-managed keys:

```typescript
// BAD
await AsyncStorage.multiRemove(['key1', 'key2']);

// GOOD
await storageService.clearAllAppStorage();
await storageService.clearKey('hasSeenOnboarding');
```

- Use `keyof typeof STORAGE_KEYS` when referencing keys. Storage values are strings — parse/serialize at the boundary.

### Comments

- Default to no comments, but do add a short comment for: non-obvious conditionals, parsing/mapping logic, error-handling/fallback branches, *why* a `useEffect` exists (not what it does), and temporary workarounds (with `TODO`).

### Security / Privacy

- **No PII in logs**: never log phone/Aadhaar/PAN/bank details/OTP, even in dev-only logging helpers.

---

## Preferred Libraries — Don't Suggest Alternatives

- **State**: Zustand only (not Redux/Jotai/Context for global state)
- **Forms**: react-hook-form + zod only
- **Data fetching**: TanStack React Query only
- **Navigation**: Expo Router only (not React Navigation directly)

---

## Never Do

- Don't call `AsyncStorage` directly — use `storageService`
- Don't use raw string keys for storage — use `STORAGE_KEYS` from `src/constants/data.ts`
- Don't deep-import when a barrel `index.ts` exists, except to prevent require cycles in low-level internals
- Don't run `eas update` directly — use the `npm run ota-*` scripts
- Don't read remote feature flags directly off the store — use `src/config/resolvedAppConfig.ts` resolvers
- Don't make breaking changes to `app.json` / `app.config.js` (permissions, scheme, associated domains) unless explicitly asked

---

## Known Intentional Patterns (Do Not "Fix")

- `app/(tabs)/_layout.tsx` re-runs auth check intentionally — tabs stay mounted across reloads/deep links
- `FreeRaspInitializer` has a dev-mode guard (`enableFreeRaspInDev`) — removing it causes a native crash on Fast Refresh
- `GATE_ROUTES` swallow cold-start deep links intentionally — deep links only resolve post-auth
- `resetDeviceSecuritySession()` exists only for `dev-panel.tsx` manual testing — not a bug
