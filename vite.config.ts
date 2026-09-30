import { defineConfig } from 'vitest/config';
export default defineConfig({
  base: './',
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      reporter: ['text', 'json-summary', 'html'],
    },
  },
  build: {
    rolldownOptions: {
      output: { codeSplitting: { groups: [{ name: 'universe', test: /node_modules[\\/]three/ }] } },
    },
  },
});
