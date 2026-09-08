import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const adminDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(adminDir, '..');

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, repoRoot, '');
  const apiBase = (
    env.QUIZ_API_BASE_URL ||
    env.NEXT_PUBLIC_QUIZ_API_BASE_URL ||
    'https://pbzone-api.potatobazaar.com'
  ).replace(/\/$/, '');
  const adminKey = env.QUIZ_ADMIN_API_KEY || env.ADMIN_API_KEY || '';

  return {
    plugins: [react()],
    base: '/admin/',
    define: {
      "import.meta.env.VITE_QUIZ_API_BASE_URL": JSON.stringify(apiBase),
      "import.meta.env.VITE_ADMIN_API_KEY": JSON.stringify(adminKey),
    },
    build: {
      outDir: '../public/admin',
      emptyOutDir: true,
    },
    server: {
      port: 5173,
      strictPort: true,
      open: false,
      host: true,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:3000',
          changeOrigin: true,
        },
      },
      hmr: {
        protocol: 'ws',
        host: 'localhost',
        port: 5173,
        clientPort: 5173,
      },
    },
  };
});
