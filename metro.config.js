// Keep requests on React Native's transport for native SSL pinning and network logging.
process.env.EXPO_PUBLIC_USE_RN_FETCH = '1';

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  /**
   * react-native-cashfree-pg-sdk compiled output at lib/module/index.js
   * imports '../package.json' which resolves to lib/package.json (missing).
   * The intended target is the root package.json two levels up.
   */
  if (
    moduleName === '../package.json' &&
    context.originModulePath.includes(
      'react-native-cashfree-pg-sdk/lib/module'
    )
  ) {
    return {
      filePath: path.resolve(
        __dirname,
        'node_modules/react-native-cashfree-pg-sdk/package.json'
      ),
      type: 'sourceFile',
    };
  }

  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
