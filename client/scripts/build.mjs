import { build } from 'vite';

await build({
  root: process.cwd(),
  configFile: false,
  build: {
    outDir: 'dist',
  },
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
});
