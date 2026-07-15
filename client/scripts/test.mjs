import { startVitest } from 'vitest/node';

await startVitest('test', [], {
  run: true,
  environment: 'jsdom',
  globals: true,
  setupFiles: ['./src/test/setup.ts'],
  root: process.cwd(),
}, {
  configFile: false,
  root: process.cwd(),
});
