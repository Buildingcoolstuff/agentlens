import { initAgentLensRuntime } from './index.js';

// Auto-bootstrapping IIFE entry point
if (typeof window !== 'undefined') {
  initAgentLensRuntime();
}

export * from './index.js';
