// https://docs.expo.dev/guides/using-eslint/ — ESLint 9 « flat config ».
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'node_modules/*', '.expo/*', 'scripts/*'],
  },
]);
