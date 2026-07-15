import { createServer } from 'vite';

const server = await createServer({
  root: process.cwd(),
  configFile: false,
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
  optimizeDeps: {
    exclude: ['react', 'react-dom', 'react-router-dom', 'lucide-react', 'zod'],
  },
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
});

await server.listen();
server.printUrls();
