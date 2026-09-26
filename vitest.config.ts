import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Unit tests for the pure location / guidance logic (no React Native needed).
export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
});
