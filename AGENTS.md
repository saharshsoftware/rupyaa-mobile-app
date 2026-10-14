# AGENTS.md

This file provides guidance to Codex when working in this repository.

## Commit messages

When generating commit messages:

* Keep it short and clear
* Use simple English
* Output only the commit message
* Describe the user-facing or code behavior change, not the files touched
* Use a specific scope such as `auth`, `loan`, `api`, `onboarding`, `language`, `payment`, `profile`, `storage`, or `navigation`
* Do not use vague messages like `update code`, `fix bug`, `changes`, or `minor fixes`
* Use present tense, imperative style: `add`, `fix`, `handle`, `update`, `remove`
* Keep the message under 72 characters when possible
* Use this format:

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

---

## Commands

```bash
npx expo start --clear
npm run android
npm run ios
npm run lint
npm run typecheck
```

There is no test suite configured in this repo. Do not assume `npm test`, Jest, or Vitest exists.

## Native builds

Use existing npm scripts for builds.

```bash
npm run build-dev-android
npm run build-prod-android
npm run build-preview-android

npm run build-dev-ios
npm run build-prod-ios
npm run build-preview-ios
npm run build-testflight-ios

npm run build-local-android
npm run prebuild-android
npm run prebuild-ios
```

## OTA updates

Do not run `eas update` directly.

Use:

```bash
npm run ota-development
npm run ota-preview
npm run ota-production
```

These scripts verify env, update version, then run EAS update.

## Deep link testing

```bash
npm run deeplink:android
npm run deeplink:android:https
```

---

## Project stack

* Expo SDK 54
* Expo Router
* TypeScript strict mode
* React 19
* React Native 0.81
* Zustand for state
* TanStack React Query for API/data fetching
* react-hook-form + zod for forms
* Path alias `@/` maps to repo root

---

## Folder structure

```txt
app/                    # Expo Router screens
src/
  components/           # reusable UI components
  config/               # config, flags, endpoint maps, flow definitions
  data/                 # mock data and fixtures
  hooks/                # shared React hooks
  services/             # business logic and API calls
  store/                # Zustand stores
  theme/                # colors, spacing, typography
  types/                # shared TypeScript types
  utils/                # pure helper functions
```

## Placement rules

* Business logic goes in `src/services/<domain>/`
* Pure helpers go in `src/utils/`
* Reusable hooks go in `src/hooks/`
* UI components go in `src/components/`
* Config goes in `src/config/`
* Shared types go in `src/types/`

Prefer barrel imports when `index.ts` exists, except inside low-level modules where the barrel would create a require cycle.

Good:

```ts
import { Button } from '@/src/components';
```

Avoid deep imports when barrel exists, unless a leaf import is needed to prevent a Metro require cycle.

Require-cycle rules:

* Do not import `@/src/utils` from API, logging, storage, navigation, startup, or store internals. Import the specific utility file instead, e.g. `@/src/utils/devLogger`.
* Do not import `@/src/services/logging` from `src/utils` or API internals. Import the specific logging leaf file instead.
* Do not import `@/src/services/navigation` from API internals. Use a specific navigation module, or a lazy `import()` when navigation depends back on that API path.
* When Metro shows `Require cycle: A -> B -> ... -> A`, break the cycle by changing internal barrel imports to leaf imports before adding new code.

---

## Routing rules

`app/index.tsx` is the startup entry point.

It hydrates auth store, resolves initial route, and redirects user based on gates.

Do not remove or bypass these gates:

* onboarding seen
* phone verified
* app config fetched
* permissions granted
* backend flow stage

`app/(tabs)/_layout.tsx` re-runs auth check intentionally. Do not treat it as duplicate logic.

Deep links are swallowed by gate routes until user is past auth/onboarding gates. This is intentional.

---

## Loan journey rules

Loan journey is handled by:

```txt
app/loan-journey.tsx
```

It renders `LoanWizard`.

Important files:

```txt
src/config/flowSteps.ts
src/store/useFlowStore.ts
src/config/userStages.ts
src/services/navigation/stepNavigation.ts
src/services/navigation/flowRoutes.ts
```

Rules:

* `flowSteps.ts` is the source of truth for wizard phase/substep order.
* Backend `userStage` is authoritative.
* Local wizard position must sync from backend stage.
* Before changing step order or API behavior, check:

```txt
docs/LOAN_JOURNEY_FLOW.md
```

---

## API rules

Use:

```txt
src/services/api/apiClient.ts
```

Rules:

* API client returns `ApiResponse<T>`
* Do not throw for HTTP-level failures
* Use centralized endpoints from:

```txt
src/config/api.ts
```

* Follow this pattern for new APIs:

```txt
endpoint → types → React Query hook
```

* Check:

```txt
docs/API_INTEGRATION_GUIDE.md
```

API base URL is not only env based.

In release builds, it is resolved using `expo-updates` channel.

Do not assume changing `.env` alone changes deployed API target.

---

## Remote app config

External config is fetched from:

```txt
GET /external/config
```

Use resolvers from:

```txt
src/config/resolvedAppConfig.ts
```

Do not read remote feature flags directly from Zustand store in components.

---

## Device security

freeRASP is initialized once in:

```txt
app/_layout.tsx
```

Rules:

* Do not remove `FreeRaspInitializer`
* Do not remove dev guard
* Most threats block only loan journey
* Root/jailbreak exits app
* `resetDeviceSecuritySession()` is only for dev panel testing

Important files:

```txt
src/services/security/freeRaspActions.ts
src/services/security/deviceSecurityService.ts
src/types/deviceSecurity.ts
src/store/deviceSecurityStore.ts
```

---

## Coding rules

* Use functional components only
* Use strict TypeScript
* Avoid `any`
* Define props interfaces
* Keep business logic out of components
* Extract repeated logic into services, utils, or hooks
* Use early returns for loading/error/empty states
* Avoid nested ternaries in JSX
* Avoid non-trivial `map`, ternary, or conditional logic directly inside JSX; compute values above `return` or extract small render methods/components
* Compute derived values above return
* Disable buttons while async action is pending
* Guard against setState after unmount
* Avoid unnecessary re-renders on low-end Android

File order:

```txt
imports → component → styles → export
```

---

## Styling rules

Use theme tokens from:

```txt
@/src/theme
```

Avoid:

* hardcoded hex colors
* magic spacing numbers
* large inline styles

Prefer:

```ts
StyleSheet.create(...)
```

---

## Storage rules

Do not call AsyncStorage directly.

Use:

```txt
src/services/storage
```

All storage keys must come from:

```txt
STORAGE_KEYS
```

in:

```txt
src/constants/data.ts
```

Bad:

```ts
AsyncStorage.getItem('hasSeenOnboarding');
```

Good:

```ts
AsyncStorage.getItem(STORAGE_KEYS.hasSeenOnboarding);
```

Better:

```ts
storageService.clearKey('hasSeenOnboarding');
```

---

## Comments

Default to no comments.

Add short comments only for:

* non-obvious logic
* parsing or mapping logic
* fallback branches
* why a `useEffect` exists
* temporary workaround with TODO

---

## Security and privacy

Never log PII.

Do not log:

* phone number
* Aadhaar
* PAN
* bank details
* OTP
* user personal details

This applies even in dev logs.

---

## Preferred libraries

Do not suggest alternatives.

Use only:

* Zustand for global state
* react-hook-form + zod for forms
* TanStack React Query for data fetching
* Expo Router for navigation

Do not suggest:

* Redux
* Jotai
* Context for global state
* React Navigation directly

---

## Never do

* Do not call AsyncStorage directly
* Do not use raw storage keys
* Do not deep-import when barrel export exists, except to prevent require cycles in low-level internals
* Do not run `eas update` directly
* Do not read remote flags directly from store
* Do not change `app.json` or `app.config.js` unless explicitly asked
* Do not change permissions, scheme, or associated domains unless explicitly asked
* Do not assume a test suite exists

---

## Intentional patterns

Do not “fix” these:

* Auth check in `app/(tabs)/_layout.tsx`
* freeRASP dev-mode guard
* `GATE_ROUTES` swallowing cold-start deep links
* `resetDeviceSecuritySession()` used only for dev panel testing
