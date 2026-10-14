// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      // Compiler migration diagnostics stay visible without broad SDK-unrelated rewrites.
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
    },
  },
  {
    files: ["plugins/**/*.js", "scripts/**/*.js"],
    languageOptions: {
      globals: { __dirname: 'readonly' },
    },
  }
]);
