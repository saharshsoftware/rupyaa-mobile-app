const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const ts = require('typescript');

// Exercise real TypeScript modules with native/network boundaries replaced by local fakes.
const root = path.resolve(__dirname, '..');
function loader(mocks = {}) {
  const cache = new Map();
  function load(file) {
    const absolute = path.resolve(root, file);
    if (cache.has(absolute)) return cache.get(absolute).exports;
    const module = { exports: {} };
    cache.set(absolute, module);
    const code = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const localRequire = (name) => {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      if (name.startsWith('@/')) return load(`${name.slice(2)}.ts`);
      if (name.startsWith('.')) return load(`${path.resolve(path.dirname(absolute), name)}.ts`);
      return require(name);
    };
    vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: absolute })(localRequire, module, module.exports);
    return module.exports;
  }
  return load;
}

async function main() {
  let checks = 0;
  const check = async (name, run) => { await run(); checks++; console.log(`PASS ${name}`); };
  const load = loader();
  const flow = load('src/config/flowSteps.ts');
  const progress = load('src/utils/flowProgress.ts');
  const routes = load('src/utils/route-map.ts');
  const expected = {
    PERSONAL_DETAILS: 'personal-details', MODE_OF_EMPLOYMENT: 'employment-type',
    SOFT_PULL: 'soft-pull', BANK_STATEMENT: 'bank-connect', OFFERINGS: 'approved-offer',
    BANK_DETAILS: 'bank-details', AADHAAR_KYC: 'digilocker', FACE_KYC: 'face-kyc',
    ENACH: 'enach', ESIGN: 'esign', WAITING_FOR_DISBURSEMENT: 'sanctioned',
  };
  for (const [stage, step] of Object.entries(expected)) {
    await check(`backend stage ${stage} resumes ${step}`, () => {
      const position = progress.resolveFlowPositionFromUserStage(stage);
      assert.equal(progress.getFlowJourneySummary(position.phaseIndex, position.substepIndex).substepId, step);
    });
  }
  await check('all backend stages resolve to existing wizard steps', () => {
    for (const stage of load('src/config/userStages.ts').USER_STAGES) {
      const p = progress.resolveFlowPositionFromUserStage(stage);
      assert.ok(flow.FLOW_CONFIG[flow.FLOW_PHASES[p.phaseIndex]].substeps[p.substepIndex]);
    }
  });
  for (const parsed of [
    { hostname: 'repayment', path: '' },
    { hostname: '', path: 'repayment' },
    { hostname: 'rupyaa.com', path: 'repayment' },
  ]) await check(`repayment deep link: ${parsed.hostname || 'triple slash'}`, () => {
    assert.equal(routes.mapNativeRoute(routes.extractDeepLinkPath(parsed)), '/payment');
  });

  const flags = { hasSelectedLanguage: 'true', hasSeenOnboarding: 'true', isPhoneVerified: 'true', hasGrantedPermissions: 'true' };
  let session = true;
  let permissions = true;
  let configCalls = 0;
  let expireDuringConfig = false;
  const gateLoad = loader({
    '@react-native-async-storage/async-storage': { getItem: async (key) => flags[key] ?? null },
    '@/src/constants/data': { STORAGE_KEYS: Object.fromEntries(Object.keys(flags).map((key) => [key, key])) },
    'expo-linking': { getInitialURL: async () => 'rupyaa://repayment', parse: () => ({ hostname: 'repayment', path: '' }) },
    '@/src/services/auth/session': { hasValidSession: async () => session },
    '@/src/services/permissions': { areRequiredAppPermissionsGranted: async () => permissions },
    '@/src/hooks/useExternalAppConfig': { fetchAndStoreAppConfig: async () => { configCalls++; if (expireDuringConfig) session = false; } },
    './flowRoutes': { resolveFlowRoute: async () => '/(tabs)/home' },
    '@/src/utils/common-helper': { consoleLogDev: () => {} },
    '@/src/config/appConfig': { appConfig: { enableOnboarding: true } },
  });
  const gate = gateLoad('src/services/navigation/routeResolver.ts');
  for (const [flag, target] of [
    ['hasSelectedLanguage', '/onboarding-language'], ['hasSeenOnboarding', '/onboarding'],
    ['isPhoneVerified', '/auth/mobile-verification'], ['hasGrantedPermissions', '/permissions'],
  ]) await check(`${flag} gate swallows cold-start payment link`, async () => {
    flags[flag] = null;
    assert.equal(await gate.resolveInitialNavigation(), target);
    flags[flag] = 'true';
  });
  await check('revoked native permissions block navigation', async () => {
    permissions = false;
    assert.equal(await gate.resolveInitialNavigation(), '/permissions');
    permissions = true;
  });
  await check('missing session returns to authentication', async () => {
    session = false;
    assert.equal(await gate.resolveInitialNavigation(), '/auth/mobile-verification');
    session = true;
  });
  await check('401 during app config cannot bypass auth gate', async () => {
    expireDuringConfig = true;
    assert.equal(await gate.resolveInitialNavigation(), '/auth/mobile-verification');
    expireDuringConfig = false;
    session = true;
  });
  await check('authenticated user reaches payment deep link after config', async () => {
    const before = configCalls;
    assert.equal(await gate.resolveInitialNavigation(), '/payment');
    assert.equal(configCalls, before + 1);
  });

  const secret = 'sdk-upgrade-local-fixture';
  const cipherLoad = loader({
    'expo-crypto': {
      CryptoDigestAlgorithm: { SHA256: 'sha256' },
      digestStringAsync: async (algorithm, value) => crypto.createHash(algorithm).update(value).digest('hex'),
      getRandomBytesAsync: async (length) => crypto.randomBytes(length),
    },
    '@/src/config/resolvedAppConfig': { getEncryptionSecret: () => secret },
  });
  const cipher = cipherLoad('src/utils/crypto.ts');
  const plain = JSON.stringify({ message: 'SDK regression नमस्ते', amount: 42 });
  await check('API encryption matches Node AES-128-GCM wire format', async () => {
    const bytes = Buffer.from(await cipher.encryptApiPayload(plain), 'base64');
    const key = crypto.createHash('sha256').update(secret).digest().subarray(0, 16);
    const decipher = crypto.createDecipheriv('aes-128-gcm', key, bytes.subarray(0, 12));
    decipher.setAuthTag(bytes.subarray(-16));
    assert.equal(Buffer.concat([decipher.update(bytes.subarray(12, -16)), decipher.final()]).toString(), plain);
  });
  await check('API encrypted payload roundtrip and tamper rejection', async () => {
    const encoded = await cipher.encryptApiPayload(plain);
    assert.equal(await cipher.decryptApiPayload(encoded), plain);
    const damaged = Buffer.from(encoded, 'base64');
    damaged[12] ^= 1;
    await assert.rejects(() => cipher.decryptApiPayload(damaged.toString('base64')));
    await assert.rejects(() => cipher.decryptApiPayload('AA=='));
  });
  let unauthorized = 0;
  let encrypt = false;
  const apiLoad = loader({
    '@/src/config/api': { apiConfig: { baseUrl: 'https://fixture.invalid/api/v1', timeoutMs: 100, apiDisabled: false, useMockApi: false }, apiHeaders: { getCommon: () => ({ 'Content-Type': 'application/json' }) } },
    '@/src/config/dev': { devConfig: { enableDebugLogs: false, enableApiDebug: false } },
    '@/src/utils/crypto': cipher,
    '@/src/utils/devLogger': { devLog: { apiResponseOnce: () => {} } },
    '@/src/services/devDebug/apiDebugStore': { addApiDebugEntry: () => {} },
    '@/src/store/useAuthStore': { useAuthStore: { getState: () => ({ accessToken: 'fixture-token' }) } },
    './mockApi': {},
    '@/src/utils/deviceId-helper': { getOrCreateDeviceId: async () => 'fixture-device' },
    '@/src/services/location/geoLocation': { getCachedGeoLocationString: async () => '' },
    './handleUnauthorizedResponse': { handleUnauthorizedResponse: async () => { unauthorized++; } },
    '@/src/config/resolvedAppConfig': { getEnableEncryption: () => encrypt },
  });
  const api = apiLoad('src/services/api/apiClient.ts').apiClient;
  const originalFetch = globalThis.fetch;
  try {
    await check('API sends authentication and preserves successful response', async () => {
      globalThis.fetch = async (url, options) => {
        assert.equal(url, 'https://fixture.invalid/api/v1/fixture');
        assert.equal(options.headers.Authorization, 'fixture-token');
        return new Response(JSON.stringify({ value: 42 }), { status: 200 });
      };
      assert.equal((await api.get('/fixture')).data.value, 42);
    });
    await check('HTTP failures return ApiResponse and 401 invokes session handler', async () => {
      for (const status of [400, 401, 500]) {
        globalThis.fetch = async () => new Response('{}', { status });
        const result = await api.get('/fixture');
        assert.equal(result.success, false);
        assert.equal(result.status, status);
      }
      assert.equal(unauthorized, 1);
    });
    await check('API timeout returns TIMEOUT instead of throwing', async () => {
      globalThis.fetch = async (_url, options) => new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
      });
      assert.equal((await api.get('/fixture', { timeoutMs: 5 })).error.code, 'TIMEOUT');
    });
    await check('encrypted API request and response retain wire contract', async () => {
      encrypt = true;
      globalThis.fetch = async (_url, options) => {
        assert.equal(options.headers['X-Encrypted'], 'true');
        assert.equal(await cipher.decryptApiPayload(JSON.parse(options.body).data), plain);
        return new Response(JSON.stringify({ data: await cipher.encryptApiPayload(plain) }));
      };
      assert.equal((await api.post('/fixture', JSON.parse(plain))).data.amount, 42);
    });
    await check('file uploads stay multipart and bypass JSON encryption', async () => {
      const form = new FormData();
      form.append('fixture', 'document');
      globalThis.fetch = async (_url, options) => {
        assert.equal(options.body, form);
        assert.equal(options.headers['Content-Type'], undefined);
        assert.equal(options.headers['X-Encrypted'], undefined);
        return new Response('{}');
      };
      assert.equal((await api.post('/fixture', form)).success, true);
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
  const back = load('src/services/navigation/goBackWithFallback.ts');
  await check('navigation back and empty-history fallback', () => {
    let action;
    back.goBackWithFallback({ canGoBack: () => true, back: () => { action = 'back'; }, replace: () => assert.fail() });
    assert.equal(action, 'back');
    back.goBackWithFallback({ canGoBack: () => false, back: () => assert.fail(), replace: (route) => { action = route; } });
    assert.equal(action, '/(tabs)/account');
  });
  console.log(`${checks} checks passed. Native modules and live services were not exercised.`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
