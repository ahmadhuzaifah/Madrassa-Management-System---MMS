import { startServer } from './server.js';

if (process.argv[1] === new URL(import.meta.url).pathname) {
  startServer();
}
