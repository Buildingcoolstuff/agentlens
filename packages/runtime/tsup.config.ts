import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    clean: true,
    minify: true,
    target: 'es2022',
  },
  {
    entry: {
      'continuity.iife': 'src/browser.ts',
    },
    format: ['iife'],
    minify: true,
    clean: false,
    target: 'es2022',
    globalName: 'AgentLensRuntime',
    outExtension() {
      return {
        js: '.js',
      };
    },
  },
]);
