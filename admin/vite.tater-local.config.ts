import { defineConfig, type UserConfig } from 'vite';
import base from './vite.config';

export default defineConfig(async (env) => {
  const config = (typeof base === 'function' ? await base(env) : base) as UserConfig;
  return {
    ...config,
    server: {
      ...config.server,
      port: 5174,
      proxy: {
        '/api/admin': {
          target: 'http://127.0.0.1:3099',
          changeOrigin: true,
          rewrite: (p: string) => p.replace(/^\/api\/admin/, '/v1/admin'),
        },
      },
      hmr: { protocol: 'ws', host: 'localhost', port: 5174, clientPort: 5174 },
    },
  };
});
