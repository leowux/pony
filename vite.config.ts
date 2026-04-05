import { defineConfig } from 'vite-plus';

export default defineConfig({
  // Library/CLI build (tsdown)
  pack: {
    entry: ['src/index.ts', 'src/cli/index.ts'],
    dts: true,
    format: ['esm'],
    sourcemap: true,
    outDir: 'dist',
    clean: true,
    deps: {
      neverBundle: ['zod', 'chalk', 'commander'],
    },
  },

  // Lint (Oxlint)
  lint: {
    ignorePatterns: ['dist/**', 'node_modules/**', '.pony/**', 'scripts/**'],
    rules: {
      'no-console': 'off', // CLI tool uses console
    },
  },

  // Format (Oxfmt)
  fmt: {
    semi: true,
    singleQuote: true,
    trailingComma: 'all',
    indentWidth: 2,
    lineWidth: 100,
    ignorePatterns: ['dist/**', 'node_modules/**', '.pony/**', '.omc/**', '*.mjs'],
  },

  // Test (Vitest)
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules/**', 'dist/**'],
    environment: 'node',
  },

  // Staged (pre-commit)
  staged: {
    '*.{ts,tsx}': 'vp check --fix',
    '*.json': 'vp fmt --fix',
  },
});
